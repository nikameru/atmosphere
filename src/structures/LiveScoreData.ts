export interface LiveScoreData {
    // Player id is present only when the server sends data to clients
    uid?: string;
    score: number;
    combo: number;
    accuracy: number;
}