//! Proc macros for webtau dual-target command generation.
//!
//! # v2 `#[command]` Contract
//!
//! ```rust,ignore
//! #[webtau::command]
//! fn name(state: &T | &mut T [, arg: Type]*) [-> ReturnType] { body }
//! ```
//!
//! **Supported grammar:**
//! - First parameter **must** be a reference: `name: &T` (read-only) or `name: &mut T` (mutable).
//!   The identifier can be any name (e.g., `state`, `world`, `game`).
//! - Additional parameters are named, typed values forwarded as the command's args.
//! - Return type may be:
//!   - `T` where `T: Serialize` — value returned directly.
//!   - `Result<T, E>` where `T: Serialize, E: Display + Serialize` — errors surface to JS.
//!   - Omitted (unit `()`) — command returns nothing.
//! - The function name becomes the command name for `invoke()`.
//!
//! **Generated code:**
//! - Inner function `__webtau_<name>` containing the original body.
//! - `#[cfg(not(wasm32))]` — `#[tauri::command]` wrapper with `State<Mutex<T>>`.
//! - `#[cfg(wasm32)]` — `#[wasm_bindgen]` wrapper with args-object deserialize.
//!
//! **Unsupported forms** (compile-time error):
//! - Methods with `self`.
//! - Missing or non-reference state parameter.
//! - Tuple or struct patterns in parameters.
//! - Async functions.

use proc_macro::TokenStream;
use proc_macro2::TokenStream as TokenStream2;
use quote::{format_ident, quote};
use syn::{
    parse_macro_input, spanned::Spanned, FnArg, GenericArgument, ItemFn, Pat, PatIdent,
    PathArguments, ReturnType, Type, TypeReference,
};

// ── Public entry point ────────────────────────────────────────────────

#[proc_macro_attribute]
pub fn command(_attr: TokenStream, item: TokenStream) -> TokenStream {
    let input = parse_macro_input!(item as ItemFn);
    match expand_command(input) {
        Ok(tokens) => tokens.into(),
        Err(err) => err.to_compile_error().into(),
    }
}

// ── Parsed representation ─────────────────────────────────────────────

struct CommandDef {
    name: syn::Ident,
    state_ident: syn::Ident,
    state_ty: Box<Type>,
    state_mut: bool,
    extra_params: Vec<(Option<syn::token::Mut>, syn::Ident, Box<Type>)>,
    ret: ReturnShape,
    body: syn::Block,
}

enum ReturnShape {
    Unit,
    Plain(Box<Type>),
    Result { ok: Box<Type>, err: Box<Type> },
}

// ── Parsing + diagnostics (Step 1) ────────────────────────────────────

fn expand_command(func: ItemFn) -> syn::Result<TokenStream2> {
    // Reject async
    if let Some(tok) = &func.sig.asyncness {
        return Err(syn::Error::new(
            tok.span(),
            "#[command] does not support async functions",
        ));
    }

    // Reject methods with self
    for arg in &func.sig.inputs {
        if let FnArg::Receiver(recv) = arg {
            return Err(syn::Error::new(
                recv.span(),
                "#[command] does not support methods with `self`; \
                 use a free function with `state: &T` or `state: &mut T`",
            ));
        }
    }

    // Must have at least one parameter (the state)
    if func.sig.inputs.is_empty() {
        return Err(syn::Error::new(
            func.sig.ident.span(),
            "#[command] requires at least one parameter: `state: &T` or `state: &mut T`",
        ));
    }

    // ── Parse state parameter (first) ──
    let first = match func.sig.inputs.first().unwrap() {
        FnArg::Typed(pt) => pt,
        _ => unreachable!("already rejected Receiver"),
    };

    // Must be a simple ident pattern
    let state_ident = match &*first.pat {
        Pat::Ident(PatIdent { ident, .. }) => ident.clone(),
        other => {
            return Err(syn::Error::new(
                other.span(),
                "#[command] state parameter must be a simple identifier \
                 (e.g., `state: &T`)",
            ));
        }
    };

    // Must be &T or &mut T
    let (state_ty, state_mut) = match &*first.ty {
        Type::Reference(TypeReference {
            elem, mutability, ..
        }) => (elem.clone(), mutability.is_some()),
        other => {
            return Err(syn::Error::new(
                other.span(),
                "#[command] first parameter must be a reference: \
                 `&T` or `&mut T`",
            ));
        }
    };

    // ── Parse extra parameters ──
    let mut extra_params = Vec::new();
    for arg in func.sig.inputs.iter().skip(1) {
        let typed = match arg {
            FnArg::Typed(pt) => pt,
            _ => unreachable!(),
        };
        let (mutability, ident) = match &*typed.pat {
            Pat::Ident(PatIdent { mutability, ident, .. }) => (*mutability, ident.clone()),
            other => {
                return Err(syn::Error::new(
                    other.span(),
                    "#[command] parameters must use simple identifiers \
                     (no tuple or struct patterns)",
                ));
            }
        };
        if ident.to_string().starts_with("__webtau") {
            return Err(syn::Error::new(
                ident.span(),
                "#[command] parameter names starting with `__webtau` are reserved \
                 for generated code",
            ));
        }
        extra_params.push((mutability, ident, typed.ty.clone()));
    }

    // ── Parse return type ──
    let ret = match &func.sig.output {
        ReturnType::Default => ReturnShape::Unit,
        ReturnType::Type(_, ty) => parse_return_type(ty),
    };

    let def = CommandDef {
        name: func.sig.ident.clone(),
        state_ident,
        state_ty,
        state_mut,
        extra_params,
        ret,
        body: (*func.block).clone(),
    };

    Ok(generate_all(&def))
}

fn parse_return_type(ty: &Type) -> ReturnShape {
    if let Type::Path(tp) = ty {
        if let Some(seg) = tp.path.segments.last() {
            if seg.ident == "Result" {
                if let PathArguments::AngleBracketed(ab) = &seg.arguments {
                    let mut types = ab.args.iter().filter_map(|a| {
                        if let GenericArgument::Type(t) = a {
                            Some(Box::new(t.clone()))
                        } else {
                            None
                        }
                    });
                    if let (Some(ok), Some(err)) = (types.next(), types.next()) {
                        return ReturnShape::Result { ok, err };
                    }
                }
            }
        }
    }
    ReturnShape::Plain(Box::new(ty.clone()))
}

// ── Code generation ───────────────────────────────────────────────────

fn generate_all(def: &CommandDef) -> TokenStream2 {
    let inner = generate_inner(def);
    let native = generate_native(def);
    let wasm = generate_wasm(def);

    quote! {
        #inner
        #native
        #wasm
    }
}

/// Emit the inner function containing the user's original body.
fn generate_inner(def: &CommandDef) -> TokenStream2 {
    let inner_name = format_ident!("__webtau_{}", def.name);
    let body = &def.body;
    let state_ty = &def.state_ty;
    let state_ident = &def.state_ident;

    let state_param = if def.state_mut {
        quote! { #state_ident: &mut #state_ty }
    } else {
        quote! { #state_ident: &#state_ty }
    };

    let extra: Vec<_> = def
        .extra_params
        .iter()
        .map(|(mutability, id, ty)| quote! { #mutability #id: #ty })
        .collect();

    let ret = ret_tokens(&def.ret);

    quote! {
        #[doc(hidden)]
        #[inline(always)]
        fn #inner_name(#state_param, #(#extra),*) #ret #body
    }
}

/// Emit the `#[tauri::command]` wrapper (Step 2 — native codegen).
fn generate_native(def: &CommandDef) -> TokenStream2 {
    let pub_name = &def.name;
    let inner_name = format_ident!("__webtau_{}", def.name);
    let state_ty = &def.state_ty;

    let extra_defs: Vec<_> = def
        .extra_params
        .iter()
        .map(|(_, id, ty)| quote! { #id: #ty })
        .collect();
    let extra_names: Vec<_> = def
        .extra_params
        .iter()
        .map(|(_, id, _)| quote! { #id })
        .collect();

    // Use `__webtau_` prefix to avoid collisions with user arg names
    let (lock, state_ref) = if def.state_mut {
        (
            quote! { let mut __webtau_guard = __webtau_tauri_state.lock().unwrap(); },
            quote! { &mut __webtau_guard },
        )
    } else {
        (
            quote! { let __webtau_guard = __webtau_tauri_state.lock().unwrap(); },
            quote! { &__webtau_guard },
        )
    };

    let ret = ret_tokens(&def.ret);

    quote! {
        #[cfg(not(target_arch = "wasm32"))]
        #[::tauri::command]
        pub fn #pub_name(
            #(#extra_defs,)*
            __webtau_tauri_state: ::tauri::State<'_, ::std::sync::Mutex<#state_ty>>
        ) #ret {
            #lock
            #inner_name(#state_ref, #(#extra_names),*)
        }
    }
}

/// Emit the `#[wasm_bindgen]` wrapper (WASM codegen).
fn generate_wasm(def: &CommandDef) -> TokenStream2 {
    let pub_name = &def.name;
    let inner_name = format_ident!("__webtau_{}", def.name);
    let has_extra = !def.extra_params.is_empty();

    let state_accessor = if def.state_mut {
        quote! { with_state_mut }
    } else {
        quote! { with_state }
    };

    // ── Args handling ──
    let (wasm_param, args_preamble, call_args) = if has_extra {
        let struct_name = format_ident!("__Webtau{}Args", to_pascal_case(&def.name.to_string()));

        let field_defs: Vec<_> = def
            .extra_params
            .iter()
            .map(|(_, id, ty)| quote! { #id: #ty })
            .collect();
        let field_refs: Vec<_> = def
            .extra_params
            .iter()
            .map(|(_, id, _)| quote! { __args.#id })
            .collect();

        (
            quote! { args: ::wasm_bindgen::JsValue },
            quote! {
                #[derive(::serde::Deserialize)]
                struct #struct_name { #(#field_defs,)* }
                let __args: #struct_name =
                    ::serde_wasm_bindgen::from_value(args).unwrap();
            },
            field_refs,
        )
    } else {
        (quote! {}, quote! {}, vec![])
    };

    // ── Return handling ──
    let (wasm_ret, body_expr) = match &def.ret {
        ReturnShape::Unit => (
            quote! {},
            quote! {
                #state_accessor(|state| {
                    #inner_name(state, #(#call_args),*);
                })
            },
        ),
        ReturnShape::Plain(_) => (
            quote! { -> ::wasm_bindgen::JsValue },
            quote! {
                #state_accessor(|state| {
                    let __result = #inner_name(state, #(#call_args),*);
                    ::serde_wasm_bindgen::to_value(&__result).unwrap()
                })
            },
        ),
        ReturnShape::Result { .. } => (
            quote! { -> ::std::result::Result<::wasm_bindgen::JsValue, ::wasm_bindgen::JsError> },
            quote! {
                #state_accessor(|state| {
                    match #inner_name(state, #(#call_args),*) {
                        Ok(__val) => Ok(::serde_wasm_bindgen::to_value(&__val).unwrap()),
                        Err(__err) => Err(::wasm_bindgen::JsError::new(&__err.to_string())),
                    }
                })
            },
        ),
    };

    quote! {
        #[cfg(target_arch = "wasm32")]
        #[::wasm_bindgen::prelude::wasm_bindgen]
        pub fn #pub_name(#wasm_param) #wasm_ret {
            #args_preamble
            #body_expr
        }
    }
}

// ── Helpers ───────────────────────────────────────────────────────────

fn ret_tokens(shape: &ReturnShape) -> TokenStream2 {
    match shape {
        ReturnShape::Unit => quote! {},
        ReturnShape::Plain(ty) => quote! { -> #ty },
        ReturnShape::Result { ok, err } => quote! { -> ::std::result::Result<#ok, #err> },
    }
}

fn to_pascal_case(s: &str) -> String {
    s.split('_')
        .map(|word| {
            let mut c = word.chars();
            match c.next() {
                None => String::new(),
                Some(f) => f.to_uppercase().collect::<String>() + c.as_str(),
            }
        })
        .collect()
}
