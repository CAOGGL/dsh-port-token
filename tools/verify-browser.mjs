// Verifies the browser half in Node: bundle registration, slot wiring, and the
// rendered markup for every read state, driven by a minimal hook runtime.
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = dirname(dirname(fileURLToPath(import.meta.url)))
const code = readFileSync(join(root, 'lib/client.js'), 'utf8')

// ---------------------------------------------------------------------------
// Minimal element / hook runtime (no React in this environment)
// ---------------------------------------------------------------------------
const control = { dirty: false }

function createElement(type, props, ...children) {
	const element = { type, props: { ...(props ?? {}) } }
	if (children.length === 1) element.props.children = children[0]
	else if (children.length > 1) element.props.children = children
	return element
}

function makeHooks() {
	const cells = []
	const run = { index: 0, pending: [] }
	const shim = {
		createElement,
		useState(initial) {
			const i = run.index++
			if (cells[i] === undefined) cells[i] = { value: typeof initial === 'function' ? initial() : initial }
			const cell = cells[i]
			return [
				cell.value,
				(next) => {
					const value = typeof next === 'function' ? next(cell.value) : next
					if (Object.is(value, cell.value)) return
					cell.value = value
					control.dirty = true
				},
			]
		},
		useEffect(fn, deps) {
			const i = run.index++
			const cell = cells[i] ?? (cells[i] = { deps: undefined })
			const changed =
				cell.deps === undefined ||
				deps === undefined ||
				deps.length !== cell.deps.length ||
				deps.some((dep, k) => !Object.is(dep, cell.deps[k]))
			if (!changed) return
			cell.deps = deps
			run.pending.push({ i, fn })
		},
		useRef(initial) {
			const i = run.index++
			if (cells[i] === undefined) cells[i] = { current: initial }
			return cells[i]
		},
	}
	return { shim, run, cells }
}

// ---------------------------------------------------------------------------
// Fake browser environment
// ---------------------------------------------------------------------------
function createEnv(options = {}) {
	const state = {
		baseURI: options.baseURI ?? 'http://127.0.0.1:19387/',
		fetchCalls: [],
		fetchImpl: options.fetchImpl,
		clipboardWrites: [],
		styleTags: [],
		listeners: new Map(),
		docListeners: new Map(),
		timers: new Map(),
		nextTimer: 1,
	}

	const document = {
		baseURI: state.baseURI,
		head: {
			appendChild(el) {
				state.styleTags.push(el)
				return el
			},
		},
		body: { appendChild() {} },
		addEventListener(type, fn, capture) {
			const list = state.docListeners.get(type) ?? []
			list.push({ fn, capture })
			state.docListeners.set(type, list)
		},
		removeEventListener(type, fn) {
			const list = state.docListeners.get(type) ?? []
			const at = list.findIndex((entry) => entry.fn === fn)
			if (at >= 0) list.splice(at, 1)
		},
		querySelector(selector) {
			const match = /data-plugin-css="([^"]+)"/.exec(selector)
			if (match === null) return null
			return state.styleTags.find((el) => el.dataset.pluginCss === match[1]) ?? null
		},
		createElement(tag) {
			return {
				tagName: tag,
				dataset: {},
				textContent: '',
				value: '',
				style: {},
				setAttribute() {},
				select() {},
				remove() {
					const at = state.styleTags.indexOf(this)
					if (at >= 0) state.styleTags.splice(at, 1)
				},
			}
		},
		execCommand: () => true,
	}

	const window = {
		setTimeout(fn) {
			const id = state.nextTimer++
			state.timers.set(id, fn)
			return id
		},
		clearTimeout(id) {
			state.timers.delete(id)
		},
		addEventListener(type, fn) {
			const list = state.listeners.get(type) ?? []
			list.push(fn)
			state.listeners.set(type, list)
		},
		removeEventListener(type, fn) {
			const list = state.listeners.get(type) ?? []
			const at = list.indexOf(fn)
			if (at >= 0) list.splice(at, 1)
		},
	}

	const navigator = {
		clipboard: {
			async writeText(text) {
				state.clipboardWrites.push(text)
			},
		},
	}

	const defaultBody = { ok: true, port: 19387, token: 'tok-abc', url: 'http://127.0.0.1:19387/?token=tok-abc' }
	const fetch = async (url, init) => {
		state.fetchCalls.push({ url: String(url), init })
		const impl = state.fetchImpl ?? (() => ({ status: 200, body: defaultBody }))
		const reply = impl(String(url), init)
		return {
			ok: reply.status >= 200 && reply.status < 300,
			status: reply.status,
			async json() {
				return reply.body
			},
		}
	}

	let registration = null
	window.__ModuleLoader__ = {
		load(entry) {
			registration = entry
		},
	}

	new Function('window', 'document', 'fetch', 'navigator', code)(window, document, fetch, navigator)
	assert.ok(registration !== null, 'bundle called window.__ModuleLoader__.load')

	return { state, registration, window, document, navigator }
}

// ---------------------------------------------------------------------------
// Tree helpers
// ---------------------------------------------------------------------------
function expand(node) {
	if (node === null || node === undefined || typeof node !== 'object') return node
	if (Array.isArray(node)) return node.map(expand)
	if (typeof node.type === 'function') return expand(node.type(node.props))
	const { children } = node.props
	return { ...node, props: { ...node.props, ...(children === undefined ? {} : { children: expand(children) }) } }
}

function walk(node, visit) {
	if (node === null || node === undefined || typeof node !== 'object') return
	if (Array.isArray(node)) {
		for (const child of node) walk(child, visit)
		return
	}
	visit(node)
	walk(node.props?.children, visit)
}

function find(tree, predicate) {
	const out = []
	walk(tree, (node) => {
		if (predicate(node)) out.push(node)
	})
	return out
}

const byClass = (tree, cls) =>
	find(tree, (node) => typeof node.props?.className === 'string' && node.props.className.split(/\s+/).includes(cls))

function collectText(node, out = []) {
	if (node === null || node === undefined) return out
	if (typeof node === 'string' || typeof node === 'number') {
		out.push(String(node))
		return out
	}
	if (Array.isArray(node)) {
		for (const child of node) collectText(child, out)
		return out
	}
	if (typeof node !== 'object') return out
	collectText(node.props?.children, out)
	return out
}

const textOf = (tree) => collectText(tree).join(' ')

function requireReact(env) {
	return (specifier) => {
		if (specifier === 'react') return env.hooks.shim
		throw new Error(`unexpected require(${JSON.stringify(specifier)})`)
	}
}

// ---------------------------------------------------------------------------
// A mounted badge driver
// ---------------------------------------------------------------------------
function mount(env, localeDict) {
	assert.equal(env.registration.id, 'dsh-port-token')
	const exports = env.registration.factory(requireReact(env))
	assert.equal(exports.name, 'port-token')
	assert.deepEqual(exports.inject, ['slots', 'locale'])

	const t = (key) => localeDict[key] ?? key
	const props = { t }
	let tree = null

	async function render() {
		for (let pass = 0; pass < 20; pass += 1) {
			control.dirty = false
			env.hooks.run.index = 0
			env.hooks.run.pending = []
			tree = expand(exports.AccessBadge(props))
			const pending = env.hooks.run.pending
			env.hooks.run.pending = []
			for (const job of pending) {
				const previous = env.hooks.cells[job.i].cleanup
				if (typeof previous === 'function') previous()
				const cleanup = job.fn()
				env.hooks.cells[job.i].cleanup = typeof cleanup === 'function' ? cleanup : undefined
			}
			await new Promise((resolve) => setImmediate(resolve))
			if (!control.dirty) break
		}
		return tree
	}

	function trigger() {
		const [button] = byClass(tree, 'dpt-trigger')
		assert.ok(button, 'trigger button rendered')
		return button
	}

	async function click(element) {
		assert.equal(typeof element.props.onClick, 'function', 'element is clickable')
		element.props.onClick()
		return render()
	}

	return {
		exports,
		t,
		render,
		trigger,
		click,
		get tree() {
			return tree
		},
	}
}

// ---------------------------------------------------------------------------
// Copy under test
// ---------------------------------------------------------------------------
const zh = {
	'trigger.show': '查看本次启动信息',
	'trigger.hide': '收起本次启动信息',
	'panel.title': '本次启动',
	'field.port': '端口',
	'field.token': '远程令牌',
	'field.url': '连接地址',
	'action.copy': '复制',
	'action.copied': '已复制',
	'state.loading': '正在读取…',
	'state.unauthenticated': '浏览器会话已失效，请用启动链接重新打开页面。',
	'state.forbidden': '请求来源不受信任。',
	'state.missingHost': '主进程半边未启用：找不到 /dsh-port-token/info 路由。',
	'state.error': '读取失败',
	'state.retry': '重试',
	'panel.hint': '令牌等同登录凭据，请勿分享给他人。',
}

// --- 1. plugin wiring ------------------------------------------------------
{
	const env = createEnv()
	env.hooks = makeHooks()
	const effects = []
	const localeRegistrations = []
	const injects = []
	const registrations = []
	const ctx = {
		effect(callback, label) {
			effects.push(label)
			return callback()
		},
		locale: {
			register(namespace, dicts) {
				localeRegistrations.push({ namespace, dicts })
				return () => {}
			},
			bind: () => () => '',
		},
		slots: {
			inject(key, callback) {
				injects.push(key)
				return callback()
			},
			register(options, component) {
				registrations.push({ options, component })
				return () => {}
			},
		},
	}
	const exports = env.registration.factory(requireReact(env))
	exports.apply(ctx)

	assert.deepEqual(effects, ['port-token: locale', 'port-token: styles'])
	assert.equal(localeRegistrations.length, 1)
	assert.equal(localeRegistrations[0].namespace, 'port-token')
	assert.deepEqual(Object.keys(localeRegistrations[0].dicts).sort(), ['en', 'zh'])
	assert.deepEqual(
		Object.keys(localeRegistrations[0].dicts.zh).sort(),
		Object.keys(localeRegistrations[0].dicts.en).sort(),
		'both dictionaries carry the same keys',
	)
	assert.deepEqual(injects, ['shell.overlay'])
	assert.equal(registrations.length, 1)
	assert.deepEqual(registrations[0].options, { name: 'shell.overlay', id: 'port-token', locale: 'port-token' })
	assert.equal(typeof registrations[0].component, 'function')
	assert.equal(env.state.styleTags.length, 1, 'stylesheet injected once')
	assert.match(env.state.styleTags[0].dataset.pluginCss, /dsh-port-token/)
	assert.match(env.state.styleTags[0].textContent, /\.dpt-trigger\{/)
}

// a second apply must not duplicate the stylesheet
{
	const env = createEnv()
	env.hooks = makeHooks()
	const ctx = {
		effect: (callback) => callback(),
		locale: { register: () => () => {}, bind: () => () => '' },
		slots: { inject: (key, callback) => callback(), register: () => () => {} },
	}
	const exports = env.registration.factory(requireReact(env))
	exports.apply(ctx)
	exports.apply(ctx)
	assert.equal(env.state.styleTags.length, 1, 'stylesheet stays single across applies')
}

// a hot reload swaps module instances: whichever dispose order wins, the sheet stays
{
	const disposersFor = (env) => {
		const exports = env.registration.factory(requireReact(env))
		const disposers = []
		const ctx = {
			effect(callback) {
				const disposer = callback()
				disposers.push(disposer)
				return disposer
			},
			locale: { register: () => () => {}, bind: () => () => '' },
			slots: { inject: (key, callback) => callback(), register: () => () => {} },
		}
		exports.apply(ctx)
		return disposers[1]
	}

	// new instance applies first, old instance disposes second
	const overlapping = createEnv()
	overlapping.hooks = makeHooks()
	const outgoing = disposersFor(overlapping)
	const incoming = disposersFor(overlapping)
	assert.equal(overlapping.state.styleTags.length, 1)
	outgoing()
	assert.equal(overlapping.state.styleTags.length, 1, 'outgoing dispose keeps the incoming sheet')
	incoming()
	assert.equal(overlapping.state.styleTags.length, 0, 'last claim removes it')

	// old instance disposes first, new instance applies second
	const sequential = createEnv()
	sequential.hooks = makeHooks()
	const first = disposersFor(sequential)
	first()
	assert.equal(sequential.state.styleTags.length, 0)
	disposersFor(sequential)
	assert.equal(sequential.state.styleTags.length, 1, 'fresh sheet for the new instance')
}

// --- 2. closed state -------------------------------------------------------
const env = createEnv()
env.hooks = makeHooks()
const badge = mount(env, zh)
await badge.render()

assert.equal(badge.tree.type, 'div')
assert.equal(badge.tree.props.className, 'dpt-root')
assert.equal(byClass(badge.tree, 'dpt-panel').length, 0, 'panel hidden while collapsed')
const trigger = badge.trigger()
assert.equal(trigger.props.type, 'button')
assert.equal(trigger.props['aria-expanded'], false)
assert.equal(trigger.props.title, zh['trigger.show'])
assert.equal(trigger.props['aria-label'], zh['trigger.show'])
assert.equal(env.state.fetchCalls.length, 0, 'no request before the first open')

// --- 3. open: fetch through the document-relative route, then render ------
await badge.click(trigger)
assert.equal(badge.trigger().props['aria-expanded'], true)
assert.equal(byClass(badge.tree, 'dpt-panel').length, 1, 'panel visible while open')
assert.equal(env.state.fetchCalls.length, 1)
assert.equal(env.state.fetchCalls[0].url, 'http://127.0.0.1:19387/dsh-port-token/info')
assert.equal(env.state.fetchCalls[0].init.credentials, 'same-origin')

const readyText = textOf(badge.tree)
assert.match(readyText, /本次启动/)
assert.match(readyText, /19387/, 'port value rendered')
assert.match(readyText, /tok-abc/, 'token value rendered')
assert.match(readyText, /http:\/\/127\.0\.0\.1:19387\/\?token=tok-abc/, 'url value rendered')
assert.equal(byClass(badge.tree, 'dpt-value').length, 3)
assert.equal(byClass(badge.tree, 'dpt-copy').length, 3)

// --- 4. copy feedback ------------------------------------------------------
const copies = byClass(badge.tree, 'dpt-copy')
copies[1].props.onClick()
await badge.render()
assert.deepEqual(env.state.clipboardWrites, ['tok-abc'])
assert.match(textOf(badge.tree), /已复制/)
for (const run of [...env.state.timers.values()]) run()
env.state.timers.clear()
await badge.render()
assert.doesNotMatch(textOf(badge.tree), /已复制/)

// --- 5. Escape collapses ---------------------------------------------------
const [onKeyDown] = env.state.listeners.get('keydown')
onKeyDown({ key: 'Escape' })
await badge.render()
assert.equal(byClass(badge.tree, 'dpt-panel').length, 0)
assert.equal(badge.trigger().props['aria-expanded'], false)
assert.equal(env.state.listeners.get('keydown').length, 0, 'key listener removed on close')

// --- 6. reopening re-reads the Host ---------------------------------------
await badge.click(badge.trigger())
assert.equal(env.state.fetchCalls.length, 2, 'each open re-reads the instance facts')

// --- 7. a 401 read explains itself ----------------------------------------
{
	const failing = createEnv({ fetchImpl: () => ({ status: 401, body: { ok: false, code: 'unauthenticated' } }) })
	failing.hooks = makeHooks()
	const failed = mount(failing, zh)
	await failed.render()
	await failed.click(failed.trigger())
	assert.match(textOf(failed.tree), /浏览器会话已失效/)
	assert.equal(byClass(failed.tree, 'dpt-retry').length, 1, 'retry offered')
	await failed.click(byClass(failed.tree, 'dpt-retry')[0])
	assert.equal(failing.state.fetchCalls.length, 2, 'retry re-reads')
}

// --- 8. a 404 read names the missing host half ----------------------------
{
	const failing = createEnv({ fetchImpl: () => ({ status: 404, body: null }) })
	failing.hooks = makeHooks()
	const failed = mount(failing, zh)
	await failed.render()
	await failed.click(failed.trigger())
	assert.match(textOf(failed.tree), /主进程半边未启用/)
}

// --- 9. the trigger doubles as the close affordance -----------------------
{
	const closing = createEnv()
	closing.hooks = makeHooks()
	const closed = mount(closing, zh)
	await closed.render()

	const icon = byClass(closed.tree, 'dpt-icon')
	assert.equal(icon.length, 1, 'one glyph stack in the trigger')
	assert.equal(byClass(icon[0], 'dpt-key').length, 1, 'key glyph')
	assert.equal(byClass(icon[0], 'dpt-cross').length, 1, 'cross glyph present for the morph')
	assert.equal(byClass(closed.tree, 'dpt-close').length, 0, 'no separate close button')

	assert.equal(typeof closed.tree.props.ref, 'function', 'root carries the outside-click ref')
	await closed.click(closed.trigger())
	assert.equal(byClass(closed.tree, 'dpt-panel').length, 1)
	assert.equal(byClass(closed.tree, 'dpt-close').length, 0, 'panel header has no × while open')
	await closed.click(closed.trigger())
	assert.equal(byClass(closed.tree, 'dpt-panel').length, 0, 'second press collapses')
	assert.equal(closed.trigger().props['aria-expanded'], false)
}

// --- 10. pressing beside the badge collapses it; pressing inside does not --
{
	const beside = createEnv()
	beside.hooks = makeHooks()
	const opened = mount(beside, zh)
	await opened.render()
	await opened.click(opened.trigger())

	const insideTarget = { id: 'panel-value' }
	const outsideTarget = { id: 'page' }
	opened.tree.props.ref({ contains: (target) => target === insideTarget })

	const dispatch = (target) => {
		for (const entry of beside.state.docListeners.get('pointerdown') ?? []) entry.fn({ target })
	}

	dispatch(insideTarget)
	await opened.render()
	assert.equal(byClass(opened.tree, 'dpt-panel').length, 1, 'inside press keeps it open')

	dispatch(outsideTarget)
	await opened.render()
	assert.equal(byClass(opened.tree, 'dpt-panel').length, 0, 'outside press collapses')
	assert.equal((beside.state.docListeners.get('pointerdown') ?? []).length, 0, 'document listener removed on close')
}

// --- 11. InstancePanel renders each state without effects ------------------
{
	const envPanel = createEnv()
	envPanel.hooks = makeHooks()
	const exports = envPanel.registration.factory(requireReact(envPanel))
	const t = (key) => zh[key] ?? key

	const loading = expand(exports.InstancePanel({ t, status: 'loading', copiedKey: '', onCopy() {}, onRetry() {} }))
	assert.match(textOf(loading), /正在读取/)
	assert.equal(byClass(loading, 'dpt-row').length, 0)

	const ready = expand(
		exports.InstancePanel({
			t,
			status: 'ready',
			info: { port: 3080, token: 'tk', url: 'http://127.0.0.1:3080/?token=tk' },
			copiedKey: 'token',
			onCopy() {},
			onRetry() {},
		}),
	)
	assert.deepEqual(
		byClass(ready, 'dpt-value').map((node) => collectText(node).join('')),
		['3080', 'tk', 'http://127.0.0.1:3080/?token=tk'],
	)
	assert.match(textOf(ready), /已复制/, 'copy label follows copiedKey')

	const failed = expand(
		exports.InstancePanel({
			t,
			status: 'error',
			failure: { status: 403, message: 'x' },
			copiedKey: '',
			onCopy() {},
			onRetry() {},
		}),
	)
	assert.match(textOf(failed), /请求来源不受信任/)
	assert.equal(byClass(failed, 'dpt-retry').length, 1)
}

console.log('client half: all checks passed')
