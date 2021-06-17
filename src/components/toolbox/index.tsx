import React, { ChangeEvent } from 'react'
import QRCode from 'qrcode'
import './index.css'
import Tool from './tool'
import TooltipTextTranslation from './tooltip-text-translation.json'
import Helper from './helper'
import { Modal } from 'antd'
import { ILang, Translator } from '../../utils/translation'
import { isMobile } from '../../utils'
import { DesktopOutlined, HeartFilled, HeartTwoTone, QuestionCircleOutlined, ShareAltOutlined, QrcodeOutlined, FontSizeOutlined, ZoomInOutlined, ZoomOutOutlined, SearchOutlined, DownloadOutlined, FileImageTwoTone, ControlOutlined, EyeTwoTone, EyeInvisibleTwoTone, ColumnWidthOutlined, FolderOpenOutlined, HighlightOutlined, MobileOutlined } from '@ant-design/icons'

interface IProps {
    lang: ILang;
    likeable?: boolean;
    like?: boolean;
    shareable?: boolean;
    downloadable?: boolean;
    loadable?: boolean;
    recommendable?: boolean;
    hideSubBranch: boolean;
    disableTextClusterSpan: boolean;
    forcePC?: boolean;
    scaleFont: (b: boolean) => void;
    zoom: (b: boolean) => void;
    capture?: () => void;
    onLike?: () => void;
    onHideSubBranch: () => void;
    onDisableTextClusterSpan: () => void;
    onLoadJson?: (json: any) => void;
    onRecommendableChange: () => void;
    onSetForcePC: (force: boolean) => void;
}

interface IState {
    helperVisible: boolean;
}

export class Toolbox extends React.Component<IProps, IState> {

    private _fileLoadInput: HTMLInputElement | undefined
    private translator: Translator = new Translator(TooltipTextTranslation)

    constructor(props: IProps) {
        super(props)
        this.state = {
            helperVisible: false
        }
        this._fileLoadInput = undefined
    }

    loadJson(e: ChangeEvent<HTMLInputElement>) {
        if (!e.target.files || e.target.files.length === 0) return
        const reader = new FileReader()
        reader.onload = (e) => {
            if (this.props.onLoadJson && e.target) this.props.onLoadJson(JSON.parse(e.target.result as string))
            if (this._fileLoadInput) this._fileLoadInput.value = ''
        }
        reader.readAsText(e.target.files[0])
    }

    public t(key: string): string {
        return this.translator.T(key, this.props.lang)
    }

    public render() {
        const renderQRCode = () => {
            const canvas = document.getElementById("mrt-share-qrcode-canvas")
            if (canvas)
                QRCode.toCanvas(canvas, window.location.href, (e: any) => { if (e) console.error(e) })
            else
                setTimeout(renderQRCode, 500)
        }
        renderQRCode()
        const { shareable, likeable, like, onLike, downloadable, loadable } = this.props;
        // const topClassName = isMobile() ? "toolgroup secondary vertical" : "toolgroup vertical"
        const topClassName = "toolgroup vertical"
        return (isMobile() && !this.props.forcePC) ? (
            <div>
                <div className="toolgroup horizontal mobile">
                    <div className="toolgroup vertical">
                        <Tool className="toolgroup" type={DesktopOutlined} theme="outlined" color="purple" tooltipText={this.t("desktop")} primary onClick={() => this.props.onSetForcePC(true)}/>
                    </div>
                </div>
            </div>
        ) : (
            <div>
                <div className="toolgroup horizontal">
                    {
                        !!likeable && (
                            <div className={topClassName}>
                                <Tool type={like ? HeartFilled : HeartTwoTone} theme={like ? "filled" : "twoTone"} color="red" tooltipText={this.t(like ? "Dislike" : "Like")} primary onClick={() => onLike && onLike()}/>
                            </div>
                        )
                    }
                    { !isMobile() && <div className={topClassName}>
                        <Tool className="toolgroup" type={QuestionCircleOutlined} theme="outlined" color="yellow" tooltipText={this.t("Guide")} primary onClick={() => this.setState({helperVisible: true})}/>
                    </div> }
                    {
                        !!shareable && (
                            <div className={topClassName}>
                                <Tool type={ShareAltOutlined} theme="outlined" color="green" tooltipText={this.t("Share")} primary/>
                                <Tool className="qrcode-icon" type={QrcodeOutlined} theme="outlined" color="green" tooltipText={this.t("QR Code")}>
                                    <canvas className="qrcode" id="mrt-share-qrcode-canvas"/>
                                </Tool>
                            </div>
                        )
                    }
                    <div className={topClassName}>
                        <Tool type={FontSizeOutlined} theme="outlined" color="pink" tooltipText={this.t("Font Size")} primary/>
                        <Tool type={ZoomInOutlined} theme="outlined" color="pink" tooltipText={this.t("Larger Font")} onClick={() => this.props.scaleFont(true)}/>
                        <Tool type={ZoomOutOutlined} theme="outlined" color="pink" tooltipText={this.t("Smaller Font")} onClick={() => this.props.scaleFont(false)}/>
                    </div>
                    <div className={topClassName}>
                        <Tool type={SearchOutlined} theme="outlined" color="aquamarine" tooltipText={this.t("Zoom")} primary/>
                        <Tool type={ZoomInOutlined} theme="outlined" color="aquamarine" tooltipText={this.t("Zoom In")} onClick={() => this.props.zoom(true)}/>
                        <Tool type={ZoomOutOutlined} theme="outlined" color="aquamarine" tooltipText={this.t("Zoom Out")} onClick={() => this.props.zoom(false)}/>
                    </div>
                    {
                        !!downloadable && (
                            <div className={topClassName}>
                                <Tool type={DownloadOutlined} theme="outlined" color="blue" tooltipText={this.t("Download")} primary/>
                                <Tool type={FileImageTwoTone} theme="twoTone" color="blue" tooltipText={this.t("Full Picture")} onClick={() => this.props.capture && this.props.capture()}/>
                            </div>
                        )
                    }

                    <div className={topClassName}>
                        <Tool type={ControlOutlined} theme="outlined" color="teal" tooltipText={this.t("Control")} primary/>
                        <Tool type={this.props.hideSubBranch ? EyeTwoTone : EyeInvisibleTwoTone} theme="twoTone" color="teal" onClick={() => this.props.onHideSubBranch()}
                            tooltipText={this.t(this.props.hideSubBranch ? "Display Sub Branch" : "Hide Sub Branch")}/>
                        <Tool type={ColumnWidthOutlined} theme="outlined" color="teal" onClick={() => this.props.onDisableTextClusterSpan()}
                            tooltipText={this.t(this.props.disableTextClusterSpan ? "Enable Text Span" : "Disable Text Span")}/>
                        { !!loadable && <Tool type={FolderOpenOutlined} theme="outlined" color="teal" onClick={() => {
                            if (this._fileLoadInput) this._fileLoadInput.click()
                        }} tooltipText={this.t("Load JSON")}/>}
                        { !!loadable && <input ref={d => this._fileLoadInput = d!} id="mrt-file-load-input" type="file" hidden onChange={(e) => this.loadJson(e)}/>}
                        { this.props.recommendable !== undefined && <Tool type={HighlightOutlined} theme="outlined" color="teal" onClick={() => this.props.onRecommendableChange()}
                            tooltipText={this.t(!!this.props.recommendable ? "Enable Recommendation" : "Disable Recommendation")}/>}
                    </div>
                    <div className="toolgroup vertical">
                        {isMobile()
                            && <Tool className="toolgroup" type={MobileOutlined} theme="outlined" color="purple" tooltipText={this.t("Mobile")} primary onClick={() => this.props.onSetForcePC(false)}/>
                        }
                    </div>
                </div>
                <HelperModal lang={this.props.lang} onCancel={() => this.setState({helperVisible: false})} visible={this.state.helperVisible}/>
            </div>
        )
    }
}

interface IHelperModalProps {
    lang?: ILang;
    visible: boolean;
    onCancel: () => void;
}

export class HelperModal extends React.Component<IHelperModalProps> {
    private translator: Translator = new Translator(TooltipTextTranslation)
    render() {
        return (
            <Modal className="mrt-modal" title={this.translator.T("Guide", this.props.lang)} visible={this.props.visible} onCancel={this.props.onCancel} footer={null} width={"auto"} bodyStyle={{padding: "1rem"}}>
                <Helper lang={this.props.lang}/>
            </Modal>
        )
    }
}
