import * as THREE from "three";
import {
  DEPOT_POSITION,
  DEPOT_RANGE,
  SECTORS,
  TOOLS,
} from "@/game/content";
import type { SectorDef } from "@/game/content";
import { buildToolMesh } from "./tool";
import {
  createDustTexture,
  createGround,
  createMountains,
  createRocks,
  createSky,
  heightAt,
  WORLD_RADIUS,
} from "./terrain";

const PATCH_MAX = 420;
const PARTICLE_COUNT = 260;
const EYE_HEIGHT = 1.68;
const DEPOT_X = DEPOT_POSITION.x;
const DEPOT_Z = DEPOT_POSITION.z;
const DRONE_SWEEP_RATE = 4.5;

export interface WorldConfig {
  sector: SectorDef;
  toolIndex: number;
  power: number;
  capacity: number;
  droneCount: number;
}

export interface WorldStatus {
  carried: number;
  capacity: number;
  remaining: number;
  initialDust: number;
  coverage: number;
  depotDistance: number;
  inRange: boolean;
  locked: boolean;
  sweeping: boolean;
  drones: number;
}

export interface WorldOptions {
  onLockChange: (locked: boolean) => void;
  onCleared: () => void;
}

export interface World {
  configure: (config: WorldConfig) => void;
  getStatus: () => WorldStatus;
  sell: () => number;
  resetSector: () => void;
  requestLock: () => void;
  dispose: () => void;
}

interface Patch {
  x: number;
  z: number;
  base: number;
  dust: number;
  rich: boolean;
  radius: number;
  rot: number;
}

interface DroneVisual {
  group: THREE.Group;
  target: number;
  phase: number;
}

export function createWorld(
  container: HTMLElement,
  options: WorldOptions,
): World {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(72, 1, 0.1, 400);
  camera.rotation.order = "YXZ";
  scene.add(camera);

  const renderer = new THREE.WebGLRenderer({
    antialias: true,
    powerPreference: "high-performance",
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.domElement.style.cssText =
    "display:block;width:100%;height:100%;touch-action:none";
  container.appendChild(renderer.domElement);

  const clock = new THREE.Clock();
  const dummy = new THREE.Object3D();
  const aimPoint = new THREE.Vector3();
  const forward = new THREE.Vector3();

  let config: WorldConfig = {
    sector: SECTORS.landing,
    toolIndex: 0,
    power: TOOLS[0].power,
    capacity: 80,
    droneCount: 0,
  };
  let currentSectorId = config.sector.id;

  /* ---------------------------------------------------------------- */
  /* Environment                                                       */
  /* ---------------------------------------------------------------- */

  scene.fog = new THREE.Fog(config.sector.fog, 24, 120);
  const { mesh: sky, uniforms: skyUniforms } = createSky(config.sector);
  scene.add(sky);

  const hemi = new THREE.HemisphereLight(0xffd9b0, 0x3a1a0e, 0.85);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xffe0bd, 2.6);
  sun.position.set(38, 52, 16);
  scene.add(sun);
  const rim = new THREE.DirectionalLight(0xff8f5a, 0.6);
  rim.position.set(-30, 18, -40);
  scene.add(rim);

  const scenery = new THREE.Group();
  scenery.name = "scenery";
  scene.add(scenery);

  function clearScenery() {
    for (const child of [...scenery.children]) {
      scenery.remove(child);
      child.traverse((object) => {
        if (object instanceof THREE.Mesh) {
          object.geometry.dispose();
          const material = object.material;
          if (Array.isArray(material)) material.forEach((m) => m.dispose());
          else material.dispose();
        }
      });
    }
  }

  function buildScenery(def: SectorDef) {
    clearScenery();
    scenery.add(createGround(def));
    scenery.add(createMountains(def));
    scenery.add(createRocks(def));
    scene.fog = new THREE.Fog(def.fog, 24, 120);
    skyUniforms.topColor.value.set(def.sky);
    skyUniforms.bottomColor.value.set(def.horizon);
    hemi.color.set(def.sky);
  }

  buildScenery(config.sector);

  /* ---------------------------------------------------------------- */
  /* Depot                                                             */
  /* ---------------------------------------------------------------- */

  const depotY = heightAt(DEPOT_X, DEPOT_Z);
  const depot = new THREE.Group();
  depot.position.set(DEPOT_X, depotY, DEPOT_Z);

  const padMaterial = new THREE.MeshStandardMaterial({
    color: "#39312c",
    roughness: 0.55,
    metalness: 0.6,
  });
  const pad = new THREE.Mesh(
    new THREE.CylinderGeometry(4.4, 4.6, 0.3, 40),
    padMaterial,
  );
  pad.position.y = 0.15;
  depot.add(pad);

  const glowMaterial = new THREE.MeshBasicMaterial({
    color: "#7df3ff",
    transparent: true,
    opacity: 0.9,
  });
  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(3.7, 0.09, 8, 64),
    glowMaterial,
  );
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.34;
  depot.add(ring);

  const crateMaterial = new THREE.MeshStandardMaterial({
    color: "#5b4a3c",
    roughness: 0.7,
    metalness: 0.3,
  });
  for (let i = 0; i < 3; i++) {
    const crate = new THREE.Mesh(
      new THREE.BoxGeometry(1.2, 1.1, 1.2),
      crateMaterial,
    );
    crate.position.set(-1.8 + i * 1.3, 0.85 + (i === 1 ? 1.05 : 0), -1.2);
    crate.rotation.y = i * 0.35;
    depot.add(crate);
  }

  const beamMaterial = new THREE.MeshBasicMaterial({
    color: "#7df3ff",
    transparent: true,
    opacity: 0.28,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const beam = new THREE.Mesh(
    new THREE.CylinderGeometry(0.08, 0.16, 7, 10, 1, true),
    beamMaterial,
  );
  beam.position.set(2.2, 3.6, -1.2);
  depot.add(beam);

  const beacon = new THREE.PointLight("#7df3ff", 55, 24, 1.6);
  beacon.position.set(2.2, 2.4, -1.2);
  depot.add(beacon);

  const labelCanvas = document.createElement("canvas");
  labelCanvas.width = 256;
  labelCanvas.height = 80;
  const labelCtx = labelCanvas.getContext("2d");
  if (labelCtx) {
    labelCtx.fillStyle = "rgba(6, 20, 24, 0.72)";
    labelCtx.roundRect(4, 10, 248, 60, 16);
    labelCtx.fill();
    labelCtx.fillStyle = "#a7f3ff";
    labelCtx.font = "bold 34px system-ui, sans-serif";
    labelCtx.textAlign = "center";
    labelCtx.textBaseline = "middle";
    labelCtx.fillText("DEPOT", 128, 41);
  }
  const labelTexture = new THREE.CanvasTexture(labelCanvas);
  labelTexture.colorSpace = THREE.SRGBColorSpace;
  const label = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: labelTexture,
      transparent: true,
      depthWrite: false,
    }),
  );
  label.scale.set(6, 1.9, 1);
  label.position.set(0, 7.2, 0);
  depot.add(label);

  scene.add(depot);

  /* ---------------------------------------------------------------- */
  /* Dust                                                              */
  /* ---------------------------------------------------------------- */

  const patches: Patch[] = [];
  let initialDust = 0;
  let remainingDust = 0;
  let clearedPending = false;
  let refillTimer: number | null = null;

  const dustGeometry = new THREE.CircleGeometry(1, 20);
  dustGeometry.rotateX(-Math.PI / 2);
  const dustMaterial = new THREE.MeshStandardMaterial({
    map: createDustTexture(),
    transparent: true,
    depthWrite: false,
    roughness: 1,
    metalness: 0,
    color: "#ffffff",
  });
  const dustMesh = new THREE.InstancedMesh(
    dustGeometry,
    dustMaterial,
    PATCH_MAX,
  );
  dustMesh.name = "dust";
  dustMesh.renderOrder = 2;
  dustMesh.frustumCulled = false;
  scene.add(dustMesh);

  const dustColors = {
    normal: new THREE.Color("#e0a271"),
    rich: new THREE.Color("#ffd493"),
  };

  function updatePatchMatrix(index: number) {
    const patch = patches[index];
    if (!patch) return;
    const fraction = patch.base > 0 ? patch.dust / patch.base : 0;
    const scale =
      fraction < 0.015 ? 0 : patch.radius * (0.3 + 0.7 * Math.min(1, fraction));
    dummy.position.set(
      patch.x,
      heightAt(patch.x, patch.z) + 0.045 + index * 0.0004,
      patch.z,
    );
    dummy.rotation.set(0, patch.rot, 0);
    dummy.scale.set(scale, 1, scale);
    dummy.updateMatrix();
    dustMesh.setMatrixAt(index, dummy.matrix);
  }

  function spawnDust(def: SectorDef) {
    if (refillTimer !== null) {
      window.clearTimeout(refillTimer);
      refillTimer = null;
    }
    clearedPending = false;
    patches.length = 0;

    const count = Math.min(PATCH_MAX, def.patchCount);
    const weights: number[] = [];
    let totalWeight = 0;
    for (let i = 0; i < count; i++) {
      const rich = Math.random() < 0.12;
      const weight = rich ? 2.1 : 0.75 + Math.random() * 0.5;
      weights.push(weight);
      totalWeight += weight;
    }

    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const distance = Math.sqrt(Math.random()) * (WORLD_RADIUS - 6) + 3;
      const x = Math.cos(angle) * distance;
      const z = Math.sin(angle) * distance;
      const rich = weights[i] > 1.5;
      const base = (def.dustUnits * weights[i]) / totalWeight;
      patches.push({
        x,
        z,
        base,
        dust: base,
        rich,
        radius: (rich ? 1.75 : 1.15) + Math.random() * 1.05,
        rot: Math.random() * Math.PI * 2,
      });
    }

    initialDust = def.dustUnits;
    remainingDust = def.dustUnits;
    dustMesh.count = count;
    dustMesh.instanceMatrix.needsUpdate = true;

    for (let i = 0; i < count; i++) {
      updatePatchMatrix(i);
      const color = dustColors.normal
        .clone()
        .lerp(new THREE.Color("#b5673c"), Math.random() * 0.5);
      if (patches[i].rich) color.lerp(dustColors.rich, 0.8);
      dustMesh.setColorAt(i, color);
    }
    if (dustMesh.instanceColor) dustMesh.instanceColor.needsUpdate = true;
    dustMesh.instanceMatrix.needsUpdate = true;
  }

  spawnDust(config.sector);

  /* ---------------------------------------------------------------- */
  /* Particles                                                         */
  /* ---------------------------------------------------------------- */

  const particlePositions = new Float32Array(PARTICLE_COUNT * 3);
  const particleVelocity = new Float32Array(PARTICLE_COUNT * 3);
  const particleLife = new Float32Array(PARTICLE_COUNT);
  particlePositions.fill(-999);
  const particleGeometry = new THREE.BufferGeometry();
  particleGeometry.setAttribute(
    "position",
    new THREE.BufferAttribute(particlePositions, 3),
  );
  const particleMaterial = new THREE.PointsMaterial({
    color: "#ffd7a8",
    size: 0.22,
    transparent: true,
    opacity: 0.9,
    depthWrite: false,
    sizeAttenuation: true,
  });
  const particles = new THREE.Points(particleGeometry, particleMaterial);
  particles.frustumCulled = false;
  scene.add(particles);

  function spawnParticles(x: number, y: number, z: number, amount: number) {
    for (let n = 0; n < amount; n++) {
      let slot = -1;
      for (let i = 0; i < PARTICLE_COUNT; i++) {
        if (particleLife[i] <= 0) {
          slot = i;
          break;
        }
      }
      if (slot < 0) return;
      const i3 = slot * 3;
      const spread = 0.7;
      particlePositions[i3] = x + (Math.random() - 0.5) * spread;
      particlePositions[i3 + 1] = y + Math.random() * 0.3;
      particlePositions[i3 + 2] = z + (Math.random() - 0.5) * spread;
      particleVelocity[i3] = (Math.random() - 0.5) * 1.6;
      particleVelocity[i3 + 1] = 1.2 + Math.random() * 2.2;
      particleVelocity[i3 + 2] = (Math.random() - 0.5) * 1.6;
      particleLife[slot] = 0.5 + Math.random() * 0.6;
    }
    particleGeometry.attributes.position.needsUpdate = true;
  }

  /* ---------------------------------------------------------------- */
  /* Tool and sweep ring                                               */
  /* ---------------------------------------------------------------- */

  const toolBase = new THREE.Vector3(0.46, -0.5, -0.86);
  let toolGroup = buildToolMesh(config.toolIndex);
  toolGroup.position.copy(toolBase);
  toolGroup.rotation.set(0.06, -0.28, 0.06);
  camera.add(toolGroup);

  const ringMaterial = new THREE.MeshBasicMaterial({
    color: "#ffc186",
    transparent: true,
    opacity: 0.3,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  const sweepRing = new THREE.Mesh(
    new THREE.RingGeometry(0.86, 1, 64),
    ringMaterial,
  );
  sweepRing.rotation.x = -Math.PI / 2;
  sweepRing.visible = false;
  sweepRing.renderOrder = 3;
  scene.add(sweepRing);

  /* ---------------------------------------------------------------- */
  /* Drones                                                            */
  /* ---------------------------------------------------------------- */

  let droneVisuals: DroneVisual[] = [];
  const droneTemplate = new THREE.Group();
  {
    const body = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.22, 0),
      new THREE.MeshStandardMaterial({
        color: "#d8f7ff",
        emissive: "#54e6ff",
        emissiveIntensity: 1.4,
        roughness: 0.3,
        metalness: 0.6,
      }),
    );
    droneTemplate.add(body);
    const halo = new THREE.Mesh(
      new THREE.TorusGeometry(0.34, 0.035, 8, 24),
      new THREE.MeshBasicMaterial({ color: "#7df3ff" }),
    );
    halo.rotation.x = Math.PI / 2;
    droneTemplate.add(halo);
  }

  function syncDrones() {
    for (const drone of droneVisuals) scene.remove(drone.group);
    droneVisuals = [];
    const visualCount = Math.min(config.droneCount, 8);
    for (let i = 0; i < visualCount; i++) {
      const group = droneTemplate.clone();
      group.position.set(
        Math.cos(i * 1.7) * 9,
        heightAt(9, 9) + 3 + i * 0.25,
        Math.sin(i * 1.7) * 9,
      );
      scene.add(group);
      droneVisuals.push({ group, target: -1, phase: Math.random() * 10 });
    }
  }

  /* ---------------------------------------------------------------- */
  /* Player state and input                                            */
  /* ---------------------------------------------------------------- */

  const player = {
    x: 0,
    z: 9,
    yaw: 0,
    pitch: -0.1,
    vx: 0,
    vz: 0,
    bob: 0,
    speed: 0,
  };
  let carried = 0;
  let capacity = config.capacity;
  let locked = false;
  let sweeping = false;
  let toolSwing = 0;
  const mouseSway = { x: 0, y: 0 };
  let particleTimer = 0;
  const keys = new Set<string>();

  function resetPlayer() {
    player.x = 0;
    player.z = 9;
    player.yaw = 0;
    player.pitch = -0.12;
    player.vx = 0;
    player.vz = 0;
  }

  function onPointerLockChange() {
    locked = document.pointerLockElement === renderer.domElement;
    if (!locked) sweeping = false;
    options.onLockChange(locked);
  }

  function onMouseMove(event: MouseEvent) {
    if (!locked) return;
    player.yaw -= event.movementX * 0.0022;
    player.pitch -= event.movementY * 0.0022;
    player.pitch = THREE.MathUtils.clamp(player.pitch, -1.35, 1.15);
    mouseSway.x = THREE.MathUtils.clamp(mouseSway.x + event.movementX * 0.001, -1, 1);
    mouseSway.y = THREE.MathUtils.clamp(mouseSway.y + event.movementY * 0.001, -1, 1);
  }

  function onMouseDown(event: MouseEvent) {
    if (!locked || event.button !== 0) return;
    sweeping = true;
  }

  function onMouseUp() {
    sweeping = false;
  }

  function onKeyDown(event: KeyboardEvent) {
    const target = event.target as HTMLElement | null;
    if (target && /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName)) return;
    keys.add(event.code);
  }

  function onKeyUp(event: KeyboardEvent) {
    keys.delete(event.code);
  }

  function onClick() {
    if (!locked) {
      void renderer.domElement.requestPointerLock();
    }
  }

  document.addEventListener("pointerlockchange", onPointerLockChange);
  document.addEventListener("mousemove", onMouseMove);
  document.addEventListener("mousedown", onMouseDown);
  document.addEventListener("mouseup", onMouseUp);
  window.addEventListener("keydown", onKeyDown);
  window.addEventListener("keyup", onKeyUp);
  renderer.domElement.addEventListener("click", onClick);

  /* ---------------------------------------------------------------- */
  /* Aiming and sweeping                                               */
  /* ---------------------------------------------------------------- */

  function computeAimPoint() {
    camera.getWorldDirection(forward);
    const startX = camera.position.x;
    const startZ = camera.position.z;
    let px = startX;
    let pz = startZ;
    let py = camera.position.y;
    let found = false;

    if (forward.y < -0.02) {
      for (let step = 0; step < 26; step++) {
        px += forward.x * 0.45;
        pz += forward.z * 0.45;
        py += forward.y * 0.45;
        if (py <= heightAt(px, pz) + 0.2) {
          found = true;
          break;
        }
        if (Math.hypot(px - startX, pz - startZ) > 9) break;
      }
    }

    if (!found) {
      const horizontal = new THREE.Vector2(forward.x, forward.z);
      if (horizontal.lengthSq() < 0.0001) horizontal.set(0, -1);
      horizontal.normalize().multiplyScalar(5);
      px = startX + horizontal.x;
      pz = startZ + horizontal.y;
      py = heightAt(px, pz) + 0.1;
    }

    aimPoint.set(px, heightAt(px, pz) + 0.08, pz);
    return aimPoint;
  }

  function removeFromPatches(center: THREE.Vector3, radius: number, budget: number) {
    let removed = 0;
    const affected: Patch[] = [];
    for (const patch of patches) {
      if (patch.dust <= 0.01) continue;
      const dx = patch.x - center.x;
      const dz = patch.z - center.z;
      if (dx * dx + dz * dz <= radius * radius) affected.push(patch);
    }
    if (affected.length === 0) return 0;

    const share = Math.min(
      budget / affected.length,
      Math.max(...affected.map((patch) => patch.dust)),
    );

    for (let i = 0; i < affected.length; i++) {
      const patch = affected[i];
      const take = Math.min(patch.dust, share, budget - removed);
      if (take <= 0) continue;
      patch.dust -= take;
      removed += take;
      const index = patches.indexOf(patch);
      updatePatchMatrix(index);
    }
    if (removed > 0) {
      remainingDust = Math.max(0, remainingDust - removed);
      dustMesh.instanceMatrix.needsUpdate = true;
    }
    return removed;
  }

  function checkCleared() {
    if (clearedPending || initialDust <= 0) return;
    if (remainingDust <= Math.max(1.5, initialDust * 0.012)) {
      clearedPending = true;
      options.onCleared();
      const sector = config.sector;
      refillTimer = window.setTimeout(() => {
        spawnDust(sector);
      }, 2800);
    }
  }

  function updateDrones(dt: number, time: number) {
    if (droneVisuals.length === 0 || patches.length === 0) return;
    const share = config.droneCount / droneVisuals.length;
    let removedTotal = 0;

    for (const drone of droneVisuals) {
      drone.phase += dt;
      let target: Patch | undefined = patches[drone.target];
      if (!target || target.dust <= 0.02) {
        let best: Patch | null = null;
        let bestScore = Infinity;
        for (let i = 0; i < 24; i++) {
          const candidate = patches[Math.floor(Math.random() * patches.length)];
          if (!candidate || candidate.dust <= 0.05) continue;
          const score = Math.hypot(
            candidate.x - drone.group.position.x,
            candidate.z - drone.group.position.z,
          );
          if (score < bestScore) {
            bestScore = score;
            best = candidate;
          }
        }
        drone.target = best ? patches.indexOf(best) : -1;
        target = best ?? undefined;
      }

      if (target) {
        const targetY = heightAt(target.x, target.z) + 2.6;
        const dx = target.x - drone.group.position.x;
        const dz = target.z - drone.group.position.z;
        const distance = Math.hypot(dx, dz);
        const speed = 7.5 * dt;
        if (distance > 1.2) {
          drone.group.position.x += (dx / distance) * Math.min(speed, distance);
          drone.group.position.z += (dz / distance) * Math.min(speed, distance);
        }
        drone.group.position.y = THREE.MathUtils.lerp(
          drone.group.position.y,
          targetY + Math.sin(time * 2 + drone.phase) * 0.25,
          0.08,
        );
        drone.group.rotation.y += dt * 1.8;

        if (distance < 1.8) {
          const take = Math.min(
            target.dust,
            share * DRONE_SWEEP_RATE * dt,
            Math.max(0, remainingDust),
          );
          if (take > 0) {
            target.dust -= take;
            removedTotal += take;
            updatePatchMatrix(patches.indexOf(target));
          }
        }
      } else {
        drone.group.position.y += Math.sin(time * 2 + drone.phase) * 0.002;
      }
    }

    if (removedTotal > 0) {
      remainingDust = Math.max(0, remainingDust - removedTotal);
      dustMesh.instanceMatrix.needsUpdate = true;
      checkCleared();
    }
  }

  /* ---------------------------------------------------------------- */
  /* Resize                                                            */
  /* ---------------------------------------------------------------- */

  function resize() {
    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height, false);
  }
  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(container);
  resize();

  /* ---------------------------------------------------------------- */
  /* Frame loop                                                        */
  /* ---------------------------------------------------------------- */

  let disposed = false;
  function animate() {
    if (disposed) return;
    const dt = Math.min(clock.getDelta(), 0.05);
    const time = clock.elapsedTime;

    // Movement.
    const canMove = locked;
    const forwardInput = canMove
      ? (keys.has("KeyW") ? 1 : 0) - (keys.has("KeyS") ? 1 : 0)
      : 0;
    const sideInput = canMove
      ? (keys.has("KeyD") ? 1 : 0) - (keys.has("KeyA") ? 1 : 0)
      : 0;
    const sprint = keys.has("ShiftLeft") || keys.has("ShiftRight");
    const maxSpeed = sprint ? 9.5 : 6.2;

    const sin = Math.sin(player.yaw);
    const cos = Math.cos(player.yaw);
    let desiredX = (-sin * forwardInput + cos * sideInput) * maxSpeed;
    let desiredZ = (-cos * forwardInput - sin * sideInput) * maxSpeed;
    if (forwardInput === 0 && sideInput === 0) {
      desiredX = 0;
      desiredZ = 0;
    }
    player.vx = THREE.MathUtils.damp(player.vx, desiredX, 8, dt);
    player.vz = THREE.MathUtils.damp(player.vz, desiredZ, 8, dt);
    player.x += player.vx * dt;
    player.z += player.vz * dt;

    const radius = Math.hypot(player.x, player.z);
    if (radius > WORLD_RADIUS) {
      player.x = (player.x / radius) * WORLD_RADIUS;
      player.z = (player.z / radius) * WORLD_RADIUS;
    }

    player.speed = Math.hypot(player.vx, player.vz);
    player.bob += dt * (2.5 + player.speed * 1.4);
    const bobAmount = Math.min(1, player.speed / 6) * 0.045;

    camera.position.set(
      player.x,
      heightAt(player.x, player.z) + EYE_HEIGHT + Math.sin(player.bob) * bobAmount,
      player.z,
    );
    camera.rotation.set(player.pitch, player.yaw, 0);

    // Sweeping.
    const cursor = computeAimPoint();
    sweepRing.visible = locked;
    sweepRing.position.copy(cursor);
    sweepRing.scale.setScalar(TOOLS[config.toolIndex].radius);
    ringMaterial.opacity = sweeping
      ? 0.55 + Math.sin(time * 14) * 0.18
      : 0.22;

    if (locked && sweeping) {
      const budget = Math.min(
        config.power * 1.25 * dt,
        Math.max(0, capacity - carried),
      );
      if (budget > 0.001) {
        const removed = removeFromPatches(
          cursor,
          TOOLS[config.toolIndex].radius,
          budget,
        );
        carried = Math.min(capacity, carried + removed);
        if (removed > 0.01) {
          particleTimer += dt;
          if (particleTimer > 0.09) {
            particleTimer = 0;
            const sample = patches[Math.floor(Math.random() * patches.length)];
            if (sample && sample.dust > 0) {
              spawnParticles(
                sample.x,
                heightAt(sample.x, sample.z) + 0.2,
                sample.z,
                3,
              );
            }
          }
        }
      }
      toolSwing = Math.sin(time * 20) * 0.16;
      checkCleared();
    } else {
      toolSwing = THREE.MathUtils.damp(toolSwing, 0, 8, dt);
    }

    // Particles.
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      if (particleLife[i] <= 0) continue;
      particleLife[i] -= dt;
      const i3 = i * 3;
      particlePositions[i3] += particleVelocity[i3] * dt;
      particlePositions[i3 + 1] += particleVelocity[i3 + 1] * dt;
      particlePositions[i3 + 2] += particleVelocity[i3 + 2] * dt;
      particleVelocity[i3 + 1] -= 3.4 * dt;
      if (particleLife[i] <= 0) {
        particlePositions[i3 + 1] = -999;
      }
    }
    particleGeometry.attributes.position.needsUpdate = true;

    // Tool sway and bob.
    mouseSway.x = THREE.MathUtils.damp(mouseSway.x, 0, 7, dt);
    mouseSway.y = THREE.MathUtils.damp(mouseSway.y, 0, 7, dt);
    const bob = Math.sin(player.bob) * 0.02 * Math.min(1, player.speed / 6);
    toolGroup.position.set(
      toolBase.x + mouseSway.x * 0.05,
      toolBase.y + bob + toolSwing * 0.03,
      toolBase.z + toolSwing * 0.09,
    );
    toolGroup.rotation.set(
      0.06 + mouseSway.y * 0.12,
      -0.28 + mouseSway.x * 0.15,
      0.06 + toolSwing,
    );

    updateDrones(dt, time);
    ring.rotation.z += dt * 0.4;
    beacon.intensity = 45 + Math.sin(time * 3) * 12;

    renderer.render(scene, camera);
  }
  renderer.setAnimationLoop(animate);

  /* ---------------------------------------------------------------- */
  /* Public API                                                        */
  /* ---------------------------------------------------------------- */

  function configure(next: WorldConfig) {
    const sectorChanged = next.sector.id !== currentSectorId;
    const toolChanged = next.toolIndex !== config.toolIndex;
    const dronesChanged = next.droneCount !== config.droneCount;

    config = { ...next };
    capacity = next.capacity;

    if (sectorChanged) {
      currentSectorId = next.sector.id;
      buildScenery(next.sector);
      spawnDust(next.sector);
      resetPlayer();
    }

    if (toolChanged) {
      camera.remove(toolGroup);
      toolGroup.traverse((object) => {
        if (object instanceof THREE.Mesh) object.geometry.dispose();
      });
      toolGroup = buildToolMesh(next.toolIndex);
      toolGroup.position.copy(toolBase);
      toolGroup.rotation.set(0.06, -0.28, 0.06);
      camera.add(toolGroup);
    }

    if (dronesChanged) syncDrones();
  }

  function getStatus(): WorldStatus {
    const depotDistance = Math.hypot(player.x - DEPOT_X, player.z - DEPOT_Z);
    return {
      carried,
      capacity,
      remaining: remainingDust,
      initialDust,
      coverage:
        initialDust > 0
          ? THREE.MathUtils.clamp(1 - remainingDust / initialDust, 0, 1)
          : 0,
      depotDistance,
      inRange: depotDistance <= DEPOT_RANGE,
      locked,
      sweeping,
      drones: config.droneCount,
    };
  }

  function sell() {
    const amount = Math.floor(carried);
    carried = Math.max(0, carried - amount);
    return amount;
  }

  function requestLock() {
    if (document.pointerLockElement !== renderer.domElement) {
      void renderer.domElement.requestPointerLock();
    }
  }

  function resetSector() {
    spawnDust(config.sector);
    resetPlayer();
    carried = 0;
  }

  function dispose() {
    disposed = true;
    renderer.setAnimationLoop(null);
    if (refillTimer !== null) window.clearTimeout(refillTimer);
    document.removeEventListener("pointerlockchange", onPointerLockChange);
    document.removeEventListener("mousemove", onMouseMove);
    document.removeEventListener("mousedown", onMouseDown);
    document.removeEventListener("mouseup", onMouseUp);
    window.removeEventListener("keydown", onKeyDown);
    window.removeEventListener("keyup", onKeyUp);
    renderer.domElement.removeEventListener("click", onClick);
    resizeObserver.disconnect();
    scene.traverse((object) => {
      if (object instanceof THREE.Mesh || object instanceof THREE.Points) {
        object.geometry.dispose();
        const material = object.material;
        if (Array.isArray(material)) material.forEach((m) => m.dispose());
        else material.dispose();
      }
    });
    renderer.dispose();
    renderer.domElement.remove();
  }

  return { configure, getStatus, sell, resetSector, requestLock, dispose };
}
