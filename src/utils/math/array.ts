import type { Vec2, Vec3 } from "wgpu-matrix"
import { vec2, vec3 } from "wgpu-matrix"

export function getVec3FromArray(arr: Float32Array, index: number): Vec3 {
  return vec3.fromValues(arr[index * 3], arr[index * 3 + 1], arr[index * 3 + 2]);
}

export function getVec2FromArray(arr: Float32Array, index: number): Vec2 {
  return vec2.fromValues(arr[index * 2], arr[index * 2 + 1]);
}