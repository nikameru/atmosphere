import { QueryResult } from "pg";

import { query } from "../database/Database";
import { Player } from "./Player";
import { ScoreStatus } from "../enums/ScoreStatus";
import { PlayerPool } from "../objects/PlayerPool";

export class Score {
    // Score data
    public id: number;

    // TODO: Beatmap class?
    public readonly _beatmapHash: string;
    public readonly _player: Player | null;
    public readonly _timestamp: number;
    public readonly _deviceId: string;

    // Score statistics
    public rank: number;

    // TODO: Mod[]?
    public readonly _mods: string;
    // TODO: DPP?
    public readonly _score: number;
    public readonly _maxCombo: number;
    public readonly _fullCombo: boolean;
    // TODO: Grade enum?
    public readonly _grade: string;
    public readonly _accuracy: number;

    // Score hit statistics
    public readonly _hit300: number;
    public readonly _hitGeki: number;
    public readonly _hit100: number;
    public readonly _hitKatsu: number;
    public readonly _hit50: number;
    public readonly _hitMiss: number;
    
    // Score status
    public status: ScoreStatus;
    public previousBest: Score | null;

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
        this.id = id ?? 0;

        this._beatmapHash = beatmapHash ?? "";
        this._player = player ?? null;
        this._timestamp = timestamp ?? 0;
        this._deviceId = deviceId ?? "";

        this.rank = rank ?? 0;

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

        this.status = status ?? ScoreStatus.NONE;
        this.previousBest = previousBest ?? null;
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

        const player: Player | undefined = PlayerPool.getInstance()
            .getPlayer(parseInt(submission.userID));
        if (player === undefined) {
            throw new Error("Cannot find player.");
        }

        const score: Score = new Score(
            undefined,
            player.playing,
            player,
            Math.round(parseInt(data[11]) / 1000),
            undefined,
            undefined,
            data[0],
            parseInt(data[1]),
            parseInt(data[2]),
            data[12] === "1",
            data[3],
            parseInt(data[10]) / 1000,
            parseInt(data[5]),
            parseInt(data[4]),
            parseInt(data[7]),
            parseInt(data[6]),
            parseInt(data[8]),
            parseInt(data[9]),
            undefined,
            undefined
        );
        await score.determineStatus();
        await score.calculateRank();

        return score;
    }

    private async determineStatus() {
        const prevScores: QueryResult = await query(
            `
            SELECT id, score
            FROM scores
            WHERE player_id = $1 AND beatmap_hash = $2
            ORDER BY score DESC
            `,
            [this._player?._id, this._player?.playing]
        );
        console.log(prevScores.rows);
    
        // If the score is first on the beatmap, it is the best one
        if (prevScores.rows.length < 1) {
            this.status = ScoreStatus.BEST;
        } else if (this._score > prevScores.rows[0].score) {
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
            [this._beatmapHash, this._score, ScoreStatus.BEST]
        );
        
        // Update beatmap rank, don't forget to add 1 to the amount of players
        this.rank = parseInt(playersAbove.rows[0].amount) + 1;
    }
}
