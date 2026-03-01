import { invoke } from "webtau";

export interface CounterView {
  value: number;
}

export const getCounter = () => invoke<CounterView>("get_counter");
export const increment = () => invoke<CounterView>("increment");
export const decrement = () => invoke<CounterView>("decrement");
export const reset = () => invoke<CounterView>("reset");
