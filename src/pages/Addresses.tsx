import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import * as I from '../icons/Icon';
import { useAuth } from '../lib/auth';
import { useAddresses } from '../lib/customer';
import { FadeUp } from '../components/visual/ScrollReveal';
import type { Coords } from '../lib/database.types';

export default function AddressesPage() {
  const { user, loading: authLoading } = useAuth();
  const { addresses, save, remove, setDefault, loading } = useAddresses();
  const nav = useNavigate();

  const [adding, setAdding] = useState(false);
  const [label, setLabel] = useState('');
  const [line1, setLine1] = useState('');
  const [building, setBuilding] = useState('');
  const [room, setRoom] = useState('');
  const [landmark, setLandmark] = useState('');
  const [isCampus, setIsCampus] = useState(false);
  const [coords, setCoords] = useState<Coords | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) nav('/auth?next=/addresses', { replace: true });
  }, [authLoading, user, nav]);

  function captureCoords() {
    if (!('geolocation' in navigator)) return;
    navigator.geolocation.getCurrentPosition(
      (pos) =>
        setCoords({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracyM: pos.coords.accuracy,
        }),
      (err) => alert(err.message),
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }

  async function onSave() {
    if (!label.trim() || !line1.trim() || !coords) return;
    setBusy(true);
    await save({
      label: label.trim(),
      line1: line1.trim(),
      building: building.trim() || null,
      room: room.trim() || null,
      landmark: landmark.trim() || null,
      coords,
      is_default: addresses.length === 0,
      is_campus: isCampus,
    });
    setBusy(false);
    setLabel('');
    setLine1('');
    setBuilding('');
    setRoom('');
    setLandmark('');
    setCoords(null);
    setIsCampus(false);
    setAdding(false);
  }

  return (
    <section className="page">
      <div className="container">
        <FadeUp y={12}>
          <div className="section-tag">
            <I.Pin size={11} /> Saved places
          </div>
          <h1 className="page-title">Your addresses</h1>
          <p className="page-sub">Add home, the dorm, the café you camp at — one tap at checkout.</p>
        </FadeUp>

        {loading && <p style={{ marginTop: 24, color: 'var(--fg-soft)' }}>Loading…</p>}

        {!loading && addresses.length === 0 && !adding && (
          <div className="empty-state" style={{ marginTop: 24 }}>
            <I.Pin size={36} />
            <h3>No addresses yet</h3>
            <p>Add your first delivery spot in under 20 seconds.</p>
            <button className="btn btn-primary" style={{ marginTop: 16 }} onClick={() => setAdding(true)}>
              <I.Plus size={14} /> Add address
            </button>
          </div>
        )}

        {!loading && addresses.length > 0 && (
          <div style={{ marginTop: 28, display: 'grid', gap: 12 }}>
            {addresses.map((a) => (
              <FadeUp y={10} key={a.id}>
                <div className="address-card">
                  <div className="address-card-icon">
                    {a.is_campus ? <I.Home size={18} /> : <I.Pin size={18} />}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <div style={{ fontFamily: 'Montserrat', fontWeight: 700, fontSize: 15 }}>
                        {a.label}
                      </div>
                      {a.is_default && <span className="badge badge-primary">Default</span>}
                      {a.is_campus && <span className="badge badge-soft">Campus</span>}
                    </div>
                    <div style={{ fontSize: 13, color: 'var(--fg-soft)', marginTop: 2 }}>
                      {a.line1}
                      {a.building ? ` · Building ${a.building}` : ''}
                      {a.room ? ` · Room ${a.room}` : ''}
                    </div>
                    {a.landmark && (
                      <div style={{ fontSize: 12, color: 'var(--primary)', marginTop: 4 }}>
                        🏛 {a.landmark}
                      </div>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    {!a.is_default && (
                      <button className="btn btn-ghost" onClick={() => setDefault(a.id)}>
                        Default
                      </button>
                    )}
                    <button
                      onClick={() => remove(a.id)}
                      className="btn btn-ghost"
                      style={{ color: '#EF4444' }}
                      aria-label="Delete address"
                    >
                      <I.Trash size={14} />
                    </button>
                  </div>
                </div>
              </FadeUp>
            ))}

            {!adding && (
              <button className="btn btn-outline" onClick={() => setAdding(true)}>
                <I.Plus size={14} /> Add another address
              </button>
            )}
          </div>
        )}

        {adding && (
          <FadeUp y={12}>
            <div
              style={{
                marginTop: 24,
                background: 'var(--surface)',
                border: '1px solid var(--line)',
                borderRadius: 24,
                padding: 24,
              }}
            >
              <h3 style={{ fontFamily: 'Montserrat', fontWeight: 800, margin: '0 0 14px' }}>
                New address
              </h3>
              <div className="field">
                <label>Label</label>
                <input
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                  placeholder="Home · Dorm · Studio"
                />
              </div>
              <div className="field">
                <label>Address</label>
                <input
                  value={line1}
                  onChange={(e) => setLine1(e.target.value)}
                  placeholder="Avenue Mohammed V, Ifrane"
                />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="field">
                  <label>Building</label>
                  <input value={building} onChange={(e) => setBuilding(e.target.value)} placeholder="16" />
                </div>
                <div className="field">
                  <label>Room / Apt</label>
                  <input value={room} onChange={(e) => setRoom(e.target.value)} placeholder="204" />
                </div>
              </div>
              <div className="field">
                <label>Landmark</label>
                <input
                  value={landmark}
                  onChange={(e) => setLandmark(e.target.value)}
                  placeholder="Near the AUI gate"
                />
              </div>
              <label
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  fontSize: 14,
                  fontWeight: 600,
                  marginBottom: 14,
                }}
              >
                <input
                  type="checkbox"
                  checked={isCampus}
                  onChange={(e) => setIsCampus(e.target.checked)}
                />
                AUI campus delivery
              </label>

              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: 14,
                  borderRadius: 16,
                  background: '#FFF1EB',
                }}
              >
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 999,
                    background: 'var(--primary)',
                    color: 'white',
                    display: 'grid',
                    placeItems: 'center',
                  }}
                >
                  <I.Pin size={16} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: 11,
                      textTransform: 'uppercase',
                      letterSpacing: '0.1em',
                      fontWeight: 700,
                      color: 'var(--fg-soft)',
                    }}
                  >
                    GPS pin
                  </div>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>
                    {coords
                      ? `${coords.lat.toFixed(5)}, ${coords.lng.toFixed(5)}`
                      : 'Tap to capture'}
                  </div>
                </div>
                <button onClick={captureCoords} className="btn btn-primary">
                  {coords ? 'Update' : 'Capture'}
                </button>
              </div>

              <div style={{ display: 'flex', gap: 10, marginTop: 18 }}>
                <button
                  onClick={onSave}
                  disabled={busy || !label.trim() || !line1.trim() || !coords}
                  className="btn btn-primary btn-lg"
                >
                  {busy ? 'Saving…' : 'Save address'} <I.Arrow />
                </button>
                <button onClick={() => setAdding(false)} className="btn btn-ghost">
                  Cancel
                </button>
              </div>
            </div>
          </FadeUp>
        )}
      </div>
    </section>
  );
}
