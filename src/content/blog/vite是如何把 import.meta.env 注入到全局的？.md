---
title: "vite是如何把 import.meta.env 注入到全局的？"
date: "2023-11-27 14:27:06"
draft: false
tags:
- vite
---


# 前提
## 什么是import.meta？
`import.meta` 是esm出现的特性，[morden浏览器支持](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/import.meta)，[nodejs也支持](https://nodejs.org/docs/latest-v15.x/api/esm.html#esm_import_meta)。
目前 `import.meta`这个对象只有一个稳定的官方属性：`import.meta.url`，当前module的文件(file:/)路径
## 为什么vite要把env这种特殊对象放在import.meta中？
我没有找到官方的回答。
我的理解是，`import.meta`的定义，就正好符合vite想做的事
> import.meta是一个给 JavaScript 模块暴露特定上下文的元数据属性的对象。它包含了这个模块的信息，比如说这个模块的 URL。
> import.meta对象是由 ECMAScript 实现的，它带有一个[null](https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Reference/Operators/null)的原型对象。这个对象可以扩展，并且它的属性都是可写，可配置和可枚举的

`import.meta.env` / `import.meta.glob`/ `import.meta.hot` 等等这些，都是在给模块上下文定义属性或者方法
# 进入正文
## vite是如何读取的 .env 变量？
使用 `dotenv`这个库来读取的 .env 变量。还使用了 `dotenv-expand`这个库来实现 .env 文件中使用变量的功能
贴一下核心代码
```typescript
import dotenv from 'dotenv'
import dotenvExpand from 'dotenv-expand'
import fs from 'node:fs'
import { arraify, lookupFile } from './utils'

export function loadEnv(
  mode: string,
  envDir: string,
  prefixes: string | string[] = 'VITE_'
): Record<string, string> {
  prefixes = arraify(prefixes)
  const env: Record<string, string> = {}
  const envFiles = [
    /** default file */ `.env`,
    /** local file */ `.env.local`,
    /** mode file */ `.env.${mode}`,
    /** mode local file */ `.env.${mode}.local`
  ]

  // 读取 .env 对象
  const parsed = Object.fromEntries(
    envFiles.flatMap((file) => {
      const path = lookupFile(envDir, [file], {
        pathOnly: true,
        rootDir: envDir
      })
      if (!path) return []
      return Object.entries(
        dotenv.parse(fs.readFileSync(path), {
          debug: process.env.DEBUG?.includes('vite:dotenv')
        })
      )
    })
  )

  // let environment variables use each other
  const expandParsed = dotenvExpand({
    parsed: {
      ...(process.env as any),
      ...parsed
    },
    // prevent process.env mutation
    ignoreProcessEnv: true
  } as any).parsed!

  Object.keys(parsed).forEach((key) => {
    parsed[key] = expandParsed[key]
  })

  // only keys that start with prefix are exposed to client
  for (const [key, value] of Object.entries(parsed)) {
    if (prefixes.some((prefix) => key.startsWith(prefix))) {
      env[key] = value
    } else if (
      key === 'NODE_ENV' &&
      process.env.VITE_USER_NODE_ENV === undefined
    ) {
      // NODE_ENV override in .env file
      process.env.VITE_USER_NODE_ENV = value
    }
  }

  // check if there are actual env variables starting with VITE_*
  // these are typically provided inline and should be prioritized
  for (const key in process.env) {
    if (prefixes.some((prefix) => key.startsWith(prefix))) {
      env[key] = process.env[key] as string
    }
  }

  return env
}

```
## vite是如何把 import.meta.env 注入到全局的？
分为两种情况： dev / build
为什么要区分开来，最后再说，先分析是如何注入的
### Dev
dev阶段是通过内置插件 `[vite:import-analysis](https://github.com/vitejs/vite/blob/HEAD/packages/vite/src/node/plugins/importAnalysis.ts)`实现的注入(inject)。这个插件只在server阶段生效。
贴一下核心代码
```typescript
export function importAnalysisPlugin(config: ResolvedConfig): Plugin {

  return {
    name: 'vite:import-analysis',
    async transform(source, importer, options) {
      await init
      let imports: readonly ImportSpecifier[] = []
      let exports: readonly string[] = []
      ;[imports, exports] = parseImports(source)
      for (let index = 0; index < imports.length; index++) {
      	const {
          s: start,
          e: end,
          ss: expStart,
          se: expEnd,
          d: dynamicIndex,
          // #2083 User may use escape path,
          // so use imports[index].n to get the unescaped string
          n: specifier,
          a: assertIndex
        } = imports[index]
        const rawUrl = source.slice(start, end)
         if (rawUrl === 'import.meta') {
          const prop = source.slice(end, end + 4)
          if (prop === '.hot') {
          } else if (prop === '.env') {
            hasEnv = true
          }
          continue
        }
      }
      if (hasEnv) {
        // inject import.meta.env
        let env = `import.meta.env = ${JSON.stringify({
          ...config.env,
          SSR: !!ssr
        })};`
        // account for user env defines
        for (const key in config.define) {
          if (key.startsWith(`import.meta.env.`)) {
            const val = config.define[key]
            env += `${key} = ${
              typeof val === 'string' ? val : JSON.stringify(val)
            };`
          }
        }
        str().prepend(env)
      }
    }
  }
}
```
这段代码只是跟注入直接相关的，简单分析一下

- 使用 `es-module-lexer`对当前代码(source code，简单来说就是咱们开发者写的代码)进行词法分析，找到 `import.meta.env`
- 如果开发者使用到了 `import.meta.env`，就把 `.env`中的变量都加在 `source code`前面，相当于是声明了变量

顺带提一嘴，`define`的全局变量，在dev阶段也是如上述处理的
### Build
build阶段是通过内置插件 `[vite:define](https://github.com/vitejs/vite/blob/HEAD/packages/vite/src/node/plugins/define.ts)`实现的变量替换为常量。dev阶段并没有替换变量，而是声明变量
贴一下核心代码
```typescript
export function definePlugin(config: ResolvedConfig): Plugin {
  const isBuild = config.command === 'build'
  if (isBuild) {
    const env: Record<string, any> = {
      ...config.env,
      SSR: !!config.build.ssr
    }
    for (const key in env) {
      importMetaKeys[`import.meta.env.${key}`] = JSON.stringify(env[key])
    }
    Object.assign(importMetaFallbackKeys, {
      'import.meta.env.': `({}).`,
      'import.meta.env': JSON.stringify(config.env),
      'import.meta.hot': `false`
    })
  }

  return {
    name: 'vite:define',
    transform(code, id, options) {
      const [replacements, pattern] = ssr ? ssrPattern : defaultPattern
      while ((match = pattern.exec(code))) {
        hasReplaced = true
        const start = match.index
        const end = start + match[0].length
        const replacement = `${  replacements[match[1]]}`
        s.overwrite(start, end, replacement, { contentOnly: true })
      }
      return transformStableResult(s, id, config)
    }
  }

}
```
简单来说，就是正则替换，正则的规则代码[在这里](https://github.com/vitejs/vite/blob/HEAD/packages/vite/src/node/plugins/define.ts#L58)
### 为什么分为dev和build两个阶段？
> for dev we inject actual global defines in the vite client to avoid the transform cost.

这是vite作者Evan注释。
的确正则会比较耗时，但是如果解开条件限制，`vite:define`插件做变量替换在dev阶段也是没问题的
