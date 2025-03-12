---
title: "这给我干哪儿来了，这还是react-router吗"
date: "2025-02-18 15:38:54"
draft: false
tags:
- react-router
---

自6.4版本后，react-router发生了一系列巨大的变化，我身边有许多小伙伴都懵逼了，纷纷表示：“这给我干哪儿来了，这还是react-router吗”

本文就是带你了解react-router最近的更新，以及如何使用最新版的react-router

# react-router三大阶段
我把 react-router 分成了 3 个大阶段，分别是：

1. v6.4 版本之前
2. v6.4
3. v7.x 版本（也就是目前最新的大版本）

要对react-router7有深刻理解，从这三个阶段的迭代方向入手会更快

## v6.4 之前
目前下载量最高的版本依然是 `5.3.4`，我个人觉得，是因为 v6.0 没有明显功能增加以及一些破坏式更新，导致开发者普遍没有升级

这个时期，开发者普遍使用声明式路由或配置式路由。

### 声明式路由
官方文档写法就是声明式，如：

```typescript
import React from "react";
import {
  BrowserRouter as Router,
  Switch,
  Route,
  Link
} from "react-router-dom";

export default function App() {
  return (
    <Router>
      <div>
        <Switch>
          <Route path="/about">
            <About />
          </Route>
          <Route path="/users">
            <Users />
          </Route>
          <Route path="/">
            <Home />
          </Route>
        </Switch>
      </div>
    </Router>
  );
}

function Home() {
  return <h2>Home</h2>;
}

function About() {
  return <h2>About</h2>;
}

function Users() {
  return <h2>Users</h2>;
}
```

把所有路由组件都声明在 `Switch` 中，这样最简单，但维护起来并不令人满意

### 配置式路由
这种写法，我认为更多是参考了 `vue-router`的思想，在此贴一下 `vue-router`的基本示例：

```typescript
const Foo = { template: '<div>foo</div>' }
const Bar = { template: '<div>bar</div>' }

const routes = [
  { path: '/foo', component: Foo },
  { path: '/bar', component: Bar }
]

const router = new VueRouter({
  routes
})

const app = new Vue({
  router
}).$mount('#app')
```

react-router 官方也有配置式路由的基础示例：

```tsx
import React from "react";
import {
  BrowserRouter as Router,
  Switch,
  Route,
  Link
} from "react-router-dom";

const routes = [
  {
    path: "/sandwiches",
    component: Sandwiches
  },
  {
    path: "/tacos",
    component: Tacos,
    routes: [
      {
        path: "/tacos/bus",
        component: Bus
      },
    ]
  }
];

export default function RouteConfigExample() {
  return (
    <Router>
      <div>
        <Switch>
          {routes.map((route, i) => (
            <RouteWithSubRoutes key={i} {...route} />
          ))}
        </Switch>
      </div>
    </Router>
  );
}
function RouteWithSubRoutes(route) {
  return (
    <Route
      path={route.path}
      render={props => (
        // pass the sub-routes down to keep nesting
        <route.component {...props} routes={route.routes} />
      )}
    />
  );
}

function Sandwiches() {
  return <h2>Sandwiches</h2>;
}

function Tacos({ routes }) {
  return (
    <div>
      <Switch>
        {routes.map((route, i) => (
          <RouteWithSubRoutes key={i} {...route} />
        ))}
      </Switch>
    </div>
  );
}

function Bus() {
  return <h3>Bus</h3>;
}
```

官方原生功能不支持路由懒加载、meta元信息、路由守卫等功能，但是社区中有许多解决方案，这里我贴一下我个人的写法：

```tsx
import { type Route } from 'vite-plugin-remix-flat-routes/client'
import { BrowserRouter } from 'react-router-dom'
import { LegacyRouterProvider } from 'vite-plugin-remix-flat-routes/client'

const routes: Route[] = [
  {
    path: '/home',
    lazyComponent: () => import('./pages/home'),
    handle: {
      data: '自定义元信息'
    }
  },
  {
    path: '/page-a',
    lazyComponent: () => import('./pages/page-a'),
  },
  {
    path: '*',
    element: <div>404</div>,
  },
]


function App() {
  return (
    <BrowserRouter>
      <LegacyRouterProvider
        routes={routes}
        // 路由守卫
        onRouteMount={()=>{}}
        onRouteUnmount={()=>{}}
        ></LegacyRouterProvider>
    </BrowserRouter>
  )
}
```



在这个阶段中，react-router 没有原生支持路由守卫、路由钩子、元信息（类似vue-router meta）等功能，开发者需要自行实现，这点是被社区吐槽比较严重的。

## v6.4
6.4 虽然是 v6，但是认为应该命名为 v7！因为这个版本引入了大量的API和新写法，接下来听我好好聊聊这个版本

6.4，可以理解为 “客户端渲染的remix”，所以我们需要对 remix 有个初步了解

### remix
`remix`是一个由 `react-router` 团队开发的react全栈框架，`nextjs`的竞品之一。

remix的特点是基于react-router，混合了服务端渲染和客户端渲染。所以在 remix 的开发过程中，开发团队也同时在增强react-router功能以支持 remix 的开发，属于是双向奔赴了。

为了让开发者们也能享受到remix的红利，其团队索性把remix的客户端渲染功能添加到了 react-router 中，于是便有了 v6.4

### 6.4带来了什么
我认为，6.4 最大的变化是 Data API。说人话，就是多了几个数据相关的API，贴个代码你就懂了

首先，要使用 Data API，需要使用新的 RouterProvider 组件，以前的 BrowserRouter 组件不支持 Data API。

```tsx
import * as React from "react";
import * as ReactDOM from "react-dom";
import {
  createBrowserRouter,
  RouterProvider,
} from "react-router-dom";

import Root, { rootLoader } from "./routes/root";
import Team, { teamLoader, teamTitle } from "./routes/team";

const router = createBrowserRouter([
  {
    path: "/",
    element: <Root />,
    loader: rootLoader,
    children: [
      {
        path: "team",
        element: <Team />,
        loader: teamLoader,
        handle: { title: teamTitle },
      },
    ],
  },
]);

ReactDOM.createRoot(document.getElementById("root")).render(
  <RouterProvider router={router} />
);
```

现在用 `createBrowserRouter`来创建router实例，然后在 RouterProvider 中使用。

但你可能注意到了`loader`和 `handle`属性，这就是所谓的 DataAPI。

+ loader：在路由组件初始化之前执行，可以用于权限判断、数据预获取等，有点路由守卫的味道了
+ handle：路由的元数据，类似 vue-router 的meta，其值可以是任意的，甚至是个react组件都可以

路由组件中可以通过 `useLoaderData` 和 `useMatches`来分别获取 loader/handle 的值

```tsx
import {
  createBrowserRouter,
  RouterProvider,
  useLoaderData,
  useMatches,
} from "react-router-dom";

function loader() {
  return fetchFakeAlbums();
}

export function Albums() {
  const albums = useLoaderData();
  const matches = useMatches();
  // ...
}

const router = createBrowserRouter([
  {
    path: "/",
    loader: loader,
    element: <Albums />,
  },
]);

ReactDOM.createRoot(el).render(
  <RouterProvider router={router} />
);
```

这两个API，是最贴合业务的，其他还新增了一些为服务端渲染做铺垫、或是不贴合业务的，就不在此赘述了。

这里是 [react-router6.4](https://reactrouter.com/6.4.0/) 的文档，感兴趣的就去看看！

6.4之后，react-router就朝向统一remix发展了，经历了v6的所有迭代后，react-router7和remix3就是同一个东西了。

个人分析，react-router团队是希望借由目前react-router庞大的用户群体，来扩张remix的使用量，从而实现更好的商业化，以抗衡nextjs。虽然想法挺好的，但是react-router的这个大版本的更新并不尽人意，甚至让人抗拒。接下来我们进入到最新的 v7，探究缘由

## v7
v7是react-router团队野心勃勃的产物，从以前的客户端渲染路由库一霸，转向为 服务端渲染+客户端渲染。

上文说到，更新不尽人意，这里大致说一下为什么

1. v7 发布之前，官方团队发了几篇po，描绘了美好的蓝图。但正式发布后，我看到的是一个很差劲的官网以及各种404。我尝试从官网来实现一个简单的项目，却四处碰壁！很多约定、API在官网中都查阅不到，只能去翻 remix 的文档
2. v7 把使用方式区分成了 库模式 和 框架模式，文档大部分都是写的关于框架模式的，但实际上目前 react-router 的使用者，绝大多数都是在使用库模式，这导致了这些开发者上手困难，不想升级

吐槽结束，回归正题，接下来说说如何快速上手 v7



首先，v7分了两种模式，库模式、框架模式，用人话说，库模式就是客户端路由，框架模式就是remix服务端路由。

如果你是做的B端项目，不追求SEO、极致的渲染效率等，建议使用库模式

如果你是做的C端项目，追求SEO、良好用户体验，建议使用框架模式

### 库模式
你最好是看 v6 的官方文档，因为 v7 文档基本都是讲框架模式的。

其实使用方式跟 v6.4 类似，相比框架模式，从开发形式上来说，区别最大的是：框架模式支持约定式路由，也就是如 nextjs 的文件路由。

这种约定式路由的开发方式我个人觉得非常方便，并且可以非常方便的使用 DataAPI。在路由文件中导出路由组件、Data API即可，比如：

```tsx
export default function Home() {
  return <div>home</div>
}

export const loader = () => {
  // 在这里可以鉴权、预获取接口数据等
}

export const handle = {
  title: '主页'
}
```

这种写法，配合约定式路由，是目前最符合 react-router 的开发形式。但 react-router 团队并没有官方支持库模式的约定式路由，所以我写了一个vite插件来实现 react-router 风格的约定式路由，[插件地址在此！](https://hemengke1997.github.io/vite-plugin-remix-flat-routes/zh/)

### 框架模式
框架模式，实际上就是 remix。如果你使用框架模式，现阶段最好是配合 remix 文档一起使用，因为 v7 文档实在是不够看，缺东少西。

相比库模式，框架模式不仅仅多了优秀的约定式路由，还需要引入vite插件、修改启动命令

```typescript
import { reactRouter } from "@react-router/dev/vite";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [reactRouter()],
});
```

```json
 "scripts": {
    "dev": "react-router dev",
    "build": "react-router build",
    "start": "react-router-serve ./build/server/index.js",
},
```



在API的使用上，框架模式和库模式是一致的，比如都可以使用 `useLoaderData`来获取 loader 的返回值。



# 总结
react-router的未来发展一定是向nextjs看齐，毕竟市场上还是有不小的蛋糕，并且nextjs也并不是完美的框架。所以react-router也会成为一个越来越重的库。

从开发角度来看，有更多的竞争是有利有弊的

利在于我们有更多的选择，如果你青睐vite，那么 react-router 是个不错的选择，如果你偏爱 webpack，那么nextjs或许更适合你。

弊在于，在竞争激烈的情况下，更新也会更加频繁，开发者的负担也会加重

但如果你还是停留在 v4,v5 这些老版本的话，我是建议尝试使用 DataAPI 和 约定式路由！

