---
title: "vite-plugin-prerelease"
summary: "运行时的预发布环境"
date: "2025-02-01"
draft: false
tags:
- vite
repoUrl: https://github.com/hemengke1997/vite-plugin-prerelease
---

预发布插件。插件会在网页上植入小组件，用于切换测试/预发布环境

默认预发布环境取的 production 环境变量，你可以在代码中通过 import.meta.env.PRERELEASE 来判断是否是预发布环境

此插件解决了需要新建预发布git分支、切换分支、合并代码等繁琐操作
