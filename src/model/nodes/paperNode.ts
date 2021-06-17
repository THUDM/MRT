import { IMRTNode } from "../mrtTree";

/**
 * 论文Node
 */
interface IPaperNode extends IMRTNode {
    /**
     * 论文标题
     */
    title: string;
    /**
     * 摘要
     */
    abstract: string;
    /**
     * 论文发表年份
     */
    year: number;
    /**
     * 出处
     */
    venue: string;
    /**
     * 被引用数
     */
    citations: number;
    /**
     * 作者
     */
    authors: string[];
    /**
     * 影响等级
     */
    level: number;
    /**
     * 是否可编辑
     */
    editable: boolean;
    /**
     * 点赞
     */
    like: boolean;
    /**
     * 点踩
     */
    dislike: boolean;
    /**
     *
     */
    score: number;
}

const defaultPaperNode: IPaperNode = {
    type: "paper",
    id: "",
    name: "",
    link_in: [],
    link_out: [],
    authors: [],
    title: "",
    abstract: "",
    year: 2000,
    venue: "",
    citations: 0,
    editable: false,
    level: 0,
    like: false,
    dislike: false,
    score: 0
}

export {
    IPaperNode,
    defaultPaperNode
}