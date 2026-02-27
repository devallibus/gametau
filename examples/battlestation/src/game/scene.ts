import type { ContactView, MissionView, ThreatClass } from "../services/backend";

export interface RadarTheme {
  background: string;
  grid: string;
  sweep: string;
  selected: string;
}

const DEFAULT_THEME: RadarTheme = {
  background: "#050811",
  grid: "#2a5a7d",
  sweep: "#37c6ff",
  selected: "#ffe680",
};

function threatColor(threat: ThreatClass): string {
  switch (threat) {
    case "LOW":
      return "#76f7b0";
    case "MED":
      return "#ffd166";
    case "HIGH":
      return "#ff9f43";
    case "CRITICAL":
      return "#ff4d6d";
    default:
      return "#9de2ff";
  }
}

export function createRadarScene(canvas: HTMLCanvasElement, theme: Partial<RadarTheme> = {}) {
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Canvas 2D context is unavailable.");
  const ctx: CanvasRenderingContext2D = context;

  const colors = { ...DEFAULT_THEME, ...theme };
  const centerX = canvas.width / 2;
  const centerY = canvas.height / 2;
  const radius = Math.min(centerX, centerY) - 24;
  let sweepAngle = 0;

  function drawGrid(): void {
    ctx.strokeStyle = colors.grid;
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
    ctx.stroke();

    for (let i = 1; i <= 3; i++) {
      ctx.beginPath();
      ctx.arc(centerX, centerY, (radius / 4) * i, 0, Math.PI * 2);
      ctx.stroke();
    }

    ctx.beginPath();
    ctx.moveTo(centerX - radius, centerY);
    ctx.lineTo(centerX + radius, centerY);
    ctx.moveTo(centerX, centerY - radius);
    ctx.lineTo(centerX, centerY + radius);
    ctx.stroke();
  }

  function drawSweep(): void {
    const endX = centerX + Math.cos(sweepAngle) * radius;
    const endY = centerY + Math.sin(sweepAngle) * radius;
    ctx.strokeStyle = colors.sweep;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(centerX, centerY);
    ctx.lineTo(endX, endY);
    ctx.stroke();
    sweepAngle += 0.03;
  }

  function drawContact(contact: ContactView): void {
    ctx.fillStyle = threatColor(contact.threat);
    const size = 4 + contact.progress * 6;
    ctx.beginPath();
    ctx.arc(contact.x, contact.y, size, 0, Math.PI * 2);
    ctx.fill();

    if (contact.selected) {
      ctx.strokeStyle = colors.selected;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(contact.x, contact.y, size + 6, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  function render(view: MissionView): void {
    ctx.fillStyle = colors.background;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    drawGrid();
    drawSweep();
    for (const contact of view.contacts) {
      drawContact(contact);
    }
  }

  return { render };
}
