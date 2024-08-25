export class Player {
    public readonly _id: number;
    public readonly _uuid: string;
    public username: string;
    public rank: number;
    public totalScore: number;
    public rankedScore: number;
    public accuracy: number;
    public playcount: number;
    public playing: string;

    public constructor(
        _id: number,
        _uuid: string,
        username: string,
        rank: number,
        totalScore: number,
        rankedScore: number,
        accuracy: number,
        playcount: number,
        playing: string = ""
    ) {
        this._id = _id;
        this._uuid = _uuid;
        this.username = username;
        this.rank = rank;
        this.totalScore = totalScore;
        this.rankedScore = rankedScore;
        this.accuracy = accuracy;
        this.playcount = playcount;
        this.playing = playing;
    }
}
