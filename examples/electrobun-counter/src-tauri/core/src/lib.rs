use serde::Serialize;

#[derive(Serialize, Clone)]
pub struct CounterView {
    pub value: i32,
}

pub struct Counter {
    value: i32,
}

impl Counter {
    pub fn new() -> Self {
        Self { value: 0 }
    }

    pub fn view(&self) -> CounterView {
        CounterView { value: self.value }
    }

    pub fn increment(&mut self) -> CounterView {
        self.value += 1;
        self.view()
    }

    pub fn decrement(&mut self) -> CounterView {
        self.value -= 1;
        self.view()
    }

    pub fn reset(&mut self) -> CounterView {
        self.value = 0;
        self.view()
    }
}

impl Default for Counter {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn increment_and_decrement() {
        let mut c = Counter::new();
        assert_eq!(c.increment().value, 1);
        assert_eq!(c.increment().value, 2);
        assert_eq!(c.decrement().value, 1);
    }

    #[test]
    fn reset() {
        let mut c = Counter::new();
        c.increment();
        c.increment();
        assert_eq!(c.reset().value, 0);
    }
}
