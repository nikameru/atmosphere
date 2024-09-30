import { PlayerStatus } from "../../../enums/PlayerStatus";
import { TeamMode } from "../../../enums/TeamMode";
import { WinCondition } from "../../../enums/WinCondition";
import { LiveScoreData } from "../../../structures/LiveScoreData";
import { Player } from "../../../structures/Player";

export interface RoomServerClientEvents {
    initialConnection: (roomInfo: Record<string, any>) => void;
    beatmapChanged: (beatmap: Record<string, any> | null) => void;
    hostChanged: (uid: string) => void;
    playerKicked: (uid: string) => void;
    playerJoined: (uid: string) => void;
    playerLeft: (uid: string) => void;
    playerModsChanged: (uid: string, mods: string) => void;
    playerStatusChanged: (uid: string, status: PlayerStatus) => void;
    roomModsChanged: (mods: string) => void;
    playBeatmap: () => void;
    chatMessage: (username: string, message: string) => void;
    liveScoreData: (data: LiveScoreData[]) => void;
    allPlayersBeatmapLoadComplete: () => void;
}

export interface RoomClientServerEvents {
    disconnect: () => void;
    beatmapChanged: (beatmap?: Record<string, any>) => void;
    playerKicked: (uid: string) => void;
    playerModsChanged: (uid: string, mods: string) => void;
    playerStatusChanged: (status: PlayerStatus) => void;
    roomModsChanged: (mods: string) => void;
    playBeatmap: () => void;
    chatMessage: (message: string) => void;
    liveScoreData: (data: LiveScoreData) => void;
    beatmapLoadComplete: () => void;
}