use proc_macro::TokenStream;
use syn::{parse_macro_input, punctuated::Punctuated, Expr, ExprLit, Lit, Meta, Token};

/// Test-only replacement for `#[tauri::command]` that enforces
/// `rename_all = "snake_case"` for generated wrappers.
#[proc_macro_attribute]
pub fn command(attr: TokenStream, item: TokenStream) -> TokenStream {
    let args = parse_macro_input!(attr with Punctuated::<Meta, Token![,]>::parse_terminated);

    let has_snake_case_rename = args.iter().any(|meta| {
        let Meta::NameValue(name_value) = meta else {
            return false;
        };

        if !name_value.path.is_ident("rename_all") {
            return false;
        }

        matches!(
            &name_value.value,
            Expr::Lit(ExprLit {
                lit: Lit::Str(value),
                ..
            }) if value.value() == "snake_case"
        )
    });

    if !has_snake_case_rename {
        return "compile_error!(\"test tauri::command requires `rename_all = \\\"snake_case\\\"`\");"
            .parse()
            .expect("valid compile_error tokens");
    }

    item
}
