import bcrypt from "bcryptjs";
import crypto from "crypto";

export namespace SecurityUtils {

    export function hashPassword(password: string): string {
        return bcrypt.hashSync(password, 10);
    }

    export function checkPassword(password: string, hash: string): boolean {
        return bcrypt.compareSync(password, hash);
    }

    export function createUuid(username: string = ""): string {
        return username + crypto.randomUUID().toString().replace("-", "");
    }

    export function createMd5(input: string): string {
        return crypto.createHash("md5").update(input).digest("hex");
    }

}
