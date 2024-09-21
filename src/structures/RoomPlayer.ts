import { PlayerStatus } from "../enums/PlayerStatus";

export class RoomPlayer {
    public readonly _id: number;
    public readonly _username: string;
    public status: PlayerStatus;
    public team: number | null;
    public mods: Record<string, any>;

    public constructor(
        id: number,
        username: string,
        status?: PlayerStatus,
        team?: number,
        mods?: Record<string, any>
    ) {
        this._id = id;
        this._username = username;
        this.status = status || PlayerStatus.NOT_READY;
        this.team = team || null;
        this.mods = mods || { mods: "", speedMultiplier: 1.0, flFollowDelay: 1.12 };
    }
}