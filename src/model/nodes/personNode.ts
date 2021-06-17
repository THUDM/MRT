import { IMRTNode } from "../mrtTree";

interface IPersonNode extends IMRTNode {
    /**
     * 照片
     */
    avatar: string;
    /**
     * H-index
     */
    hindex: number;
    gindex: number;
    /**
     * 引用数
     */
    citations: number;
    /**
     * 从属
     */
    affiliation: string;
    /**
     * 职位
     */
    position: string;
    /**
     * 标签
     */
    tags: string[];
}

const defaultPersonNode: IPersonNode = {
    type: "person",
    id: "",
    name: "",
    link_in: [],
    link_out: [],
    avatar: "",
    hindex: 0,
    gindex: 0,
    citations: 0,
    affiliation: "",
    position: "",
    tags: []
}

export {
    IPersonNode,
    defaultPersonNode
}