---
title: "js 值比较"
date: "2020-12-16 17:38"
draft: false
tags:
- js
---

## ==
会进行类型转换的比较

## ===
不会转化类型
## 浅比较
循环数组或对象（只循环最外层），比较key对应的value是否相等 （不在乎引用）,  当然 key的长度也必须要一样
## 深相等
两个对象或数组完全相等 （不在乎引用）


## object.is()
`Object.is()` 方法判断两个值是否为[同一个值](https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Equality_comparisons_and_sameness)。如果满足以下条件则两个值相等:

- 都是 [`undefined`](https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Reference/Global_Objects/undefined)
- 都是 [`null`](https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Reference/Global_Objects/null)
- 都是 `true` 或 `false`
- 都是相同长度的字符串且相同字符按相同顺序排列
- 都是相同对象（意味着每个对象有同一个引用）
- 都是数字且   
   - 都是 `+0`
   - 都是 `-0`
   - 都是 [`NaN`](https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Reference/Global_Objects/NaN)
   - 或都是非零而且非 [`NaN`](https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Reference/Global_Objects/NaN) 且为同一个值

与[`==`](https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Reference/Operators/Comparison_Operators#Equality) 运算_不同。_  `==` 运算符在判断相等前对两边的变量(如果它们不是同一类型) 进行强制转换 (这种行为的结果会将 `"" == false` 判断为 `true`), 而 `Object.is`不会强制转换两边的值。
与[`===`](https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Reference/Operators/Comparison_Operators#Identity) 运算也不相同。 `===` 运算符 (也包括 `==` 运算符) 将数字 `-0` 和 `+0` 视为相等 ，而将[`Number.NaN`](https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Reference/Global_Objects/Number/NaN) 与[`NaN`](https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Reference/Global_Objects/NaN)视为不相等.
## 为什么react-redux 的 useSelector 使用 === 比较两次state是否相等？
[javascript - Strict Equality (===) versus Shallow Equality Checks in React-Redux - Stack Overflow](https://stackoverflow.com/questions/58212159/strict-equality-versus-shallow-equality-checks-in-react-redux)
useSelector 一般是返回一个非复合的量 如： const x= useSelector(state=>state.user.name)
而mapStateToProps一般是返回一个复合量 如：
```jsx
const mapStateToProps = state => (
  {keyA: state.reducerA.keyA, keyB: state.reducerB.keyB}
);
```

useSelector使用 === 来比较新旧值更合理

如果useSelector返回一个复合的值， 则需要添加 `shallowEqual` 如
```jsx
import { shallowEqual } from 'react-redux'
const x = useSelector(state => ({a:state.a, b:state.b}), shallowEqual)
```
