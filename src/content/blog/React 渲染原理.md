---
title: "React 渲染原理"
summary: "React源码，启动！"
date: "2023-12-07 13:32:35"
draft: false
tags:
- React
---

# React揭秘重点笔记（无上下文逻辑）
整个**Scheduler**与**Reconciler**的工作都在内存中进行。只有当所有组件都完成**Reconciler**的工作，才会统一交给**Renderer**。
**Renderer**根据**Reconciler**为虚拟DOM打的标记，同步执行对应的DOM操作。
如果当前浏览器帧没有剩余时间，shouldYield会中止循环，直到浏览器有空闲时间后再继续遍历（继续遍历！因为打断了while循环，但记住了上一次中断的fiber节点，就可以等浏览器有时间的时候，重新while循环，从上一次的wipFiber开始）
performUnitOfWork方法会创建下一个Fiber节点并赋值给workInProgress，并将workInProgress与已创建的Fiber节点连接起来构成Fiber树（performUnitOfWork里面做的事不少哦！要把ReactElement转成fiber，然后赋值给wipFiber，再把这个fiber跟已有的fiber连接起来。连接起来之后就会自然形成一颗Fiber树🌳）
# Q

- scheduler 是怎么知道浏览器当前帧是否还有空闲时间的？
- 每次的workloop中做了什么事？会创建dom吗（只是创建，不包含写到浏览器）？
- scheduler把任务交给了reconciler？那scheduler的任务是从哪里来的？
- scheduler 和 reconciler 有可能被中断，比如有更高优先级的任务来了。如何理解这个中断？中断的是什么？是怎么做到的中断？正在进行的task会被中断吗？
- render（scheduler + reconciler）是一个递归的过程，是全部执行完了，再一次性全部commit吗？



# React原理
最近看了哪些文章

- [React技术揭秘](https://react.iamkasong.com/preparation/idea.html#react%E7%90%86%E5%BF%B5) —— 卡颂
- [图解React](https://7km.top/) —— 7km
- [React源码入门系列](https://juejin.cn/post/7301574528361136163#heading-1) —— 好好吃饭好好睡觉
- [react-fiber-architecture](https://github.com/acdlite/react-fiber-architecture) —— React核心成员
- [react官网legacy版本](https://zh-hans.legacy.reactjs.org/docs/reconciliation.html) —— React官网

说实话，经过这几天疯狂学习React，接收的输入不统一，导致我脑子很混乱，所以决定从头开始整理一下，把我对React的理解写下来，不一定对
我打算先从宏观入手，先搞清楚react渲染的流程，包括mount和update，在这个阶段，不出意外，我会有许多疑问
然后再带着疑问，去深入了解其中的原理
> 基于 React18.2.0 版本

## 启动
我们web开发，入口函数都是 `ReactDOM.createRoot().render` ，所以就从这里开始分析
```jsx
export function createRoot(container, options) {
  if (!isValidContainer(container)) {
    throw new Error("createRoot(...): Target container is not a DOM element.");
  }

  // ...

  // createContainer是createRoot的核心函数
  // 其中，container 是我们传入的DOM，通常是：document.getElementById('root')
  // 这里的root，称为 FiberRootNode，在一个React应用中，只有一个 FiberRootNode
  // FiberRootNode 是最顶部的Fiber节点
  const root = createContainer(
    container,
    ConcurrentRoot,
    null,
    isStrictMode,
    concurrentUpdatesByDefaultOverride,
    identifierPrefix,
    onRecoverableError,
    transitionCallbacks
  );

  /**
    就是给container加了个内部属性[internalContainerInstanceKey]，
    用来存储 FiberRootNode
    
    const internalContainerInstanceKey = "__reactContainer$" + randomKey
    export function markContainerAsRoot(hostRoot, node) {
   	 node[internalContainerInstanceKey] = hostRoot;
  	}
  */
  markContainerAsRoot(root.current, container);


  const rootContainerElement =
    container.nodeType === COMMENT_NODE ? container.parentNode : container;
  // 监听所有事件，看起来应该是React的事件绑定机制相关
  listenToAllSupportedEvents(rootContainerElement);

  /**
  	function ReactDOMRoot(internalRoot) {
      this._internalRoot = internalRoot;
    }

    ReactDOMRoot.prototype.render = function() {

      // 核心逻辑
      // 这里就是ReactDOM 跟 reconciler 的链接处
      updateContainer(children, root, null, null);
    }
  */
  // 所以返回的对象中有个render方法，也就是 createRoot().render()
  return new ReactDOMRoot(root);
}

```

进入到 `createContainer` ，看看 FiberRootNode 是怎么生成的
```jsx
export function createFiberRoot(
  containerInfo,
  tag,
  hydrate,
  initialChildren,
  hydrationCallbacks,
  isStrictMode,
  concurrentUpdatesByDefaultOverride,
  identifierPrefix,
  onRecoverableError,
  transitionCallbacks
) {
  // 这里就是创建了唯一的FiberRootNode
  // 详情看下图
  const root = new FiberRootNode(
    containerInfo,
    tag,
    hydrate,
    identifierPrefix,
    onRecoverableError
  );

  // 这里是创建hostRootFiber
  // host指的是宿主
  // 这个其实就是Fiber树的根节点，因为之后会把这个fiber树渲染到宿主环境中
  const uninitializedFiber = createHostRootFiber(
    tag,
    isStrictMode,
    concurrentUpdatesByDefaultOverride
  );

  // 应用根节点中绑定了hostRootFiber
  root.current = uninitializedFiber;
  // hostRootFiber中也保存了FiberRootNode
  // 这两个步骤就把FiberRootNode 跟 hostRootFiber 绑定起来了
  uninitializedFiber.stateNode = root;

  if (enableCache) {
    // ...
    
    const initialState = {
      element: initialChildren,
      isDehydrated: hydrate,
      cache: initialCache,
    };
    // 初始化state
    uninitializedFiber.memoizedState = initialState;
  } else {
    // ...
  }

  // 初始化HostRootFiber的updateQueue
  initializeUpdateQueue(uninitializedFiber);

  // 返回FiberRootNode
  return root;
}
```

FiberRootNode中有一些比较重要的属性：

- current：指向hostRootFiber，也就是当前渲染的Fiber
- containerInfo：传入的 `#root` 的DOM信息
- pendingLanes： 待更新任务优先级
- expirationTimes：任务过期时间数组，初始化都是-1（已过期）

![image.png](https://cdn.nlark.com/yuque/0/2023/png/1447731/1701676506680-5f9b422f-d861-4d02-a666-2697cbde0dad.png#averageHue=%2325292f&clientId=uc9e6910a-9927-4&from=paste&height=793&id=u6d9113f0&originHeight=1586&originWidth=1630&originalType=binary&ratio=2&rotation=0&showTitle=false&size=259407&status=done&style=none&taskId=u74861a5a-fd9b-4aaa-b75c-a163e1db1ec&title=&width=815)

HostRootFiber，是一个普通的Fiber节点，也有一些比较重要的属性

- tag：fiber的类型，根据 ReactElement 组件的type生成，有以下25种![image.png](https://cdn.nlark.com/yuque/0/2023/png/1447731/1701681638509-8e9c3e76-7123-48dd-b2c1-91b3ef6a0fc5.png#averageHue=%23282d35&clientId=uc9e6910a-9927-4&from=paste&height=583&id=uefe0bb1f&originHeight=1166&originWidth=818&originalType=binary&ratio=2&rotation=0&showTitle=false&size=285330&status=done&style=none&taskId=u168b693d-21c9-4d47-9f50-9a8973e9cd9&title=&width=409)
- key：节点的key
- mode: 二进制,继承至父节点,影响本 fiber 节点及其子树中所有节点. 与 react 应用的运行模式有关(有 ConcurrentMode, BlockingMode, NoMode 等选项).

![image.png](https://cdn.nlark.com/yuque/0/2023/png/1447731/1701681650621-cc8dd3bd-c486-4cc3-9300-31bbf1d706b7.png#averageHue=%232b3039&clientId=uc9e6910a-9927-4&from=paste&height=202&id=u7e5933aa&originHeight=404&originWidth=1164&originalType=binary&ratio=2&rotation=0&showTitle=false&size=121561&status=done&style=none&taskId=u793660a2-ae80-4502-bad9-b5f28dc4def&title=&width=582)

- child：直接子节点
- return：直接父节点
- sibling：兄弟节点
- memoizedState：hook链表
- memoizedProps：props
- pendingProps：等待处理的props

![image.png](https://cdn.nlark.com/yuque/0/2023/png/1447731/1701676519227-eaed092e-5fc9-4f8d-92fc-29d31c525592.png#averageHue=%2323262c&clientId=uc9e6910a-9927-4&from=paste&height=720&id=u40662e60&originHeight=1440&originWidth=1596&originalType=binary&ratio=2&rotation=0&showTitle=false&size=146517&status=done&style=none&taskId=u99d35bcc-2708-43d2-aefa-82ade5d0c72&title=&width=798)![image.png](https://cdn.nlark.com/yuque/0/2023/png/1447731/1701676016720-fc648f07-7e88-4459-8614-ec82c3aef5c0.png#averageHue=%232a2e36&clientId=uc9e6910a-9927-4&from=paste&height=245&id=u236b6dc4&originHeight=490&originWidth=1574&originalType=binary&ratio=2&rotation=0&showTitle=false&size=165491&status=done&style=none&taskId=uecdf149d-3210-443a-adde-eea6f78a905&title=&width=787)

以上就是ReactDOM的启动的核心流程
![](https://cdn.nlark.com/yuque/0/2023/jpeg/1447731/1701679486243-17cc3ee6-1a5b-4c86-847f-1e9a9699dab3.jpeg)
## ReactDOM render
我们通过现象来看一下整体的调用栈
![image.png](https://cdn.nlark.com/yuque/0/2023/png/1447731/1701678769875-817bd258-309a-4d6d-8a44-7e0eda93c8f2.png#averageHue=%23343434&clientId=uc9e6910a-9927-4&from=paste&height=599&id=u8dde4030&originHeight=1198&originWidth=1040&originalType=binary&ratio=2&rotation=0&showTitle=false&size=256471&status=done&style=none&taskId=ufc953a61-7f10-4e30-87cd-cfb400f38fa&title=&width=520)
从调用栈可以很直观看到，ReactDOMRoot.render 是起点，最后渲染的 FunctionComponent（业务代码）是终点
得益于React源码区分清晰，从文件名大致可以看出函数属于哪部分
### `updateContainer`
render之前的流程已经梳理完毕，接下来，我们从 `updateContainer`讲起
```jsx
ReactDOMRoot.prototype.render =
  function (children) {
    const root = this._internalRoot;
    // ...

    // render 调用 updateContainer
    // children 是用户传参，通常是一个jsx
    // root 是之前的 `#root` DOM
    updateContainer(children, root, null, null);
  };
```
![image.png](https://cdn.nlark.com/yuque/0/2023/png/1447731/1701679623255-4f54870f-78bb-4567-984e-23a86487b227.png#averageHue=%23292d34&clientId=uc9e6910a-9927-4&from=paste&height=424&id=MpGq7&originHeight=848&originWidth=1466&originalType=binary&ratio=2&rotation=0&showTitle=false&size=323874&status=done&style=none&taskId=u90bdf46f-b995-4738-b37e-0b2249d0901&title=&width=733)
```jsx
export function updateContainer(element, container) {
	// element 是传入 render 的 ReactElement（经过babel，从jsx转成了ReactElement方法）
  
  // container是FiberRootNode
  // container.current 就是 HostFiberRoot
  const current = container.current;
  
  // 获取HostFiberRoot的更新优先级
  // 这里比较重要，涉及到了优先级相关的概念

  // 32，对应 DefaultLane
  const lane = requestUpdateLane(current);

  // ...

  // 设置fiber.updateQueue
  const update = createUpdate(lane);
  // Caution: React DevTools currently depends on this property
  // being called "element".
  update.payload = { element };

  // TODO：好像是向更新队列中推入了一个更新
  const root = enqueueUpdate(current, update, lane);
  
  if (root !== null) {
    const eventTime = requestEventTime();
    
    // 重点！每次更新一定会进入到这个方法中
    // 从上方的调用栈图中，也可以看到这个方法
    // 这个方法是开启Fiber的更新调度任务
    // 这里面应该就是开始构造fiber树了
    
    // 进入reconciler运作流程中的`输入`环节
    scheduleUpdateOnFiber(root, current, lane, eventTime);

    entangleTransitions(root, current, lane);
  }

  return lane;
}
```
### 初探优先级
#### 分类
在React中有三类优先级

- lane：fiber优先级，车道模型
   1. Lane 是二进制常量，利用位掩码的特性，在频繁运算时占用内存少，计算速度快
   2. Lane是单任务，Lanes是多任务
   3. 每个Lane都有其对应的优先级
```jsx
export const TotalLanes = 31;

export const NoLanes = /*                        */ 0b0000000000000000000000000000000;
export const NoLane = /*                          */ 0b0000000000000000000000000000000;

export const SyncHydrationLane = /*               */ 0b0000000000000000000000000000001;
export const SyncLane = /*                        */ 0b0000000000000000000000000000010;

export const InputContinuousHydrationLane = /*    */ 0b0000000000000000000000000000100;
export const InputContinuousLane = /*             */ 0b0000000000000000000000000001000;

export const DefaultHydrationLane = /*            */ 0b0000000000000000000000000010000;
export const DefaultLane = /*                     */ 0b0000000000000000000000000100000;

export const SyncUpdateLanes = /*                */ 0b0000000000000000000000000101010;

const TransitionHydrationLane = /*                */ 0b0000000000000000000000001000000;
const TransitionLanes = /*                       */ 0b0000000011111111111111110000000;
const TransitionLane1 = /*                        */ 0b0000000000000000000000010000000;
const TransitionLane2 = /*                        */ 0b0000000000000000000000100000000;
const TransitionLane3 = /*                        */ 0b0000000000000000000001000000000;
const TransitionLane4 = /*                        */ 0b0000000000000000000010000000000;
const TransitionLane5 = /*                        */ 0b0000000000000000000100000000000;
const TransitionLane6 = /*                        */ 0b0000000000000000001000000000000;
const TransitionLane7 = /*                        */ 0b0000000000000000010000000000000;
const TransitionLane8 = /*                        */ 0b0000000000000000100000000000000;
const TransitionLane9 = /*                        */ 0b0000000000000001000000000000000;
const TransitionLane10 = /*                       */ 0b0000000000000010000000000000000;
const TransitionLane11 = /*                       */ 0b0000000000000100000000000000000;
const TransitionLane12 = /*                       */ 0b0000000000001000000000000000000;
const TransitionLane13 = /*                       */ 0b0000000000010000000000000000000;
const TransitionLane14 = /*                       */ 0b0000000000100000000000000000000;
const TransitionLane15 = /*                       */ 0b0000000001000000000000000000000;
const TransitionLane16 = /*                       */ 0b0000000010000000000000000000000;

const RetryLanes = /*                            */ 0b0000111100000000000000000000000;
const RetryLane1 = /*                             */ 0b0000000100000000000000000000000;
const RetryLane2 = /*                             */ 0b0000001000000000000000000000000;
const RetryLane3 = /*                             */ 0b0000010000000000000000000000000;
const RetryLane4 = /*                             */ 0b0000100000000000000000000000000;

export const SomeRetryLane = RetryLane1;

export const SelectiveHydrationLane = /*          */ 0b0001000000000000000000000000000;

const NonIdleLanes = /*                          */ 0b0001111111111111111111111111111;

export const IdleHydrationLane = /*               */ 0b0010000000000000000000000000000;
export const IdleLane = /*                        */ 0b0100000000000000000000000000000;

export const OffscreenLane = /*                   */ 0b1000000000000000000000000000000;
```

- event：事件优先级
```jsx
// 其实事件优先级就是Lane，只是为了更好的表达语意
export const DiscreteEventPriority = SyncLane;
export const ContinuousEventPriority = InputContinuousLane;
export const DefaultEventPriority = DefaultLane;
export const IdleEventPriority = IdleLane;
```

- scheduler：调度优先级，独立包，可以不依赖 React 使用
```jsx
export const NoPriority = 0;

// 优先级越高，对应数字越小
export const ImmediatePriority = 1;
export const UserBlockingPriority = 2;
export const NormalPriority = 3;
export const LowPriority = 4;
export const IdlePriority = 5;
```
#### 转化
优先级有个转化关系
![image.png](https://cdn.nlark.com/yuque/0/2023/png/1447731/1701682708646-43ce6f40-e84d-45bb-9d86-4a895727b325.png#averageHue=%23282d35&clientId=uc9e6910a-9927-4&from=paste&height=485&id=ue734986d&originHeight=970&originWidth=1276&originalType=binary&ratio=2&rotation=0&showTitle=false&size=201261&status=done&style=none&taskId=ue28ced0b-25c8-4158-95cd-14ea695a83b&title=&width=638)
lane转成event，event再转成scheduler
**优先级是React实现时间切片、中断渲染、suspense异步渲染的基础**
正是因为每个任务有不同优先级，React才能hold住大型前端项目，紧急的任务先渲染，不紧急的后渲染，用户感知卡顿的几率极大减少

### requestUpdateLane
```jsx
export function requestUpdateLane(fiber) {
  // ...

  // 获取此次更新的优先级（默认是NoLane：0）
  const updateLane = getCurrentUpdatePriority();
  if (updateLane !== NoLane) {
    return updateLane;
  }

  // 没有显示设置优先级的话，会走到这里
  const eventLane = getCurrentEventPriority();
  // return 32
  return eventLane;
}
```
```jsx
// 默认返回 DefaultEventPriority：32
export function getCurrentEventPriority() {
  const currentEvent = window.event;
  if (currentEvent === undefined) {
    return DefaultEventPriority;
  }
  return getEventPriority(currentEvent.type);
}
```
### createUpdate
```jsx
export function createUpdate(lane) {
  const update = {
    lane, // 优先级

    tag: UpdateState, // 0
    payload: null, // 更新内容, updateContainer会进行赋值操作
    callback: null, // 回调，updateContainer会进行赋值操作

    next: null, // 通过next指向下一个update对象形成链表
  };
  return update;
}
```
### 流程
![](https://cdn.nlark.com/yuque/0/2023/jpeg/1447731/1701686567368-57a14d0e-965a-4358-9178-8be0043eea92.jpeg)
## reconciler阶段
此处先归纳一下react-reconciler包的主要作用, 将主要功能分为 4 个方面:

1. 输入: 暴露api函数(如: scheduleUpdateOnFiber), 供给其他包(如react包)调用
2. 注册调度任务: 与调度中心(scheduler包)交互, 注册调度任务task, 等待任务回调
3. 执行任务回调: 在内存中构造出fiber树, 同时与与渲染器(react-dom)交互, 在内存中创建出与fiber对应的DOM节点
4. 输出: 与渲染器(react-dom)交互, 渲染DOM节点

![ReactFiberWorkLoop流程图](https://cdn.nlark.com/yuque/0/2023/png/1447731/1701686678241-b6d24432-3365-41cb-959c-56e196172bc8.png#averageHue=%23fcfbf0&clientId=ue5a65841-45e5-4&from=paste&height=525&id=uc0a6b2ed&originHeight=638&originWidth=921&originalType=binary&ratio=2&rotation=0&showTitle=true&size=69861&status=done&style=none&taskId=u5c14a428-de5f-4842-ad7a-2472bfa616c&title=ReactFiberWorkLoop%E6%B5%81%E7%A8%8B%E5%9B%BE&width=757.5 "ReactFiberWorkLoop流程图")
### scheduleUpdateOnFiber
```jsx
export function scheduleUpdateOnFiber(root, fiber, lane, eventTime) {
  // ...

  // Mark that the root has a pending update.
  // 给FiberRootNode标记pendingLanes
  markRootUpdated(root, lane, eventTime);

  // ...

  // 关键函数：注册调度任务
  ensureRootIsScheduled(root, eventTime);

  // ...
}
```
![image.png](https://cdn.nlark.com/yuque/0/2023/png/1447731/1701687451283-37adad4c-fbad-4b77-94b8-456a56ace535.png#averageHue=%23272b32&clientId=ue5a65841-45e5-4&from=paste&height=189&id=ube60a417&originHeight=378&originWidth=934&originalType=binary&ratio=2&rotation=0&showTitle=false&size=99726&status=done&style=none&taskId=u7cb937c7-8104-471b-a0d4-d79a8ad0e26&title=&width=467)
### ensureRootIsScheduled
```jsx
// 使用此功能可以为 FiberRootNode 调度任务（任务就是构造fiber树）
// 每个 FiberRootNode 只有一个任务；
// 如果任务已调度，我们将检查以确保 
// 现有任务的优先级 与 FiberRootNode 正在处理的下一个任务的 优先级相同
// 每次更新和退出任务之前都会调用此函数
function ensureRootIsScheduled(root, currentTime) {
  if (...) {
  } else {
    // ...
    
    // React 跟 Scheduler 交互的 入口
    // scheduleCallback 就是 Scheduler 包暴露的api
    // 传入的回调是 performConcurrentWorkOnRoot
    // 也就是说，需要被调度的任务是 performConcurrentWorkOnRoot
    newCallbackNode = scheduleCallback(
      // 调度优先级，为了简化逻辑，我们暂不考虑优先级
      schedulerPriorityLevel,
      performConcurrentWorkOnRoot.bind(null, root),
    );
  }

  root.callbackPriority = newCallbackPriority;
  root.callbackNode = newCallbackNode;
}
```
这里就是调度Fiber树构造的入口了，需要让 `Scheduler`执行调度任务是 `performConcurrentWorkOnRoot`
走到这里了，我们先暂停。但心里记住，Scheduler执行的回调是`performConcurrentWorkOnRoot`
为什么呢，因为 Scheduler 跟 React 是解耦的。接下来我们要知道，单纯的 Scheduler 内部做了什么
### Scheduler
![](https://cdn.nlark.com/yuque/0/2023/jpeg/1447731/1701759070854-acac3734-aa5a-4b36-b44a-0e3db5f41f23.jpeg)
 
梳理了单纯的 Scheduler 的整体运行逻辑，我们先着重关注“执行任务回调”，所谓的任务回调，就是react传入给scheduler的一个任务，而这个任务就是 `performConcurrentWorkOnRoot`
![](https://cdn.nlark.com/yuque/0/2023/jpeg/1447731/1701754714735-b06775e5-3b03-4e52-9baa-75c08142d0c8.jpeg)
```jsx
function ensureRootIsScheduled() {
  // ...
  newCallbackNode = scheduleCallback(
  schedulerPriorityLevel,
  performConcurrentWorkOnRoot.bind(null, root),
	);
  // ...
}
```
可以看到 reconciler 把 `performConcurrentWorkOnRoot`传入了Scheduler，等待回调。
### performXXXWorkOnRoot
这个方法是构造Fiber树的入口
`performSyncWorkOnRoot`的逻辑很清晰, 分为 3 部分:

1. fiber 树构造
2. 异常处理: 有可能 fiber 构造过程中出现异常
3. 调用输出
```jsx
function performConcurrentWorkOnRoot(root, didTimeout) {
const originalCallbackNode = root.callbackNode;

  const shouldTimeSlice =
    !includesBlockingLane(root, lanes) &&
    !includesExpiredLane(root, lanes) &&
    (disableSchedulerTimeoutInWorkLoop || !didTimeout);

  // 1. 构造fiber树
  // 可能是并发模式、也可能是同步模式
  // 如果触发了时间切片，就是并发模式
  let exitStatus = shouldTimeSlice
    ? renderRootConcurrent(root, lanes)
    : renderRootSync(root, lanes);

  // 如果是同步模式，走到这里的时候，fiber树就已经被构造好了

  if (
    includesSomeLane(
      workInProgressRootIncludedLanes,
      workInProgressRootUpdatedLanes,
    )
  ) {
    // 如果在render过程中产生了新的update, 且新update的优先级与最初render的优先级有交集
    // 那么最初render无效, 丢弃最初render的结果, 等待下一次调度
    // 刷新帧栈
    prepareFreshStack(root, NoLanes);
  } else if (exitStatus !== RootIncomplete) {
    // 2. 异常处理: 有可能fiber构造过程中出现异常
    if (exitStatus === RootErrored) {
      // ...
    }.
	
    // 3. 输出: 渲染fiber树()
    finishConcurrentRender(root, exitStatus, lanes);
  }

  // 退出前再次检测, 是否还有其他更新, 是否需要发起新调度
  ensureRootIsScheduled(root, now());
  if (root.callbackNode === originalCallbackNode) {
    // 渲染被阻断, 返回一个新的performConcurrentWorkOnRoot函数, 等待下一次调用
    return performConcurrentWorkOnRoot.bind(null, root);
  }
  return null;
}
```
一个`performConcurrentWorkOnRoot`，其实就是一个task
在一个task中，最核心的是构造fiber树（全部构造完毕后同步一次性commit）
我们通过之前的学习，知道了一个task是在workLoop中循环执行的，以实现时间切片和异步“可中断渲染”
而fiber树的构造也是需要中断，所以fiber树的构造多半也是一个workLoop循环，但本质跟scheduler不太一样
### fiber树构造
fiber树的构造入口有两个

- 并发构造 renderRootConcurrent
- 同步构造 renderRootSync

这两个方法的本质相似，我们先从更简单的 renderRootSync 讲起
```jsx
function renderRootSync(root: FiberRoot, lanes: Lanes) {
  const prevExecutionContext = executionContext;
  executionContext |= RenderContext;
  const prevDispatcher = pushDispatcher();
  // ...
  if (workInProgressRoot !== root || workInProgressRootRenderLanes !== lanes) {
    // 刷新帧栈，什么是帧栈？之后再说
    prepareFreshStack(root, lanes);
  }
  // 进入了一个循环，catch的时候继续重新循环
  do {
    try {
      // 重点
      // 同步的阻塞的workLoop
      workLoopSync();

      // 实际上正常执行完一次workLoop就会被break出去
      break;
    } catch (thrownValue) {
      handleError(root, thrownValue);
    }
  } while (true);
  
  resetContextDependencies(); // 重置上下文信息

  executionContext = prevExecutionContext;
  popDispatcher(prevDispatcher);
  ...
  // 置空标识当前render阶段结束， 没有正在执行的render过程
  workInProgressRoot = null;
  workInProgressRootRenderLanes = NoLanes;
  return workInProgressRootExitStatus;
}
```
自上而下渲染Root的时候，又进入到了一个workLoopSync循环
这是一个同步的循环，逻辑很简单，如果 workInProgress 不为空，就一直loop循环
```jsx
function workLoopSync() {
  // Perform work without checking if we need to yield between fiber.
  while (workInProgress !== null) {
    performUnitOfWork(workInProgress);
  }
}
```
![image.png](https://cdn.nlark.com/yuque/0/2023/png/1447731/1701757969977-6e674536-de0d-45c4-9ec9-6b7e37065424.png#averageHue=%23272b32&clientId=ue5a65841-45e5-4&from=paste&height=608&id=uaa225119&originHeight=1216&originWidth=1500&originalType=binary&ratio=2&rotation=0&showTitle=false&size=344506&status=done&style=none&taskId=u0bce97e2-9c18-4106-a277-64d13d9c676&title=&width=750)
可以看到，第一次循环的wip是rootFiber，也就是fiber树的根节点
![image.png](https://cdn.nlark.com/yuque/0/2023/png/1447731/1701758045396-c83dafb6-c0c9-4ca3-bf47-d26f888d593d.png#averageHue=%23262a31&clientId=ue5a65841-45e5-4&from=paste&height=818&id=u97d74d4b&originHeight=1636&originWidth=1260&originalType=binary&ratio=2&rotation=0&showTitle=false&size=332102&status=done&style=none&taskId=uf4868564-1a33-4ac2-92a4-f112cb76636&title=&width=630)
![image.png](https://cdn.nlark.com/yuque/0/2023/png/1447731/1701758099349-b25a1904-2a07-440d-88db-c887ff8fa86d.png#averageHue=%23262a31&clientId=ue5a65841-45e5-4&from=paste&height=811&id=udf75b6dd&originHeight=1622&originWidth=1304&originalType=binary&ratio=2&rotation=0&showTitle=false&size=339259&status=done&style=none&taskId=u1e51cd2b-587f-4b24-b261-b12c21aa8d0&title=&width=652)
然后在循环过程中，通过 `beginWork`构造单个fiber节点
![](https://cdn.nlark.com/yuque/0/2023/jpeg/1447731/1701759714700-102eb158-b7ac-4a8f-ab94-36061d0aae47.jpeg)


workLoopSync的过程是一个深度优先遍历（DFS）之 递归
递归递归，从名字上看来，递归分为 “递” 和 “归”。递 是向下探寻，归 是向上回溯
```jsx
function Node() {
  this.name = '';
  this.children = [];
}

function dfs(node) {
  console.log('探寻阶段: ', node.name);
  node.children.forEach((child) => {
    dfs(child);
  });
  console.log('回溯阶段: ', node.name);
}
```
此处为了简明, 已经将源码中与 dfs 无关的旁支逻辑去掉
```jsx
function workLoopSync() {
  // 1. 最外层循环, 保证每一个节点都能遍历, 不会遗漏
  while (workInProgress !== null) {
    performUnitOfWork(workInProgress);
  }
}

function performUnitOfWork(unitOfWork: Fiber): void {
  const current = unitOfWork.alternate;
  let next;
  // 2. beginWork是向下探寻阶段
  next = beginWork(current, unitOfWork, subtreeRenderLanes);
  if (next === null) {
    // 3. completeUnitOfWork 是回溯阶段
    completeUnitOfWork(unitOfWork);
  } else {
    workInProgress = next;
  }
}

function completeUnitOfWork(unitOfWork: Fiber): void {
  let completedWork = unitOfWork;
  do {
    const current = completedWork.alternate;
    const returnFiber = completedWork.return;
    let next;
    // 3.1 回溯并处理节点
    next = completeWork(current, completedWork, subtreeRenderLanes);
    if (next !== null) {
      // 判断在处理节点的过程中, 派生出新的节点
      workInProgress = next;
      return;
    }
    const siblingFiber = completedWork.sibling;
    // 3.2 判断是否有兄弟节点
    if (siblingFiber !== null) {
      workInProgress = siblingFiber;
      return;
    }
    // 3.3 没有兄弟节点 继续回溯
    completedWork = returnFiber;
    workInProgress = completedWork;
  } while (completedWork !== null);
}
```
假设有以下的组件结构：
```jsx
class App extends React.Component {
  render() {
    return (
      <div className="app">
        <header>header</header>
        <Content />
        <footer>footer</footer>
      </div>
    );
  }
}

class Content extends React.Component {
  render() {
    return (
      <React.Fragment>
        <p>1</p>
        <p>2</p>
        <p>3</p>
      </React.Fragment>
    );
  }
}

export default App;
```
则可以得出遍历路径：
![](https://cdn.nlark.com/yuque/0/2023/jpeg/1447731/1701766761096-0fd40ec8-e3f5-471d-b2fe-848aec702269.jpeg)
注意⚠️：

- 每个fiber节点是最小工作单元，也是中断、恢复的边界
- sibling、return 是伴随 第一次`beginWork`子节点的时候生成的，比如上图中的 3、6（带有括号的标记表示sibling生成阶段）
- 优先遍历直接child，然后遍历sibling兄弟节点

接下来我们具体到一个Fiber，看看是如何构造出来的
### 单fiber构造
fiber是由ReactElement转化而来的，最后会输出为被renderer认识的东西（比如DOM）
我们先暂时放下 `beginWork`，等会再回来。先了解一下什么是ReactElement

jsx大家每天都在使用，为什么呢？因为很好用，像一颗糖，甜到心里
jsx就是一种语法糖，
```jsx
const Item = <div>123</div>
```
这样的一个jsx，会被react-babel编译成：
> 这里不严格，现在的编译结果通常是 jsxRuntime，而非createElement（老版本），
> 但是为了便于理解，我们这里还是使用 createElement

```jsx
React.createElement('div', { children: '123' })
```
createElement，顾名思义，就是创建一个ReactElement。这个方法很简单：
```jsx
export function createElement(type, config, children) {
  // ...
  
  return ReactElement(
    type,
    key,
    ref,
    self,
    source,
    ReactCurrentOwner.current,
    props
  );
}

const ReactElement = function (type, key, ref, self, source, owner, props) {
  const element = {
    // This tag allows us to uniquely identify this as a React Element
    $$typeof: REACT_ELEMENT_TYPE,

    // Built-in properties that belong on the element
    type: type,
    key: key,
    ref: ref,
    props: props,

    // Record the component responsible for creating this element.
    _owner: owner,
  };
  
  return element;
};
```
![image.png](https://cdn.nlark.com/yuque/0/2023/png/1447731/1701768023281-855104a0-633b-49d3-aa2b-99fdc4a68fe8.png#averageHue=%23292f39&clientId=u5db87e6a-a758-4&from=paste&height=266&id=ub2bfa1ee&originHeight=532&originWidth=552&originalType=binary&ratio=2&rotation=0&showTitle=false&size=52822&status=done&style=none&taskId=u09dca423-9812-43db-a69d-8bd4a41537f&title=&width=276)
相信大家都很熟悉这些字段了，如果不熟悉的话，你可以试试打印一个ReactComponent，看看结果

**这样的一个Element，就是构造Fiber的原型**
![image.png](https://cdn.nlark.com/yuque/0/2023/png/1447731/1701768205004-c4128b07-f060-490e-94d9-dc9a4a24f5d2.png#averageHue=%23f7f7f3&clientId=u5db87e6a-a758-4&from=paste&height=580&id=u8b64a87f&originHeight=875&originWidth=1104&originalType=binary&ratio=2&rotation=0&showTitle=false&size=152669&status=done&style=none&taskId=u3540dded-8674-4e10-b514-0ab2f6a8ede&title=&width=732)

好的，我们接着回到 `beginWork`
```jsx
// ... 省略部分无关代码
function performUnitOfWork(unitOfWork: Fiber): void {
  // unitOfWork就是被传入的workInProgress
  const current = unitOfWork.alternate;
  let next;
  // 这里入参current，涉及到双fiber，这里不细讲
  // current是目前渲染的fiber树，wip是正在构建的fiber树（在这里命名是unitOfWork）
  // 简单来说就是内存中有最多两个fiber树，为了在渲染的时候更快（不需要新建，只需要替换）
  next = beginWork(current, unitOfWork, subtreeRenderLanes);
  unitOfWork.memoizedProps = unitOfWork.pendingProps;
  if (next === null) {
    // 如果没有派生出新的节点, 则进入completeWork阶段, 传入的是当前unitOfWork
    completeUnitOfWork(unitOfWork);
  } else {
    workInProgress = next;
  }
}
```
在上文中，我们讲到了，beginWork是下探阶段，completeUnitOfWork是回溯阶段
这两个阶段共同完成了一个fiber节点的构建，所有的fiber节点，则构成了一颗fiber树
#### 探寻阶段 beginWork
主要做了：

1. 根据ReactElement对象，创建出fiber对象，设置了return、sibling等
2. 设置fiber.flags，标记fiber节点的`增、删、改`状态，在回溯阶段处理
3. 给有状态的fiber设置stateNode，比如class组件的stateNode就是类实例。（无状态的如宿主组件（div、span等）在回溯阶段设置stateNode为DOM实例）
```jsx
function beginWork(
  current: Fiber | null,
  workInProgress: Fiber,
  renderLanes: Lanes,
): Fiber | null {
  const updateLanes = workInProgress.lanes;
  if (current !== null) {
    // update逻辑, 首次render不会进入
  } else {
    didReceiveUpdate = false;
  }
  // 1. 设置workInProgress优先级为NoLanes(最高优先级)
  workInProgress.lanes = NoLanes;
  // 2. 根据workInProgress节点的类型, 用不同的方法派生出子节点
  switch (
    workInProgress.tag // 只保留了本例使用到的case
  ) {
    case FunctionComponent: {
      child = updateFunctionComponent(null, workInProgress, Component, resolvedProps, renderLanes);
      return child;
    }
    case ClassComponent: {
      const Component = workInProgress.type;
      const unresolvedProps = workInProgress.pendingProps;
      const resolvedProps =
        workInProgress.elementType === Component
          ? unresolvedProps
          : resolveDefaultProps(Component, unresolvedProps);
      return updateClassComponent(
        current,
        workInProgress,
        Component,
        resolvedProps,
        renderLanes,
      );
    }
    case HostRoot:
      return updateHostRoot(current, workInProgress, renderLanes);
    case HostComponent:
      return updateHostComponent(current, workInProgress, renderLanes);
    case HostText:
      return updateHostText(current, workInProgress);
    case Fragment:
      return updateFragment(current, workInProgress, renderLanes);
  }
}
```
`updateXXX`方法就是构建fiber的核心方法，它们的主要逻辑：

1. 根据 fiber.pendingProps, fiber.updateQueue 这些输入状态，计算出输出状态 fiber.memoizedState（这里跟state相关了）
2. 获取到ReactElement对象
   1. function 类型的fiber节点
      1. 传入正确的props状态，执行 function，获取到返回的ReactElement
   2. class 类型的fiber节点
      1. 创建class的实例，执行render方法，获取返回的ReactElement
   3. HostComponent 原生组件（div、span等 ）的fiber节点
      1. 获取 pendingProps.children
3. 根据2中的ReactElement对象，调用 reconcileChildren 生成fiber子节点。如果ReactElement是数组，就依次生成fiber节点（只会生成直接的子节点，一级），并且设置fiber节点之间的关系，sibling、return、child。BTW，这里面涉及到的东西特别多，很容易陷入源码出不来

举例，看看里面具体做了什么

- fiber树的根节点 HostRootFiber节点
```jsx
// 省略与本节无关代码
function updateHostRoot(current, workInProgress, renderLanes) {
  // 1. 状态计算, 更新整合到 workInProgress.memoizedState中来
  const updateQueue = workInProgress.updateQueue;
  const nextProps = workInProgress.pendingProps;
  const prevState = workInProgress.memoizedState;
  const prevChildren = prevState !== null ? prevState.element : null;
  cloneUpdateQueue(current, workInProgress);
  // 遍历updateQueue.shared.pending, 提取有足够优先级的update对象, 计算出最终的状态 workInProgress.memoizedState
  processUpdateQueue(workInProgress, nextProps, null, renderLanes);
  const nextState = workInProgress.memoizedState;
  // 2. 获取下级`ReactElement`对象
  const nextChildren = nextState.element;
  const root: FiberRoot = workInProgress.stateNode;
  if (root.hydrate && enterHydrationState(workInProgress)) {
    // ...服务端渲染相关, 此处省略
  } else {
    // 3. 根据`ReactElement`对象, 调用`reconcileChildren`生成`Fiber`子节点(只生成`次级子节点`)
    reconcileChildren(current, workInProgress, nextChildren, renderLanes);
  }
  return workInProgress.child;
}
```

- 普通DOM标签节点，如 div、span等
```jsx
// ...省略部分无关代码
function updateHostComponent(
  current: Fiber | null,
  workInProgress: Fiber,
  renderLanes: Lanes,
) {
  // 1. 状态计算, 由于HostComponent是无状态组件, 所以只需要收集 nextProps即可, 它没有 memoizedState
  const type = workInProgress.type;
  const nextProps = workInProgress.pendingProps;
  const prevProps = current !== null ? current.memoizedProps : null;
  // 2. 获取下级`ReactElement`对象
  let nextChildren = nextProps.children;
  const isDirectTextChild = shouldSetTextContent(type, nextProps);

  if (isDirectTextChild) {
    // 如果子节点只有一个文本节点, 不用再创建一个HostText类型的fiber
    nextChildren = null;
  } else if (prevProps !== null && shouldSetTextContent(type, prevProps)) {
    // 特殊操作需要设置fiber.flags
    workInProgress.flags |= ContentReset;
  }
  // 特殊操作需要设置fiber.flags
  markRef(current, workInProgress);
  // 3. 根据`ReactElement`对象, 调用`reconcileChildren`生成`Fiber`子节点(只生成`次级子节点`)
  reconcileChildren(current, workInProgress, nextChildren, renderLanes);
  return workInProgress.child;
}
```
![image.png](https://cdn.nlark.com/yuque/0/2023/png/1447731/1701773210862-1af823c6-52e7-4fd2-830c-7c1f3c740d13.png#averageHue=%23292d36&clientId=u5db87e6a-a758-4&from=paste&height=459&id=u7d3af02c&originHeight=918&originWidth=1148&originalType=binary&ratio=2&rotation=0&showTitle=false&size=90960&status=done&style=none&taskId=u5fceec63-adf4-4d29-811a-4d2d67a4977&title=&width=574)
![image.png](https://cdn.nlark.com/yuque/0/2023/png/1447731/1701773137314-0861cb2c-ff58-4e58-b890-cf34395caf21.png#averageHue=%23252a32&clientId=u5db87e6a-a758-4&from=paste&height=643&id=u02da190d&originHeight=1286&originWidth=1806&originalType=binary&ratio=2&rotation=0&showTitle=false&size=482982&status=done&style=none&taskId=u19d2d95c-ef4f-4446-a2ec-e8947d71ae7&title=&width=903)
![image.png](https://cdn.nlark.com/yuque/0/2023/png/1447731/1701773314124-a736e70e-1a65-4beb-b85c-39390550382f.png#averageHue=%23272b33&clientId=u5db87e6a-a758-4&from=paste&height=737&id=u8b4292e1&originHeight=1474&originWidth=1248&originalType=binary&ratio=2&rotation=0&showTitle=false&size=352933&status=done&style=none&taskId=u73e76316-0c88-4cb5-aaef-b6d8633c7c5&title=&width=624)
![image.png](https://cdn.nlark.com/yuque/0/2023/png/1447731/1701773405370-3a090259-0072-40b8-955f-8ca7107053b5.png#averageHue=%23282c33&clientId=u5db87e6a-a758-4&from=paste&height=232&id=u21966ff5&originHeight=464&originWidth=1506&originalType=binary&ratio=2&rotation=0&showTitle=false&size=129037&status=done&style=none&taskId=uc5b0c30a-e3e3-4ce5-9b09-f66e8a590fd&title=&width=753)
![image.png](https://cdn.nlark.com/yuque/0/2023/png/1447731/1701773538155-18a09e6d-e225-47e2-bb0e-6834e904135b.png#averageHue=%23292e36&clientId=u5db87e6a-a758-4&from=paste&height=407&id=u2749de1d&originHeight=814&originWidth=1442&originalType=binary&ratio=2&rotation=0&showTitle=false&size=154042&status=done&style=none&taskId=ucba6d30f-0f5e-4913-a208-d0eaebb111b&title=&width=721)
![image.png](https://cdn.nlark.com/yuque/0/2023/png/1447731/1701773606511-bab14e4e-2797-48f0-b135-76e56e44021a.png#averageHue=%23282c34&clientId=u5db87e6a-a758-4&from=paste&height=370&id=u83158f95&originHeight=740&originWidth=1992&originalType=binary&ratio=2&rotation=0&showTitle=false&size=269170&status=done&style=none&taskId=ud9a8309d-b76e-4663-9a72-d555725fb37&title=&width=996)
![image.png](https://cdn.nlark.com/yuque/0/2023/png/1447731/1701773692819-8bd487ca-a766-45f9-89b0-8577889309a9.png#averageHue=%2323272e&clientId=u5db87e6a-a758-4&from=paste&height=670&id=uac38b689&originHeight=1340&originWidth=1294&originalType=binary&ratio=2&rotation=0&showTitle=false&size=223603&status=done&style=none&taskId=uec9e1dca-c113-427f-b16d-c7ec348e3ca&title=&width=647)
![image.png](https://cdn.nlark.com/yuque/0/2023/png/1447731/1701773748534-4361ab74-3a22-4cb1-9a04-71191b5dce85.png#averageHue=%23252931&clientId=u5db87e6a-a758-4&from=paste&height=1011&id=u327463f6&originHeight=2022&originWidth=1272&originalType=binary&ratio=2&rotation=0&showTitle=false&size=327939&status=done&style=none&taskId=u7fe40ba4-43a8-46e7-93e6-50afb4253d5&title=&width=636)
至此，完成了根据ReactElement构建fiber对象
最后返回到createChild，我想说一下这段代码，这里的
```jsx
let resultingFirstChild = null;
let previousNewFiber = null;

let oldFiber = currentFirstChild;

if (oldFiber === null) {
  // mount阶段
  for (; newIdx < newChildren.length; newIdx++) {
    // 根据ReactElement创建fiber
    const newFiber = createChild(returnFiber, newChildren[newIdx], lanes);
    if (newFiber === null) {
      continue;
    }
    lastPlacedIndex = placeChild(newFiber, lastPlacedIndex, newIdx);
    if (previousNewFiber === null) {
      // 这是第一次循环，说明该节点是子节点中的第一个节点
      resultingFirstChild = newFiber;
    } else {
      // 此时是子节点的非首节点，当前节点是上一个节点的兄弟
      // 给上一个节点设置兄弟节点
      previousNewFiber.sibling = newFiber;
    }
    // 指针右移
    previousNewFiber = newFiber;
  }
	// 返回第一个子节点
	// 这个节点中是链表的头指针，其中包含了所有兄弟fiber节点的信息
	return resultingFirstChild;
}
```
![image.png](https://cdn.nlark.com/yuque/0/2023/png/1447731/1701774156174-09da4209-ec2a-49a2-b65a-4904c9436856.png#averageHue=%23262931&clientId=u5db87e6a-a758-4&from=paste&height=624&id=u9c8575c8&originHeight=1248&originWidth=1402&originalType=binary&ratio=2&rotation=0&showTitle=false&size=283846&status=done&style=none&taskId=u19c29eae-3c71-48bc-b651-5b23c73cb4e&title=&width=701)
可以看出来，sibling指针指向下一个兄弟fiber节点
至此，实际上把children都构造成了fiber
![image.png](https://cdn.nlark.com/yuque/0/2023/png/1447731/1701774284115-4f9d3ff1-f09b-4e08-a2b3-35ad99880a69.png#averageHue=%23252931&clientId=u5db87e6a-a758-4&from=paste&height=776&id=u4ed9ab72&originHeight=1552&originWidth=1332&originalType=binary&ratio=2&rotation=0&showTitle=false&size=341130&status=done&style=none&taskId=ub09f2865-eead-4a9d-b1ca-d3ae8880c71&title=&width=666)
最后返回了直接子节点，用于下一次 `performUnitOfWork`
`performUnitOfWork`是最小的执行单元，无法中断，也就是说，每次时间切片中，只要走到了 `performUnitOfWork`方法，就至少会构造一个fiber节点
![](https://cdn.nlark.com/yuque/0/2023/jpeg/1447731/1701843572720-4feee61f-a296-49b9-b34f-41f606315606.jpeg)
#### 回溯阶段 completeUnitOfWork
在beginWork探寻阶段，已经生成了fiber节点。completeUnitOfWork阶段，主要是处理fiber节点
核心逻辑如下：

1. 调用 completeWork
   1. 给原生组件的 fiber节点（HostComponent、HostText）创建DOM实例，设置 fiber.stateNode 局部状态。比如 tag=HostComponent, HostText节点: fiber.stateNode 指向这个 DOM 实例
   2. 给DOM节点设置属性、绑定事件
   3. 设置 fiber.flags 标记（增删改）
2. 把当前fiber对象的副作用队列（firstEffect、lastEffect）添加到父节点的副作用队列中
3. 识别beginWork阶段设置的fiber.flags，判断当前fiber是否有副作用（增删改），如果有，就将当前fiber加入到父节点的effects队列，commit阶段处理
```jsx
function completeUnitOfWork(unitOfWork: Fiber): void {
  let completedWork = unitOfWork;
  // 外层循环控制并移动指针(`workInProgress`,`completedWork`等)
  do {
    const current = completedWork.alternate;
    const returnFiber = completedWork.return;
    if ((completedWork.flags & Incomplete) === NoFlags) {
      let next;
      // 1. 处理Fiber节点, 会调用渲染器(调用react-dom包, 关联Fiber节点和dom对象, 绑定事件等)
      next = completeWork(current, completedWork, subtreeRenderLanes); // 处理单个节点
      if (next !== null) {
        // 如果派生出其他的子节点, 则回到`beginWork`阶段进行处理
        workInProgress = next;
        return;
      }
      // 重置子节点的优先级
      resetChildLanes(completedWork);
      if (
        returnFiber !== null &&
        (returnFiber.flags & Incomplete) === NoFlags
      ) {
        // 2. 收集当前Fiber节点以及其子树的副作用effects
        // 2.1 把子节点的副作用队列添加到父节点上
        if (returnFiber.firstEffect === null) {
          returnFiber.firstEffect = completedWork.firstEffect;
        }
        if (completedWork.lastEffect !== null) {
          if (returnFiber.lastEffect !== null) {
            returnFiber.lastEffect.nextEffect = completedWork.firstEffect;
          }
          returnFiber.lastEffect = completedWork.lastEffect;
        }
        // 2.2 如果当前fiber节点有副作用, 将其添加到子节点的副作用队列之后.
        const flags = completedWork.flags;
        if (flags > PerformedWork) {
          // PerformedWork是提供给 React DevTools读取的, 所以略过PerformedWork
          if (returnFiber.lastEffect !== null) {
            returnFiber.lastEffect.nextEffect = completedWork;
          } else {
            returnFiber.firstEffect = completedWork;
          }
          returnFiber.lastEffect = completedWork;
        }
      }
    } else {
      // 异常处理, 本节不讨论
    }

    const siblingFiber = completedWork.sibling;
    if (siblingFiber !== null) {
      // 如果有兄弟节点, 返回之后再次进入`beginWork`阶段
      workInProgress = siblingFiber;
      return;
    }
    // 移动指针, 指向下一个节点
    completedWork = returnFiber;
    workInProgress = completedWork;
  } while (completedWork !== null);
  // 已回溯到根节点, 设置workInProgressRootExitStatus = RootCompleted
  if (workInProgressRootExitStatus === RootIncomplete) {
    workInProgressRootExitStatus = RootCompleted;
  }
}
```
##### completeWork
```jsx
function completeWork(
  current: Fiber | null,
  workInProgress: Fiber,
  renderLanes: Lanes,
): Fiber | null {
  const newProps = workInProgress.pendingProps;
  popTreeContext(workInProgress);
  // 这里跟beiginWork一致的，都是通过判断Fiber的tag标签去判断执行什么逻辑
  switch (workInProgress.tag) {
    case IndeterminateComponent: ...
    case LazyComponent: ...
    case SimpleMemoComponent: ...
    case FunctionComponent: ...
    case ForwardRef: ...
    case Fragment: ...
    case Mode: ...
    case Profiler: ...
    case ContextConsumer: ...
    case MemoComponent: ...
    case ClassComponent: ....
    case HostRoot: ...
    case HostComponent: ....
    case HostText: ...
    case SuspenseComponent: ....
    case HostPortal: ...
    case ContextProvider: ...
    case IncompleteClassComponent: ...
    case SuspenseListComponent: ....
    case OffscreenComponent:
    case LegacyHiddenComponent: ....
    case CacheComponent: ...
  }
}
```
```jsx
case HostComponent: {
  popHostContext(workInProgress);
  // 拿到根节点的DOM，见下图
  const rootContainerInstance = getRootHostContainer();
  // 拿到类型
  const type = workInProgress.type; 

  if (current !== null && workInProgress.stateNode != null) {
   // ...
  } else {
   // ... 
   // mount
   const currentHostContext = getHostContext();  // 拿到上下文信息
   const wasHydrated = popHydrationState(workInProgress);
   if (wasHydrated) { ... } else {
     // 根据Fiber创建对应的DOM结构信息
     const instance = createInstance(
       type,
       newProps,
       rootContainerInstance,
       currentHostContext,
       workInProgress,
     );
     // 把子树中的DOM对象append到本节点的DOM对象之后
     appendAllChildren(instance, workInProgress, false, false);
     // 设置stateNode属性，指向DOM对象
     workInProgress.stateNode = instance;  
     // ...

     if (
        // 设置DOM对象的属性, 绑定事件等
        finalizeInitialChildren(
          instance,
          type,
          newProps,
          rootContainerInstance,
          currentHostContext,
        )
      ) {
        // 设置fiber.flags标记(Update)
        markUpdate(workInProgress);
      }
      if (workInProgress.ref !== null) {
        // 设置fiber.flags标记(Ref)
        markRef(workInProgress);
      }
      return null;
   }
}
```
![](https://cdn.nlark.com/yuque/0/2023/jpeg/1447731/1701844639970-a8e230e7-43ad-477a-ba98-37859e7e89b3.jpeg)


一个ReactElement经过beginWork和completeUnitOfWork后，就完成了单个fiber的构造
回溯全部完成后，一颗fiber树也就构造好了

代码很干涩，接下来图示整个fiber树构建的过程

#### 图解mount过程
什么是帧栈？
在React源码中, 每一次执行fiber树构造(也就是调用performSyncWorkOnRoot或者performConcurrentWorkOnRoot函数)的过程, 都需要一些全局变量来保存状态（比如workInProgresworkInProgressRoot等
如果从单个变量来看, 它们就是一个个的全局变量. 如果将这些全局变量组合起来, 它们代表了当前fiber树构造的活动记录. 通过这一组全局变量, 可以还原fiber树构造过程(比如时间切片的实现过程，fiber树构造过程被打断之后需要还原进度, 全靠这一组全局变量). 所以每次fiber树构造是一个独立的过程, 需要独立的一组全局变量, 在React内部把这一个独立的过程封装为一个栈帧stack(简单来说就是每次构造都需要独立的空间)

待构造的示例代码
```jsx
class App extends React.Component {
  componentDidMount() {
    console.log(`App Mount`);
    console.log(`App 组件对应的fiber节点: `, this._reactInternals);
  }
  render() {
    return (
      <div className="app">
        <header>header</header>
        <Content />
      </div>
    );
  }
}

class Content extends React.Component {
  componentDidMount() {
    console.log(`Content Mount`);
    console.log(`Content 组件对应的fiber节点: `, this._reactInternals);
  }
  render() {
    return (
      <>
        <p>1</p>
        <p>2</p>
      </>
    );
  }
}
export default App;
```

构造前:
在上文已经说明, 进入循环构造前会调用prepareFreshStack刷新栈帧, 在进入fiber树构造循环之前, 保持这这个初始化状态：
![image.png](https://cdn.nlark.com/yuque/0/2023/png/1447731/1701787362534-16d858c3-285b-4a96-a438-ba3e95b05ec3.png#averageHue=%23f7d07c&clientId=u5db87e6a-a758-4&from=paste&height=214&id=ub7288e1b&originHeight=273&originWidth=972&originalType=binary&ratio=2&rotation=0&showTitle=false&size=44795&status=done&style=none&taskId=u483708bd-15de-48b0-a797-dd9f982ba03&title=&width=762)


`performUnitOfWork`第 1 次下探(只执行`beginWork`):

- 执行前: `workInProgress`指针指向`HostRootFiber.alternate`对象, 此时`current = workInProgress.alternate`指向`fiberRoot.current`是非空的(初次构造, 只在根节点时, `current`非空).
- 执行过程: 调用`updateHostRoot` 
   - 在`reconcileChildren`阶段, 向下构造`次级子节点fiber(<App/>)`, 同时设置子节点(`fiber(<App/>)`)[fiber.flags |= Placement](https://github.com/facebook/react/blob/v17.0.2/packages/react-reconciler/src/ReactChildFiber.old.js#L376-L378)
- 执行后: 返回下级节点`fiber(<App/>)`, 移动`workInProgress`指针指向子节点`fiber(<App/>)`

![image.png](https://cdn.nlark.com/yuque/0/2023/png/1447731/1701787605003-71eed91f-adb5-4c36-805f-f26f58c48c0b.png#averageHue=%237aba5c&clientId=u5db87e6a-a758-4&from=paste&height=316&id=u3941fe57&originHeight=408&originWidth=972&originalType=binary&ratio=2&rotation=0&showTitle=false&size=55424&status=done&style=none&taskId=ucb262f11-c343-4400-a403-0e5f2a3d290&title=&width=752)


`performUnitOfWork`第 2 次下探(只执行`beginWork`):

- 执行前: `workInProgress`指针指向`fiber(<App/>)`节点, 此时`current = null`
- 执行过程: 调用`updateClassComponent` 
   - 本示例中, class 实例存在生命周期函数`componentDidMount`, 所以会设置`fiber(<App/>)`节点[workInProgress.flags |= Update](https://github.com/facebook/react/blob/v17.0.2/packages/react-reconciler/src/ReactFiberClassComponent.old.js#L892-L894)
   - 需要注意`classInstance.render()`在本步骤执行后, 虽然返回了`render`方法中所有的`ReactElement`对象, 但是随后`reconcileChildren`只构造`次级子节点`
   - 在`reconcileChildren`阶段, 向下构造`次级子节点div`
- 执行后: 返回下级节点`fiber(div)`, 移动`workInProgress`指针指向子节点`fiber(div)`

![image.png](https://cdn.nlark.com/yuque/0/2023/png/1447731/1701787778925-c21b7797-81aa-45d9-b169-cbfb038c307b.png#averageHue=%234da53f&clientId=u5db87e6a-a758-4&from=paste&height=372&id=udb788046&originHeight=504&originWidth=1022&originalType=binary&ratio=2&rotation=0&showTitle=false&size=84059&status=done&style=none&taskId=u983a8c95-4162-451a-84da-7f68269fd11&title=&width=754)


`performUnitOfWork`第 3 次下探 (只执行`beginWork`):

- 执行前: `workInProgress`指针指向`fiber(div)`节点, 此时`current = null`
- 执行过程: 因为tag是div，所以调用`updateHostComponent` 
   - 在`reconcileChildren`阶段, 向下构造`次级子节点`(本示例中, `div`有 2 个次级子节点)
      - 构建所有同级子节点fiber，并设置相邻关系（sibling、return、child）
- 执行后: 返回下级节点`fiber(header)`, 移动`workInProgress`指针指向子节点`fiber(header)`

![image.png](https://cdn.nlark.com/yuque/0/2023/png/1447731/1701788110453-ce66a335-b835-4fff-8366-b68c06e47aa6.png#averageHue=%2346a139&clientId=u5db87e6a-a758-4&from=paste&height=443&id=ufd07b01b&originHeight=615&originWidth=1042&originalType=binary&ratio=2&rotation=0&showTitle=false&size=105296&status=done&style=none&taskId=u4641b9e7-20ce-4c94-8ed1-405b6022f34&title=&width=751)


`performUnitOfWork`第 4 次 下探(执行`beginWork`和`completeUnitOfWork`):

- `beginWork`执行前: `workInProgress`指针指向`fiber(header)`节点, 此时`current = null`
- `beginWork`执行过程: 调用`updateHostComponent` 
   - 本示例中`header`的子节点是一个[直接文本节点](https://github.com/facebook/react/blob/8e5adfbd7e605bda9c5e96c10e015b3dc0df688e/packages/react-dom/src/client/ReactDOMHostConfig.js#L350-L361),设置[nextChildren = null](https://github.com/facebook/react/blob/v17.0.2/packages/react-reconciler/src/ReactFiberBeginWork.old.js#L1147)(直接文本节点并不会被当成具体的`fiber`节点进行处理, 而是在宿主环境(父组件)中通过属性进行设置. 所以无需创建`HostText`类型的 fiber 节点, 同时节省了向下遍历开销.).
   - 由于`nextChildren = null`, 经过`reconcileChildren`阶段处理后, 返回值也是`null`
- `beginWork`执行后: 由于下级节点为`null`, 所以进入`completeUnitOfWork(unitOfWork)`函数, 传入的参数`unitOfWork`实际上就是`workInProgress`(此时指向`fiber(header)`节点)

![image.png](https://cdn.nlark.com/yuque/0/2023/png/1447731/1701788275356-74471533-c3f4-4532-8fab-92d2013de9d8.png#averageHue=%2347a23a&clientId=u5db87e6a-a758-4&from=paste&height=452&id=u045bfe1b&originHeight=613&originWidth=1026&originalType=binary&ratio=2&rotation=0&showTitle=false&size=94582&status=done&style=none&taskId=u51458ee6-ca92-48ac-a237-a33c1744af0&title=&width=756)
第 1 次回溯：

1. 执行`completeWork`函数 
   - 创建`fiber(header)`节点对应的`DOM`实例, 并`append`子节点的`DOM`实例
   - 设置`DOM`属性, 绑定事件等(本示例中, 节点`fiber(header)`没有事件绑定)
2. 上移副作用队列: 由于本节点`fiber(header)`没有副作用(`fiber.flags = 0`), 所以执行之后副作用队列没有实质变化(目前为空).
3. 向上回溯: 由于还有兄弟节点, 把`workInProgress`指针指向下一个兄弟节点`fiber(<Content/>)`, 退出`completeUnitOfWork`.

![image.png](https://cdn.nlark.com/yuque/0/2023/png/1447731/1701788349003-2d713a07-9887-4b69-bf52-8a2b36f1f33f.png#averageHue=%23b6d68a&clientId=u5db87e6a-a758-4&from=paste&height=453&id=u88ce2a1a&originHeight=700&originWidth=1162&originalType=binary&ratio=2&rotation=0&showTitle=false&size=103684&status=done&style=none&taskId=u11d8eda0-bd0b-4bbc-a847-a340b3ea61f&title=&width=752)


`performUnitOfWork`第 5 次 下探(执行`beginWork`):

- 执行前:`workInProgress`指针指向`fiber(<Content/>)`节点.
- 执行过程: 这是一个`class`类型的节点, 与第 2 次调用逻辑一致.
- 执行后: 返回下级节点`fiber(p)`, 移动`workInProgress`指针指向子节点`fiber(p)`

![image.png](https://cdn.nlark.com/yuque/0/2023/png/1447731/1701788395548-db0debdf-dff8-4160-87ff-81de8a9fa040.png#averageHue=%234ba540&clientId=u5db87e6a-a758-4&from=paste&height=547&id=u72798bd3&originHeight=795&originWidth=1105&originalType=binary&ratio=2&rotation=0&showTitle=false&size=129657&status=done&style=none&taskId=uc7859ffd-0fce-4499-96ae-29904a79520&title=&width=760.5)


`performUnitOfWork`第 6 次下探 （执行`beginWork`和`completeUnitOfWork`）

- 与第 4 次调用中创建`fiber(header)`节点的逻辑一致. 先后会执行`beginWork`和`completeUnitOfWork`, 最后构造 DOM 实例, 并将把`workInProgress`指针指向下一个兄弟节点`fiber(p)`

第2次回溯
![image.png](https://cdn.nlark.com/yuque/0/2023/png/1447731/1701788604262-fc3ae07e-0bff-42a7-b0ce-9e18e27955d4.png#averageHue=%234ba540&clientId=u5db87e6a-a758-4&from=paste&height=550&id=u1453f601&originHeight=815&originWidth=1091&originalType=binary&ratio=2&rotation=0&showTitle=false&size=132178&status=done&style=none&taskId=ub69875ad-1b8d-4a68-a598-c9e3e30e5d4&title=&width=736.5)
   
`performUnitOfWork`第 7 次下探(执行`beginWork`和`completeUnitOfWork`):

- `beginWork`执行过程: 与上次调用中创建`fiber(p)`节点的逻辑一致
- `completeUnitOfWork`执行过程: 以`fiber(p)`为起点, 向上回溯

第3次回溯

1. 执行`completeWork`函数: 创建`fiber(p)`节点对应的`DOM`实例, 并`append`子树节点的`DOM`实例
2. 上移副作用队列: 由于本节点`fiber(p)`没有副作用, 所以执行之后副作用队列没有实质变化(目前为空).
3. 向上回溯: 由于没有兄弟节点, 把`workInProgress`指针指向父节点`fiber(<Content/>)`

![image.png](https://cdn.nlark.com/yuque/0/2023/png/1447731/1701789046014-cbf1cc35-ee84-42de-84fc-497875cd2ce8.png#averageHue=%234ba540&clientId=u5db87e6a-a758-4&from=paste&height=550&id=u6985f51a&originHeight=815&originWidth=1091&originalType=binary&ratio=2&rotation=0&showTitle=false&size=135160&status=done&style=none&taskId=u8c87c254-eec0-410a-a7c5-f88969c1a0a&title=&width=736.5)

第4次回溯

1. 执行`completeWork`函数: class 类型的节点不做处理
2. 上移副作用队列: 
   - 本节点`fiber(<Content/>)`的`flags`标志位有改动(`completedWork.flags > PerformedWork`), 将本节点添加到父节点(`fiber(div)`)的副作用队列之后(`firstEffect`和`lastEffect`属性分别指向副作用队列的首部和尾部).
3. 向上回溯: 把`workInProgress`指针指向父节点`fiber(div)`

![image.png](https://cdn.nlark.com/yuque/0/2023/png/1447731/1701789078052-8b53cad7-606b-4ac5-bc1e-d3a81d60dd58.png#averageHue=%234ca541&clientId=u5db87e6a-a758-4&from=paste&height=533&id=ue122e01f&originHeight=812&originWidth=1139&originalType=binary&ratio=2&rotation=0&showTitle=false&size=143157&status=done&style=none&taskId=u5454bbf7-04bd-4697-a391-b21423ca1c6&title=&width=747.5)

第5次回溯

1. 执行`completeWork`函数: 创建`fiber(div)`节点对应的`DOM`实例, 并`append`子树节点的`DOM`实例
2. 上移副作用队列: 
   - 本节点`fiber(div)`的副作用队列不为空, 将其拼接到父节点`fiber<App/>`的副作用队列后面.
3. 向上回溯: 把`workInProgress`指针指向父节点`fiber(<App/>)`

![image.png](https://cdn.nlark.com/yuque/0/2023/png/1447731/1701789217601-498b2bc5-c51d-43b5-98bc-4002042e68c6.png#averageHue=%234ca541&clientId=u5db87e6a-a758-4&from=paste&height=528&id=u45b27a66&originHeight=812&originWidth=1159&originalType=binary&ratio=2&rotation=0&showTitle=false&size=152121&status=done&style=none&taskId=uf46e5d86-9495-4fa1-acb2-43d3485b61e&title=&width=753.5)

第6次回溯：

1. 执行`completeWork`函数: class 类型的节点不做处理
2. 上移副作用队列: 
   - 本节点`fiber(<App/>)`的副作用队列不为空, 将其拼接到父节点`fiber(HostRootFiber)`的副作用队列上.
   - 本节点`fiber(<App/>)`的`flags`标志位有改动(`completedWork.flags > PerformedWork`), 将本节点添加到父节点`fiber(HostRootFiber)`的副作用队列之后.
   - 最后队列的顺序是`子节点在前, 本节点在后`
3. 向上回溯: 把`workInProgress`指针指向父节点`fiber(HostRootFiber)`

![image.png](https://cdn.nlark.com/yuque/0/2023/png/1447731/1701789278107-b62bd02e-0d4a-486c-907f-49f425ff0705.png#averageHue=%234da541&clientId=u5db87e6a-a758-4&from=paste&height=528&id=uc7f2caee&originHeight=812&originWidth=1159&originalType=binary&ratio=2&rotation=0&showTitle=false&size=163426&status=done&style=none&taskId=u683d6843-9ac8-4714-bcd3-cfb50206954&title=&width=753.5)

第7次回溯：

1. 执行`completeWork`函数: 对于`HostRoot`类型的节点, 初次构造时设置[workInProgress.flags |= Snapshot](https://github.com/facebook/react/blob/v17.0.2/packages/react-reconciler/src/ReactFiberCompleteWork.old.js#L693)
2. 向上回溯: 由于父节点为空, 无需进入处理副作用队列的逻辑. 最后设置`workInProgress=null`, 并退出`completeUnitOfWork`

![image.png](https://cdn.nlark.com/yuque/0/2023/png/1447731/1701789319474-36a59595-b7bb-41ff-969e-6785c4b223d4.png#averageHue=%2355aa4b&clientId=u5db87e6a-a758-4&from=paste&height=532&id=u71803baa&originHeight=812&originWidth=1159&originalType=binary&ratio=2&rotation=0&showTitle=false&size=164111&status=done&style=none&taskId=uf09b66ef-6717-4b6c-96e1-442403c5ac3&title=&width=759.5)

到此整个`fiber树构造循环`已经执行完毕, 拥有一棵完整的`fiber树`, 并且在`fiber树`的根节点上挂载了副作用队列, 副作用队列的顺序是层级越深子节点越靠前。这也是为什么子组件的生命周期更先执行

`renderRootSync`函数退出之前, 会重置`workInProgressRoot = null`, 表明没有正在进行中的`render`. 且把最新的`fiber树`挂载到`fiberRoot.finishedWork`上. 
这时整个 fiber 树的内存结构如下(注意`fiberRoot.finishedWork`和`fiberRoot.current`指针,在`commitRoot`阶段会进行处理):
![image.png](https://cdn.nlark.com/yuque/0/2023/png/1447731/1701789532642-0fe8702b-4aa0-40de-8e9e-8898e19af133.png#averageHue=%23e0fafa&clientId=u5db87e6a-a758-4&from=paste&height=753&id=uad81208c&originHeight=812&originWidth=799&originalType=binary&ratio=2&rotation=0&showTitle=false&size=131323&status=done&style=none&taskId=u7c2979a6-b775-49b3-88a1-8b2165f023f&title=&width=740.5)

至此，一颗fiber的mount构建过程就全部执行完毕了。但这只是mount，还有update更新的流程
update相对mount稍微复杂些，我们进入更复杂的流程之前，先思考一下

1. fiber的可中断渲染如何实现？
2. 如果某个element有1000万个兄弟节点，会导致fiber构造卡顿吗？
### fiber update
update 涉及到了 双fiber缓冲，这里讲一下什么是双fiber缓冲
缓冲是一种经典的空间换时间的优化方式，为什么React采用了双fiber，其中肯定有个理由是 「为了渲染更丝滑」。至于其他原因，我们后面再探究
在React项目中，内存中最多存在两颗fiber树，分别是

- 正在内存中构建的fiber树 —— workInProgress
- 渲染在页面上的fiber树 —— fiberRootNode.current

在以上的内容中，我们只涉及到了一颗workInProgress树，因为mount的时候，页面还未渲染fiber
![image.png](https://cdn.nlark.com/yuque/0/2023/png/1447731/1701828589826-f7fd649f-be9b-488a-949e-7bd5ccfb6d86.png#averageHue=%234ba540&clientId=udd28545b-dbc5-4&from=paste&height=564&id=u4e2e2231&originHeight=815&originWidth=1091&originalType=binary&ratio=2&rotation=0&showTitle=false&size=135160&status=done&style=none&taskId=ub52a9657-27dc-423e-bcdc-8aa4f37808f&title=&width=755.5)
可以看到，此时页面上的fiber树还是空的。经过了commit render（暂时不用理解这个）后，就变成了这样：
![image.png](https://cdn.nlark.com/yuque/0/2023/png/1447731/1701828921951-15db731d-1105-4e83-b695-25ee8806da9a.png#averageHue=%23dbe7a5&clientId=udd28545b-dbc5-4&from=paste&height=515&id=u17f38065&originHeight=898&originWidth=1310&originalType=binary&ratio=2&rotation=0&showTitle=false&size=181444&status=done&style=none&taskId=uf0d1a5ae-a245-4a6d-b5b0-c42336d24b4&title=&width=752)
可以看到，

注意：

- mount或update之前，有个创建wip的阶段
   - 建立了wip和current之间的联系（相互引用）

![image.png](https://cdn.nlark.com/yuque/0/2023/png/1447731/1701830212012-7f6be7d6-c87c-4def-b9ae-5bd5c98571b0.png#averageHue=%23282c34&clientId=udd28545b-dbc5-4&from=paste&height=61&id=u516b5209&originHeight=122&originWidth=726&originalType=binary&ratio=2&rotation=0&showTitle=false&size=20739&status=done&style=none&taskId=u68cf4679-656b-4c5e-a55c-9415734e488&title=&width=363)

   - 这时候还没有child、sibling那些，因为还没构造过fiber树

![image.png](https://cdn.nlark.com/yuque/0/2023/png/1447731/1701829492489-d77e53d1-f155-46f7-a4c8-a226811ae22c.png#averageHue=%23262931&clientId=udd28545b-dbc5-4&from=paste&height=789&id=ud5cbe9e0&originHeight=1578&originWidth=1354&originalType=binary&ratio=2&rotation=0&showTitle=false&size=266662&status=done&style=none&taskId=u8c659810-d699-4d71-8f71-63195b43194&title=&width=677)

   - 如果是update，wip指向current.alternate（经历了mount的相互绑定，可以在current中取到wip了，当然，也可以在wip中取到current）
   - 因为经历了一次构造了，current已经是一颗fiber树了，有fiber之间的关系了

![image.png](https://cdn.nlark.com/yuque/0/2023/png/1447731/1701829901044-08f8efa0-8011-46a9-b4c8-409952582a58.png#averageHue=%2325282f&clientId=udd28545b-dbc5-4&from=paste&height=773&id=u0ea201a1&originHeight=1410&originWidth=1084&originalType=binary&ratio=2&rotation=0&showTitle=false&size=270644&status=done&style=none&taskId=u48de700c-eae7-434c-8856-e6273a7147e&title=&width=594)
React应用的根节点（FiberRootNode）通过使current指针在不同Fiber树的rootFiber间切换来完成current Fiber树指向的切换

即当workInProgress Fiber树构建完成交给Renderer渲染在页面上后，应用根节点的current指针指向workInProgress Fiber树，此时workInProgress Fiber树就变为current Fiber树。（提问：那么此时的WIP树是什么呢？）

每次状态更新都会产生新的workInProgress Fiber树，通过current与workInProgress的替换，完成DOM更新

![image.png](https://cdn.nlark.com/yuque/0/2023/png/1447731/1701830693406-b498d5c4-fafc-4dd3-b93e-24a10351c336.png#averageHue=%23fefefe&clientId=udd28545b-dbc5-4&from=paste&height=151&id=u16bf0f40&originHeight=302&originWidth=1436&originalType=binary&ratio=2&rotation=0&showTitle=false&size=51424&status=done&style=none&taskId=u72ecda23-68fc-4b02-adce-cd24db8008e&title=&width=718)
这是React技术揭秘中的一段话，我并不苟同。
我认为，update的时候，不需要重新构建一颗新的workInProgress树，而是复用current.alternate，这是一颗已经构建好的树，不过是老的而已


讲完双fiber，我们再说fiber的update
update的示例代码
```jsx
import React from 'react';

class App extends React.Component {
  state = {
    list: ['A', 'B', 'C'],
  };
  onChange = () => {
    this.setState({ list: ['C', 'A', 'X'] });
  };
  componentDidMount() {
    console.log(`App Mount`);
  }
  render() {
    return (
      <>
        <Header />
        <button onClick={this.onChange}>change</button>
        <div className="content">
          {this.state.list.map((item) => (
            <p key={item}>{item}</p>
          ))}
        </div>
      </>
    );
  }
}

class Header extends React.PureComponent {
  render() {
    return (
      <>
        <h1>title</h1>
        <h2>title2</h2>
      </>
    );
  }
}
export default App;
```

在`初次渲染`完成之后, 与`fiber`相关的内存结构如下(后文以此图为基础, 演示`对比更新`过程)：
![image.png](https://cdn.nlark.com/yuque/0/2023/png/1447731/1701790338006-02c5d148-fc89-4ffd-b2e0-9f94b4dc6a14.png#averageHue=%23dffbf8&clientId=udd28545b-dbc5-4&from=paste&height=762&id=u94511543&originHeight=1253&originWidth=1204&originalType=binary&ratio=2&rotation=0&showTitle=false&size=179431&status=done&style=none&taskId=ua2559b01-3d30-4a8c-b14e-afc867f7267&title=&width=732)

一次update，还是会走一次reconciler的流程。reconciler流程的入口是 scheduleUpdateOnFiber，所以我们在debug的时候可以把断点打在这里
![image.png](https://cdn.nlark.com/yuque/0/2023/png/1447731/1701686678241-b6d24432-3365-41cb-959c-56e196172bc8.png#averageHue=%23fcfbf0&clientId=ue5a65841-45e5-4&from=paste&height=525&id=SIiPO&originHeight=638&originWidth=921&originalType=binary&ratio=2&rotation=0&showTitle=false&size=69861&status=done&style=none&taskId=u5c14a428-de5f-4842-ad7a-2472bfa616c&title=&width=757.5)

React有哪些更新方式呢？
#### 3 种更新方式
如要主动发起更新, 有 3 种常见方式:

1. `Class`组件中调用`setState`.
2. `Function`组件中调用`hook`对象暴露出的`dispatchAction`（useState、useReducer都会返回dispatchAction）
3. 在`container`节点上重复调用ReactDOM的`render`([官网示例](https://reactjs.org/docs/rendering-elements.html#react-only-updates-whats-necessary))，这种方式很少见
> 我觉得React关于状态更新的API，设计得很好。尽量减少用户入口，减轻了用户的开发心智负担，排查问题也很方便


##### setState
```jsx
Component.prototype.setState = function (partialState, callback) {
  this.updater.enqueueSetState(this, partialState, callback, 'setState');
};
```
在fiber的beginWork阶段，class组件的初始化就完成之后，this.update如下：
```jsx
const classComponentUpdater = {
  isMounted,
  enqueueSetState(inst, payload, callback) {
    // 1. 获取class实例对应的fiber节点，见下图
    const fiber = getInstance(inst);
    const lane = requestUpdateLane(fiber);

    // 2. 根据优先级，创建update对象
    const update = createUpdate(lane);
    update.payload = payload;

    // 3. 将update对象添加到当前Fiber节点的updateQueue队列当中
    const root = enqueueUpdate(fiber, update, lane);
    
    // 4. 又见 scheduleUpdateOnFiber
    // 进入reconciler流程（输入环节）
    scheduleUpdateOnFiber(root, fiber, lane, eventTime);
    }
  },
  enqueueReplaceState(inst, payload, callback) {
    // ...
  },
  enqueueForceUpdate(inst, callback) {
    // ...
  },
};
```

获取当前组件的fiber
![image.png](https://cdn.nlark.com/yuque/0/2023/png/1447731/1701831574182-ce6bb8ec-61b7-4fbe-9dfd-42dfbdd3717f.png#averageHue=%23282b33&clientId=udd28545b-dbc5-4&from=paste&height=273&id=ubf1685b8&originHeight=546&originWidth=1642&originalType=binary&ratio=2&rotation=0&showTitle=false&size=216105&status=done&style=none&taskId=ucfc82761-f0c7-4bee-8e49-061de4830fb&title=&width=821)
创建update对象
![image.png](https://cdn.nlark.com/yuque/0/2023/png/1447731/1701831660034-92f10ee3-1ae8-4e8a-a120-9b6dc4a26849.png#averageHue=%23262931&clientId=udd28545b-dbc5-4&from=paste&height=217&id=ue2ede2d1&originHeight=434&originWidth=918&originalType=binary&ratio=2&rotation=0&showTitle=false&size=68818&status=done&style=none&taskId=u46711973-06f2-425e-9bc7-c2517f9883d&title=&width=459)

##### dispatchAction
> 此处只是为了对比`dispatchAction`和`setState`. 有关`hook`原理的深入分析, 在`hook 原理`章节中详细讨论.

在`function类型`组件中, 如果使用`hook(useState)`, 则可以通过`hook api`暴露出的`dispatchAction`来更新
```jsx
function dispatchAction<S, A>(
  fiber: Fiber,
  queue: UpdateQueue<S, A>,
  action: A,
) {
  // 1. 创建update对象
  const eventTime = requestEventTime();
  const lane = requestUpdateLane(fiber); // 确定当前update对象的优先级
  const update: Update<S, A> = {
    lane,
    action,
    eagerReducer: null,
    eagerState: null,
    next: (null: any),
  };
  // 2. 将update对象添加到当前Hook对象的updateQueue队列当中
  const pending = queue.pending;
  if (pending === null) {
    update.next = update;
  } else {
    update.next = pending.next;
    pending.next = update;
  }
  queue.pending = update;
  // 3. 请求调度, 进入reconciler运作流程中的`输入`环节.
  scheduleUpdateOnFiber(fiber, lane, eventTime); // 传入的lane是update优先级
}
```
跟setState差不多

##### 重复调用 render
```jsx
import ReactDOM from 'react-dom';
function tick() {
  const element = (
    <div>
      <h1>Hello, world!</h1>
      <h2>It is {new Date().toLocaleTimeString()}.</h2>
    </div>
  );
  ReactDOM.render(element, document.getElementById('root'));
}
setInterval(tick, 1000);
```
这种方式，每次都会重新启动React应用，调用路径包含了：`updateContainer-->scheduleUpdateOnFiber`

所以以上三种方式，都一定会进到`scheduleUpdateOnFiber`中，那我们接下来就讲 scheduleUpdateOnFiber 是如何处理update的
#### update
```jsx
function scheduleUpdateOnFiber(root) {
  // ...
	ensureRootIsScheduled(root)
  // ...
}
```
```jsx
function ensureRootIsScheduled(root, currentTime) {
  const existingCallbackNode = root.callbackNode;

  // 饥饿问题（不用管）
  markStarvedLanesAsExpired(root, currentTime);

  // 获取优先级，Demo里面是个点击，得到的结果是 2
  const nextLanes = getNextLanes(
    root,
    root === workInProgressRoot ? workInProgressRootRenderLanes : NoLanes,
  );

  const newCallbackPriority = getHighestPriorityLane(nextLanes);
  const existingCallbackPriority = root.callbackPriority;
  
  let newCallbackNode;
  if (includesSyncLane(newCallbackPriority)) {
    if (root.tag === LegacyRoot) {
    } else {
      // performSyncWorkOnRoot 很眼熟了吧，就是构造fiber树的入口
      scheduleSyncCallback(performSyncWorkOnRoot.bind(null, root));
    }
  } 

  // ...
}
```
`performSyncWorkOnRoot -> renderRootSync -> workLoopSync -> performUnitOfWork -> beginWork -> completeUnitOfWor`
看起来跟mount阶段的调用栈差不多的，在update阶段，最关键的是找出diff，更新fiber
diff的核心代码 `reconcileChildFibers` 在beginWork中执行，
![image.png](https://cdn.nlark.com/yuque/0/2023/png/1447731/1701834357244-3f9d2bb2-0346-4d13-adf5-21f945305f07.png#averageHue=%23292e36&clientId=udd28545b-dbc5-4&from=paste&height=827&id=u8c3b10b0&originHeight=1654&originWidth=1668&originalType=binary&ratio=2&rotation=0&showTitle=false&size=417284&status=done&style=none&taskId=ub1b6dca0-9358-481f-a2f6-cdc1a309032&title=&width=834)
是不是也很眼熟，就是上文说的 `updateXXX`，遇到遇到class 组件、或function组件这种带有内部state的，reconciler会执行，然后在这个过程中根据updateQueue更新组件，然后在 reconcilerChildFibers 里面做diff
diff算法这里不提了，可以之后单独讲
![image.png](https://cdn.nlark.com/yuque/0/2023/png/1447731/1701837306636-c10e668f-a7a0-45a2-9523-e67ca453d8d7.png#averageHue=%23272b31&clientId=udd28545b-dbc5-4&from=paste&height=548&id=u08bf254d&originHeight=1096&originWidth=2426&originalType=binary&ratio=2&rotation=0&showTitle=false&size=453917&status=done&style=none&taskId=u3f42706b-0ed3-462e-b315-c1ed93f5621&title=&width=1213)
![image.png](https://cdn.nlark.com/yuque/0/2023/png/1447731/1701837485446-f4079639-8bdb-42b2-945a-7563b165efd6.png#averageHue=%23262a32&clientId=udd28545b-dbc5-4&from=paste&height=328&id=udaa81a75&originHeight=656&originWidth=946&originalType=binary&ratio=2&rotation=0&showTitle=false&size=65690&status=done&style=none&taskId=uc4263d15-aa80-4049-8106-0f358ed8c08&title=&width=473)
![image.png](https://cdn.nlark.com/yuque/0/2023/png/1447731/1701837593422-4d29585d-e276-469a-a833-364f8f430ca5.png#averageHue=%23262b33&clientId=udd28545b-dbc5-4&from=paste&height=218&id=u24a24d82&originHeight=436&originWidth=1182&originalType=binary&ratio=2&rotation=0&showTitle=false&size=100490&status=done&style=none&taskId=uc574d651-5227-4a3a-bbe9-4e853dd478f&title=&width=591)![image.png](https://cdn.nlark.com/yuque/0/2023/png/1447731/1701837737726-d4f52a0e-3754-4970-a794-18125e4dd82a.png#averageHue=%23262a30&clientId=udd28545b-dbc5-4&from=paste&height=642&id=u0db375d3&originHeight=1284&originWidth=1330&originalType=binary&ratio=2&rotation=0&showTitle=false&size=301343&status=done&style=none&taskId=u9e805b42-e0e6-4ed8-9914-156ac2ead26&title=&width=665)
![image.png](https://cdn.nlark.com/yuque/0/2023/png/1447731/1701841146503-958c236b-f68a-4b7c-a70f-9e0622a51dca.png#averageHue=%23282d35&clientId=udd28545b-dbc5-4&from=paste&height=337&id=kkrZq&originHeight=674&originWidth=2180&originalType=binary&ratio=2&rotation=0&showTitle=false&size=250037&status=done&style=none&taskId=u46ef5e5d-7f9e-409b-be00-b80da9aebf9&title=&width=1090)
![image.png](https://cdn.nlark.com/yuque/0/2023/png/1447731/1701841279103-5b2aedc1-863a-4c68-8e6a-0274c320d76e.png#averageHue=%23292d35&clientId=udd28545b-dbc5-4&from=paste&height=448&id=uccf6a8e6&originHeight=896&originWidth=2272&originalType=binary&ratio=2&rotation=0&showTitle=false&size=357291&status=done&style=none&taskId=u9b6dcfc0-f771-4356-ad80-9f1b6bcaf79&title=&width=1136)
diff完了之后，返回到 performUnitOfWork 执行下一次fiber构造
update fiber 跟 mount 时初始化fiber，有一个很重要的相同点，就是在遍历到某个节点的子节点是数组时，会把这个子节点的所有兄弟节点都一起处理了。
所以debug的时候可以看到，当wip是button，其相邻的兄弟节点中的pendingProps就已经是新的props了
![image.png](https://cdn.nlark.com/yuque/0/2023/png/1447731/1701841529052-0d10f7e7-3d7e-419f-b409-3524e39ec900.png#averageHue=%2329303a&clientId=udd28545b-dbc5-4&from=paste&height=122&id=uf4666fc6&originHeight=244&originWidth=816&originalType=binary&ratio=2&rotation=0&showTitle=false&size=44171&status=done&style=none&taskId=ub28618ea-e685-4b06-b71c-2a9ee8633da&title=&width=408)

构造完了fiber，剩下的就交给 commit 阶段了

我们还是看看图，更直观
#### 图解update过程
待update的代码：
```jsx
import React from 'react';

class App extends React.Component {
  state = {
    list: ['A', 'B', 'C'],
  };
  onChange = () => {
    this.setState({ list: ['C', 'A', 'X'] });
  };
  componentDidMount() {
    console.log(`App Mount`);
  }
  render() {
    return (
      <>
        <Header />
        <button onClick={this.onChange}>change</button>
        <div className="content">
          {this.state.list.map((item) => (
            <p key={item}>{item}</p>
          ))}
        </div>
      </>
    );
  }
}

class Header extends React.PureComponent {
  render() {
    return (
      <>
        <h1>title</h1>
        <h2>title2</h2>
      </>
    );
  }
}
export default App;
```

mount之后，已经构造好了一颗fiber树了，这棵树是 current 树。current树的 alternate 指向 wip。
如图：
![image.png](https://cdn.nlark.com/yuque/0/2023/png/1447731/1701859031368-53062f90-ab06-461f-afcc-53ef37d27b5b.png#averageHue=%23dffbf8&clientId=u72e81525-fc1a-4&from=paste&height=794&id=u8a8f2bf1&originHeight=1253&originWidth=1204&originalType=binary&ratio=2&rotation=0&showTitle=false&size=179431&status=done&style=none&taskId=u5105d11e-678a-46e5-860e-6d56412d4e6&title=&width=763)

`performUnitOfWork`第 1 次调用(只执行`beginWork`下探):

- 执行前: `workInProgress`指向`HostRootFiber.alternate`对象, 此时`current = workInProgress.alternate`指向当前页面对应的`fiber`树.
- 执行后: 返回被`clone`的下级节点`fiber(<App/>)`, 移动`workInProgress`指向子节点`fiber(<App/>)`

![image.png](https://cdn.nlark.com/yuque/0/2023/png/1447731/1701859401552-3acf1acd-0f73-4af6-876d-d3eadf55582c.png#averageHue=%23defaf7&clientId=u72e81525-fc1a-4&from=paste&height=798&id=udbb96b85&originHeight=1232&originWidth=1204&originalType=binary&ratio=2&rotation=0&showTitle=false&size=197538&status=done&style=none&taskId=u8a7bf125-9968-4794-8fb3-1ebd3120ff5&title=&width=780)


`performUnitOfWork`第 2 次调用(只执行`beginWork`下探):

- 执行前: `workInProgress`指向`fiber(<App/>)`节点, 且`current = workInProgress.alternate`有值
- 执行过程: 
   - 调用`updateClassComponent()`函数中, 调用`reconcileChildren()`生成下级子节点.
- 执行后: 返回下级节点`fiber(<Header/>)`, 移动`workInProgress`指向子节点`fiber(<Header/>)`

![image.png](https://cdn.nlark.com/yuque/0/2023/png/1447731/1701859450418-8fccda3b-aa6b-4904-b6e6-42ee8fb76c9f.png#averageHue=%23ddfaf7&clientId=u72e81525-fc1a-4&from=paste&height=758&id=uf47a2357&originHeight=1261&originWidth=1255&originalType=binary&ratio=2&rotation=0&showTitle=false&size=283056&status=done&style=none&taskId=uf53824a0-5c2c-4f43-b2c1-45fb21296ad&title=&width=754.5)


`performUnitOfWork`第 3 次调用(执行`beginWork`下探 和`completeUnitOfWork`回溯):

beginWork下探阶段：

- `beginWork`执行前: `workInProgress`指向`fiber(<Header/>)`, 且`current = workInProgress.alternate`有值
- `beginWork`执行后:  因为没有子节点了，所以进入`completeUnitOfWork(unitOfWork)`函数

![image.png](https://cdn.nlark.com/yuque/0/2023/png/1447731/1701859570124-45394a33-baa7-4afc-88a5-b68256cce309.png#averageHue=%23ddfaf7&clientId=u72e81525-fc1a-4&from=paste&height=804&id=u55ef5e89&originHeight=1264&originWidth=1255&originalType=binary&ratio=2&rotation=0&showTitle=false&size=286529&status=done&style=none&taskId=u98dbf257-937f-4e3c-a905-b148a01ed6b&title=&width=798.5)


`completeUnitOfWork` 回溯阶段：

- `completeUnitOfWork`执行前: `workInProgress`指向`fiber(<Header/>)`
- `completeUnitOfWork`执行过程: 以`fiber(<Header/>)`为起点, 向上回溯

`completeUnitOfWork`第 1 次 回溯:

1. 执行`completeWork`函数: `class`类型的组件无需处理.
2. 上移副作用队列: 由于本节点`fiber(header)`没有副作用(`fiber.flags = 0`), 所以执行之后副作用队列没有实质变化(目前为空).
3. 向上回溯: 由于还有兄弟节点, 把`workInProgress`指向下一个兄弟节点`fiber(button)`, 退出`completeUnitOfWork`.

![image.png](https://cdn.nlark.com/yuque/0/2023/png/1447731/1701859639060-71eb067f-3429-4d69-82fc-46d0d6e9dabf.png#averageHue=%23ddfaf7&clientId=u72e81525-fc1a-4&from=paste&height=766&id=u22f8e1d8&originHeight=1264&originWidth=1255&originalType=binary&ratio=2&rotation=0&showTitle=false&size=286241&status=done&style=none&taskId=u8c7e05df-9482-484c-b08e-a03e73d3d42&title=&width=760.5)


`performUnitOfWork`第 4 次调用(执行`beginWork`下探和`completeUnitOfWork`回溯):

beginWork下探阶段：

- `beginWork`执行过程: 调用`updateHostComponent` 
   - 本示例中`button`的子节点是一个[直接文本节点](https://github.com/facebook/react/blob/8e5adfbd7e605bda9c5e96c10e015b3dc0df688e/packages/react-dom/src/client/ReactDOMHostConfig.js#L350-L361),设置[nextChildren = null](https://github.com/facebook/react/blob/v17.0.2/packages/react-reconciler/src/ReactFiberBeginWork.old.js#L1147)(源码注释的解释是不用在开辟内存去创建一个文本节点, 同时还能减少向下遍历).
   - 由于`nextChildren = null`, 经过`reconcileChildren`阶段处理后, 返回值也是`null`
- `beginWork`执行后: 由于下级节点为`null`, 所以进入`completeUnitOfWork(unitOfWork)`函数, 传入的参数`unitOfWork`实际上就是`workInProgress`(此时指向`fiber(button)`节点)
- `completeUnitOfWork`执行过程: 以`fiber(button)`为起点, 向上回溯

`completeUnitOfWork`第 2 次 回溯:

1. 执行`completeWork`函数 
   - 因为`fiber(button).stateNode != null`, 所以无需再次创建 DOM 对象. 只需要进一步调用`updateHostComponent()`记录 DOM 属性改动情况
   - 在`updateHostComponent()`函数中, 又因为`oldProps === newProps`, 所以无需记录改动情况, 直接返回
2. 上移副作用队列: 由于本节点`fiber(button)`没有副作用(`fiber.flags = 0`), 所以执行之后副作用队列没有实质变化(目前为空).
3. 向上回溯: 由于还有兄弟节点, 把`workInProgress`指向下一个兄弟节点`fiber(div)`, 退出`completeUnitOfWork`.

![image.png](https://cdn.nlark.com/yuque/0/2023/png/1447731/1701859761962-ae5b07ed-a78b-4a26-90da-0efd69f09a5f.png#averageHue=%23ddfaf7&clientId=u72e81525-fc1a-4&from=paste&height=763&id=u78fe9df7&originHeight=1262&originWidth=1255&originalType=binary&ratio=2&rotation=0&showTitle=false&size=291857&status=done&style=none&taskId=uc64cd688-29b0-44b8-86dd-6df781d7ebf&title=&width=758.5)

`performUnitOfWork`第 5 次调用(执行`beginWork`下探):

- 执行前: `workInProgress`指向`fiber(div)`节点, 且`current = workInProgress.alternate`有值
- 执行过程: 
   - 在`updateHostComponent()`函数中, 调用`reconcileChildren()`生成下级子节点.
   - 需要注意的是, 下级子节点是一个可迭代数组, 会把`fiber.child.sibling`一起构造出来, 同时根据需要设置`fiber.flags`. 在本例中, 下级节点有被删除的情况, 被删除的节点会被添加到父节点的副作用队列中(具体实现方式请参考React diff算法).
- 执行后: 返回下级节点`fiber(p)`, 移动`workInProgress`指向子节点`fiber(p)`

![image.png](https://cdn.nlark.com/yuque/0/2023/png/1447731/1701859834766-6fe78ea0-0dba-4bb0-9a13-4f42aba839ff.png#averageHue=%23e0fbfa&clientId=u72e81525-fc1a-4&from=paste&height=945&id=u16900281&originHeight=1514&originWidth=1255&originalType=binary&ratio=2&rotation=0&showTitle=false&size=338155&status=done&style=none&taskId=ua9d98559-2854-4c47-a8aa-8eba64008e5&title=&width=783.5)

`performUnitOfWork`第 6 次调用(执行`beginWork`下探和`completeUnitOfWork`回溯):

-  `beginWork`执行过程: 与第 4 次调用中构建`fiber(button)`的逻辑完全一致, 因为都是直接文本节点, `reconcileChildren()`返回的下级子节点为 null. 
-  `beginWork`执行后: 由于下级节点为`null`, 所以进入`completeUnitOfWork(unitOfWork)`函数 
-  `completeUnitOfWork`执行过程: 以`fiber(p)`为起点, 向上回溯 

`completeUnitOfWork`第 3 次回溯:

1. 执行`completeWork`函数 
   - 因为`fiber(p).stateNode != null`, 所以无需再次创建 DOM 对象. 在`updateHostComponent()`函数中, 又因为节点属性没有变动, 所以无需打标记
2. 上移副作用队列: 本节点`fiber(p)`没有副作用(`fiber.flags = 0`).
3. 向上回溯: 由于还有兄弟节点, 把`workInProgress`指向下一个兄弟节点`fiber(p)`, 退出`completeUnitOfWork`.

![image.png](https://cdn.nlark.com/yuque/0/2023/png/1447731/1701859898117-f8874175-4dc0-4f05-89a4-589c2efbd047.png#averageHue=%23ddfaf7&clientId=u72e81525-fc1a-4&from=paste&height=962&id=ubc9a298a&originHeight=1520&originWidth=1255&originalType=binary&ratio=2&rotation=0&showTitle=false&size=340596&status=done&style=none&taskId=ud0282209-02f0-4e38-a439-1e94ef17c8f&title=&width=794.5)

`performUnitOfWork`第 7 次调用(执行`beginWork`和`completeUnitOfWork`):

-  `beginWork`执行过程: 与第 4 次调用中构建`fiber(button)`的逻辑完全一致, 因为都是直接文本节点, `reconcileChildren()`返回的下级子节点为 null. 
-  `beginWork`执行后: 由于下级节点为`null`, 所以进入`completeUnitOfWork(unitOfWork)`函数 
-  `completeUnitOfWork`执行过程: 以`fiber(p)`为起点, 向上回溯 

`completeUnitOfWork`第 4 次回溯:

1.  执行`completeWork`函数: 
   - 因为`fiber(p).stateNode != null`, 所以无需再次创建 DOM 对象. 在`updateHostComponent()`函数中, 又因为节点属性没有变动, 所以无需打标记
2.  上移副作用队列: 本节点`fiber(p)`有副作用(`fiber.flags = Placement`), 需要将其添加到父节点的副作用队列之后. 
3.  向上回溯: 由于还有兄弟节点, 把`workInProgress`指向下一个兄弟节点`fiber(p)`, 退出`completeUnitOfWork`. 

![image.png](https://cdn.nlark.com/yuque/0/2023/png/1447731/1701860060051-7aaa6a02-7811-42e1-a238-974cced20f32.png#averageHue=%23e0fbfa&clientId=u72e81525-fc1a-4&from=paste&height=913&id=u6723aca6&originHeight=1506&originWidth=1255&originalType=binary&ratio=2&rotation=0&showTitle=false&size=344388&status=done&style=none&taskId=u621eba13-8a94-4118-9fb2-0027e038be5&title=&width=760.5)


`performUnitOfWork`第 8 次调用(执行`beginWork`和`completeUnitOfWork`):

-  `beginWork`执行过程: 本节点`fiber(p)`是一个新增节点, 其`current === null`, 会进入`updateHostComponent()`函数. 因为是直接文本节点, `reconcileChildren()`返回的下级子节点为 null. 
-  `beginWork`执行后: 由于下级节点为`null`, 所以进入`completeUnitOfWork(unitOfWork)`函数 
-  `completeUnitOfWork`执行过程: 以`fiber(p)`为起点, 向上回溯 

`completeUnitOfWork`第 5 次回溯:

1. 执行`completeWork`函数: 由于本节点是一个新增节点,且`fiber(p).stateNode === null`, 所以创建`fiber(p)`节点对应的`DOM`实例, 挂载到`fiber.stateNode`之上.
2. 上移副作用队列: 本节点`fiber(p)`有副作用(`fiber.flags = Placement`), 需要将其添加到父节点的副作用队列之后.
3. 向上回溯: 由于没有兄弟节点, 把`workInProgress`指针指向父节点`fiber(div)`.

![image.png](https://cdn.nlark.com/yuque/0/2023/png/1447731/1701860127881-70e9c9a5-f2e0-45c7-a6f3-4ace963e9690.png#averageHue=%23ddf9f7&clientId=u72e81525-fc1a-4&from=paste&height=925&id=u98961d53&originHeight=1520&originWidth=1255&originalType=binary&ratio=2&rotation=0&showTitle=false&size=354234&status=done&style=none&taskId=u79c3f959-465a-491e-aa15-e8ea81c9128&title=&width=763.5)

至此，下探阶段全部走完了，一直向上回溯，把副作用队列上移

最后：
![image.png](https://cdn.nlark.com/yuque/0/2023/png/1447731/1701860243795-8692b4bd-9451-41a1-9fe9-56d011020281.png#averageHue=%23defbf8&clientId=u72e81525-fc1a-4&from=paste&height=838&id=u7a9a7e85&originHeight=1520&originWidth=1405&originalType=binary&ratio=2&rotation=0&showTitle=false&size=374396&status=done&style=none&taskId=u71c062a0-6db5-4aa2-bfbf-5f6b0e17486&title=&width=774.5)

在流程上，update 和 mount 基本上没有区别，它们主要是在 performUnitOfWork 中处理方式不同。
update 阶段要考虑复用、diff、副作用等等，但最后，它们两个都是会构造出一颗fiber树，剩下的就交由commit阶段了

## commit阶段
![image.png](https://cdn.nlark.com/yuque/0/2023/png/1447731/1701870343238-b11d85f3-93a5-491c-a4bd-df32d806c83f.png#averageHue=%23fcfbf0&clientId=u72e81525-fc1a-4&from=paste&height=525&id=u015bb11d&originHeight=638&originWidth=921&originalType=binary&ratio=2&rotation=0&showTitle=false&size=69861&status=done&style=none&taskId=u840827f1-3cc7-4225-9caa-69decabecdf&title=&width=758.5)
fiber树构造好了，接下来就是渲染了（4标）
我们思路回到调用栈的第一个，`performXXXWorkOnRoot`
```jsx
function performConcurrentWorkOnRoot(root, didTimeout) {
	// ...
  // 现在走到这一步了
  // 输出: 渲染fiber树
  finishConcurrentRender(root, exitStatus, lanes);

 	// ...
}
```
`finishConcurrentRender`主要是根据exitStatus的不同情况，判断如何commitRoot
```jsx
function finishConcurrentRender(root, exitStatus, lanes) {
  switch (exitStatus) {
    case RootInProgress: ...
    case RootFatalErrored: ...
    case RootErrored: ...
    case RootSuspended: ...
    case RootSuspendedWithDelay: ...
    case RootCompleted: {
      // The work completed. Ready to commit.
      commitRoot(
        root,
        workInProgressRootRecoverableErrors,
        workInProgressTransitions,
      );
      break;
    }
  }
}
```
commitRoot的核心方法是 `commitRootImpl`。其整体分为3个阶段

1. commit准备阶段
2. commit阶段：这个阶段会把之前计算出的fiber，应用到DOM上，又可以分成3个子阶段
   1. before mutation：操作DOM之前
   2. mutation：进行DOM操作
   3. layout：DOM操作之后
3. commit结束阶段
### commit准备阶段
```jsx
// 开启do while循环去处理副作用
do {
  flushPassiveEffects();
} while (rootWithPendingPassiveEffects !== null);

// ...
// 拿到reconciler阶段结束后的成果，也就是内存中的fiber树根节点HostRootFiber
const finishedWork = root.finishedWork;

// ...

// 如果存在挂起的副作用，就通过scheduleCallback生成一个task任务去处理
if (
  (finishedWork.subtreeFlags & PassiveMask) !== NoFlags ||
  (finishedWork.flags & PassiveMask) !== NoFlags
) {
  // Passive标记只在使用了useEffect才会出现，此处是专门针对hook对象做处理
  if (!rootDoesHavePassiveEffects) {
    // 开启一个宏任务调度flushPassiveEffects
    scheduleCallback(NormalSchedulerPriority, () => {
      flushPassiveEffects();
      return null;  
    });
  }
}
```
这里我们暂时只关心一个事

1. 使用 flushPssiveEffects 清除掉所有的副作用

flushPassiveEffects 中主要是处理带有 `Passive`标记的fiber。`Passive`标记只会在使用了`hook`对象的`function`类型的节点上存在
### commit阶段
如果没有副作用的话，commit阶段就简单的切换了fiber树
```jsx
// 检查构造好的Fiber的子孙节点是否存在副作用需要操作
const subtreeHasEffects =
  (finishedWork.subtreeFlags &
    (BeforeMutationMask | MutationMask | LayoutMask | PassiveMask)) !==
  NoFlags;

// 检查hostRootFiber本身是否存放副作用需要进行操作
const rootHasEffect =
  (finishedWork.flags &
    (BeforeMutationMask | MutationMask | LayoutMask | PassiveMask)) !==
  NoFlags;

// 只要存在副作用， 那么则进入commit阶段
if (subtreeHasEffects || rootHasEffect) {
    ...
} else {
  // 没有副作用的话直接切换树了
  root.current = finishedWork;
}
```

进入真正的commit阶段后，就进入了上文提到的3个子阶段

1. beforeMutation —— commitBeforeMutationEffects
2. mutation —— commitMutationEffects
3. layout —— commitLayoutEffects
```jsx
// beforeMutation阶段
commitBeforeMutationEffects(root, finishedWork);


// mutation阶段
commitMutationEffects(root, finishedWork, lanes);
// 这里重置了containerInfo相关信息
resetAfterCommit(root.containerInfo);

root.current = finishedWork;

// layout阶段
commitLayoutEffects(finishedWork, root, lanes);

// 暂停scheduler，让浏览器绘制
// 但其实这个方法什么都没做，因为每一帧都会让出一些时间给浏览器绘制
requestPaint();
```
#### before mutation
beforeMutation主要处理带有 `BeforeMutationMask`标记的fiber节点
```jsx
export const BeforeMutationMask =
  Update |
  Snapshot
```
commitBeforeMutationEffects 的核心方法是 commitBeforeMutationEffectsOnFiber
```jsx
function commitBeforeMutationEffects_complete() {
  while (nextEffect !== null) {
    const fiber = nextEffect;
    try {
      commitBeforeMutationEffectsOnFiber(fiber);
    } catch (error) {
      // ...
    }

    // 处理兄弟节点
    const sibling = fiber.sibling;
    if (sibling !== null) {
      sibling.return = fiber.return;
      nextEffect = sibling;
      return;
    }

    // 回溯
    nextEffect = fiber.return;
  }
}
```
commitBeforeMutationEffectsOnFiber 这个方法，主要是处理flags存在Snapshot的节点，什么是Snapshot，class组件有个生命周期方法：`getSnapshotBeforeUpdate`，这个生命周期的执行时机就是在DOM提交之前调用
```jsx
function commitBeforeMutationEffectsOnFiber(finishedWork: Fiber) {
  const current = finishedWork.alternate; 
  const flags = finishedWork.flags; // 当前节点的flags标志
  // 只要标志为Snapshot才会进行处理
  if ((flags & Snapshot) !== NoFlags) {
    switch (finishedWork.tag) {
      case FunctionComponent:
      case ForwardRef:
      case SimpleMemoComponent: {
        break;
      }
      // 对于类组件
      case ClassComponent: {
        if (current !== null) {
          const prevProps = current.memoizedProps;  // 拿到之前的props
          const prevState = current.memoizedState;  // 拿到之前的state
          const instance = finishedWork.stateNode;  // 拿到组件实例
          // 在这里调用了类组件的getSnapshotBeforeUpdate， 返回值赋值给snapshot
          const snapshot = instance.getSnapshotBeforeUpdate( 
            finishedWork.elementType === finishedWork.type
              ? prevProps
              : resolveDefaultProps(finishedWork.type, prevProps),
            prevState,
          );
          // 然后赋值给instance.__reactInternalSnapshotBeforeUpdate进行保存
          instance.__reactInternalSnapshotBeforeUpdate = snapshot;
        }
        break;
      }
      // 对于hostFiberRoot
      case HostRoot: {
       if (supportsMutation) {
         const root = finishedWork.stateNode;  // 拿到Root根应用节点
         // root.containerInfo执行根DOM节点， 此处调用clearContainer进行清空处理
         clearContainer(root.containerInfo);
       }
       break;
      }
      // ...
  }
}
```
#### mutation
mutation阶段主要是做DOM的更改，处理副作用队列中带有 `MutationMask`标记的fiber节点
```jsx
export const MutationMask =
  Placement |
  Update |
  ChildDeletion |
  ContentReset |
  Ref |
  Hydrating |
  Visibility;
```
mutation的入口是commitMutationEffects，内部核心方法是commitMutationEffectsOnFiber
```jsx
function commitMutationEffectsOnFiber(
  finishedWork: Fiber,
  root: FiberRoot,
  lanes: Lanes,
) {
  const current = finishedWork.alternate; // 拿到当前页面使用的Fiber结构
  const flags = finishedWork.flags; // 拿到当前节点的标签

  switch (finishedWork.tag) {
    case FunctionComponent:
    case ForwardRef:
    case MemoComponent:
    case SimpleMemoComponent: ...
    case ClassComponent: ...
    case HostComponent: ...
    case HostText: ...
    case HostRoot: ...
    case HostPortal: ...
    case SuspenseComponent: ...
    case OffscreenComponent:...
    case SuspenseListComponent: ...
    case ScopeComponent: ...
    default: {
      // 无论哪种情况都会执行这两个函数
      recursivelyTraverseMutationEffects(root, finishedWork, lanes);
      commitReconciliationEffects(finishedWork);

      return;
    }
  }
}
```
简单来说，这个阶段最后会调用 `react-dom`的api，对DOM进行

- 新增 `commitPlacement` -> `insertOrAppendPlacementNode`-> `insertBefore` |  `appendChild`(react-dom)
- 删除 `commitDeletionEffects` -> `commitDeletionEffectsOnFiber`-> `removeChildFromContainer` | `removeChild`(react-dom)
- 更新 `commitUpdate`(react-dom)

react-dom的这些方法执行完之后，DOM所在的界面也会更新
#### layout
layout阶段是在DOM变更后，处理副作用队列中带有 `LayoutMask`标记的fiber节点
```jsx
export const LayoutMask = Update | Callback | Ref | Visibility;
```
layout的入口函数是 commitLayoutEffects， 其内部核心方法是 commitLayoutEffectOnFiber
```jsx
function commitLayoutEffectOnFiber(
  finishedRoot: FiberRoot,
  current: Fiber | null,
  finishedWork: Fiber,
  committedLanes: Lanes,
): void {
  if ((finishedWork.flags & LayoutMask) !== NoFlags) {
    switch (finishedWork.tag) {
      case FunctionComponent:
      case ForwardRef:
      case SimpleMemoComponent: {
           .....
         // 对于函数组件来说， 同步去执行useLayoutEffect的回调
        commitHookEffectListMount(
                HookLayout | HookHasEffect,
                finishedWork,
              );
             .....
        break;
      }
      case ClassComponent: {
        const instance = finishedWork.stateNode;
        if (finishedWork.flags & Update) {
          if (!offscreenSubtreeWasHidden) {
            if (current === null) {
              ...
              // 如果是初次挂载的话， 调用componentDidMount
              instance.componentDidMount();
            } else {
            // 如果是更新的话， 那么则调用componentDidUpdate
            // 这里传入了instance.__reactInternalSnapshotBeforeUpdate
            // 看commitBeforeMutationEffectsOnFiber。 我们在遇到getSnapshotBeforeUpdate的时候处理的
              const prevProps =
                finishedWork.elementType === finishedWork.type
                  ? current.memoizedProps
                  : resolveDefaultProps(
                      finishedWork.type,
                      current.memoizedProps,
                    );
              const prevState = current.memoizedState;
              ....
              instance.componentDidUpdate(
                    prevProps,
                    prevState,
                    instance.__reactInternalSnapshotBeforeUpdate,
               );
            }
          }
        }
        // 调用setState的回调
        const updateQueue = (finishedWork.updateQueue: any);
  
          commitUpdateQueue(finishedWork, updateQueue, instance);
        }
        break;
      }
      case HostRoot: ...
      case HostComponent: ...
      case HostText: {

        break;
      }
      case HostPortal: {
   
        break;
      }
      case Profiler: ...
      case SuspenseComponent: ...
      case SuspenseListComponent:
      case IncompleteClassComponent:
      case ScopeComponent:
      case OffscreenComponent:
      case LegacyHiddenComponent:
      case TracingMarkerComponent: {
        break;
      }

      default:
        throw new Error(
          'This unit of work tag should not have side-effects. This error is ' +
            'likely caused by a bug in React. Please file an issue.',
        );
    }
  }
   // 进行Ref的绑定逻辑
  if (!enableSuspenseLayoutEffectSemantics || !offscreenSubtreeWasHidden) {
    if (enableScopeAPI) {
      if (finishedWork.flags & Ref && finishedWork.tag !== ScopeComponent) {
        commitAttachRef(finishedWork);
      }
    } else {
      if (finishedWork.flags & Ref) {
        commitAttachRef(finishedWork);
      }
    }
  }
}
```
layout阶段做了什么呢

- 针对函数组件， 调用了useLayoutEffect的回调
- 针对类组件， 初次挂载的情况下调用componentDidMount， 更新的情况下调用componentDidUpdate。 以及处理了setState的回调
- 处理了Ref对象的绑定
- 对于HostComponent节点, 如有Update标记, 需要设置一些原生状态(如: focus等)

至此，渲染任务就完成了
### commit结束阶段
执行完了上述步骤后，最后是

1. 检测更新。渲染过程中可能会派生出新的更新，渲染完毕后需要调用 `ensureRootIsScheduled`添加任务（如果有任务的话）

![image.png](https://cdn.nlark.com/yuque/0/2023/png/1447731/1701880550557-6955cc61-f590-498e-93c0-601091e71559.png#averageHue=%232c313a&clientId=u72e81525-fc1a-4&from=paste&height=497&id=u210d2081&originHeight=994&originWidth=1162&originalType=binary&ratio=2&rotation=0&showTitle=false&size=190067&status=done&style=none&taskId=u46a9d53a-efa4-4372-b9e8-90975172471&title=&width=581)
至此，react的整个渲染流程就完成了，最后我们再看看这张图
![image.png](https://cdn.nlark.com/yuque/0/2023/png/1447731/1701870343238-b11d85f3-93a5-491c-a4bd-df32d806c83f.png#averageHue=%23fcfbf0&clientId=u72e81525-fc1a-4&from=paste&height=525&id=AzWMk&originHeight=638&originWidth=921&originalType=binary&ratio=2&rotation=0&showTitle=false&size=69861&status=done&style=none&taskId=u840827f1-3cc7-4225-9caa-69decabecdf&title=&width=758.5)

总结：从宏观上看fiber 树渲染位于reconciler 运作流程中的输出阶段, 是整个reconciler 运作流程的链路中最后一环(从输入到输出)。上文从渲染前, 渲染, 渲染后三个方面分解了commitRootImpl函数。 其中最核心的渲染逻辑又分为了 3 个函数, 这 3 个函数共同处理了有副作用fiber节点, 并通过渲染器react-dom把最新的 DOM 对象渲染到界面上
