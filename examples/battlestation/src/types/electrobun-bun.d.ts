export class BrowserWindow {
  constructor(options: { title?: string; url: string });
}

export class GpuWindow {
  constructor(options: {
    title?: string;
    frame: { x: number; y: number; width: number; height: number };
    titleBarStyle: "hidden" | "hiddenInset" | "default";
    transparent: boolean;
  });

  setTitle(title: string): void;
  getFrame(): { x: number; y: number; width: number; height: number };
  on(name: string, handler: (event: unknown) => void): void;
}

export const Screen: {
  getCursorScreenPoint(): { x: number; y: number };
  getMouseButtons(): bigint;
};

export const webgpu: {
  install(): void;
  utils: {
    createCanvasShim(window: GpuWindow): {
      width: number;
      height: number;
      clientWidth: number;
      clientHeight: number;
      style: Record<string, unknown>;
      getContext(type: string): unknown;
      getBoundingClientRect(): {
        left: number;
        top: number;
        width: number;
        height: number;
      };
      addEventListener: (...args: unknown[]) => void;
      removeEventListener: (...args: unknown[]) => void;
      setAttribute: (...args: unknown[]) => void;
    };
  };
};
