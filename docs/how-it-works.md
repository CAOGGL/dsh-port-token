# How it works

The whole plugin is two files. This page explains why there are two.

## The page cannot know either number

`dsh web` prints the remote-access token once, at startup:

```text
dsh web: http://127.0.0.1:19387/?token=…
```

The page trades that token for an HttpOnly cookie and is then redirected to a clean URL, so later
script on that page cannot read it. The port is the same story: with `--port 0` the OS picks one and
only the host process knows which.

Both facts live in the host process. That is the whole reason for two halves.

## Host half — `lib/index.js`

One exact route, `GET /dsh-port-token/info`, answering with:

```json
{ "ok": true, "host": "127.0.0.1", "port": 19387,
  "origin": "http://127.0.0.1:19387", "url": "http://127.0.0.1:19387/?token=…", "token": "…" }
```

It reads `ctx.webServer.port` and `ctx.connection.authenticatedUrl()`, and admits each request through
`ctx.connection.admit(req)` — the same Host/Origin fence and browser-session check that guards `/api`:

- no session cookie → `401`
- cross-site origin → `403`
- anything but `GET` → `405`
- every response carries `cache-control: no-store`

Anyone who can read that JSON could already drive this harness, so the route grants no new privilege.

## Browser half — `lib/client.js`

The badge registers into the shell’s `shell.overlay` slot, which `dsh-client-ui-layout` renders as a
layer over the three columns. React comes from the page’s own module table, so there is no bundler, no
build step and no `dsh.client.external` to declare — the file is plain JS behind
`window.__ModuleLoader__.load`.

The panel fetches the route every time it opens, which is why a restarted harness never shows a stale
port. The key ⇄ cross morph is two stacked SVGs and a CSS transition.

## Working on it

```powershell
npm test                        # route contract + render tests, offline, no node_modules
node tools/build-preview.mjs    # regenerate docs/preview-*.svg
```

Verified against the runtime bundled with DeepSeek Harness Desktop 0.2.1 (`dsh 0.2.1-rc.3`).
