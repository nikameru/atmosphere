import { Player } from "./Player";
import { RoomPool } from "../global/RoomPool";
import { TeamMode } from "../enums/TeamMode";
import { WinCondition } from "../enums/WinCondition";
import { RoomStatus } from "../enums/RoomStatus";
import { RoomPlayer } from "./RoomPlayer";

const roomPool: RoomPool = RoomPool.getInstance();

export class Room {
    
    public readonly _id: number;
    public name: string;
    public host: RoomPlayer;
    public password: string | null;
    public isLocked: boolean;
    public maxPlayers: number;
    public players: Map<string, RoomPlayer>;
    public beatmap: Record<string, string | null> | null;
    public mods: Record<string, any>;
    public gameplaySettings: Record<string, any>;
    public teamMode: TeamMode;
    public winCondition: WinCondition;
    public status: RoomStatus;

    public constructor(
        name: string,
        host: RoomPlayer,
        maxPlayers: number,
        beatmap?: Record<string, string | null>,
        players?: Map<string, RoomPlayer>,
        mods?: Record<string, any>,
        password?: string,
        isLocked?: boolean,
        gameplaySettings?: Record<string, any>,
        teamMode?: TeamMode,
        winCondition?: WinCondition,
        status?: RoomStatus
    ) {

        this._id = roomPool.getRooms().size + 1;

        this.name = name;
        this.host = host;
        this.maxPlayers = maxPlayers;
        this.beatmap = beatmap ? {
            md5: beatmap.md5,
            title: beatmap.title,
            artist: beatmap.artist,
            creator: beatmap.creator,
            version: beatmap.version,
            beatmapSetId: beatmap.beatmapSetId ? beatmap.beatmapSetId : null
        } : null;

        this.password = password ?? null;
        this.isLocked = isLocked ?? this.password ? true : false;
        this.players = players ?? new Map<string, RoomPlayer>();
        this.gameplaySettings = gameplaySettings ?? {
            isRemoveSliderLock: false,
            isFreeMod: true,
            allowForceDifficultyStatistics: false
        };
        this.teamMode = teamMode ?? TeamMode.HEAD_TO_HEAD;
        this.winCondition = winCondition ?? WinCondition.SCORE_V1;
        this.mods = mods ?? {
            mods: "",
            speedMultiplier: 1.0,
            flFollowDelay: 1.12
        };
        this.status = status ?? RoomStatus.IDLE;
    }

}