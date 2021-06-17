import babel from 'rollup-plugin-babel'
import commonjs from 'rollup-plugin-commonjs'
import external from 'rollup-plugin-peer-deps-external'
import postcss from 'rollup-plugin-postcss'
import resolve from 'rollup-plugin-node-resolve'
import json from 'rollup-plugin-json'
import svgr from '@svgr/rollup'
import svg from 'rollup-plugin-svg'
import typescript from 'rollup-plugin-typescript2'
import image from  '@rollup/plugin-image'

import pkg from './package.json'

export default {
  input: 'src/index.ts',
  output: [
    {
      file: pkg.main,
      format: 'cjs',
      sourcemap: true
    },
    {
      file: pkg.module,
      format: 'es',
      sourcemap: true
    }
  ],
  plugins: [
    typescript({
        'objectHashIgnoreUnknownHack': true,
        'useTsconfigDeclarationDir': true
    }),
    external(),
    postcss(),
    svg(),
    svgr(),
    json(),
    image(),
    babel({
      exclude: 'node_modules/**',
      plugins: [ 'external-helpers' ]
    }),
    resolve(),
    commonjs({
      include: 'node_modules/**'
    })
  ]
}
