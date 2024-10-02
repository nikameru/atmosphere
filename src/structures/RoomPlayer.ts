import { PlayerStatus } from "../enums/PlayerStatus";
import { RoomTeam } from "../enums/RoomTeam";
import { Mods } from "./Mods";

export class RoomPlayer {

    private readonly _id: number;
    private readonly _username: string;
    private _status: PlayerStatus;
    private _team: RoomTeam | null;
    private _mods: Mods;

    // Session id of the host is unknown at the moment of room creation, so it's not readonly
    private _sessionId: string | null;

    public constructor(
        id: number,
        username: string,
        sessionId?: string,
        status?: PlayerStatus,
        team?: RoomTeam,
        mods?: Mods
    ) {
        this._id = id;
        this._username = username;
        this._status = status ?? PlayerStatus.NOT_READY;
        this._team = team ?? null;
        this._mods = mods ?? { mods: "", speedMultiplier: 1.0, flFollowDelay: 1.12 };

        this._sessionId = sessionId ?? null;
    }

    public get id(): number {
        return this._id;
    }

    public get username(): string {
        return this._username;
    }

    public get status(): PlayerStatus {
        return this._status;
    }

    public set status(value: PlayerStatus) {
        this._status = value;
    }

    public get team(): RoomTeam | null {
        return this._team;
    }

    public set team(value: RoomTeam | null) {
        this._team = value;
    }

    public get mods(): Mods {
        return this._mods;
    }

    public set mods(value: Mods) {
        this._mods = value;
    }

    public get sessionId(): string | null {
        return this._sessionId;
    }

    public set sessionId(value: string | null) {
        this._sessionId = value;
    }
    
}