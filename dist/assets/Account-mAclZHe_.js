import{j as e}from"./vendor-motion-B0b037fF.js";import{f as I,e as o,L}from"./vendor-react-CKEcGPa_.js";import{o as W,E as q,w as O,G as U,s as M,A as F,U as G,P as $,R as H,a as X,H as Y,L as V,h as Q,W as J,l as K,b as Z,k as ee}from"./index-BEaT_uHE.js";import{F as C}from"./ScrollReveal-DM92pJ1T.js";import{M as _}from"./Motion-CN15szKf.js";import"./vendor-clerk-CHi-XLZW.js";import"./vendor-supabase-BedW8mzU.js";const se={submitted:{label:"Submitted",color:"#4F46E5",bg:"rgba(99,91,255,0.10)"},reviewing:{label:"In review",color:"#B45309",bg:"rgba(245,158,11,0.10)"},approved:{label:"Approved",color:"#059669",bg:"rgba(5,150,105,0.10)"},rejected:{label:"Not approved",color:"#B91C1C",bg:"rgba(239,68,68,0.10)"},needs_info:{label:"Needs info",color:"#B45309",bg:"rgba(245,158,11,0.10)"}};function ie(a){const s=a.replace(/[^\d+]/g,"");return/^(\+\d{8,15}|0\d{9})$/.test(s)}function re(){const{user:a,signOut:s}=W(),{isRider:n,isMerchant:r,isAdmin:c}=q(),{apps:j}=O(),x=I(),u=U(),[h,f]=o.useState(""),[d,b]=o.useState(""),[B,l]=o.useState(""),[N,k]=o.useState(!1),[S,z]=o.useState(!1),[A,P]=o.useState(!1);o.useEffect(()=>{a&&M.from("profiles").select("display_name,phone").eq("id",a.id).maybeSingle().then(({data:t})=>{const p=t;f(p?.display_name??""),b(p?.phone??""),l(p?.phone??"")})},[a]);async function v(){if(!a)return;if(d.trim()&&!ie(d.trim())){u.error("Please enter a valid phone (e.g. +212612345678)");return}k(!0);const{error:t}=await M.from("profiles").update({display_name:h.trim()||null,phone:d.trim()||null}).eq("id",a.id);k(!1),t?u.error(t.message):(u.success("Saved"),l(d.trim()),z(!1),P(!1))}if(!a)return null;const E=(h||a.email||"A").charAt(0).toUpperCase(),R=!B;return e.jsxs("div",{className:"macc",children:[e.jsxs("header",{className:"macc-hd",children:[e.jsx("div",{className:"macc-avatar",children:E}),e.jsx("h1",{className:"macc-name",children:h||a.email?.split("@")[0]}),e.jsx("p",{className:"macc-email",children:a.email}),(c||n||r)&&e.jsxs("div",{className:"macc-roles",children:[c&&e.jsx("span",{className:"macc-role admin",children:"⚡ Admin"}),n&&e.jsx("span",{className:"macc-role rider",children:"🏍 Rider"}),r&&e.jsx("span",{className:"macc-role merchant",children:"🏪 Merchant"})]})]}),R&&e.jsxs("button",{onClick:()=>P(!0),className:"macc-nudge",children:[e.jsx("div",{className:"macc-nudge-icon",children:"📞"}),e.jsxs("div",{style:{flex:1,textAlign:"left"},children:[e.jsx("div",{className:"macc-nudge-title",children:"Add a phone number"}),e.jsx("div",{className:"macc-nudge-sub",children:"Required so your rider can reach you for delivery"})]}),e.jsx(F,{size:14})]}),e.jsx(y,{children:"Profile"}),e.jsxs(w,{children:[e.jsx(D,{icon:e.jsx(G,{size:16}),label:"Display name",value:h||"—",editing:S,onEdit:()=>z(!0),renderInput:()=>e.jsx("input",{autoFocus:!0,value:h,onChange:t=>f(t.target.value),placeholder:"Yasmine",className:"macc-input"})}),e.jsx(D,{icon:e.jsx($,{size:16}),label:"Phone",value:d||"Not set",editing:A,onEdit:()=>P(!0),danger:R,renderInput:()=>e.jsx("input",{autoFocus:!0,type:"tel",value:d,onChange:t=>b(t.target.value),placeholder:"+212 6 12 34 56 78",className:"macc-input"})}),(S||A)&&e.jsx("button",{onClick:v,disabled:N,className:"macc-save-btn",children:N?"Saving…":"Save"})]}),e.jsx(y,{children:"Activity"}),e.jsxs(w,{children:[e.jsx(m,{to:"/orders",icon:e.jsx(H,{size:16}),label:"Order history",emojiBg:"#FF8A65"}),e.jsx(m,{to:"/track",icon:e.jsx(X,{size:16}),label:"Track active order",emojiBg:"#635BFF"}),e.jsx(m,{to:"/favorites",icon:e.jsx(Y,{size:16}),label:"Favorites",emojiBg:"#EC4899"}),e.jsx(m,{to:"/notifications",icon:e.jsx(V,{size:16}),label:"Notifications",emojiBg:"#F59E0B"})]}),e.jsx(y,{children:"Preferences"}),e.jsxs(w,{children:[e.jsx(m,{to:"/addresses",icon:e.jsx(Q,{size:16}),label:"Delivery addresses",emojiBg:"#34D399"}),e.jsx(m,{to:"/wallet",icon:e.jsx(J,{size:16}),label:"Wallet",emojiBg:"#7C3AED"}),e.jsx(m,{to:"/prime",icon:e.jsx(K,{size:16}),label:"AtlaasGo Prime",emojiBg:"#FF5722",badge:"Save 47 dh/wk"})]}),(n||r||c)&&e.jsxs(e.Fragment,{children:[e.jsx(y,{children:"Work"}),e.jsxs(w,{children:[(n||c)&&e.jsx(m,{to:"/rider",icon:e.jsx(X,{size:16}),label:"Rider dashboard",emojiBg:"#635BFF"}),(r||c)&&e.jsx(m,{to:"/merchant",icon:e.jsx(Z,{size:16}),label:"Restaurant POS",emojiBg:"#059669"}),c&&e.jsx(m,{to:"/admin",icon:e.jsx(ee,{size:16}),label:"Admin panel",emojiBg:"#1A1410"})]})]}),j.length>0&&e.jsxs(e.Fragment,{children:[e.jsx(y,{children:"Applications"}),e.jsx(w,{children:j.map(t=>{const p=se[t.status];return e.jsxs("div",{className:"macc-row macc-row-app",children:[e.jsx("span",{className:"macc-row-icon",style:{background:p.bg,color:p.color},children:t.kind==="rider"?"🏍":"🏪"}),e.jsxs("div",{style:{flex:1,minWidth:0},children:[e.jsx("div",{className:"macc-row-label",children:t.kind==="rider"?"Rider application":"Partner application"}),e.jsx("div",{className:"macc-row-sub",children:new Date(t.created_at).toLocaleDateString([],{month:"short",day:"numeric",year:"numeric"})})]}),e.jsx("span",{className:"macc-pill",style:{background:p.bg,color:p.color},children:p.label})]},t.id)})})]}),e.jsx(y,{children:"About"}),e.jsxs(w,{children:[e.jsxs("a",{href:"mailto:support@atlaasgo.com",className:"macc-row",style:{textDecoration:"none"},children:[e.jsx("span",{className:"macc-row-icon",style:{background:"rgba(99,91,255,0.10)",color:"#4F46E5"},children:"✉"}),e.jsx("span",{className:"macc-row-label",style:{flex:1},children:"Help & support"}),e.jsx(F,{size:14,style:{color:"var(--fg-soft)"}})]}),e.jsxs("a",{href:"https://atlaasgo.com/terms",target:"_blank",rel:"noopener noreferrer",className:"macc-row",style:{textDecoration:"none"},children:[e.jsx("span",{className:"macc-row-icon",style:{background:"rgba(0,0,0,0.06)",color:"var(--fg-soft)"},children:"§"}),e.jsx("span",{className:"macc-row-label",style:{flex:1},children:"Terms & privacy"}),e.jsx(F,{size:14,style:{color:"var(--fg-soft)"}})]})]}),e.jsxs("div",{style:{padding:"20px 14px 32px"},children:[e.jsx("button",{onClick:async()=>{await s(),u.info("Signed out"),x("/")},className:"macc-signout",children:"Sign out"}),e.jsx("div",{className:"macc-build",children:"AtlaasGo · v3.0 · Built in Ifrane 🏔"})]}),e.jsx(ne,{})]})}function y({children:a}){return e.jsx("div",{className:"macc-section-title",children:a})}function w({children:a}){return e.jsx("div",{className:"macc-group",children:a})}function m({to:a,icon:s,label:n,emojiBg:r,badge:c}){return e.jsxs(L,{to:a,className:"macc-row",children:[e.jsx("span",{className:"macc-row-icon",style:{background:`${r}1A`,color:r},children:s}),e.jsx("span",{className:"macc-row-label",children:n}),c&&e.jsx("span",{className:"macc-row-badge",children:c}),e.jsx(F,{size:14,style:{color:"var(--fg-soft)"}})]})}function D({icon:a,label:s,value:n,editing:r,onEdit:c,renderInput:j,danger:x}){return e.jsxs("div",{className:"macc-row",style:{flexDirection:r?"column":"row",alignItems:r?"stretch":"center"},children:[e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:12,width:"100%"},children:[e.jsx("span",{className:"macc-row-icon",style:{background:x?"rgba(245,158,11,0.10)":"rgba(0,0,0,0.04)",color:x?"#B45309":"var(--fg-soft)"},children:a}),e.jsxs("div",{style:{flex:1,minWidth:0},children:[e.jsx("div",{className:"macc-row-sub",style:{marginBottom:r?4:2,fontSize:11},children:s}),!r&&e.jsx("div",{className:"macc-row-label",style:{color:x?"#B45309":"var(--fg)"},children:n})]}),!r&&e.jsx("button",{onClick:c,className:"macc-edit-btn",children:"Edit"})]}),r&&e.jsx("div",{style:{marginTop:8,marginLeft:48},children:j()})]})}function ne(){return e.jsx("style",{children:`
      .macc {
        padding-top: var(--safe-top);
        background: var(--bg);
        min-height: 100vh;
      }
      .macc-hd {
        text-align: center;
        padding: 32px 20px 24px;
      }
      .macc-avatar {
        width: 84px; height: 84px;
        margin: 0 auto 14px;
        border-radius: 50%;
        background: linear-gradient(135deg, #FF5722, #FF8A65);
        color: white;
        font-family: Montserrat, sans-serif;
        font-weight: 900;
        font-size: 36px;
        display: grid; place-items: center;
        box-shadow: 0 12px 32px -8px rgba(255,87,34,0.5);
        letter-spacing: -0.02em;
      }
      .macc-name {
        font-family: Montserrat, sans-serif;
        font-weight: 900;
        font-size: 22px;
        margin: 0 0 4px;
        letter-spacing: -0.02em;
        color: var(--fg);
      }
      .macc-email {
        font-size: 13px;
        color: var(--fg-soft);
        margin: 0;
      }
      .macc-roles {
        display: flex; gap: 6px; justify-content: center; margin-top: 12px;
        flex-wrap: wrap;
      }
      .macc-role {
        font-size: 10px;
        font-weight: 800;
        padding: 4px 10px;
        border-radius: 999px;
        letter-spacing: 0.04em;
      }
      .macc-role.admin    { background: rgba(0,0,0,0.06); color: var(--fg); }
      .macc-role.rider    { background: rgba(99,91,255,0.10); color: #4F46E5; }
      .macc-role.merchant { background: rgba(5,150,105,0.10); color: #059669; }

      .macc-nudge {
        margin: 0 14px 20px;
        display: flex; align-items: center; gap: 12px;
        padding: 14px 16px;
        background: linear-gradient(135deg, rgba(245,158,11,0.10), rgba(245,158,11,0.06));
        border: 1px solid rgba(245,158,11,0.24);
        border-radius: 16px;
        color: var(--fg);
        cursor: pointer;
        width: calc(100% - 28px);
      }
      .macc-nudge-icon {
        font-size: 24px;
      }
      .macc-nudge-title {
        font-weight: 800;
        font-size: 14px;
      }
      .macc-nudge-sub {
        font-size: 12px;
        color: var(--fg-soft);
        margin-top: 1px;
      }

      .macc-section-title {
        padding: 22px 18px 10px;
        font-size: 11px;
        font-weight: 800;
        text-transform: uppercase;
        letter-spacing: 0.08em;
        color: var(--fg-soft);
      }
      .macc-group {
        margin: 0 14px;
        background: var(--surface);
        border: 1px solid var(--line);
        border-radius: 18px;
        overflow: hidden;
      }
      .macc-row {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 14px 16px;
        text-decoration: none;
        color: var(--fg);
        border-top: 1px solid var(--line);
        cursor: pointer;
        transition: background .15s;
      }
      .macc-row:first-child { border-top: 0; }
      .macc-row:active { background: rgba(0,0,0,0.03); }
      .macc-row-icon {
        width: 36px; height: 36px;
        border-radius: 10px;
        display: grid; place-items: center;
        flex-shrink: 0;
        font-size: 18px;
      }
      .macc-row-icon svg { width: 16px; height: 16px; }
      .macc-row-label {
        font-weight: 600;
        font-size: 14.5px;
        color: var(--fg);
      }
      .macc-row-sub {
        font-size: 11.5px;
        color: var(--fg-soft);
        font-weight: 500;
      }
      .macc-row-badge {
        font-size: 10px;
        font-weight: 800;
        padding: 3px 9px;
        background: linear-gradient(135deg, #FF5722, #FF8A65);
        color: white;
        border-radius: 999px;
        margin-right: 6px;
      }
      .macc-row-app .macc-row-icon { font-size: 18px; }
      .macc-pill {
        font-size: 10.5px;
        font-weight: 800;
        padding: 4px 10px;
        border-radius: 999px;
        flex-shrink: 0;
        letter-spacing: 0.04em;
        text-transform: uppercase;
      }
      .macc-edit-btn {
        background: transparent;
        border: 0;
        color: var(--primary);
        font-weight: 700;
        font-size: 13px;
        padding: 4px 8px;
        cursor: pointer;
      }
      .macc-input {
        width: 100%;
        padding: 11px 14px;
        background: var(--bg);
        border: 1.5px solid var(--primary);
        border-radius: 10px;
        color: var(--fg);
        font-size: 15px !important;
        font-family: inherit;
        outline: none;
      }
      .macc-save-btn {
        display: block;
        width: calc(100% - 32px);
        margin: 12px 16px;
        padding: 12px;
        background: var(--primary);
        color: white;
        border: 0;
        border-radius: 12px;
        font-weight: 800;
        font-size: 14px;
        cursor: pointer;
      }
      .macc-signout {
        width: 100%;
        padding: 14px;
        background: var(--surface);
        border: 1px solid var(--line);
        border-radius: 14px;
        color: #B91C1C;
        font-weight: 700;
        font-size: 14px;
        cursor: pointer;
        transition: background .15s;
      }
      .macc-signout:active {
        background: rgba(239,68,68,0.06);
      }
      .macc-build {
        text-align: center;
        margin-top: 22px;
        font-size: 11px;
        color: var(--fg-soft);
        opacity: 0.7;
      }
    `})}function te(){const[a,s]=o.useState(()=>typeof window<"u"&&window.matchMedia("(max-width: 768px)").matches);return o.useEffect(()=>{const n=window.matchMedia("(max-width: 768px)"),r=()=>s(n.matches);return n.addEventListener("change",r),()=>n.removeEventListener("change",r)},[]),a}const oe={submitted:{label:"Submitted",color:"#4F46E5",bg:"rgba(99,91,255,0.10)"},reviewing:{label:"In review",color:"#B45309",bg:"rgba(245,158,11,0.10)"},approved:{label:"Approved",color:"#059669",bg:"rgba(5,150,105,0.10)"},rejected:{label:"Not approved",color:"#B91C1C",bg:"rgba(239,68,68,0.10)"},needs_info:{label:"Needs info",color:"#B45309",bg:"rgba(245,158,11,0.10)"}};function T(a){const s=a.replace(/[^\d+]/g,"");return/^(\+\d{8,15}|0\d{9})$/.test(s)}function he(){const a=te(),{user:s,loading:n,signOut:r}=W(),{isRider:c,isMerchant:j,isAdmin:x}=q(),{apps:u,loading:h}=O(),f=I(),d=U();if(o.useEffect(()=>{!n&&!s&&!a&&f("/auth?next=/account",{replace:!0})},[n,s,f,a]),a&&s)return e.jsx(re,{});if(a&&!s&&!n)return f("/auth?next=/account",{replace:!0}),null;const[b,B]=o.useState(""),[l,N]=o.useState(""),[k,S]=o.useState(""),[z,A]=o.useState(!1);o.useEffect(()=>{s&&M.from("profiles").select("display_name,phone").eq("id",s.id).maybeSingle().then(({data:i})=>{const g=i;B(g?.display_name??""),N(g?.phone??""),S(g?.phone??"")})},[s]);async function P(){if(!s)return;if(l.trim()&&!T(l.trim())){d.error("Please enter a valid phone number (e.g. +212612345678)");return}A(!0);const{error:i}=await M.from("profiles").update({display_name:b.trim()||null,phone:l.trim()||null}).eq("id",s.id);A(!1),i?d.error(i.message):(d.success("Profile saved"),S(l.trim()))}const v=[{to:"/orders",icon:e.jsx(H,{size:16}),label:"Order history"},{to:"/favorites",icon:e.jsx(Y,{size:16}),label:"Favorites"},{to:"/addresses",icon:e.jsx(Q,{size:16}),label:"Saved addresses"},{to:"/wallet",icon:e.jsx(J,{size:16}),label:"Wallet"},{to:"/prime",icon:e.jsx(K,{size:16}),label:"AtlaasGo Prime"},{to:"/notifications",icon:e.jsx(V,{size:16}),label:"Notifications"}];(c||x)&&v.push({to:"/rider",icon:e.jsx(X,{size:16}),label:"Rider dashboard"}),(j||x)&&v.push({to:"/merchant",icon:e.jsx(Z,{size:16}),label:"Restaurant POS"}),x&&v.push({to:"/admin",icon:e.jsx(ee,{size:16}),label:"Admin panel"});const E=!k,R=l.trim()!==k,t=b.trim()!=="",p=(R||t)&&!z;return e.jsx("section",{className:"page",children:e.jsxs("div",{className:"container",children:[e.jsxs(C,{y:12,children:[e.jsxs("div",{className:"section-tag",children:[e.jsx(G,{size:11})," Account"]}),e.jsx("h1",{className:"page-title",children:b||s?.email||"Your account"}),e.jsxs("p",{className:"page-sub",children:["Signed in as ",e.jsx("strong",{children:s?.email})]})]}),E&&!h&&e.jsxs("div",{style:{marginTop:18,background:"rgba(245,158,11,0.10)",border:"1px solid rgba(245,158,11,0.30)",borderRadius:14,padding:"14px 18px",display:"flex",alignItems:"center",gap:12},children:[e.jsx("div",{style:{width:32,height:32,borderRadius:10,background:"rgba(245,158,11,0.15)",color:"#B45309",display:"grid",placeItems:"center",flexShrink:0},children:e.jsx($,{size:16})}),e.jsxs("div",{style:{flex:1,fontSize:13,lineHeight:1.45},children:[e.jsx("strong",{children:"Add a phone number"})," so your rider can reach you with orders. Required for cash-on-delivery."]})]}),e.jsxs("div",{className:"account-grid",style:{marginTop:24},children:[e.jsx(C,{y:14,children:e.jsxs("div",{className:"account-card",children:[e.jsx("h3",{children:"Profile"}),e.jsxs("div",{className:"field",children:[e.jsx("label",{children:"Display name"}),e.jsx("input",{value:b,onChange:i=>B(i.target.value),placeholder:"Yasmine El Idrissi"})]}),e.jsxs("div",{className:"field",children:[e.jsxs("label",{children:["Phone ",E&&e.jsx("span",{style:{color:"#B45309",fontWeight:700},children:"· required for orders"})]}),e.jsx("input",{type:"tel",value:l,onChange:i=>N(i.target.value),placeholder:"+212 6 12 34 56 78","aria-invalid":!!l&&!T(l)}),l&&!T(l)&&e.jsx("div",{style:{fontSize:11,color:"#B91C1C",marginTop:4},children:"Format: +212XXXXXXXXX or 06XXXXXXXX"})]}),e.jsx(_,{onClick:P,disabled:!p,className:"btn btn-primary",children:z?"Saving…":"Save changes"})]})}),e.jsx(C,{y:14,delay:.05,children:e.jsxs("div",{className:"account-card",children:[e.jsx("h3",{children:"Quick access"}),e.jsx("div",{className:"account-links",children:v.map(i=>e.jsxs(L,{to:i.to,className:"account-link",children:[i.icon,e.jsx("span",{children:i.label}),e.jsx(F,{size:14})]},i.to))}),e.jsx(_,{onClick:async()=>{await r(),d.info("Signed out"),f("/")},className:"btn btn-outline btn-block",style:{marginTop:16},children:"Sign out"})]})})]}),!h&&u.length>0&&e.jsx(C,{y:14,children:e.jsxs("div",{style:{marginTop:32},children:[e.jsx("h3",{style:{fontFamily:"Montserrat",fontWeight:800,fontSize:18,margin:"0 0 14px"},children:"Applications"}),e.jsx("div",{style:{display:"grid",gap:10},children:u.map(i=>{const g=oe[i.status],ae=new Date(i.created_at);return e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:14,padding:"14px 18px",background:"var(--surface)",border:"1px solid var(--line)",borderRadius:14},children:[e.jsx("div",{style:{width:40,height:40,borderRadius:12,background:g.bg,color:g.color,display:"grid",placeItems:"center",fontSize:20,flexShrink:0},children:i.kind==="rider"?"🏍":"🏪"}),e.jsxs("div",{style:{flex:1,minWidth:0},children:[e.jsx("div",{style:{fontWeight:700,fontSize:14},children:i.kind==="rider"?"Rider application":"Partner application"}),e.jsxs("div",{style:{fontSize:12,color:"var(--fg-soft)",marginTop:2},children:["Submitted"," ",ae.toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"})]}),i.reviewer_notes&&e.jsxs("div",{style:{marginTop:6,fontSize:12,color:"var(--fg)",background:"rgba(0,0,0,0.04)",padding:"6px 10px",borderRadius:8},children:[e.jsx("strong",{children:"Reviewer note:"})," ",i.reviewer_notes]})]}),e.jsx("span",{style:{background:g.bg,color:g.color,padding:"4px 12px",borderRadius:999,fontSize:11,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.06em",flexShrink:0},children:g.label})]},i.id)})})]})})]})})}export{he as default};
