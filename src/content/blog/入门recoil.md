---
title: "入门recoil"
date: "2022-05-12 10:55:11"
draft: false
tags:
- react
- 状态管理
---


# [what is RECOIL](https://recoiljs.org/zh-hans/)
> React官方出品的React状态管理工具

# 起源
Recoil 的产生源于 Facebook 内部一个可视化数据分析相关的应用，在使用 React 的实现的过程中，因为现有状态管理工具不能很好的满足应用的需求，因此催生出了 Recoil 。
这个应用带有复杂的交互，可以被总结为以下特点：

- 大量需要共享状态的场景
- 大量需要派生状态(基于某些状态计算出一个新的状态)的场景
- 状态可以被持久化，进而通过被持久化的状态恢复当时场景
# 核心概念
## 概览
:::info
使用 Recoil 会为你创建一个数据流向图，从 _atom_（共享状态）到 _selector_（纯函数），再流向 React 组件。Atom 是组件可以订阅的 state 单位。selector 可以同步或异步改变此 state。
:::
## atom
### 一个atom就是一个状态，它相当于redux/vuex的store中存储的值
```typescript
const fontSizeState = atom({
  key: 'fontSizeState',
  default: 14,
});
```

- key是全局唯一的
### 在组件中使用atom
`useRecoilState`即可在组件中订阅状态
```typescript
const [text, setText] = useRecoilState(textState);

const onChange = (event) => {
  setText(event.target.value);
};
```
## selector
派生状态。怎么去理解派生状态？
派生状态就类似于vue的计算属性、angular的rxjs，他们共同的特点就是当 **依赖(上游)** 改变时，**派生出的事物(下游)** 也会同样 **自动变化** ，避免手动维护状态同步的情况

- selector是**纯函数**，输入确定时，输出一定是确定的
- selector**也是状态**，不过它是**派生状态**，从一个状态派生出来的。**当依赖（上游）改变时，selector会重新执行**
- 既然selector是状态，组件当然也可以订阅它，像订阅atom一样

```typescript
const fontSizeLabelState = selector({
  key: 'fontSizeLabelState',
  get: ({get}) => {
    const fontSize = get(fontSizeState);
    const unit = 'px';
    
    return `${fontSize}${unit}`;
  },
});
```

- `get`方法相当于订阅，当订阅的值改变后，订阅的atom/selector也会改变。（发布订阅模式）
- selector默认是不可写的，其实我们把selector当作计算属性来理解的话，不可写是合理的
- 当给selector设置了set属性后，就可写了。（真的跟vue的computed属性好像

![image.png](https://cdn.nlark.com/yuque/0/2022/png/1447731/1652322134716-b340068c-9ce0-47dc-a4d4-c0caf407c4d4.png#clientId=u29dd29ed-eab2-4&from=paste&height=474&id=ub151ab7f&originHeight=474&originWidth=445&originalType=binary&ratio=1&rotation=0&showTitle=false&size=20833&status=done&style=none&taskId=u725ab7e7-6860-4d2d-83e3-d5ce2710486&title=&width=445)

# 高级指南
## 异步数据查询
### 带参查询 + 异步 + ErrorBoundary + Suspense
```typescript
const userNameQuery = selectorFamily({
  key: 'UserName',
  get: userID => async () => {
    const response = await myDBQuery({userID});
    if (response.error) {
      throw response.error;
    }
    return response.name;
  },
});

function UserInfo({userID}) {
  const userName = useRecoilValue(userNameQuery(userID));
  return <div>{userName}</div>;
}

function MyApp() {
  return (
    <RecoilRoot>
      <ErrorBoundary>
        <React.Suspense fallback={<div>加载中……</div>}>
          <UserInfo userID={1}/>
          <UserInfo userID={2}/>
          <UserInfo userID={3}/>
        </React.Suspense>
      </ErrorBoundary>
    </RecoilRoot>
  );
}
```
### [并行请求](https://recoiljs.org/zh-hans/docs/guides/asynchronous-data-queries#%E5%B9%B6%E8%A1%8C%E8%AF%B7%E6%B1%82)
`waitForAll` `waitForNone`
### [预取](https://recoiljs.org/zh-hans/docs/guides/asynchronous-data-queries#%E9%A2%84%E5%8F%96)
```typescript
 const changeUser = useRecoilCallback(({snapshot, set}) => userID => {
    snapshot.getLoadable(userInfoQuery(userID)); // 预取用户信息
    set(currentUserIDState, userID); //  改变当前用户以开始新的渲染
  });
```
# 最后
recoil的基本使用是没问题了。但是recoil有很多高阶的使用方法，等待我们去摸索学习。熟练使用之后，我会出一个针对recoil源码的解析文章

[https://github.com/facebookexperimental/Recoil](https://github.com/facebookexperimental/Recoil)
