import { defineStore } from "pinia";
import { ref } from "vue";

export type SystemDateFormat =
	| "YYYY-MM-DD"
	| "YYYY.MM.DD"
	| "DD-MM-YYYY"
	| "DD/MM/YYYY"
	| "DD.MM.YYYY"
	| "YYYY/MM/DD"
	| "DD MMM YYYY";

const monthNamesShort = [
	"Jan", "Feb", "Mar", "Apr", "May", "Jun",
	"Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
];

function buildLocalDate(year: number, month: number, day: number, time = "00:00:00") {
	const [hour = "0", minute = "0", second = "0"] = time.split(":");
	const date = new Date(
		year,
		month - 1,
		day,
		Number(hour),
		Number(minute),
		Number(second),
	);

	if (
		date.getFullYear() !== year ||
		date.getMonth() !== month - 1 ||
		date.getDate() !== day
	) {
		return null;
	}

	return date;
}

function parseDateValue(val: string | Date | number | null | undefined): Date | null {
	if (!val) return null;
	if (val instanceof Date) return isNaN(val.getTime()) ? null : val;
	if (typeof val === "number") {
		const date = new Date(val);
		return isNaN(date.getTime()) ? null : date;
	}

	const raw = String(val).trim();

	// Preserve timezone information from API timestamps. Parsing the date parts
	// manually would treat a UTC value (ending in Z) as local time and skip the
	// browser's timezone conversion.
	if (/(?:Z|[+-]\d{2}:?\d{2})$/i.test(raw)) {
		const zonedDate = new Date(raw);
		return isNaN(zonedDate.getTime()) ? null : zonedDate;
	}

	const timeMatch = raw.match(/(?:T|\s)(\d{1,2}:\d{2}(?::\d{2})?)/);
	const time = timeMatch?.[1] || "00:00:00";

	const yearFirst = raw.match(/(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/);
	if (yearFirst) {
		return buildLocalDate(Number(yearFirst[1]), Number(yearFirst[2]), Number(yearFirst[3]), time);
	}

	const dayFirst = raw.match(/(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})/);
	if (dayFirst) {
		return buildLocalDate(Number(dayFirst[3]), Number(dayFirst[2]), Number(dayFirst[1]), time);
	}

	const wordMonth = raw.match(/^(\d{1,2})\s+([A-Za-z]{3,})\s+(\d{4})/);
	if (wordMonth) {
		const month = monthNamesShort.findIndex((name) =>
			wordMonth[2].toLowerCase().startsWith(name.toLowerCase()),
		);
		if (month >= 0) return buildLocalDate(Number(wordMonth[3]), month + 1, Number(wordMonth[1]), time);
	}

	const date = new Date(raw);
	return isNaN(date.getTime()) ? null : date;
}

export const useDateFormatStore = defineStore("dateFormat", () => {
	const currentFormat = ref<SystemDateFormat>(
		(localStorage.getItem("systemDateFormat") as SystemDateFormat) || "YYYY-MM-DD"
	);

	function setDateFormat(format: SystemDateFormat) {
		currentFormat.value = format;
		localStorage.setItem("systemDateFormat", format);
	}

	function formatDate(val: string | Date | number | null | undefined): string {
		if (!val) return "—";
		const date = parseDateValue(val);
		if (!date) return String(val);

		const yyyy = date.getFullYear();
		const mm = String(date.getMonth() + 1).padStart(2, "0");
		const dd = String(date.getDate()).padStart(2, "0");

		const mmm = monthNamesShort[date.getMonth()];

		switch (currentFormat.value) {
			case "YYYY.MM.DD":
				return `${yyyy}.${mm}.${dd}`;
			case "DD-MM-YYYY":
				return `${dd}-${mm}-${yyyy}`;
			case "DD/MM/YYYY":
				return `${dd}/${mm}/${yyyy}`;
			case "DD.MM.YYYY":
				return `${dd}.${mm}.${yyyy}`;
			case "YYYY/MM/DD":
				return `${yyyy}/${mm}/${dd}`;
			case "DD MMM YYYY":
				return `${dd} ${mmm} ${yyyy}`;
			case "YYYY-MM-DD":
			default:
				return `${yyyy}-${mm}-${dd}`;
		}
	}

	function formatTime(val: string | Date | number | null | undefined): string {
		if (!val) return "—";
		const date = parseDateValue(val);
		if (!date) return String(val);

		return date.toLocaleTimeString("en-GB", {
			hour: "2-digit",
			minute: "2-digit",
			second: "2-digit",
			hour12: true,
		});
	}

	function formatDateTime(val: string | Date | number | null | undefined): string {
		if (!val) return "—";
		const date = parseDateValue(val);
		if (!date) return String(val);

		return `${formatDate(date)} ${formatTime(date)}`;
	}

	return {
		currentFormat,
		setDateFormat,
		formatDate,
		formatTime,
		formatDateTime,
		parseDateValue,
	};
});
