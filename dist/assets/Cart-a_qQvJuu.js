import{j as e}from"./vendor-motion-B0b037fF.js";import{f as Pe,i as Ae,e as a,L as J}from"./vendor-react-CKEcGPa_.js";import{q as b,o as Me,r as $e,u as We,G as Ie,s as x,A as X,k as qe,e as Oe,M as Re,i as ze,f as De,h as xe,c as F,W as ye,P as Ee,F as Le,v as Ue,B as Ce,T as Ge}from"./index-BEaT_uHE.js";import{F as _e}from"./ScrollReveal-DM92pJ1T.js";import{M as He}from"./Motion-CN15szKf.js";import"./vendor-clerk-CHi-XLZW.js";import"./vendor-supabase-BedW8mzU.js";const Te="pk_live_51S2OXdJz6x94DaUCq9hsGca3FW7oXYIr04eKCMyr0V8alra7QyU2j3umEgR3k2K264suGnBGRflXuQsPXAmVeUOL00SWsN51IV",Be=Te.startsWith("pk_live_"),Ve=Te.startsWith("pk_test_"),H=Be||Ve;Be&&typeof window<"u"&&console.warn("[stripe] LIVE publishable key detected — real cards will be charged. Swap to pk_test_… in .env.local for development.");const me=30,Qe=3;function Ye(){const i=b(t=>t.items),u=b(t=>t.setQty),g=b(t=>t.remove),h=b(t=>t.subtotal()),l=b(t=>t.deliveryFee()),P=b(t=>t.serviceFee()),A=b(t=>t.clear),{user:d}=Me(),{create:c,submitting:V,error:T}=$e(),{addresses:j}=We(),p=Pe(),n=Ie(),[y]=Ae(),je=y.get("cancelled")==="1",[w,I]=a.useState("new"),[_,Z]=a.useState(null),[Q,ue]=a.useState(""),[ee,ke]=a.useState(""),[z,we]=a.useState(null),[ge,B]=a.useState(!1),[M,Y]=a.useState(H?"card":"cash"),[k,re]=a.useState(null),[L,te]=a.useState(0),[R,fe]=a.useState(!1),[C,ve]=a.useState(""),[q,ae]=a.useState(0),[S,se]=a.useState(null),[$,ie]=a.useState(!1);a.useEffect(()=>{if(!d){re(null),te(0);return}Promise.all([x.from("profiles").select("phone").eq("id",d.id).maybeSingle(),x.from("wallets").select("balance_dh").eq("user_id",d.id).maybeSingle()]).then(([{data:t},{data:s}])=>{re(t?.phone??null),te(s?.balance_dh??0)})},[d]),a.useEffect(()=>{if(j.length===0){I("new");return}const t=j.find(s=>s.is_default)??j[0];I("saved"),Z(t)},[j]);const oe=w==="saved"?_?.landmark??_?.label??"":Q,D=w==="saved"?_?.coords??null:z,ne=oe.trim().length>=Qe,U=!!k&&k.length>=8,W=h>=me,O=Math.max(0,h+l+P-q),m=R?Math.min(L,O):0,N=Math.max(0,O-m),de=m>0&&N===0,f=i.length>0&&ne&&!!D&&!V&&U&&W,E=i.reduce((t,s)=>(t[s.restaurantSlug]||(t[s.restaurantSlug]={name:s.restaurantName,slug:s.restaurantSlug,items:[]}),t[s.restaurantSlug].items.push(s),t),{});async function le(){if(!("geolocation"in navigator)){n.error("Geolocation not supported on this device");return}B(!0),navigator.geolocation.getCurrentPosition(t=>{we({lat:t.coords.latitude,lng:t.coords.longitude,accuracyM:t.coords.accuracy}),B(!1),"vibrate"in navigator&&navigator.vibrate?.(10),n.success(`GPS captured · ±${Math.round(t.coords.accuracy)}m`)},t=>{B(!1),n.error(t.code===t.PERMISSION_DENIED?"Location permission denied. Enable it in Settings.":"Could not read your location.")},{enableHighAccuracy:!0,timeout:1e4,maximumAge:6e4})}async function ce(){const t=C.trim().toUpperCase();if(t){ie(!0);try{const{data:s,error:r}=await x.from("promotions").select("code,kind,percent_off,flat_off_dh,min_subtotal_dh,is_active,valid_to,max_redemptions,redemptions").eq("code",t).maybeSingle();if(r||!s){n.error("Invalid promo code");return}const o=s;if(!o.is_active){n.error("This promo is no longer active");return}if(o.valid_to&&new Date(o.valid_to)<new Date){n.error("This promo has expired");return}if(o.max_redemptions&&o.redemptions>=o.max_redemptions){n.error("This promo has reached its limit");return}if(h<o.min_subtotal_dh){n.error(`Add ${o.min_subtotal_dh-h} dh more to use this code`);return}let G=0;o.kind==="percent_off"&&o.percent_off?G=Math.round(h*o.percent_off/100):o.kind==="flat_off"&&o.flat_off_dh?G=o.flat_off_dh:o.kind==="free_delivery"&&(G=l),ae(G),se(t),n.success(`Promo applied · −${G} dh`),"vibrate"in navigator&&navigator.vibrate?.(10)}finally{ie(!1)}}}async function Se(){if(!d){p(`/auth?next=${encodeURIComponent("/cart")}`);return}if(!W){n.warn(`Minimum order ${me} dh — add a bit more.`);return}if(!U){n.warn("Add a phone number in your account before checking out."),p("/account?next=/cart");return}if(!D||!ne){n.warn("Set a landmark and pin your location first.");return}const t=await c({items:i,landmark:oe.trim(),coords:D,deliveryNotes:ee.trim()||void 0,subtotalDh:h,deliveryFeeDh:l,serviceFeeDh:P,totalDh:N});if(!t){n.error(T||"Could not place the order — try again");return}(S||m>0)&&await x.from("orders").update({promotion_code:S,payment_method:m>0&&N===0?"wallet":M}).eq("id",t),m>0&&(await x.from("wallet_transactions").insert({user_id:d.id,order_id:t,kind:"order_payment",amount_dh:-m,note:`Order ${t.slice(0,8).toUpperCase()}`}),await x.from("wallets").update({balance_dh:L-m}).eq("user_id",d.id)),S&&x.rpc("increment_promo_redemption",{promo_code:S}),de?(A(),n.success("Order placed · paid from wallet"),p(`/track/${t}`)):M==="card"&&H?(A(),p(`/checkout/${t}`)):(await x.from("orders").update({payment_method:"cash"}).eq("id",t),A(),n.success("Order placed · pay on delivery"),p(`/track/${t}`))}if(i.length===0)return e.jsxs("div",{className:"mcart-empty",children:[e.jsx("div",{className:"mcart-empty-icon",children:"🛍"}),e.jsx("h2",{children:"Your cart is empty"}),e.jsx("p",{children:"Add a dish you crave and the cart will appear here."}),e.jsxs(J,{to:"/order",className:"mcart-empty-cta",children:["Browse restaurants ",e.jsx(X,{size:14})]}),e.jsx(Fe,{})]});const Ne=V?"Placing order…":d?W?U?D?ne?de?"Place order":M==="card"?`Pay ${N} dh`:`Order · ${N} dh cash`:"Add a landmark":"Capture GPS pin":"Add phone in account →":`Add ${me-h} dh more`:"Sign in to checkout";return e.jsxs("div",{className:"mcart",children:[e.jsxs("header",{className:"mcart-hd",children:[e.jsx("button",{onClick:()=>p(-1),"aria-label":"Back",className:"mcart-back",children:e.jsx(X,{size:16,style:{transform:"rotate(180deg)"}})}),e.jsx("h1",{children:"Your order"}),e.jsx("button",{onClick:()=>{confirm("Clear all items from your cart?")&&A()},className:"mcart-clear",children:"Clear"})]}),je&&e.jsxs("div",{className:"mcart-alert",children:[e.jsx(qe,{size:14})," Payment was cancelled. Try again or pay with cash."]}),Object.values(E).map(t=>e.jsxs("section",{className:"mcart-resto",children:[e.jsxs("div",{className:"mcart-resto-hd",children:[e.jsx("span",{className:"mcart-resto-emoji",children:"🥘"}),e.jsxs(J,{to:`/r/${t.slug}`,className:"mcart-resto-name",children:[t.name," ",e.jsx(X,{size:11,style:{opacity:.5}})]})]}),e.jsx("ul",{className:"mcart-items",children:t.items.map(s=>e.jsxs("li",{className:"mcart-item",children:[e.jsxs("div",{className:"mcart-item-body",children:[e.jsx("div",{className:"mcart-item-name",children:s.name}),e.jsxs("div",{className:"mcart-item-price",children:[s.priceDh," dh"]})]}),e.jsxs("div",{className:"mcart-qty",children:[e.jsx("button",{onClick:()=>{s.qty===1?("vibrate"in navigator&&navigator.vibrate?.(12),g(s.id)):("vibrate"in navigator&&navigator.vibrate?.(6),u(s.id,s.qty-1))},"aria-label":"Remove one",children:s.qty===1?e.jsx(Oe,{size:12}):e.jsx(Re,{size:14})}),e.jsx("span",{children:s.qty}),e.jsx("button",{onClick:()=>{"vibrate"in navigator&&navigator.vibrate?.(6),u(s.id,s.qty+1)},"aria-label":"Add one",children:e.jsx(ze,{size:14})})]})]},s.id))})]},t.slug)),e.jsx(be,{children:"Delivery to"}),j.length>0&&e.jsxs("div",{className:"mcart-mode",children:[e.jsx("button",{className:`mcart-mode-btn ${w==="saved"?"active":""}`,onClick:()=>I("saved"),children:"Saved address"}),e.jsx("button",{className:`mcart-mode-btn ${w==="new"?"active":""}`,onClick:()=>I("new"),children:"New pin"})]}),w==="saved"&&j.length>0?e.jsxs("div",{className:"mcart-card",children:[e.jsx("div",{style:{display:"flex",flexDirection:"column",gap:8},children:j.map(t=>e.jsxs("button",{onClick:()=>Z(t),className:`mcart-addr ${_?.id===t.id?"active":""}`,children:[e.jsx("span",{className:"mcart-addr-icon",children:t.is_campus?e.jsx(De,{size:16}):e.jsx(xe,{size:16})}),e.jsxs("div",{style:{flex:1,textAlign:"left"},children:[e.jsxs("div",{className:"mcart-addr-label",children:[t.label,t.is_default&&e.jsx("span",{className:"mcart-addr-def",children:"DEFAULT"})]}),e.jsx("div",{className:"mcart-addr-line",children:t.line1})]}),_?.id===t.id&&e.jsx(F,{size:16,style:{color:"var(--primary)"}})]},t.id))}),e.jsxs(J,{to:"/addresses",className:"mcart-addr-add",children:[e.jsx(ze,{size:14})," Add new address"]})]}):e.jsxs("div",{className:"mcart-card",children:[e.jsxs("label",{className:"mcart-field",children:[e.jsx("span",{children:"Landmark (required)"}),e.jsx("input",{value:Q,onChange:t=>ue(t.target.value),placeholder:"Near the Grand Mosque, Building 16…",className:"mcart-input"})]}),e.jsxs("label",{className:"mcart-field",children:[e.jsx("span",{children:"Delivery notes (optional)"}),e.jsx("input",{value:ee,onChange:t=>ke(t.target.value),placeholder:"Gate 3, ring at door 2",className:"mcart-input"})]}),e.jsx("button",{onClick:le,disabled:ge,className:"mcart-gps",children:ge?e.jsxs(e.Fragment,{children:[e.jsx("span",{className:"mcart-spinner"})," Getting GPS…"]}):D?e.jsxs(e.Fragment,{children:[e.jsx(F,{size:14})," GPS captured · ±",Math.round(D.accuracyM??0),"m · Re-pin"]}):e.jsxs(e.Fragment,{children:[e.jsx(xe,{size:14})," Drop GPS pin"]})})]}),e.jsx(be,{children:"Promo & wallet"}),e.jsxs("div",{className:"mcart-card",children:[S?e.jsxs("div",{className:"mcart-promo-active",children:[e.jsx(F,{size:14}),e.jsxs("div",{style:{flex:1},children:[e.jsx("strong",{children:S})," applied · −",q," dh"]}),e.jsx("button",{onClick:()=>{se(null),ae(0),ve("")},className:"mcart-promo-remove",children:"Remove"})]}):e.jsxs("div",{className:"mcart-promo",children:[e.jsx("input",{value:C,onChange:t=>ve(t.target.value.toUpperCase()),placeholder:"Promo code",className:"mcart-input"}),e.jsx("button",{onClick:ce,disabled:!C.trim()||$,children:$?"…":"Apply"})]}),d&&L>0&&e.jsxs("button",{onClick:()=>{fe(t=>!t),"vibrate"in navigator&&navigator.vibrate?.(6)},className:`mcart-wallet ${R?"active":""}`,style:{marginTop:10},children:[e.jsx("span",{className:"mcart-wallet-icon",children:e.jsx(ye,{size:15})}),e.jsxs("div",{style:{flex:1,textAlign:"left"},children:[e.jsxs("div",{style:{fontWeight:700,fontSize:13.5},children:["Use wallet credit",R&&m>0?` · −${m} dh`:""]}),e.jsxs("div",{style:{fontSize:11.5,color:"var(--fg-soft)"},children:["Balance: ",L," dh"]})]}),e.jsx("span",{className:"mcart-checkbox",children:R&&e.jsx(F,{size:11})})]})]}),e.jsx(be,{children:"Payment"}),e.jsxs("div",{className:"mcart-card",children:[H&&e.jsxs("button",{type:"button",onClick:()=>Y("card"),className:`mcart-pay ${M==="card"?"active":""}`,children:[e.jsx("span",{className:"mcart-pay-icon",style:{background:"linear-gradient(135deg, #635BFF, #0A2540)"},children:e.jsx(ye,{size:15})}),e.jsxs("div",{style:{flex:1,textAlign:"left"},children:[e.jsx("div",{style:{fontWeight:700,fontSize:13.5},children:"Card / Apple Pay"}),e.jsx("div",{style:{fontSize:11.5,color:"var(--fg-soft)"},children:"Visa, Mastercard, Apple Pay"})]}),M==="card"&&e.jsx(F,{size:16,style:{color:"var(--primary)"}})]}),e.jsxs("button",{type:"button",onClick:()=>Y("cash"),className:`mcart-pay ${M==="cash"?"active":""}`,style:{marginTop:H?8:0},children:[e.jsx("span",{className:"mcart-pay-icon",style:{background:"linear-gradient(135deg, #34D399, #059669)",fontSize:18},children:"💵"}),e.jsxs("div",{style:{flex:1,textAlign:"left"},children:[e.jsx("div",{style:{fontWeight:700,fontSize:13.5},children:"Cash on delivery"}),e.jsx("div",{style:{fontSize:11.5,color:"var(--fg-soft)"},children:"Pay the rider in cash"})]}),M==="cash"&&e.jsx(F,{size:16,style:{color:"var(--primary)"}})]})]}),e.jsx(be,{children:"Summary"}),e.jsxs("div",{className:"mcart-card",children:[e.jsx(he,{label:"Subtotal",value:`${h} dh`}),e.jsx(he,{label:"Delivery",value:`${l} dh`}),e.jsx(he,{label:"Service",value:`${P} dh`}),q>0&&e.jsx(he,{label:`Promo · ${S}`,value:`−${q} dh`,color:"#059669"}),m>0&&e.jsx(he,{label:"Wallet credit",value:`−${m} dh`,color:"#4F46E5"}),e.jsxs("div",{className:"mcart-total",children:[e.jsx("span",{children:"Total"}),e.jsxs("span",{children:[N," dh"]})]})]}),!W&&e.jsxs("div",{className:"mcart-warn",children:["Minimum order ",me," dh — add ",me-h," dh more."]}),d&&!U&&e.jsxs("div",{className:"mcart-warn",children:[e.jsx(Ee,{size:13})," ",e.jsx("strong",{children:"Add a phone in account"})," so your rider can reach you."]}),e.jsx("div",{style:{height:100}}),e.jsx("div",{className:"mcart-cta-wrap",children:e.jsxs("button",{onClick:Se,disabled:!f&&!!d,className:"mcart-cta",style:{opacity:f||!d?1:.6},children:[Ne,f&&e.jsx(X,{size:14})]})}),e.jsx(Fe,{})]})}function be({children:i}){return e.jsx("div",{className:"mcart-section-hd",children:i})}function he({label:i,value:u,color:g}){return e.jsxs("div",{className:"mcart-row",style:{color:g??void 0},children:[e.jsx("span",{children:i}),e.jsx("span",{style:{fontVariantNumeric:"tabular-nums",fontWeight:g?700:600},children:u})]})}function Fe(){return e.jsx("style",{children:`
      .mcart {
        padding-top: var(--safe-top);
        background: var(--bg);
        min-height: 100vh;
      }
      .mcart-hd {
        position: sticky;
        top: var(--safe-top);
        z-index: 20;
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 12px 14px;
        background: color-mix(in srgb, var(--bg) 92%, transparent);
        -webkit-backdrop-filter: blur(20px) saturate(180%);
        backdrop-filter: blur(20px) saturate(180%);
        border-bottom: 0.5px solid var(--line);
      }
      .mcart-hd h1 {
        flex: 1;
        font-family: Montserrat, sans-serif;
        font-weight: 800;
        font-size: 17px;
        margin: 0;
        text-align: center;
        color: var(--fg);
      }
      .mcart-back, .mcart-clear {
        background: var(--surface);
        border: 1px solid var(--line);
        color: var(--fg);
        cursor: pointer;
        border-radius: 50%;
        width: 36px; height: 36px;
        display: grid; place-items: center;
        transition: transform .15s;
      }
      .mcart-clear {
        width: auto; height: 32px; border-radius: 999px;
        padding: 0 12px;
        font-size: 12px; font-weight: 700;
        color: var(--fg-soft);
      }
      .mcart-back:active, .mcart-clear:active { transform: scale(0.9); }

      .mcart-alert {
        margin: 12px 14px 0;
        padding: 12px 14px;
        background: rgba(239,68,68,0.06);
        border: 1px solid rgba(239,68,68,0.20);
        border-radius: 12px;
        font-size: 13px; font-weight: 600;
        color: #B91C1C;
        display: flex; align-items: center; gap: 8px;
      }

      .mcart-section-hd {
        padding: 22px 18px 8px;
        font-size: 11px;
        font-weight: 800;
        text-transform: uppercase;
        letter-spacing: 0.08em;
        color: var(--fg-soft);
      }

      .mcart-resto {
        margin: 14px 14px 0;
        background: var(--surface);
        border: 1px solid var(--line);
        border-radius: 18px;
        overflow: hidden;
      }
      .mcart-resto-hd {
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 14px 16px;
        border-bottom: 1px solid var(--line);
      }
      .mcart-resto-emoji {
        font-size: 20px;
        width: 32px; height: 32px;
        background: rgba(255,87,34,0.08);
        border-radius: 10px;
        display: grid; place-items: center;
      }
      .mcart-resto-name {
        font-family: Montserrat, sans-serif;
        font-weight: 800;
        font-size: 14px;
        color: var(--fg);
        text-decoration: none;
        display: inline-flex;
        align-items: center;
        gap: 4px;
      }
      .mcart-items { list-style: none; margin: 0; padding: 0; }
      .mcart-item {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 12px 16px;
        border-top: 1px solid var(--line);
      }
      .mcart-item:first-child { border-top: 0; }
      .mcart-item-body { flex: 1; min-width: 0; }
      .mcart-item-name {
        font-weight: 700;
        font-size: 14px;
        color: var(--fg);
        margin-bottom: 2px;
      }
      .mcart-item-price {
        font-size: 12px;
        color: var(--primary);
        font-weight: 700;
      }
      .mcart-qty {
        display: flex;
        align-items: center;
        gap: 4px;
        background: var(--bg);
        border-radius: 999px;
        padding: 3px;
        border: 1px solid var(--line);
      }
      .mcart-qty button {
        width: 30px; height: 30px;
        border-radius: 50%;
        background: var(--surface);
        color: var(--fg);
        border: 0;
        display: grid; place-items: center;
        cursor: pointer;
        transition: transform .15s, background .15s;
      }
      .mcart-qty button:hover { background: var(--primary); color: white; }
      .mcart-qty button:active { transform: scale(0.85); }
      .mcart-qty span {
        min-width: 18px;
        text-align: center;
        font-weight: 800;
        font-size: 14px;
        font-variant-numeric: tabular-nums;
      }

      .mcart-mode {
        display: flex;
        gap: 8px;
        padding: 0 14px;
        margin-bottom: 10px;
      }
      .mcart-mode-btn {
        flex: 1;
        padding: 10px;
        background: var(--surface);
        border: 1.5px solid var(--line);
        border-radius: 12px;
        font-weight: 700;
        font-size: 13px;
        color: var(--fg);
        cursor: pointer;
        transition: all .2s;
      }
      .mcart-mode-btn.active {
        background: var(--primary);
        color: white;
        border-color: var(--primary);
      }

      .mcart-card {
        margin: 0 14px;
        padding: 14px;
        background: var(--surface);
        border: 1px solid var(--line);
        border-radius: 18px;
      }
      .mcart-card + .mcart-card { margin-top: 12px; }

      .mcart-addr {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 12px;
        background: var(--bg);
        border: 1.5px solid var(--line);
        border-radius: 14px;
        cursor: pointer;
        transition: all .2s;
        width: 100%;
      }
      .mcart-addr.active {
        border-color: var(--primary);
        background: rgba(255,87,34,0.04);
      }
      .mcart-addr-icon {
        width: 36px; height: 36px;
        border-radius: 10px;
        background: rgba(255,87,34,0.08);
        color: var(--primary);
        display: grid; place-items: center;
        flex-shrink: 0;
      }
      .mcart-addr-label {
        font-weight: 700;
        font-size: 14px;
        color: var(--fg);
        display: flex;
        align-items: center;
        gap: 6px;
      }
      .mcart-addr-def {
        font-size: 9px;
        font-weight: 800;
        padding: 2px 6px;
        background: rgba(255,87,34,0.10);
        color: var(--primary);
        border-radius: 999px;
        letter-spacing: 0.04em;
      }
      .mcart-addr-line {
        font-size: 12px;
        color: var(--fg-soft);
        margin-top: 2px;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .mcart-addr-add {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 6px;
        padding: 12px;
        margin-top: 10px;
        background: transparent;
        border: 1.5px dashed var(--line);
        border-radius: 12px;
        color: var(--primary);
        font-weight: 700;
        font-size: 13px;
        text-decoration: none;
      }
      .mcart-field {
        display: block;
        margin-bottom: 12px;
      }
      .mcart-field span {
        display: block;
        font-size: 11.5px;
        font-weight: 700;
        color: var(--fg-soft);
        letter-spacing: 0.04em;
        text-transform: uppercase;
        margin-bottom: 6px;
      }
      .mcart-input {
        width: 100%;
        padding: 12px 14px;
        background: var(--bg);
        border: 1.5px solid var(--line);
        border-radius: 12px;
        font-size: 15px !important;
        color: var(--fg);
        font-family: inherit;
        outline: none;
        transition: border-color .2s, box-shadow .2s;
      }
      .mcart-input:focus {
        border-color: var(--primary);
        box-shadow: 0 0 0 3px rgba(255,87,34,0.10);
      }
      .mcart-gps {
        width: 100%;
        padding: 13px;
        background: linear-gradient(135deg, var(--primary), #FF8A65);
        color: white;
        border: 0;
        border-radius: 12px;
        font-weight: 700;
        font-size: 13.5px;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        box-shadow: 0 6px 14px rgba(255,87,34,0.30);
        transition: transform .15s;
      }
      .mcart-gps:active { transform: scale(0.98); }
      .mcart-gps:disabled { opacity: 0.6; }
      .mcart-spinner {
        width: 14px; height: 14px;
        border: 2px solid currentColor;
        border-top-color: transparent;
        border-radius: 50%;
        animation: spin .8s linear infinite;
      }
      @keyframes spin { to { transform: rotate(360deg); } }

      .mcart-promo {
        display: flex;
        gap: 8px;
      }
      .mcart-promo button {
        padding: 0 18px;
        background: var(--ink);
        color: white;
        border: 0;
        border-radius: 12px;
        font-weight: 700;
        font-size: 13px;
        cursor: pointer;
        transition: transform .15s;
      }
      .mcart-promo button:active { transform: scale(0.94); }
      .mcart-promo button:disabled { opacity: 0.5; }
      .mcart-promo-active {
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 12px 14px;
        background: rgba(5,150,105,0.08);
        border: 1px solid rgba(5,150,105,0.24);
        border-radius: 12px;
        color: #059669;
        font-size: 13px;
        font-weight: 600;
      }
      .mcart-promo-remove {
        background: transparent;
        border: 0;
        color: var(--fg-soft);
        font-weight: 700;
        font-size: 12px;
        cursor: pointer;
      }

      .mcart-wallet {
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 12px 14px;
        background: var(--bg);
        border: 1.5px solid var(--line);
        border-radius: 12px;
        cursor: pointer;
        width: 100%;
        transition: all .2s;
      }
      .mcart-wallet.active {
        background: rgba(99,91,255,0.06);
        border-color: #635BFF;
      }
      .mcart-wallet-icon {
        width: 32px; height: 32px;
        border-radius: 9px;
        background: linear-gradient(135deg, #635BFF, #8E85FF);
        color: white;
        display: grid; place-items: center;
        flex-shrink: 0;
      }
      .mcart-checkbox {
        width: 20px; height: 20px;
        border-radius: 6px;
        border: 2px solid var(--line);
        display: grid; place-items: center;
        color: white;
        flex-shrink: 0;
      }
      .mcart-wallet.active .mcart-checkbox {
        background: #635BFF;
        border-color: #635BFF;
      }

      .mcart-pay {
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 12px 14px;
        background: var(--bg);
        border: 1.5px solid var(--line);
        border-radius: 12px;
        cursor: pointer;
        width: 100%;
        transition: all .2s;
      }
      .mcart-pay.active {
        background: rgba(255,87,34,0.04);
        border-color: var(--primary);
      }
      .mcart-pay-icon {
        width: 32px; height: 32px;
        border-radius: 9px;
        color: white;
        display: grid; place-items: center;
        flex-shrink: 0;
      }

      .mcart-row {
        display: flex;
        justify-content: space-between;
        padding: 6px 0;
        font-size: 13.5px;
        color: var(--fg-soft);
      }
      .mcart-total {
        display: flex;
        justify-content: space-between;
        padding-top: 12px;
        margin-top: 6px;
        border-top: 1px solid var(--line);
        font-family: Montserrat, sans-serif;
        font-weight: 800;
        font-size: 18px;
        color: var(--fg);
      }
      .mcart-total span:last-child {
        color: var(--primary);
        font-variant-numeric: tabular-nums;
      }

      .mcart-warn {
        margin: 12px 14px 0;
        padding: 12px 14px;
        background: rgba(245,158,11,0.08);
        border: 1px solid rgba(245,158,11,0.20);
        border-radius: 12px;
        font-size: 13px;
        color: #B45309;
        font-weight: 600;
        display: flex;
        align-items: center;
        gap: 8px;
      }

      .mcart-cta-wrap {
        position: fixed;
        left: 14px; right: 14px;
        bottom: calc(var(--tabbar-h) + var(--safe-bot) + 12px);
        z-index: 40;
      }
      .mcart-cta {
        width: 100%;
        padding: 16px;
        background: linear-gradient(135deg, var(--primary), #FF8A65);
        color: white;
        border: 0;
        border-radius: 18px;
        font-family: Montserrat, sans-serif;
        font-weight: 800;
        font-size: 15px;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        box-shadow: 0 14px 32px -8px rgba(255,87,34,0.55);
        transition: transform .15s;
      }
      .mcart-cta:active { transform: scale(0.98); }
      .mcart-cta:disabled { cursor: not-allowed; }

      /* Empty state */
      .mcart-empty {
        padding-top: var(--safe-top);
        background: var(--bg);
        min-height: 100vh;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        text-align: center;
        padding-left: 24px;
        padding-right: 24px;
      }
      .mcart-empty-icon {
        font-size: 72px;
        margin-bottom: 16px;
      }
      .mcart-empty h2 {
        font-family: Montserrat, sans-serif;
        font-weight: 800;
        font-size: 24px;
        margin: 0 0 8px;
      }
      .mcart-empty p {
        color: var(--fg-soft);
        margin: 0 0 28px;
      }
      .mcart-empty-cta {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        padding: 14px 24px;
        background: linear-gradient(135deg, var(--primary), #FF8A65);
        color: white;
        border-radius: 14px;
        font-weight: 800;
        font-size: 14.5px;
        text-decoration: none;
        box-shadow: 0 10px 24px -6px rgba(255,87,34,0.5);
        transition: transform .15s;
      }
      .mcart-empty-cta:active { transform: scale(0.96); }
    `})}function Ke(){const[i,u]=a.useState(()=>typeof window<"u"&&window.matchMedia("(max-width: 768px)").matches);return a.useEffect(()=>{const g=window.matchMedia("(max-width: 768px)"),h=()=>u(g.matches);return g.addEventListener("change",h),()=>g.removeEventListener("change",h)},[]),i}const Xe=3,K=30,Je=["AUI Dorm 16","AUI Main Gate","AUI Student Center","Near the Grand Mosque","Next to the AUI gate","Near the Michlifen pharmacy"];function dr(){const i=Ke();return Le({title:"Cart",noindex:!0}),i?e.jsx(Ye,{}):e.jsx(Ze,{})}function Ze(){const{t:i}=Ue(),u=b(r=>r.items),g=b(r=>r.setQty),h=b(r=>r.remove),l=b(r=>r.subtotal()),P=b(r=>r.deliveryFee()),A=b(r=>r.serviceFee());b(r=>r.total());const d=b(r=>r.clear),{user:c}=Me(),{create:V,submitting:T,error:j}=$e(),{addresses:p}=We(),n=Pe(),y=Ie(),[je]=Ae(),[w,I]=a.useState("new"),[_,Z]=a.useState(null),[Q,ue]=a.useState(""),[ee,ke]=a.useState(""),[z,we]=a.useState(null),[ge,B]=a.useState("idle"),[M,Y]=a.useState(null),[k,re]=a.useState(H?"card":"cash"),[L,te]=a.useState(null),[R,fe]=a.useState(0),[C,ve]=a.useState(!1),[q,ae]=a.useState(""),[S,se]=a.useState(0),[$,ie]=a.useState(null),[oe,D]=a.useState(!1),ne=je.get("cancelled")==="1";a.useEffect(()=>{if(!c){te(null),fe(0);return}Promise.all([x.from("profiles").select("phone").eq("id",c.id).maybeSingle(),x.from("wallets").select("balance_dh").eq("user_id",c.id).maybeSingle()]).then(([{data:r},{data:o}])=>{te(r?.phone??null),fe(o?.balance_dh??0)})},[c]),a.useEffect(()=>{if(p.length===0){I("new");return}const r=p.find(o=>o.is_default)??p[0];I("saved"),Z(r)},[p]);const U=w==="saved"?_?.landmark??_?.label??"":Q,W=w==="saved"?_?.coords??null:z,O=U.trim().length>=Xe,m=!!L&&L.length>=8,N=l>=K,de=Math.max(0,l+P+A-S),f=C?Math.min(R,de):0,E=Math.max(0,de-f),le=f>0&&E===0,ce=u.length>0&&O&&!!W&&!T&&m&&N;async function Se(){if(!("geolocation"in navigator)){B("error"),Y("Geolocation not supported.");return}B("requesting"),Y(null),navigator.geolocation.getCurrentPosition(r=>{we({lat:r.coords.latitude,lng:r.coords.longitude,accuracyM:r.coords.accuracy}),B("idle")},r=>{B(r.code===r.PERMISSION_DENIED?"denied":"error"),Y(r.message||"Could not read your location.")},{enableHighAccuracy:!0,timeout:1e4,maximumAge:6e4})}async function Ne(){const r=q.trim().toUpperCase();if(r){D(!0);try{const{data:o,error:G}=await x.from("promotions").select("code,kind,percent_off,flat_off_dh,min_subtotal_dh,is_active,valid_to,max_redemptions,redemptions").eq("code",r).maybeSingle();if(G||!o){y.error("Invalid promo code");return}const v=o;if(!v.is_active){y.error("This promo code is no longer active");return}if(v.valid_to&&new Date(v.valid_to)<new Date){y.error("This promo code has expired");return}if(v.max_redemptions&&v.redemptions>=v.max_redemptions){y.error("This promo code has reached its limit");return}if(l<v.min_subtotal_dh){y.error(`Add ${v.min_subtotal_dh-l} dh more to use this code`);return}let pe=0;v.kind==="percent_off"&&v.percent_off?pe=Math.round(l*v.percent_off/100):v.kind==="flat_off"&&v.flat_off_dh?pe=v.flat_off_dh:v.kind==="free_delivery"&&(pe=P),se(pe),ie(r),y.success(`Promo applied: -${pe} dh`)}finally{D(!1)}}}function t(){se(0),ie(null),ae("")}async function s(){if(!c){n(`/auth?next=${encodeURIComponent("/cart")}`);return}if(!N){y.warn(`Minimum order is ${K} dh — add a bit more.`);return}if(!m){y.warn("Add a phone number in your account before checking out."),n("/account?next=/cart");return}if(!W||!O){y.warn("Set a landmark and pin your location first.");return}const r=await V({items:u,landmark:U.trim(),coords:W,deliveryNotes:ee.trim()||void 0,subtotalDh:l,deliveryFeeDh:P,serviceFeeDh:A,totalDh:E});if(!r){y.error(j||"Could not place the order — try again");return}($||f>0)&&await x.from("orders").update({promotion_code:$,payment_method:f>0&&E===0?"wallet":k}).eq("id",r),f>0&&(await x.from("wallet_transactions").insert({user_id:c.id,order_id:r,kind:"order_payment",amount_dh:-f,note:`Order ${r.slice(0,8).toUpperCase()}`}),await x.from("wallets").update({balance_dh:R-f}).eq("user_id",c.id)),$&&x.rpc("increment_promo_redemption",{promo_code:$}),le?(d(),y.success("Order placed · paid from wallet"),n(`/track/${r}`)):k==="card"&&H?(d(),n(`/checkout/${r}`)):(await x.from("orders").update({payment_method:"cash"}).eq("id",r),d(),y.success("Order placed · pay on delivery"),n(`/track/${r}`))}return e.jsxs("section",{className:"page",children:[e.jsxs("div",{className:"container",children:[e.jsxs(_e,{y:12,children:[e.jsxs("div",{className:"section-tag",children:[e.jsx(Ce,{size:11})," Your order"]}),e.jsx("h1",{className:"page-title",children:i("cart.title")})]}),u.length===0?e.jsxs("div",{className:"empty-state",style:{marginTop:32},children:[e.jsx(Ce,{size:36}),e.jsx("h3",{children:i("cart.empty.title")}),e.jsx("p",{children:i("cart.empty.sub")}),e.jsxs(J,{to:"/order",className:"btn btn-primary",style:{marginTop:16},children:[i("cart.browse")," ",e.jsx(X,{})]})]}):e.jsxs("div",{className:"cart-grid",style:{marginTop:24},children:[e.jsxs("div",{children:[e.jsx(_e,{y:10,children:e.jsx("div",{className:"cart-list",children:u.map(r=>e.jsxs("div",{className:"cart-item",children:[e.jsx("div",{className:"cart-thumb"}),e.jsxs("div",{children:[e.jsx("div",{className:"cart-name",children:r.name}),e.jsxs("div",{className:"cart-meta",children:[r.restaurantName," · ",r.priceDh," dh"]})]}),e.jsxs("div",{className:"qty",children:[e.jsx("button",{onClick:()=>g(r.id,r.qty-1),"aria-label":"Decrease",children:e.jsx(Re,{size:14})}),e.jsx("span",{className:"n",children:r.qty}),e.jsx("button",{onClick:()=>g(r.id,r.qty+1),"aria-label":"Increase",children:e.jsx(ze,{size:14})})]}),e.jsxs("div",{className:"cart-price",children:[r.priceDh*r.qty," dh",e.jsx("button",{onClick:()=>h(r.id),style:{display:"block",marginTop:4,color:"var(--fg-soft)",fontSize:11},"aria-label":"Remove",children:e.jsx(Ge,{size:14})})]})]},r.id))})}),e.jsx(_e,{y:10,delay:.05,children:e.jsxs("div",{style:{marginTop:24,background:"var(--surface)",border:"1px solid var(--line)",borderRadius:"var(--r-lg)",padding:"22px 24px"},children:[e.jsxs("div",{className:"section-tag",style:{marginBottom:6},children:[e.jsx(xe,{size:11})," Where exactly?"]}),e.jsx("h3",{style:{fontFamily:"Montserrat",fontWeight:800,fontSize:22,margin:"4px 0 14px"},children:"Drop landmark"}),p.length>0&&e.jsxs("div",{className:"auth-toggle",style:{marginBottom:18},children:[e.jsxs("button",{className:w==="saved"?"active":"",onClick:()=>I("saved"),children:["Saved (",p.length,")"]}),e.jsx("button",{className:w==="new"?"active":"",onClick:()=>I("new"),children:"New address"})]}),w==="saved"&&p.length>0&&e.jsxs("div",{style:{display:"grid",gap:8,marginBottom:12},children:[p.map(r=>e.jsxs("button",{onClick:()=>Z(r),className:`address-picker ${_?.id===r.id?"active":""}`,children:[e.jsx("div",{className:"address-picker-icon",children:r.is_campus?e.jsx(De,{size:16}):e.jsx(xe,{size:16})}),e.jsxs("div",{style:{flex:1,textAlign:"start",minWidth:0},children:[e.jsx("div",{style:{fontWeight:700,fontSize:14},children:r.label}),e.jsxs("div",{style:{fontSize:12,color:"var(--fg-soft)"},children:[r.line1,r.building?` · ${r.building}`:"",r.room?` · Rm ${r.room}`:""]})]}),_?.id===r.id&&e.jsx(F,{size:14,style:{color:"var(--primary)"}})]},r.id)),e.jsx(J,{to:"/addresses",style:{fontSize:12,color:"var(--primary)",fontWeight:600},children:"Manage addresses →"})]}),w==="new"&&e.jsxs(e.Fragment,{children:[e.jsxs("div",{className:"field",children:[e.jsx("label",{htmlFor:"landmark",children:"Landmark · required"}),e.jsx("input",{id:"landmark",value:Q,onChange:r=>ue(r.target.value),placeholder:'e.g. "Near the Grand Mosque"',"aria-invalid":!O&&Q.length>0}),e.jsx("div",{style:{display:"flex",gap:6,flexWrap:"wrap",marginTop:8},children:Je.map(r=>e.jsx("button",{type:"button",onClick:()=>ue(r),style:{padding:"6px 10px",border:"1px solid var(--line)",borderRadius:999,fontSize:12,background:"var(--surface)",color:"var(--fg-soft)",cursor:"pointer"},children:r},r))})]}),e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:14,padding:14,borderRadius:16,background:"#FFF1EB",marginTop:4},children:[e.jsx("div",{style:{width:36,height:36,borderRadius:999,background:"var(--primary)",color:"white",display:"grid",placeItems:"center"},children:e.jsx(xe,{size:16})}),e.jsxs("div",{style:{flex:1,minWidth:0},children:[e.jsx("div",{style:{fontSize:11,fontWeight:700,letterSpacing:"0.1em",textTransform:"uppercase",color:"var(--fg-soft)"},children:"GPS pin"}),e.jsx("div",{style:{fontWeight:700,fontSize:14,color:"var(--fg)"},children:z?`${z.lat.toFixed(5)}, ${z.lng.toFixed(5)}`:ge==="requesting"?"Reading…":"Tap to capture"}),z?.accuracyM!=null&&e.jsxs("div",{style:{fontSize:11,color:"var(--fg-soft)",marginTop:2},children:["±",Math.round(z.accuracyM)," m"]})]}),e.jsx("button",{onClick:Se,style:{padding:"8px 14px",borderRadius:999,background:z?"transparent":"var(--primary)",color:z?"var(--fg-soft)":"white",fontSize:13,fontWeight:700,border:"none",cursor:"pointer"},children:z?"Update":"Capture"})]}),M&&e.jsx("div",{style:{fontSize:12,color:"#EF4444",marginTop:8},children:M})]}),e.jsxs("div",{className:"field",style:{marginTop:18},children:[e.jsx("label",{htmlFor:"notes",children:"Driver notes · optional"}),e.jsx("textarea",{id:"notes",rows:2,value:ee,onChange:r=>ke(r.target.value),placeholder:"Gate code, floor, anything else"})]})]})})]}),e.jsxs("div",{className:"cart-summary",children:[e.jsx("h3",{children:"Order summary"}),ne&&e.jsx("div",{style:{background:"rgba(239,68,68,0.08)",border:"1px solid rgba(239,68,68,0.2)",borderRadius:12,padding:"10px 12px",fontSize:12,color:"#EF4444",marginBottom:14,lineHeight:1.45,fontWeight:600},children:"Payment was cancelled. You can try again or pay with cash."}),e.jsxs("div",{className:"sum-row",children:[e.jsx("span",{children:i("cart.subtotal")}),e.jsxs("span",{children:[l," dh"]})]}),e.jsxs("div",{className:"sum-row",children:[e.jsx("span",{children:i("cart.delivery")}),e.jsxs("span",{children:[P," dh"]})]}),e.jsxs("div",{className:"sum-row",children:[e.jsx("span",{children:i("cart.service")}),e.jsxs("span",{children:[A," dh"]})]}),S>0&&e.jsxs("div",{className:"sum-row",style:{color:"#059669",fontWeight:600},children:[e.jsxs("span",{children:["Promo · ",$]}),e.jsxs("span",{children:["−",S," dh"]})]}),f>0&&e.jsxs("div",{className:"sum-row",style:{color:"#4F46E5",fontWeight:600},children:[e.jsx("span",{children:"Wallet credit"}),e.jsxs("span",{children:["−",f," dh"]})]}),e.jsxs("div",{className:"sum-row total",children:[e.jsx("span",{children:i("cart.total")}),e.jsxs("span",{children:[E," dh"]})]}),!N&&e.jsxs("div",{style:{margin:"14px 0 4px",padding:"10px 12px",background:"rgba(245,158,11,0.08)",border:"1px solid rgba(245,158,11,0.20)",borderRadius:12,fontSize:12,color:"#B45309",lineHeight:1.45,fontWeight:600},children:["Minimum order is ",K," dh — add ",K-l," dh more to checkout."]}),c&&!m&&e.jsxs("div",{style:{margin:"14px 0 4px",padding:"12px 14px",background:"rgba(245,158,11,0.08)",border:"1px solid rgba(245,158,11,0.20)",borderRadius:12,fontSize:13,color:"#B45309",lineHeight:1.45,display:"flex",alignItems:"center",gap:10},children:[e.jsx(Ee,{size:16,style:{flexShrink:0}}),e.jsxs("div",{style:{flex:1},children:[e.jsx("strong",{children:"Add a phone number"})," so your rider can reach you."," ",e.jsx(J,{to:"/account?next=/cart",style:{color:"var(--primary)",fontWeight:700},children:"Add now"})]})]}),e.jsxs("div",{style:{margin:"18px 0 8px"},children:[e.jsx("div",{style:{fontSize:11,fontWeight:700,letterSpacing:"0.1em",textTransform:"uppercase",color:"var(--fg-soft)",marginBottom:8},children:"Promo code"}),$?e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:10,padding:"10px 14px",background:"rgba(5,150,105,0.08)",border:"1px solid rgba(5,150,105,0.24)",borderRadius:12},children:[e.jsx(F,{size:14,style:{color:"#059669"}}),e.jsxs("div",{style:{flex:1,fontSize:13,fontWeight:700,color:"#059669"},children:[$," applied · −",S," dh"]}),e.jsx("button",{type:"button",onClick:t,style:{background:"none",border:0,cursor:"pointer",color:"var(--fg-soft)",fontSize:12,fontWeight:600},children:"Remove"})]}):e.jsxs("div",{style:{display:"flex",gap:8},children:[e.jsx("input",{value:q,onChange:r=>ae(r.target.value.toUpperCase()),placeholder:"WELCOME50",style:{flex:1,padding:"10px 14px",background:"var(--surface)",border:"1px solid var(--line)",borderRadius:12,fontSize:13,fontFamily:"inherit",textTransform:"uppercase",letterSpacing:"0.06em"}}),e.jsx("button",{type:"button",onClick:Ne,disabled:!q.trim()||oe,className:"btn btn-outline",style:{padding:"0 16px",fontSize:13},children:oe?"…":"Apply"})]})]}),c&&R>0&&e.jsxs("button",{type:"button",onClick:()=>ve(r=>!r),style:{width:"100%",display:"flex",alignItems:"center",gap:12,padding:"12px 14px",background:C?"rgba(99,91,255,0.08)":"var(--surface)",border:`2px solid ${C?"#635BFF":"var(--line)"}`,borderRadius:14,cursor:"pointer",textAlign:"left",marginTop:8,transition:"all .2s"},children:[e.jsx("div",{style:{width:36,height:36,borderRadius:10,background:"linear-gradient(135deg, #635BFF, #8E85FF)",display:"grid",placeItems:"center",color:"white",flexShrink:0},children:e.jsx(ye,{size:16})}),e.jsxs("div",{style:{flex:1},children:[e.jsxs("div",{style:{fontWeight:700,fontSize:14},children:["Use wallet credit",C&&f>0?` · −${f} dh`:""]}),e.jsxs("div",{style:{fontSize:11,color:"var(--fg-soft)"},children:["Balance: ",R," dh"]})]}),e.jsx("div",{style:{width:22,height:22,borderRadius:6,border:`2px solid ${C?"#635BFF":"var(--line)"}`,background:C?"#635BFF":"transparent",display:"grid",placeItems:"center",color:"white",flexShrink:0},children:C&&e.jsx(F,{size:12})})]}),e.jsxs("div",{style:{margin:"18px 0 8px"},children:[e.jsx("div",{style:{fontSize:11,fontWeight:700,letterSpacing:"0.1em",textTransform:"uppercase",color:"var(--fg-soft)",marginBottom:8},children:"Pay with"}),e.jsxs("div",{style:{display:"grid",gap:8},children:[H&&e.jsxs("button",{type:"button",onClick:()=>re("card"),style:{display:"flex",alignItems:"center",gap:12,padding:"12px 14px",borderRadius:14,border:`2px solid ${k==="card"?"var(--primary)":"var(--line)"}`,background:k==="card"?"rgba(255,87,34,0.06)":"var(--surface)",cursor:"pointer",textAlign:"left",width:"100%",transition:"all .2s"},children:[e.jsx("div",{style:{width:36,height:36,borderRadius:10,background:"linear-gradient(135deg, #635BFF, #0A2540)",display:"grid",placeItems:"center",color:"white",flexShrink:0},children:e.jsx(ye,{size:16})}),e.jsxs("div",{style:{flex:1},children:[e.jsx("div",{style:{fontWeight:700,fontSize:14},children:"Card / Apple Pay"}),e.jsx("div",{style:{fontSize:11,color:"var(--fg-soft)"},children:"Visa, Mastercard, Apple Pay"})]}),k==="card"&&e.jsx(F,{size:16,style:{color:"var(--primary)"}})]}),e.jsxs("button",{type:"button",onClick:()=>re("cash"),style:{display:"flex",alignItems:"center",gap:12,padding:"12px 14px",borderRadius:14,border:`2px solid ${k==="cash"?"var(--primary)":"var(--line)"}`,background:k==="cash"?"rgba(255,87,34,0.06)":"var(--surface)",cursor:"pointer",textAlign:"left",width:"100%",transition:"all .2s"},children:[e.jsx("div",{style:{width:36,height:36,borderRadius:10,background:"linear-gradient(135deg, #34D399, #059669)",display:"grid",placeItems:"center",color:"white",flexShrink:0,fontSize:18},children:"💵"}),e.jsxs("div",{style:{flex:1},children:[e.jsx("div",{style:{fontWeight:700,fontSize:14},children:"Cash on delivery"}),e.jsx("div",{style:{fontSize:11,color:"var(--fg-soft)"},children:"Pay the rider when it arrives"})]}),k==="cash"&&e.jsx(F,{size:16,style:{color:"var(--primary)"}})]})]})]}),!c&&e.jsx("div",{style:{background:"rgba(255,87,34,0.08)",border:"1px dashed rgba(255,87,34,0.3)",borderRadius:12,padding:"10px 12px",fontSize:12,color:"var(--fg-soft)",margin:"14px 0 8px",lineHeight:1.45},children:"You'll be asked to sign in or create an account before checkout."}),j&&e.jsx("div",{style:{color:"#EF4444",fontSize:12,marginTop:12},children:j}),e.jsxs(He,{className:"btn btn-primary btn-lg btn-block",style:{marginTop:18,opacity:ce?1:.6},onClick:s,disabled:!ce&&!!c,children:[T?"Placing order…":c?N?m?W?O?le?"Place order · paid from wallet":k==="card"?`Pay ${E} dh`:`Order · ${E} dh (cash)`:"Add a landmark":"Capture GPS first":"Add phone in account":`Add ${K-l} dh more`:"Sign in to checkout"," ",e.jsx(X,{})]}),e.jsx("p",{style:{fontSize:12,color:"var(--fg-soft)",textAlign:"center",marginTop:14,lineHeight:1.4},children:"Main gate → dorms 20 dh · Restaurant → main gate 35 dh."})]})]})]}),u.length>0&&e.jsx(er,{submitting:T,canSubmit:ce,finalTotal:E,fullyCoveredByWallet:le,subtotalOk:N,phoneOk:m,effectiveCoords:W,landmarkOk:O,subtotal:l,payMethod:k,user:c,onClick:s})]})}function er({submitting:i,canSubmit:u,finalTotal:g,fullyCoveredByWallet:h,subtotalOk:l,phoneOk:P,effectiveCoords:A,landmarkOk:d,subtotal:c,payMethod:V,user:T,onClick:j}){a.useEffect(()=>(document.body.classList.add("has-sticky-cta"),()=>document.body.classList.remove("has-sticky-cta")),[]);const p=i?"Placing order…":T?l?P?A?d?h?"Place order · wallet":V==="card"?`Pay ${g} dh`:`Order · ${g} dh`:"Add a landmark":"Capture GPS first":"Add phone in account":`Add ${K-c} dh more`:"Sign in to checkout";return e.jsxs("div",{className:"sticky-action-bar",children:[e.jsxs("div",{style:{flex:1,minWidth:0},children:[e.jsx("div",{style:{fontSize:11,fontWeight:700,letterSpacing:"0.08em",textTransform:"uppercase",color:"var(--fg-soft)"},children:"Total"}),e.jsxs("div",{style:{fontFamily:"Montserrat",fontWeight:900,fontSize:20,color:"var(--primary)",fontVariantNumeric:"tabular-nums",lineHeight:1.1},children:[g," dh"]})]}),e.jsx("button",{onClick:j,disabled:!u&&!!T,className:"btn btn-primary",style:{flex:"0 0 auto",padding:"14px 22px",fontSize:14,fontWeight:700,opacity:u?1:.6,minHeight:50,borderRadius:14},children:p})]})}export{dr as default};
