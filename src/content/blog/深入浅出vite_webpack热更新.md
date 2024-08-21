---
title: "深入浅出vite、webpack热更新"
summary: "带你无压力理解透彻HMR热更新"
date: "2023-11-29 09:40:39"
draft: false
tags:
- vite
---

# 什么是hmr？
> hot-module-replacement，热更新模块，简称hmr

简单来说，热更新就是：
当我们开发时修改代码后，不需要刷新浏览器，即可把改动展示在浏览器（以下都称为客户端了）
狭义的热更新指的是 bundler框架（如webpack、vite等）监听代码变动，实时更新到客户端
广义的热更新在狭义的基础上，增加了一个步骤：客户端接受新模块代码后，调用bundler框架的hmr api，自身决定如何执行新模块代码

我们说的hmr，普遍指的是广义热更新

# hmr的基本原理
ok，现在让我们来思考一下，热更新大概是如何实现的
(同学们回答～)

我认为，热更新主要经过以下步骤

1. 监听开发者代码变化（比如 onChange, onAdd, onDelete 等事件)
2. 把变化后的代码构建好之后，使用websocket向客户端发送更新信息
3. 客户端接受到更新信息，向服务端请求更新模块的代码
4. 客户端派发更新模块代码

以上步骤不一定是对的，我们稍后看完源码再回来看看是否正确

**请注意**，这些步骤里面我没有提到任何的前端框架，React 或 Vue，
热更新并不是打包框架一个人的事，前端框架需要提供相应的热更新库，比如 React 的 react-refresh
打包框架只是把编译后的新代码发送给客户端，至于客户端如何利用这些代码，打包框架就管不到了

Dan的这个文章可以帮助我们更好的理解上面这段话
![image.png](https://cdn.nlark.com/yuque/0/2023/png/1447731/1700919562018-b674534d-8a5a-4ed8-9992-5eb28dd01d39.png#averageHue=%23292f36&clientId=u3d87c19b-1599-4&from=paste&height=288&id=rGStc&originHeight=576&originWidth=1616&originalType=binary&ratio=2&rotation=0&showTitle=false&size=127103&status=done&style=none&taskId=uad4ab250-5f96-4f8f-b3aa-1ef7cb81631&title=&width=808)
# 硬核解析核心源码
以下只会截取核心代码
## 如何监听代码变化？
![image.png](https://cdn.nlark.com/yuque/0/2023/png/1447731/1700919655810-ed0589dc-03da-4dae-8982-49d848566ced.png#averageHue=%23292f38&clientId=u3d87c19b-1599-4&from=paste&height=559&id=VteXV&originHeight=1118&originWidth=1596&originalType=binary&ratio=2&rotation=0&showTitle=false&size=257887&status=done&style=none&taskId=ubb401c60-f5ca-42e5-bf9a-9becdac0ae2&title=&width=798)
很简单，监听到代码变化后，去执行hmr相关逻辑
## 监听到代码变化后，做了什么？
如何编译代码？如何判定更新边界？如何把新的代码发送给客户端？
![image.png](https://cdn.nlark.com/yuque/0/2023/png/1447731/1700920300606-3273fb68-62e1-4640-890c-7f6e84b09fdc.png#averageHue=%23232932&clientId=u3d87c19b-1599-4&from=paste&height=64&id=wCpcg&originHeight=128&originWidth=1224&originalType=binary&ratio=2&rotation=0&showTitle=false&size=25792&status=done&style=none&taskId=u3049eaac-37f9-4a6c-96a0-a068223980e&title=&width=612)
![image.png](https://cdn.nlark.com/yuque/0/2023/png/1447731/1700920319246-644c2c8b-0b0c-4245-9eeb-3616227ae9af.png#averageHue=%23292e37&clientId=u3d87c19b-1599-4&from=paste&height=154&id=B8AH4&originHeight=308&originWidth=690&originalType=binary&ratio=2&rotation=0&showTitle=false&size=36243&status=done&style=none&taskId=u7f0e40e3-a77f-4ad4-ab29-3995b63d068&title=&width=345)![image.png](https://cdn.nlark.com/yuque/0/2023/png/1447731/1700920361581-4e8fbc1a-7ca7-4897-9417-1748290ecff5.png#averageHue=%23292e37&clientId=u3d87c19b-1599-4&from=paste&height=44&id=vRuTc&originHeight=88&originWidth=1156&originalType=binary&ratio=2&rotation=0&showTitle=false&size=19299&status=done&style=none&taskId=ucb8e0a1d-b7c5-40ac-8d8c-0baa285f206&title=&width=578)
经过这个这三个处理后，vite把改变的模块文件筛选出来了，接下来准备更新这些模块
如何更新这些模块，就有讲究了，假设修改的文件，层级比较深，莫非要把它涉及到的所有模块都全部更新？这样肯定会很慢，慢的话，vite还能叫vite吗？🤪
所以vite需要计算出模块的更新边界，也就是影响范围最小的那个模块文件，从边界模块向上的导入者，不会收到热更新的消息，这样可以极大加速热更新的速度
![image.png](https://cdn.nlark.com/yuque/0/2023/png/1447731/1700921293935-970c784e-9d12-4120-8e76-e21ca15faa6c.png#averageHue=%23282d35&clientId=u3d87c19b-1599-4&from=paste&height=847&id=tWwcr&originHeight=1694&originWidth=1670&originalType=binary&ratio=2&rotation=0&showTitle=false&size=357547&status=done&style=none&taskId=u3d7fecaa-8644-4339-a61a-761465947fd&title=&width=835)
```typescript
function propagateUpdate(
  node: ModuleNode,
  traversedModules: Set<ModuleNode>,
  boundaries: { boundary: ModuleNode; acceptedVia: ModuleNode }[],
  currentChain: ModuleNode[] = [node],
): HasDeadEnd {
  // 如果当前模块已经被递归过了，直接返回
  if (traversedModules.has(node)) {
    return false
  }
  // 否则，把当前模块添加到已递归的模块中
  traversedModules.add(node)

  if (node.isSelfAccepting) {
    boundaries.push({ boundary: node, acceptedVia: node })
    const result = isNodeWithinCircularImports(node, currentChain)
    if (result) return result

    return false
  }

  // A partially accepted module with no importers is considered self accepting,
  // because the deal is "there are parts of myself I can't self accept if they
  // are used outside of me".
  // Also, the imported module (this one) must be updated before the importers,
  // so that they do get the fresh imported module when/if they are reloaded.
  // impoter 指的是导入者，比如 在A文件中import B文件，则A被称为importer，B被称为importee
  // 没有importer的模块，被视为 self-accepting，自我接受模块
  // 如果模块的某些部分被外部使用，则不是 self-accepting
  // 另外，被导入的模块（也就是此模块），必须在impoter之前更新
  // 这样的话，当这些模块重新加载的时候，也可以获取到最新的importee
  if (node.acceptedHmrExports) {
    boundaries.push({ boundary: node, acceptedVia: node })
  
    const result = isNodeWithinCircularImports(node, currentChain)
    if (result) return result
  } else if (!node.importers.size) {
      return true
    }

  for (const importer of node.importers) {
    const subChain = currentChain.concat(importer)

    if (importer.acceptedHmrDeps.has(node)) {
      boundaries.push({ boundary: importer, acceptedVia: node })
      const result = isNodeWithinCircularImports(importer, subChain)
      if (result) return result
      continue
    }

    if (node.id && node.acceptedHmrExports && importer.importedBindings) {
      const importedBindingsFromNode = importer.importedBindings.get(node.id)
      if (
        importedBindingsFromNode &&
        areAllImportsAccepted(importedBindingsFromNode, node.acceptedHmrExports)
      ) {
        continue
      }
    }

    if (
      !currentChain.includes(importer) &&
      propagateUpdate(importer, traversedModules, boundaries, subChain)
    ) {
      return true
    }
  }
  return false
}

// 处理循环导入
/**
 * Check importers recursively if it's an import loop. An accepted module within
 * an import loop cannot recover its execution order and should be reloaded.
 *
 * @param node The node that accepts HMR and is a boundary
 * @param nodeChain The chain of nodes/imports that lead to the node.
 *   (The last node in the chain imports the `node` parameter)
 * @param currentChain The current chain tracked from the `node` parameter
 */
function isNodeWithinCircularImports(
  node: ModuleNode,
  nodeChain: ModuleNode[],
  currentChain: ModuleNode[] = [node],
): HasDeadEnd {
  // To help visualize how each parameters work, imagine this import graph:
  //
  // A -> B -> C -> ACCEPTED -> D -> E -> NODE
  //      ^--------------------------|
  //
  // ACCEPTED: the node that accepts HMR. the `node` parameter.
  // NODE    : the initial node that triggered this HMR.
  //
  // This function will return true in the above graph, which:
  // `node`         : ACCEPTED
  // `nodeChain`    : [NODE, E, D, ACCEPTED]
  // `currentChain` : [ACCEPTED, C, B]
  //
  // It works by checking if any `node` importers are within `nodeChain`, which
  // means there's an import loop with a HMR-accepted module in it.

  for (const importer of node.importers) {
    // Node may import itself which is safe
    if (importer === node) continue

    // Check circular imports
    const importerIndex = nodeChain.indexOf(importer)
    if (importerIndex > -1) {
      // Log extra debug information so users can fix and remove the circular imports
      if (debugHmr) {
        // Following explanation above:
        // `importer`                    : E
        // `currentChain` reversed       : [B, C, ACCEPTED]
        // `nodeChain` sliced & reversed : [D, E]
        // Combined                      : [E, B, C, ACCEPTED, D, E]
        const importChain = [
          importer,
          ...[...currentChain].reverse(),
          ...nodeChain.slice(importerIndex, -1).reverse(),
        ]
        debugHmr(
          colors.yellow(`circular imports detected: `) +
            importChain.map((m) => colors.dim(m.url)).join(' -> '),
        )
      }
      return 'circular imports'
    }

    // Continue recursively
    if (!currentChain.includes(importer)) {
      const result = isNodeWithinCircularImports(
        importer,
        nodeChain,
        currentChain.concat(importer),
      )
      if (result) return result
    }
  }
  return false
}
```
经过一系列的计算后，得到了优化后的待更新的模块信息，包括模块的uri、类型、更新时间戳等，然后使用websocket发送消息告诉客户端
![image.png](https://cdn.nlark.com/yuque/0/2023/png/1447731/1700922674602-f3c5403e-37c0-4634-ae25-b8aeaffb6b4a.png#averageHue=%23292e36&clientId=u3d87c19b-1599-4&from=paste&height=87&id=DUKa8&originHeight=174&originWidth=394&originalType=binary&ratio=2&rotation=0&showTitle=false&size=14387&status=done&style=none&taskId=u870bf18e-36d2-4a55-900f-f7f7a1cd5c9&title=&width=197)
至此，HMR的服务端功能就完成了，难吗？说难也难，说不难也不难
## 客户端如何接受热更新消息？
给socket注册一个监听事件即可
![image.png](https://cdn.nlark.com/yuque/0/2023/png/1447731/1700925736634-73be8374-b772-41f9-bfd2-9ccbea4d08bb.png#averageHue=%23292e36&clientId=u3d87c19b-1599-4&from=paste&height=850&id=rJ5hg&originHeight=1700&originWidth=1430&originalType=binary&ratio=2&rotation=0&showTitle=false&size=299769&status=done&style=none&taskId=ubb2786ef-e8d3-4b43-b645-bb357134ffa&title=&width=715)
![image.png](https://cdn.nlark.com/yuque/0/2023/png/1447731/1700925887758-0daf7633-831e-418d-8778-193fcde631b6.png#averageHue=%232c323b&clientId=u3d87c19b-1599-4&from=paste&height=373&id=zPrnZ&originHeight=746&originWidth=1396&originalType=binary&ratio=2&rotation=0&showTitle=false&size=183338&status=done&style=none&taskId=u13ca43b6-5324-4621-843d-439470789e7&title=&width=698)
## 客户端接受到更新消息后，做了什么？
请求更新的模块文件，然后执行
```typescript
// !!! 这个函数是闭包
async function fetchUpdate({
  path,
  acceptedPath,
  timestamp,
  explicitImportRequired,
}: Update) {
  const mod = hotModulesMap.get(path)
  if (!mod) {
    // In a code-splitting project,
    // it is common that the hot-updating module is not loaded yet.
    // https://github.com/vitejs/vite/issues/721
    return
  }

  let fetchedModule: ModuleNamespace | undefined
  const isSelfUpdate = path === acceptedPath

  // determine the qualified callbacks before we re-import the modules
  const qualifiedCallbacks = mod.callbacks.filter(({ deps }) =>
    deps.includes(acceptedPath),
  )

  if (isSelfUpdate || qualifiedCallbacks.length > 0) {
    const disposer = disposeMap.get(acceptedPath)
    if (disposer) await disposer(dataMap.get(acceptedPath))
    const [acceptedPathWithoutQuery, query] = acceptedPath.split(`?`)
    try {
      // 核心：请求更新模块
      // 执行了这一步后，可以在控制台中看到浏览器请求了文件，但还没执行里面的代码
      fetchedModule = await import(
        // suppresses dynamic import warning
        /* @vite-ignore */
        `${base +
          acceptedPathWithoutQuery.slice(1) 
          }?${explicitImportRequired ? 'import&' : ''}t=${timestamp}${
            query ? `&${query}` : ''
          }`
      )
    } catch (e) {
      warnFailedFetch(e, acceptedPath)
    }
  }

  return () => {
    for (const { deps, fn } of qualifiedCallbacks) {
      // 这里才是真的执行了fetchedModule
      fn(deps.map((dep) => (dep === acceptedPath ? fetchedModule : undefined)))
    }
    const loggedPath = isSelfUpdate ? path : `${acceptedPath} via ${path}`
    console.debug(`[vite] hot updated: ${loggedPath}`)
  }
}
```
至此，客户端的hmr就执行完了。
vite的整个hmr就执行完了
小朋友，你是否有一些问号？嗯？这就完了？咱们的页面是怎么更新的呀？也妹看到有相应的处理呀
是的，接下来的任务，就交给框架的热更新了，我用 react-refresh 来举例

我们的react项目，都引入了 @vitejs/plugin-react 这个插件，毋庸置疑
这个插件中，就集成了 react-refresh 功能
## react 是如何热更新的？
先看看这个[https://github.com/facebook/react/issues/16604#issuecomment-528663101](https://github.com/facebook/react/issues/16604#issuecomment-528663101)

ok，然后我们再理解以下，如何把react-refresh集成到vite的插件中
```typescript
async transform(code, id, options) {
    if (id.includes('/node_modules/')) return

    // ... unimportant code ...
    
    const babel = await loadBabel()
    const result = await babel.transformAsync(code, {
      // ...
    })

    if (result) {
      let code = result.code!
      if (useFastRefresh && refreshContentRE.test(code)) {
        // 核心：给每个需要热更新的文件，注入运行时代码
        code = addRefreshWrapper(code, id)
      }
      return { code, map: result.map }
    }
  },
```
![image.png](https://cdn.nlark.com/yuque/0/2023/png/1447731/1700927810778-737e884c-9ef1-4f05-9aa8-2c60980a3226.png#averageHue=%23282c34&clientId=u3d87c19b-1599-4&from=paste&height=1002&id=ubda28f8c&originHeight=2004&originWidth=1310&originalType=binary&ratio=2&rotation=0&showTitle=false&size=394961&status=done&style=none&taskId=uce650d5d-a440-4eec-bedc-aa0eb2bb788&title=&width=655)
经过注入代码后，我们的每个jsx文件，都会变成这样：
![带hmr的jsx](https://cdn.nlark.com/yuque/0/2023/png/1447731/1700927789842-8bcbe33d-cc86-41d0-89b8-dfdb12935de9.png#averageHue=%232f2e2c&clientId=u3d87c19b-1599-4&from=paste&height=660&id=uf04a477d&originHeight=1320&originWidth=1912&originalType=binary&ratio=2&rotation=0&showTitle=true&size=470660&status=done&style=none&taskId=ua816a9b7-61c5-4011-af7c-0e997bcaeb0&title=%E5%B8%A6hmr%E7%9A%84jsx&width=956 "带hmr的jsx")

header里面的代码呢，就是把模块注册到 react-refresh 中，这样才能有热更新功能
footer里面的代码呢，就是 

- 执行 react-refresh 热更新
- 在 refresh runtime 中注册新的模块热更新
- 调用vite的hmr client api，让当前模块可以成为更新边界
- 校验当前模块的热更新是否生效，若不生效，则向上传导边界

在上面，我不是提了一嘴吗
![image.png](https://cdn.nlark.com/yuque/0/2023/png/1447731/1700928096524-fe2f1973-4226-4833-bfc7-d49751f1c1da.png#averageHue=%23292e38&clientId=u3d87c19b-1599-4&from=paste&height=85&id=u6ff350b4&originHeight=170&originWidth=1308&originalType=binary&ratio=2&rotation=0&showTitle=false&size=42777&status=done&style=none&taskId=udfd784ea-3fce-4d7c-8b83-02260c60b0e&title=&width=654)
执行 fethedModule，其实就是执行了一个jsx文件，我们现在再看看 `带hmr的jsx`这张图，
可以看到 App 这个组件，并没有执行，而是交给了 refresh，
![image.png](https://cdn.nlark.com/yuque/0/2023/png/1447731/1700928555722-379c6d6b-604b-4a86-b074-393fe4aff7f3.png#averageHue=%23353330&clientId=u3d87c19b-1599-4&from=paste&height=546&id=u08d8ed91&originHeight=1092&originWidth=880&originalType=binary&ratio=2&rotation=0&showTitle=false&size=316973&status=done&style=none&taskId=u759967b0-f356-4f88-807b-518a9b3fdf1&title=&width=440)
这也是为什么热更新可以做到局部更新，多亏 react-refresh！
关于 react-refresh 的原理，比较复杂，不赘述，简单来说，就是把 旧模块 和 新模块 合并了，保留了组件的state

footer里面调用vite的hmr api也很重要，如果不加这个api，这个文件就永远不会成为更新边界，这会导致更新的范围更广，因为更新边界向上传导了
# 无前端框架 vite如何热更新？
调用vite的hmr api，然后自己编码控制热更新逻辑
```typescript
export function setupCounter(element: HTMLButtonElement) {
  let counter = 0
  const setCounter = (count: number) => {
    counter = count
    element.innerHTML = `count is ${counter}`
  }
  element.addEventListener('click', () => setCounter(counter + 1))
  setCounter(counter)
}


if (import.meta.hot) {
  // 如果模块文件中没有 `import.meta.hot.aceept`， 则模块没有热更新能力
  // 即不会成为更新边界
  import.meta.hot.accept((newModule) => {
    // 当保存文件时：
    // newModule: { default: setupCounter }
    // 开发者自己编码，来控制当前模块如何热更新


    // 如果没有热更新逻辑，hmr不会无感知更新页面
  })
}
```
# 与webpack热更新对比
vite与webpack的热更新，在流程上基本上差不多，但由于vite dev是基于浏览器的esm，而webpack是构建完成后交由浏览器，所以在「客户端请求热更新文件」这里，差别较大
梳理一下webpack的热更新流程

1. 监听开发者代码变化
2. webpack构建，然后把热更新相关的信息（一个json文件，包含构建后的文件hash值）发送给客户端
3. 客户端接收到热更新信息后，向服务端请求更新的代码块
4. 客户端执行更新代码

很简陋，但也很简单，实际上不止这4个步骤，我只把重要的部分挑出来了

![网上找的图](https://cdn.nlark.com/yuque/0/2023/png/1447731/1701069328917-f2ea376e-aada-4153-bab3-cfa4bb4a8b7f.png#averageHue=%23fefefe&clientId=ub0af4c0c-8633-4&from=paste&height=995&id=u07938f55&originHeight=1990&originWidth=1954&originalType=binary&ratio=2&rotation=0&showTitle=true&size=490457&status=done&style=none&taskId=uab53a9c7-ec0a-4f2d-b226-222abc25142&title=%E7%BD%91%E4%B8%8A%E6%89%BE%E7%9A%84%E5%9B%BE&width=977 "网上找的图")
webpack的源码就不探究了，我不感兴趣 😌
咱们实操看看是怎么个事
```shell
pnpx create-react-app --template typescript
```
```shell
pnpm eject
```
```shell
pnpm start
```
![image.png](https://cdn.nlark.com/yuque/0/2023/png/1447731/1701070241105-a60c3cc9-b5c5-4907-bbed-5a651075af51.png#averageHue=%232d2d2d&clientId=ub0af4c0c-8633-4&from=paste&height=279&id=yzoB6&originHeight=558&originWidth=1372&originalType=binary&ratio=2&rotation=0&showTitle=false&size=61861&status=done&style=none&taskId=u470ab09e-4762-4524-9f5b-b89ac8297f9&title=&width=686)
```javascript
{"c":["main"],"r":[],"m":[]} => {chunkIds, removedChunks, removedModules,}
```

上文中，我们提到了 ![image.png](https://cdn.nlark.com/yuque/0/2023/png/1447731/1701071561757-ff814673-7eed-4352-8228-775536509c38.png#averageHue=%23242424&clientId=ub0af4c0c-8633-4&from=paste&height=69&id=u9e7d6aa4&originHeight=138&originWidth=1530&originalType=binary&ratio=2&rotation=0&showTitle=false&size=51480&status=done&style=none&taskId=u9a7a61cc-a157-4a3e-a014-f4afd2590f1&title=&width=765)
现在我们来看看，具体的区别在哪里

1. vite是如何加载更新模块的？而webpack又是如何加载的？

已经到这里了，大家应该都知道 vite 是如何加载更新模块了吧？

webpack呢？
![image.png](https://cdn.nlark.com/yuque/0/2023/png/1447731/1701077832631-641ced13-71c8-4913-a8a4-dfd57e2e1ae2.png#averageHue=%232d2d2d&clientId=ub0af4c0c-8633-4&from=paste&height=493&id=u17bee517&originHeight=986&originWidth=1826&originalType=binary&ratio=2&rotation=0&showTitle=false&size=195174&status=done&style=none&taskId=u58ff7f4d-ab7a-4bab-9350-0c724a182a3&title=&width=913)
可以看到，先是通过jsonp获取到代码chunk，然后使用webpack_require导入并执行更新后的chunk

最后我们看看更新代码长什么样
![image.png](https://cdn.nlark.com/yuque/0/2023/png/1447731/1701070366678-c432627a-d501-4ef3-8402-4b2786dc5a22.png#averageHue=%232e2d2d&clientId=ub0af4c0c-8633-4&from=paste&height=869&id=ouIze&originHeight=1738&originWidth=2098&originalType=binary&ratio=2&rotation=0&showTitle=false&size=500438&status=done&style=none&taskId=u08d92dc8-c265-4179-8ec9-62da65c7e92&title=&width=1049)
跟vite基本上一致，很大部分原因是因为客户端热更新 是前端框架来主动集成的
# 最后
至此，基本上把hmr的主流程讲完了，当然，还有很多值得深究的地方，时间原因，不再这里赘述
但是我们也可以浅浅地做一些课后思考：

- css的热更新怎么做？
- 如果热更新出错，如何兜底？
- 模块依赖图是怎么实现的？
- 热更新、增量更新，能否应用在生产环境？
- 为什么webpack使用jsonp获取更新模块，而vite使用dymanic import？
- 执行了更新模块的代码后，之前的老代码去哪里了？老代码还会再执行吗？
