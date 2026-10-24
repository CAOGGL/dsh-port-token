# dsh-port-token

![license](https://img.shields.io/badge/license-MIT-blue) ![dsh](https://img.shields.io/badge/dsh-0.2.1--rc.3-4D6BFE)

DeepSeek Harness 窗口右下角的一把钥匙。点开，看到这个实例正在监听的端口，以及远程客户端连接所需的
令牌；再点一下收起。

<img src="docs/preview-zh.svg" width="784" alt="右下角的钥匙徽标展开后的面板，浅色与深色主题">

[English](README.md)

## 安装

DeepSeek Harness 桌面端自带一条 `dsh` 命令，`desktop` 这个 profile 只能交给它管：

```powershell
$dsh = "$env:LOCALAPPDATA\Programs\DeepSeek Harness\resources\runtime\cli\bin\dsh.cmd"
& $dsh plugin --profile desktop add github:CAOGGL/dsh-port-token
```

重启 DeepSeek Harness，钥匙就在右下角。要改插件本身，把最后一段换成
`link:C:\path\to\dsh-port-token-plugin` 装本地检出。

## 用法

| 操作 | 结果 |
| --- | --- |
| 点钥匙 | 面板打开，钥匙变成叉号 |
| 再点一次、按 `Esc`、或点面板旁边的空白 | 收起 |
| 点 `复制` | 只复制这一项，按钮短暂显示 `已复制` |

端口和令牌在每次展开时重新读取，重启后不会把旧端口留在屏幕上。

## 卸载

```powershell
& $dsh plugin --profile desktop remove dsh-port-token
```

---

MIT © 2026 CAOGGL · [实现原理](docs/how-it-works.zh-CN.md)
