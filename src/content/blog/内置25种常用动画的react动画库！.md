---
title: "内置25种常用动画的react动画库！"
summary: ""
date: "2025-03-21"
draft: false
tags:
- react
- 动画
---


React生态中，比较流行的动画库主要有 `motion（原 framer-motion）`、`react-spring`、`react-transition-group`，这些库都很强大，但是它们都没有内置动画，需要我们自行实现或者封装使用。如果只是个小项目，未免杀鸡用牛刀了

今天的主角是 [react-transition-preset](https://github.com/hemengke1997/react-transition-preset)，这个库内置了25种常用动画，类似 element-ui 的内置动画。

虽然内置了许多动画， 但这个库非常轻量，**0依赖，打包后仅有 12KB**！

# element-ui
![](https://cdn.nlark.com/yuque/0/2025/png/1447731/1742548667855-1cfaff79-04c9-48af-a831-a6319e222f3a.png)

## react-transition-preset
![](https://cdn.nlark.com/yuque/0/2025/gif/1447731/1742550111349-f7fac38b-c70e-4375-8713-43ca7278d4a0.gif)

[在线示例地址](https://hemengke1997.github.io/react-transition-preset/)

# 使用方式
## 基础示例
```tsx
import { Transition } from 'react-transition-preset'

function Demo() {
  const [open, setOpen] = useState(boolean)
  
  return (
    <Transition
      mounted={open}
    >
      {(style) => <div style={style}>Hello, World!</div>}
    </Transition>
  )
}
```

`mounted`参数用于控制元素显隐，如果你希望元素在初始时就执行动画，需要设置 `initial`

```diff
import { Transition } from 'react-transition-preset'

function Demo() {

  return (
    <Transition
      mounted={true}
+     initial={true}
    >
      {(style) => <div style={style}>Hello, World!</div>}
    </Transition>
  )
}
```

## 进入视图时执行动画
这个需求是比较普遍的，react-transiton-preset也支持了此功能

```diff
import { Transition } from 'react-transition-preset'

function Demo() {

  return (
    <Transition
+     mounted={'whileInView'}
      initial={true}
    >
      {(style) => <div style={style}>Hello, World!</div>}
    </Transition>
  )
}
```

## 更多
此库还支持了非常多配置项，满足个性化需求，这里只贴了一部分

![](https://cdn.nlark.com/yuque/0/2025/png/1447731/1742549641665-12007d83-6ad7-46ee-8247-29b60e1fef5b.png)



如果你希望项目中统一动画或者不想自行封装，可以尝试一下 react-transiton-preset！

我把一个很复杂的个人项目中的 `motion` 都替换成 `react-transition-preset`后，性能也提升了不少！页面丝滑多了

