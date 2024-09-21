import { Response, Request } from "express";
import { QueryResult } from "pg";

import { ResultType } from "../../../../enums/ResultType";
import { validateParams, getResult } from "../../../../utils/NetworkUtils";
import * as Config from "../../../../global/Config";
import { query } from "../../../../database/Database";
import { checkPassword, createUuid } from "../../../../utils/SecurityUtils";
import { PlayerPool } from "../../../../global/PlayerPool";
import { Player } from "../../../../structures/Player";
import { AccountStatus } from "../../../../enums/AccountStatus";

export async function login(req: Request, res: Response) {
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
    PlayerPool.getInstance().add(player);

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
}
