// Minimal Chrome DevTools Protocol client for Obsidian's renderer.
//
// qa/run.mjs imports connect(). Run directly, it drives an Obsidian started
// with --remote-debugging-port (CDP_PORT, default 9333), for ad-hoc probes:
//   node qa/cdp.mjs eval '<js expression>'      evaluate (promises awaited), print JSON
//   node qa/cdp.mjs shot <file.png> [w h]       viewport screenshot
//   node qa/cdp.mjs axe [selector]              axe colour-contrast audit
import { readFileSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'

export const axeSource = () => readFileSync(createRequire(import.meta.url).resolve('axe-core/axe.min.js'), 'utf8')

// Connects to the vault window (index.html), or the first page whose title
// starts with `title`. Every call rejects after `timeout` ms, or as soon as the
// socket closes, so a crashed or hung Obsidian fails the run instead of
// stalling it.
export async function connect(port, { title, timeout = 60_000 } = {}) {
	const list = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json()
	const page = list.find((t) => t.type === 'page' && (title ? t.title.startsWith(title) : t.url.includes('index.html')))
	if (!page) throw new Error(`no Obsidian window on port ${port}`)
	const ws = new WebSocket(page.webSocketDebuggerUrl)
	await new Promise((resolve, reject) => {
		ws.onopen = resolve
		ws.onerror = () => reject(new Error(`cannot open ${page.webSocketDebuggerUrl}`))
	})
	let id = 0
	const pending = new Map()
	ws.onmessage = (e) => {
		const m = JSON.parse(e.data)
		const call = m.id && pending.get(m.id)
		if (!call) return
		pending.delete(m.id)
		if (m.error) call.reject(new Error(`${call.method}: ${m.error.message}`))
		else call.resolve(m.result)
	}
	ws.onclose = () => {
		for (const call of pending.values()) call.reject(new Error(`${call.method}: connection closed`))
		pending.clear()
	}
	const send = (method, params = {}) =>
		new Promise((resolve, reject) => {
			const i = ++id
			const timer = setTimeout(() => {
				pending.delete(i)
				reject(new Error(`${method}: no answer in ${timeout / 1000}s`))
			}, timeout)
			const done = (fn) => (v) => {
				clearTimeout(timer)
				fn(v)
			}
			pending.set(i, { method, resolve: done(resolve), reject: done(reject) })
			ws.send(JSON.stringify({ id: i, method, params }))
		})
	async function evaluate(expression) {
		const res = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true })
		if (res.exceptionDetails) {
			const d = res.exceptionDetails
			throw new Error(`evaluate: ${d.exception?.description ?? d.text}`.slice(0, 800))
		}
		return res.result?.value
	}
	return { send, evaluate, close: () => ws.close() }
}

if (process.argv[1] === import.meta.filename) {
	const { send, evaluate, close } = await connect(process.env.CDP_PORT ?? 9333, { title: process.env.T })
	const [cmd, a, b, c] = process.argv.slice(2)
	if (cmd === 'eval') {
		console.log(JSON.stringify(await evaluate(a), null, 1))
	} else if (cmd === 'shot') {
		if (b) await send('Emulation.setDeviceMetricsOverride', { width: +b, height: +c, deviceScaleFactor: 1, mobile: false })
		await new Promise((r) => setTimeout(r, 400))
		const res = await send('Page.captureScreenshot', { format: 'png' })
		writeFileSync(a, Buffer.from(res.data, 'base64'))
		console.log('saved', a)
	} else if (cmd === 'axe') {
		if ((await evaluate('typeof window.axe')) !== 'object') await evaluate(axeSource())
		const sel = a || '.workspace'
		const out = await evaluate(`axe.run(document.querySelector(${JSON.stringify(sel)}), { runOnly: ['color-contrast'], resultTypes: ['violations','incomplete'] }).then(r => ({
			violations: r.violations.flatMap(v => v.nodes.map(n => ({ target: n.target.join(' '), text: (document.querySelector(n.target[0])?.textContent||'').trim().slice(0,40), data: n.any[0]?.data }))),
			incomplete: r.incomplete.flatMap(v => v.nodes.map(n => ({ target: n.target.join(' ').slice(0,80), key: n.any[0]?.data?.messageKey, ratio: n.any[0]?.data?.contrastRatio }))),
			passes: r.passes.flatMap(v => v.nodes.length).reduce((x,y)=>x+y,0)
		}))`)
		console.log(JSON.stringify(out, null, 1))
	} else {
		console.error('usage: node qa/cdp.mjs eval <js> | shot <file.png> [w h] | axe [selector]')
		process.exitCode = 1
	}
	close()
}
