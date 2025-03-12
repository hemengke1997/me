---
title: "写了5个vite插件后，发现其实vite插件并不难"
date: "2025-02-14 15:40:14"
draft: false
tags:
- vite
- vite插件
---

# 前言
如果你是一名纯前端开发，很少或者根本没有写过nodejs，那么从编写vite插件入门nodejs，会带给你很丝滑的体验。

这篇文章将从我个人的经验总结出编写vite插件的入门技巧和思维，希望对大家有所帮助。



# 如何入门vite插件？
先有想法，再去学习。如果你遇到了一些问题，无法通过纯前端代码实现，或许这时候就可以想想，能不能用vite插件实现。有了想法之后，再去vite/rollup文档上看应该使用插件的哪些钩子。我认为这样是比较好的实践方式。

# vite插件的本质
既然我们想写一个vite插件，那么应该对其有个基本的认知。

我认为：**vite插件用于增强代码。**

# 代码增强
代码增强也就是通过vite的能力，对项目代码做魔改，以实现功能。

## 动态注入代码
举个例，假设我项目启动后，在浏览器控制台中，打印出项目的版本号、构建时间、构建环境。

构建时间、构建环境在前端中都无法获取，只能在vite环境中获取到，所以就可以写vite插件来实现。

想法有了，那现在需要知道，在什么钩子中能获取到我们需要的数据，查阅vite官方文档，有个 `configResolved`钩子能获取到构建环境，那么插件已经有个雏形了

```typescript
import path from 'path'
import { defineConfig, PluginOption, ResolvedConfig } from 'vite'
import { createRequire } from 'module'
import dayjs from 'dayjs'
import tz from 'dayjs/plugin/timezone'
import utc from 'dayjs/plugin/utc'

dayjs.extend(tz)
dayjs.extend(utc)

function viteLogTime() {
  let config: ResolvedConfig
  let version: string

  const currentTime = dayjs().tz("Asia/Shanghai").format("YYYY-MM-DD HH:mm:ss")
  
  return {
    name: 'vite-log-time',
    configResolved(_config) {
      config = _config
      const require = createRequire(import.meta.url)
      version = require(path.resolve(config.root, 'package.json')).version
    }
  }
}
```

到这一步，就拿到了我们所需要的信息，下一步，就是思考如何把信息打印到浏览器控制台上

让我们站在纯前端的视角来思考这个问题，要把信息打印到控制台，很简单吧？在代码中加 `console.log`呗！

没错，就是这么简单，切换到vite插件的视角来解决这个问题，同样也是给代码中加 `console`，但是怎么加，加在哪里？

查阅vite文档后，发现有两个钩子，可以对项目代码进行魔改，一个叫 `transform`，一个叫 `transformIndexHtml`。那我们就用这两个钩子来试试

如果使用 `transform`，那需要确定要魔改的文件，在这里我们就找入口文件，确保了唯一性。

```typescript
import path from 'path'
import { defineConfig, PluginOption, ResolvedConfig } from 'vite'
import { createRequire } from 'module'
import dayjs from 'dayjs'
import tz from 'dayjs/plugin/timezone'
import utc from 'dayjs/plugin/utc'

dayjs.extend(tz)
dayjs.extend(utc)

function viteLogTime() {
  let config: ResolvedConfig
  let version: string

  const currentTime = dayjs().tz("Asia/Shanghai").format("YYYY-MM-DD HH:mm:ss")
  
  return {
    name: 'vite-log-time',
    configResolved(_config) {
      config = _config
      const require = createRequire(import.meta.url)
      version = require(path.resolve(config.root, 'package.json')).version
    },
    transform(code, id) {
      if(id.endsWith('src/main.tsx')) {
        const info = {
          mode: config.mode,
          currentTime,
          version,
        }
        return {
          code: `
            console.log('构建信息:', '${JSON.stringify(info)}')
            ${code}
          `,
          map: null
        }
      }
    },
  }
}
```

启动项目后，就可以看到控制台打印了信息！

![](https://cdn.nlark.com/yuque/0/2025/png/1447731/1739505366815-d40f922e-4d26-477a-987f-423edab75f6f.png)

还有个 `transformIndexHtml`钩子，咱们也试试

```typescript
import path from 'path'
import { defineConfig, PluginOption, ResolvedConfig } from 'vite'
import { createRequire } from 'module'
import dayjs from 'dayjs'
import tz from 'dayjs/plugin/timezone'
import utc from 'dayjs/plugin/utc'

dayjs.extend(tz)
dayjs.extend(utc)

function viteLogTime() {
  let config: ResolvedConfig
  let version: string

  const currentTime = dayjs().tz("Asia/Shanghai").format("YYYY-MM-DD HH:mm:ss")
  
  return {
    name: 'vite-log-time',
    configResolved(_config) {
      config = _config
      const require = createRequire(import.meta.url)
      version = require(path.resolve(config.root, 'package.json')).version
    },
    transformIndexHtml() {
      const info = {
        mode: config.mode,
        currentTime,
        version,
      }
      return [
        {
          tag: 'script',
          attrs: {
            type: 'module',
          },
          children: `console.log('构建信息:', '${JSON.stringify(info)}')`,
        },
      ]
    }
  }
}
```

这样也能打印构建信息。

这是一个非常简单的例子，但也能从中看出，vite插件可以通过魔改注入代码，来解决纯前端无法实现的点。

## 文件操作
在node环境中，我们可以大展身手，开发最离不开的就是一个个代码文件，接下来我举个例，通过vite环境操作文件来提升开发效率

TikTok被ban的时候，小红书融入了大量的歪果仁，那时候小红书迫切的需求就是国际化。随着业务扩展，国际化越来越流行，我目前也主要是负责的国际化项目。

国际化，无非就是两个字：翻译。说白了，也就是把本土语言，翻译成其他国家语言，放在语言文件中。

```typescript
import zhCommon from "./zh/common.json"
import zhHome from "./zh/home.json"
import enCommon from "./en/common.json"
import enHome from "./en/home.json"

const languages = ["en", "zh"] as const

const resources = {
	en: {
		common: enCommon,
    home: enHome
	},
	zh: {
		common: zhCommon,
    home: zhHome
	},
}
```

国际化资源一般是统一管理，所以也避免不了不断地导入语言json文件，每次新增翻译文件时，会做大量的重复工作。于是我想能不能做个vite插件来管理所有的国际化资源文件，让开发者从翻译文件中解脱！

核心思路就是 收集指定目录中的语言文件，然后通过虚拟文件的方式让前端可导入。

这里就简单写点伪代码，完整代码在这里：[github](https://github.com/hemengke1997/vite-plugin-i18n-ally)

```typescript
export function i18nAlly(options?: I18nAllyOptions): PluginOption {

  // 一个可以收集用户指定目录下的所有翻译文件的探测器实例
  const localeDetector = new LocaleDetector(options)

  let server: ViteDevServer

  return {
    name: 'vite:plugin-i18n-ally',
    enforce: 'pre',
    async config() {
      // 初始化翻译文件探测器
      await localeDetector.init()
    },
    // 此hook可用于虚拟文件，参考vite官方文档
    async resolveId(id: string, importer: string) {
      const { virtualModules, resolvedIds } = localeDetector.localeModules

      if (id in virtualModules) {
        return VirtualModule.resolve(id) // 例如： \0/@i18n-ally/virtual:i18n-ally-en
      }

      return null
    },
    async load(id) {
      const { virtualModules, resolvedIds, modules, modulesWithNamespace } = localeDetector.localeModules
      if (id.startsWith(VirtualModule.resolvedPrefix)) {
        const idNoPrefix = id.slice(VirtualModule.resolvedPrefix.length)

        const resolvedId = idNoPrefix in virtualModules ? idNoPrefix : resolvedIds.get(idNoPrefix)

        // e.g. \0/@i18n-ally/virtual:i18n-ally-en
        // 如果是翻译虚拟文件，则返回探测到的文件内容
        if (resolvedId) {
          const module = virtualModules[resolvedId]
          return typeof module === 'string' ? module : `export default ${JSON.stringify(module)}`
        }
      }
      return null
    },
  } as PluginOption
}

```

然后在前端，通过导入虚拟文件，就可以获取到翻译资源了。

这个例子相对比较复杂一点，但核心就是告诉新手朋友们，你们也在遇到类似的大量重复工作时，也可以尝试通过vite插件来提升开发效率、减少维护负担

## 文件路由
通常是在一个上层框架才会集成文件路由，比如nextjs、remix、nuxt这些。文件系统路由相比配置式路由来说，也是减少了大量重复开发工作，而且使项目结构更加清晰，很大程度上增强了项目的维护性，如果你们既使用nextjs/remix这种ssr框架，又有普通的vite单页面项目，那么统一的文件系统路由，也能对其项目之间的开发习惯。

我是从 react-router 6.4 引入 data api 之后，开始尝试在单页面项目中引入文件系统路由。为什么呢？如果你熟悉 react-router 的话，会发现想要利用好 data-api，最好的实践就是像remix那样，在路由文件中导出data api。如果你不了解的话，也无所谓，接下来也是单纯对文件系统路由做分析思考以及提出解决方案。



文件路由，实际上就是在node层，收集到所有的路由文件，然后组装成前端路由库所需要的数据格式，交由前端路由。

插件相对也是比较复杂，完整代码在此处：[github](https://github.com/hemengke1997/vite-plugin-remix-flat-routes)

贴一下伪代码：

```typescript
import type * as Vite from 'vite'

function remixFlatRoutes(options: Options = {}): Vite.PluginOption {
  return [
    {
      name: 'vite-plugin-remix-flat-routes',
      // 前端通过虚拟文件导入组装好的路由结构
      async resolveId(id) {
        if (id === 'virtual:route') {
          return '\0virtual:route'
        }
        return null
      },
      async load(id) {
        switch (id) {
          case '\0virtual:route': {
            // 遍历项目文件，找到路由文件，并进行组装
            const routes = findRoutes()

            const { routesString, componentsString } = await routeUtil.stringifyRoutes(routes)

            return {
              code: `import React from 'react';
                ${componentsString}
                export const routes = ${routesString};
              `,
              map: null,
            }
          }

          default:
            break
        }

        return null
      },
    },
  ]
}
```

这个例子的核心也是通过nodejs解析到前端所需要的数据，然后通过虚拟文件的形式暴露给前端，让前端拥有了更强大的运行时能力。





# 总结
上文讲到的，其实都是业务相关的插件，当然vite也有很多构建时插件，比如代码zip压缩、代码分析等，这些我认为不适合在入门时学习，因为大部分前端开发其实都是在跟业务打交道。

在我写了不少的vite插件后，我总结了以下经验

1. 先知道自己想做什么插件，然后再去实践
2. 如果你刚接触vite插件，或许你最头疼的是什么时候用什么钩子，其实当你知道你需要解决什么问题的时候，再去翻文档，或者查AI，很快就能得到答案
3. 在vite插件中，前端代码不过是“字符串”，随便你怎么添加删除修改都可以，不要害怕代码改了就会出问题
4. 多看入门级插件代码，比如 vite-plugin-html, vite-plugin-legacy，这些库或许可以让你明白什么钩子在什么场景下使用



以下是我写的一些vite插件，可供学习参考：

+ [vite-plugin-i18n-ally](https://hemengke1997.github.io/vite-plugin-i18n-ally/zh/)。自动懒加载 i18n 资源
+ [vite-plugin-remix-flat-routes](https://hemengke1997.github.io/vite-plugin-remix-flat-routes/zh/)。remix-flat-routes风格的文件系统路由
+ [vite-plugin-public-typescript](https://hemengke1997.github.io/vite-plugin-public-typescript/zh/)。注入 TypeScript 到 HTML 中
+ [vite-plugin-prerelease](https://github.com/hemengke1997/vite-plugin-prerelease)。动态切换至预发布/正式环境
+ [vite-plugin-istanbul-widget](https://github.com/hemengke1997/istanbul-toolkit/tree/master/packages/vite-plugin-istanbul-widget)。前端代码覆盖率上报工具
