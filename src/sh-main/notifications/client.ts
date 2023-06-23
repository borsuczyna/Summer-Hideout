import { addEvent, addEventHandler, outputChatBox, resourceRoot } from "mtasa-lua-types/client/mtasa";
import { MessageType } from "./shared";

export function showNotification(message: string, type: MessageType) {
    let r: number = 255, g: number = 255, b: number = 255;
    if(type == 'info') r = 219, g = 233, b = 255;
    if(type == 'warning') r = 255, g = 119, b = 0;
    if(type == 'error') r = 255, g = 0, b = 0;
    if(type == 'success') r = 162, g = 255, b = 0;

    outputChatBox(message, r, g, b);
}

addEvent('showNotification', true);
addEventHandler('showNotification', resourceRoot, showNotification);