import { resourceRoot, triggerClientEvent } from "mtasa-lua-types/server/mtasa";
import { Player } from "mtasa-lua-types/server/structure";
import { MessageType } from "./shared";

export function showNotification(player: Player, message: string, type: MessageType) {
    triggerClientEvent(player, 'showNotification', resourceRoot, message, type);
}