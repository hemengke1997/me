---
title: "入门react-spring"
date: "2021-01-22 09:58"
draft: false
tags:
- react
---


## 写在前面
### [Interpolations](https://www.react-spring.io/docs/props/performance)
插值，是线代中的一个概念，从一系列的值以及某个数学公式，判断下一次的值。
举个例子
```jsx
function Demo() {
  const [state, toggle] = useState(false)
  const { x } = useSpring({ from: { x: 1 }, x: state ? 2 : 0.5 })
  return (
    <div onClick={() => toggle(!state)}>
      <animated.span
        className='box'
        style={{
          transform: x
            .interpolate({
              range: [0, 0.5, 1, 1.5, 2],
              output: [1, 0.5, 10, 10, 2]
            })
            .interpolate(x => { console.log(x); return `scale(${x})`; })
        }}>
        {x}
      </animated.span>
    </div>
  )
}
```
我一直因为range只能是[0-1]，原来是**随意的**
**
## useSpring
### hover卡片
#### 代码
`index.js` 
```jsx
import React, { useRef, useState } from 'react';
import { animated, useSpring } from 'react-spring';
import useKnobs from './useKnobs';
import './index.less';

const calc = (x, y, rect) => [
  -(y - rect.top - rect.height / 2) / 5,
  (x - rect.left - rect.width / 2) / 5,
  1.24,
];

const trans = (x, y, s) =>
  `perspective(600px) rotateX(${x}deg) rotateY(${y}deg) scale(${s})`;

export default function Card() {
  const ref = useRef(null);
  const [xys, set] = useState([0, 0, 1]);
  const [config, knobs] = useKnobs({ mass: 1, tension: 170, friction: 26 });
  const props = useSpring({ config, xys });

  return (
    <div className="ccard-main" ref={ref}>
      {knobs}
      <animated.div
        className="ccard"
        style={{
          transform: props.xys.interpolate(trans),
        }}
        onMouseMove={e => {
          const rect = ref.current.getBoundingClientRect();
          set(calc(e.clientX, e.clientY, rect));
        }}
        onMouseLeave={() => set([0, 0, 1])}
      ></animated.div>
    </div>
  );
}
```
`useKnobs.js` 
```jsx
import React, { useState } from 'react';

function Knob({ name, value, onChange, min = 1, max = 500 }) {
  return (
    <div>
      <label>
        {name}:{value}
        <input
          type="range"
          min={min}
          max={max}
          value={value}
          onChange={e => onChange(Number(e.target.value))}
        ></input>
      </label>
    </div>
  );
}

export default function useKnobs(initialValues, options) {
  const [values, setValues] = useState(initialValues);

  const Box = (
    <div
      style={{
        top: 20,
        left: 20,
        width: 150,
        zIndex: 100,
        position: 'absolute',
        padding: 20,
      }}
    >
      {Object.keys(values).map(name => (
        <Knob
          {...options}
          key={name}
          name={name}
          value={values[name]}
          onChange={newValue => setValues({ ...values, [name]: newValue })}
        ></Knob>
      ))}
    </div>
  );

  return [values, Box];
}
```
`index.less` 
```less
.ccard-main {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  position: relative;
}

.ccard {
  width: 20ch;
  height: 20ch;
  background-image: url('../../../assets/test.jpg');
  background-size: cover;
  background-repeat: no-repeat;
  border-radius: 5px;
  transition: box-shadow 0.5s;
  will-change: transform;
}
```
#### 效果
![mmm3.gif](https://cdn.nlark.com/yuque/0/2021/gif/1447731/1611200539676-27d3540c-4dd9-4b6c-a120-15d43de1cde0.gif#align=left&display=inline&height=372&originHeight=372&originWidth=528&size=1569643&status=done&style=shadow&width=528)
### 翻转卡片
#### 代码
##### index.js
```jsx
import React, { useState } from 'react';
import { animated as a, config, useSpring } from 'react-spring';
import './index.less';

export default function Card() {
  const [flipped, setFlipped] = useState(false);
  const { transform, opacity } = useSpring({
    transform: `perspective(600px) rotateX(${flipped ? 180 : 0}deg)`,
    opacity: flipped ? 0 : 1,
    config: key => {
      if (key === 'transform') {
        return config.wobbly;
      }
      return config.default;
    },
  });

  return (
    <div className="container" onClick={() => setFlipped(state => !state)}>
      <a.div className="front t" style={{ opacity, transform }}></a.div>
      <a.div
        className="back t"
        style={{
          transform: transform.interpolate(t => `${t} rotateX(180deg)`),
          opacity: opacity.interpolate(o => 1 - o),
        }}
      ></a.div>
    </div>
  );
}
```
##### index.less
```less
.t {
  width: 200px;
  height: 200px;
  background-size: cover;
  background-repeat: no-repeat;
  position: absolute;
  will-change: opacity,transform;
  cursor: pointer;
}

.container {
  width: 100%;
  padding: 24px 0;
  display: flex;
  justify-content: center;
  align-items: center;
  height: 300px;
}

.back {
  background-image: url('../../../assets/test.jpg');
}

.front {
  background-image: url('../../../assets/douyin.png');
}
```
#### 效果
![mmm4.gif](https://cdn.nlark.com/yuque/0/2021/gif/1447731/1611208377953-1517e0b0-a548-427f-9c12-fac598c7050d.gif#align=left&display=inline&height=372&originHeight=372&originWidth=528&size=1555783&status=done&style=none&width=528)
### drag开关
#### 代码
##### index.js
```jsx
import React from 'react';
import { animated, interpolate, useSpring } from 'react-spring';
import { useDrag } from 'react-use-gesture';
import './index.less';

function Slider() {
  const [{ x, bg, size }, set] = useSpring(() => ({
    x: 0,
    bg: 'linear-gradient(120deg, #96fbc4 0%, #f9f586 100%)',
    size: 1,
  }));
  const bind = useDrag(({ movement, down }) => {
    set({
      x: down ? movement[0] : 0,
      bg: `linear-gradient(120deg, ${
        movement[0] < 0 ? '#f093fb 0%, #f5576c' : '#96fbc4 0%, #f9f586'
      } 100%)`,
      size: down ? 1.1 : 1,
      immediate: key => down && key === 'x', // 立即执行动画，没有延迟效果（无config效果）
    });
  });

  const avSize = x.interpolate({
    map: Math.abs,
    range: [50, 300],
    output: ['scale(0.5)', 'scale(1)'],
    extrapolate: 'clamp', // 左值和右值： 都使用clamp效果（有边缘），比如在这里就是最小scale(0.5) 最大scale(1)， 如果不设置的话，会有弹簧效应
  });

  return (
    <animated.div className="item" {...bind()} style={{ background: bg }}>
      <animated.div
        className="av"
        style={{
          transform: avSize,
          justifySelf: x.interpolate(v => (v < 0 ? 'end' : 'start')),
        }}
      ></animated.div>
      <animated.div
        className="fg"
        style={{
          transform: interpolate(
            [x, size],
            (x, s) => `translate3d(${x}px,0,0) scale(${s})`,
          ),
        }}
      >
        {avSize.interpolate(v => v)}
      </animated.div>
    </animated.div>
  );
}

export default Slider;
```
##### index.less
```less
.item {
  position: relative;
  width: 300px;
  height: 100px;
  pointer-events: auto;
  transform-origin: 50% 50% 0px;
  margin: 100px auto;
  box-sizing: border-box;
  display: grid;
  align-items: center;
  text-align: center;
  border-radius: 5px;
  box-shadow: 0px 10px 10px -5px rgba(0, 0, 0, 0.2);
}

.fg {
  cursor: grab;
  background-color: #272727;
  color: rgba(255, 255, 255, 0.8);
  position: absolute;
  height: 100%;
  width: 100%;
  display: grid;
  align-items: center;
  text-align: center;
  border-radius: 5px;
  box-shadow: 0px 10px 30px -5px rgba(0, 0, 0, 0.2);
  font-size: 3em;
  user-select: none;
  font-weight: 600;
  transition: box-shadow 0.75s;
  justify-content: center;
  touch-action: none;
}

.fg:active {
  cursor: -webkit-grabbing;
  box-shadow: 0px 15px 30px -5px rgba(0, 0, 0, 0.4);
}

.fg>* {
  pointer-events: none;
}

.av {
  width: 60px;
  height: 60px;
  border-radius: 50%;
  background-color: white;
}
```
#### 效果
![mmm5.gif](https://cdn.nlark.com/yuque/0/2021/gif/1447731/1611214502400-e9709052-24e7-416e-b18d-cd3139050d61.gif#align=left&display=inline&height=372&originHeight=372&originWidth=970&size=996811&status=done&style=none&width=970)
### 异步效果
#### 代码
```jsx
import React from 'react';
import { animated, useSpring } from 'react-spring';
import './index.less';

export default function Demo4() {
  const style = useSpring({
    from: {
      left: '0%',
      top: '0%',
      width: '0%',
      height: '0%',
      background: 'lightgreen',
    },
    to: async next => {
      while (true) {
        await next({
          left: '0%',
          top: '0%',
          width: '100%',
          height: '100%',
          background: 'lightblue',
        });
        await next({ height: '50%', background: 'lightgreen' });
        await next({
          width: '50%',
          left: '50%',
          background: 'lightgoldenrodyellow',
        });
        await next({ top: '0%', height: '100%', background: 'lightpink' });
        await next({ top: '50%', height: '50%', background: 'lightsalmon' });
        await next({ width: '100%', left: '0%', background: 'lightcoral' });
        await next({ width: '50%', background: 'lightseagreen' });
        await next({ top: '0%', height: '100%', background: 'lightskyblue' });
        await next({ width: '100%', background: 'lightslategrey' });
      }
    },
  });

  return (
    <>
      <animated.div style={{ ...style }} className="box"></animated.div>
    </>
  );
}
```
#### 效果
![mmm6.gif](https://cdn.nlark.com/yuque/0/2021/gif/1447731/1611216009675-cd9d6844-5fda-4bf5-a136-efa4de289551.gif#align=left&display=inline&height=579&originHeight=579&originWidth=904&size=169886&status=done&style=none&width=904)
### 获取ref ： react-use-measure
#### 代码
```jsx
import React, { useState } from 'react';
import { animated, config, useSpring } from 'react-spring';
import useMeasure from 'react-use-measure';

export default function Demo() {
  const [ref, rect] = useMeasure();
  const [flag, setFlag] = useState(false);
  const { width } = useSpring({
    width: flag ? rect.width : 0,
    config: {
      ...config.default,
      clamp: true,
    },
  });

  return (
    <div
      ref={ref}
      onClick={() => setFlag(t => !t)}
      style={{ width: '100%', height: '100%' }}
    >
      <animated.div className="box" style={{ width }}>
        {width.interpolate(v => v.toFixed(2))}
      </animated.div>
    </div>
  );
}
```
#### 效果
![mmm7.gif](https://cdn.nlark.com/yuque/0/2021/gif/1447731/1611217369741-7d304691-f773-4d52-8184-0ced5adf626a.gif#align=left&display=inline&height=336&originHeight=336&originWidth=904&size=164563&status=done&style=none&width=904)
### 手风琴
#### 代码
```jsx
import React, { useEffect, useRef, useState } from 'react';
import { animated, useSpring } from 'react-spring';
import useMeasure from 'react-use-measure';
import * as Icons from './icon';
import './index.less';

function usePrevious(value) {
  const ref = useRef();
  useEffect(() => void (ref.current = value), [value]);
  return ref.current;
}

const Tree = React.memo(({ children, name, style, defaultOpen = false }) => {
  const [isOpen, setOpen] = useState(defaultOpen);
  const previous = usePrevious(isOpen);
  const [ref, { height: viewHeight }] = useMeasure();

  const { height, opacity, transform } = useSpring({
    from: { height: 0, opacity: 0, transform: 'translate3d(20px, 0, 0)' },
    // to: async next => {
    //   next({
    //     height: isOpen ? viewHeight : 0,
    //     opacity: isOpen ? 1 : 0,
    //     transform: `translate3d(${isOpen ? 0 : 20}px, 0, 0)`,
    //   });
		// },
		// to是可以通过渲染来驱动执行的
    to: {
      height: isOpen ? viewHeight : 0,
      opacity: isOpen ? 1 : 0,
      transform: `translate3d(${isOpen ? 0 : 20}px, 0, 0)`,
    },
  });

  const Icon =
    Icons[`${children ? (isOpen ? 'Minus' : 'Plus') : 'Close'}SquareO`];

  return (
    <div className="frame">
      <Icon
        className="icon"
        onClick={() => setOpen(t => !t)}
        style={{ opacity: children ? 1 : 0.3 }}
      ></Icon>
      <animated.span className="title" style={style}>
        {String(isOpen && previous === isOpen)}
      </animated.span>
      <animated.div
        className="content"
        style={{
          opacity,
          height: isOpen && previous === isOpen ? 'auto' : height,
        }}
      >
        <animated.div
          style={{ transform }}
          ref={ref}
          children={children}
        ></animated.div>
      </animated.div>
    </div>
  );
});

export default function Demo() {
  return (
    <>
      <Tree name="main" defaultOpen>
        <Tree name="hello" />
        <Tree name="subtree with children">
          <Tree name="hello" />
          <Tree name="sub-subtree with children">
            <Tree name="child 1" style={{ color: '#37ceff' }} />
            <Tree name="child 2" style={{ color: '#37ceff' }} />
            <Tree name="child 3" style={{ color: '#37ceff' }} />
            <Tree name="custom content">
              <div
                style={{
                  position: 'relative',
                  width: '100%',
                  height: 200,
                  padding: 10,
                }}
              >
                <div
                  style={{
                    width: '100%',
                    height: '100%',
                    background: 'black',
                    borderRadius: 5,
                  }}
                />
              </div>
            </Tree>
          </Tree>
          <Tree name="hello" />
        </Tree>
        <Tree name="world" />
        <Tree name={<span>🙀 something something</span>} />
      </Tree>
    </>
  );
}
```
```jsx
import React from 'react'

const MinusSquareO = props => (
  <svg {...props} viewBox="64 -65 897 897">
    <g>
      <path
        d="M888 760v0v0v-753v0h-752v0v753v0h752zM888 832h-752q-30 0 -51 -21t-21 -51v-753q0 -29 21 -50.5t51 -21.5h753q29 0 50.5 21.5t21.5 50.5v753q0 30 -21.5 51t-51.5 21v0zM732 347h-442q-14 0 -25 10.5t-11 25.5v0q0 15 11 25.5t25 10.5h442q14 0 25 -10.5t11 -25.5v0
  q0 -15 -11 -25.5t-25 -10.5z"
      />
    </g>
  </svg>
)

const PlusSquareO = props => (
  <svg {...props} viewBox="64 -65 897 897">
    <g>
      <path
        d="M888 760v0v0v-753v0h-752v0v753v0h752zM888 832h-752q-30 0 -51 -21t-21 -51v-753q0 -29 21 -50.5t51 -21.5h753q29 0 50.5 21.5t21.5 50.5v753q0 30 -21.5 51t-51.5 21v0zM732 420h-184v183q0 15 -10.5 25.5t-25.5 10.5v0q-14 0 -25 -10.5t-11 -25.5v-183h-184
  q-15 0 -25.5 -11t-10.5 -25v0q0 -15 10.5 -25.5t25.5 -10.5h184v-183q0 -15 11 -25.5t25 -10.5v0q15 0 25.5 10.5t10.5 25.5v183h184q15 0 25.5 10.5t10.5 25.5v0q0 14 -10.5 25t-25.5 11z"
      />
    </g>
  </svg>
)

const CloseSquareO = props => (
  <svg {...props} viewBox="64 -65 897 897">
    <g>
      <path
        d="M717.5 589.5q-10.5 10.5 -25.5 10.5t-26 -10l-154 -155l-154 155q-11 10 -26 10t-25.5 -10.5t-10.5 -25.5t11 -25l154 -155l-154 -155q-11 -10 -11 -25t10.5 -25.5t25.5 -10.5t26 10l154 155l154 -155q11 -10 26 -10t25.5 10.5t10.5 25t-11 25.5l-154 155l154 155
  q11 10 11 25t-10.5 25.5zM888 760v0v0v-753v0h-752v0v753v0h752zM888 832h-752q-30 0 -51 -21t-21 -51v-753q0 -29 21 -50.5t51 -21.5h753q29 0 50.5 21.5t21.5 50.5v753q0 30 -21.5 51t-51.5 21v0z"
      />
    </g>
  </svg>
)

export { PlusSquareO, MinusSquareO, CloseSquareO }
```
```jsx
#root {
  padding: 30px;
  background: #191b21;
  overflow: hidden;
}
.frame {
  position: relative;
  padding: 4px 0px 0px 0px;
  text-overflow: ellipsis;
  white-space: nowrap;
  overflow-x: hidden;
  vertical-align: middle;
  color: white;
  fill: white;
}

.title {
  vertical-align: middle;
}

.content {
  will-change: transform, opacity, height;
  margin-left: 6px;
  padding: 0px 0px 0px 14px;
  border-left: 1px dashed rgba(255, 255, 255, 0.4);
  overflow: hidden;
}

.icon {
  width: 1em;
  height: 1em;
  margin-right: 10;
  cursor: pointer;
  vertical-align: middle;
}
```
#### 效果
![mmm8.gif](https://cdn.nlark.com/yuque/0/2021/gif/1447731/1611277714036-cf01bc2c-e63b-458e-a8fb-e3ce6a78ed49.gif#align=left&display=inline&height=423&originHeight=423&originWidth=904&size=205313&status=done&style=none&width=904)
### drag球
#### code
```jsx
import { clamp } from 'lodash';
import React from 'react';
import { animated as a, useSpring } from 'react-spring';
import { useDrag } from 'react-use-gesture';
import './index.less';

export default function Demo() {
  const [{ xy }, set] = useSpring(() => ({ xy: [0, 0] }));
  const bindFn = useDrag(({ velocity, down, movement }) => {
    velocity = clamp(velocity, 1, 8);
    set({
      xy: down ? movement : [0, 0],
      config: { mass: velocity, tension: 500 * velocity, friction: 30 },
      immediate: down ? true : false
    });
  });

  return (
    <a.div
      className="circle"
      {...bindFn()}
      style={{
        transform: xy.interpolate((x, y) => `translate3d(${x}px,${y}px,0)`),
      }}
    ></a.div>
  );
}
```
#### 效果
![mmm9.gif](https://cdn.nlark.com/yuque/0/2021/gif/1447731/1611280696798-520e0aaa-c57e-40ec-93fc-8b279d9e2b90.gif#align=left&display=inline&height=617&originHeight=617&originWidth=1110&size=313470&status=done&style=none&width=1110)
