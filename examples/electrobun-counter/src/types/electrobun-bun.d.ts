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
}
