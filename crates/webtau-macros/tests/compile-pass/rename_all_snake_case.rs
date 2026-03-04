use serde::Serialize;

#[derive(Serialize, Clone)]
struct RouteSample {
    count: usize,
}

struct NavigationState;

mod commands {
    use super::*;

    #[webtau_macros::command]
    fn compute_routes(
        state: &NavigationState,
        from_body: String,
        departure_jd: f64,
        num_samples: usize,
    ) -> RouteSample {
        let _ = (state, from_body, departure_jd, num_samples);
        RouteSample { count: 1 }
    }
}

fn main() {}
