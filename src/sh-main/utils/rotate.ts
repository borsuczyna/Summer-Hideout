import { attachElements, createObject, destroyElement, getElementRotation, setElementRotation } from "mtasa-lua-types/client/mtasa";
import { MTASAObject } from "mtasa-lua-types/client/structure";
import { getPhysicsObjectRotation } from "../objects/physics";

export function rotate(object: MTASAObject, x: number, y: number, z: number, isPhysicsObject?: boolean): void {
    let rotationCallback = isPhysicsObject ? getPhysicsObjectRotation : getElementRotation;

    let newObject = createObject(1337, 0, 0, 0);
    attachElements(newObject, object, 0, 0, 0, x, y, z);
    let [rx, ry, rz] = rotationCallback(newObject);
    destroyElement(newObject);
    setElementRotation(object, rx, ry, rz);
}