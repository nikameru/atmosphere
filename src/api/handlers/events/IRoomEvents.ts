import { PlayerStatus } from "../../../enums/PlayerStatus";
import { RoomStatus } from "../../../enums/RoomStatus";
import { RoomTeam } from "../../../enums/RoomTeam";
import { TeamMode } from "../../../enums/TeamMode";
import { WinCondition } from "../../../enums/WinCondition";
import { LiveScoreData } from "../../../structures/LiveScoreData";

export interface RoomServerClientEvents {
    initialConnection: (roomInfo: Record<string, any>) => void;
    beatmapChanged: (beatmap: Record<string, any> | null) => void;
    hostChanged: (uid: string) => void;
    playerKicked: (uid: string) => void;
    playerJoined: (player: Record<string, any>) => void;
    playerLeft: (uid: string) => void;
    playerModsChanged: (uid: string, mods: string) => void;
    playerStatusChanged: (uid: string, status: PlayerStatus) => void;
    roomModsChanged: (mods: string) => void;
    speedMultiplierChanged: (speedMultiplier: number) => void;
    freeModsSettingChanged: (isFreeMod: boolean) => void;
    teamModeChanged: (teamMode: TeamMode) => void;
    winConditionChanged: (winCondition: WinCondition) => void;
    teamChanged: (uid: string, team: RoomTeam) => void;
    roomNameChanged: (name: string) => void;
    maxPlayersChanged: (maxPlayers: number) => void;
    playBeatmap: () => void;
    chatMessage: (username: string, message: string) => void;
    liveScoreData: (data: LiveScoreData[]) => void;
    roomStatusChanged: (status: RoomStatus) => void;                // TODO: Implement
    allPlayersBeatmapLoadComplete: () => void;
    allPlayersSkipRequested: () => void;                            // TODO: Implement
    allPlayersScoreSubmitted: () => void;                           // TODO: Implement
}

export interface RoomClientServerEvents {
    disconnect: () => void;
    beatmapChanged: (beatmap?: Record<string, any>) => void;
    playerKicked: (uid: string) => void;
    playerModsChanged: (uid: string, mods: string) => void;
    playerStatusChanged: (status: PlayerStatus) => void;
    roomModsChanged: (mods: string) => void;
    speedMultiplierChanged: (speedMultiplier: number) => void;
    freeModsSettingChanged: (isFreeMod: boolean) => void;
    teamModeChanged: (teamMode: TeamMode) => void;
    winConditionChanged: (winCondition: WinCondition) => void;
    teamChanged: (team: RoomTeam) => void;
    roomNameChanged: (name: string) => void;
    maxPlayersChanged: (maxPlayers: number) => void;
    playBeatmap: () => void;
    chatMessage: (message: string) => void;
    liveScoreData: (data: LiveScoreData) => void;
    roomPasswordChanged: (password?: string) => void;
    beatmapLoadComplete: () => void;
    skipRequested: () => void;
    scoreSubmission: () => void;
}