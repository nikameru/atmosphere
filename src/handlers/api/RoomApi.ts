import { Socket } from "socket.io";
import { RoomPool } from "../../global/RoomPool";

const roomPool: RoomPool = RoomPool.getInstance();

export function onRoomConnection(socket: Socket) {
    // Namespace scheme is "/multi/roomId"
    const roomId: number = parseInt(
        socket.nsp.name.slice(socket.nsp.name.lastIndexOf("/") + 1)
    );
    const room = roomPool.getRoom(roomId);

    if (!room) {
        console.log("[onRoomConnection] Cannot find the room!\n", roomId);
        return socket.emit("error", "Cannot find the room.");
    }

    const playerNames: string[] = [];
    const players: Record<string, any>[] = [];
    room.players.forEach(player => {
        playerNames.push(player._username);
        players.push({
            uid: player._id,
            username: player._username,
            status: player.status,
            team: player.team,
            mods: player.mods
        });
    });

    socket.emit("initialConnection", {
        id: room._id,
        name: room.name,
        host: {
            uid: room.host._id.toString(),
            username: room.host._username
        },
        maxPlayers: room.maxPlayers,
        isLocked: room.isLocked,
        mods: room.mods,
        gameplaySettings: room.gameplaySettings,
        teamMode: room.teamMode,
        winCondition: room.winCondition,
        players: players,
        playerCount: room.players.length,
        playerNames: playerNames.join(" "),
        status: room.status,
        sessionId: socket.id
    });
}