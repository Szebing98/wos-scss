import client from "../../client";
import type { GetCountriesQuery, GetStatesQuery } from "./location.types";

export const locationApi = {
	getCountries: (query?: GetCountriesQuery) =>
		client.GET("/api/locations/countries" as any, { params: { query } }) as any,

	getStates: (query?: GetStatesQuery) =>
		client.GET("/api/locations/states" as any, { params: { query } }) as any,

	syncLocations: () =>
		client.POST("/api/locations/sync" as any, {}) as any,
};
