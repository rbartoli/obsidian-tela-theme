// npm run qa [-- options]
//
// Opens the demo vault in a throwaway Obsidian (temporary profile, temporary
// copy of demo/), renders every scene in qa/scenes.mjs in dark and light, on
// desktop, phone and tablet, and audits each screen with axe. Exits 1 if axe
// finds any violation.
//
// Options:
//   --obsidian <x.y.z>  app version (default: the latest release). Downloaded from
//                       obsidianmd/obsidian-releases and cached in ~/.cache/tela-qa.
//                       The installer only loads versions newer than its own.
//   --theme <name>      theme to test (default: this repo's). "Default" is Obsidian's
//                       own theme; other names are fetched from the community directory.
//   --device <list>     desktop,phone,tablet (default: all)
//   --mode <list>       dark,light (default: both)
//   --scene <list>      scene names from qa/scenes.mjs (default: all)
//   --no-shots          audit only, no screenshots
//   --no-sheets         skip the contact sheets (ImageMagick's montage)
//   --no-plugins        skip the community plugins and their scenes (they are
//                       downloaded from GitHub once, then cached in ~/.cache/tela-qa)
//   --keep-open         leave Obsidian running afterwards, for probing with qa/cdp.mjs
//   --out <dir>         write the results there; unlike the default folder, it is
//                       not emptied first
//
// The vault is demo/ plus qa/fixtures/vault/, with the plugins in PLUGINS
// installed and turned on, set up from qa/fixtures/plugins/<id>/data.json.
//
// Needs the Obsidian desktop app: `obsidian` on PATH, or OBSIDIAN_BIN.
// Writes report.md, report.json, shots/ and sheets/ to qa/out/<theme>-<obsidian version>/,
// which each run empties first, or to --out.

import { spawn, spawnSync } from 'node:child_process'
import { copyFileSync, cpSync, existsSync, linkSync, mkdirSync, mkdtempSync, openSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, relative, resolve, sep } from 'node:path'
import { parseArgs } from 'node:util'
import { axeSource, connect } from './cdp.mjs'
import { cache, download, obsidianAsar, obsidianVersion, sleep, until } from './obsidian.mjs'
import { devices, installHelpers, modes, scenes } from './scenes.mjs'

const root = resolve(import.meta.dirname, '..')

// The rules a theme controls: text contrast (WCAG 1.4.3) and links told apart
// from body text by more than colour (1.4.1). Obsidian's own markup issues
// (labels, roles) are out of a theme's reach, so they are not audited.
const RULES = ['color-contrast', 'link-in-text-block']

// Hidden during every audit, after the screenshot: decorative layers that stop
// axe from finding text backgrounds. Mobile drawers fade their last 48px into
// the drawer; the text under the fade is audited once it scrolls clear.
const AUDIT_CSS = '.workspace-drawer .workspace-leaf-content::after { display: none; }'

// Popular community plugins whose views a theme has to style: the largest
// plugin bug classes across theme repos, plus Iconize, which draws its own
// marks in the file tree, and Notebook Navigator, which replaces it.
const PLUGINS = ['dataview', 'obsidian-tasks-plugin', 'obsidian-kanban', 'obsidian-excalidraw-plugin', 'obsidian-icon-folder', 'notebook-navigator']

const { values: opt } = parseArgs({
	options: {
		obsidian: { type: 'string' },
		theme: { type: 'string' },
		device: { type: 'string', default: Object.keys(devices).join(',') },
		mode: { type: 'string', default: Object.keys(modes).join(',') },
		scene: { type: 'string', default: scenes.map((s) => s.name).join(',') },
		shots: { type: 'boolean', default: true },
		sheets: { type: 'boolean', default: true },
		plugins: { type: 'boolean', default: true },
		'keep-open': { type: 'boolean', default: false },
		out: { type: 'string' },
	},
	allowNegative: true,
})

const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

function list(name, value, known) {
	const items = value.split(',').map((s) => s.trim()).filter(Boolean)
	const unknown = items.filter((i) => !known.includes(i))
	if (unknown.length) throw new Error(`unknown ${name}: ${unknown.join(', ')} (known: ${known.join(', ')})`)
	return items
}





// This repo's theme (theme.css must be current), Obsidian's default, or a
// theme from the community directory, fetched the way Obsidian installs one:
// the release whose tag is the manifest's version, at the repo's HEAD.
async function themeUnderTest(name) {
	const own = JSON.parse(readFileSync(join(root, 'manifest.json'), 'utf8'))
	if (!name || name.toLowerCase() === own.name.toLowerCase()) {
		const check = spawnSync(process.execPath, [join(root, 'scripts', 'build.mjs'), '--check'], { encoding: 'utf8' })
		if (check.status !== 0) throw new Error(check.stderr.trim() || 'theme.css is stale: run npm run build')
		return { name: own.name, version: own.version, own: true, files: { 'theme.css': join(root, 'theme.css'), 'manifest.json': join(root, 'manifest.json') } }
	}
	if (name.toLowerCase() === 'default') return { name: 'Default', version: '', files: null }
	const directory = JSON.parse(await download('https://raw.githubusercontent.com/obsidianmd/obsidian-releases/HEAD/community-css-themes.json'))
	const entry = directory.find((t) => t.name.toLowerCase() === name.toLowerCase())
	if (!entry) throw new Error(`no theme called "${name}" in the community directory`)
	const manifest = JSON.parse(await download(`https://raw.githubusercontent.com/${entry.repo}/HEAD/manifest.json`))
	const dir = join(cache, 'themes', slug(manifest.name), manifest.version)
	if (!existsSync(join(dir, 'theme.css'))) {
		let css
		for (const url of [
			`https://github.com/${entry.repo}/releases/download/${manifest.version}/theme.css`,
			`https://raw.githubusercontent.com/${entry.repo}/HEAD/theme.css`,
			`https://raw.githubusercontent.com/${entry.repo}/HEAD/obsidian.css`,
		]) {
			css = await download(url).catch(() => null)
			if (css) break
		}
		if (!css) throw new Error(`no theme.css found for ${entry.repo}`)
		mkdirSync(dir, { recursive: true })
		writeFileSync(join(dir, 'theme.css'), css)
		writeFileSync(join(dir, 'manifest.json'), JSON.stringify(manifest, null, '\t'))
	}
	return { name: manifest.name, version: manifest.version, files: { 'theme.css': join(dir, 'theme.css'), 'manifest.json': join(dir, 'manifest.json') } }
}

// Each plugin as Obsidian installs it: main.js, manifest.json and styles.css
// from the release whose tag is the manifest's version.
async function communityPlugins() {
	if (!opt.plugins) return []
	const directory = JSON.parse(await download('https://raw.githubusercontent.com/obsidianmd/obsidian-releases/HEAD/community-plugins.json'))
	const found = []
	for (const id of PLUGINS) {
		const entry = directory.find((p) => p.id === id)
		if (!entry) throw new Error(`no plugin with id ${id} in the community directory`)
		const manifest = JSON.parse(await download(`https://raw.githubusercontent.com/${entry.repo}/HEAD/manifest.json`))
		const dir = join(cache, 'plugins', id, manifest.version)
		if (!existsSync(join(dir, 'manifest.json'))) {
			const release = `https://github.com/${entry.repo}/releases/download/${manifest.version}`
			const files = { 'main.js': await download(`${release}/main.js`), 'styles.css': await download(`${release}/styles.css`).catch(() => null) }
			mkdirSync(dir, { recursive: true })
			for (const [file, data] of Object.entries(files)) if (data) writeFileSync(join(dir, file), data)
			writeFileSync(join(dir, 'manifest.json'), JSON.stringify(manifest, null, '\t'))
		}
		found.push({ id, name: entry.name, version: manifest.version, dir })
	}
	return found
}

// A copy of demo/ without its local workspace or installed themes, the theme
// under test, and a profile that opens the copy with updates turned off.
function prepare(tmp, theme, asar, version, plugins) {
	const vault = join(tmp, 'Demo')
	const profile = join(tmp, 'profile')
	const demo = join(root, 'demo')
	cpSync(demo, vault, {
		recursive: true,
		filter: (src) => !/^\.obsidian[\\/](themes|workspace)/.test(relative(demo, src)),
	})
	cpSync(join(root, 'qa', 'fixtures', 'vault'), vault, { recursive: true })
	for (const plugin of plugins) {
		const dir = join(vault, '.obsidian', 'plugins', plugin.id)
		cpSync(plugin.dir, dir, { recursive: true })
		const data = join(root, 'qa', 'fixtures', 'plugins', plugin.id, 'data.json')
		if (existsSync(data)) copyFileSync(data, join(dir, 'data.json'))
	}
	writeFileSync(join(vault, '.obsidian', 'community-plugins.json'), JSON.stringify(plugins.map((p) => p.id)))
	if (theme.files) {
		const dir = join(vault, '.obsidian', 'themes', theme.name)
		mkdirSync(dir, { recursive: true })
		for (const [file, src] of Object.entries(theme.files)) copyFileSync(src, join(dir, file))
	}
	// Settings as a modal in the main window, where the audit reaches it; on
	// desktop, 1.14 opens it in a window of its own by default.
	const config = join(vault, '.obsidian', 'app.json')
	const app = existsSync(config) ? JSON.parse(readFileSync(config, 'utf8')) : {}
	writeFileSync(config, JSON.stringify({ ...app, settingsPopoutWindow: false }, null, '\t'))
	const appearance = join(vault, '.obsidian', 'appearance.json')
	const settings = existsSync(appearance) ? JSON.parse(readFileSync(appearance, 'utf8')) : {}
	writeFileSync(appearance, JSON.stringify({ ...settings, cssTheme: theme.files ? theme.name : '' }, null, '\t'))

	mkdirSync(profile)
	const vaults = { '0000000000000000': { path: vault, ts: Date.now(), open: true } }
	writeFileSync(join(profile, 'obsidian.json'), JSON.stringify({ vaults, updateDisabled: true }))
	// The installer skips symlinks when it looks for app packages, so link hard or copy.
	const target = join(profile, `obsidian-${version}.asar`)
	try {
		linkSync(asar, target)
	} catch {
		copyFileSync(asar, target)
	}
	return { vault, profile }
}

function launch(profile, log) {
	const bin = process.env.OBSIDIAN_BIN ?? 'obsidian'
	const out = openSync(log, 'w')
	// Its own process group, so one signal stops Obsidian and every helper process.
	const child = spawn(bin, [`--user-data-dir=${profile}`, '--remote-debugging-port=0'], { detached: true, stdio: ['ignore', out, out] })
	child.on('error', (err) => {
		child.failed = err.code === 'ENOENT' ? new Error(`cannot run "${bin}": install Obsidian or set OBSIDIAN_BIN`) : err
	})
	return child
}

async function stop(child) {
	if (child.exitCode !== null || child.failed) return
	const exited = new Promise((r) => child.once('exit', r))
	try {
		process.kill(-child.pid, 'SIGTERM')
	} catch {
		return
	}
	if (await Promise.race([exited.then(() => true), sleep(3000)])) return
	try {
		process.kill(-child.pid, 'SIGKILL')
	} catch {}
}

async function press(page, key, code, keyCode) {
	for (const type of ['keyDown', 'keyUp']) await page.send('Input.dispatchKeyEvent', { type, key, code, windowsVirtualKeyCode: keyCode })
}

// Wait for the workspace and the theme after every (re)load, then install axe
// and the page helpers.
async function ready(page, theme) {
	await until('the workspace', () => page.evaluate('window.app?.workspace?.layoutReady === true'), 90_000)
	// A vault that comes with plugins opens with "Do you trust the author of
	// this vault?", and holds back its plugins and theme until it is answered.
	// Community plugins also need restricted mode off, a per-device setting.
	if (page.plugins.length) {
		const trust = "[...document.querySelectorAll('.modal-container button')].find((b) => /^trust/i.test(b.innerText.trim()))"
		if (!page.trusted) await until('the trust prompt', () => page.evaluate(`(() => { const b = ${trust}; b?.click(); return !!b })()`), 15_000)
		page.trusted = true
		await page.evaluate('(async () => { if (!app.plugins.isEnabled()) await app.plugins.setEnable(true); return true })()')
		await until('the community plugins', () => page.evaluate(`${JSON.stringify(page.plugins)}.every((id) => app.plugins.plugins[id]?._loaded)`))
	}
	await until(`the ${theme.name} theme`, () => page.evaluate(`app.customCss.theme === ${JSON.stringify(theme.files ? theme.name : '')} && app.customCss.styleEl.textContent.length ${theme.files ? '> 0' : '=== 0'}`))
	// Links finish resolving after the layout is ready (a canvas's links come
	// last), and backlinks and the graph show whatever is resolved so far.
	// Wait until the resolved links stop changing for a second.
	let links = ''
	let stable = 0
	await until('the link index', async () => {
		const now = await page.evaluate('app.metadataCache.initialized && !app.metadataCache.inProgressTaskCount ? JSON.stringify(app.metadataCache.resolvedLinks) : ""')
		stable = now && now === links ? stable + 1 : 0
		links = now
		return stable >= 4
	})
	await page.evaluate(axeSource())
	await page.evaluate(`(${installHelpers})()`)
	for (let i = 0; i < 3 && (await page.evaluate('document.querySelectorAll(".modal-container").length')); i++) await press(page, 'Escape', 'Escape', 27)
	await page.run(() => __qa.reset())
}

async function useDevice(page, theme, name) {
	const d = devices[name]
	await page.send('Emulation.setDeviceMetricsOverride', { width: d.width, height: d.height, deviceScaleFactor: d.deviceScaleFactor, mobile: false })
	// Mobile emulation needs a reload to switch on or off; phone and tablet
	// each get a fresh load too, as a real device would.
	if (!d.mobile && !(await page.evaluate('app.isMobile'))) return
	await page.evaluate(`${d.mobile ? "localStorage.setItem('EmulateMobile', '1')" : "localStorage.removeItem('EmulateMobile')"}; setTimeout(() => location.reload(), 50); true`)
	await sleep(1500)
	await ready(page, theme)
	if ((await page.evaluate('app.isMobile')) !== d.mobile) throw new Error(`could not switch mobile emulation ${d.mobile ? 'on' : 'off'}`)
}

// A context with an empty include list (no new blocks on this screen) has nothing to audit.
const audit = (context) => `((context) => context.include?.length === 0 ? { violations: [], incomplete: [] } : axe.run(context, ${JSON.stringify({ runOnly: { type: 'rule', values: RULES }, resultTypes: ['violations', 'incomplete'] })}).then((r) => {
	const text = (n) => {
		const el = document.querySelector(n.target.at(-1))
		return (el?.innerText || el?.textContent || '').trim().replace(/\\s+/g, ' ').slice(0, 60)
	}
	const pick = (v) => v.nodes.map((n) => ({ rule: v.id, target: n.target.join(' '), text: text(n), data: Object.assign({}, ...n.any.map((c) => c.data).filter((d) => d && typeof d === 'object')) }))
	return { violations: r.violations.flatMap(pick), incomplete: r.incomplete.flatMap(pick) }
}))(${context})`

// One screenshot and one audit per screenful: pages through the scene's
// scroller when it has one, since Obsidian only renders what is near the
// viewport. Screens overlap so every line is clear of the chrome once: the
// status bar on desktop, the floating header and navigation bar on mobile.
async function capture(page, out, where, scene) {
	const steps = []
	const snap = async (n) => {
		const step = { ...where, step: n }
		if (opt.shots) {
			const file = join('shots', where.device, where.scene, `${where.mode}-${String(n).padStart(2, '0')}.png`)
			mkdirSync(join(out, file, '..'), { recursive: true })
			writeFileSync(join(out, file), Buffer.from((await page.send('Page.captureScreenshot', { format: 'png' })).data, 'base64'))
			step.shot = file
		}
		const css = JSON.stringify(`${AUDIT_CSS}\n${scene.auditCss ?? ''}`)
		await page.evaluate(`document.head.appendChild(Object.assign(document.createElement('style'), { id: 'qa-audit', textContent: ${css} })) && true`)
		try {
			// Paging only moves the scroller, so after the first screen only it is
			// audited. Overlay scenes audit just the overlay.
			const only = scene.audit ?? (n && scene.scroll)
			const context = scene.blocks ? `__qa.blocks(${JSON.stringify(scene.blocks)})` : only ? `(document.querySelector(${JSON.stringify(only)}) ?? (() => { throw new Error(${JSON.stringify(`nothing matches ${only}`)}) })())` : 'document'
			Object.assign(step, await page.evaluate(audit(context)))
		} finally {
			await page.evaluate("document.getElementById('qa-audit')?.remove()")
		}
		steps.push(step)
	}
	if (!scene.scroll) {
		await snap(0)
		return steps
	}
	let y = 0
	let previous = -1
	for (let n = 0; n < 80; n++) {
		const m = await page.evaluate(`(async () => {
			const el = document.querySelector(${JSON.stringify(scene.scroll)})
			el.scrollTop = ${y}
			await __qa.settle()
			return { top: el.scrollTop, height: el.scrollHeight, view: el.clientHeight }
		})()`)
		if (m.top <= previous) break
		await snap(n)
		if (m.top + m.view >= m.height - 1) break
		previous = m.top
		y = m.top + Math.round(m.view * (devices[where.device].mobile ? 0.7 : 0.93))
	}
	return steps
}

function colours(v) {
	const d = v.data
	return v.rule === 'link-in-text-block' ? { fg: d.nodeColor, bg: d.parentColor } : { fg: d.fgColor, bg: d.bgColor }
}

// Unique violations: the same element seen in several screenfuls or scenes
// counts once per device and mode.
function summarise(steps) {
	const unique = new Map()
	for (const s of steps) {
		for (const v of s.violations) {
			const { fg, bg } = colours(v)
			const key = [s.device, s.mode, v.rule, v.target, fg, bg].join('|')
			const seen = unique.get(key) ?? { device: s.device, mode: s.mode, rule: v.rule, target: v.target, text: v.text, fg, bg, ratio: v.data.contrastRatio, expected: v.data.expectedContrastRatio ?? `${v.data.requiredContrastRatio}:1`, size: v.data.fontSize, weight: v.data.fontWeight, scenes: new Set(), shots: [] }
			seen.scenes.add(s.scene)
			if (s.shot) seen.shots.push(s.shot)
			unique.set(key, seen)
		}
	}
	// Grouped by colour pair: one group is one thing to fix.
	const groups = new Map()
	for (const v of unique.values()) {
		const key = [v.rule, v.mode, v.fg, v.bg, v.ratio, v.size, v.weight].join('|')
		const g = groups.get(key) ?? { ...v, devices: new Set(), scenes: new Set(), examples: [] }
		g.devices.add(v.device)
		for (const s of v.scenes) g.scenes.add(s)
		if (g.examples.length < 3 && !g.examples.some((e) => e.text === v.text)) g.examples.push({ text: v.text, target: v.target, shot: v.shots[0] })
		g.count = (g.count ?? 0) + 1
		groups.set(key, g)
	}
	const incomplete = new Map()
	for (const s of steps) for (const v of s.incomplete) incomplete.set([s.device, s.mode, v.rule, v.target].join('|'), v.data.messageKey ?? 'unknown')
	return { unique: [...unique.values()], groups: [...groups.values()].sort((a, b) => b.count - a.count), incomplete }
}

function report(out, meta, steps, summary, errors) {
	const plain = (v) => JSON.parse(JSON.stringify(v, (k, x) => (x instanceof Set ? [...x] : x)))
	writeFileSync(join(out, 'report.json'), JSON.stringify(plain({ ...meta, errors, violations: summary.unique, steps }), null, '\t'))
	const count = (device, mode, what) => (what === 'v' ? summary.unique.filter((v) => v.device === device && v.mode === mode).length : [...summary.incomplete.keys()].filter((k) => k.startsWith(`${device}|${mode}|`)).length)
	const lines = [
		`# QA: ${meta.theme}${meta.themeVersion ? ` ${meta.themeVersion}` : ''} on Obsidian ${meta.obsidian}`,
		'',
		`${meta.date} · ${steps.length} screens · axe ${meta.axe}, rules: ${RULES.join(', ')}`,
		...(meta.plugins.length ? ['', `Plugins: ${meta.plugins.join(', ')}`] : []),
		'',
		'| Device | Mode | Violations | Needs review |',
		'| --- | --- | ---: | ---: |',
		...meta.devices.flatMap((d) => meta.modes.map((m) => `| ${d} | ${m} | ${count(d, m, 'v')} | ${count(d, m, 'i')} |`)),
		'',
	]
	if (errors.length) {
		lines.push('## Scenes that failed to run', '', ...errors.map((e) => `- ${e.device} ${e.mode} ${e.scene}: ${e.error}`), '')
	}
	if (summary.groups.length) {
		lines.push('## Violations', '', 'One entry per colour pair; each lists where it appears and up to three examples.', '')
		for (const g of summary.groups) {
			// link-in-text-block compares a link with the text around it, not with a background.
			const pair = g.rule === 'link-in-text-block' ? `link ${g.fg} against text ${g.bg}` : `${g.fg} on ${g.bg}`
			lines.push(`- **${g.mode}, ${g.ratio}:1** (needs ${g.expected}) · ${pair} · ${g.size ?? ''} ${g.weight ?? ''} · ${g.rule} · ${g.count} element${g.count > 1 ? 's' : ''}`)
			lines.push(`  - ${[...g.devices].join(', ')} · ${[...g.scenes].join(', ')}`)
			for (const e of g.examples) lines.push(`  - "${e.text}" \`${e.target.slice(0, 140)}\`${e.shot ? ` · ${e.shot}` : ''}`)
		}
		lines.push('')
	}
	const reasons = {}
	for (const r of summary.incomplete.values()) reasons[r] = (reasons[r] ?? 0) + 1
	if (summary.incomplete.size) {
		lines.push('## Needs review', '', 'Elements axe could not decide: text under an open overlay (audited in the scenes without it), over an image or gradient, or partly covered. They do not fail the run.', '')
		for (const [r, n] of Object.entries(reasons).sort((a, b) => b[1] - a[1])) lines.push(`- ${r}: ${n}`)
		lines.push('')
	}
	writeFileSync(join(out, 'report.md'), lines.join('\n'))
	return lines
}

// Contact sheets: per device, the first screen of every scene; per paged
// scene, every screen. Dark and light sit side by side.
function sheets(out, steps) {
	if (spawnSync('montage', ['-version']).status !== 0) {
		console.log('no ImageMagick montage: skipping contact sheets')
		return
	}
	mkdirSync(join(out, 'sheets'), { recursive: true })
	const shot = (s) => join(out, s.shot)
	// Shots are scaled down as they are read ([x<height>]): 30 tablet screens
	// at full size overrun ImageMagick's default 1 GiB memory limit.
	const montage = (files, file, title, pairs, height) => {
		const args = ['-background', '#808080', '-fill', '#101010', '-pointsize', '15', '-title', title, ...files.flatMap((s) => ['-label', `${s.scene} ${s.mode} ${s.step}`, `${shot(s)}[x${height}]`]), '-tile', `${pairs * 2}x`, '-geometry', `x${height}+6+6`, join(out, 'sheets', file)]
		const res = spawnSync('montage', args, { encoding: 'utf8' })
		if (res.status !== 0) console.log(`contact sheet ${file} failed: ${(res.stderr || '').trim().split('\n')[0]}`)
	}
	const byDevice = Map.groupBy(steps.filter((s) => s.shot), (s) => s.device)
	for (const [device, list] of byDevice) {
		const phone = device === 'phone'
		const first = list.filter((s) => s.step === 0).sort((a, b) => a.scene.localeCompare(b.scene) || a.mode.localeCompare(b.mode))
		montage(first, `${device}.png`, `${device}: every scene, dark | light`, phone ? 4 : 2, phone ? 600 : 400)
		for (const [scene, shots] of Map.groupBy(list, (s) => s.scene)) {
			if (shots.length <= 2) continue
			const ordered = shots.sort((a, b) => a.step - b.step || a.mode.localeCompare(b.mode))
			montage(ordered, `${device}-${scene}.png`, `${device}: ${scene}, dark | light`, phone ? 3 : 1, phone ? 700 : 600)
		}
	}
}

async function main() {
	const wanted = {
		devices: list('device', opt.device, Object.keys(devices)),
		modes: list('mode', opt.mode, Object.keys(modes)),
		scenes: list('scene', opt.scene, scenes.map((s) => s.name)),
	}
	const theme = await themeUnderTest(opt.theme)
	const version = await obsidianVersion(opt.obsidian)
	const asar = await obsidianAsar(version)
	const plugins = await communityPlugins()
	const out = opt.out ? resolve(opt.out) : join(root, 'qa', 'out', `${slug(theme.name)}-${version}`)
	if (!opt.out) rmSync(out, { recursive: true, force: true })
	mkdirSync(out, { recursive: true })
	const tmp = mkdtempSync(join(tmpdir(), 'tela-qa-'))
	const { profile } = prepare(tmp, theme, asar, version, plugins)
	const child = launch(profile, join(out, 'electron.log'))
	let page
	const cleanup = async () => {
		page?.close()
		await stop(child)
		rmSync(tmp, { recursive: true, force: true, maxRetries: 5 })
	}
	process.once('SIGINT', () => cleanup().then(() => process.exit(130)))
	try {
		const port = await until('Obsidian to start', () => {
			if (child.failed || child.exitCode !== null) throw Object.assign(child.failed ?? new Error(`Obsidian exited with code ${child.exitCode}`), { fatal: true })
			const file = join(profile, 'DevToolsActivePort')
			return existsSync(file) && readFileSync(file, 'utf8').split('\n')[0]
		})
		page = await until('the vault window', () => connect(port))
		// Runs a function from qa/scenes.mjs in the page, for its side effects.
		page.plugins = plugins.map((p) => p.id)
		page.run = (fn, ...args) => page.evaluate(`(async () => { await (${fn})(${args.map((a) => JSON.stringify(a)).join(', ')}) })()`)
		await ready(page, theme)

		// The installer falls back to its bundled app when the package is older
		// than itself; refuse to report results for the wrong version.
		const loaded = await page.evaluate("require('electron').ipcRenderer.sendSync('version')")
		if (loaded !== version) throw new Error(`Obsidian ${version} did not load (got ${loaded}): the installer only loads versions newer than its own`)
		const axe = await page.evaluate('axe.version')
		console.log(`${theme.name}${theme.version ? ` ${theme.version}` : ''} on Obsidian ${version}, axe ${axe}`)
		if (plugins.length) console.log(`plugins: ${plugins.map((p) => `${p.name} ${p.version}`).join(', ')}`)

		const steps = []
		const errors = []
		for (const device of wanted.devices) {
			await useDevice(page, theme, device)
			for (const mode of wanted.modes) {
				await page.evaluate(`app.changeTheme(${JSON.stringify(modes[mode])})`)
				await sleep(600)
				for (const scene of scenes) {
					if (!wanted.scenes.includes(scene.name) || (scene.only && !scene.only.includes(device)) || (scene.modes && !scene.modes.includes(mode)) || (scene.own && !theme.own) || (scene.plugin && !page.plugins.includes(scene.plugin))) continue
					for (let i = 0; i < 4 && (await page.evaluate('document.querySelectorAll(".modal-container, .menu, .hover-popover").length')); i++) await press(page, 'Escape', 'Escape', 27)
					const started = Date.now()
					const label = `${device.padEnd(7)} ${mode.padEnd(5)} ${scene.name.padEnd(18)}`
					// A scene that breaks is reported and fails the run, but the rest still run.
					try {
						await page.send('Emulation.setEmulatedMedia', { media: '' })
						await page.run(() => __qa.reset())
						await scene.setup(page)
						const shots = await capture(page, out, { device, mode, scene: scene.name }, scene)
						steps.push(...shots)
						const found = shots.reduce((n, s) => n + s.violations.length, 0)
						console.log(`${label} ${String(shots.length).padStart(2)} screen${shots.length > 1 ? 's' : ' '}  ${String(Math.round((Date.now() - started) / 1000)).padStart(3)}s  ${found ? `${found} violation${found > 1 ? 's' : ''}` : 'ok'}`)
					} catch (err) {
						if (/connection closed/.test(err.message)) throw err
						errors.push({ device, mode, scene: scene.name, error: err.message.split('\n')[0] })
						console.log(`${label} error: ${errors.at(-1).error}`)
					}
				}
			}
		}

		const meta = { theme: theme.name, themeVersion: theme.version, obsidian: version, axe, plugins: plugins.map((p) => `${p.name} ${p.version}`), date: new Date().toLocaleString('sv-SE').slice(0, 16), devices: wanted.devices, modes: wanted.modes, scenes: wanted.scenes }
		const summary = summarise(steps)
		const lines = report(out, meta, steps, summary, errors)
		if (opt.shots && opt.sheets) sheets(out, steps)
		console.log(`\n${lines.join('\n')}\nreport: ${relative(process.cwd(), join(out, 'report.md'))}`)
		if (opt['keep-open']) {
			console.log(`Obsidian left running: CDP_PORT=${port} node qa/cdp.mjs eval ...; stop it with: kill -9 -- -${child.pid}; then delete ${tmp}`)
			page.close()
			child.unref()
			return errors.length ? 2 : summary.unique.length ? 1 : 0
		}
		await cleanup()
		return errors.length ? 2 : summary.unique.length ? 1 : 0
	} catch (err) {
		await cleanup()
		throw err
	}
}

main().then(
	(code) => process.exit(code),
	(err) => {
		console.error(`qa: ${err.message}`)
		process.exit(2)
	},
)
