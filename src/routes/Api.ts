import { Request, Response } from 'express';
import Router from 'express-promise-router';

import { Success, Fail } from '../ResponseTypes';
import { query } from '../db/Database';
import { 
    hashPassword, 
    checkPassword,
    createUuid, 
    createMd5
} from '../utils/SecurityUtils';

import { AccountStatus } from '../objects/AccountStatus';
import * as Config from '../Config';
import { QueryResult } from 'pg';

export const api = Router();

api.post('/login.php', async (req: Request, res: Response) => {
    console.log(req.body);

    const data: Record<string, string> = req.body;

    // Ensure that all required parameters are present in the request
    const requiredParams: Array<string> = [
        'username',
        'password',
        'version'
    ];
    if (!requiredParams.every(param => data[param])) {
        return res.send(Fail(['Not enough arguments.']));
    }

    // Check whether the client is up-to-date
    if (parseInt(data.version) < Config.ONLINE_VERSION) {
        return res.send(Fail(['Update the game to use online features.']));
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
        return res.send(Fail(['Cannot find user.']));
    }
    if (!checkPassword(data.password, user.rows[0].password_hash)) {
        return res.send(Fail(['Wrong password.']));
    }
    if (user.rows[0].account_status === AccountStatus.Restricted) {
        return res.send(Fail(['Login restricted.']));
    }

    // Get user statistics
    const stats: QueryResult = await query(
        `
        SELECT rank, accuracy
        FROM stats
        WHERE id = $1
        `,
        [user.rows[0].id]
    );
    if (stats.rows.length < 1) {
        return res.send(Fail(['Failed to retrieve user statistics.']));
    }

    // TODO: last online time
    // ...

    const avatarLink: string = Config.GRAVATAR_ENDPOINT + user.rows[0].email_hash;
    
    return res.send(Success([
        user.rows[0].id,                        // Player id
        createUuid(user.rows[0].username),      // Uuid
        stats.rows[0].rank,                     // Rank
        stats.rows[0].rank,                     // TODO: Rank by?
        stats.rows[0].accuracy * 1000,          // Accuracy
        user.rows[0].username,                  // Username    
        avatarLink                              // Avatar link
    ]));
});

api.post('/register.php', async (req: Request, res: Response) => {
    console.log(req.body);

    const data: Record<string, string> = req.body;

    // Ensure that all required parameters are present in the request
    const requiredParams: Array<string> = [
        'username',
        'password',
        'deviceID',
        'email',
        'sign'
    ];
    if (!requiredParams.every(param => data[param])) {
        return res.send(Fail(['Not enough arguments.']));
    }

    // Check if the user already exists
    const user: QueryResult = await query(
        `
        SELECT *
        FROM users
        WHERE username = $1
        `,
        [data.username]
    );
    if (user.rows.length > 0) {
        return res.send(Fail(['Username is already taken.']));
    }

    // Username length checks (must be from 2 to 16 characters in length)
    if (data.username.length < 2) {
        return res.send(Fail(['Username cannot be shorter than 2 characters.']));
    } else if (data.username.length > 16) {
        return res.send(Fail(['Username cannot be longer than 16 characters.']));
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
            data.username.toLowerCase().replace(' ', '_'),
            hashPassword(data.password),
            data.deviceID,
            data.sign,
            null,
            null,
            data.email,
            createMd5(data.email),
            AccountStatus.Unrestricted,
            Math.round(Date.now() / 1000),
            null
        ]
    );

    const playerId: number = insertedPlayer.rows[0].id;
    console.log(playerId);
    await query(
        `
        INSERT INTO stats
        (id)
        VALUES ($1)
        `,
        [playerId]
    );

    return res.send(Success(['Account created.']));
});
