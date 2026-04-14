// Student App - Main interface for ordering food
const { useState, useEffect, useRef, useCallback } = React;
const { THEME } = window.__LANDMARK__;
const { Button, Card, Input, Select, Chip, StatusChip, Stars, Spinner, Pulse } =
  window.__LANDMARK_COMPONENTS__;
const { CAFES, HOSTELS, PAYMENT_METHODS } = window.__LANDMARK_UTILS__;
const { askAI } = window.__LANDMARK_UTILS__.ai;
const { db } = window.__LANDMARK_UTILS__;

function StudentApp({ orders, reviews, complaints, menu, saveOrders, saveReviews, saveComplaints, onExit }) {
  const [tab, setTab] = useState("menu");
  const [cafe, setCafe] = useState("Cafe 1");
  const [cart, setCart] = useState([]);
  const [hostel, setHostel] = useState("");
  const [room, setRoom] = useState("");
  const [name, setName] = useState("");
  const [pay, setPay] = useState("wallet");
  const [myOrders, setMyOrders] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState(null);
  const [countdowns, setCountdowns] = useState({});

  // AI Chat State
  const [chatOpen, setChatOpen] = useState(false);
  const [chatMsgs, setChatMsgs] = useState([
    {
      role: "assistant",
      text: "Hi! 👋 I'm your Campus Chop AI. Tell me what you're craving or your budget!",
    },
  ]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const chatEnd = useRef(null);

  // Review Form State
  const [reviewForm, setReviewForm] = useState({
    cafe: "Cafe 1",
    rating: 5,
    text: "",
    student: "",
  });

  const totalQty = cart.reduce((a, b) => a + b.qty, 0);
  const totalAmt = cart.reduce((a, b) => a + b.price * b.qty, 0);

  const addItem = (item) =>
    setCart((p) => {
      const ex = p.find((c) => c.id === item.id);
      return ex
        ? p.map((c) => (c.id === item.id ? { ...c, qty: c.qty + 1 } : c))
        : [...p, { ...item, qty: 1 }];
    });

  const decItem = (id) =>
    setCart((p) =>
      p.map((c) => (c.id === id && c.qty > 1 ? { ...c, qty: c.qty - 1 } : c)).filter((c) => c.qty > 0)
    );

  const cartQty = (id) => cart.find((c) => c.id === id)?.qty || 0;

  const placeOrder = async () => {
    if (!hostel || !room || !name || cart.length === 0) return;
    setSubmitting(true);
    const deliveryTime = Math.max(...cart.map((c) => c.time)) + 5;
    const order = {
      id: Date.now().toString(),
      studentName: name,
      cafe,
      hostel,
      room,
      items: cart.map((c) => ({
        id: c.id,
        name: c.name,
        img: c.img,
        price: c.price,
        qty: c.qty,
      })),
      total: totalAmt,
      payment: pay,
      deliveryTime,
      status: "Preparing",
      createdAt: new Date().toISOString(),
      timestamp: new Date().toLocaleTimeString(),
    };
    const updated = [order, ...orders];
    await saveOrders(updated);
    setMyOrders((p) => [order, ...p]);
    setOrderSuccess(order);
    setCart([]);
    setTab("track");
    setCountdowns((p) => ({ ...p, [order.id]: deliveryTime * 60 }));
    setSubmitting(false);
  };

  // Countdown timer
  useEffect(() => {
    const timer = setInterval(() => {
      setCountdowns((p) => {
        const n = { ...p };
        Object.keys(n).forEach((k) => {
          if (n[k] > 0) n[k]--;
        });
        return n;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // AI Chat
  const sendChat = async () => {
    if (!chatInput.trim() || chatLoading) return;
    const msg = chatInput.trim();
    setChatInput("");
    setChatMsgs((p) => [...p, { role: "user", text: msg }]);
    setChatLoading(true);
    try {
      const menuSummary = Object.entries(menu)
        .map(
          ([c, items]) =>
            `${c}: ${items
              .filter((i) => i.available)
              .map((i) => `${i.name} (₦${i.price})`)
              .join(", ")}`
        )
        .join("\n");
      const reply = await askAI(
        `You are Campus Chop AI. Help students at Landmark University find meals. Be friendly and brief. Available menu:\n${menuSummary}`,
        msg
      );
      setChatMsgs((p) => [...p, { role: "assistant", text: reply }]);
    } catch {
      setChatMsgs((p) => [
        ...p,
        {
          role: "assistant",
          text: "Sorry, couldn't connect to AI. Try again later!",
        },
      ]);
    }
    setChatLoading(false);
  };

  useEffect(() => {
    chatEnd.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMsgs]);

  const submitReview = async () => {
    if (!reviewForm.text || !reviewForm.student) return;
    const r = {
      id: Date.now().toString(),
      ...reviewForm,
      avatar: reviewForm.student[0].toUpperCase(),
      time: "Just now",
      createdAt: new Date().toISOString(),
    };
    await saveReviews([r, ...reviews]);
    setReviewForm({ cafe: "Cafe 1", rating: 5, text: "", student: "" });
  };

  // Render different tabs
  const renderTab = () => {
    if (tab === "menu") {
      return (
        <MenuTab
          cafe={cafe}
          setCafe={setCafe}
          menu={menu}
          cartQty={cartQty}
          addItem={addItem}
          decItem={decItem}
          cart={cart}
          totalQty={totalQty}
          totalAmt={totalAmt}
        />
      );
    }
    if (tab === "checkout") {
      return (
        <CheckoutTab
          cart={cart}
          totalAmt={totalAmt}
          hostel={hostel}
          setHostel={setHostel}
          room={room}
          setRoom={setRoom}
          name={name}
          setName={setName}
          pay={pay}
          setPay={setPay}
          onSubmit={placeOrder}
          submitting={submitting}
          decItem={decItem}
        />
      );
    }
    if (tab === "track") {
      return (
        <TrackTab
          myOrders={myOrders}
          countdowns={countdowns}
        />
      );
    }
    if (tab === "reviews") {
      return (
        <ReviewsTab
          reviews={reviews}
          cafes={CAFES}
          onSubmit={submitReview}
          form={reviewForm}
          setForm={setReviewForm}
        />
      );
    }
  };

  return (
    <div style={{ minHeight: "100vh", background: THEME.dark, display: "flex" }}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; } }
      `}</style>

      {/* Sidebar Navigation */}
      <div
        style={{
          width: 260,
          background: THEME.card,
          borderRight: `1px solid ${THEME.border}`,
          padding: 20,
          display: "flex",
          flexDirection: "column",
          gap: 20,
          minHeight: "100vh",
        }}
      >
        <div>
          <h2
            style={{
              fontSize: 18,
              fontWeight: 700,
              color: THEME.primary,
              marginBottom: 4,
            }}
          >
            🍛 Campus Chop
          </h2>
          <p style={{ fontSize: 11, color: "rgba(255,255,255,0.5)" }}>
            Student Portal
          </p>
        </div>

        <nav style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {[
            { id: "menu", icon: "📋", label: "Menu & Order" },
            { id: "track", icon: "🚚", label: "Track Orders" },
            { id: "reviews", icon: "⭐", label: "Reviews" },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setTab(item.id)}
              style={{
                background: tab === item.id ? THEME.primary + "22" : "transparent",
                color: tab === item.id ? THEME.primary : "rgba(255,255,255,0.6)",
                border: "none",
                borderRadius: 8,
                padding: "12px 14px",
                cursor: "pointer",
                textAlign: "left",
                fontSize: 14,
                fontWeight: tab === item.id ? 600 : 500,
                transition: "all 0.2s",
              }}
              onMouseEnter={(e) => {
                if (tab !== item.id)
                  e.currentTarget.style.background = "rgba(255,255,255,0.05)";
              }}
              onMouseLeave={(e) => {
                if (tab !== item.id) e.currentTarget.style.background = "transparent";
              }}
            >
              <span style={{ marginRight: 8 }}>{item.icon}</span>
              {item.label}
            </button>
          ))}
        </nav>

        {totalQty > 0 && (
          <Card style={{ background: THEME.primary + "22", padding: 14 }}>
            <div
              style={{
                fontSize: 12,
                color: THEME.primary,
                fontWeight: 600,
                marginBottom: 8,
              }}
            >
              Cart Summary
            </div>
            <div
              style={{
                fontSize: 24,
                fontWeight: 700,
                color: THEME.primary,
                marginBottom: 12,
              }}
            >
              ₦{totalAmt.toLocaleString()}
            </div>
            <Button
              fullWidth
              onClick={() => setTab("checkout")}
              variant="primary"
              size="sm"
            >
              Checkout ({totalQty})
            </Button>
          </Card>
        )}

        <div style={{ flex: 1 }} />

        <Button
          fullWidth
          variant="ghost"
          onClick={onExit}
          style={{ color: THEME.warning }}
        >
          Exit
        </Button>
      </div>

      {/* Main Content */}
      <div style={{ flex: 1, padding: 32, overflow: "auto" }}>
        {renderTab()}
      </div>

      {/* AI Chat Float Button */}
      {!chatOpen && (
        <button
          onClick={() => setChatOpen(true)}
          style={{
            position: "fixed",
            bottom: 24,
            right: 24,
            width: 56,
            height: 56,
            borderRadius: "50%",
            background: THEME.primary,
            color: "#0A2E1C",
            border: "none",
            fontSize: 24,
            cursor: "pointer",
            boxShadow: `0 8px 30px ${THEME.primary}66`,
            transition: "all 0.2s",
            zIndex: 999,
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = "scale(1.1)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = "scale(1)";
          }}
        >
          💬
        </button>
      )}

      {/* AI Chat Modal */}
      {chatOpen && (
        <div
          style={{
            position: "fixed",
            bottom: 20,
            right: 20,
            width: 360,
            height: 500,
            background: THEME.card,
            border: `1px solid ${THEME.border}`,
            borderRadius: 12,
            display: "flex",
            flexDirection: "column",
            zIndex: 1000,
            boxShadow: "0 20px 60px rgba(0,0,0,0.4)",
          }}
        >
          {/* Header */}
          <div
            style={{
              padding: 16,
              background: THEME.primary,
              color: "#0A2E1C",
              borderRadius: "12px 12px 0 0",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              fontWeight: 700,
            }}
          >
            🤖 Campus AI
            <button
              onClick={() => setChatOpen(false)}
              style={{
                background: "none",
                border: "none",
                color: "#0A2E1C",
                cursor: "pointer",
                fontSize: 16,
              }}
            >
              ✕
            </button>
          </div>

          {/* Messages */}
          <div
            style={{
              flex: 1,
              overflowY: "auto",
              padding: 16,
              display: "flex",
              flexDirection: "column",
              gap: 12,
            }}
          >
            {chatMsgs.map((msg, i) => (
              <div
                key={i}
                style={{
                  alignSelf: msg.role === "user" ? "flex-end" : "flex-start",
                  maxWidth: "85%",
                }}
              >
                <div
                  style={{
                    background:
                      msg.role === "user"
                        ? THEME.primary + "22"
                        : "rgba(255,255,255,0.05)",
                    color: "white",
                    padding: "10px 14px",
                    borderRadius: 10,
                    fontSize: 13,
                    lineHeight: 1.5,
                  }}
                >
                  {msg.text}
                </div>
              </div>
            ))}
            {chatLoading && (
              <div style={{ alignSelf: "flex-start" }}>
                <Spinner />
              </div>
            )}
            <div ref={chatEnd} />
          </div>

          {/* Input */}
          <div
            style={{
              padding: 12,
              borderTop: `1px solid ${THEME.border}`,
              display: "flex",
              gap: 8,
            }}
          >
            <input
              type="text"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && sendChat()}
              placeholder="Ask me anything..."
              style={{
                flex: 1,
                background: "rgba(0,0,0,0.3)",
                border: `1px solid ${THEME.border}`,
                borderRadius: 6,
                padding: "8px 12px",
                color: "white",
                fontSize: 13,
              }}
              disabled={chatLoading}
            />
            <button
              onClick={sendChat}
              disabled={chatLoading}
              style={{
                background: THEME.primary,
                color: "#0A2E1C",
                border: "none",
                borderRadius: 6,
                padding: "8px 12px",
                cursor: chatLoading ? "not-allowed" : "pointer",
                fontWeight: 600,
              }}
            >
              Send
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// Menu Tab
function MenuTab({ cafe, setCafe, menu, cartQty, addItem, decItem, cart, totalQty, totalAmt }) {
  return (
    <div className="anim">
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ marginBottom: 8, fontSize: 24, fontWeight: 700 }}>
          📍 Select Cafeteria
        </h2>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          {["Cafe 1", "Cafe 2", "Cafe 3", "Back of Cafe"].map((c) => (
            <button
              key={c}
              onClick={() => setCafe(c)}
              style={{
                background:
                  cafe === c
                    ? THEME.primary
                    : "rgba(255,255,255,0.05)",
                color: cafe === c ? "#0A2E1C" : "white",
                border: "none",
                borderRadius: 8,
                padding: "10px 16px",
                cursor: "pointer",
                fontWeight: cafe === c ? 700 : 500,
                transition: "all 0.2s",
              }}
              onMouseEnter={(e) => {
                if (cafe !== c)
                  e.currentTarget.style.background = "rgba(255,255,255,0.1)";
              }}
              onMouseLeave={(e) => {
                if (cafe !== c)
                  e.currentTarget.style.background = "rgba(255,255,255,0.05)";
              }}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      <h3 style={{ marginBottom: 16, fontSize: 18, fontWeight: 700 }}>
        {cafe} Menu
      </h3>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
          gap: 16,
          marginBottom: 24,
        }}
      >
        {(menu[cafe] || []).map((item) => (
          <Card key={item.id} className="card-hover">
            <div
              style={{
                fontSize: 36,
                marginBottom: 12,
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
              }}
            >
              <span>{item.img}</span>
              {item.tag && <Chip label={item.tag} color={THEME.primary} />}
            </div>

            <h4
              style={{
                fontWeight: 700,
                marginBottom: 6,
                fontSize: 15,
                height: 40,
                overflow: "hidden",
              }}
            >
              {item.name}
            </h4>

            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 12,
                fontSize: 13,
                color: "rgba(255,255,255,0.7)",
              }}
            >
              <span>⏱️ {item.time}min</span>
              <span style={{ fontWeight: 700, color: THEME.primary }}>
                ₦{item.price}
              </span>
            </div>

            {item.available ? (
              <div style={{ display: "flex", gap: 8 }}>
                {cartQty(item.id) === 0 ? (
                  <Button
                    fullWidth
                    size="sm"
                    onClick={() => addItem(item)}
                  >
                    Add to Cart
                  </Button>
                ) : (
                  <>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => decItem(item.id)}
                    >
                      −
                    </Button>
                    <div
                      style={{
                        flex: 1,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        background: "rgba(255,255,255,0.05)",
                        borderRadius: 6,
                        fontWeight: 600,
                      }}
                    >
                      {cartQty(item.id)}
                    </div>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => addItem(item)}
                    >
                      +
                    </Button>
                  </>
                )}
              </div>
            ) : (
              <div
                style={{
                  background: THEME.warning + "22",
                  color: THEME.warning,
                  padding: 8,
                  borderRadius: 6,
                  textAlign: "center",
                  fontSize: 13,
                  fontWeight: 600,
                }}
              >
                Out of Stock
              </div>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
}

// Checkout Tab
function CheckoutTab({
  cart,
  totalAmt,
  hostel,
  setHostel,
  room,
  setRoom,
  name,
  setName,
  pay,
  setPay,
  onSubmit,
  submitting,
  decItem,
}) {
  return (
    <div className="anim" style={{ maxWidth: 800 }}>
      <h2 style={{ marginBottom: 24, fontSize: 24, fontWeight: 700 }}>
        🛒 Order Summary
      </h2>

      {/* Order Items */}
      <Card style={{ marginBottom: 24 }}>
        <h3
          style={{
            fontSize: 16,
            fontWeight: 700,
            marginBottom: 16,
            paddingBottom: 12,
            borderBottom: `1px solid ${THEME.border}`,
          }}
        >
          Items in Cart
        </h3>
        {cart.map((item) => (
          <div
            key={item.id}
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "12px 0",
              borderBottom: `1px solid ${THEME.border}`,
            }}
          >
            <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
              <span style={{ fontSize: 24 }}>{item.img}</span>
              <div>
                <div style={{ fontWeight: 600, marginBottom: 2 }}>
                  {item.name}
                </div>
                <div
                  style={{
                    fontSize: 12,
                    color: "rgba(255,255,255,0.5)",
                  }}
                >
                  ₦{item.price} × {item.qty}
                </div>
              </div>
            </div>
            <div
              style={{
                display: "flex",
                gap: 8,
                alignItems: "center",
              }}
            >
              <div
                style={{
                  fontWeight: 700,
                  minWidth: 70,
                  textAlign: "right",
                }}
              >
                ₦{(item.price * item.qty).toLocaleString()}
              </div>
              <button
                onClick={() => decItem(item.id)}
                style={{
                  background: THEME.warning + "33",
                  color: THEME.warning,
                  border: "none",
                  width: 28,
                  height: 28,
                  borderRadius: 4,
                  cursor: "pointer",
                  fontWeight: 700,
                }}
              >
                ×
              </button>
            </div>
          </div>
        ))}
        <div
          style={{
            marginTop: 16,
            padding: "12px 0",
            borderTop: `2px solid ${THEME.primary}44`,
            fontSize: 18,
            fontWeight: 700,
            color: THEME.primary,
            display: "flex",
            justifyContent: "space-between",
          }}
        >
          <span>Total:</span>
          <span>₦{totalAmt.toLocaleString()}</span>
        </div>
      </Card>

      {/* Delivery Info */}
      <Card style={{ marginBottom: 24 }}>
        <h3
          style={{
            fontSize: 16,
            fontWeight: 700,
            marginBottom: 16,
            paddingBottom: 12,
            borderBottom: `1px solid ${THEME.border}`,
          }}
        >
          Delivery Information
        </h3>
        <div style={{ display: "grid", gap: 14 }}>
          <Input
            label="Full Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            icon="👤"
            placeholder="Your name"
          />
          <Select
            label="Hostel"
            value={hostel}
            onChange={setHostel}
            options={["Select hostel", ...["Joseph Hall", "Daniel Hall", "Abigail Hall", "Abraham Hall", "Sarah Hall", "Deborah Hall", "Jacob Hall"]]}
          />
          <Input
            label="Room Number"
            value={room}
            onChange={(e) => setRoom(e.target.value)}
            icon="🚪"
            placeholder="e.g., 101"
          />
        </div>
      </Card>

      {/* Payment */}
      <Card style={{ marginBottom: 24 }}>
        <h3
          style={{
            fontSize: 16,
            fontWeight: 700,
            marginBottom: 16,
            paddingBottom: 12,
            borderBottom: `1px solid ${THEME.border}`,
          }}
        >
          Payment Method
        </h3>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          {[
            { id: "wallet", label: "💳 Wallet" },
            { id: "transfer", label: "🏦 Transfer" },
            { id: "cash", label: "💵 COD" },
          ].map((method) => (
            <button
              key={method.id}
              onClick={() => setPay(method.id)}
              style={{
                background:
                  pay === method.id
                    ? THEME.primary + "33"
                    : "rgba(255,255,255,0.05)",
                color: pay === method.id ? THEME.primary : "white",
                border:
                  pay === method.id
                    ? `2px solid ${THEME.primary}`
                    : `1px solid ${THEME.border}`,
                borderRadius: 8,
                padding: "12px 16px",
                cursor: "pointer",
                fontWeight: 600,
                transition: "all 0.2s",
              }}
            >
              {method.label}
            </button>
          ))}
        </div>
      </Card>

      {/* Submit Button */}
      <Button
        fullWidth
        size="lg"
        onClick={onSubmit}
        loading={submitting}
      >
        {submitting ? "Processing..." : "Place Order"}
      </Button>
    </div>
  );
}

// Track Orders Tab
function TrackTab({ myOrders, countdowns }) {
  if (myOrders.length === 0) {
    return (
      <div
        style={{
          textAlign: "center",
          padding: 40,
          color: "rgba(255,255,255,0.5)",
        }}
      >
        <div style={{ fontSize: 48, marginBottom: 16 }}>📭</div>
        <p>No orders yet. Start by browsing the menu!</p>
      </div>
    );
  }

  return (
    <div className="anim">
      <h2 style={{ marginBottom: 24, fontSize: 24, fontWeight: 700 }}>
        🚚 Your Orders
      </h2>
      <div style={{ display: "grid", gap: 16 }}>
        {myOrders.map((order) => {
          const mins = Math.floor(countdowns[order.id] / 60) || 0;
          const secs = (countdowns[order.id] % 60) || 0;
          return (
            <Card key={order.id}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "start",
                  marginBottom: 16,
                }}
              >
                <div>
                  <div style={{ fontSize: 14, color: "rgba(255,255,255,0.6)" }}>
                    Order #{order.id.slice(-6)}
                  </div>
                  <div style={{ fontSize: 16, fontWeight: 700, marginTop: 2 }}>
                    {order.cafe}
                  </div>
                </div>
                <StatusChip status={order.status} />
              </div>

              <div
                style={{
                  padding: "12px 0",
                  borderTop: `1px solid ${THEME.border}`,
                  borderBottom: `1px solid ${THEME.border}`,
                  marginBottom: 16,
                }}
              >
                {order.items.map((item) => (
                  <div key={item.id} style={{ fontSize: 13, marginBottom: 4 }}>
                    <span style={{ marginRight: 8 }}>{item.img}</span>
                    <span>{item.name}</span>
                    <span style={{ color: "rgba(255,255,255,0.5)", marginLeft: 8 }}>
                      ×{item.qty}
                    </span>
                  </div>
                ))}
              </div>

              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <div>
                  <div style={{ fontSize: 12, color: "rgba(255,255,255,0.5)" }}>
                    {order.hostel}, Room {order.room}
                  </div>
                  <div
                    style={{
                      fontSize: 14,
                      fontWeight: 700,
                      color: THEME.primary,
                      marginTop: 4,
                    }}
                  >
                    ₦{order.total.toLocaleString()}
                  </div>
                </div>
                {order.status === "Preparing" && (
                  <div
                    style={{
                      textAlign: "right",
                      background: THEME.warning + "22",
                      padding: "8px 12px",
                      borderRadius: 6,
                      minWidth: 100,
                    }}
                  >
                    <Pulse color={THEME.warning} />
                    <div
                      style={{
                        fontSize: 18,
                        fontWeight: 700,
                        color: THEME.warning,
                      }}
                    >
                      {mins}:{secs.toString().padStart(2, "0")}
                    </div>
                    <div
                      style={{
                        fontSize: 10,
                        color: THEME.warning,
                      }}
                    >
                      ETA
                    </div>
                  </div>
                )}
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

// Reviews Tab
function ReviewsTab({ reviews, cafes, onSubmit, form, setForm }) {
  return (
    <div className="anim" style={{ maxWidth: 800 }}>
      <h2 style={{ marginBottom: 24, fontSize: 24, fontWeight: 700 }}>
        ⭐ Reviews & Ratings
      </h2>

      {/* Submit Review Form */}
      <Card style={{ marginBottom: 24 }}>
        <h3 style={{ marginBottom: 16, fontSize: 16, fontWeight: 700 }}>
          Share Your Experience
        </h3>
        <div style={{ display: "grid", gap: 14 }}>
          <Select
            label="Cafeteria"
            value={form.cafe}
            onChange={(val) => setForm({ ...form, cafe: val })}
            options={cafes}
          />
          <div>
            <label
              style={{
                display: "block",
                marginBottom: 8,
                fontWeight: 600,
                fontSize: 13,
              }}
            >
              Rating
            </label>
            <Stars
              value={form.rating}
              onChange={(val) => setForm({ ...form, rating: val })}
              size={24}
            />
          </div>
          <Input
            label="Your Name"
            value={form.student}
            onChange={(e) => setForm({ ...form, student: e.target.value })}
            placeholder="Name"
          />
          <div>
            <label
              style={{
                display: "block",
                marginBottom: 8,
                fontWeight: 600,
                fontSize: 13,
              }}
            >
              Review
            </label>
            <textarea
              value={form.text}
              onChange={(e) => setForm({ ...form, text: e.target.value })}
              placeholder="Share your experience..."
              style={{
                width: "100%",
                background: "rgba(0,0,0,0.3)",
                border: `1px solid ${THEME.border}`,
                borderRadius: 8,
                padding: 12,
                color: "white",
                fontSize: 13,
                minHeight: 100,
                fontFamily: "inherit",
                resize: "none",
              }}
            />
          </div>
          <Button fullWidth onClick={onSubmit}>
            Post Review
          </Button>
        </div>
      </Card>

      {/* Reviews List */}
      <h3 style={{ marginBottom: 16, fontSize: 16, fontWeight: 700 }}>
        Latest Reviews ({reviews.length})
      </h3>
      <div style={{ display: "grid", gap: 12 }}>
        {reviews.slice(0, 10).map((review) => (
          <Card key={review.id}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginBottom: 10,
              }}
            >
              <div>
                <div style={{ fontWeight: 700, marginBottom: 4 }}>
                  {review.student}
                </div>
                <div
                  style={{
                    fontSize: 12,
                    color: "rgba(255,255,255,0.5)",
                  }}
                >
                  {review.cafe} • {review.time}
                </div>
              </div>
              <Stars value={review.rating} size={16} />
            </div>
            <p
              style={{
                fontSize: 13,
                lineHeight: 1.5,
                color: "rgba(255,255,255,0.8)",
              }}
            >
              {review.text}
            </p>
          </Card>
        ))}
      </div>
    </div>
  );
}

export default StudentApp;
