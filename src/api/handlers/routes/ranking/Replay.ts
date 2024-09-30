import fs from "node:fs";
import { Response, Request } from "express";
import { ResultType } from "../../../../enums/ResultType";
import { getResult } from "../../../../utils/RequestUtils";
import * as Config from "../../../../global/Config";

// Download replay
export async function downloadReplay(req: Request, res: Response) {
    const replay: string = req.params.replay;
    const replayPath: string = Config.DATA_PATH + "/replays/" + replay;

    fs.access(replayPath, fs.constants.F_OK, (err) => {
        if (err) {
            return res.send(getResult(ResultType.FAIL, ["Cannot find replay."]));
        }
    });

    return res.sendFile(replayPath);
}

// Upload replay
export async function uploadReplay(req: Request, res: Response) {
    return res.send(getResult(ResultType.SUCCESS, ["Replay uploaded."]));
}
