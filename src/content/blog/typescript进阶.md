---
title: "typescript进阶"
date: "2022-05-16 15:17"
draft: false
tags:
- typescript
---


## 一、类型
### unknown
`unknown`  指的是**不可预先定义的类型，**我们声明unknown，即表明：这个业务虽然是我开发的，但我并不晓得这个变量是啥类型，你们之后来维护的人，不要甩锅给我。
unknown可以让开发人员直观的认识到，某个变量的类型是未知的。
unknown 的一个使用场景是，避免使用 any 作为函数的参数类型而导致的静态类型检查 bug：
```jsx
function test(input: unknown): number {
  if (Array.isArray(input)) {
    return input.length;    // Pass: 这个代码块中，类型守卫已经将input识别为array类型
  }
  return input.length;      // Error: 这里的input还是unknown类型，静态检查报错。如果入参是any，则会放弃检查直接成功，带来报错风险
}
```
### void
在dota2中，这是一个英雄的名字，叫“虚空”，但是在TS中，void表示，我什么都不在意。
void最常见的使用场景是在返回值中，表示：**随便你返回什么值都可以，我无所谓。**如：
```jsx
type TestViod = () => void

const a:TestVoid = () => {
  return '111'  // 并不会报错
}
```
当我们随便写一个函数， 此时缺省返回类型就是void
```jsx
function a() {}
```

### never
一段代码，没法正常返回，那就是never类型。
如： 报错、死循环
```jsx
function test(): never { throw new Error('error message') }  // throw error 返回值是never
function test(): never { while(true){} }  // 这个死循环的也会无法正常退出
```
还有就是永远没有相交的类型：
```jsx
type human = 'boy' & 'girl' // 这两个单独的字符串类型并不可能相交，故human为never类型
```
## 二、运算符
### 非空断言运算符 !
这个 `!`  可以放在函数或者变量后面，表示，这个函数、变量是不为 null | undefined 的
我遇到过这样的报错：
![image.png](https://cdn.nlark.com/yuque/0/2021/png/1447731/1617000953551-c65a5db4-d491-4177-b85c-7ec7063ec050.png#height=59&id=oLMCW&originHeight=59&originWidth=238&originalType=binary&ratio=1&rotation=0&showTitle=false&size=3567&status=done&style=none&title=&width=238)
![image.png](https://cdn.nlark.com/yuque/0/2021/png/1447731/1617001083895-f89da3d9-f744-4f57-9a7c-4a9e7bed9adc.png#height=50&id=fNBeX&originHeight=50&originWidth=304&originalType=binary&ratio=1&rotation=0&showTitle=false&size=3938&status=done&style=none&title=&width=304)
这时候，如果我们使用  `!`  运算符，就表示，这个对象是真实存在滴，报错就消失了。
如：
```jsx
function test(callback?: () => void) {
  callback!();  // 参数是可选的，如果不加！运算符，ts会报错
  
}
```
编译后的 ES5 代码，居然没有做任何防空判断。（手动伏笔）
```jsx
function onClick(callback) {
  callback();   
}
```

`!`  **最多的使用场景，就是我们明确知道某个东西是不为空的，可以少写if判断。如React的Ref**
```jsx
function Demo() {
  const divRef = useRef<HTMLDivElement>();
  useEffect(() => {
    divRef.current!.scrollIntoView();  // 当组件Mount后才会触发useEffect，故current一定是有值的
  }, []);
  return <div ref={divRef}>Demo</div>
}
```

### 可选链运算符 ?.
**并不是 **`**?**`** ，而是 **`**?.**`** **

![](https://cdn.nlark.com/yuque/0/2021/png/1447731/1617001345212-757959a9-74be-4509-b471-b742ce777e68.png#height=321&id=XTI63&originHeight=321&originWidth=474&originalType=binary&ratio=1&rotation=0&showTitle=false&size=0&status=done&style=none&title=&width=474)

相比非空运算符 `!` ， `?.` 是更有效的运行时非空判断，因为会做代码转换。
```jsx
obj?.prop    obj?.[index]    func?.(args)
```
?.用来判断左侧的表达式是否是 null | undefined，如果是则会停止表达式运行，可以减少我们大量的&&运算。
比如我们写出a?.b时，编译器会自动生成如下代码
```jsx
a === null || a === void 0 ? void 0 : a.b;
```

### **空值合并运算符 ??**
**这个运算符，可以有效解决上周 媛媛同学所说的，判断后端返回的值为空的问题**
`??` 与 `||` 功能比较相似，区别在于 **??在左侧表达式结果为 null 或者 undefined 时，才会返回右侧表达式** 。
比如我们写了 `let b = a ?? 10` ，生成的代码如下
```jsx
const b = a !== null && a !== void 0 ? a : 10
```
用 `??` 判断，就不用考虑 `0` 了， 0 也会为 true

### 数字分隔符 _
对于很长的数字，如果进行分割，可能看起来更有格式，比如手机号
```typescript
const phone: number = 133_1234_1234
```
 这个符号只是并不影响数字本身，无色无味，优化于无形之中，是可以放心食用的


## 三、操作符
### keyof  获取type或interface的对象键
```typescript
interface a {
  m: string;
  x: number;
};

type t = keyof a; // t 就是 'm' | 'x'
```
keyof比较常用的一个场景就是，当我们要获取对象的值，而我们不确定key有哪些时，可以这样搞
```typescript
function getValue (p: Person, k: keyof Person) {
  return p[k];  // 如果k不如此定义，则无法以p[k]的代码格式通过编译
}
```
总结keyof的用法：
```typescript
类型 = keyof 类型
```
### 
### typeof  获取实例的类型
什么叫实例？ 在java这种后端语言中构造函数new出来的对象，就叫做实例（是老师教的）。在js中，一个普通对象也叫做实例
typeof让我们可以很方便的获取到对象的**类型**，比如：
```typescript
const me: Person = { name: 'lsp', age: 24 };
type P = typeof me;  // { name: string, age: number | undefined }
const you: typeof me = { name: 'sg', age: 18 }  // 可以通过编译
```
ok，我们现在获取到了一个类型，是不是可以用keyof，再来获取到对象的key呢？
```typescript
type PersonKey = keyof typeof me;   // 'name' | 'age'
```
总结typeof的用法：
```typescript
类型 = typeof 实例对象
```

### 遍历属性 in
这个方法，也是比较好用的，遍历一个对象的key：
```typescript
type Test<T> = {
  [key in keyof T]: number
}
```
总结in的用法
```typescript
[ 自定义变量名 in 枚举类型 ]: 类型
```

## 四、泛型
新后台中，我们可以看到非常多泛型的使用，比如：
```typescript
const [t, setT] = useState<string>() // <string>
const ref = useRef<HTMLDivElement>() // <HTMLDivElement>
const Component:React.FC<someType> = () => {} // <someType>
```
这些都是我们使用别人定义好的泛型。
为什么会有泛型？
所谓，一生二，二生三，三生万物。如果我们一开始就把某个东西定死了，那么它就没有扩展性了。泛型，即是为扩展性而生的。

### 基本使用

#### 如何定义泛型？
比较常见的有： 普通类型定义、函数定义。 不常见的有类定义。
```typescript
// 普通类型定义
type Dog<T> = { name: string, type: T }
// 普通类型使用
const dog: Dog<number> = { name: 'ww', type: 20 }

// 函数定义
function swipe<T, U>(value: [T, U]): [U, T] {
  return [value[1], value[0]];
}
// 函数使用
swipe<Cat<number>, Dog<number>>([cat, dog])
```

#### 泛型推导
我们可以简化对泛型类型定义的书写，因为TS会自动**根据变量定义时的类型推导出变量类型**。如：
```typescript
const [test, setTest] = useState<string>() // test 默认为string
// 如果我们强行设置为其他类型，会报错
setTest(1) 
```
![image.png](https://cdn.nlark.com/yuque/0/2021/png/1447731/1617009197929-2eb1c31d-0b26-48a0-b7fb-8e6d023f83e0.png#height=49&id=RVGMi&originHeight=49&originWidth=537&originalType=binary&ratio=1&rotation=0&showTitle=false&size=5850&status=done&style=none&title=&width=537)
虽然但是，不建议这样做，对于维护代码的人来说，看到这种没有定义的，还得自己去想一下类型，有点脑壳痛

#### 泛型约束
大部分时候，我们用泛型，就是为了不限制类型，但是  有时候，有时候，我会限制泛型的类型
一个比较Σ(☉▽☉"a蠢的例子， 这是最简单的使用方式
```typescript
function test<T extends number>(value: T): number {
  return value++
}
```
加个难度， 遍历对象
```typescript
function test<T, U extends keyof T>() {}
```

#### 泛型条件
就是个三元运算符，业务中比较少用到
```typescript
T extends U ? X : Y
```
如果是 U 子类型，则将 T 定义为 X 类型，否则定义为 Y 类型。

## 泛型工具
### Partial<T>
此工具的作用就是将**泛型中全部属性变为可选的**。
```typescript
type Partial<T> = {
 [key in keyof T]?: T[P]
}
```
使用场景：
在dva中：
![image.png](https://cdn.nlark.com/yuque/0/2021/png/1447731/1617010276400-8c93326b-bd8e-407c-bed4-874cd9609c5c.png#height=257&id=y7iW8&originHeight=257&originWidth=536&originalType=binary&ratio=1&rotation=0&showTitle=false&size=23746&status=done&style=none&title=&width=536)

### Pick<T, K>
此工具的作用是**将 T 类型中的 K 键列表提取出来，生成新的子键值对类型。**
```typescript
type Pick<T, K extends keyof T> = {
  [P in K]: T[P]
}
```

比如，我想把一个类型中的某几个key，取出来（就不用我手动去复制粘贴了）。
```typescript
type Person = {
  name: string,
  age: number,
  eat: () => number,
  work: () => void
}

type Test = Pick<Person, 'name' | 'age'>

const a: Test = { name: 'xxx', age: 14 }
```

### Record<K, T>
此工具的作用是**将 K 中所有属性值转化为 T 类型，常用它来申明一个普通 object 对象**。
```typescript
type Record<K extends keyof any,T> = {
  [key in K]: T
}
```
比如，我想声明一个value是任意类型的对象
```typescript
type anyObject = Record<string, any>
```

### Exclude<T, U>
此工具是在 T 类型中，**去除 T 类型和 U 类型的交集，返回剩余的部分**。

```typescript
type Exclude<T, U> = T extends U ? never : T
```

这里的 extends 返回的 T 是原来的 T 中和 U 无交集的属性，而任何属性联合 never 都是自身，具体可在上文查阅。
比如：

```typescript
type T1 = Exclude<"a" | "b" | "c", "a" | "b">;   // "c"
type T2 = Exclude<string | number | (() => void), Function>; // string | number
```

### Omit<T, K>
此工具可认为是**适用于键值对对象的 Exclude，它会去除类型 T 中包含 K 的键值对**
```typescript
type Omit = Pick<T, Exclude<keyof T, K>>
```
在定义中，第一步先从 T 的 key 中去掉与 K 重叠的 key，接着使用 Pick 把 T 类型和剩余的 key 组合起来即可
举个例子
```typescript
type Person = {
  name: string,
  age: number,
  eat: () => number,
  work: () => void
}

type Test = Omit<Person, 'name'|'age'>

const a: Test = { eat: ()=>{}, work: ()=>{} }
```

### ReturnType<T>
此工具就是**获取 T 类型(函数)对应的返回值类型**
```typescript
type ReturnType<T extends (...args: any) => any>
  = T extends (...args: any) => infer R ? R : any;
```
想获取一个函数的返回值是啥类型，就用这个工具函数
```typescript
function test(x: string | number): string | number { /*..*/ }
type TestType = ReturnType<test>;  // string | number
```

### Required<T>
之前说了个把类型T中的所有属性变为可选，这个正好相反
此工具可以**将类型 T 中所有的属性变为必选项**
```typescript
type Required<T> = {
  [P in keyof T]-?: T[P]
}
```
这里有个语法 `-?` ，可以理解为就是 TS 中把?可选属性减去

## tsconfig.json
include 指定一个相对或者绝对文件的列表进行编译，可以使用路径模式匹配
```json
{
  "compilerOptions": {},
  "include": ["./src/index.ts"] // 此时只会编译这个文件，其他的不会被编译
}
```
exclude 排除一个相对或者绝对文件的列表进行编译，可以使用路径模式匹配。
```json
// 假设 src 为工作目录
{
  "compilerOptions": {},
  "exclude": ["./src/index.ts"] // 排除 src 下的 index.ts 文件不进行编译
}
```
### 路径配置模式
```json
* 匹配 0 或者 多个字符，不包含目录分隔符 /。

? 匹配任意一个字符，不包含目录分隔符 /。

**/ 递归匹配任意子目录。


{
  "exclude": ["./src/**/*"], // src目录下的任意目录下的任意文件
  "exclude": ["./src/**/*.log"], // src目录下任意目录下的以 .log 结尾的任意文件
  "exclude": ["./src/**/?.ts"] // src目录下任意目录下的以单个字母命名的 ts文件。
}
```
## 六、项目实战
### Q: 偏好使用 interface 还是 type 来定义类型？
A: 从用法上来说两者本质上没有区别，使用 React 项目做业务开发的话，主要就是用来定义 Props 和state、model类型

但是从扩展的角度来说，type 比 interface 更方便拓展一些，假如有以下两个定义：
```typescript
type Name = { name: string };
interface IName { name: string };
```
想要做类型的扩展的话，type 只需要一个&，而 interface 要多写不少代码
```typescript
type Person = Name & { age: number };
interface IPerson extends IName { age: number };
```
从命名上来说，Typescript是干啥的嘛，类型限制，类型 = type，那我们平时写的限制，用type，无可厚非吧
interface=接口，它应该是暴露给外部的一个公共通道。java中就有很多interface，都是比较抽象的概念。

### Q: 是否允许 any 类型的出现
A: 使用any，等于没有TS限制

### Q: 类型定义文件(.d.ts)是干啥的？该怎么写，写在哪个文件夹位置？
A: d.ts是声明文件，里面放的都是type啊、interface啊之类的类型定义。（这个我没深入研究，ts官方文档有讲这个）
在业务开发中，如果有比较公用的类型，可以写在d.ts文件中，像我们平时用的第三方库，它们的声明文件，通常都是写在一个d.ts文件中，一次性暴露出去
至于写在哪个位置，就跟我们写model或者components一样，它属于哪部分，就写在哪里
