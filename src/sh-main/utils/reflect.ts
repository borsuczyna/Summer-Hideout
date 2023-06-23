import { Vector3 } from "mtasa-lua-types/shared/vector";

export function reflect(ray: Vector3, normal: Vector3): Vector3 {
    let dot = ray.dot(normal);
    return ray.sub(normal.mul(2 * dot));
}