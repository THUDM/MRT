function sigmoid(x: number) {
    return 1 / (1 + Math.exp(-x))
}

class Vector {
    public data: number[]
    public length: number
    constructor(data: number[]) {
        this.data = data
        this.length = data.length
    }
    static DotProduct(v1: Vector, v2: Vector): number {
        const length = v1.length
        if (length !== v2.length || length === 0) throw new Error(`vector length invalid: v1(${length}) v2(${v2.length})`)
        let sum = 0
        for (let i = 0; i < length; ++i) sum += v1.data[i] * v2.data[i];
        return sum
    }
    add(v: Vector): Vector {
        if (v.length !== this.length) throw new Error(`vector length not equal for add, ${this.length} !== ${v.length}`)
        for (let i = 0; i < this.length; ++i) this.data[i] += v.data[i]
        return this
    }
    multiply(v: Vector): Vector {
        if (v.length !== this.length) throw new Error(`vector length not equal for multiply, ${this.length} !== ${v.length}`)
        for (let i = 0; i < this.length; ++i) this.data[i] *= v.data[i]
        return this
    }
    sigmoid(): Vector {
        for (let i = 0; i < this.length; ++i)
            this.data[i] = sigmoid(this.data[i])
        return this
    }
    tanh(): Vector {
        for (let i = 0; i < this.length; ++i)
            this.data[i] = Math.tanh(this.data[i])
        return this
    }
}

class Matrix {
    public data: number[][]
    public rows: number
    public cols: number
    constructor(data: number[][]) {
        this.data = data
        this.rows = data.length
        if (this.rows === 0) throw new Error('matrix rows cannot be 0')
        this.cols = data[0].length
        if (this.cols === 0) throw new Error('matrix cols cannot be 0')
        for (let i = 1; i < this.rows; ++i)
            if (data[i].length !== this.cols)
                throw new Error(`matrix row ${i} has ${data[i].length} cols, inconsistent with ${this.cols}`)
    }
    static MultiplyVector(m: Matrix, v: Vector): Vector {
        if (m.cols !== v.length) throw new Error(`matrix with shape (${m.rows}, ${m.cols}) cannot multiply vector with shape (${v.length},)`)
        let _data: number[] = []
        for (let i = 0; i < m.rows; ++i) {
            _data.push(Vector.DotProduct(v, new Vector(m.data[i])))
        }
        return new Vector(_data)
    }
    add(m: Matrix): Matrix {
        if (m.rows !== this.rows) throw new Error(`matrix rows not equal for add, ${this.rows} !== ${m.rows}`)
        if (m.cols !== this.cols) throw new Error(`matrix cols not equal for add, ${this.cols} !== ${m.cols}`)
        for (let i = 0; i < this.rows; ++i)
            for (let j = 0; j < this.cols; ++j)
                this.data[i][j] += m.data[i][j]
        return this
    }
}

export {
    Vector,
    Matrix
}