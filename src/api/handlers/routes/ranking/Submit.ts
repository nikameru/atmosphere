import { Response, Request } from "express";
import { QueryResult } from "pg";
import { ResultType } from "../../../../enums/ResultType";
import { RequestUtils } from "../../../../utils/RequestUtils";
import { query } from "../../../../database/Database";

import { PlayerPool } from "../../../../global/PlayerPool";
import { Score } from "../../../../structures/Score";
import { ScoreStatus } from "../../../../enums/ScoreStatus";

const playerPool: PlayerPool = PlayerPool.getInstance();

export async function submitScore(req: Request, res: Response) {
    const data: Record<string, string> = req.body;

    // Ensure that all required parameters are present in the request
    if (
        !RequestUtils.validateParams(data, ["userID", "ssid", "hash"])
        && !RequestUtils.validateParams(data, ["userID", "playID", "data"])
    ) {
        return res.send(RequestUtils.createResult(
            ResultType.FAIL,
            ["Not enough arguments."]
        ));
    }

    const player = playerPool.getPlayer(Number(data.userID));
    if (player === undefined) {
        return res.send(RequestUtils.createResult(
            ResultType.FAIL,
            ["Cannot find player."]
        ));
    }

    // That means play has only started, so pre-submit is performed
    if (!data.playID) {
        if (data.ssid !== player._uuid) {
            return res.send(RequestUtils.createResult(
                ResultType.FAIL,
                ["UUID mismatch."]
            ));
        }

        player.playing = data.hash;

        // Perform pre-submit
        // TODO: check for previous pre-submits and stuff
        const preSubmit: QueryResult = await query(
            `
            INSERT INTO scores
            (player_id, beatmap_hash, status)
            VALUES ($1, $2, $3)
            RETURNING id
            `,
            [player._id, data.hash, ScoreStatus.PRESUBMITTED]
        );
        const playId: number = preSubmit.rows[0].id;

        return res.send(RequestUtils.createResult(
            ResultType.SUCCESS,
            [1, player._id]
        ));
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

        // Update the score after dealing with the previous best (if present)
        const insertedScore: QueryResult = await query(
            `
            UPDATE scores
            SET timestamp = $1,
                device_id = $2,
                rank = $3,
                mods = $4,
                score = $5,
                max_combo = $6,
                full_combo = $7,
                grade = $8,
                accuracy = $9,
                hit300 = $10,
                hit_geki = $11,
                hit100 = $12,
                hit_katsu = $13,
                hit50 = $14,
                hit_miss = $15,
                status = $16
            WHERE player_id = $17 AND beatmap_hash = $18 AND status = $19
            RETURNING id
            `,
            [
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
                score.status,
                player._id,
                score._beatmapHash,
                ScoreStatus.PRESUBMITTED
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

        await player.updateRankAndAccuracy();
    } catch (err) {
        console.log("ERROR while submitting score: " + err + "\n");
        return res.send(RequestUtils.createResult(
            ResultType.FAIL,
            ["Score submission failed."]
        ));
    }
    console.log(score);

    return res.send(RequestUtils.createResult(
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
}