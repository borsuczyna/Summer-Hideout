import { Player } from "mtasa-lua-types/shared/structure";

export interface Lobby {
    ownedPlayer: Player;
    players: Player[];
    maxPlayers: number;
    started: boolean;
    code: string;
}