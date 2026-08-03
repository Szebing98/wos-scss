export type FileKind = "image" | "pdf" | "word" | "file";

const IMAGE_EXTENSIONS = new Set(["jpg", "jpeg", "png", "gif", "webp", "bmp", "svg", "heic"]);
const WORD_EXTENSIONS = new Set(["doc", "docx"]);

function getExtension(fileName?: string | null): string {
	const match = fileName?.trim().toLowerCase().match(/\.([^.]+)$/);
	return match?.[1] || "";
}

export function getFileKind(fileName?: string | null, mimeType?: string | null): FileKind {
	const extension = getExtension(fileName);
	if (IMAGE_EXTENSIONS.has(extension)) return "image";
	if (extension === "pdf") return "pdf";
	if (WORD_EXTENSIONS.has(extension)) return "word";

	const normalizedMimeType = (mimeType || "").toLowerCase();
	if (normalizedMimeType.startsWith("image/")) return "image";
	if (normalizedMimeType === "application/pdf") return "pdf";
	if (
		normalizedMimeType === "application/msword" ||
		normalizedMimeType ===
			"application/vnd.openxmlformats-officedocument.wordprocessingml.document"
	) {
		return "word";
	}
	return "file";
}

export function isImageFile(fileName?: string | null, mimeType?: string | null): boolean {
	return getFileKind(fileName, mimeType) === "image";
}

export function isPdfFile(fileName?: string | null, mimeType?: string | null): boolean {
	return getFileKind(fileName, mimeType) === "pdf";
}

export function normalizeFileMimeType(
	fileName?: string | null,
	mimeType?: string | null,
): string {
	const kind = getFileKind(fileName, mimeType);
	if (kind === "image") {
		return (mimeType || "").toLowerCase().startsWith("image/")
			? mimeType || "image/unknown"
			: "image/unknown";
	}
	if (kind === "pdf") return "application/pdf";
	if (kind === "word") {
		return getExtension(fileName) === "docx"
			? "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
			: "application/msword";
	}
	return mimeType || "application/octet-stream";
}

export function getFileIcon(fileName?: string | null, mimeType?: string | null): string {
	switch (getFileKind(fileName, mimeType)) {
		case "image":
			return "mdi-file-image-outline";
		case "pdf":
			return "mdi-file-pdf-box";
		case "word":
			return "mdi-file-word-outline";
		default:
			return "mdi-file-document-outline";
	}
}
