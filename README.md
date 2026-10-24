# dsh-port-token 🔑

DSH（DeepSeek Harness）Web 界面插件：**右下角常驻一把钥匙**——点开就能看到本实例正在监听的端口、远程访问令牌和连接地址，再点一下收起。

A DeepSeek Harness Web GUI plugin: **a key in the bottom-right corner** that shows the port this instance is listening on, the remote-access token, and the URL to connect with — one click open, one click closed.

**切换语言 / Language：** [中文](#中文) · [English](#english)

---

## 中文

<img src="docs/preview-zh.svg" width="784" alt="右下角的钥匙徽标展开后的面板，浅色与深色主题">

### 主要功能

- 🔑 **一眼看到端口和令牌**：面板三行——`端口`、`远程令牌`、`连接地址`，每行各带独立复制按钮，复制后短暂显示「已复制」
- 🔄 **钥匙变叉号**：展开时钥匙原地旋转成叉号；再点徽标、按 `Esc`、或点面板旁边的空白处都能收起
- 🔌 **端口是真的那个**：取自宿主 `ctx.webServer.port`，用 `--port 0` 让系统分配也能显示正确
- 🎫 **令牌就是启动时那串**：取自 `ctx.connection.authenticatedUrl()`，与 `dsh web` 启动打印的 `?token=` 完全一致
- 🛡️ **不额外放权**：`GET /dsh-port-token/info` 由 `ctx.connection.admit(req)` 把关，和 `/api` 同一道 Host/Origin 栅栏与会话校验——无 Cookie 返回 `401`、跨站来源 `403`、非 `GET` 返回 `405`、响应带 `no-store`
- 🔄 **每次展开重新读**：端口和令牌都实时向宿主取值，重启后的实例不会在屏幕上留下旧端口
- 🌗 **跟随主题和语言**：只用宿主设计令牌配色，明暗主题自适应；文案中英双语，跟随界面语言
- 📦 **没有构建步骤**：React 取自页面平台模块表，浏览器半边就是一段普通 JS 直接加载

### 安装方法

**方法 A：桌面端自带命令（推荐）**

`desktop` 这个 profile 由 Electron 应用独占管理，npm 装的 `dsh` 命令会被直接拒绝，要用桌面端自带的那条：

```powershell
$dsh = "$env:LOCALAPPDATA\Programs\DeepSeek Harness\resources\runtime\cli\bin\dsh.cmd"
& $dsh plugin --profile desktop add github:CAOGGL/dsh-port-token
```

**重启 DeepSeek Harness** 生效（bundle 在启动时组合）。

**方法 B：装本地检出（开发用）**

```powershell
& $dsh plugin --profile desktop add link:C:\path\to\dsh-port-token-plugin
```

profile 直接读工作副本，改完刷新页面即可看到，不用重装。

**方法 C：其他 profile**

`desktop` 以外的名字用 npm 版 CLI 即可（需要 `pnpm` 在 `PATH` 上）：

```powershell
dsh plugin --profile web add github:CAOGGL/dsh-port-token
```

### 用法

| 操作 | 结果 |
| --- | --- |
| 点钥匙 | 面板打开，钥匙旋转成叉号 |
| 再点一次 / 按 `Esc` / 点面板旁边的空白 | 收起，叉号转回钥匙 |
| 点某行的 `复制` | 只复制这一项，按钮短暂显示 `已复制` |

### 原理

`dsh web` 启动时打印一次带令牌的地址，页面拿它换 HttpOnly Cookie 后就被重定向到干净地址，**令牌再也到不了页面脚本**；`--port 0` 时端口也只有宿主进程知道。所以插件分成两半：`lib/index.js` 提供一个路由，`lib/client.js` 渲染徽标。详见 [实现原理](docs/how-it-works.zh-CN.md)。

### 卸载

```powershell
& $dsh plugin --profile desktop remove dsh-port-token
```

然后重启。profile 里的依赖和 bundles 条目会一并清除，profile 目录之外没有改动。

### 更新日志

- **v0.1.0**（2026-10-24）：首个版本——右下角钥匙徽标、端口/令牌/地址三行与逐行复制、钥匙⇄叉号形变、点空白关闭、明暗主题与中英双语、宿主路由带 `/api` 同级栅栏

---

## English

<img src="docs/preview-en.svg" width="784" alt="The key badge open in the bottom-right corner, in light and dark themes">

### Features

- 🔑 **Port and token at a glance**: three rows — `Port`, `Remote token`, `Connection URL` — each with its own copy button that briefly reads `Copied`
- 🔄 **The key becomes a cross**: clicking the badge opens the panel and rotates the key into a cross; click it again, press `Esc`, or click beside the panel to close
- 🔌 **The real port**: read from the host (`ctx.webServer.port`), so it is still correct when the harness was started with `--port 0`
- 🎫 **The same token**: taken from `ctx.connection.authenticatedUrl()`, identical to the `?token=` printed by `dsh web` at startup
- 🛡️ **No extra privilege**: `GET /dsh-port-token/info` is admitted by `ctx.connection.admit(req)`, the same Host/Origin fence and browser-session check that guards `/api` — no cookie gets `401`, a foreign origin `403`, other verbs `405`, and responses carry `no-store`
- 🔄 **Re-read on every open**: the panel asks the host each time, so a restarted instance never leaves a stale port on screen
- 🌗 **Follows the theme and the language**: styled only with the host design tokens, light and dark both work; copy is bilingual and follows the page language
- 📦 **No build step**: React comes from the page platform module table, and the browser half is plain JS loaded as-is

### Install

**Option A — the command the Desktop app ships (recommended)**

The `desktop` profile belongs to the Electron app, and the npm `dsh` CLI refuses to touch it. Use the one bundled with the installation:

```powershell
$dsh = "$env:LOCALAPPDATA\Programs\DeepSeek Harness\resources\runtime\cli\bin\dsh.cmd"
& $dsh plugin --profile desktop add github:CAOGGL/dsh-port-token
```

**Restart DeepSeek Harness** — bundles are composed at boot.

**Option B — install a local checkout (for development)**

```powershell
& $dsh plugin --profile desktop add link:C:\path\to\dsh-port-token-plugin
```

The profile reads the working copy, so edits show up after a page reload, with no reinstall.

**Option C — any other profile**

Every name except `desktop` works with the npm CLI, provided `pnpm` is on `PATH`:

```powershell
dsh plugin --profile web add github:CAOGGL/dsh-port-token
```

### Usage

| Action | Result |
| --- | --- |
| click the key | the panel opens and the key rotates into a cross |
| click it again, press `Esc`, or click beside the panel | it closes and the cross becomes the key |
| click `Copy` on a row | that one value is copied; the label reads `Copied` for a moment |

### How it works

`dsh web` prints a token-bearing URL once at startup; the page trades it for an HttpOnly cookie and is redirected to a clean URL, so **page script can never read the token again** — and with `--port 0` only the host process knows the port. Hence two halves: `lib/index.js` serves one route, `lib/client.js` draws the badge. Details: [how it works](docs/how-it-works.md).

### Uninstall

```powershell
& $dsh plugin --profile desktop remove dsh-port-token
```

Then restart. The dependency and its bundle entry are removed; nothing outside the profile directory is touched.

### Changelog

- **v0.1.0** (2026-10-24): first release — the bottom-right key badge, port/token/URL with per-row copy, the key ⇄ cross morph, close-on-outside-click, light and dark themes, Chinese and English copy, and a host route with the same fence as `/api`
