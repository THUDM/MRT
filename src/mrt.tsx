import React from 'react'
import MRTViewer from './components/mrt-viewer'
import './mrt.css'
import svgLib from 'save-svg-as-png'
import { Toolbox } from './components/toolbox'
import ReactDOM from 'react-dom';

interface IProps {
    data: any;
    like?: boolean;
    lang?: string;
    userEdits?: any;
    authors?: string[];
    onLike: () => void;
    onLoadJson?: (json: any) => void;
    onEditChange?: (edits: any) => void;
}

interface IState {
    like: boolean;
    viewerScale: number;
    hideSubBranch: boolean;
    disableTextClusterSpan: boolean;
    fontExtraSize: number;
}

export default class MRT extends React.Component<IProps, IState> {
    private _mrtViewer: MRTViewer | null;
    
    constructor(props: IProps) {
        super(props)
        this.state = {
            like: this.props.like || false,
            viewerScale: 100,
            hideSubBranch: false,
            disableTextClusterSpan: false,
            fontExtraSize: 0
        }
    }

    private capture(full: boolean) {
        if(this._mrtViewer) {
            let mrtDom: SVGSVGElement = ReactDOM.findDOMNode(this._mrtViewer) as SVGSVGElement;
            if(mrtDom) {
                if (full)
                svgLib.saveSvgAsPng(mrtDom, `master-reading-tree.png`)
            else {
                const srcWidth = mrtDom.viewBox.baseVal.width
                const outputWidth = document.body.clientWidth
                svgLib.saveSvgAsPng(mrtDom, `master-reading-tree-snapshot.png`, {scale: outputWidth / srcWidth})
            }
            }
        }
    }

    private zoom(larger: boolean) {
        this.setState({viewerScale: Math.min(Math.max(this.state.viewerScale + (larger ? 10 : -10), 100), 1000)})
    }

    private scaleFont(larger: boolean) {
        this.setState({fontExtraSize: Math.max(0, Math.min(10, this.state.fontExtraSize + (larger ? 2 : -2)))})
    }

    private onLoadJson(e: any) {
        if (e.target.files.length === 0) return
        const reader = new FileReader()
        reader.onload = (e) => {
            if (e.target && this.props.onLoadJson) this.props.onLoadJson(JSON.parse(e.target.result as string))
        }
        reader.readAsText(e.target.files[0])
    }

    render() {
        const lang: string = this.props.lang || "en";
        const userEdits: any = this.props.userEdits || {};
        const authors: string[] = this.props.authors || [];
        const like: boolean = this.props.like || false;
        console.log("data: ", this.props.data);
        return (
            <div className="mrt-container" style={{width: `${this.state.viewerScale}%`}}>
                {/* <Toolbox lang={lang}
                    onLike={() => this.props.onLike()} like={like}
                    onHideSubBranch={() => this.setState({hideSubBranch: !this.state.hideSubBranch})} hideSubBranch={this.state.hideSubBranch}
                    onDisableTextClusterSpan={() => this.setState({disableTextClusterSpan: !this.state.disableTextClusterSpan})} disableTextClusterSpan={this.state.disableTextClusterSpan}
                    onLoadJson={this.props.onLoadJson ? (e: any) => this.onLoadJson(e) : undefined}
                    scaleFont={(larger: boolean) => this.scaleFont(larger)}
                    zoom={(larger: boolean) => this.zoom(larger)}
                    capture={(full: boolean) => this.capture(full)}
                /> */}
                <MRTViewer ref={(e) => this._mrtViewer = e} data={this.props.data} userEdits={userEdits} 
                    hideSubBranch={this.state.hideSubBranch} disableTextClusterSpan={this.state.disableTextClusterSpan}
                    fontExtraSize={this.state.fontExtraSize}
                    authors={authors}
                    onEditChange={this.props.onEditChange}
                    lang={lang}/>
            </div>
        )
    }
}