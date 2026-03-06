declare module "*battlestation_wasm" {
  const bootstrap: () => Promise<unknown>;
  export default bootstrap;
  export function init(): void;
}
