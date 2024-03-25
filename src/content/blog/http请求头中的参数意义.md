---
title: "http请求头中的参数意义"
date: "2020-12-28 09:23"
draft: false
tags:
- http
---

## cache
cache属性指定如何处理缓存。可能的取值如下：

- `default`：默认值，先在缓存里面寻找匹配的请求。
- `no-store`：直接请求远程服务器，并且不更新缓存。
- `reload`：直接请求远程服务器，并且更新缓存。
- `no-cache`：将服务器资源跟本地缓存进行比较，有新的版本才使用服务器资源，否则使用缓存。
- `force-cache`：缓存优先，只有不存在缓存的情况下，才请求远程服务器。
- `only-if-cached`：只检查缓存，如果缓存里面不存在，将返回504错误。


## mode
mode属性指定请求的模式。可能的取值如下：

- `cors`：默认值，允许跨域请求。
- `same-origin`：只允许同源请求。
- `no-cors`：请求方法只限于 GET、POST 和 HEAD，并且只能使用有限的几个简单标头，不能添加跨域的复杂标头，相当于提交表单所能发出的请求。

## credentials
`credentials`属性指定是否发送 Cookie。可能的取值如下：

- `same-origin`：默认值，同源请求时发送 Cookie，跨域请求时不发送。
- `include`：不管同源请求，还是跨域请求，一律发送 Cookie。
- `omit`：一律不发送。

跨域请求发送 Cookie，需要将`credentials`属性设为`true`。
```javascript
fetch('http://another.com', {
  credentials: "include"
});
```

## keepalive
keepalive属性用于页面卸载时，告诉浏览器在后台保持连接，继续发送数据。
一个典型的场景就是，用户离开网页时，脚本向服务器提交一些用户行为的统计信息。这时，如果不用keepalive属性，数据可能无法发送，因为浏览器已经把页面卸载了。
```javascript
window.onunload = function() {
  fetch('/analytics', {
    method: 'POST',
    body: "statistics",
    keepalive: true
  });
};
```
## redirect
redirect属性指定 HTTP 跳转的处理方法。可能的取值如下：

- `follow`：默认值，`fetch()`跟随 HTTP 跳转。
- `error`：如果发生跳转，`fetch()`就报错。
- `manual`：`fetch()`不跟随 HTTP 跳转，但是`response.url`属性会指向新的 URL，`response.redirected`属性会变为`true`，由开发者自己决定后续如何处理跳转。
## integrity
integrity属性指定一个哈希值，用于检查 HTTP 回应传回的数据是否等于这个预先设定的哈希值。
比如，下载文件时，检查文件的 SHA-256 哈希值是否相符，确保没有被篡改。
```javascript
fetch('http://site.com/file', {
  integrity: 'sha256-abcdef'
});
```
## referrer
referrer属性用于设定fetch()请求的referer标头。
这个属性可以为任意字符串，也可以设为空字符串（即不发送referer标头）。
```javascript
fetch('/page', {
  referrer: ''
});
```
## referrerPolicy
referrerPolicy属性用于设定Referer标头的规则。可能的取值如下：

- `no-referrer-when-downgrade`：默认值，总是发送`Referer`标头，除非从 HTTPS 页面请求 HTTP 资源时不发送。
- `no-referrer`：不发送`Referer`标头。
- `origin`：`Referer`标头只包含域名，不包含完整的路径。
- `origin-when-cross-origin`：同源请求`Referer`标头包含完整的路径，跨域请求只包含域名。
- `same-origin`：跨域请求不发送`Referer`，同源请求发送。
- `strict-origin`：`Referer`标头只包含域名，HTTPS 页面请求 HTTP 资源时不发送`Referer`标头。
- `strict-origin-when-cross-origin`：同源请求时`Referer`标头包含完整路径，跨域请求时只包含域名，HTTPS 页面请求 HTTP 资源时不发送该标头。
- `unsafe-url`：不管什么情况，总是发送`Referer`标头。
