---
title: "在vite中优雅插入三方脚本"
date: "2023-09-20 15:47:24"
draft: false
tags:
- vite
- vite插件
---


## 场景
不知各位是否遇到过以下痛点：

- 希望在页面加载前执行一些脚本。比如修改网页html字体大小、注入全局变量等
- 希望第三方脚本可以content-hash缓存
- 出于项目维护性考虑（或强迫症，比如本人），想把这些js脚本改造为ts
## 思考方案
为了解决以上痛点，我想到了以下的方案：
### 方案1
搞个脚本来编译ts，然后把输出的js文件放在项目的public文件夹，在html中直接通过绝对路径访问即可
这样做有一些缺点：

1. 如果希望生成的js带hash，那引用js的时候不得不使用硬编码
2. 执行编译操作的时机不好把控，可能会增加开发者的维护负担
3. 不容易跟vite hmr联动起来
### 方案2
借助vite强大的插件能力，解决以上缺点

1. 把指定目录中的ts编译成js，生成一个manifest清单。开发者只需根据清单来查找脚本然后自行注入js脚本，解决了硬编码的问题
2. 利用vite插件的某个合适hook中执行编译操作
3. 使用vite server的websocket，自行控制hmr

方案有了，开搞开搞
## 写vite插件
首先，我需要知道开发者指定哪个目录为ts的输入目录
在插件初始化的时候获取开发者输入的参数即可
```javascript
function publicTypescript(options: VPPTPluginOptions = {}) {
  const opts = {
    ...DEFAULT_OPTIONS, // 默认的配置
    ...options,
  }
}
```

然后，需要获取到vite的配置，比如 `root`/`publiDir` 等，适合做这件事的vite插件hook是 `configResolved`
然后结合开发者传入的配置，解析到输入的ts文件的地址，作为之后编译的入口使用
```javascript
let viteConfig: ResolvedConfig

async configResolved(c) {
    viteConfig = c
    // 解析项目的根目录
    const resolvedRoot = normalizePath(viteConfig.root ? path.resolve(viteConfig.root) : process.cwd())

    // 确保用户的ts输入目录存在，若不存在则创建
    fs.ensureDirSync(getInputDir(resolvedRoot, opts.inputDir))

    // 把ts输入目录下的ts全部获取
    const tsFilesGlob = await glob(getInputDir(resolvedRoot, opts.inputDir, `/*${TS_EXT}`), {
      cwd: resolvedRoot,
      absolute: true,
    })

    // 初始化全局配置
  	globalConfigBuilder.init({
      tsFilesGlob,
      viteConfig,
      ...opts,
    })
}
```

拿到了待编译的ts文件，那咱需要用到编译工具。使用 `esbuild` ，跟vite底层保持一致，而且 `esbuild` 速度很快
在vite的 `buildStart` 阶段编译即可
```javascript
async buildStart() {
  const { tsFilesGlob } = globalConfigBuilder.get()
  // 这个方法需要做的就是把ts全部编译成js
  // 具体代码就不贴了
  // 代码地址在：https://github.com/hemengke1997/vite-plugin-public-typescript/blob/master/src/helper/build.ts
  await buildAll(tsFilesGlob)
}
```
编译后使用把结果输出为js文件，然后写在 `public` 文件夹中
```javascript
async addNewJs(args: IAddFile): Promise<void> {
  const { code = '' } = args
  const {
    viteConfig: { publicDir },
  } = globalConfigBuilder.get()

  const outPath = this.setCache(args, globalConfigBuilder.get())

  const fp = normalizePath(path.join(publicDir, outPath))

  await fs.ensureDir(path.dirname(fp))

	// 写到disk
  writeFile(fp, code)
}
```
成功后可以在 `publicDir` 中看到编译后的js文件
![image.png](https://cdn.nlark.com/yuque/0/2023/png/1447731/1695108166646-001a46a0-1a86-41d4-b28c-b47f48066888.png#averageHue=%2323272e&clientId=u6ce4f4f5-360d-4&from=paste&height=135&id=u2ddb30b9&originHeight=270&originWidth=420&originalType=binary&ratio=2&rotation=0&showTitle=false&size=26073&status=done&style=none&taskId=u5f8a7af6-6fc4-4f87-85d0-79b495e6178&title=&width=210)

开发者如何引入这些js文件呢，总不能使用全路径 'file.contenthash.js' 这种方式引入吧，太硬核了。
如果你看到vite ssr的打包产物的话，你可能知道一个名为 `ssr-manifest`的json映射文件，其中就是把每个文件跟其依赖文件地址对应映射起来
那咱也搞个manifest文件来做映射，只需要在编译ts文件的时候，同时写一下manifest.json就可以了
最后的得到的效果是：
![image.png](https://cdn.nlark.com/yuque/0/2023/png/1447731/1695195184008-20d9eed9-75c9-4be3-9e65-bb7d17e287e0.png#averageHue=%2323272f&clientId=u3a49e1ce-320a-4&from=paste&height=116&id=u9cadd1fe&originHeight=232&originWidth=680&originalType=binary&ratio=2&rotation=0&showTitle=false&size=30885&status=done&style=none&taskId=u71022623-c3e0-45be-abbe-250a46fb05e&title=&width=340)
于是，咱可以在项目代码中使用 `manifest.xx`来引用对应的js文件了
配合vite的 `transformIndexHtml` hook，可以很方便地插入js
```javascript
import manifest from './public-typescript/manifest.json'


async transformIndexHtml(html) {
  const tags: HtmlTagDescriptor[] = [
    {
      tag: 'script',
      attrs: {
        'src': manifest.test,
      },
      injectTo: 'head-prepend',
    },
  ]
  return {
    html,
    tags,
  }
},
```

最后启动项目，就可以在控制台中看到相应的js请求了
![image.png](https://cdn.nlark.com/yuque/0/2023/png/1447731/1695195398531-c1ca06a8-5dd1-47a8-b0d9-29b9b58be826.png#averageHue=%23222c2c&clientId=u3a49e1ce-320a-4&from=paste&height=229&id=uab3037a3&originHeight=458&originWidth=742&originalType=binary&ratio=2&rotation=0&showTitle=false&size=46023&status=done&style=none&taskId=u6486ae30-bb06-4f5c-992a-338b652cc11&title=&width=371)

至此，核心的步骤就走完了，完成了插件的工作之后，咱就可以很方便的在项目中写一些三方ts脚本了
以上是最基础的版本，咱还可以做很多的优化：

- 监听ts文件变动，触发hmr
- 开发环境不生成实体文件，减少开发者的心智负担
- 暴露更多的配置项给开发者，让开发者自行控制编译的输出结果
- 支持 vite 的环境变量
- 。。。。。

具体实现可以看[源码](https://github.com/hemengke1997/vite-plugin-public-typescript)

放一个gif图看看效果，嘿嘿
![ts.gif](https://cdn.nlark.com/yuque/0/2023/gif/1447731/1695195872497-ffbd9ca4-c627-4428-942c-49f34ba15d10.gif#averageHue=%2320242a&clientId=u3a49e1ce-320a-4&from=paste&height=969&id=ua7306c36&originHeight=1937&originWidth=2787&originalType=binary&ratio=2&rotation=0&showTitle=false&size=1399276&status=done&style=none&taskId=u3f425c91-f912-4e45-81b1-1bdcca1af2c&title=&width=1393.5)

## 最后
希望此插件可以帮助到大家伙 [插件GitHub地址](https://github.com/hemengke1997/vite-plugin-public-typescript)
