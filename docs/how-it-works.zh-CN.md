# 实现原理

整个插件就两个文件。这一页说明为什么是两半。

## 页面拿不到这两个值

`dsh web` 只在启动时打印一次远程访问令牌：

```text
dsh web: http://127.0.0.1:19387/?token=…
```

页面拿它换一个 HttpOnly Cookie，然后被重定向到干净地址，之后页面里的脚本再也读不到它。端口是同一回事：
`--port 0` 时由操作系统分配，只有宿主进程知道是哪个。

这两个值只存在于宿主进程，这就是「两半」的全部理由。

## 宿主半边——`lib/index.js`

一个精确路由 `GET /dsh-port-token/info`，返回：

```json
{ "ok": true, "host": "127.0.0.1", "port": 19387,
  "origin": "http://127.0.0.1:19387", "url": "http://127.0.0.1:19387/?token=…", "token": "…" }
```

它读取 `ctx.webServer.port` 和 `ctx.connection.authenticatedUrl()`，每个请求都过一遍
`ctx.connection.admit(req)`——和 `/api` 相同的 Host/Origin 栅栏与会话校验：

- 没有会话 Cookie → `401`
- 跨站来源 → `403`
- 非 `GET` → `405`
- 每个响应都带 `cache-control: no-store`

能读到这份 JSON 的人本来就能操作这个 harness，所以这个路由没有给出任何新权限。

## 浏览器半边——`lib/client.js`

徽标注册进 shell 的 `shell.overlay` 槽位，`dsh-client-ui-layout` 把它渲染成覆盖三栏的一层。React 取自
页面自己的模块表，所以没有打包器、没有构建步骤，也不需要声明 `dsh.client.external`——这个文件就是
`window.__ModuleLoader__.load` 里的普通 JS。

面板每次展开都会重新请求那个路由，所以重启后的 harness 不会显示旧端口。钥匙⇄叉号是两层 SVG 加一段
CSS 过渡。

## 改它

```powershell
npm test                        # 路由契约 + 渲染测试，离线，不需要 node_modules
node tools/build-preview.mjs    # 重新生成 docs/preview-*.svg
```

对着 DeepSeek Harness 桌面端 0.2.1（内置 `dsh 0.2.1-rc.3`）的运行时验证过。
