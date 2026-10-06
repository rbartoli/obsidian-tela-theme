// Build theme.css from src/ and optionally copy it into test vaults.
//
// Obsidian installs only theme.css and manifest.json from a release, so the
// partials in src/ are concatenated in filename order into one file. Plain CSS:
// the review linter targets Electron >= 43, which covers nesting, color-mix()
// and oklch(), so there is nothing for a preprocessor to add.
//
// Usage:
//   node scripts/build.mjs           build theme.css, copy to vaults
//   node scripts/build.mjs --watch   rebuild and copy on every change in src/
//   node scripts/build.mjs --check   fail if theme.css is stale (CI)
//
// Vault targets come from TELA_THEME_DIRS in .env: one or more theme folders,
// separated by ";", e.g. /mnt/c/Users/me/Vaults/Test/.obsidian/themes/Tela

import { copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, watch, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'

const root = resolve(import.meta.dirname, '..')
const SRC = join(root, 'src')
const OUT = join(root, 'theme.css')
const MANIFEST = join(root, 'manifest.json')

function loadEnv() {
	const file = join(root, '.env')
	if (!existsSync(file)) return
	for (const line of readFileSync(file, 'utf8').split('\n')) {
		const m = /^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*?)\s*$/i.exec(line)
		if (m && !(m[1] in process.env)) process.env[m[1]] = m[2].replace(/^(['"])(.*)\1$/, '$2')
	}
}

function compile() {
	const parts = readdirSync(SRC)
		.filter((f) => f.endsWith('.css'))
		.sort()
		.map((f) => readFileSync(join(SRC, f), 'utf8').trimEnd())
	return parts.join('\n\n') + '\n'
}

function targets() {
	return (process.env.TELA_THEME_DIRS ?? '')
		.split(';')
		.map((d) => d.trim())
		.filter(Boolean)
}

function build() {
	const css = compile()
	writeFileSync(OUT, css)
	for (const dir of targets()) {
		mkdirSync(dir, { recursive: true })
		writeFileSync(join(dir, 'theme.css'), css)
		copyFileSync(MANIFEST, join(dir, 'manifest.json'))
	}
	const copied = targets().length ? ` → ${targets().length} vault(s)` : ''
	console.log(`${new Date().toLocaleTimeString()} built theme.css (${css.length} bytes)${copied}`)
}

loadEnv()
const args = process.argv.slice(2)

if (args.includes('--check')) {
	if (!existsSync(OUT) || readFileSync(OUT, 'utf8') !== compile()) {
		console.error('theme.css is out of date: run `npm run build` and commit it.')
		process.exit(1)
	}
	console.log('theme.css is up to date.')
} else {
	build()
	if (args.includes('--watch')) {
		let timer
		const rebuild = () => {
			clearTimeout(timer)
			timer = setTimeout(() => {
				try {
					build()
				} catch (err) {
					console.error(err.message)
				}
			}, 50)
		}
		watch(SRC, rebuild)
		watch(MANIFEST, rebuild)
		console.log('watching src/ and manifest.json')
	}
}
