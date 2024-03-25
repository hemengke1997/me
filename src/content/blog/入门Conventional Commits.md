---
title: "入门Conventional Commits👀"
date: "2022-05-16 15:06:39"
draft: false
tags:
- git
---

# home
[约定式提交](https://www.conventionalcommits.org/zh-hans/v1.0.0/)
# why：为什么使用 conventional commits

- 自动化生成ChangeLog，很香
- 基于commit-msg的类型，自动生成[语义化](https://semver.org/lang/zh-CN/)的版本变更
- 触发构建和部署流程(CI/CD)，很香
# F&Q
### 如果提交符合多种类型我该如何操作？
回退并尽可能创建多次提交。约定式提交的好处之一是能够促使我们做出更有组织的提交和 PR
### 这和 SemVer 有什么关联呢？
fix 类型提交应当对应到 PATCH 版本。feat 类型提交应该对应到 MINOR 版本。带有 BREAKING CHANGE 的提交不管类型如何，都应该对应到 MAJOR 版本
### 当你使用了在规范中但错误的类型时，例如将 feat 写成了 fix
在合并或发布这个错误之前，我们建议使用 `git rebase -i`来编辑提交历史。而在发布之后，根据你使用的工具和流程不同，会有不同的清理方案
# 应CC规范而生的工具
[GitHub - conventional-changelog/commitlint: 📓 Lint commit messages](https://github.com/conventional-changelog/commitlint)
[GitHub - googleapis/release-please: generate release PRs based on the conventionalcommits.org spec](https://github.com/googleapis/release-please)
[GitHub - semantic-release/semantic-release: Fully automated version management and package publishing](https://github.com/semantic-release/semantic-release)
[GitHub - changesets/changesets: 🦋 A way to manage your versioning and changelogs with a focus on monorepos](https://github.com/changesets/changesets)
[GitHub - conventional-changelog/standard-version: Automate versioning and CHANGELOG generation, with semver.org and conventionalcommits.org](https://github.com/conventional-changelog/standard-version)
[GitHub - conventional-changelog/conventional-changelog: Generate changelogs and release notes from a project’s commit messages and metadata.](https://github.com/conventional-changelog/conventional-changelog)
