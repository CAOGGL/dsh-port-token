// Verifies the Host half's route contract without a live Cordis tree.
import assert from 'node:assert/strict'
import { INFO_PATH, apply, describeInstance, inject, name } from '../lib/index.js'

function makeCtx(options = {}) {
  const routes = []
  const disposed = []
  const labels = []
  const ctx = {
    webServer: {
      port: options.port ?? 19387,
      host: options.host ?? '127.0.0.1',
      register(route) {
        routes.push(route)
        return () => disposed.push(route)
      },
    },
    connection: {
      admit: options.admit ?? (() => ({ peer: {} })),
      authenticatedUrl: options.authenticatedUrl ?? ((base) => `${base}/?token=test-token-value`),
    },
    effect(callback, label) {
      labels.push(label)
      const disposer = callback()
      assert.equal(typeof disposer, 'function', 'apply must register a disposable route')
      return disposer
    },
  }
  return { ctx, routes, disposed, labels }
}

function makeRes() {
  return {
    statusCode: undefined,
    headers: undefined,
    body: '',
    writeHead(status, headers) {
      this.statusCode = status
      this.headers = headers ?? {}
      return this
    },
    end(chunk) {
      if (chunk !== undefined) this.body += chunk
      return this
    },
  }
}

const req = (method = 'GET') => ({ method, url: INFO_PATH, headers: { host: '127.0.0.1:19387' } })

// --- plugin shape -------------------------------------------------------
assert.equal(name, 'port-token')
assert.deepEqual(inject, ['webServer', 'connection'])

// --- registration -------------------------------------------------------
{
  const { ctx, routes, disposed, labels } = makeCtx()
  apply(ctx)
  assert.equal(routes.length, 1, 'one route registered')
  assert.equal(routes[0].kind, 'exact')
  assert.equal(routes[0].path, INFO_PATH)
  assert.equal(INFO_PATH, '/dsh-port-token/info')
  assert.equal(typeof routes[0].handler, 'function')
  assert.deepEqual(labels, ['port-token: instance info route'])
  assert.deepEqual(disposed, [], 'route survives until the fiber tears down')
}

// --- describeInstance ---------------------------------------------------
{
  const facts = describeInstance({ authenticatedUrl: (base) => `${base}/?token=abc-123` }, 19387)
  assert.deepEqual(facts, {
    port: 19387,
    origin: 'http://127.0.0.1:19387',
    url: 'http://127.0.0.1:19387/?token=abc-123',
    token: 'abc-123',
  })
}

// --- authenticated GET --------------------------------------------------
{
  const { ctx, routes } = makeCtx()
  apply(ctx)
  const res = makeRes()
  routes[0].handler(req(), res)
  assert.equal(res.statusCode, 200)
  assert.equal(res.headers['content-type'], 'application/json; charset=utf-8')
  assert.equal(res.headers['cache-control'], 'no-store')
  assert.equal(res.headers['content-length'], String(Buffer.byteLength(res.body)))
  assert.deepEqual(JSON.parse(res.body), {
    ok: true,
    host: '127.0.0.1',
    port: 19387,
    origin: 'http://127.0.0.1:19387',
    url: 'http://127.0.0.1:19387/?token=test-token-value',
    token: 'test-token-value',
  })
}

// --- a port the OS assigned, not the configured one ---------------------
{
  const { ctx, routes } = makeCtx({ port: 55453 })
  apply(ctx)
  const res = makeRes()
  routes[0].handler(req(), res)
  assert.equal(JSON.parse(res.body).port, 55453)
  assert.equal(JSON.parse(res.body).url, 'http://127.0.0.1:55453/?token=test-token-value')
}

// --- refused requests ---------------------------------------------------
{
  for (const [status, code] of [
    [401, 'unauthenticated'],
    [403, 'untrusted-request'],
  ]) {
    const { ctx, routes } = makeCtx({ admit: () => ({ rejection: status }) })
    apply(ctx)
    const res = makeRes()
    routes[0].handler(req(), res)
    assert.equal(res.statusCode, status)
    assert.deepEqual(JSON.parse(res.body), { ok: false, code })
  }
}

// --- method guard -------------------------------------------------------
{
  const { ctx, routes } = makeCtx()
  apply(ctx)
  const res = makeRes()
  routes[0].handler(req('POST'), res)
  assert.equal(res.statusCode, 405)
  assert.deepEqual(res.headers, { allow: 'GET' })
  assert.equal(res.body, '')
}

// --- failure of the token read -----------------------------------------
{
  const { ctx, routes } = makeCtx({
    authenticatedUrl: () => {
      throw new Error('browserAuth is inactive')
    },
  })
  apply(ctx)
  const res = makeRes()
  routes[0].handler(req(), res)
  assert.equal(res.statusCode, 500)
  assert.deepEqual(JSON.parse(res.body), {
    ok: false,
    code: 'internal',
    message: 'browserAuth is inactive',
  })
}

// --- the route leaves with the plugin fiber -----------------------------
{
  const { ctx, routes, disposed } = makeCtx()
  const fiberDisposers = []
  ctx.effect = (callback) => {
    const disposer = callback()
    fiberDisposers.push(disposer)
    return disposer
  }
  apply(ctx)
  assert.equal(routes.length, 1)
  for (const disposer of fiberDisposers) disposer()
  assert.deepEqual(disposed, routes)
}

console.log('host half: all checks passed')
