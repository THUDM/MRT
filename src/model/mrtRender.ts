import { IMRTBlock, IMRTNode, IMRTRow } from "./mrtTree";

interface IClusterInfo {
    name: string,
    value?: number,
    rank?: number,
    level: number;
    x: number;
    y: number;
    width: number;
    levelMax: number;
    levelMin: number;
    bgColor: string;
    levelInfos: IColumnInfo[];
    tags?: string[];
}

interface IColumnInfo {
    clusterIndex: number;
    indexInCluster: number;
    startRow: number;
    startColumn: number;
    visible: boolean;
    empty: boolean;
}

interface IRowInfo extends IMRTRow {
    height: number;
}

interface ILineInfo {
    key: string;
    x1: number;
    y1: number;
    x2: number;
    y2: number;
    strokeWidth: number;
    stroke: string;
    opacity: number;
}

interface ICircleInfo {
    key: string;
    row: number;
    cx: number;
    cy: number;
    r: number;
    weight: number;
    stroke: string;
    fill: string;
}

interface IBlockInfo {
    key: string;
    nodes: IMRTNode[];
    x: number;
    y: number;
    width: number;
    color: string;
    fontSize: number;
    lineHeight: number;
    fontWeight?: number | "-moz-initial" | "inherit" | "initial" | "revert" | "unset" | "normal" | "bold" | "bolder" | "lighter";
}

interface ITextInfo {
    key: string;
    text: string;
    fontSize: number;
    color: string;
    x: number;
    y: number;
    width?: number;
    fontWeight?: 'bold' | 'normal' | number;
    mouseOver?: (e: React.MouseEvent, tinfo: ITextInfo) => void;
}

interface IGrid {
    rowNum: number;
    columnInfos: IColumnInfo[];
    rowInfos: IRowInfo[];
    cells: IGridCell[];
}

interface IGridCell {
    block: IMRTBlock | null;
    textWidth: number;
    textHeight: number;
    extend: boolean;
}

interface IHighlightRow {
    row: number;
    x: number;
    y: number;
    width: number;
    height: number;
    opacity: number;
    fill: string;
}

interface ICardData {
    left: number;
    top: number;
    node: IMRTNode;
    nodeDiv: HTMLDivElement;
    die: boolean;
}

interface IPos {
    x: number;
    y: number;
}

interface ILinkNode {
    node: IMRTNode;
    x: number;
    y: number;
}

interface ILink {
    id: string;
    color: string;
    source: ILinkNode;
    outs: ILinkNode[];
    ins: ILinkNode[];
}

export {
    IClusterInfo,
    ILineInfo,
    IColumnInfo,
    IRowInfo,
    IGrid,
    IGridCell,
    ICircleInfo,
    IBlockInfo,
    ITextInfo,
    IHighlightRow,
    ICardData,
    IPos,
    ILinkNode,
    ILink
}