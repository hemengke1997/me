---
title: "vite 懒加载国际化资源"
date: "2023-03-28 15:22:05"
draft: false
tags:
- vite
- vite插件
---


# 背景
项目中国际化资源越来越多，不做懒加载的话，用户端首次加载资源较多，体验不好
# vite中如何实现懒加载
目前有两种方式

1. 手动懒加载：开发者手写 dynamic import
2. 自动懒加载：利用vite插件能力，在构建层实现异步加载

下面我将详细解释两种方式
## 手动懒加载
懒加载的本质是动态import资源，当打包工具解析到import语句时，会把import的资源单独打包（分包）。
用户端执行到动态import代码时，才会去请求网络静态资源
如下代码：
```typescript
const lazyload = async () => {
  return await import('./path/to/file.js').default
}
```
vite中使用扩展了动态import的能力

- [glob导入](https://vitejs.dev/guide/features.html#glob-import)： `import.meta.glob('./dir/*.js')`。其背后原理是 glob
- [动态变量导入](https://vitejs.dev/guide/features.html#dynamic-import)： `import('./dir/${foo}.js')`。其背后原理是使用 rollup的 `[dynamic-import-vars](https://github.com/rollup/plugins/tree/master/packages/dynamic-import-vars)` 插件

开发者可以使用以上方式懒加载资源，国际化资源也可以如此。
假设我们有如下目录结构：
```
locale                     
├─ en                  
│  ├─ index.ts         
│  ├─ a.json        
│  └─ b.json     
├─ zh                  
│  ├─ index.ts         
│  ├─ a.json  
│  └─ b.json             
└─ index.ts
```
我们可以在每个语言目录下的index中懒加载json。（每个语言目录下的index中都有重复代码，且由于`import.meta.glob`基于runtime，不可复用）
```typescript
const localesJson = import.meta.glob('./*.json', { import: 'default' })

export default localesJson
```
然后在配置i18n时，懒加载以上的ts资源，以下使用 i18next 伪代码举例
```typescript
import i18next from 'i18next'

const resources = import.meta.glob('./*/index.ts', { import: 'default' })

const currentResource = await resources[yourLang] // 执行动态import

i18next.init({
  resources: currentResource
})

i18next.on('languageChanged', async (lng) => {
  await resources[lng] // 加载资源
  i18next.addResourceBundle(...) // 把资源添加到i18next中
})
```

以上是一个基础的手动懒加载国际化资源的例子，由于动态import是基于运行时的，所有涉及到import的代码无法复用，对于开发者而言，维护心智成本高
于是我开发了自动懒加载国际化资源插件
## 自动懒加载
自动懒加载的本质也是动态import，但并非基于runtime，而是基于虚拟模块
把所有的语言资源通过语言，映射到虚拟模块中，动态加载每个虚拟模块，即可实现懒加载

接下来我们使用代码， 将 `把所有的语言资源通过语言，映射到虚拟模块中，动态加载每个虚拟模块`这句话翻译成vite插件
### 
首先，我们需要获取到所有的语言资源，此处我借鉴vscode插件 `i18n-ally`，通过用户预设配置获取到指定目录下的所有资源文件并模块化：
i18n-ally 配置
```typescript
{
  "i18n-ally.localesPaths": ["src/locale"],
  "i18n-ally.enabledParsers": ["json"],
  "i18n-ally.pathMatcher": "{locale}/{namespaces}.json",
}
```
```typescript
export const VIRTUAL = 'virtual:i18n'

export const RESOLVED_VIRTUAL_PREFIX = '\0/@i18n/'

export const RESOURCE_VIRTURL_HELPER = `${VIRTUAL}-helper`

interface DetectI18nResourceOptions {
  /**
   * @example
   * [path.resolve(__dirname, './src/locales')]
   * ['./src/locales']
   */
  localesPaths: string[]
  /**
   * @example
   * `{locale}/{namespaces}.{ext}`
   * `{locale}/{namespace}.json`
   * `{namespaces}/{locale}`
   * `something/{locale}/{namespace}`
   */
  pathMatcher: string
}

export async function i18nDetector(options: DetectI18nResourceOptions) {
  const localeDetector = new LocaleDetector({
    localesPaths: options.localesPaths,
    pathMatcher: options.pathMatcher,
  })

  await localeDetector.init() // 根据用户配置，读取指定目录下的资源文件


  // 初始化后得到以下结构
  // localeDetector.localeModules: {
  //   modules: Record<string, any>
  //   virtualModules: Record<string, any>
  //   resolvedIds: Map<string, string>
  // } = { modules: {}, virtualModules: {}, resolvedIds: new Map() }
  
  return {
    name: 'vite:i18n-detector',
    enforce: 'pre',
    config: () => ({
      optimizeDeps: {
        exclude: [`${VIRTUAL}-*`],
      },
    }),
    // resolveId阶段，拦截语言资源相关的虚拟模块id
    async resolveId(id: string, importer: string) {
      const { virtualModules, resolvedIds } = localeDetector.localeModules

      // 我们可以通过 `virtual:i18n-en` 这种方式直接加载语言资源包（不懒加载）
      if (id in virtualModules) {
        return RESOLVED_VIRTUAL_PREFIX + id
      }

      if (importer) {
        const importerNoPrefix = importer.startsWith(RESOLVED_VIRTUAL_PREFIX)
          ? importer.slice(RESOLVED_VIRTUAL_PREFIX.length)
          : importer
        const resolved = path.resolve(path.dirname(importerNoPrefix), id)
        if (resolvedIds.has(resolved)) {
          return RESOLVED_VIRTUAL_PREFIX + resolved
        }
      }
    	// 我们也可以通过 `virtual:i18n-helper`，懒加载语言资源包
      if (id === RESOURCE_VIRTURL_HELPER) {
        return RESOLVED_VIRTUAL_PREFIX + RESOURCE_VIRTURL_HELPER
      }

      return null
    },

    // load阶段，可以拦截虚拟模块id，自定义返回内容
    async load(id) {
      const { virtualModules, resolvedIds, modules } = localeDetector.localeModules
      if (id.startsWith(RESOLVED_VIRTUAL_PREFIX)) {
        const idNoPrefix = id.slice(RESOLVED_VIRTUAL_PREFIX.length)
        const resolvedId = idNoPrefix in virtualModules ? idNoPrefix : resolvedIds.get(idNoPrefix)

        // 非懒加载情况
        if (resolvedId) {
          const module = virtualModules[resolvedId]
          return typeof module === 'string' ? module : `export default ${JSON.stringify(module)}`
        }
        
      	// 懒加载
        if (id.endsWith(RESOURCE_VIRTURL_HELPER)) {
          let code = `export default { `
          for (const k in modules) {
            code += `${k}: () => import('${VIRTUAL}-${k}'),`
          }
          code += ' };'

          // 其实我们返回的就是这样一个对象：
          // {
          //   'en': () => import('virtual:i18n-en'),
          //   'zh': () => import('virtual:i18n-zh')
          // }
          // 这样可以巧妙的绕过runtime的限制，动态加载动态资源

          return {
            code,
            map: { mappings: '' },
          }
        }
      }

      return null
    },
    // 处理开发期间热更新
    async handleHotUpdate({ file, server }) {
      
      // 如果当前触发热更新的文件在我们的资源文件中，就向客户端发送热更新信号
      const updated = await localeDetector.onFileChanged({ fsPath: file })

      if (updated) {
        const { resolvedIds } = localeDetector.localeModules
        for (const [, value] of resolvedIds) {
          const { moduleGraph, ws } = server
          const module = moduleGraph.getModuleById(RESOLVED_VIRTUAL_PREFIX + value)
          if (module) {
            moduleGraph.invalidateModule(module)
            if (ws) {
              ws.send({
                type: 'full-reload',
                path: '*',
              })
            }
          }
        }
      }
    },
  } as PluginOption
}
```

在客户端，我们可以通过 `import helper from 'virtual:i18n-helper'`引入动态加载的模块对象，也可以直接导入资源  `import en from 'virtual:i18n-en'`

使用方式就很简单了：
```typescript
import helper from 'virtual:i18n-helper'

const lazyload = helper[yourLang]

const resource = (await lazyload()).default // 懒加载资源
```

# 总结
手动懒加载思路简单，只需要vite的基础api即可实现，但缺点是runtime限制导致无法复用代码
自动懒加载涉及到了vite的虚拟模块、获取i18n资源等，使用起来简单且维护成本低，但由于封装深，所以可能开发者体验不好

以上就是关于在vite中懒加载国际化资源的方式，[插件地址在这里](https://github.com/hemengke1997/vite-plugin-i18n-detector)，谢谢各位看到最后
