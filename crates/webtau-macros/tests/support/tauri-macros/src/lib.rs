use proc_macro::TokenStream;

/// Test-only no-op replacement for `#[tauri::command]`.
#[proc_macro_attribute]
pub fn command(_attr: TokenStream, item: TokenStream) -> TokenStream {
    item
}
