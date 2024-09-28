import { Response, Request } from "express";
import { ResultType } from "../../../../enums/ResultType";
import { validateParams, getResult } from "../../../../utils/NetworkUtils";

import { RoomPool } from "../../../../global/RoomPool";
import { Room } from "../../../../structures/Room";
import { RoomStatus } from "../../../../enums/RoomStatus";
import { RoomPlayer } from "../../../../structures/RoomPlayer";

const roomPool: RoomPool = RoomPool.getInstance();

// Retrieve a list of multiplayer rooms
export async function getRooms(req: Request, res: Response) {
    const data: Record<string, string> = req.body;

    const rooms: Record<string, any>[] = [];

    for (const room of roomPool.getRooms().values()) {
        rooms.push({
            id: room._id,
            name: room.name,
            isLocked: room.isLocked,
            maxPlayers: room.maxPlayers,
            beatmap: room.beatmap,
            mods: room.mods,
            gameplaySettings: room.gameplaySettings,
            teamMode: room.teamMode,
            winCondition: room.winCondition,
            players: Array(...room.players.values()).map(player => {
                return {
                    uid: player._id,
                    username: player._username,
                    status: player.status,
                    team: player.team,
                    mods: player.mods
                };
            }),
            playerCount: room.players.size,
            playerNames: Array(...room.players.values())
                .map(player => player._username)
                .join(", "),
            status: room.status
        });
    }

    return res.send(rooms);
}

// Create a multiplayer room
export async function createRoom(req: Request, res: Response) {
    const data: Record<string, any> = req.body;

    // Ensure that all required parameters are present in the request
    if (!validateParams(
        data,
        ["name", "maxPlayers", "host"]
    )) {
        return res.send(getResult(ResultType.FAIL, ["Not enough arguments."]));
    } else if (!validateParams(data.host, ["uid", "username"])) {
        return res.send(getResult(
            ResultType.FAIL,
            ["Not enough arguments in the host field"])
        );
    } else if (data.beatmap) {
        if (!validateParams(
            data.beatmap, 
            ["md5", "title", "artist", "creator", "version"]
        )) {
            return res.send(getResult(
                ResultType.FAIL,
                ["Not enough arguments in the beatmap field"]
            ));
        }
    }

    const room: Room = new Room(
        data.name,
        new RoomPlayer(data.host.uid, data.host.username),
        data.maxPlayers,
        data.beatmap,
        new Map<string, RoomPlayer>(),
        data.mods,
        data.password ?? null,
        data.password ? true : false,
        data.gameplaySettings,
        data.teamMode,
        data.winCondition
    );
    roomPool.add(room);

    return res.send({ id: room._id });
}