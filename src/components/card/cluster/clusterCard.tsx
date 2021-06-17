import * as React from 'react';
import ICardProps from '../cardProps';
import './clusterCard.less';
import { IClusterTagNode } from '../../../model/nodes/clusterNode';
import translation from './tooltip-text-translation.json';
import { ILang, Translator } from '../../../utils/translation'

interface IState {
    left: number;
    top: number;
    height: number;
}

interface IProps extends ICardProps {
    lang: ILang;
}

export default class ClusterCard extends React.Component<IProps, IState> {
    private _div: HTMLDivElement;
    private _oldParent: (Node & ParentNode) | null;
    private _oldStyle: CSSStyleDeclaration;
    private _bgDiv: HTMLDivElement;
    private _node: IClusterTagNode;

    private _detailsDiv: HTMLDivElement | null;

    private _width: number;
    private _padding: number = 12;
    private _bgColor: string;

    private translator: Translator = new Translator(translation)

    constructor(props: IProps) {
        super(props);
        this.state = {
            left: this.props.left - this._padding,
            top: this.props.top - this._padding,
            height: 140
        }
        this._div = this.props.nodeDiv;
        this._oldStyle = {...this.props.nodeDiv.style};
        this._oldParent = this.props.nodeDiv.parentNode;
        this._node = this.props.node as IClusterTagNode;

        this._div.style.zIndex = "1";

        this._width = 425;
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

    private getHeight(): number {
        return this._div.offsetHeight + 40 + (this._detailsDiv ? this._detailsDiv.offsetHeight : 0);
    }

    public componentDidMount(): void {
        // this._div.style.left = "4%";
        // this._div.style.top = "12px";
        // this._div.style.width = `92%`;
        // this._div.style.fontSize = "18px";
        // this._div.style.lineHeight = "20px";
        // this._div.style.userSelect = "none";
        // this._div.style.cursor = "pointer";
        this._div.style.fontWeight = "550";
        this._bgDiv.prepend(this._div);

        let height: number = this.getHeight();
        let left: number = Math.min(this.props.globalWidth - this._width, this.state.left);
        this.setState({height, left});
    }

    public componentDidUpdate(preProps: IProps): void {
        if(!preProps.die && this.props.die) {
            setTimeout(() => {
                this.handleClose();
            }, 200);
        }

        let height: number = this._div.offsetHeight + 30 + (this._detailsDiv ? this._detailsDiv.offsetHeight : 0);
        if(height != this.state.height) {
            this.setState({height});
        }
    }

    public componentWillUnmount(): void {
        this.giveBack();
    }

    private t(key: string): string {
        return this.translator.T(key, this.props.lang)
    }

    public render() {
        const {height, left, top} = this.state;
        return (
            <div className='clustercard'
                ref={d => this._bgDiv = d!}
                style={{
                    position: "absolute",
                    left: `${left}px`,
                    top: `${top}px`,
                    width: `${this._width}px`,
                    height: `${height}px`,
                    backgroundColor: this._bgColor,
                    padding: this._padding}}>
                <div ref={d => this._detailsDiv = d} className='clustercard-detail'>
                    <div>
                    { !!this._node.cinfo.tags && <div><b>{this.t('tags')+': '}</b>{this._node.cinfo.tags.join(', ')}</div>}
                    </div>
                    <div>
                    { !!this._node.cinfo.value && <div><b>{this.t('importance score')+': '}</b>{this._node.cinfo.value.toFixed(2)}</div>}
                    </div>
                </div>
            </div>
        )
    }
}