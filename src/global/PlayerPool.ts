import { Player } from '../structures/Player';

// Pool of player objects that logged in since the server started up
// Should make it a regular map?
export class PlayerPool {
    private static instance: PlayerPool;
    private players: Map<number, Player> = new Map<number, Player>();

    private constructor() {}

    public static getInstance(): PlayerPool {
        if (!PlayerPool.instance) {
            PlayerPool.instance = new PlayerPool();
        }

        return PlayerPool.instance;
    }

    public add(player: Player): void {
        console.log(player);
        
        this.players.set(player.id, player);
    }

    public delete(id: number): void {
        this.players.delete(id);
    }

    public getPlayer(id: number): Player | undefined {
        return this.players.get(id);
    }

    public getPlayers(): Map<number, Player> {
        return this.players;
    }
}
