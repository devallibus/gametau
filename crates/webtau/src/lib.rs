/// Re-export the `#[command]` proc macro so users write `#[webtau::command]`.
pub use webtau_macros::command;

/// Generates thread-local state management boilerplate for WASM targets.
///
/// When building a Tauri game for the web, you need to replace
/// `State<Mutex<T>>` (which requires threads) with thread-local storage
/// (WASM is single-threaded). This macro generates the required
/// `thread_local!` + `RefCell` pattern and accessor functions.
///
/// # Usage
///
/// ```rust
/// use webtau::wasm_state;
///
/// struct GameWorld {
///     score: i32,
/// }
///
/// wasm_state!(GameWorld);
/// ```
///
/// # Generated API
///
/// - `set_state(val: T)` — Initialize or replace the state.
/// - `with_state(|state| ...)` — Read-only access to the state.
/// - `with_state_mut(|state| ...)` — Mutable access to the state.
///
/// All three functions panic if called before `set_state()`.
#[macro_export]
macro_rules! wasm_state {
    ($T:ty) => {
        ::std::thread_local! {
            static __WEBTAU_STATE: ::std::cell::RefCell<Option<$T>> =
                ::std::cell::RefCell::new(None);
        }

        /// Initialize or replace the global game state.
        fn set_state(val: $T) {
            __WEBTAU_STATE.with(|cell| {
                *cell.borrow_mut() = Some(val);
            });
        }

        /// Read-only access to the game state.
        ///
        /// # Panics
        /// Panics if `set_state()` has not been called.
        fn with_state<__F, __R>(f: __F) -> __R
        where
            __F: FnOnce(&$T) -> __R,
        {
            __WEBTAU_STATE.with(|cell| {
                let borrow = cell.borrow();
                let state = borrow
                    .as_ref()
                    .expect("webtau: state not initialized — call set_state() first");
                f(state)
            })
        }

        /// Mutable access to the game state.
        ///
        /// # Panics
        /// Panics if `set_state()` has not been called.
        fn with_state_mut<__F, __R>(f: __F) -> __R
        where
            __F: FnOnce(&mut $T) -> __R,
        {
            __WEBTAU_STATE.with(|cell| {
                let mut borrow = cell.borrow_mut();
                let state = borrow
                    .as_mut()
                    .expect("webtau: state not initialized — call set_state() first");
                f(state)
            })
        }

        /// Read-only access to the game state. Returns `None` if not initialized.
        fn try_with_state<__F, __R>(f: __F) -> Option<__R>
        where
            __F: FnOnce(&$T) -> __R,
        {
            __WEBTAU_STATE.with(|cell| {
                let borrow = cell.borrow();
                borrow.as_ref().map(f)
            })
        }

        /// Mutable access to the game state. Returns `None` if not initialized.
        fn try_with_state_mut<__F, __R>(f: __F) -> Option<__R>
        where
            __F: FnOnce(&mut $T) -> __R,
        {
            __WEBTAU_STATE.with(|cell| {
                let mut borrow = cell.borrow_mut();
                borrow.as_mut().map(f)
            })
        }
    };
}

#[cfg(test)]
mod tests {
    #[derive(Debug, PartialEq)]
    struct Counter {
        value: i32,
    }

    wasm_state!(Counter);

    #[test]
    fn set_and_read_state() {
        set_state(Counter { value: 42 });
        let result = with_state(|c| c.value);
        assert_eq!(result, 42);
    }

    #[test]
    fn mutate_state() {
        set_state(Counter { value: 0 });
        with_state_mut(|c| c.value += 10);
        let result = with_state(|c| c.value);
        assert_eq!(result, 10);
    }

    #[test]
    #[should_panic(expected = "state not initialized")]
    fn panics_without_init() {
        // Each test thread gets its own thread-local, so this is fresh.
        // We need a separate type to avoid interference from other tests.
        struct Uninitialized;
        wasm_state!(Uninitialized);
        with_state(|_| {});
    }

    #[test]
    fn try_with_state_returns_none_before_init() {
        struct Sentinel;
        wasm_state!(Sentinel);
        let result = try_with_state(|_| 99u32);
        assert_eq!(result, None);
    }

    #[test]
    fn try_with_state_returns_some_after_init() {
        struct Value {
            n: i32,
        }
        wasm_state!(Value);
        set_state(Value { n: 7 });
        let result = try_with_state(|v| v.n);
        assert_eq!(result, Some(7));
    }

    #[test]
    fn try_with_state_mut_returns_none_before_init() {
        struct Tracker;
        wasm_state!(Tracker);
        let result = try_with_state_mut(|_| 42u32);
        assert_eq!(result, None);
    }
}
