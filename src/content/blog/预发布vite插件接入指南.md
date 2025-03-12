---
title: "预发布vite插件接入指南"
date: "2025-01-22 10:26:40"
draft: false
tags:
  - vite
  - 插件
  - 预发布
---

## 介绍
[vite-plugin-prerelease](https://github.com/hemengke1997/vite-plugin-prerelease) 在构建测试环境时，同时构建预发布代码(默认是 `production`)。插件会在网页上植入小组件，用于切换测试/预发布环境

此插件解决了需要新建预发布git分支、切换分支、合并代码、构建代码等繁琐操作



接入非常简单，直接开始 ⬇️

## 安装依赖
```bash
npm i vite-plugin-prerelease -D
```

## vite.config中引入
```typescript
import { defineConfig } from 'vite'
import { prerelease } from 'vite-plugin-prerelease'

export default defineConfig(() => {
  return {
    plugins: [
      prerelease(),
    ]
  }
})
```

我们项目中一般是用的 vite-config-preset，这里也贴一下对应的代码

```typescript
import { defineConfig } from 'vite'
import { preset } from 'vite-config-preset'
import { prerelease } from 'vite-plugin-prerelease'

export default defineConfig((env) => {
  return preset(
    {
      env,
      plugins: [
        prerelease(),
      ],
    },
    {
      legacy: true,
    },
  )
})

```



至此，项目就已经具备预发布能力了！接下来我们在请求头中添加预发布

## 业务代码中添加预发布逻辑
```typescript
if (import.meta.env.PRERELEASE) {
  config.headers['x-ca-stage'] = 'PRE'
}
```

注意，<font style="background-color:#E4495B;">不需要</font>自行定义 `PRERELEASE`环境变量！



## 如何知道预发布是否成功
在测试环境打包

```bash
cross-env NODE_ENV=test vite build --mode test
```



然后本地预览

```bash
vite preview
```

然后可以看到页面中出现了一个小控件：

![](https://cdn.nlark.com/yuque/0/2025/png/1447731/1737512196195-d0eb652f-6b2c-4d9e-876f-760552a1a7bf.png)

点击这个控件，即可切换测试/预发布环境。



在预发布环境，如果你的请求头添加对了，那么接口响应头中会有这个字段：

![](https://cdn.nlark.com/yuque/0/2025/png/1447731/1737512261001-907e82d6-b804-460b-8301-a8d7f44dacfb.png)



那么恭喜你，预发布接入成功了。



## 进阶
[vite-plugin-prerelease](https://github.com/hemengke1997/vite-plugin-prerelease) 提供了一些插件和客户端API，但是通常情况下，你不需要进行任何设置，完全开箱即用！

如果插件无法满足需求，再尝试配置吧
