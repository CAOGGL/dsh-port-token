# dsh-port-token

![license](https://img.shields.io/badge/license-MIT-blue) ![dsh](https://img.shields.io/badge/dsh-0.2.1--rc.3-4D6BFE)

A key in the bottom-right corner of the DeepSeek Harness window. Click it to see the port this
instance is listening on and the token a remote client needs to connect. Click again to dismiss.

<img src="docs/preview-en.svg" width="784" alt="The key badge open in the bottom-right corner, in light and dark themes">

[中文](README.zh-CN.md)

## Install

DeepSeek Harness Desktop ships its own `dsh` command, and only that one may manage the `desktop`
profile:

```powershell
$dsh = "$env:LOCALAPPDATA\Programs\DeepSeek Harness\resources\runtime\cli\bin\dsh.cmd"
& $dsh plugin --profile desktop add github:CAOGGL/dsh-port-token
```

Restart DeepSeek Harness, and the key is in the corner. Working on the plugin itself? Point the same
command at your checkout with `link:C:\path\to\dsh-port-token-plugin`.

## Usage

| Action | Result |
| --- | --- |
| click the key | the panel opens, the key becomes a cross |
| click it again, press `Esc`, or click beside the panel | it closes |
| click `Copy` | copies that one value; the label reads `Copied` for a moment |

Port and token are fetched again every time the panel opens, so a restart never leaves a stale port
on screen.

## Uninstall

```powershell
& $dsh plugin --profile desktop remove dsh-port-token
```

---

MIT © 2026 CAOGGL · [How it works](docs/how-it-works.md)
