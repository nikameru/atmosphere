import { PlayerStatus } from "../../../enums/PlayerStatus";
import { RoomStatus } from "../../../enums/RoomStatus";
import { RoomTeam } from "../../../enums/RoomTeam";
import { TeamMode } from "../../../enums/TeamMode";
import { WinCondition } from "../../../enums/WinCondition";
import { LiveScoreData } from "../../../structures/LiveScoreData";
import { ScoreSubmission } from "../../../structures/ScoreSubmussion";

export interface RoomServerClientEvents {
    beatmapChanged: (beatmap: Record<string, any> | null) => void;
    hostChanged: (uid: string) => void;
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
    roomStatusChanged: (status: RoomStatus) => void;
    allPlayersBeatmapLoadComplete: () => void;
    allPlayersSkipRequested: () => void;
    allPlayersScoreSubmitted: (scores: ScoreSubmission[]) => void;
}

export interface RoomClientServerEvents {
    beatmapChanged: (beatmap?: Record<string, any>) => void;
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
    scoreSubmission: (score: ScoreSubmission) => void;
}