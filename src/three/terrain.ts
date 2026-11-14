import * as THREE from "three";
import type { SectorDef } from "@/game/content";

export const WORLD_RADIUS = 52;

export function heightAt(x: number, z: number) {
  return (
    Math.sin(x * 0.06) * 0.8 +
    Math.cos(z * 0.05) * 0.6 +
    Math.sin((x + z) * 0.028) * 1.1 +
    Math.cos(x * 0.02 - z * 0.03) * 0.9
  );
}

function makeCanvas(size: number) {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("2D canvas unavailable");
  return { canvas, ctx };
}

export function createGroundTexture(): THREE.Texture {
  const { canvas, ctx } = makeCanvas(1024);
  const base = ctx.createLinearGradient(0, 0, 1024, 1024);
  base.addColorStop(0, "#d9c6b6");
  base.addColorStop(0.5, "#c9b19d");
  base.addColorStop(1, "#d3baa4");
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, 1024, 1024);

  // Speckled regolith.
  for (let i = 0; i < 9000; i++) {
    const x = Math.random() * 1024;
    const y = Math.random() * 1024;
    const radius = Math.random() * 2.4 + 0.3;
    const light = Math.random() > 0.48;
    ctx.fillStyle = light
      ? `rgba(255, 240, 225, ${0.05 + Math.random() * 0.16})`
      : `rgba(70, 42, 28, ${0.04 + Math.random() * 0.14})`;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
  }

  // Soft craters and darker mineral blotches.
  for (let i = 0; i < 26; i++) {
    const x = Math.random() * 1024;
    const y = Math.random() * 1024;
    const r = 18 + Math.random() * 70;
    const gradient = ctx.createRadialGradient(x, y, r * 0.15, x, y, r);
    gradient.addColorStop(0, "rgba(58, 34, 24, 0.28)");
    gradient.addColorStop(0.65, "rgba(92, 54, 36, 0.12)");
    gradient.addColorStop(1, "rgba(255, 255, 255, 0)");
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(7, 7);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

export function createDustTexture(): THREE.Texture {
  const { canvas, ctx } = makeCanvas(128);
  const gradient = ctx.createRadialGradient(64, 64, 4, 64, 64, 62);
  gradient.addColorStop(0, "rgba(255,255,255,1)");
  gradient.addColorStop(0.55, "rgba(255,255,255,0.9)");
  gradient.addColorStop(0.82, "rgba(255,255,255,0.38)");
  gradient.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(64, 64, 63, 0, Math.PI * 2);
  ctx.fill();

  for (let i = 0; i < 130; i++) {
    const angle = Math.random() * Math.PI * 2;
    const radius = Math.random() * 56;
    const x = 64 + Math.cos(angle) * radius;
    const y = 64 + Math.sin(angle) * radius;
    ctx.fillStyle = `rgba(255,255,255,${0.08 + Math.random() * 0.22})`;
    ctx.beginPath();
    ctx.arc(x, y, 1 + Math.random() * 3.4, 0, Math.PI * 2);
    ctx.fill();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export function createSky(sector: SectorDef) {
  const uniforms = {
    topColor: { value: new THREE.Color(sector.sky) },
    bottomColor: { value: new THREE.Color(sector.horizon) },
  };
  const material = new THREE.ShaderMaterial({
    uniforms,
    side: THREE.BackSide,
    depthWrite: false,
    fog: false,
    vertexShader: /* glsl */ `
      varying vec3 vWorldPosition;
      void main() {
        vec4 worldPosition = modelMatrix * vec4(position, 1.0);
        vWorldPosition = worldPosition.xyz;
        gl_Position = projectionMatrix * viewMatrix * worldPosition;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 topColor;
      uniform vec3 bottomColor;
      varying vec3 vWorldPosition;
      void main() {
        float h = normalize(vWorldPosition).y;
        float mixAmount = smoothstep(-0.05, 0.55, h);
        gl_FragColor = vec4(mix(bottomColor, topColor, mixAmount), 1.0);
      }
    `,
  });
  const sky = new THREE.Mesh(new THREE.SphereGeometry(280, 32, 16), material);
  sky.name = "sky";
  return { mesh: sky, uniforms };
}

export function createGround(sector: SectorDef) {
  const geometry = new THREE.PlaneGeometry(
    WORLD_RADIUS * 3.4,
    WORLD_RADIUS * 3.4,
    110,
    110,
  );
  geometry.rotateX(-Math.PI / 2);

  const position = geometry.attributes.position;
  const colors: number[] = [];
  const dark = new THREE.Color(sector.ground).multiplyScalar(0.62);
  const light = new THREE.Color(sector.ground).lerp(
    new THREE.Color("#e5b78f"),
    0.28,
  );

  for (let i = 0; i < position.count; i++) {
    const x = position.getX(i);
    const z = position.getZ(i);
    const y = heightAt(x, z);
    position.setY(i, y);

    const blend = THREE.MathUtils.clamp(
      0.5 + y * 0.16 + (Math.random() - 0.5) * 0.35,
      0,
      1,
    );
    const color = dark.clone().lerp(light, blend);
    colors.push(color.r, color.g, color.b);
  }

  geometry.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
  geometry.computeVertexNormals();

  const material = new THREE.MeshStandardMaterial({
    map: createGroundTexture(),
    color: new THREE.Color(sector.ground).lerp(
      new THREE.Color("#ffffff"),
      0.35,
    ),
    vertexColors: true,
    roughness: 1,
    metalness: 0,
    flatShading: true,
  });

  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = "ground";
  mesh.receiveShadow = true;
  return mesh;
}

export function createMountains(sector: SectorDef) {
  const group = new THREE.Group();
  group.name = "mountains";
  const material = new THREE.MeshStandardMaterial({
    color: new THREE.Color(sector.horizon).multiplyScalar(0.92),
    roughness: 1,
    metalness: 0,
    flatShading: true,
  });

  for (let i = 0; i < 34; i++) {
    const angle = (i / 34) * Math.PI * 2 + Math.random() * 0.12;
    const distance = 78 + Math.random() * 26;
    const height = 9 + Math.random() * 26;
    const radius = 10 + Math.random() * 16;
    const cone = new THREE.Mesh(
      new THREE.ConeGeometry(radius, height, 6, 1),
      material,
    );
    cone.position.set(
      Math.cos(angle) * distance,
      height / 2 - 6 + heightAt(Math.cos(angle) * 60, Math.sin(angle) * 60) * 0.4,
      Math.sin(angle) * distance,
    );
    cone.rotation.y = Math.random() * Math.PI;
    group.add(cone);
  }

  return group;
}

export function createRocks(sector: SectorDef) {
  const geometry = new THREE.DodecahedronGeometry(1, 0);
  const material = new THREE.MeshStandardMaterial({
    color: new THREE.Color(sector.ground).multiplyScalar(0.55),
    roughness: 0.95,
    metalness: 0.05,
    flatShading: true,
  });
  const mesh = new THREE.InstancedMesh(geometry, material, 90);
  mesh.name = "rocks";
  const dummy = new THREE.Object3D();

  for (let i = 0; i < 90; i++) {
    const angle = Math.random() * Math.PI * 2;
    const distance = 10 + Math.random() * (WORLD_RADIUS - 8);
    const x = Math.cos(angle) * distance;
    const z = Math.sin(angle) * distance;
    const scale = 0.25 + Math.random() * 1.1;
    dummy.position.set(x, heightAt(x, z) + scale * 0.35, z);
    dummy.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, 0);
    dummy.scale.set(scale, scale * (0.6 + Math.random() * 0.5), scale);
    dummy.updateMatrix();
    mesh.setMatrixAt(i, dummy.matrix);
  }
  mesh.instanceMatrix.needsUpdate = true;
  return mesh;
}
