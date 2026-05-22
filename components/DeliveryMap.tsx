"use client";

import { useEffect, useRef, useState } from "react";
import { MapContainer, TileLayer, Marker, Polyline, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { LANDMARK_COORDS, ZONES } from "@/constants/zones";
import type { OrderStatus } from "@/types/order";

/* ─── fix Leaflet's broken default icon paths in Next.js ─────── */
delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl:       "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl:     "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

/* ─── custom SVG markers ─────────────────────────────────────── */

function pinIcon(color: string, label: string) {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="32" height="40" viewBox="0 0 32 40">
      <filter id="shadow" x="-30%" y="-20%" width="160%" height="160%">
        <feDropShadow dx="0" dy="2" stdDeviation="2" flood-color="rgba(0,0,0,0.25)"/>
      </filter>
      <path filter="url(#shadow)" fill="${color}" d="M16 0C9.373 0 4 5.373 4 12c0 9 12 28 12 28S28 21 28 12C28 5.373 22.627 0 16 0z"/>
      <circle cx="16" cy="12" r="6" fill="white"/>
      <text x="16" y="16" text-anchor="middle" font-size="8" font-weight="700"
            font-family="system-ui,sans-serif" fill="${color}">${label}</text>
    </svg>`;
  return L.divIcon({
    className: "",
    html: svg,
    iconSize:   [32, 40],
    iconAnchor: [16, 40],
    popupAnchor:[0, -40],
  });
}

function courierIcon() {
  const svg = `
    <div style="
      width:40px;height:40px;
      background:#006747;
      border-radius:50%;
      display:flex;align-items:center;justify-content:center;
      font-size:20px;line-height:1;
      box-shadow:0 3px 10px rgba(0,103,71,0.45);
      border:3px solid white;
    ">🛵</div>`;
  return L.divIcon({
    className: "",
    html: svg,
    iconSize:   [40, 40],
    iconAnchor: [20, 20],
  });
}

const PICKUP_ICON  = pinIcon("#006747", "A");
const DROPOFF_ICON = pinIcon("#b8973e", "B");
const COURIER_ICON = courierIcon();

/* ─── helpers ────────────────────────────────────────────────── */

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

function easeInOut(t: number) {
  return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
}

function parseLandmark(location: string): string {
  return location.split("—")[0].trim();
}

function resolveCoords(location: string, zone: string): [number, number] | null {
  const landmark = parseLandmark(location);
  if (LANDMARK_COORDS[landmark]) return LANDMARK_COORDS[landmark];
  const z = ZONES.find((z) => z.id === zone);
  return z ? [z.lat, z.lng] : null;
}

/* ─── FitBounds: auto-zoom to show both markers ─────────────── */

function FitBounds({ positions }: { positions: [number, number][] }) {
  const map = useMap();
  const fitted = useRef(false);
  useEffect(() => {
    if (positions.length < 2 || fitted.current) return;
    const bounds = L.latLngBounds(positions.map(([lat, lng]) => L.latLng(lat, lng)));
    map.fitBounds(bounds, { padding: [52, 52], maxZoom: 15 });
    fitted.current = true;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [positions[0]?.toString(), positions[1]?.toString()]);
  return null;
}

/* ─── props ──────────────────────────────────────────────────── */

interface Props {
  pickup:  string;
  dropoff: string;
  zone:    string;
  status:  OrderStatus;
  height?: number;
}

/* ─── component ──────────────────────────────────────────────── */

export default function DeliveryMap({ pickup, dropoff, zone, status, height = 280 }: Props) {
  const pickupCoords  = resolveCoords(pickup,  zone);
  const dropoffCoords = resolveCoords(dropoff, zone);

  const ANIM_DURATION = 120_000; // 2 min simulated travel time
  const [courierPos, setCourierPos] = useState<[number, number] | null>(null);
  const startRef  = useRef<number | null>(null);
  const timerRef  = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (timerRef.current) clearInterval(timerRef.current);

    if (status !== "picked_up" || !pickupCoords || !dropoffCoords) {
      setCourierPos(status === "picked_up" ? pickupCoords : null);
      startRef.current = null;
      return;
    }

    if (!startRef.current) {
      startRef.current = Date.now();
      setCourierPos(pickupCoords); // start at pickup immediately
    }

    timerRef.current = setInterval(() => {
      const elapsed = Date.now() - (startRef.current ?? Date.now());
      const raw = Math.min(elapsed / ANIM_DURATION, 0.95);
      const t   = easeInOut(raw);
      setCourierPos([
        lerp(pickupCoords[0], dropoffCoords[0], t),
        lerp(pickupCoords[1], dropoffCoords[1], t),
      ]);
    }, 500); // smooth 500ms tick

    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, pickup, dropoff]);

  if (!pickupCoords || !dropoffCoords) {
    return (
      <div
        className="rounded-2xl bg-gray-100 flex items-center justify-center text-gray-400 text-sm"
        style={{ height }}
      >
        Map unavailable for this location.
      </div>
    );
  }

  const center: [number, number] = [
    (pickupCoords[0] + dropoffCoords[0]) / 2,
    (pickupCoords[1] + dropoffCoords[1]) / 2,
  ];

  // Travelled portion of the route (for the solid vs dashed split)
  const travelledEnd = courierPos ?? pickupCoords;

  return (
    <div
      className="rounded-2xl overflow-hidden border border-gold/20"
      style={{
        height,
        boxShadow: "0 4px 20px rgba(0,103,71,0.10), 0 1px 4px rgba(0,0,0,0.06)",
      }}
    >
      <MapContainer
        center={center}
        zoom={14}
        style={{ height: "100%", width: "100%" }}
        scrollWheelZoom={false}
        zoomControl={false}
        attributionControl={false}
      >
        {/* CartoDB Positron — clean, minimalist, no API key needed */}
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
          subdomains="abcd"
          maxZoom={19}
        />

        <FitBounds positions={[pickupCoords, dropoffCoords]} />

        {/* Full route — light dashed */}
        <Polyline
          positions={[pickupCoords, dropoffCoords]}
          pathOptions={{ color: "#006747", weight: 3, dashArray: "6 8", opacity: 0.25 }}
        />

        {/* Travelled portion — solid emerald */}
        {courierPos && (
          <Polyline
            positions={[pickupCoords, travelledEnd]}
            pathOptions={{ color: "#006747", weight: 4, opacity: 0.85, lineCap: "round" }}
          />
        )}

        {/* Pickup pin (A) */}
        <Marker position={pickupCoords}  icon={PICKUP_ICON} />

        {/* Dropoff pin (B) */}
        <Marker position={dropoffCoords} icon={DROPOFF_ICON} />

        {/* Courier — only when picked_up */}
        {courierPos && (
          <Marker position={courierPos} icon={COURIER_ICON} />
        )}
      </MapContainer>

      {/* Map legend */}
      <div
        className="absolute bottom-2 left-2 z-[1000] flex gap-2 text-[10px] font-medium"
        style={{ pointerEvents: "none" }}
      >
        <span className="bg-white/90 backdrop-blur-sm px-2 py-1 rounded-full text-emerald-atlaasgo border border-emerald-atlaasgo/20 shadow-sm">
          A Pickup
        </span>
        <span className="bg-white/90 backdrop-blur-sm px-2 py-1 rounded-full text-gold border border-gold/30 shadow-sm">
          B Drop-off
        </span>
        {courierPos && (
          <span className="bg-white/90 backdrop-blur-sm px-2 py-1 rounded-full text-emerald-atlaasgo border border-emerald-atlaasgo/20 shadow-sm">
            🛵 En route
          </span>
        )}
      </div>
    </div>
  );
}
