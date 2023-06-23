import { addEvent, addEventHandler, client, resourceRoot, triggerClientEvent } from "mtasa-lua-types/server/mtasa";
import { createSession, sessions, startSession } from "../session/server";
import { Lobby } from "./shared";

addEvent('lobbies:fetch', true);
addEventHandler('lobbies:fetch', resourceRoot, () => {
    triggerClientEvent(client, 'lobbies:fetch', resourceRoot, sessions.map(session => {
        return {
            ownedPlayer: session.ownedPlayer,
            players: session.players,
            maxPlayers: session.maxPlayers,
            started: session.started,
            code: session.code
        } as Lobby;
    }));
});

addEvent('session:create', true);
addEvent('session:start', true);
addEventHandler('session:create', resourceRoot, () => createSession(client));
addEventHandler('session:start', resourceRoot, () => startSession(client));