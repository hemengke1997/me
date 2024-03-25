---
title: "rollup中的一些重要概念"
date: "2022-07-12 15:08:13"
draft: false
tags:
- rollup
---

# rollup1
## 术语

- async 异步
- fisrt 优先串行（数组中的方法依次，当方法返回值为non-falsy时，就停止执行，返回此值）
- id 文件绝对路径
- sequential 连续串行（数组中的所有方法都会执行，如果有异步的，会await）
- parallel 并行
- importer 调用者（主动import）
- importee 被调用（被import）

![](https://cdn.nlark.com/yuque/0/2022/jpeg/1447731/1657185544305-a2459009-64b7-4e5f-b957-6a55d05f5e8f.jpeg)
## 源码中的一些技巧

### first
> 接受一个函数数组，返回数组中第一个函数返回值不为 null | undefined 的返回值

#### 使用方式
```javascript
this.resolveId = first(
  this.plugins
  .map( plugin => plugin.resolveId )
  .filter( Boolean )
  .concat( resolveId )
);
```
#### 实现
```javascript
// Return the first non-falsy result from an array of
// maybe-sync, maybe-promise-returning functions
export default function first(candidates) {
  return function (...args) {
    return candidates.reduce((promise, candidate) => {
      return promise.then((result) => (result != null ? result : Promise.resolve(candidate(...args))))
    }, Promise.resolve())
  }
}
```
### ~！
> 判断-1

```javascript
if ( !~this.dependencies.indexOf( source ) ) this.dependencies.push( source );
```
[https://stackoverflow.com/questions/28423512/whats-the-mean-in-javascript](https://stackoverflow.com/questions/28423512/whats-the-mean-in-javascript)

# rollup2

TODO
