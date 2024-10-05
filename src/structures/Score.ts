import { QueryResult } from "pg";

import { query } from "../database/Database";
import { Player } from "./Player";
import { ScoreStatus } from "../enums/ScoreStatus";
import { PlayerPool } from "../global/PlayerPool";

export class Score {

    private _id: number;

    private readonly _beatmapHash: string;
    private readonly _player: Player | null;
    private readonly _timestamp: number;
    private readonly _deviceId: string;

    private _rank: number;

    private readonly _mods: string;
    private readonly _score: number;
    private readonly _maxCombo: number;
    private readonly _fullCombo: boolean;
    private readonly _grade: string;
    private readonly _accuracy: number;
    private readonly _hit300: number;
    private readonly _hitGeki: number;
    private readonly _hit100: number;
    private readonly _hitKatsu: number;
    private readonly _hit50: number;
    private readonly _hitMiss: number;

    private _status: ScoreStatus;
    private _previousBest: Score | null;

    public constructor(
        id?: number,
        beatmapHash?: string,
        player?: Player,
        timestamp?: number,
        deviceId?: string,
        rank?: number,
        mods?: string,
        score?: number,
        maxCombo?: number,
        fullCombo?: boolean,
        grade?: string,
        accuracy?: number,
        hit300?: number,
        hitGeki?: number,
        hit100?: number,
        hitKatsu?: number,
        hit50?: number,
        hitMiss?: number,
        status?: ScoreStatus,
        previousBest?: Score,
    
    ) {
        this._id = id ?? -1;

        this._beatmapHash = beatmapHash ?? "";
        this._player = player ?? null;
        this._timestamp = timestamp ?? 0;
        this._deviceId = deviceId ?? "";

        this._rank = rank ?? 0;

        this._mods = mods ?? "";
        this._score = score ?? 0;
        this._maxCombo = maxCombo ?? 0;
        this._fullCombo = fullCombo ?? false;
        this._grade = grade ?? "";
        this._accuracy = accuracy ?? 0;

        this._hit300 = hit300 ?? 0;
        this._hitGeki = hitGeki ?? 0;
        this._hit100 = hit100 ?? 0;
        this._hitKatsu = hitKatsu ?? 0;
        this._hit50 = hit50 ?? 0;
        this._hitMiss = hitMiss ?? 0;

        this._status = status ?? ScoreStatus.NONE;
        this._previousBest = previousBest ?? null;
    }

    public get id(): number {
        return this._id;
    }

    public set id(value: number) {
        this._id = value;
    }

    public get beatmapHash(): string {
        return this._beatmapHash;
    }

    public get player(): Player | null {
        return this._player;
    }

    public get timestamp(): number {
        return this._timestamp;
    }

    public get deviceId(): string {
        return this._deviceId;
    }

    public get rank(): number {
        return this._rank;
    }

    public set rank(value: number) {
        this._rank = value;
    }

    public get mods(): string {
        return this._mods;
    }

    public get score(): number {
        return this._score;
    }

    public get maxCombo(): number {
        return this._maxCombo;
    }

    public get fullCombo(): boolean {
        return this._fullCombo;
    }

    public get grade(): string {
        return this._grade;
    }

    public get accuracy(): number {
        return this._accuracy;
    }

    public get hit300(): number {
        return this._hit300;
    }

    public get hitGeki(): number {
        return this._hitGeki;
    }

    public get hit100(): number {
        return this._hit100;
    }

    public get hitKatsu(): number {
        return this._hitKatsu;
    }

    public get hit50(): number {
        return this._hit50;
    }

    public get hitMiss(): number {
        return this._hitMiss;
    }

    public get status(): ScoreStatus {
        return this._status;
    }

    public set status(value: ScoreStatus) {
        this._status = value;
    }

    public get previousBest(): Score | null {
        return this._previousBest;
    }

    public set previousBest(value: Score) {
        this._previousBest = value;
    }

    public static async fromDatabase(id: number): Promise<Score> {
        const score: QueryResult = await query(
            `
            SELECT *
            FROM scores
            WHERE id = $1
            `,
            [id]
        );
        if (score.rows.length < 1) {
            throw new Error("Cannot find score.");
        }

        const player: Player | undefined = PlayerPool.getInstance()
            .getPlayer(score.rows[0].player_id);
        if (player === undefined) {
            throw new Error("Cannot find player.");
        }

        return new Score(
            score.rows[0].id,
            score.rows[0].beatmap_hash,
            player,
            score.rows[0].timestamp,
            score.rows[0].device_id,
            score.rows[0].rank,
            score.rows[0].mods,
            score.rows[0].score,
            score.rows[0].max_combo,
            score.rows[0].full_combo,
            score.rows[0].grade,
            score.rows[0].accuracy,
            score.rows[0].hit300,
            score.rows[0].hit_geki,
            score.rows[0].hit100,
            score.rows[0].hit_katsu,
            score.rows[0].hit50,
            score.rows[0].hit_miss,
            score.rows[0].status,
            score.rows[0].previous_best
        );  
    }

    public static async fromSubmission(submission: Record<string, string>): Promise<Score> {
        const data: string[] = submission.data.split(" ");

        const player = PlayerPool.getInstance().getPlayer(Number(submission.userID));
        if (!player) {
            throw new Error("Cannot find player.");
        }

        const score: Score = new Score(
            undefined,
            player.playing ?? undefined,
            player,
            Math.round(Number(data[11]) / 1000),
            undefined,
            undefined,
            data[0],
            Number(data[1]),
            Number(data[2]),
            data[12] === "1",
            data[3],
            Number(data[10]) / 1000,
            Number(data[5]),
            Number(data[4]),
            Number(data[7]),
            Number(data[6]),
            Number(data[8]),
            Number(data[9]),
            undefined,
            undefined
        );
        await score.assignStatus();
        await score.calculateRank();

        return score;
    }

    private async assignStatus() {
        const prevScores: QueryResult = await query(
            `
            SELECT id, score
            FROM scores
            WHERE player_id = $1 AND beatmap_hash = $2 AND status = $3
            `,
            [this.player?.id, this.player?.playing, ScoreStatus.BEST]
        );
        console.log(prevScores.rows);
    
        // If the score is first on the beatmap, it is the best one
        if (prevScores.rows.length < 1) {
            this.status = ScoreStatus.BEST;
        } else if (this.score > prevScores.rows[0].score) {
            // Set the previous best score in case there was one
            this.previousBest = await Score.fromDatabase(prevScores.rows[0].id);
            this.status = ScoreStatus.BEST;
        } else { 
            this.status = ScoreStatus.SUBMITTED;
        }
    }

    private async calculateRank() {
        // Find out amount of players with a higher score on the same beatmap
        const playersAbove: QueryResult = await query(
            `
            SELECT COUNT(*)
            AS amount
            FROM scores
            WHERE beatmap_hash = $1 AND score > $2 AND status = $3
            `,
            [this.beatmapHash, this.score, ScoreStatus.BEST]
        );
        
        // Update beatmap rank, don't forget to add 1 to the amount of players
        this.rank = Number(playersAbove.rows[0].amount) + 1;
    }

}
