import { PlayerStatus } from "../enums/PlayerStatus";

export class RoomPlayer {

    public readonly _id: number;
    public readonly _username: string;
    public status: PlayerStatus;
    public team: number | null;
    public mods: Record<string, any>;

    // Socket connection is happening after the room object is created
    // Because of that, _sessionId is not readonly
    private _sessionId: string | null;

    public constructor(
        id: number,
        username: string,
        sessionId?: string,
        status?: PlayerStatus,
        team?: number,
        mods?: Record<string, any>
    ) {
        this._id = id;
        this._username = username;
        
        this._sessionId = sessionId ?? null;

        this.status = status ?? PlayerStatus.NOT_READY;
        this.team = team ?? null;
        this.mods = mods ?? { mods: "", speedMultiplier: 1.0, flFollowDelay: 1.12 };
    }
    
    public get sessionId(): string | null {
        return this._sessionId;
    }

    public set sessionId(value: string) {
        this._sessionId = value;
    }

}