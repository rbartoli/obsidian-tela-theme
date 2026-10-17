// Inspect Chromium's native date controls through CDP: their icon and text live
// in a user-agent shadow root, which document.querySelector cannot reach.
export async function assertDateInputSeparation(page) {
	const { root } = await page.send('DOM.getDocument', { depth: -1, pierce: true })
	const attrs = (node) => Object.fromEntries(Array.from({ length: (node.attributes?.length ?? 0) / 2 }, (_, i) => node.attributes.slice(i * 2, i * 2 + 2)))
	function* descendants(node) {
		yield node
		for (const child of [...(node.children ?? []), ...(node.shadowRoots ?? [])]) yield* descendants(child)
	}
	const inputs = [...descendants(root)].filter((n) => n.nodeName === 'INPUT' && ['date', 'datetime-local'].includes(attrs(n).type) && attrs(n).disabled === undefined)
	if (inputs.length !== 4) throw new Error(`expected four date inputs, found ${inputs.length}`)
	const bounds = async (node) => {
		const { model } = await page.send('DOM.getBoxModel', { nodeId: node.nodeId })
		const q = model.border
		return { left: Math.min(q[0], q[2], q[4], q[6]), right: Math.max(q[0], q[2], q[4], q[6]), top: Math.min(q[1], q[3], q[5], q[7]), bottom: Math.max(q[1], q[3], q[5], q[7]) }
	}
	for (const input of inputs) {
		const nodes = [...descendants(input)]
		const picker = nodes.find((n) => attrs(n).pseudo === '-webkit-calendar-picker-indicator')
		const fields = nodes.filter((n) => /^-webkit-datetime-edit-.*-field$/.test(attrs(n).pseudo ?? ''))
		if (!picker || !fields.length) throw new Error('native date input icon or text fields missing')
		const icon = await bounds(picker)
		for (const field of fields) {
			const text = await bounds(field)
			if (Math.min(icon.right, text.right) > Math.max(icon.left, text.left) && Math.min(icon.bottom, text.bottom) > Math.max(icon.top, text.top)) {
				throw new Error(`calendar icon overlaps ${attrs(input).type} ${attrs(field)['aria-label']} field`)
			}
		}
	}
}
