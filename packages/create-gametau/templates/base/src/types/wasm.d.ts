declare module "*{{PROJECT_NAME}}_wasm" {
  export default function init(): Promise<void>;
  export function init(seed?: number): void;
}
