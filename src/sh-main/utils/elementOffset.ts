import { LuaMatrix, getElementMatrix } from "mtasa-lua-types/client/mtasa";
import { Element, MTASAObject, Vector3 } from "mtasa-lua-types/client/structure";

export function getPositionFromElementOffset(this: void, element: Element | MTASAObject, offX: number, offY: number, offZ: number): [number, number, number] {
    let matrix: LuaMatrix = getElementMatrix(element);
    
    let x = offX * matrix[1][1] + offY * matrix[2][1] + offZ * matrix[3][1] + matrix[4][1];
    let y = offX * matrix[1][2] + offY * matrix[2][2] + offZ * matrix[3][2] + matrix[4][2];
    let z = offX * matrix[1][3] + offY * matrix[2][3] + offZ * matrix[3][3] + matrix[4][3];
    
    return [x, y, z];
}

export function getPositionFromElementOffsetVector(this: void, element: Element | MTASAObject, offX: number, offY: number, offZ: number): Vector3 {
    let matrix: LuaMatrix = getElementMatrix(element);
    
    let x = offX * matrix[1][1] + offY * matrix[2][1] + offZ * matrix[3][1] + matrix[4][1];
    let y = offX * matrix[1][2] + offY * matrix[2][2] + offZ * matrix[3][2] + matrix[4][2];
    let z = offX * matrix[1][3] + offY * matrix[2][3] + offZ * matrix[3][3] + matrix[4][3];
    
    return new Vector3(x, y, z);
}