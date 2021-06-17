import { IRecommender, Candidate } from './recommender'
import { Vector, Matrix } from '../math'

interface RLGRUModel {
    'rnn.weight_ih': Matrix
    'rnn.weight_hh': Matrix
    'rnn.bias_ih': Vector
    'rnn.bias_hh': Vector
    'fc.weight': Matrix
    'fc.bias': Vector
}

class RLGRURecommender implements IRecommender {

    embeddings: {[id: string]: Vector}
    hiddenState: Vector
    state: string
    excludeIDs: Set<string> = new Set()
    defaultRecommendSize: number
    model: RLGRUModel

    constructor(embeddings: {[id: string]: Vector}, model: RLGRUModel, initID: string, excludeIDs?: Set<string>, defaultRecommendSize?: number) {
        this.embeddings = embeddings
        this.state = initID
        if (!(initID in this.embeddings)) throw new Error(`initID(${initID}) not in embeddings`)
        if (excludeIDs) this.excludeIDs = excludeIDs
        this.defaultRecommendSize = defaultRecommendSize || 5
        this.hiddenState = embeddings[initID]
        this.model = model
    }

    recommend(n?: number): Set<string> {
        n = n || this.defaultRecommendSize
        const candidates: Candidate[] = []
        const v: Vector = this.embeddings[this.state]
        for (const id in this.embeddings) {
            if (id !== this.state && !this.excludeIDs.has(id)) {
                candidates.push({id, score: Vector.DotProduct(v, this.fc(this.embeddings[id]))})
            }
        }
        return new Set(candidates.sort((a: Candidate, b: Candidate) => b.score - a.score).slice(0, n).map((x: Candidate) => x.id))
    }

    hit(id: string, action: string) {
        if (action === 'hover' && id in this.embeddings) {
            this.state = id
            this.hiddenState = this.gru(this.hiddenState, this.embeddings[id])
        }
    }

    fc(x: Vector) {
        return Matrix.MultiplyVector(this.model["fc.weight"], x).add(this.model["fc.bias"])
    }

    gru(h: Vector, x: Vector) {
        const wx = Matrix.MultiplyVector(this.model["rnn.weight_ih"], x).add(this.model["rnn.bias_ih"])
        const wh = Matrix.MultiplyVector(this.model["rnn.weight_hh"], h).add(this.model["rnn.bias_hh"])
        const nr = Math.floor(wx.length / 3)
        const r = (new Vector(wh.data.slice(0, nr))).add(new Vector(wx.data.slice(0, nr))).sigmoid()
        const z = (new Vector(wh.data.slice(nr, 2 * nr))).add(new Vector(wx.data.slice(nr, 2 * nr))).sigmoid()
        const n = (new Vector(wh.data.slice(2 * nr, 3 * nr))).multiply(r).add(new Vector(wx.data.slice(2 * nr, 3 * nr))).tanh()
        const data: number[] = []
        for (let i = 0; i < nr; ++i) data[i] = (1 - z.data[i]) * n.data[i] + z.data[i] * h.data[i]
        return new Vector(data)
    }

}

export {
    RLGRUModel,
    RLGRURecommender
}