// refresh-weather — server-side weather cache refresher.
//
// Invoked every 30 min by pg_cron (see migration 20260621_weather_live_and_served_cities.sql).
// Fetches current conditions from Open-Meteo (free, NO API key) for every
// weather-enabled city with coordinates and UPSERTs into public.city_weather,
// which the apps already read via agApi.cities.weather — so the client is
// unchanged. Design contract:
//   • FAIL CLOSED  — on any per-city error the existing row is left intact
//                    (never nulled), so an outage just goes stale, never blank.
//   • SELF-THROTTLE — cities refreshed in the last 10 min are skipped, so a
//                    public invocation can't burn the provider quota.
//   • ADVISORY-ONLY — only snow/ice raise eta_add_minutes/surcharge_dh for v1
//                    (Ifrane's real courier-slowing case; the home strip is
//                    snow-styled). Everything else records condition+temp with
//                    no advisory, so the strip stays hidden on clear days.
// NOTE: this does NOT change pricing. cart_quote still computes the surcharge
// itself; surcharge_dh is populated here only for the later pricing-wiring step.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const FRESH_MS = 10 * 60 * 1000;

type Kind = 'clear' | 'cloud' | 'fog' | 'rain' | 'snow' | 'storm';

// WMO weather_code → short condition string + kind.
function mapWmo(code: number): { condition: string; kind: Kind } {
  if (code === 0) return { condition: 'Clear', kind: 'clear' };
  if (code === 1) return { condition: 'Mainly clear', kind: 'clear' };
  if (code === 2) return { condition: 'Partly cloudy', kind: 'cloud' };
  if (code === 3) return { condition: 'Overcast', kind: 'cloud' };
  if (code === 45 || code === 48) return { condition: 'Fog', kind: 'fog' };
  if (code >= 51 && code <= 57) return { condition: 'Drizzle', kind: 'rain' };
  if (code >= 61 && code <= 65) return { condition: 'Rain', kind: 'rain' };
  if (code === 66 || code === 67) return { condition: 'Freezing rain', kind: 'snow' };
  if (code >= 71 && code <= 77) return { condition: 'Snow', kind: 'snow' };
  if (code >= 80 && code <= 82) return { condition: 'Rain showers', kind: 'rain' };
  if (code === 85 || code === 86) return { condition: 'Snow showers', kind: 'snow' };
  if (code >= 95) return { condition: 'Thunderstorm', kind: 'storm' };
  return { condition: 'Clear', kind: 'clear' };
}

// v1 advisory: snow/ice only. Values match the magnitudes already in cart_quote
// (so the later pricing-wiring step introduces no new surcharge, just makes the
// existing one conditional on real conditions).
function advisory(kind: Kind, cityName: string): { eta: number; surcharge: number; note: string } {
  if (kind === 'snow') {
    const note = cityName === 'Ifrane'
      ? 'Atlas pass slowed — couriers on winter tyres'
      : 'Snow is slowing couriers';
    return { eta: 4, surcharge: 3, note };
  }
  return { eta: 0, surcharge: 0, note: '' };
}

Deno.serve(async (req: Request) => {
  // Optional shared-secret gate — enforced only when CRON_SECRET is configured.
  const wantSecret = Deno.env.get('CRON_SECRET');
  if (wantSecret && req.headers.get('x-cron-secret') !== wantSecret) {
    return new Response('unauthorized', { status: 401 });
  }

  const supa = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  const { data: cities, error } = await supa
    .from('cities')
    .select('id, name, lat, lng')
    .eq('weather', true)
    .not('lat', 'is', null)
    .not('lng', 'is', null);
  if (error) {
    return new Response(JSON.stringify({ ok: false, error: error.message }), {
      status: 500,
      headers: { 'content-type': 'application/json' },
    });
  }

  const { data: existing } = await supa
    .from('city_weather')
    .select('city_id, updated_at, source');
  const prevById = new Map((existing ?? []).map((r) => [r.city_id, r]));

  const now = Date.now();
  const results: unknown[] = [];
  for (const c of cities ?? []) {
    const prev = prevById.get(c.id);
    if (prev?.source === 'live' && prev.updated_at && now - new Date(prev.updated_at).getTime() < FRESH_MS) {
      results.push({ city: c.id, skipped: 'fresh' });
      continue;
    }
    try {
      const url =
        `https://api.open-meteo.com/v1/forecast?latitude=${c.lat}&longitude=${c.lng}` +
        `&current=temperature_2m,weather_code&timezone=auto`;
      const r = await fetch(url);
      if (!r.ok) {
        results.push({ city: c.id, ok: false, status: r.status });
        continue;
      }
      const j = await r.json();
      const code = Number(j?.current?.weather_code ?? 0);
      const temp = Math.round(Number(j?.current?.temperature_2m ?? 0));
      const { condition, kind } = mapWmo(code);
      const { eta, surcharge, note } = advisory(kind, c.name);
      const { error: upErr } = await supa.from('city_weather').upsert({
        city_id: c.id,
        condition,
        temp_c: temp,
        eta_add_minutes: eta,
        surcharge_dh: surcharge,
        note,
        source: 'live',
        updated_at: new Date().toISOString(),
      });
      if (upErr) {
        results.push({ city: c.id, ok: false, error: upErr.message });
        continue;
      }
      results.push({ city: c.id, ok: true, condition, temp, eta });
    } catch (e) {
      // fail closed — leave the existing row untouched
      results.push({ city: c.id, ok: false, error: String(e) });
    }
  }

  return new Response(JSON.stringify({ ok: true, results }), {
    headers: { 'content-type': 'application/json' },
  });
});
