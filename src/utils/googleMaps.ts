declare global {
	interface Window {
		google: any;
	}
}

let bootstrapped = false;
let bootstrapError: Error | null = null;

/**
 * Installs Google's official inline bootstrap loader, which defines
 * `google.maps.importLibrary()`. This is NOT the same as adding a plain
 * `<script src="https://maps.googleapis.com/maps/api/js?...">` tag — that classic
 * approach does not expose `importLibrary`, and its load/init timing is unreliable
 * with recent API versions (causes errors like "google.maps.Map is not a constructor").
 *
 * The bootstrap snippet itself loads nothing. The actual API is only fetched the
 * first time you call `google.maps.importLibrary("maps")` etc, and that returned
 * promise correctly resolves once the requested library is really ready.
 *
 * Call this once, then use `await google.maps.importLibrary("<name>")` wherever you
 * need Map / Marker / Places / Geocoder / etc.
 */
export function loadGoogleMapsScript(apiKey?: string): Promise<any> {
	if (typeof window === "undefined") {
		return Promise.reject(new Error("loadGoogleMapsScript can only run in the browser."));
	}

	if (bootstrapError) {
		return Promise.reject(bootstrapError);
	}

	const key =
		apiKey ||
		import.meta.env.VITE_GOOGLE_MAPS_API_KEY ||
		import.meta.env.VITE_GOOGLE_MAP_API_KEY ||
		"";

	if (!key) {
		bootstrapError = new Error(
			"Google Maps API Key is missing. Please check your VITE_GOOGLE_MAPS_API_KEY in .env.",
		);
		return Promise.reject(bootstrapError);
	}

	if (!bootstrapped) {
		// Official Google bootstrap loader snippet (minified form from Google's own docs),
		// adapted for TypeScript. Defines google.maps.importLibrary.
		((g: any) => {
			let h: Promise<void> | undefined;
			let a: HTMLScriptElement;
			let k: string;
			const p = "The Google Maps JavaScript API";
			const c = "google";
			const l = "importLibrary";
			const q = "__ib__";
			const m = document;
			let b: any = window;
			b = b[c] || (b[c] = {});
			const d = b.maps || (b.maps = {});
			const r = new Set<string>();
			const e = new URLSearchParams();
			const u = () =>
				h ||
				(h = new Promise(async (resolve, reject) => {
					a = m.createElement("script");
					e.set("libraries", [...r].join(","));
					for (k in g) {
						e.set(k.replace(/[A-Z]/g, (t) => "_" + t[0].toLowerCase()), g[k]);
					}
					e.set("callback", c + ".maps." + q);
					a.src = `https://maps.${c}apis.com/maps/api/js?` + e;
					d[q] = resolve;
					a.onerror = () => {
						bootstrapError = new Error(p + " could not load.");
						h = undefined;
						reject(bootstrapError);
					};
					a.nonce = (m.querySelector("script[nonce]") as HTMLScriptElement)?.nonce || "";
					m.head.append(a);
				}));
			d[l]
				? console.warn(p + " only loads once. Ignoring:", g)
				: (d[l] = (f: string, ...n: any[]) => r.add(f) && u().then(() => d[l](f, ...n)));
		})({ key, v: "weekly" });

		bootstrapped = true;
	}

	return Promise.resolve(window.google);
}