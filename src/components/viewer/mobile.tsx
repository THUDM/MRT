import React from 'react'
import './mobile.less'
import { IMRTData, IMRTBlock } from '../../model/mrtTree'
import { ILang, Translator } from '../../utils/translation'
import _ from 'lodash'
import { CaretLeftOutlined, CaretRightOutlined } from '@ant-design/icons'
import { generateColorThemes, IColorTheme } from '../../utils/color'
import { IPaperNode } from '../../model/nodes/paperNode'
import translation from '../card/paper/tooltip-text-translation.json'

const translator: Translator = new Translator(translation)

function PowerBall(props: {weight: number, stroke: string}): JSX.Element {
    const stroke = props.stroke;
    const weight: number = props.weight;
    const r: number = 30;
    const strokeWidth: number = 5;
    const dy = r * (weight - 0.5)*2;
    const dx = Math.sqrt(r * r - dy * dy);
    const y: number = r - dy;
    const x1: number = r - dx;
    const x2: number = r + dx;
    return (
        <svg className="power-ball" viewBox={`${-strokeWidth} ${-strokeWidth} ${2 * r + 2 * strokeWidth} ${2 * r + 2 * strokeWidth}`}>
        <g strokeWidth={strokeWidth} strokeLinecap="square">
            {weight > 0.1 && weight < 0.9 && <path d={`M ${x1} ${y} A ${r} ${r} 0 ${weight >= 0.5 ? 1 : 0} 0 ${x2} ${y}`} fill={stroke} stroke={stroke}/>}
            {weight > 0.1 && weight < 0.9 && <path d={`M ${x1} ${y} A ${r} ${r} 0 ${weight >= 0.5 ? 0 : 1} 1 ${x2} ${y}`} fill="white" stroke={stroke}/>}
            {weight >= 0.9 && <circle cx={r} cy={r} r={r} stroke={stroke} fill={stroke}/>}
            {weight <= 0.1 && <circle cx={r} cy={r} r={r} stroke={stroke} fill="white"/>}
        </g>
        </svg>
    )
}

interface IBlockCardProps {
    block: IMRTBlock
    extBlock?: IMRTBlock
    timelineWidth: number
    timeline?: boolean
    ct?: IColorTheme
    isStart?: boolean
    isEnd?: boolean
    lang: ILang
    title?: string
}

interface IBlockCardState {
    detail: number
    ext: boolean
}

export class BlockCard extends React.Component<IBlockCardProps, IBlockCardState> {
    constructor(props: IBlockCardProps) {
        super(props)
        this.state = { detail: -1, ext: false }
    }

    private t(key: string): string {
        return translator.T(key, this.props.lang)
    }

    render() {
        const ext = !!this.props.extBlock && this.state.ext
        const nodes = ext ? [...this.props.block.nodes, ...(this.props.extBlock as IMRTBlock).nodes] : this.props.block.nodes
        return <div className="mrt-mobile-card">
            {this.props.timeline && <div className="card-timeline">
                <div className={`card-timeline-line ${this.props.isStart ? "start" : ""} ${this.props.isEnd ? "end" : ""}`}
                    style={{width: this.props.timelineWidth, background: this.props.ct ? this.props.ct.main : "black"}}
                />
                <PowerBall weight={this.props.block.weight || 0} stroke={this.props.ct ? this.props.ct.main : "black"}/>
            </div>}
            {!this.props.timeline && <div className="card-timeline"></div>}

            <div className="card-container">
            {this.props.title && <div className="card-node-title" style={{color: this.props.ct ? this.props.ct.text : "black"}}>{this.props.title}</div>}
            {nodes.map((node, idx) => {
                return <div key={idx} className="node" style={{color: this.props.ct ? this.props.ct.text : "black"}}>
                    <div className="title" onClick={() => this.setState({detail: this.state.detail === idx ? -1 : idx})}>
                        <span>{node.name}</span>
                        {node.type === 'paper' && <span style={{marginLeft: "5px"}} dangerouslySetInnerHTML={{__html: (this.state.detail === idx ? "&#9652;" : "&#9662;")}}/>}
                    </div>
                    {this.state.detail === idx && node.type === 'paper' && <div className="detail">
                        { !!(node as IPaperNode).score && <div><b>{this.t('importance score')}: </b>{(node as IPaperNode).score.toFixed(2) || 0}</div> }
                        { !!(node as IPaperNode).year && <div><b>{this.t('year')}: </b>{(node as IPaperNode).year}</div> }
                        { !!(node as IPaperNode).citations && (<div><b>{this.t('citations')}: {(node as IPaperNode).citations}</b></div>)}
                        { !!(node as IPaperNode).venue && <div><b>{this.t('venue')}: </b>{(node as IPaperNode).venue}</div> }
                        { !!(node as IPaperNode).authors && !!(node as IPaperNode).authors.length && <div><b>{this.t('authors')}: </b>{(node as IPaperNode).authors.join(', ')}</div>}
                        { !!(node as IPaperNode).abstract && <div><b>{this.t('abstract')}: </b>{(node as IPaperNode).abstract}</div> }
                    </div>}
                </div>
            })}
            {!!this.props.extBlock && <div className="more" style={{
                color: this.props.ct ? this.props.ct.src : "black",
                textDecoration: ext ? "none" : "underline",
                opacity: 0.8}} dangerouslySetInnerHTML={{__html: ext ? "..." : "more..."}}
                onClick={() => this.setState({ext: !this.state.ext})}/>}
            </div>
        </div>
    }
}

interface IState {
    currentClustetIndex: number
}

interface IProps {
    data: IMRTData;
    onHit?: (id: string, action: string) => void;
    lang: ILang;
    authors: string[]
}

export default class MRTMobileViewer extends React.Component<IProps, IState> {

    constructor(props: IProps) {
        super(props)
        this.state = {
            currentClustetIndex: Math.max(Math.floor((this.props.data.clusters.length-1) / 2), 0)
        }
    }

    private moving = false
    private moveStartX = 0
    private moveLastX = 0
    private moveID = 0
    private clusterColors: IColorTheme[] = []

    render() {
        const clusterSize = this.props.data.clusters.length
        if (this.clusterColors.length != clusterSize) {
            this.clusterColors = generateColorThemes(clusterSize)
        }
        return <div className="mrt-mobile-viewer"
            // onTouchStart={(e) => { if (e.touches.length >= 1) {
            //     this.moving = true
            //     this.moveID = e.touches[0].identifier
            //     this.moveStartX = e.touches[0].clientX
            // }}}
            // onTouchMove={(e) => { if (this.moving) {
            //     const touch = _.find(e.touches, t => t.identifier === this.moveID)
            //     if (!touch) this.moving = false
            //     else this.moveLastX = touch.clientX
            // }}}
            // onTouchEnd={() => { if (this.moving) {
            //     this.moving = false
            //     if (this.moveLastX - this.moveStartX > 30 && this.state.currentClustetIndex > 0) {
            //         this.setState({currentClustetIndex: this.state.currentClustetIndex-1})
            //     } else if (this.moveStartX - this.moveLastX > 30 && this.state.currentClustetIndex < this.props.data.clusters.length - 1) {
            //         this.setState({currentClustetIndex: this.state.currentClustetIndex+1})
            //     }
            // }}}
            >
            <div className="header-card">
                <BlockCard block={this.props.data.root} timelineWidth={0} lang={this.props.lang}/>
            </div>
            <div className="clusters-container" style={{
                position: 'relative', left: `-${this.state.currentClustetIndex * 100}vw`,
                width: `${clusterSize * 100}vw`
            }}>
            {_.range(0, clusterSize).map(clusterID => {
                const clusterBlocksMap = _.groupBy(_.filter(this.props.data.blocks, b => b.clusterIndex == clusterID), b => b.row)
                const keys = Object.keys(clusterBlocksMap)
                keys.sort()
                const clusterBlocks = keys.map(key => _.sortBy(clusterBlocksMap[key], b => b.column))
                const colors = this.clusterColors[clusterID]
                return <div key={clusterID} className="mrt-cluster" style={{ background: colors.bg }}>
                    <div className="cluster-header">
                        <div className="btn"><CaretLeftOutlined onClick={() => { if (this.state.currentClustetIndex > 0) this.setState({currentClustetIndex: this.state.currentClustetIndex-1}) }} style={{color: this.state.currentClustetIndex > 0 ? "darkgrey" : "lightgrey"}}/></div>
                        <div className="content" style={{ color: colors.main }}>{this.props.data.clusters[clusterID].name}</div>
                        <div className="btn"><CaretRightOutlined onClick={() => { if (this.state.currentClustetIndex < this.props.data.clusters.length-1) this.setState({currentClustetIndex: this.state.currentClustetIndex+1})}} style={{color: this.state.currentClustetIndex < this.props.data.clusters.length-1 ? "darkgrey" : "lightgrey"}}/></div>
                    </div>
                    <div className="cluster-blocks">
                        {clusterBlocks.map((cbs,idx) => {
                            return <BlockCard key={cbs[0].row} block={cbs[0]} extBlock={cbs.length > 0 ? cbs[1] : undefined} ct={colors} lang={this.props.lang}
                                timeline isStart={idx === 0} isEnd={idx === clusterBlocks.length-1}
                                timelineWidth={1 + 3 * (this.props.data.clusters[clusterID].rank || 0) / this.props.data.clusters.length}
                                title={this.props.data.rows ? this.props.data.rows[cbs[0].row].name : undefined}/>
                        })}
                    </div>
                </div>
            })}
            </div>
        </div>
    }
}