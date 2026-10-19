// "?neu" only picks the heading right after creating a pot or joining one. It doesn't belong
// in a bookmark or a copied address, so it leaves the address bar once the page is shown.
if (location.search === '?neu') history.replaceState(null, '', location.pathname);

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

// Confirmation for destructive forms: a dialog in the page's design instead of the browser's confirm().
// The confirming button repeats the label of the button that was pressed. Without JavaScript, forms just submit.
const confirmForms = document.querySelectorAll('form[data-confirm]');
if (confirmForms.length > 0) {
	const dialog = document.createElement('dialog');
	dialog.className = 'confirm';
	dialog.innerHTML =
		'<p></p><div class="dialog-actions"><button type="button" class="secondary" data-cancel>Abbrechen</button><button type="button" data-ok></button></div>';
	document.body.append(dialog);
	const message = dialog.querySelector('p');
	const ok = dialog.querySelector('[data-ok]');
	let pending;
	dialog.querySelector('[data-cancel]').addEventListener('click', () => dialog.close());
	dialog.addEventListener('click', (event) => {
		if (event.target === dialog) dialog.close(); // the backdrop
	});
	ok.addEventListener('click', () => {
		const form = pending;
		dialog.close();
		form.dataset.confirmed = '';
		form.requestSubmit();
	});
	for (const form of confirmForms) {
		form.addEventListener('submit', (event) => {
			if ('confirmed' in form.dataset) return;
			event.preventDefault();
			pending = form;
			message.textContent = form.dataset.confirm;
			ok.textContent = event.submitter?.textContent.trim() || 'Ja';
			dialog.showModal(); // focuses "Abbrechen", the safe choice
		});
	}
}
