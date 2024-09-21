import { Response, Request } from "express";
import { QueryResult } from "pg";
import { ResultType } from "../../../../enums/ResultType";
import { validateParams, getResult } from "../../../../utils/NetworkUtils";
import { query } from "../../../../database/Database";

import { PlayerPool } from "../../../../global/PlayerPool";
import { Score } from "../../../../structures/Score";
import { ScoreStatus } from "../../../../enums/ScoreStatus";

const playerPool: PlayerPool = PlayerPool.getInstance();

// Get top scores for a beatmap (leaderboard)
export async function getLeaderboard(req: Request, res: Response) {
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
}

// Get score data by id
export async function getScore(req: Request, res: Response) {
    const data: Record<string, string> = req.body;

    // Ensure that all required parameters are present in the request
    if (!validateParams(data, ["playID"])) {
        return res.send(getResult(ResultType.FAIL, ["Not enough arguments."]));
    }

    var score: Score;
    try {
        score = await Score.fromDatabase(parseInt(data.playID));
    } catch (err) {
        return res.send(getResult(ResultType.FAIL, ["Cannot find score."]));
    }

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
}
