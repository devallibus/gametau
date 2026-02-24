let canvas: HTMLCanvasElement;
let ctx: CanvasRenderingContext2D;
let angle = 0;

export async function initScene(container: HTMLElement): Promise<void> {
  canvas = document.createElement("canvas");
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  container.appendChild(canvas);

  ctx = canvas.getContext("2d")!;

  window.addEventListener("resize", () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  });
}

export function updateScene(): void {
  const w = canvas.width;
  const h = canvas.height;

  // Clear
  ctx.fillStyle = "#1a1a2e";
  ctx.fillRect(0, 0, w, h);

  // Spinning square
  const size = 80;
  ctx.save();
  ctx.translate(w / 2, h / 2);
  ctx.rotate(angle);
  ctx.fillStyle = "#00d4aa";
  ctx.fillRect(-size / 2, -size / 2, size, size);
  ctx.restore();

  angle += 0.02;

  // Label
  ctx.fillStyle = "#00d4aa";
  ctx.font = "16px monospace";
  ctx.textAlign = "center";
  ctx.fillText("gametau + Canvas2D", w / 2, h - 24);
}
