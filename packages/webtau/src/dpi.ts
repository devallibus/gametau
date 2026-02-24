/**
 * webtau/dpi — Web shim for @tauri-apps/api/dpi.
 *
 * Provides LogicalSize, PhysicalSize, and LogicalPosition classes
 * that match Tauri's API surface, backed by browser primitives.
 */

export class LogicalSize {
  readonly type = "Logical";
  constructor(
    public width: number,
    public height: number,
  ) {}

  toPhysical(scaleFactor: number): PhysicalSize {
    return new PhysicalSize(
      Math.round(this.width * scaleFactor),
      Math.round(this.height * scaleFactor),
    );
  }
}

export class PhysicalSize {
  readonly type = "Physical";
  constructor(
    public width: number,
    public height: number,
  ) {}

  toLogical(scaleFactor: number): LogicalSize {
    return new LogicalSize(
      this.width / scaleFactor,
      this.height / scaleFactor,
    );
  }
}

export class LogicalPosition {
  readonly type = "Logical";
  constructor(
    public x: number,
    public y: number,
  ) {}

  toPhysical(scaleFactor: number): PhysicalPosition {
    return new PhysicalPosition(
      Math.round(this.x * scaleFactor),
      Math.round(this.y * scaleFactor),
    );
  }
}

export class PhysicalPosition {
  readonly type = "Physical";
  constructor(
    public x: number,
    public y: number,
  ) {}

  toLogical(scaleFactor: number): LogicalPosition {
    return new LogicalPosition(
      this.x / scaleFactor,
      this.y / scaleFactor,
    );
  }
}
