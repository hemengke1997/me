---
title: "useState 和 useReducer"
date: "2021-01-11 11:10"
draft: false
tags:
- react
---


useState 和 useReducer 的功能非常相似，都是负责函数组件的状态管理。为什么要出两个功能类似的API呢？

## useState： 细粒度state
众所周知，以前用类组件开发时， 组件的整个state都要放在一个对象中，造成耦合
useState的出现就是为了更细粒度的分开state，使开发更清晰

## useReducer：低成本的数据流
### 定义
```javascript
const [state, dispatch] = useReducer(reducer, initialArg, init);
```

### 使用方式
#### 不带初始化函数
```jsx
const [t, dispatchT] = useReducer(reducer, 1)

console.log(t) // 1
```
#### 如果初始值较为复杂，可以带一个初始化函数
```jsx
const [t, dispatchT] = useReducer(reducer, 1, (n)=> n + 3)

console.log(t) // 4
```
### 官方例子
```jsx
const initialState = {count: 0};
function reducer(state, action) {
  switch (action.type) {
    case 'increment':
      return {count: state.count + 1};
    case 'decrement':
      return {count: state.count - 1};
    default:
      throw new Error();
  }
}
function Counter() {
  const [state, dispatch] = useReducer(reducer, initialState);
  return (
    <>
      Count: {state.count}
      <button onClick={() => dispatch({type: 'decrement'})}>-</button>
      <button onClick={() => dispatch({type: 'increment'})}>+</button>
    </>
  );
}
```
### 使用场景
在某些场景下，`useReducer` 会比 `useState` 更适用，例如 state 逻辑较复杂且包含多个子值，或者下一个 state 依赖于之前的 state 等。并且，使用 `useReducer` 还能给那些会触发深更新的组件做性能优化，因为[你可以向子组件传递 `dispatch` 而不是回调函数](https://react.docschina.org/docs/hooks-faq.html#how-to-avoid-passing-callbacks-down) 。
### useReducer + useContext 来做局部数据流
useReducer 更适合拿来做简单场景下的数据流。useReducer 是阉割版的 redux，只缺了一个状态共享能力，用 hooks 的 useContext 刚刚好。

官方文档中推荐的使用场景是“deep update”，从某种程度来说就是一个局部数据流：
```jsx
function Parent() {
  const [state, dispatch] = useReducer(reducer, { count: 0 });

  return (
    <context.Provider value={dispatch}>
      <DeepTree />
    </context.Provider>
  );
}
```

如果该数据流中也要用到 state，可以把 state 和 dispatch 用两个 context 往下传递，原因是这样可以避免只依赖了 dispatch 的组件受到 state 更新的影响。
```jsx
function Parent() {
  const [state, dispatch] = useReducer(reducer, { count: 0 });

  return (
    <context1.Provider value={state}>
    	<context2.Provider value={dispatch}>
      	<DeepTree />
    	</context2.Provider>
		</context1.Provider>
  );
}
```
从上面两端代码就可以看出，在函数组件中实现一套看起来还可以的数据流是一件很简单的事情。

## useState跟useReducer的关系
useState是useReducer的子集，可以用useReducer实现一个useState
```jsx
const useMyState = (initState) => {
  let init = initState
  if(typeof initState === 'function') {
    init = initState()
  }

  // 一个特殊的reducer
  const reducer = (state, action) => {
    if (typeof action === 'function') {
      return action(state)
    }
    return action
  }

  const [state, dispatch] = useReducer(reducer, init)

  const setState = useCallback((action) => {
    dispatch(action)
  }, [])

  return [state, setState]
}

// 使用方式
const [x, setX] = useMyState(4)
```

