import { Socket } from "socket.io";

import { Room } from "../../../structures/Room";
import { RoomPlayer } from "../../../structures/RoomPlayer";
import { RoomStatus } from "../../../enums/RoomStatus";
import { io } from "../../..";

export async function handleBeatmapChange(socket: Socket, room: Room, beatmap: Record<string, any>) {
    if (room.status === RoomStatus.PLAYING) {
            console.log("[handleBeatmapChange] Attempt to change the beatmap while the match isn\'t over!\n", room._id);
        return socket.emit("error", "Cannot change the beatmap while somebody is playing.");
    }

    // No beatmap data means the host is in the changing process
    if (!beatmap.md5) {
        room.status = RoomStatus.CHANGING_BEATMAP;

        io.of(socket.nsp.name)
            .to(room._id.toString())
            .emit("beatmapChanged", null);

        //console.log(socket.id, socket.rooms, room._id.toString());
        console.log("[handleBeatmapChange] Emitted beatmap changing in room", room._id);
    } else {
        // Setting room status back
        room.status = RoomStatus.IDLE;
        room.beatmap = beatmap;

        io.of(socket.nsp.name)
            .to(room._id.toString())
            .emit("beatmapChanged", room.beatmap);

        console.log("[handleBeatmapChange] Beatmap changed to", beatmap.md5, "in room", room._id);
    }
}

export function handleHostChange(socket: Socket, room: Room, uid: string) {
    if (socket.id !== room.host.sessionId) {
        console.log("[handleHostChange] Attempt to change room host by a non-host in room", room._id);
        return socket.emit("error", "Only room host is allowed to transfer host.");
    }

    const newHost = Array.from(room.players.values())
        .filter((player: RoomPlayer) => player._id === Number(uid))
        .at(0);

    if (!newHost) {
        console.log("[handleHostChange] Target host not found in room", room._id);
        return socket.emit("error", "Cannot find the player to transfer the host to.");
    }
    room.host = newHost;
    io.of(socket.nsp.name)
        .to(room._id.toString())
        .emit("hostChanged", room.host._id.toString());

    console.log("[handleHostChange] Host changed to", newHost._id, "in room", room._id);
}