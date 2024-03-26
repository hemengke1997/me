---
title: "vite架子的搭建过程"
date: "2022-08-08 15:14:47"
draft: false
tags:
- vite
---

# Vite

## 如何搭建一个完整的 vite 项目

### 开始

1. `pnpm create vite`，获得一个最简单的模板

### 代码风格

1. 安装 prettier，新建 .prettier.js

### js 校验

1. 安装 eslint，新建 .eslintrc.js
2. 安装 eslint-define-config，它能为我们提供 eslint 配置的代码提示
3. 安装 eslint-config-react-app, eslint-config-prettier, eslint-plugin-prettier，第一个是 cra 的校验规则，我们直接继承就好。后面俩为了让 eslint 配合 prettier 的插件，因为 eslint 跟 prettier 有很多语法冲突，这些插件能为我们解决这些冲突

### css

1. 安装 postcss， 安装好后在项目根目录新建 postcss.config.js
2. 安装 postcss 插件 - autoprefixer（或者 postcss-preset-env 插件，但现在 autoprefixer 用得更多），做 css 兼容
3. 配置 stylelint。安装 stylelint，安装后新建 .stylelintrc.js
4. 安装 stylelint 的相关插件 => stylelint-config-css-modules, stylelint-config-prettier, stylelint-config-recommended

### 代码提交

1. 安装 @commitlint/cli,@commitlint/config-conventional.(按照官网教程走就行)。新建 commitlint.config.js 文件

### ~~windicss~~

之所以加入 windicss，是为了更方便的写 css

1. 安装 windicss, vite-plugin-windicss。前者是必要包，后者是 windicss 配合 vite 的插件
2. 新建 windi.config.ts，具体配置根据官网教程走就行

### husky([https://typicode.github.io/husky/#/](https://typicode.github.io/husky/#/))

1. 安装 husky，按照官网教程生成 .husky 文件夹
2. 添加 githook。pre-commit 中执行 lint 校验，commit-msg 中执行 commit 校验

### lint-staged([https://github.com/okonet/lint-staged#readme](https://github.com/okonet/lint-staged#readme))

1. 安装 lint-staged。这个插件是对 git 中 staged 的代码做校验，而不需要全量校验。

### npm script

1. 配置项目环境变量，需要安装 cross-env，为了在各个操作系统命令兼容
2. 配置 lint-staged 脚本
3. 配置 commitlint 脚本
4. 配置 eslint 脚本
5. 配置 prettier 脚本
6. 配置选择性升级依赖脚本（为了更方便的更新依赖）

### .vscode

1. 添加推荐扩展
2. 添加 vscode 基本设置

### 配置 vite

1. 跨域代理
2. 别名
3. ~~针对 antd 的处理~~
4. vite 的浏览器兼容插件
5. react 中处理 import svg 的插件
6. ~~windicss 的插件~~
7. 可视化打包体积的插件
8. 对 commonjs 第三方库的兼容支持

### axios 请求封装

1. 基本的 axios，具备所有非业务相关的基础功能，如拦截器、transformHook、统一错误处理
2. aliAxios，把需要走阿里网关的请求（涉及业务），继承 1 的基本 axios

### 路由配置

1. react-router@6
2. 路由守卫

### 国际化

1. i18next
2. react-i18next
3. vscode 安装 i18n Ally 插件，配合 i18n 实现文本提示

### 状态管理

> 如果需要全局状态管理再加，不需要的话可以加入局部状态管理方案，如 context-state


1. recoil || react-redux

## 命名规范

### 页面组件命名

- 页面组件文件夹使用大驼峰命名
- 页面组件统一使用 [页面名] 命名

### 页面组件 css 文件命名

- 统一使用 [页面名].module.(c|le)ss || [页面名].(c|le)ss 命名

## TODO

### 路由

1. 路由懒加载错误捕获重新加载

### 打包优化

#### CDN

1. [https://juejin.cn/post/7063004304394682399](https://juejin.cn/post/7063004304394682399)
2. [https://github.com/lceric/vite-plugin-resolve-externals](https://github.com/lceric/vite-plugin-resolve-externals)
3. [https://github.com/vitejs/vite/issues/3001#issuecomment-835193794](https://github.com/vitejs/vite/issues/3001#issuecomment-835193794)

#### 构建产物体积优化

1. 查阅 rollup 文档，做产物 split-chunk

### 体验优化

1. 客户端内，页面切换时会有闪烁感
