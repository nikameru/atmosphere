import { Request, Response } from "express";

import { ResultType } from "../enums/ResultType";
import axios, { AxiosError, AxiosResponse } from "axios";

export namespace RequestUtils {

    export function logRequests(req: Request, res: Response, next: any) {
        console.log(
            `[${new Date().toLocaleString()}] ${req.method} => ${req.originalUrl}\n` +
            `DATA: ${JSON.stringify(req.body)}\n`
        );
        next();
    }

    export function validateParams(data: Record<string, any>, requiredParams: string[]): boolean {
        return requiredParams.every(param => data[param]) ? true : false;
    }

    export function createResult(type: ResultType, data: any[]): string {
        return type + "\n" + data.map(String).join(" ");
    }

    export async function get(url: string, params?: Record<string, any>): Promise<AxiosResponse> {
        const res: AxiosResponse = await axios.get(url, { params: params });
        return res;
    }
}