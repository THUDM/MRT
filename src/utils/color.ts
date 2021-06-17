import chroma from 'chroma-js'
import _ from 'lodash'

interface IColorTheme {
    src: string
    text: string
    main: string
    bgText: string
    bg: string
    bgMask: string
}

function generateColorTheme(src: string): IColorTheme {
    const color = chroma(src)
    return {src,
        text: color.luminance(0.25).darken(1).hex(),
        main: color.luminance(0.25).hex(),
        bgText: color.luminance(0.7).hex(),
        bg: color.luminance(0.9).hex(),
        bgMask: color.luminance(0.4).hex(),
    }
}

function generateColorThemes(n: number): IColorTheme[] {
    const srcColors = chroma.cubehelix().start(200).rotations(3).gamma(0.7).lightness([0.2, 0.6]).scale().correctLightness().colors(n)
    return srcColors.map(generateColorTheme)
}

export {
    IColorTheme,
    generateColorThemes
}