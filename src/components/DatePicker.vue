<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from "vue";

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
const placement = ref<"bottom" | "top">("bottom");
const inputValue = ref("");

const currentMonth = ref(new Date().getMonth());
const currentYear = ref(new Date().getFullYear());
const selectedTime = ref("00:00");

// Init from modelValue
watch(
	() => props.modelValue,
	(newVal) => {
		if (newVal) {
			const d = new Date(newVal);
			if (!isNaN(d.getTime())) {
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
	const d = new Date(props.modelValue);
	if (isNaN(d.getTime())) return props.modelValue;

	let formatted = d.toISOString().split("T")[0];
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
	if (!props.modelValue) return "Select Date";
	const d = new Date(props.modelValue);
	if (isNaN(d.getTime())) return "Select Date";
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
		if (props.modelValue) {
			const modelDateStr = props.modelValue.split("T")[0].split(" ")[0];
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
	if (!props.modelValue) return;
	const dateStr = props.modelValue.split("T")[0].split(" ")[0];
	updateModelValue(dateStr);
}

// Automatic direction detection (Top vs Bottom flip)
function checkPlacement() {
	if (!datepickerRef.value) return;
	const rect = datepickerRef.value.getBoundingClientRect();
	const viewportHeight = window.innerHeight || document.documentElement.clientHeight;
	const popoverHeight = props.enableTime ? 450 : 390;
	const spaceBelow = viewportHeight - rect.bottom;
	const spaceAbove = rect.top;

	if (spaceBelow < popoverHeight && spaceAbove > spaceBelow) {
		placement.value = "top";
	} else {
		placement.value = "bottom";
	}
}

function openCalendar() {
	if (props.disabled) return;
	checkPlacement();
	isOpen.value = true;
}

function toggleCalendar() {
	if (props.disabled) return;
	if (!isOpen.value) {
		checkPlacement();
	}
	isOpen.value = !isOpen.value;
}

// Manual typing handler
function onManualInput(e: Event) {
	const val = (e.target as HTMLInputElement).value;
	inputValue.value = val;

	if (!val) {
		emit("update:modelValue", null);
		return;
	}

	// Try parsing YYYY-MM-DD or YYYY-MM-DD HH:mm
	const dateObj = new Date(val);
	if (!isNaN(dateObj.getTime())) {
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
	if (datepickerRef.value && !datepickerRef.value.contains(event.target as Node)) {
		isOpen.value = false;
	}
}

onMounted(() => {
	document.addEventListener("click", handleClickOutside);
});

onUnmounted(() => {
	document.removeEventListener("click", handleClickOutside);
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

		<!-- Popover -->
		<Transition name="popover-fade">
			<div
				class="datepicker-popover"
				:class="[`datepicker-popover--${align || 'left'}`, `datepicker-popover--${placement}`]"
				v-if="isOpen"
			>
				<div class="datepicker-popover__header">
					<div class="datepicker-popover__year" v-if="modelValue && !isNaN(new Date(modelValue).getTime())">
						{{ new Date(modelValue).getFullYear() }}
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
.datepicker-field {
	position: relative;
}

.textbox__prefix-icon {
	color: var(--colors-text-muted, #94a3b8);
	font-size: 18px;
	margin-right: 4px;
}

.textbox--date {
	.textbox__control {
		cursor: text;
		color: var(--colors-text-primary);
	}

	&.textbox--focused {
		border-color: rgba(99, 102, 241, 0.6);
		box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.12);
	}
}

.datepicker-popover {
	position: absolute;
	z-index: 1000;
	width: 320px;
	background: var(--colors-surface-card, #ffffff);
	border-radius: var(--radius-lg, 8px);
	box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1);
	border: 1px solid var(--colors-surface-border);
	overflow: hidden;

	&--bottom {
		top: calc(100% + 4px);
		bottom: auto;
	}

	&--top {
		bottom: calc(100% + 4px);
		top: auto;
	}

	&--left {
		left: 0;
		right: auto;
	}

	&--right {
		right: 0;
		left: auto;
	}

	&--center {
		left: 50%;
		right: auto;
		transform: translateX(-50%);
	}

	@media (max-width: 640px) {
		left: 50% !important;
		right: auto !important;
		transform: translateX(-50%) !important;
		width: min(310px, calc(100vw - 24px)) !important;

		&.datepicker-popover--top {
			bottom: calc(100% + 6px) !important;
			top: auto !important;
		}

		&.datepicker-popover--bottom {
			top: calc(100% + 6px) !important;
			bottom: auto !important;
		}
	}

	&__header {
		background: var(--colors-brand-primary, #4f46e5);
		color: #ffffff;
		padding: 16px 20px;
		display: flex;
		flex-direction: column;
		gap: 4px;
	}

	&__year {
		font-size: 13px;
		opacity: 0.8;
		font-weight: 500;
	}

	&__date {
		font-size: 20px;
		font-weight: 600;
	}

	&__toolbar {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 12px 16px;
	}

	&__month-year {
		font-size: 14px;
		font-weight: 600;
		color: var(--colors-text-primary);
	}
}

.datepicker-btn {
	background: transparent;
	border: none;
	width: 36px;
	height: 36px;
	border-radius: 50%;
	display: flex;
	align-items: center;
	justify-content: center;
	color: var(--colors-text-primary);
	cursor: pointer;
	transition: background-color 0.2s;

	&:hover {
		background: var(--colors-surface-background, #f3f4f6);
	}

	i {
		font-size: 20px;
	}
}

.datepicker-grid {
	padding: 0 16px 16px 16px;

	&__header {
		display: grid;
		grid-template-columns: repeat(7, 1fr);
		margin-bottom: 8px;
		text-align: center;
	}

	&__day-name {
		font-size: 12px;
		font-weight: 600;
		color: var(--colors-text-muted);
	}

	&__body {
		display: grid;
		grid-template-columns: repeat(7, 1fr);
		gap: 2px;
	}

	&__cell {
		display: flex;
		align-items: center;
		justify-content: center;
		height: 36px;
	}
}

.datepicker-day {
	background: transparent;
	border: none;
	width: 32px;
	height: 32px;
	border-radius: 50%;
	font-size: 13px;
	color: var(--colors-text-primary);
	cursor: pointer;
	display: flex;
	align-items: center;
	justify-content: center;
	transition: all 0.2s;

	&:hover:not(:disabled) {
		background: var(--colors-surface-hover, #f1f5f9);
		color: var(--colors-brand-primary);
	}

	&--selected {
		background: var(--colors-brand-primary, #4f46e5) !important;
		color: #ffffff !important;
		font-weight: 600;
	}

	&--disabled {
		opacity: 0.3;
		cursor: not-allowed;
	}
}

.datepicker-time-picker {
	padding: 12px 16px;
	border-top: 1px solid var(--colors-surface-border);
	display: flex;
	align-items: center;
	gap: 8px;
	font-size: 13px;
	color: var(--colors-text-primary);
	background: var(--colors-surface-background, #f8fafc);

	.time-input {
		border: 1px solid var(--colors-surface-border);
		border-radius: 4px;
		padding: 4px 8px;
		font-size: 13px;
		outline: none;
		background: var(--colors-surface-card);
		color: var(--colors-text-primary);

		&:focus {
			border-color: var(--colors-brand-primary);
		}
	}
}

.popover-fade-enter-active,
.popover-fade-leave-active {
	transition:
		opacity 0.2s ease,
		transform 0.2s ease;
}

.popover-fade-enter-from,
.popover-fade-leave-to {
	opacity: 0;
	transform: translateY(-6px);
}
</style>
