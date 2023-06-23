import { Player } from "mtasa-lua-types/shared/structure";

export type SyncPlayer = Player;

export interface SessionData {
    syncPlayer?: SyncPlayer;
    key: string;
    value: any;
    sentBy: SyncPlayer;
}

export type SessionDataCallback = (this: void, ...args: any[]) => void;

export interface SessionDataHandler {
    key: string;
    syncPlayer?: SyncPlayer;
    callback: SessionDataCallback;
    priority: number;
}