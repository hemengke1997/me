---
title: "vue中网页跳转进度条的实现🖖"
date: "2020-12-24 11:55"
draft: false
tags:
- vue
---

- 网页跳转时显示进度条，可以有效避免用户的焦躁心理。所以咱们有必要在网页跳转时加一个进度条

#### 业务场景

1. 网页跳转（可能会产生白屏），显示进度条，加载数据，新网页渲染好之后进度条消失
2. 当前网页显示进度条，同时加载渲染新页面，待新页面数据拿到之后再跳转

#### 核心功能

- vue-router守卫函数
- nprogress插件

#### 准备工作（cli已经帮我们实现了router相关的步骤）

- 安装vue-router

```bash
npm i vue-router
```

- 在项目中使用vue-router

```ts
import Vue from 'vue'
import Router from 'vue-router'
Vue.use(Router)
const router = new Router()
```

- 安装nprogress插件

```bash
npm i nprogress -D
```

- 在入口main.js中引入插件

```ts
import NProgress from 'nprogress'
import 'nprogress/nprogress.css'

Vue.prototype.NProgress = NProgress
```

预备工作搞好了，开始实现效果。let's do it

#### 实现第一种场景

##### 整体思路

- 网页跳转，同时显示进度条，跳转结束之后，进度条达到100%并消失

按照这个思路的，结合vue-router的导航守卫，咱们可以很轻松写出这样的代码

```ts
// 注册全局前置守卫
router.beforeEach((to, from, next) => {
  if (to.path !== from.path) {
    NProgress.start()
  }
  next()
})
```

以上代码搞定了当路由变化开始的时候，进度条显示（`NProgress.start()`）。当路由跳转之后，有两个思路：

1. 在新页面的`created()`或`mounted()`钩子中获取数据，当数据获取完毕时，进度条消失。
2. 注册全局后置守卫结束进度条

- 思路1⃣️

```
methods: {
  getData() {
      return new Promise((resolve, reject) => {
        setTimeout(() => {
          resolve();
          console.log("数据获取成功");
        }, 3000);
      });
    }
},
created() {
    this.getData().then(res => {
      this.NProgress.done();
    });
}
```

- 思路2⃣️（在main.js中添加代码）

```
router.afterEach((to, from) => {
  NProgress.done()
})
```

显而易见，思路2⃣️的效果只是出现一个短暂的进度条而已，除此之外没有其他意义了

---

#### 实现第二种场景

##### 整体思路

这种场景下，路由跳转时，如果数据还没请求完成，用户会停留在当前页面，进度条开始动画，当数据请求完毕之后，网页跳转，进度条到达100%并消失

同样的，我们要先注册一个全局的路由前置守卫

```
router.beforeEach((to, from, next) => {
  if (to.path !== from.path) {
    NProgress.start()
  }
  next()
})
```

在待进入的页面中，加入`beforeRouteEnter()`钩子

```
beforeRouteEnter(to, from, next) {
 getData()
  .then(res => {
    next(vm => {
      // 这里可以使用res中的数据来做渲染
      vm.NProgress.done();
    });
  })
  .catch(() => {
    next(false);
  });
}
```

这里有点坑的地方就是，`beforeRouteEnter()`中不能使用`this`来获取组件实例，所以`getData()`这里是通过引入的方式

