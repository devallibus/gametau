import { Application, Graphics, Text, TextStyle } from "pixi.js";
import { createAssetLoader } from "webtau/assets";
import { createAudioController } from "webtau/audio";
import { createInputController } from "webtau/input";
import { tick, type GameView } from "../services/backend";

// Constants matching Rust core
const WIDTH = 800;
const HEIGHT = 600;
const PADDLE_WIDTH = 15;
const PADDLE_HEIGHT = 80;
const PADDLE_OFFSET = 30;
const BALL_RADIUS = 8;

interface PongThemeFile {
  backgroundColor: string;
  midlineColor: string;
  paddleColor: string;
  ballColor: string;
  scoreColor: string;
}

interface PongTheme {
  backgroundColor: number;
  midlineColor: number;
  paddleColor: number;
  ballColor: number;
  scoreColor: number;
}

const DEFAULT_THEME_FILE: PongThemeFile = {
  backgroundColor: "#0a0a1a",
  midlineColor: "#333344",
  paddleColor: "#00d4aa",
  ballColor: "#ffffff",
  scoreColor: "#00d4aa",
};

function parseHexColor(value: string, fallback: number): number {
  const normalized = value.trim().replace(/^#/, "");
  if (!/^[0-9A-Fa-f]{6}$/.test(normalized)) return fallback;
  return parseInt(normalized, 16);
}

function resolveTheme(themeFile: PongThemeFile): PongTheme {
  return {
    backgroundColor: parseHexColor(themeFile.backgroundColor, 0x0a0a1a),
    midlineColor: parseHexColor(themeFile.midlineColor, 0x333344),
    paddleColor: parseHexColor(themeFile.paddleColor, 0x00d4aa),
    ballColor: parseHexColor(themeFile.ballColor, 0xffffff),
    scoreColor: parseHexColor(themeFile.scoreColor, 0x00d4aa),
  };
}

function toDigitalAxis(value: number): number {
  if (Math.abs(value) < 0.2) return 0;
  return value > 0 ? 1 : -1;
}

function pickAxis(...values: number[]): number {
  for (const value of values) {
    if (value !== 0) return value;
  }
  return 0;
}

function touchAxisForSide(
  touches: Array<{ x: number; y: number }>,
  side: "left" | "right",
  bounds: DOMRect,
): number {
  for (const touch of touches) {
    const x = touch.x - bounds.left;
    const y = touch.y - bounds.top;
    if (x < 0 || y < 0 || x > bounds.width || y > bounds.height) continue;
    const onSide = side === "left" ? x < bounds.width / 2 : x >= bounds.width / 2;
    if (!onSide) continue;
    return y < bounds.height / 2 ? -1 : 1;
  }
  return 0;
}

export async function createScene(container: HTMLElement) {
  const assets = createAssetLoader();
  const audio = createAudioController();
  const input = createInputController();

  const themeFile = await assets
    .loadJson<PongThemeFile>("assets/pong-theme.json")
    .catch(() => DEFAULT_THEME_FILE);
  const theme = resolveTheme(themeFile);

  const app = new Application();
  await app.init({
    width: WIDTH,
    height: HEIGHT,
    backgroundColor: theme.backgroundColor,
    antialias: true,
  });
  app.canvas.title = "Click to enable pointer lock + audio";
  container.appendChild(app.canvas);

  const unlockAudio = () => {
    void audio.resume();
  };
  window.addEventListener("keydown", unlockAudio, { once: true });
  window.addEventListener("touchstart", unlockAudio, { once: true });
  app.canvas.addEventListener("click", () => {
    void audio.resume();
    void input.requestPointerLock(app.canvas);
  });

  // Midline
  const midline = new Graphics();
  for (let y = 0; y < HEIGHT; y += 20) {
    midline.rect(WIDTH / 2 - 1, y, 2, 10);
  }
  midline.fill({ color: theme.midlineColor });
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
    fill: theme.scoreColor,
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

  function getInput(): { left: number; right: number } {
    const keyboardLeft = input.keyAxis(["w", "W"], ["s", "S"]);
    const keyboardRight = input.keyAxis("ArrowUp", "ArrowDown");

    const gamepadLeft = toDigitalAxis(input.gamepadAxis(1, { deadzone: 0.2 }));
    const rightStick = toDigitalAxis(input.gamepadAxis(3, { deadzone: 0.2 }));
    const secondPad = toDigitalAxis(input.gamepadAxis(1, { gamepadIndex: 1, deadzone: 0.2 }));
    const gamepadRight = rightStick !== 0 ? rightStick : secondPad;

    const touches = input.touches();
    const bounds = app.canvas.getBoundingClientRect();
    const touchLeft = touchAxisForSide(touches, "left", bounds);
    const touchRight = touchAxisForSide(touches, "right", bounds);

    const pointerY = input.isPointerLocked(app.canvas) ? input.consumePointerDelta().y : 0;
    const pointerRight = toDigitalAxis(pointerY);

    return {
      left: pickAxis(keyboardLeft, touchLeft, gamepadLeft),
      right: pickAxis(keyboardRight, pointerRight, touchRight, gamepadRight),
    };
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
    leftPaddle.fill({ color: theme.paddleColor });

    // Right paddle
    rightPaddle.clear();
    rightPaddle.roundRect(
      WIDTH - PADDLE_OFFSET - PADDLE_WIDTH,
      view.right_y - PADDLE_HEIGHT / 2,
      PADDLE_WIDTH,
      PADDLE_HEIGHT,
      4,
    );
    rightPaddle.fill({ color: theme.paddleColor });

    // Ball
    ball.clear();
    ball.circle(view.ball_x, view.ball_y, BALL_RADIUS);
    ball.fill({ color: theme.ballColor });

    // Scores
    leftScoreText.text = String(view.left_score);
    rightScoreText.text = String(view.right_score);
  }

  // Game loop
  let lastTime = performance.now();
  let lastLeftScore = 0;
  let lastRightScore = 0;

  app.ticker.add(async () => {
    const now = performance.now();
    const dt = (now - lastTime) / 1000;
    lastTime = now;

    const inputState = getInput();
    const view = await tick(dt, inputState.left, inputState.right);
    render(view);

    const scored =
      view.left_score !== lastLeftScore || view.right_score !== lastRightScore;
    if (scored) {
      const frequency = view.left_score !== lastLeftScore ? 784 : 622;
      void audio.playTone(frequency, 120, { type: "square", gain: 0.15 });
      lastLeftScore = view.left_score;
      lastRightScore = view.right_score;
    }
  });
}
