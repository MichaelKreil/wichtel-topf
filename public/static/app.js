// Theme preview on the start page
for (const radio of document.querySelectorAll('input[name="theme"]')) {
	radio.addEventListener('change', () => {
		document.body.dataset.theme = radio.value;
	});
}

// Background filter on the start page: shows only the photos with a tag.
// Choosing a code name list sets the filter to the photos that fit it.
const filter = document.querySelector('[data-theme-filter]');
if (filter) {
	const photos = [...document.querySelectorAll('.theme')];
	const applyFilter = () => {
		for (const photo of photos)
			photo.hidden = filter.value !== '' && !photo.dataset.tags.split(' ').includes(filter.value);
		// the chosen photo was filtered out: take the first one shown instead
		const chosen = document.querySelector('input[name="theme"]:checked');
		if (!chosen || chosen.closest('.theme').hidden) {
			const first = photos.find((photo) => !photo.hidden)?.querySelector('input');
			if (first) {
				first.checked = true;
				first.dispatchEvent(new Event('change'));
			}
		}
	};
	filter.closest('.theme-filter').hidden = false;
	filter.addEventListener('change', applyFilter);
	for (const radio of document.querySelectorAll('input[name="codenames"]')) {
		radio.addEventListener('change', () => {
			if (!radio.dataset.tag) return;
			filter.value = radio.dataset.tag;
			applyFilter();
		});
	}
}

// Filter on the result page: shows only the rows whose code name contains the typed text
const rowFilter = document.querySelector('[data-filter-rows]');
if (rowFilter) {
	rowFilter.closest('.filter').hidden = false;
	const empty = document.querySelector('[data-filter-empty]');
	const rows = [...document.querySelectorAll('.note tbody tr')];
	rowFilter.addEventListener('input', () => {
		const needle = rowFilter.value.trim().toLowerCase();
		let shown = 0;
		for (const row of rows) {
			row.hidden = !row.firstElementChild.textContent.toLowerCase().includes(needle);
			if (!row.hidden) shown++;
		}
		empty.hidden = shown > 0;
	});
}

// Share buttons for links, only where the device can share (mostly phones)
for (const button of document.querySelectorAll('[data-share]')) {
	if (!navigator.share) continue;
	button.hidden = false;
	button.addEventListener('click', () => {
		const url = button.closest('.copy').querySelector('input').value;
		navigator.share({ title: 'Wichteltopf', text: button.dataset.share, url }).catch(() => {});
	});
}

// Copy buttons for links
for (const button of document.querySelectorAll('[data-copy]')) {
	button.addEventListener('click', async () => {
		const input = button.closest('.copy').querySelector('input');
		try {
			await navigator.clipboard.writeText(input.value);
			button.textContent = 'Kopiert ✓';
		} catch {
			input.select();
		}
	});
}

// Confirmation for destructive forms
for (const form of document.querySelectorAll('form[data-confirm]')) {
	form.addEventListener('submit', (event) => {
		if (!confirm(form.dataset.confirm)) event.preventDefault();
	});
}
