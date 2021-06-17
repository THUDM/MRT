import React from 'react'
// import { ReactComponent as IconThumbsUp } from '@ant-design/icons-svg/inline-svg/outline/like.svg'
// import { ReactComponent as IconThumbsDown } from '@ant-design/icons-svg/inline-svg/outline/dislike.svg'
// import { ReactComponent as IconThumbsUpSolid } from '@ant-design/icons-svg/inline-svg/fill/like.svg'
// import { ReactComponent as IconThumbsDownSolid } from '@ant-design/icons-svg/inline-svg/fill/dislike.svg'
// import { ReactComponent as IconExchange } from '@ant-design/icons-svg/inline-svg/outline/pull-request.svg'
// import { ReactComponent as IconPushPin } from '@ant-design/icons-svg/inline-svg/outline/pushpin.svg'
// import { ReactComponent as IconStar } from '@ant-design/icons-svg/inline-svg/fill/star.svg'
import chroma from 'chroma-js'
import './node.css'
import TooltipTextTranslation from './tooltip-text-translation.json'
import _ from 'lodash'

// const ThumbUpColor = chroma("green").luminance(0.3).desaturate(1)
// const ThumbDownColor = chroma("red").luminance(0.3).desaturate(2)
// const ExchangeColor = chroma("blue").luminance(0.3).desaturate(1)
// const DisplayLinkColor = chroma("orange").luminance(0.3)
// const StarColor = chroma("purple").luminance(0.3)
// const HideLinkColor = chroma("grey").luminance(0.3)
// const AbstractColor = chroma("grey").luminance(0.1)

export class NodeCircle extends React.Component {

    render() {
        const level = this.props.node.pins.reduce((prev, pin) => Math.max(prev, pin.level || 0), 0)
        const r = this.props.radius
        const dy = r * (level / 1.75 - 0.75)
        const dx = Math.sqrt(r * r - dy * dy)
        const y = this.props.node.y - dy, x1 = this.props.node.x - dx, x2 = this.props.node.x + dx
        return (
            <g onMouseEnter={() => { this.props.onHover(true) }} onMouseLeave={() => { this.props.onHover(false) }}>
                {level > 0 && <path d={`M ${x1} ${y} A ${r} ${r} 0 ${level >= 2 ? 1 : 0} 0 ${x2} ${y}`} fill={this.props.node.color} stroke={this.props.node.color} strokeWidth={this.props.strokeWidth}/>}
                {level > 0 && <path d={`M ${x1} ${y} A ${r} ${r} 0 ${level >= 2 ? 0 : 1} 1 ${x2} ${y}`} fill="white" stroke={this.props.node.color} strokeWidth={this.props.strokeWidth}/>}
                {level === 0 && <circle className="era-node-circle" cx={this.props.node.x} cy={this.props.node.y} r={this.props.radius}
                    stroke={this.props.node.color} strokeWidth={this.props.strokeWidth}
                    fill="white"/>}
            </g>
        )
    }

}

export class NodeText extends React.Component {

    constructor(props) {
        super(props)
        this.state = { expand: -1, pinned: {}, focus: -1 }
    }

    onHover(idx, enter) {
        this.setState({expand: enter ? this.state.expand : -1, focus: enter ? idx: -1})
        this.props.onFocus(this.props.node.pins[idx].id, enter, this.state.pinned[idx])
        // if (enter || !this.state.pinned[idx]) this.props.onSwitchLinksVisibility(this.props.node.pins[idx].id, enter)
    }

    onCollapse(idx) {
        const enter = this.state.expand !== idx
        this.setState({expand: enter ? idx : -1})
    }

    render() {
        const lang = this.props.lang || "en"
        const translation = TooltipTextTranslation[lang]
        const t = (text) => (translation && translation[text.toLowerCase()]) ? translation[text.toLowerCase()] : text
        let textColor = this.props.node.textColor
        const iconSize = this.props.lineHeight * 1.25
        const texts = this.props.pins.map((pin, _idx) => {
            const isHighlighted = this.props.highlightedPaper.indexOf(pin.id) >= 0
            const isFocus = this.state.expand === _idx
            const collapseHandler = () => this.onCollapse(_idx)
            const pinLinkHandler = () => {
                const pinned = this.state.pinned
                pinned[_idx] = !pinned[_idx]
                this.setState({pinned})
            }
            // const collapseHandler = () => this.props.onCardOpen(pin)
            const textPieces = isFocus ? pin.fullTextPieces : pin.textPieces
            const abstractHeight = pin.abstractPieces.length * this.props.secondaryLineHeight
            const iconY = (textPieces.length - 1) * this.props.lineHeight + this.props.editButtonMarginTop + isFocus * abstractHeight
            const textWidth = isFocus ? this.props.fullTextWidth : this.props.textWidth
            const generateEditIcon = (T, dx, fill, action, text) => <g transform={`translate(${textWidth-iconSize*dx}, ${iconY})`}>
                <g className="paper-edit-icon" style={{transformOrigin: `${iconSize/2}px ${iconSize/2}px`}}
                    onClick={action === "pin-link" ? (() => pinLinkHandler()) : (() => this.props.onEdit(action, pin))}>
                    <T className="paper-edit-icon" fill={fill} width={iconSize} height={iconSize}/>
                    <rect className="paper-edit-icon" width={iconSize} height={iconSize} fill="transparent"/>
                    <text textAnchor="middle" x={iconSize/2} y={iconSize+this.props.secondaryLineHeight/2} fill={fill} fontSize={this.props.secondaryLineHeight/2}>{t(text)}</text>
                </g>
            </g>
            const isUp = pin.edits && pin.edits.rate > 0
            const isDown = pin.edits && pin.edits.rate < 0
            const transformOriginX = (this.props.scaleOrigin === "left") ? 0 : (this.props.scaleOrigin === "middle" ? (textWidth / 2) : textWidth)
            return (
                <g key={_idx} transform={`translate(${this.props.textLeadingMargin + this.props.radius}, ${pin.y - this.props.node.y})`}
                    style={{opacity: isHighlighted ? 1 : 0.25}}>
                    <g className="paper-view-group-inner" style={{transformOrigin: `${transformOriginX}px ${-this.props.lineHeight}px`}}
                        onMouseEnter={() => this.onHover(_idx, true)}
                        onMouseLeave={() => this.onHover(_idx, false)}>
                        <rect className="paper-text-background" x={-this.props.lineHeight} y={-this.props.lineHeight * 2.5}
                            width={textWidth+2*this.props.lineHeight} height={this.props.lineHeight * 4 + iconY + iconSize}
                            fill="white" filter="url(#blur-filter)"/>
                        <text className="paper-text" fontSize={this.props.fontSize} fill={textColor} onClick={collapseHandler}>
                            {textPieces.map((_text, idx) => <tspan key={idx} x="0" y={idx * this.props.lineHeight}>{_text}</tspan>)}
                        </text>
                        {isFocus && 
                            <text className="paper-abstract-inner" fontSize={this.props.secondaryFontSize} fill={AbstractColor}>
                                {pin.abstractPieces.map((_text, idx) => <tspan key={idx} x="0" y={textPieces.length * this.props.lineHeight + idx * this.props.secondaryLineHeight}>{_text}</tspan>)}
                            </text>}
                        {this.state.focus === _idx &&
                        <g className="paper-edit-icon-group">
                            {this.props.editable && generateEditIcon(IconExchange, 6, ExchangeColor, "to-exchange", "Move")}
                            {generateEditIcon(isUp ? IconThumbsUpSolid : IconThumbsUp, 4.5, ThumbUpColor, isUp ? "thumb-delete" : "thumb-up", "Like")}
                            {generateEditIcon(isDown ? IconThumbsDownSolid : IconThumbsDown, 3, ThumbDownColor, isDown ? "thumb-delete" : "thumb-down", "Dislike")}
                            {this.props.editable && (pin.references.length > 0 || pin.citations.length > 0) && generateEditIcon(IconPushPin, 1.5, this.state.pinned[_idx] ? HideLinkColor : DisplayLinkColor, "pin-link", "Citation")}
                            {pin.level &&
                            <g transform={`translate(0, ${iconY})`}>
                                <rect className="paper-edit-icon" width={iconSize*pin.level} height={iconSize} fill="transparent"/>
                                <g className="paper-edit-icon" style={{transformOrigin: `${iconSize/2}px ${iconSize/2}px`}}>
                                {_.range(0, pin.level).map((idx) => <g transform={`translate(${idx * iconSize}, 0)`} key={idx}><IconStar className="paper-edit-icon" fill={StarColor} width={iconSize} height={iconSize}/></g>)}
                                    <text textAnchor="middle" x={pin.level*iconSize/2} y={iconSize+this.props.secondaryLineHeight/2} fill={StarColor} fontSize={this.props.secondaryLineHeight/2}>{t("Influence")}</text>
                                </g>
                            </g>
                            }
                        </g>
                        }
                    </g>
                </g>
            )
        })
        return (
            <g className="era-node-text-group" transform={`translate(${this.props.x}, ${this.props.y})`}>
                {texts.reverse()}
            </g>
        )
    }
}

export class NodeLinks extends React.Component {

    generateLinkPath(source, target, reverse) {
        let x1 = source.x, y1 = source.y, x2 = target.x, y2 = target.y
        const mx = x1 - this.props.radius - this.props.nodePaddingLeft
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

    generateArrowPath(source, target, forward) {
        const x = target.x, y = target.y
        const nx = (x >= source.x) ? (x - this.props.radius) : (x + this.props.radius)
        const uy = y - this.props.radius / 2, by = y + this.props.radius / 2
        if (forward) {
            const nnx = (x >= source.x) ? (x - this.props.radius * 1.2) : (x + this.props.radius * 1.2)
            return `M ${x} ${y} L ${nnx} ${uy} L ${nx} ${y} L ${nnx} ${by} L ${x} ${y}`
        } else {
            const nnx = (x >= source.x) ? (x + this.props.radius * 0.2) : (x - this.props.radius * 0.2)
            return `M ${nx} ${y} L ${nnx} ${uy} L ${x} ${y} L ${nnx} ${by} L ${nx} ${y}`
        }
    }

    estimateLinkLength(source, target) {
        return 2 * (Math.abs(source.x - target.x) + Math.abs(source.y - target.y))
    }

    render() {
        const textColor = this.props.node.textColor
        const links = this.props.node.pins.map((pin, _idx) => {
            return (this.props.linksVisibility[pin.id] && 
            <g key={pin.id}>
                <circle cx={pin.x} cy={pin.y} r={0.5 * this.props.lineHeight} fill={textColor}/>
                {[...pin.references, ...pin.citations].map((id, idx) => this.props.nodesLookup[id] && 
                <g key={idx}>
                    <circle cx={this.props.nodesLookup[id].x} cy={this.props.nodesLookup[id].y} r={5} fill={this.props.nodesLookup[id].node.color}/>
                    <path className="mrt-link-path" d={this.generateLinkPath(pin, this.props.nodesLookup[id], idx >= pin.references.length)} strokeWidth={3} stroke={textColor} fill="transparent"
                        strokeDasharray={this.estimateLinkLength(pin, this.props.nodesLookup[id])} strokeDashoffset={this.estimateLinkLength(pin, this.props.nodesLookup[id])}/>
                    <path className="mrt-link-dot" d={this.generateLinkPath(pin, this.props.nodesLookup[id], idx >= pin.references.length)} strokeWidth={10} stroke={textColor} fill="transparent"
                        strokeDasharray={`10 ${this.estimateLinkLength(pin, this.props.nodesLookup[id])}`} strokeDashoffset={this.estimateLinkLength(pin, this.props.nodesLookup[id])}/>
                    <path className="mrt-link-arrow" d={this.generateArrowPath(pin, this.props.nodesLookup[id], pin.references.indexOf(id) >= 0)} fill={textColor}/>
                </g>
                )}
            </g>)
        })
        return <g>{links}</g>
    }
}