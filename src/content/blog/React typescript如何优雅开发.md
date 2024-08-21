---
title: "React typescript如何优雅开发"
date: "2022-05-09 17:51:05"
draft: false
tags:
- react
- typescript
---

## 掌握基础
### typescript
[typescript进阶](https://www.yuque.com/hemengke/blog/oi1sc5?view=doc_embed)
### React中的ts
#### 1. 声明FunctionComponent
```typescript
import React from 'react';

const Comp: React.FC<{
  test: string, // props是一个泛型
}> = ({test}) => {
  
}
export default Comp
```
![image.png](https://cdn.nlark.com/yuque/0/2022/png/1447731/1652085734549-fb5f3ee5-0e37-4562-9816-9de5a155da83.png#clientId=uaf709646-64be-4&from=paste&height=262&id=u6be430f9&originHeight=262&originWidth=501&originalType=binary&ratio=1&rotation=0&showTitle=false&size=20226&status=done&style=none&taskId=u7bc17486-05e0-4f8a-ab25-a8b9befc216&title=&width=501)
FC是一个泛型类型，其泛型是props的类型

#### 2. ForwardRefRenderFunction
![image.png](https://cdn.nlark.com/yuque/0/2022/png/1447731/1652086091345-6d38685b-5dac-445e-897a-614e511f149c.png#clientId=uaf709646-64be-4&from=paste&height=292&id=u863e389f&originHeight=292&originWidth=524&originalType=binary&ratio=1&rotation=0&showTitle=false&size=23471&status=done&style=none&taskId=uf1884101-bfa8-4aa9-8498-a893a0c3876&title=&width=524)
有的情况下，我们想创建ref组件，为了把组件方法或属性暴露给父组件
```typescript
import { useImperativeHandle } from 'react';

export type refType = {
  // 要暴露出去的方法或属性
  click: () => void;
}

type propType = {
  // 组件接受的prop
  p: string
}

// 这里有点儿坑，泛型的顺序和入参的顺序是反的
const Child: React.ForwardRefRenderFunction<refType, propType> = (props, ref) => {
  useImperativeHandle(ref,()=>({
    click: () => {
      console.log('这是子组件的click')
    }
  }))
  
  return <div>1</div>
}

// 父组件
const Parent: React.FC = () => {
  const ref = useRef<refType>();
  
  // ref.current.click() 就可以调用子组件的方法了
  
  return <Child ref={ref}></Child>
}
```

#### 3. React中自带的常用类型

1. React.ReactNode。react的节点类型，就是jsx可以渲染的类型
```typescript
type ReactNode = ReactElement | string | number | ReactFragment | ReactPortal | boolean | null | undefined;
```

2. React.ReactElement。 react的元素类型
```typescript
 interface ReactElement<P = any, T extends string | JSXElementConstructor<any> = string | JSXElementConstructor<any>> {
        type: T;
        props: P;
        key: Key | null;
  }
```

3. HTMLAttributes<T>，这是html节点所有属性的集合
```typescript
    interface HTMLAttributes<T> extends AriaAttributes, DOMAttributes<T> {
        // React-specific Attributes
        defaultChecked?: boolean | undefined;
        defaultValue?: string | number | ReadonlyArray<string> | undefined;
        suppressContentEditableWarning?: boolean | undefined;
        suppressHydrationWarning?: boolean | undefined;

        // Standard HTML Attributes
        accessKey?: string | undefined;
        className?: string | undefined;
        contentEditable?: Booleanish | "inherit" | undefined;
        contextMenu?: string | undefined;
        dir?: string | undefined;
        draggable?: Booleanish | undefined;
        hidden?: boolean | undefined;
      ...
}
```
一般我想定义一个组件，它是一个普通的组件的时候，我会这样写
```typescript
const Comp: React.FC<HTMLAttributes<unknown>> = ...
```
##### 还有很多，可以在使用的过程中探索

#### 4. 如何定义函数类型
定义函数的类型，应该是我们写tsx情况最多的时候。函数主要是入参和返回，我写几个定义函数的例子
```typescript
// 直接在方法上定义类型
function x(a: string, b: number): number {
  return 1
}

// 专门定义方法类型
type F = () => void;

// 方法类型带参数
type F = (x: number, ...args: any[]) => void;

// 泛型
type F<T> = (x: T) => void

// 类型保护
function isString(test: any): test is string{
    return typeof test === "string";
}

// 重载，函数的参数个数、类型、返回值不同时，可以使用重载
function add(arg1: string, arg2: string): string
function add(arg1: number, arg2: number): number
function add(arg1: string | number, arg2: string | number) {
   // 具体实现
}
```

##### 而又有很多时候，我们需要借助第三方库的方法类型，比如我们用的antd的组件，需要实现方法，如果去手写类型就很麻烦，索性直接使用 map[key]的方式来获取接口中的具体类型
```typescript
import { Form, FormProps } from 'antd';

const Comp: React.FC = () => {
  const onFinish: FormProps['onFinish'] = () => {
  }
  
  return <Form onFinish={onFinish}></Form>
}
```
#### 5. ReactHook中的常量断言 (as const)
```typescript
function useTest() {
  const [state, setState] = useState<any>()
  return [state, setState] as const
}
```
##### reacthook中，返回数组类型通常需要使用常量断言，保证数组中每一项的类型。如果是返回对象则不用。
#### 6. 策略模式优化if嵌套
##### 简单的if嵌套
```typescript
api().then(res=>{
	if(res.code === 0) {
  	console.log('0')
  } else if(res.code === 1) {
  	console.log('1')
  } else if(res.code === 100) {
  	console.log('1=>100')
  } else if(res.code === 1000) {
  	console.log('1000')
  }
  ...
})
```
```typescript
const strategy = {  // 一组策略
 	'0': function(code) {
    // 业务代码
  	console.log(code)
  },
  '1': function(code) {
  	console.log(code)
  },
  '100': function(code) {
  	console.log(code)
  },
  '1000': function(code) {
  	console.log(code)
  },
  '2000': function(code) { // 如果又增加了else情况，加一个对象就行了。很清晰
  	console.log(code)
  }
}

api().then(res=>{
	strategy[res.code](250)
})
```
##### 稍微复杂一点的
```typescript
api().then(res=>{
	if(res.code > 1 && res.code < 100) { // 条件1
  	console.log(1)
  } else if(res.code > 100 && res.code < 100) { // 条件2
  	console.log(2)
  } else if(res.data === '??' && res.code === 0) { // 条件3
  	console.log(3)
  }
})
```
```typescript
function exeStrategy<T extends (...args: any[]) => boolean, U extends () => any>(stroage: Map<T, U>, ...args: any[]) {
  for (const [condition, method] of stroage) {
    if (condition(...args)) {
      return method();
    }
  }
  return '';
}

const strategy = new Map([
	[
    (code, data) => code > 1 && code < 100, 
    () => {
      console.log(1)
    }	
  ],
  [
    (code, data) => code > 100 && code < 1000,
   	() => {
      console.log(2)
    }
  ],
  [
  	(code, data) => data === '??' && code === 0,
    () => {
    	console.log(3)
    }
  ]
])

exeStrategy(strategy, res.code, res.data)
```
#### 7. 枚举类型优化ifelse
有些时候，接口返回的某个值，比如code，是一个有意义的数字，我们可以用枚举来存放，方便以后的维护
```typescript
enum CodeEnum {
  Error = 0,
  Success = 1 
}
```
把枚举用在判断条件中后，看起来也更清晰了
```typescript
if(res.code === CodeEnum.Success) {
  // 一看就知道这里是success
}
```
#### 8. interface的继承
有些时候我们想扩展全局类型，比如扩展Window
```typescript
interface Window {
  mbQuery?: <T = any>(x: number, y: string, cb?: (msg: string, res: any) => void) => Promise<T>;
}
```
