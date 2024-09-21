import { Response, Request } from "express";
import { QueryResult } from "pg";
import { ResultType } from "../../../../enums/ResultType";
import { validateParams, getResult } from "../../../../utils/NetworkUtils";
import { query } from "../../../../database/Database";
import { hashPassword, createMd5 } from "../../../../utils/SecurityUtils";

import { AccountStatus } from "../../../../enums/AccountStatus";

export async function register(req: Request, res: Response) {
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
}
