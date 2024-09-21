import { Player } from '../structures/Player';
import { Room } from '../structures/Room';

// Pool of active multiplayer rooms
// Should make it a regular map?
export class RoomPool {
    private static instance: RoomPool;
    private rooms: Map<number, Room> = new Map<number, Room>();

    private constructor() { }

    public static getInstance(): RoomPool {
        if (!RoomPool.instance) {
            RoomPool.instance = new RoomPool();
        }

        return RoomPool.instance;
    }

    public add(room: Room): void {
        console.log(room);

        this.rooms.set(room._id, room);
    }

    public delete(id: number): void {
        this.rooms.delete(id);
    }

    public getRoom(id: number): Room | undefined {
        return this.rooms.get(id);
    }

    public getRooms(): Map<number, Room> {
        return this.rooms;
    }
}
