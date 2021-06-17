
let calcSpan: HTMLSpanElement;

function calcTextHeight(text: string, width: number, fontSize: number, lineHeight: number, textAlign?: string, fontWeight?:string, fontFamily?: string): number {
    if(!calcSpan) {
        calcSpan = document.createElement("span");
        calcSpan.style.position = "absolute";
        calcSpan.style.top = "0px";
        calcSpan.style.wordWrap = "break-word";
        calcSpan.style.wordBreak = "break-word";
        calcSpan.style.display = "inline-block";
        calcSpan.style.visibility = "hidden";
        document.body.appendChild(calcSpan);
    }
    textAlign = textAlign || "left";
    let scale: number = 1;
    if(fontSize < 12) {
        scale = fontSize / 12;
        fontSize = 12;
        lineHeight /= scale;
        width /= scale;
    }
    calcSpan.style.fontWeight = fontWeight || "normal";
    calcSpan.style.width = `${width}px`;
    calcSpan.style.fontSize = `${fontSize}px`;
    calcSpan.style.lineHeight = `${lineHeight}px`;
    if(fontFamily) calcSpan.style.fontFamily = fontFamily;
    calcSpan.style.textAlign = textAlign;
    
    calcSpan.innerText = text;
    return calcSpan.offsetHeight * scale;
}

export {
    calcTextHeight
}