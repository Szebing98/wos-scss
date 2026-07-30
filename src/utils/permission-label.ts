const subjectLabels: Record<string, string> = {
	Ability: "Permission Settings",
	DocNoFormat: "Document Number Format",
	WorkOrder: "Work Order",
	WorkType: "Work Type",
};

const actionLabels: Record<string, string> = {
	create: "Create",
	delete: "Delete",
	list: "List",
	manage: "Manage",
	read: "View",
	update: "Edit",
};

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
