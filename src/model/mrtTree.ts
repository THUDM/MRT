
interface IMRTNode {
    type: string;
    id: string;
    name: string;
    link_in?: string[];
    link_out?: string[];
    offsetY?: number;
    blockKey?: string;
    textHeight?: number;
}

interface IMRTBlock {
    name: string;
    clusterIndex: number;
    column: number;
    row: number;
    weight?: number;
    nodes: IMRTNode[];
}

interface IMRTColumn {
    clusterIndex: number;
    index: number;
    rowStart: number;
    columnStart: number;
}

interface IMRTCluster {
    name: string;
    value?: number;
    rank?: number;
    tags?: string[];
}

interface IMRTRow {
    name?: string;
}

interface IMRTData {
    root: IMRTBlock;
    blocks: IMRTBlock[];
    columns: IMRTColumn[];
    rows?: IMRTRow[];
    clusters: IMRTCluster[];
}

export {
    IMRTNode,
    IMRTBlock,
    IMRTData,
    IMRTColumn,
    IMRTRow,
    IMRTCluster
}