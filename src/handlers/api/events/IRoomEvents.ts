import { TeamMode } from "../../../enums/TeamMode";
import { WinCondition } from "../../../enums/WinCondition";
import { Player } from "../../../structures/Player";

export interface RoomServerClientEvents {
    initialConnection: (roomInfo: Record<string, any>) => void;
    beatmapChanged: (beatmap: Record<string, any> | null) => void;
    hostChanged: (uid: string) => void;
}

export interface RoomClientServerEvents {
    beatmapChanged: (beatmap?: Record<string, any>) => void;
}