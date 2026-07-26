export interface DocNoFormatModel {
	id: number;
	module: string;
	prefix: string;
	dateFormat?: string | null;
	delimiter: string;
	padding: number;
	nextNumber: number;
	isActive: boolean;
	customerCode?: string | null;
	createdAt?: string;
	modifiedAt?: string | null;
}

export interface GetDocNoFormatsQuery {
	page?: number;
	limit?: number;
	search?: string;
}

export interface CreateDocNoFormatBody {
	module: string;
	prefix: string;
	dateFormat?: string;
	delimiter?: string;
	padding?: number;
	nextNumber?: number;
	isActive?: boolean;
	customerCode?: string | null;
}

export interface UpdateDocNoFormatBody {
	module?: string;
	prefix?: string;
	dateFormat?: string;
	delimiter?: string;
	padding?: number;
	nextNumber?: number;
	isActive?: boolean;
	customerCode?: string | null;
}
