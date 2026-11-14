import * as THREE from "three";
import { TOOLS } from "@/game/content";

function standard(color: string, roughness = 0.65, metalness = 0.35) {
  return new THREE.MeshStandardMaterial({ color, roughness, metalness });
}

export function buildToolMesh(tier: number): THREE.Group {
  const def = TOOLS[Math.min(tier, TOOLS.length - 1)];
  const group = new THREE.Group();
  group.name = "sweeper-tool";

  const shell = standard("#d8d2c8", 0.5, 0.5);
  const dark = standard("#2a2f36", 0.55, 0.65);
  const accent = new THREE.MeshStandardMaterial({
    color: def.color,
    emissive: def.color,
    emissiveIntensity: 0.55,
    roughness: 0.35,
    metalness: 0.4,
  });

  const add = (
    geometry: THREE.BufferGeometry,
    material: THREE.Material,
    position: [number, number, number],
    rotation?: [number, number, number],
  ) => {
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(...position);
    if (rotation) mesh.rotation.set(...rotation);
    group.add(mesh);
    return mesh;
  };

  if (tier === 0 || tier === 1) {
    const wide = tier === 1;
    add(
      new THREE.BoxGeometry(wide ? 0.07 : 0.05, wide ? 0.07 : 0.05, wide ? 0.62 : 0.5),
      accent,
      [0, 0, -0.18],
    );
    add(
      new THREE.BoxGeometry(wide ? 0.2 : 0.1, 0.07, wide ? 0.3 : 0.22),
      shell,
      [0, -0.02, wide ? -0.6 : -0.5],
    );
    add(
      new THREE.BoxGeometry(wide ? 0.18 : 0.09, 0.11, wide ? 0.22 : 0.16),
      lightBristles(),
      [0, -0.09, wide ? -0.64 : -0.54],
    );
  } else if (tier === 2) {
    add(
      new THREE.CylinderGeometry(0.028, 0.034, 1.15, 10),
      accent,
      [0, 0.04, -0.3],
      [1.25, 0, 0],
    );
    add(new THREE.BoxGeometry(0.52, 0.09, 0.26), shell, [0, -0.3, -0.78]);
    add(
      new THREE.BoxGeometry(0.5, 0.2, 0.08),
      lightBristles(),
      [0, -0.43, -0.8],
    );
  } else if (tier === 3) {
    add(new THREE.BoxGeometry(0.32, 0.32, 0.6), shell, [0, -0.04, -0.2]);
    add(new THREE.CylinderGeometry(0.12, 0.2, 0.42, 14), dark, [
      0,
      -0.04,
      -0.62,
    ], [Math.PI / 2, 0, 0]);
    add(new THREE.TorusGeometry(0.16, 0.025, 8, 24), accent, [0, 0.14, -0.2], [
      Math.PI / 2,
      0,
      0,
    ]);
    add(new THREE.BoxGeometry(0.36, 0.08, 0.2), dark, [0, -0.2, -0.12]);
  } else if (tier === 4) {
    add(new THREE.BoxGeometry(0.46, 0.28, 0.72), shell, [0, 0, -0.24]);
    add(new THREE.CylinderGeometry(0.16, 0.22, 0.4, 14), dark, [0, -0.06, -0.72], [
      Math.PI / 2,
      0,
      0,
    ]);
    add(new THREE.CylinderGeometry(0.11, 0.11, 0.1, 14), accent, [0, -0.06, -0.95], [
      Math.PI / 2,
      0,
      0,
    ]);
    add(new THREE.CylinderGeometry(0.1, 0.1, 0.14, 10), dark, [0.26, -0.1, -0.2], [
      0,
      0,
      Math.PI / 2,
    ]);
    add(new THREE.CylinderGeometry(0.1, 0.1, 0.14, 10), dark, [-0.26, -0.1, -0.2], [
      0,
      0,
      Math.PI / 2,
    ]);
  } else {
    add(new THREE.CylinderGeometry(0.34, 0.4, 0.1, 24), dark, [0, 0, -0.35]);
    add(new THREE.TorusGeometry(0.32, 0.035, 10, 36), accent, [0, 0.03, -0.35], [
      Math.PI / 2,
      0,
      0,
    ]);
    add(
      new THREE.SphereGeometry(0.11, 16, 16),
      accent,
      [0, 0.02, -0.35],
    );
    add(new THREE.BoxGeometry(0.16, 0.12, 0.38), shell, [0, -0.06, -0.05]);
  }

  return group;
}

let bristleMaterial: THREE.MeshStandardMaterial | null = null;
function lightBristles() {
  if (!bristleMaterial) {
    bristleMaterial = new THREE.MeshStandardMaterial({
      color: "#f4ead8",
      roughness: 0.95,
      metalness: 0,
    });
  }
  return bristleMaterial;
}
