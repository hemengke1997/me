---
title: "ReactHooks如何写一个插件？"
date: "2021-01-26 11:35"
draft: false
tags:
- react
---


## 前言

看了antd以及一些插件的源码，都是用的类的方式去写的，可能是它们考虑了兼容性。但是作为一个真的不会写类组件的人来说，用类来写插件太累了，所以用hooks写了一个通用的toast组件

## 过程

如果写一个组件，那就太没得感觉了，我想要的是一个只暴露api的组件，而且在不需要它的时候，就不要它挂载到dom上

只写个大概，没有自定义样式，没有自定义位置，除了基本功能，其他什么都没有

### 代码
#### react-transition-group实现动画

```jsx
import classnames from 'classnames';
import React, { useEffect, useState } from 'react';
import ReactDOM from 'react-dom';
import { CSSTransition } from 'react-transition-group';
import styles from './index.module.less';

let timer = null;

const Toast = props => {
  const { visible, stayTime, content, className } = props;
  const [visibleState, setVisibleState] = useState(false);
  const [toastStyle, setToastStyle] = useState({});

  const afterClose = () => {
    const afterClose = props.afterClose;
    if (Toast._instance) {
      Toast.toastContainer.removeChild(Toast._instance);
      Toast._instance = null;
    }
    if (typeof afterClose === 'function') {
      afterClose();
    }
  };

  const hide = () => {
    setVisibleState(false);
  };

  const autoClose = () => {
    if (stayTime > 0) {
      timer = setTimeout(() => {
        hide();
        clearTimeout(timer);
      }, stayTime);
    }
  };

  const setStyle = visible => {
    setToastStyle({
      top: '0%',
    });
    if (visible) {
      const raq = window.requestAnimationFrame(() => {
        setToastStyle({
          top: '10%',
        });
        if (window.requestIdleCallback) {
          window.requestIdleCallback(() => {
            window.cancelAnimationFrame(raq);
          });
        } else {
          window.cancelAnimationFrame(raq);
        }
      });
    } else {
      setToastStyle({
        top: '0%',
      });
    }
  };

  useEffect(() => {
    Toast.hideHelper = hide;
    return () => {
      clearTimeout(timer);
    };
  }, []);

  useEffect(() => {
    setVisibleState(visible);
  }, [visible]);

  useEffect(() => {
    setStyle(visibleState);
    if (visibleState) {
      autoClose();
    }
  }, [visibleState]);

  return (
    <CSSTransition
      in={visibleState}
      classNames={{
        enter: styles['toast-enter'],
        enterActive: styles['toast-enter-active'],
        exit: styles['toast-exit'],
        exitActive: styles['toast-exit-active'],
        exitDone: styles['toast-exit-done'],
      }}
      timeout={700}
      unmountOnExit
      mountOnEnter={false}
      onExited={() => afterClose()}
    >
      <div className={styles.mask}>
        <div
          className={classnames(styles.toastBox, className ? className : '')}
          style={toastStyle}
          onClick={() => hide()}
        >
          {content}
        </div>
      </div>
    </CSSTransition>
  );
};

const contentIsToastProps = function(content) {
  return typeof content === 'object' && 'content' in content;
};

// 获取装载容器
const getMountContainer = function(mountContainer) {
  if (mountContainer) {
    if (typeof mountContainer === 'function') {
      return mountContainer();
    }
    if (
      typeof mountContainer === 'object' &&
      mountContainer instanceof HTMLElement
    ) {
      return mountContainer;
    }
  }
  return document.body;
};

Toast._instance = null;
Toast.toastContainer = null;
Toast.defaultProps = {
  visible: false,
  stayTime: 2000,
  mask: false,
};

Toast.show = function(content) {
  Toast.unmountNode(); // 是否在显示toast之前卸载之前的toast
  // 如果没有toast实例，就新建一个实例，并且挂载到指定的dom上
  if (!Toast._instance) {
    Toast._instance = document.createElement('div');
    Toast._instance.classList.add('custom-class');
    if (contentIsToastProps(content) && content.className) {
      Toast._instance.classList.add(className);
    }
    Toast.toastContainer =
      contentIsToastProps(content) && content.mountContainer
        ? getMountContainer(content.mountContainer)
        : getMountContainer();
    Toast.toastContainer.appendChild(Toast._instance);
  }

  if (Toast._instance) {
    let props;
    if (contentIsToastProps(content)) {
      props = {
        ...Toast.defaultProps,
        ...content,
        visible: true,
        mountContainer: Toast._instance,
      };
    } else {
      props = {
        ...Toast.defaultProps,
        visible: true,
        mountContainer: Toast._instance,
        content,
      };
    }
    ReactDOM.render(<Toast {...props} />, Toast._instance);
  }
};

Toast.hide = function() {
  if (Toast._instance) {
    Toast.hideHelper();
  }
};

Toast.unmountNode = function() {
  const { _instance } = Toast;
  if (_instance) {
    ReactDOM.render(<></>, _instance);
    Toast.toastContainer.removeChild(_instance);
    Toast._instance = null;
  }
};

export default Toast;
```

#### react-motion 实现动画
```jsx
import React, { useEffect, useState } from 'react';
import ReactDOM from 'react-dom';
import { spring, TransitionMotion } from 'react-motion';
import styles from './index.module.less';

let timer = null;

const Toast = props => {
  const { visible, stayTime, content } = props;
  const [visibleState, setVisibleState] = useState(false);
  const [toastStyle, setToastStyle] = useState({ top: 0, opacity: 0 });

  const afterClose = () => {
    const afterClose = props.afterClose;
    if (Toast._instance) {
      Toast.toastContainer.removeChild(Toast._instance);
      Toast._instance = null;
    }
    if (typeof afterClose === 'function') {
      afterClose();
    }
  };

  const hide = () => {
    setVisibleState(false);
  };

  const autoClose = () => {
    if (stayTime > 0) {
      timer = setTimeout(() => {
        hide();
        clearTimeout(timer);
      }, stayTime);
    }
  };

  const setStyle = visible => {
    if (visible) {
      setToastStyle({
        top: 10,
        opacity: 1,
      });
    } else {
      setToastStyle({
        top: 0,
        opacity: 0,
      });
    }
  };

  const didLeave = (styleThatLeft) => {
    console.log(styleThatLeft,'styleThatLeft')
    afterClose();
  };

  useEffect(() => {
    Toast.hideHelper = hide;
    return () => {
      clearTimeout(timer);
    };
  }, []);

  useEffect(() => {
    setVisibleState(visible);
  }, [visible]);

  useEffect(() => {
    setStyle(visibleState);
    if (visibleState) {
      autoClose();
    }
  }, [visibleState]);

  return (
    <TransitionMotion
      styles={
        visibleState
          ? [
              {
                key: 'toast',
                style: {
                  top: spring(toastStyle.top),
                  opacity: spring(toastStyle.opacity),
                },
              },
            ]
          : []
      }
      willEnter={() => ({ top: 0, opacity: 0 })}
      willLeave={() => ({ top: spring(0), opacity: spring(0) })}
      didLeave={(styleThatLeft) => didLeave(styleThatLeft)}
    >
      {inStyle =>
        inStyle[0] ? (
          <div
            className={styles.toastBox}
            style={{ top: `${inStyle[0].style.top}%`, opacity: `${inStyle[0].style.opacity}` }}
            onClick={() => hide()}
          >
            {content}
          </div>
        ) : null
      }
    </TransitionMotion>
  );
};

const contentIsToastProps = function(content) {
  return typeof content === 'object' && 'content' in content;
};

// 获取装载容器
const getMountContainer = function(mountContainer) {
  if (mountContainer) {
    if (typeof mountContainer === 'function') {
      return mountContainer();
    }
    if (
      typeof mountContainer === 'object' &&
      mountContainer instanceof HTMLElement
    ) {
      return mountContainer;
    }
  }
  return document.body;
};

Toast._instance = null;
Toast.toastContainer = null;
Toast.defaultProps = {
  visible: false,
  stayTime: 2000,
};

Toast.show = function(content) {
  Toast.unmountNode(); // 是否在显示toast之前卸载之前的toast
  // 如果没有toast实例，就新建一个实例，并且挂载到指定的dom上
  if (!Toast._instance) {
    Toast._instance = document.createElement('div');
    Toast._instance.classList.add('_instance');
    if (contentIsToastProps(content) && content.className) {
      Toast._instance.classList.add(className);
    }
    Toast.toastContainer =
      contentIsToastProps(content) && content.mountContainer
        ? getMountContainer(content.mountContainer)
        : getMountContainer();
    Toast.toastContainer.appendChild(Toast._instance);
  }

  if (Toast._instance) {
    let props;
    if (contentIsToastProps(content)) {
      props = {
        ...Toast.defaultProps,
        ...content,
        visible: true,
        mountContainer: Toast._instance,
      };
    } else {
      props = {
        ...Toast.defaultProps,
        visible: true,
        mountContainer: Toast._instance,
        content,
      };
    }
    ReactDOM.render(<Toast {...props} />, Toast._instance);
  }
};

Toast.hide = function() {
  if (Toast._instance) {
    Toast.hideHelper();
  }
};

Toast.unmountNode = function() {
  const { _instance } = Toast;
  if (_instance) {
    ReactDOM.render(<></>, _instance);
    Toast.toastContainer.removeChild(_instance);
    Toast._instance = null;
  }
};

export default Toast;
```
### 使用方式

```jsx
import Toast from './toast'

Toast.show('显示一个toast')
Toast.show({
    content: 'content',
    mountContainer: document.body
})
Toast.hide()
```

### 结果
![mmm.gif](https://cdn.nlark.com/yuque/0/2021/gif/1447731/1610586516951-32bfb11f-765a-4325-a184-353397c25e34.gif#align=left&display=inline&height=575&originHeight=575&originWidth=723&size=142238&status=done&style=none&width=723)
### 思考
现在实现的是同时只能显示一个toast，如何实现类似antd的message那种效果呢？
