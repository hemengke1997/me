---
title: "@vitejs/plugin-legacy 原理介绍"
date: "2022-11-14 22:03:17"
draft: false
tags:
- vite
- vite插件
---

# 简介
`vite` 的runtime是基于 [native ESM](https://caniuse.com/es6-module) 的，所以如果开发者需要打包代码在 **传统浏览器 **or **兼容性差的浏览器版本，**就需要用到此插件
**tip** 此插件暂时不支持动态返回html，如部分ssr插件。
因为该插件的核心原理是打包后在 index.html 静态文件中注入 scripts， 而大部分ssr是动态返回html
文章末有如何在ssr项目中添加legacy功能的项目链接
# 前提
## 什么是polyfill
简单来说，polyfill就是兼容旧浏览器的代码块，磨平差异。比如说 有的浏览器不支持 `globalThis`, 那我们可以自己实现一个globalThis然后注入到script中
注意：`polyfill`和`代码编译(renderLegacyChunks)`是两个概念， 前者是添加额外的代码来使得旧浏览器支持某些特性，后者是把浏览器不认识的语法转化为可以运行的语法
vite的polyfill分为 `modern polyfill`(modernPolyfills属性)和 `legacy polyfill`(polyfills属性)，之所以区分开来，是为了尽量减少polyfills的大小
### modern polyfill
在`plugin-legacy`中，`modernPolyfills`是针对现代浏览器的polyfill，比如，我们可以设置
```typescript
legacy({
  renderLegacyChunks: false,
  modernPolyfills: ['es.global-this'],
}),
```
这样就只会打包出针对现代浏览器的polyfill，而不会生成传统的polyfill ![image.png](https://cdn.nlark.com/yuque/0/2022/png/1447731/1668342937241-2bb9c7ce-adfe-49df-84f4-ae07647aa067.png#averageHue=%23262f3a&clientId=u9ca95602-787a-4&from=paste&height=21&id=u1bf94015&originHeight=21&originWidth=168&originalType=binary&ratio=1&rotation=0&showTitle=false&size=2340&status=done&style=none&taskId=uc90b971d-f5f5-47b5-83e8-8f83ecf0371&title=&width=168)
来专门针对现代浏览器 `globalThis`做polyfill，如果设置为true的话，vite 会根据打包代码，使用 `babel`针对`esmodule`的浏览器使用`useBuiltin`来生成polyfill，这是激进的做法，可能会有许多不需要的polyfill生成从而导致polyfill体积变大
如果设置 `modernPolyfills`为数组的话，`plugin-legacy`会使用vite内部的build方法(vite.build)，使用虚拟模块打包
```typescript
// 虚拟模块
const polyfillId = '\0vite/legacy-polyfills'

function polyfillsPlugin(
  // 用户设置的modernPolyfills
  imports: Set<string>,
  excludeSystemJS?: boolean
): Plugin {
  return {
    name: 'vite:legacy-polyfills',
    resolveId(id) {
      if (id === polyfillId) {
        return id
      }
    },
    load(id) {
      if (id === polyfillId) {
        return (
          [...imports].map((i) => `import "${i}";`).join('') +
          (excludeSystemJS ? '' : `import "systemjs/dist/s.min.js";`)
        )
      }
    }
  }
}
```
然后在`generateBundle`阶段把这个polyfillchunk加入到最后生成的bundle中
### legacy polyfill
在 `plugin-legacy`中，`polyfills`是针对传统浏览器的polyfill，比如：
```typescript
legacy({
  renderLegacyChunks: true,
  polyfills: ['es.global-this'],
}),
```
这样就会打包出一个传统的polyfill，![image.png](https://cdn.nlark.com/yuque/0/2022/png/1447731/1668342902487-3bf286ea-5816-4e09-9899-4cd4d4637b82.png#averageHue=%23252d37&clientId=u9ca95602-787a-4&from=paste&height=26&id=u714828c6&originHeight=26&originWidth=213&originalType=binary&ratio=1&rotation=0&showTitle=false&size=2994&status=done&style=none&taskId=ua694aed8-4406-426a-965a-9c01f095b80&title=&width=213)
legacyPolyfill跟modernPolyfill的功能是一样的，他们的区别仅仅在于语法，就如上文所讲到的代码编译
开启了 `renderLegacyChunks`才会代码编译生成 legacy chunk
## 了解 [browserslist](https://github.com/browserslist/browserslist)
js兼容/css兼容，都需要告诉打包工具，需要兼容到哪些浏览器
`browserslist`这个工具是用来指定浏览器范围的工具，在 `postcss`/`[babel](https://babeljs.io/docs/en/babel-preset-env#browserslist-integration)`中普遍使用。
我们可以在 `.browserslistrc`中指定需要兼容的浏览器范围，然后设置到 `plugin-legacy`中。这样就可以统一js/css打包目标了。
```typescript
import browserslist from 'browserslist'
import legacy from '@vitejs/plugin-legacy'

const browserslistConfig = browserslist.loadConfig({ path: '.' })

legacy({
  targets: browserslistConfig,
})
```
```typescript
defaults
last 2 versions
> 1%
not dead
```
可以在这个网站比较方便查看目标浏览器范围百分比： [https://browsersl.ist/](https://browsersl.ist/)
### 一个疑问
`plugin-legacy`内置的对 `browserslist`的 探测没有生效，`ignoreBrowserslistConfig`设置了没用，因为 `plugin-legacy`默认了 `targets`，`babel`会优先读取 `targets`然后再从`browserslist`配置里面去找。我觉得这是个bug，开发者只能手动设置targets，而不能探测browserslist配置
**2022/11/14 更新**
`ignoreBrowserslistConfig`无效，确实是bug
[https://github.com/vitejs/vite/issues/2476](https://github.com/vitejs/vite/issues/2476)
### 新手迷惑点
在 `browserslist`配置中，咱们可以这样写:
```typescript
Chrome >= 64
```
在配置 `babel: target`时，
```json
{
  "targets": {
    "chrome": "64",
  }
}
```
在 `plugin-legacy`中，只要认 `browserslist`的[写法](https://github.com/browserslist/browserslist#full-list)即可
# 什么是传统浏览器
传统浏览器一般指不支持 native ESM 的浏览器，如chrome<60，Edge<15，Firefox<59 等等，如果使用vite打包而不做任何的处理的话，是无法在这些浏览器上面运行的，因为打包出来的代码是 [很新的规范](https://cn.vitejs.dev/guide/build.html#browser-compatibility)。
开发者则需要使用此插件配置相应的兼容处理，如：
```jsx
// vite.config.js
import legacy from '@vitejs/plugin-legacy'

export default {
  plugins: [
    legacy({
      targets: ['chrome < 60', 'edge < 15'],
      renderLegacyChunks: true,
    })
  ]
}
```
# plugin-legacy 参数
文档里面都有介绍，我就不多比比了，讲一下里面不常用的
## additionalLegacyPolyfills
针对传统浏览器的额外polyfills，之所有有这个字段，是因为 `plugin-legacy`内部只包含了`core-js`相关的polyfills，如果开发者希望添加非corejs的polyfill，就加在这个字段里面
## renderLegacyChunks
简单来说就是是否编译传统代码。true的话会编译一份额外的针对传统浏览器(不支持esm的浏览器)的代码。
vite是怎么区分什么时候使用 legacyChunk呢？很简单
```jsx
<script nomodule src="legacy.js"></script>
```
## externalSystemJS
开启这个选项会把 `systemjs`从 legacyPolyfills中排除。
由于 `plugin-legacy`内部是使用 rollup的`format: 'system'`打包的，所以如果systemjs移除了需要开发者自己添加
## ignoreBrowserslistConfig (v5.0.0已废弃此选项)
`plugin-legacy`使用 `babel`来打包 `legacy chunk`，`babel`天然支持 `browserslist`，所以 `plugin-legacy`暴露了这个配置来指定打包 `legacy chunk`时的浏览器范围
**2022/11/14 更新**
`ignoreBrowserslistConfig`无效
[https://github.com/vitejs/vite/issues/2476](https://github.com/vitejs/vite/issues/2476)


# 如何在ssr项目中实现legacy功能？
[vite-react-ssr-boilerplate/legacy.ts at master · hemengke1997/vite-react-ssr-boilerplate](https://github.com/hemengke1997/vite-react-ssr-boilerplate/blob/master/server/legacy.ts)
