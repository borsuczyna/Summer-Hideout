import { getCursorPosition, guiGetScreenSize, isCursorShowing } from "mtasa-lua-types/client/mtasa";

export function isMouseInPosition(x: number, y: number, width: number, height: number): boolean {
    if (!isCursorShowing()) return false;
    
    const [sx, sy] = guiGetScreenSize();
    let [cx, cy] = getCursorPosition();
    [cx, cy] = [cx * sx, cy * sy];
    
    return (
        cx >= x && cx <= x + width &&
        cy >= y && cy <= y + height
    );
}
  