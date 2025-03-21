---
title: "最轻量的react toast"
summary: ""
date: "2025-03-21"
draft: false
tags:
- react
---

![](https://cdn.nlark.com/yuque/0/2025/gif/1447731/1742538489483-1e06d758-5ae7-4c15-9be0-9d75404b51ba.gif)

# 背景
本人主要是做ToC的项目，很多时候需要toast提示，类似于 vant、antd-mobile 的 toast，但是PC的UI库都没有提供Toast。

而react生态中，比较流行的 react-hot-toast，react-toastify 又不适合业务场景，所以手撸了一个非常轻量的无头toast。

# 使用方式
## 安装
```bash
npm i react-atom-toast
```



## 初始化
保持最小和高度定制化的原则，react-atom-toast默认不带任何样式，需要自行定义，所以有个初始化行为

使用 `setDefaultOptions`初始化默认选项

```tsx
import { toast } from 'react-atom-toast'

toast.setDefaultOptions({
  className: 'bg-black text-white p-2 rounded',
})
```

## 使用
使用方式很简单，可以只传内容，也可以传对象

```tsx
import { toast } from 'react-atom-toast'

toast('你好')

toast({
  content: 'Hello, world!',
  transition: 'fade-up',
})
```

## 配置项
react-atom-toast提供了一些配置供自定义，比如：

### duration
toast显示的时长

### maxCount
同时最多展示多少个toast。如果想要vant那种效果的话，就设置成1即可。建议在 `setDefaultOptions`中初始化，避免每次都传

### transiton
toast的过渡动画，默认是 'fade'，也支持 'fade-down'、'fade-up'、'pop-top' 等等常见的动画。都是预设好的，能力由 `react-transiton-preset`提供，也是轻量的动画库，预设了许多常用动画



# 最后
ToC项目通常比较看重交互的一致性，所以在PC、移动端上为了保持更好的统一，尽量不会使用多个UI库，比如antd和antd-mobile最好不混用。这样既能减少构建体积，也能提升交互一致性和开发维护性～

