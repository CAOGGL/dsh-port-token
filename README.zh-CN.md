# dsh-port-token

给 **DeepSeek Harness** Web 界面右下角加一个钥匙徽标。点一下，看到这个 harness 正在监听的端口，以及
远程客户端连接所需的令牌；再点一下收起。

![license](https://img.shields.io/badge/license-MIT-blue)
![dsh](https://img.shields.io/badge/dsh-0.2.1--rc.3-4D6BFE)

<img src="docs/preview-zh.svg" width="784" alt="右下角的钥匙徽标展开后的面板，浅色与深色主题">

[English](README.md)

## 安装

需要 DeepSeek Harness 桌面端（自带 `dsh` 0.2.1-rc.3 或更新）。

`desktop` 这个 profile 归 Electron 应用所有，npm 装的 `dsh` 命令会被直接拒绝。用应用自带的那条：

```powershell
$dsh = "$env:LOCALAPPDATA\Programs\DeepSeek Harness\resources\runtime\cli\bin\dsh.cmd"
& $dsh plugin --profile desktop add github:CAOGGL/dsh-port-token
```

重启 DeepSeek Harness，徽标就在右下角。

要改插件本身，就改成装本地检出；刷新页面就能看到修改：

```powershell
& $dsh plugin --profile desktop add link:C:\path\to\dsh-port-token-plugin
```

`desktop` 以外的 profile 用普通的 `dsh` 就行，比如
`dsh plugin --profile web add github:CAOGGL/dsh-port-token`。

## 怎么用

| 操作 | 结果 |
| --- | --- |
| 点钥匙 | 面板打开，钥匙变成叉号 |
| 再点一次、按 `Esc`、或点面板旁边的空白 | 收起 |
| 点某一行的 `复制` | 只复制这一项，按钮短暂显示 `已复制` |

每次展开都会重新向宿主取值，所以 harness 重启后不会显示旧端口。

## 你能看到什么

- **端口**——真正绑定的那个，包括用 `--port 0` 启动的情况。
- **令牌**——`dsh web` 启动时打印的同一个远程访问令牌，把它当密码看待。
- **地址**——`http://127.0.0.1:<端口>/`，可以直接粘贴。
- 每行一个复制按钮，明暗主题自适应，中英文界面。

## 为什么要两半

`dsh web` 会拿令牌换一个 HttpOnly Cookie 再重定向到干净地址，所以页面永远读不到自己的令牌；
`--port 0` 启动时，页面甚至不知道自己的端口。这两样东西只存在于宿主进程，因此插件分成两半：

- `lib/index.js`——一个路由 `GET /dsh-port-token/info`，由 `ctx.connection.admit(req)` 把关，
  和 `/api` 用的是同一道 Host/Origin 与会话栅栏：没有 Cookie 返回 `401`，跨站来源返回 `403`，
  其他方法返回 `405`。
- `lib/client.js`——徽标本体，注册进 shell 的覆盖层槽位。没有构建步骤也不需要打包器，React 直接取自
  页面自己的模块表。

没有配置项，包里也没有别的东西。

## 卸载

```powershell
& $dsh plugin --profile desktop remove dsh-port-token
```

## 开发

```powershell
npm test                        # 两套测试，不需要 node_modules
node tools/build-preview.mjs    # 重新生成 docs/preview-*.svg
```

## 许可

MIT © 2026 CAOGGL
