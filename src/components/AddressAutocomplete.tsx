import { useEffect, useMemo, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { getGoogleMapsConfig } from "@/lib/google-maps.functions";

let GOOGLE_MAPS_KEY = "";
let GOOGLE_MAPS_CHANNEL = "";

declare global {
  interface Window {
    google?: any;
    __googleMapsPlacesLoading?: Promise<any>;
    __dreamozGoogleMapsReady?: () => void;
  }
}

async function importPlacesLibrary() {
  const places = await window.google?.maps?.importLibrary?.("places");
  if (places) {
    window.google.maps.places = { ...(window.google.maps.places ?? {}), ...places };
  }
  return places ?? window.google?.maps?.places;
}

async function loadGooglePlaces(): Promise<any> {
  if (typeof window === "undefined") return Promise.reject(new Error("no window"));
  if (window.google?.maps?.importLibrary) {
    return importPlacesLibrary();
  }
  if (window.__googleMapsPlacesLoading) return window.__googleMapsPlacesLoading;
  if (!GOOGLE_MAPS_KEY) {
    const cfg = await getGoogleMapsConfig();
    GOOGLE_MAPS_KEY = cfg.browserKey;
    GOOGLE_MAPS_CHANNEL = cfg.trackingId;
  }
  if (!GOOGLE_MAPS_KEY) {
    return Promise.reject(new Error("Google Maps browser key is not configured"));
  }
  window.__googleMapsPlacesLoading = new Promise((resolve, reject) => {
    window.__dreamozGoogleMapsReady = () => {
      importPlacesLibrary().then(resolve).catch(reject);
    };
    const s = document.createElement("script");
    const params = new URLSearchParams({
      key: GOOGLE_MAPS_KEY,
      loading: "async",
      callback: "__dreamozGoogleMapsReady",
    });
    if (GOOGLE_MAPS_CHANNEL) params.set("channel", GOOGLE_MAPS_CHANNEL);
    s.src = `https://maps.googleapis.com/maps/api/js?${params.toString()}`;
    s.async = true;
    s.defer = true;
    s.onerror = () => reject(new Error("Failed to load Google Maps"));
    document.head.appendChild(s);
  });
  return window.__googleMapsPlacesLoading;
}


type Parts = {
  address: string;
  city?: string;
  postcode?: string;
  country?: string;
};

export function AddressAutocomplete({
  value,
  onChange,
  onSelect,
  required,
  placeholder = "Start typing your address",
  country = "au",
}: {
  value: string;
  onChange: (v: string) => void;
  onSelect?: (parts: Parts) => void;
  required?: boolean;
  placeholder?: string;
  country?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const acRef = useRef<any>(null);
  const placesRef = useRef<any>(null);
  const sessionTokenRef = useRef<any>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [suggestions, setSuggestions] = useState<any[]>([]);

  const regionCodes = useMemo(() => {
    const normalized = country?.trim().toLowerCase();
    return normalized ? [normalized] : undefined;
  }, [country]);

  useEffect(() => {
    let cancelled = false;
    loadGooglePlaces()
      .then((placesLib) => {
        if (cancelled) return;
        const places = placesLib ?? window.google?.maps?.places;
        placesRef.current = places;
        if (places?.AutocompleteSuggestion) {
          sessionTokenRef.current = new places.AutocompleteSessionToken();
          setReady(true);
          return;
        }
        if (places?.Autocomplete && inputRef.current) {
          attachLegacyAutocomplete(places.Autocomplete);
          return;
        }
        {
          setError("Google Places is unavailable for this domain/API key.");
          return;
        }
      })
      .catch((e) => {
        console.error("Google Places load failed", e);
        if (!cancelled) setError("Google address lookup could not load.");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!ready || value.trim().length < 3) {
      setSuggestions([]);
      setOpen(false);
      return;
    }

    let cancelled = false;
    const timer = window.setTimeout(async () => {
      try {
        const places = placesRef.current ?? window.google?.maps?.places;
        const { suggestions } =
          await places.AutocompleteSuggestion.fetchAutocompleteSuggestions({
            input: value,
            includedRegionCodes: regionCodes,
            sessionToken: sessionTokenRef.current,
          });
        if (cancelled) return;
        setSuggestions(suggestions ?? []);
        setOpen((suggestions ?? []).length > 0);
      } catch (e) {
        console.error("Google Places suggestions failed", e);
        const message = String((e as any)?.message ?? e ?? "");
        const places = window.google?.maps?.places;
        if (!message.toLowerCase().includes("blocked") && places?.Autocomplete && inputRef.current) {
          attachLegacyAutocomplete(places.Autocomplete);
          return;
        }
        if (!cancelled) {
          setError("Google address lookup is blocked. Check API restrictions for this domain.");
          setSuggestions([]);
          setOpen(false);
        }
      }
    }, 250);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [ready, regionCodes, value]);

  function attachLegacyAutocomplete(Autocomplete: any) {
    if (!inputRef.current || acRef.current) return;
    const ac = new Autocomplete(inputRef.current, {
      types: ["address"],
      fields: ["address_components", "formatted_address"],
      componentRestrictions: { country: [country.toLowerCase()] },
    });
    acRef.current = ac;
    ac.addListener("place_changed", () => {
      const place = ac.getPlace();
      const comps: any[] = place.address_components ?? [];
      const get = (t: string) => comps.find((c) => c.types.includes(t))?.long_name ?? "";
      const streetNumber = get("street_number");
      const route = get("route");
      const city = get("locality") || get("postal_town") || get("administrative_area_level_2");
      const postcode = get("postal_code");
      const selectedCountry = comps.find((c) => c.types.includes("country"))?.short_name ?? "";
      const address = place.formatted_address?.split(",")[0] || `${streetNumber} ${route}`.trim();
      onChange(address);
      onSelect?.({ address, city, postcode, country: selectedCountry });
    });
  }

  useEffect(() => {
    function onPointerDown(e: PointerEvent) {
      if (!boxRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, []);

  async function selectSuggestion(suggestion: any) {
    const prediction = suggestion.placePrediction;
    if (!prediction) return;
    const suggestionText = prediction.text?.text ?? value;
    try {
      const place = prediction.toPlace();
      await place.fetchFields({ fields: ["formattedAddress", "addressComponents"] });
      const comps: any[] = place.addressComponents ?? [];
      const get = (t: string, short = false) => {
        const component = comps.find((c) => c.types?.includes(t));
        return short
          ? component?.shortText || component?.short_name || ""
          : component?.longText || component?.long_name || "";
      };
      const streetNumber = get("street_number");
      const route = get("route");
      const city = get("locality") || get("postal_town") || get("administrative_area_level_2");
      const postcode = get("postal_code");
      const selectedCountry = get("country", true);
      const address =
        place.formattedAddress?.split(",")[0] ||
        prediction.text?.text?.split(",")[0] ||
        `${streetNumber} ${route}`.trim();
      onChange(address);
      onSelect?.({ address, city, postcode, country: selectedCountry });
      setOpen(false);
      setSuggestions([]);
      const places = placesRef.current ?? window.google?.maps?.places;
      sessionTokenRef.current = places?.AutocompleteSessionToken
        ? new places.AutocompleteSessionToken()
        : sessionTokenRef.current;
    } catch (e) {
      console.error("Google Places detail failed", e);
      const parsed = parseAddressText(suggestionText);
      onChange(parsed.address);
      onSelect?.(parsed);
      setOpen(false);
    }
  }

  return (
    <div ref={boxRef} className="relative">
      <Input
        ref={inputRef}
        value={value}
        onChange={(e) => {
          setError(null);
          onChange(e.target.value);
        }}
        onFocus={() => suggestions.length > 0 && setOpen(true)}
        required={required}
        placeholder={placeholder}
        autoComplete="off"
      />
      {open && suggestions.length > 0 && (
        <div className="absolute left-0 right-0 top-[calc(100%+4px)] z-50 overflow-hidden rounded-md border bg-popover text-popover-foreground shadow-lg">
          {suggestions.map((suggestion, index) => {
            const prediction = suggestion.placePrediction;
            const label = prediction?.text?.text ?? "";
            return (
              <button
                key={prediction?.placeId ?? index}
                type="button"
                className="block w-full px-3 py-2 text-left text-sm hover:bg-accent hover:text-accent-foreground"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => selectSuggestion(suggestion)}
              >
                {label}
              </button>
            );
          })}
        </div>
      )}
      {error && <p className="mt-1 text-xs text-destructive">{error}</p>}
    </div>
  );
}

function parseAddressText(text: string): Parts {
  const segments = text.split(",").map((s) => s.trim()).filter(Boolean);
  const address = segments[0] || text;
  const locality = segments[1] || "";
  const postcodeMatch = text.match(/\b\d{4}\b/);
  const city = locality.replace(/\b(?:ACT|NSW|NT|QLD|SA|TAS|VIC|WA)\b.*$/i, "").trim();
  const country = /Australia/i.test(text) ? "AU" : undefined;
  return { address, city, postcode: postcodeMatch?.[0], country };
}
