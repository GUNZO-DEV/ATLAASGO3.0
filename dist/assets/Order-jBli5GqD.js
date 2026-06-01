import{j as e}from"./vendor-motion-B0b037fF.js";import{i as C,e as n,L as v}from"./vendor-react-CKEcGPa_.js";import{t as z,S as y,e as A,k as B,L,H as _,l as w,F as I,v as $,B as E,d as M}from"./index-Cpi6yXKm.js";import{a as S,C as F}from"./catalog-CBcxBZdc.js";import{F as k}from"./ScrollReveal-DXAlsDho.js";import"./vendor-clerk-CHi-XLZW.js";import"./vendor-supabase-BedW8mzU.js";const N=["linear-gradient(135deg, #FFB74D, #FF5722)","linear-gradient(135deg, #8B4513, #2A211C)","linear-gradient(135deg, #34D399, #059669)","linear-gradient(135deg, #6B5B95, #2A211C)","linear-gradient(135deg, #FF5722, #C2185B)","linear-gradient(135deg, #FBA74D, #C66B1F)"];function D(){const[i]=C(),d=i.get("campus")==="1",l=i.get("cat")||"All",[t,f]=n.useState(l),[o,g]=n.useState(""),[c,b]=n.useState("fastest"),{restaurants:h,loading:p,error:u}=S(),{has:m,toggle:j}=z("restaurant"),x=n.useMemo(()=>{let r=h;if(d&&(r=r.filter(a=>a.is_campus_partner)),t!=="All"&&(r=r.filter(a=>a.cuisine_tags?.includes(t))),o.trim()){const a=o.toLowerCase();r=r.filter(s=>s.name.toLowerCase().includes(a)||s.cuisine.toLowerCase().includes(a))}return r=[...r].sort((a,s)=>c==="rating"?s.rating-a.rating:c==="fee"?a.fee_dh-s.fee_dh:a.time_min-s.time_min),r},[h,d,t,o,c]);return e.jsxs("div",{className:"morder",children:[e.jsx("header",{className:"morder-top",children:e.jsxs("div",{className:"morder-search",children:[e.jsx(y,{size:16}),e.jsx("input",{value:o,onChange:r=>g(r.target.value),placeholder:d?"Search campus eats…":"Search restaurants, dishes…",type:"search",enterKeyHint:"search",autoCapitalize:"off",autoCorrect:"off"}),o&&e.jsx("button",{onClick:()=>g(""),"aria-label":"Clear",className:"morder-clear",children:e.jsx(A,{size:12})})]})}),e.jsxs("div",{className:"morder-mode",children:[e.jsx(v,{to:"/order",className:`morder-mode-btn ${d?"":"active"}`,replace:!0,children:"🥘 Ifrane"}),e.jsx(v,{to:"/order?campus=1",className:`morder-mode-btn ${d?"active":""}`,replace:!0,children:"🏫 Campus"})]}),e.jsx("div",{className:"morder-chips-wrap",children:e.jsx("div",{className:"morder-chips",children:F.map(r=>e.jsx("button",{onClick:()=>f(r),className:`morder-chip ${t===r?"active":""}`,children:r},r))})}),e.jsxs("div",{className:"morder-sort",children:[e.jsxs("span",{children:[x.length," ",x.length===1?"place":"places"]}),e.jsx("div",{className:"morder-sort-pills",children:["fastest","rating","fee"].map(r=>e.jsx("button",{onClick:()=>b(r),className:`morder-sort-pill ${c===r?"active":""}`,children:r==="fastest"?"Fastest":r==="rating"?"Top rated":"Cheapest fee"},r))})]}),u&&e.jsxs("div",{className:"morder-err",children:[e.jsx(B,{size:14})," Couldn't reach the catalog. Pull to refresh in a sec."]}),e.jsxs("div",{className:"morder-feed",children:[p&&Array.from({length:4}).map((r,a)=>e.jsxs("div",{className:"morder-card skeleton",children:[e.jsx("div",{className:"morder-card-img skeleton-shimmer"}),e.jsxs("div",{className:"morder-card-body",children:[e.jsx("div",{className:"skeleton-line",style:{width:"60%"}}),e.jsx("div",{className:"skeleton-line",style:{width:"40%",marginTop:8}})]})]},a)),!p&&x.length===0&&e.jsxs("div",{className:"morder-empty",children:[e.jsx("div",{className:"morder-empty-icon",children:"🔎"}),e.jsx("h3",{children:"No matches in Ifrane"}),e.jsx("p",{children:o?`No restaurants found for "${o}"`:"Try a different cuisine"}),e.jsx("button",{onClick:()=>{g(""),f("All")},className:"morder-empty-btn",children:"Clear filters"})]}),!p&&x.map((r,a)=>e.jsxs(v,{to:`/r/${r.slug}`,className:"morder-card",children:[e.jsxs("div",{className:"morder-card-img",style:{background:N[r.img_variant%N.length]},children:[r.tag&&e.jsxs("span",{className:"morder-card-tag",children:[e.jsx(L,{size:9})," ",r.tag]}),e.jsx("button",{className:`morder-card-fav ${m(r.id)?"active":""}`,"aria-label":m(r.id)?"Remove favourite":"Save",onClick:s=>{s.preventDefault(),j(r.id),"vibrate"in navigator&&navigator.vibrate?.(6)},children:e.jsx(_,{size:14,filled:m(r.id)})}),e.jsx("span",{className:"morder-card-emoji",children:r.emoji??"🥘"}),r.is_local_legend&&e.jsxs("span",{className:"morder-card-legend",children:[e.jsx(w,{size:9})," Local Legend"]})]}),e.jsxs("div",{className:"morder-card-body",children:[e.jsxs("div",{className:"morder-card-head",children:[e.jsx("h3",{children:r.name}),e.jsxs("span",{className:"morder-card-rating",children:[e.jsx(w,{size:11})," ",r.rating]})]}),e.jsxs("div",{className:"morder-card-meta",children:[e.jsx("span",{children:r.cuisine}),e.jsx("span",{className:"morder-dot"}),e.jsxs("span",{children:[r.time_min," min"]}),e.jsx("span",{className:"morder-dot"}),e.jsx("span",{style:{color:r.fee_dh===0?"var(--primary)":"inherit",fontWeight:700},children:r.fee_dh===0?"Free delivery":`${r.fee_dh} dh`})]})]}),e.jsx("span",{style:{opacity:0},children:a})]},r.id))]}),e.jsx(R,{})]})}function R(){return e.jsx("style",{children:`
      .morder {
        padding-top: var(--safe-top);
        background: var(--bg);
        min-height: 100vh;
      }
      .morder-top {
        position: sticky;
        top: var(--safe-top);
        z-index: 20;
        padding: 12px 14px 8px;
        background: color-mix(in srgb, var(--bg) 92%, transparent);
        -webkit-backdrop-filter: blur(20px);
        backdrop-filter: blur(20px);
      }
      .morder-search {
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 12px 16px;
        background: var(--surface);
        border: 1.5px solid var(--line);
        border-radius: 14px;
        transition: border-color .2s;
      }
      .morder-search:focus-within {
        border-color: var(--primary);
        box-shadow: 0 0 0 3px rgba(255,87,34,0.10);
      }
      .morder-search svg { color: var(--primary); flex-shrink: 0; }
      .morder-search input {
        flex: 1;
        background: none;
        border: 0;
        outline: 0;
        font-size: 15px;
        color: var(--fg);
        font-family: inherit;
        min-width: 0;
      }
      .morder-clear {
        width: 22px; height: 22px;
        border-radius: 50%;
        background: rgba(0,0,0,0.06);
        color: var(--fg-soft);
        border: 0;
        display: grid; place-items: center;
        cursor: pointer;
      }
      .morder-mode {
        display: flex;
        gap: 8px;
        padding: 4px 14px 14px;
      }
      .morder-mode-btn {
        flex: 1;
        text-align: center;
        padding: 10px;
        background: var(--surface);
        border: 1.5px solid var(--line);
        border-radius: 14px;
        font-weight: 700;
        font-size: 13px;
        color: var(--fg);
        text-decoration: none;
        transition: all .2s;
      }
      .morder-mode-btn.active {
        background: var(--primary);
        color: white;
        border-color: var(--primary);
        box-shadow: 0 4px 12px rgba(255,87,34,0.25);
      }
      .morder-chips-wrap {
        position: sticky;
        top: calc(var(--safe-top) + 60px);
        z-index: 15;
        background: color-mix(in srgb, var(--bg) 92%, transparent);
        -webkit-backdrop-filter: blur(16px);
        backdrop-filter: blur(16px);
        padding: 6px 0;
      }
      .morder-chips {
        display: flex;
        gap: 8px;
        padding: 4px 14px 8px;
        overflow-x: auto;
        scroll-snap-type: x mandatory;
        scrollbar-width: none;
      }
      .morder-chips::-webkit-scrollbar { display: none; }
      .morder-chip {
        flex-shrink: 0;
        scroll-snap-align: start;
        padding: 7px 14px;
        border-radius: 999px;
        background: var(--surface);
        border: 1.5px solid var(--line);
        color: var(--fg);
        font-weight: 700;
        font-size: 12.5px;
        cursor: pointer;
        white-space: nowrap;
        transition: all .2s;
      }
      .morder-chip:active { transform: scale(0.95); }
      .morder-chip.active {
        background: var(--ink);
        color: white;
        border-color: var(--ink);
      }
      [data-theme="dark"] .morder-chip.active {
        background: white;
        color: var(--ink);
        border-color: white;
      }

      .morder-sort {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 12px 14px;
        font-size: 12px;
        color: var(--fg-soft);
        font-weight: 700;
      }
      .morder-sort-pills {
        display: flex;
        gap: 6px;
        overflow-x: auto;
        scrollbar-width: none;
      }
      .morder-sort-pills::-webkit-scrollbar { display: none; }
      .morder-sort-pill {
        padding: 5px 10px;
        border-radius: 999px;
        background: transparent;
        border: 1px solid var(--line);
        color: var(--fg-soft);
        font-size: 11px;
        font-weight: 700;
        cursor: pointer;
        white-space: nowrap;
      }
      .morder-sort-pill.active {
        background: var(--primary);
        color: white;
        border-color: var(--primary);
      }

      .morder-feed {
        padding: 0 14px 32px;
        display: flex;
        flex-direction: column;
        gap: 12px;
      }
      .morder-card {
        position: relative;
        background: var(--surface);
        border: 1px solid var(--line);
        border-radius: 20px;
        overflow: hidden;
        text-decoration: none;
        color: var(--fg);
        box-shadow: 0 6px 18px -10px rgba(0,0,0,0.15);
        transition: transform .15s, box-shadow .2s;
      }
      .morder-card:active { transform: scale(0.98); }
      .morder-card.skeleton { pointer-events: none; }
      .morder-card-img {
        position: relative;
        height: 170px;
        display: flex;
        align-items: flex-end;
        justify-content: flex-end;
        padding: 14px;
      }
      .morder-card-tag {
        position: absolute;
        top: 12px; left: 12px;
        display: inline-flex; align-items: center; gap: 4px;
        padding: 4px 10px;
        background: white;
        color: var(--primary);
        border-radius: 999px;
        font-size: 10px;
        font-weight: 800;
        letter-spacing: 0.04em;
        text-transform: uppercase;
        box-shadow: 0 2px 8px rgba(0,0,0,0.2);
      }
      .morder-card-fav {
        position: absolute;
        top: 12px; right: 12px;
        width: 34px; height: 34px;
        border-radius: 50%;
        background: rgba(255,255,255,0.96);
        color: var(--fg);
        border: 0;
        display: grid; place-items: center;
        backdrop-filter: blur(6px);
        box-shadow: 0 2px 8px rgba(0,0,0,0.18);
        cursor: pointer;
        transition: transform .15s;
      }
      .morder-card-fav:active { transform: scale(0.88); }
      .morder-card-fav.active {
        color: var(--primary);
        background: white;
      }
      .morder-card-emoji {
        font-size: 64px;
        line-height: 1;
        opacity: 0.92;
        filter: drop-shadow(0 4px 14px rgba(0,0,0,0.25));
      }
      .morder-card-legend {
        position: absolute;
        bottom: 12px; left: 12px;
        display: inline-flex; align-items: center; gap: 3px;
        padding: 3px 8px;
        background: rgba(0,0,0,0.55);
        backdrop-filter: blur(8px);
        color: #FFD54F;
        border-radius: 999px;
        font-size: 10px;
        font-weight: 800;
        letter-spacing: 0.04em;
      }
      .morder-card-body {
        padding: 14px 16px 16px;
      }
      .morder-card-head {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 8px;
        margin-bottom: 6px;
      }
      .morder-card h3 {
        font-family: Montserrat, sans-serif;
        font-weight: 800;
        font-size: 16px;
        letter-spacing: -0.01em;
        margin: 0;
        color: var(--fg);
        flex: 1;
      }
      .morder-card-rating {
        display: inline-flex;
        align-items: center;
        gap: 3px;
        padding: 3px 8px;
        background: rgba(245, 158, 11, 0.10);
        color: #B45309;
        border-radius: 8px;
        font-size: 12px;
        font-weight: 800;
        flex-shrink: 0;
      }
      .morder-card-rating svg { color: #F59E0B; }
      .morder-card-meta {
        display: flex;
        align-items: center;
        gap: 6px;
        font-size: 12px;
        color: var(--fg-soft);
        font-weight: 600;
        flex-wrap: wrap;
      }
      .morder-dot {
        width: 3px; height: 3px;
        background: var(--fg-soft);
        border-radius: 50%;
        opacity: 0.5;
      }

      .morder-empty {
        text-align: center;
        padding: 48px 24px;
        background: var(--surface);
        border: 1px dashed var(--line);
        border-radius: 20px;
        margin: 12px 0;
      }
      .morder-empty-icon {
        font-size: 48px;
        margin-bottom: 8px;
      }
      .morder-empty h3 {
        font-family: Montserrat;
        font-weight: 800;
        font-size: 17px;
        margin: 0 0 6px;
      }
      .morder-empty p {
        font-size: 13px;
        color: var(--fg-soft);
        margin: 0 0 16px;
      }
      .morder-empty-btn {
        padding: 9px 18px;
        background: var(--primary);
        color: white;
        border: 0;
        border-radius: 12px;
        font-weight: 700;
        font-size: 13px;
        cursor: pointer;
      }

      .morder-err {
        margin: 8px 14px;
        padding: 12px 14px;
        background: rgba(239,68,68,0.06);
        border: 1px solid rgba(239,68,68,0.20);
        border-radius: 12px;
        color: #B91C1C;
        font-size: 13px;
        font-weight: 600;
        display: flex;
        align-items: center;
        gap: 8px;
      }
    `})}function T(){const[i,d]=n.useState(()=>typeof window<"u"&&window.matchMedia("(max-width: 768px)").matches);return n.useEffect(()=>{const l=window.matchMedia("(max-width: 768px)"),t=()=>d(l.matches);return l.addEventListener("change",t),()=>l.removeEventListener("change",t)},[]),i}function q(i){return i==="Hot"||i==="Trending"?"resto-tag hot":"resto-tag"}function J(){const i=T();return I({title:"Browse restaurants",description:"28+ local Ifrane restaurants. Filter by cuisine, sort by fastest delivery, free delivery on first order."}),i?e.jsx(D,{}):e.jsx(H,{})}function H(){const{t:i}=$(),[d]=C(),l=d.get("campus")==="1",[t,f]=n.useState("All"),[o,g]=n.useState(""),[c,b]=n.useState("fastest"),{restaurants:h,loading:p,error:u}=S(),{has:m,toggle:j}=z("restaurant"),x=n.useMemo(()=>{let r=h;if(l&&(r=r.filter(a=>a.is_campus_partner)),t!=="All"&&(r=r.filter(a=>a.cuisine_tags?.includes(t))),o.trim()){const a=o.toLowerCase();r=r.filter(s=>s.name.toLowerCase().includes(a)||s.cuisine.toLowerCase().includes(a))}return r=[...r].sort((a,s)=>c==="rating"?s.rating-a.rating:c==="fee"?a.fee_dh-s.fee_dh:a.time_min-s.time_min),r},[h,l,t,o,c]);return e.jsxs(e.Fragment,{children:[e.jsx("div",{className:"page-hero",children:e.jsx("div",{className:"container",children:e.jsxs(k,{y:10,children:[e.jsxs("div",{className:"section-tag",children:[e.jsx(E,{size:11})," ",l?"AUIER Campus Drop":"Ifrane Delivery"]}),e.jsx("h1",{className:"page-title",children:i("order.title")}),e.jsx("p",{className:"page-sub",children:i("order.sub")}),e.jsxs("div",{style:{marginTop:28,display:"flex",gap:12,flexWrap:"wrap",alignItems:"center"},children:[e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:10,padding:"12px 18px",background:"var(--surface)",border:"1px solid var(--line)",borderRadius:999,minWidth:280,flex:1},children:[e.jsx(y,{size:16,style:{color:"var(--fg-soft)"}}),e.jsx("input",{value:o,onChange:r=>g(r.target.value),placeholder:"Search restaurants, dishes…",style:{flex:1,border:"none",outline:"none",background:"transparent",fontSize:14,color:"var(--fg)",fontFamily:"inherit"}})]}),e.jsxs("select",{value:c,onChange:r=>b(r.target.value),style:{padding:"12px 18px",background:"var(--surface)",border:"1px solid var(--line)",borderRadius:999,fontWeight:600,fontSize:14,color:"var(--fg)",fontFamily:"inherit"},children:[e.jsx("option",{value:"fastest",children:"Fastest delivery"}),e.jsx("option",{value:"rating",children:"Top rated"}),e.jsx("option",{value:"fee",children:"Lowest fee"})]})]})]})})}),e.jsx("section",{className:"bloc",style:{paddingTop:40},children:e.jsxs("div",{className:"container",children:[e.jsx("div",{className:"cuisine-filter",children:F.map(r=>e.jsx("button",{className:`cuisine-chip ${t===r?"active":""}`,onClick:()=>f(r),children:r},r))}),u&&e.jsxs("div",{style:{marginBottom:16,padding:"12px 16px",borderRadius:12,background:"rgba(239,68,68,0.08)",color:"#B91C1C",fontSize:13},children:["Couldn't reach the catalog (",u,"). Pull-to-refresh in a sec."]}),p&&e.jsx("div",{className:"resto-grid",children:Array.from({length:6}).map((r,a)=>e.jsxs("div",{className:"resto-card skeleton",children:[e.jsx("div",{className:"resto-img skeleton-shimmer",style:{height:160}}),e.jsxs("div",{className:"resto-body",children:[e.jsx("div",{className:"skeleton-line",style:{width:"70%"}}),e.jsx("div",{className:"skeleton-line",style:{width:"40%",marginTop:8}})]})]},a))}),!p&&e.jsx("div",{className:"resto-grid",children:x.map((r,a)=>e.jsx(k,{y:16,delay:Math.min(a*.04,.4),children:e.jsxs(v,{to:`/r/${r.slug}`,className:"resto-card",children:[e.jsxs("div",{className:`resto-img alt${r.img_variant}`,children:[r.tag&&e.jsx("span",{className:q(r.tag),children:r.tag}),e.jsx("button",{className:`resto-fav ${m(r.id)?"active":""}`,"aria-label":m(r.id)?"Remove favorite":"Save",onClick:s=>{s.preventDefault(),j(r.id)},children:e.jsx(_,{size:14,filled:m(r.id)})}),e.jsx("span",{style:{position:"absolute",bottom:10,right:14,fontSize:32,opacity:.85},children:r.emoji})]}),e.jsxs("div",{className:"resto-body",children:[e.jsxs("div",{className:"resto-head",children:[e.jsx("div",{className:"resto-name",children:r.name}),e.jsxs("div",{className:"resto-rate",children:[e.jsx(w,{})," ",r.rating]})]}),e.jsx("div",{className:"resto-meta",children:e.jsx("span",{children:r.cuisine})}),e.jsxs("div",{className:"resto-meta",style:{marginTop:4},children:[e.jsxs("span",{children:[e.jsx(M,{size:11,style:{marginInlineEnd:4,verticalAlign:-1}}),r.time_min," ",i("common.minutes")]}),e.jsx("span",{className:"dot"}),e.jsx("span",{style:{color:r.fee_dh===0?"var(--primary)":"inherit"},children:r.fee_dh===0?i("common.delivery"):`${r.fee_dh} dh fee`})]})]})]})},r.id))}),!p&&x.length===0&&e.jsxs("div",{className:"empty-state",children:[e.jsx(y,{size:36}),e.jsx("h3",{children:"No matches in Ifrane"}),e.jsx("p",{children:'Try clearing filters or searching for "Italian" or "Cafés".'})]})]})})]})}export{J as default};
