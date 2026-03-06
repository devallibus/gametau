export interface ElectrobunConfig {
  app: {
    name: string;
    identifier: string;
    version: string;
  };
  build: {
    bun: {
      entrypoint: string;
    };
    copy?: Record<string, string>;
    mac?: { bundleCEF?: boolean; bundleWGPU?: boolean };
    linux?: { bundleCEF?: boolean; bundleWGPU?: boolean };
    win?: { bundleCEF?: boolean; bundleWGPU?: boolean };
  };
}
