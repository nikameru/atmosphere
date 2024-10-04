import * as Config from "../global/Config";
import { RequestUtils } from "../utils/RequestUtils";

// TODO: right now it is used only in multiplayer, but it should be used everywhere later (requires changes)

export class Beatmap {

    private readonly _md5: string; 
    private readonly _title: string;
    private readonly _artist: string;
    private readonly _creator: string;
    private readonly _version: string;

    private _beatmapSetId: string | null;

    public constructor(
        md5: string,
        title: string,
        artist: string,
        creator: string,
        version: string,
        beatmapSetId?: string
    ) {
        this._md5 = md5;
        this._title = title;
        this._artist = artist;
        this._creator = creator;
        this._version = version;

        this._beatmapSetId = beatmapSetId ?? null;
    }

    public get md5(): string {
        return this._md5;
    }

    public get title(): string {
        return this._title;
    }

    public get artist(): string {
        return this._artist;
    }

    public get creator(): string {
        return this._creator;
    }

    public get version(): string {
        return this._version;
    }

    public get beatmapSetId(): string | null {
        return this._beatmapSetId;
    }

    // Fetches the beatmap set ID from the osu!direct API (setter, basically)
    public async fetchBeatmapSetId() {
        const res = await RequestUtils.get(`${Config.OSU_DIRECT_ENDPOINT}md5/${this._md5}`);
        
        this._beatmapSetId = res.data.beatmapset_id;
    }
}