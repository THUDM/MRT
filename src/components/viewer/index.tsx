import * as React from 'react';
import './index.less';
import { IMRTBlock, IMRTNode, IMRTData, IMRTColumn, IMRTCluster } from '../../model/mrtTree';
import chroma from 'chroma-js';
import { calcTextHeight } from '../../utils/text';
import { IClusterInfo, ILineInfo, IColumnInfo, IGrid, IGridCell, ICircleInfo, IBlockInfo, ITextInfo, IHighlightRow, ICardData, IPos, ILink, ILinkNode } from '../../model/mrtRender';
import PaperCard from '../card/paper/paperCard';
import TextCard from '../card/text/textCard';
import PersonCard from '../card/person/personCard';
import ClusterCard from '../card/cluster/clusterCard';
import { generateColorThemes, IColorTheme } from '../../utils/color';
import _ from 'lodash'
import BlockNode from './block-node';
import { ReactComponent as Logo } from './images/logo.svg';
import { ILang } from '../../utils/translation';
import { IRecommender } from '../../model/recommender'

interface IState {
    inited: boolean;
    highlightRow: IHighlightRow | null;
    cardDatas: ICardData[];
    link: ILink | null;
    pinLink: ILink[];
    nodeChanging: string | null;
}

interface IProps {
    data: IMRTData;
    fontScale: number;
    scale: number;
    hideSubBranch: boolean;
    disableTextClusterSpan: boolean;
    onHit?: (id: string, action: string) => void;
    onEdit?: (action: string, id: string, value?: number) => void;
    lang: ILang;
    authors: string[]
    recommender?: IRecommender
    recommendable?: boolean
}

export default class MRTViewer extends React.Component<IProps, IState> {
    private _viewer: HTMLDivElement;
    private _rootLineColor: string;
    private _rootFontColor: string;
    private _rootBgColor: string;

    private _data: IMRTData;

    private _parentWidth: number;
    private _parentHeight: number;
    private _globalMarginTop: number;
    private _globalWidth: number;
    private _globalHeight: number;
    private _middleHeight: number;

    private _bottomHeight: number;
    private _bottomNameFontSize: number;
    private _bottomNameMarginTop: number;

    private _authorNameFontSize: number;
    private _authorNameLineHeight: number;

    private _defaultLineWidth: number;
    private _defaultCircleRadius: number;
    private _circleMarginTop: number;
    private _columnPaddingTop: number;

    private _rootHeightTotal: number;
    private _rootTextHeight: number;
    private _rootBlockMarginTop: number;
    private _rootNodeTextWidth: number;
    private _rootNodeGap: number;
    private _rootNodeMarginBottom: number;
    private _rootNodeFontSize: number;
    private _rootNodeLineHeight: number;
    private _rootLineWidth: number;

    private _minColumnWidth: number;
    private _columnNormalWidth: number;
    private _columnTextWidthRatio: number;
    private _columnTextExtendRatio: number;
    private _columnLineMarginLeft: number;
    private _minClusterLevel: number;
    private _linkLineMarginTop: number;

    private _linkNodeRadius: number;

    private _rowPaddingTop: number;
    private _rowPaddingBottom: number;

    private _clusterNameFontSize: number;
    private _clusterNameFontSizeMini: number;

    private _nodeGap: number;
    private _fontSize: number;
    private _fontWeight: number;
    private _lineHeight: number;
    private _nodeMarginLeft: number;

    private _clusterIndexes: number[];
    private _clusterColors: IColorTheme[];
    private _grid: IGrid;

    private _clusterInfos: IClusterInfo[];
    private _lineInfos: ILineInfo[];
    private _circleInfos: ICircleInfo[];
    private _blockInfos: IBlockInfo[];
    private _textInfos: ITextInfo[];

    private _canvasMoving: boolean;

    private _hightlightNodeIDs: Set<string> = new Set();
    private _recommendedNodeIDs: Set<string> = new Set();

    constructor(props: IProps) {
        super(props);
        this.state = {
            inited: false,
            highlightRow: null,
            cardDatas: [],
            link: null,
            pinLink: [],
            nodeChanging: null
        }
        let root: chroma.Color = chroma.scale()(0.5);
        this._rootLineColor = root.hex();
        this._rootFontColor = root.luminance(0.1).hex();
        this._rootBgColor = root.luminance(0.9).hex();

        this._data = JSON.parse(JSON.stringify(this.props.data));

        this._parentWidth = 0;
        this._parentHeight = 0;

        this._minColumnWidth = 112;
        this._globalMarginTop = 16;
        this._globalHeight = 2500;
        this._middleHeight = 0;
        this._bottomHeight = 180;

        this._bottomNameFontSize = 26;
        this._bottomNameMarginTop = 20;

        this._authorNameFontSize = 20;
        this._authorNameLineHeight = 24;

        this._columnLineMarginLeft = 14;
        this._defaultLineWidth = 1;
        this._defaultCircleRadius = 9;
        // this._circleMarginTop = 20;  this is moved to initData to coordinate with _rowPaddingTop
        this._columnPaddingTop = 36;
        // this._linkLineMarginTop = 6; this is moved to initData to coordinate with _circleMarginTop

        this._columnTextWidthRatio = 0.8;
        this._columnTextExtendRatio = 1.7;

        this._rowPaddingTop = 12;
        this._rowPaddingBottom = 10;

        this._nodeMarginLeft = 14;
        this._clusterNameFontSize = 18;
        this._clusterNameFontSizeMini = 14;

        this._rootNodeGap = 6;
        this._rootTextHeight = 0;
        this._rootNodeTextWidth = 350;
        this._rootNodeMarginBottom = 20;
        this._rootBlockMarginTop = -2;
        this._rootLineWidth = 2;

        this._linkNodeRadius = 8;

        this._clusterColors = [];
        this._lineInfos = [];
        this._circleInfos = [];
        this._blockInfos = [];
        this._textInfos = [];

        this._canvasMoving = false;

        this.handleResize = this.handleResize.bind(this);
        this.handleDoubleClickCluster = this.handleDoubleClickCluster.bind(this);
        this.mapLine = this.mapLine.bind(this);
        this.mapCircle = this.mapCircle.bind(this);
        this.mapBlock = this.mapBlock.bind(this);
        this.mapText = this.mapText.bind(this);
        this.mapClusterBg = this.mapClusterBg.bind(this);
        this.mapClusterMask = this.mapClusterMask.bind(this);
        this.handleHighlightRow = this.handleHighlightRow.bind(this);
        this.handleCancelHighlightRow = this.handleCancelHighlightRow.bind(this);
        this.handleCardClose = this.handleCardClose.bind(this);
        this.dieAllCards = this.dieAllCards.bind(this);
        this.handleMapCards = this.handleMapCards.bind(this);
        this.handleCanvasMouseDown = this.handleCanvasMouseDown.bind(this);
        this.handleCanvasMouseMove = this.handleCanvasMouseMove.bind(this);
        this.handleCanvasMouseUp = this.handleCanvasMouseUp.bind(this);
        this.handlePin = this.handlePin.bind(this);
        this.drawLink = this.drawLink.bind(this);
        this.handleNodeChanging = this.handleNodeChanging.bind(this);

        this.initData();
    }

    private initData() {
        this._minClusterLevel = this.props.hideSubBranch ? 1 : 2;

        this._rootNodeFontSize = 14 * this.props.fontScale;
        this._rootNodeLineHeight = this._rootNodeFontSize * 1.1;

        this._fontSize = 10 * this.props.fontScale;
        this._fontWeight = 575;
        this._lineHeight = this._fontSize * 1.1;
        this._circleMarginTop = this._rowPaddingTop + this._lineHeight;
        this._linkLineMarginTop = this._circleMarginTop - Math.max(this._lineHeight, this._defaultCircleRadius) - 4;

        this._nodeGap = 6 * this.props.fontScale;

        let data: IMRTData = this._data;
        this._clusterIndexes = [];
        for(let block of data.blocks) {
            if(this._clusterIndexes.indexOf(block.clusterIndex) < 0) {
                this._clusterIndexes.push(block.clusterIndex);
            }
        }

        let clusterNum: number = this._clusterIndexes.length;
        this._clusterColors = generateColorThemes(clusterNum);
    }

    private handleResize() {
        if(this._viewer) {
            this._parentWidth = this._viewer.offsetWidth * 0.995 * this.props.scale;
            this._parentHeight = this._viewer.offsetHeight;
            this.calc();
        }
    }

    private handleDoubleClickCluster(index: number): void {
        let cluster: IClusterInfo = this._clusterInfos[index];
        if(cluster.levelMax > this._minClusterLevel) {
            let level: number = cluster.levelMax == cluster.level ? this._minClusterLevel : cluster.levelMax;
            cluster.level = level;
        }
        this.calc();
        this.forceUpdate();
    }

    private calcNodesHeight(block: IMRTBlock, width: number, fontSize: number, lineHeight: number, gap: number): number {
        let h: number = 0;
        if(block.nodes && block.nodes.length) {
            h = block.nodes.reduce((pre, cur, index): number => {
                cur.offsetY = pre + (index > 0 ? gap : 0);
                cur.textHeight = calcTextHeight(cur.name, width, fontSize, lineHeight, "left", "bold");
                return cur.offsetY + cur.textHeight;
            }, 0);
        }
        return h;
    }

    private calc() {
        // let startTime: number = new Date().getTime();
        let data: IMRTData = this._data;
        this._grid = {
            rowNum: 0,
            columnInfos: [],
            rowInfos: [],
            cells: []
        }
        let clusterNum: number = this._clusterIndexes.length;

        this._rootNodeTextWidth = Math.max(this._parentWidth / clusterNum * 1.5, this._minColumnWidth);
        this._rootTextHeight = this.calcNodesHeight(data.root, this._rootNodeTextWidth, this._rootNodeFontSize, this._rootNodeLineHeight, this._rootNodeGap) + this._rootNodeMarginBottom;
        this._rootHeightTotal = this._rootTextHeight + this._globalMarginTop;
        this._clusterInfos = [];
        for(let i:number=0; i < clusterNum; ++i) {
            let levelMax: number = data.blocks.reduce((pre, current) => {return (current.clusterIndex == i && current.column > pre) ? current.column : pre}, 0) + 1;
            let level: number = this._minClusterLevel;
            let cluster: IClusterInfo = {
                name: data.clusters[i].name,
                value: data.clusters[i].value || 0,
                rank: data.clusters[i].rank || 0,
                level,
                width: 0,
                levelMax,
                levelMin: level,
                bgColor: this._clusterColors[i].bg,
                x: 0,
                y: this._rootHeightTotal,
                levelInfos: [],
                tags: data.clusters[i].tags
            }
            this._clusterInfos.push(cluster);
        }

        this._columnNormalWidth = Math.max(this._parentWidth / clusterNum / this._minClusterLevel, this._minColumnWidth);
        this._globalWidth = 0;
        for(let i:number=0; i < clusterNum; ++i) {
            let cluster: IClusterInfo = this._clusterInfos[i];
            let width: number = this._columnNormalWidth * Math.max(cluster.level, this._minClusterLevel);
            cluster.width = width;
            cluster.x = this._globalWidth;
            this._globalWidth += width;
        }

        let liveBlocks: IMRTBlock[] = [];
        let rowMax: number = 0;
        for(let block of data.blocks) {
            let clusterInfo: IClusterInfo = this._clusterInfos[block.clusterIndex];
            if(block.column < clusterInfo.level) {
                liveBlocks.push(block);
                if(block.row > rowMax) rowMax = block.row;
            }
        }

        this._grid.rowNum = rowMax + 1;
        for(let c:number=0; c < clusterNum; ++c) {
            let clusterInfo: IClusterInfo = this._clusterInfos[c];
            for(let column:number=0; column < clusterInfo.level; ++ column) {
                let mrtColumn: IMRTColumn | null = this.getMRTColumn(c, column, data.columns);
                this._grid.columnInfos.push({
                    clusterIndex: c,
                    indexInCluster: column,
                    visible: !!mrtColumn || !column,
                    empty: !mrtColumn,
                    startRow: mrtColumn ? mrtColumn.rowStart : 0,
                    startColumn: this.getColumnIndexByIndexInCluster(c, mrtColumn ? mrtColumn.columnStart : 0)
                })
                for(let row:number=0; row <= rowMax; ++row) {
                    let block: IMRTBlock | null = this.getBlock(c, column, row, liveBlocks);
                    let cell: IGridCell = {
                        block,
                        textWidth: 0,
                        textHeight: 0,
                        extend: false
                    }
                    this._grid.cells.push(cell);
                }
            }
        }
        this._middleHeight = this._columnPaddingTop;
        for(let row:number=0; row < this._grid.rowNum; ++row) {
            let rowHeight: number = 0;
            for(let column: number=0; column < this._grid.columnInfos.length; ++column) {
                let columnInfo: IColumnInfo = this._grid.columnInfos[column];
                let cell: IGridCell = this._grid.cells[column * this._grid.rowNum + row];
                if(cell.block) {
                    let rightCell: IGridCell | null = column+1 < this._grid.columnInfos.length ? this._grid.cells[(column+1) * this._grid.rowNum + row] : null;
                    let rightColumn: IColumnInfo | null = column+1 < this._grid.columnInfos.length ? this._grid.columnInfos[column+1] : null;
                    let disableTextClusterSpan: boolean = this.props.disableTextClusterSpan && (!rightColumn || rightColumn.clusterIndex != columnInfo.clusterIndex);
                    if(disableTextClusterSpan || !rightCell || (rightCell && rightCell.block)) {
                        cell.textWidth = this._columnNormalWidth * this._columnTextWidthRatio;
                    }else {
                        cell.textWidth = this._columnNormalWidth * this._columnTextExtendRatio;
                        cell.extend = true;
                    }
                    cell.textHeight = this.calcNodesHeight(cell.block, cell.textWidth, this._fontSize, this._lineHeight, this._nodeGap);
                    let height: number = cell.textHeight + this._rowPaddingTop + this._rowPaddingBottom;
                    rowHeight = rowHeight < height ? height : rowHeight;
                }
            }
            this._grid.rowInfos.push({
                ...((this._data.rows && this._data.rows.length > row) ? this._data.rows[row] : undefined),
                height: rowHeight
            })
            this._middleHeight += rowHeight;
        }
        this._globalHeight = this._rootHeightTotal + this._bottomHeight + this._middleHeight;
        //line
        this._lineInfos.length = 0;
        this._lineInfos.push({
            key: "root_line",
            x1: this._globalWidth/2,
            y1: this._globalMarginTop,
            x2: this._globalWidth/2,
            y2: this._rootHeightTotal,
            stroke: this._rootLineColor,
            strokeWidth: this._rootLineWidth,
            opacity: 1
        });
        let totalBridgeWidth: number = this._globalWidth - this._clusterInfos[this._clusterInfos.length-1].width;
        this._lineInfos.push({
            key: "bridge_line",
            x1: this._columnLineMarginLeft,
            y1: this._rootHeightTotal,
            x2: this._columnLineMarginLeft + totalBridgeWidth,
            y2: this._rootHeightTotal,
            stroke: this._rootLineColor,
            strokeWidth: this._rootLineWidth,
            opacity: 1
        });
        for(let i:number=0; i < this._grid.columnInfos.length; ++i) {
            let column: IColumnInfo = this._grid.columnInfos[i];
            if(column.visible) {
                let startX: number = this._columnNormalWidth * i + this._columnLineMarginLeft;
                let startY: number = this._rootHeightTotal;
                let cluster: IMRTCluster = data.clusters[column.clusterIndex];
                if(column.indexInCluster > 0) {
                    startY += this.getRowOffsetY(column.startRow) + this._linkLineMarginTop;
                    this._lineInfos.push({
                        key: `${i}_link_line`,
                        x1: column.startColumn * this._columnNormalWidth + this._columnLineMarginLeft,
                        y1: startY,
                        x2: i * this._columnNormalWidth + this._columnLineMarginLeft,
                        y2: startY,
                        stroke: this._clusterColors[column.clusterIndex].main,
                        strokeWidth: this._defaultLineWidth + (cluster.rank || 0) / data.clusters.length * 3,
                        opacity: 1
                    })
                }
                let lastRow: number = this.getColumnLastRow(i);
                let lastStartRow: number = 0;
                for(let s:number=i+1; s < this._grid.columnInfos.length; ++s) {
                    let nc: IColumnInfo = this._grid.columnInfos[s];
                    if(nc.clusterIndex == column.clusterIndex) {
                        if(nc.visible && nc.startColumn == i) {
                            lastStartRow = Math.max(lastStartRow, nc.startRow);
                        }
                    }else {
                        break;
                    }
                }
                let endY: number = lastStartRow > lastRow ? (this._rootHeightTotal + this.getRowOffsetY(lastStartRow) + this._linkLineMarginTop) :
                    (this._rootHeightTotal + this.getRowOffsetY(lastRow) + this._circleMarginTop);
                this._lineInfos.push({
                    key: `${i}_line`,
                    x1: startX,
                    y1: startY,
                    x2: startX,
                    y2: endY,
                    stroke: this._clusterColors[column.clusterIndex].main,
                    strokeWidth: this._defaultLineWidth + (cluster.rank || 0) / data.clusters.length * 3,
                    opacity: 1
                })
            }
        }

        this._textInfos = [];
        // cluster names
        for(let c:number=0; c < clusterNum; ++c) {
            let index: number = this.getClusterStartColumn(c, this._grid.columnInfos);
            let y: number = this._rootHeightTotal + this.getRowOffsetY(this.getClusterFirstRowIndex(c)) + this._linkLineMarginTop - this._clusterNameFontSize - 4;
            let text: string = data.clusters[c].name;
            let w: number = this._columnNormalWidth * this._clusterInfos[c].level - this._columnLineMarginLeft - this._nodeMarginLeft;
            let h: number = calcTextHeight(text, w, this._clusterNameFontSize, this._clusterNameFontSize*1.16, 'left');
            let fontSize: number = h > this._columnPaddingTop ? this._clusterNameFontSizeMini : this._clusterNameFontSize;
            this._textInfos.push({
                key: `${c}_cluster_name`,
                text,
                fontSize,
                color: this._clusterColors[c].text,
                x: index * this._columnNormalWidth + this._nodeMarginLeft + this._columnLineMarginLeft,
                y,
                width: w,
                fontWeight: 'normal',
                mouseOver: !!this._clusterInfos[c].tags ? (e: React.MouseEvent, tinfo: ITextInfo) => this.handleClusterTagMouseOver(e, this._clusterInfos[c], tinfo) : undefined
            })
            this._textInfos.push({
                key: `${c}_bottom_cluster_name`,
                text: data.clusters[c].name,
                fontSize: this._bottomNameFontSize,
                color: this._clusterColors[c].bgText,
                x: index * this._columnNormalWidth + this._columnLineMarginLeft,
                y: this._globalHeight - this._bottomHeight + this._bottomNameMarginTop,
                width: this._columnNormalWidth * this._clusterInfos[c].level - this._columnLineMarginLeft,
                fontWeight: 'normal'
            })
        }

        //circle / blocks
        this._circleInfos = [];
        this._blockInfos = [];
        this._circleInfos.push({
            key: "root_circle",
            row: -1,
            cx: this._globalWidth/2,
            cy: this._globalMarginTop + this._defaultCircleRadius,
            r: this._defaultCircleRadius,
            stroke: this._rootLineColor,
            fill: this._rootBgColor,
            weight: 0
        })
        this._blockInfos.push({
            key: "root_block",
            nodes: data.root.nodes,
            x: this._globalWidth / 2 + this._nodeMarginLeft,
            y: this._globalMarginTop + this._rootBlockMarginTop,
            width: this._rootNodeTextWidth,
            color: this._rootFontColor,
            fontSize: this._rootNodeFontSize,
            lineHeight: this._rootNodeLineHeight,
            fontWeight: this._fontWeight,
        })
        for(let column: number=0; column < this._grid.columnInfos.length; ++column) {
            for(let row: number=0; row < this._grid.rowNum; ++row) {
                let cell: IGridCell = this._grid.cells[column * this._grid.rowNum + row];
                if(cell.block) {
                    let columnInfo: IColumnInfo = this._grid.columnInfos[column];
                    this._circleInfos.push({
                        key: `${column}_${row}_circle`,
                        row,
                        cx: column * this._columnNormalWidth + this._columnLineMarginLeft,
                        cy: this._rootHeightTotal + this._circleMarginTop + this.getRowOffsetY(row),
                        r: this._defaultCircleRadius,
                        stroke: this._clusterColors[columnInfo.clusterIndex].main,
                        fill: this._clusterInfos[columnInfo.clusterIndex].bgColor,
                        weight: cell.block.weight || 0
                    })
                    if(cell.extend) {
                        let x1: number = (column+1) * this._columnNormalWidth + this._columnLineMarginLeft;
                        let y1: number = this._rootHeightTotal + this.getRowOffsetY(row) + this._rowPaddingTop - 2;
                        let nextColumnInfo: IColumnInfo = this._grid.columnInfos[column+1];
                        this._lineInfos.push({
                            key: `${column}_${row}_mask_line`,
                            x1,
                            y1,
                            x2: x1,
                            y2: y1 + cell.textHeight + 6,
                            stroke: this._clusterInfos[nextColumnInfo.clusterIndex].bgColor,
                            strokeWidth: this._defaultLineWidth + 4,
                            opacity: 1
                        })
                    }
                    this._blockInfos.push({
                        key: `${column}_${row}_block`,
                        nodes: cell.block.nodes,
                        x: column * this._columnNormalWidth + this._columnLineMarginLeft + this._nodeMarginLeft,
                        y: this.getRowOffsetY(row) + this._rootHeightTotal + this._rowPaddingTop,
                        width: cell.textWidth,
                        color: this._clusterColors[columnInfo.clusterIndex].text,
                        fontSize: this._fontSize,
                        lineHeight: this._lineHeight,
                        fontWeight: this._fontWeight,
                    })
                }
            }
        }
        if (this.props.recommender) this._recommendedNodeIDs = this.props.recommender.recommend()
        this.forceUpdate();
        // console.log("Calc time: ", (new Date().getTime() - startTime));
    }


    private getClusterFirstRowIndex(cluster: number): number {
        let result: number = this._grid.rowNum;
        for(let i:number=0; i < this._grid.columnInfos.length; ++i) {
            let info: IColumnInfo = this._grid.columnInfos[i];
            if(info.clusterIndex == cluster && !info.empty) {
                if(info.startRow < result) {
                    result = info.startRow;
                }
            }
        }
        return result;
    }

    private getColumnLastRow(column: number): number {
        let result: number = 0;
        for(let i:number=this._grid.rowNum-1; i >= 0; --i) {
            if(this._grid.cells[column * this._grid.rowNum + i].block) {
                result = i;
                break;
            }
        }
        return result;
    }

    private getClusterStartColumn(cluster: number, columns: IColumnInfo[]): number {
        let result: number = 0;
        for(let i:number=0; i < columns.length; ++i) {
            if(columns[i].clusterIndex == cluster) {
                result = i;
                break;
            }
        }
        return result;
    }

    private getColumnIndexByIndexInCluster(cluster: number, index: number): number {
        let result: number = 0;
        for(let c:number=0; c < cluster; ++c) {
            result += this._clusterInfos[c].level;
        }
        return result + index;
    }

    private getRowOffsetY(row: number): number {
        let offset: number = 0;
        for(let i:number=0; i < row; ++i) {
            offset += this._grid.rowInfos[i].height;
        }
        offset += this._columnPaddingTop;
        return offset;
    }

    private getMRTColumn(cluster: number, index: number, columns: IMRTColumn[]): IMRTColumn | null {
        for(let column of columns) {
            if(column.clusterIndex == cluster && column.index == index) {
                return column;
            }
        }
        return null;
    }

    private getBlock(cluster: number, column: number, row: number, blocks: IMRTBlock[]): IMRTBlock | null {
        for(let block of blocks) {
            if(block.clusterIndex == cluster && block.column == column && block.row == row) {
                return block;
            }
        }
        return null;
    }

    private handleHighlightRow(row: number): void {
        let offsetY: number = this.getRowOffsetY(row) + this._rootHeightTotal;
        this.setState({
            highlightRow: row >= 0 ? {
                row,
                x: 0,
                y: offsetY,
                width: this._globalWidth,
                height: this._grid.rowInfos[row].height,
                fill: this._rootLineColor,
                opacity: 0.3
            } : null
        })
    }

    private handleCancelHighlightRow(): void {
        if(this.state.highlightRow) {
            this.setState({highlightRow: null});
        }
    }

    private mapLine(value: ILineInfo): JSX.Element {
        return <line key={value.key}
                    x1={value.x1}
                    x2={value.x2}
                    y1={value.y1}
                    y2={value.y2}
                    stroke={value.stroke}
                    strokeWidth={value.strokeWidth}
                    strokeLinecap="round"/>;
    }

    private mapCircle(value: ICircleInfo): JSX.Element {
        const weight: number = value.weight;
        const r: number = value.r;
        const dy = r * (weight - 0.5)*2;
        const dx = Math.sqrt(r * r - dy * dy);
        const y: number = value.cy - dy;
        const x1: number = value.cx - dx;
        const x2: number = value.cx + dx;
        return (
            <g key={`${value.key}`} onMouseEnter={() => this.handleHighlightRow(value.row)} onMouseLeave={this.handleCancelHighlightRow} strokeWidth={2} strokeLinecap="square">
                {weight > 0.1 && weight < 0.9 && <path d={`M ${x1} ${y} A ${r} ${r} 0 ${weight >= 0.5 ? 1 : 0} 0 ${x2} ${y}`} fill={value.stroke} stroke={value.stroke}/>}
                {weight > 0.1 && weight < 0.9 && <path d={`M ${x1} ${y} A ${r} ${r} 0 ${weight >= 0.5 ? 0 : 1} 1 ${x2} ${y}`} fill="white" stroke={value.stroke}/>}
                {weight >= 0.9 && <circle cx={value.cx} cy={value.cy} r={r} stroke={value.stroke} fill={value.stroke}/>}
                {weight <= 0.1 && <circle cx={value.cx} cy={value.cy} r={r} stroke={value.stroke} fill="white"/>}
            </g>
        )
    }

    private mapText(info: ITextInfo): JSX.Element {
        return <div key={info.key} style={{ position: 'absolute', left: `${info.x}px`, top: `${info.y}px` }}>
            <div style={{
                fontSize: `${info.fontSize}px`,
                fontWeight: info.fontWeight || 'normal',
                lineHeight: `${info.fontSize*1.2}px`,
                color: `${info.color}`,
                width: `${info.width}px`
                // userSelect: 'none'
            }} onMouseOver={(e: React.MouseEvent) => { if (!!info.mouseOver) info.mouseOver(e, info) }}>
                {info.text}
            </div>
        </div>
    }

    private mapBlock(block: IBlockInfo): JSX.Element {
        let scale: number = 1;
        let fontSize:number = block.fontSize;
        let width: number = block.width;
        let lineHeight: number = block.lineHeight;
        if(block.fontSize < 12) {
            scale = block.fontSize / 12;
            fontSize = 12;
            width = block.width / scale;
            lineHeight = block.lineHeight / scale;
        }
        return (
            <div key={block.key} style={{position: "absolute", left: block.x, top: block.y, width: `${width}px`}}>
                {
                    block.nodes.map((node: IMRTNode) => {
                        node.blockKey = block.key;
                        return <BlockNode
                            key={node.id}
                            fontSize={fontSize}
                            lineHeight={lineHeight}
                            scale={scale}
                            block={block}
                            node={node}
                            mouseOver={(e) => this.handleNodeMouseOver(e, node)}
                            highlighted={this._hightlightNodeIDs.has(node.id)}
                            recommended={!!this.props.recommendable && this._recommendedNodeIDs.has(node.id)}
                            focused={(this.state.link && this.state.link.id === node.id)!!}
                        />
                    })
                }
            </div>
        )
    }

    private mapClusterMask(value: IClusterInfo, index: number): JSX.Element {
        return (
            <div key={`${index}_cluster_mask`}
                className='_mrtviewer_cluster_mask'
                style={{position: 'absolute',
                    left: `${value.x}px`,
                    top: `${value.y}px`,
                    width: `${value.width}px`,
                    height: `${this._middleHeight+this._bottomHeight}px`,
                    backgroundColor: this._clusterColors[index].bgMask}}
                onClick={() => this.handleClusterMaskChange(index)} />
        )
    }

    private handleClusterMaskChange(index: number): void {
        this.props.onEdit && this.props.onEdit('exchange', this.state.nodeChanging!, index);
        this.setState({nodeChanging: null});
    }

    private mapClusterBg(value: IClusterInfo, index: number): JSX.Element {
        return <g key={`${index}_cluster_bg`}>
            <rect key={index}
                onDoubleClick={() => this.handleDoubleClickCluster(index)}
                fill={value.bgColor}
                x={value.x}
                y={value.y}
                width={value.width}
                height={this._middleHeight} />
            <g key={`${index}_bottom_bg`}>
                <defs>
                    <linearGradient id={`${index}_bottom_linear`} x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="30%" style={{stopColor: `${value.bgColor}`}} />
                        <stop offset="100%" style={{stopColor: `#ffffff`}} />
                    </linearGradient>
                </defs>
                <rect fill={`url(#${index}_bottom_linear)`}
                    x={value.x}
                    y={this._globalHeight - this._bottomHeight}
                    width={value.width}
                    height={this._bottomHeight}>
                </rect>
            </g>
        </g>
    }

    private generateLinkPath(source: ILinkNode, target: ILinkNode, reverse: boolean) {
        let x1 = source.x, y1 = source.y, x2 = target.x, y2 = target.y
        const mx = x1 - this._linkNodeRadius - this._columnLineMarginLeft;
        if (reverse) {
            x1 = target.x
            y1 = target.y
            x2 = source.x
            y2 = source.y
        }
        let d = `M ${x1} ${y1}`
        if (y1 === y2) d += ` L ${x2} ${y2}`
        else if (!reverse) d += ` L ${mx} ${y1} L ${mx} ${(y1+y2)/2} C ${mx} ${y2}, ${mx} ${y2}, ${x2} ${y2}`
        else d += ` C ${mx} ${y1}, ${mx} ${y1}, ${mx} ${(y1+y2)/2} L ${mx} ${y2} L ${x2} ${y2}`
        return d
    }

    private generateArrowPath(source: ILinkNode, target: ILinkNode, forward: boolean) {
        const x = target.x;
        const y = target.y;
        const nx = (x >= source.x) ? (x - this._linkNodeRadius) : (x + this._linkNodeRadius)
        const uy = y - this._linkNodeRadius / 2;
        const by = y + this._linkNodeRadius / 2
        if (forward) {
            const nnx = (x >= source.x) ? (x - this._linkNodeRadius * 1.2) : (x + this._linkNodeRadius * 1.2)
            return `M ${x} ${y} L ${nnx} ${uy} L ${nx} ${y} L ${nnx} ${by} L ${x} ${y}`
        } else {
            const nnx = (x >= source.x) ? (x + this._linkNodeRadius * 0.2) : (x - this._linkNodeRadius * 0.2)
            return `M ${nx} ${y} L ${nnx} ${uy} L ${x} ${y} L ${nnx} ${by} L ${nx} ${y}`
        }
    }

    private estimateLinkLength(source: ILinkNode, target: ILinkNode) {
        return 2 * (Math.abs(source.x - target.x) + Math.abs(source.y - target.y))
    }

    private drawLink(link: ILink): JSX.Element {
        const textColor = link.color;
        return (
        <g key={link.source.node.id} style={{transform: `translateY(${this._lineHeight/2}px)`}}>
            <circle cx={link.source.x} cy={link.source.y} r={6} fill={textColor}/>
            {link.outs.map((linkNode, idx) => (
            <g key={idx}>
                <path className="mrt-link-path" d={this.generateLinkPath(link.source, linkNode, false)} strokeWidth={1.4} stroke={textColor} fill="transparent"
                    strokeDasharray={this.estimateLinkLength(link.source, linkNode)} strokeDashoffset={this.estimateLinkLength(link.source, linkNode)}/>
                <path className="mrt-link-dot" d={this.generateLinkPath(link.source, linkNode, false)} strokeWidth={4} stroke={textColor} fill="transparent"
                    strokeDasharray={`6 ${this.estimateLinkLength(link.source, linkNode)}`} strokeDashoffset={this.estimateLinkLength(link.source, linkNode)}/>
                <path className="mrt-link-arrow" d={this.generateArrowPath(link.source, linkNode, true)} fill={textColor}/>
            </g>
            ))}
            {link.ins.map((linkNode, idx) => (
            <g key={idx}>
                <circle cx={linkNode.x} cy={linkNode.y} r={4} fill={link.color}/>
                <path className="mrt-link-path" d={this.generateLinkPath(link.source, linkNode, false)} strokeWidth={1.4} stroke={textColor} fill="transparent"
                    strokeDasharray={this.estimateLinkLength(link.source, linkNode)} strokeDashoffset={this.estimateLinkLength(link.source, linkNode)}/>
                <path className="mrt-link-dot" d={this.generateLinkPath(link.source, linkNode, true)} strokeWidth={4} stroke={textColor} fill="transparent"
                    strokeDasharray={`6 ${this.estimateLinkLength(link.source, linkNode)}`} strokeDashoffset={this.estimateLinkLength(link.source, linkNode)}/>
            </g>
            ))}
        </g>)
    }

    private getLinkByNode(node: IMRTNode): ILink | null {
        if(node) {
            let pPos: IPos = this.getBlockPosByNode(node);
            let link: ILink = {
                id: node.id,
                color: this.getBlockInfoByNodeId(node.id)!.color,
                source: {
                    node: node,
                    x: pPos.x - this._nodeMarginLeft,
                    y: pPos.y + node.offsetY! + this._lineHeight/2
                },
                outs: [],
                ins: []
            }
            if(node.link_out && node.link_out.length) {
                for(let out of node.link_out) {
                    let outNode: IMRTNode | null = this.getNode(out);
                    if(outNode) {
                        let outPos: IPos = this.getBlockPosByNode(outNode);
                        link.outs.push({
                            node: outNode,
                            x: outPos.x - this._nodeMarginLeft,
                            y: outPos.y + outNode.offsetY! + this._lineHeight/2
                        })
                    }
                }
            }
            if(node.link_in && node.link_in.length) {
                for(let inN of node.link_in) {
                    let inNode: IMRTNode | null = this.getNode(inN);
                    if(inNode) {
                        let inPos: IPos = this.getBlockPosByNode(inNode);
                        link.ins.push({
                            node: inNode,
                            x: inPos.x - this._nodeMarginLeft,
                            y: inPos.y + inNode.offsetY! + this._lineHeight/2
                        })
                    }
                }
            }
            return link;
        }
        return null;
    }

    private handlePin(id: string): void {
        let links: ILink[] = [...this.state.pinLink];
        let link: ILink | undefined = links.find(link => link.id == id);
        if(link) {
            links.splice(links.indexOf(link), 1);
        }else {
            let node: IMRTNode = this.getNode(id)!;
            link = this.getLinkByNode(node)!;
            if(link) links.push(link);
        }
        this.setState({pinLink: links});
    }

    private handleNodeMouseOver(e: React.MouseEvent, node: IMRTNode):void {
        let div: HTMLDivElement = e.target as HTMLDivElement;

        let cardDatas: ICardData[] = [...this.state.cardDatas];
        if(!cardDatas.find(value => value.node.id == node.id)) {
            cardDatas.forEach(value => value.die = true);
            let pos: IPos = this.getBlockPosByNode(node);
            let left: number = pos.x;
            let top: number = pos.y + node.offsetY! - this._fontSize;
            cardDatas.push({
                left,
                top,
                node,
                nodeDiv: div,
                die: false
            });
            if(!this._data.root.nodes.find(d => d.id == node.id)) {
                let link: ILink | null = this.getLinkByNode(node);
                this.setState({cardDatas, link});
            }else {
                this.setState({cardDatas});
            }
        }
    }

    private handleClusterTagMouseOver(e: React.MouseEvent, cinfo: IClusterInfo, tinfo: ITextInfo):void {
        let div: HTMLDivElement = e.target as HTMLDivElement;
        const cid = `cluster-tag-${cinfo.name}`
        let cardDatas: ICardData[] = [...this.state.cardDatas];
        if(!cardDatas.find(value => value.node.id === cid)) {
            cardDatas.forEach(value => value.die = true);
            let pos: IPos = {x: tinfo.x, y: tinfo.y};
            let left: number = pos.x;
            let top: number = pos.y;
            cardDatas.push({
                left,
                top,
                node: { type: 'cluster-tag', id: cid, name: cinfo.name, cinfo, tinfo } as IMRTNode,
                nodeDiv: div,
                die: false
            });
            this.setState({cardDatas})
        }
    }

    private handleMapCards(cardData: ICardData): JSX.Element {
        if (cardData.node === null) return <></>
        switch(cardData.node.type) {
            case "text":
                return  <TextCard key={`${cardData.node.id}_card`}
                    globalWidth={this._globalWidth}
                    left={cardData.left}
                    top={cardData.top}
                    node={cardData.node}
                    nodeDiv={cardData.nodeDiv}
                    die={cardData.die}
                    onClose={this.handleCardClose}/>
            case "person":
                return  <PersonCard key={`${cardData.node.id}_card`}
                    globalWidth={this._globalWidth}
                    left={cardData.left}
                    top={cardData.top}
                    node={cardData.node}
                    nodeDiv={cardData.nodeDiv}
                    die={cardData.die}
                    onClose={this.handleCardClose}/>
            case "cluster-tag":
                return  <ClusterCard key={`${cardData.node.id}_card`}
                    globalWidth={this._globalWidth}
                    left={cardData.left}
                    top={cardData.top}
                    node={cardData.node}
                    nodeDiv={cardData.nodeDiv}
                    die={cardData.die}
                    onClose={this.handleCardClose}
                    lang={this.props.lang}/>
            case "paper":
            default:
                return  <PaperCard key={`${cardData.node.id}_card`}
                    globalWidth={this._globalWidth}
                    left={cardData.left}
                    top={cardData.top}
                    node={cardData.node}
                    nodeDiv={cardData.nodeDiv}
                    die={cardData.die}
                    root={!!this._data.root.nodes.find(node => node.id == cardData.node.id)}
                    pin={!!this.state.pinLink.find(link => link.id == cardData.node.id)}
                    onChanging={this.handleNodeChanging}
                    onPin={this.handlePin}
                    onEdit={this.props.onEdit}
                    onHit={(id, action) => this.onHit(id, action)}
                    onClose={this.handleCardClose}
                    lang={this.props.lang}/>
        }
    }

    private handleNodeChanging(id: string): void {
        this.dieAllCards();
        this.setState({nodeChanging: id});
    }

    private getNode(id: string): IMRTNode | null {
        for(let block of this._blockInfos) {
            for(let n of block.nodes) {
                if(n.id == id) {
                    return n;
                }
            }
        }
        return null;
    }

    private getBlockInfoByNodeId(id: string): IBlockInfo | null {
        for(let block of this._blockInfos) {
            for(let n of block.nodes) {
                if(n.id == id) {
                    return block;
                }
            }
        }
        return null;
    }

    private getBlockPosByNode(node: IMRTNode): IPos {
        for(let block of this._blockInfos) {
            if(node.blockKey) {
                if(node.blockKey == block.key) {
                    return {x: block.x, y: block.y};
                }
            }else {
                for(let n of block.nodes) {
                    if(n.id == node.id) {
                        return {x: block.x, y: block.y};
                    }
                }
            }
        }
        return {x: 0, y: 0};
    }

    private dieAllCards(): void {
        if(this.state.cardDatas.length) {
            let cardDatas: ICardData[] = [...this.state.cardDatas];
            cardDatas.forEach(value => value.die = true);
            this.setState({cardDatas, link: null});
        }
    }

    private onHit(id: string, action: string): void {
        if (this.props.onHit) this.props.onHit(id, action)
        if (this.props.recommender) {
            this.props.recommender.hit(id, action)
            this._recommendedNodeIDs = this.props.recommender.recommend()
            this.forceUpdate()
        }
    }

    private handleCardClose(node: IMRTNode): void {
        let datas: ICardData[] = [...this.state.cardDatas];
        for(let i=datas.length-1; i >= 0; --i) {
            if(datas[i].node.id == node.id) {
                datas.splice(i, 1);
            }
        }
        this.setState({cardDatas: datas});
    }

    private handleCanvasMouseDown(): void {
        this._canvasMoving = true;
        document.addEventListener('mouseup', this.handleCanvasMouseUp);
    }

    private handleCanvasMouseMove(e: React.MouseEvent): void {
        if(this._viewer && this._canvasMoving && this._parentWidth < this._globalWidth) {
            this._viewer.scrollLeft -= e.movementX;
        }
    }

    private handleCanvasMouseUp(): void {
        this._canvasMoving = false;
        document.removeEventListener('mouseup', this.handleCanvasMouseUp);
    }

    public componentDidUpdate(preProps: IProps) {
        if(preProps.data != this.props.data) {
            this._data = JSON.parse(JSON.stringify(this.props.data));
            this.initData();
            this.handleResize();
            // 数据更新时更新card里的node
            if(preProps.data && this.state.cardDatas.length) {
                let cardDatas: ICardData[] = [];
                this.state.cardDatas.forEach(data => cardDatas.push({...data}));
                cardDatas.forEach(data => {
                    data.node = this.getNode(data.node.id)!;
                })
                this.setState({cardDatas});
            }
        }else if(preProps.fontScale != this.props.fontScale ||
            preProps.hideSubBranch != this.props.hideSubBranch) {
            this.initData();
            this.handleResize();
        }else if(preProps.scale != this.props.scale ||
            preProps.disableTextClusterSpan != this.props.disableTextClusterSpan) {
            this.handleResize();
        }
    }

    public componentDidMount() {
        this.handleResize();
        setTimeout(() => {
            this.handleResize();
        }, 100);

        window.addEventListener("resize", this.handleResize);
        this.setState({inited: true});
    }

    public componentWillUnmount() {
        window.removeEventListener("resize", this.handleResize);
    }

    public render() {
        const { inited, highlightRow, cardDatas, link, pinLink, nodeChanging } = this.state;
        const links: ILink[] = [...pinLink];
        if(link && !links.find(l => l.id == link.id)) {
            links.push(link);
        }
        this._hightlightNodeIDs = new Set(_.flatten(links.map(link => [link.id, ...link.ins.map(inode => inode.node.id), ...link.outs.map(inode => inode.node.id)])));
        if (this._hightlightNodeIDs.size == 0) this._hightlightNodeIDs = new Set(_.flatten(this._blockInfos.map(bi => bi.nodes.map(node => node.id))))
        this._hightlightNodeIDs.add(this._data.root.nodes[0].id)
        return (
            <div className='_mrtviewer' ref={(e) => {this._viewer = e!;}} style={{backgroundColor: this._rootBgColor}}>
                {
                    inited ? (
                        <div className='_mrtview_canvas'
                            id='_mrtview_canvas'
                            style={{width: `${this._globalWidth}px`, height: `${this._globalHeight}px`}} >
                            <svg className='_mrtviewer_bg'
                                width={this._globalWidth}
                                height={this._globalHeight}
                                onMouseOver={this.dieAllCards}
                                onMouseDown={this.handleCanvasMouseDown}
                                onMouseMove={this.handleCanvasMouseMove} >
                                {
                                    this._clusterInfos.map(this.mapClusterBg)
                                }
                                {
                                    this._lineInfos.map(this.mapLine)
                                }
                                {
                                    highlightRow && (
                                        <g className="highlight-row">
                                            <rect x={highlightRow.x}
                                                y={highlightRow.y}
                                                width={highlightRow.width}
                                                height={highlightRow.height}
                                                fill={highlightRow.fill}
                                                opacity={highlightRow.opacity}/>
                                            <text x={highlightRow.x+10} y={highlightRow.y+highlightRow.height-10} fill='white' fontSize={this._bottomNameFontSize}>
                                                {this._grid.rowInfos[highlightRow.row].name || ''}
                                            </text>
                                        </g>
                                    )
                                }
                                {
                                    this._circleInfos.map(this.mapCircle)
                                }
                                {
                                    links.map(this.drawLink)
                                }
                            </svg>
                            <div>
                                {
                                    this._textInfos.map(this.mapText)
                                }
                                {
                                    this._blockInfos.map(this.mapBlock)
                                }
                                {
                                    cardDatas.map(this.handleMapCards)
                                }
                                {
                                    !!nodeChanging && this._clusterInfos.map(this.mapClusterMask)
                                }
                                {
                                    <div className="bottom-authors">
                                        <div className="aminer-logo">
                                            <Logo width={this._authorNameLineHeight} height={this._authorNameLineHeight}/>
                                            <span style={{fontSize: this._authorNameFontSize-2}}>AMiner 2020</span>
                                        </div>
                                        { this.props.authors.length > 0 && <div className="authors" style={{fontSize: this._authorNameFontSize}}>
                                            {this.props.authors.join(', ')}
                                        </div>}
                                    </div>
                                }
                            </div>
                        </div>
                    ) : null
                }
            </div>
        )
    }
}