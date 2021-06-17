import * as React from 'react';

interface IProps {
    data: any;
    userEdits: any;
    hideSubBranch: boolean;
    disableTextClusterSpan: boolean;
    fontExtraSize: number;
    authors: string[];
    lang: string;
    onEditChange?: (edits: any) => void;
}

declare class MRTViewer extends React.Component {
    props: IProps
}

export default MRTViewer;