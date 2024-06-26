---
title: "vitest e2e测试 原理"
date: "2023-10-25 10:33:48"
draft: false
tags:
- vitest
---

# 参考
vite
vitest
vite-plugin-vue
# globalSetup
globalSetup在vitest启动后，只会执行一次
全局setup中

1. 启动浏览器服务，然后获取到浏览器的长链接端点（类似：ws://127.0.0.1:62989/devtools/browser/4eb19a2a-c019-4e2f-b476-9d9a6182e67d 这样的一个链接），并保存在系统临时盘中（os.tmpdir())
2. copy一份可以运行的项目，作为e2e的临时项目
3. 在teardown（执行完globalSetup的回调中），移除copy的临时项目
```javascript
import os from 'node:os'
import path from 'node:path'
import fs from 'fs-extra'
import type { BrowserServer } from 'playwright-chromium'
import { chromium } from 'playwright-chromium'

const DIR = path.join(os.tmpdir(), 'vitest_playwright_global_setup')

let browserServer: BrowserServer | undefined

export async function setup(): Promise<void> {
  process.env.NODE_ENV = process.env.VITE_TEST_BUILD
    ? 'production'
    : 'development'

  browserServer = await chromium.launchServer({
    headless: !process.env.VITE_DEBUG_SERVE,
    args: process.env.CI
      // 在CI环境中关闭浏览器沙盒相关配置，加速启动服务
      ? ['--no-sandbox', '--disable-setuid-sandbox']
      : undefined,
  })

  await fs.mkdirp(DIR)
  await fs.writeFile(path.join(DIR, 'wsEndpoint'), browserServer.wsEndpoint())

  const tempDir = path.resolve(__dirname, '../playground-temp')
  await fs.ensureDir(tempDir)
  await fs.emptyDir(tempDir)
  await fs
    .copy(path.resolve(__dirname, '../playground'), tempDir, {
      dereference: false,
      filter(file) {
        file = file.replace(/\\/g, '/')
        return !file.includes('__tests__') && !file.match(/dist(\/|$)/)
      },
    })
    .catch(async (error) => {
      if (error.code === 'EPERM' && error.syscall === 'symlink') {
        throw new Error(
          'Could not create symlinks. On Windows, consider activating Developer Mode to allow non-admin users to create symlinks by following the instructions at https://docs.microsoft.com/en-us/windows/apps/get-started/enable-your-device-for-development.',
        )
      } else {
        throw error
      }
    })
}

export async function teardown(): Promise<void> {
  await browserServer?.close()
  if (!process.env.VITE_PRESERVE_BUILD_ARTIFACTS) {
    fs.removeSync(path.resolve(__dirname, '../playground-temp'))
  }
}
```
# setup
setup文件，在每个test文件执行前，都会执行一次。注意，是测试文件，而不是测试用例
在setup中

1. 添加 `beforeAll`钩子
   1. 获取到globalSetup中保存到系统临时盘中的长链接端点，用于浏览器测试库连接（如playwright、puppeteer)
   2. 连接浏览器后，调用浏览器api，开启一个页面，然后对页面进行一系列的控制，比如监听页面console、监听页面报错等等
   3. 启动项目服务，获取到服务的url（如http://localhost:5174），然后交予page.goto进入页面
2. 导出通用变量，如 page、browser、viteTestUrl、browserLogs等，test文件中可以方便使用
```javascript
/* eslint-disable import/no-mutable-exports */
import type * as http from 'node:http'
import fs from 'fs-extra'
import os from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { type Browser, type Page, chromium } from 'playwright-chromium'
import { type RollupError, type RollupWatcher, type RollupWatcherEvent } from 'rollup'
import {
  type InlineConfig,
  type Logger,
  type PluginOption,
  type ResolvedConfig,
  type UserConfig,
  type ViteDevServer,
  build,
  createServer,
  loadConfigFromFile,
  mergeConfig,
  preview,
} from 'vite'
import { type File, afterEach, beforeAll } from 'vitest'

// #region env

export const workspaceRoot = resolve(__dirname, '../')

export const isBuild = !!process.env.VITE_TEST_BUILD
export const isServe = !isBuild
export const isCI = !!process.env.CI
export const isWindows = process.platform === 'win32'

// #endregion

// #region context

let server: ViteDevServer | http.Server

/**
 * Vite Dev Server when testing serve
 */
export let viteServer: ViteDevServer
/**
 * Root of the Vite fixture
 */
export let rootDir: string
/**
 * Path to the current test file
 */
export let testPath: string
/**
 * Path to the test folder
 */
export let testDir: string
/**
 * Test folder name
 */
export let testName: string
/**
 * current test using vite inline config
 * when using server.js is not possible to get the config
 */
export let viteConfig: InlineConfig | undefined

export let serverLogs: string[] = []
export let browserLogs: string[] = []
export let browserErrors: Error[] = []

export let resolvedConfig: ResolvedConfig = undefined!

export let page: Page = undefined!
export let browser: Browser = undefined!
export let viteTestUrl: string = ''
export let watcher: RollupWatcher | undefined = undefined

declare module 'vite' {
  interface InlineConfig {
    testConfig?: {
      // relative base output use relative path
      // rewrite the url to truth file path
      baseRoute: string
    }
  }
}

export function setViteUrl(url: string): void {
  viteTestUrl = url
}

// #endregion

const DIR = join(os.tmpdir(), 'vitest_playwright_global_setup')

beforeAll(async (s) => {
  const suite = s as File
  // skip browser setup for non-playground tests
  if (!suite.filepath.includes('playground')) {
    return
  }

  const wsEndpoint = fs.readFileSync(join(DIR, 'wsEndpoint'), 'utf-8')
  if (!wsEndpoint) {
    throw new Error('wsEndpoint not found')
  }

  browser = await chromium.connect(wsEndpoint)
  page = await browser.newPage()

  const globalConsole = global.console
  const warn = globalConsole.warn
  globalConsole.warn = (msg, ...args) => {
    if (msg.includes('Generated an empty chunk')) return
    warn.call(globalConsole, msg, ...args)
  }

  try {
    page.on('console', (msg) => {
      // ignore favicon request in headed browser
      if (
        process.env.VITE_DEBUG_SERVE &&
        msg.text().includes('Failed to load resource:') &&
        msg.location().url.includes('favicon.ico')
      ) {
        return
      }
      if (msg.text().includes('React DevTools')) return
      browserLogs.push(msg.text())
    })
    page.on('pageerror', (error) => {
      browserErrors.push(error)
    })

    testPath = suite.filepath!
    testName = slash(testPath).match(/playground\/([\w-]+)\//)?.[1]
    testDir = dirname(testPath)

    // if this is a test placed under playground/xxx/__tests__
    // start a vite server in that directory.
    if (testName) {
      testDir = resolve(workspaceRoot, 'playground-temp', testName)

      // when `root` dir is present, use it as vite's root
      const testCustomRoot = resolve(testDir, 'root')
      rootDir = fs.existsSync(testCustomRoot) ? testCustomRoot : testDir

      const testCustomServe = [resolve(dirname(testPath), 'serve.ts'), resolve(dirname(testPath), 'serve.js')].find(
        (i) => fs.existsSync(i),
      )

      if (testCustomServe) {
        // test has custom server configuration.
        const mod = await import(testCustomServe)
        const serve = mod.serve || mod.default?.serve
        const preServe = mod.preServe || mod.default?.preServe
        if (preServe) {
          await preServe()
        }
        if (serve) {
          server = await serve()
          viteServer = mod.viteServer
          return
        }
      } else {
        await startDefaultServe()
      }
    }
  } catch (e) {
    // Closing the page since an error in the setup, for example a runtime error
    // when building the playground should skip further tests.
    // If the page remains open, a command like `await page.click(...)` produces
    // a timeout with an exception that hides the real error in the console.
    await page.close()
    await server?.close()
    throw e
  }

  return async () => {
    serverLogs = []
    await page?.close()
    await server?.close()
    await watcher?.close()
    if (browser) {
      await browser.close()
    }
  }
})

afterEach(() => {
  browserLogs = []
  browserErrors = []
})

function loadConfigFromDir(dir: string) {
  return loadConfigFromFile(
    {
      command: isBuild ? 'build' : 'serve',
      mode: isBuild ? 'production' : 'development',
    },
    undefined,
    dir,
  )
}

export async function startDefaultServe(): Promise<void> {
  let config: UserConfig | null = null
  // config file near the *.spec.ts
  const res = await loadConfigFromDir(dirname(testPath))
  if (res) {
    config = res.config
  }
  // config file from test root dir
  if (!config) {
    const res = await loadConfigFromDir(rootDir)
    if (res) {
      config = res.config
    }
  }

  const options: InlineConfig = {
    root: rootDir,
    logLevel: 'silent',
    configFile: false,
    server: {
      watch: {
        // During tests we edit the files too fast and sometimes chokidar
        // misses change events, so enforce polling for consistency
        usePolling: true,
        interval: 100,
      },
      host: true,
      fs: {
        strict: !isBuild,
      },
    },
    build: {
      // esbuild do not minify ES lib output since that would remove pure annotations and break tree-shaking
      // skip transpilation during tests to make it faster
      target: 'esnext',
      // tests are flaky when `emptyOutDir` is `true`
      emptyOutDir: false,
    },
    customLogger: createInMemoryLogger(serverLogs),
  }

  setupConsoleWarnCollector(serverLogs)

  if (!isBuild) {
    process.env.VITE_INLINE = 'inline-serve'
    const testConfig = mergeConfig(options, config || {})
    viteConfig = testConfig
    viteServer = server = await (await createServer(testConfig)).listen()
    // use resolved port/base from server
    const devBase = server.config.base
    viteTestUrl = `http://localhost:${server.config.server.port}${devBase === '/' ? '' : devBase}`
    await page.goto(viteTestUrl)
  } else {
    process.env.VITE_INLINE = 'inline-build'
    // determine build watch
    const resolvedPlugin: () => PluginOption = () => ({
      name: 'vite-plugin-watcher',
      configResolved(config) {
        resolvedConfig = config
      },
    })
    options.plugins = [resolvedPlugin()]
    const testConfig = mergeConfig(options, config || {})
    viteConfig = testConfig
    const rollupOutput = await build(testConfig)
    const isWatch = !!resolvedConfig!.build.watch
    // in build watch,call startStaticServer after the build is complete
    if (isWatch) {
      watcher = rollupOutput as RollupWatcher
      await notifyRebuildComplete(watcher)
    }
    if (config && config.__test__) {
      config.__test__()
    }
    const _nodeEnv = process.env.NODE_ENV
    const previewServer = await preview(testConfig)
    // prevent preview change NODE_ENV
    process.env.NODE_ENV = _nodeEnv
    viteTestUrl = previewServer.resolvedUrls.local[0]
    await page.goto(viteTestUrl)
  }
}

/**
 * Send the rebuild complete message in build watch
 */
export async function notifyRebuildComplete(watcher: RollupWatcher): Promise<RollupWatcher> {
  let resolveFn: undefined | (() => void)
  const callback = (event: RollupWatcherEvent): void => {
    if (event.code === 'END') {
      resolveFn?.()
    }
  }
  watcher.on('event', callback)
  await new Promise<void>((resolve) => {
    resolveFn = resolve
  })
  return watcher.off('event', callback)
}

function createInMemoryLogger(logs: string[]): Logger {
  const loggedErrors = new WeakSet<Error | RollupError>()
  const warnedMessages = new Set<string>()

  const logger: Logger = {
    hasWarned: false,
    hasErrorLogged: (err) => loggedErrors.has(err),
    clearScreen: () => {},
    info(msg) {
      logs.push(msg)
    },
    warn(msg) {
      logs.push(msg)
      logger.hasWarned = true
    },
    warnOnce(msg) {
      if (warnedMessages.has(msg)) return
      logs.push(msg)
      logger.hasWarned = true
      warnedMessages.add(msg)
    },
    error(msg, opts) {
      logs.push(msg)
      if (opts?.error) {
        loggedErrors.add(opts.error)
      }
    },
  }

  return logger
}

function setupConsoleWarnCollector(_logs: string[]) {
  const warn = console.warn
  console.warn = (...args) => {
    serverLogs.push(args.join(' '))
    return warn.call(console, ...args)
  }
}

export function slash(p: string): string {
  return p.replace(/\\/g, '/')
}

declare module 'vite' {
  export interface UserConfig {
    /**
     * special test only hook
     *
     * runs after build and before preview
     */
    __test__?: () => void
  }
}
```
# *.spec.ts 测试文件
为了更好的跟单元测试区分开，在 e2e 中，通常匹配 *.spec.ts 文件
```javascript
/// <reference types="vitest" />
import { resolve } from 'node:path'
import { defineConfig } from 'vitest/config'

const timeout = process.env.CI ? 50000 : 30000

export default defineConfig({
  resolve: {
    alias: {
      '~utils': resolve(__dirname, './playground/test-utils'),
    },
  },
  test: {
    include: ['./playground/**/*.spec.[tj]s'],
    reporters: 'dot',
    coverage: {
      provider: undefined,
      reporter: ['text', 'clover', 'json'],
    },
    testTimeout: timeout,
    hookTimeout: timeout,
    setupFiles: ['./playground/vitestSetup.ts'],
    globalSetup: ['./playground/vitestGlobalSetup.ts'],
  },
})
```
