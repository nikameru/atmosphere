import { Request, Response } from "express";

import { ResultType } from "../enums/ResultType";

export function logRequests(req: Request, res: Response, next: any) {
    console.log(
        `[${new Date().toLocaleString()}] ${req.method} => ${req.originalUrl}\n` +
        `DATA: ${JSON.stringify(req.body)}\n` +
        `PARAMS: ${JSON.stringify(req.params)}\n`
    );

    next();
}

export function validateParams(
    data: Record<string, string>,
    requiredParams: string[]
): boolean {
    return requiredParams.every(param => data[param]) ? true : false;
}

export function getResult(type: ResultType, data: any[]): string {
    return type + "\n" + data.map(String).join(" ");
}
