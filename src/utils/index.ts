export function isMobile() {
    return document.body.offsetWidth < 560;
}

let forcePC = false
export function isForcePC() {
    return forcePC;
}
export function setForcePC(val: boolean) {
    forcePC = val
}