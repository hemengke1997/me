---
title: "vite项目国际化，看这篇就够了"
summary: ""
date: "2025-03-20"
draft: false
tags:
- vite
---

随着时代发展，越来越多出海项目出现。tiktok被封，小红书涌入一大波难民，此时呼声最大的就是“翻译功能”。管中窥豹，可见一斑，全球型项目必须把国际化做好

接下来，我将使用 i18next，react-i18next，和一个基于vite的项目，教会你国际化的最佳姿势。如果你使用vue，也不用急着退出去，国际化的思想是相通的，跟语言框架无关

为了让大家对国际化有更深刻的理解，我会一步一步调整姿势，请看到最后哦～



# 入门阶段
## 安装vscode插件
如果你使用vscode开发国际化项目，请务必安装 `i18n-ally`插件！

然后在 `.vscode/settings.json`添加插件的配置，比如：

```json
{
  "i18n-ally.localesPaths": ["src/locales"], // 国际化资源所在目录
  "i18n-ally.pathMatcher": "{locale}.json", // 匹配规则，这样就能匹配到 src/locales/en.json
  "i18n-ally.keystyle": "nested", // 嵌套对象
  "i18n-ally.enabledFrameworks": ["react", "i18next"], // i18n-ally需要语言框架的语法
  "i18n-ally.sourceLanguage": "zh", // i18n-ally 显示给开发者看的语言，对应 {locale}
}
```

## 创建项目
我们先创建vite项目，使用命令

```bash
npm create vite i18n-demo
```

然后安装国际化依赖

```bash
pnpm i i18next react-i18next i18next-browser-languagedetector
```

## 添加翻译资源
假设我们只有中文和英文，我们就创建两个json文件，一个命名 en.json，一个命名 zh.json。（入门阶段不用考虑把资源按照命名空间做文件分割）

为什么用json呢？因为json是一种轻量级的数据交换格式，且广泛支持、易于维护。当然，也可以使用其他的文件类型，入门就选择最简单的方式

此时我们的 locales 目录中就有两个资源文件了。我们给里面添加一些翻译

```json
{
  "home": {
    "hello": "Hello"
  },
  "user": {
    "name": "Name"
  }
}
```

```json
{
  "home": {
    "hello": "你好"
  },
  "user": {
    "name": "名字"
  }
}
```

这里的 `home`是命名空间，用于做资源区分的，翻译文件的优化其实就是在命名空间上做文章

接下来我们需要把这些资源告诉 i18next，让它来管理我们的国际化资源

```tsx
import { initReactI18next } from 'react-i18next'
import i18next from 'i18next'
import en from './en.json'
import zh from './zh.json'

// 初始化i18next
i18next.use(initReactI18next).init({
  // 把资源文件放在 resources 中
  resources: {
    en,
    zh,
  },
  ns: ['home', 'user'], // 命名空间
  nsSeparator: '.', // 命名空间分隔符。比如 'home.hello' 对应的 home: { hello: '...' }
  keySeparator: '.', // 符号分割key，比如 'home.nest.key' 对应的 home: { nest: { key: '...' } }
  interpolation: {
    escapeValue: false, // react已经做了xss防护
  },
  // 默认语言。如果没有对应的语言，就使用en
  fallbackLng: ['en'],
  debug: import.meta.env.DEV, // 开发阶段开启debug
})
```

这是最基础的初始化，然后我们需要在入口文件中引入此文件，确保在框架渲染前完成初始化，避免看到一堆没有翻译的乱码

```tsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import './locales' // 引入即可

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
```

准备工作完毕，我们可以在项目中使用国际化了！

```tsx
import { useTranslation } from 'react-i18next'
import './App.css'

function App() {
  const { t } = useTranslation()

  return <>{t('home.hello')}</>
}

export default App
```

如果你的 i18n-ally 插件配置成功，那么编辑器中会这样显示：

![](https://cdn.nlark.com/yuque/0/2025/png/1447731/1742460222850-636769eb-c74e-4a60-9304-29da7a8185f2.png)

然后我们启动项目，不出意外，屏幕中间会显示 Hello 了。

## 语言探测
因为没有告诉 i18next，当前是什么语言，所以它会优先显示 fallbackLng 对应的翻译。

我们需要安装 `i18next-browser-languagedetector`，然后：

```tsx
import LanguageDetector from 'i18next-browser-languagedetector'

i18next
  // 添加探测能力
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    // 设置探测规则
    detection: {
      // 探测优先级，最前面的优先级最高
      order: ['querystring', 'cookie', 'localStorage'],
      // 把语言缓存到cookie和localStorage中
      caches: ['cookie', 'localStorage'],
      // 探测url的query参数中的lang
      lookupQuerystring: 'lang',
      // 探测localStorage中的lang字段
      lookupLocalStorage: 'lang',
      // 探测cookie中的lang字段
      lookupCookie: 'lang',
    },
    // ...
  })

```

然后我们启动项目后，在url后面添加 `?lang=zh`，就可以看到 “你好” 了

# 命名空间分割文件
在上文中，我们把一个语言的所有翻译都放在一个json文件中，这样不仅不利于维护，也不利于优化。

如果只有一个文件，可能会有这些问题

+ 在协同开发的时候，可能都会改动同一个文件，导致git冲突
+ 首次加载资源大，导致响应慢

所以，我们通常会把资源按命名空间分成多个json。接下来我们做一些调整

### i18n-ally 配置调整
```json
{
  "i18n-ally.pathMatcher": "{locale}/{namespaces}.json", // 匹配规则，这样就能匹配到 src/locales/home.json
  "i18n-ally.namespace": true, // 启用命名空间
}
```

### 拆分翻译文件
在 locales 下新建 en 和 zh 的文件夹，然后把一个翻译json文件按命名空间拆成多个，我们的例子中，就需要把 en.json 拆成 home.json 和 user.json

### 修改i18next初始化代码
```tsx
import { initReactI18next } from 'react-i18next'
import i18next from 'i18next'
import en_home from './en/home.json'
import en_user from './en/user.json'
import zh_home from './zh/home.json'
import zh_user from './zh/user.json'

i18next.use(initReactI18next).init({
  resources: {
    en: {
      home: en_home,
      user: en_user,
    },
    zh: {
      home: zh_home,
      user: zh_user,
    },
  },
  // ...
})
```

然后启动项目，可以看到显示正常



但是这样非常麻烦的是，难道每次新增翻译，新增命名空间，我们都要加一大堆的 import 代码吗？

还好，vite提供了glob方法，可以按照规则把遍历到文件内容，于是改造成这样...

```tsx
import { initReactI18next } from 'react-i18next'
import i18next from 'i18next'

const resourcesOrigin = import.meta.glob('./**/*.json', {
  eager: true,
  import: 'default',
})

const resources: Record<string, any> = {}
const namespaces: Set<string> = new Set()

Object.keys(resourcesOrigin).forEach((k) => {
  const [_, locale, namespace] = /\.\/(.+?)\/(.+?)\.json/.exec(k) || []
  if (!resources[locale]) {
    resources[locale] = {}
  }
  if (namespace) {
    namespaces.add(namespace)
  }
  resources[locale][namespace] = resourcesOrigin[k]
})

i18next.use(initReactI18next).init({
  resources,
  ns: Array.from(namespaces),
  // ...
})
```

一劳永逸了！但是有人要问了，主播主播，你不是说拆了命名空间可以优化加载速度吗？现在也是全部加载的呀

那我就要说了，我们可以根据语言和命名空间异步加载国际化资源文件！

# 进阶
## 按语言异步加载资源文件
上文中的所有代码都是同步的，因为我们要先把翻译文件拿到了，然后再开始渲染页面。

我们现在要做个优化，先获取语言，然后加载对应语言的翻译文件，然后再渲染页面。这样就只加载当前的语言包了

### 获取语言
上文中，我们已经给 i18next 添加了语言探测能力，所以可以从 i18next 对象中，获取到当前语言了

### 加载语言包
`import.meta.glob`有两种导入方式，开启 eager 后，是获取文件内容，关闭后，是返回一个获取文件内容的import函数，执行后即可加载文件内容

```tsx
import { initReactI18next } from 'react-i18next'
import i18next from 'i18next'
import LanguageDetector from 'i18next-browser-languagedetector'

const dynamicResources = import.meta.glob<Record<string, any>>('./**/*.json', {
  eager: false,
  import: 'default',
})

function loadResource(lang: string) {
  const resources: {
    namespace: string
    promise: () => Promise<Record<string, any>>
  }[] = []
  Object.keys(dynamicResources).forEach((key) => {
    const [k, ns] = new RegExp(`\.\/${lang}\/(.+?)\.json`).exec(key) || []
    if (k && ns) {
      resources.push({
        namespace: ns,
        promise: dynamicResources[key],
      })
    }
  })
  return { resources }
}

export async function initI18next() {
  i18next
    .use(LanguageDetector)
    .use(initReactI18next)
    .init({
      // 初始化时资源是空的
      resources: {},
      ns: [], // 命名空间
      // ...
    })

  const language = i18next.language
  const { resources } = loadResource(language)

  await Promise.all(
    resources.map(async ({ namespace, promise }) => {
      const data = await promise()
      i18next.addResourceBundle(language, namespace, data)
    }),
  )
}
```

### 渲染页面
还需要修改一下入口文件，先加载语言包，再渲染页面

```tsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import { initI18next } from './locales'
import './index.css'

initI18next().then(() => {
  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  )
})
```

## 按命名空间加载资源文件
通常来说，我们是用路由来做命名空间，比如 主页 的语言包，就放在 home 中，用户页的语言包，就放在 user 中。

也就是说，我们在路由加载前，获取路由信息中的命名空间加载语言包，然后再进入到对应的路由。

vue-router自带路由守卫，很容易实现此功能，把路由所需要的命名空间，写在 meta 中。react-router的话，只能在社区中找路由守卫的实现，不过思路都是一样的。

这个就留给大家自行实现吧～

# 最佳实践：vite插件
上文的实现中，还有些地方需要优化：

1. 我们使用的是json文件来存放语言包，那如果我想用 json5，yaml，ts，js 或者其他格式呢？
2. 自动fallback机制，如果语言包找不到，就去找默认语言包
3. 部分代码和 i18n-ally 冗余了，比如 `import.meta.glob`中的路径，以及正则匹配规则，实际上 i18n-ally 配置中就已经体现了

我开发了vite插件 [vite-plugin-i18n-ally](https://hemengke1997.github.io/vite-plugin-i18n-ally/zh/)，解决了以上问题，重要的是，这个库跟框架语言无关，react vue 都可以用

## 使用方式
这里介绍最简单的使用方式，也就是单语言包，不分割文件

安装好后，首先需要在vite的插件中加入

```tsx
import { defineConfig } from 'vite'
import { i18nAlly } from 'vite-plugin-i18n-ally'

export default defineConfig({
  plugins: [i18nAlly()],
})
```

默认插件会探测你的 i18n-ally 配置，包括 pathMatcher、localesPaths、namespace。这些字段也就是冗余的代码。



然后在入口文件中

```tsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import { initReactI18next } from 'react-i18next'
import i18next from 'i18next'
import { i18nAlly } from 'vite-plugin-i18n-ally/client'

const fallbackLng = 'en'

const { asyncLoadResource } = i18nAlly({
  // onInit hook 在i18nAlly初始化时调用，此时国际化资源还未加载
  async onInit({ language }) {
    // 这里也可以使用vue相关的i18n库
    i18next.use(initReactI18next).init({
      lng: language,
      resources: {}, // 空对象即可，资源会在onResourceLoaded hook中加载
      nsSeparator: '.',
      keySeparator: '.',
      fallbackLng,
    })
  },
  // onInited hook 在i18nAlly初始化完成后调用，此时国际化资源已首次加载完成
  onInited() {
    // 也可以是vue的render
    root.render(
      <React.StrictMode>
        { /* Your App */ }
      </React.StrictMode>,
    )
  },
  // onResourceLoaded hook 在资源加载完成后调用
  // 在这里我们需要将资源添加到i18next中
  onResourceLoaded: (resources, { language }) => {
    i18next.addResourceBundle(language, i18next.options.defaultNS[0], resources)
  },
  fallbackLng,
})
```

使用 vite-plugin-i18n-ally 还有个好处是，不需要额外安装语言探测库了。内置了完整的语言探测功能，并且功能更加强大

```tsx
i18nAlly({
  detection: [
    {
      detect: 'querystring',
      lookup: 'lang',
    },
    {
      detect: 'cookie',
      lookup: 'cookie-name',
      cache: true,
    },
    {
      detect: 'htmlTag',
      cache: false,
    },
  ],
})
```

### 添加资源文件
<font style="color:rgb(60, 60, 67);">在 </font>`src/locales`<font style="color:rgb(60, 60, 67);"> 目录下添加资源文件 </font>`en.json`<font style="color:rgb(60, 60, 67);">：</font>

```tsx
{
  "hello": "Hello, World!"
}
```

### 修改组件代码
```tsx
import { useTranslation } from 'react-i18next'

export default function Hello() {
  const { t } = useTranslation()

  return (
    <h1>
      {t('hello')}
    </h1>
  )
}
```

启动项目，就能看到翻译了！

可以看到，在代码中，看不到glob了，也不存在跟 i18n-ally 冗余的代码了。

# 最后
如果的vite项目中需要国际化能力，我建议使用vite插件的形式，最优雅最方便，也是最佳实践。

国际化思路跟语言框架无关，不论是react或是vue，思路是相同的，所以聪明的你一定会举一反三！（实际是因为我不会vue，溜了溜了



