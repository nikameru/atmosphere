import fs from "node:fs";
import { Request, Response } from "express";
import Router from "express-promise-router";
import multer from "multer";
import { QueryResult } from "pg";

import { query } from "../database/Database";
import { 
    hashPassword, 
    checkPassword,
    createUuid, 
    createMd5
} from "../utils/SecurityUtils";
import { logRequests, validateParams, getResult } from "../utils/NetworkUtils";

import { ResultType } from "../enums/ResultType";
import { AccountStatus } from "../enums/AccountStatus";
import * as Config from "../Config";
import { Player } from "../structures/Player";
import { PlayerPool } from "../objects/PlayerPool";
import { Score } from "../structures/Score";
import { ScoreStatus } from "../enums/ScoreStatus";

export const api = Router();

const playerPool: PlayerPool = PlayerPool.getInstance();

// TODO: Move to another file
const replayStorage = multer.diskStorage({
    destination: Config.DATA_PATH + "/replays",
    filename: function (req, file, cb) {
        cb(null, file.originalname);
    }
});
const replayUpload = multer({
    storage: replayStorage
});

// Logging middleware
api.use(logRequests);

// Login
api.post("/login.php", async (req: Request, res: Response) => {
    const data: Record<string, string> = req.body;

    // Ensure that all required parameters are present in the request
    if (!validateParams(data, ["username", "password", "version"])) {
        return res.send(getResult(ResultType.FAIL, ["Not enough arguments."]));
    }

    // Check whether the client is up-to-date
    if (parseInt(data.version) < Config.ONLINE_VERSION) {
        return res.send(
            getResult(ResultType.FAIL, ["Update the game to use online features."])
        );
    }

    // Validate username, password and account status
    const user: QueryResult = await query(
        `
        SELECT id, username, password_hash, account_status, email_hash
        FROM users
        WHERE username = $1
        `,
        [data.username]
    );
    if (user.rows.length < 1) {
        return res.send(getResult(ResultType.FAIL, ["Cannot find user."]));
    }
    if (!checkPassword(data.password, user.rows[0].password_hash)) {
        return res.send(getResult(ResultType.FAIL, ["Wrong password."]));
    }
    if (user.rows[0].account_status === AccountStatus.RESTRICTED) {
        return res.send(getResult(ResultType.FAIL, ["Login restricted."]));
    }

    // Get user statistics
    const stats: QueryResult = await query(
        `
        SELECT *
        FROM stats
        WHERE id = $1
        `,
        [user.rows[0].id]
    );
    if (stats.rows.length < 1) {
        return res.send(
            getResult(ResultType.FAIL, ["Failed to retrieve user statistics."])
        );
    }

    // TODO: last online time
    // ...

    const uuid: string = createUuid(user.rows[0].username);

    const player: Player = new Player(
        user.rows[0].id,
        uuid,
        user.rows[0].username,
        stats.rows[0].rank,
        stats.rows[0].total_score,
        stats.rows[0].ranked_score,
        stats.rows[0].accuracy,
        stats.rows[0].playcount
    );
    playerPool.set(player);

    return res.send(getResult(
        ResultType.SUCCESS, 
        [
            player._id,
            uuid,
            player.rank,
            player.totalScore,
            Math.round(player.accuracy * 1000),
            player.username,
            Config.GRAVATAR_ENDPOINT + user.rows[0].email_hash             
        ]
    ));
});

// Register a new account
api.post("/register.php", async (req: Request, res: Response) => {
    const data: Record<string, string> = req.body;

    // Ensure that all required parameters are present in the request
    if (!validateParams(
        data,
        ["username", "password", "deviceID", "email", "sign"]
    )) {
        return res.send(getResult(ResultType.FAIL, ["Not enough arguments."]));
    }

    // Check if the user already exists
    const user: QueryResult = await query(
        `
        SELECT id
        FROM users
        WHERE username = $1
        `,
        [data.username]
    );
    if (user.rows.length > 0) {
        return res.send(getResult(ResultType.FAIL, ["Username is already taken."]));
    }

    // Username length checks (must be from 2 to 16 characters in length)
    if (data.username.length < 2) {
        return res.send(getResult(
            ResultType.FAIL,
            ["Username cannot be shorter than 2 characters."]
        ));
    } else if (data.username.length > 16) {
        return res.send(getResult(
            ResultType.FAIL, 
            ["Username cannot be longer than 16 characters."]
        ));
    }

    // Insert player into the database
    const insertedPlayer: QueryResult = await query(
        `
        INSERT INTO users
        (
            prefix,
            username,
            username_safe,
            password_hash,
            device_id,
            sign,
            avatar_id,
            custom_avatar,
            email,
            email_hash,
            account_status,
            account_created,
            last_login
        ) 
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
        RETURNING id
        `, [
            null,
            data.username,
            data.username.toLowerCase().replace(" ", "_"),
            hashPassword(data.password),
            data.deviceID,
            data.sign,
            null,
            null,
            data.email,
            createMd5(data.email),
            AccountStatus.UNRESTRICTED,
            Math.round(Date.now() / 1000),
            null
        ]
    );

    const playerId: number = insertedPlayer.rows[0].id;
    await query(
        `
        INSERT INTO stats
        (id)
        VALUES ($1)
        `,
        [playerId]
    );

    return res.send(getResult(ResultType.SUCCESS, ["Account created."]));
});

// Get top scores for a beatmap (leaderboard)
api.post("/getrank.php", async (req: Request, res: Response) => {
    const data: Record<string, string> = req.body;

    // Ensure that all required parameters are present in the request
    if (!validateParams(data, ["hash"])) {
        return res.send(getResult(ResultType.FAIL, ["Not enough arguments."]));
    }

    const scores: QueryResult = await query(
        `
        SELECT *
        FROM scores
        JOIN users
        ON scores.player_id = users.id
        WHERE beatmap_hash = $1 AND status = $2
        ORDER BY score DESC
        LIMIT 50
        `,
        [data.hash, ScoreStatus.BEST]
    );
    // Tranform query result into a string array with the needed format
    const leaderboardData: string[] = scores.rows.map(entry => 
        [
            entry.id,
            entry.username,
            entry.score,
            entry.max_combo,
            entry.grade,
            entry.mods,
            Math.round(entry.accuracy * 1000),
            entry.email_hash
        ].join(" ")
    );

    return res.send(getResult(
        ResultType.SUCCESS,
        [leaderboardData.join("\n")]
    ));
});

// Get score data by id
api.post("/gettop.php", async (req: Request, res: Response) => {
    const data: Record<string, string> = req.body;

    // Ensure that all required parameters are present in the request
    if (!validateParams(data, ["playID"])) {
        return res.send(getResult(ResultType.FAIL, ["Not enough arguments."]));
    }

    const score: Score = await Score.fromDatabase(parseInt(data.playID));
    return res.send(getResult(
        ResultType.SUCCESS,
        [
            score._mods,
            score._score,
            score._maxCombo,
            score._grade,
            score._hitGeki,
            score._hit300,
            score._hitKatsu,
            score._hit100,
            score._hit50,
            score._hitMiss,
            Math.round(score._accuracy * 1000)
        ]
    ));
});

// Download replay
api.get("/upload/:replay", (req: Request, res: Response) => {
    const replay: string = req.params.replay;
    const replayPath: string = Config.DATA_PATH + "/replays/" + replay;

    fs.access(replayPath, fs.constants.F_OK, (err) => {
        if (err) {
            return res.send(getResult(ResultType.FAIL, ["Cannot find replay."]));
        }
    });

    return res.sendFile(replayPath);
});

// Upload replay
api.post(
    "/upload.php",
    replayUpload.single("uploadedfile"),
    async (req: Request, res: Response) => {
        return res.send(getResult(ResultType.SUCCESS, ["Replay uploaded."]));
    }
);

// Submit score
api.post("/submit.php", async (req: Request, res: Response) => {
    const data: Record<string, string> = req.body;

    // Ensure that all required parameters are present in the request
    if (
        !validateParams(data, ["userID", "ssid", "hash"]) &&
        !validateParams(data, ["userID", "playID", "data"])
    ) {
        return res.send(getResult(ResultType.FAIL, ["Not enough arguments."]));
    }

    const player = playerPool.getPlayer(parseInt(data.userID));
    if (player === undefined) {
        return res.send(getResult(ResultType.FAIL, ["Cannot find player."]));
    }

    // That means play has just started, no score has been set yet
    if (!data.playID) {
        if (data.ssid !== player._uuid) {
            return res.send(getResult(ResultType.FAIL, ["UUID mismatch."]));
        }

        player.playing = data.hash;
        // TODO: Should "playID" always equal to 1?
        return res.send(getResult(ResultType.SUCCESS, [1, player._id]));
    }

    // Perform regular score submission otherwise
    var score: Score;
    try {
        score = await Score.fromSubmission(data);

        // If new best, update the previous best score and add score points
        if (score.status === ScoreStatus.BEST) {
            await query(
                `
                UPDATE scores
                SET status = $1
                WHERE beatmap_hash = $2 AND status = $3 AND player_id = $4
                `,
                [
                    ScoreStatus.SUBMITTED,
                    score._beatmapHash,
                    ScoreStatus.BEST,
                    score._player?._id
                ]
            );

            // Add score points to the player statistics
            var diff: number = score._score;
            // If there was a previous best score, subtract it from the reward
            if (score.previousBest) {
                diff -= score.previousBest._score;
            }
            // TODO: check if the beatmap should give ranked score, etc.
            player.totalScore += diff;
            player.rankedScore += diff;
        }

        // Update other player statistics
        player.playing = "";
        player.playcount++;

        // Insert the score after dealing with the previous best (if present)
        const insertedScore: QueryResult = await query(
            `
            INSERT INTO scores
            (
                player_id,
                beatmap_hash,
                timestamp,
                device_id,
                rank,
                mods,
                score,
                max_combo,
                full_combo,
                grade,
                accuracy,
                hit300,
                hit_geki,
                hit100,
                hit_katsu,
                hit50,
                hit_miss,
                status
            )
            VALUES (
                $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
                $11, $12, $13, $14, $15, $16, $17, $18
            )
            RETURNING id
            `,
            [
                score._player?._id,
                score._beatmapHash,
                score._timestamp,
                score._deviceId,
                score.rank,
                score._mods,
                score._score,
                score._maxCombo,
                score._fullCombo,
                score._grade,
                score._accuracy,
                score._hit300,
                score._hitGeki,
                score._hit100,
                score._hitKatsu,
                score._hit50,
                score._hitMiss,
                score.status
            ]
        );
        score.id = insertedScore.rows[0].id;

        // Insert new score values and playcount into the database
        await query(
            `
            UPDATE stats
            SET total_score = $1,
                ranked_score = $2,
                playcount = $3
            WHERE id = $4
            `,
            [
                player.totalScore,
                player.rankedScore,
                player.playcount,
                player._id
            ]
        );
        // Update rank and accuracy (database update is done in the method)
        // TODO: I should probably merge these two operation into one method
        await player.updateRankAndAccuracy();
    } catch (err) {
        console.log("ERROR while submitting score: " + err + "\n");
        return res.send(
            getResult(ResultType.FAIL, ["Score submission failed."])
        );
    }
    console.log(score);

    return res.send(getResult(
        ResultType.SUCCESS,
        [
            player.rank,
            player.rankedScore,
            Math.round(player.accuracy * 1000),
            score.rank,
            // If the score is best, request replay upload
            score.status === ScoreStatus.BEST ? score.id : ""
        ]
    ));
});
