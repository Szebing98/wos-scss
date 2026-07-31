const subjectLabels: Record<string, string> = {
	Ability: "Permission Settings",
	DocNoFormat: "Document Number Format",
	WorkOrder: "Work Order",
	WorkType: "Work Type",
	Site: "Site",
	PartInfo: "Part Info",
	WorkOrderInvoice: "Work Order Invoice",
	SupplierInvoice: "Supplier Invoices",
};

const actionLabels: Record<string, string> = {
	create: "Create",
	delete: "Delete",
	list: "List",
	manage: "Manage",
	read: "View",
	update: "Edit",
	update_completed: "Update Completed",
	update_claimed: "Update Claimed",
	update_closed: "Update Closed",
	update_cancelled: "Update Cancelled",
	update_done: "Update Done",
	update_draft: "Update Draft",
	update_progress: "Update In Progress",
	update_new: "Update New",
	update_pending: "Update Pending Approval",
	update_rejected: "Update Rejected",
	mark_as_claimed: "Mark as Claimed",
	mark_as_closed: "Mark as Closed",
	mark_as_completed: "Mark as Completed",
	mark_as_done: "Mark as Done",
	reopen: "Reopen",
	approve: "Approve",
	reject: "Reject",
	cancel: "Cancel",
};

export interface PermissionCatalogItem {
	code?: string;
	action?: string;
	subject?: string;
	inverted?: boolean;
}

const EXCLUDED_ACTIONS = new Set([
	"update_done",
	"update_completed",
	"update_claimed",
	"update_closed",
	"update_cancelled",
	"update_rejected",
].map((a) => a.toLowerCase()));

const EXCLUDED_SUBJECTS = new Set([
	"WorkOrderEquipment",
	"WorkOrderTechnical",
	"WorkOrderEngineer",
	"PartReplaced",
	"ServiceProvided",
	"Signature",
	"DocNoFormat",
].map((s) => s.toLowerCase()));

/**
 * The abilities endpoint can contain multiple database rows for the same
 * logical permission (for example an old row or an inverted override).
 * The permission matrix represents one control per action and subject, so
 * normalise and de-duplicate the catalogue before rendering it.
 */
export function normalizePermissionCatalog<T extends PermissionCatalogItem>(
	permissions: T[],
): Array<T & { code: string; action: string; subject: string }> {
	const uniquePermissions = new Map<
		string,
		T & { code: string; action: string; subject: string }
	>();

	permissions.forEach((permission) => {
		if (permission.inverted) return;

		const action = String(permission.action || "").trim();
		const subject = String(permission.subject || "").trim();
		if (!action || !subject) return;

		if (EXCLUDED_ACTIONS.has(action.toLowerCase())) return;
		if (EXCLUDED_SUBJECTS.has(subject.toLowerCase())) return;

		const logicalKey = `${action.toLowerCase()}:${subject.toLowerCase()}`;
		if (uniquePermissions.has(logicalKey)) return;

		uniquePermissions.set(logicalKey, {
			...permission,
			code: String(permission.code || `${action}:${subject}`).trim(),
			action,
			subject,
		});
	});

	return Array.from(uniquePermissions.values());
}

function splitWords(value: string): string {
	return value
		.replace(/([a-z0-9])([A-Z])/g, "$1 $2")
		.replace(/([A-Z])([A-Z][a-z])/g, "$1 $2")
		.replace(/[_:-]+/g, " ")
		.replace(/\s+/g, " ")
		.trim();
}

function titleCase(value: string): string {
	return splitWords(value).replace(/\b\w/g, (char) => char.toUpperCase());
}

export function getPermissionSubjectLabel(subject: string): string {
	return subjectLabels[subject] || titleCase(subject);
}

export function getPermissionActionLabel(action: string): string {
	return actionLabels[action] || titleCase(action);
}

export function getPermissionLabel(action: string, subject: string): string {
	return `${getPermissionActionLabel(action)} ${getPermissionSubjectLabel(subject)}`;
}
