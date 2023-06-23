import { EventNames, addEventHandler, bindKey, dxDrawLine3D, dxDrawRectangle, dxDrawText, dxGetFontHeight, getCameraMatrix, guiGetScreenSize, root, tocolor } from "mtasa-lua-types/client/mtasa";
import { Game } from "./game/main";
import { toggleLobbyScreen } from "./menu/lobby";
import { __BUILD_DATE } from "mtasa-lua-types/shared/structure";
import { sessionPacketInterpolationProgress } from "./session/client";
import { moment } from "./utils/moment";

let [sx, sy] = guiGetScreenSize();

export const game = new Game();
let [x, y, z, lx, ly, lz] = getCameraMatrix();
game.camera.lookAt = [lx, ly, lz];

let savedPos: [number, number, number] = [0, 0, 0];

let buildDate = __BUILD_DATE;

bindKey('v', 'down', () => {
    savedPos = game.camera.lookAt;
});

bindKey('b', 'down', () => {
    game.camera.lookAt = savedPos;
});

addEventHandler(EventNames.OnClientPreRender, root, (dt: number) => {
    game.update(dt);

    let target: [number, number, number] = [...savedPos];
    target[2] += 1;
    dxDrawLine3D(...savedPos, ...target, tocolor(255, 0, 0, 255));

    let difference = (os.time()*1000 - buildDate)/1000;
    let height = dxGetFontHeight();
    dxDrawText(`Build: ${moment(Math.floor(-difference), '{1} and {2}')}`, 2, sy - height - 2);

    dxDrawRectangle(50, 50, 250*sessionPacketInterpolationProgress(), 25, 0xFF00FF00);
});

// toggleLobbyScreen(true);