// AtlaasGo 3.0 — Orders (in-progress card + past orders + reorder). Faithful
// port of the Orders export in screen-tabs2.jsx, wired to live agApi + cart.
// Markup/classNames preserved (ag2-* → ag3-*); mock window.AG.* reads replaced
// with agApi.orders.list() ({active, past}). Track → go('tracking', order);
// Reorder → agApi.orders.reorder(id) then load the store + seed the cart.
import { agApi, type Order, type OrderStatus } from '../../lib/agApi';
import { useAsync } from '../useAsync';
import { useCart } from '../CartContext';
import { PhotoTile, Price, tileFor, foodEm } from '../primitives';

type Go = (screen: string, payload?: unknown) => void;

/* spec status → live label + progress fraction (mirrors agApi STATUS_PROGRESS) */
const STATUS_LABEL: Record<OrderStatus, string> = {
  placed: 'Order placed',
  kitchen: 'In the kitchen',
  pickup: 'Picked up · on the way',
  enroute: 'On the way',
  arrived: 'Arriving now',
  delivered: 'Delivered',
};
const STATUS_PROGRESS: Record<OrderStatus, number> = {
  placed: 0.1, kitchen: 0.3, pickup: 0.5, enroute: 0.75, arrived: 0.95, delivered: 1,
};

/* "Tue", "Sun" … — the prototype's short weekday for past orders */
function whenLabel(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-US', { weekday: 'short' });
}

/* "Lamb tagine · 2 more" — first item name + remaining count */
function itemsSub(o: Order): string {
  const items = o.items ?? [];
  if (items.length === 0) return '';
  const more = items.length - 1;
  return more > 0 ? `${items[0].name} · ${more} more` : items[0].name;
}

export default function Orders({ go }: { go: Go }) {
  const { data, reload } = useAsync(() => agApi.orders.list(), []);
  const cart = useCart();

  const active = data?.active ?? [];
  const past = data?.past ?? [];
  const live = active[0];

  async function reorder(o: Order) {
    // server-priced reorder: pull the order's lines, then seed the single-store cart
    const { cart: lines } = await agApi.orders.reorder(o.id);
    const store = await agApi.catalog.store(o.store.id);
    if (store) {
      cart.clear();
      const menu = await agApi.catalog.menu(store.id);
      const byId = new Map(menu.flatMap((s) => s.items).map((it) => [it.id, it]));
      lines.forEach((l) => {
        const mi = byId.get(l.itemId);
        if (mi) cart.add({ itemId: mi.id, storeId: store.id, name: mi.name, priceDh: mi.priceDh, emoji: foodEm(mi.id) }, l.qty);
      });
      go('restaurant', store);
    }
    reload();
  }

  return (
    <div className="ag3-scroll ag3-anim" style={{ paddingTop: 8 }}>
      <div className="ag3-pad" style={{ marginTop: 8 }}>
        <div className="disp" style={{ fontWeight: 800, fontSize: 27 }}>Orders</div>
      </div>

      {live && (
        <div className="ag3-pad" style={{ marginTop: 16 }}>
          <div className="ag3-eyebrow" style={{ marginBottom: 10 }}>In progress</div>
          <button onClick={() => go('tracking', live)} className="ag3-card ag3-press" style={{ width: '100%', textAlign: 'left', padding: 0, border: '1.5px solid rgba(255,87,34,.26)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 13, padding: 14 }}>
              <PhotoTile cls={tileFor(live.store.id)} em={foodEm(live.store.id)} round="14px" style={{ width: 54, height: 54 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="disp" style={{ fontWeight: 800, fontSize: 15.5 }}>{live.store.name}</div>
                <div className="ag3-live" style={{ marginTop: 3 }}><span className="pip" /><span style={{ fontSize: 12, color: 'var(--ok)', fontWeight: 700 }}>{STATUS_LABEL[live.status]}</span></div>
              </div>
              <span className="ag3-btn ag3-btn-primary ag3-btn-pill" style={{ padding: '10px 18px', fontSize: 13.5 }}>Track</span>
            </div>
            <div style={{ height: 5, background: 'var(--line-2)' }}><div style={{ width: `${Math.round(STATUS_PROGRESS[live.status] * 100)}%`, height: '100%', background: 'var(--grad)' }} /></div>
          </button>
        </div>
      )}

      <div className="ag3-pad" style={{ marginTop: 24 }}>
        <div className="ag3-eyebrow" style={{ marginBottom: 10 }}>Past orders</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {past.map((r) => (
            <div key={r.id} className="ag3-card" style={{ display: 'flex', alignItems: 'center', gap: 13, padding: 13 }}>
              <PhotoTile cls={tileFor(r.store.id)} em={foodEm(r.store.id)} round="13px" style={{ width: 50, height: 50 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="disp" style={{ fontWeight: 800, fontSize: 14.5 }}>{r.store.name}</div>
                <div style={{ fontSize: 12, color: 'var(--muted)' }}>{itemsSub(r)} · {whenLabel(r.placedAt)}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <Price v={r.totalDh} />
                <button className="ag3-link" style={{ display: 'block', marginTop: 3 }} onClick={() => reorder(r)}>Reorder</button>
              </div>
            </div>
          ))}
        </div>
      </div>
      <div style={{ height: 16 }} />
    </div>
  );
}
