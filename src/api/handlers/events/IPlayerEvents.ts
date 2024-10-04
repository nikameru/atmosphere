import { PlayerStatus } from "../../../enums/PlayerStatus";

export interface PlayerServerClientEvents {
    initialConnection: (roomInfo: Record<string, any>) => void;
    playerKicked: (uid: string) => void;
    playerJoined: (player: Record<string, any>) => void;
    playerLeft: (uid: string) => void;
    playerModsChanged: (uid: string, mods: string) => void;
    playerStatusChanged: (uid: string, status: PlayerStatus) => void;
}

export interface PlayerClientServerEvents {
    disconnect: () => void;
    playerKicked: (uid: string) => void;
    playerModsChanged: (uid: string, mods: string) => void;
    playerStatusChanged: (status: PlayerStatus) => void;
}