---
title: "display:none到display:block的过渡"
date: "2021-06-08 15:45"
draft: false
tags:
- css
---

用animation模拟过渡
```css
.test {
    display: none;


    &.active {
      display: block;
      animation: o2 .3s;
    }
  }

  @keyframes o2 {
    from {
      opacity: 0;
    }

    to {
      opacity: 1;
    }
  }
```
