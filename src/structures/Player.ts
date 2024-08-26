import { QueryResult } from "pg";

import { query } from "../database/Database";
import { ScoreStatus } from "../enums/ScoreStatus";

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
        id: number,
        uuid: string,
        username: string,
        rank: number,
        totalScore: number,
        rankedScore: number,
        accuracy: number,
        playcount: number,
        playing: string = ""
    ) {
        this._id = id;
        this._uuid = uuid;
        this.username = username;
        this.rank = rank;
        this.totalScore = totalScore;
        this.rankedScore = rankedScore;
        this.accuracy = accuracy;
        this.playcount = playcount;
        this.playing = playing;
    }

    // TODO: Implement methods analogous to the ones in Score.ts
    /*
    public static async fromDatabase(id: number): Promise<Player> {
        const user: QueryResult = await query(
            `
            SELECT id, username, password_hash, account_status, email_hash
            FROM users
            WHERE username = $1
            `,
            [data.username]
        );

        return new Player(
            user.rows[0].id,
            uuid,
            user.rows[0].username,
            stats.rows[0].rank,
            stats.rows[0].total_score,
            stats.rows[0].ranked_score,
            stats.rows[0].accuracy,
            stats.rows[0].playcount
        );
    }
    */

    public async updateRankAndAccuracy() {
        // Find out amount of players with a higher ranked score
        const playersAbove: QueryResult = await query(
            `
            SELECT COUNT(*)
            AS amount
            FROM stats
            WHERE ranked_score > $1
            `,
            [this.rankedScore]
        );
        // Update rank, don't forget to add 1 to the amount of players
        this.rank = parseInt(playersAbove.rows[0].amount) + 1;

        // Recalculate accuracy
        const scores: QueryResult = await query(
            `
            SELECT accuracy
            FROM scores
            WHERE player_id = $1 AND status = $2
            ORDER BY score DESC
            `,
            [this._id, ScoreStatus.BEST]
        );
        console.log(scores.rows);
        if (scores.rows.length < 1) {
            throw new Error("Cannot find scores.");
        }
        this.accuracy = scores.rows
            .reduce((total, score) => total + parseFloat(score.accuracy), 0) 
            / scores.rows.length;

        // Insert changes into the database
        await query(
            `
            UPDATE stats
            SET rank = $1, accuracy = $2
            WHERE id = $3
            `,
            [this.rank, this.accuracy, this._id]
        );
    }
}
