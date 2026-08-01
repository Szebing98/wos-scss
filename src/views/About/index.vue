<script setup lang="ts">
import PageHeader from "@/components/PageHeader.vue";
import Card from "@/components/Card.vue";

const appVersion = import.meta.env.VITE_APP_VERSION || "0.0.0";
</script>

<template>
	<div class="about-page">
		<PageHeader title="About">
			<template #subtitle>
				<p class="page-header__subtitle">System information and version details</p>
			</template>
		</PageHeader>

		<Card class="about-card" bordered>
			<div class="about-content">
				<div class="logo-wrapper">
					<img src="@/assets/logo.svg" alt="App Logo" class="about-logo" />
				</div>
				<h2>Work Order System</h2>
				<p class="u-text-muted">Streamline your maintenance and operational workflows.</p>

				<div class="version-info">
					<div class="info-row">
						<span class="info-label">Version</span>
						<span class="info-value">{{ appVersion }}</span>
					</div>
					<div class="info-row">
						<span class="info-label">Environment</span>
						<span class="info-value">Production</span>
					</div>
				</div>

				<div class="footer-links">
					<p>&copy; 2026 GS-Tech. All rights reserved.</p>
				</div>
			</div>
		</Card>
	</div>
</template>

<style lang="scss" scoped>
.about-page {
	padding: var(--spacing-4);
	max-width: 800px;
	margin: 0 auto;

	.about-card {
		margin-top: var(--spacing-4);
		text-align: center;
		padding: var(--spacing-8) var(--spacing-4);
	}

	.about-content {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: var(--spacing-4);

		h2 {
			margin: 0;
			font-size: 24px;
			color: var(--text-primary);
		}
	}

	.logo-wrapper {
		margin-bottom: var(--spacing-2);
		.about-logo {
			height: 60px;
			width: auto;
		}
	}

	.version-info {
		margin-top: var(--spacing-4);
		background: var(--bg-surface-hover);
		padding: var(--spacing-4);
		border-radius: var(--radius-md);
		width: 100%;
		max-width: 400px;

		.info-row {
			display: flex;
			justify-content: space-between;
			padding: var(--spacing-2) 0;
			border-bottom: 1px solid var(--border-color);

			&:last-child {
				border-bottom: none;
			}

			.info-label {
				color: var(--text-secondary);
				font-weight: 500;
			}

			.info-value {
				color: var(--text-primary);
				font-family: monospace;
				font-size: 14px;
			}
		}
	}

	.footer-links {
		margin-top: var(--spacing-6);
		font-size: 13px;
		color: var(--text-muted);
	}
}
</style>
