#!/usr/bin/env node
/**
 * Render the README preview figures from the panel's real geometry and the
 * resolved dsh design tokens, so the picture cannot drift from lib/client.js
 * by hand. No dependencies, no build step.
 *
 *   node tools/build-preview.mjs
 *
 * Writes docs/preview-en.svg and docs/preview-zh.svg.
 */
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

/** Resolved values of the --dsw-alias-* tokens the panel stylesheet reads. */
const THEMES = {
	light: {
		page: "#ffffff",
		layer1: "#ffffff",
		layer2: "#ffffff",
		border: "#0000001a",
		labelPrimary: "#0f1115",
		labelSecondary: "#61666b",
		labelTertiary: "#81858c",
		brand: "#0f1115",
		elevatedFill: "#ffffff",
	},
	dark: {
		page: "#151517",
		layer1: "#232324",
		layer2: "#2c2c2e",
		border: "#ffffff1f",
		labelPrimary: "#f9fafb",
		labelSecondary: "#cfd3d6",
		labelTertiary: "#adb2b8",
		brand: "#f9fafb",
		elevatedFill: "#43454a",
	},
};

const COPY = {
	en: {
		title: "This instance",
		port: "Port",
		token: "Remote token",
		url: "Connection URL",
		copy: "Copy",
		hint: "The token is a login credential \u2014 do not share it.",
	},
	zh: {
		title: "\u672c\u6b21\u542f\u52a8",
		port: "\u7aef\u53e3",
		token: "\u8fdc\u7a0b\u4ee4\u724c",
		url: "\u8fde\u63a5\u5730\u5740",
		copy: "\u590d\u5236",
		hint: "\u4ee4\u724c\u7b49\u540c\u767b\u5f55\u51ed\u636e\uff0c\u8bf7\u52ff\u5206\u4eab\u7ed9\u4ed6\u4eba\u3002",
	},
};

/** Illustrative values: the token is deliberately truncated. */
const VALUES = {
	port: "19387",
	token: "4f2a9c1e8b7d3a6f\u2026",
	url: "http://127.0.0.1:19387/",
};

const SCENE_W = 380;
const SCENE_H = 344;
const SCENE_GAP = 24;
const PANEL_W = 328;
const PANEL_H = 255.5;
const UI = "system-ui, -apple-system, 'Segoe UI', 'PingFang SC', 'Microsoft YaHei', sans-serif";
const CODE = "ui-monospace, SFMono-Regular, Menlo, monospace";

const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/** The open badge plus panel, laid out with the same box math the stylesheet uses. */
function layout(theme, copy) {
	const token = THEMES[theme];
	const panelRight = SCENE_W - 16;
	const panelX = panelRight - PANEL_W;
	const pad = 15;
	const contentX = panelX + pad;
	const contentW = PANEL_W - pad * 2;
	const copyW = 44;
	const chipW = contentW - copyW - 6;
	const panelY = SCENE_H - 16 - PANEL_H;
	const rows = [
		[copy.port, VALUES.port],
		[copy.token, VALUES.token],
		[copy.url, VALUES.url],
	];

	const parts = [];
	let y = panelY + pad;
	parts.push(`<text x="${contentX}" y="${(y + 10.2).toFixed(1)}" fill="${token.labelPrimary}" font-size="13" font-weight="600">${esc(copy.title)}</text>`);
	y += 19.5 + 10;
	for (const [label, value] of rows) {
		parts.push(`<text x="${contentX}" y="${(y + 8.6).toFixed(1)}" fill="${token.labelSecondary}" font-size="11">${esc(label)}</text>`);
		y += 16.5 + 4;
		const baseline = (y + 19).toFixed(1);
		const chipY = y.toFixed(1);
		parts.push(
			`<rect x="${contentX}" y="${chipY}" width="${chipW}" height="30" rx="8" fill="${token.layer1}" stroke="${token.border}"/>`,
			`<text x="${contentX + 9}" y="${baseline}" fill="${token.labelPrimary}" font-size="11" font-family="${CODE}">${esc(value)}</text>`,
			`<rect x="${contentX + chipW + 6}" y="${chipY}" width="${copyW}" height="30" rx="8" fill="${token.elevatedFill}" stroke="${token.border}"/>`,
			`<text x="${contentX + chipW + 6 + copyW / 2}" y="${baseline}" fill="${token.labelSecondary}" font-size="11" text-anchor="middle">${esc(copy.copy)}</text>`,
		);
		y += 30 + 10;
	}
	parts.push(`<text x="${contentX}" y="${(y + 8.6).toFixed(1)}" fill="${token.labelTertiary}" font-size="11">${esc(copy.hint)}</text>`);

	const triggerX = panelRight - 40;
	const triggerY = panelY - 10 - 40;
	const glyph = `<g transform="translate(${triggerX + 10} ${(triggerY + 10).toFixed(1)}) scale(0.8333)" stroke="${token.brand}" stroke-width="1.8" stroke-linecap="round" fill="none"><path d="M6.5 6.5 17.5 17.5"/><path d="M17.5 6.5 6.5 17.5"/></g>`;

	return [
		`<rect x="${panelX}" y="${panelY.toFixed(1)}" width="${PANEL_W}" height="${PANEL_H}" rx="14" fill="${token.layer2}" stroke="${token.border}" filter="url(#panel-shadow)"/>`,
		...parts,
		`<rect x="${triggerX}" y="${triggerY}" width="40" height="40" rx="20" fill="${token.layer2}" stroke="${token.brand}" filter="url(#trigger-shadow)"/>`,
		glyph,
	].join("\n\t\t");
}

function scene(theme, copy, offsetX) {
	const token = THEMES[theme];
	return [
		`<g transform="translate(${offsetX} 0)">`,
		`\t<rect x="0.5" y="0.5" width="${SCENE_W - 1}" height="${SCENE_H - 1}" rx="14" fill="${token.page}" stroke="${token.border}"/>`,
		`\t${layout(theme, copy)}`,
		"</g>",
	].join("\n");
}

function svg(copy) {
	const width = SCENE_W * 2 + SCENE_GAP;
	return [
		`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${SCENE_H}" viewBox="0 0 ${width} ${SCENE_H}" role="img" aria-label="${esc(copy.title)}" font-family="${UI}">`,
		"\t<defs>",
		'\t\t<filter id="panel-shadow" x="-40%" y="-20%" width="180%" height="160%">',
		'\t\t\t<feDropShadow dx="0" dy="12" stdDeviation="16" flood-color="#000000" flood-opacity="0.08"/>',
		'\t\t\t<feDropShadow dx="0" dy="0" stdDeviation="0.5" flood-color="#000000" flood-opacity="0.2"/>',
		"\t\t</filter>",
		'\t\t<filter id="trigger-shadow" x="-60%" y="-40%" width="220%" height="200%">',
		'\t\t\t<feDropShadow dx="0" dy="6" stdDeviation="8" flood-color="#000000" flood-opacity="0.1"/>',
		"\t\t</filter>",
		"\t</defs>",
		`\t${scene("light", copy, 0)}`,
		`\t${scene("dark", copy, SCENE_W + SCENE_GAP)}`,
		"</svg>",
		"",
	].join("\n");
}

mkdirSync(join(ROOT, "docs"), { recursive: true });
for (const lang of ["en", "zh"]) {
	const path = join(ROOT, "docs", `preview-${lang}.svg`);
	writeFileSync(path, svg(COPY[lang]));
	console.log(`wrote ${path}`);
}
