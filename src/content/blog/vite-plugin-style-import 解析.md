---
title: "vite-plugin-style-import 解析"
date: "2022-10-17 15:00:22"
draft: false
tags:
- vite
- vite插件
---

# 核心
vite transform阶段

- 解析import语句，判断引入的库是否满足style-import条件
- 解析import语句中引入的项，然后针对此项新增style-import代码。如： `import { Button } from 'antd'`,则 `import 'antd/es/button/style/index'`

```typescript
import type { Plugin } from 'vite'
import { createFilter } from '@rollup/pluginutils'
import MagicString from 'magic-string'
import type { ImportSpecifier } from 'es-module-lexer'
import { init, parse } from 'es-module-lexer'
import * as changeCase from 'change-case'
import { isFunction } from 'lodash-es'

type ChangeCaseType =
  | 'camelCase'
  | 'capitalCase'
  | 'constantCase'
  | 'dotCase'
  | 'headerCase'
  | 'noCase'
  | 'paramCase'
  | 'pascalCase'
  | 'pathCase'
  | 'sentenceCase'
  | 'snakeCase'

type LibraryNameChangeCase = ChangeCaseType | ((name: string) => string)

export interface Lib {
  importTest?: RegExp
  libraryName: string
  resolveStyle?: (name: string) => string
  ensureStyleFile?: boolean
  libraryNameChangeCase?: LibraryNameChangeCase
  base?: string
}

interface VitePluginOptions {
  resolves?: Lib[]
}

const asRE = /\s+as\s+\w+,?/g

export function createStyleImportPlugin(options: VitePluginOptions): Plugin {
  const include = ['**/*.ts', '**/*.js', '**/*.tsx', '**/*.jsx']
  const exclude = 'node_modules/**'
  const { resolves = [] } = options

  const libs: Lib[] = [...resolves]

  const filter = createFilter(include, exclude)

  return {
    name: 'vite:style-import',
    enforce: 'post',

    async transform(code, id) {
      if (!code || !filter(id) || !needTransform(code, libs)) {
        return null
      }

      await init

      let imports: readonly ImportSpecifier[] = []
      try {
        imports = parse(code)[0]
      } catch (e) {
        console.error(e)
      }
      if (!imports.length) {
        return null
      }

      let s: MagicString | undefined
      const str = () => s || (s = new MagicString(code))

      for (let index = 0; index < imports.length; index++) {
        const { n, se, ss } = imports[index]
        if (!n) continue

        const lib = getLib(n, libs)
        if (!lib) continue

        const importStr = code.slice(ss, se)

        let importVariables = transformImportVar(importStr)

        importVariables = filterImportVariables(importVariables, lib.importTest)

        const importCssStrList = await transformComponentCss(lib, importVariables)

        const compStrList: string[] = []

        const { base = '' } = lib

        let baseImporter = base ? '\n' + `import '${base}'` : ''

        if (str().toString().includes(base)) {
          baseImporter = ''
        }

        const endIndex = se + 1

        str().prependRight(endIndex, `${baseImporter}\n${compStrList.join('')}${importCssStrList.join('')}`)
      }
      return {
        map: null,
        code: str().toString(),
      }
    },
  }
}

function needTransform(code: string, libs: Lib[]) {
  return !libs.every(({ libraryName }) => {
    return !new RegExp(`('${libraryName}')|("${libraryName}")`).test(code)
  })
}

function getLib(libraryName: string, libs: Lib[]) {
  return libs.find((item) => item.libraryName === libraryName)
}

export function transformImportVar(importStr: string) {
  if (!importStr) {
    return []
  }

  const exportStr = importStr.replace('import', 'export').replace(asRE, ',')

  let importVariables: readonly string[] = []
  try {
    importVariables = parse(exportStr)[1].map((t) => t.n)
  } catch (error) {
    console.error(error)
  }
  return importVariables
}

function filterImportVariables(importVars: readonly string[], reg?: RegExp) {
  if (!reg) {
    return importVars
  }
  return importVars.filter((item) => reg.test(item))
}

async function transformComponentCss(lib: Lib, importVariables: readonly string[]) {
  const { libraryName, resolveStyle, libraryNameChangeCase = 'paramCase' } = lib

  if (!isFunction(resolveStyle) || !libraryName) {
    return []
  }
  const set = new Set<string>()
  for (let index = 0; index < importVariables.length; index++) {
    const name = getChangeCaseFileName(importVariables[index], libraryNameChangeCase)
    const importStr = resolveStyle(name)

    if (!importStr) {
      continue
    }

    set.add(`import '${importStr}';\n`)
  }

  return Array.from(set)
}

export function getChangeCaseFileName(importedName: string, libraryNameChangeCase: LibraryNameChangeCase) {
  try {
    return changeCase[libraryNameChangeCase as ChangeCaseType](importedName)
  } catch (error) {
    return importedName
  }
}

export function AntdResolve(): Lib {
  return {
    libraryName: 'antd',
    resolveStyle: (name) => {
      return `antd/es/${name}/style/index`
    },
  }
}

```
