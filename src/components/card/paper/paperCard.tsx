import * as React from 'react';
import ICardProps from '../cardProps';
import './paperCard.less';
import { IPaperNode } from '../../..';
import { ReactComponent as Star } from './images/star.svg';
import { ReactComponent as Move } from './images/move.svg';
import { ReactComponent as Like } from './images/like.svg';
import { ReactComponent as LikeFull } from './images/like_full.svg';
import { ReactComponent as DislikeFull } from './images/dislike_full.svg';
import { ReactComponent as Dislike } from './images/dislike.svg';
import { ReactComponent as Pin } from './images/pushpin.svg';
import { ReactComponent as Copy } from './images/copy.svg';
import { ReactComponent as Check } from './images/check.svg';
import _ from 'lodash';
import chroma from 'chroma-js';
import translation from './tooltip-text-translation.json';
import { ILang, Translator } from '../../../utils/translation'

interface IState {
    left: number;
    top: number;
    height: number;
    unfold: boolean;
    abstractAll: boolean;
    node: IPaperNode;
    pin: boolean;
    copyed: boolean;
}

interface IProps extends ICardProps {
    pin: boolean;
    root: boolean;
    onHit?: (id: string, action: string) => void;
    onChanging?: (id: string) => void;
    onEdit?: (action: string, id: string) => void;
    onPin?: (id: string) => void;
    lang: ILang;
}

export default class PaperCard extends React.Component<IProps, IState> {
    private _div: HTMLDivElement;
    private _oldParent: (Node & ParentNode) | null;
    private _oldStyle: CSSStyleDeclaration;
    private _bgDiv: HTMLDivElement;
    private _copyBtnDiv: HTMLDivElement;

    private _detailsDiv: HTMLDivElement | null;

    private _width: number;
    private _bgColor: string;
    private _abstractLimit: number;
    private _iconWidth: number;

    private _starColor: string;
    private _moveColor: string;
    private _likeColor: string;
    private _dislikeColor: string;
    private _pinColor: string;
    private _pinedColor: string;

    private _unfoldTimer: NodeJS.Timeout | null;
    private _stayTimer: NodeJS.Timeout | null;

    private translator: Translator = new Translator(translation)

    constructor(props: IProps) {
        super(props);
        this.state = {
            left: this.props.left,
            top: this.props.top,
            height: 140,
            unfold: false,
            abstractAll: false,
            node: this.props.node as IPaperNode,
            pin: this.props.pin,
            copyed: false
        }

        this._div = this.props.nodeDiv;
        this._oldStyle = {...this.props.nodeDiv.style};
        this._oldParent = this.props.nodeDiv.parentNode;

        this._div.style.zIndex = "1";

        this._width = 425;
        this._bgColor = "#fff";
        this._abstractLimit = 200;
        this._iconWidth = 24;

        this._starColor = chroma('purple').luminance(0.3).hex();
        this._moveColor = chroma("blue").luminance(0.3).desaturate(1).hex();
        this._likeColor = chroma("green").luminance(0.3).desaturate(1).hex();
        this._dislikeColor = chroma("red").luminance(0.3).desaturate(2).hex();
        this._pinColor = chroma("orange").luminance(0.3).hex();
        this._pinedColor = chroma("grey").luminance(0.3).hex();

        this.handleClose = this.handleClose.bind(this);
        this.getAbstract = this.getAbstract.bind(this);
        this.handleMore = this.handleMore.bind(this);
        this.handleDislike = this.handleDislike.bind(this);
        this.handleLike = this.handleLike.bind(this);
        this.handlePin = this.handlePin.bind(this);
        this.handleChange = this.handleChange.bind(this);
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
        this._div.removeChild(this._copyBtnDiv);
        this._bgDiv.appendChild(this._copyBtnDiv);
    }

    private getAbstract(): JSX.Element {
        const {node} = this.state;
        if(node.abstract.length < this._abstractLimit + 6 || this.state.abstractAll) {
            return <span>{node.abstract}</span>;
        }else {
            let index: number = node.abstract.indexOf(" ", this._abstractLimit);
            let short: string = node.abstract.substr(0, index);
            return <span>{short}<a href='#' onClick={this.handleMore}>...more</a></span>;
        }
    }

    private handleMore(e: React.MouseEvent) {
        this.setState({abstractAll: true});
        e.preventDefault();
    }

    private getHeight(): number {
        return this._div.offsetHeight + 40 + (this._detailsDiv ? this._detailsDiv.offsetHeight : 0);
    }

    private handleDislike(): void {
        if(this.state.node.dislike) {
            this.props.onEdit && this.props.onEdit("thumb-delete", this.state.node.id);
        }else {
            this.props.onEdit && this.props.onEdit("thumb-down", this.state.node.id);
        }
    }

    private handleLike(): void {
        if(this.state.node.like) {
            this.props.onEdit && this.props.onEdit("thumb-delete", this.state.node.id);
        }else {
            this.props.onEdit && this.props.onEdit("thumb-up", this.state.node.id);
        }
    }

    private handlePin(): void {
        let pin: boolean = !this.state.pin;
        if(pin) this.props.onHit && this.props.onHit(this.state.node.id, "link-pin");
        this.setState({pin});
        this.props.onPin && this.props.onPin(this.state.node.id);
    }

    private handleChange(): void {
        this.props.onChanging && this.props.onChanging(this.state.node.id);
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
        // this._div.style.userSelect = "none";
        // this._div.style.cursor = "pointer";
        // this._div.onclick = () => {
        //     this.props.onHit && this.props.onHit(this.state.node.id, "collapse");
        //     this.setState({unfold: !this.state.unfold, abstractAll: false});
        // }
        this._bgDiv.appendChild(this._div);
        this._bgDiv.removeChild(this._copyBtnDiv);
        this._div.appendChild(this._copyBtnDiv);

        let height: number = this.getHeight();
        let left: number = Math.min(this.props.globalWidth - this._width, this.state.left);
        this.setState({height, left});

        this._unfoldTimer = setTimeout(() => {
            this._unfoldTimer = null;
            if(!this.state.unfold) {
                this.setState({unfold: true});
            }
        }, 300);
        this._stayTimer = setTimeout(() => {
            this.props.onHit && this.props.onHit(this.state.node.id, "hover");
        }, 3000);
    }

    public componentDidUpdate(preProps: IProps): void {
        if(preProps.node != this.props.node) {
            this.setState({node: this.props.node as IPaperNode});
        }
        if(!preProps.die && this.props.die) {
            setTimeout(() => {
                this.handleClose();
            }, 200);
        }
        let height: number = this.getHeight();
        if(height != this.state.height) {
            this.setState({height});
        }
    }

    private copyToClipboard() {
        navigator.clipboard.writeText(this.props.node.name).then(() => {
            this.setState({copyed: true})
        })
    }

    public componentWillUnmount(): void {
        clearTimeout(this._unfoldTimer!);
        clearTimeout(this._stayTimer!);
        this.giveBack();
    }

    private t(key: string): string {
        return this.translator.T(key, this.props.lang)
    }

    public render() {
        const {height, unfold, left, top, node, pin} = this.state;
        const { root } = this.props;
        const abstractOffsetY: number = this._div.offsetHeight + this._div.offsetTop + 10;
        const CopyIcon = this.state.copyed ? Check : Copy;
        return (
            <div className='papercard'
                ref={d => this._bgDiv = d!}
                style={{
                    position: "absolute",
                    left: `${left}px`,
                    top: `${top}px`,
                    width: `${this._width}px`,
                    height: `${height}px`,
                    backgroundColor: this._bgColor,
                    opacity: this.props.die ? 0 : 1}} >
                <div ref={d => this._copyBtnDiv = d!} className='copy-btn' onClick={() => this.copyToClipboard()}>
                    <CopyIcon width="18px" height="18px" style={{fill: this.state.copyed ? "green" : "blue"}}/>
                    <span className="tooltiptext" style={{color: this.state.copyed ? "green" : "blue"}}>{this.state.copyed ? this.t("copyed") : this.t("copy")}</span>
                </div>
                <div ref={d => this._detailsDiv = d}  style={{position: 'absolute', top: abstractOffsetY, left: 0, width: '100%'}}>
                    {
                        unfold && (
                            <div className='papercard_detail'>
                                { !!node.score && <div><b>{this.t('importance score')}: </b>{node.score.toFixed(2) || 0}</div> }
                                { node.year && <div><b>{this.t('year')}: </b>{node.year}</div> }
                                { !!node.citations && <div><b>{this.t('citations')}: </b>{node.citations || 0}</div> }
                                { !!node.venue && <div><b>{this.t('venue')}: </b>{node.venue}</div> }
                                { !!node.authors && !!node.authors.length && <div><b>{this.t('authors')}: </b>{node.authors.join(', ')}</div>}
                                { !!node.abstract && <div style={{maxHeight: '160px', overflowY: "scroll"}}><b>{this.t('abstract')}: </b>{this.getAbstract()}</div> }
                            </div>
                        )
                    }
                    {
                        node.editable && (
                            <div className='papercard_edit'>
                                { !!node.level && (
                                    <div className='papercard_edit_stars papercard_edit_btn' style={{width: `${node.level * this._iconWidth}px`}}>
                                        <div className='papercard_stars' style={{pointerEvents: 'none'}}>
                                            { _.range(0, node.level).map((index) => (
                                                <Star height={this._iconWidth} width={this._iconWidth} key={index} style={{fill: this._starColor, fontSize: `${this._iconWidth}px`, pointerEvents: 'none'}} />
                                            ))}
                                        </div>
                                        <div className='papercard_edit_text' style={{color: this._starColor, pointerEvents: 'none'}}>{this.t('influence')}</div>
                                    </div>
                                )}
                                <div className='papercard_edit_right'>
                                    {
                                        !root && (
                                            <div className='papercard_edit_right_icon papercard_edit_btn' style={{width: `${this._iconWidth}px`}} onClick={this.handlePin}>
                                                <Pin height={this._iconWidth} width={this._iconWidth}  style={{fill: pin ? this._pinedColor : this._pinColor, fontSize: `${this._iconWidth}px`, pointerEvents: 'none'}} />
                                                <div className='papercard_edit_text' style={{color: pin ? this._pinedColor : this._pinColor, pointerEvents: 'none'}}>{this.t('citation')}</div>
                                            </div>
                                        )
                                    }
                                    <div className='papercard_edit_right_icon papercard_edit_btn' style={{width: `${this._iconWidth}px`}} onClick={this.handleDislike}>
                                        {
                                            node.dislike ? (
                                                <DislikeFull height={this._iconWidth} width={this._iconWidth}  style={{fill: this._dislikeColor, fontSize: `${this._iconWidth}px`, pointerEvents: 'none'}} />
                                            ) : (
                                                <Dislike height={this._iconWidth} width={this._iconWidth}  style={{fill: this._dislikeColor, fontSize: `${this._iconWidth}px`, pointerEvents: 'none'}} />
                                            )
                                        }
                                        <div className='papercard_edit_text' style={{color: this._dislikeColor, pointerEvents: 'none'}}>{this.t('dislike')}</div>
                                    </div>
                                    <div className='papercard_edit_right_icon papercard_edit_btn' style={{width: `${this._iconWidth}px`}} onClick={this.handleLike}>
                                        {
                                            node.like ? (
                                                <LikeFull height={this._iconWidth} width={this._iconWidth}  style={{fill: this._likeColor, fontSize: `${this._iconWidth}px`, pointerEvents: 'none'}} />
                                            ) : (
                                                <Like height={this._iconWidth} width={this._iconWidth}  style={{fill: this._likeColor, fontSize: `${this._iconWidth}px`, pointerEvents: 'none'}} />
                                            )
                                        }
                                        <div className='papercard_edit_text' style={{color: this._likeColor, pointerEvents: 'none'}}>{this.t('like')}</div>
                                    </div>
                                    {
                                        !root && (
                                            <div className='papercard_edit_right_icon papercard_edit_btn' style={{width: `${this._iconWidth}px`}} onClick={this.handleChange}>
                                                <Move height={this._iconWidth} width={this._iconWidth}  style={{fill: this._moveColor, fontSize: `${this._iconWidth}px`, pointerEvents: 'none'}} />
                                                <div className='papercard_edit_text' style={{color: this._moveColor, pointerEvents: 'none'}}>{this.t('move')}</div>
                                            </div>
                                        )
                                    }

                                </div>
                            </div>
                        )
                    }
                </div>
            </div>
        )
    }
}