import { Vector3 } from "mtasa-lua-types/shared/vector";

export function compareVector3(a: Vector3, b: Vector3): boolean {
    return a.x == b.x && a.y == b.y && a.z == b.z;
}