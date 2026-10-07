// Scenes for qa/run.mjs: what each screen opens, on which devices.
//
// Functions passed to p.run() and installHelpers() are stringified and run
// inside Obsidian, so they can only use the page's globals (app, document,
// __qa), not this module's scope.

// Phone and tablet are Obsidian's own mobile emulation: the window size picks
// between them, at 600px (app.js: "(min-width: 600px) and (min-height: 600px)").
export const devices = {
	desktop: { width: 1200, height: 800, deviceScaleFactor: 1, mobile: false },
	phone: { width: 390, height: 844, deviceScaleFactor: 2, mobile: true },
	tablet: { width: 1180, height: 820, deviceScaleFactor: 2, mobile: true },
}

// Obsidian's names for its base colour schemes.
export const modes = { dark: 'obsidian', light: 'moonstone' }

const READING = '.workspace-leaf.mod-active .markdown-preview-view'
const EDITING = '.workspace-leaf.mod-active .cm-scroller'

// name: used in --scene and output paths. scroll: the scroller to page
// through, one screenshot and audit per screenful. only: the devices a scene
// applies to; modes: the colour schemes. own: needs this repo's theme (a Style
// Settings class). plugin: needs that community plugin (skipped with
// --no-plugins).
// auditCss: applied during the audit only, after the screenshot, to hide
// transparent layers that stop axe from finding the text's background.
// audit: the overlay a scene opens; only it is audited, since the screen
// behind it is audited in the scenes without it. blocks: for a scroller that
// renders everything at once, the blocks to audit, each once, on the first
// screen that shows it whole, or else the last screen that shows its top.
export const scenes = [
	{ name: 'reading', scroll: READING, setup: (p) => p.run(() => __qa.open('Tour.md', { mode: 'preview' })) },
	{ name: 'editing', scroll: EDITING, setup: (p) => p.run(() => __qa.edit('Tour.md')) },
	{ name: 'properties', setup: (p) => p.run(() => __qa.edit('Properties.md')) },
	{
		name: 'canvas',
		setup: (p) =>
			p.run(async () => {
				const leaf = await __qa.open('Canvas.canvas')
				leaf.view.canvas.zoomToFit()
				await __qa.settle(800)
			}),
		// An empty, transparent div over each card that swallows clicks.
		auditCss: '.canvas-node-content-blocker { display: none; }',
	},
	{ name: 'base-table', setup: (p) => p.run(() => __qa.base('Table')) },
	{ name: 'base-cards', setup: (p) => p.run(() => __qa.base('Cards')) },
	{
		name: 'search',
		setup: (p) =>
			p.run(async () => {
				await __qa.open('Tour.md', { mode: 'preview' })
				await __qa.search('callout')
			}),
	},
	{
		name: 'backlinks',
		setup: (p) =>
			p.run(async () => {
				await __qa.open('Properties.md', { mode: 'preview' })
				await __qa.reveal('backlink')
			}),
	},
	{
		name: 'palette',
		setup: (p) =>
			p.run(async () => {
				await __qa.open('Tour.md', { mode: 'preview' })
				app.commands.executeCommandById('command-palette:open')
				await __qa.settle(600)
			}),
		audit: '.modal-container',
	},
	{
		name: 'menu',
		setup: (p) =>
			p.run(async () => {
				await __qa.open('Tour.md', { mode: 'preview' })
				await __qa.reveal('file-explorer')
				const row = await __qa.find('.nav-file-title[data-path="Tour.md"]')
				const r = row.getBoundingClientRect()
				row.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, clientX: r.left + 40, clientY: r.top + r.height / 2 }))
				await __qa.settle(600)
			}),
		audit: '.menu',
	},
	{
		name: 'popover',
		only: ['desktop'],
		setup: (p) =>
			p.run(async () => {
				const leaf = await __qa.open('Tour.md', { mode: 'preview' })
				const link = await __qa.find('.markdown-preview-view a.internal-link[data-href="Properties"]', leaf.view.containerEl)
				const r = link.getBoundingClientRect()
				app.workspace.trigger('hover-link', {
					event: new MouseEvent('mouseover', { clientX: r.left + 5, clientY: r.top + 5 }),
					source: 'preview',
					hoverParent: leaf.view,
					targetEl: link,
					linktext: 'Properties',
					sourcePath: 'Tour.md',
				})
				await __qa.find('.hover-popover .markdown-preview-view')
				await __qa.settle(800)
			}),
		audit: '.hover-popover',
	},
	{
		name: 'graph',
		setup: (p) =>
			p.run(async () => {
				await app.workspace.getLeaf(false).setViewState({ type: 'graph', active: true })
				await __qa.settle(2500)
			}),
	},
	{
		name: 'settings',
		setup: (p) =>
			p.run(async () => {
				app.setting.open()
				app.setting.openTabById('appearance')
				await __qa.settle(600)
			}),
		audit: '.modal-container',
	},
	{
		name: 'drawer',
		only: ['phone', 'tablet'],
		setup: (p) =>
			p.run(async () => {
				await __qa.open('Tour.md', { mode: 'preview' })
				await __qa.reveal('file-explorer')
			}),
	},
	// Printing and PDF export render the note into a .print element at the end
	// of the body, always in light mode, and print it under @media print, which
	// hides the rest of the app. This is the same renderer and element, with
	// print media emulated. The document won't scroll under emulated print
	// media, so the element is given the viewport's height and scrolls itself.
	{
		name: 'print',
		only: ['desktop'],
		modes: ['light'],
		scroll: 'body > .print',
		blocks: '.print .markdown-preview-view > div',
		setup: async (p) => {
			await p.run(() => __qa.print('Tour.md'))
			await p.send('Emulation.setEmulatedMedia', { media: 'print' })
			await p.run(() => __qa.settle(800))
		},
	},
	// The frameless window's own title bar buttons, with nothing beside them:
	// both sidebars collapsed.
	{
		name: 'titlebar',
		only: ['desktop'],
		setup: (p) =>
			p.run(async () => {
				await __qa.open('Tour.md', { mode: 'preview' })
				app.workspace.leftSplit.collapse()
				app.workspace.rightSplit.collapse()
				await __qa.settle(600)
			}),
	},
	// Settings → Editor → Right-to-left, with Arabic and Hebrew text.
	{
		name: 'rtl-reading',
		scroll: READING,
		setup: (p) =>
			p.run(async () => {
				app.vault.setConfig('rightToLeft', true)
				await __qa.open('RTL.md', { mode: 'preview' })
			}),
	},
	{
		name: 'rtl-editing',
		setup: (p) =>
			p.run(async () => {
				app.vault.setConfig('rightToLeft', true)
				await __qa.edit('RTL.md')
			}),
	},
	// Popular plugins' own views.
	{ name: 'dataview', plugin: 'dataview', setup: (p) => p.run(() => __qa.open('Plugins/Dataview.md', { mode: 'preview' })) },
	{ name: 'tasks-query', plugin: 'obsidian-tasks-plugin', setup: (p) => p.run(() => __qa.open('Plugins/Tasks.md', { mode: 'preview' })) },
	{ name: 'kanban', plugin: 'obsidian-kanban', setup: (p) => p.run(() => __qa.view('Board.md', 'kanban')) },
	{ name: 'excalidraw', plugin: 'obsidian-excalidraw-plugin', setup: (p) => p.run(() => __qa.view('Plugins/Drawing.excalidraw.md', 'excalidraw')) },
	// Iconize draws its icons in the file tree, where the theme draws its marks.
	{
		name: 'iconize',
		plugin: 'obsidian-icon-folder',
		setup: (p) =>
			p.run(async () => {
				await __qa.open('Tour.md', { mode: 'preview' })
				await __qa.reveal('file-explorer')
			}),
	},
	// Distinct sidebars put the sidebars on a recessed surface, where faint
	// text (file-type badges, result counts) has the least room.
	{
		name: 'distinct-explorer',
		own: true,
		setup: (p) =>
			p.run(async () => {
				document.body.classList.add('tela-distinct-sidebar')
				await __qa.open('Properties.md', { mode: 'preview' })
				await __qa.reveal('file-explorer')
				if (!app.isMobile) await __qa.reveal('backlink')
			}),
	},
	{
		name: 'distinct-search',
		own: true,
		setup: (p) =>
			p.run(async () => {
				document.body.classList.add('tela-distinct-sidebar')
				await __qa.open('Tour.md', { mode: 'preview' })
				await __qa.search('callout')
			}),
	},
]

// Installed after every page load (and after the mobile reloads).
export function installHelpers() {
	const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
	const frames = () => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)))
	const ws = app.workspace
	window.__qa = {
		// Two frames, a pause for async rendering (images, maths, diagrams), then
		// until running transitions finish: some themes fade colours for longer
		// than the pause, and axe would measure a colour between two states.
		async settle(ms = 400) {
			await frames()
			await sleep(ms)
			const end = Date.now() + 3000
			const running = () => document.getAnimations().some((a) => a.playState === 'running' && a.effect?.getComputedTiming().endTime !== Infinity)
			while (running() && Date.now() < end) await sleep(50)
			await frames()
		},
		// Waits for an element that renders late (drawers, virtualised lists).
		async find(selector, root = document, timeout = 5000) {
			const end = Date.now() + timeout
			for (;;) {
				const el = root.querySelector(selector)
				if (el) return el
				if (Date.now() > end) throw new Error(`no ${selector} after ${timeout / 1000}s`)
				await sleep(100)
			}
		},
		file(path) {
			const file = app.vault.getAbstractFileByPath(path)
			if (!file) throw new Error(`no file ${path} in the demo vault`)
			return file
		},
		async open(path, state = {}) {
			const leaf = ws.getLeaf(false)
			await leaf.openFile(this.file(path), { state, active: true })
			await this.settle()
			return leaf
		},
		// Live preview, with the cursor parked on the empty line under the
		// title so no line shows its markdown, and the editor blurred.
		async edit(path) {
			const leaf = await this.open(path, { mode: 'source', source: false })
			const editor = leaf.view.editor
			const line = [...Array(editor.lineCount()).keys()].find((n) => editor.getLine(n).trim() === '') ?? 0
			editor.setCursor({ line, ch: 0 })
			editor.blur()
			await this.settle()
			return leaf
		},
		// Opens a file in a plugin's view, which the plugin usually picks itself.
		async view(path, type) {
			const leaf = await this.open(path)
			if (leaf.view.getViewType() !== type) await leaf.setViewState({ type, state: { file: path }, active: true })
			await this.settle(1500)
			if (leaf.view.getViewType() !== type) throw new Error(`${path} did not open in the ${type} view`)
			return leaf
		},
		// Renders a note the way PDF export does. The export modal holds the
		// renderer, so it is opened and caught on its way to the screen.
		async print(path) {
			const leaf = await this.open(path, { mode: 'preview' })
			let proto = app.setting
			let base
			while ((proto = Object.getPrototypeOf(proto)) && proto !== Object.prototype) if (Object.hasOwn(proto, 'open')) base = proto
			const open = base.open
			let modal
			base.open = function () {
				modal = this
				return open.call(this)
			}
			try {
				leaf.view.printToPdf()
			} finally {
				base.open = open
			}
			if (!modal?.print) throw new Error('no PDF export modal')
			modal.close()
			const el = document.body.createDiv('print')
			Object.assign(el.style, { height: '100vh', overflowY: 'auto' })
			await modal.print(el, leaf.view, true)
			await this.settle(800)
			return leaf
		},
		// The blocks matching selector to audit on this screen: those it shows
		// whole, and those whose top the next screen will scroll past. The next
		// screen starts 93% of a screen down (capture in qa/run.mjs), so a block
		// cut off at the bottom waits for it only if its top is below that line.
		blocks(selector) {
			const h = innerHeight
			const fresh = [...document.querySelectorAll(selector)].filter((el) => {
				const r = el.getBoundingClientRect()
				return !this.audited.has(el) && r.height > 0 && r.top >= -1 && (r.bottom <= h || r.top < h * 0.93)
			})
			for (const el of fresh) this.audited.add(el)
			return { include: fresh }
		},
		audited: new WeakSet(),
		async base(view) {
			const leaf = await this.open('Library.base')
			await leaf.view.controller.selectView?.(view)
			await this.settle(800)
			return leaf
		},
		// Opens a sidebar view: on mobile, its drawer.
		async reveal(type) {
			const leaf = ws.getLeavesOfType(type)[0]
			if (!leaf) throw new Error(`no ${type} view`)
			await ws.revealLeaf(leaf)
			await leaf.loadIfDeferred?.()
			await this.settle(600)
			return leaf
		},
		async search(query) {
			const leaf = await this.reveal('search')
			leaf.view.setQuery(query)
			await this.settle(1200)
			return leaf
		},
		// One empty tab, the file explorer showing every folder open, the right
		// sidebar (and on mobile both drawers) closed, no Style Settings class,
		// nothing set up for printing, left-to-right.
		// The tab is emptied, not reused: a note reopened in its own tab comes
		// back at its last scroll position.
		async reset() {
			document.body.classList.remove('tela-distinct-sidebar')
			for (const el of document.querySelectorAll('body > .print')) el.remove()
			this.audited = new WeakSet()
			if (app.vault.getConfig('rightToLeft')) app.vault.setConfig('rightToLeft', false)
			const leaves = []
			ws.iterateRootLeaves((leaf) => leaves.push(leaf))
			for (const leaf of leaves.slice(1)) leaf.detach()
			await leaves[0]?.setViewState({ type: 'empty' })
			// Sidebar views load on first show, so they may not have their methods yet.
			ws.getLeavesOfType('search')[0]?.view.setQuery?.('')
			const explorer = ws.getLeavesOfType('file-explorer')[0]
			for (const item of Object.values(explorer?.view.fileItems ?? {})) item.setCollapsed?.(false)
			if (app.isMobile) ws.leftSplit.collapse()
			else await this.reveal('file-explorer')
			ws.rightSplit.collapse()
			await this.settle()
		},
	}
}
