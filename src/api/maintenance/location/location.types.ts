export interface CountryModel {
	code: string;
	name: string;
	alpha2Code: string;
	alpha3Code: string;
	numericCode: string;
	isActive: boolean;
	subNodes?: { code: string; name: string; isActive: boolean }[];
}

export interface StateModel {
	code: string;
	name: string;
	countryCode: string;
	isActive: boolean;
}

export interface GetCountriesQuery {
	page?: number;
	limit?: number;
	search?: string;
}

export interface GetStatesQuery {
	countryCode?: string;
	search?: string;
}
