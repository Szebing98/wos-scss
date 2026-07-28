declare global {
	interface Window {
		google: any;
		initGoogleMapsCallback?: () => void;
	}
}

let googleMapsPromise: Promise<any> | null = null;

export function loadGoogleMapsScript(apiKey?: string): Promise<any> {
	if (typeof window !== "undefined" && window.google && window.google.maps) {
		return Promise.resolve(window.google);
	}

	if (googleMapsPromise) {
		return googleMapsPromise;
	}

	const key =
		apiKey ||
		import.meta.env.VITE_GOOGLE_MAPS_API_KEY ||
		import.meta.env.VITE_GOOGLE_MAP_API_KEY ||
		"";

	googleMapsPromise = new Promise((resolve, reject) => {
		if (!key) {
			reject(
				new Error(
					"Google Maps API Key is missing. Please check your VITE_GOOGLE_MAPS_API_KEY in .env.",
				),
			);
			return;
		}

		const existingScript = document.getElementById("google-maps-js-sdk");
		if (existingScript) {
			if (window.google && window.google.maps) {
				resolve(window.google);
			} else {
				existingScript.addEventListener("load", () => resolve(window.google));
				existingScript.addEventListener("error", (err) => {
					googleMapsPromise = null;
					reject(err);
				});
			}
			return;
		}

		const script = document.createElement("script");
		script.id = "google-maps-js-sdk";
		script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(key)}&libraries=places`;
		script.async = true;
		script.defer = true;

		script.onload = () => {
			if (window.google && window.google.maps) {
				resolve(window.google);
			} else {
				googleMapsPromise = null;
				reject(new Error("Google Maps script loaded but window.google.maps is undefined."));
			}
		};

		script.onerror = () => {
			googleMapsPromise = null;
			reject(new Error("Failed to load Google Maps script. Check network or API key settings."));
		};

		document.head.appendChild(script);
	});

	return googleMapsPromise;
}
