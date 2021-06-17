import { IMRTNode } from "../mrtTree";

/**
 * 论文Node
 */
interface ITextNode extends IMRTNode {
    /**
     * 描述
     */
    description: string;
}

const defaultTextNode: ITextNode = {
    type: "text",
    id: "",
    name: "",
    link_in: [],
    link_out: [],
    description: ""
}

export {
    ITextNode,
    defaultTextNode
}