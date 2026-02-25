import { Application, Graphics, Text, TextStyle } from "pixi.js";
import { tick, type GameView } from "../services/backend";

// Constants matching Rust core
const WIDTH = 800;
const HEIGHT = 600;
const PADDLE_WIDTH = 15;
const PADDLE_HEIGHT = 80;
const PADDLE_OFFSET = 30;
const BALL_RADIUS = 8;

export async function createScene(container: HTMLElement) {
  const app = new Application();
  await app.init({
    width: WIDTH,
    height: HEIGHT,
    backgroundColor: 0x0a0a1a,
    antialias: true,
  });
  container.appendChild(app.canvas);

  // Midline
  const midline = new Graphics();
  for (let y = 0; y < HEIGHT; y += 20) {
    midline.rect(WIDTH / 2 - 1, y, 2, 10);
  }
  midline.fill({ color: 0x333344 });
  app.stage.addChild(midline);

  // Paddles
  const leftPaddle = new Graphics();
  const rightPaddle = new Graphics();
  app.stage.addChild(leftPaddle);
  app.stage.addChild(rightPaddle);

  // Ball
  const ball = new Graphics();
  app.stage.addChild(ball);

  // Score text
  const scoreStyle = new TextStyle({
    fontFamily: "monospace",
    fontSize: 48,
    fill: 0x00d4aa,
    fontWeight: "bold",
  });
  const leftScoreText = new Text({ text: "0", style: scoreStyle });
  leftScoreText.anchor.set(0.5);
  leftScoreText.x = WIDTH / 2 - 60;
  leftScoreText.y = 40;
  app.stage.addChild(leftScoreText);

  const rightScoreText = new Text({ text: "0", style: scoreStyle });
  rightScoreText.anchor.set(0.5);
  rightScoreText.x = WIDTH / 2 + 60;
  rightScoreText.y = 40;
  app.stage.addChild(rightScoreText);

  // Input state
  const keys = new Set<string>();
  window.addEventListener("keydown", (e) => keys.add(e.key));
  window.addEventListener("keyup", (e) => keys.delete(e.key));

  function getInput(): { left: number; right: number } {
    let left = 0;
    let right = 0;
    if (keys.has("w") || keys.has("W")) left = -1;
    if (keys.has("s") || keys.has("S")) left = 1;
    if (keys.has("ArrowUp")) right = -1;
    if (keys.has("ArrowDown")) right = 1;
    return { left, right };
  }

  function render(view: GameView) {
    // Left paddle
    leftPaddle.clear();
    leftPaddle.roundRect(
      PADDLE_OFFSET,
      view.left_y - PADDLE_HEIGHT / 2,
      PADDLE_WIDTH,
      PADDLE_HEIGHT,
      4,
    );
    leftPaddle.fill({ color: 0x00d4aa });

    // Right paddle
    rightPaddle.clear();
    rightPaddle.roundRect(
      WIDTH - PADDLE_OFFSET - PADDLE_WIDTH,
      view.right_y - PADDLE_HEIGHT / 2,
      PADDLE_WIDTH,
      PADDLE_HEIGHT,
      4,
    );
    rightPaddle.fill({ color: 0x00d4aa });

    // Ball
    ball.clear();
    ball.circle(view.ball_x, view.ball_y, BALL_RADIUS);
    ball.fill({ color: 0xffffff });

    // Scores
    leftScoreText.text = String(view.left_score);
    rightScoreText.text = String(view.right_score);
  }

  // Game loop
  let lastTime = performance.now();

  app.ticker.add(async () => {
    const now = performance.now();
    const dt = (now - lastTime) / 1000;
    lastTime = now;

    const input = getInput();
    const view = await tick(dt, input.left, input.right);
    render(view);
  });
}
