import { EventNames, RenderTarget, addEvent, addEventHandler, dxDrawRectangle, dxDrawText, getTickCount, guiGetScreenSize, removeEventHandler, resourceRoot, root, triggerServerEvent } from "mtasa-lua-types/client/mtasa";
import { game } from "../main";
import { Lobby } from "./shared";
import { isMouseInPosition } from "../utils/isMouseIn";

let lastRequest = 0;
let [sx, sy] = guiGetScreenSize();
let lobbyData: {
    lobbies: Lobby[];
    renderTarget?: RenderTarget;
} = {
    lobbies: [],
};

addEvent('lobbies:fetch', true);

function drawButton(text: string, x: number, y: number, w: number, h: number) {
    let position: [number, number, number, number] = [x, y, w, h];
    let inside = isMouseInPosition(...position);

    dxDrawRectangle(...position, inside ? 0xDD333333 : 0xAA222222);
    dxDrawText(text, x + 8, y, x + w - 16, y + h, inside ? 0xFFFFFFFF : 0x77FFFFFF, 1, 1, 'default-bold', 'left', 'center');
}

function renderLobbyScreen() {
    dxDrawRectangle(0, 0, sx, sy, 0xFF111111);

    drawButton('refresh', 25, 25, 350, 30);
    drawButton('create', 25, 60, 350, 30);
    
    lobbyData.lobbies.forEach((lobby, index) => {
        drawButton(lobby.code, 25, 95 + (35 * index), 350, 30);
    });

    if(!game.session) return;

    drawButton('start', sx - 375, 25, 350, 30);
}

function clickLobbyScreen(button: string, state: string) {
    if(button != 'left' || state != 'down' || getTickCount() - lastRequest < 1000) return;
    lastRequest = getTickCount();

    if(isMouseInPosition(25, 25, 350, 30)) triggerServerEvent('lobbies:fetch', resourceRoot);
    else if(isMouseInPosition(25, 60, 350, 30)) triggerServerEvent('session:create', resourceRoot);
    else {
        
    }
}

addEventHandler('lobbies:fetch', resourceRoot, (lobbies) => {
    lobbyData.lobbies = lobbies;
    print('fetch', getTickCount())
});

export function toggleLobbyScreen(visible: boolean) {
    let eventCallback = visible ? addEventHandler : removeEventHandler;

    eventCallback(EventNames.OnClientRender, root, renderLobbyScreen);
    eventCallback(EventNames.OnClientClick, root, clickLobbyScreen);

    game.cursorShowing = visible;
    
    if(visible) triggerServerEvent('lobbies:fetch', resourceRoot);
}