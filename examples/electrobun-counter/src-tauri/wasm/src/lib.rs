// Link counter-commands so its wasm_bindgen exports become part of this cdylib.
// The #[wasm_bindgen] functions in the commands crate are picked up automatically
// via link sections — no explicit re-export needed.
use counter_commands as _;
