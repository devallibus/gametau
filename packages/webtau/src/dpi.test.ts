import { describe, expect, test } from "bun:test";
import { LogicalPosition, LogicalSize, PhysicalPosition, PhysicalSize } from "./dpi";

// ---------------------------------------------------------------------------
// LogicalSize
// ---------------------------------------------------------------------------

describe("LogicalSize", () => {
  test("stores width and height", () => {
    const size = new LogicalSize(1920, 1080);
    expect(size.width).toBe(1920);
    expect(size.height).toBe(1080);
    expect(size.type).toBe("Logical");
  });

  test("converts to physical with integer scale", () => {
    const logical = new LogicalSize(1920, 1080);
    const physical = logical.toPhysical(2);
    expect(physical).toBeInstanceOf(PhysicalSize);
    expect(physical.width).toBe(3840);
    expect(physical.height).toBe(2160);
  });

  test("converts to physical with fractional scale (rounds)", () => {
    // 1920 * 1.5 = 2880, 1080 * 1.5 = 1620 — exact
    const logical = new LogicalSize(1920, 1080);
    const physical = logical.toPhysical(1.5);
    expect(physical.width).toBe(2880);
    expect(physical.height).toBe(1620);
  });

  test("rounds non-integer results in toPhysical", () => {
    // 100 * 1.33 = 133, 200 * 1.33 = 266 — Math.round handles this
    const logical = new LogicalSize(100, 200);
    const physical = logical.toPhysical(1.33);
    expect(physical.width).toBe(Math.round(100 * 1.33));
    expect(physical.height).toBe(Math.round(200 * 1.33));
  });
});

// ---------------------------------------------------------------------------
// PhysicalSize
// ---------------------------------------------------------------------------

describe("PhysicalSize", () => {
  test("stores width and height", () => {
    const size = new PhysicalSize(3840, 2160);
    expect(size.width).toBe(3840);
    expect(size.height).toBe(2160);
    expect(size.type).toBe("Physical");
  });

  test("converts to logical with integer scale", () => {
    const physical = new PhysicalSize(3840, 2160);
    const logical = physical.toLogical(2);
    expect(logical).toBeInstanceOf(LogicalSize);
    expect(logical.width).toBe(1920);
    expect(logical.height).toBe(1080);
  });

  test("converts to logical with fractional scale (no rounding)", () => {
    // Physical→Logical does NOT round — preserves fractional result
    const physical = new PhysicalSize(100, 200);
    const logical = physical.toLogical(3);
    expect(logical.width).toBeCloseTo(33.333, 2);
    expect(logical.height).toBeCloseTo(66.666, 2);
  });
});

// ---------------------------------------------------------------------------
// LogicalPosition
// ---------------------------------------------------------------------------

describe("LogicalPosition", () => {
  test("stores x and y", () => {
    const pos = new LogicalPosition(100, 200);
    expect(pos.x).toBe(100);
    expect(pos.y).toBe(200);
    expect(pos.type).toBe("Logical");
  });

  test("converts to physical", () => {
    const logical = new LogicalPosition(100, 200);
    const physical = logical.toPhysical(1.5);
    expect(physical).toBeInstanceOf(PhysicalPosition);
    expect(physical.x).toBe(150);
    expect(physical.y).toBe(300);
  });
});

// ---------------------------------------------------------------------------
// PhysicalPosition
// ---------------------------------------------------------------------------

describe("PhysicalPosition", () => {
  test("stores x and y", () => {
    const pos = new PhysicalPosition(150, 300);
    expect(pos.x).toBe(150);
    expect(pos.y).toBe(300);
    expect(pos.type).toBe("Physical");
  });

  test("converts to logical", () => {
    const physical = new PhysicalPosition(150, 300);
    const logical = physical.toLogical(1.5);
    expect(logical).toBeInstanceOf(LogicalPosition);
    expect(logical.x).toBe(100);
    expect(logical.y).toBe(200);
  });
});

// ---------------------------------------------------------------------------
// Round-trip conversion
// ---------------------------------------------------------------------------

describe("round-trip conversion", () => {
  test("logical → physical → logical with integer scale is lossless", () => {
    const original = new LogicalSize(1920, 1080);
    const physical = original.toPhysical(2);
    const roundTrip = physical.toLogical(2);
    expect(roundTrip.width).toBe(original.width);
    expect(roundTrip.height).toBe(original.height);
  });

  test("logical → physical → logical with fractional scale may lose precision", () => {
    // 100 * 1.5 = 150 (exact), 150 / 1.5 = 100 (exact in this case)
    const original = new LogicalSize(100, 200);
    const physical = original.toPhysical(1.5);
    const roundTrip = physical.toLogical(1.5);
    expect(roundTrip.width).toBeCloseTo(100, 5);
    expect(roundTrip.height).toBeCloseTo(200, 5);
  });
});
