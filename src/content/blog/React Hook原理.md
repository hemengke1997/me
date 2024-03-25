---
title: "🍣 React Hook原理"
summary: "承上启下篇"
date: "2023-12-07 13:32"
draft: false
tags:
- React
---

经过了React渲染全流程的学习，我们从宏观了解到React从收到开发者的jsx，到最后展示在页面上这个过程中经历了些什么
但总感觉缺了些什么是吧，我们最常用的函数式编程和Hooks写法，都没怎么提及。
为了减少上一章节的理解压力，所以没提hook，并且hook、function component都只是render（reconciler + commit）环节中的一个case分支，可以单独拿出来说

首先，我们承上启下，讲一下 「状态(state)与副作用(effects)」
# 状态与副作用
在React function组件的开发中，我们经常听到这两个概念，你是否认真思考过它们究竟是什么
React中，状态、副作用都是fiber的属性集
```jsx
export type Fiber = {
  // 1. fiber节点自身状态相关
  pendingProps: any,
  memoizedProps: any,
  updateQueue: mixed,
  memoizedState: any,

  // 2. fiber节点副作用(Effect)相关
  flags: Flags,
  subtreeFlags: Flags,
  deletions: Array<Fiber> | null,
  nextEffect: Fiber | null,
  firstEffect: Fiber | null,
  lastEffect: Fiber | null,
|};
```

- 状态（静态） —— fiber状态在 renderRootSync（构造）阶段为子节点提供**确定**的输入，直接影响子节点的生成
   - fiber.pendingProps：从 ReactElement 对象传入的props
   - fiber.memoizedProps：上一次生成节点时的props，生成节点后，memoizedProps保存在内存中，也就是 pendingProps -> memoizedProps。通过比较这两个属性来判断props时候有变动（是否想起了React.memo）
   - fiber.updateQueue：存储 update更新对象 的队列，每次更新都会在这个队列中添加一个update对象（上个章节提过）
   - fiber.memoizedState：上一次生成节点之后，保存在内存中的state
- 副作用（动态）—— fiber副作用在 commitRoot （渲染）阶段被异步或同步调用
   - fiber.flags：标志位，表示fiber有哪些副作用。flags之间都是通过位运算得到组合结果

随意截的图，不完整
![image.png](https://cdn.nlark.com/yuque/0/2023/png/1447731/1701915152031-f526d189-1f93-4570-86fb-b6aa162c2976.png#averageHue=%232a2e36&clientId=u672e16e4-4267-4&from=paste&height=675&id=ub2688025&originHeight=1350&originWidth=1486&originalType=binary&ratio=2&rotation=0&showTitle=false&size=358031&status=done&style=none&taskId=u924c2a93-157d-4d53-a186-b0ecaf8f2e2&title=&width=743)

   - fiber.nextEffect：指向下一个副作用 fiber 节点
   - fiber.firstEffect：指向第一个副作用 fiber 节点
   - fiber.lastEffect： 指向最后一个副作用 fiber 节点

commit阶段，每个fiber的副作用都会上移到根节点上
![image.png](https://cdn.nlark.com/yuque/0/2023/png/1447731/1701915468355-a4e77467-9d9d-4424-ac91-08c703d8bf88.png#averageHue=%23dbf7f3&clientId=u672e16e4-4267-4&from=paste&height=625&id=u3eb83987&originHeight=952&originWidth=1094&originalType=binary&ratio=2&rotation=0&showTitle=false&size=301761&status=done&style=none&taskId=u2fb104ff-faf6-4be1-a461-0fa3a1f06fd&title=&width=718)

通过上一章节的学习，我们知道，构造阶段可以中断，但渲染阶段不能同步且不能被中断
可以把构造阶段理解成构建时，渲染阶段理解成运行时。构建时能做的事都是偏静态的，相同的输入一定会得到相同的输出。而运行时可以很灵活，因为是同步代码，所以执行逻辑连贯的钩子很方便
（想象一下，在一个可中断的逻辑中，执行连续逻辑的代码，是不是很难受）

# Hook
对于函数组件，可以改变渲染结果的api目前只有 useState、useReducer
我们直接开始走源码
示例代码：
```jsx
import { useState } from 'react';

const App = () => {
  const [count, setCount] = useState(0)
  return <div onClick={() => setCount(t=>t+1)}>{count}</div>
}

export default App;
```
![image.png](https://cdn.nlark.com/yuque/0/2023/png/1447731/1701920640969-d0913eb8-7d11-4af8-a5d3-1b01302e0dda.png#averageHue=%232c2f35&clientId=ud534577d-fa83-4&from=paste&height=371&id=u34f4d124&originHeight=742&originWidth=608&originalType=binary&ratio=2&rotation=0&showTitle=false&size=183823&status=done&style=none&taskId=u1e5b5ed8-f94d-4079-aac6-30512f756f8&title=&width=304)
![image.png](https://cdn.nlark.com/yuque/0/2023/png/1447731/1701921047713-ea112b3c-5a48-4b8a-bf9f-67c871b22208.png#averageHue=%232a2e35&clientId=ud534577d-fa83-4&from=paste&height=543&id=u3c1e5878&originHeight=1086&originWidth=1300&originalType=binary&ratio=2&rotation=0&showTitle=false&size=410257&status=done&style=none&taskId=u807b59e1-d7a6-443c-ad24-b49667ed433&title=&width=650)
