import { useState, useEffect, useRef, useCallback } from "react";

// ─── STORAGE HELPERS ────────────────────────────────────────────────────────
const db = {
  async get(key) {
    try { const r = await window.storage.get(key, true); return r ? JSON.parse(r.value) : null; }
    catch { return null; }
  },
  async set(key, val) {
    try { await window.storage.set(key, JSON.stringify(val), true); return true; }
    catch { return false; }
  },
};

// ─── ANTHROPIC AI ────────────────────────────────────────────────────────────
async function askAI(systemPrompt, userMessage) {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1000,
      system: systemPrompt,
      messages: [{ role: "user", content: userMessage }],
    }),
  });
  const data = await res.json();
  return data.content?.map(b => b.text || "").join("") || "No response.";
}

// ─── CONSTANTS ───────────────────────────────────────────────────────────────
const CAFES = ["Cafe 1", "Cafe 2", "Cafe 3", "Back of Cafe"];
const HOSTELS = ["Joseph Hall","Daniel Hall","Mary Hall","Esther Hall","Peter Hall","Deborah Hall"];
const PAYMENT_METHODS = [
  { id: "wallet", label: "LMU Wallet", icon: "💳", desc: "Pay from your campus e-wallet" },
  { id: "transfer", label: "Bank Transfer", icon: "🏦", desc: "Transfer to cafe account" },
  { id: "cash", label: "Cash on Delivery", icon: "💵", desc: "Pay when food arrives" },
];
const INITIAL_MENU = {
  "Cafe 1": [
    { id: 1, name: "Jollof Rice + Chicken", price: 1200, time: 15, img: "🍛", tag: "Bestseller", available: true },
    { id: 2, name: "Fried Rice + Fish", price: 1100, time: 12, img: "🍚", tag: "Popular", available: true },
    { id: 3, name: "Amala + Ewedu", price: 900, time: 10, img: "🥣", tag: "", available: true },
    { id: 4, name: "Egusi Soup + Pounded Yam", price: 1300, time: 20, img: "🥘", tag: "Chef's Pick", available: false },
  ],
  "Cafe 2": [
    { id: 5, name: "Spaghetti + Sauce", price: 800, time: 10, img: "🍝", tag: "Budget Pick", available: true },
    { id: 6, name: "Noodles + Egg", price: 600, time: 8, img: "🍜", tag: "Fast", available: true },
    { id: 7, name: "Ofada Rice + Stew", price: 1400, time: 18, img: "🍱", tag: "Premium", available: true },
    { id: 8, name: "Plantain + Beans", price: 700, time: 12, img: "🫘", tag: "", available: true },
  ],
  "Cafe 3": [
    { id: 9, name: "Burger + Fries", price: 1500, time: 15, img: "🍔", tag: "Trending", available: true },
    { id: 10, name: "Shawarma", price: 1200, time: 10, img: "🌯", tag: "Hot", available: true },
    { id: 11, name: "Meat Pie + Juice", price: 600, time: 5, img: "🥧", tag: "Snack", available: true },
    { id: 12, name: "Chicken Wings", price: 1800, time: 20, img: "🍗", tag: "Premium", available: false },
  ],
  "Back of Cafe": [
    { id: 13, name: "Suya + Yam", price: 1000, time: 12, img: "🥩", tag: "Evening Fav", available: true },
    { id: 14, name: "Corn + Pear", price: 400, time: 5, img: "🌽", tag: "Light", available: true },
    { id: 15, name: "Bole + Fish", price: 900, time: 15, img: "🐟", tag: "Classic", available: true },
    { id: 16, name: "Roasted Plantain", price: 500, time: 8, img: "🍌", tag: "", available: true },
  ],
};

// ─── MINI COMPONENTS ─────────────────────────────────────────────────────────
const Stars = ({ v, set, sz = 18 }) => (
  <div style={{ display: "flex", gap: 3 }}>
    {[1,2,3,4,5].map(s => (
      <span key={s} onClick={() => set?.(s)}
        style={{ fontSize: sz, cursor: set ? "pointer" : "default", color: s <= v ? "#F59E0B" : "#374151", transition: "color .15s" }}>★</span>
    ))}
  </div>
);
const Chip = ({ label, color = "#16A34A" }) => (
  <span style={{ fontSize: 10, fontWeight: 700, background: color+"22", color, border:`1px solid ${color}55`, borderRadius: 20, padding: "2px 8px", letterSpacing:.4 }}>{label}</span>
);
const StatusChip = ({ s }) => {
  const m = { Preparing:"#F59E0B", "On the Way":"#3B82F6", Delivered:"#16A34A", Pending:"#F59E0B", "In Review":"#3B82F6", Resolved:"#16A34A" };
  return <Chip label={s} color={m[s]||"#6B7280"} />;
};
const Spinner = () => (
  <div style={{ display:"inline-block", width:16, height:16, border:"2px solid rgba(255,255,255,0.3)", borderTopColor:"white", borderRadius:"50%", animation:"spin 0.7s linear infinite" }} />
);
const Pulse = ({ color="#F59E0B" }) => (
  <span style={{ display:"inline-block", width:8, height:8, borderRadius:"50%", background:color, animation:"pulse 1.5s ease-in-out infinite", marginRight:6 }} />
);

// ─── MAIN APP ─────────────────────────────────────────────────────────────────
export default function App() {
  const [role, setRole] = useState(null);
  const [loading, setLoading] = useState(false);

  // Global shared state loaded from storage
  const [orders, setOrders] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [complaints, setComplaints] = useState([]);
  const [menu, setMenu] = useState(INITIAL_MENU);
  const [dbReady, setDbReady] = useState(false);

  // Bootstrap: load all data from storage
  useEffect(() => {
    (async () => {
      const [o, r, c, m] = await Promise.all([
        db.get("lmu-orders"), db.get("lmu-reviews"),
        db.get("lmu-complaints"), db.get("lmu-menu"),
      ]);
      if (o) setOrders(o);
      if (r) setReviews(r);
      if (c) setComplaints(c);
      if (m) setMenu(m);
      setDbReady(true);
    })();
  }, []);

  const saveOrders = useCallback(async (data) => { setOrders(data); await db.set("lmu-orders", data); }, []);
  const saveReviews = useCallback(async (data) => { setReviews(data); await db.set("lmu-reviews", data); }, []);
  const saveComplaints = useCallback(async (data) => { setComplaints(data); await db.set("lmu-complaints", data); }, []);
  const saveMenu = useCallback(async (data) => { setMenu(data); await db.set("lmu-menu", data); }, []);

  const sharedProps = { orders, reviews, complaints, menu, saveOrders, saveReviews, saveComplaints, saveMenu };

  if (!dbReady) return (
    <div style={{ minHeight:"100vh", background:"#0A2E1C", display:"flex", alignItems:"center", justifyContent:"center", flexDirection:"column", gap:16, fontFamily:"Georgia,serif" }}>
      <div style={{ fontSize:48 }}>🍛</div>
      <div style={{ color:"#F59E0B", fontWeight:700, letterSpacing:2 }}>Loading Campus Chop Hub…</div>
      <Spinner />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}} @keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}} @keyframes fadeIn{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:none}} @keyframes slideIn{from{opacity:0;transform:translateX(-16px)}to{opacity:1;transform:none}}`}</style>
    </div>
  );

  return (
    <>
      <style>{`
        *{box-sizing:border-box;margin:0;padding:0}
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}
        @keyframes fadeIn{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:none}}
        @keyframes slideUp{from{opacity:0;transform:translateY(30px)}to{opacity:1;transform:none}}
        @keyframes glow{0%,100%{box-shadow:0 0 20px rgba(245,158,11,0.3)}50%{box-shadow:0 0 40px rgba(245,158,11,0.6)}}
        .anim{animation:fadeIn .4s ease both}
        .card-hover{transition:transform .2s,box-shadow .2s}
        .card-hover:hover{transform:translateY(-4px);box-shadow:0 12px 40px rgba(0,0,0,0.18)!important}
        input:focus,select:focus,textarea:focus{outline:none;border-color:#F59E0B!important}
        ::-webkit-scrollbar{width:6px;height:6px}
        ::-webkit-scrollbar-track{background:transparent}
        ::-webkit-scrollbar-thumb{background:rgba(255,255,255,0.15);border-radius:3px}
      `}</style>

      {!role && <Landing onSelect={setRole} />}
      {role === "student" && <StudentApp {...sharedProps} onExit={() => setRole(null)} />}
      {role === "vendor"  && <VendorApp  {...sharedProps} onExit={() => setRole(null)} />}
      {role === "admin"   && <AdminApp   {...sharedProps} onExit={() => setRole(null)} />}
    </>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// LANDING
// ═══════════════════════════════════════════════════════════════════════════════
function Landing({ onSelect }) {
  return (
    <div style={{ minHeight:"100vh", background:"linear-gradient(160deg,#041A0D 0%,#0A2E1C 55%,#061A10 100%)", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", fontFamily:"Georgia,serif", padding:24, position:"relative", overflow:"hidden" }}>
      {/* Animated rings */}
      {[1,2,3,4].map(i => (
        <div key={i} style={{ position:"absolute", borderRadius:"50%", border:"1px solid rgba(245,158,11,0.06)", width:200+i*180, height:200+i*180, top:"50%", left:"50%", transform:"translate(-50%,-50%)", animation:`pulse ${2+i}s ease-in-out infinite` }} />
      ))}
      <div style={{ position:"relative", textAlign:"center", maxWidth:560, animation:"slideUp .8s ease both" }}>
        <div style={{ marginBottom:12, display:"flex", alignItems:"center", justifyContent:"center", gap:10 }}>
          <div style={{ width:52, height:52, borderRadius:16, background:"linear-gradient(135deg,#F59E0B,#D97706)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:28, boxShadow:"0 8px 30px rgba(245,158,11,0.4)" }}>🍛</div>
        </div>
        <div style={{ fontSize:11, letterSpacing:6, color:"#F59E0B99", fontFamily:"monospace", textTransform:"uppercase", marginBottom:10 }}>Landmark University · Omu-Aran</div>
        <h1 style={{ fontSize:"clamp(40px,9vw,72px)", fontWeight:900, color:"#FEFCE8", lineHeight:1.05, marginBottom:10, textShadow:"0 4px 40px rgba(0,0,0,0.6)" }}>
          Campus<br /><span style={{ color:"#F59E0B", fontStyle:"italic" }}>Chop</span> Hub
        </h1>
        <p style={{ color:"rgba(255,255,255,0.5)", fontSize:16, marginBottom:44, lineHeight:1.7 }}>
          Order from your hostel. Skip the queue.<br />4 cafeterias · Real-time tracking · AI-powered
        </p>
        <div style={{ display:"flex", gap:14, justifyContent:"center", flexWrap:"wrap", marginBottom:36 }}>
          {[
            { role:"student", icon:"🎓", label:"Student", desc:"Order food & track delivery", bg:"#F59E0B", fg:"#0A2E1C" },
            { role:"vendor",  icon:"🍽️", label:"Vendor",  desc:"Manage orders & menu",       bg:"transparent", fg:"#F59E0B", border:"2px solid #F59E0B44" },
            { role:"admin",   icon:"🛡️", label:"Admin",   desc:"Full platform oversight",     bg:"transparent", fg:"#38BDF8", border:"2px solid #38BDF844" },
          ].map(btn => (
            <button key={btn.role} onClick={() => onSelect(btn.role)} style={{ background:btn.bg||"transparent", color:btn.fg, border:btn.border||"none", borderRadius:16, padding:"18px 28px", cursor:"pointer", fontFamily:"Georgia,serif", textAlign:"left", minWidth:160, transition:"all .25s", boxShadow:btn.role==="student"?"0 8px 30px rgba(245,158,11,0.35)":"none" }}
              onMouseEnter={e => { e.currentTarget.style.transform="scale(1.04)"; }}
              onMouseLeave={e => { e.currentTarget.style.transform="scale(1)"; }}>
              <div style={{ fontSize:28, marginBottom:6 }}>{btn.icon}</div>
              <div style={{ fontWeight:900, fontSize:17, letterSpacing:.3, marginBottom:3 }}>{btn.label}</div>
              <div style={{ fontSize:12, opacity:.6, lineHeight:1.4 }}>{btn.desc}</div>
            </button>
          ))}
        </div>
        <div style={{ display:"flex", gap:20, justifyContent:"center", flexWrap:"wrap", color:"rgba(255,255,255,0.3)", fontSize:12 }}>
          {["4 Cafeterias","Hostel Delivery","Live Tracking","AI Recommendations","Ratings & Complaints"].map(f => (
            <span key={f}><span style={{ color:"#F59E0B55" }}>✦</span> {f}</span>
          ))}
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// STUDENT APP
// ═══════════════════════════════════════════════════════════════════════════════
function StudentApp({ orders, reviews, complaints, menu, saveOrders, saveReviews, saveComplaints, onExit }) {
  const [tab, setTab] = useState("menu");
  const [cafe, setCafe] = useState("Cafe 1");
  const [cart, setCart] = useState([]);
  const [hostel, setHostel] = useState("");
  const [room, setRoom] = useState("");
  const [name, setName] = useState("");
  const [pay, setPay] = useState("wallet");
  const [myOrders, setMyOrders] = useState([]);
  const [chatOpen, setChatOpen] = useState(false);
  const [chatMsgs, setChatMsgs] = useState([{ role:"assistant", text:"Hi! I'm your Campus Chop AI 🍛 Tell me what you're craving or your budget and I'll recommend the best meal for you!" }]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [reviewForm, setReviewForm] = useState({ cafe:"Cafe 1", rating:5, text:"", student:"" });
  const [compForm, setCompForm] = useState({ cafe:"Cafe 1", issue:"", anon:false, student:"" });
  const [submitting, setSubmitting] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState(null);
  const chatEnd = useRef(null);
  const timerRef = useRef(null);
  const [countdowns, setCountdowns] = useState({});

  const totalQty = cart.reduce((a,b)=>a+b.qty,0);
  const totalAmt = cart.reduce((a,b)=>a+b.price*b.qty,0);

  const addItem = (item) => setCart(p => { const ex=p.find(c=>c.id===item.id); return ex?p.map(c=>c.id===item.id?{...c,qty:c.qty+1}:c):[...p,{...item,qty:1}]; });
  const decItem = (id) => setCart(p => p.map(c=>c.id===id&&c.qty>1?{...c,qty:c.qty-1}:c).filter(c=>c.qty>0));
  const cartQty = (id) => cart.find(c=>c.id===id)?.qty||0;

  const allItems = Object.values(menu).flat();
  const topItems = [...allItems].sort((a,b)=>(b.sold||0)-(a.sold||0)).slice(0,6);

  const placeOrder = async () => {
    if (!hostel||!room||!name||cart.length===0) return;
    setSubmitting(true);
    const deliveryTime = Math.max(...cart.map(c=>c.time))+5;
    const order = {
      id: Date.now().toString(),
      studentName: name, cafe, hostel, room,
      items: cart.map(c=>({id:c.id,name:c.name,img:c.img,price:c.price,qty:c.qty})),
      total: totalAmt, payment: pay, deliveryTime,
      status: "Preparing",
      createdAt: new Date().toISOString(),
      timestamp: new Date().toLocaleTimeString(),
    };
    const updated = [order, ...orders];
    await saveOrders(updated);
    setMyOrders(p=>[order,...p]);
    setOrderSuccess(order);
    setCart([]);
    setTab("track");
    // start countdown
    setCountdowns(p=>({...p,[order.id]:deliveryTime*60}));
    setSubmitting(false);
  };

  // Countdown tick
  useEffect(() => {
    timerRef.current = setInterval(()=>{
      setCountdowns(p => {
        const n={...p};
        Object.keys(n).forEach(k=>{ if(n[k]>0) n[k]--; });
        return n;
      });
    },1000);
    return ()=>clearInterval(timerRef.current);
  },[]);

  // Chat
  const sendChat = async () => {
    if (!chatInput.trim()||chatLoading) return;
    const msg = chatInput.trim();
    setChatInput("");
    setChatMsgs(p=>[...p,{role:"user",text:msg}]);
    setChatLoading(true);
    try {
      const menuSummary = Object.entries(menu).map(([c,items])=>`${c}: ${items.filter(i=>i.available).map(i=>`${i.name} (₦${i.price}, ~${i.time}min)`).join(", ")}`).join("\n");
      const reply = await askAI(
        `You are the Campus Chop AI at Landmark University. You help students choose meals from the campus cafeterias. Be friendly, brief, and use emojis. Here is today's available menu:\n\n${menuSummary}\n\nOnly recommend items that are available. Always mention the price and estimated prep time.`,
        msg
      );
      setChatMsgs(p=>[...p,{role:"assistant",text:reply}]);
    } catch { setChatMsgs(p=>[...p,{role:"assistant",text:"Sorry, couldn't reach the AI right now. Try again!"}]); }
    setChatLoading(false);
  };
  useEffect(()=>{ chatEnd.current?.scrollIntoView({behavior:"smooth"}); },[chatMsgs]);

  const submitReview = async () => {
    if (!reviewForm.text||!reviewForm.student) return;
    const r = { id:Date.now().toString(), ...reviewForm, avatar:reviewForm.student[0].toUpperCase(), time:"Just now", createdAt:new Date().toISOString() };
    await saveReviews([r,...reviews]);
    setReviewForm({cafe:"Cafe 1",rating:5,text:"",student:""});
  };

  const submitComplaint = async () => {
    if (!compForm.issue) return;
    const c = { id:Date.now().toString(), student:compForm.anon?"Anonymous":(compForm.student||"Anonymous"), cafe:compForm.cafe, issue:compForm.issue, status:"Pending", vendorResponse:"", time:"Just now", createdAt:new Date().toISOString() };
    await saveComplaints([c,...complaints]);
    setCompForm({cafe:"Cafe 1",issue:"",anon:false,student:""});
  };

  const TABS = [
    {id:"menu",    icon:"🍽️", label:"Menu"},
    {id:"order",   icon:"🛒", label:`Cart${totalQty>0?` (${totalQty})`:""}` },
    {id:"track",   icon:"📍", label:"Track"},
    {id:"interact",icon:"⭐",  label:"Reviews"},
  ];

  const G = "linear-gradient(90deg,#0A2E1C,#0F4C2A)";

  return (
    <div style={{ minHeight:"100vh", background:"#F4EFE8", fontFamily:"Georgia,serif" }}>
      {/* Header */}
      <div style={{ background:G, padding:"13px 20px", display:"flex", alignItems:"center", justifyContent:"space-between", position:"sticky", top:0, zIndex:200, boxShadow:"0 4px 24px rgba(0,0,0,0.35)" }}>
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <div style={{ width:38, height:38, borderRadius:10, background:"#F59E0B", display:"flex", alignItems:"center", justifyContent:"center", fontSize:20 }}>🍛</div>
          <div>
            <div style={{ color:"#F59E0B", fontWeight:900, fontSize:15 }}>Campus Chop Hub</div>
            <div style={{ color:"rgba(255,255,255,0.4)", fontSize:10, letterSpacing:2, textTransform:"uppercase" }}>Student Portal</div>
          </div>
        </div>
        <button onClick={onExit} style={{ background:"rgba(255,255,255,0.08)", border:"1px solid rgba(255,255,255,0.15)", color:"rgba(255,255,255,0.7)", borderRadius:20, padding:"6px 14px", cursor:"pointer", fontSize:12 }}>← Back</button>
      </div>

      {/* Tab bar */}
      <div style={{ background:"#fff", borderBottom:"2px solid #EDE8E0", display:"flex", overflowX:"auto", position:"sticky", top:64, zIndex:190 }}>
        {TABS.map(t=>(
          <button key={t.id} onClick={()=>setTab(t.id)} style={{ flex:1, padding:"13px 6px", background:"none", border:"none", borderBottom:tab===t.id?"3px solid #F59E0B":"3px solid transparent", fontWeight:tab===t.id?800:500, color:tab===t.id?"#0A2E1C":"#9CA3AF", cursor:"pointer", fontSize:"clamp(11px,2.2vw,14px)", fontFamily:"inherit", whiteSpace:"nowrap", transition:"all .2s" }}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      <div style={{ maxWidth:880, margin:"0 auto", padding:"20px 14px" }}>

        {/* ── MENU ── */}
        {tab==="menu" && (
          <div className="anim">
            {/* Cafe tabs */}
            <div style={{ display:"flex", gap:10, flexWrap:"wrap", marginBottom:20 }}>
              {CAFES.map(c=>(
                <button key={c} onClick={()=>setCafe(c)} style={{ padding:"9px 20px", borderRadius:30, border:cafe===c?"none":"2px solid #E5DDD0", background:cafe===c?"#0A2E1C":"#fff", color:cafe===c?"#F59E0B":"#374151", fontWeight:700, cursor:"pointer", fontSize:13, fontFamily:"inherit", transition:"all .2s", boxShadow:cafe===c?"0 4px 16px rgba(10,46,28,0.25)":"none" }}>
                  {c==="Back of Cafe"?"🌙 ":"🍴 "}{c}
                </button>
              ))}
            </div>

            {/* Top sellers scroll */}
            <div style={{ background:"linear-gradient(90deg,#0A2E1C,#165C2E)", borderRadius:14, padding:"12px 18px", marginBottom:22, display:"flex", gap:14, alignItems:"center", overflowX:"auto" }}>
              <span style={{ color:"#F59E0B", fontSize:11, fontWeight:800, letterSpacing:1, whiteSpace:"nowrap" }}>🔥 TOP CAMPUS PICKS</span>
              {topItems.map(it=>(
                <span key={it.id} style={{ color:"rgba(255,255,255,0.75)", fontSize:12, whiteSpace:"nowrap", background:"rgba(255,255,255,0.07)", borderRadius:20, padding:"4px 12px" }}>
                  {it.img} {it.name}
                </span>
              ))}
            </div>

            {/* Items grid */}
            <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(200px,1fr))", gap:16 }}>
              {(menu[cafe]||[]).map(item=>(
                <div key={item.id} className="card-hover" style={{ background:"#fff", borderRadius:20, overflow:"hidden", boxShadow:"0 2px 14px rgba(0,0,0,0.07)", opacity:item.available?1:.55 }}>
                  <div style={{ background:item.available?"linear-gradient(135deg,#F0FDF4,#DCFCE7)":"#F3F4F6", padding:"28px 0", textAlign:"center", fontSize:50 }}>{item.img}</div>
                  <div style={{ padding:"14px 16px" }}>
                    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:5 }}>
                      <span style={{ fontWeight:700, fontSize:14, color:"#111827", lineHeight:1.3 }}>{item.name}</span>
                      {item.tag && <Chip label={item.tag} color={["Bestseller","Trending","Hot"].includes(item.tag)?"#DC2626":"#0A2E1C"} />}
                    </div>
                    <div style={{ color:"#9CA3AF", fontSize:12, marginBottom:10 }}>⏱ ~{item.time} min</div>
                    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                      <span style={{ fontWeight:900, color:"#0A2E1C", fontSize:16 }}>₦{item.price.toLocaleString()}</span>
                      {item.available ? (
                        cartQty(item.id)>0 ? (
                          <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                            <button onClick={()=>decItem(item.id)} style={{ width:26,height:26,borderRadius:"50%",border:"2px solid #E5DDD0",background:"none",cursor:"pointer",fontWeight:800,fontSize:15,display:"flex",alignItems:"center",justifyContent:"center" }}>−</button>
                            <span style={{ fontWeight:800, fontSize:14, minWidth:16, textAlign:"center" }}>{cartQty(item.id)}</span>
                            <button onClick={()=>addItem(item)} style={{ width:26,height:26,borderRadius:"50%",background:"#0A2E1C",border:"none",color:"#F59E0B",cursor:"pointer",fontWeight:800,fontSize:15,display:"flex",alignItems:"center",justifyContent:"center" }}>+</button>
                          </div>
                        ) : (
                          <button onClick={()=>addItem(item)} style={{ background:"#F59E0B",border:"none",color:"#0A2E1C",borderRadius:20,padding:"6px 16px",fontWeight:800,cursor:"pointer",fontSize:13,fontFamily:"inherit" }}>+ Add</button>
                        )
                      ) : (
                        <span style={{ fontSize:11,color:"#9CA3AF",fontWeight:600 }}>Unavailable</span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── CART ── */}
        {tab==="order" && (
          <div className="anim">
            <h2 style={{ marginBottom:20, color:"#0A2E1C", fontSize:22 }}>Your Order 🛒</h2>
            {cart.length===0 ? (
              <div style={{ background:"#fff", borderRadius:20, padding:48, textAlign:"center", boxShadow:"0 2px 14px rgba(0,0,0,0.06)" }}>
                <div style={{ fontSize:52, marginBottom:14 }}>🍽️</div>
                <div style={{ color:"#9CA3AF", marginBottom:16 }}>Cart is empty — browse the menu!</div>
                <button onClick={()=>setTab("menu")} style={{ background:"#F59E0B",border:"none",borderRadius:30,padding:"12px 28px",fontWeight:800,cursor:"pointer",fontFamily:"inherit",color:"#0A2E1C" }}>Browse Menu</button>
              </div>
            ) : (
              <>
                {/* Cart items */}
                <div style={{ background:"#fff", borderRadius:20, overflow:"hidden", marginBottom:18, boxShadow:"0 2px 14px rgba(0,0,0,0.06)" }}>
                  {cart.map((item,i)=>(
                    <div key={item.id} style={{ display:"flex", alignItems:"center", padding:"15px 18px", borderBottom:i<cart.length-1?"1px solid #F3F4F6":"none" }}>
                      <span style={{ fontSize:30, marginRight:12 }}>{item.img}</span>
                      <div style={{ flex:1 }}>
                        <div style={{ fontWeight:700, fontSize:14, color:"#111827" }}>{item.name}</div>
                        <div style={{ color:"#9CA3AF", fontSize:12 }}>₦{item.price.toLocaleString()} each</div>
                      </div>
                      <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                        <button onClick={()=>decItem(item.id)} style={{ width:27,height:27,borderRadius:"50%",border:"2px solid #E5DDD0",background:"none",cursor:"pointer",fontWeight:800,fontSize:15 }}>−</button>
                        <span style={{ fontWeight:800, minWidth:18, textAlign:"center" }}>{item.qty}</span>
                        <button onClick={()=>addItem(item)} style={{ width:27,height:27,borderRadius:"50%",background:"#0A2E1C",border:"none",color:"#F59E0B",cursor:"pointer",fontWeight:800,fontSize:15 }}>+</button>
                      </div>
                      <span style={{ marginLeft:14, fontWeight:900, color:"#0A2E1C", minWidth:72, textAlign:"right" }}>₦{(item.price*item.qty).toLocaleString()}</span>
                    </div>
                  ))}
                  <div style={{ padding:"14px 18px", background:"#FAFAF8", display:"flex", justifyContent:"space-between", fontWeight:700, fontSize:15 }}>
                    <span style={{ color:"#374151" }}>Total</span>
                    <span style={{ color:"#0A2E1C", fontSize:18, fontWeight:900 }}>₦{totalAmt.toLocaleString()}</span>
                  </div>
                </div>

                {/* Delivery form */}
                <div style={{ background:"#fff", borderRadius:20, padding:22, marginBottom:18, boxShadow:"0 2px 14px rgba(0,0,0,0.06)" }}>
                  <h3 style={{ marginBottom:16, color:"#0A2E1C", fontSize:16 }}>🏠 Delivery Details</h3>
                  <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:12, marginBottom:16 }}>
                    {[
                      { label:"Your Name", val:name, set:setName, type:"text", ph:"e.g. Temi Adeyemi" },
                    ].map(f=>(
                      <div key={f.label} style={{ gridColumn:"span 3" }}>
                        <label style={{ fontSize:10,letterSpacing:1.5,color:"#9CA3AF",textTransform:"uppercase",display:"block",marginBottom:6 }}>{f.label}</label>
                        <input value={f.val} onChange={e=>f.set(e.target.value)} placeholder={f.ph} style={{ width:"100%",padding:"10px 14px",borderRadius:10,border:"2px solid #E5DDD0",fontFamily:"inherit",fontSize:14 }} />
                      </div>
                    ))}
                    <div>
                      <label style={{ fontSize:10,letterSpacing:1.5,color:"#9CA3AF",textTransform:"uppercase",display:"block",marginBottom:6 }}>Hostel</label>
                      <select value={hostel} onChange={e=>setHostel(e.target.value)} style={{ width:"100%",padding:"10px 14px",borderRadius:10,border:"2px solid #E5DDD0",fontFamily:"inherit",fontSize:14 }}>
                        <option value="">Select hostel</option>
                        {HOSTELS.map(h=><option key={h}>{h}</option>)}
                      </select>
                    </div>
                    <div>
                      <label style={{ fontSize:10,letterSpacing:1.5,color:"#9CA3AF",textTransform:"uppercase",display:"block",marginBottom:6 }}>Room No.</label>
                      <input value={room} onChange={e=>setRoom(e.target.value)} placeholder="e.g. A204" style={{ width:"100%",padding:"10px 14px",borderRadius:10,border:"2px solid #E5DDD0",fontFamily:"inherit",fontSize:14 }} />
                    </div>
                    <div>
                      <label style={{ fontSize:10,letterSpacing:1.5,color:"#9CA3AF",textTransform:"uppercase",display:"block",marginBottom:6 }}>Cafeteria</label>
                      <select value={cafe} onChange={e=>setCafe(e.target.value)} style={{ width:"100%",padding:"10px 14px",borderRadius:10,border:"2px solid #E5DDD0",fontFamily:"inherit",fontSize:14 }}>
                        {CAFES.map(c=><option key={c}>{c}</option>)}
                      </select>
                    </div>
                  </div>

                  <h3 style={{ marginBottom:12, color:"#0A2E1C", fontSize:15 }}>💳 Payment</h3>
                  <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
                    {PAYMENT_METHODS.map(pm=>(
                      <div key={pm.id} onClick={()=>setPay(pm.id)} style={{ display:"flex",alignItems:"center",gap:14,padding:"13px 16px",borderRadius:12,border:pay===pm.id?"2px solid #0A2E1C":"2px solid #E5DDD0",background:pay===pm.id?"#F0FDF4":"#FAFAF8",cursor:"pointer",transition:"all .2s" }}>
                        <span style={{ fontSize:22 }}>{pm.icon}</span>
                        <div style={{ flex:1 }}>
                          <div style={{ fontWeight:700, fontSize:14 }}>{pm.label}</div>
                          <div style={{ color:"#9CA3AF", fontSize:12 }}>{pm.desc}</div>
                        </div>
                        <div style={{ width:18,height:18,borderRadius:"50%",border:`3px solid ${pay===pm.id?"#0A2E1C":"#D1D5DB"}`,background:pay===pm.id?"#0A2E1C":"transparent",display:"flex",alignItems:"center",justifyContent:"center" }}>
                          {pay===pm.id&&<div style={{ width:6,height:6,borderRadius:"50%",background:"#F59E0B" }} />}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <button onClick={placeOrder} disabled={submitting||!hostel||!room||!name} style={{ width:"100%",background:hostel&&room&&name?"linear-gradient(90deg,#0A2E1C,#165C2E)":"#D1D5DB",color:hostel&&room&&name?"#F59E0B":"#9CA3AF",border:"none",borderRadius:16,padding:"17px",fontSize:17,fontWeight:900,cursor:hostel&&room&&name?"pointer":"not-allowed",fontFamily:"inherit",display:"flex",alignItems:"center",justifyContent:"center",gap:10 }}>
                  {submitting ? <><Spinner /> Placing…</> : `🚀 Place Order — ₦${totalAmt.toLocaleString()}`}
                </button>
              </>
            )}
          </div>
        )}

        {/* ── TRACK ── */}
        {tab==="track" && (
          <div className="anim">
            <h2 style={{ marginBottom:20, color:"#0A2E1C", fontSize:22 }}>Order Tracking 📍</h2>
            {myOrders.length===0 ? (
              <div style={{ background:"#fff",borderRadius:20,padding:48,textAlign:"center",boxShadow:"0 2px 14px rgba(0,0,0,0.06)" }}>
                <div style={{ fontSize:52,marginBottom:14 }}>📦</div>
                <div style={{ color:"#9CA3AF" }}>No active orders yet. Place an order!</div>
              </div>
            ) : myOrders.map(o=>{
              const secs = countdowns[o.id]??0;
              const total = o.deliveryTime*60;
              const pct = Math.min(100,Math.round((1-secs/total)*100));
              const done = secs===0;
              const statusFromOrders = orders.find(x=>x.id===o.id)?.status||o.status;
              const steps = [
                {label:"Order Received",     icon:"✅", done:true},
                {label:"Kitchen Preparing",  icon:"👨‍🍳", done:pct>20||statusFromOrders!=="Preparing"},
                {label:"On the Way",         icon:"🛵", done:pct>70||statusFromOrders==="On the Way"||statusFromOrders==="Delivered"},
                {label:"Delivered! Enjoy 🎉",icon:"🎉", done:done||statusFromOrders==="Delivered"},
              ];
              return (
                <div key={o.id} style={{ marginBottom:24 }}>
                  <div style={{ background:"linear-gradient(135deg,#0A2E1C,#165C2E)",borderRadius:22,padding:24,color:"white",marginBottom:18 }}>
                    <div style={{ display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:14 }}>
                      <div>
                        <div style={{ fontSize:10,letterSpacing:3,color:"rgba(255,255,255,0.4)",textTransform:"uppercase" }}>Order #{o.id.slice(-4)}</div>
                        <div style={{ fontSize:22,fontWeight:900,color:"#F59E0B",marginTop:4 }}>₦{o.total.toLocaleString()}</div>
                        <div style={{ fontSize:12,color:"rgba(255,255,255,0.5)",marginTop:2 }}>{o.cafe} · {o.timestamp}</div>
                      </div>
                      <StatusChip s={statusFromOrders==="Delivered"||done?"Delivered":statusFromOrders} />
                    </div>
                    <div style={{ background:"rgba(255,255,255,0.08)",borderRadius:10,padding:"10px 14px",marginBottom:14,display:"flex",alignItems:"center",gap:10 }}>
                      <span style={{ fontSize:20 }}>🏠</span>
                      <div>
                        <div style={{ fontSize:11,color:"rgba(255,255,255,0.4)" }}>Delivering to</div>
                        <div style={{ fontWeight:700,fontSize:14 }}>{o.hostel}, Room {o.room}</div>
                      </div>
                    </div>
                    {!done&&statusFromOrders!=="Delivered" && (
                      <div>
                        <div style={{ display:"flex",justifyContent:"space-between",marginBottom:6 }}>
                          <span style={{ fontSize:12,color:"rgba(255,255,255,0.5)" }}>Estimated: {Math.ceil(secs/60)} min left</span>
                          <span style={{ color:"#F59E0B",fontWeight:800 }}>{pct}%</span>
                        </div>
                        <div style={{ background:"rgba(255,255,255,0.1)",borderRadius:8,height:8,overflow:"hidden" }}>
                          <div style={{ background:"#F59E0B",height:"100%",borderRadius:8,width:`${pct}%`,transition:"width 1s linear" }} />
                        </div>
                      </div>
                    )}
                  </div>
                  <div style={{ background:"#fff",borderRadius:18,padding:20,boxShadow:"0 2px 14px rgba(0,0,0,0.06)" }}>
                    {steps.map((s,i)=>(
                      <div key={i} style={{ display:"flex",alignItems:"center",gap:14,padding:"12px 0",borderBottom:i<3?"1px solid #F3F4F6":"none" }}>
                        <div style={{ width:40,height:40,borderRadius:"50%",background:s.done?"#0A2E1C":"#F3F4F6",display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,flexShrink:0,transition:"all .5s" }}>{s.icon}</div>
                        <span style={{ fontWeight:s.done?700:400,color:s.done?"#0A2E1C":"#9CA3AF",fontSize:14 }}>{s.label}</span>
                        {s.done&&<span style={{ marginLeft:"auto",color:"#16A34A",fontWeight:700,fontSize:11 }}>✔ Done</span>}
                      </div>
                    ))}
                    <div style={{ marginTop:14,display:"flex",gap:8,flexWrap:"wrap" }}>
                      {o.items.map(it=>(
                        <span key={it.id} style={{ background:"#F4EFE8",borderRadius:20,padding:"4px 12px",fontSize:13 }}>{it.img} {it.name} ×{it.qty}</span>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ── REVIEWS ── */}
        {tab==="interact" && (
          <div className="anim">
            <h2 style={{ marginBottom:20, color:"#0A2E1C", fontSize:22 }}>Reviews & Complaints ⭐</h2>

            {/* Write review */}
            <div style={{ background:"#fff",borderRadius:20,padding:22,marginBottom:22,boxShadow:"0 2px 14px rgba(0,0,0,0.06)" }}>
              <h3 style={{ marginBottom:14,color:"#0A2E1C",fontSize:16 }}>✍️ Write a Review</h3>
              <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:12 }}>
                <div>
                  <label style={{ fontSize:10,letterSpacing:1.5,color:"#9CA3AF",textTransform:"uppercase",display:"block",marginBottom:6 }}>Your Name</label>
                  <input value={reviewForm.student} onChange={e=>setReviewForm(p=>({...p,student:e.target.value}))} placeholder="Your name" style={{ width:"100%",padding:"10px 14px",borderRadius:10,border:"2px solid #E5DDD0",fontFamily:"inherit",fontSize:14 }} />
                </div>
                <div>
                  <label style={{ fontSize:10,letterSpacing:1.5,color:"#9CA3AF",textTransform:"uppercase",display:"block",marginBottom:6 }}>Cafeteria</label>
                  <select value={reviewForm.cafe} onChange={e=>setReviewForm(p=>({...p,cafe:e.target.value}))} style={{ width:"100%",padding:"10px 14px",borderRadius:10,border:"2px solid #E5DDD0",fontFamily:"inherit",fontSize:14 }}>
                    {CAFES.map(c=><option key={c}>{c}</option>)}
                  </select>
                </div>
              </div>
              <div style={{ marginBottom:12 }}>
                <label style={{ fontSize:10,letterSpacing:1.5,color:"#9CA3AF",textTransform:"uppercase",display:"block",marginBottom:8 }}>Rating</label>
                <Stars v={reviewForm.rating} set={r=>setReviewForm(p=>({...p,rating:r}))} sz={28} />
              </div>
              <textarea value={reviewForm.text} onChange={e=>setReviewForm(p=>({...p,text:e.target.value}))} placeholder="Share your experience…" style={{ width:"100%",padding:"12px 14px",borderRadius:10,border:"2px solid #E5DDD0",fontFamily:"inherit",fontSize:14,minHeight:80,resize:"vertical" }} />
              <button onClick={submitReview} style={{ marginTop:10,background:"#0A2E1C",color:"#F59E0B",border:"none",borderRadius:12,padding:"11px 22px",fontWeight:800,cursor:"pointer",fontFamily:"inherit",fontSize:14 }}>Submit Review</button>
            </div>

            {/* Reviews list */}
            <div style={{ marginBottom:26 }}>
              {reviews.length===0 && <div style={{ background:"#fff",borderRadius:16,padding:24,textAlign:"center",color:"#9CA3AF" }}>No reviews yet. Be the first!</div>}
              {reviews.map(r=>(
                <div key={r.id} style={{ background:"#fff",borderRadius:16,padding:"16px 18px",marginBottom:12,display:"flex",gap:13,boxShadow:"0 2px 10px rgba(0,0,0,0.05)" }}>
                  <div style={{ width:38,height:38,borderRadius:"50%",background:"linear-gradient(135deg,#0A2E1C,#165C2E)",color:"#F59E0B",display:"flex",alignItems:"center",justifyContent:"center",fontWeight:900,fontSize:15,flexShrink:0 }}>{r.avatar||r.student?.[0]?.toUpperCase()||"?"}</div>
                  <div style={{ flex:1 }}>
                    <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:4 }}>
                      <span style={{ fontWeight:700,fontSize:14 }}>{r.student}</span>
                      <span style={{ color:"#9CA3AF",fontSize:11 }}>{r.time}</span>
                    </div>
                    <div style={{ display:"flex",gap:8,alignItems:"center",marginBottom:5 }}>
                      <Stars v={r.rating} sz={13} />
                      <Chip label={r.cafe} color="#0A2E1C" />
                    </div>
                    <div style={{ color:"#374151",fontSize:14,lineHeight:1.55 }}>{r.text}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* Complaint form */}
            <div style={{ background:"#fff",borderRadius:20,padding:22,marginBottom:22,boxShadow:"0 2px 14px rgba(0,0,0,0.06)" }}>
              <h3 style={{ marginBottom:14,color:"#0A2E1C",fontSize:16 }}>📣 Submit a Complaint</h3>
              <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:12 }}>
                <div>
                  <label style={{ fontSize:10,letterSpacing:1.5,color:"#9CA3AF",textTransform:"uppercase",display:"block",marginBottom:6 }}>Your Name</label>
                  <input value={compForm.student} onChange={e=>setCompForm(p=>({...p,student:e.target.value}))} disabled={compForm.anon} placeholder={compForm.anon?"Anonymous":"Your name"} style={{ width:"100%",padding:"10px 14px",borderRadius:10,border:"2px solid #E5DDD0",fontFamily:"inherit",fontSize:14,background:compForm.anon?"#F3F4F6":"white" }} />
                </div>
                <div>
                  <label style={{ fontSize:10,letterSpacing:1.5,color:"#9CA3AF",textTransform:"uppercase",display:"block",marginBottom:6 }}>Cafeteria</label>
                  <select value={compForm.cafe} onChange={e=>setCompForm(p=>({...p,cafe:e.target.value}))} style={{ width:"100%",padding:"10px 14px",borderRadius:10,border:"2px solid #E5DDD0",fontFamily:"inherit",fontSize:14 }}>
                    {CAFES.map(c=><option key={c}>{c}</option>)}
                  </select>
                </div>
              </div>
              <label style={{ display:"flex",alignItems:"center",gap:8,marginBottom:12,cursor:"pointer",fontSize:14 }}>
                <input type="checkbox" checked={compForm.anon} onChange={e=>setCompForm(p=>({...p,anon:e.target.checked}))} /> Submit anonymously
              </label>
              <textarea value={compForm.issue} onChange={e=>setCompForm(p=>({...p,issue:e.target.value}))} placeholder="Describe your complaint…" style={{ width:"100%",padding:"12px 14px",borderRadius:10,border:"2px solid #E5DDD0",fontFamily:"inherit",fontSize:14,minHeight:80,resize:"vertical" }} />
              <button onClick={submitComplaint} style={{ marginTop:10,background:"#DC2626",color:"white",border:"none",borderRadius:12,padding:"11px 22px",fontWeight:800,cursor:"pointer",fontFamily:"inherit",fontSize:14 }}>Send Complaint</button>
            </div>

            {/* Complaint board */}
            <h3 style={{ marginBottom:12,color:"#374151",fontSize:16 }}>Complaint Board</h3>
            {complaints.map(c=>(
              <div key={c.id} style={{ background:"#fff",borderRadius:14,padding:"16px 18px",marginBottom:10,boxShadow:"0 2px 10px rgba(0,0,0,0.05)" }}>
                <div style={{ display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:4 }}>
                  <div>
                    <div style={{ fontWeight:700,fontSize:14,color:"#111827",marginBottom:3 }}>{c.issue}</div>
                    <div style={{ fontSize:12,color:"#9CA3AF" }}>{c.student} · {c.cafe} · {c.time}</div>
                  </div>
                  <StatusChip s={c.status} />
                </div>
                {c.vendorResponse && (
                  <div style={{ marginTop:10,background:"#F0FDF4",borderRadius:10,padding:"10px 14px",borderLeft:"3px solid #16A34A" }}>
                    <div style={{ fontSize:11,fontWeight:700,color:"#16A34A",marginBottom:4 }}>Vendor Response</div>
                    <div style={{ fontSize:13,color:"#374151" }}>{c.vendorResponse}</div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── AI CHAT BUTTON ── */}
      <div style={{ position:"fixed",bottom:24,right:20,zIndex:300 }}>
        {chatOpen && (
          <div style={{ position:"absolute",bottom:64,right:0,width:320,background:"#1A1A2E",borderRadius:20,overflow:"hidden",boxShadow:"0 20px 60px rgba(0,0,0,0.4)",border:"1px solid rgba(255,255,255,0.08)",animation:"slideUp .3s ease" }}>
            <div style={{ background:"linear-gradient(90deg,#0A2E1C,#165C2E)",padding:"14px 18px",display:"flex",alignItems:"center",gap:10 }}>
              <span style={{ fontSize:22 }}>🤖</span>
              <div>
                <div style={{ color:"#F59E0B",fontWeight:800,fontSize:14 }}>Chop AI</div>
                <div style={{ color:"rgba(255,255,255,0.45)",fontSize:11 }}>Your personal meal advisor</div>
              </div>
            </div>
            <div style={{ height:240,overflowY:"auto",padding:"14px 16px",display:"flex",flexDirection:"column",gap:10 }}>
              {chatMsgs.map((m,i)=>(
                <div key={i} style={{ display:"flex",justifyContent:m.role==="user"?"flex-end":"flex-start" }}>
                  <div style={{ maxWidth:"82%",background:m.role==="user"?"#F59E0B":"rgba(255,255,255,0.07)",color:m.role==="user"?"#0A2E1C":"rgba(255,255,255,0.85)",borderRadius:m.role==="user"?"18px 18px 4px 18px":"18px 18px 18px 4px",padding:"9px 13px",fontSize:13,lineHeight:1.5 }}>{m.text}</div>
                </div>
              ))}
              {chatLoading && (
                <div style={{ display:"flex",gap:6,alignItems:"center",color:"rgba(255,255,255,0.4)",fontSize:13 }}>
                  <Spinner /><span>Thinking…</span>
                </div>
              )}
              <div ref={chatEnd} />
            </div>
            <div style={{ padding:"10px 14px",borderTop:"1px solid rgba(255,255,255,0.06)",display:"flex",gap:8 }}>
              <input value={chatInput} onChange={e=>setChatInput(e.target.value)} onKeyDown={e=>e.key==="Enter"&&sendChat()} placeholder="Ask me anything…" style={{ flex:1,background:"rgba(255,255,255,0.06)",border:"1px solid rgba(255,255,255,0.1)",borderRadius:30,padding:"8px 14px",color:"white",fontFamily:"inherit",fontSize:13 }} />
              <button onClick={sendChat} disabled={chatLoading} style={{ background:"#F59E0B",border:"none",borderRadius:"50%",width:36,height:36,cursor:"pointer",fontSize:16,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0 }}>➤</button>
            </div>
          </div>
        )}
        <button onClick={()=>setChatOpen(p=>!p)} style={{ width:52,height:52,borderRadius:"50%",background:"linear-gradient(135deg,#F59E0B,#D97706)",border:"none",cursor:"pointer",fontSize:24,boxShadow:"0 6px 24px rgba(245,158,11,0.5)",display:"flex",alignItems:"center",justifyContent:"center",animation:"glow 2s ease-in-out infinite" }}>
          {chatOpen?"✕":"🤖"}
        </button>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// VENDOR APP
// ═══════════════════════════════════════════════════════════════════════════════
function VendorApp({ orders, reviews, complaints, menu, saveOrders, saveComplaints, saveMenu, onExit }) {
  const [tab, setTab] = useState("orders");
  const [vendorCafe, setVendorCafe] = useState("Cafe 1");
  const [aiResp, setAiResp] = useState({});
  const [aiLoading, setAiLoading] = useState({});
  const [editItem, setEditItem] = useState(null);
  const [addForm, setAddForm] = useState({ name:"",price:"",time:"",img:"🍽️",tag:"",available:true });
  const [showAdd, setShowAdd] = useState(false);

  const myCafeOrders = orders.filter(o=>o.cafe===vendorCafe);

  const updateOrderStatus = async (id, status) => {
    const updated = orders.map(o=>o.id===id?{...o,status}:o);
    await saveOrders(updated);
  };

  const resolveComplaint = async (id, response) => {
    const updated = complaints.map(c=>c.id===id?{...c,status:"Resolved",vendorResponse:response||c.vendorResponse}:c);
    await saveComplaints(updated);
  };

  const generateAIResponse = async (complaint) => {
    setAiLoading(p=>({...p,[complaint.id]:true}));
    try {
      const resp = await askAI(
        `You are a professional cafeteria manager at Landmark University Campus Chop Hub. Write a brief, empathetic, professional response to a student's complaint. Be polite, acknowledge the issue, apologize where needed, and state corrective action. Keep it under 60 words.`,
        `Complaint from ${complaint.student} about ${complaint.cafe}: "${complaint.issue}"`
      );
      setAiResp(p=>({...p,[complaint.id]:resp}));
    } catch { setAiResp(p=>({...p,[complaint.id]:"Sorry, AI unavailable. Please type a response manually."})); }
    setAiLoading(p=>({...p,[complaint.id]:false}));
  };

  const toggleAvail = async (cafe, itemId) => {
    const updated = { ...menu, [cafe]: menu[cafe].map(i=>i.id===itemId?{...i,available:!i.available}:i) };
    await saveMenu(updated);
  };

  const saveEditItem = async () => {
    if (!editItem) return;
    const updated = { ...menu, [vendorCafe]: menu[vendorCafe].map(i=>i.id===editItem.id?editItem:i) };
    await saveMenu(updated);
    setEditItem(null);
  };

  const addNewItem = async () => {
    if (!addForm.name||!addForm.price) return;
    const newItem = { ...addForm, id: Date.now(), price: parseInt(addForm.price)||0, time: parseInt(addForm.time)||10, sold:0 };
    const updated = { ...menu, [vendorCafe]: [...(menu[vendorCafe]||[]), newItem] };
    await saveMenu(updated);
    setAddForm({name:"",price:"",time:"",img:"🍽️",tag:"",available:true});
    setShowAdd(false);
  };

  const deleteItem = async (cafe, id) => {
    const updated = { ...menu, [cafe]: menu[cafe].filter(i=>i.id!==id) };
    await saveMenu(updated);
  };

  const TABS = [{id:"orders",icon:"🔔",label:"Live Orders"},{id:"analytics",icon:"📊",label:"Analytics"},{id:"complaints",icon:"📣",label:"Complaints"},{id:"menu",icon:"📋",label:"Menu Editor"}];
  const EMOJIS = ["🍛","🍚","🥣","🥘","🍝","🍜","🍱","🫘","🍔","🌯","🥧","🍗","🥩","🌽","🐟","🍌","🍽️","🥗","🍲","🥞"];

  return (
    <div style={{ minHeight:"100vh",background:"#0F172A",fontFamily:"Georgia,serif",color:"white" }}>
      {/* Header */}
      <div style={{ background:"linear-gradient(90deg,#0F172A,#1E293B)",padding:"14px 22px",display:"flex",alignItems:"center",justifyContent:"space-between",position:"sticky",top:0,zIndex:200,borderBottom:"1px solid rgba(255,255,255,0.07)" }}>
        <div style={{ display:"flex",alignItems:"center",gap:10 }}>
          <div style={{ width:38,height:38,borderRadius:10,background:"#38BDF822",border:"1px solid #38BDF844",display:"flex",alignItems:"center",justifyContent:"center",fontSize:20 }}>🍽️</div>
          <div>
            <div style={{ color:"#38BDF8",fontWeight:900,fontSize:15 }}>Vendor Dashboard</div>
            <div style={{ color:"rgba(255,255,255,0.35)",fontSize:10,letterSpacing:2,textTransform:"uppercase" }}>Campus Chop Hub</div>
          </div>
        </div>
        <div style={{ display:"flex",alignItems:"center",gap:10 }}>
          <select value={vendorCafe} onChange={e=>setVendorCafe(e.target.value)} style={{ background:"rgba(255,255,255,0.06)",border:"1px solid rgba(255,255,255,0.12)",color:"white",borderRadius:20,padding:"6px 14px",fontFamily:"inherit",fontSize:13,cursor:"pointer" }}>
            {CAFES.map(c=><option key={c} style={{ background:"#1E293B" }}>{c}</option>)}
          </select>
          <button onClick={onExit} style={{ background:"rgba(255,255,255,0.06)",border:"1px solid rgba(255,255,255,0.12)",color:"rgba(255,255,255,0.6)",borderRadius:20,padding:"6px 14px",cursor:"pointer",fontSize:12 }}>← Back</button>
        </div>
      </div>

      {/* Tab bar */}
      <div style={{ background:"#1E293B",borderBottom:"1px solid rgba(255,255,255,0.05)",display:"flex",overflowX:"auto",position:"sticky",top:64,zIndex:190 }}>
        {TABS.map(t=>(
          <button key={t.id} onClick={()=>setTab(t.id)} style={{ flex:1,padding:"13px 6px",background:"none",border:"none",borderBottom:tab===t.id?"3px solid #38BDF8":"3px solid transparent",fontWeight:tab===t.id?800:500,color:tab===t.id?"#38BDF8":"rgba(255,255,255,0.35)",cursor:"pointer",fontSize:"clamp(11px,2vw,13px)",fontFamily:"inherit",whiteSpace:"nowrap",transition:"all .2s" }}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      <div style={{ maxWidth:900,margin:"0 auto",padding:"22px 14px" }}>

        {/* ── LIVE ORDERS ── */}
        {tab==="orders" && (
          <div className="anim">
            <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:20 }}>
              <h2 style={{ fontSize:22 }}>🔔 Live Orders — {vendorCafe}</h2>
              <div style={{ display:"flex",alignItems:"center",gap:6,color:"#38BDF8",fontSize:13 }}><Pulse color="#38BDF8" />Live</div>
            </div>
            {myCafeOrders.length===0 ? (
              <div style={{ background:"#1E293B",borderRadius:20,padding:48,textAlign:"center" }}>
                <div style={{ fontSize:48,marginBottom:14 }}>📭</div>
                <div style={{ color:"rgba(255,255,255,0.35)" }}>No orders yet for {vendorCafe}.</div>
              </div>
            ) : myCafeOrders.map(o=>(
              <div key={o.id} style={{ background:"#1E293B",borderRadius:18,padding:22,marginBottom:16,border:"1px solid rgba(56,189,248,0.1)" }}>
                <div style={{ display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:14 }}>
                  <div>
                    <div style={{ fontSize:10,letterSpacing:3,color:"rgba(255,255,255,0.35)",textTransform:"uppercase" }}>Order #{o.id.slice(-4)}</div>
                    <div style={{ fontSize:20,fontWeight:900,color:"#38BDF8",marginTop:3 }}>₦{o.total.toLocaleString()}</div>
                    <div style={{ fontSize:12,color:"rgba(255,255,255,0.4)",marginTop:2 }}>by {o.studentName} · {o.hostel} Rm {o.room}</div>
                  </div>
                  <StatusChip s={o.status} />
                </div>
                <div style={{ display:"flex",gap:8,flexWrap:"wrap",marginBottom:14 }}>
                  {o.items.map(it=>(
                    <span key={it.id} style={{ background:"rgba(255,255,255,0.05)",borderRadius:20,padding:"4px 12px",fontSize:13 }}>{it.img} {it.name} ×{it.qty}</span>
                  ))}
                </div>
                <div style={{ fontSize:12,color:"rgba(255,255,255,0.35)",marginBottom:12 }}>
                  💳 {PAYMENT_METHODS.find(p=>p.id===o.payment)?.label} · ⏰ {o.timestamp}
                </div>
                <div style={{ display:"flex",gap:10,flexWrap:"wrap" }}>
                  {["Preparing","On the Way","Delivered"].map(s=>(
                    <button key={s} onClick={()=>updateOrderStatus(o.id,s)} style={{ background:o.status===s?"#38BDF8":"rgba(255,255,255,0.05)",color:o.status===s?"#0F172A":"rgba(255,255,255,0.6)",border:`1px solid ${o.status===s?"#38BDF8":"rgba(255,255,255,0.1)"}`,borderRadius:20,padding:"6px 14px",cursor:"pointer",fontSize:12,fontWeight:o.status===s?800:500,fontFamily:"inherit",transition:"all .2s" }}>
                      {s==="Preparing"?"👨‍🍳":s==="On the Way"?"🛵":"✅"} {s}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── ANALYTICS ── */}
        {tab==="analytics" && (
          <div className="anim">
            <h2 style={{ marginBottom:20,fontSize:22 }}>📊 Sales Analytics</h2>
            {/* Summary cards */}
            <div style={{ display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(160px,1fr))",gap:14,marginBottom:24 }}>
              {[
                {label:"Total Orders",   val:orders.length,          icon:"📦", color:"#38BDF8"},
                {label:"Revenue",        val:`₦${orders.reduce((a,b)=>a+b.total,0).toLocaleString()}`, icon:"💰", color:"#F59E0B"},
                {label:"Delivered",      val:orders.filter(o=>o.status==="Delivered").length, icon:"✅",  color:"#10B981"},
                {label:"Pending",        val:orders.filter(o=>o.status==="Preparing").length, icon:"⏳", color:"#F472B6"},
              ].map(c=>(
                <div key={c.label} style={{ background:"#1E293B",borderRadius:16,padding:"18px 16px",border:`1px solid ${c.color}22` }}>
                  <div style={{ fontSize:24,marginBottom:8 }}>{c.icon}</div>
                  <div style={{ fontSize:22,fontWeight:900,color:c.color }}>{c.val}</div>
                  <div style={{ fontSize:12,color:"rgba(255,255,255,0.4)",marginTop:3 }}>{c.label}</div>
                </div>
              ))}
            </div>
            {/* Per-cafe breakdown */}
            {CAFES.map((c,ci)=>{
              const cafeOrders = orders.filter(o=>o.cafe===c);
              const revenue = cafeOrders.reduce((a,b)=>a+b.total,0);
              const colors = ["#38BDF8","#F59E0B","#10B981","#F472B6"];
              return (
                <div key={c} style={{ background:"#1E293B",borderRadius:18,padding:22,marginBottom:18 }}>
                  <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16 }}>
                    <h3 style={{ fontSize:15,color:colors[ci] }}>{c}</h3>
                    <div style={{ fontSize:12,color:"rgba(255,255,255,0.4)" }}>{cafeOrders.length} orders · ₦{revenue.toLocaleString()}</div>
                  </div>
                  {/* Item popularity from menu sold counts */}
                  {(menu[c]||[]).map(item=>{
                    const itemOrders = orders.filter(o=>o.cafe===c&&o.items.some(i=>i.id===item.id));
                    const maxO = Math.max(1,...(menu[c]||[]).map(x=>orders.filter(o=>o.cafe===c&&o.items.some(i=>i.id===x.id)).length));
                    return (
                      <div key={item.id} style={{ display:"flex",alignItems:"center",gap:12,marginBottom:10 }}>
                        <span style={{ fontSize:20 }}>{item.img}</span>
                        <div style={{ flex:1 }}>
                          <div style={{ display:"flex",justifyContent:"space-between",marginBottom:4 }}>
                            <span style={{ fontSize:13,fontWeight:600 }}>{item.name}</span>
                            <span style={{ color:colors[ci],fontWeight:700,fontSize:13 }}>{itemOrders.length} orders</span>
                          </div>
                          <div style={{ background:"rgba(255,255,255,0.06)",borderRadius:6,height:6 }}>
                            <div style={{ background:colors[ci],height:"100%",borderRadius:6,width:`${(itemOrders.length/maxO)*100}%`,transition:"width .8s ease" }} />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        )}

        {/* ── COMPLAINTS ── */}
        {tab==="complaints" && (
          <div className="anim">
            <h2 style={{ marginBottom:20,fontSize:22 }}>📣 Complaints Manager</h2>
            {complaints.length===0 && <div style={{ background:"#1E293B",borderRadius:16,padding:40,textAlign:"center",color:"rgba(255,255,255,0.35)" }}>No complaints. All good! 🎉</div>}
            {complaints.map(c=>(
              <div key={c.id} style={{ background:"#1E293B",borderRadius:18,padding:22,marginBottom:16,border:"1px solid rgba(255,255,255,0.06)" }}>
                <div style={{ display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:10 }}>
                  <div style={{ flex:1 }}>
                    <div style={{ fontWeight:700,fontSize:15,marginBottom:5 }}>{c.issue}</div>
                    <div style={{ fontSize:12,color:"rgba(255,255,255,0.35)" }}>{c.student} · <span style={{ color:"#38BDF8" }}>{c.cafe}</span> · {c.time}</div>
                  </div>
                  <StatusChip s={c.status} />
                </div>
                {c.vendorResponse && (
                  <div style={{ background:"rgba(16,185,129,0.08)",borderRadius:10,padding:"10px 14px",marginTop:10,borderLeft:"3px solid #10B981" }}>
                    <div style={{ fontSize:11,fontWeight:700,color:"#10B981",marginBottom:4 }}>Your Response</div>
                    <div style={{ fontSize:13,color:"rgba(255,255,255,0.7)" }}>{c.vendorResponse}</div>
                  </div>
                )}
                {c.status!=="Resolved" && (
                  <div style={{ marginTop:14 }}>
                    {aiResp[c.id] ? (
                      <div>
                        <div style={{ background:"rgba(56,189,248,0.07)",borderRadius:10,padding:"10px 14px",marginBottom:10,border:"1px solid rgba(56,189,248,0.15)" }}>
                          <div style={{ fontSize:11,fontWeight:700,color:"#38BDF8",marginBottom:6 }}>🤖 AI Draft Response</div>
                          <textarea value={aiResp[c.id]} onChange={e=>setAiResp(p=>({...p,[c.id]:e.target.value}))} style={{ width:"100%",background:"transparent",border:"none",color:"rgba(255,255,255,0.75)",fontFamily:"inherit",fontSize:13,resize:"vertical",minHeight:60 }} />
                        </div>
                        <div style={{ display:"flex",gap:10 }}>
                          <button onClick={()=>resolveComplaint(c.id,aiResp[c.id])} style={{ background:"#10B981",color:"white",border:"none",borderRadius:20,padding:"8px 18px",cursor:"pointer",fontWeight:800,fontFamily:"inherit",fontSize:13 }}>✔ Send & Resolve</button>
                          <button onClick={()=>setAiResp(p=>({...p,[c.id]:""}))} style={{ background:"rgba(255,255,255,0.06)",color:"rgba(255,255,255,0.5)",border:"1px solid rgba(255,255,255,0.1)",borderRadius:20,padding:"8px 18px",cursor:"pointer",fontFamily:"inherit",fontSize:13 }}>Discard</button>
                        </div>
                      </div>
                    ) : (
                      <div style={{ display:"flex",gap:10 }}>
                        <button onClick={()=>generateAIResponse(c)} disabled={aiLoading[c.id]} style={{ background:"rgba(56,189,248,0.12)",border:"1px solid #38BDF855",color:"#38BDF8",borderRadius:20,padding:"8px 18px",cursor:"pointer",fontWeight:700,fontFamily:"inherit",fontSize:13,display:"flex",alignItems:"center",gap:8 }}>
                          {aiLoading[c.id]?<><Spinner/>Generating…</>:"🤖 AI Draft Response"}
                        </button>
                        <button onClick={()=>resolveComplaint(c.id,"")} style={{ background:"rgba(16,185,129,0.1)",border:"1px solid #10B98155",color:"#10B981",borderRadius:20,padding:"8px 18px",cursor:"pointer",fontFamily:"inherit",fontSize:13 }}>Mark Resolved</button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}

            {/* Reviews */}
            <h2 style={{ marginTop:30,marginBottom:16,fontSize:20 }}>⭐ Student Reviews</h2>
            {reviews.map(r=>(
              <div key={r.id} style={{ background:"#1E293B",borderRadius:16,padding:"16px 18px",marginBottom:12,display:"flex",gap:13,border:"1px solid rgba(255,255,255,0.04)" }}>
                <div style={{ width:36,height:36,borderRadius:"50%",background:"#38BDF822",color:"#38BDF8",display:"flex",alignItems:"center",justifyContent:"center",fontWeight:800,flexShrink:0 }}>{r.avatar||r.student?.[0]?.toUpperCase()||"?"}</div>
                <div style={{ flex:1 }}>
                  <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:4 }}>
                    <span style={{ fontWeight:700,fontSize:14 }}>{r.student}</span>
                    <span style={{ fontSize:11,color:"rgba(255,255,255,0.3)" }}>{r.time}</span>
                  </div>
                  <div style={{ marginBottom:5 }}><Stars v={r.rating} sz={13} /></div>
                  <div style={{ color:"rgba(255,255,255,0.6)",fontSize:13 }}>{r.text}</div>
                  <div style={{ marginTop:6 }}><Chip label={r.cafe} color="#38BDF8" /></div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── MENU EDITOR ── */}
        {tab==="menu" && (
          <div className="anim">
            <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20 }}>
              <h2 style={{ fontSize:22 }}>📋 Menu Editor — {vendorCafe}</h2>
              <button onClick={()=>setShowAdd(p=>!p)} style={{ background:"#38BDF8",color:"#0F172A",border:"none",borderRadius:20,padding:"9px 20px",cursor:"pointer",fontWeight:800,fontFamily:"inherit",fontSize:13 }}>
                {showAdd?"✕ Cancel":"+ Add Item"}
              </button>
            </div>

            {showAdd && (
              <div style={{ background:"#1E293B",borderRadius:16,padding:22,marginBottom:20,border:"1px solid rgba(56,189,248,0.2)" }}>
                <h3 style={{ marginBottom:14,color:"#38BDF8",fontSize:15 }}>New Menu Item</h3>
                <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:12 }}>
                  {[{l:"Name",k:"name",ph:"e.g. Jollof Rice"},{l:"Price (₦)",k:"price",ph:"1200"},{l:"Prep Time (min)",k:"time",ph:"15"},{l:"Tag",k:"tag",ph:"Bestseller"}].map(f=>(
                    <div key={f.k}>
                      <label style={{ fontSize:10,letterSpacing:1.5,color:"rgba(255,255,255,0.35)",textTransform:"uppercase",display:"block",marginBottom:6 }}>{f.l}</label>
                      <input value={addForm[f.k]} onChange={e=>setAddForm(p=>({...p,[f.k]:e.target.value}))} placeholder={f.ph} style={{ width:"100%",background:"rgba(255,255,255,0.05)",border:"1px solid rgba(255,255,255,0.1)",borderRadius:8,padding:"9px 12px",color:"white",fontFamily:"inherit",fontSize:14 }} />
                    </div>
                  ))}
                </div>
                <div style={{ marginBottom:12 }}>
                  <label style={{ fontSize:10,letterSpacing:1.5,color:"rgba(255,255,255,0.35)",textTransform:"uppercase",display:"block",marginBottom:8 }}>Emoji Icon</label>
                  <div style={{ display:"flex",flexWrap:"wrap",gap:8 }}>
                    {EMOJIS.map(e=>(
                      <button key={e} onClick={()=>setAddForm(p=>({...p,img:e}))} style={{ background:addForm.img===e?"#38BDF8":"rgba(255,255,255,0.06)",border:"none",borderRadius:8,padding:"6px 10px",cursor:"pointer",fontSize:20 }}>{e}</button>
                    ))}
                  </div>
                </div>
                <button onClick={addNewItem} style={{ background:"#38BDF8",color:"#0F172A",border:"none",borderRadius:12,padding:"11px 24px",cursor:"pointer",fontWeight:800,fontFamily:"inherit",fontSize:14 }}>Add to Menu</button>
              </div>
            )}

            {/* Existing items */}
            {(menu[vendorCafe]||[]).map(item=>(
              <div key={item.id} style={{ background:"#1E293B",borderRadius:16,padding:"16px 18px",marginBottom:12,border:"1px solid rgba(255,255,255,0.05)" }}>
                {editItem?.id===item.id ? (
                  <div>
                    <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:10 }}>
                      {[{l:"Name",k:"name"},{l:"Price",k:"price"},{l:"Time(min)",k:"time"},{l:"Tag",k:"tag"}].map(f=>(
                        <div key={f.k}>
                          <label style={{ fontSize:10,color:"rgba(255,255,255,0.35)",textTransform:"uppercase",display:"block",marginBottom:5 }}>{f.l}</label>
                          <input value={editItem[f.k]} onChange={e=>setEditItem(p=>({...p,[f.k]:e.target.value}))} style={{ width:"100%",background:"rgba(255,255,255,0.06)",border:"1px solid rgba(255,255,255,0.12)",borderRadius:8,padding:"8px 12px",color:"white",fontFamily:"inherit",fontSize:14 }} />
                        </div>
                      ))}
                    </div>
                    <div style={{ display:"flex",gap:8 }}>
                      <button onClick={saveEditItem} style={{ background:"#10B981",color:"white",border:"none",borderRadius:20,padding:"7px 16px",cursor:"pointer",fontWeight:800,fontFamily:"inherit",fontSize:13 }}>Save</button>
                      <button onClick={()=>setEditItem(null)} style={{ background:"rgba(255,255,255,0.06)",color:"rgba(255,255,255,0.5)",border:"1px solid rgba(255,255,255,0.1)",borderRadius:20,padding:"7px 16px",cursor:"pointer",fontFamily:"inherit",fontSize:13 }}>Cancel</button>
                    </div>
                  </div>
                ) : (
                  <div style={{ display:"flex",alignItems:"center",gap:14 }}>
                    <span style={{ fontSize:28 }}>{item.img}</span>
                    <div style={{ flex:1 }}>
                      <div style={{ fontWeight:700,fontSize:14 }}>{item.name}</div>
                      <div style={{ color:"rgba(255,255,255,0.4)",fontSize:12 }}>₦{item.price?.toLocaleString()} · {item.time} min{item.tag?` · ${item.tag}`:""}</div>
                    </div>
                    <div style={{ display:"flex",alignItems:"center",gap:10 }}>
                      <button onClick={()=>toggleAvail(vendorCafe,item.id)} style={{ background:item.available?"rgba(16,185,129,0.15)":"rgba(239,68,68,0.15)",color:item.available?"#10B981":"#EF4444",border:`1px solid ${item.available?"#10B98144":"#EF444444"}`,borderRadius:20,padding:"5px 12px",cursor:"pointer",fontSize:12,fontWeight:700,fontFamily:"inherit" }}>
                        {item.available?"● On":"● Off"}
                      </button>
                      <button onClick={()=>setEditItem({...item})} style={{ background:"rgba(56,189,248,0.1)",color:"#38BDF8",border:"1px solid #38BDF844",borderRadius:20,padding:"5px 12px",cursor:"pointer",fontSize:12,fontFamily:"inherit" }}>Edit</button>
                      <button onClick={()=>deleteItem(vendorCafe,item.id)} style={{ background:"rgba(239,68,68,0.1)",color:"#EF4444",border:"1px solid #EF444444",borderRadius:20,padding:"5px 12px",cursor:"pointer",fontSize:12,fontFamily:"inherit" }}>Del</button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// ADMIN APP
// ═══════════════════════════════════════════════════════════════════════════════
function AdminApp({ orders, reviews, complaints, menu, saveOrders, saveComplaints, saveMenu, onExit }) {
  const [tab, setTab] = useState("overview");
  const [aiInsight, setAiInsight] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [filterCafe, setFilterCafe] = useState("All");

  const totalRevenue = orders.reduce((a,b)=>a+b.total,0);
  const delivered = orders.filter(o=>o.status==="Delivered").length;
  const pending = orders.filter(o=>o.status==="Preparing").length;
  const avgRating = reviews.length>0?(reviews.reduce((a,b)=>a+b.rating,0)/reviews.length).toFixed(1):"—";

  const getAIInsight = async () => {
    setAiLoading(true);
    try {
      const summary = {
        totalOrders: orders.length, totalRevenue,
        cafeBreakdown: CAFES.map(c=>({ cafe:c, orders:orders.filter(o=>o.cafe===c).length, revenue:orders.filter(o=>o.cafe===c).reduce((a,b)=>a+b.total,0) })),
        topPayment: PAYMENT_METHODS.map(p=>({method:p.label,count:orders.filter(o=>o.payment===p.id).length})),
        avgRating, openComplaints: complaints.filter(c=>c.status!=="Resolved").length,
      };
      const insight = await askAI(
        `You are a data analyst for Landmark University's Campus Chop Hub cafeteria system. Analyze the operational data and give 3-4 specific, actionable insights and recommendations. Be concise, use bullet points, and focus on improving student satisfaction and revenue. Use plain text, no markdown.`,
        `Operational data: ${JSON.stringify(summary)}`
      );
      setAiInsight(insight);
    } catch { setAiInsight("AI insight unavailable. Check connection."); }
    setAiLoading(false);
  };

  const filteredOrders = filterCafe==="All"?orders:orders.filter(o=>o.cafe===filterCafe);

  const TABS = [{id:"overview",icon:"🏠",label:"Overview"},{id:"orders",icon:"📦",label:"All Orders"},{id:"data",icon:"📊",label:"Reports"},{id:"ai",icon:"🤖",label:"AI Insights"}];
  const ACCENT = "#A78BFA";

  return (
    <div style={{ minHeight:"100vh",background:"#0A0F1E",fontFamily:"Georgia,serif",color:"white" }}>
      {/* Header */}
      <div style={{ background:"linear-gradient(90deg,#0A0F1E,#161B35)",padding:"14px 22px",display:"flex",alignItems:"center",justifyContent:"space-between",position:"sticky",top:0,zIndex:200,borderBottom:"1px solid rgba(167,139,250,0.15)" }}>
        <div style={{ display:"flex",alignItems:"center",gap:10 }}>
          <div style={{ width:38,height:38,borderRadius:10,background:"#A78BFA22",border:"1px solid #A78BFA44",display:"flex",alignItems:"center",justifyContent:"center",fontSize:20 }}>🛡️</div>
          <div>
            <div style={{ color:ACCENT,fontWeight:900,fontSize:15 }}>Admin Control Centre</div>
            <div style={{ color:"rgba(255,255,255,0.3)",fontSize:10,letterSpacing:2,textTransform:"uppercase" }}>Campus Chop Hub · LMU</div>
          </div>
        </div>
        <button onClick={onExit} style={{ background:"rgba(255,255,255,0.05)",border:"1px solid rgba(255,255,255,0.1)",color:"rgba(255,255,255,0.5)",borderRadius:20,padding:"6px 14px",cursor:"pointer",fontSize:12 }}>← Back</button>
      </div>

      {/* Tab bar */}
      <div style={{ background:"#161B35",borderBottom:"1px solid rgba(167,139,250,0.08)",display:"flex",overflowX:"auto",position:"sticky",top:64,zIndex:190 }}>
        {TABS.map(t=>(
          <button key={t.id} onClick={()=>setTab(t.id)} style={{ flex:1,padding:"13px 6px",background:"none",border:"none",borderBottom:tab===t.id?`3px solid ${ACCENT}`:"3px solid transparent",fontWeight:tab===t.id?800:500,color:tab===t.id?ACCENT:"rgba(255,255,255,0.35)",cursor:"pointer",fontSize:"clamp(11px,2vw,13px)",fontFamily:"inherit",whiteSpace:"nowrap",transition:"all .2s" }}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      <div style={{ maxWidth:960,margin:"0 auto",padding:"22px 14px" }}>

        {/* ── OVERVIEW ── */}
        {tab==="overview" && (
          <div className="anim">
            <h2 style={{ marginBottom:20,fontSize:22,color:ACCENT }}>Platform Overview</h2>
            {/* KPI grid */}
            <div style={{ display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(150px,1fr))",gap:14,marginBottom:28 }}>
              {[
                {label:"Total Orders",   val:orders.length,                  icon:"📦", color:ACCENT},
                {label:"Revenue",        val:`₦${(totalRevenue/1000).toFixed(1)}k`, icon:"💰", color:"#F59E0B"},
                {label:"Delivered",      val:delivered,                      icon:"✅", color:"#10B981"},
                {label:"In Progress",    val:pending,                        icon:"🔄", color:"#F472B6"},
                {label:"Avg Rating",     val:avgRating+"★",                  icon:"⭐", color:"#FBBF24"},
                {label:"Open Complaints",val:complaints.filter(c=>c.status!=="Resolved").length, icon:"📣", color:"#EF4444"},
                {label:"Reviews",        val:reviews.length,                 icon:"💬", color:"#38BDF8"},
                {label:"Menu Items",     val:Object.values(menu).flat().length, icon:"🍽️", color:"#A3E635"},
              ].map(k=>(
                <div key={k.label} style={{ background:"#161B35",borderRadius:16,padding:"18px 16px",border:`1px solid ${k.color}18` }}>
                  <div style={{ fontSize:24,marginBottom:8 }}>{k.icon}</div>
                  <div style={{ fontSize:22,fontWeight:900,color:k.color }}>{k.val}</div>
                  <div style={{ fontSize:11,color:"rgba(255,255,255,0.35)",marginTop:4,letterSpacing:.3 }}>{k.label}</div>
                </div>
              ))}
            </div>

            {/* Cafe performance */}
            <div style={{ background:"#161B35",borderRadius:18,padding:24,marginBottom:20 }}>
              <h3 style={{ marginBottom:16,color:ACCENT,fontSize:16 }}>Cafeteria Performance</h3>
              {CAFES.map((c,i)=>{
                const co=orders.filter(o=>o.cafe===c);
                const rev=co.reduce((a,b)=>a+b.total,0);
                const colors=[ACCENT,"#F59E0B","#10B981","#F472B6"];
                const maxRev=Math.max(1,...CAFES.map(x=>orders.filter(o=>o.cafe===x).reduce((a,b)=>a+b.total,0)));
                return (
                  <div key={c} style={{ marginBottom:14 }}>
                    <div style={{ display:"flex",justifyContent:"space-between",marginBottom:5 }}>
                      <span style={{ fontWeight:700,fontSize:14 }}>{c}</span>
                      <span style={{ color:colors[i],fontWeight:800 }}>{co.length} orders · ₦{rev.toLocaleString()}</span>
                    </div>
                    <div style={{ background:"rgba(255,255,255,0.05)",borderRadius:8,height:10,overflow:"hidden" }}>
                      <div style={{ background:colors[i],height:"100%",borderRadius:8,width:`${rev/maxRev*100}%`,transition:"width .8s ease" }} />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Recent activity */}
            <div style={{ background:"#161B35",borderRadius:18,padding:24 }}>
              <h3 style={{ marginBottom:14,color:ACCENT,fontSize:16 }}>Recent Orders</h3>
              {orders.slice(0,5).map(o=>(
                <div key={o.id} style={{ display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 0",borderBottom:"1px solid rgba(255,255,255,0.04)" }}>
                  <div>
                    <div style={{ fontWeight:600,fontSize:14 }}>{o.studentName} · {o.cafe}</div>
                    <div style={{ fontSize:12,color:"rgba(255,255,255,0.35)" }}>{o.hostel} · {o.timestamp}</div>
                  </div>
                  <div style={{ display:"flex",gap:10,alignItems:"center" }}>
                    <span style={{ color:ACCENT,fontWeight:800 }}>₦{o.total.toLocaleString()}</span>
                    <StatusChip s={o.status} />
                  </div>
                </div>
              ))}
              {orders.length===0&&<div style={{ color:"rgba(255,255,255,0.3)",textAlign:"center",padding:16 }}>No orders yet.</div>}
            </div>
          </div>
        )}

        {/* ── ALL ORDERS ── */}
        {tab==="orders" && (
          <div className="anim">
            <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20 }}>
              <h2 style={{ fontSize:22,color:ACCENT }}>All Orders ({filteredOrders.length})</h2>
              <select value={filterCafe} onChange={e=>setFilterCafe(e.target.value)} style={{ background:"rgba(255,255,255,0.05)",border:"1px solid rgba(167,139,250,0.2)",color:"white",borderRadius:20,padding:"7px 14px",fontFamily:"inherit",fontSize:13 }}>
                <option>All</option>
                {CAFES.map(c=><option key={c} style={{ background:"#161B35" }}>{c}</option>)}
              </select>
            </div>
            {filteredOrders.length===0&&<div style={{ background:"#161B35",borderRadius:16,padding:40,textAlign:"center",color:"rgba(255,255,255,0.3)" }}>No orders found.</div>}
            {filteredOrders.map(o=>(
              <div key={o.id} style={{ background:"#161B35",borderRadius:16,padding:"18px 20px",marginBottom:12,border:"1px solid rgba(167,139,250,0.07)" }}>
                <div style={{ display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:8 }}>
                  <div>
                    <div style={{ fontWeight:700,fontSize:15 }}>{o.studentName}</div>
                    <div style={{ fontSize:12,color:"rgba(255,255,255,0.35)" }}>{o.cafe} · {o.hostel} Rm {o.room} · {o.timestamp}</div>
                  </div>
                  <div style={{ display:"flex",gap:8,alignItems:"center" }}>
                    <span style={{ color:ACCENT,fontWeight:900 }}>₦{o.total.toLocaleString()}</span>
                    <StatusChip s={o.status} />
                  </div>
                </div>
                <div style={{ display:"flex",gap:8,flexWrap:"wrap" }}>
                  {o.items.map(it=><span key={it.id} style={{ background:"rgba(255,255,255,0.04)",borderRadius:20,padding:"3px 10px",fontSize:12 }}>{it.img} {it.name} ×{it.qty}</span>)}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── REPORTS ── */}
        {tab==="data" && (
          <div className="anim">
            <h2 style={{ marginBottom:20,fontSize:22,color:ACCENT }}>Reports & Data</h2>
            {/* Payment breakdown */}
            <div style={{ background:"#161B35",borderRadius:18,padding:24,marginBottom:20 }}>
              <h3 style={{ marginBottom:16,fontSize:15,color:ACCENT }}>Payment Method Breakdown</h3>
              {PAYMENT_METHODS.map((pm,i)=>{
                const count=orders.filter(o=>o.payment===pm.id).length;
                const pct=orders.length>0?Math.round(count/orders.length*100):0;
                const colors=[ACCENT,"#F59E0B","#10B981"];
                return (
                  <div key={pm.id} style={{ display:"flex",alignItems:"center",gap:14,marginBottom:14 }}>
                    <span style={{ fontSize:22 }}>{pm.icon}</span>
                    <div style={{ flex:1 }}>
                      <div style={{ display:"flex",justifyContent:"space-between",marginBottom:5 }}>
                        <span style={{ fontSize:14,fontWeight:600 }}>{pm.label}</span>
                        <span style={{ color:colors[i],fontWeight:700 }}>{count} ({pct}%)</span>
                      </div>
                      <div style={{ background:"rgba(255,255,255,0.05)",borderRadius:6,height:8 }}>
                        <div style={{ background:colors[i],height:"100%",borderRadius:6,width:`${pct}%`,transition:"width .8s" }} />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Hostel breakdown */}
            <div style={{ background:"#161B35",borderRadius:18,padding:24,marginBottom:20 }}>
              <h3 style={{ marginBottom:16,fontSize:15,color:ACCENT }}>Orders by Hostel</h3>
              {HOSTELS.map(h=>{
                const count=orders.filter(o=>o.hostel===h).length;
                const maxH=Math.max(1,...HOSTELS.map(x=>orders.filter(o=>o.hostel===x).length));
                return (
                  <div key={h} style={{ marginBottom:12 }}>
                    <div style={{ display:"flex",justifyContent:"space-between",marginBottom:4 }}>
                      <span style={{ fontSize:13 }}>{h}</span>
                      <span style={{ color:ACCENT,fontWeight:700 }}>{count}</span>
                    </div>
                    <div style={{ background:"rgba(255,255,255,0.05)",borderRadius:6,height:7 }}>
                      <div style={{ background:ACCENT,height:"100%",borderRadius:6,width:`${count/maxH*100}%`,transition:"width .8s" }} />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Complaints summary */}
            <div style={{ background:"#161B35",borderRadius:18,padding:24 }}>
              <h3 style={{ marginBottom:14,fontSize:15,color:ACCENT }}>Complaints Summary</h3>
              <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:12 }}>
                {["Pending","In Review","Resolved"].map(s=>{
                  const count=complaints.filter(c=>c.status===s).length;
                  const colors={Pending:"#F59E0B","In Review":"#38BDF8",Resolved:"#10B981"};
                  return (
                    <div key={s} style={{ background:`${colors[s]}11`,border:`1px solid ${colors[s]}33`,borderRadius:12,padding:"14px 16px",textAlign:"center" }}>
                      <div style={{ fontSize:22,fontWeight:900,color:colors[s] }}>{count}</div>
                      <div style={{ fontSize:12,color:"rgba(255,255,255,0.4)",marginTop:3 }}>{s}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ── AI INSIGHTS ── */}
        {tab==="ai" && (
          <div className="anim">
            <h2 style={{ marginBottom:8,fontSize:22,color:ACCENT }}>🤖 AI Business Insights</h2>
            <p style={{ color:"rgba(255,255,255,0.4)",fontSize:14,marginBottom:24,lineHeight:1.6 }}>
              Let AI analyse your platform data and surface actionable recommendations to grow revenue and improve student satisfaction.
            </p>
            <div style={{ background:"#161B35",borderRadius:18,padding:28,marginBottom:20,border:"1px solid rgba(167,139,250,0.15)" }}>
              <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:14,marginBottom:22 }}>
                {[
                  {label:"Orders analysed",val:orders.length},
                  {label:"Revenue",val:`₦${totalRevenue.toLocaleString()}`},
                  {label:"Reviews",val:reviews.length},
                  {label:"Complaints",val:complaints.length},
                ].map(d=>(
                  <div key={d.label} style={{ background:"rgba(167,139,250,0.06)",borderRadius:12,padding:"14px 18px" }}>
                    <div style={{ fontSize:20,fontWeight:900,color:ACCENT }}>{d.val}</div>
                    <div style={{ fontSize:12,color:"rgba(255,255,255,0.4)",marginTop:3 }}>{d.label}</div>
                  </div>
                ))}
              </div>
              <button onClick={getAIInsight} disabled={aiLoading} style={{ background:aiLoading?"rgba(167,139,250,0.2)":`linear-gradient(90deg,#7C3AED,#A78BFA)`,color:"white",border:"none",borderRadius:14,padding:"14px 28px",cursor:aiLoading?"not-allowed":"pointer",fontWeight:800,fontFamily:"inherit",fontSize:15,display:"flex",alignItems:"center",gap:10,width:"100%",justifyContent:"center" }}>
                {aiLoading?<><Spinner/>Analysing your data…</>:"✨ Generate AI Insights"}
              </button>
            </div>

            {aiInsight && (
              <div style={{ background:"linear-gradient(135deg,#1A1035,#161B35)",borderRadius:18,padding:28,border:"1px solid rgba(167,139,250,0.25)",animation:"fadeIn .5s ease" }}>
                <div style={{ display:"flex",alignItems:"center",gap:10,marginBottom:16 }}>
                  <span style={{ fontSize:24 }}>🤖</span>
                  <div style={{ color:ACCENT,fontWeight:900,fontSize:16 }}>AI Analysis Report</div>
                </div>
                <div style={{ color:"rgba(255,255,255,0.75)",fontSize:14,lineHeight:1.8,whiteSpace:"pre-wrap" }}>{aiInsight}</div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
