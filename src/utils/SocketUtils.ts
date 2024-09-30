import { Socket } from "socket.io";

export function getRoomId(socket: Socket): number {
    // Namespace scheme is "/multi/roomId"
    return Number(socket.nsp.name.slice(
        socket.nsp.name.lastIndexOf("/") + 1)
    );
}
