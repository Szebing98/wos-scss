<script setup lang="ts">
const appVersion = import.meta.env.VITE_APP_VERSION || "1.0.0";
</script>

<template>
	<footer class="app-footer">
		<p>Copyright © 2026</p>
		<p>(Version {{ appVersion }})</p>
		<p>Asiasoft Business Solutions 200801030089 (831418-H).</p>
		<p>All rights reserved.</p>
	</footer>
</template>
