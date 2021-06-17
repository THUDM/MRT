import * as React from 'react';
import { IBlockInfo } from '../../model/mrtRender';
import { IMRTNode } from '../../model/mrtTree';
import './block-node.less';

interface IState {
}

interface IProps {
    fontSize: number
    lineHeight: number
    scale: number
    block: IBlockInfo
    node: IMRTNode
    highlighted?: boolean
    recommended?: boolean
    focused: boolean
    mouseOver: (e: React.MouseEvent, node: IMRTNode) => void
}

export default class BlockNode extends React.Component<IProps, IState> {

    public render() {
        return (
            <div className={`_mrtviewer_blocknode ${!!this.props.highlighted ? 'highlighted' : ''} ${!!this.props.recommended ? 'recommended' : ''}`}
                style={{
                    top: `${this.props.node.offsetY}px`,
                    fontSize: `${this.props.fontSize}px`,
                    lineHeight: `${this.props.lineHeight}px`,
                    transform: `scale(${this.props.scale})`,
                    transformOrigin: "0 0 0",
                    color: this.props.block.color,
                    fontWeight: this.props.block.fontWeight}}
                    onMouseOver={(e) => this.props.mouseOver(e, this.props.node)} >
                {this.props.node.name}
            </div>
        )
    }
}