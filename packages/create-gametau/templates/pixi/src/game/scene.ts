import { Application, Graphics, Text, TextStyle } from "pixi.js";

let app: Application;
let rect: Graphics;
let angle = 0;

export async function initScene(container: HTMLElement): Promise<void> {
  app = new Application();
  await app.init({
    resizeTo: window,
    background: 0x1a1a2e,
    antialias: true,
  });
  container.appendChild(app.canvas);

  // Spinning rectangle
  rect = new Graphics();
  drawRect();
  rect.x = window.innerWidth / 2;
  rect.y = window.innerHeight / 2;
  rect.pivot.set(50, 50);
  app.stage.addChild(rect);

  // Title text
  const style = new TextStyle({
    fontFamily: "monospace",
    fontSize: 16,
    fill: 0x00d4aa,
  });
  const text = new Text({ text: "gametau + PixiJS", style });
  text.x = window.innerWidth / 2;
  text.y = window.innerHeight - 40;
  text.anchor.set(0.5);
  app.stage.addChild(text);
}

function drawRect(): void {
  rect.clear();
  rect.rect(0, 0, 100, 100);
  rect.fill(0x00d4aa);
}

export function updateScene(): void {
  angle += 0.02;
  rect.rotation = angle;
}
