import{j as e}from"./vendor-motion-B0b037fF.js";import{f as A,e as n,h as D,L as _}from"./vendor-react-CKEcGPa_.js";import{q as m,t as w,A as y,H as v,L,l as C,d as E,a as q,i as R,M as T,v as O,F as V}from"./index-BEaT_uHE.js";import{u as Y}from"./catalog-CwLPNUoN.js";import{F as M}from"./ScrollReveal-DM92pJ1T.js";import{M as G}from"./Motion-CN15szKf.js";import"./vendor-clerk-CHi-XLZW.js";import"./vendor-supabase-BedW8mzU.js";const H={0:"linear-gradient(135deg, #FFB74D, #FF5722)",1:"linear-gradient(135deg, #8B4513, #2A211C)",2:"linear-gradient(135deg, #34D399, #059669)",3:"linear-gradient(135deg, #6B5B95, #2A211C)",4:"linear-gradient(135deg, #FF5722, #C2185B)",5:"linear-gradient(135deg, #FBA74D, #C66B1F)"},B={crepeto:"/logos/crepeto.svg","bonsai-sushi-bar":"/logos/bonsai-sushi-bar.svg",foodie:"/logos/foodie.svg"};function W({restaurant:a}){const t=A(),c=m(s=>s.add),d=m(s=>s.setQty),u=m(s=>s.items),p=m(s=>s.count()),x=m(s=>s.subtotal()),{has:g,toggle:h}=w("restaurant"),{has:f,toggle:j}=w("menu_item"),[k,N]=n.useState(!1),[o,b]=n.useState(a.categories[0]?.id??""),i=n.useRef(null),z=n.useRef(new Map),F=n.useRef(null);n.useEffect(()=>{const s=new IntersectionObserver(r=>{for(const l of r)if(l.isIntersecting){b(l.target.id.replace("cat-",""));break}},{rootMargin:"-30% 0px -60% 0px"});return z.current.forEach(r=>s.observe(r)),()=>s.disconnect()},[a.categories]),n.useEffect(()=>{const s=()=>N(window.scrollY>180);return window.addEventListener("scroll",s,{passive:!0}),()=>window.removeEventListener("scroll",s)},[]),n.useEffect(()=>{const s=F.current;if(!s)return;const r=s.querySelector(`[data-cat-id="${o}"]`);r&&r.scrollIntoView({behavior:"smooth",inline:"center",block:"nearest"})},[o]);const $=n.useMemo(()=>{const s=new Map;for(const r of u)s.set(r.id,(s.get(r.id)??0)+r.qty);return s},[u]);function I(s){const r=z.current.get(s);if(!r)return;const l=r.getBoundingClientRect().top+window.scrollY-110;window.scrollTo({top:l,behavior:"smooth"})}return e.jsxs("div",{className:"mresto",children:[e.jsxs("div",{className:`mresto-stickytop ${k?"visible":""}`,children:[e.jsx("button",{onClick:()=>t(-1),"aria-label":"Back",className:"mresto-stickybtn",children:e.jsx(y,{size:16,style:{transform:"rotate(180deg)"}})}),e.jsx("div",{className:"mresto-stickytitle",children:a.name}),e.jsx("button",{onClick:()=>h(a.id),"aria-label":g(a.id)?"Remove from favourites":"Save",className:"mresto-stickybtn",children:e.jsx(v,{size:16,filled:g(a.id)})})]}),e.jsxs("div",{ref:i,className:"mresto-hero",style:{background:H[a.img_variant]},children:[e.jsxs("div",{className:"mresto-hero-fab-row",children:[e.jsx("button",{onClick:()=>t(-1),"aria-label":"Back",className:"mresto-fab",children:e.jsx(y,{size:15,style:{transform:"rotate(180deg)"}})}),e.jsx("div",{style:{flex:1}}),e.jsx("button",{onClick:()=>{navigator.share&&navigator.share({title:a.name,text:`Check out ${a.name} on AtlaasGo`,url:window.location.href})},"aria-label":"Share restaurant",className:"mresto-fab",children:e.jsx(L,{size:15})}),e.jsx("button",{onClick:()=>h(a.id),"aria-label":"Save",className:"mresto-fab",children:e.jsx(v,{size:15,filled:g(a.id)})})]}),e.jsx("div",{className:"mresto-hero-emoji","aria-hidden":!0,children:a.emoji??"🥘"}),B[a.slug]&&e.jsx("img",{src:B[a.slug],alt:`${a.name} logo`,className:"mresto-hero-logo"})]}),e.jsxs("div",{className:"mresto-info",children:[e.jsxs("div",{className:"mresto-info-row",children:[e.jsxs("div",{style:{flex:1,minWidth:0},children:[e.jsx("h1",{className:"mresto-name",children:a.name}),e.jsx("div",{className:"mresto-tags",children:a.cuisine_tags?.slice(0,3).map(s=>e.jsx("span",{children:s},s))})]}),e.jsxs("div",{className:"mresto-rating-badge",children:[e.jsx(C,{size:12}),e.jsx("span",{children:a.rating})]})]}),a.description&&e.jsx("p",{className:"mresto-desc",children:a.description}),e.jsxs("div",{className:"mresto-meta",children:[e.jsxs("div",{className:"mresto-meta-item",children:[e.jsx(E,{size:13}),e.jsxs("span",{children:[a.time_min," min"]})]}),e.jsx("div",{className:"mresto-meta-sep"}),e.jsxs("div",{className:"mresto-meta-item",children:[e.jsx(q,{size:13}),e.jsx("span",{children:a.fee_dh===0?"Free delivery":`${a.fee_dh} dh fee`})]}),a.is_local_legend&&e.jsxs(e.Fragment,{children:[e.jsx("div",{className:"mresto-meta-sep"}),e.jsxs("div",{className:"mresto-meta-item",children:[e.jsx(C,{size:11,style:{color:"#F59E0B"}}),e.jsx("span",{style:{color:"#F59E0B",fontWeight:700},children:"Local Legend"})]})]})]})]}),a.categories.length>1&&e.jsx("div",{className:"mresto-catnav-wrap",children:e.jsx("div",{className:"mresto-catnav",ref:F,children:a.categories.map(s=>e.jsx("button",{"data-cat-id":s.id,onClick:()=>I(s.id),className:`mresto-catpill ${o===s.id?"active":""}`,children:s.name},s.id))})}),e.jsxs("div",{className:"mresto-sections",children:[a.categories.length===0&&e.jsxs("div",{className:"mresto-empty",children:[e.jsx("div",{style:{fontSize:48},children:"🍽"}),e.jsx("h3",{children:"Menu coming soon"}),e.jsx("p",{children:"This partner is setting up their menu. Check back in a bit."})]}),a.categories.map(s=>e.jsxs("section",{id:`cat-${s.id}`,ref:r=>{r&&z.current.set(s.id,r)},className:"mresto-section",children:[e.jsx("h2",{className:"mresto-section-title",children:s.name}),e.jsx("div",{className:"mresto-items",children:s.items.length===0?e.jsx("div",{className:"mresto-empty-mini",children:"No items in this category yet"}):s.items.map(r=>{const l=$.get(r.id)??0;return e.jsxs("article",{className:"mresto-item",children:[e.jsxs("div",{className:"mresto-item-body",children:[e.jsxs("div",{className:"mresto-item-head",children:[e.jsx("h3",{children:r.name}),e.jsx("button",{"aria-label":f(r.id)?"Remove favorite":"Save item",onClick:()=>j(r.id),className:"mresto-item-fav",style:{color:f(r.id)?"var(--primary)":"var(--fg-soft)"},children:e.jsx(v,{size:14,filled:f(r.id)})})]}),r.description&&e.jsx("p",{className:"mresto-item-desc",children:r.description}),e.jsxs("div",{className:"mresto-item-price",children:[r.price_dh," dh"]})]}),e.jsxs("div",{className:"mresto-item-action",children:[r.image_url?e.jsx("img",{src:r.image_url,alt:r.name,className:"mresto-item-img",loading:"lazy"}):e.jsx("div",{className:"mresto-item-img placeholder","aria-hidden":!0,children:a.emoji??"🥘"}),l===0?e.jsx("button",{className:"mresto-add-btn",onClick:()=>{c({id:r.id,restaurantSlug:a.slug,restaurantName:a.name,name:r.name,desc:r.description??void 0,priceDh:r.price_dh},1,!!a.is_campus_partner),"vibrate"in navigator&&navigator.vibrate?.(8)},"aria-label":`Add ${r.name} to cart`,children:e.jsx(R,{size:14})}):e.jsxs("div",{className:"mresto-qty",children:[e.jsx("button",{onClick:()=>{d(r.id,l-1),"vibrate"in navigator&&navigator.vibrate?.(6)},"aria-label":"Remove one",children:e.jsx(T,{size:14})}),e.jsx("span",{children:l}),e.jsx("button",{onClick:()=>{d(r.id,l+1),"vibrate"in navigator&&navigator.vibrate?.(6)},"aria-label":"Add one",children:e.jsx(R,{size:14})})]})]})]},r.id)})})]},s.id))]}),p>0&&e.jsx("div",{className:"mresto-cartbar",children:e.jsxs("button",{onClick:()=>t("/cart"),className:"mresto-cartbtn",children:[e.jsx("span",{className:"mresto-cartcount",children:p}),e.jsx("span",{className:"mresto-cartlabel",children:"View cart"}),e.jsxs("span",{className:"mresto-carttotal",children:[x," dh"]}),e.jsx(y,{size:14})]})}),e.jsx(P,{})]})}function P(){return e.jsx("style",{children:`
      .mresto {
        background: var(--bg);
        min-height: 100vh;
        padding-bottom: 100px;
      }

      /* Sticky header */
      .mresto-stickytop {
        position: fixed;
        top: 0; left: 0; right: 0;
        z-index: 60;
        padding: calc(var(--safe-top) + 8px) 14px 8px;
        background: color-mix(in srgb, var(--surface) 88%, transparent);
        -webkit-backdrop-filter: blur(24px) saturate(180%);
        backdrop-filter: blur(24px) saturate(180%);
        border-bottom: 0.5px solid var(--line);
        display: flex;
        align-items: center;
        gap: 12px;
        transform: translateY(-100%);
        transition: transform 0.25s cubic-bezier(.16,1,.3,1);
      }
      .mresto-stickytop.visible { transform: translateY(0); }
      .mresto-stickytitle {
        flex: 1;
        font-family: Montserrat, sans-serif;
        font-weight: 800;
        font-size: 15px;
        text-align: center;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        color: var(--fg);
      }
      .mresto-stickybtn {
        width: 38px; height: 38px;
        border-radius: 50%;
        background: var(--bg);
        border: 1px solid var(--line);
        color: var(--fg);
        display: grid; place-items: center;
        cursor: pointer;
        transition: transform .15s;
      }
      .mresto-stickybtn:active { transform: scale(0.9); }

      /* Hero */
      .mresto-hero {
        position: relative;
        height: 280px;
        padding: calc(var(--safe-top) + 14px) 14px 0;
        overflow: hidden;
      }
      .mresto-hero::after {
        content: "";
        position: absolute;
        inset: 0;
        background: radial-gradient(ellipse 80% 60% at 50% 50%, transparent 30%, rgba(0,0,0,0.25) 100%);
        pointer-events: none;
      }
      .mresto-hero-fab-row {
        position: relative;
        z-index: 2;
        display: flex;
        gap: 10px;
        align-items: center;
      }
      .mresto-fab {
        width: 38px; height: 38px;
        border-radius: 50%;
        background: rgba(0,0,0,0.4);
        backdrop-filter: blur(12px);
        border: 0;
        color: white;
        display: grid; place-items: center;
        cursor: pointer;
        transition: transform .15s;
      }
      .mresto-fab:active { transform: scale(0.9); }
      .mresto-hero-emoji {
        position: absolute;
        bottom: 30px;
        right: 18px;
        font-size: 110px;
        line-height: 1;
        opacity: 0.95;
        filter: drop-shadow(0 8px 24px rgba(0,0,0,0.3));
        transform: rotate(-8deg);
      }
      .mresto-hero-logo {
        position: absolute;
        bottom: 18px;
        left: 18px;
        height: 64px;
        width: 64px;
        object-fit: contain;
        filter: drop-shadow(0 4px 12px rgba(0,0,0,0.3));
      }

      /* Info card (overlaps hero) */
      .mresto-info {
        position: relative;
        z-index: 3;
        margin: -28px 14px 0;
        padding: 18px 18px 16px;
        background: var(--surface);
        border: 1px solid var(--line);
        border-radius: 20px;
        box-shadow: 0 8px 24px -8px rgba(0,0,0,0.12);
      }
      .mresto-info-row {
        display: flex;
        align-items: flex-start;
        gap: 12px;
        margin-bottom: 8px;
      }
      .mresto-name {
        font-family: Montserrat, sans-serif;
        font-weight: 900;
        font-size: 22px;
        line-height: 1.1;
        letter-spacing: -0.02em;
        color: var(--fg);
        margin: 0 0 6px;
      }
      .mresto-tags {
        display: flex;
        gap: 6px;
        flex-wrap: wrap;
      }
      .mresto-tags span {
        font-size: 11px;
        font-weight: 600;
        color: var(--fg-soft);
        background: rgba(0,0,0,0.04);
        padding: 3px 10px;
        border-radius: 999px;
      }
      .mresto-rating-badge {
        display: flex;
        align-items: center;
        gap: 4px;
        padding: 6px 10px;
        background: linear-gradient(135deg, #FFB74D, #FF8A65);
        color: white;
        border-radius: 12px;
        font-weight: 800;
        font-size: 13px;
        flex-shrink: 0;
        box-shadow: 0 4px 10px rgba(255,138,101,0.3);
      }
      .mresto-desc {
        font-size: 13px;
        color: var(--fg-soft);
        line-height: 1.45;
        margin: 4px 0 14px;
      }
      .mresto-meta {
        display: flex;
        align-items: center;
        gap: 10px;
        padding-top: 12px;
        border-top: 1px dashed var(--line);
        font-size: 12px;
        font-weight: 600;
        color: var(--fg);
        flex-wrap: wrap;
      }
      .mresto-meta-item {
        display: inline-flex;
        align-items: center;
        gap: 4px;
      }
      .mresto-meta-item svg { color: var(--primary); }
      .mresto-meta-sep {
        width: 3px; height: 3px;
        background: var(--fg-soft);
        opacity: 0.5;
        border-radius: 50%;
      }

      /* Category nav rail */
      .mresto-catnav-wrap {
        position: sticky;
        top: calc(var(--safe-top) + 52px);
        z-index: 20;
        background: color-mix(in srgb, var(--bg) 92%, transparent);
        -webkit-backdrop-filter: blur(20px);
        backdrop-filter: blur(20px);
        padding: 18px 0 6px;
        margin-top: 18px;
      }
      .mresto-catnav {
        display: flex;
        gap: 8px;
        padding: 0 14px;
        overflow-x: auto;
        scroll-snap-type: x mandatory;
        scrollbar-width: none;
        -webkit-overflow-scrolling: touch;
      }
      .mresto-catnav::-webkit-scrollbar { display: none; }
      .mresto-catpill {
        flex-shrink: 0;
        scroll-snap-align: start;
        padding: 8px 16px;
        border-radius: 999px;
        background: var(--surface);
        border: 1.5px solid var(--line);
        color: var(--fg);
        font-weight: 700;
        font-size: 13px;
        cursor: pointer;
        white-space: nowrap;
        transition: all .2s;
      }
      .mresto-catpill:active { transform: scale(0.94); }
      .mresto-catpill.active {
        background: var(--primary);
        color: white;
        border-color: var(--primary);
        box-shadow: 0 4px 12px rgba(255,87,34,0.3);
      }

      /* Menu sections */
      .mresto-sections { padding: 18px 14px 32px; }
      .mresto-section { margin-bottom: 28px; scroll-margin-top: 110px; }
      .mresto-section-title {
        font-family: Montserrat, sans-serif;
        font-weight: 800;
        font-size: 18px;
        letter-spacing: -0.01em;
        margin: 0 0 12px;
        color: var(--fg);
      }
      .mresto-items {
        display: flex;
        flex-direction: column;
        gap: 10px;
      }

      .mresto-item {
        display: flex;
        align-items: stretch;
        gap: 12px;
        padding: 14px;
        background: var(--surface);
        border: 1px solid var(--line);
        border-radius: 18px;
        transition: transform .15s, box-shadow .2s;
      }
      .mresto-item:active { transform: scale(0.99); }
      .mresto-item-body { flex: 1; min-width: 0; }
      .mresto-item-head {
        display: flex;
        align-items: flex-start;
        gap: 8px;
        margin-bottom: 4px;
      }
      .mresto-item h3 {
        font-family: Montserrat, sans-serif;
        font-weight: 700;
        font-size: 15px;
        letter-spacing: -0.005em;
        margin: 0;
        color: var(--fg);
        flex: 1;
      }
      .mresto-item-fav {
        background: none;
        border: 0;
        padding: 0;
        cursor: pointer;
        flex-shrink: 0;
      }
      .mresto-item-desc {
        font-size: 12.5px;
        color: var(--fg-soft);
        line-height: 1.4;
        margin: 0 0 8px;
        display: -webkit-box;
        -webkit-line-clamp: 2;
        -webkit-box-orient: vertical;
        overflow: hidden;
      }
      .mresto-item-price {
        font-family: Montserrat, sans-serif;
        font-weight: 800;
        font-size: 15px;
        color: var(--primary);
        font-variant-numeric: tabular-nums;
      }
      .mresto-item-action {
        position: relative;
        width: 96px;
        flex-shrink: 0;
      }
      .mresto-item-img {
        width: 96px;
        height: 96px;
        object-fit: cover;
        border-radius: 14px;
        background: var(--bg);
      }
      .mresto-item-img.placeholder {
        display: grid;
        place-items: center;
        font-size: 44px;
        opacity: 0.5;
        background: linear-gradient(135deg, rgba(255,138,101,0.10), rgba(255,87,34,0.06));
      }
      .mresto-add-btn {
        position: absolute;
        right: 6px;
        bottom: 6px;
        width: 36px; height: 36px;
        border-radius: 50%;
        background: var(--primary);
        color: white;
        border: 2.5px solid var(--surface);
        display: grid; place-items: center;
        cursor: pointer;
        box-shadow: 0 4px 12px rgba(255,87,34,0.4);
        transition: transform .15s;
      }
      .mresto-add-btn:active { transform: scale(0.88); }
      .mresto-qty {
        position: absolute;
        right: 4px;
        bottom: 4px;
        display: flex;
        align-items: center;
        background: var(--primary);
        border-radius: 22px;
        padding: 2px;
        box-shadow: 0 4px 12px rgba(255,87,34,0.4);
        border: 2.5px solid var(--surface);
      }
      .mresto-qty button {
        width: 28px; height: 28px;
        border-radius: 50%;
        background: transparent;
        color: white;
        border: 0;
        display: grid; place-items: center;
        cursor: pointer;
      }
      .mresto-qty button:active { transform: scale(0.88); }
      .mresto-qty span {
        color: white;
        font-weight: 800;
        min-width: 16px;
        text-align: center;
        font-size: 13px;
        font-variant-numeric: tabular-nums;
      }

      .mresto-empty {
        text-align: center;
        padding: 48px 24px;
      }
      .mresto-empty h3 {
        font-family: Montserrat;
        font-weight: 800;
        font-size: 16px;
        margin: 12px 0 6px;
      }
      .mresto-empty p {
        font-size: 13px;
        color: var(--fg-soft);
      }
      .mresto-empty-mini {
        text-align: center;
        padding: 24px;
        font-size: 13px;
        color: var(--fg-soft);
        background: var(--surface);
        border: 1px dashed var(--line);
        border-radius: 14px;
      }

      /* Sticky cart bar (sits above bottom tab bar) */
      .mresto-cartbar {
        position: fixed;
        left: 14px; right: 14px;
        bottom: calc(var(--tabbar-h) + var(--safe-bot) + 12px);
        z-index: 50;
        animation: cartbar-up 0.3s cubic-bezier(.16,1,.3,1);
      }
      @keyframes cartbar-up {
        from { transform: translateY(120%); opacity: 0; }
        to { transform: translateY(0); opacity: 1; }
      }
      .mresto-cartbtn {
        width: 100%;
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 14px 18px;
        background: linear-gradient(135deg, #FF5722, #FF8A65);
        color: white;
        border: 0;
        border-radius: 18px;
        font-family: Montserrat, sans-serif;
        font-weight: 800;
        cursor: pointer;
        box-shadow: 0 12px 32px -6px rgba(255,87,34,0.55);
        transition: transform .15s;
      }
      .mresto-cartbtn:active { transform: scale(0.98); }
      .mresto-cartcount {
        background: rgba(255,255,255,0.25);
        border-radius: 10px;
        padding: 4px 9px;
        font-size: 13px;
        font-weight: 900;
        min-width: 24px;
        text-align: center;
        font-variant-numeric: tabular-nums;
      }
      .mresto-cartlabel { flex: 1; text-align: left; font-size: 15px; }
      .mresto-carttotal {
        font-size: 15px;
        font-variant-numeric: tabular-nums;
      }
    `})}function Q(){const[a,t]=n.useState(()=>typeof window<"u"&&window.matchMedia("(max-width: 768px)").matches);return n.useEffect(()=>{const c=window.matchMedia("(max-width: 768px)"),d=()=>t(c.matches);return c.addEventListener("change",d),()=>c.removeEventListener("change",d)},[]),a}const U={0:"linear-gradient(135deg, var(--amber), var(--primary))",1:"linear-gradient(135deg, #8B4513, #2A211C)",2:"linear-gradient(135deg, #34D399, #059669)",3:"linear-gradient(135deg, #6B5B95, #2A211C)",4:"linear-gradient(135deg, var(--primary), #C2185B)",5:"linear-gradient(135deg, #FBA74D, #C66B1F)"},S={crepeto:"/logos/crepeto.svg","bonsai-sushi-bar":"/logos/bonsai-sushi-bar.svg",foodie:"/logos/foodie.svg"};function ae(){const{slug:a}=D(),{restaurant:t,loading:c,error:d}=Y(a),u=m(o=>o.add),p=m(o=>o.count()),{t:x}=O(),g=A(),{has:h,toggle:f}=w("restaurant"),{has:j,toggle:k}=w("menu_item"),N=Q();return V({title:t?`${t.name} · ${t.cuisine}`:"Restaurant",description:t?`${t.name} in Ifrane — ${t.cuisine}${t.description?". "+t.description.slice(0,130):""}`:void 0,jsonLd:t?{"@context":"https://schema.org","@type":"Restaurant",name:t.name,servesCuisine:t.cuisine_tags,aggregateRating:{"@type":"AggregateRating",ratingValue:t.rating,bestRating:5},address:{"@type":"PostalAddress",addressLocality:"Ifrane",addressCountry:"MA"}}:void 0}),!c&&t&&N?e.jsx(W,{restaurant:t}):c?e.jsx("section",{className:"page",children:e.jsxs("div",{className:"container",children:[e.jsx("div",{className:"resto-header skeleton-shimmer",style:{height:320}}),e.jsx("div",{style:{marginTop:24,display:"grid",gap:12},children:Array.from({length:4}).map((o,b)=>e.jsx("div",{className:"skeleton-line",style:{height:64}},b))})]})}):!t||d?e.jsx("section",{className:"page",children:e.jsx("div",{className:"container",children:e.jsxs("div",{className:"empty-state",children:[e.jsx("h3",{children:"Restaurant not found"}),e.jsxs("p",{children:[d??"We couldn't find that partner."," ",e.jsx(_,{to:"/order",children:"Browse all restaurants"}),"."]})]})})}):e.jsx("section",{className:"page",children:e.jsxs("div",{className:"container",children:[e.jsx(_,{to:"/order",className:"btn btn-ghost",style:{marginTop:20},children:"← Back to restaurants"}),e.jsx(M,{y:14,children:e.jsxs("div",{className:"resto-header",style:{background:U[t.img_variant]},children:[S[t.slug]&&e.jsx("img",{src:S[t.slug],alt:`${t.name} logo`,className:"resto-header-logo"}),e.jsx("button",{className:`resto-fav ${h(t.id)?"active":""}`,style:{top:18,right:18,width:40,height:40},"aria-label":"Save restaurant",onClick:()=>f(t.id),children:e.jsx(v,{size:18,filled:h(t.id)})}),e.jsxs("div",{className:"resto-header-content",children:[e.jsxs("div",{className:"section-tag",style:{background:"rgba(255,255,255,.2)",color:"white"},children:[e.jsx(C,{size:11})," ",t.rating," · ",t.cuisine_tags?.join(" · ")]}),e.jsx("h1",{children:t.name}),e.jsx("p",{style:{maxWidth:540,marginTop:6,opacity:.92},children:t.description}),e.jsxs("div",{style:{display:"flex",gap:16,marginTop:14,fontSize:14},children:[e.jsxs("span",{children:[e.jsx(E,{size:13,style:{verticalAlign:-2,marginInlineEnd:4}}),t.time_min," ",x("common.minutes")]}),e.jsx("span",{children:t.fee_dh===0?x("common.delivery"):`${t.fee_dh} dh delivery`})]})]})]})}),t.categories.map((o,b)=>e.jsx(M,{y:14,delay:b*.04,children:e.jsxs("div",{className:"menu-section",children:[e.jsx("h3",{children:o.name}),e.jsx("div",{className:"menu-grid",children:o.items.map(i=>e.jsxs("div",{className:"menu-item",children:[e.jsxs("div",{children:[e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:8},children:[e.jsx("h4",{style:{margin:0},children:i.name}),e.jsx("button",{"aria-label":"Save item",onClick:()=>k(i.id),style:{border:"none",background:"transparent",cursor:"pointer",color:j(i.id)?"var(--primary)":"var(--fg-soft)",padding:0},children:e.jsx(v,{size:13,filled:j(i.id)})})]}),e.jsx("p",{children:i.description}),e.jsxs("div",{style:{marginTop:8,fontFamily:"Montserrat",fontWeight:700,color:"var(--primary)"},children:[i.price_dh," dh"]})]}),e.jsxs("button",{className:"menu-add",onClick:()=>{u({id:i.id,restaurantSlug:t.slug,restaurantName:t.name,name:i.name,desc:i.description??void 0,priceDh:i.price_dh},1,!!t.is_campus_partner)},children:["+ ",x("common.add")]})]},i.id))})]})},o.id)),p>0&&e.jsx("div",{className:"resto-floating-cart",children:e.jsxs(G,{className:"btn btn-primary btn-lg",onClick:()=>g("/cart"),children:["View cart (",p,") ",e.jsx(y,{})]})})]})})}export{ae as default};
