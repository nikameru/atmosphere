import { resolve } from "path";

export const DEFAULT_PORT: number = 80;

export const ONLINE_VERSION: number = 40;

export const MULTIPLAYER_VERSION: number = 7;

export const MULTIPLAYER_PATH: string = "/multi";

export const MULTIPLAYER_NAMESPACE: RegExp = /^\/multi\/\d+$/;

export const DATA_PATH: string = resolve(__dirname, "../../data");

export const GRAVATAR_ENDPOINT: string = "https://s.gravatar.com/avatar/";

export const OSU_DIRECT_ENDPOINT: string = "https://osu.direct/api/v2/";