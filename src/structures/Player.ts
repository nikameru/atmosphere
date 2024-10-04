import { QueryResult } from "pg";

import { query } from "../database/Database";
import { ScoreStatus } from "../enums/ScoreStatus";
import { Room } from "./Room";

export class Player {

    private _id: number;
    private _uuid: string;
    private _username: string;
    private _rank: number;
    private _totalScore: number;
    private _rankedScore: number;
    private _accuracy: number;
    private _playcount: number;
    private _playing: string | null;
    private _isInMultiplayerRoom: boolean = false;
    private _multiplayerRoom: Room | null = null;

    public constructor(
        id: number,
        uuid: string,
        username: string,
        rank: number,
        totalScore: number,
        rankedScore: number,
        accuracy: number,
        playcount: number,
        playing?: string | null
    ) {
        this._id = id;
        this._uuid = uuid;
        this._username = username;
        this._rank = rank;
        this._totalScore = totalScore;
        this._rankedScore = rankedScore;
        this._accuracy = accuracy;
        this._playcount = playcount;
        this._playing = playing ?? null;
    }

    public get id(): number {
        return this._id;
    }

    public get uuid(): string {
        return this._uuid;
    }

    public get username(): string {
        return this._username;
    }

    public set username(value: string) {
        this._username = value;
    }

    public get rank(): number {
        return this._rank;
    }

    public set rank(value: number) {
        this._rank = value;
    }

    public get totalScore(): number {
        return this._totalScore;
    }

    public set totalScore(value: number) {
        this._totalScore = value;
    }

    public get rankedScore(): number {
        return this._rankedScore;
    }

    public set rankedScore(value: number) {
        this._rankedScore = value;
    }

    public get accuracy(): number {
        return this._accuracy;
    }

    public set accuracy(value: number) {
        this._accuracy = value;
    }

    public get playcount(): number {
        return this._playcount;
    }

    public set playcount(value: number) {
        this._playcount = value;
    }

    public get playing(): string | null {
        return this._playing;
    }

    public set playing(value: string | null) {
        this._playing = value;
    }

    public get isInMultiplayerRoom(): boolean {
        return this._isInMultiplayerRoom;
    }

    public set isInMultiplayerRoom(value: boolean) {
        this._isInMultiplayerRoom = value;
    }

    public get multiplayerRoom(): Room | null {
        return this._multiplayerRoom;
    }

    public set multiplayerRoom(value: Room | null) {
        this._multiplayerRoom = value;
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
        this.rank = Number(playersAbove.rows[0].amount) + 1;

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