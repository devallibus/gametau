import {
  BufferGeometry,
  CircleGeometry,
  Color,
  Float32BufferAttribute,
  Group,
  Line,
  LineBasicMaterial,
  MathUtils,
  Mesh,
  MeshBasicMaterial,
  OrthographicCamera,
  Scene,
  Vector3,
  WebGLRenderer,
} from "three";
import type { MissionView, ThreatClass } from "../services/backend";

export interface RadarTheme {
  background: string;
  grid: string;
  sweep: string;
  selected: string;
  /** Phase 2: camera tilt from vertical in degrees (0 = top-down). */
  cameraTiltDeg?: number;
  /** Phase 2: pulse oscillation speed for CRITICAL contacts. */
  contactPulseSpeed?: number;
  /** Phase 2: pulse oscillation amplitude (0–1 range). */
  contactPulseAmount?: number;
  /** Phase 2: enable z-depth layering for grid/contacts/sweep. */
  enableDepthLayers?: boolean;
}

const DEFAULT_THEME: RadarTheme = {
  background: "#050811",
  grid: "#2a5a7d",
  sweep: "#37c6ff",
  selected: "#ffe680",
};

const PHASE2_DEFAULTS = {
  cameraTiltDeg: 0,
  contactPulseSpeed: 4,
  contactPulseAmount: 0.15,
  enableDepthLayers: false,
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

/** Z-depth by threat level (used when depth layers enabled). */
function threatDepth(threat: ThreatClass): number {
  switch (threat) {
    case "LOW":
      return 1;
    case "MED":
      return 2;
    case "HIGH":
      return 3;
    case "CRITICAL":
      return 3;
    default:
      return 1;
  }
}

/** Glow intensity factor by threat level (0–1). */
function threatGlow(threat: ThreatClass): number {
  switch (threat) {
    case "LOW":
      return 0;
    case "MED":
      return 0.15;
    case "HIGH":
      return 0.3;
    case "CRITICAL":
      return 0.5;
    default:
      return 0;
  }
}

function makeCircleGeometry(r: number, segments: number): BufferGeometry {
  const positions: number[] = [];
  for (let i = 0; i <= segments; i++) {
    const angle = (i / segments) * Math.PI * 2;
    positions.push(Math.cos(angle) * r, Math.sin(angle) * r, 0);
  }
  const geo = new BufferGeometry();
  geo.setAttribute("position", new Float32BufferAttribute(positions, 3));
  return geo;
}

function makeLineGeometry(ax: number, ay: number, bx: number, by: number): BufferGeometry {
  const geo = new BufferGeometry();
  geo.setFromPoints([new Vector3(ax, ay, 0), new Vector3(bx, by, 0)]);
  return geo;
}

export function createRadarScene(canvas: HTMLCanvasElement, theme: Partial<RadarTheme> = {}) {
  const colors = { ...DEFAULT_THEME, ...theme };
  const polish = {
    cameraTiltDeg: theme.cameraTiltDeg ?? PHASE2_DEFAULTS.cameraTiltDeg,
    contactPulseSpeed: theme.contactPulseSpeed ?? PHASE2_DEFAULTS.contactPulseSpeed,
    contactPulseAmount: theme.contactPulseAmount ?? PHASE2_DEFAULTS.contactPulseAmount,
    enableDepthLayers: theme.enableDepthLayers ?? PHASE2_DEFAULTS.enableDepthLayers,
  };

  const w = canvas.width;
  const h = canvas.height;
  const centerX = w / 2;
  const centerY = h / 2;
  const radius = Math.min(centerX, centerY) - 24;

  // --- Z-depths (flat when disabled) ---
  const zGrid = 0;
  const zSweep = polish.enableDepthLayers ? 5 : 0;

  // --- Renderer ---
  const renderer = new WebGLRenderer({ canvas, antialias: true });
  renderer.setSize(w, h, false);
  renderer.setClearColor(new Color(colors.background), 1);

  // --- Camera ---
  // OrthographicCamera(left, right, top, bottom, near, far)
  // top=0 / bottom=h flips Y to match Canvas2D coordinates.
  const camera = new OrthographicCamera(0, w, 0, h, 0.1, 200);

  const tiltRad = MathUtils.degToRad(polish.cameraTiltDeg);
  if (tiltRad > 0) {
    // Position camera tilted from vertical — objects at different z-depths
    // shift vertically, creating a parallax effect under orthographic projection.
    const camDist = 100;
    camera.position.set(
      0,
      -camDist * Math.sin(tiltRad),
      camDist * Math.cos(tiltRad),
    );
    camera.lookAt(0, 0, 0);
  } else {
    camera.position.set(0, 0, 100);
  }

  // --- Scene ---
  const scene = new Scene();

  // --- Grid (z = zGrid) ---
  const gridMaterial = new LineBasicMaterial({ color: new Color(colors.grid) });
  const gridGroup = new Group();
  gridGroup.position.set(centerX, centerY, zGrid);

  for (const fraction of [0.25, 0.5, 0.75, 1]) {
    gridGroup.add(new Line(makeCircleGeometry(radius * fraction, 64), gridMaterial));
  }
  gridGroup.add(new Line(makeLineGeometry(-radius, 0, radius, 0), gridMaterial));
  gridGroup.add(new Line(makeLineGeometry(0, -radius, 0, radius), gridMaterial));
  scene.add(gridGroup);

  // --- Sweep line (z = zSweep) ---
  const sweepMaterial = new LineBasicMaterial({ color: new Color(colors.sweep) });
  const sweepLine = new Line(makeLineGeometry(0, 0, radius, 0), sweepMaterial);
  sweepLine.position.set(centerX, centerY, zSweep);
  scene.add(sweepLine);

  // --- Contacts group (rebuilt each frame) ---
  const contactsGroup = new Group();
  scene.add(contactsGroup);

  // --- Shared materials ---
  const selectionMaterial = new LineBasicMaterial({ color: new Color(colors.selected) });

  function clearContacts(): void {
    for (let i = contactsGroup.children.length - 1; i >= 0; i--) {
      const child = contactsGroup.children[i] as Mesh | Line;
      if (child.geometry) child.geometry.dispose();
      if (child.material && child.material !== selectionMaterial && child.material !== gridMaterial) {
        const mat = child.material;
        if (Array.isArray(mat)) mat.forEach((m) => m.dispose());
        else mat.dispose();
      }
      contactsGroup.remove(child);
    }
  }

  function render(view: MissionView): void {
    const now = performance.now() / 1000;

    // Advance sweep
    sweepLine.rotation.z -= 0.03;

    clearContacts();

    for (const contact of view.contacts) {
      const size = 4 + contact.progress * 6;
      const zContact = polish.enableDepthLayers ? threatDepth(contact.threat) : 0;

      // Phase 2: glow halo behind contact
      const glow = threatGlow(contact.threat);
      if (glow > 0) {
        const glowMesh = new Mesh(
          new CircleGeometry(size * 2.5, 16),
          new MeshBasicMaterial({
            color: new Color(threatColor(contact.threat)),
            transparent: true,
            opacity: glow,
          }),
        );
        glowMesh.position.set(contact.x, contact.y, zContact - 0.1);
        contactsGroup.add(glowMesh);
      }

      // Contact blip
      const contactMesh = new Mesh(
        new CircleGeometry(size, 16),
        new MeshBasicMaterial({ color: new Color(threatColor(contact.threat)) }),
      );
      contactMesh.position.set(contact.x, contact.y, zContact);

      // Phase 2: pulse animation for CRITICAL contacts
      if (contact.threat === "CRITICAL" && polish.contactPulseAmount > 0) {
        const pulse = 1 + Math.sin(now * polish.contactPulseSpeed) * polish.contactPulseAmount;
        contactMesh.scale.set(pulse, pulse, 1);
      }

      contactsGroup.add(contactMesh);

      // Selection ring
      if (contact.selected) {
        const ringSize = size + 6;
        const ring = new Line(makeCircleGeometry(ringSize, 32), selectionMaterial);
        ring.position.set(contact.x, contact.y, zContact + 0.1);

        // Phase 2: selection ring slow rotation + pulse
        ring.rotation.z = now * 0.02 * Math.PI * 2;
        if (polish.contactPulseAmount > 0) {
          const ringPulse = 1 + Math.sin(now * 2) * 0.08;
          ring.scale.set(ringPulse, ringPulse, 1);
        }

        contactsGroup.add(ring);
      }
    }

    renderer.render(scene, camera);
  }

  function dispose(): void {
    scene.traverse((obj) => {
      const o = obj as Mesh | Line;
      if (o.geometry) o.geometry.dispose();
      if (o.material) {
        const mat = o.material;
        if (Array.isArray(mat)) mat.forEach((m) => m.dispose());
        else if (typeof mat.dispose === "function") mat.dispose();
      }
    });
    renderer.dispose();
  }

  return { render, dispose };
}
