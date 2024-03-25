---
title: "vite-plugin-html原理"
date: "2022-10-24 10:37:12"
draft: false
tags:
- vite
- vite插件
---


# 注入tags
## 原理
`vph`内部调用 `transformIndexHtml`返回 `tags`即可实现tags注入。这个功能是 `vph`最简单的功能
## vph注入tag
```typescript
import { defineConfig } from 'vite'
import { createHtmlPlugin } from 'vite-plugin-html'

export defineConfig({
	plugins: [
		createHtmlPlugin({
			inject: {
				tags: [
					{
						injectTo: 'body',
						tag: 'div',
						attrs: {
							id: 'tag'
						}
					}
				]
			}
		})
	]
})
```
## vite注入tag
注入tags至模板中，是vite提供的功能，抛开 `vph`，单纯用 vite
```typescript
import { defineConfig } from 'vite'

export defineConfig({
	plugins: [
		{
			name: 'vite:injectTags',
			transformIndexHtml(html) {
				return {
					html,
					tags: [
						{
							injectTo: 'body',
							tag: 'div',
							attrs: {
								id: 'tag'
							}
						}
					]
				}
			}
		}
	]
})
```

# 压缩html
> 这个功能是 html-webpack-plugin 有的，照抄了思路

## 原理
使用 `[html-minifier-terser](https://github.com/terser/html-minifier-terser)`压缩html
## html-webpack-plugin 是如何压缩的？
```typescript
// 从函数名可以推断出来此函数是在最后执行
function postProcessHtml (html, assets, assetTags) {
	if (typeof html !== 'string') {
		return Promise.reject(new Error('Expected html to be a string but got ' + JSON.stringify(html)));
	}
	const htmlAfterInjection = options.inject
		? injectAssetsIntoHtml(html, assets, assetTags)
		: html;
	const htmlAfterMinification = minifyHtml(htmlAfterInjection);
	return Promise.resolve(htmlAfterMinification);
}

function minifyHtml (html) {
	if (typeof options.minify !== 'object') {
		return html;
	}
	try {
		// 核心代码
		// 调用压缩插件的api即可
		return require('html-minifier-terser').minify(html, options.minify);
	} catch (e) {
		const isParseError = String(e.message).indexOf('Parse Error') === 0;
		if (isParseError) {
			e.message = 'html-webpack-plugin could not minify the generated output.\n' +
					'In production mode the html minifcation is enabled by default.\n' +
					'If you are not generating a valid html output please disable it manually.\n' +
					'You can do so by adding the following setting to your HtmlWebpackPlugin config:\n|\n|' +
					'    minify: false\n|\n' +
					'See https://github.com/jantimon/html-webpack-plugin#options for details.\n\n' +
					'For parser dedicated bugs please create an issue here:\n' +
					'https://danielruf.github.io/html-minifier-terser/' +
				'\n' + e.message;
		}
		throw e;
	}
}
```
## vph 是如何压缩的？
```typescript
import { minify as minifyFn } from 'html-minifier-terser'

export async function minifyHtml(
  html: string,
  minify: boolean | MinifyOptions,
) {
  if (typeof minify === 'boolean' && !minify) {
    return html
  }

  let minifyOptions: boolean | MinifyOptions = minify

  if (typeof minify === 'boolean' && minify) {
    minifyOptions = getOptions(minify)
  }

  return await minifyFn(html, minifyOptions as MinifyOptions)
}

export function createMinifyHtmlPlugin({
  minify = true,
}: UserOptions = {}): PluginOption {
  return {
    name: 'vite:minify-html',
		// vph源码这段代码注释了，因为这段代码是无效的。
		// generateBundle 本身就在build阶段执行
    // apply: 'build',
    enforce: 'post',
		// rollup hook
		// 打包的时候执行(生成打包文件，但还没输出打包)
    async generateBundle(_, outBundle) {
      if (minify) {
        for (const bundle of Object.values(outBundle)) {
          if (
            bundle.type === 'asset' &&
            htmlFilter(bundle.fileName) &&
            typeof bundle.source === 'string'
          ) {
						// 直接修改bundle的源码，修改为最小化后的代码
            bundle.source = await minifyHtml(bundle.source, minify)
          }
        }
      }
    },
  }
}

```
# 支持ejs
## 原理
在vite处理indexHtml之前，使用 `[ejs](https://ejs.co/#install)`render转化代码
### html-webpack-plugin 
没有集成ejs，而是用的 [lodash](https://lodash.com/docs/4.17.15#template) 做内容替换
```typescript
const _ = require('lodash');

const template = _.template(source, { interpolate: /<%=([\s\S]+?)%>/g, variable: 'data', ...options });
```
### vite-plugin-html
```typescript
import { render } from 'ejs'

{
	// 在transformIndexHtml hook 时使用ejs渲染html模板
	transformIndexHtml: {
		// 强制前置transformIndexHtml，在vite内置transformIndexHtml钩子之前执行，避免vite识别不了ejs的语法而报错
		enforce: 'pre',
		async transform(html, ctx) {
			const url = ctx.filename
			const base = viteConfig.base
			const excludeBaseUrl = url.replace(base, '/')
			const htmlName = path.relative(process.cwd(), excludeBaseUrl)
		
			const page = getPage(userOptions, htmlName, viteConfig)
			const { injectOptions = {} } = page
			// 核心代码
			const _html = await renderHtml(html, {
				injectOptions,
				viteConfig,
				env,
				entry: page.entry || entry,
				verbose,
			})
			const { tags = [] } = injectOptions
			return {
				html: _html,
				tags: tags,
			}
		},
	},
}

export async function renderHtml(
  html: string,
  config: {
    injectOptions: InjectOptions
    viteConfig: ResolvedConfig
    env: Record<string, any>
    entry?: string
    verbose?: boolean
  },
) {
  const { injectOptions, viteConfig, env, entry, verbose } = config
  const { data, ejsOptions } = injectOptions

  const ejsData: Record<string, any> = {
    ...(viteConfig?.env ?? {}),
    ...(viteConfig?.define ?? {}),
    ...(env || {}),
    ...data,
  }

	// 核心代码
  let result = await render(html, ejsData, ejsOptions)

  if (entry) {
    result = removeEntryScript(result, verbose)
    result = result.replace(
      bodyInjectRE,
      `<script type="module" src="${normalizePath(
        `${entry}`,
      )}"></script>\n</body>`,
    )
  }
  return result
}
```
# 多页
## server时
vite只支持[约定式的server多页面](https://vitejs.dev/guide/build.html#multi-page-app)，所以需要在服务器中间件处理一下多页
```typescript
import history from 'connect-history-api-fallback'

configureServer(server) {
	let _pages: { filename: string; template: string }[] = []
	const rewrites: { from: RegExp; to: any }[] = []
	if (!isMpa(viteConfig)) {
		const template = userOptions.template || DEFAULT_TEMPLATE
		const filename = DEFAULT_TEMPLATE
		_pages.push({
			filename,
			template,
		})
	} else {
		_pages = pages.map((page) => {
			return {
				filename: page.filename || DEFAULT_TEMPLATE,
				template: page.template || DEFAULT_TEMPLATE,
			}
		})
	}
	const proxy = viteConfig.server?.proxy ?? {}
	const baseUrl = viteConfig.base ?? '/'
	const keys = Object.keys(proxy)

	let indexPage: any = null
	for (const page of _pages) {
		if (page.filename !== 'index.html') {
			rewrites.push(createRewire(page.template, page, baseUrl, keys))
		} else {
			indexPage = page
		}
	}

	// ensure order
	if (indexPage) {
		rewrites.push(createRewire('', indexPage, baseUrl, keys))
	}
	
	// 核心代码。使用 connect-history-api-fallback 做了中间件代理，避免404
	server.middlewares.use(
		history({
			disableDotRule: undefined,
			htmlAcceptHeaders: ['text/html', 'application/xhtml+xml'],
			rewrites: rewrites,
		}),
	)
},
```
### connect-history-api-fallback
SPA项目只有一个html，只是通过js动态修改html（通常是index.html）的内容，无论我们如何修改url，请求都是指向的index.html。如果我们希望不止一个html，如other.html，那么如果我们请求other.html将会404。
这个插件就是为了解决这个404，在后端代理一些前端路由，比如 当我们请求 other.html，请求将不再指向 index.html（本来是所有请求都指向index.html的）
## build时
### 添加rollup多入口
```typescript
config(conf) {
	const input = createInput(userOptions, conf as unknown as ResolvedConfig)

	if (input) {
		return {
			build: {
				rollupOptions: {
					input,
				},
			},
		}
	}
},
```
### 处理打包后dist中文件
```typescript
async closeBundle() {
	const outputDirs: string[] = []

	if (isMpa(viteConfig) || pages.length) {
		for (const page of pages) {
			const dir = path.dirname(page.template)
			if (!ignoreDirs.includes(dir)) {
				outputDirs.push(dir)
			}
		}
	} else {
		const dir = path.dirname(template)
		if (!ignoreDirs.includes(dir)) {
			outputDirs.push(dir)
		}
	}
	const cwd = path.resolve(viteConfig.root, viteConfig.build.outDir)
	const htmlFiles = await fg(
		outputDirs.map((dir) => `${dir}/*.html`),
		{ cwd: path.resolve(cwd), absolute: true },
	)

	await Promise.all(
		htmlFiles.map((file) =>
			fs.move(file, path.resolve(cwd, path.basename(file)), {
				overwrite: true,
			}),
		),
	)

	const htmlDirs = await fg(
		outputDirs.map((dir) => dir),
		{ cwd: path.resolve(cwd), onlyDirectories: true, absolute: true },
	)
	await Promise.all(
		htmlDirs.map(async (item) => {
			const isEmpty = await isDirEmpty(item)
			if (isEmpty) {
				return fs.remove(item)
			}
		}),
	)
},
```
# 自定义entry入口文件
在transformIndexHtml阶段，判断如果自定义entry，则把模板中默认的entry代码删除 `removeEntryScript`。然后添加自定义的entry到body script标签中
```typescript
if (entry) {
	result = removeEntryScript(result, verbose)
	result = result.replace(
		bodyInjectRE,
		`<script type="module" src="${normalizePath(
			`${entry}`,
		)}"></script>\n</body>`,
	)
}

function removeEntryScript(html: string, verbose = false) {
	if (!html) {
		return html
	}

	const root = parse(html)
	const scriptNodes = root.querySelectorAll('script[type=module]') || []
	const removedNode: string[] = []
	scriptNodes.forEach((item) => {
		removedNode.push(item.toString())
		item.parentNode.removeChild(item)
	})
	verbose &&
		removedNode.length &&
		consola.warn(`vite-plugin-html: Since you have already configured entry, ${dim(
			removedNode.toString(),
		)} is deleted. You may also delete it from the index.html.
        `)
	return root.toString()
}
```
# 自定义html template
> vite默认的template是根目录下的index.html

## server时
因为template影响了在server时的后端服务指向，所以需要使用 `connect-history-api-fallback`配置一下代理
## build时
修改rollup的input构建选项，可以实现自定义模板。
例如：
```typescript
input: {
	'index': 'index.html',
	'other': 'other.html'
}
```
```typescript
config(conf) {
	// 修改rollup的input选项
	const input = createInput(userOptions, conf as unknown as ResolvedConfig)

	if (input) {
		return {
			build: {
				rollupOptions: {
					input,
				},
			},
		}
	}
}

export function createInput(
  { pages = [], template = DEFAULT_TEMPLATE }: UserOptions,
  viteConfig: ResolvedConfig,
) {
  const input: Record<string, string> = {}
  if (isMpa(viteConfig) || pages?.length) {
    const templates = pages.map((page) => page.template)
    templates.forEach((temp) => {
      let dirName = path.dirname(temp)
      const file = path.basename(temp)

      dirName = dirName.replace(/\s+/g, '').replace(/\//g, '-')

      const key =
        dirName === '.' || dirName === 'public' || !dirName
          ? file.replace(/\.html/, '')
          : dirName
      input[key] = path.resolve(viteConfig.root, temp)
    })

    return input
  } else {
    const dir = path.dirname(template)
    if (ignoreDirs.includes(dir)) {
      return undefined
    } else {
      const file = path.basename(template)
      const key = file.replace(/\.html/, '')
      return {
        [key]: path.resolve(viteConfig.root, template),
      }
    }
  }
}
```
