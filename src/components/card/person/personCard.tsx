import * as React from 'react';
import ICardProps from '../cardProps';
import './personCard.less';
import { IPersonNode } from '../../..';
import DefaultSVG from './images/head_default.png';

interface IState {
    left: number;
    top: number;
    height: number;
    unfold: boolean;
}

interface IProps extends ICardProps {

}

export default class PersonCard extends React.Component<IProps, IState> {
    private _div: HTMLDivElement;
    private _oldParent: (Node & ParentNode) | null;
    private _oldStyle: CSSStyleDeclaration;
    private _bgDiv: HTMLDivElement;
    private _node: IPersonNode;

    private _detailsDiv: HTMLDivElement | null;

    private _width: number;
    private _bgColor: string;

    private _unfoldTimer: NodeJS.Timeout | null;

    constructor(props: IProps) {
        super(props);
        this.state = {
            left: this.props.left,
            top: this.props.top,
            height: 140,
            unfold: false
        }

        this._div = this.props.nodeDiv;
        this._oldStyle = {...this.props.nodeDiv.style};
        this._oldParent = this.props.nodeDiv.parentNode;
        this._node = this.props.node as IPersonNode;

        this._div.style.zIndex = "1";

        this._width = 380;
        this._bgColor = "#fff";

        this.handleClose = this.handleClose.bind(this);
    }

    private handleClose(): void {
        this.props.onClose(this.props.node);
    }

    private giveBack(): void {
        for(let key in this._oldStyle) {
            if(Number(key).toString() != key) {
                this._div.style[key] = this._oldStyle[key];
            }
        }
        this._div.onclick = null;
        if(this._oldParent) {
            this._oldParent.appendChild(this._div);
        }
    }

    public componentDidMount(): void {
        this._div.style.left = "3%";
        this._div.style.top = "12px";
        this._div.style.width = `94%`;
        this._div.style.transform = "scale(1)";
        this._div.style.animationName = "titleStart";
        this._div.style.animationDuration = "0.2s";
        this._div.style.fontSize = "18px";
        this._div.style.lineHeight = "20px";
        this._div.style.userSelect = "none";
        this._div.style.cursor = "pointer";
        this._div.onclick = () => {
            this.setState({unfold: !this.state.unfold});
        }
        this._bgDiv.appendChild(this._div);

        let height: number = this._div.offsetHeight + 40;
        let left: number = Math.min(this.props.globalWidth - this._width, this.state.left);
        this.setState({height, left});

        this._unfoldTimer = setTimeout(() => {
            this._unfoldTimer = null;
            if(!this.state.unfold) {
                this.setState({unfold: true});
            }
        }, 300);
    }

    public componentDidUpdate(preProps: IProps, preState: IState): void {
        if(!preProps.die && this.props.die) {
            setTimeout(() => {
                this.handleClose();
            }, 200);
        }
        if(preState.unfold != this.state.unfold) {
            let height: number = this._div.offsetHeight + 40 + (this._detailsDiv ? this._detailsDiv.offsetHeight : 0);
            this.setState({height});
        }
    }

    public componentWillUnmount(): void {
        clearTimeout(this._unfoldTimer!);
        this.giveBack();
    }

    public render() {
        const {height, unfold, left, top} = this.state;
        const abstractOffsetY: number = this._div.offsetHeight + this._div.offsetTop + 10;
        return (
            <div className='personcard' 
                ref={d => this._bgDiv = d!} 
                style={{
                    position: "absolute", 
                    left: `${left}px`,
                    top: `${top}px`, 
                    width: `${this._width}px`, 
                    height: `${height}px`,  
                    backgroundColor: this._bgColor}} >
                {
                    unfold ? (
                        <div ref={d => this._detailsDiv = d} className='personcard_details' style={{top: abstractOffsetY}}>
                            <img className='personcard_avatar' src={this._node.avatar || DefaultSVG} />
                            <div className='personcard_profile'>
                                <div><b>h-index: </b>{this._node.hindex}</div>
                                <div><b>g-index: </b>{this._node.gindex}</div>
                                { this._node.position && <div><b>Position: </b>{this._node.position}</div> }
                                { this._node.affiliation && <div><b>Affiliation: </b>{this._node.affiliation}</div> }
                                <div><b>Citations: </b>{this._node.citations}</div>
                            </div>
                        </div>
                    ) : null
                }
            </div>
        )
    }
}