import React from 'react'
import { NodeCircle, NodeText, NodeLinks } from './node'
import randomstring from 'randomstring'
import chroma from 'chroma-js'
import './index.css'
import { ReactComponent as Logo } from '../../logo.svg'

export default class MRTViewer extends React.Component {

    constructor(props) {
        super(props)

        this.EraMinRatio = this.props.EraMinRatio || 0.05
        this.lastEraRatio = this.props.lastEraRatio || 0.2

        this.strokeWidth = 4

        this.labelTextFontSize = 64
        this.labelTextLineHeight = 72

        this.nodeRadius = 20
        this.nodeTextLeadingMargin = 20
        this.nodeTextWidth = 260

        this.nodeFullSpan = 2

        this.horizonMarginTop = 32
        this.horizonMarginBottom = 48

        this.averageFontWidthRatio = 0.6
        
        this.nodePaddingLeft = 20
        this.nodePaddingRight = 20
        this.nodePaddingTop = 32
        this.nodePaddingBottom = 12

        this.nodeEditButtonMarginTop = 10

        this.nodeOffsetX = this.nodePaddingLeft + this.nodeRadius
        this.nodeOffsetY = this.nodePaddingTop + this.nodeRadius
        
        this.nodeWidth = this.nodePaddingLeft + 2 * this.nodeRadius + this.nodeTextLeadingMargin + this.nodeTextWidth + this.nodePaddingRight
        this.pinHeight = (pin, lineHeight) => (pin.textPieces.length + 0.4) * lineHeight
        this.nodeHeight = (node) => {
            const pinsHeight = _.sum(node.pins.map(pin => this.pinHeight(pin, this.nodeTextLineHeight)))
            return this.nodePaddingTop + this.nodeRadius + Math.max(this.nodeRadius, pinsHeight) + this.nodePaddingBottom
        }

        this.state = {toExchange: null, focusEraIndex: -1, linksVisibility: {}, focusedPaperID: -1}
    }

    onSwitchLinksVisibility(id, visible) {
        const linksVisibility = this.state.linksVisibility
        linksVisibility[id] = visible
        this.setState({linksVisibility})
    }

    onPaperFocus(id, enter, pinned) {
        const linksVisibility = this.state.linksVisibility
        linksVisibility[id] = enter || pinned
        this.setState({linksVisibility, focusedPaperID: enter ? id : -1})
    }

    render() {
        const extract = (paper) => {
            const id = paper["paper_id"]
            const year = paper["paper_year"]
            const venue = paper["paper_venue"].trim()
            const title = paper["paper_title"].trim()
            const citations = paper["citations"] || []
            const references = paper["references"] || []
            const score = paper["score"] || paper["paper_citations"] || 0
            let prefix = `${year}`
            const venue_year = /^(19|20)\d{2}\b/.exec(venue)
            if (venue_year == null && venue.length > 0) {
                prefix = `${year} ${venue}`
            } else if (venue_year != null) {
                prefix = `${venue}`
            }
            const text = `[${prefix}] ${title}`.replace('\t', ' ').replace('\n', ' ')
            const abstract = paper["paper_abstract"] ? paper["paper_abstract"].trim().replace('\t', ' ') : ""
            return {id, year, venue, title, citations, references, text, abstract, score}
        }

        this.clusterNames = this.props.data.clusterNames.map(name => name.split(' ').map(_.capitalize).join(' '))

        this.hideSubBranch = this.props.hideSubBranch
        this.disableTextBranchSpan = this.props.disableTextBranchSpan
        this.disableTextClusterSpan = this.props.disableTextClusterSpan

        this.nodeFontExtraSize = this.props.fontExtraSize || 0
        this.nodeTextFontSize = 20 + this.nodeFontExtraSize
        this.nodeTextSecondaryFontSize = 16 + this.nodeFontExtraSize
        this.nodeTextLineHeight = 22 + this.nodeFontExtraSize
        this.nodeTextSecondaryLineHeight = 18 + this.nodeFontExtraSize
        this.nodeTextCustomFold = (text, span, fontSize) => {
            const textLength = Math.floor(((span - 1) * this.nodeWidth + this.nodeTextWidth) / (fontSize * this.averageFontWidthRatio))
            return (text.match(new RegExp(`([^\\n]{1,${textLength}})(\\s|$)`, 'g')) || []).filter(line => line.length > 0)
        }
        this.nodeTextFold = (text, span) => this.nodeTextCustomFold(text, span, this.nodeTextFontSize)
        this.nodeTextSecondaryFold = (text, span) => this.nodeTextCustomFold(text, span, this.nodeTextSecondaryFontSize)


        const importance = this.props.data.importance
        const maxImportance = _.max(importance), minImportance = _.min(importance)
        const clusterStrokeWidth = importance ?
            importance.map((i) => ((i - minImportance) / (maxImportance - minImportance) * 4 + 1) / 2 * this.strokeWidth) :
            this.clusterNames.map(() => this.strokeWidth)

        // initialize dataView (filter subBranch is hideSubBranch is enabled)
        let dataView = {root: extract(this.props.data.root), branches: _.range(0, 2 * this.props.data.branches.length).map(() => [])}
        this.props.data.branches.forEach((subBranches, clusterID) => subBranches.forEach((branch, isSub) => branch.forEach(raw => {
            const paper = extract(raw)
            paper.isSub = isSub
            paper.edits = this.props.userEdits[paper.id]
            paper.clusterID = paper.edits ? paper.edits.clusterID : clusterID
            paper.branchID = paper.clusterID * 2 + isSub
            if (!this.hideSubBranch || !isSub) dataView.branches[paper.branchID].push(paper)
        })))
        dataView.branches.forEach(branch => branch.sort((a, b) => (a.year === b.year) ? (b.citations.length - a.citations.length) : (b.year - a.year)))

        const paperCount = _.flatten(dataView.branches).length
        _.flatten(dataView.branches).sort((a, b) => (b.score - a.score)).forEach((paper, idx) => {
            paper.scoreRank = idx
            if (idx < paperCount * 0.1) paper.level = 3
            else if (idx < paperCount * 0.3) paper.level = 2
            else if (idx < paperCount * 0.6) paper.level = 1
            else paper.level = 0
        })

        // calculate eras according to density of paper
        let eras = []
        {
            let years = _.flatten(dataView.branches).map(paper => paper.year).sort().reverse()
            let _to = years[0]
            let _cnt = 1
            let eraMinSize = this.EraMinRatio * years.length
            let lastEraMinSize = this.lastEraRatio * years.length
            for (let i = 1; i < years.length; i++) {
                if (years[i] === years[i-1] || _cnt < eraMinSize || i > years.length - lastEraMinSize) _cnt += 1
                else {
                    eras.push({from: years[i-1], to: _to, cnt: _cnt})
                    _to = years[i]
                    _cnt = 1
                }
            }
            eras.push({from: years[years.length-1], to: _to, cnt: _cnt})
        }
        const branchWithEra = (branch, era) => branch.filter(paper => paper.year >= era.from && paper.year <= era.to)

        // initialize views
        let numClusters = this.props.data.branches.length
        let numBranches = numClusters * 2
        const rootColor = chroma.scale()(0.5)
        const clusterColors = chroma.cubehelix().start(200).rotations(3).gamma(0.7).lightness([0.2, 0.6]).scale().correctLightness().colors(numClusters)
        const branchColors = dataView.branches.map((_, branchID) => chroma(clusterColors[Math.floor(branchID / 2)]).luminance(branchID % 2 === 0 ? 0.25 : 0.5))
        const branchTextColors = branchColors.map(color => chroma(color).darken())
        let views = {defs: [], nodes: {}, edges: []}
        const addEdge = (x1, y1, x2, y2, color, strokeWidth, opacity) => views.edges.push(<line style={{opacity}} key={views.edges.length} x1={x1} y1={y1} x2={x2} y2={y2} strokeWidth={strokeWidth} stroke={color}/>)
        const addVerticalEdge = (x, y1, y2, color, strokeWidth, opacity) => addEdge(x, y1, x, y2, color, strokeWidth, opacity)
        const addHorizontalEdge = (x1, x2, y, color, strokeWidth, opacity) => addEdge(x1, y, x2, y, color, strokeWidth, opacity)
        const generateGradientColor = (from, to, x1, y1, x2, y2) => {
            const colorID = randomstring.generate(8)
            views.defs.push(
                <defs key={colorID}>
                    <linearGradient id={colorID} x1={x1} y1={y1} x2={x2} y2={y2} gradientUnits="userSpaceOnUse">
                    <stop offset="20%"  stopColor={from} />
                    <stop offset="80%" stopColor={to} />
                    </linearGradient>
                </defs>
            )
            return `url('#${colorID}')`
        }

        // Arrange coornidates for each era node
        views.nodes.root = {
            x: this.nodeWidth * (dataView.branches.length - 1) / 2 + this.nodeOffsetX,
            y: this.nodeOffsetY,
            color: rootColor,
            textColor: chroma(rootColor).darken(),
            pins: [{...dataView.root, 
                textPieces: this.nodeTextCustomFold(dataView.root.text, 3, this.nodeTextFontSize * 1.5), 
                fullTextPieces: this.nodeTextCustomFold(dataView.root.text, 3, this.nodeTextFontSize * 1.5),
                abstractPieces: this.nodeTextCustomFold(dataView.root.abstract, 3, this.nodeTextSecondaryFontSize * 1.5),
                edits: this.props.userEdits[dataView.root.id],
                node: views.nodes.root,
            }],
            span: 3,
            fullSpan: 3,
            fontSize: this.nodeTextFontSize * 1.5,
            secondaryFontSize: this.nodeTextSecondaryFontSize * 1.5,
            lineHeight: this.nodeTextLineHeight * 1.5,
            secondaryLineHeight: this.nodeTextSecondaryLineHeight * 1.5,
        }
        views.nodes.root.height = this.nodeHeight(views.nodes.root)
        views.nodes.root.pins[0].x = views.nodes.root.x
        views.nodes.root.pins[0].y = views.nodes.root.y

        views.nodes.branches = dataView.branches.map((branch, branchID) => eras.map((era, eraID) => { return {
            x: this.nodeWidth * branchID + this.nodeOffsetX,
            y: 0,
            color: branchColors[branchID],
            textColor: branchTextColors[branchID],
            pins: branchWithEra(branch, era),
            era,
            eraID,
            clusterID: Math.floor(branchID / 2),
            branchID,
            fontSize: this.nodeTextFontSize,
            secondaryFontSize: this.nodeTextSecondaryFontSize,
            lineHeight: this.nodeTextLineHeight,
            secondaryLineHeight: this.nodeTextSecondaryLineHeight,
            height: 0,
            edgeStrokeWidth: clusterStrokeWidth[Math.floor(branchID / 2)]
        }}))
        
        views.nodes.branches.forEach((branch, branchID) => branch.forEach((node, eraID) => {
            if (node.pins.length === 0) return
            node.span = (branchID < numBranches - 1 && views.nodes.branches[branchID+1][eraID].pins.length === 0
                && !this.disableTextBranchSpan && (!this.disableTextClusterSpan || branchID % 2 === 0)) ? 2 : 1
            node.fullSpan = (branchID < numBranches - 1) ? this.nodeFullSpan : 1
            node.pins.forEach(pin => {
                pin.textPieces = this.nodeTextFold(pin.text, node.span)
                pin.fullTextPieces = this.nodeTextFold(pin.text, node.fullSpan)
                pin.abstractPieces = this.nodeTextSecondaryFold(pin.abstract, node.fullSpan)
                pin.node = node
            })
            node.height = this.nodeHeight(node)
        }))

        const horizon = views.nodes.root.height + this.horizonMarginTop
        let _height = horizon + this.horizonMarginBottom
        const erasHeight = eras.map((_, eraID) => {
            views.nodes.branches.forEach(branch => branch[eraID].y = _height + this.nodeOffsetY)
            const eraHeight = views.nodes.branches.reduce((prev, branch) => Math.max(prev, branch[eraID].height || 0), 0)
            _height += eraHeight
            return eraHeight
        })

        const nodesLookup = {}
        views.nodes.branches.forEach(branch => branch.forEach(node => node.pins.forEach((pin, idx) => {
            pin.x = node.x
            pin.y = node.y + node.pins.slice(0, idx).reduce((prev, pin) => prev + (pin.textPieces.length + 0.4) * this.nodeTextLineHeight, 0)
            nodesLookup[pin.id] = pin
        })))

        {
            const node = views.nodes.root, nodeLeft = views.nodes.branches[0][0], nodeRight = views.nodes.branches[numBranches - 2][0]
            addVerticalEdge(node.x, node.y, horizon, rootColor, this.strokeWidth, 1)
            addHorizontalEdge(nodeLeft.x, nodeRight.x, horizon, rootColor, this.strokeWidth, 1)
        }
        views.nodes.branches.forEach((branch, branchID) => {
            const _branch = branch.filter(node => node.pins.length > 0)
            if (_branch.length === 0 && branchID % 2 === 1) return
            const startEra = (branchID % 2 === 0) ? 0 : _branch[0].eraID
            let endEra = (_branch.length > 0) ? _branch[_branch.length-1].eraID : 0
            if (branchID % 2 === 0) {
                const _nextBranch = views.nodes.branches[branchID+1].filter(node => node.pins.length > 0)
                if (_nextBranch.length > 0) endEra = Math.max(endEra, _nextBranch[0].eraID)
            }
            const shrinkFlag = !this.disableTextBranchSpan && (!(this.disableTextClusterSpan && branchID % 2 === 0))
            const opacity = (nodesLookup[this.state.focusedPaperID] && nodesLookup[this.state.focusedPaperID].clusterID !== Math.floor(branchID / 2)) ? 0.25 : 1
            for (let eraID = startEra + 1; eraID <= endEra; eraID++) {
                let node = branch[eraID]
                let sib = branchID > 0 ? views.nodes.branches[branchID-1][eraID] : null
                const yStart = (shrinkFlag && node.pins.length === 0 && ((branchID > 0 && sib.pins.length > 0) || (eraID === endEra))) ? (node.y - this.nodeRadius - this.nodeTextLineHeight) : node.y
                node = branch[eraID-1]
                sib = branchID > 0 ? views.nodes.branches[branchID-1][eraID-1] : null
                const yEnd = (shrinkFlag && node.pins.length === 0 && branchID > 0 && sib.pins.length > 0) ? (node.y - this.nodeOffsetY + sib.height - this.nodePaddingBottom + this.nodeTextLineHeight) : node.y
                addVerticalEdge(node.x, yStart, yEnd, node.color, node.edgeStrokeWidth, opacity)
            }
            if (branchID % 2 === 0) {
                const node = branch[0]
                const sib = branchID > 0 ? views.nodes.branches[branchID-1][0] : null
                const yEnd = (shrinkFlag && node.pins.length === 0 && branchID > 0 && sib.pins.length > 0) ? (node.y - this.nodeRadius - this.nodeTextLineHeight) : node.y
                addVerticalEdge(node.x, horizon, yEnd, generateGradientColor(rootColor, node.color, node.x, horizon, node.x, yEnd), node.edgeStrokeWidth, opacity)
            } else {
                const node = branch[startEra]
                const sib = views.nodes.branches[branchID-1][startEra]
                const yEnd = node.y - this.nodeRadius - this.nodeTextLineHeight
                const yStart = node.y
                addVerticalEdge(node.x, yStart, yEnd, node.color, node.edgeStrokeWidth, opacity)
                addHorizontalEdge(node.x, sib.x, yEnd, generateGradientColor(node.color, sib.color, node.x, yEnd, sib.x, yEnd), node.edgeStrokeWidth, opacity)
            }
        })
        
        const onEdit = (action, source, param) => {
            const userEdits = this.props.userEdits
            if (!userEdits[source.id] && (action === "thumb-up" || action === "thumb-down" || action === "exchange")) {
                userEdits[source.id] = {rate: 0, clusterID: source.clusterID}
            }
            if (action === "thumb-up" && userEdits[source.id].rate <= 0) {
                userEdits[source.id].rate = 1
                this.props.onEditChange(userEdits)
            } else if (action === "thumb-down" && userEdits[source.id].rate >= 0) {
                userEdits[source.id].rate = -1
                this.props.onEditChange(userEdits)
            } else if (action === "thumb-delete" && userEdits[source.id] && userEdits[source.id].rate !== 0) {
                userEdits[source.id].rate = 0
                this.props.onEditChange(userEdits)
            } else if (action === "to-exchange" && this.state.toExchange === null) {
                this.setState({toExchange: source})
                this.props.onEditChange(userEdits)
            } else if (action === "exchange") {
                userEdits[source.id].clusterID = param
                this.setState({toExchange: null})
                this.props.onEditChange(userEdits)
            }
        }

        
        const extendedBottomY = views.nodes.branches.map(branch => branch[branch.length-1]).reduce((prev, node) =>
            Math.max(prev, _.max(node.pins.map(pin => 
                pin.y + 2 * (pin.fullTextPieces.length * node.lineHeight + pin.abstractPieces.length * node.secondaryLineHeight)
            )) || 0), _height)

        const renderNodes = _.flattenDeep(views.nodes.branches).sort((a, b) => (a.eraID === b.eraID) ? (b.branchID - a.branchID) : (b.eraID - a.eraID))
        renderNodes.push(views.nodes.root)

        const _width = this.nodeWidth * dataView.branches.length
        const clusterLabelTextPieces = this.clusterNames.map(name => name.split(' '))
        const clusterLabelTexts = clusterLabelTextPieces.map((pieces, _idx) => 
            <text key={_idx}>
                {pieces.reverse().map((_text, idx) => <tspan key={idx} x="0" y={-idx * this.labelTextLineHeight}>{_text}</tspan>)}
            </text>
        )
        const clusterLabelsHeight = clusterLabelTextPieces.reduce((prev, pieces) => Math.max(prev, pieces.length), 0) * this.labelTextLineHeight
        _height += clusterLabelsHeight + this.labelTextLineHeight

        const extendedHeight = Math.max(this.labelTextLineHeight * 1.5, extendedBottomY - _height)
        const backgroundSolidColors = clusterColors.map(color => chroma(color).luminance(0.9))
        const backgroundTextSolidColors = clusterColors.map(color => chroma(color).luminance(0.7))
        const backgroundGradientSolidColors = clusterColors.map((color, idx) => {
            const x = views.nodes.branches[idx*2][eras.length-1].x
            return generateGradientColor(chroma(color).luminance(0.9), "white", x, _height, x, _height+extendedHeight)
        })
        const backgroundSelectionColors = clusterColors.map(color => chroma(color).luminance(0.5))
        const backgroundTextSelectionColors = clusterColors.map(color => chroma(color).luminance(0.2))
        const backgroundGradientSelectionColors = clusterColors.map((color, idx) => {
            const x = views.nodes.branches[idx*2][eras.length-1].x
            return generateGradientColor(chroma(color).luminance(0.5), "white", x, _height, x, _height+extendedHeight)
        })

        let highlightedPaper = nodesLookup[this.state.focusedPaperID] ? [nodesLookup[this.state.focusedPaperID].id, ...nodesLookup[this.state.focusedPaperID].citations, ...nodesLookup[this.state.focusedPaperID].references] : _.keys(nodesLookup)
        highlightedPaper.push(views.nodes.root.pins[0].id)

        return <svg className="mrt" id={this.props.id} width="100%" viewBox={`0 0 ${_width} ${_height+extendedHeight}`}>
            {views.defs}
            <filter id="blur-filter">
                <feGaussianBlur stdDeviation={this.nodeTextLineHeight} in="SourceGraphic"/>
            </filter>
            {
                <g className="mrt-background">
                    <rect x="0" y="0" width={_width} height={horizon} fill={chroma(rootColor).luminance(0.9)}></rect>
                </g>
            }
            {
                clusterLabelTexts.map((texts, idx) => {
                    return <g className="mrt-background" key={idx} opacity={this.state.toExchange === null ? 1 : 0}>
                        <rect x={this.nodeWidth*idx*2} y={horizon} width={this.nodeWidth*2} height={_height-horizon} fill={backgroundSolidColors[idx]}/>
                        <rect x={this.nodeWidth*idx*2} y={_height} width={this.nodeWidth*2} height={extendedHeight} fill={backgroundGradientSolidColors[idx]}/>
                        <g transform={`translate(${this.nodeWidth*idx*2+this.nodeOffsetX}, ${_height-this.labelTextLineHeight/2})`} fill={backgroundTextSolidColors[idx]} fontSize={this.labelTextFontSize}>{texts}</g>
                    </g>
                })
            }
            {
                eras.map((era, idx) => 
                <g key={idx} className="mrt-era-background" transform={`translate(0, ${views.nodes.branches[0][idx].y - this.nodeRadius - this.nodePaddingTop + erasHeight[idx]})`}>
                    <rect className="mrt-era-background" x="0" y={-erasHeight[idx]} width={_width} height={erasHeight[idx]} opacity={(idx === this.state.focusEraIndex) ? 0.1 : 0}/>
                    <text className="mrt-era-background" fontSize={this.labelTextFontSize} x={this.nodePaddingLeft} y={-this.labelTextFontSize/2} opacity={(idx === this.state.focusEraIndex) ? 0.2 : 0}>
                        {era.from === era.to ? era.from : `${era.from} - ${era.to}`}
                    </text>
                </g>)
            }
            {
                views.nodes.branches.map((branch, idx) => {
                    if (idx % 2 !== 0) return <text key={idx}/>
                    const _branch = branch.filter(node => node.pins.length > 0)
                    const _sibBranch = views.nodes.branches[idx+1].filter(node => node.pins.length > 0)
                    if (_branch.length === 0 && _sibBranch.length === 0) return <text key={idx}/>
                    const fontSize = this.nodeTextFontSize * 2
                    const y = ((_branch.length === 0 || (_sibBranch.length > 0 && _sibBranch[0].eraID <= _branch[0].eraID)) ?
                        (_sibBranch[0].y - this.nodeRadius - this.nodeTextLineHeight / 2) :
                        (_branch[0].y - this.nodeTextLineHeight)) - fontSize / 2
                    const x = branch[0].x + this.nodeRadius + this.nodeTextLeadingMargin
                    const color = chroma(branchColors[idx]).darken(2)
                    const clusterID = Math.floor(idx / 2)
                    const opacity = (nodesLookup[this.state.focusedPaperID] && nodesLookup[this.state.focusedPaperID].clusterID !== clusterID) ? 0.25 : 1
                    return <text key={idx} x={x} y={y} fill={color} fontSize={fontSize} style={{opacity}}>{this.clusterNames[clusterID]}</text>
                })
            }
            {views.edges}
            {renderNodes.map((node, idx) => node.pins.length > 0 &&
                <NodeCircle key={idx} node={node}
                            radius={this.nodeRadius}
                            lineHeight={this.nodeTextLineHeight}
                            color={node.color}
                            strokeWidth={this.strokeWidth}
                            onHover={(hover) => 
                                this.setState({...this.state,
                                    focusEraIndex: hover ? node.eraID : -1
                                })
                            }/>
            )}
            <g className="mrt-links">
            {renderNodes.map((node, idx) => node.pins.length > 0 && node !== views.nodes.root &&
                <NodeLinks key={idx}
                    linksVisibility={this.state.linksVisibility}
                    node={node}
                    nodesLookup={nodesLookup}
                    nodePaddingLeft={this.nodePaddingLeft}
                    radius={this.nodeRadius}
                    lineHeight={this.nodeTextLineHeight}
                />)
            }
            </g>
            <g className="mrt-node-text-container">
            {renderNodes.map((node, idx) => node.pins.length > 0 &&
                <NodeText key={idx}
                      node={node}
                      pins={node.pins} 
                      x={node.x} y={node.y}
                      radius={this.nodeRadius}
                      lineHeight={node.lineHeight}
                      secondaryLineHeight={node.secondaryLineHeight}
                      textWidth={(node.span - 1) * this.nodeWidth + this.nodeTextWidth}
                      fullTextWidth={(node.fullSpan - 1) * this.nodeWidth + this.nodeTextWidth}
                      color={node.color}
                      fontSize={node.fontSize}
                      secondaryFontSize={node.secondaryFontSize}
                      strokeWidth={this.strokeWidth}
                      onEdit={onEdit}
                      textLeadingMargin={this.nodeTextLeadingMargin}
                      editable={typeof(node.clusterID) !== "undefined"}
                      editButtonMarginTop={this.nodeEditButtonMarginTop}
                      scaleOrigin={(node.clusterID === numClusters - 1) ? "right" : ((node.branchID === numBranches - 3) ? "middle" : "left")}
                      linksVisibility={this.state.linksVisibility}
                      onFocus={(id, enter, pinned) => this.onPaperFocus(id, enter, pinned)}
                    //   onSwitchLinksVisibility={(id, visible) => this.onSwitchLinksVisibility(id, visible)}
                      lang={this.props.lang}
                      onCardOpen={this.props.onCardOpen}
                      highlightedPaper={highlightedPaper}/>)}
            </g>
            {
                clusterLabelTexts.map((texts, idx) => {
                    const isCurrent = this.state.toExchange !== null && idx === this.state.toExchange.clusterID
                    return <g className="mrt-background" key={idx} opacity={this.state.toExchange === null ? 0 : 1} visibility={this.state.toExchange === null ? "hidden" : "none"} onClick={() => onEdit("exchange", this.state.toExchange, idx)}>
                        <rect className="mrt-background-card" x={this.nodeWidth*idx*2} y={horizon} width={this.nodeWidth*2} height={_height-horizon} fill={backgroundSelectionColors[idx]}/>
                        <rect className="mrt-background-card" x={this.nodeWidth*idx*2} y={_height} width={this.nodeWidth*2} height={extendedHeight} fill={backgroundGradientSelectionColors[idx]}/>
                        <g className="mrt-background-text" style={{textDecoration: isCurrent ? "underline" : ""}} transform={`translate(${this.nodeWidth*idx*2+this.nodeOffsetX}, ${_height-this.labelTextLineHeight/2})`} fill={backgroundTextSelectionColors[idx]} fontSize={this.labelTextFontSize}>{texts}</g>
                    </g>
                })
            }
            {
                <g opacity="0.5" transform={`translate(${_width}, ${_height+extendedHeight-this.labelTextLineHeight * 0.5})`}>                    
                    <Logo x={-this.labelTextFontSize * 3.35} y={-this.labelTextFontSize * 1.78} height={this.labelTextFontSize * 0.8} width={this.labelTextFontSize * 0.8}/>
                    <text x={-this.labelTextFontSize * 0.1} y={-this.labelTextFontSize * 0.05} textAnchor="end"
                        fontSize={this.labelTextFontSize * 0.75} fill={chroma("grey").luminance(0.3).hex()}>{(this.props.authors || []).join(', ')}
                    </text>
                    <text x={-this.labelTextFontSize * 0.1} y={-this.labelTextFontSize * 1} textAnchor="end"
                        fontSize={this.labelTextFontSize * 0.7} fill={chroma("grey").luminance(0.3).hex()}>AMiner
                    </text>
                </g>
            }
        </svg>
    }
}