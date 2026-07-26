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
		const date = new Date(val);
		if (isNaN(date.getTime())) return String(val);

		const yyyy = date.getFullYear();
		const mm = String(date.getMonth() + 1).padStart(2, "0");
		const dd = String(date.getDate()).padStart(2, "0");

		const monthNamesShort = [
			"Jan", "Feb", "Mar", "Apr", "May", "Jun",
			"Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
		];
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

	return {
		currentFormat,
		setDateFormat,
		formatDate,
	};
});
