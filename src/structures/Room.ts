import { Player } from "./Player";
import { RoomPool } from "../global/RoomPool";
import { TeamMode } from "../enums/TeamMode";
import { WinCondition } from "../enums/WinCondition";
import { RoomStatus } from "../enums/RoomStatus";
import { RoomPlayer } from "./RoomPlayer";
import { GameplaySettings } from "./GameplaySettings";
import { Mods } from "./Mods";
import { Beatmap } from "./Beatmap";
import { ScoreSubmission } from "./ScoreSubmussion";

const roomPool: RoomPool = RoomPool.getInstance();

export class Room {
    
    private readonly _id: number;
    private _name: string;
    private _host: RoomPlayer;
    private _password: string | null;
    private _isLocked: boolean;
    private _maxPlayers: number;
    private _players: Map<string, RoomPlayer>;
    private _beatmap: Beatmap | null;
    private _mods: Mods;
    private _gameplaySettings: GameplaySettings;
    private _teamMode: TeamMode;
    private _winCondition: WinCondition;
    private _status: RoomStatus;
    private _playersLoaded: Set<RoomPlayer> = new Set<RoomPlayer>();
    private _playersSkipped: Set<RoomPlayer> = new Set<RoomPlayer>();
    private _submittedScores: ScoreSubmission[] = new Array();

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

        this._name = name;
        this._host = host;
        this._maxPlayers = maxPlayers;

        this._beatmap = beatmap ?? null;
        this._password = password ?? null;
        this._isLocked = isLocked ?? this._password ? true : false;
        this._players = players ?? new Map<string, RoomPlayer>();
        this._gameplaySettings = gameplaySettings ?? {
            isRemoveSliderLock: false,
            isFreeMod: true,
            allowForceDifficultyStatistics: false
        };
        this._teamMode = teamMode ?? TeamMode.HEAD_TO_HEAD;
        this._winCondition = winCondition ?? WinCondition.SCORE_V1;
        this._mods = mods ?? {
            mods: "",
            speedMultiplier: 1.0,
            flFollowDelay: 1.12
        };
        this._status = status ?? RoomStatus.IDLE;
    }

    public get id(): number {
        return this._id;
    }

    public get name(): string {
        return this._name;
    }

    public set name(value: string) {
        this._name = value;
    }

    public get host(): RoomPlayer {
        return this._host;
    }

    public set host(value: RoomPlayer) {
        this._host = value;
    }

    public get password(): string | null {
        return this._password;
    }

    public set password(value: string | null) {
        this._password = value;
    }

    public get isLocked(): boolean {
        return this._isLocked;
    }

    public set isLocked(value: boolean) {
        this._isLocked = value;
    }

    public get maxPlayers(): number {
        return this._maxPlayers;
    }

    public set maxPlayers(value: number) {
        this._maxPlayers = value;
    }

    public get players(): Map<string, RoomPlayer> {
        return this._players;
    }

    public set players(value: Map<string, RoomPlayer>) {
        this._players = value;
    }

    public get beatmap(): Beatmap | null {
        return this._beatmap;
    }

    public set beatmap(value: Beatmap | null) {
        this._beatmap = value;
    }

    public get mods(): Mods {
        return this._mods;
    }

    public set mods(value: Mods) {
        this._mods = value;
    }

    public get gameplaySettings(): GameplaySettings {
        return this._gameplaySettings;
    }

    public set gameplaySettings(value: GameplaySettings) {
        this._gameplaySettings = value;
    }

    public get teamMode(): TeamMode {
        return this._teamMode;
    }

    public set teamMode(value: TeamMode) {
        this._teamMode = value;
    }

    public get winCondition(): WinCondition {
        return this._winCondition;
    }

    public set winCondition(value: WinCondition) {
        this._winCondition = value;
    }

    public get status(): RoomStatus {
        return this._status;
    }

    public set status(value: RoomStatus) {
        this._status = value;
    }

    public get playersLoaded(): Set<RoomPlayer> {
        return this._playersLoaded;
    }

    public get playersSkipped(): Set<RoomPlayer> {
        return this._playersSkipped;
    }

    public get submittedScores(): ScoreSubmission[] {
        return this._submittedScores;
    }

    public hasEveryoneLoaded(): boolean {
        return this._playersLoaded.size === this._players.size;
    }

    public hasEveryoneSkipped(): boolean {
        return this._playersSkipped.size === this._players.size;
    }

    public hasEveryoneSubmitted(): boolean {
        return this._submittedScores.length === this.players.size;
    }

    // Used upon match end
    public reset(): void {
        this._playersLoaded.clear();
        this._playersSkipped.clear();
        this._submittedScores.length = 0;
    }

    public destroy(): void {
        roomPool.delete(this._id);
    }

}