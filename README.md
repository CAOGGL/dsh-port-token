# dsh-port-token

**English** · 中文说明见下

A DeepSeek Harness (dsh) Web GUI plugin: one key badge in the bottom-right corner of the page shows
the port this instance is listening on and the token a remote client needs — the exact `?token=`
from the `dsh web: http://127.0.0.1:<port>/?token=…` line printed at startup. Click it and the key
rotates into a cross while the panel opens; click again, press Esc, or click anywhere beside it to
collapse.

- **Host half** serves `GET /dsh-port-token/info`, admitted by the same browser-session check and
  Host/Origin fence as `/api` (`ctx.connection.admit`), reading `ctx.webServer.port` and
  `ctx.connection.authenticatedUrl()`.
- **Browser half** registers into the shell's `shell.overlay` slot; React comes from the platform
  module table, so there is no bundler and no build step.
- Built and verified against dsh **0.2.0-rc.2** (the runtime bundled by DeepSeek Harness Desktop 0.2.0).

Install: add the package to a profile, drop the row into that profile's `cordis.patch.yml`, and
restart — or run `install.ps1`. The details are in the Chinese section below.

---

## 中文说明

DeepSeek Harness（dsh）Web 界面插件：在页面**右下角**加一个小钥匙按钮，点一下弹出本实例的
**监听端口**和**远程连接令牌**（也就是 `dsh web` 启动时打印的那行 URL 里的 `?token=`）。

点开的瞬间钥匙会原地旋转、缩放成叉号——叉号就是关闭按钮，所以面板里没有第二个 ×。
再点一次、按 Esc、或者点面板旁边的空白处都会收起，叉号再转回钥匙。

```
收起                                    展开
                          (🔑)      ┌──────────────────────────────┐
                                    │ 本次启动                     │
                                    │ 端口                         │
                                    │ ┌──────────┐ ┌──────┐        │
                                    │ │ 19387    │ │ 复制 │        │
                                    │ └──────────┘ └──────┘        │
                                    │ 远程令牌                     │
                                    │ ┌──────────────────┐ ┌────┐  │
                                    │ │ 3fQ9xLmNpR…       │ │复制│  │
                                    │ └──────────────────┘ └────┘  │
                                    │ 连接地址                     │
                                    │ ┌──────────────────────────┐ │
                                    │ │ http://127.0.0.1:19387/… │ │
                                    │ └──────────────────────────┘ │
                                    │ 令牌等同登录凭据，请勿分享…  │
                                    └──────────────────────────────┘
                                                              (✕)
```

图标切换是纯 CSS 过渡（两层 SVG 叠在同一 20×20 盒子里，旋转 ±60° + 缩放 + 淡出/淡入，
叉号延迟 40ms 进），面板本身是一次 160ms 的淡入上浮；系统开了「减少动态效果」时两者都关掉。

## 它为什么需要两个半边

- `dsh web` 启动时会打印 `dsh web: http://127.0.0.1:19387/?token=…`，页面用这个令牌换取
  HttpOnly Cookie 后就被重定向到干净 URL，**页面里再也拿不到令牌**。所以令牌只能由主进程提供。
- 端口同理：`--port 0` 时端口是 OS 分配的，只有主进程知道真实值。

于是本插件拆成两半，由同一行 Cordis 插件挂载：

| 半边 | 文件 | 职责 |
| --- | --- | --- |
| Host | `lib/index.js` | 从 `ctx.webServer.port` 取监听端口、`ctx.connection.authenticatedUrl()` 取令牌，在 `GET /dsh-port-token/info` 返回 JSON |
| Browser | `lib/client.js` | 把按钮注册进 shell 的 `shell.overlay` 槽位，点击时 fetch 上面的路由并渲染面板；钥匙⇄叉号的形变和「点空白关闭」都在这一半 |

## 安全边界

- `/dsh-port-token/info` 用 `ctx.connection.admit(req)` 走**和 `/api` 完全一样**的 Host/Origin
  信任栅栏 + 浏览器会话校验。没有 Cookie 的请求拿到 `401`，跨站来源拿到 `403`，
  所以**能读到这个 JSON 的人，本来就能操作这个 Harness**。
- 响应带 `cache-control: no-store`，不进任何缓存。
- 面板里也直接写上「令牌等同登录凭据，请勿分享给他人」。
- 只接受 `GET`，其余方法返回 `405`。

## 安装

本机（`desktop` profile）已经装好：`%DSH_HOME%\profiles\desktop\node_modules\dsh-port-token`
是指向本目录的目录联接，`cordis.patch.yml` 末尾追加了一行 `- insert: … port-token`。
**重启 DeepSeek Harness 桌面端**后按钮就会出现在右下角。其他环境两种方式：

**A. 官方命令（会在 profile 里登记依赖）**

```powershell
dsh plugin --profile desktop add link:C:\path\to\dsh-port-token-plugin
```

然后把这一行加进 `%DSH_HOME%\profiles\<profile>\cordis.patch.yml`：

```yaml
- insert:
    - id: port-token
      name: "dsh-port-token"
```

**B. 仓库自带脚本（只建目录联接 + 改 patch 层，不动 package.json）**

```powershell
# 安装（默认 desktop profile）
.\install.ps1
# 换 profile
.\install.ps1 -Profile web
# 卸载
.\install.ps1 -Remove
```

脚本做的事：`node_modules/dsh-port-token` → 本目录的目录联接，加上 patch 层里的那一行。
改完 **需要重启 DeepSeek Harness 桌面端**（patch 层只在启动时组合，不做热加载）。

## 卸载

```powershell
.\install.ps1 -Remove
```

然后重启。手工等价操作：删掉 `node_modules\dsh-port-token` 联接，并从 `cordis.patch.yml`
删掉 `id: port-token` 那一行。

## 兼容性

在 **DeepSeek Harness 桌面端 0.2.0（内置 dsh 0.2.0-rc.2）** 上对着真实运行时代码验证过：

- 宿主侧 API：`ctx.webServer.register({ kind: 'exact', path, handler })`、`ctx.webServer.port`、
  `ctx.connection.admit()`、`ctx.connection.authenticatedUrl()`。
- 浏览器侧 API：`ctx.slots.inject()` / `ctx.slots.register()`（`shell.overlay` 是
  `dsh-client-ui-layout` 声明的 list 槽位，AppFrame 把它渲染成 `position:absolute; inset:0`
  的覆盖层）、`ctx.locale.register()` / `ctx.locale.bind()`。
- 浏览器半边只用平台种子表里的 `react`，没有构建步骤，也不需要声明 `dsh.client.external`。

会话 Cookie 变化、端口变化都不需要改代码：每次展开都会重新读一次主进程。

## 校验

```powershell
node tools/verify-host.mjs     # 路由契约：200/401/403/405/500、no-store、随 fiber 释放
node tools/verify-browser.mjs  # 注册、槽位、四种渲染状态、复制、Esc、失败重试
```
