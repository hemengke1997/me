---
title: "react-motion_react-spring做一个message小插件"
date: "2021-01-20 14:59"
draft: false
tags:
- react
---

## 过程
这里面坑挺多的，主要报错的内容有：

- 不能在渲染的时候去setState
- 还有个啥 我忘了

## JS版本
### 代码
`index.jsx` 
```jsx
import React, { useCallback, useEffect, useReducer, useState } from 'react';
import ReactDOM from 'react-dom';
import styles from './index.module.less';
import { TransitionMotion, spring, presets } from 'react-motion';
import UUID from 'uuidjs';

const TRANSLATEY = 120;
const Message = React.memo(props => {
  const { visible, stayTime, content } = props;
  const [visibleState, setVisibleState] = useState(false);
  const [height, setHeight] = useState(0);
  let timer = null;

  const getStyles = useCallback(() => {
    if (visibleState) {
      return [
        {
          key: 'message',
          style: {
            translateY: spring(0, presets.wobbly),
            height: height,
            opacity: spring(1),
          },
        },
      ];
    }
    return [];
  }, [visibleState, height]);

  const afterClose = () => {
    let afterClose = props.afterClose;
    if (typeof afterClose === 'function') {
      afterClose();
    }
  };

  const hide = () => {
    setVisibleState(false);
    clearTimeout(timer);
  };

  const autoClose = () => {
    if (stayTime > 0) {
      timer = setTimeout(() => {
        hide();
      }, stayTime);
    }
  };

  const didLeave = styleThatLeft => {
    afterClose();
    // TransitonMotion组件会在didLeave中做一些异步操作，
    // 如果直接卸载此组件，会导致异步操作报错，
    // 所以使用setTimeout宏任务，排在源代码的异步操作后面
    setTimeout(() => {
      MessageQueue.dispatchMessageList({ type: 'remove' });
    }, 0);
  };

  useEffect(() => {
    return () => {
      console.log('message => unmount');
    };
  }, []);

  useEffect(() => {
    setVisibleState(visible);
  }, [visible]);

  useEffect(() => {
    if (visibleState) {
      autoClose();
    }
  }, [visibleState]);

  const getNode = ref => {
    if (ref) {
      setHeight(ref.getBoundingClientRect().height);
    }
  };

  return (
    <TransitionMotion
      styles={getStyles()}
      defaultStyles={[
        {
          style: {
            translateY: -TRANSLATEY,
            opacity: 0,
          },
          key: 'message',
        },
      ]}
      willEnter={() => ({
        translateY: -TRANSLATEY,
        opacity: 0,
      })}
      willLeave={() => ({
        translateY: spring(-TRANSLATEY),
        height: spring(0),
        opacity: spring(0),
      })}
      didLeave={styleThatLeft => didLeave(styleThatLeft)}
    >
      {inStyle =>
        inStyle[0] ? (
          <div
            style={{
              opacity: `${inStyle[0].style.opacity}`,
              height: `${inStyle[0].style.height}px`,
            }}
          >
            <div
              ref={getNode}
              className={styles.messageBigBox}
              style={{
                transform: `translateY(${inStyle[0].style.translateY}%)`,
              }}
            >
              <div className={styles.messageBox} onClick={() => hide()}>
                {content}
              </div>
            </div>
          </div>
        ) : null
      }
    </TransitionMotion>
  );
});

Message.defaultProps = {
  visible: false,
  stayTime: 3000,
  maxCount: 5,
};

const MessageQueue = React.memo(props => {
  const { maxCount } = props;
  const reducer = (store, action) => {
    const t = [...store];
    switch (action.type) {
      case 'add':
        const visibleList = t.filter(item => item.visible === true);
        if (visibleList.length >= maxCount) {
          // visible false
          for (let i = 0; i < t.length; i++) {
            if (t[i].visible) {
              t[i].visible = false;
              break;
            }
          }
        }
        // 由于会有删除操作，所以不能用index作为key，需要一个唯一值
        return [...t, { ...action.data, sortKey: UUID.generate() }];
      case 'remove':
        t.shift();
        if (!t.length) {
          setTimeout(() => {
            Message.unmountNode();
          }, 0);
        }
        return t;
      default:
        throw new Error('xxxx');
    }
  };

  const [messageList, dispatchMessageList] = useReducer(reducer, []);

  useEffect(() => {
    dispatchMessageList({ type: 'add', data: props });
  }, [props]);

  useEffect(() => {
    MessageQueue.dispatchMessageList = dispatchMessageList;
  }, []);

  return (
    <>
      <div className={styles.messageWrapper}>
        {messageList.length > 0 &&
          messageList.map(message => (
            <Message key={message.sortKey} {...message}></Message>
          ))}
      </div>
    </>
  );
});

const contentIsMessageProps = function(content) {
  return typeof content === 'object' && 'content' in content;
};

MessageQueue._instance = null;
// 看似挂在message上，其实都是对MessageQueue操作
Message.show = function(content) {
  let props;
  if (contentIsMessageProps(content)) {
    props = {
      ...Message.defaultProps,
      ...content,
      visible: true,
    };
  } else {
    props = {
      ...Message.defaultProps,
      content,
      visible: true,
    };
  }
  if (!MessageQueue._instance) {
    MessageQueue._instance = document.createElement('div');
    MessageQueue._instance.classList.add('MessageQueue');
    MessageQueue.containerDOM = document.body;
    MessageQueue.containerDOM.appendChild(MessageQueue._instance);
    // 第一次渲染
    ReactDOM.render(<MessageQueue {...props} />, MessageQueue._instance);
  } else {
    MessageQueue.dispatchMessageList({ type: 'add', data: props });
  }
};
Message.hideAll = function() {};
Message.unmountNode = function() {
  const { _instance } = MessageQueue;
  if (_instance) {
    ReactDOM.render(<></>, _instance);
    MessageQueue.containerDOM.removeChild(_instance);
    MessageQueue._instance = null;
  }
};
export default Message;

```
`index.less` 
```less
.messageWrapper {
  position: fixed;
  left: 0;
  right: 0;
  top: 8px;
  z-index: 1000;
  pointer-events: none;
}

.messageBigBox {
  text-align: center;
  padding: 8px 0;
}

.messageBox {
  display: inline-block;
  border-radius: 8px;
  background-color: #0084ff;
  color: #fff;
  font-size: 16px;
  box-shadow: 0 3px 6px -4px rgba(0, 0, 0, 0.12),
    0 6px 16px 0 rgba(0, 0, 0, 0.08), 0 9px 28px 8px rgba(0, 0, 0, 0.05);
  pointer-events: all;
  padding: 8px 16px;
}
```
### 使用方式
```less
import Message from './message'

Message.show('some text')
```
### 效果
![mmm1.gif](https://cdn.nlark.com/yuque/0/2021/gif/1447731/1610938051539-35595b86-6d4f-4a31-bd05-af7c36285ff1.gif#align=left&display=inline&height=575&originHeight=575&originWidth=723&size=835577&status=done&style=none&width=723)
## TS版本
```jsx
import React, { ReactNode, useCallback, useEffect, useReducer, useState, RefCallback } from 'react';
import ReactDOM from 'react-dom';
import styles from './index.module.less';
import { TransitionMotion, spring, presets, TransitionStyle } from 'react-motion';
import UUID from 'uuidjs';
import LoadingOutlined from '@ant-design/icons/LoadingOutlined';
import ExclamationCircleFilled from '@ant-design/icons/ExclamationCircleFilled';
import CloseCircleFilled from '@ant-design/icons/CloseCircleFilled';
import CheckCircleFilled from '@ant-design/icons/CheckCircleFilled';
import CloseCircleOutlined from '@ant-design/icons/CloseCircleOutlined'



const TRANSLATEY = 100;

export type messageType = 'info' | 'success' | 'warning' | 'error' | 'loading'

export type contentType = string | MessageProps | ReactNode

export interface MessageQueueProps {
  visible: boolean
  duration?: number
  content: contentType
  onClose?: () => void
  maxCount: number
  showClose?: boolean
  offset: number
  type: messageType
}

export interface MessageProps extends MessageQueueProps {
  sortKey: string
}


export interface MessageInterface extends React.MemoExoticComponent<(props: MessageProps) => JSX.Element> {
  defaultProps: MessageQueueProps
  unmountNode: () => void
  show: (content: contentType) => void
  hideAll: () => void
}


export interface MessageQueueInterface extends React.MemoExoticComponent<(props: MessageQueueProps) => JSX.Element> {
  _instance: HTMLDivElement | null
  dispatchMessageList: React.Dispatch<actionType>
  [key: string]: any
}


export interface actionType {
  type: 'add' | 'remove' | 'hide'
  data?: any
}

const Message: MessageInterface = React.memo((props: MessageProps) => {
  const { visible, duration, content, onClose, sortKey, showClose, type } = props;
  const [height, setHeight] = useState<number>(0);
  const [manualClose, setManualClose] = useState<boolean>(false)
  let timer: number

  const getStyles = useCallback(() => {
    if (visible) {
      return [
        {
          key: 'message',
          style: {
            translateY: spring(0, presets.wobbly),
            height: height,
            opacity: spring(1),
            translateX: 0
          },
        },
      ];
    }
    return [];
  }, [visible, height]);

  const afterClose = () => {
    if (typeof onClose === 'function') {
      onClose();
    }
  };

  const hide = (manual = false) => {
    manual && setManualClose(true)
    // 告诉父组件，这个子组件的visible改为false
    MessageQueue.dispatchMessageList({ type: 'hide', data: sortKey })
    clearTimeout(timer);
  };

  const autoClose = () => {
    if (duration as number > 0) {
      timer = setTimeout(() => {
        hide();
      }, duration);
    }
  };

  const didLeave = (styleThatLeft: TransitionStyle) => {
    afterClose();
    // TransitonMotion组件会在didLeave中做一些异步操作，
    // 如果直接卸载此组件，会导致异步操作报错，
    // 所以使用setTimeout宏任务，排在源代码的异步操作后面
    setTimeout(() => {
      MessageQueue.dispatchMessageList({ type: 'remove', data: sortKey });
    }, 0);
  };

  useEffect(() => {
    return () => {
      console.log('message => unmount');
    };
  }, []);

  useEffect(() => {
    if (visible) {
      autoClose();
    }
  }, [visible]);

  const getNode: RefCallback<HTMLElement> = (ref) => {
    if (ref) {
      setHeight(ref.getBoundingClientRect().height);
    }
  };

  // 策略模式?
  const typeIcon = {
    info: <></>,
    success: <CheckCircleFilled style={{ color: '#52c41a', marginRight: '12px' }} />,
    error: <CloseCircleFilled style={{ color: 'ff5050', marginRight: '12px' }} />,
    warning: <ExclamationCircleFilled style={{ color: 'hsl(31, 83.1%, 55.9%)', marginRight: '12px' }} />,
    loading: <LoadingOutlined style={{ marginRight: '12px' }} />
  }

  return (
    <TransitionMotion
      styles={getStyles()}
      defaultStyles={[
        {
          style: {
            translateY: -TRANSLATEY,
            opacity: 0,
            translateX: 0
          },
          key: 'message',
        },
      ]}
      willEnter={() => ({
        translateY: -TRANSLATEY,
        opacity: 0,
        translateX: 0
      })}
      willLeave={() => {
        if (manualClose) {
          return {
            translateX: spring(-TRANSLATEY),
            translateY: spring(0),
            height: spring(0),
            opacity: spring(0)
          }
        }
        return {
          translateY: spring(-TRANSLATEY),
          height: spring(0),
          opacity: spring(0),
          translateX: 0
        }
      }}
      didLeave={(styleThatLeft) => didLeave(styleThatLeft)}
    >
      {inStyle =>
        inStyle[0] ? (
          <div
            style={{
              height: `${inStyle[0].style.height}px`,
              opacity: `${inStyle[0].style.opacity}`,
            }}
            className={styles.messageContainer}
          >
            <div
              ref={getNode}
              className={styles.messageBigBox}
              style={{
                transform: `translate(0,${inStyle[0].style.translateY}%)`,
              }}
            >
              <div className={styles.messageBox} style={{ transform: `translate(${inStyle[0].style.translateX}%,0)`, pointerEvents: visible ? 'all' : 'none', }} >
                {typeIcon[type]}
                {content}
                {
                  showClose && <CloseCircleOutlined style={{ marginLeft: '12px' }} onClick={() => hide(true)} />
                }
              </div>
            </div>
          </div>
        ) : <></>
      }
    </TransitionMotion>
  );
}) as any;

Message.defaultProps = {
  content: '',
  visible: false,
  duration: 3000,
  maxCount: 5,
  showClose: false,
  onClose: () => null,
  offset: 16,
  type: 'info',
};



const MessageQueue: MessageQueueInterface = React.memo((props: MessageQueueProps) => {
  const { maxCount, offset } = props;
  const reducer = (store: MessageProps[], action: actionType) => {
    const t = [...store];
    switch (action.type) {
      case 'add': {
        const visibleList = t.filter(item => item.visible === true);
        if (visibleList.length >= maxCount) {
          // visible false
          for (let i = 0; i < t.length; i++) {
            if (t[i].visible) {
              t[i].visible = false;
              break;
            }
          }
        }
        return [...t, { ...action.data, sortKey: UUID.generate() }];
      }
      case 'remove': {
        const { data: sortKey } = action
        const x = t.filter(item => item.sortKey !== sortKey)
        if (!x.length) {
          setTimeout(() => {
            Message.unmountNode();
          }, 0);
        }
        return x;
      }
      case 'hide': {
        const { data: sortKey } = action
        const x = t.map(item => {
          if (item.sortKey === sortKey) {
            return { ...item, visible: false }
          }
          return item
        })
        return x
      }
      default:
        throw new Error('xxxx');
    }
  };

  const [messageList, dispatchMessageList] = useReducer<React.Reducer<MessageProps[], actionType>>(reducer, []);

  useEffect(() => {
    dispatchMessageList({ type: 'add', data: props });
  }, [props]);

  useEffect(() => {
    MessageQueue.dispatchMessageList = dispatchMessageList;
  }, []);

  return (
    <>
      <div className={styles.messageWrapper} style={{ top: `${offset - 8}px` }}>
        {messageList.length > 0 &&
          messageList.map(message => (
            <Message key={message.sortKey} {...message}></Message>
          ))}
      </div>
    </>
  );
}) as any;

const contentIsMessageProps = function (content: contentType) {
  return typeof content === 'object' && content !== null && 'content' in content;
};

MessageQueue._instance = null;

// 看似挂在message上，其实都是对MessageQueue操作
Message.show = function (content: contentType) {
  let props = {
    ...Message.defaultProps,
    visible: true,
  };
  if (contentIsMessageProps(content)) {
    props = {
      ...props,
      ...content as MessageProps,
    };
  } else {
    props = {
      ...props,
      content,
    };
  }
  if (!MessageQueue._instance) {
    MessageQueue._instance = document.createElement('div');
    MessageQueue._instance.classList.add('MessageQueue');
    MessageQueue.containerDOM = document.body;
    MessageQueue.containerDOM.appendChild(MessageQueue._instance);
    // 第一次渲染
    ReactDOM.render(<MessageQueue {...props} />, MessageQueue._instance);
  } else {
    MessageQueue.dispatchMessageList({ type: 'add', data: props });
  }
};
Message.hideAll = function () { };
Message.unmountNode = function () {
  const { _instance } = MessageQueue;
  if (_instance) {
    ReactDOM.render(<></>, _instance);
    MessageQueue.containerDOM.removeChild(_instance);
    MessageQueue._instance = null;
  }
};

/**
 * @description 统一的show方法
 * @param contentType string | ReactNode | Object
 */
const _show = Message.show

export default _show
```
### 改良效果
![mmm2.gif](https://cdn.nlark.com/yuque/0/2021/gif/1447731/1611052902115-54918381-e61c-4c0e-9b67-e12407dbaaf4.gif#align=left&display=inline&height=372&originHeight=372&originWidth=528&size=529877&status=done&style=none&width=528)
### 思考

1. 如果要真正的封装成一个插件，还需要哪些工作？

已知：

- 添加ts声明文件
- 更多元化的导出，让使用者可以直接调用的方法更多
2. TS声明一个函数之后，函数的属性暂未实现，怎么办

## react-motion的缺陷

1. 已经很久没更新了，源码中有使用一些高版本React不再支持的方法
2. 弹簧动画的开始只能是拉伸的，没有压缩的，想实现如 `bounce` 的效果非常困难

## 使用react-spring 实现
### react-spring的优点

1. 基于react-motion和[animated](https://github.com/animatedjs/animated)，不仅仅是spring
2. 项目目前还在更新，而且准备出next版本，参与的贡献者较多
3. 暴露hooks api

### 初步版本
#### 使用render-props
```jsx
const Message: MessageInterface = React.memo((props: MessageProps) => {
  const { visible, duration, content, onClose, sortKey, showClose, type } = props;
  const [manualClose, setManualClose] = useState<boolean>(false)
  let timer: number


  const afterClose = () => {
    if (typeof onClose === 'function') {
      onClose();
    }
  };

  const hide = (manual = false) => {
    manual && setManualClose(true)
    // 告诉父组件，这个子组件的visible改为false
    MessageQueue.dispatchMessageList({ type: 'hide', data: sortKey })
    clearTimeout(timer);
  };

  const autoClose = () => {
    if (duration as number > 0) {
      timer = setTimeout(() => {
        hide();
      }, duration);
    }
  };

  const didLeave = () => {
    afterClose();
    // TransitonMotion组件会在didLeave中做一些异步操作，
    // 如果直接卸载此组件，会导致异步操作报错，
    // 所以使用setTimeout宏任务，排在源代码的异步操作后面
    setTimeout(() => {
      MessageQueue.dispatchMessageList({ type: 'remove', data: sortKey });
    }, 0);
  };

  useEffect(() => {
    return () => {
      console.log('message => unmount');
    };
  }, []);

  useEffect(() => {
    if (visible) {
      autoClose();
    }
  }, [visible]);


  // 策略模式?
  const typeIcon = {
    info: <></>,
    success: <CheckCircleFilled style={{ color: '#52c41a', marginRight: '12px' }} />,
    error: <CloseCircleFilled style={{ color: 'ff5050', marginRight: '12px' }} />,
    warning: <ExclamationCircleFilled style={{ color: 'hsl(31, 83.1%, 55.9%)', marginRight: '12px' }} />,
    loading: <LoadingOutlined style={{ marginRight: '12px' }} />
  }

  return (
    <Transition
      native
      items={visible}
      from={{ opacity: 0, height: 0, y: 'translateY(-100%)' }}
      enter={{ opacity: 1, height: 'auto', y: 'translateY(0)', x: 'translateX(0%)' }}
      leave={() => {
        return manualClose ?
          { opacity: 0, height: 0, x: 'translateX(-100%)', y: 'translateY(0)' } :
          { opacity: 0, height: 0, x: 'translateX(0)', y: 'translateY(-100%)' }
      }}
      onDestroyed={didLeave}
      // @ts-ignore
      config={(item) => (key) => {
        if (item && key === 'y') {
          return config.wobbly
        }
        return {}
      }}
    >
      {visible => visible && (inStyle => {
        return (
          <animated.div
            className={styles.messageContainer}
            style={{ height: inStyle.height, opacity: inStyle.opacity }}
          >
            <animated.div
              className={styles.messageBigBox}
              style={{ transform: inStyle.y }}
            >
              <animated.div
                className={styles.messageBox}
                style={{ transform: inStyle.x }}
              >
                {typeIcon[type]}
                {content}
                {
                  showClose ? <CloseCircleOutlined style={{ marginLeft: '12px' }} onClick={() => hide(true)} /> : <></>
                }
              </animated.div>
            </animated.div>
          </animated.div>
        )
      })}
    </Transition>
  );
}) as any;
```
#### 感受
功能比react-motion更强，入门难度更高
