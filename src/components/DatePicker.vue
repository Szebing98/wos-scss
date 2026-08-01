<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from "vue";
import { useDateFormatStore } from "@/stores/dateFormat.store";

const props = defineProps<{
	modelValue?: string | null;
	label?: string;
	placeholder?: string;
	disabled?: boolean;
	error?: string;
	hint?: string;
	hideFooter?: boolean;
	min?: string;
	max?: string;
	enableTime?: boolean;
	align?: "left" | "right" | "center";
}>();

const emit = defineEmits<{
	(e: "update:modelValue", value: string | null): void;
}>();

const isOpen = ref(false);
const datepickerRef = ref<HTMLElement | null>(null);
const popoverRef = ref<HTMLElement | null>(null);
const placement = ref<"bottom" | "top">("bottom");
const inputValue = ref("");
const popoverStyle = ref<Record<string, string>>({});
const dateFormatStore = useDateFormatStore();

const currentMonth = ref(new Date().getMonth());
const currentYear = ref(new Date().getFullYear());
const selectedTime = ref("00:00");
const selectedDate = computed(() => dateFormatStore.parseDateValue(props.modelValue));

// Init from modelValue
watch(
	() => props.modelValue,
	(newVal) => {
		if (newVal) {
			const d = dateFormatStore.parseDateValue(newVal);
			if (d) {
				currentMonth.value = d.getMonth();
				currentYear.value = d.getFullYear();
				const hh = String(d.getHours()).padStart(2, "0");
				const mm = String(d.getMinutes()).padStart(2, "0");
				selectedTime.value = `${hh}:${mm}`;
			}
		}
	},
	{ immediate: true },
);

const formattedValue = computed(() => {
	if (!props.modelValue) return "";
	const d = dateFormatStore.parseDateValue(props.modelValue);
	if (!d) return props.modelValue;

	let formatted = dateFormatStore.formatDate(d);
	if (props.enableTime) {
		const hh = String(d.getHours()).padStart(2, "0");
		const mm = String(d.getMinutes()).padStart(2, "0");
		formatted += ` ${hh}:${mm}`;
	}
	return formatted;
});

// Sync typed input text with formattedValue
watch(
	formattedValue,
	(newVal) => {
		inputValue.value = newVal;
	},
	{ immediate: true },
);

const monthNames = [
	"January",
	"February",
	"March",
	"April",
	"May",
	"June",
	"July",
	"August",
	"September",
	"October",
	"November",
	"December",
];
const weekDays = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

const displayDateHeader = computed(() => {
	const d = selectedDate.value;
	if (!d) return "Select Date";
	const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
	const month = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
	return `${days[d.getDay()]}, ${month[d.getMonth()]} ${d.getDate()}`;
});

const displayMonthYear = computed(() => {
	return `${monthNames[currentMonth.value]} ${currentYear.value}`;
});

// Grid logic
const daysInMonth = computed(() => {
	const days = [];
	const firstDay = new Date(currentYear.value, currentMonth.value, 1);
	const lastDay = new Date(currentYear.value, currentMonth.value + 1, 0);

	for (let i = 0; i < firstDay.getDay(); i++) {
		days.push({ empty: true });
	}

	for (let i = 1; i <= lastDay.getDate(); i++) {
		const dateObj = new Date(currentYear.value, currentMonth.value, i);
		const m = String(currentMonth.value + 1).padStart(2, "0");
		const dStr = String(i).padStart(2, "0");
		const dateStr = `${currentYear.value}-${m}-${dStr}`;

		let disabled = false;
		if (props.min && dateStr < props.min) disabled = true;
		if (props.max && dateStr > props.max) disabled = true;

		let selected = false;
		if (selectedDate.value) {
			const modelMonth = String(selectedDate.value.getMonth() + 1).padStart(2, "0");
			const modelDay = String(selectedDate.value.getDate()).padStart(2, "0");
			const modelDateStr = `${selectedDate.value.getFullYear()}-${modelMonth}-${modelDay}`;
			selected = modelDateStr === dateStr;
		}

		days.push({
			empty: false,
			day: i,
			dateStr: dateStr,
			dateObj: dateObj,
			disabled: disabled,
			selected: selected,
		});
	}

	return days;
});

function prevMonth() {
	if (currentMonth.value === 0) {
		currentMonth.value = 11;
		currentYear.value--;
	} else {
		currentMonth.value--;
	}
}

function nextMonth() {
	if (currentMonth.value === 11) {
		currentMonth.value = 0;
		currentYear.value++;
	} else {
		currentMonth.value++;
	}
}

function updateModelValue(dateStr: string) {
	if (props.enableTime) {
		emit("update:modelValue", `${dateStr}T${selectedTime.value}`);
	} else {
		emit("update:modelValue", dateStr);
	}
}

function selectDate(day: any) {
	if (day.empty || day.disabled) return;
	updateModelValue(day.dateStr);
	if (!props.enableTime) {
		isOpen.value = false;
	}
}

function handleTimeChange() {
	if (!selectedDate.value) return;
	const y = selectedDate.value.getFullYear();
	const m = String(selectedDate.value.getMonth() + 1).padStart(2, "0");
	const d = String(selectedDate.value.getDate()).padStart(2, "0");
	const dateStr = `${y}-${m}-${d}`;
	updateModelValue(dateStr);
}

// Automatic direction & viewport position calculation (Fixed overlay to avoid clipping in modals)
function checkPlacement() {
	if (!datepickerRef.value) return;
	const rect = datepickerRef.value.getBoundingClientRect();
	const viewportHeight = window.innerHeight || document.documentElement.clientHeight;
	const viewportWidth = window.innerWidth || document.documentElement.clientWidth;
	const popoverHeight = props.enableTime ? 440 : 380;
	const popoverWidth = Math.min(320, viewportWidth - 24);

	const spaceBelow = viewportHeight - rect.bottom;
	const spaceAbove = rect.top;

	let top = rect.bottom + 4;
	if (spaceBelow < popoverHeight && spaceAbove > spaceBelow) {
		top = Math.max(10, rect.top - popoverHeight - 4);
		placement.value = "top";
	} else {
		placement.value = "bottom";
	}

	let left = rect.left;
	if (props.align === "right") {
		left = rect.right - popoverWidth;
	} else if (props.align === "center") {
		left = rect.left + rect.width / 2 - popoverWidth / 2;
	}

	if (left + popoverWidth > viewportWidth - 12) {
		left = viewportWidth - popoverWidth - 12;
	}
	if (left < 12) left = 12;

	popoverStyle.value = {
		position: "fixed",
		top: `${top}px`,
		left: `${left}px`,
		width: `${popoverWidth}px`,
		zIndex: "99999",
	};
}

function openCalendar() {
	if (props.disabled) return;
	checkPlacement();
	isOpen.value = true;
	nextTick(() => checkPlacement());
}

function toggleCalendar() {
	if (props.disabled) return;
	if (!isOpen.value) {
		openCalendar();
	} else {
		isOpen.value = false;
	}
}

function handleScrollOrResize() {
	if (isOpen.value) {
		checkPlacement();
	}
}

// Manual typing handler
function onManualInput(e: Event) {
	const val = (e.target as HTMLInputElement).value;
	inputValue.value = val;

	if (!val) {
		emit("update:modelValue", null);
		return;
	}

	const dateObj = dateFormatStore.parseDateValue(val);
	if (dateObj) {
		const y = dateObj.getFullYear();
		const m = dateObj.getMonth();
		if (y >= 1900 && y <= 2100 && val.length >= 10) {
			currentMonth.value = m;
			currentYear.value = y;
			emit("update:modelValue", val);
		}
	}
}

function onInputBlur() {
	if (props.modelValue) {
		inputValue.value = formattedValue.value;
	}
}

function handleClickOutside(event: MouseEvent) {
	if (!isOpen.value) return;
	const target = event.target as Node;
	if (datepickerRef.value && datepickerRef.value.contains(target)) {
		return;
	}
	if (popoverRef.value && popoverRef.value.contains(target)) {
		return;
	}
	isOpen.value = false;
}

onMounted(() => {
	document.addEventListener("click", handleClickOutside, true);
	window.addEventListener("scroll", handleScrollOrResize, true);
	window.addEventListener("resize", handleScrollOrResize);
});

onUnmounted(() => {
	document.removeEventListener("click", handleClickOutside, true);
	window.removeEventListener("scroll", handleScrollOrResize, true);
	window.removeEventListener("resize", handleScrollOrResize);
});
</script>

<template>
	<div class="textbox-field datepicker-field" ref="datepickerRef">
		<label v-if="label" class="textbox-field__label">
			<template v-if="label.includes('*')">
				{{ label.replace('*', '').trim() }} <span class="required-asterisk">*</span>
			</template>
			<template v-else>
				{{ label }}
			</template>
		</label>

		<div
			class="textbox textbox--date"
			:class="{
				'textbox--error': error,
				'textbox--disabled': disabled,
				'textbox--focused': isOpen,
			}"
		>
			<slot name="prefix">
				<i
					class="mdi mdi-calendar-blank textbox__prefix-icon"
					style="cursor: pointer"
					@click.stop="toggleCalendar"
				></i>
			</slot>

			<input
				:value="inputValue"
				type="text"
				:placeholder="placeholder || (enableTime ? 'YYYY-MM-DD HH:mm' : 'YYYY-MM-DD')"
				:disabled="disabled"
				class="textbox__control"
				@focus="openCalendar"
				@input="onManualInput"
				@blur="onInputBlur"
			/>

			<slot name="suffix" />
		</div>

		<!-- Teleported Popover -->
		<Teleport to="body">
			<Transition name="popover-fade">
				<div
					ref="popoverRef"
					class="datepicker-popover datepicker-popover--teleported"
					:style="popoverStyle"
					v-if="isOpen"
				>
					<div class="datepicker-popover__header">
						<div class="datepicker-popover__year" v-if="selectedDate">
							{{ selectedDate.getFullYear() }}
						</div>
						<div class="datepicker-popover__date">
							{{ displayDateHeader }}
						</div>
					</div>

					<div class="datepicker-popover__toolbar">
						<button class="datepicker-btn" @click.prevent="prevMonth" type="button">
							<i class="mdi mdi-chevron-left"></i>
						</button>
						<div class="datepicker-popover__month-year">{{ displayMonthYear }}</div>
						<button class="datepicker-btn" @click.prevent="nextMonth" type="button">
							<i class="mdi mdi-chevron-right"></i>
						</button>
					</div>

					<div class="datepicker-grid">
						<div class="datepicker-grid__header">
							<div class="datepicker-grid__day-name" v-for="d in weekDays" :key="d">{{ d }}</div>
						</div>
						<div class="datepicker-grid__body">
							<div
								v-for="(day, idx) in daysInMonth"
								:key="idx"
								class="datepicker-grid__cell"
							>
								<button
									v-if="!day.empty"
									type="button"
									class="datepicker-day"
									:class="{
										'datepicker-day--selected': day.selected,
										'datepicker-day--disabled': day.disabled,
									}"
									:disabled="day.disabled"
									@click.prevent="selectDate(day)"
								>
									{{ day.day }}
								</button>
							</div>
						</div>
					</div>

					<!-- Optional Time Picker Section -->
					<div v-if="enableTime" class="datepicker-time-picker">
						<i class="mdi mdi-clock-outline"></i>
						<span>Time:</span>
						<input
							type="time"
							v-model="selectedTime"
							class="time-input"
							@change="handleTimeChange"
						/>
					</div>
				</div>
			</Transition>
		</Teleport>

		<div class="textbox-field__footer" v-if="!hideFooter">
			<Transition name="fade-slide">
				<p v-if="error" class="textbox-field__error">
					<i class="mdi mdi-alert-circle-outline textbox-field__error-icon"></i>
					<span class="textbox-field__error-text">{{ error }}</span>
				</p>
				<p v-else-if="hint" class="textbox-field__hint">
					{{ hint }}
				</p>
			</Transition>
		</div>
	</div>
</template>

<style lang="scss" scoped>
@use "@/styles/components/_date-picker.scss";
</style>
