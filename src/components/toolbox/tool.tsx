import React from 'react'
import chroma from 'chroma-js'
import './tool.css'

interface IProps {
    onClick?: () => void;
    luminance?: number;
    primary?: boolean;
    color: string;
    theme?: "filled" | "outlined" | "twoTone";
    type: any;
    className?: string;
    tooltipText?: string;
}

export default class Tool extends React.Component<IProps> {
    constructor(props: IProps) {
        super(props);

        this.onClick = this.onClick.bind(this);
    }

    private onClick() {
        if (this.props.onClick) this.props.onClick()
    }

    public render() {
        const luminance = this.props.luminance || (this.props.primary ? 0.4 : 0.2)
        const color = chroma(this.props.color).luminance(luminance)
        const textColor = color.luminance(luminance / 2)
        const TypedIcon = this.props.type
        const icon = (this.props.theme !== "twoTone")
            ? <TypedIcon className="toolicon" theme={this.props.theme} onClick={() => this.onClick()} style={{color: color.hex()}}/>
            : <TypedIcon className="toolicon" onClick={() => this.onClick()} twoToneColor={color.hex()}/>
        return (
            <div className={`tool tooltip ${this.props.primary ? "primary" : "secondary"} ${this.props.className || ''}`}>
                {icon}
                <span className="tooltip-text" style={{color: textColor.hex(), userSelect: 'none'}}>{this.props.tooltipText}</span>
                {this.props.children}
            </div>
        )
    }
}
