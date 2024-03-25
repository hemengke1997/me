---
title: "React 使用Context做权限管理"
date: "2022-05-12 15:15:28"
draft: false
tags:
- react
- 状态管理
---


# 参考
[https://github1s.com/umijs/plugins/blob/master/packages/plugin-access/src/index.ts](https://github1s.com/umijs/plugins/blob/master/packages/plugin-access/src/index.ts)
# 前言
React.Context是天然的状态管理方案，虽然有它的弊端（性能穿透），但是对于长时间不会改变的数据，是非常适合用Context存储的
# 实现
我们需要做的是，创建一个Context，把权限相关的东西都放进去
## accessContext
```typescript
import React from 'react';
import accessFactory from '../access';

export type AccessInstance = ReturnType<typeof accessFactory>;

const AccessContext = React.createContext<AccessInstance>(null!);

export default AccessContext;
```
这个context里面存放的就是权限，现在还没存，只是创建了Context
## accessFactory
权限工厂函数，传入后端接口返回的权限值，再返回前端格式化后的权限
```typescript
export default function(accessInfo) {
  return {
    isRoles: (route) => {
       return accessInfo?.includes(route.path || '');
    },
    isTest: accessInfo?.includes('test'),
    x: () => {
      return {
        a: accessInfo.includes('a'),
        b: accessInfo.includes('b'),
      }
    }
  }
}
```
## AccessProvider
```typescript
import AccessContext, { AccessInstance } from './accessContext';


const AccessProvider: React.FC<Props> = (props) => {
  const { children, routes } = props;

  // globalContext
  const accessInfo = ...  // 这个是从后端接口来的，可以放在prop中传下来，也可以在这里异步请求或许

  const access: AccessInstance = useMemo(() => accessFactory(accessInfo), [accessInfo]);

  return (
    <AccessContext.Provider value={access}>
      {React.cloneElement(children, {
        ...children.props,
       // 传给子组件的routes，需要经过清洗处理
        routes: traverseModifyRoutes(routes, access),
      })}
    </AccessContext.Provider>
  );
};

```
## 清理权限路由
```typescript
export function traverseModifyRoutes(propRoutes: Routes, access: any): Routes {
  const resultRoutes: Routes = [].concat(propRoutes as any).map((resultRoute: MenuDataItem) => {
    const { routes } = resultRoute;
    if (routes && routes?.map) {
      return {
        ...resultRoute,
        // return new route to routes.
        routes: routes?.map((route: any) => ({ ...route })),
      };
    }
    return resultRoute;
  });

  return resultRoutes.map((currentRoute) => {
    let currentRouteAccessible = typeof currentRoute.unaccessible === 'boolean' ? !currentRoute.unaccessible : true;

    // 判断路由是否有权限的具体代码
    if (currentRoute && currentRoute.access) {
      if (typeof currentRoute.access !== 'string') {
        throw new Error('[access]: "access" field set in "' + currentRoute.path + '" route should be a string.');
      }
      const accessProp = access[currentRoute.access];

      // 如果是方法需要执行以下
      if (typeof accessProp === 'function') {
        currentRouteAccessible = accessProp(currentRoute);
      } else if (typeof accessProp === 'boolean') {
        // 不是方法就直接 copy
        currentRouteAccessible = accessProp;
      } else if (typeof accessProp === 'undefined') {
        currentRouteAccessible = true;
      }
      currentRoute.unaccessible = !currentRouteAccessible;
    }

    // 筛选子路由
    if (currentRoute.routes || currentRoute.children) {
      const childRoutes = currentRoute.routes || currentRoute.children;

      if (!Array.isArray(childRoutes)) {
        return currentRoute;
      }
      // 父亲没权限，理论上每个孩子都没权限
      // 可能有打平 的事情发生，所以都执行一下
      childRoutes.forEach((childRoute) => {
        childRoute.unaccessible = !currentRouteAccessible;
      });
      const finallyChildRoute = traverseModifyRoutes(childRoutes, access);

      // 如果每个子节点都没有权限，那么自己也属于没有权限
      const isAllChildRoutesUnaccessible =
        Array.isArray(finallyChildRoute) && finallyChildRoute.every((route) => route.unaccessible);

      if (!currentRoute.unaccessible && isAllChildRoutesUnaccessible) {
        currentRoute.unaccessible = true;
      }
      if (finallyChildRoute && finallyChildRoute?.length > 0) {
        return {
          ...currentRoute,
          routes: finallyChildRoute,
        };
      }
      delete currentRoute.routes;
    }

    return currentRoute;
  });
}
```
## index导出
```typescript
import AccessProvider from './utils/accessProvider';
import AccessContext from './utils/accessContext';
import { traverseModifyRoutes } from './utils/traverseModifyRoutes';

export const useAccess = () => {
  const access = React.useContext(AccessContext);

  return access;
};

export { AccessProvider, AccessContext, traverseModifyRoutes, useAccess };

```
## useAccess 使用权限
```typescript
function A() {
  const x = useAccess('x');
  console.log(x)
}
```
