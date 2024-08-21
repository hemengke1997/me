---
title: "antd源码解析系列 —— modal"
date: "2022-05-11 16:50:26"
draft: false
tags:
- antd
---

# 前言

我们平时使用modal，一般是直接用Modal组件，有的情况也会使用 Modal.confirm() 等静态方法来显示modal。应该怎样去设计一个既有组件又有静态方法的组件呢？


# [分析antd-modal](https://github.com/ant-design/ant-design/blob/master/components/modal/index.tsx)
## 目录结构 
![image.png](https://cdn.nlark.com/yuque/0/2022/png/1447731/1652254033159-3f6312b6-4313-4141-949b-62efb8bb537d.png#clientId=u4e08350e-f789-4&from=paste&height=291&id=J5SDJ&originHeight=291&originWidth=277&originalType=binary&ratio=1&rotation=0&showTitle=false&size=9857&status=done&style=none&taskId=ue1088b5a-5bf7-4276-92cc-0c750ab6c54&title=&width=277)
## 从index中看导出了哪些api出去，首先引入眼帘的是Modal，那就从Modal下手吧，然后再分析静态方法
```typescript
import type { ModalStaticFunctions } from './confirm';
import type { ModalFuncProps } from './Modal';
import confirm, {
  modalGlobalConfig,
  withConfirm,
  withError,
  withInfo,
  withSuccess,
  withWarn,
} from './confirm';
import destroyFns from './destroyFns';
import OriginModal from './Modal';
import useModal from './useModal';

export { ModalProps, ModalFuncProps } from './Modal';

function modalWarn(props: ModalFuncProps) {
  return confirm(withWarn(props));
}

type ModalType = typeof OriginModal &
  ModalStaticFunctions & {
    useModal: typeof useModal;
    destroyAll: () => void;
    config: typeof modalGlobalConfig;
  };

const Modal = OriginModal as ModalType;

Modal.useModal = useModal;

Modal.info = function infoFn(props: ModalFuncProps) {
  return confirm(withInfo(props));
};

Modal.success = function successFn(props: ModalFuncProps) {
  return confirm(withSuccess(props));
};

Modal.error = function errorFn(props: ModalFuncProps) {
  return confirm(withError(props));
};

Modal.warning = modalWarn;

Modal.warn = modalWarn;

Modal.confirm = function confirmFn(props: ModalFuncProps) {
  return confirm(withConfirm(props));
};

Modal.destroyAll = function destroyAllFn() {
  while (destroyFns.length) {
    const close = destroyFns.pop();
    if (close) {
      close();
    }
  }
};

Modal.config = modalGlobalConfig;

export default Modal;

```
## 分析Modal组件
### modal.tsx
```typescript
这段代码是获取用户点击的位置，然后让modal的动画从用户点击位置(transform-origin)
// ref: https://github.com/ant-design/ant-design/issues/15795
const getClickPosition = (e: MouseEvent) => {
  mousePosition = {
    x: e.pageX,
    y: e.pageY,
  };
  // 100ms 内发生过点击事件，则从点击位置动画展示
  // 否则直接 zoom 展示
  // 这样可以兼容非点击方式展开
  setTimeout(() => {
    mousePosition = null;
  }, 100);
};

// 只有点击事件支持从鼠标位置动画展开
if (canUseDocElement()) {
  document.documentElement.addEventListener('click', getClickPosition, true);
}

这里的写法就是普通组件写法，内部使用 `rc-dialog` 实现modal
const Modal: React.FC<ModalProps> = props => ...

Modal.defaultProps = {
  width: 520,
  confirmLoading: false,
  visible: false,
  okType: 'primary' as LegacyButtonType,
};

export default Modal;
```
## 分析静态方法
### 可以看到，所有的静态方法归根结底都是调用confirm
```typescript
核心方法
每次调用静态方法显示modal时，最底层都是执行的这个confirm方法
export default function confirm(config: ModalFuncProps) {
  创建一个node节点存放html
  const container = document.createDocumentFragment();
  
  初始化配置，用于传给 ConfirmDialog 组件，注意，不是Modal
  let currentConfig = { ...config, close, visible: true } as any;
  
  close后执行卸载方法
  function destroy(...args: any[]) {
    const triggerCancel = args.some(param => param && param.triggerCancel);
    if (config.onCancel && triggerCancel) {
      config.onCancel(...args);
    }
    for (let i = 0; i < destroyFns.length; i++) {
      const fn = destroyFns[i];
      if (fn === close) {
        destroyFns.splice(i, 1);
        break;
      }
    }
    react卸载组件，源码链接贴下面了
    reactUnmount(container);
  }
  
  核心方法，渲染confirmDialog
  function render({ okText, cancelText, prefixCls: customizePrefixCls, ...props }: any) {
    /**
     * https://github.com/ant-design/ant-design/issues/23623
     *
     * Sync render blocks React event. Let's make this async.
     */
    setTimeout(() => {
      // --------------------------------------
      const runtimeLocale = getConfirmLocale();
      const { getPrefixCls, getIconPrefixCls } = globalConfig();
      // because Modal.config  set rootPrefixCls, which is different from other components
      const rootPrefixCls = getPrefixCls(undefined, getRootPrefixCls());
      const prefixCls = customizePrefixCls || `${rootPrefixCls}-modal`;
      const iconPrefixCls = getIconPrefixCls();
      // --------------------------------------
      
      // locale什么的不太重要
      
      // 这里的reactRender源码在
      // https://github.com/react-component/util/blob/HEAD/src/React/render.ts
      // 对render做了react17的兼容处理
  
      reactRender(
        <ConfirmDialog
          {...props}
          prefixCls={prefixCls}
          rootPrefixCls={rootPrefixCls}
          iconPrefixCls={iconPrefixCls}
          okText={okText || (props.okCancel ? runtimeLocale.okText : runtimeLocale.justOkText)}
          cancelText={cancelText || runtimeLocale.cancelText}
        />,
        container,
      );
    });
  }
  
  关闭confirmDialog，dialog内部onCancel会调用这个方法。dialog不控制visible。
  function close(...args: any[]) {
    currentConfig = {
      ...currentConfig,
      visible: false,
      afterClose: () => {
        if (typeof config.afterClose === 'function') {
          config.afterClose();
        }

        destroy.apply(this, args);
      },
    };
    render(currentConfig);
  }

  function update(configUpdate: ConfigUpdate) {
    if (typeof configUpdate === 'function') {
      currentConfig = configUpdate(currentConfig);
    } else {
      currentConfig = {
        ...currentConfig,
        ...configUpdate,
      };
    }
    render(currentConfig);
  }
  

  // 执行渲染
  render(currentConfig);

  destroyFns.push(close);

  return {
    destroy: close,
    update,
  };
}
```
## ConfirmDialog组件（内部是Modal）
```typescript
import * as React from 'react';
import classNames from 'classnames';
import type { ModalFuncProps } from './Modal';
import Dialog from './Modal';
import ActionButton from '../_util/ActionButton';
import warning from '../_util/warning';
import ConfigProvider from '../config-provider';
import { getTransitionName } from '../_util/motion';

interface ConfirmDialogProps extends ModalFuncProps {
  afterClose?: () => void;
  close: (...args: any[]) => void;
  autoFocusButton?: null | 'ok' | 'cancel';
  rootPrefixCls: string;
  iconPrefixCls?: string;
}

const ConfirmDialog = (props: ConfirmDialogProps) => {
  const {
    icon,
    onCancel,
    onOk,
    close,
    zIndex,
    afterClose,
    visible,
    keyboard,
    centered,
    getContainer,
    maskStyle,
    okText,
    okButtonProps,
    cancelText,
    cancelButtonProps,
    direction,
    prefixCls,
    wrapClassName,
    rootPrefixCls,
    iconPrefixCls,
    bodyStyle,
    closable = false,
    closeIcon,
    modalRender,
    focusTriggerAfterClose,
  } = props;

  warning(
    !(typeof icon === 'string' && icon.length > 2),
    'Modal',
    `\`icon\` is using ReactNode instead of string naming in v4. Please check \`${icon}\` at https://ant.design/components/icon`,
  );

  // 支持传入{ icon: null }来隐藏`Modal.confirm`默认的Icon
  const okType = props.okType || 'primary';
  const contentPrefixCls = `${prefixCls}-confirm`;
  // 默认为 true，保持向下兼容
  const okCancel = 'okCancel' in props ? props.okCancel! : true;
  const width = props.width || 416;
  const style = props.style || {};
  const mask = props.mask === undefined ? true : props.mask;
  // 默认为 false，保持旧版默认行为
  const maskClosable = props.maskClosable === undefined ? false : props.maskClosable;
  const autoFocusButton = props.autoFocusButton === null ? false : props.autoFocusButton || 'ok';

  const classString = classNames(
    contentPrefixCls,
    `${contentPrefixCls}-${props.type}`,
    { [`${contentPrefixCls}-rtl`]: direction === 'rtl' },
    props.className,
  );

  return (
    <ConfigProvider prefixCls={rootPrefixCls} iconPrefixCls={iconPrefixCls} direction={direction}>
      <Dialog
        prefixCls={prefixCls}
        className={classString}
        wrapClassName={classNames(
          { [`${contentPrefixCls}-centered`]: !!props.centered },
          wrapClassName,
        )}
        主要在这里，onCancel执行close方法
        onCancel={() => close({ triggerCancel: true })}
        visible={visible}
        title=""
        footer=""
        transitionName={getTransitionName(rootPrefixCls, 'zoom', props.transitionName)}
        maskTransitionName={getTransitionName(rootPrefixCls, 'fade', props.maskTransitionName)}
        mask={mask}
        maskClosable={maskClosable}
        maskStyle={maskStyle}
        style={style}
        bodyStyle={bodyStyle}
        width={width}
        zIndex={zIndex}
        afterClose={afterClose}
        keyboard={keyboard}
        centered={centered}
        getContainer={getContainer}
        closable={closable}
        closeIcon={closeIcon}
        modalRender={modalRender}
        focusTriggerAfterClose={focusTriggerAfterClose}
      />
      ...
    </ConfigProvider>
  );
};

export default ConfirmDialog;
```
# 
## 回到Index.tsx
```typescript
import type { ModalFuncProps } from './Modal';
import OriginModal from './Modal';
import type { ModalStaticFunctions } from './confirm';
import confirm, {
  withWarn,
  withInfo,
  withSuccess,
  withError,
  withConfirm,
  modalGlobalConfig,
} from './confirm';
import useModal from './useModal';
import destroyFns from './destroyFns';

export { ModalProps, ModalFuncProps } from './Modal';

function modalWarn(props: ModalFuncProps) {
  return confirm(withWarn(props));
}


最后导出的Modal类型
type ModalType = typeof OriginModal &
  ModalStaticFunctions & {
    useModal: typeof useModal;
    destroyAll: () => void;
    config: typeof modalGlobalConfig;
  };

用as断言，以便下面对Modal的静态方法赋值
const Modal = OriginModal as ModalType;

Modal.useModal = useModal;

Modal.info = function infoFn(props: ModalFuncProps) {
  return confirm(withInfo(props));
};

Modal.success = function successFn(props: ModalFuncProps) {
  return confirm(withSuccess(props));
};

Modal.error = function errorFn(props: ModalFuncProps) {
  return confirm(withError(props));
};

Modal.warning = modalWarn;

Modal.warn = modalWarn;

Modal.confirm = function confirmFn(props: ModalFuncProps) {
  return confirm(withConfirm(props));
};

Modal.destroyAll = function destroyAllFn() {
  while (destroyFns.length) {
    const close = destroyFns.pop();
    if (close) {
      close();
    }
  }
};

Modal.config = modalGlobalConfig;

export default Modal;

```
## 分析完modal，写个小结，接着分析内部的rc-dialog
> 整体看下来，modal的源码没什么亮点，不过对我们的开发实践是有帮助的。
> 1. 以后如果我们想封装组件且组件带方法，就可以模仿antd源码。我觉得核心是 as 断言，哈哈哈
> 2. 对于这种显隐组件，antd是使用reactDOM的方法去render/unmount组件，我们如果遇到类似场景，也可以这样做
> 
我比较奇怪的是
> 1. 为什么额外封装了ConfirmDialog来服务静态方法？其实直接用Modal也是一样的吧~
> 2. 为什么没有采用 React.createPortal的方案来做静态方法的渲染？


# [分析rc-dialog](https://github.com/react-component/dialog/blob/master/src/Dialog/index.tsx)
## 温馨提示
> rc-dialog不仅仅应用在antd modal上，很多Dialog式的组件内部都是用的它

## 目录结构
![image.png](https://cdn.nlark.com/yuque/0/2022/png/1447731/1652257168110-0945994d-2b79-4180-8905-ccffa91744bc.png#clientId=u4e08350e-f789-4&from=paste&height=242&id=u638b3bc6&originHeight=242&originWidth=217&originalType=binary&ratio=1&rotation=0&showTitle=false&size=8731&status=done&style=none&taskId=ua2b59570-29fb-4360-a6ee-103e87865c1&title=&width=217)
## 老套路，先看index
```typescript
import DialogWrap from './DialogWrap';
import { IDialogPropTypes as DialogProps } from './IDialogPropTypes';

export { DialogProps };

export default DialogWrap;
```
## DialogWrap
```typescript
const DialogWrap: React.FC<IDialogPropTypes> = (props: IDialogPropTypes) => {
  const { visible, getContainer, forceRender, destroyOnClose = false, afterClose } = props;
  const [animatedVisible, setAnimatedVisible] = React.useState<boolean>(visible);

  React.useEffect(() => {
    if (visible) {
      setAnimatedVisible(true);
    }
  }, [visible]);

  // 渲染在当前 dom 里；
  if (getContainer === false) {
    return (
      <Dialog
        {...props}
        getOpenCount={() => 2} // 不对 body 做任何操作。。
      />
    );
  }
  
  这个比较重要，destroyOnClose其实就是直接返回null，并没有专门去卸载组件
  // Destroy on close will remove wrapped div
  if (!forceRender && destroyOnClose && !animatedVisible) {
    return null;
  }

  return (
    <Portal visible={visible} forceRender={forceRender} getContainer={getContainer}>
      {(childProps: IDialogChildProps) => (
        <Dialog
          {...props}
          destroyOnClose={destroyOnClose}
          afterClose={() => {
            afterClose?.();
            setAnimatedVisible(false);
          }}
          {...childProps}
        />
      )}
    </Portal>
  );
};

```
## Portal组件
```typescript
 render() {
    const { children, forceRender, visible } = this.props;
    let portal = null;
    const childProps = {
      getOpenCount: () => openCount,
      getContainer: this.getContainer,
      switchScrollingEffect: this.switchScrollingEffect,
      scrollLocker: this.scrollLocker,
    };

    if (forceRender || visible || this.componentRef.current) {
      portal = (
        <Portal getContainer={this.getContainer} ref={this.componentRef}>
          {children(childProps)}
        </Portal>
      );
    }
    return portal;
  }
```
```typescript
import type * as React from 'react';
import { useRef, useEffect, forwardRef, useImperativeHandle } from 'react';
import ReactDOM from 'react-dom';
import canUseDom from './Dom/canUseDom';

export type PortalRef = {};

export interface PortalProps {
  didUpdate?: (prevProps: PortalProps) => void;
  getContainer: () => HTMLElement;
  children?: React.ReactNode;
}

const Portal = forwardRef<PortalRef, PortalProps>((props, ref) => {
  const { didUpdate, getContainer, children } = props;

  const parentRef = useRef<ParentNode>();
  const containerRef = useRef<HTMLElement>();
  
  这个操作比较骚，ref只用来让父组件判断是否有子组件
  // Ref return nothing, only for wrapper check exist
  useImperativeHandle(ref, () => ({}));

  // Create container in client side with sync to avoid useEffect not get ref
  const initRef = useRef(false);
  if (!initRef.current && canUseDom()) {
    containerRef.current = getContainer();
    parentRef.current = containerRef.current.parentNode;
    initRef.current = true;
  }

  // [Legacy] Used by `rc-trigger`
  useEffect(() => {
    didUpdate?.(props);
  });

  useEffect(() => {
    这里关注一下，这是因为升级React18 严格模式做的相应改动
    // Restore container to original place
    // React 18 StrictMode will unmount first and mount back for effect test:
    // https://reactjs.org/blog/2022/03/29/react-v18.html#new-strict-mode-behaviors
    if (
      containerRef.current.parentNode === null &&
      parentRef.current !== null
    ) {
      parentRef.current.appendChild(containerRef.current);
    }
    return () => {
      // [Legacy] This should not be handle by Portal but parent PortalWrapper instead.
      // Since some component use `Portal` directly, we have to keep the logic here.
      containerRef.current?.parentNode?.removeChild(containerRef.current);
    };
  }, []);

  return containerRef.current
    ? ReactDOM.createPortal(children, containerRef.current)
    : null;
});

export default Portal;

```
## Dialog组件
```typescript
// https://github.com/react-component/dialog/blob/master/src/Dialog/index.tsx
```
比较简单，不做分析，主要是使用了rc-motion做动画，难点可能是在dialog出现时需要锁定滚动条
