import { describe, test, expect } from "bun:test";
import { LogicalSize, PhysicalSize, LogicalPosition, PhysicalPosition } from "./dpi";

describe("LogicalSize", () => {
  test("stores width and height", () => {
    const size = new LogicalSize(1920, 1080);
    expect(size.width).toBe(1920);
    expect(size.height).toBe(1080);
    expect(size.type).toBe("Logical");
  });

  test("converts to physical", () => {
    const logical = new LogicalSize(1920, 1080);
    const physical = logical.toPhysical(2);
    expect(physical).toBeInstanceOf(PhysicalSize);
    expect(physical.width).toBe(3840);
    expect(physical.height).toBe(2160);
  });
});

describe("PhysicalSize", () => {
  test("stores width and height", () => {
    const size = new PhysicalSize(3840, 2160);
    expect(size.width).toBe(3840);
    expect(size.height).toBe(2160);
    expect(size.type).toBe("Physical");
  });

  test("converts to logical", () => {
    const physical = new PhysicalSize(3840, 2160);
    const logical = physical.toLogical(2);
    expect(logical).toBeInstanceOf(LogicalSize);
    expect(logical.width).toBe(1920);
    expect(logical.height).toBe(1080);
  });
});

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
