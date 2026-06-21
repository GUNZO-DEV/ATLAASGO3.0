// AtlaasGo 3.0 — Restaurant menu + item sheet. Faithful port of
// screen-restaurant2.jsx, wired to live agApi + useCart. Markup/classNames
// preserved (ag2-* → ag3-*); mock window.AG.* / window.foodEm reads replaced
// with agApi calls + the shared `foodEm` primitive.
import { Fragment, useRef, useState, type CSSProperties } from 'react';
import { agApi, type Store, type MenuSection, type MenuItem, type ItemOption } from '../../lib/agApi';
import { useAsync } from '../useAsync';
import { useCart } from '../CartContext';
import { PhotoTile, Price, foodEm, tileFor, etaLabel, feeLabel } from '../primitives';
import { IBack, IHeart, IStar, IClock, IPin, IPlus, ITruck, ICheck, IClose } from '../icons';

type Go = (screen: string, payload?: unknown) => void;

/* ── item sheet (kcal/rx/packSize meta + Make-it-yours when options) ──────── */
function ItemSheet({
  item,
  store,
  onClose,
  onAdd,
}: {
  item: MenuItem;
  store: Store;
  onClose: () => void;
  onAdd: (it: MenuItem, qty: number, optionIds: string[]) => void;
}) {
  const [qty, setQty] = useState(1);
  const [opts, setOpts] = useState<Record<string, boolean>>({});

  // Make-it-yours options come from MenuItem.options when the catalog supplies
  // them; otherwise the prototype shows a vertical-specific note (no extras).
  const extras: ItemOption[] = item.options ?? [];
  const hasOptions = extras.length > 0;
  const extra = extras.reduce((s, e) => s + (opts[e.id] ? e.priceDh : 0), 0);
  const total = (item.priceDh + extra) * qty;
  const em = foodEm(item.id);
  const tile = tileFor(item.id);

  // meta line: kcal · made to order  ·or·  packSize  ·or· nothing
  const meta = item.kcal ? `${item.kcal} kcal · made to order` : item.packSize ?? '';

  return (
    <div style={{ position: 'absolute', inset: 0, zIndex: 40, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
      <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(10,7,4,.52)', backdropFilter: 'blur(2px)', animation: 'ag3-fade .25s ease' }} />
      <div className="ag3-anim" style={{ position: 'relative', background: 'var(--surface)', borderRadius: 'var(--r-xl) var(--r-xl) 0 0', maxHeight: '90%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <PhotoTile cls={tile} em={em} float round="0" style={{ height: 190 }}>
          <button onClick={onClose} className="ag3-iconbtn" style={{ position: 'absolute', top: 14, right: 14, zIndex: 3 }}><IClose size={20} /></button>
        </PhotoTile>
        <div className="ag3-scroll" style={{ padding: '18px 20px 4px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start' }}>
            <h2 className="disp" style={{ margin: 0, fontSize: 23, fontWeight: 800 }}>{item.name}</h2>
            <Price v={item.priceDh} big />
          </div>
          <p style={{ color: 'var(--fg-soft)', fontSize: 14, lineHeight: 1.5, margin: '8px 0 4px' }}>{item.description}</p>
          {meta && <div className="mono" style={{ fontSize: 11.5, color: 'var(--muted)' }}>{meta}</div>}

          {hasOptions ? (
            <>
              <div className="ag3-eyebrow" style={{ marginTop: 20, marginBottom: 10 }}>Make it yours</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {extras.map((e) => (
                  <button
                    key={e.id}
                    onClick={() => setOpts((o) => ({ ...o, [e.id]: !o[e.id] }))}
                    style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '13px 14px', borderRadius: 'var(--r)', border: `1.5px solid ${opts[e.id] ? 'var(--primary)' : 'var(--line)'}`, background: opts[e.id] ? 'var(--grad-soft)' : 'var(--surface)', textAlign: 'left' }}
                  >
                    <span style={{ width: 22, height: 22, borderRadius: 7, display: 'grid', placeItems: 'center', border: `1.5px solid ${opts[e.id] ? 'var(--primary)' : 'var(--line)'}`, background: opts[e.id] ? 'var(--primary)' : 'transparent', color: '#fff', flexShrink: 0 }}>{opts[e.id] && <ICheck size={15} />}</span>
                    <span style={{ flex: 1, fontWeight: 600, fontSize: 14 }}>{e.label}</span>
                    <span className="mono" style={{ fontSize: 12.5, color: 'var(--muted)' }}>{e.priceDh ? `+${e.priceDh} dh` : 'Free'}</span>
                  </button>
                ))}
              </div>
            </>
          ) : item.rx || store.vertical === 'pharmacy' ? (
            <div style={{ display: 'flex', gap: 10, marginTop: 18, padding: '13px 14px', borderRadius: 'var(--r)', background: 'rgba(62,134,199,.09)', border: '1px solid rgba(62,134,199,.2)' }}>
              <span style={{ color: 'var(--snow)', flexShrink: 0, marginTop: 1 }}><ICheck size={19} /></span>
              <span style={{ fontSize: 12.5, color: 'var(--fg-soft)', lineHeight: 1.45 }}>Always read the label. A licensed pharmacist is available in-app for advice on any order.</span>
            </div>
          ) : (
            <div style={{ display: 'flex', gap: 10, marginTop: 18, padding: '13px 14px', borderRadius: 'var(--r)', background: 'var(--surface-2)', border: '1px solid var(--line)' }}>
              <span style={{ color: 'var(--ok)', flexShrink: 0, marginTop: 1 }}><ICheck size={19} /></span>
              <span style={{ fontSize: 12.5, color: 'var(--fg-soft)', lineHeight: 1.45 }}>In stock · picked fresh and packed with care for your drop.</span>
            </div>
          )}
          <div style={{ height: 12 }} />
        </div>
        <div className="ag3-sticky" style={{ display: 'flex', alignItems: 'center', gap: 14, background: 'var(--surface)', borderTop: '1px solid var(--line)' }}>
          <div className="ag3-step">
            <button onClick={() => setQty((q) => Math.max(1, q - 1))}>–</button>
            <span className="n">{qty}</span>
            <button onClick={() => setQty((q) => q + 1)}>+</button>
          </div>
          <button className="ag3-btn ag3-btn-primary" style={{ flex: 1 }} onClick={() => onAdd(item, qty, extras.filter((e) => opts[e.id]).map((e) => e.id))}>
            Add · <span className="mono" style={{ fontWeight: 700 }}>{total} dh</span>
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── single menu row ──────────────────────────────────────────────────────── */
function MenuRow({ item, onClick }: { item: MenuItem; onClick: () => void }) {
  const em = foodEm(item.id);
  const tile = tileFor(item.id);
  return (
    <button onClick={onClick} className="ag3-press" style={{ display: 'flex', gap: 13, width: '100%', textAlign: 'left', padding: '14px 0', alignItems: 'flex-start' }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <span className="disp" style={{ fontWeight: 800, fontSize: 15.5 }}>{item.name}</span>
          {item.tag && <span className="ag3-badge ag3-badge-soft" style={{ fontSize: 10, padding: '3px 8px' }}>{item.tag}</span>}
        </div>
        <div style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.45, margin: '5px 0 8px', maxWidth: 220 }}>{item.description}</div>
        <Price v={item.priceDh} />
      </div>
      <div style={{ position: 'relative', flexShrink: 0 }}>
        <PhotoTile cls={tile} em={em} round="18px" style={{ width: 96, height: 96 }} />
        <span style={{ position: 'absolute', bottom: -10, right: -8, width: 38, height: 38, borderRadius: 999, background: 'var(--surface)', color: 'var(--primary)', display: 'grid', placeItems: 'center', boxShadow: 'var(--sh-1)', border: '1px solid var(--line-2)' }}><IPlus size={20} /></span>
      </div>
    </button>
  );
}

/* ── screen ───────────────────────────────────────────────────────────────── */
export default function Restaurant({ resto, go }: { resto: { id: string; slug?: string }; go: Go }) {
  const id = resto.id || resto.slug || '';
  const { data: store } = useAsync(() => agApi.catalog.store(id), [id]);
  const { data: menu } = useAsync(() => agApi.catalog.menu(id), [id]);
  const cart = useCart();

  const [sheet, setSheet] = useState<MenuItem | null>(null);
  const [fav, setFav] = useState(false);
  const [favReady, setFavReady] = useState(false);
  const [activeSec, setActiveSec] = useState(0);

  const scrollRef = useRef<HTMLDivElement>(null);
  const secRefs = useRef<(HTMLDivElement | null)[]>([]);

  // seed favourite from the live store once (store loads async)
  if (store && !favReady) {
    setFav(store.isFavourite);
    setFavReady(true);
  }

  function jumpTo(i: number) {
    setActiveSec(i);
    const el = secRefs.current[i];
    const cont = scrollRef.current;
    if (el && cont) cont.scrollTo({ top: el.offsetTop - 64, behavior: 'smooth' });
  }

  function toggleFav() {
    const next = !fav;
    setFav(next);
    agApi.me.setFavourite(id, next).catch(() => setFav(!next));
  }

  const sections: MenuSection[] = menu ?? [];
  const cartCount = cart.count;
  const cartTotal = cart.subtotalDh;
  const tile = store ? tileFor(store.id) : tileFor(id);
  const em = store?.emoji || foodEm(id);

  if (!store) {
    return (
      <div className="ag3-screen">
        <div className="ag3-scroll" style={{ display: 'grid', placeItems: 'center', color: 'var(--muted)' }}>Loading…</div>
      </div>
    );
  }

  return (
    <div className="ag3-screen">
      <div className="ag3-scroll ag3-anim" ref={scrollRef}>
        {/* hero */}
        <PhotoTile cls={tile} em={em} float round="0" style={{ height: 226, alignItems: 'flex-start', justifyContent: 'space-between', padding: 16 }}>
          <button onClick={() => go('home')} className="ag3-iconbtn" style={{ zIndex: 3 }}><IBack size={20} /></button>
          <div style={{ display: 'flex', gap: 9, zIndex: 3 }}>
            <button onClick={toggleFav} className="ag3-iconbtn" style={{ color: fav ? 'var(--primary)' : 'var(--fg)' }}>
              <IHeart size={20} fill={fav ? 'var(--primary)' : 'none'} />
            </button>
          </div>
        </PhotoTile>

        {/* info card overlapping hero */}
        <div className="ag3-pad" style={{ marginTop: -38, position: 'relative', zIndex: 2 }}>
          <div className="ag3-card" style={{ padding: '18px 18px 16px' }}>
            <div className="ag3-eyebrow">{store.tags[0] ?? ''}</div>
            <h1 className="disp" style={{ margin: '6px 0 10px', fontSize: 25, fontWeight: 800, lineHeight: 1.04 }}>{store.name}</h1>
            <p style={{ color: 'var(--fg-soft)', fontSize: 13.5, lineHeight: 1.5, margin: '0 0 15px' }}>{store.blurb}</p>
            <div style={{ display: 'flex', justifyContent: 'space-between', textAlign: 'center' }}>
              {[
                { ic: <IStar size={17} />, t: store.rating, s: `${store.reviews} reviews`, c: 'var(--amber)' },
                { ic: <IClock size={17} />, t: `${etaLabel(store)}m`, s: 'delivery', c: 'var(--primary)' },
                { ic: <ITruck size={17} />, t: feeLabel(store), s: 'fee', c: 'var(--ok)' },
                { ic: <IPin size={17} />, t: store.distanceKm ? `${store.distanceKm} km` : '—', s: 'away', c: 'var(--fg-soft)' },
              ].map((m, i) => (
                <div key={i} style={{ flex: 1, borderLeft: i ? '1px solid var(--line)' : 'none' }}>
                  <div style={{ color: m.c, display: 'flex', justifyContent: 'center', marginBottom: 4 } as CSSProperties}>{m.ic}</div>
                  <div className="disp" style={{ fontWeight: 800, fontSize: 15 }}>{m.t}</div>
                  <div style={{ fontSize: 10.5, color: 'var(--muted)' }}>{m.s}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {store.promo && (
          <div className="ag3-pad" style={{ marginTop: 14 }}>
            <div className="ag3-badge ag3-badge-soft" style={{ padding: '10px 14px', fontSize: 13 }}>🎁 {store.promo} · auto-applied at checkout</div>
          </div>
        )}

        {/* sticky category tabs */}
        <div style={{ position: 'sticky', top: 0, zIndex: 5, background: 'color-mix(in srgb, var(--bg) 90%, transparent)', backdropFilter: 'blur(14px)', marginTop: 18, padding: '10px 0 8px' } as CSSProperties}>
          <div style={{ display: 'flex', gap: 8, overflowX: 'auto', padding: '0 18px', scrollbarWidth: 'none' } as CSSProperties}>
            {sections.map((s, i) => (
              <button key={i} className={`ag3-chip ${activeSec === i ? 'is-active' : ''}`} onClick={() => jumpTo(i)}>{s.title}</button>
            ))}
          </div>
        </div>

        {/* menu */}
        {sections.map((sec, si) => (
          <div key={si} className="ag3-pad" ref={(el) => { secRefs.current[si] = el; }} style={{ marginTop: si === 0 ? 6 : 18 }}>
            <div className="ag3-sectitle" style={{ fontSize: 18 }}>{sec.title}</div>
            <div style={{ marginTop: 2 }}>
              {sec.items.map((it, ii) => (
                <Fragment key={it.id}>
                  <MenuRow item={it} onClick={() => setSheet(it)} />
                  {ii < sec.items.length - 1 && <hr className="ag3-hr" />}
                </Fragment>
              ))}
            </div>
          </div>
        ))}
        <div style={{ height: cartCount ? 100 : 24 }} />
      </div>

      {/* sticky view-cart bar */}
      {cartCount > 0 && (
        <div className="ag3-sticky ag3-anim" style={{ position: 'absolute', left: 0, right: 0, bottom: 0 }}>
          <button className="ag3-btn ag3-btn-primary ag3-btn-block" style={{ justifyContent: 'space-between' }} onClick={() => go('cart')}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 9 }}>
              <span style={{ background: 'rgba(255,255,255,.25)', borderRadius: 999, padding: '2px 10px', fontFamily: 'JetBrains Mono', fontSize: 14 }}>{cartCount}</span>
              View cart
            </span>
            <span className="mono" style={{ fontWeight: 700 }}>{cartTotal} dh</span>
          </button>
        </div>
      )}

      {sheet && (
        <ItemSheet
          item={sheet}
          store={store}
          onClose={() => setSheet(null)}
          onAdd={(it, q, optionIds) => {
            const extra = (it.options ?? []).filter((o) => optionIds.includes(o.id)).reduce((s, o) => s + o.priceDh, 0);
            cart.add({ itemId: it.id, storeId: store.id, name: it.name, priceDh: it.priceDh + extra, emoji: foodEm(it.id) }, q);
            setSheet(null);
          }}
        />
      )}
    </div>
  );
}
