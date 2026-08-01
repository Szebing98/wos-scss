export interface ImageRecord {
	id: number;
	guid?: string;
	category: string;
	url: string;
	name: string;
}

export interface LineItem {
	id: number;
	code: string;
	name: string;
	qty: number;
	unitPrice: number;
	subtotal: number;
}

export interface QuotationRecord {
	id: number;
	guid?: string;
	refNo: string;
	date: string;
	amount: number;
	name: string;
}

export interface InvoiceRecord {
	id: number;
	guid?: string;
	refNo: string;
	date: string;
	amount: number;
	name: string;
}

export interface PaymentRecord {
	id: number;
	guid?: string;
	date: string;
	amount: number;
	reference: string;
	fileName: string;
}

export function normalizeWorkOrderStatusForUi(w: any) {
	if (w?.isDraft) return "Draft";
	const status = String(w?.orderStatus || w?.status || "InProgress").toLowerCase();
	if (status === "new") return "New";
	if (status === "pending") return "PendingApproval";
	if (status === "progress") return "InProgress";
	if (status === "done") return "Done";
	if (status === "completed") return "Completed";
	if (status === "claimed") return "Claimed";
	if (status === "closed") return "Closed";
	if (status === "cancelled") return "Cancelled";
	if (status === "rejected") return "Rejected";
	return w?.status || w?.orderStatus || "InProgress";
}

export function getStatusChipType(status: string) {
	if (!status) return "default";
	switch (status) {
		case "Draft":
		case "draft":
			return "warning";
		case "New":
		case "new":
			return "new";
		case "PendingApproval":
		case "pending":
		case "Pending Approval":
			return "pending-approval";
		case "InProgress":
		case "progress":
		case "in-progress":
		case "In Progress":
			return "in-progress";
		case "Done":
		case "done":
			return "done";
		case "Completed":
		case "completed":
			return "completed";
		case "Claimed":
		case "claimed":
			return "claimed";
		case "Closed":
		case "closed":
			return "closed";
		case "Cancelled":
		case "cancelled":
			return "cancelled";
		case "Rejected":
		case "rejected":
			return "rejected";
		default:
			return "default";
	}
}

export function formatStatusLabel(status: string) {
	if (!status) return "";
	switch (status) {
		case "PendingApproval":
		case "pending":
		case "Pending Approval":
			return "Pending Approval";
		case "InProgress":
		case "progress":
		case "in-progress":
		case "In Progress":
			return "In Progress";
		case "New":
		case "new":
			return "New";
		case "Done":
		case "done":
			return "Done";
		case "Completed":
		case "completed":
			return "Completed";
		case "Claimed":
		case "claimed":
			return "Claimed";
		case "Closed":
		case "closed":
			return "Closed";
		case "Cancelled":
		case "cancelled":
			return "Cancelled";
		case "Rejected":
		case "rejected":
			return "Rejected";
		default:
			return status.replace(/([a-z])([A-Z])/g, "$1 $2");
	}
}

export function isPdfFile(filename?: string) {
	if (!filename) return false;
	return filename.toLowerCase().endsWith(".pdf");
}


export function mapWorkOrderData(w: any, formatUserDisplay: (name?: string|null, code?: string|null) => string) {
    return {
				guid: w.guid,
				woNumber: w.docNo || w.code || w.guid.substring(0, 8).toUpperCase(),
				title: w.title || "",
				createdByCode: w.createdBy || w.createdByCode || "",
				status: normalizeWorkOrderStatusForUi(w),
				workType: w.workType || "",
				workTypeItem: w.workTypeItem || "",
				salesAgent: w.salesAgentCode || "",
				salesAgentDisplay: formatUserDisplay(
					w.salesAgentName || w.salesAgentDisplayName || w.salesAgentProfileName,
					w.salesAgentDisplayCode || w.salesAgentCode,
				),
				projectPersonInCharge: w.personInChargeCode || w.projectPicCode || "",
				projectPersonInChargeDisplay: formatUserDisplay(
					w.projectPicName || w.personInChargeName,
					w.projectPicDisplayCode ||
						w.personInChargeDisplayCode ||
						w.personInChargeCode ||
						w.projectPicCode,
				),
				startDate: w.startDate || "",
				estimatedEndDate: w.estimatedEndDate || "",
				description: w.description || "",
				location: w.location || w.locationName || "",
				latitude: w.latitude ?? null,
				longitude: w.longitude ?? null,
				siteCode: w.siteName ? `${w.siteName} (${w.siteCode})` : w.siteCode || "",
				rawSiteCode: w.siteCode || "",
				siteName: w.siteName || "",
				jobPriority: w.jobPriority || "Low",
				leaderCode: w.leaderCode || w.leadEngineerCode || "",
				leaderDisplay: formatUserDisplay(
					w.leaderName || w.leadEngineerName,
					w.leaderDisplayCode ||
						w.leadEngineerDisplayCode ||
						w.leaderCode ||
						w.leadEngineerCode,
				),
				leaderIICode: w.leaderIICode || w.leaderIiCode || "",
				leaderIIDisplay: formatUserDisplay(
					w.leaderIIName,
					w.leaderIIDisplayCode || w.leaderIICode || w.leaderIiCode,
				),
				technicianCodes: w.technicianCodes || w.assistantEngineers || [],
				technicians: (w.technicians || []).map((technician: any) => ({
					...technician,
					code: technician.code,
					display: formatUserDisplay(
						technician.name || technician.displayName,
						technician.displayCode || technician.code,
					),
				})),
				leadEngineer: w.leaderCode || w.leadEngineerCode || "",
				leadEngineerDisplay: formatUserDisplay(
					w.leaderName || w.leadEngineerName,
					w.leaderDisplayCode ||
						w.leadEngineerDisplayCode ||
						w.leaderCode ||
						w.leadEngineerCode,
				),
				assistantEngineers: w.technicianCodes || w.assistantEngineers || [],
				customerPic: w.customerPic || "",
				customerPicPhone: w.customerPicPhone || "",
				contractNo: w.contractNo || "",
				contractStartDate: w.contractStartDate || "",
				contractEndDate: w.contractEndDate || "",
				customer: {
					name: w.customerName || w.customer?.name || "",
					email: w.customerEmail || w.customer?.email || "",
					phone: w.customerPhone || w.customer?.phone || "",
				},
				equipment: w.equipment
					? {
							name: w.equipment.name || "",
							serialNo: w.equipment.serialNo || "",
							brand: w.equipment.brand || "",
							model: w.equipment.model || "",
							equipmentType: w.equipment.equipmentType || "",
						}
					: { name: "", serialNo: "", brand: "", model: "", equipmentType: "" },
				technical: w.technical
					? {
							flowHead: w.technical.flowHead || "",
							brandName: w.technical.brandName || "",
							serialNo: w.technical.serialNo || "",
							ratedVoltage: w.technical.ratedVoltage || "",
							ratedSpeed: w.technical.ratedSpeed || "",
							ratedCurrent: w.technical.ratedCurrent || "",
							ratedPower: w.technical.ratedPower || "",
							phase: w.technical.phase || "",
							frameSize: w.technical.frameSize || "",
						}
					: {
							flowHead: "",
							brandName: "",
							serialNo: "",
							ratedVoltage: "",
							ratedSpeed: "",
							ratedCurrent: "",
							ratedPower: "",
							phase: "",
							frameSize: "",
						},
				servicesProvided: w.servicesProvided || [],
				partsReplaced: w.partsReplaced || [],
				images: w.images || [],
				cusRefNo: w.cusRefNo || "",
				remarks: w.remarks || "",
				rejectedReason: w.rejectedReason || "",
				extendedCount: w.extendedCount || 0,
				originalEstimatedEndDate: w.originalEstimatedEndDate || "",
				requestApprovalDate: w.requestApprovalDate || "",
				approvedDate: w.approvedDate || "",
				doneDate: w.doneDate || "",
				completedDate: w.completedDate || "",
				closedDate: w.closedDate || "",
				createdAt: w.createdAt || "",
			};
}
