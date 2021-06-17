type ILang = "zh" | "en"

interface ITranslationDict {
    [key: string]: string
}

interface ITranslationDicts {
    [lang: string]: ITranslationDict
}

class Translator {
    private dicts: ITranslationDicts
    private lang?: ILang

    public constructor(dicts: ITranslationDicts) {
        this.dicts = dicts
    }

    public setLang(lang?: ILang) {
        this.lang = lang
    }

    public t(key: string): string {
        key = key.toLowerCase()
        const lang = this.lang
        if (lang && lang in this.dicts) {
            if (key in this.dicts[lang]) {
                return this.dicts[lang][key]
            }
        }
        return key.split(' ').map(w => w[0].toUpperCase() + w.slice(1)).join(' ')
    }

    public T(key: string, lang?: ILang): string {
        this.setLang(lang)
        return this.t(key)
    }
}

export {
    ILang,
    ITranslationDict,
    ITranslationDicts,
    Translator
}