import { Response, Request } from "express";
import { QueryResult } from "pg";
import { ResultType } from "../../../../enums/ResultType";
import { RequestUtils } from "../../../../utils/RequestUtils";
import { query } from "../../../../database/Database";

import { PlayerPool } from "../../../../global/PlayerPool";
import { Score } from "../../../../structures/Score";
import { ScoreStatus } from "../../../../enums/ScoreStatus";

const playerPool: PlayerPool = PlayerPool.getInstance();

// Get top scores for a beatmap (leaderboard)
export async function getLeaderboard(req: Request, res: Response) {
    const data: Record<string, string> = req.body;

    // Ensure that all required parameters are present in the request
    if (!RequestUtils.validateParams(data, ["hash"])) {
        return res.send(RequestUtils.createResult(
            ResultType.FAIL,
            ["Not enough arguments."]
        ));
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

    return res.send(RequestUtils.createResult(
        ResultType.SUCCESS,
        [leaderboardData.join("\n")]
    ));
}

// Get score data by id
export async function getScore(req: Request, res: Response) {
    const data: Record<string, string> = req.body;

    // Ensure that all required parameters are present in the request
    if (!RequestUtils.validateParams(data, ["playID"])) {
        return res.send(RequestUtils.createResult(
            ResultType.FAIL,
            ["Not enough arguments."]
        ));
    }

    var score: Score;
    try {
        score = await Score.fromDatabase(Number(data.playID));
    } catch (err) {
        return res.send(RequestUtils.createResult(
            ResultType.FAIL,
            ["Cannot find score."]
        ));
    }

    return res.send(RequestUtils.createResult(
        ResultType.SUCCESS,
        [
            score.mods,
            score.score,
            score.maxCombo,
            score.grade,
            score.hitGeki,
            score.hit300,
            score.hitKatsu,
            score.hit100,
            score.hit50,
            score.hitMiss,
            Math.round(score.accuracy * 1000)
        ]
    ));
}
