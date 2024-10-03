export interface LiveScoreData {
    // Player username is present only when the server sends data back
    username?: string;
    score: number;
    combo: number;
    accuracy: number;
    isAlive: boolean;
}