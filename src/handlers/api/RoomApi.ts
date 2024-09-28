import { Socket } from "socket.io";

import { io } from "../../index";
import { RoomPool } from "../../global/RoomPool";
import { RoomStatus } from "../../enums/RoomStatus";
import { Room } from "../../structures/Room";
import { PlayerStatus } from "../../enums/PlayerStatus";
import { RoomPlayer } from "../../structures/RoomPlayer";
import { RoomTeam } from "../../enums/RoomTeam";
import { Player } from "../../structures/Player";
import { handleBeatmapChange, handleHostChange } from "./events/RoomEvents";

const roomPool: RoomPool = RoomPool.getInstance();

export const onRoomConnection = withRoom(async (socket: Socket, room: Room) => {
    const roomPlayer: RoomPlayer = new RoomPlayer(
        socket.handshake.auth.uid,
        socket.handshake.auth.username,
        socket.id
    );

    room.players.set(socket.id, roomPlayer);

    // Session id is unknown at the time of room creation, so it needs to be assigned here
    if (roomPlayer._id === room.host._id) {
        room.host.sessionId = socket.id;
    }

    // Join the room
    await socket.join(room._id.toString());

    console.log(room.players, socket.handshake.auth, socket.rooms, socket.id);

    // Setup event listeners
    socket.on("beatmapChanged", (beatmap: Record<string, any>) => onBeatmapChanged(socket, beatmap));
    socket.on("hostChanged", (uid: string) => onHostChanged(socket, uid));

    // Provide the room data on the initial connection
    socket.emit("initialConnection", {
        id: room._id,
        name: room.name,
        host: {
            uid: room.host._id.toString(),
            username: room.host._username
        },
        maxPlayers: room.maxPlayers,
        isLocked: room.isLocked,
        beatmap: room.beatmap,
        mods: room.mods,
        gameplaySettings: room.gameplaySettings,
        teamMode: room.teamMode,
        winCondition: room.winCondition,
        players: Array.from(room.players.values()).map(player => {
            return {
                uid: player._id,
                username: player._username,
                status: player.status,
                team: player.team,
                mods: player.mods
            };
        }),
        playerCount: room.players.size,
        playerNames: Array.from(room.players.values())
            .map(player => player._username)
            .join(", "),
        status: room.status,
        sessionId: socket.id
    });
});

export const onBeatmapChanged = withRoom(handleBeatmapChange);
export const onHostChanged = withRoom(handleHostChange);

function withRoom(handler: (socket: Socket, room: Room, ...args: any[]) => void) {
    return (socket: Socket, ...args: any[]) => {
        const roomId: number = Number(
            socket.nsp.name.slice(socket.nsp.name.lastIndexOf("/") + 1)
        );
        const room = roomPool.getRoom(roomId);

        if (!room) {
            console.log(`[withRoom] Cannot find the room!\n`, roomId);
            socket.emit("error", "Cannot find the room.");
            return;
        }

        handler(socket, room, ...args);
    };
}