// axe judges text by its CSS color, but diagram labels are SVG text painted with
// fill, so it cannot see their contrast. This measures every label against the
// shapes painted under its centre. Obsidian draws diagrams with Pele from 1.15.
// Stringified and run inside Obsidian, so it can only use the page's globals.
async function measureLabels() {
	if (!window.pele) return { rendered: 0, expected: 0, low: [] }
	const scroller = document.querySelector('.workspace-leaf.mod-active .markdown-preview-view')
	const source = await app.vault.cachedRead(__qa.file('Diagrams.md'))

	const canvas = document.createElement('canvas').getContext('2d', { willReadFrequently: true })
	const rgba = (colour) => {
		canvas.clearRect(0, 0, 1, 1)
		canvas.fillStyle = colour
		canvas.fillRect(0, 0, 1, 1)
		const [r, g, b, a] = canvas.getImageData(0, 0, 1, 1).data
		return [r, g, b, a / 255]
	}
	const over = ([r, g, b, a], under) => [r, g, b].map((v, i) => v * a + under[i] * (1 - a))
	const luminance = (rgb) => {
		const [r, g, b] = rgb.map((v) => (v / 255 <= 0.03928 ? v / 255 / 12.92 : ((v / 255 + 0.055) / 1.055) ** 2.4))
		return 0.2126 * r + 0.7152 * g + 0.0722 * b
	}
	const contrast = (a, b) => {
		const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x)
		return (hi + 0.05) / (lo + 0.05)
	}
	const hex = (rgb) => `#${rgb.map((v) => Math.round(v).toString(16).padStart(2, '0')).join('')}`
	const opacity = (el, svg) => {
		let total = 1
		for (let e = el; e !== svg.parentElement; e = e.parentElement) total *= parseFloat(getComputedStyle(e).opacity)
		return total
	}
	const ground = over(rgba(getComputedStyle(document.body).getPropertyValue('--background-primary').trim()), [255, 255, 255])

	const measure = (svg) => {
		const painted = [...svg.querySelectorAll('*')]
		const shapes = painted.filter((el) => el.matches('rect, path, circle, ellipse, polygon'))
		const labels = [...svg.querySelectorAll('text')].flatMap((t) => (t.querySelector('tspan') ? [...t.querySelectorAll('tspan')] : [t]))
		return labels.flatMap((label) => {
			const text = label.textContent.trim()
			const box = label.getBoundingClientRect()
			const style = getComputedStyle(label)
			if (!text || !box.width || style.fill === 'none') return []
			const centre = new DOMPoint(box.left + box.width / 2, box.top + box.height / 2)
			const order = painted.indexOf(label.closest('text'))
			let under = ground
			for (const shape of shapes) {
				const s = getComputedStyle(shape)
				if (painted.indexOf(shape) > order || s.fill === 'none' || s.display === 'none' || s.visibility === 'hidden') continue
				if (!shape.isPointInFill(centre.matrixTransform(shape.getScreenCTM().inverse()))) continue
				const [r, g, b, a] = rgba(s.fill)
				under = over([r, g, b, a * parseFloat(s.fillOpacity) * opacity(shape, svg)], under)
			}
			const [r, g, b, a] = rgba(style.fill)
			const ink = over([r, g, b, a * parseFloat(style.fillOpacity) * opacity(label, svg)], under)
			return [{ text, ink: hex(ink), under: hex(under), ratio: contrast(ink, under) }]
		})
	}

	// Obsidian only renders what is near the viewport, so page through the note.
	const seen = new Map()
	for (let y = 0; ; y += Math.round(scroller.clientHeight / 2)) {
		scroller.scrollTop = y
		await __qa.settle()
		for (const svg of scroller.querySelectorAll('.mermaid svg.pele')) {
			const key = `${svg.getAttribute('aria-roledescription')}|${svg.textContent}`
			if (svg.textContent.trim() && !seen.has(key)) seen.set(key, measure(svg))
		}
		if (scroller.scrollTop + scroller.clientHeight >= scroller.scrollHeight - 1) break
	}
	scroller.scrollTop = 0
	await __qa.settle()
	return {
		rendered: seen.size,
		expected: source.match(/^```mermaid$/gm).length,
		low: [...seen.values()].flat().filter((label) => label.ratio < 4.5),
	}
}

export async function assertDiagramContrast(page) {
	const { rendered, expected, low } = await page.evaluate(`(${measureLabels})()`)
	if (rendered !== expected) throw new Error(`rendered ${rendered} of ${expected} diagrams`)
	if (low.length) {
		const pairs = [...new Map(low.map((l) => [`${l.ink} on ${l.under}`, l])).values()]
		throw new Error(`${low.length} diagram labels under 4.5:1: ${pairs.map((l) => `"${l.text}" ${l.ink} on ${l.under} is ${l.ratio.toFixed(2)}:1`).join('; ')}`)
	}
}
