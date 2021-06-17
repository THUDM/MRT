import { IMRTData } from '../../model/mrtTree';

interface IAdapter {
    transform(raw: {data: any, userEdits: any}): IMRTData
}

export {
    IAdapter
}