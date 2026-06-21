// AtlaasGo 3.0 — Checkout (dorm-precise drop). Faithful port of
// screen-checkout2.jsx, wired to live agApi + useCart + useCity.
// Markup/classNames preserved (ag2-* → ag3-*); mock window.AG.* reads replaced
// with agApi calls. Bill summary is priced SERVER-SIDE via agApi.cart.quote().
import { useMemo, useState, type CSSProperties, type ReactNode } from 'react';
import { agApi, type Address, type Order, type PaymentMethod, type Quote } from '../../lib/agApi';
import { useCity } from '../CityContext';
import { useCart } from '../CartContext';
import { useAsync } from '../useAsync';
import { PhotoTile, Price, foodEm } from '../primitives';
import { IBack, IPin, IClock, IBolt, ISnow, IWallet, ICheck, IChevR, IUser } from '../icons';

type Go = (screen: string, payload?: unknown) => void;
type Speed = 'standard' | 'priority';
type Handoff = 'door' | 'hand' | 'lounge';

/* The handoff spec defines POST /orders → agApi.orders.create(OrderInput).
 * The current Supabase-native agApi has no orders.create yet, so reference it
 * defensively: call it when present, else synthesise an Order from the live
 * quote so the flow still reaches tracking. (See "gaps" in the handoff note.) */
interface OrderInput {
  storeId: string;
  items: { itemId: string; qty: number; optionIds?: string[] }[];
  addressId: string;
  handoff: Handoff;
  speed: Speed;
  tipDh: number;
  paymentMethodId: string;
}
type OrdersWithCreate = { create?: (input: OrderInput) => Promise<Order> };

export default function Checkout({ go }: { go: Go }) {
  const { city } = useCity();
  const { items: cart, setQty, storeId, subtotalDh } = useCart();

  const { data: addresses } = useAsync(() => agApi.me.addresses(), []);
  const { data: payments } = useAsync(() => agApi.me.paymentMethods(), []);

  const [addressId, setAddressId] = useState<string | null>(null);
  const [pickOpen, setPickOpen] = useState(false);
  const [handoff, setHandoff] = useState<Handoff>('door');
  const [speed, setSpeed] = useState<Speed>('standard');
  const [tip, setTip] = useState(10);
  const [placing, setPlacing] = useState(false);

  // current selection resolves against live addresses; default = isDefault/first
  const selectedAddress: Address | undefined = useMemo(() => {
    const list = addresses ?? [];
    return list.find((a) => a.id === addressId) ?? list.find((a) => a.isDefault) ?? list[0];
  }, [addresses, addressId]);

  // store name/emoji — cart lines carry the storeId + per-item emoji; the first
  // line's name isn't a store name, so resolve the store for its display name.
  const { data: store } = useAsync(
    () => (storeId ? agApi.catalog.store(storeId) : Promise.resolve(null)),
    [storeId],
  );
  const restoName = store?.name ?? 'Your order';

  const payment: PaymentMethod | undefined = (payments ?? [])[0];

  // ── server-side bill: re-quote on every input that affects price ──────────
  const quoteItems = useMemo(() => cart.map((c) => ({ itemId: c.itemId, qty: c.qty })), [cart]);
  const itemsKey = quoteItems.map((i) => `${i.itemId}:${i.qty}`).join(',');
  const { data: quote } = useAsync<Quote | null>(
    () =>
      storeId && quoteItems.length
        ? agApi.cart.quote({ storeId, items: quoteItems, addressId: selectedAddress?.id, speed, tipDh: tip })
        : Promise.resolve(null),
    [storeId, itemsKey, speed, tip, selectedAddress?.id],
  );

  // display fields — prefer the server quote, fall back to local subtotal
  const sub = quote?.subtotalDh ?? subtotalDh;
  const baseFee = quote?.deliveryFeeDh ?? 0;
  const priority = quote?.priorityDh ?? 0;
  const weatherFee = quote?.weatherSurchargeDh ?? 0;
  const tipDh = quote?.tipDh ?? tip;
  const total = quote?.totalDh ?? sub + baseFee + priority + weatherFee + tipDh;
  const eta = quote ? `${quote.etaMinutes[0]}–${quote.etaMinutes[1]}` : speed === 'priority' ? '14–18' : '18–24';

  // dorm-precise drop (campus) vs delivery address — mirror the prototype `d`
  const d = city?.campus
    ? selectedAddress
      ? { name: selectedAddress.label, sub: selectedAddress.sub, note: selectedAddress.dropNote ?? 'Leave at the door' }
      : { name: city.defaultAddress, sub: city.defaultAddressSub, note: 'Leave at the door' }
    : selectedAddress
      ? { name: selectedAddress.label, sub: selectedAddress.sub, note: selectedAddress.dropNote ?? 'Leave at the door' }
      : { name: city?.defaultAddress ?? 'Delivery address', sub: city?.defaultAddressSub ?? '', note: 'Leave at the door' };

  const placeOrder = async () => {
    if (placing) return;
    setPlacing(true);
    const input: OrderInput = {
      storeId: storeId ?? '',
      items: quoteItems,
      addressId: selectedAddress?.id ?? '',
      handoff,
      speed,
      tipDh: tip,
      paymentMethodId: payment?.id ?? 'wallet',
    };
    try {
      const create = (agApi.orders as OrdersWithCreate).create;
      let order: Order;
      if (typeof create === 'function') {
        order = await create(input);
      } else {
        // No POST /orders in agApi yet — synthesise an Order from live data so
        // the six-stage tracking flow still works end-to-end.
        order = {
          id: `AG-${Math.random().toString(36).slice(2, 6).toUpperCase()}`,
          store: { id: storeId ?? '', name: restoName, heroImageUrl: store?.heroImageUrl ?? null },
          items: cart.map((c) => ({ itemId: c.itemId, name: c.name, qty: c.qty, priceDh: c.priceDh })),
          status: 'placed',
          totalDh: total,
          placedAt: new Date().toISOString(),
          address: selectedAddress ?? {
            id: '', cityId: city?.id ?? '', label: d.name, sub: d.sub, isDefault: false,
          },
        };
      }
      go('tracking', order);
    } catch {
      setPlacing(false);
    }
  };

  const Section = ({ title, children, right }: { title: string; children: ReactNode; right?: ReactNode }) => (
    <div className="ag3-pad" style={{ marginTop: 22 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 11 }}>
        <div className="ag3-sectitle" style={{ fontSize: 17 }}>{title}</div>{right}
      </div>
      {children}
    </div>
  );

  // bill rows (conditional) — [label, value, colorKey?]
  const billRows: ([string, string] | [string, string, string])[] = [
    ['Subtotal', `${sub} dh`],
    baseFee ? ['Delivery fee', `${baseFee} dh`] : ['Delivery fee', 'Free', 'ok'],
    ...(speed === 'priority' && priority ? ([['Priority', `${priority} dh`]] as [string, string][]) : []),
    ...(city?.weather && weatherFee ? ([['Winter surcharge', `${weatherFee} dh`]] as [string, string][]) : []),
    ...(tipDh > 0 ? ([['Courier tip', `${tipDh} dh`]] as [string, string][]) : []),
  ];

  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 18px 12px' }}>
        <button className="ag3-iconbtn" onClick={() => go('back')}><IBack size={20} /></button>
        <div className="disp" style={{ fontWeight: 800, fontSize: 20 }}>Checkout</div>
      </div>

      <div className="ag3-scroll ag3-anim">
        {/* order from */}
        <div className="ag3-pad">
          <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
            <PhotoTile em={store?.emoji || foodEm(storeId ?? '')} round="14px" style={{ width: 46, height: 46 }} />
            <div>
              <div className="ag3-eyebrow" style={{ fontSize: 9.5 }}>Order from</div>
              <div className="disp" style={{ fontWeight: 800, fontSize: 16 }}>{restoName}</div>
            </div>
          </div>
        </div>

        {/* items */}
        <Section title="Your items" right={<button className="ag3-link" onClick={() => go('back')}>+ Add more</button>}>
          <div className="ag3-card" style={{ padding: '4px 16px' }}>
            {cart.map((c, i) => (
              <div key={c.itemId}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '13px 0' }}>
                  <PhotoTile em={c.emoji || foodEm(c.itemId)} round="12px" style={{ width: 48, height: 48, flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: 14.5 }}>{c.name}</div>
                    <Price v={c.priceDh} />
                  </div>
                  <div className="ag3-step">
                    <button onClick={() => setQty(c.itemId, c.qty - 1)}>–</button>
                    <span className="n">{c.qty}</span>
                    <button onClick={() => setQty(c.itemId, c.qty + 1)}>+</button>
                  </div>
                </div>
                {i < cart.length - 1 && <hr className="ag3-hr" />}
              </div>
            ))}
          </div>
        </Section>

        {/* drop / address */}
        <Section
          title={city?.campus ? 'Dorm-precise drop' : 'Delivery address'}
          right={
            city?.campus
              ? <button className="ag3-link" onClick={() => setPickOpen((o) => !o)}>{pickOpen ? 'Done' : 'Change'}</button>
              : <button className="ag3-link" onClick={() => go('home')}>Change</button>
          }
        >
          <div className="ag3-card">
            <div style={{ display: 'flex', alignItems: 'center', gap: 13, padding: 15 }}>
              <span style={{ width: 44, height: 44, borderRadius: 14, background: 'var(--grad)', color: '#fff', display: 'grid', placeItems: 'center', flexShrink: 0, boxShadow: 'var(--sh-glow)' }}><IPin size={22} /></span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="disp" style={{ fontWeight: 800, fontSize: 16 }}>{d.name}</div>
                <div style={{ fontSize: 12.5, color: 'var(--muted)' }}>{d.sub}</div>
              </div>
              <span className="ag3-badge ag3-badge-ok"><ICheck size={13} /> Pinned</span>
            </div>

            {pickOpen && city?.campus && (
              <div className="ag3-anim" style={{ borderTop: '1px solid var(--line)', padding: '6px 8px' }}>
                {(addresses ?? []).map((opt) => (
                  <button key={opt.id} onClick={() => { setAddressId(opt.id); setPickOpen(false); }}
                    style={{ display: 'flex', alignItems: 'center', gap: 12, width: '100%', textAlign: 'left', padding: '11px 10px', borderRadius: 'var(--r-sm)', background: opt.id === selectedAddress?.id ? 'var(--grad-soft)' : 'transparent' }}>
                    <span style={{ color: opt.id === selectedAddress?.id ? 'var(--primary)' : 'var(--muted)' }}><IPin size={19} /></span>
                    <span style={{ flex: 1 }}>
                      <span style={{ display: 'block', fontWeight: 700, fontSize: 14 }}>{opt.label}</span>
                      <span style={{ display: 'block', fontSize: 11.5, color: 'var(--muted)' }}>{opt.sub}</span>
                    </span>
                    {opt.id === selectedAddress?.id && <span style={{ color: 'var(--primary)' }}><ICheck size={18} /></span>}
                  </button>
                ))}
              </div>
            )}

            <div style={{ borderTop: '1px solid var(--line)', padding: 13 }}>
              <div className="ag3-seg">
                {(([['door', 'Leave at door'], ['hand', 'Hand to me'], ['lounge', city?.campus ? 'Floor lounge' : 'Concierge']]) as [Handoff, string][]).map(([k, l]) => (
                  <button key={k} className={handoff === k ? 'is-active' : ''} onClick={() => setHandoff(k)}>{l}</button>
                ))}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 11, fontSize: 12.5, color: 'var(--muted)', padding: '0 2px' }}>
                <IUser size={15} /> Note for courier · “{d.note}”
              </div>
            </div>
          </div>
        </Section>

        {/* delivery speed */}
        <Section title="Delivery speed">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {([
              { k: 'standard' as Speed, t: 'Standard', s: city?.weather ? '18–24 min · weather-adjusted' : '18–24 min · standard delivery', p: 'Free' },
              { k: 'priority' as Speed, t: 'Priority', s: '14–18 min · jumps the queue', p: '+9 dh' },
            ]).map((o) => (
              <button key={o.k} onClick={() => setSpeed(o.k)} className="ag3-card" style={{ display: 'flex', alignItems: 'center', gap: 13, padding: '14px 15px', textAlign: 'left', border: `1.5px solid ${speed === o.k ? 'var(--primary)' : 'var(--line-2)'}` }}>
                <span style={{ width: 22, height: 22, borderRadius: 999, border: `2px solid ${speed === o.k ? 'var(--primary)' : 'var(--line)'}`, display: 'grid', placeItems: 'center', flexShrink: 0 }}>
                  {speed === o.k && <span style={{ width: 11, height: 11, borderRadius: 999, background: 'var(--primary)' }} />}
                </span>
                <span style={{ flex: 1 }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 7, fontWeight: 700, fontSize: 14.5 }}>{o.t} {o.k === 'priority' && <IBolt size={14} style={{ color: 'var(--primary)' }} />}</span>
                  <span style={{ display: 'block', fontSize: 12, color: 'var(--muted)' }}>{o.s}</span>
                </span>
                <span className="mono" style={{ fontSize: 13, fontWeight: 600, color: o.p === 'Free' ? 'var(--ok)' : 'var(--fg)' }}>{o.p}</span>
              </button>
            ))}
          </div>
          {city?.weather && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginTop: 11, padding: '11px 13px', borderRadius: 'var(--r)', background: 'rgba(62,134,199,.09)', border: '1px solid rgba(62,134,199,.2)' }}>
              <span style={{ color: 'var(--snow)' }}><ISnow size={19} /></span>
              <span style={{ fontSize: 12, color: 'var(--fg-soft)', flex: 1 }}>Snow on the Atlas pass adds <b>~{quote?.weatherSurchargeDh ? `${weatherFee} dh` : 'a few min'}</b> to the run. We track it live and update your ETA.</span>
            </div>
          )}
        </Section>

        {/* tip */}
        <Section title="Tip your courier">
          <div style={{ display: 'flex', gap: 9 }}>
            {[0, 5, 10, 15].map((t) => (
              <button key={t} onClick={() => setTip(t)} className="ag3-card" style={{ flex: 1, padding: '14px 0', textAlign: 'center', fontWeight: 700, border: `1.5px solid ${tip === t ? 'var(--primary)' : 'var(--line-2)'}`, color: tip === t ? 'var(--primary)' : 'var(--fg)' }}>
                {t === 0 ? 'None' : <span className="mono">{t} dh</span>}
              </button>
            ))}
          </div>
        </Section>

        {/* payment */}
        <Section title="Payment">
          <button className="ag3-card ag3-press" style={{ display: 'flex', alignItems: 'center', gap: 13, padding: '14px 15px', width: '100%', textAlign: 'left' }}>
            <span style={{ width: 42, height: 42, borderRadius: 12, background: 'var(--grad-soft)', color: 'var(--primary)', display: 'grid', placeItems: 'center', flexShrink: 0 }}><IWallet size={21} /></span>
            <span style={{ flex: 1 }}>
              <span style={{ display: 'block', fontWeight: 700, fontSize: 14.5 }}>{payment?.label ?? 'AtlaasGo Wallet'}</span>
              <span style={{ display: 'block', fontSize: 12, color: 'var(--muted)' }}>{payment?.last4 ? `•••• ${payment.last4}` : 'Tap to change payment method'}</span>
            </span>
            <span style={{ color: 'var(--muted)' }}><IChevR size={20} /></span>
          </button>
        </Section>

        {/* bill */}
        <Section title="Bill summary">
          <div className="ag3-card" style={{ padding: '15px 16px' }}>
            {billRows.map(([k, v, c], i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', fontSize: 13.5, color: 'var(--fg-soft)' }}>
                <span>{k}</span><span className="mono" style={{ color: c === 'ok' ? 'var(--ok)' : 'var(--fg)', fontWeight: 600 }}>{v}</span>
              </div>
            ))}
            <hr className="ag3-hr" style={{ margin: '9px 0' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <span className="disp" style={{ fontWeight: 800, fontSize: 17 }}>Total</span>
              <span className="disp mono" style={{ fontWeight: 800, fontSize: 21 }}>{total} dh</span>
            </div>
          </div>
        </Section>

        <div style={{ height: 108 }} />
      </div>

      {/* place order */}
      <div className="ag3-sticky" style={{ position: 'absolute', left: 0, right: 0, bottom: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, justifyContent: 'center', marginBottom: 9, fontSize: 12, color: 'var(--muted)' }}>
          <IClock size={14} /> Arrives in <b style={{ color: 'var(--fg)' }}>{eta} min</b> · to {d.name}
        </div>
        <button className="ag3-btn ag3-btn-primary ag3-btn-block" style={{ justifyContent: 'space-between' }} disabled={placing || cart.length === 0} onClick={placeOrder}>
          <span>{placing ? 'Placing…' : 'Place order'}</span>
          <span className="mono" style={{ fontWeight: 700 }}>{total} dh</span>
        </button>
      </div>
    </>
  );
}
