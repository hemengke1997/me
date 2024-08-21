---
title: "实现 antd table 进度条"
date: "2021-12-08 16:30:00"
draft: false
tags:
- react
- antd
---

# 背景
**在table loading时，进度条可以更好的缓解用户的焦急心理，相比转圈圈loading，进度条也更特别**

# 实现
## 前置知识

1. **NProgress。前端开发，应该都对NProgress有所了解。它是著名的顶部进度条**
2. **ReactDOM.createPortal。它与ReactDOM.render的区别在于，后者会把子元素全部替换，而前者是在最后添加一个元素**

## 知识转化

1. **Nprogress是生成进度条的，而我只需要其进度的值，所以需要做一些代码转化**
### [use-nprogress](https://github.com/hemengke1997/use-nprogress)
> **react hook for NProgress，**

**可以通过该hook，获得progress值，它的变化与NProgress相同**
```jsx
import { Table } from 'antd';
import { useCallback, useState } from 'react';
import ReactDOM from 'react-dom';
import useNProgress from 'use-nprogress';

function MyTable() {
	const [loading, setLoading] = useState(false);
  
  const baseTableDomRef = useRef();
  
  const { progress, isFinished, animationDuration, progressKey } = useNProgress(
    {
      isAnimating: loading,
    },
  );
  
	const progressDom = useCallback(
    () => {
      const height = 3;
      const tableHeader = baseTableDom?.querySelector('.ant-table-header');

      return ReactDOM.createPortal(
        <div
          style={{
            position: 'inherit',
            zIndex: 9527,
            pointerEvents: 'none',
            left: 0,
            right: 0,
            opacity: isFinished ? 0 : 1,
            transition: `opacity ${animationDuration}ms linear`,
            transform: `translateY(-${height}px)`,
          }}
          key={progressKey}
        >
          <div
            style={{
              transition: `width ${animationDuration}ms linear`,
              width: `${(progress ?? 0) * 100}%`,
              borderRadius: 100,
              backgroundColor: 'var(--primary-5)',
              height,
            }}
          />
        </div>,
        tableHeader || document.body,
      );
    },
    [isFinished, loading, progress, progressKey, baseTableDomRef.current],
  );  

  
  return <div style={{ position: 'relative', width: '100%' }} ref={baseTableDomRef}>
      {progressDom?.()}

      <Table/>
    </div>

}
```
## 效果图
![动画7.gif](https://cdn.nlark.com/yuque/0/2021/gif/1447731/1638952182061-dc5fb65b-241b-44ba-a4e8-4e07f85c928b.gif#clientId=u000b5a2f-647b-4&from=paste&height=79&id=u1af2421f&originHeight=79&originWidth=1189&originalType=binary&ratio=1&rotation=0&showTitle=false&size=40953&status=done&style=none&taskId=u3b2499ef-e16a-46c9-8bfc-13791bacced&title=&width=1189)
