import {
  BoxGeometry,
  BufferGeometry,
  CircleGeometry,
  Color,
  Float32BufferAttribute,
  Group,
  Line,
  LineBasicMaterial,
  Mesh,
  MeshBasicMaterial,
  OrthographicCamera,
  Scene,
  Vector3,
  WebGLRenderer,
} from "three";
import type { EnemyType, MissionView } from "../services/backend";

export interface SceneTheme {
  background: string;
  grid: string;
  selected: string;
  shipColor: string;
  friendlyColor: string;
  contactPulseSpeed?: number;
  contactPulseAmount?: number;
}

const DEFAULT_THEME: SceneTheme = {
  background: "#030608",
  grid: "#1a3040",
  selected: "#ffe680",
  shipColor: "#00e5ff",
  friendlyColor: "#22cc44",
};

const PULSE_DEFAULTS = {
  contactPulseSpeed: 4,
  contactPulseAmount: 0.15,
};

// --- Orbital strike projectile tracking ---
interface Projectile {
  x: number;       // target X (strike column)
  fromY: number;   // top of arena (orbit)
  toY: number;     // target Y
  spawnTime: number;
}

const PROJECTILE_LIFETIME_MS = 300;

// --- Explosion particle tracking ---
export type ExplosionType = "hit" | "kill" | "breach";

interface ExplosionParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  size: number;
}

interface Explosion {
  particles: ExplosionParticle[];
  spawnTime: number;
  lifetime: number;
}

const EXPLOSION_CONFIGS: Record<ExplosionType, { count: number; lifetime: number; spread: number; size: number; colors: string[] }> = {
  hit:    { count: 6,  lifetime: 200, spread: 60,  size: 3, colors: ["#ff8800", "#ffaa33"] },
  kill:   { count: 12, lifetime: 400, spread: 100, size: 5, colors: ["#ff2222", "#ffffff", "#ff6644"] },
  breach: { count: 8,  lifetime: 250, spread: 50,  size: 3, colors: ["#ff3333", "#cc1111"] },
};

function enemyColor(type: EnemyType): string {
  switch (type) {
    case "RED_CUBE":
      return "#ff2222";
    case "HEAVY_RED_CUBE":
      return "#cc1111";
    case "ALIEN_8_BIT":
      return "#ff00ff";
    default:
      return "#ff2222";
  }
}

function enemySize(type: EnemyType): number {
  switch (type) {
    case "RED_CUBE":
      return 14;
    case "HEAVY_RED_CUBE":
      return 22;
    case "ALIEN_8_BIT":
      return 16;
    default:
      return 14;
  }
}

function makeLineGeometry(ax: number, ay: number, bx: number, by: number): BufferGeometry {
  const geo = new BufferGeometry();
  geo.setFromPoints([new Vector3(ax, ay, 0), new Vector3(bx, by, 0)]);
  return geo;
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

export function createDefenseScene(canvas: HTMLCanvasElement, theme: Partial<SceneTheme> = {}) {
  const colors = { ...DEFAULT_THEME, ...theme };
  const pulse = {
    contactPulseSpeed: theme.contactPulseSpeed ?? PULSE_DEFAULTS.contactPulseSpeed,
    contactPulseAmount: theme.contactPulseAmount ?? PULSE_DEFAULTS.contactPulseAmount,
  };

  const LOGICAL_W = 640;
  const LOGICAL_H = 640;
  const centerX = LOGICAL_W / 2;
  const centerY = LOGICAL_H / 2;

  // --- Renderer ---
  const renderer = new WebGLRenderer({ canvas, antialias: true });
  renderer.setClearColor(new Color(colors.background), 1);

  function syncRendererSize(): void {
    const rect = canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const bufferW = Math.round(rect.width * dpr);
    const bufferH = Math.round(rect.height * dpr);
    if (bufferW === 0 || bufferH === 0) return;
    if (canvas.width !== bufferW || canvas.height !== bufferH) {
      renderer.setSize(bufferW, bufferH, false);
    }
  }

  syncRendererSize();
  const resizeObserver = new ResizeObserver(() => syncRendererSize());
  resizeObserver.observe(canvas);

  // --- Camera (top-down, Y-flipped to match Canvas2D coords) ---
  const camera = new OrthographicCamera(-centerX, centerX, -centerY, centerY, 0.1, 200);
  camera.position.set(centerX, centerY, 100);
  camera.lookAt(centerX, centerY, 0);

  // --- Scene ---
  const scene = new Scene();

  // --- Sparse coordinate grid (lines every 80px) ---
  const gridMaterial = new LineBasicMaterial({ color: new Color(colors.grid) });
  const gridGroup = new Group();
  for (let x = 0; x <= LOGICAL_W; x += 80) {
    gridGroup.add(new Line(makeLineGeometry(x, 0, x, LOGICAL_H), gridMaterial));
  }
  for (let y = 0; y <= LOGICAL_H; y += 80) {
    gridGroup.add(new Line(makeLineGeometry(0, y, LOGICAL_W, y), gridMaterial));
  }
  scene.add(gridGroup);

  // --- Player ship at center (diamond shape) ---
  const shipGeo = new BufferGeometry();
  const s = 12;
  shipGeo.setAttribute(
    "position",
    new Float32BufferAttribute(
      [
        0, s, 0,    // top
        -s * 0.6, 0, 0, // left
        0, -s * 0.5, 0, // bottom
        s * 0.6, 0, 0,  // right
        0, s, 0,    // close
      ],
      3,
    ),
  );
  const shipLine = new Line(shipGeo, new LineBasicMaterial({ color: new Color(colors.shipColor) }));
  shipLine.position.set(centerX, centerY, 1);
  scene.add(shipLine);

  // --- Friendly cube cluster (12 cubes around center) ---
  const friendlyGroup = new Group();
  const friendlyMaterial = new MeshBasicMaterial({
    color: new Color(colors.friendlyColor),
    transparent: true,
    opacity: 0.6,
  });
  const friendlyOffsets: [number, number, number][] = [
    // [offsetX, offsetY, cubeSize]
    [0, 0, 14],
    [-16, 10, 12],
    [16, 10, 12],
    [-12, -14, 11],
    [12, -14, 11],
    [-24, -2, 10],
    [24, -2, 10],
    [0, 20, 10],
    [0, -22, 10],
    [-22, 14, 10],
    [22, 14, 10],
    [-8, 6, 12],
  ];
  const friendlyCubes: Mesh[] = [];
  for (const [ox, oy, size] of friendlyOffsets) {
    const geo = new BoxGeometry(size, size, size);
    const cube = new Mesh(geo, friendlyMaterial.clone());
    cube.position.set(centerX + ox, centerY + oy, 0.5);
    cube.rotation.y = Math.random() * Math.PI * 0.4 - 0.2;
    friendlyCubes.push(cube);
    friendlyGroup.add(cube);
  }
  scene.add(friendlyGroup);

  // --- Enemies group (rebuilt each frame) ---
  const enemiesGroup = new Group();
  scene.add(enemiesGroup);

  // --- Projectiles group ---
  const projectilesGroup = new Group();
  scene.add(projectilesGroup);

  // --- Shared materials ---
  const selectionMaterial = new LineBasicMaterial({ color: new Color(colors.selected) });

  // --- Active projectiles & explosions ---
  const activeProjectiles: Projectile[] = [];
  const activeExplosions: Explosion[] = [];

  // --- Explosions group ---
  const explosionsGroup = new Group();
  scene.add(explosionsGroup);

  function clearEnemies(): void {
    for (let i = enemiesGroup.children.length - 1; i >= 0; i--) {
      const child = enemiesGroup.children[i] as Mesh | Line | Group;
      if ((child as Mesh).geometry) (child as Mesh).geometry.dispose();
      if ((child as Mesh).material) {
        const mat = (child as Mesh).material;
        if (mat !== selectionMaterial && mat !== gridMaterial) {
          if (Array.isArray(mat)) mat.forEach((m) => m.dispose());
          else if (typeof mat.dispose === "function") mat.dispose();
        }
      }
      // Handle sub-groups (HP bar, alien cross)
      if (child instanceof Group) {
        child.traverse((obj) => {
          const o = obj as Mesh | Line;
          if (o.geometry) o.geometry.dispose();
          if (o.material) {
            const m = o.material;
            if (Array.isArray(m)) m.forEach((x) => x.dispose());
            else if (typeof m.dispose === "function") m.dispose();
          }
        });
      }
      enemiesGroup.remove(child);
    }
  }

  function clearProjectiles(): void {
    for (let i = projectilesGroup.children.length - 1; i >= 0; i--) {
      const child = projectilesGroup.children[i] as Line;
      if (child.geometry) child.geometry.dispose();
      if (child.material) {
        const mat = child.material;
        if (Array.isArray(mat)) mat.forEach((m) => m.dispose());
        else if (typeof mat.dispose === "function") mat.dispose();
      }
      projectilesGroup.remove(child);
    }
  }

  function clearExplosions(): void {
    for (let i = explosionsGroup.children.length - 1; i >= 0; i--) {
      const child = explosionsGroup.children[i] as Mesh;
      if (child.geometry) child.geometry.dispose();
      if (child.material) {
        const mat = child.material;
        if (Array.isArray(mat)) mat.forEach((m) => m.dispose());
        else if (typeof mat.dispose === "function") mat.dispose();
      }
      explosionsGroup.remove(child);
    }
  }

  function addProjectile(target: { x: number; y: number }): void {
    activeProjectiles.push({
      x: target.x,
      fromY: -40,        // above the arena (from orbit)
      toY: target.y,
      spawnTime: performance.now(),
    });
  }

  function addExplosion(x: number, y: number, type: ExplosionType): void {
    const cfg = EXPLOSION_CONFIGS[type];
    const particles: ExplosionParticle[] = [];
    for (let i = 0; i < cfg.count; i++) {
      const angle = (i / cfg.count) * Math.PI * 2 + (Math.random() - 0.5) * 0.5;
      const speed = cfg.spread * (0.5 + Math.random() * 0.5);
      particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        color: cfg.colors[Math.floor(Math.random() * cfg.colors.length)],
        size: cfg.size * (0.6 + Math.random() * 0.8),
      });
    }
    activeExplosions.push({ particles, spawnTime: performance.now(), lifetime: cfg.lifetime });
  }

  function render(view: MissionView): void {
    const now = performance.now();

    // --- Update friendly cubes based on integrity ---
    const integrityFrac = view.integrity / 100;
    const visibleCount = Math.ceil(integrityFrac * friendlyCubes.length);
    for (let i = 0; i < friendlyCubes.length; i++) {
      friendlyCubes[i].visible = i < visibleCount;
      if (friendlyCubes[i].visible) {
        (friendlyCubes[i].material as MeshBasicMaterial).opacity = 0.3 + integrityFrac * 0.5;
      }
    }

    // --- Rebuild enemies ---
    clearEnemies();

    for (const contact of view.contacts) {
      const size = enemySize(contact.enemy_type);
      const color = enemyColor(contact.enemy_type);

      if (contact.enemy_type === "ALIEN_8_BIT") {
        // Cross shape: two overlapping boxes
        const crossGroup = new Group();
        const mat = new MeshBasicMaterial({ color: new Color(color) });
        const hBox = new Mesh(new BoxGeometry(size * 2, size * 0.6, size * 0.6), mat);
        const vBox = new Mesh(new BoxGeometry(size * 0.6, size * 2, size * 0.6), mat.clone());
        crossGroup.add(hBox);
        crossGroup.add(vBox);
        crossGroup.position.set(contact.x, contact.y, 0.5);

        // Pulse animation
        if (pulse.contactPulseAmount > 0) {
          const p = 1 + Math.sin((now / 1000) * pulse.contactPulseSpeed) * pulse.contactPulseAmount;
          crossGroup.scale.set(p, p, 1);
        }

        enemiesGroup.add(crossGroup);
      } else {
        // Box enemy
        const mesh = new Mesh(
          new BoxGeometry(size, size, size),
          new MeshBasicMaterial({ color: new Color(color) }),
        );
        mesh.position.set(contact.x, contact.y, 0.5);

        if (pulse.contactPulseAmount > 0) {
          const p = 1 + Math.sin((now / 1000) * pulse.contactPulseSpeed) * pulse.contactPulseAmount;
          mesh.scale.set(p, p, 1);
        }

        enemiesGroup.add(mesh);
      }

      // Red glow halo behind enemy
      const haloRadius = size * 1.8;
      const halo = new Mesh(
        new CircleGeometry(haloRadius, 24),
        new MeshBasicMaterial({
          color: new Color(color),
          transparent: true,
          opacity: 0.12,
        }),
      );
      halo.position.set(contact.x, contact.y, 0.3);
      enemiesGroup.add(halo);

      // HP bar for multi-HP enemies
      if (contact.max_hp > 1) {
        const barWidth = size * 2.5;
        const barHeight = 3;
        const hpFrac = contact.hp / contact.max_hp;

        // Background bar
        const bgBar = new Mesh(
          new BoxGeometry(barWidth, barHeight, 0.1),
          new MeshBasicMaterial({ color: new Color("#333333") }),
        );
        bgBar.position.set(contact.x, contact.y - size - 5, 0.8);
        enemiesGroup.add(bgBar);

        // Foreground bar
        const fgWidth = barWidth * hpFrac;
        const fgBar = new Mesh(
          new BoxGeometry(fgWidth, barHeight, 0.1),
          new MeshBasicMaterial({ color: new Color(hpFrac > 0.5 ? "#44ff44" : "#ff4444") }),
        );
        fgBar.position.set(
          contact.x - (barWidth - fgWidth) / 2,
          contact.y - size - 5,
          0.9,
        );
        enemiesGroup.add(fgBar);
      }

      // Selection ring
      if (contact.selected) {
        const ringSize = size + 6;
        const ring = new Line(makeCircleGeometry(ringSize, 32), selectionMaterial);
        ring.position.set(contact.x, contact.y, 1);
        ring.rotation.z = (now / 1000) * 0.02 * Math.PI * 2;
        if (pulse.contactPulseAmount > 0) {
          const ringPulse = 1 + Math.sin((now / 1000) * 2) * 0.08;
          ring.scale.set(ringPulse, ringPulse, 1);
        }
        enemiesGroup.add(ring);
      }
    }

    // --- Draw active projectiles (orbital strike: vertical drop) ---
    clearProjectiles();

    // Remove expired projectiles
    while (activeProjectiles.length > 0 && now - activeProjectiles[0].spawnTime > PROJECTILE_LIFETIME_MS) {
      activeProjectiles.shift();
    }

    for (const proj of activeProjectiles) {
      const age = now - proj.spawnTime;
      const t = Math.min(age / PROJECTILE_LIFETIME_MS, 1);
      // Leading edge drops from top to target Y
      const headY = proj.fromY + (proj.toY - proj.fromY) * t;
      // Trailing edge follows, creating a short bolt
      const tailT = Math.max(0, t - 0.25);
      const tailY = proj.fromY + (proj.toY - proj.fromY) * tailT;

      const projLine = new Line(
        makeLineGeometry(proj.x, tailY, proj.x, headY),
        new LineBasicMaterial({
          color: new Color("#ccffff"),
          transparent: true,
          opacity: 1 - t * 0.4,
        }),
      );
      projLine.position.z = 2;
      projectilesGroup.add(projLine);
    }

    // --- Draw active explosions ---
    clearExplosions();

    // Remove expired explosions
    while (activeExplosions.length > 0 && now - activeExplosions[0].spawnTime > activeExplosions[0].lifetime) {
      activeExplosions.shift();
    }

    for (const explosion of activeExplosions) {
      const age = now - explosion.spawnTime;
      const t = Math.min(age / explosion.lifetime, 1);
      const opacity = 1 - t;

      for (const p of explosion.particles) {
        const px = p.x + p.vx * t;
        const py = p.y + p.vy * t;
        const particleMesh = new Mesh(
          new BoxGeometry(p.size, p.size, p.size),
          new MeshBasicMaterial({
            color: new Color(p.color),
            transparent: true,
            opacity: opacity * 0.8,
          }),
        );
        particleMesh.position.set(px, py, 3);
        explosionsGroup.add(particleMesh);
      }
    }

    renderer.render(scene, camera);
  }

  function dispose(): void {
    resizeObserver.disconnect();
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

  return { render, addProjectile, addExplosion, dispose };
}
