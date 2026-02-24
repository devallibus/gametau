type TickFn = (dt: number) => void;
type RenderFn = () => void;

let running = false;
let lastTime = 0;

export function startGameLoop(tick: TickFn, render: RenderFn): void {
  running = true;
  lastTime = performance.now();

  function frame(now: number) {
    if (!running) return;

    const dt = (now - lastTime) / 1000; // seconds
    lastTime = now;

    tick(dt);
    render();

    requestAnimationFrame(frame);
  }

  requestAnimationFrame(frame);
}

export function stopGameLoop(): void {
  running = false;
}
