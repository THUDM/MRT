import { IMRTNode } from "../mrtTree";
import { IClusterInfo, ITextInfo } from "../mrtRender";

/**
 * 论文Node
 */
interface IClusterTagNode extends IMRTNode {
    /**
     * 描述
     */
    cinfo: IClusterInfo;
    tinfo: ITextInfo;
}

export {
    IClusterTagNode
}