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

/**
 * Downscale photographic uploads before sending them to storage.
 * PNG/GIF are intentionally preserved to avoid breaking transparency/animation.
 */
export async function compressImageForUpload(
	file: File,
	options: { maxDimension?: number; quality?: number } = {},
): Promise<File> {
	if (!['image/jpeg', 'image/webp'].includes(file.type.toLowerCase())) return file;

	const maxDimension = options.maxDimension ?? 1920;
	const quality = options.quality ?? 0.82;
	let bitmap: ImageBitmap | null = null;
	try {
		bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
		const scale = Math.min(1, maxDimension / Math.max(bitmap.width, bitmap.height));
		if (scale === 1 && file.size <= 1.5 * 1024 * 1024) return file;

		const canvas = document.createElement("canvas");
		canvas.width = Math.max(1, Math.round(bitmap.width * scale));
		canvas.height = Math.max(1, Math.round(bitmap.height * scale));
		const context = canvas.getContext("2d");
		if (!context) return file;
		context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);

		const blob = await new Promise<Blob | null>((resolve) =>
			canvas.toBlob(resolve, file.type, quality),
		);
		if (!blob || blob.size >= file.size) return file;
		return new File([blob], file.name, { type: file.type, lastModified: file.lastModified });
	} catch (error) {
		console.warn("Image compression skipped:", error);
		return file;
	} finally {
		bitmap?.close();
	}
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
