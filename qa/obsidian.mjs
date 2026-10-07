// Shared by qa/run.mjs and scripts/shots.mjs: finding, downloading and
// caching Obsidian's desktop app packages, and small async helpers.
import { existsSync, mkdirSync, readdirSync, renameSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'
import { gunzipSync } from 'node:zlib'

export const cache = join(process.env.XDG_CACHE_HOME ?? join(homedir(), '.cache'), 'tela-qa')

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

export const byVersion = (a, b) => {
	const [x, y] = [a, b].map((v) => v.split('.').map(Number))
	for (let i = 0; i < Math.max(x.length, y.length); i++) if ((x[i] ?? 0) !== (y[i] ?? 0)) return (x[i] ?? 0) - (y[i] ?? 0)
	return 0
}

// Retries fn until it returns something truthy; errors count as "not yet".
export async function until(what, fn, timeout = 60_000) {
	const end = Date.now() + timeout
	let last
	for (;;) {
		try {
			const v = await fn()
			if (v) return v
		} catch (err) {
			if (err.fatal) throw err
			last = err
		}
		if (Date.now() > end) throw new Error(`timed out waiting for ${what}${last ? ` (${last.message})` : ''}`)
		await sleep(250)
	}
}

export async function download(url) {
	const res = await fetch(url)
	if (!res.ok) throw new Error(`${url}: HTTP ${res.status}`)
	return Buffer.from(await res.arrayBuffer())
}

// Some releases are mobile-only (1.13.8 ships just an APK), so the default is
// the newest release with a desktop app package.
export async function obsidianVersion(requested) {
	if (requested) return requested.replace(/^v/, '')
	try {
		const releases = JSON.parse(await download('https://api.github.com/repos/obsidianmd/obsidian-releases/releases?per_page=30'))
		const desktop = releases.find((r) => !r.prerelease && !r.draft && r.assets.some((a) => /^obsidian-.+\.asar\.gz$/.test(a.name)))
		if (!desktop) throw new Error('no recent release has a desktop package')
		return desktop.tag_name.replace(/^v/, '')
	} catch (err) {
		const cached = existsSync(cache) ? readdirSync(cache).map((f) => /^obsidian-(.+)\.asar$/.exec(f)?.[1]).filter(Boolean).sort(byVersion) : []
		if (!cached.length) throw new Error(`cannot look up the latest Obsidian release (${err.message}); pass --obsidian <version>`)
		console.log(`offline: using the newest cached Obsidian, ${cached.at(-1)}`)
		return cached.at(-1)
	}
}

export async function obsidianAsar(version) {
	const file = join(cache, `obsidian-${version}.asar`)
	if (!existsSync(file)) {
		console.log(`downloading Obsidian ${version}`)
		const gz = await download(`https://github.com/obsidianmd/obsidian-releases/releases/download/v${version}/obsidian-${version}.asar.gz`).catch((err) => {
			throw /HTTP 404/.test(err.message) ? new Error(`Obsidian ${version} has no desktop app package on GitHub (some releases are mobile-only)`) : err
		})
		mkdirSync(cache, { recursive: true })
		writeFileSync(`${file}.tmp`, gunzipSync(gz))
		renameSync(`${file}.tmp`, file)
	}
	return file
}
