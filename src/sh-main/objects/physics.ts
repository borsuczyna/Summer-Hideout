import { EventNames, addEventHandler, createObject, destroyElement, dxDrawLine3D, getElementAngularVelocity, getElementBoundingBox, getElementMatrix, getElementRotation, getElementType, getTickCount, processLineOfSight, root, setElementAngularVelocity, setElementMatrix, setElementVelocity } from "mtasa-lua-types/client/mtasa";
import { Element, MTASAObject, Vector3 } from "mtasa-lua-types/client/structure";
import { getPositionFromElementOffset, getPositionFromElementOffsetVector } from "../utils/elementOffset";
import { Settings } from "../settings/main";
import { reflect } from "../utils/reflect";
import { lerpVectors } from "../utils/vectorLerp";
import { getObjectBounciness } from "./shared";

let physicsObjects: [MTASAObject, number][] = [];

export function addElementPhysics(element: MTASAObject) {
    if(physicsObjects.find(o => o[0] == element)) return;
    physicsObjects.push([element, 0]);
}

export function removeElementPhysics(element: MTASAObject) {
    physicsObjects.splice(physicsObjects.findIndex(o => o[0] == element), 1);
}

export function ignoreForTime(element: MTASAObject, time: number) {
    let data = physicsObjects.find(o => o[0] == element);
    if(!data) return;

    data[1] = getTickCount() + time;
}

export function getPhysicsObjectRotation(object: MTASAObject | Element) {
    let matrix = getElementMatrix(object);
    let newObject = createObject(1337, 0, 0, 0);
    setElementMatrix(newObject, matrix);
    let [x, y, z] = getElementRotation(newObject);
    destroyElement(newObject);
    return [x, y, z];
}

function processLine(start: Vector3, target: Vector3, ignored: MTASAObject): [boolean, Vector3, Vector3, Element, Vector3] {
    let [hit, hitX, hitY, hitZ, hitElement, normalX, normalY, normalZ] = processLineOfSight(start.x, start.y, start.z, target.x, target.y, target.z, true, true, true, true, false, false, false, false, ignored);
    return [hit, start, new Vector3(hitX, hitY, hitZ), hitElement, new Vector3(normalX, normalY, normalZ)];
}

function updatePhysics(dt: number) {
    for(let object of physicsObjects) {
        let velocity = object[0].velocity.mul(dt / 10);
        let velocityLength = velocity.getLength();
        if(velocityLength > 0.02) {
            let [x0, y0, z0, x1, y1, z1] = getElementBoundingBox(object[0]);

            let leftBottomDown = getPositionFromElementOffsetVector(object[0], x0, y0, z0);
            let leftBottomUp = getPositionFromElementOffsetVector(object[0], x0, y1, z0);
            let leftTopDown = getPositionFromElementOffsetVector(object[0], x0, y0, z1);
            let leftTopUp = getPositionFromElementOffsetVector(object[0], x0, y1, z1);
            let rightBottomDown = getPositionFromElementOffsetVector(object[0], x1, y0, z0);
            let rightBottomUp = getPositionFromElementOffsetVector(object[0], x1, y1, z0);
            let rightTopDown = getPositionFromElementOffsetVector(object[0], x1, y0, z1);
            let rightTopUp = getPositionFromElementOffsetVector(object[0], x1, y1, z1);

            if(Settings.DrawPhysicsDebug) {
                let leftBottomDownTarget = leftBottomDown.add(velocity);
                let leftBottomUpTarget = leftBottomUp.add(velocity);
                let leftTopDownTarget = leftTopDown.add(velocity);
                let leftTopUpTarget = leftTopUp.add(velocity);
                let rightBottomDownTarget = rightBottomDown.add(velocity);
                let rightBottomUpTarget = rightBottomUp.add(velocity);
                let rightTopDownTarget = rightTopDown.add(velocity);
                let rightTopUpTarget = rightTopUp.add(velocity);

                dxDrawLine3D(leftBottomDown.x, leftBottomDown.y, leftBottomDown.z, leftBottomDownTarget.x, leftBottomDownTarget.y, leftBottomDownTarget.z, 0xFFFF0000);
                dxDrawLine3D(leftBottomUp.x, leftBottomUp.y, leftBottomUp.z, leftBottomUpTarget.x, leftBottomUpTarget.y, leftBottomUpTarget.z, 0xFFFF0000);
                dxDrawLine3D(leftTopDown.x, leftTopDown.y, leftTopDown.z, leftTopDownTarget.x, leftTopDownTarget.y, leftTopDownTarget.z, 0xFFFF0000);
                dxDrawLine3D(leftTopUp.x, leftTopUp.y, leftTopUp.z, leftTopUpTarget.x, leftTopUpTarget.y, leftTopUpTarget.z, 0xFFFF0000);
                dxDrawLine3D(rightBottomDown.x, rightBottomDown.y, rightBottomDown.z, rightBottomDownTarget.x, rightBottomDownTarget.y, rightBottomDownTarget.z, 0xFFFF0000);
                dxDrawLine3D(rightBottomUp.x, rightBottomUp.y, rightBottomUp.z, rightBottomUpTarget.x, rightBottomUpTarget.y, rightBottomUpTarget.z, 0xFFFF0000);
                dxDrawLine3D(rightTopDown.x, rightTopDown.y, rightTopDown.z, rightTopDownTarget.x, rightTopDownTarget.y, rightTopDownTarget.z, 0xFFFF0000);
                dxDrawLine3D(rightTopUp.x, rightTopUp.y, rightTopUp.z, rightTopUpTarget.x, rightTopUpTarget.y, rightTopUpTarget.z, 0xFFFF0000);
            }

            let leftBottomDownHit = processLine(leftBottomDown, leftBottomDown.add(velocity), object[0]);
            let leftBottomUpHit = processLine(leftBottomUp, leftBottomUp.add(velocity), object[0]);
            let leftTopDownHit = processLine(leftTopDown, leftTopDown.add(velocity), object[0]);
            let leftTopUpHit = processLine(leftTopUp, leftTopUp.add(velocity), object[0]);
            let rightBottomDownHit = processLine(rightBottomDown, rightBottomDown.add(velocity), object[0]);
            let rightBottomUpHit = processLine(rightBottomUp, rightBottomUp.add(velocity), object[0]);
            let rightTopDownHit = processLine(rightTopDown, rightTopDown.add(velocity), object[0]);
            let rightTopUpHit = processLine(rightTopUp, rightTopUp.add(velocity), object[0]);

            let hit = [leftBottomDownHit, leftBottomUpHit, leftTopDownHit, leftTopUpHit, rightBottomDownHit, rightBottomUpHit, rightTopDownHit, rightTopUpHit];
            let hitElements = hit.filter(h => h[0] && (!h[3] || getElementType(h[3]) == 'vehicle'));
            let hits = hit.filter(h => h[0]);

            if(hitElements.length != 0) {
                let hit = hitElements[0];
                let normal = hit[2].sub(hit[1]);
                let length = normal.getLength();
                normal.normalize();
                let bounceVector = reflect(normal, hits[0][4]);
                let bounciness = getObjectBounciness(object[0].model);

                let targetVelocity = velocity.mul(length / velocityLength);
                targetVelocity = lerpVectors(targetVelocity, bounceVector, bounciness);
                if(targetVelocity.getLength() > velocityLength * bounciness) {
                    targetVelocity = targetVelocity.mul(velocityLength * bounciness / targetVelocity.getLength());
                }

                setElementVelocity(object[0], targetVelocity.x, targetVelocity.y, targetVelocity.z);

                let [ax, ay, az] = getElementAngularVelocity(object[0]);
                let angularVelocity = new Vector3(ax, ay, az);
                angularVelocity = angularVelocity.add(bounceVector.mul(velocityLength * bounciness * 0.2));
                setElementAngularVelocity(object[0], angularVelocity.x, angularVelocity.y, angularVelocity.z);
            }
        }
    }
}

addEventHandler(EventNames.OnClientPreRender, root, updatePhysics);