import fs from "node:fs";
import { Request, Response } from "express";
import Router from "express-promise-router";
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

const playerPool: PlayerPool = PlayerPool.getInstance();

export const api = Router();

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
            user.rows[0].id,
            uuid,
            stats.rows[0].rank,
            stats.rows[0].rank,     // TODO: look into rank by
            stats.rows[0].accuracy * 1000,
            user.rows[0].username,
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

// Download replay
api.get("/upload/:replay", async (req: Request, res: Response) => {
    const replay: string = req.params.replay;
    const replayPath: string = Config.DATA_PATH + "replays/" + replay;

    fs.access(replayPath, fs.constants.F_OK, (err) => {
        if (err) {
            return res.send(getResult(ResultType.FAIL, ["Cannot find replay."]));
        }
    });

    return res.sendFile(replayPath);
});

// Upload replay
api.post("/upload.php", async (req: Request, res: Response) => {
    
});

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

    /*
    // Check if the user exists
    const user: QueryResult = await query(
        `
        SELECT *
        FROM users
        WHERE id = $1
        `,
        [data.userID]
    );
    if (user.rows.length < 1) {
        return res.send(getResult(ResultType.FAIL, ["Cannot find user."]));
    }
    */

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
        return res.send(getResult(ResultType.SUCCESS, [1, player._id]));
    }

    // Perform regular score submission otherwise
    const score: Score = await Score.fromSubmission(data);
    console.log(score);

    console.log("Enough for today.");
});
