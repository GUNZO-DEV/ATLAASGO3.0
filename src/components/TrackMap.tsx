import { useEffect, useMemo, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { Coords } from '../lib/database.types';

/**
 * Real interactive Leaflet map for the order Track page.
 * - OpenStreetMap (Carto Voyager) tiles → no API key, no quota
 * - Three branded markers: merchant (ink), rider (primary), customer (amber)
 * - Auto-fit bounds when markers change
 * - Dashed animated route line between them
 */

function brandIcon(opts: { bg: string; fg: string; ring?: string; emoji: string; size?: number; pulse?: boolean }) {
  const size = opts.size ?? 38;
  const ring = opts.ring ?? 'rgba(255,255,255,0.85)';
  const pulseHtml = opts.pulse
    ? `<span class="atlaas-pin-pulse" style="background:${opts.bg};"></span>`
    : '';
  return L.divIcon({
    className: 'atlaas-pin',
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    html: `
      <div class="atlaas-pin-inner" style="
        width:${size}px;height:${size}px;border-radius:50%;
        background:${opts.bg};color:${opts.fg};
        box-shadow:0 6px 18px rgba(26,20,16,.35), 0 0 0 4px ${ring};
        display:grid;place-items:center;font-size:${size * 0.5}px;line-height:1;
      ">${opts.emoji}</div>
      ${pulseHtml}
    `,
  });
}

function FitBounds({ points }: { points: [number, number][] }) {
  const map = useMap();
  useEffect(() => {
    if (!points.length) return;
    if (points.length === 1) {
      map.setView(points[0], 16, { animate: true });
      return;
    }
    const b = L.latLngBounds(points);
    map.fitBounds(b, { padding: [40, 40], maxZoom: 16 });
  }, [map, points]);
  return null;
}

export type TrackMapProps = {
  merchant?: Coords | null;
  rider?: Coords | null;
  customer: Coords;
};

export default function TrackMap({ merchant, rider, customer }: TrackMapProps) {
  const points = useMemo(() => {
    const arr: [number, number][] = [];
    if (merchant) arr.push([merchant.lat, merchant.lng]);
    if (rider) arr.push([rider.lat, rider.lng]);
    arr.push([customer.lat, customer.lng]);
    return arr;
  }, [merchant, rider, customer]);

  // Synthetic merchant + rider positions if not provided, derived from the
  // customer point — keeps the map dense even when only the customer pin exists.
  const synth = useMemo(() => {
    const m = merchant ?? { lat: customer.lat + 0.005, lng: customer.lng - 0.006 };
    const r = rider ?? { lat: customer.lat + 0.001, lng: customer.lng - 0.0025 };
    return { m, r };
  }, [merchant, rider, customer]);

  const merchantIcon = useRef(
    brandIcon({ bg: '#1A1410', fg: '#FBF7F2', emoji: '🍽' }),
  );
  const riderIcon = useRef(
    brandIcon({ bg: '#FF5722', fg: '#fff', emoji: '🏍', pulse: true }),
  );
  const customerIcon = useRef(
    brandIcon({ bg: '#FFB74D', fg: '#1A1410', emoji: '📍' }),
  );

  const ridePath: [number, number][] = [
    [synth.m.lat, synth.m.lng],
    [synth.r.lat, synth.r.lng],
    [customer.lat, customer.lng],
  ];

  return (
    <div className="track-leaflet">
      <MapContainer
        center={[customer.lat, customer.lng]}
        zoom={15}
        scrollWheelZoom={false}
        dragging
        style={{ height: '100%', width: '100%', borderRadius: 'inherit' }}
        attributionControl={false}
      >
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
          subdomains={['a', 'b', 'c', 'd']}
        />
        <Polyline
          positions={ridePath}
          pathOptions={{
            color: '#FF5722',
            weight: 4,
            opacity: 0.85,
            dashArray: '8 10',
            lineCap: 'round',
          }}
        />
        <Marker position={[synth.m.lat, synth.m.lng]} icon={merchantIcon.current} />
        <Marker position={[synth.r.lat, synth.r.lng]} icon={riderIcon.current} />
        <Marker position={[customer.lat, customer.lng]} icon={customerIcon.current} />
        <FitBounds points={points.length > 1 ? points : ridePath} />
      </MapContainer>
      <div className="track-leaflet-legend">
        <span><span className="dot" style={{ background: '#1A1410' }} /> Merchant</span>
        <span><span className="dot atlaas-pulse" style={{ background: '#FF5722' }} /> Rider</span>
        <span><span className="dot" style={{ background: '#FFB74D' }} /> You</span>
      </div>
    </div>
  );
}
