---
title: "vitest 原理"
date: "2023-11-22 19:27:16"
draft: false
tags:
- vitest
---

> 老版本

# 核心功能
## test cli 命令行入口
![image.png](https://cdn.nlark.com/yuque/0/2023/png/1447731/1697614727744-574493ab-5e1d-44e3-baec-7e11de6c8541.png#averageHue=%23282d35&clientId=u1e5f2fcb-88df-4&from=paste&height=696&id=TPnAT&originHeight=1392&originWidth=1182&originalType=binary&ratio=2&rotation=0&showTitle=false&size=172903&status=done&style=none&taskId=uafe1766e-82d5-40f6-b38c-1c2a6e75ca4&title=&width=591)
## 读取所有测试文件
## 执行测试文件（只需 import(filepath)）即可

   - 在执行测试文件的过程中，由于开发者使用了vitest暴露的测试套件，如 test, describe 等，vitest就可以通过这些套件，收集到测试用例，然后执行这些用例，最后获取到测试的结果，打印到控制台中

![image.png](https://cdn.nlark.com/yuque/0/2023/png/1447731/1697614966688-cc9f374a-e389-49c6-acbb-95316f658eeb.png#averageHue=%23282c35&clientId=u1e5f2fcb-88df-4&from=paste&height=719&id=ZzJKU&originHeight=1438&originWidth=1494&originalType=binary&ratio=2&rotation=0&showTitle=false&size=221433&status=done&style=none&taskId=u53471c21-6199-4c6d-82e6-aee2967f88a&title=&width=747)
![image.png](https://cdn.nlark.com/yuque/0/2023/png/1447731/1697615104310-787183a2-2d52-4dfe-a260-d1ce7277b97e.png#averageHue=%23282d36&clientId=u1e5f2fcb-88df-4&from=paste&height=642&id=aiZqz&originHeight=1284&originWidth=1470&originalType=binary&ratio=2&rotation=0&showTitle=false&size=266486&status=done&style=none&taskId=u69dff4c2-b041-4167-93af-5009113588f&title=&width=735)
## 生命周期hook
在源码中，可以看到各种hook，这些都是测试的生命周期hook，为了开发者更好的扩展测试逻辑
![image.png](https://cdn.nlark.com/yuque/0/2023/png/1447731/1697615242755-369e5258-29cd-4983-b4dc-a399e5c84965.png#averageHue=%23292f38&clientId=u1e5f2fcb-88df-4&from=paste&height=466&id=WIDNq&originHeight=932&originWidth=1092&originalType=binary&ratio=2&rotation=0&showTitle=false&size=267493&status=done&style=none&taskId=ue79d61a5-d51f-4a48-9fda-e07190060c8&title=&width=546)
## 快照功能
vitest的核心底层库是 `chai`，其并未实现 snapshot 快照功能，需要vitest自行实现
vitest使用的 jest-snapshot 实现了快照插件，注入到了 chai 中
![image.png](https://cdn.nlark.com/yuque/0/2023/png/1447731/1697615439356-838e3bb4-7fdf-4dc0-9f18-ce8707c7129f.png#averageHue=%23292e38&clientId=u1e5f2fcb-88df-4&from=paste&height=178&id=un0Vs&originHeight=356&originWidth=968&originalType=binary&ratio=2&rotation=0&showTitle=false&size=54216&status=done&style=none&taskId=u68937b4f-85a2-4b4b-ab89-19bd7814dd4&title=&width=484)
## 断言
是用的chai
![image.png](https://cdn.nlark.com/yuque/0/2023/png/1447731/1697615584004-65b9ba90-4373-4b21-adfb-92b5f6980afa.png#averageHue=%23292d36&clientId=u1e5f2fcb-88df-4&from=paste&height=413&id=Kxvzn&originHeight=826&originWidth=1190&originalType=binary&ratio=2&rotation=0&showTitle=false&size=128050&status=done&style=none&taskId=u81769701-28ca-4091-8d66-0fd196590a7&title=&width=595)
## spy/mock
vitest 使用 sinon 提供的api实现
![image.png](https://cdn.nlark.com/yuque/0/2023/png/1447731/1697618318147-6dac1588-50ce-4074-8c69-626982485e20.png#averageHue=%23292d36&clientId=u9bf5ff16-24c4-4&from=paste&height=76&id=qkzMx&originHeight=152&originWidth=722&originalType=binary&ratio=2&rotation=0&showTitle=false&size=16711&status=done&style=none&taskId=ufc3b0d15-9a55-4e69-afaa-1072d944c67&title=&width=361)
## vi.xx
vi对象不过是个vitest的内置工具类实例，它集成了许多实用的三方库，对于开发者而言很方便
![image.png](https://cdn.nlark.com/yuque/0/2023/png/1447731/1697679439845-0680e989-965d-45a8-80a0-0db6290a2cd3.png#averageHue=%232b3038&clientId=u2d5be397-f2dc-4&from=paste&height=143&id=WOvlb&originHeight=286&originWidth=754&originalType=binary&ratio=2&rotation=0&showTitle=false&size=28711&status=done&style=none&taskId=u8dc00741-798b-4d77-9898-e278678fecb&title=&width=377)
vi里面主要是mock、spy、stub等工具方法
![image.png](https://cdn.nlark.com/yuque/0/2023/png/1447731/1697679523989-9dbc4cf2-3b62-4316-ad5c-37859ca93a45.png#averageHue=%23222224&clientId=u2d5be397-f2dc-4&from=paste&height=870&id=Nmy75&originHeight=1740&originWidth=524&originalType=binary&ratio=2&rotation=0&showTitle=false&size=139293&status=done&style=none&taskId=ua2f9692a-14ad-4596-9526-7bd1637c2f3&title=&width=262)
### Spy
其中的 spyOn/fn 都是基于 tinySpy
说白了，spy做了函数增强，给函数增加了 调用次数、模拟返回 等等功能
![image.png](https://cdn.nlark.com/yuque/0/2023/png/1447731/1697679721413-2ea6349f-a46b-4970-9bf6-c1c6e74a45ad.png#averageHue=%23282c35&clientId=u2d5be397-f2dc-4&from=paste&height=365&id=LDhu0&originHeight=730&originWidth=1100&originalType=binary&ratio=2&rotation=0&showTitle=false&size=133815&status=done&style=none&taskId=u40fcaa65-7b42-420d-a674-82cb9d6eee9&title=&width=550)
![image.png](https://cdn.nlark.com/yuque/0/2023/png/1447731/1697679681224-c6ede104-23c4-400a-9bf4-f05d913f0884.png#averageHue=%23292e37&clientId=u2d5be397-f2dc-4&from=paste&height=120&id=s77Qg&originHeight=240&originWidth=1890&originalType=binary&ratio=2&rotation=0&showTitle=false&size=73767&status=done&style=none&taskId=ue3462ed8-3eb7-4270-83a5-5905b31c3c4&title=&width=945)

# mock
我之前一直没搞明白，mock是怎么做到的
我今天主要研究了以下两种mock方式

- 函数
- 模块
### 函数 mock
说白了，函数mock就是写了个假函数，其最重要的目的，就是所有使用这个函数的功能，都可以在不写e2e的情况下，模拟流程或功能是否走通
函数mock分为两个

1. vi.spyOn。监听某个函数，比如监听函数的调用次数、接受参数等
2. vi.fn。基于spyOn 做了函数增强，可以修改函数的返回值啊之类的
#### example
vi.spyOn
```typescript
function getLatest(index = messages.items.length - 1) {
  return messages.items[index]
}

const messages = {
  items: [
    { message: 'Simple test message', from: 'Testman' },
    // ...
  ],
  getLatest, // 也可以是一个 `getter 或 setter 如果支持`
}

it('should get the latest message with a spy', () => {
  // spyOn接受两个参数
  // 监听了getLatest方法
  const spy = vi.spyOn(messages, 'getLatest')
  expect(spy.getMockName()).toEqual('getLatest')

  expect(messages.getLatest()).toEqual(
    messages.items[messages.items.length - 1]
  )

  // 监听到了函数的调用次数
  // tip：其实spyOn对传入的函数做了增强处理，
  // spy有的方法，在原函数上也有
  // 所以 
  expect(messages.getLatest).toHaveBeenCalledTimes(1)
  expect(spy).toHaveBeenCalledTimes(1)

	// 模拟一次函数实现
  spy.mockImplementationOnce(() => 'access-restricted')
  expect(messages.getLatest()).toEqual('access-restricted')

  expect(spy).toHaveBeenCalledTimes(2)
})

```

这个例子是vitest的官方例子，但是其实可以spyOn非常有用，我们可以监听一些核心功能函数
假设modA里面的`getSomeString`函数是一个测试的功能点，就可以这样来监听：
```typescript
export const modA = {
  getSomeString: () => 'some string'
}

```
```typescript
import { expect, it, vi } from 'vitest'
import { modA } from './modA'

it('should work', () => {
  // 这是在用例中监听，也可以在 beforeEach中监听
  // 或全局监听
  const spy = vi.spyOn(modA, 'getSomeString')
  
  expect(modA.getSomeString()).toBe('some string')

  expect(spy).toBeCalledTimes(1)
})
```

vi.fn
跟spyOn相比，fn可以更加灵活，不需要传入函数，自行实现一个假函数
```typescript
function getLatest(index = messages.items.length - 1) {
  return messages.items[index]
}

const messages = {
  items: [
    { message: 'Simple test message', from: 'Testman' },
    // ...
  ],
  getLatest, // 也可以是一个 `getter 或 setter 如果支持`
}

it('should get with a mock', () => {
  // 传入一个模拟的函数实现
  const mock = vi.fn().mockImplementation(getLatest)

  // 默认情况下，mock的名称是spy
  expect(mock.getMockName()).toEqual('spy')

  expect(mock()).toEqual(messages.items[messages.items.length - 1])
  expect(mock).toHaveBeenCalledTimes(1)

  mock.mockImplementationOnce(() => 'access-restricted')
  expect(mock()).toEqual('access-restricted')

  expect(mock).toHaveBeenCalledTimes(2)

  expect(mock()).toEqual(messages.items[messages.items.length - 1])
  expect(mock).toHaveBeenCalledTimes(3)
})
```

```typescript

// 可以在初始化时传入一个函数
// 其实就是把传入的函数做了增强
const getApples = vi.fn(() => 0)

it('should mock', () => {
  getApples()

  expect(getApples).toHaveBeenCalled()
  expect(getApples).toHaveReturnedWith(0)

  getApples.mockReturnValueOnce(5)

  const res = getApples()
  expect(res).toBe(5)
  expect(getApples).toHaveNthReturnedWith(2, 5)
})
```

vi.fn 同 spyOn，也可以用来全局或局部增强一些核心测试功能函数
### 模块 mock
我之前一直不懂，为什么可以模拟一个第三方库
今天看了vitest的源码、也去了解了jest的mock模块，才算是明白了其核心原理

vitest通过拦截对第三方库的调用（import 'some-module'），mock import的所有函数（比如 import axios from 'axios'，那么axios的所有方法都被mock了）
原来就是这样的，具体是怎么做的？

简单来说，就是利用了vite的插件能力，在transform阶段，魔改三方库代码
```typescript
export function MocksPlugin(): Plugin {
  return {
    name: 'vitest:mocks',
    enforce: 'post',
    transform(code, id) {
      return hoistMocks(code, id, this.parse)
    },
  }
}
```
# [jest 是如何 mock 掉模块的](https://segmentfault.com/a/1190000011565450)
![image.png](https://cdn.nlark.com/yuque/0/2023/png/1447731/1700645668251-3712f0c0-9527-4ac3-a3be-9ee4efb82306.png#averageHue=%23e1e2e2&clientId=u75a3435a-505e-4&from=paste&height=250&id=u2c5fcacc&originHeight=500&originWidth=1404&originalType=binary&ratio=2&rotation=0&showTitle=false&size=73235&status=done&style=none&taskId=u7ab39d54-554c-4062-8e0d-7b6b264613d&title=&width=702)
![image.png](https://cdn.nlark.com/yuque/0/2023/png/1447731/1700645580713-37c62661-fa9c-4126-bf77-219c06cc3ae4.png#averageHue=%232e3034&clientId=ub2dae3e2-2cfc-4&from=paste&height=397&id=uf3e309e0&originHeight=794&originWidth=1426&originalType=binary&ratio=2&rotation=0&showTitle=false&size=357452&status=done&style=none&taskId=udff0da05-ccb4-42d4-8987-97421bc68b5&title=&width=713)

![image.png](https://cdn.nlark.com/yuque/0/2023/png/1447731/1700645917618-b6d5f9e6-ce47-4391-ad9a-d534ef9d47b3.png#averageHue=%238d9093&clientId=u75a3435a-505e-4&from=paste&height=418&id=uef822624&originHeight=836&originWidth=1552&originalType=binary&ratio=2&rotation=0&showTitle=false&size=136636&status=done&style=none&taskId=u1cccdc40-105c-45ae-a709-b60c985f71b&title=&width=776)
![image.png](https://cdn.nlark.com/yuque/0/2023/png/1447731/1700645900280-be3d872f-8d81-49cf-8073-dc14fb51bc6c.png#averageHue=%23292e36&clientId=u75a3435a-505e-4&from=paste&height=287&id=u9e71e364&originHeight=574&originWidth=1486&originalType=binary&ratio=2&rotation=0&showTitle=false&size=144876&status=done&style=none&taskId=u6c90d987-576e-4630-96c5-fa0534ab1c7&title=&width=743)
jest跟vitest异曲同工！！

```typescript
import vm from 'node:vm'

// 要执行的 JavaScript 代码字符串
const codeToRun = `
  (function(arg, a) {
    console.log(arg, a)
  })
`

// 在当前上下文中执行代码
const f = vm.runInThisContext(codeToRun)

f('haha', 'aaaa') // haha aaaa
```

是怎么把axios的所有函数都mock的呢？

![image.png](https://cdn.nlark.com/yuque/0/2023/png/1447731/1700647012020-652ac835-1252-4aa0-bc49-b2a6fa889e1b.png#averageHue=%23292e36&clientId=u75a3435a-505e-4&from=paste&height=667&id=u95c5503f&originHeight=1334&originWidth=1966&originalType=binary&ratio=2&rotation=0&showTitle=false&size=303739&status=done&style=none&taskId=u2413a074-968d-49e4-9ac0-15096ef7725&title=&width=983)
![image.png](https://cdn.nlark.com/yuque/0/2023/png/1447731/1700646823808-f22b623e-bd4e-4de0-a41d-7476faf7c708.png#averageHue=%23292d36&clientId=u75a3435a-505e-4&from=paste&height=561&id=u91e045a6&originHeight=1122&originWidth=1892&originalType=binary&ratio=2&rotation=0&showTitle=false&size=257709&status=done&style=none&taskId=u2d5d56ac-94f8-4ae9-bee1-4e9e31d5226&title=&width=946)

vitest甚至很贴心的导出了mockObject的方法
[https://cn.vitest.dev/api/vi.html#vi-importmock](https://cn.vitest.dev/api/vi.html#vi-importmock)
![image.png](https://cdn.nlark.com/yuque/0/2023/png/1447731/1700646738852-1b7d0038-1275-41ab-95f0-1f4b59ab490b.png#averageHue=%23292e37&clientId=u75a3435a-505e-4&from=paste&height=393&id=k55W3&originHeight=786&originWidth=1462&originalType=binary&ratio=2&rotation=0&showTitle=false&size=187091&status=done&style=none&taskId=u7b03d434-1aaa-487b-aa73-dc768117d5a&title=&width=731)
![image.png](https://cdn.nlark.com/yuque/0/2023/png/1447731/1700647046581-5f780e6d-4e0b-4d0b-adc6-7a867b000abd.png#averageHue=%231c1c20&clientId=u75a3435a-505e-4&from=paste&height=160&id=u0023e204&originHeight=320&originWidth=1292&originalType=binary&ratio=2&rotation=0&showTitle=false&size=65027&status=done&style=none&taskId=u6ecf3e2d-f8df-4050-a212-e99e4ae4f63&title=&width=646)

vitest是怎么编译测试文件的代码呢？怎么把测试文件中中请求的第三方包（比如axios），变成mock之后的axios呢？
简单来说，就是vitest先把测试文件中的导入的依赖都编译了，把需要mock的也mock了，然后在下面圈出来的`request`方法中，请求到这些编译后的依赖。

比如
```typescript
import axios from 'axios'
```
会变成
```typescript
const { default: axios } = await __vite_ssr_dynamic_import__('axios')
```
> 其实就是把import给变成了vitest自定义的导入方式

然后在`__vite_ssr_dynamic_import__`中，调用的是 `request`方法，然后把模块返回出去（经过了一系列的处理了，比如mock）

![image.png](https://cdn.nlark.com/yuque/0/2023/png/1447731/1700651639539-85d37e85-2160-430f-bd70-0886bd8db69c.png#averageHue=%23373638&clientId=u75a3435a-505e-4&from=paste&height=104&id=u54eb8cc6&originHeight=208&originWidth=776&originalType=binary&ratio=2&rotation=0&showTitle=false&size=75900&status=done&style=none&taskId=u7018c55e-a7df-4039-8f5a-439f7098a26&title=&width=388)
![image.png](https://cdn.nlark.com/yuque/0/2023/png/1447731/1700651618503-b447f20e-986e-44c9-8754-2cb0bb888ff4.png#averageHue=%23292f38&clientId=u75a3435a-505e-4&from=paste&height=567&id=u3305808d&originHeight=1134&originWidth=1340&originalType=binary&ratio=2&rotation=0&showTitle=false&size=211101&status=done&style=none&taskId=u6580c398-272b-4d44-9827-1593148e6a5&title=&width=670)

本质上跟jest也是一样的
![image.png](https://cdn.nlark.com/yuque/0/2023/png/1447731/1700652330701-45d77f19-4a43-4f77-b95a-610326b13630.png#averageHue=%23e5e7ea&clientId=uf28de361-3c43-4&from=paste&height=630&id=ub7749d88&originHeight=1260&originWidth=1424&originalType=binary&ratio=2&rotation=0&showTitle=false&size=213308&status=done&style=none&taskId=u38a0f309-2235-429b-9821-ca9b1c97d61&title=&width=712)
把import之类的方法都hack了一份，然后在 `runInThisContext` 中传下去了![image.png](https://cdn.nlark.com/yuque/0/2023/png/1447731/1700652388194-aecbb406-b04b-4ad6-8def-2b9713ea7013.png#averageHue=%23292e37&clientId=uf28de361-3c43-4&from=paste&height=277&id=u155effb2&originHeight=554&originWidth=1490&originalType=binary&ratio=2&rotation=0&showTitle=false&size=144933&status=done&style=none&taskId=u98b51d05-ce76-43ff-a9a2-dc129d4e9c6&title=&width=745)
![image.png](https://cdn.nlark.com/yuque/0/2023/png/1447731/1700652413229-13f4ee98-f4ef-499c-aef9-30b915f8723f.png#averageHue=%23292f38&clientId=uf28de361-3c43-4&from=paste&height=494&id=u9e9eef89&originHeight=988&originWidth=1364&originalType=binary&ratio=2&rotation=0&showTitle=false&size=189675&status=done&style=none&taskId=u307ddb81-fe2c-4096-9e9f-ed3ccd2e5f1&title=&width=682)
