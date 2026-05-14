import * as THREE from "three";

export const brandOrangeMaterial = new THREE.MeshStandardMaterial({
  color: "#e05a23",
  roughness: 0.2,
  metalness: 0.1,
  emissive: "#e05a23",
  emissiveIntensity: 0.15,
});

export const navyMaterial = new THREE.MeshStandardMaterial({
  color: "#1e2d4a",
  roughness: 0.8,
  metalness: 0.0,
});

export const glassMaterial = new THREE.MeshPhysicalMaterial({
  color: "#a8c5ff",
  roughness: 0.05,
  metalness: 0.0,
  transmission: 0.8,
  transparent: true,
  opacity: 0.7,
});
