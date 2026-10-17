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
// It lists the variables app.css added and removed since that release, and
// flags variables Obsidian declares per mode or platform where a value the
// theme sets once can lose, or reach only some modes. Certifying a release
// accepts the ones it has, so the report shows only new ones.
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
	return { sets: keep(sets), reads: keep(reads), selectors: keep(selectors), decls: decls.filter((d) => d.name.startsWith('--')) }
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
	return { obsidian: version, uses: tracked, unknown: unknown.sort(byName), defaults, accepted: traps(app, uses).map((t) => t.key) }
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

// The variables app.css defines in the release and not in the certified one,
// and the reverse, so a polish pass can see what Obsidian now offers.
function variables(app, baseApp) {
	const diff = (a, b) => [...a.defaults.keys()].filter((v) => !b.defaults.has(v)).sort(byName)
	return { added: diff(app, baseApp), removed: diff(baseApp, app) }
}

// Mode and platform classes Obsidian sets on body.
const MODE = /\.(theme-dark|theme-light|is-mobile|is-phone|is-tablet|is-ios|is-android|mod-macos|mod-windows|mod-linux)(?![\w-])/

// A list split at its top-level commas, or a selector at its top-level
// combinators, leaving :not(a, b) and attribute values whole.
function split(s, at) {
	const parts = []
	let depth = 0
	let start = 0
	for (let i = 0; i < s.length; i++) {
		if (s[i] === '(' || s[i] === '[') depth++
		else if (s[i] === ')' || s[i] === ']') depth--
		else if (depth === 0 && at.test(s[i])) {
			parts.push(s.slice(start, i))
			start = i + 1
		}
	}
	return [...parts, s.slice(start)].map((p) => p.trim()).filter(Boolean)
}

function specificity(selector) {
	const s = [0, 0, 0]
	const add = (t) => t.forEach((n, i) => (s[i] += n))
	let rest = selector.replace(/"[^"]*"|'[^']*'/g, '""').replace(/:where\((?:[^()]|\([^()]*\))*\)/g, '')
	rest = rest.replace(/:(?:not|is|has)\(((?:[^()]|\([^()]*\))*)\)/g, (_, list) => {
		add(split(list, /,/).map(specificity).reduce((a, b) => (a[0] - b[0] || a[1] - b[1] || a[2] - b[2]) >= 0 ? a : b))
		return ''
	})
	s[2] += (rest.match(/::[\w-]+/g) ?? []).length
	rest = rest.replace(/::[\w-]+/g, '')
	s[0] += (rest.match(/#[\w-]+/g) ?? []).length
	s[1] += (rest.match(/\.[\w-]+|\[[^\]]*\]|:[\w-]+(\([^)]*\))?/g) ?? []).length
	s[2] += (rest.match(/(?:^|[\s>+~])[a-zA-Z][\w-]*/g) ?? []).length
	return s
}

// The element a selector styles: body, for a selector on body alone (its mode,
// platform and state classes), else its last compound without mode classes.
function subject(selector) {
	const parts = split(selector, /[\s>+~]/)
	const last = parts.at(-1).replace(/:(?:not|is|where)\((?:[^()]|\([^()]*\))*\)/g, '')
	if (parts.length === 1 && /^(body|html|:root)?(\.(theme|is|mod|tela|show)-[\w-]+)*$/.test(last)) return 'body'
	return last.replace(new RegExp(MODE.source, 'g'), '').split(/(?=[.[:])/).sort(byName).join('')
}

// Every mode and platform body can be in, as the classes Obsidian gives it.
const STATES = ['theme-dark', 'theme-light'].flatMap((mode) =>
	[['mod-macos'], ['mod-windows'], ['mod-linux'], ...['is-phone', 'is-tablet'].flatMap((size) => ['is-ios', 'is-android'].map((os) => ['is-mobile', size, os]))].map((platform) => new Set([mode, ...platform])),
)

// Whether a selector on body applies in a state: the mode and platform classes
// it names are there, and those its :not() names aren't. Other classes, such
// as a style setting's, count as there.
function applies(selector, state) {
	const modes = (sel) => [...sel.matchAll(new RegExp(MODE.source, 'g'))].map((m) => m[1])
	const negated = [...selector.matchAll(/:not\(((?:[^()]|\([^()]*\))*)\)/g)].flatMap((m) => modes(m[1]))
	return modes(selector.replace(/:not\((?:[^()]|\([^()]*\))*\)/g, '')).every((c) => state.has(c)) && !negated.some((c) => state.has(c))
}

const atRules = (scope) => scope.split(' » ').filter((p) => p.startsWith('@')).join(' » ')
const selectorsOf = (scope) => split(scope.split(' » ').at(-1), /,/)
const outranks = (a, b) => (a[0] - b[0] || a[1] - b[1] || a[2] - b[2]) > 0

// Variables the theme sets on body that Obsidian also declares there for a
// mode or platform: in some state of body the theme sets them for, Obsidian's
// selector outranks the theme's best and gives a different value, so there
// the theme's value doesn't reach. theme.css loads after app.css, so a tie
// goes to the theme. Declarations on a component (.is-mobile .menu) are
// Obsidian styling that component, and declarations in at-rules are left out.
function overrides(app, uses) {
	const onBody = (scope) => (atRules(scope) ? [] : selectorsOf(scope).filter((sel) => subject(sel) === 'body'))
	const found = []
	for (const v of uses.sets) {
		const theme = uses.decls.filter((d) => d.name === v).flatMap((d) => onBody(d.scope).map((sel) => ({ sel, spec: specificity(sel), value: d.value })))
		for (const [scope, value] of Object.entries(app.defaults.get(v) ?? {})) {
			for (const sel of onBody(scope).filter((sel) => MODE.test(sel))) {
				const spec = specificity(sel)
				const lost = STATES.some((state) => {
					if (!applies(sel, state)) return false
					const best = theme.filter((t) => applies(t.sel, state)).sort((a, b) => (outranks(a.spec, b.spec) ? -1 : 1))[0]
					return best && best.value !== value && outranks(spec, best.spec)
				})
				if (lost) found.push({ key: `${v} ${sel}`, text: `\`${v}\`: \`${sel}\` sets \`${value}\`, over the theme's value` })
			}
		}
	}
	return found
}

// Variables the theme leaves alone that Obsidian points at different
// variables per mode or platform, at least one of them the theme's: as it
// points the phone drawer's background at --background-secondary in dark mode
// and --background-primary in light. A value the theme gives one of them for
// that surface reaches only the modes that read it. Per-mode steps of the
// base palette (--color-base-*) are how Obsidian shades its modes, and are
// left out.
function pointers(app, uses) {
	const sets = new Set(uses.sets)
	const found = []
	for (const [v, scopes] of app.defaults) {
		if (sets.has(v)) continue
		const modal = Object.entries(scopes).filter(([scope]) => !atRules(scope) && selectorsOf(scope).some((sel) => MODE.test(sel) && subject(sel) === 'body'))
		const targets = new Set(modal.map(([, value]) => refs(value).filter((r) => sets.has(r) && !r.startsWith('--color-base-')).join(' ')))
		if (targets.size > 1) found.push({ key: v, text: `\`${v}\`: ${modal.map(([scope, value]) => `\`${scope}\` → \`${value}\``).join(', ')}` })
	}
	return found.sort((a, b) => byName(a.key, b.key))
}

const traps = (app, uses) => [...overrides(app, uses), ...pointers(app, uses)]

const GONE = {
	sets: 'the theme sets it; Obsidian no longer reads it.',
	reads: 'the theme reads it; Obsidian no longer defines it.',
	selectors: 'the theme styles it; Obsidian no longer uses it.',
}

function markdown(version, base, { gone, changed, vars, modes }, uses) {
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
	if (modes.length) {
		lines.push('', '## Set for one mode or platform', '', "Obsidian declares these per mode or platform, so a value the theme sets once can lose there, or reach only some modes. Reassert the theme's value at Obsidian's specificity; or, if Obsidian's value is right there, certify the release to accept it.", '')
		lines.push(...modes.map((m) => `- ${m.text}`))
	}
	if (vars?.added.length || vars?.removed.length) {
		const list = (vs) => vs.map((v) => code(v) + (uses.has(v) ? ' (the theme uses it)' : '')).join(', ')
		lines.push('', '## Variables', '')
		if (vars.added.length) lines.push(`${vars.added.length} new in Obsidian ${version}: ${list(vars.added)}.`, '')
		if (vars.removed.length) lines.push(`${vars.removed.length} gone since ${base.obsidian}: ${list(vars.removed)}.`, '')
		lines.pop()
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
	found.vars = base.obsidian === version ? null : variables(app, appIndex(await obsidianAsar(base.obsidian)))
	found.modes = traps(app, uses).filter((t) => !base.accepted?.includes(t.key))
	if (found.fresh.length) console.log(`new since the baseline, so not checked until a release is certified: ${found.fresh.join(' ')}`)
	if (!found.gone.length && !found.changed.length && !found.modes.length && !found.vars?.added.length && !found.vars?.removed.length) {
		console.log(`Obsidian ${version}: nothing the theme relies on has gone or changed since ${base.obsidian}.`)
		return
	}
	const md = markdown(version, base, found, new Set([...uses.sets, ...uses.reads]))
	console.log(md)
	if (opt.report) writeFileSync(opt.report, md)
	if (found.gone.length) process.exitCode = 1
}

await main()
