export interface SiteModel {
	guid: string;
	code: string;
	name: string;
	description?: string | null;
	isActive: boolean;
	createdAt?: string;
	modifiedAt?: string;
}

export interface GetSitesQuery {
	page?: number;
	limit?: number;
	search?: string;
	isActive?: "true" | "false";
}

export interface CreateSiteBody {
	code: string;
	name: string;
	description?: string;
	isActive?: boolean;
}

export interface UpdateSiteBody {
	name?: string;
	description?: string;
	isActive?: boolean;
}
