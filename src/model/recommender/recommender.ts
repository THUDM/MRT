interface IRecommender {
    recommend(n?: number): Set<string>;
    hit(id: string, action: string): void;
}

type Candidate = {id: string, score: number}

export {
    IRecommender,
    Candidate
}