export interface ScoreSubmission {
    uid: string;
    username: string;
    modstring: string;
    score: number;
    maxCombo: number;
    geki: number;           // Amount of `300g`s
    perfect: number;        // Amount of 300s
    katu: number;           // Amount of `100k`s
    good: number;           // Amount of 100s
    bad: number;            // Amount of 50s
    miss: number;
}