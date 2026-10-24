/**
 * Browser half of `dsh-port-token`, wrapped for the dsh browser module
 * registry (`window.__ModuleLoader__.load`) — the same shape the shipped
 * client bundles use. React comes from the platform seed table, so nothing
 * here declares an external and no build step is involved.
 *
 * The badge mounts into the shell's `shell.overlay` seat (the AppFrame layer
 * pinned above the three columns) and renders one trigger in the page's
 * bottom-right corner. A click opens the panel with this instance's port,
 * launch token, and token-bearing URL; the next click collapses it.
 */
window.__ModuleLoader__.load({
	id: "dsh-port-token",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });

		const React = require("react");
		const h = React.createElement;

		/** Locale namespace this plugin owns. */
		const NS = "port-token";
		/** Document-relative path of the Host route (resolved against `<base href>`). */
		const INFO_PATH = "dsh-port-token/info";
		/** Slot seat the shell overlays above every column. */
		const OVERLAY_SLOT = "shell.overlay";
		/** Stable id inside that list seat. */
		const ENTRY_ID = "port-token";

		/** Simplified Chinese copy (key-set source of truth). */
		const zh = {
			"trigger.show": "查看本次启动信息",
			"trigger.hide": "收起本次启动信息",
			"panel.title": "本次启动",
			"field.port": "端口",
			"field.token": "远程令牌",
			"field.url": "连接地址",
			"action.copy": "复制",
			"action.copied": "已复制",
			"state.loading": "正在读取…",
			"state.unauthenticated": "浏览器会话已失效，请用启动链接重新打开页面。",
			"state.forbidden": "请求来源不受信任。",
			"state.missingHost": "主进程半边未启用：找不到 /dsh-port-token/info 路由。",
			"state.error": "读取失败",
			"state.retry": "重试",
			"panel.hint": "令牌等同登录凭据，请勿分享给他人。",
		};

		/** English copy: the fallback every other locale resolves through. */
		const en = {
			"trigger.show": "Show this instance",
			"trigger.hide": "Hide this instance",
			"panel.title": "This instance",
			"field.port": "Port",
			"field.token": "Remote token",
			"field.url": "Connection URL",
			"action.copy": "Copy",
			"action.copied": "Copied",
			"state.loading": "Reading…",
			"state.unauthenticated": "Browser session expired — reopen the page with the startup link.",
			"state.forbidden": "Untrusted request origin.",
			"state.missingHost": "Host half missing: the /dsh-port-token/info route is not registered.",
			"state.error": "Could not read",
			"state.retry": "Retry",
			"panel.hint": "The token is a login credential — do not share it.",
		};

		/** Stylesheet installed once per plugin lifetime and removed on dispose. */
		const CSS = `
.dpt-root{position:absolute;right:16px;bottom:16px;display:flex;flex-direction:column;align-items:flex-end;gap:10px;z-index:30}
.dpt-trigger{width:40px;height:40px;padding:0;border-radius:20px;display:inline-flex;align-items:center;justify-content:center;cursor:pointer;color:var(--dsw-alias-label-secondary);background:var(--dsw-alias-bg-layer-2);border:1px solid var(--dsw-alias-border-l2);box-shadow:var(--dsw-shadow-lv3);transition:background .15s ease,color .15s ease,transform .18s ease}
.dpt-trigger:hover{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary)}
.dpt-trigger:active{transform:scale(.94)}
.dpt-trigger[aria-expanded="true"]{color:var(--dsw-alias-brand-primary);border-color:var(--dsw-alias-brand-primary)}
.dpt-icon{position:relative;display:block;width:20px;height:20px}
.dpt-key,.dpt-cross{position:absolute;inset:0;transition:opacity .16s ease,transform .26s cubic-bezier(.3,.9,.2,1)}
.dpt-cross{opacity:0;transform:rotate(-60deg) scale(.5);transition-delay:.04s}
.dpt-trigger[aria-expanded="true"] .dpt-key{opacity:0;transform:rotate(60deg) scale(.5)}
.dpt-trigger[aria-expanded="true"] .dpt-cross{opacity:1;transform:rotate(0deg) scale(1)}
.dpt-panel{width:328px;max-width:calc(100vw - 32px);box-sizing:border-box;padding:14px 14px 12px;border-radius:14px;background:var(--dsw-alias-bg-layer-2);border:1px solid var(--dsw-alias-border-l2);box-shadow:var(--dsw-shadow-lv3);color:var(--dsw-alias-label-primary);font-size:12px;line-height:1.5;animation:dpt-in .16s cubic-bezier(.2,.8,.2,1)}
@keyframes dpt-in{from{opacity:0;transform:translateY(6px) scale(.98)}to{opacity:1;transform:none}}
.dpt-title{display:block;margin-bottom:10px;font-size:13px;font-weight:600}
.dpt-row{display:flex;flex-direction:column;gap:4px;margin-bottom:10px}
.dpt-label{font-size:11px;color:var(--dsw-alias-label-secondary)}
.dpt-line{display:flex;align-items:flex-start;gap:6px}
.dpt-value{flex:1 1 auto;min-width:0;margin:0;padding:6px 8px;border-radius:8px;background:var(--dsw-alias-bg-layer-1);border:1px solid var(--dsw-alias-border-l2);font-family:var(--ds-font-family-code,ui-monospace,SFMono-Regular,Menlo,monospace);font-size:11px;line-height:1.45;word-break:break-all;user-select:all}
.dpt-copy{flex:0 0 auto;cursor:pointer;padding:6px 8px;border-radius:8px;border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-button-elevated-fill);color:var(--dsw-alias-label-secondary);font-size:11px;white-space:nowrap}
.dpt-copy:hover{color:var(--dsw-alias-label-primary);background:var(--dsw-alias-interactive-bg-hover)}
.dpt-state{color:var(--dsw-alias-label-secondary);padding-bottom:10px}
.dpt-state[data-tone="error"]{color:var(--dsw-alias-state-error-primary)}
.dpt-retry{cursor:pointer;margin-top:8px;padding:5px 10px;border-radius:8px;border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-button-elevated-fill);color:var(--dsw-alias-label-primary);font-size:11px}
.dpt-hint{margin:0;font-size:11px;color:var(--dsw-alias-label-tertiary)}
@media (prefers-reduced-motion:reduce){.dpt-trigger,.dpt-key,.dpt-cross{transition:none}.dpt-panel{animation:none}}
`;

		/** Page-global key counting live stylesheet users across module instances. */
		const STYLE_KEY = "__dshPortTokenStyles__";

		/**
		 * Inject the stylesheet once, and keep it alive while any instance of this
		 * module still wants it. The count lives on `window` rather than in this
		 * closure because a hot reload builds a NEW module instance whose apply()
		 * may overlap the outgoing one's dispose(); a per-instance count would let
		 * either order tear the stylesheet out from under the survivor.
		 * @returns the disposer releasing this instance's claim.
		 */
		function installStyles() {
			const registry = (window[STYLE_KEY] ??= { users: 0 });
			const selector = `style[data-plugin-css=${JSON.stringify("dsh-port-token/styles")}]`;
			if (document.querySelector(selector) === null) {
				const tag = document.createElement("style");
				tag.dataset.pluginCss = "dsh-port-token/styles";
				tag.dataset.plugin = "dsh-port-token";
				tag.textContent = CSS;
				document.head.appendChild(tag);
			}
			registry.users += 1;
			return () => {
				registry.users -= 1;
				if (registry.users > 0) return;
				registry.users = 0;
				document.querySelector(selector)?.remove();
			};
		}

		/**
		 * Read the Host's instance facts through the document-relative route.
		 * @returns the parsed payload; rejects with `status` and `code` attached.
		 */
		async function readInstance() {
			const response = await fetch(new URL(INFO_PATH, document.baseURI), {
				method: "GET",
				credentials: "same-origin",
				headers: { accept: "application/json" },
			});
			const body = await response.json().catch(() => null);
			if (!response.ok || body === null || body.ok !== true) {
				const error = new Error((body && body.code) || `http-${response.status}`);
				error.status = response.status;
				error.code = body && body.code;
				throw error;
			}
			return body;
		}

		/**
		 * Copy text through the async clipboard, falling back to the selection
		 * command on insecure origins (plain-HTTP LAN pages).
		 * @param text - the string to place on the clipboard.
		 * @returns whether the copy was accepted.
		 */
		async function writeClipboard(text) {
			try {
				if (navigator.clipboard !== undefined && navigator.clipboard !== null) {
					await navigator.clipboard.writeText(text);
					return true;
				}
			} catch {}
			try {
				const area = document.createElement("textarea");
				area.value = text;
				area.setAttribute("readonly", "");
				area.style.position = "fixed";
				area.style.top = "-1000px";
				area.style.opacity = "0";
				document.body.appendChild(area);
				area.select();
				const copied = document.execCommand("copy");
				area.remove();
				return copied;
			} catch {
				return false;
			}
		}

		/**
		 * Map one failed read onto user-facing copy.
		 * @param t - bound locale function.
		 * @param failure - the rejection from {@link readInstance}.
		 * @returns the message to display.
		 */
		function describeFailure(t, failure) {
			if (failure.status === 401) return t("state.unauthenticated");
			if (failure.status === 403) return t("state.forbidden");
			if (failure.status === 404) return t("state.missingHost");
			return `${t("state.error")}${failure.message === undefined ? "" : `: ${failure.message}`}`;
		}

		/** Shared geometry for both glyphs, so one morphs into the other in place. */
		const GLYPH = {
			viewBox: "0 0 24 24",
			width: 20,
			height: 20,
			fill: "none",
			stroke: "currentColor",
			strokeWidth: 1.8,
			strokeLinecap: "round",
			strokeLinejoin: "round",
			"aria-hidden": true,
		};

		/** The key: what the badge shows while the panel is collapsed. */
		const KEY_GLYPH = h(
			"svg",
			{ ...GLYPH, className: "dpt-key" },
			h("circle", { cx: 8, cy: 16, r: 3.2 }),
			h("path", { d: "M10.4 13.6 19.5 4.5" }),
			h("path", { d: "M16.6 7.4 19.2 10" }),
		);

		/** The cross: what the key rotates into while the panel is open. */
		const CROSS_GLYPH = h(
			"svg",
			{ ...GLYPH, className: "dpt-cross" },
			h("path", { d: "M6.5 6.5 17.5 17.5" }),
			h("path", { d: "M17.5 6.5 6.5 17.5" }),
		);

		/**
		 * One labelled value with its copy affordance.
		 * @param props - locale seat, label, value, and copy state.
		 * @returns the row element.
		 */
		function ValueRow(props) {
			const copied = props.copiedKey === props.rowKey;
			return h(
				"div",
				{ className: "dpt-row" },
				h("div", { className: "dpt-label" }, props.label),
				h(
					"div",
					{ className: "dpt-line" },
					h("code", { className: "dpt-value" }, props.value),
					h(
						"button",
						{
							type: "button",
							className: "dpt-copy",
							onClick: () => props.onCopy(props.rowKey, props.value),
						},
						copied ? props.t("action.copied") : props.t("action.copy"),
					),
				),
			);
		}

		/**
		 * The expanded panel; pure so every read state renders without effects.
		 * @param props - locale seat, read state, and the panel callbacks.
		 * @returns the panel element.
		 */
		function InstancePanel(props) {
			const t = props.t;
			let body;
			if (props.status === "ready") {
				body = [
					h(ValueRow, {
						key: "port",
						rowKey: "port",
						t,
						label: t("field.port"),
						value: String(props.info.port),
						copiedKey: props.copiedKey,
						onCopy: props.onCopy,
					}),
					h(ValueRow, {
						key: "token",
						rowKey: "token",
						t,
						label: t("field.token"),
						value: props.info.token,
						copiedKey: props.copiedKey,
						onCopy: props.onCopy,
					}),
					h(ValueRow, {
						key: "url",
						rowKey: "url",
						t,
						label: t("field.url"),
						value: props.info.url,
						copiedKey: props.copiedKey,
						onCopy: props.onCopy,
					}),
				];
			} else if (props.status === "error") {
				body = h(
					"div",
					{ className: "dpt-state", "data-tone": "error" },
					h("div", {}, describeFailure(t, props.failure)),
					h("button", { type: "button", className: "dpt-retry", onClick: props.onRetry }, t("state.retry")),
				);
			} else {
				body = h("div", { className: "dpt-state" }, t("state.loading"));
			}

			return h(
				"div",
				{ className: "dpt-panel", role: "dialog", "aria-label": t("panel.title") },
				h("div", { className: "dpt-title" }, t("panel.title")),
				body,
				h("p", { className: "dpt-hint" }, t("panel.hint")),
			);
		}

		/**
		 * The badge: one bottom-right trigger plus the collapsible panel above it.
		 * The trigger is the close affordance too — its key rotates into a cross
		 * while open — and a press anywhere outside the badge collapses it.
		 * Each open re-reads the Host, so a restarted instance never shows a stale
		 * port or token.
		 * @param props - slot props; `t` is the bound `port-token` locale seat.
		 * @returns the overlay element.
		 */
		function AccessBadge(props) {
			const t = props.t;
			const [open, setOpen] = React.useState(false);
			const [attempt, setAttempt] = React.useState(0);
			const [result, setResult] = React.useState({ status: "idle" });
			const [copiedKey, setCopiedKey] = React.useState("");
			const timer = React.useRef(0);
			const rootRef = React.useRef(null);

			React.useEffect(() => {
				if (!open) return undefined;
				let live = true;
				setResult({ status: "loading" });
				readInstance().then(
					(info) => {
						if (live) setResult({ status: "ready", info });
					},
					(failure) => {
						if (live) setResult({ status: "error", failure });
					},
				);
				return () => {
					live = false;
				};
			}, [open, attempt]);

			React.useEffect(() => {
				if (!open) return undefined;
				const onKeyDown = (event) => {
					if (event.key === "Escape") setOpen(false);
				};
				window.addEventListener("keydown", onKeyDown);
				return () => window.removeEventListener("keydown", onKeyDown);
			}, [open]);

			React.useEffect(() => {
				if (!open) return undefined;
				const onPointerDown = (event) => {
					const root = rootRef.current;
					if (root !== null && root !== undefined && root.contains(event.target)) return;
					setOpen(false);
				};
				document.addEventListener("pointerdown", onPointerDown, true);
				return () => document.removeEventListener("pointerdown", onPointerDown, true);
			}, [open]);

			React.useEffect(
				() => () => {
					window.clearTimeout(timer.current);
				},
				[],
			);

			const copy = (rowKey, value) => {
				writeClipboard(value).then((done) => {
					if (!done) return;
					setCopiedKey(rowKey);
					window.clearTimeout(timer.current);
					timer.current = window.setTimeout(() => setCopiedKey(""), 1400);
				});
			};

			return h(
				"div",
				{
					className: "dpt-root",
					ref: (node) => {
						rootRef.current = node;
					},
				},
				open
					? h(InstancePanel, {
							t,
							status: result.status,
							info: result.info,
							failure: result.failure,
							copiedKey,
							onCopy: copy,
							onRetry: () => setAttempt((n) => n + 1),
						})
					: null,
				h(
					"button",
					{
						type: "button",
						className: "dpt-trigger",
						"aria-expanded": open,
						"aria-label": open ? t("trigger.hide") : t("trigger.show"),
						title: open ? t("trigger.hide") : t("trigger.show"),
						onClick: () => setOpen((value) => !value),
					},
					h("span", { className: "dpt-icon" }, KEY_GLYPH, CROSS_GLYPH),
				),
			);
		}

		/**
		 * Client plugin body: own the locale namespace, install the stylesheet,
		 * then mount the badge into the shell overlay for the lifetime of that
		 * slot's declaration.
		 * @param ctx - client root context.
		 */
		function apply(ctx) {
			ctx.effect(() => ctx.locale.register(NS, { zh, en }), "port-token: locale");
			ctx.effect(() => installStyles(), "port-token: styles");
			ctx.slots.inject(OVERLAY_SLOT, () =>
				ctx.slots.register({ name: OVERLAY_SLOT, id: ENTRY_ID, locale: NS }, AccessBadge),
			);
		}

		exports.name = "port-token";
		exports.inject = ["slots", "locale"];
		exports.apply = apply;
		exports.AccessBadge = AccessBadge;
		exports.InstancePanel = InstancePanel;
		return module.exports;
	},
});
