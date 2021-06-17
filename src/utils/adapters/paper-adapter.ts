import _ from 'lodash'
import { defaultPaperNode } from '../../model/nodes/paperNode'
import { IMRTData } from '../../model/mrtTree'
import { IAdapter } from './adapter'
import { Vector, Matrix } from '../../model/math'
import { RLGRUModel, RLGRURecommender } from '../../model/recommender/rl-gru-recommender'
import { IRecommender, SimilarityRecommender } from '../../model/recommender'

class PaperAdapter implements IAdapter {
    transform(raw: {data: any, userEdits: any}): IMRTData {
        const { data, userEdits } = raw
        let mrtData: any = {
            root: { nodes: [toPaperNode(data.root, undefined)] },
            blocks: [],
            columns: [],
            clusters: [],
            rows: []
        };
        if(userEdits) {
            for(let nodeId in userEdits) {
                let edit = userEdits[nodeId];
                let pos = getPositionByBranches(data.branches, nodeId);
                if(pos) {
                let {cluster, sub, index} = pos
                if(edit.clusterId !== undefined && cluster !== edit.clusterId) {
                    let nodes = data.branches[cluster][sub].splice(index, 1);
                    if(data.branches[edit.clusterId]) {
                        if(data.branches[edit.clusterId].length > sub) {
                            data.branches[edit.clusterId][sub].push(...nodes);
                        } else {
                            data.branches[edit.clusterId][0].push(...nodes);
                        }
                    }
                }
                }
                if (nodeId === mrtData.root.nodes[0].id) {
                    mrtData.root.nodes[0].like = edit.rate === 1;
                    mrtData.root.nodes[0].dislike = edit.rate === -1;
                }
            }
        }
        let eras = calcEras(data);
        mrtData.rows = eras.map((era: any) => {
            return {name: era.from !== era.to ? `${era.from} - ${era.to}` : `${era.from}`}
        })
        let clusterLen = data.branches.length;
        let sortedClusterImportance = [...data.importance].sort((a, b) => (a-b))
        for (let cIndex = 0; cIndex < clusterLen; ++cIndex) {
            let clusterName = data.clusterNames[cIndex];
            clusterName = clusterName.replace(/\b(\w)(\w*)/g, (_: any, $1: any, $2: any) => {
                return $1.toUpperCase() + $2.toLowerCase();
        });
        mrtData.clusters.push({
            name: clusterName,
            value: data.importance[cIndex],
            rank: (sortedClusterImportance.indexOf(data.importance[cIndex])+1),
        })
        if (!!data.tagGroups && data.tagGroups.length === mrtData.clusters.length) {
            data.tagGroups.map((tags: string[], idx: number) => {mrtData.clusters[idx].tags = tags.map((tag: string) => tag.split(' ').map((word: string) => _.capitalize(word)).join(' '))})
        }
        let cluster = data.branches[cIndex];
        let columnLen = cluster.length;
        for (let columnIndex = 0; columnIndex < columnLen; ++columnIndex) {
            let columnData = cluster[columnIndex];
            if(columnData && columnData.length) {
                let blocks: any[] = [];
                columnData.sort((a: any, b: any) => (a.paper_year === b.paper_year) ? (b.paper_citations.length - a.paper_citations.length) : (b.paper_year - a.paper_year));
                columnData.reduce((prev: any, current: any) => {
                    let node: any = toPaperNode(current, data.root);
                    let nodeEdits = userEdits && userEdits[node.id];
                    if(nodeEdits) {
                        node.like = nodeEdits.rate === 1;
                        node.dislike = nodeEdits.rate === -1;
                    }
                    for (let e = 0; e < eras.length; ++e) {
                        let era = eras[e];
                        if (node.year >= era.from && node.year <= era.to) {
                            let row = e;
                            if (prev && prev.row === row) {
                                prev.nodes.push(node);
                                return prev;
                            } else {
                                let block = {
                                    clusterIndex: cIndex,
                                    column: columnIndex,
                                    row,
                                    nodes: [node]
                                }
                                blocks.push(block);
                                return block;
                            }
                        }
                    }
                    return null;
                }, undefined);
                mrtData.blocks.push(...blocks);
                let column = {
                    clusterIndex: cIndex,
                    index: columnIndex,
                    rowStart: blocks[0].row,
                    columnStart: 0
                }
                mrtData.columns.push(column);
            }
        }
        mrtData.blocks.reduce((array: any, block: any) => { array.push(...block.nodes); return array; }, [])
            .sort((a: any, b: any) => b.score - a.score)
            .forEach((paper: any, index: any, all: any) => {
                let total = all.length;
                paper.scoreRank = index;
                if(index < total * 0.1) paper.level = 3;
                else if(index < total * 0.3) paper.level = 2;
                else if(index < total * 0.6) paper.level = 1;
                else paper.level = 0;
            })
            mrtData.blocks.forEach((block: any) => {
                let maxLevel = Math.max.apply(null, block.nodes.map((v: any) => v.level));
                block.weight = maxLevel / 3;
            })
        }
        return mrtData;
    }

    transformEmbeddings(raw: {data: any, userEdits: any}): {[id: string]: Vector} | undefined {
        const data = raw.data
        if (!data.root.embeddings) return undefined
        const embeddings: {[id: string]: Vector} = {}
        embeddings[data.root.paper_id] = new Vector(data.root.embeddings)
        for (const cluster of data.branches) {
            for (const branch of (cluster as any)) {
                for (const paper of (branch as any)) {
                    const p = paper as any
                    if (!!p.embeddings) {
                        embeddings[p.paper_id] = new Vector(p.embeddings)
                    }
                }
            }
        }
        return embeddings
    }

    transformRLGRUModel(raw: {data: any, userEdits: any}): RLGRUModel | undefined {
        const data = raw.data
        if (!data['rec-model']) return undefined
        const recModel = data['rec-model']
        try {
            return {
                'rnn.weight_ih': new Matrix(recModel['rnn.weight_ih']),
                'rnn.weight_hh': new Matrix(recModel['rnn.weight_hh']),
                'rnn.bias_ih': new Vector(recModel['rnn.bias_ih']),
                'rnn.bias_hh': new Vector(recModel['rnn.bias_hh']),
                'fc.weight': new Matrix(recModel['fc.weight']),
                'fc.bias': new Vector(recModel['fc.bias']),
            }
        } catch (e) {
            return undefined
        }
    }

    transformRecommender(raw: {data: any, userEdits: any}, topK: number): IRecommender | undefined {
        const embeddings = this.transformEmbeddings(raw)
        const rlgruModel = this.transformRLGRUModel(raw)
        const rootID = raw.data.root.paper_id
        let recommender = undefined
        if (embeddings) {
            if (rlgruModel) recommender = new RLGRURecommender(embeddings, rlgruModel, rootID, new Set([rootID]), topK)
            else recommender = new SimilarityRecommender(embeddings, rootID, new Set([rootID]), topK)
        }
        return recommender
    }
}

function getPositionByBranches(branches: any, nodeId: any): any {
    for(let clusterIndex=0; clusterIndex < branches.length; ++clusterIndex) {
        let branch = branches[clusterIndex];
        for(let subIndex=0; subIndex < branch.length; ++subIndex) {
            let subBranch = branch[subIndex];
            for(let i=0; i < subBranch.length; ++i) {
                let node = subBranch[i];
                if(node.paper_id === nodeId) {
                    return {
                        cluster: clusterIndex,
                        sub: subIndex,
                        index: i
                    }
                }
            }
        }
    }
}

function calcEras(data: any): any {
    let eras = [];
    let years = _.flattenDeep(data.branches)
        .map((paper: any) => paper.paper_year)
        .sort()
        .reverse();
    let _to = years[0];
    let _cnt = 1;
    let eraMinSize = 0.05 * years.length;
    let lastEraMinSize = 0.2 * years.length;
    for (let i = 1; i < years.length; i++) {
        if (years[i] === years[i - 1] || _cnt < eraMinSize || i > years.length - lastEraMinSize) {
            _cnt += 1;
        } else {
            eras.push({ from: years[i - 1], to: _to, cnt: _cnt });
            _to = years[i];
            _cnt = 1;
        }
    }
    eras.push({ from: years[years.length - 1], to: _to, cnt: _cnt });
    return eras;
}

function toPaperNode(input: any, root: any): any {
    let node = { ...defaultPaperNode };
    node.id = input.paper_id;
    node.link_in = input.citations;
    node.link_out = input.references;
    if(root) {
        if(node.link_in && node.link_in.indexOf(root.paper_id) >= 0) {
            node.link_in.splice(node.link_in.indexOf(root.paper_id), 1);
        }
        if(node.link_out && node.link_out.indexOf(root.paper_id) >= 0) {
            node.link_out.splice(node.link_out.indexOf(root.paper_id), 1);
        }
    }
    node.year = input.paper_year;
    node.abstract = input.paper_abstract;
    node.venue = input.paper_venue.trim();
    // node.citations = input.paper_citations;
    node.score = input.score;
    node.title = input.paper_title.trim();
    node.authors = input.paper_authors;
    node.editable = true;
    let prefix = `${node.year}`;
    let venue_year = /^(19|20)\d{2}\b/.exec(node.venue);
    if (venue_year != null) {
      prefix = `${node.venue}`;
    } else if (node.venue.length) {
      prefix = `${node.year} ${node.venue}`;
    }
    node.name = `[${prefix}] ${node.title}`.replace('\t', " ")
      .replace('\n', " ");
    return node;
}

export {
    PaperAdapter
}
