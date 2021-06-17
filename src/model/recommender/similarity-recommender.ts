import { IRecommender, Candidate } from './recommender'
import { Vector } from '../math'

class SimilarityRecommender implements IRecommender {

    embeddings: {[id: string]: Vector}
    state: string
    excludeIDs: Set<string> = new Set()
    defaultRecommendSize: number

    constructor(embeddings: {[id: string]: Vector}, initID: string, excludeIDs?: Set<string>, defaultRecommendSize?: number) {
        this.embeddings = embeddings
        this.state = initID
        if (!(initID in this.embeddings)) throw new Error(`initID(${initID}) not in embeddings`)
        if (excludeIDs) this.excludeIDs = excludeIDs
        this.defaultRecommendSize = defaultRecommendSize || 5
    }

    recommend(n?: number): Set<string> {
        n = n || this.defaultRecommendSize
        const candidates: Candidate[] = []
        const v: Vector = this.embeddings[this.state]
        for (const id in this.embeddings) {
            if (id !== this.state && !this.excludeIDs.has(id)) {
                candidates.push({id, score: Vector.DotProduct(v, this.embeddings[id])})
            }
        }
        return new Set(candidates.sort((a: Candidate, b: Candidate) => b.score - a.score).slice(0, n).map((x: Candidate) => x.id))
    }

    hit(id: string, action: string) {
        if (action === 'hover' && id in this.embeddings) this.state = id
    }

}

export {
    SimilarityRecommender
}