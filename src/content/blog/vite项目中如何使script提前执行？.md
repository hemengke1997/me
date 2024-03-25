---
title: "vite项目中如何使script提前执行？"
summary: "一个很简单但是大部分人都不知道的技巧"
date: "2024-03-22"
draft: false
tags:
- vite
---

## 前言
相信大家都遇到过这么个场景，就是某些script代码需要在业务代码执行之前执行
通俗来说，就是在框架 如 ReactDOM.render，或者 Vue.mount 之前执行一些script代码
## 解决方案
看到这里的你会觉得：这个问题很好解决，不就是把script标签放在header上吗
```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Document</title>
    <script>这里写一些代码，比如设置html字体大小</script>
  </head>
  <body>


    <script src="/src/main.ts"></script>
  </body>
</html>
```
可是在typescript大行其道的时代，硬写js并不是一个稳健的选择。
在vite中，我们可以写typescript脚本，直接放在html中即可。因为vite会从index.html作为入口打包，所以html中的ts也会被构建打包。
很简单：
```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Document</title>
+   <script src="/some-scripts/hello-world.ts"></script>
  </head>
  <body>


    <script src="/src/main.ts"></script>
  </body>
</html>
```
当vite解析到  `/some-scripts/hello-world.ts` 这个脚本时，会自然经过vite的处理，即使代码中包含了三方库，也会被vite通通处理

hello-world.ts
```typescript
console.log('hello world!')
console.log(import.meta.env, 'import.meta.env')
```
vite 运行起来看看打印结果：
![image.png](https://cdn.nlark.com/yuque/0/2024/png/1447731/1711073026350-b118619e-5e02-437e-9baf-12b07e3e8083.png#averageHue=%232a2a2a&clientId=u7433d92c-6b2f-4&from=paste&height=215&id=u33f08b19&originHeight=430&originWidth=1116&originalType=binary&ratio=2&rotation=0&showTitle=false&size=69358&status=done&style=none&taskId=u2409e950-5b98-4cbe-8dc2-9cf6b6785cd&title=&width=558)
而这些代码，是在我们的App被挂载之前执行的，这样做的意义是什么呢？
假设你的网页需要做rem适配，如果在 useEffect 中设置字体，在进入页面的一瞬间，网页字体是原始的 `16px` ，而在DOM挂载后，才设置html字体大小，导致网页短暂的变形（如果网页原始字体跟当前页面分辨率应该展示的字体不同的情况下）
### 打包
可以看到，执行顺序也是ok的
![image.png](https://cdn.nlark.com/yuque/0/2024/png/1447731/1711074029217-efbd500c-338f-4338-bae4-f9bd09e23f6c.png#averageHue=%2323282f&clientId=u7433d92c-6b2f-4&from=paste&height=126&id=ue45fb5a1&originHeight=252&originWidth=1152&originalType=binary&ratio=2&rotation=0&showTitle=false&size=75738&status=done&style=none&taskId=u98c74bc2-06d4-4fe2-9d9d-9f10b006fc6&title=&width=576)
但是打包后，在没有手动拆包的情况下，代码都打到一起去了
一般来说，需要提前执行的代码，几乎不会有变动，所以我们最好是手动拆包，这样有利于缓存
```typescript
// https://vitejs.dev/config/
export default defineConfig(() => ({
  define: {
    custom_define: JSON.stringify('custom define!'),
    hello_world: JSON.stringify({ hello: 'world' }),
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          if (id.includes('some-scripts/hello-world.ts')) {
            return 'hello-world'
          }
        },
      },
    },
  },
}))
```
然后重新打包，看看结果：
![image.png](https://cdn.nlark.com/yuque/0/2024/png/1447731/1711074272385-96435aaf-cdba-4c28-bbed-b3b162b255a6.png#averageHue=%2323272d&clientId=u7433d92c-6b2f-4&from=paste&height=127&id=uf25c6fe6&originHeight=254&originWidth=550&originalType=binary&ratio=2&rotation=0&showTitle=false&size=24426&status=done&style=none&taskId=uc98ef322-e750-47af-a31d-af2c92402d5&title=&width=275)![image.png](https://cdn.nlark.com/yuque/0/2024/png/1447731/1711074382629-ff49bc51-c50d-4f59-8d73-0a4e695f3fc8.png#averageHue=%2324282f&clientId=u7433d92c-6b2f-4&from=paste&height=656&id=ue291f386&originHeight=1312&originWidth=1524&originalType=binary&ratio=2&rotation=0&showTitle=false&size=167849&status=done&style=none&taskId=u7ac637b8-39cb-4a56-a84c-3fd1f85b290&title=&width=762)
然后 vite preview 看看效果（这是打包后的效果）：
![image.png](https://cdn.nlark.com/yuque/0/2024/png/1447731/1711074874222-92c483cb-41a9-4f5f-9244-f4585b02911e.png#averageHue=%232a2a2a&clientId=u7433d92c-6b2f-4&from=paste&height=257&id=ued350e84&originHeight=514&originWidth=1068&originalType=binary&ratio=2&rotation=0&showTitle=false&size=82271&status=done&style=none&taskId=u18f6d951-cfdc-4559-9b82-76450be7b81&title=&width=534)
看到这里你可能会疑惑，index.html中明明是 index.js 在 hello-world.js 之前，打印顺序怎么还是hello-word先执行呢？
因为 index 中引入了 hello-world，而 link modulepreload 是告诉浏览器，预加载一个 JavaScript 模块，但并不执行它。
![image.png](https://cdn.nlark.com/yuque/0/2024/png/1447731/1711074986282-ad29f5fb-7ea0-4564-a4b1-b69ee35b5a04.png#averageHue=%23252b33&clientId=u7433d92c-6b2f-4&from=paste&height=252&id=u36ba23bb&originHeight=504&originWidth=1070&originalType=binary&ratio=2&rotation=0&showTitle=false&size=102711&status=done&style=none&taskId=u0ebdf297-673d-40a2-bd4c-c9492e618eb&title=&width=535)

### 兼容性处理
正式构建时，我们通常需要做代码兼容，在vite中，我们使用 @vitejs/pliugin-leagcy 做传统浏览器兼容，关于这个vite插件，不了解的同学可以看我的[另一篇文章](https://juejin.cn/post/7165493414048301070)
在这里，我们直接引入legacy插件，看看效果即可
```typescript
import legacy from '@vitejs/plugin-legacy'
import { defineConfig } from 'vite'

// https://vitejs.dev/config/
export default defineConfig(() => ({
  define: {
    custom_define: JSON.stringify('custom define!'),
    hello_world: JSON.stringify({ hello: 'world' }),
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          if (id.includes('some-scripts/hello-world.ts')) {
            return 'hello-world'
          }
        },
      },
    },
  },
  // 使用legacy插件做传统浏览器兼容
  plugins: [legacy()],
}))
```
打包后可以看到 hello-world 也打了一个legacy包，完全OK！
![image.png](https://cdn.nlark.com/yuque/0/2024/png/1447731/1711075485409-b7f6ed45-340d-4492-9f2a-8a30ac5f56cd.png#averageHue=%23272b32&clientId=u7433d92c-6b2f-4&from=paste&height=160&id=uab14c944&originHeight=320&originWidth=560&originalType=binary&ratio=2&rotation=0&showTitle=false&size=40530&status=done&style=none&taskId=u8a981143-f327-4e60-b910-0db8e7e8fc7&title=&width=280)

### 小总结
至此，我们对目前普遍的 spa vite项目做了一遍处理，那对于ssr项目，又该如何处理呢？
## SSR服务端渲染处理
SSR项目目前主要有两种形式：

1. 动态返回html字符串或stream流
2. 根据html文件解析后返回

普遍来说，SSR框架都是第一种形式，比如Astro，Nuxt，
上文说的解决方案处理第二种情况，我们先抛开SSR框架，用原生的vite来做SSR，看看结果如何
我们先用模板命令生成一个vite SSR项目
```bash
pnpm create vite-extra
```
![image.png](https://cdn.nlark.com/yuque/0/2024/png/1447731/1711078251221-3f145085-c7d2-4e07-8554-997123c7740c.png#averageHue=%23252931&clientId=u7433d92c-6b2f-4&from=paste&height=192&id=u44bda239&originHeight=384&originWidth=936&originalType=binary&ratio=2&rotation=0&showTitle=false&size=37408&status=done&style=none&taskId=u9dd8a6f6-6231-42bc-9e30-04f4131777b&title=&width=468)
这里我选择纯原生的，能最大程度简化教程的复杂度
生成好了之后，我们直接往index.html添加typescript文件，试试能否生效：
老套路了
```html
<!doctype html>
<html lang="en">

  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>ssr</title>
    <script type="module" src="/some-scripts/hello-world.ts"></script>

  </head>

  <body>
    <div id="app"><!--app-html--></div>
    <script type="module" src="/src/entry-client.tsx"></script>
  </body>

</html>
```
### 开发环境
启动！查看浏览器打印台，没问题！
![image.png](https://cdn.nlark.com/yuque/0/2024/png/1447731/1711078415303-82e25c56-574a-4a0e-a3ab-d2da80b05bd9.png#averageHue=%23292929&clientId=u7433d92c-6b2f-4&from=paste&height=216&id=uc1de0921&originHeight=432&originWidth=866&originalType=binary&ratio=2&rotation=0&showTitle=false&size=42185&status=done&style=none&taskId=u29de06e4-79f9-491d-bc7d-386cd61d83e&title=&width=433)
### 生产环境
打包后预览再看看效果：
![image.png](https://cdn.nlark.com/yuque/0/2024/png/1447731/1711078474199-04df09f7-ebbd-46d9-b080-f239d18312e0.png#averageHue=%232a2a2a&clientId=u7433d92c-6b2f-4&from=paste&height=183&id=uc4ab727d&originHeight=366&originWidth=904&originalType=binary&ratio=2&rotation=0&showTitle=false&size=40200&status=done&style=none&taskId=u41148019-6956-41c4-b4f5-7dbab680a62&title=&width=452)
也没问题！
### 分包
同样的，我们也分包，做好缓存效果
```typescript
import { defineConfig } from 'vite'

export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          if (id.includes('some-scripts/hello-world.ts')) {
            return 'hello-world'
          }
        },
      },
    },
  },
})
```
构建之后，可以看到分包成功了
![image.png](https://cdn.nlark.com/yuque/0/2024/png/1447731/1711078667875-238cb45b-7924-473f-8ea9-629257494251.png#averageHue=%23252a30&clientId=u7433d92c-6b2f-4&from=paste&height=148&id=ub84baa5f&originHeight=296&originWidth=498&originalType=binary&ratio=2&rotation=0&showTitle=false&size=28062&status=done&style=none&taskId=uce9758cf-4920-4975-95b7-1d68e071ad1&title=&width=249)
### 兼容性处理
引入 `@vitejs/plugin-legacy`插件，打包。看看结果：
![image.png](https://cdn.nlark.com/yuque/0/2024/png/1447731/1711079081524-6d4d1a44-c9cb-4624-ae8c-9039ef0033b4.png#averageHue=%23282d33&clientId=u7433d92c-6b2f-4&from=paste&height=241&id=u78602a18&originHeight=482&originWidth=544&originalType=binary&ratio=2&rotation=0&showTitle=false&size=52296&status=done&style=none&taskId=uaf6bf78a-ad88-4794-8f0e-b7ab4a8a1f1&title=&width=272)
ok，构建后运行也没问题
### SSR框架
SSR框架通常是没有html文件的，都是动态返回html字符串或者string，这种情况下，我们无法从html入口下手
推荐使用 [vite-plugin-public-typescript](https://github.com/hemengke1997/vite-plugin-public-typescript/)
使用方式：
```typescript
import { defineConfig } from 'vite'
import { injectScripts, publicTypescript } from 'vite-plugin-public-typescript'

// https://vitejs.dev/config/
export default defineConfig(() => ({
  define: {
    custom_define: JSON.stringify('custom define!'),
    hello_world: JSON.stringify({ hello: 'world' }),
  },
  plugins: [
    publicTypescript({
      destination: 'file',
    }),
  ],
}))
```
这个插件会默认读取根目录下的 `public-typescript`文件目录，然后解析所有的typescript文件，并构建成js。
有两种方式引用ts文件
#### 其一是在vite配置中
```typescript
import { defineConfig } from 'vite'
import { injectScripts, publicTypescript } from 'vite-plugin-public-typescript'

// https://vitejs.dev/config/
export default defineConfig(() => ({
  define: {
    custom_define: JSON.stringify('custom define!'),
    hello_world: JSON.stringify({ hello: 'world' }),
  },
  plugins: [
    publicTypescript(),
    // 在这里通过 injectScrpts 把代码插入到最后的html中
    injectScripts((manifest) => [
      {
        attrs: { src: manifest['hello-world'] },
        injectTo: 'head',
      },
    ]),
  ],
}))

```
#### 其二直接引入manifest
```typescript
import { manifest } from 'vite-plugin-public-typescript/client'

console.log(manifest['hello-world'])
```

这个manifest里面包含了js对应的资源地址
![image.png](https://cdn.nlark.com/yuque/0/2024/png/1447731/1711086218953-d0a41a2c-1297-4970-a460-da0f83473913.png#averageHue=%23303030&clientId=u7433d92c-6b2f-4&from=paste&height=53&id=u66171f1e&originHeight=106&originWidth=1304&originalType=binary&ratio=2&rotation=0&showTitle=false&size=40906&status=done&style=none&taskId=u27ee97b6-2e36-4a79-a8ca-a64f6950388&title=&width=652)
![image.png](https://cdn.nlark.com/yuque/0/2024/png/1447731/1711086270207-b0a597a6-0fef-47ac-9ffd-ca807a1cd289.png#averageHue=%23c47745&clientId=u7433d92c-6b2f-4&from=paste&height=117&id=u933f9fef&originHeight=234&originWidth=1464&originalType=binary&ratio=2&rotation=0&showTitle=false&size=68821&status=done&style=none&taskId=u523acf56-352d-4130-9287-29387cc4d04&title=&width=732)
## 总结
希望把某些script在页面挂载前执行，在大部分情况下，在 index.html 中直接写 script ts 就可以了，少部分ssr的情况下，可以使用 [vite-plugin-public-typescript](https://github.com/hemengke1997/vite-plugin-public-typescript) 插件辅助
