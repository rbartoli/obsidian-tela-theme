// npm run shots [-- options]
//
// Regenerates the README's cover and screenshots, and the theme browser's
// thumbnail, in assets/ from the demo vault, in a throwaway Obsidian (temporary
// profile, temporary copy of demo/).
// Run it after any visible change and commit assets/.
//
// On WSL it drives the Windows app, for Windows' text rendering; elsewhere, the
// Linux app (`obsidian` on PATH, or OBSIDIAN_BIN). Desktop shots are 1200x800
// and phone shots 900x1600, the community directory's sizes; the cover is
// 2560x1280. Everything is captured at 2x and written as lossless WebP, except
// the thumbnail, a 1024x576 window scaled to a 512x288 PNG. The
// cover is laid out by scripts/shots-cover.html and rendered by the same
// Obsidian, in the Inter it bundles.
//
// Options:
//   --obsidian <x.y.z>  app version (default: the latest release, as npm run qa)
//   --only <list>       names from SHOTS below, or cover (default: all)
//   --platform <name>   windows or linux (default: windows on WSL, else linux)
//   --keep-open         leave Obsidian running afterwards
//
// Needs ImageMagick for the WebP conversion. On WSL, the Windows app must be
// reachable on 127.0.0.1, which needs networkingMode=mirrored in .wslconfig.

import { execFileSync, spawn, spawnSync } from 'node:child_process'
import { copyFileSync, cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { release, tmpdir } from 'node:os'
import { join, relative, resolve } from 'node:path'
import { parseArgs } from 'node:util'
import { connect } from '../qa/cdp.mjs'
import { obsidianAsar, obsidianVersion, sleep, until } from '../qa/obsidian.mjs'

const root = resolve(import.meta.dirname, '..')
const assets = join(root, 'assets')

// name: the file in assets/ (save) or an input to the cover only. scene: what
// the window shows, from scene() below.
const SHOTS = [
	{ name: 'notes-dark', mode: 'dark', device: 'desktop', scene: 'note' },
	{ name: 'notes-light', mode: 'light', device: 'desktop', scene: 'note', save: true },
	{ name: 'bases-light', mode: 'light', device: 'desktop', scene: 'cards', save: true },
	{ name: 'tasks-dark', mode: 'dark', device: 'desktop', scene: 'tasks', save: true },
	{ name: 'code-dark', mode: 'dark', device: 'desktop', scene: 'code', save: true },
	{ name: 'phone-notes-dark', mode: 'dark', device: 'phone', scene: 'note-body', save: true },
	{ name: 'phone-notes-light', mode: 'light', device: 'phone', scene: 'note-body', save: true },
	{ name: 'phone-bases-dark', mode: 'dark', device: 'phone', scene: 'cards', save: true },
	// The thumbnail in Obsidian's theme browser, at the 512x288 it recommends.
	{ name: 'screenshot', mode: 'dark', device: 'store', scene: 'note', save: true, size: '512x288' },
]
// The cover's three windows, by shot name.
const COVER = { light: 'bases-light', dark: 'notes-dark', phone: 'phone-notes-dark' }
const DEVICES = {
	desktop: { width: 1200, height: 800, mobile: false },
	store: { width: 1024, height: 576, mobile: false },
	phone: { width: 450, height: 800, mobile: true },
}

const { values: opt } = parseArgs({
	options: {
		obsidian: { type: 'string' },
		only: { type: 'string' },
		platform: { type: 'string' },
		'keep-open': { type: 'boolean', default: false },
	},
})

const wsl = existsSync('/proc/sys/fs/binfmt_misc/WSLInterop') || /microsoft/i.test(release())
const platform = opt.platform ?? (wsl ? 'windows' : 'linux')
if (!['windows', 'linux'].includes(platform)) throw new Error(`unknown platform ${platform}`)

const known = ['cover', ...SHOTS.filter((s) => s.save).map((s) => s.name)]
const only = opt.only ? opt.only.split(',').map((s) => s.trim()) : known
const unknown = only.filter((n) => !known.includes(n))
if (unknown.length) throw new Error(`unknown shots: ${unknown.join(', ')} (known: ${known.join(', ')})`)
const needed = new Set(only.filter((n) => n !== 'cover'))
if (only.includes('cover')) for (const n of Object.values(COVER)) needed.add(n)
// Desktop first, so the app reloads into phone emulation once.
const shots = SHOTS.filter((s) => needed.has(s.name)).sort((a, b) => DEVICES[a.device].mobile - DEVICES[b.device].mobile)

// Windows paths, seen from WSL and from Windows.
const winPath = (unix) => execFileSync('wslpath', ['-w', unix], { encoding: 'utf8' }).trim()
const unixPath = (win) => execFileSync('wslpath', ['-u', win], { encoding: 'utf8' }).trim()

// %LOCALAPPDATA%, which holds the Windows app and its temporary files.
const localAppData = () => unixPath(execFileSync('cmd.exe', ['/c', 'echo %LOCALAPPDATA%'], { encoding: 'utf8', cwd: '/mnt/c' }).trim())

function workDir() {
	if (platform === 'linux') return mkdtempSync(join(tmpdir(), 'tela-shots-'))
	mkdirSync(join(localAppData(), 'Temp'), { recursive: true })
	return mkdtempSync(join(localAppData(), 'Temp', 'tela-shots-'))
}

// The demo vault with this repo's theme installed and picked, and a profile
// that opens it on the given app package.
function prepare(tmp, asar, version) {
	const check = spawnSync(process.execPath, [join(root, 'scripts', 'build.mjs'), '--check'], { encoding: 'utf8' })
	if (check.status !== 0) throw new Error(check.stderr.trim() || 'theme.css is stale: run npm run build')
	const vault = join(tmp, 'Demo')
	const demo = join(root, 'demo')
	cpSync(demo, vault, { recursive: true, filter: (src) => !/^\.obsidian[\\/](themes|workspace)/.test(relative(demo, src)) })
	const theme = join(vault, '.obsidian', 'themes', 'Tela')
	mkdirSync(theme, { recursive: true })
	for (const file of ['theme.css', 'manifest.json']) copyFileSync(join(root, file), join(theme, file))
	const json = (file, extra) => {
		const path = join(vault, '.obsidian', file)
		const current = existsSync(path) ? JSON.parse(readFileSync(path, 'utf8')) : {}
		writeFileSync(path, JSON.stringify({ ...current, ...extra }, null, '\t'))
	}
	json('app.json', { settingsPopoutWindow: false })
	json('appearance.json', { cssTheme: 'Tela' })
	const profile = join(tmp, 'profile')
	mkdirSync(profile)
	const path = platform === 'windows' ? winPath(vault) : vault
	writeFileSync(join(profile, 'obsidian.json'), JSON.stringify({ vaults: { '0000000000000000': { path, ts: Date.now(), open: true } }, updateDisabled: true }))
	copyFileSync(asar, join(profile, `obsidian-${version}.asar`))
	return profile
}

function launch(profile) {
	if (platform === 'linux') {
		const child = spawn(process.env.OBSIDIAN_BIN ?? 'obsidian', [`--user-data-dir=${profile}`, '--remote-debugging-port=0'], { detached: true, stdio: 'ignore' })
		child.on('error', (err) => (child.failed = err))
		return child
	}
	const exe = process.env.OBSIDIAN_EXE ?? join(localAppData(), 'Programs', 'Obsidian', 'Obsidian.exe')
	if (!existsSync(exe)) throw new Error(`no Windows Obsidian at ${exe}: install it, set OBSIDIAN_EXE, or pass --platform linux`)
	const child = spawn(exe, [`--user-data-dir=${winPath(profile)}`, '--remote-debugging-port=0'], { detached: true, stdio: 'ignore', cwd: '/mnt/c' })
	child.on('error', (err) => (child.failed = err))
	return child
}

// Stops every process started with this run's profile, and only those.
function stop(child, tmp) {
	if (platform === 'linux') {
		try {
			process.kill(-child.pid, 'SIGKILL')
		} catch {}
		return
	}
	const marker = tmp.split('/').at(-1)
	// Obsidian.exe only: this command's own command line contains the marker too.
	spawnSync('powershell.exe', ['-NoProfile', '-Command', `Get-CimInstance Win32_Process -Filter "Name='Obsidian.exe'" | Where-Object { $_.CommandLine -like '*${marker}*' } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }`], { cwd: '/mnt/c' })
}

async function ready(page) {
	await until('the workspace', () => page.evaluate('window.app?.workspace?.layoutReady === true'), 90_000)
	await until('the Tela theme', () => page.evaluate("app.customCss.theme === 'Tela' && app.customCss.styleEl.textContent.length > 0"))
	await until('the link index', () => page.evaluate('app.metadataCache.initialized && !app.metadataCache.inProgressTaskCount'))
	await sleep(1500)
}

async function useDevice(page, device) {
	const d = DEVICES[device]
	await page.send('Emulation.setDeviceMetricsOverride', { width: d.width, height: d.height, deviceScaleFactor: 2, mobile: false })
	if ((await page.evaluate('app.isMobile')) === d.mobile) return
	await page.evaluate(`${d.mobile ? "localStorage.setItem('EmulateMobile', '1')" : "localStorage.removeItem('EmulateMobile')"}; setTimeout(() => location.reload(), 50); true`)
	await sleep(1500)
	await ready(page)
	if ((await page.evaluate('app.isMobile')) !== d.mobile) throw new Error(`could not switch mobile emulation ${d.mobile ? 'on' : 'off'}`)
}

// Runs in the page: one tab showing the scene, the explorer tidy, the right
// sidebar shut, and on desktop the left one open.
async function scene(name, mode) {
	const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
	const ws = app.workspace
	app.changeTheme(mode === 'light' ? 'moonstone' : 'obsidian')
	// Obsidian's Sync status icon, which is red without a Sync account.
	const style = document.getElementById('tela-shots') ?? document.head.appendChild(Object.assign(document.createElement('style'), { id: 'tela-shots' }))
	style.textContent = '.status-bar-item.plugin-sync { display: none !important; }'
	const leaves = []
	ws.iterateRootLeaves((l) => leaves.push(l))
	for (const l of leaves.slice(1)) l.detach()
	const leaf = leaves[0] ?? ws.getLeaf(false)
	const open = async (path, state = {}) => {
		await leaf.openFile(app.vault.getAbstractFileByPath(path), { state, active: true })
		await sleep(800)
	}
	// Brings a heading to the top of the note, offset px down. The preview
	// renders sections as they near the viewport, so it may take a moment.
	const top = async (find, offset) => {
		const scroller = leaf.view.containerEl.querySelector('.markdown-preview-view')
		let el
		for (let i = 0; i < 50 && !(el = find(scroller)); i++) await sleep(100)
		if (!el) throw new Error(`nothing to scroll to in ${name}`)
		scroller.scrollTop += el.getBoundingClientRect().top - scroller.getBoundingClientRect().top - offset
		await sleep(300)
	}
	const heading = (text) => (s) => [...s.querySelectorAll('h2')].find((h) => h.textContent.trim() === text)
	ws.rightSplit.collapse()
	const explorer = ws.getLeavesOfType('file-explorer')[0]
	if (app.isMobile) ws.leftSplit.collapse()
	else if (explorer) {
		await ws.revealLeaf(explorer)
		for (const [path, item] of Object.entries(explorer.view.fileItems)) item.setCollapsed?.(path === 'Assets')
	}
	if (name === 'note') await open('Library/Frankenstein.md', { mode: 'preview' })
	if (name === 'note-body') {
		await open('Library/Frankenstein.md', { mode: 'preview' })
		await top(heading('Reading notes'), app.isMobile ? 110 : 28)
	}
	if (name === 'cards') {
		await open('Library.base')
		await leaf.view.controller?.selectView?.('Cards')
	}
	if (name === 'tasks' || name === 'code') {
		await open('Tour.md', { mode: 'preview' })
		// The preview renders near the viewport only, so jump close first.
		leaf.view.previewMode.applyScroll(name === 'tasks' ? 22 : 106)
		await sleep(800)
		await top(heading(name === 'tasks' ? 'Tasks' : 'Code'), name === 'tasks' ? 28 : 14)
	}
	ws.setActiveLeaf(leaf, { focus: false })
	document.activeElement?.blur()
	await sleep(1500)
}

// Runs in the page: the cover template in a shadow root over the app, so the
// theme's CSS can't reach it, with the captures as data URLs.
async function cover(html) {
	document.getElementById('tela-cover')?.remove()
	const host = document.body.appendChild(Object.assign(document.createElement('div'), { id: 'tela-cover' }))
	host.style.cssText = 'position: fixed; inset: 0; z-index: 2147483647;'
	host.attachShadow({ mode: 'open' }).innerHTML = html
	await Promise.all([...host.shadowRoot.querySelectorAll('img')].map((img) => img.decode()))
	await document.fonts.ready
	await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)))
}

function webp(png, name) {
	const out = join(assets, `${name}.webp`)
	const r = spawnSync('convert', [png, '-define', 'webp:lossless=true', out], { encoding: 'utf8' })
	if (r.status !== 0) throw new Error(`ImageMagick could not write ${name}.webp: ${r.stderr || r.error?.message}`)
	console.log(`  assets/${name}.webp`)
}

// The theme browser's thumbnail: the 2x capture scaled down, as PNG, the
// format the submission docs use.
function thumbnail(png, name, size) {
	const out = join(assets, `${name}.png`)
	const r = spawnSync('convert', [png, '-resize', size, '-strip', out], { encoding: 'utf8' })
	if (r.status !== 0) throw new Error(`ImageMagick could not write ${name}.png: ${r.stderr || r.error?.message}`)
	console.log(`  assets/${name}.png`)
}

async function main() {
	const version = await obsidianVersion(opt.obsidian)
	const asar = await obsidianAsar(version)
	const tmp = workDir()
	const profile = prepare(tmp, asar, version)
	console.log(`Obsidian ${version} on ${platform}`)
	const child = launch(profile)
	let page
	const cleanup = async () => {
		page?.close()
		stop(child, tmp)
		await sleep(1500)
		rmSync(tmp, { recursive: true, force: true, maxRetries: 5, retryDelay: 500 })
	}
	try {
		const port = await until('Obsidian to start', () => {
			if (child.failed) throw Object.assign(child.failed, { fatal: true })
			const file = join(profile, 'DevToolsActivePort')
			return existsSync(file) && readFileSync(file, 'utf8').split('\n')[0]
		})
		page = await until('the vault window', () => connect(port)).catch((err) => {
			throw platform === 'windows' ? new Error(`${err.message}: WSL can't reach the Windows app; set networkingMode=mirrored in .wslconfig, or pass --platform linux`) : err
		})
		await ready(page)
		const loaded = await page.evaluate("require('electron').ipcRenderer.sendSync('version')")
		if (loaded !== version) console.log(`note: the installed app loaded Obsidian ${loaded}, not ${version} (it only loads packages newer than itself)`)

		const png = {}
		for (const shot of shots) {
			await useDevice(page, shot.device)
			await page.evaluate(`(${scene})(${JSON.stringify(shot.scene)}, ${JSON.stringify(shot.mode)})`)
			const d = DEVICES[shot.device]
			await page.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: d.width - 1, y: d.height / 2 })
			await sleep(400)
			png[shot.name] = join(tmp, `${shot.name}.png`)
			writeFileSync(png[shot.name], Buffer.from((await page.send('Page.captureScreenshot', { format: 'png' })).data, 'base64'))
			if (shot.save && only.includes(shot.name)) (shot.size ? thumbnail : webp)(png[shot.name], shot.name, shot.size)
		}

		if (only.includes('cover')) {
			await useDevice(page, 'desktop')
			await page.send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 640, deviceScaleFactor: 2, mobile: false })
			const url = (name) => `data:image/png;base64,${readFileSync(png[name]).toString('base64')}`
			const html = readFileSync(join(root, 'scripts', 'shots-cover.html'), 'utf8').replace(/\{\{(\w+)\}\}/g, (_, key) => url(COVER[key]))
			await page.evaluate(`(${cover})(${JSON.stringify(html)})`)
			const file = join(tmp, 'cover.png')
			writeFileSync(file, Buffer.from((await page.send('Page.captureScreenshot', { format: 'png' })).data, 'base64'))
			await page.evaluate("document.getElementById('tela-cover')?.remove()")
			webp(file, 'cover')
		}

		if (opt['keep-open']) {
			console.log(`Obsidian left running: CDP_PORT=${port} node qa/cdp.mjs eval ...; then delete ${tmp}`)
			page.close()
			child.unref()
			return 0
		}
		await cleanup()
		return 0
	} catch (err) {
		await cleanup()
		throw err
	}
}

main().then(
	(code) => process.exit(code),
	(err) => {
		console.error(err.message)
		process.exit(1)
	},
)
