---
title: "React中如何开发css"
date: "2022-05-13 15:24:35"
draft: false
tags:
- react
---

# [bem方案](http://getbem.com/introduction/)
门槛高，适合ui库的样式命名方案，不适合在业务中开发
![image.png](https://cdn.nlark.com/yuque/0/2022/png/1447731/1652425145653-f0f989ca-bbe2-41f4-87f0-5970db120960.png#clientId=ud32e66e6-28ef-4&from=paste&height=54&id=u7a626985&originHeight=54&originWidth=350&originalType=binary&ratio=1&rotation=0&showTitle=false&size=6062&status=done&style=none&taskId=u3e632018-39a2-4029-9595-9bd3ca9999a&title=&width=350)
`a-b__c`
# [css modules](https://github.com/css-modules/css-modules)
css modules是目前业务开发中使用最多的，它的好处有是 **开发者不用去关心css污染**
其余的跟开发css是一致的
```css
.a {
  color: red;
}
```
```jsx
import styles from './style.css';

styles['a'] || styles.a
```
# [css in js](https://github.com/MicheleBertoli/css-in-js)
前几年比较火的css方案，它好处比较多，缺点也多。
好处：

- js变量可以应用到css中
- css in js依托于js的能力，可以实现css变量很难实现的东西

缺点：

- 需要开发者去适应js写css的习惯，习惯其实是很难改变的
- 耦合。js跟css耦合在一起了。与以前的”关注点分离“理念相悖
```jsx
const Button = styled.a`
  /* This renders the buttons above... Edit me! */
  display: inline-block;
  border: 2px solid white;
  /* The GitHub button is a primary button
   * edit this to target it specifically! */
  ${props => props.primary && css`
    background: white;
    color: palevioletred;
  `}
`
render(
  <div>
    <Button
      href="https://github.com/styled-components/styled-components"
      target="_blank"
      rel="noopener"
      primary
    >
      GitHub
    </Button>
    <Button as={Link} href="/docs" prefetch>
      Documentation
    </Button>
  </div>
)
```
## [一个悲伤的故事](https://github.com/ant-design/ant-design/issues/33862)
antd5会采用 css in js 的方案，我本来以为他们会用css变量的方式来重构
antd chenshuai写的一篇文章讲[为何采用cssinjs](https://www.yuque.com/chenshuai/web/cgfimg)
可以开始学css in js方案了
