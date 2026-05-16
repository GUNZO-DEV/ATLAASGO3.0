// components/AddressInput.tsx
"use client";

import { useState, useCallback } from "react";
import { MapPin, LocateFixed, Loader2 } from "lucide-react";
import { LANDMARKS, LANDMARK_COORDS } from "@/constants/zones";
import toast from "react-hot-toast";

interface Props {
  value: string;
  onChange: (address: string) => void;
  zone?: string;
  placeholder?: string;
  showLandmarks?: boolean;
  showGeolocate?: boolean;
}

/**
 * Reverse-geocode GPS coordinates into a human-readable address via
 * the free OpenStreetMap Nominatim API. Falls back to raw coordinates
 * if the fetch fails.
 */
async function reverseGeocode(lat: number, lng: number): Promise<string> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&accept-language=fr`,
      { headers: { "User-Agent": "AtlaasGo/1.0" } }
    );
    if (!res.ok) throw new Error("nominatim fetch failed");
    const data = await res.json();
    // Build a concise address from the structured result
    const a = data.address ?? {};
    const parts = [
      a.road,
      a.house_number,
      a.neighbourhood || a.suburb,
      a.city || a.town || a.village,
    ].filter(Boolean);
    return parts.length > 0 ? parts.join(", ") : data.display_name ?? `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
  } catch {
    return `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
  }
}

export default function AddressInput({
  value,
  onChange,
  zone = "ifrane",
  placeholder = "Rue, immeuble, résidence...",
  showLandmarks = true,
  showGeolocate = true,
}: Props) {
  const [geoLoading, setGeoLoading] = useState(false);

  const landmarks = showLandmarks ? (LANDMARKS[zone] ?? []) : [];

  const handleGeolocate = useCallback(async () => {
    if (!navigator.geolocation) {
      toast.error("La géolocalisation n'est pas disponible sur cet appareil");
      return;
    }
    setGeoLoading(true);
    try {
      const position = await new Promise<GeolocationPosition>(
        (resolve, reject) =>
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            enableHighAccuracy: true,
            timeout: 10_000,
            maximumAge: 60_000,
          })
      );
      const { latitude, longitude } = position.coords;

      // Check if the user is near a known landmark (within ~150m)
      let nearestLandmark: string | null = null;
      let nearestDist = Infinity;
      for (const [name, coords] of Object.entries(LANDMARK_COORDS)) {
        const dlat = (coords[0] - latitude) * 111_320;
        const dlng = (coords[1] - longitude) * 111_320 * Math.cos(latitude * Math.PI / 180);
        const dist = Math.sqrt(dlat * dlat + dlng * dlng);
        if (dist < nearestDist) {
          nearestDist = dist;
          nearestLandmark = name;
        }
      }

      if (nearestLandmark && nearestDist < 150) {
        onChange(nearestLandmark);
        toast.success(`Localisé près de ${nearestLandmark}`);
      } else {
        const addr = await reverseGeocode(latitude, longitude);
        onChange(addr);
        toast.success("Position détectée");
      }
    } catch (err) {
      const geoErr = err as GeolocationPositionError;
      if (geoErr?.code === 1) {
        toast.error("Accès à la position refusé. Activez la localisation.");
      } else {
        toast.error("Impossible de détecter votre position");
      }
    } finally {
      setGeoLoading(false);
    }
  }, [onChange]);

  return (
    <div className="space-y-3">
      {/* ── Geolocation button ── */}
      {showGeolocate && (
        <button
          type="button"
          onClick={handleGeolocate}
          disabled={geoLoading}
          className="w-full flex items-center justify-center gap-2 py-3 bg-[#1B2440] text-white rounded-xl font-semibold text-sm hover:bg-[#1B2440]/90 transition-colors disabled:opacity-60 cursor-pointer"
        >
          {geoLoading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <LocateFixed className="w-4 h-4" />
          )}
          {geoLoading ? "Localisation en cours..." : "Me localiser"}
        </button>
      )}

      {/* ── Landmark chips ── */}
      {landmarks.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {landmarks.map((lm) => (
            <button
              key={lm}
              type="button"
              onClick={() => onChange(lm)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors cursor-pointer ${
                value === lm
                  ? "bg-[#E55A26] text-white"
                  : "bg-[#F5F0E8] text-[#1B2440] hover:bg-[#FEF0E7] border border-transparent hover:border-[#E55A26]/20"
              }`}
            >
              <MapPin className="w-3 h-3" />
              {lm}
            </button>
          ))}
        </div>
      )}

      {/* ── Text input ── */}
      <div className="relative">
        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6B7A9E]" />
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          required
          className="w-full pl-10 pr-4 py-3 bg-[#F5F0E8] border border-transparent rounded-xl text-sm text-[#1B2440] placeholder:text-[#6B7A9E]/60 focus:border-[#E55A26]/30 focus:ring-2 focus:ring-[#E55A26]/20 focus:outline-none transition-colors"
        />
      </div>
    </div>
  );
}
