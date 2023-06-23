import { Vector3 } from "mtasa-lua-types/shared/vector";

export function lerpVectors(a: Vector3, b: Vector3, t: number): Vector3 {
    return a.mul(1 - t).add(b.mul(t));
}