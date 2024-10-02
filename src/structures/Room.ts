import { Player } from "./Player";
import { RoomPool } from "../global/RoomPool";
import { TeamMode } from "../enums/TeamMode";
import { WinCondition } from "../enums/WinCondition";
import { RoomStatus } from "../enums/RoomStatus";
import { RoomPlayer } from "./RoomPlayer";
import { GameplaySettings } from "./GameplaySettings";
import { Mods } from "./Mods";
import { Beatmap } from "./Beatmap";

const roomPool: RoomPool = RoomPool.getInstance();

export class Room {
    
    public readonly _id: number;
    public name: string;
    public host: RoomPlayer;
    public password: string | null;
    public isLocked: boolean;
    public maxPlayers: number;
    public players: Map<string, RoomPlayer>;
    public beatmap: Beatmap | null;
    public mods: Mods;
    public gameplaySettings: GameplaySettings;
    public teamMode: TeamMode;
    public winCondition: WinCondition;
    public status: RoomStatus;

    // Used to determine when all clients have loaded the beatmap
    private _playersLoaded: RoomPlayer[] = [];

    public constructor(
        name: string,
        host: RoomPlayer,
        maxPlayers: number,
        beatmap?: Beatmap,
        players?: Map<string, RoomPlayer>,
        mods?: Mods,
        password?: string,
        isLocked?: boolean,
        gameplaySettings?: GameplaySettings,
        teamMode?: TeamMode,
        winCondition?: WinCondition,
        status?: RoomStatus
    ) {
        this._id = roomPool.getRooms().size + 1;

        this.name = name;
        this.host = host;
        this.maxPlayers = maxPlayers;
        this.beatmap = beatmap ?? null;

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

    public addLoadedPlayer(player: RoomPlayer): void {
        this._playersLoaded.push(player);
    }

    public hasEveryoneLoaded(): boolean {
        return this._playersLoaded.length === this.players.size;
    }

    public destroy(): void {
        roomPool.delete(this._id);
    }

}