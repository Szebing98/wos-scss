<template>
	<span class="g-chip" :class="[`g-chip--${type}`, { 'g-chip--squared': squared }]">
		<slot name="icon">
			<i v-if="icon" class="mdi" :class="icon"></i>
		</slot>

		<span class="g-chip__content">
			<slot></slot>
		</span>
	</span>
</template>

<script setup lang="ts">
interface Props {
	type?:
		| "success"
		| "warning"
		| "error"
		| "info"
		| "default"
		| "status-new"
		| "status-pending"
		| "status-progress";
	icon?: string;
	squared?: boolean;
}

withDefaults(defineProps<Props>(), {
	type: "default",
	icon: "",
	squared: false,
});
</script>

<style lang="scss" scoped>
.g-chip {
	display: inline-flex;
	align-items: center;
	gap: 4px;
	padding: 2px 8px;
	border-radius: var(--radius-xs, 6px);
	font-size: 11px;
	font-weight: 600;
	line-height: 1.2;
	white-space: nowrap;
	border: 1px solid transparent;
	transition: all 0.2s ease;

	i {
		font-size: 12px;
		line-height: 1;
	}

	&--squared {
		border-radius: 2px !important;
	}

	&--success {
		color: #16a34a;
		background-color: #dcfce7;
		:global([data-theme="dark"]) & {
			color: #4ade80;
			background-color: rgba(22, 163, 74, 0.15);
		}
	}

	&--default {
		color: #64748b;
		background-color: #f1f5f9;
		:global([data-theme="dark"]) & {
			color: #94a3b8;
			background-color: rgba(255, 255, 255, 0.05);
		}
	}

	&--info {
		color: var(--colors-primary-deepblue, #5058f2);
		background-color: #eff6ff;
		:global([data-theme="dark"]) & {
			color: #60a5fa;
			background-color: rgba(80, 88, 242, 0.15);
		}
	}

	&--warning {
		color: #d97706;
		background-color: #fef3c7;
		:global([data-theme="dark"]) & {
			color: #fbbf24;
			background-color: rgba(217, 119, 6, 0.15);
		}
	}

	&--error {
		color: #dc2626;
		background-color: #fef2f2;
		:global([data-theme="dark"]) & {
			color: #f87171;
			background-color: rgba(220, 38, 38, 0.15);
		}
	}
}
</style>
