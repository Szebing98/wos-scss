function escapeCsvValue(value: unknown): string {
	const text =
		value === null || value === undefined
			? ""
			: typeof value === "object"
				? JSON.stringify(value)
				: String(value);
	return `"${text.replace(/"/g, '""')}"`;
}

function displayValue(value: unknown): string {
	if (value === null || value === undefined) return "";
	if (typeof value === "object") return JSON.stringify(value);
	const text = String(value);
	const isoDate = text.match(/^(\d{4}-\d{2}-\d{2})[T\s]\d{2}:\d{2}/);
	return isoDate ? isoDate[1] : text;
}

export function downloadCsv(
	filename: string,
	rows: Record<string, unknown>[],
	columns?: { key: string; label: string }[],
) {
	if (!rows.length) throw new Error("There is no data to export.");

	const selectedColumns =
		columns ??
		Array.from(new Set(rows.flatMap((row) => Object.keys(row)))).map((key) => ({
			key,
			label: key,
		}));
	const content = [
		selectedColumns.map((column) => escapeCsvValue(column.label)).join(","),
		...rows.map((row) =>
			selectedColumns.map((column) => escapeCsvValue(displayValue(row[column.key]))).join(","),
		),
	].join("\r\n");

	const blob = new Blob([`\uFEFF${content}`], { type: "text/csv;charset=utf-8" });
	const url = URL.createObjectURL(blob);
	const anchor = document.createElement("a");
	anchor.href = url;
	anchor.download = filename;
	document.body.appendChild(anchor);
	anchor.click();
	anchor.remove();
	URL.revokeObjectURL(url);
}

export function printRowsAsPdf(
	title: string,
	rows: Record<string, unknown>[],
	columns?: { key: string; label: string }[],
) {
	if (!rows.length) throw new Error("There is no data to export.");
	const selectedColumns =
		columns ??
		Array.from(new Set(rows.flatMap((row) => Object.keys(row)))).map((key) => ({
			key,
			label: key,
		}));
	const escapeHtml = (value: unknown) =>
		displayValue(value)
			.replace(/&/g, "&amp;")
			.replace(/</g, "&lt;")
			.replace(/>/g, "&gt;")
			.replace(/"/g, "&quot;");
	const frame = document.createElement("iframe");
	frame.style.position = "fixed";
	frame.style.width = "0";
	frame.style.height = "0";
	frame.style.border = "0";
	document.body.appendChild(frame);
	const reportWindow = frame.contentWindow;
	if (!reportWindow) {
		frame.remove();
		throw new Error("Unable to prepare the PDF report.");
	}
	reportWindow.document.write(`<!doctype html>
<html><head><title>${escapeHtml(title)}</title><style>
@page{size:A4 landscape;margin:12mm}body{font:12px Arial,sans-serif;color:#111}
h1{font-size:20px;margin:0 0 6px}.meta{color:#555;margin-bottom:16px}
table{width:100%;border-collapse:collapse}th,td{border:1px solid #bbb;padding:6px;text-align:left;vertical-align:top}
th{background:#eee;white-space:nowrap}tr:nth-child(even){background:#fafafa}
</style></head><body><h1>${escapeHtml(title)}</h1>
<div class="meta">Generated: ${new Date().toISOString().slice(0, 10)}</div>
<table><thead><tr>${selectedColumns.map((column) => `<th>${escapeHtml(column.label)}</th>`).join("")}</tr></thead>
<tbody>${rows
		.map(
			(row) =>
				`<tr>${selectedColumns.map((column) => `<td>${escapeHtml(row[column.key])}</td>`).join("")}</tr>`,
		)
		.join("")}</tbody></table></body></html>`);
	reportWindow.document.close();
	window.setTimeout(() => {
		reportWindow.focus();
		reportWindow.print();
		window.setTimeout(() => frame.remove(), 1000);
	}, 100);
}
