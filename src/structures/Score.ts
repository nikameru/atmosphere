import { QueryResult } from "pg";

import { query } from "../database/Database";
import { Player } from "./Player";
import { ScoreStatus } from "../enums/ScoreStatus";
import { PlayerPool } from "../objects/PlayerPool";

export class Score {
    // Score data
    public readonly _id: number;
    public readonly _beatmapHash: string;       // +Beatmap object?
    public readonly _player: Player;
    public readonly _timestamp: number;
    public readonly _deviceId: string;

    // Score statistics
    public readonly _rank: string;
    public readonly _mods: string;              // Mod[]?
    public readonly _score: number;             // TODO: +pp?
    public readonly _maxCombo: number;
    public readonly _fullCombo: boolean;
    public readonly _grade: string;             // Grade enum?
    public readonly _accuracy: number;

    // Score hit statistics
    public readonly _hit300: number;
    public readonly _hitGeki: number;
    public readonly _hit100: number;
    public readonly _hitKatsu: number;
    public readonly _hit50: number;
    public readonly _hitMiss: number;
    
    // Score status
    public readonly _status: ScoreStatus;
    public readonly _previousBest: Score | null;

    public constructor(
        _beatmapHash: string,
        _player: Player,
        _timestamp: number,
        _mods: string,
        _score: number,
        _maxCombo: number,
        _fullCombo: boolean,
        _grade: string,
        _accuracy: number,
        _hit300: number,
        _hitGeki: number,
        _hit100: number,
        _hitKatsu: number,
        _hit50: number,
        _hitMiss: number,
        _status: ScoreStatus,
        _id?: number,
        _deviceId?: string,
        _rank?: string,
        _previousBest?: Score,
    
    ) {
        this._id = _id ?? 0;
        this._beatmapHash = _beatmapHash;
        this._player = _player;
        this._timestamp = _timestamp;
        this._deviceId = _deviceId ?? "";
        this._rank = _rank ?? "";
        this._mods = _mods;
        this._score = _score;
        this._maxCombo = _maxCombo;
        this._fullCombo = _fullCombo;
        this._grade = _grade;
        this._accuracy = _accuracy;
        this._hit300 = _hit300;
        this._hitGeki = _hitGeki;
        this._hit100 = _hit100;
        this._hitKatsu = _hitKatsu;
        this._hit50 = _hit50;
        this._hitMiss = _hitMiss;
        this._status = _status;
        this._previousBest = _previousBest ?? null;
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
            .getPlayer(score.rows[0].playerID);
        if (player === undefined) {
            throw new Error("Cannot find player.");
        }

        return new Score(
            score.rows[0].beatmap_hash,
            player,
            score.rows[0].timestamp,
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
            score.rows[0].id,
            score.rows[0].device_id,
            score.rows[0].rank,
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

        const status: ScoreStatus = await Score.determineStatus(
            player,
            submission.beatmapHash,
            parseInt(data[1])
        );

        return new Score(
            player.playing,
            player,
            Math.round(parseInt(data[11]) / 1000),
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
            status
        );
    }

    public static async determineStatus(
        player: Player,
        beatmapHash: string,
        score: number
    ): Promise<ScoreStatus> {
        const scores: QueryResult = await query(
            `
            SELECT *
            FROM scores
            WHERE player_id = $1 AND beatmap_hash = $2
            ORDER BY score DESC
            `,
            [player._id, beatmapHash]
        );

        // If the score is first or better than the current best, it is the best one
        if (scores.rows.length < 1 || score > scores.rows[0].score) {
            return ScoreStatus.BEST;
        } else { 
            return ScoreStatus.SUBMITTED;
        }
    }
}
