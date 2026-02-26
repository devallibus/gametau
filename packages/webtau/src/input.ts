/**
 * webtau/input — Input foundation module for web builds.
 *
 * Provides unified helpers for keyboard, gamepad, touch, and pointer-lock
 * mouse input so gameplay code can consume a single abstraction.
 */

export interface TouchPoint {
  id: number;
  x: number;
  y: number;
}

export interface PointerDelta {
  x: number;
  y: number;
}

export interface GamepadAxisOptions {
  gamepadIndex?: number;
  deadzone?: number;
  invert?: boolean;
}

export interface InputController {
  destroy(): void;
  isPressed(key: string): boolean;
  keyAxis(negative: string | string[], positive: string | string[]): number;
  gamepadAxis(axisIndex: number, options?: GamepadAxisOptions): number;
  touches(): TouchPoint[];
  requestPointerLock(element: Element): Promise<boolean>;
  isPointerLocked(element?: Element): boolean;
  consumePointerDelta(): PointerDelta;
}

export interface InputControllerOptions {
  windowObj?: Pick<Window, "addEventListener" | "removeEventListener">;
  documentObj?: Pick<Document, "pointerLockElement">;
  navigatorObj?: Pick<Navigator, "getGamepads">;
}

type EventTargetLike = Pick<Window, "addEventListener" | "removeEventListener">;

function normalizeKeys(keys: string | string[]): string[] {
  return Array.isArray(keys) ? keys : [keys];
}

function applyDeadzone(value: number, deadzone: number): number {
  if (Math.abs(value) < deadzone) return 0;
  return value;
}

function axisFromKeys(
  pressed: Set<string>,
  negative: string | string[],
  positive: string | string[],
): number {
  const negDown = normalizeKeys(negative).some((key) => pressed.has(key));
  const posDown = normalizeKeys(positive).some((key) => pressed.has(key));
  if (negDown === posDown) return 0;
  return posDown ? 1 : -1;
}

function addListener(
  target: EventTargetLike | undefined,
  event: string,
  handler: EventListener,
  cleanup: Array<() => void>,
): void {
  if (!target) return;
  target.addEventListener(event, handler);
  cleanup.push(() => target.removeEventListener(event, handler));
}

function touchListToArray(
  touchList: TouchList | Array<{ identifier: number; clientX: number; clientY: number }>,
): Array<{ identifier: number; clientX: number; clientY: number }> {
  if (Array.isArray(touchList)) return touchList;
  const result: Array<{ identifier: number; clientX: number; clientY: number }> = [];
  for (let i = 0; i < touchList.length; i++) {
    const touch = touchList.item(i);
    if (touch) {
      result.push({
        identifier: touch.identifier,
        clientX: touch.clientX,
        clientY: touch.clientY,
      });
    }
  }
  return result;
}

export function createInputController(options: InputControllerOptions = {}): InputController {
  const windowObj = options.windowObj ?? (typeof window !== "undefined" ? window : undefined);
  const documentObj =
    options.documentObj ?? (typeof document !== "undefined" ? document : undefined);
  const navigatorObj =
    options.navigatorObj ?? (typeof navigator !== "undefined" ? navigator : undefined);

  const cleanup: Array<() => void> = [];
  const pressedKeys = new Set<string>();
  const activeTouches = new Map<number, TouchPoint>();

  let pointerDeltaX = 0;
  let pointerDeltaY = 0;

  addListener(
    windowObj,
    "keydown",
    ((event: KeyboardEvent) => {
      pressedKeys.add(event.key);
    }) as EventListener,
    cleanup,
  );

  addListener(
    windowObj,
    "keyup",
    ((event: KeyboardEvent) => {
      pressedKeys.delete(event.key);
    }) as EventListener,
    cleanup,
  );

  function upsertTouches(touchEvent: TouchEvent): void {
    const changedTouches = touchListToArray(
      touchEvent.changedTouches as unknown as TouchList | Array<{ identifier: number; clientX: number; clientY: number }>,
    );
    for (const touch of changedTouches) {
      activeTouches.set(touch.identifier, {
        id: touch.identifier,
        x: touch.clientX,
        y: touch.clientY,
      });
    }
  }

  function removeTouches(touchEvent: TouchEvent): void {
    const changedTouches = touchListToArray(
      touchEvent.changedTouches as unknown as TouchList | Array<{ identifier: number; clientX: number; clientY: number }>,
    );
    for (const touch of changedTouches) {
      activeTouches.delete(touch.identifier);
    }
  }

  addListener(windowObj, "touchstart", (event) => upsertTouches(event as TouchEvent), cleanup);
  addListener(windowObj, "touchmove", (event) => upsertTouches(event as TouchEvent), cleanup);
  addListener(windowObj, "touchend", (event) => removeTouches(event as TouchEvent), cleanup);
  addListener(windowObj, "touchcancel", (event) => removeTouches(event as TouchEvent), cleanup);

  addListener(
    windowObj,
    "mousemove",
    ((event: MouseEvent) => {
      if (!documentObj?.pointerLockElement) return;
      pointerDeltaX += event.movementX ?? 0;
      pointerDeltaY += event.movementY ?? 0;
    }) as EventListener,
    cleanup,
  );

  return {
    destroy() {
      for (const dispose of cleanup) dispose();
      cleanup.length = 0;
      pressedKeys.clear();
      activeTouches.clear();
      pointerDeltaX = 0;
      pointerDeltaY = 0;
    },

    isPressed(key: string): boolean {
      return pressedKeys.has(key);
    },

    keyAxis(negative: string | string[], positive: string | string[]): number {
      return axisFromKeys(pressedKeys, negative, positive);
    },

    gamepadAxis(axisIndex: number, options: GamepadAxisOptions = {}): number {
      const gamepads = navigatorObj?.getGamepads?.();
      if (!gamepads) return 0;

      const gamepadIndex = options.gamepadIndex ?? 0;
      const gamepad = gamepads[gamepadIndex];
      if (!gamepad) return 0;

      const raw = gamepad.axes?.[axisIndex] ?? 0;
      const deadzone = options.deadzone ?? 0.15;
      const value = applyDeadzone(raw, deadzone);
      return options.invert ? -value : value;
    },

    touches(): TouchPoint[] {
      return Array.from(activeTouches.values());
    },

    async requestPointerLock(element: Element): Promise<boolean> {
      const request = (element as Element & { requestPointerLock?: () => void | Promise<void> })
        .requestPointerLock;
      if (!request) return false;
      const result = request.call(element);
      if (result && typeof (result as Promise<void>).then === "function") {
        await result;
      }
      return true;
    },

    isPointerLocked(element?: Element): boolean {
      if (!documentObj?.pointerLockElement) return false;
      if (!element) return true;
      return documentObj.pointerLockElement === element;
    },

    consumePointerDelta(): PointerDelta {
      const delta = { x: pointerDeltaX, y: pointerDeltaY };
      pointerDeltaX = 0;
      pointerDeltaY = 0;
      return delta;
    },
  };
}
