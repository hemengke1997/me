---
title: "React fiber 是如何设置sibling的？"
date: "2023-12-04 14:39:50"
draft: false
tags:
- React
---

# Fiber过程
![](https://cdn.nlark.com/yuque/0/2023/jpeg/1447731/1701487980158-2f18082a-e32a-42b1-9eb9-af1eba5e4d3e.jpeg)
下探时，如果发现子节点是个数组，会从第一个子节点开始，链表形式给每个子节点设置sibling，同时也把每个遍历到的节点都fiber化了
```javascript
if (isArray(newChild)) {
  return reconcileChildrenArray(
    returnFiber,
    currentFirstChild,
    newChild,
    lanes,
  );
}

...

for (; newIdx < newChildren.length; newIdx++) {
    const newFiber = createChild(returnFiber, newChildren[newIdx], lanes);
    if (newFiber === null) {
      continue;
    }
    lastPlacedIndex = placeChild(newFiber, lastPlacedIndex, newIdx);
    if (previousNewFiber === null) {
      // 此时是第一个子节点，需要返回给return
      // TODO: Move out of the loop. This only happens for the first run.
      resultingFirstChild = newFiber;
    } else {
      // 给前一个fiber设置sibling
      previousNewFiber.sibling = newFiber;
    }
    // 指针右移
    previousNewFiber = newFiber;
}
```
resultingFirstChild 很重要，他是链表头，这个对象里面包含了同为子节点的所有sibling，比如，有这样一个结构：
```jsx
const A = () => {

  return <div>
    <span>1</span> // 这个就是resultingFirstChild
    <span>2</span>
    <span>3</span>
  </div>
}
```
当 <span>1</span> 被递归处理为fiber的时候，会去把 2,3 都处理成fiber
然后 1 的 sibling 2， 2 的 sibling 是 3
这些信息都存在 resultingFirstChild 中（因为它是指针头）


