---
title: "tsx 原理"
date: "2023-11-13 15:16:33"
draft: false
tags:
- 工程化
---

tsx是一个很方便执行 ts 文件的cli，在许多知名项目中都有使用，其核心能力由 esbuild 驱动
## 前提知识
tsx本身有三个核心库：

- @esbuild-kit/esm-loader
   - 用于把typescript转化为esm
- @esbuild-kit/cjs-loader
   - 用来把ts、esm转换为cjs
- @esbuild-kit/core-utils
   - 提供一些esbuild的工具包
## tsx原理
```javascript
const childProcess = spawn(
  process.execPath,
  [
    // Hook import/import() to transform to ESM
    // Can be used in Node v12 to support dynamic `import()`
    '--loader',
    pathToFileURL(require.resolve('@esbuild-kit/esm-loader')).toString(),

    // Hook require() to transform to CJS
    '--require',
    require.resolve('@esbuild-kit/cjs-loader'),

    ...argv,
  ],
  {
    stdio,
    env: environment,
  },
);
```
这个代码是tsx的入口，我们来分析一下这段代码
### 使用 spawn 衍生子进程，加快脚本处理
因为tsx是多任务之间无关联的，所以使用多进程来加速代码执行，是很聪明的做法
### 利用[nodejs提供的自定义esm loader](https://nodejs.org/api/cli.html#--experimental-loadermodule))
```shell
node --loader esm-loader.js index.ts
```
这样就可以用 `esm-loader`来自行处理 index.ts 文件，最后把代码输出成nodejs可执行的形式即可
### 利用[nodejs提供的require preload脚本](https://nodejs.org/api/cli.html#-r---require-module)
```shell
node --require cjs-loader.js index.ts
```
跟上面的esm-loader不一样，esm-loader是遵循nodejs的规则，暴露了几个钩子给nodejs执行。
而 `--require`只是执行预加载 `cjs-loader.js`这个脚本，然后再执行 index.ts
在 `cjs-loader`里面可以做一些比较hack的事，给nodejs添加module resolver，用来解析类ts文件

## esm-loader原理
其实就是nodejs暴露的一个钩子，[自定义resolve和loader的钩子](https://nodejs.org/api/module.html#hooks)
### resolve 钩子
**resolve钩子只是定义 如何引入某个specifier，此时还没有做代码转化**
```typescript
export const resolve: resolve = async function (
  specifier,
  context,
  defaultResolve,
) {
  // Added in v12.20.0
  // https://nodejs.org/api/esm.html#esm_node_imports
  if (specifier.startsWith('node:')) {
    specifier = specifier.slice(5);
  }

  // If directory, can be index.js, index.ts, etc.
  if (specifier.endsWith('/')) {
    return resolve(`${specifier}index`, context, defaultResolve);
  }

  /**
	 * Typescript 4.6.0 behavior seems to be that if `.mjs` is specified,
	 * it converts it to mts without testing if it exists, and without
	 * consideration for whether a file with .mjs exists
	 */
  if (
    /\.[cm]js$/.test(specifier)
    && tsExtensionsPattern.test(context.parentURL!)
  ) {
    specifier = `${specifier.slice(0, -2)}ts`;
  }

  if (tsExtensionsPattern.test(specifier)) {
    return {
      ...(await defaultResolve(specifier, context, defaultResolve)),
      format: 'module',
    };
  }

  if (specifier.endsWith('.json')) {
    return {
      ...(await defaultResolve(specifier, context, defaultResolve)),
      format: 'json',
    };
  }

  try {
    const resolved = await defaultResolve(specifier, context, defaultResolve);

    /**
		 * The format depends on package.json type. If it's commonjs,
		 * the file doesn't get read for it to be deferred to CJS loading.
		 *
		 * Set it to module so the file gets read, and the loader can
		 * revert it back to commonjs if it's actually commonjs.
		 */
    if (
      specifier.endsWith('.js')
      && resolved.format === 'commonjs'
    ) {
      resolved.format = 'module';
    }

    return resolved;
  } catch (error) {
    if (error instanceof Error) {
      if ((error as any).code === 'ERR_UNSUPPORTED_DIR_IMPORT') {
        return resolve(`${specifier}/index`, context, defaultResolve);
      }

      if (
        (error as any).code === 'ERR_MODULE_NOT_FOUND'
        && !hasExtensionPattern.test(specifier)
      ) {
        for (const suffix of possibleSuffixes) {
          try {
            const trySpecifier = specifier + (
              specifier.endsWith('/') && suffix.startsWith('/')
              ? suffix.slice(1)
              : suffix
            );

            return {
              ...(await defaultResolve(trySpecifier, context, defaultResolve)),
              format: suffix === '.json' ? 'json' : 'module',
            };
          } catch {}
        }
      }
    }

    throw error;
  }
};
```
### loader钩子
l**oader钩子定义了 如何加载指定url的代码**
```typescript
export const load: load = async function (
	url,
	context,
	defaultLoad,
) {
	if (process.send) {
		process.send({
			type: 'dependency',
			path: url,
		});
	}

	if (url.endsWith('.json')) {
		context.importAssertions.type = 'json';
	}

	const loaded = await defaultLoad(url, context, defaultLoad);

	if (
		!loaded.source

		// node_modules don't need to be transformed
		|| url.includes('/node_modules/')
	) {
		return loaded;
	}

	const code = loaded.source.toString();

	if (tsExtensionsPattern.test(url)) {
    // 核心
		const transformed = await transform(code, url, {
			format: 'esm',
			tsconfigRaw,
		});

		if (transformed.map) {
			sourcemaps!.set(url, transformed.map);
		}

		return {
			...context,
			source: transformed.code,
		};
	}

	if (!(await isEsm(code))) {
		loaded.format = 'commonjs';
	}

	return loaded;
};
```
这段代码的核心逻辑就是：如果文件url是类ts（`/\.([cm]?ts|[tj]sx)$/`）文件，就用esbuild-kit中的 `transform`方法转化代码，然后返回给nodejs执行

## cjs-loader原理
比较hack了，给js/ts的文件加了transformer。这个方式我看了，官网文档上没有提及，tsx作者对nodejs的这块原理是比较熟悉的
```typescript
function transformer(
	module: Module,
	filePath: string,
) {
	/**
	 * For tracking dependencies in watch mode
	 */
	if (process.send) {
		process.send({
			type: 'dependency',
			path: filePath,
		});
	}

	const code = fs.readFileSync(filePath, 'utf8');
	const transformed = transformSync(code, filePath, {
		format: 'cjs',
		tsconfigRaw,
	});

	if (transformed.map) {
		sourcemaps!.set(filePath, transformed.map);
	}

	module._compile(transformed.code, filePath);
}

const extensions = Module._extensions;

// https://github.com/nodejs/node/blob/v12.16.0/lib/internal/modules/cjs/loader.js#L1166
// Implicit extensions
[
	'.js',
	'.ts',
	'.tsx',
	'.jsx',
].forEach((extension) => {
	extensions[extension] = transformer;
});

// Explicit extensions
[
	'.cjs',
	'.mjs',
	'.cts',
	'.mts',
].forEach((extension) => {
	Object.defineProperty(extensions, extension, {
		value: transformer,
		enumerable: false,
	});
});

// Add support for "node:" protocol
const resolveFilename = Module._resolveFilename;
Module._resolveFilename = function (...resolveFilenameArguments) {
	const [request, fromFile] = resolveFilenameArguments;

	// Added in v12.20.0
	// https://nodejs.org/api/esm.html#esm_node_imports
	if (request.startsWith('node:')) {
		resolveFilenameArguments[0] = request.slice(5);
	}

	/**
	 * Typescript 4.6.0 behavior seems to be that if `.mjs` is specified,
	 * it converts it to mts without even testing if it exists, and any consideration for
	 * whether the mjs path actually exists.
	 *
	 * What if we actually want to import a mjs file? with allowJs enabled?
	 */
	if (
		/\.[cm]js$/.test(request)
		&& (fromFile && isTsFilePatten.test(fromFile.filename))
	) {
		resolveFilenameArguments[0] = `${request.slice(0, -2)}ts`;
	}

	return resolveFilename.apply(this, resolveFilenameArguments);
};
```
这段代码的核心逻辑是：
```typescript
// Implicit extensions
[
	'.js',
	'.ts',
	'.tsx',
	'.jsx',
].forEach((extension) => {
	extensions[extension] = transformer;
});

// Explicit extensions
[
	'.cjs',
	'.mjs',
	'.cts',
	'.mts',
].forEach((extension) => {
	Object.defineProperty(extensions, extension, {
		value: transformer,
		enumerable: false,
	});
});
```
给这些文件后缀添加转化器，使用 esbuild 来做转化

## core-utils原理
这个库里面就是暴露一些esbuild相关的transform方法，
```typescript
// Used by cjs-loader
export function transformSync(
	code: string,
	filePath: string,
	extendOptions?: TransformOptions,
): TransformResult {
	if (isCJS(filePath)) {
		return {
			code,
			map: '',
			warnings: [],
		};
	}

	const options = getTransformOptions({
		sourcefile: filePath,
		...extendOptions,
	});

	const hash = sha1(code + JSON.stringify(options) + esbuildVersion);
	const cacheHit = cache.get(hash);
	if (cacheHit) {
		return cacheHit;
	}

	const transformed = esbuildTransformSync(code, options);
	if (transformed.warnings.length > 0) {
		const { warnings } = transformed;
		for (const warning of warnings) {
			console.log(warning);
		}
	}

	cache.set(hash, transformed);

	return transformed;
}

// Used by esm-loader
export async function transform(
	code: string,
	filePath: string,
	extendOptions?: TransformOptions,
): Promise<TransformResult> {
	if (isCJS(filePath)) {
		return {
			code,
			map: '',
			warnings: [],
		};
	}

	const options = getTransformOptions({
		sourcefile: filePath,
		...extendOptions,
	});

	const hash = sha1(code + JSON.stringify(options) + esbuildVersion);
	const cacheHit = cache.get(hash);
	if (cacheHit) {
		return cacheHit;
	}

	const transformed = await esbuildTransform(code, options);

	if (transformed.warnings.length > 0) {
		const { warnings } = transformed;
		for (const warning of warnings) {
			console.log(warning);
		}
	}

	cache.set(hash, transformed);

	return transformed;
}
```
### cache
我觉得比较核心的功能是缓存。在每次transform后，tsx会把结果缓存在系统tmpdir盘中，这也是加速代码执行的一个重要方式。
当然，用户也可以控制是否缓存
> Modules transformations are cached in the system cache directory (TMPDIR). Transforms are cached by content hash so duplicate dependencies are not re-transformed.
> Set the --no-cache flag to disable the cache:

```typescript
npx tsx --no-cache ./file.ts
```
```typescript
export default (
	process.env.ESBK_DISABLE_CACHE
		? new Map<string, TransformResult>()
		: new FileCache()
);
```
#### FileCache
```typescript
class FileCache extends Map<string, TransformResult> {
	/**
	 * By using tmpdir, the expectation is for the OS to clean any files
	 * that haven't been read for a while.
	 *
	 * macOS - 3 days: https://superuser.com/a/187105
	 * Linux - https://serverfault.com/a/377349
	 *
	 * Note on Windows, temp files are not cleaned up automatically.
	 * https://superuser.com/a/1599897
	 */
	cacheDirectory = path.join(os.tmpdir(), 'esbuild-kit');

	cacheFiles: {
		time: number;
		key: string;
		fileName: string;
	}[];

	constructor() {
		super();

		if (!fs.existsSync(this.cacheDirectory)) {
			fs.mkdirSync(this.cacheDirectory);
		}

		this.cacheFiles = fs.readdirSync(this.cacheDirectory).map((fileName) => {
			const [time, key] = fileName.split('-');
			return {
				time: Number(time),
				key,
				fileName,
			};
		});

		setImmediate(() => this.expireDiskCache());
	}

	get(key: string) {
		const memoryCacheHit = super.get(key);

		if (memoryCacheHit) {
			return memoryCacheHit;
		}

		const diskCacheHit = this.cacheFiles.find(cache => cache.key === key);
		if (diskCacheHit) {
			const cacheFilePath = path.join(this.cacheDirectory, diskCacheHit.fileName);
			const cacheFile = fs.readFileSync(cacheFilePath, 'utf8');
			const cachedResult: TransformResult = jsonParseSafe(cacheFile);

			if (!cachedResult) {
				// Remove broken cache file
				fs.promises.unlink(cacheFilePath).then(
					() => {
						const index = this.cacheFiles.indexOf(diskCacheHit);
						this.cacheFiles.splice(index, 1);
					},
					// eslint-disable-next-line @typescript-eslint/no-empty-function
					() => {},
				);
				return;
			}

			// Load it into memory
			super.set(key, cachedResult);

			return cachedResult;
		}
	}

	set(key: string, value: TransformResult) {
		super.set(key, value);

		if (value) {
			/**
			 * Time is inaccurate by ~27.7 hours to minimize data
			 * and because this level of fidelity wont matter
			 */
			const time = getTime();

			fs.promises.writeFile(
				path.join(this.cacheDirectory, `${time}-${key}`),
				JSON.stringify(value),
			).catch(
				// eslint-disable-next-line @typescript-eslint/no-empty-function
				() => {},
			);
		}

		return this;
	}

	expireDiskCache() {
		const time = getTime();

		for (const cache of this.cacheFiles) {
			// Remove if older than ~7 days
			if ((time - cache.time) > 7) {
				fs.promises.unlink(path.join(this.cacheDirectory, cache.fileName)).catch(
					// eslint-disable-next-line @typescript-eslint/no-empty-function
					() => {},
				);
			}
		}
	}
}
```
