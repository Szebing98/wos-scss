export function userDisplayCode(
	displayCode?: string | null,
	internalCode?: string | null,
	fallback = "Unassigned",
): string {
	const visibleCode = displayCode?.trim();
	if (visibleCode && !/^USR(?:[-_]|$)/i.test(visibleCode)) return visibleCode;

	const code = internalCode?.trim();
	if (code && !/^USR(?:[-_]|$)/i.test(code)) return code;
	return fallback;
}
