// npm run drift [-- options]
//
// Checks an Obsidian release for changes that would quietly break the theme.
// Every Obsidian variable theme.css sets or reads, and every class and
// attribute its selectors name, is looked up in the release's app.css and
// app.js. The check fails (exit 1) when one has gone: a variable the theme
// sets that Obsidian no longer reads, one it reads that Obsidian no longer
// defines, or a class or attribute the app no longer uses.
//
// It then compares Obsidian's defaults for those variables with
// qa/obsidian-baseline.json, the release last certified with npm run qa, and
// reports what changed. Defaults are followed down var() chains, because a
// change one step down matters as much as one in the variable itself.
//
// Options:
//   --obsidian <x.y.z>  release to check (default: the newest with a desktop app
//                       package). Cached in ~/.cache/tela-qa, shared with npm run qa.
//   --baseline <file>   default: qa/obsidian-baseline.json
//   --update-baseline   certify the release: write the baseline from it instead of
//                       checking it. Do this once npm run qa passes on it.
//   --report <file>     also write the findings as Markdown, if there are any
//
// Obsidian's early-access builds can't be downloaded, so the first warning
// comes with a public release.

import { extractFile } from '@electron/asar'
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { join, relative, resolve } from 'node:path'
import { parseArgs } from 'node:util'
import { gunzipSync } from 'node:zlib'

const root = resolve(import.meta.dirname, '..')
const cache = join(process.env.XDG_CACHE_HOME ?? join(homedir(), '.cache'), 'tela-qa')
const KINDS = ['sets', 'reads', 'selectors']

const { values: opt } = parseArgs({
	options: {
		obsidian: { type: 'string' },
		baseline: { type: 'string', default: join(root, 'qa', 'obsidian-baseline.json') },
		'update-baseline': { type: 'boolean', default: false },
		report: { type: 'string' },
	},
})

async function download(url) {
	const token = url.startsWith('https://api.github.com/') && process.env.GITHUB_TOKEN
	const res = await fetch(url, token ? { headers: { authorization: `Bearer ${token}` } } : {})
	if (!res.ok) throw new Error(`${url}: HTTP ${res.status}`)
	return Buffer.from(await res.arrayBuffer())
}

// Some releases are mobile-only (1.13.8 ships just an APK), so the default is
// the newest release with a desktop app package.
async function newestRelease() {
	const releases = JSON.parse(await download('https://api.github.com/repos/obsidianmd/obsidian-releases/releases?per_page=30'))
	const desktop = releases.find((r) => !r.prerelease && !r.draft && r.assets.some((a) => /^obsidian-.+\.asar\.gz$/.test(a.name)))
	if (!desktop) throw new Error('no recent Obsidian release has a desktop app package')
	return desktop.tag_name.replace(/^v/, '')
}

async function obsidianAsar(version) {
	const file = join(cache, `obsidian-${version}.asar`)
	if (!existsSync(file)) {
		console.log(`downloading Obsidian ${version}`)
		const gz = await download(`https://github.com/obsidianmd/obsidian-releases/releases/download/v${version}/obsidian-${version}.asar.gz`).catch((err) => {
			throw /HTTP 404/.test(err.message) ? new Error(`Obsidian ${version} has no desktop app package on GitHub (some releases are mobile-only)`) : err
		})
		mkdirSync(cache, { recursive: true })
		const tmp = `${file}.${process.pid}.tmp`
		writeFileSync(tmp, gunzipSync(gz))
		renameSync(tmp, file)
	}
	return file
}

// A stylesheet's rule preludes and declarations, each declaration with the
// selectors and at-rules around it. Comments are dropped; strings and
// bracketed groups are kept whole, so a data URI or an :is() list can't end a
// rule early.
function scan(css) {
	const preludes = []
	const decls = []
	const stack = []
	let buf = ''
	for (let i = 0; i < css.length; i++) {
		const c = css[i]
		if (c === '/' && css[i + 1] === '*') {
			const end = css.indexOf('*/', i + 2)
			i = end < 0 ? css.length : end + 1
		} else if (c === '"' || c === "'" || c === '(') {
			const end = skip(css, i)
			buf += css.slice(i, end)
			i = end - 1
		} else if (c === '{') {
			const prelude = buf.trim().replace(/\s+/g, ' ')
			preludes.push(prelude)
			stack.push(prelude)
			buf = ''
		} else if (c === ';' || c === '}') {
			const m = /^([\w-]+)\s*:([\s\S]*)$/.exec(buf.trim())
			if (m) decls.push({ name: m[1], value: m[2].trim().replace(/\s+/g, ' '), scope: stack.join(' » ') })
			buf = ''
			if (c === '}') stack.pop()
		} else {
			buf += c
		}
	}
	return { preludes, decls }
}

// The index just past the string or bracketed group that opens at i.
function skip(css, i) {
	if (css[i] !== '(') {
		let j = i + 1
		while (j < css.length && css[j] !== css[i]) j += css[j] === '\\' ? 2 : 1
		return j + 1
	}
	let depth = 0
	for (let j = i; j < css.length; j++) {
		if (css[j] === '"' || css[j] === "'") j = skip(css, j) - 1
		else if (css[j] === '(') depth++
		else if (css[j] === ')' && --depth === 0) return j + 1
	}
	return css.length
}

const refs = (value) => [...value.matchAll(/var\(\s*(--[\w-]+)/g)].map((m) => m[1])
const own = (token) => /^(--|\.)?tela-/.test(token)
const byName = (a, b) => (a < b ? -1 : a > b ? 1 : 0)

// The Obsidian variables, classes and attributes theme.css relies on, leaving
// out the theme's own (--tela-*, .tela-*).
function themeUses() {
	const { preludes, decls } = scan(readFileSync(join(root, 'theme.css'), 'utf8'))
	const sets = new Set(decls.map((d) => d.name).filter((n) => n.startsWith('--')))
	const reads = new Set(decls.flatMap((d) => refs(d.value)).filter((v) => !sets.has(v)))
	const selectors = new Set()
	for (const p of preludes.filter((p) => !p.startsWith('@'))) {
		const bare = p.replace(/"[^"]*"|'[^']*'/g, '""')
		for (const [, name] of bare.matchAll(/\.(-?[_a-zA-Z][\w-]*)/g)) selectors.add(`.${name}`)
		for (const [, name] of bare.matchAll(/\[\s*([\w-]+)/g)) selectors.add(`[${name}]`)
	}
	const keep = (tokens) => [...tokens].filter((t) => !own(t)).sort(byName)
	return { sets: keep(sets), reads: keep(reads), selectors: keep(selectors) }
}

// What a release offers the theme: app.css's custom properties by scope, the
// variables app.css reads, and the words in app.css and app.js (class,
// attribute and variable names all survive minification as strings).
function appIndex(asar) {
	const css = extractFile(asar, 'app.css').toString()
	const js = extractFile(asar, 'app.js').toString()
	const { decls } = scan(css)
	const defaults = new Map()
	for (const d of decls.filter((d) => d.name.startsWith('--'))) {
		if (!defaults.has(d.name)) defaults.set(d.name, {})
		defaults.get(d.name)[d.scope] = d.value
	}
	return {
		defaults,
		reads: new Set(decls.flatMap((d) => refs(d.value))),
		cssWords: new Set(css.match(/[\w-]+/g)),
		jsWords: new Set(js.match(/[\w-]+/g)),
	}
}

// Whether the release still has what the theme uses it for.
function has(app, kind, token) {
	if (kind === 'sets') return app.reads.has(token) || app.jsWords.has(token)
	if (kind === 'reads') return app.defaults.has(token) || app.jsWords.has(token)
	const name = token.replace(/^[.[]|\]$/g, '')
	return app.cssWords.has(name) || app.jsWords.has(name)
}

// The variables behind the ones the theme reads, followed down var() chains
// through Obsidian's defaults, each with the theme variables it sits behind.
// A chain stops at a variable the theme sets: its default no longer matters.
function chains(app, uses) {
	const sets = new Set(uses.sets)
	const behind = new Map()
	const walk = (variable, from) => {
		for (const value of Object.values(app.defaults.get(variable) ?? {})) {
			for (const next of refs(value)) {
				if (sets.has(next) || next === from || behind.get(next)?.has(from)) continue
				if (!behind.has(next)) behind.set(next, new Set())
				behind.get(next).add(from)
				walk(next, from)
			}
		}
	}
	for (const v of uses.reads) walk(v, v)
	return behind
}

function certify(version, app, uses) {
	const tracked = {}
	const unknown = []
	for (const kind of KINDS) {
		tracked[kind] = uses[kind].filter((t) => has(app, kind, t))
		unknown.push(...uses[kind].filter((t) => !has(app, kind, t)))
	}
	const behind = chains(app, tracked)
	const defaults = {}
	for (const v of [...new Set([...tracked.sets, ...tracked.reads, ...behind.keys()])].sort(byName)) {
		if (app.defaults.has(v)) defaults[v] = Object.fromEntries(Object.entries(app.defaults.get(v)).sort(([a], [b]) => byName(a, b)))
	}
	return { obsidian: version, uses: tracked, unknown: unknown.sort(byName), defaults }
}

function check(app, uses, base) {
	const tracked = new Set(KINDS.flatMap((kind) => base.uses[kind]))
	const known = new Set([...tracked, ...base.unknown])
	const gone = []
	const fresh = []
	for (const kind of KINDS) {
		for (const t of uses[kind]) {
			if (!known.has(t)) fresh.push(t)
			else if (tracked.has(t) && !has(app, kind, t)) gone.push({ kind, token: t })
		}
	}
	const live = Object.fromEntries(KINDS.map((kind) => [kind, uses[kind].filter((t) => tracked.has(t) && !gone.some((g) => g.token === t))]))
	const behind = chains(app, live)
	const changed = []
	for (const v of [...new Set([...live.sets, ...live.reads, ...behind.keys()])].sort(byName)) {
		// A variable new to a chain shows up whole; one new to the theme waits
		// for the next certified baseline.
		const before = base.defaults[v] ?? (behind.has(v) && !live.reads.includes(v) ? {} : null)
		if (!before) continue
		const after = app.defaults.get(v) ?? {}
		const diffs = [...new Set([...Object.keys(before), ...Object.keys(after)])]
			.sort(byName)
			.filter((scope) => before[scope] !== after[scope])
			.map((scope) => ({ scope, before: before[scope], after: after[scope] }))
		if (diffs.length) changed.push({ variable: v, set: live.sets.includes(v), read: live.reads.includes(v), behind: [...(behind.get(v) ?? [])].sort(byName), diffs })
	}
	return { gone, fresh, changed }
}

const GONE = {
	sets: 'the theme sets it; Obsidian no longer reads it.',
	reads: 'the theme reads it; Obsidian no longer defines it.',
	selectors: 'the theme styles it; Obsidian no longer uses it.',
}

function markdown(version, base, { gone, changed }) {
	const code = (s) => `\`${s}\``
	const entry = (c) => [
		`- ${code(c.variable)}${!c.read && !c.set && c.behind.length ? `, behind ${c.behind.map(code).join(', ')}` : ''}`,
		...c.diffs.map((d) => `  - ${code(d.scope)}: ${d.before === undefined ? 'new' : code(d.before)} → ${d.after === undefined ? 'removed' : code(d.after)}`),
	]
	const lines = [`# Obsidian ${version}: theme drift`, '', `Compared with Obsidian ${base.obsidian}, the release last certified with \`npm run qa\`.`]
	if (gone.length) {
		lines.push('', '## Gone', '', `The theme relies on these, and Obsidian ${version} no longer has them.`, '')
		for (const { kind, token } of gone) lines.push(`- ${code(token)}: ${GONE[kind]}`)
	}
	const read = changed.filter((c) => !c.set)
	if (read.length) {
		lines.push('', '## Defaults the theme reads', '', 'Directly or down a `var()` chain, so these change how the theme looks.', '')
		lines.push(...read.flatMap(entry))
	}
	const set = changed.filter((c) => c.set)
	if (set.length) {
		lines.push('', '## Defaults of variables the theme sets', '', "The theme's value still wins wherever Obsidian's selector is no more specific than the theme's.", '')
		lines.push(...set.flatMap(entry))
	}
	lines.push('', '## Next', '', `Run \`npm run qa -- --obsidian ${version}\` and fix what it finds. Then certify the release with \`npm run drift -- --obsidian ${version} --update-baseline\` and commit \`qa/obsidian-baseline.json\`.`)
	return `${lines.join('\n')}\n`
}

async function main() {
	const uses = themeUses()
	const version = opt.obsidian?.replace(/^v/, '') ?? (await newestRelease())
	const app = appIndex(await obsidianAsar(version))

	if (opt['update-baseline']) {
		const base = certify(version, app, uses)
		writeFileSync(opt.baseline, `${JSON.stringify(base, null, '\t')}\n`)
		const n = KINDS.map((kind) => `${base.uses[kind].length} ${kind}`).join(', ')
		console.log(`certified Obsidian ${version} in ${relative(process.cwd(), opt.baseline)}: ${n}, ${Object.keys(base.defaults).length} defaults; not Obsidian's, so not checked: ${base.unknown.join(' ') || 'none'}`)
		return
	}

	const base = JSON.parse(readFileSync(opt.baseline, 'utf8'))
	const found = check(app, uses, base)
	if (found.fresh.length) console.log(`new since the baseline, so not checked until a release is certified: ${found.fresh.join(' ')}`)
	if (!found.gone.length && !found.changed.length) {
		console.log(`Obsidian ${version}: nothing the theme relies on has gone or changed since ${base.obsidian}.`)
		return
	}
	const md = markdown(version, base, found)
	console.log(md)
	if (opt.report) writeFileSync(opt.report, md)
	if (found.gone.length) process.exitCode = 1
}

await main()
