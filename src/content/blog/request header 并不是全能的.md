---
title: "request header 并不是全能的"
date: "2021-07-06 18:05:10"
draft: false
tags:
- 其他
---

上传文件时，后端说上传的文件乱码，需要我改 request headers 中的 `accept-eccoding` ，我改了之后发现并未生效，原来有些东西是不能改的

- Accept-CharsetAccept-Encoding
- Access-Control-Request-Headers
- Access-Control-Request-Method
- Connection
- Content-Length
- Cookie
- Cookie2
- Date
- DNT
- Expect
- Host
- Keep-Alive
- Origin
- Referer
- TE
- Trailer
- Transfer-Encoding
- Upgrade
- User-Agent
- Via
