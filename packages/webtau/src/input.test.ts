import { describe, expect, test } from "bun:test";
import { createInputController } from "./input";

function keyboardEvent(type: string, key: string): Event {
  const event = new Event(type) as Event & { key: string };
  event.key = key;
  return event;
}

function touchEvent(
  type: string,
  touches: Array<{ identifier: number; clientX: number; clientY: number }>,
): Event {
  const event = new Event(type) as Event & {
    changedTouches: Array<{ identifier: number; clientX: number; clientY: number }>;
  };
  event.changedTouches = touches;
  return event;
}

function mouseEvent(type: string, movementX: number, movementY: number): Event {
  const event = new Event(type) as Event & { movementX: number; movementY: number };
  event.movementX = movementX;
  event.movementY = movementY;
  return event;
}

describe("webtau/input", () => {
  test("tracks keyboard pressed state and axis", () => {
    const target = new EventTarget();
    const input = createInputController({
      windowObj: target as unknown as Pick<Window, "addEventListener" | "removeEventListener">,
    });

    target.dispatchEvent(keyboardEvent("keydown", "w"));
    expect(input.isPressed("w")).toBe(true);
    expect(input.keyAxis(["w"], ["s"])).toBe(-1);

    target.dispatchEvent(keyboardEvent("keyup", "w"));
    expect(input.isPressed("w")).toBe(false);
    expect(input.keyAxis(["w"], ["s"])).toBe(0);
  });

  test("reads gamepad axes with deadzone and invert support", () => {
    const input = createInputController({
      navigatorObj: {
        getGamepads: () =>
          [{ axes: [0, -0.6, 0, 0.4] } as unknown as Gamepad] as (Gamepad | null)[],
      },
    });

    expect(input.gamepadAxis(1)).toBe(-0.6);
    expect(input.gamepadAxis(3, { deadzone: 0.5 })).toBe(0);
    expect(input.gamepadAxis(1, { invert: true })).toBe(0.6);
  });

  test("tracks active touches across start/move/end", () => {
    const target = new EventTarget();
    const input = createInputController({
      windowObj: target as unknown as Pick<Window, "addEventListener" | "removeEventListener">,
    });

    target.dispatchEvent(
      touchEvent("touchstart", [{ identifier: 1, clientX: 50, clientY: 60 }]),
    );
    expect(input.touches()).toEqual([{ id: 1, x: 50, y: 60 }]);

    target.dispatchEvent(
      touchEvent("touchmove", [{ identifier: 1, clientX: 80, clientY: 90 }]),
    );
    expect(input.touches()).toEqual([{ id: 1, x: 80, y: 90 }]);

    target.dispatchEvent(
      touchEvent("touchend", [{ identifier: 1, clientX: 80, clientY: 90 }]),
    );
    expect(input.touches()).toEqual([]);
  });

  test("pointer lock request and pointer delta flow", async () => {
    const target = new EventTarget();
    const doc = { pointerLockElement: null as Element | null };
    const element = {
      requestPointerLock: () => {
        doc.pointerLockElement = element as unknown as Element;
      },
    } as unknown as Element & { requestPointerLock: () => void };

    const input = createInputController({
      windowObj: target as unknown as Pick<Window, "addEventListener" | "removeEventListener">,
      documentObj: doc,
    });

    expect(input.isPointerLocked()).toBe(false);
    expect(await input.requestPointerLock(element)).toBe(true);
    expect(input.isPointerLocked(element)).toBe(true);

    target.dispatchEvent(mouseEvent("mousemove", 5, -3));
    target.dispatchEvent(mouseEvent("mousemove", 2, 4));
    expect(input.consumePointerDelta()).toEqual({ x: 7, y: 1 });
    expect(input.consumePointerDelta()).toEqual({ x: 0, y: 0 });
  });
});
