import { useState, useRef, useEffect } from "react";
import { Bot, User, Send, MessageCircle, X } from "lucide-react";

const API_BASE = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000/api";

const STARTERS_SME = [
  "PD score 28% nghĩa là gì?",
  "Cải thiện tín dụng trước khi vay?",
  "Altman Z-score 1.8 có lo không?",
];
const STARTERS_BANKER = [
  "Giải thích SHAP value âm trên ROA",
  "So sánh Z-score với chuẩn ngành",
  "Mô hình Ensemble tính PD thế nào?",
];

function BotIcon() {
  return (
    <div style={{
      width: 36, height: 36, borderRadius: "50%",
      background: "linear-gradient(135deg, #0f172a 0%, #0284c7 100%)",
      display: "flex", alignItems: "center", justifyContent: "center",
      flexShrink: 0, color: "#fff", boxShadow: "0 4px 10px rgba(15,23,42,0.2)"
    }}>
      <Bot size={20} />
    </div>
  );
}

function UserIcon() {
  return (
    <div style={{
      width: 36, height: 36, borderRadius: "50%",
      background: "#f0f9ff", border: "1px solid rgba(2, 132, 199, 0.15)",
      display: "flex", alignItems: "center", justifyContent: "center",
      flexShrink: 0, color: "#0284c7", boxShadow: "0 2px 5px rgba(2,132,199,0.05)"
    }}>
      <User size={20} />
    </div>
  );
}

function TypingDots() {
  return (
    <div style={{ display: "flex", gap: 5, padding: "10px 4px" }}>
      {[0, 1, 2].map(i => (
        <div key={i} style={{
          width: 6, height: 6, borderRadius: "50%", background: "#0284c7",
          animation: "finbot-bounce 1.4s ease-in-out infinite",
          animationDelay: `${i * 0.16}s`,
        }} />
      ))}
    </div>
  );
}

export default function FinBot({ companyContext = null }) {
  const [messages, setMessages]   = useState([]);
  const [input, setInput]         = useState("");
  const [loading, setLoading]     = useState(false);
  const [isOpen, setIsOpen]       = useState(false);
  const [userType, setUserType]   = useState(null); // "sme" | "banker"
  
  const [companies, setCompanies] = useState([]);
  const [totalCompanies, setTotalCompanies] = useState(0);
  const [showDropdown, setShowDropdown] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  
  const bottomRef = useRef(null);

  useEffect(() => {
    fetch(`${API_BASE}/data/companies`)
      .then(res => res.json())
      .then(data => {
        if(data && data.companies) {
          setCompanies(data.companies);
          setTotalCompanies(data.total);
        }
      })
      .catch(err => console.error("Failed to fetch companies:", err));
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  useEffect(() => {
    if (isOpen && messages.length === 0) {
      setMessages([{
        role: "assistant",
        content: `Xin chào! Tôi là **FinBot AI** — chuyên gia tư vấn rủi ro tín dụng.\n\nBạn là **chủ doanh nghiệp** hay **cán bộ ngân hàng**? Tôi sẽ điều chỉnh cách phân tích phù hợp.`,
      }]);
    }
  }, [isOpen]);

  const sendMessage = async (text) => {
    const userText = text || input.trim();
    if (!userText || loading) return;
    setInput("");
    setShowDropdown(false);

    const newHistory = [...messages, { role: "user", content: userText }];
    setMessages(newHistory);
    setLoading(true);

    try {
      const res = await fetch(`${API_BASE}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userText,
          history: messages.map(m => ({ role: m.role, content: m.content })),
          context: companyContext,
          stream: false,
        }),
      });

      if (!res.ok) {
        if (res.status === 429) {
          throw new Error("Bạn đã chat quá nhanh. Vui lòng đợi 1 phút.");
        }
        const err = await res.json();
        throw new Error(err.detail || "Lỗi kết nối");
      }

      const data = await res.json();
      setMessages(prev => [...prev, { 
        role: "assistant", 
        content: data.reply,
        company_data: data.company_data 
      }]);
    } catch (err) {
      setMessages(prev => [...prev, {
        role: "assistant",
        content: `Xin lỗi, đã xảy ra lỗi: ${err.message}. Vui lòng thử lại.`,
        isError: true,
      }]);
    } finally {
      setLoading(false);
    }
  };

  const handleUserTypeSelect = (type) => {
    setUserType(type);
    const label = type === "sme" ? "Chủ doanh nghiệp / SME" : "Cán bộ ngân hàng";
    sendMessage(`Tôi là ${label}`);
  };

  const renderMessage = (msg, idx) => {
    const isBot = msg.role === "assistant";
    return (
      <div key={idx} style={{
        display: "flex", gap: 12,
        flexDirection: isBot ? "row" : "row-reverse",
        alignItems: "flex-end", marginBottom: 20,
      }}>
        {isBot ? <BotIcon /> : <UserIcon />}
        <div style={{
          maxWidth: "80%",
          background: isBot ? "#ffffff" : "linear-gradient(135deg, #0f172a 0%, #0284c7 100%)",
          color: isBot ? "#0f172a" : "#ffffff",
          borderRadius: isBot ? "16px 16px 16px 4px" : "16px 16px 4px 16px",
          padding: "14px 18px",
          fontSize: 14.5, lineHeight: 1.6,
          border: isBot ? "1px solid rgba(0,0,0,0.06)" : "none",
          boxShadow: isBot ? "0 4px 15px rgba(0,0,0,0.03)" : "0 4px 15px rgba(2,132,199,0.2)",
          whiteSpace: "pre-wrap",
          opacity: msg.isError ? 0.8 : 1,
        }}>
          {msg.content.replace(/\*\*(.*?)\*\*/g, (match, p1) => `<b>${p1}</b>`).split('<b>').map((part, i) => {
             if (i === 0) return part;
             const subParts = part.split('</b>');
             return <span key={i}><strong style={{fontWeight: 700}}>{subParts[0]}</strong>{subParts[1]}</span>
          })}
          {msg.company_data && (
            <div style={{
              marginTop: 10,
              padding: "6px 10px",
              background: "rgba(2, 132, 199, 0.08)",
              borderRadius: "6px",
              borderLeft: "3px solid #0284c7",
              fontSize: 12,
              color: "#0284c7",
              fontWeight: 500,
              display: "block",
              width: "fit-content"
            }}>
              Dữ liệu thực từ hệ thống — PD: {msg.company_data.pd_score ? Number(msg.company_data.pd_score).toFixed(1) : "N/A"}% — Cập nhật: 2023
            </div>
          )}
        </div>
      </div>
    );
  };

  const starters = userType === "banker" ? STARTERS_BANKER : STARTERS_SME;
  const showStarters = messages.length <= 2 && !loading;

  return (
    <>
      <style>{`
        @keyframes finbot-bounce {
          0%, 80%, 100% { transform: translateY(0); }
          40% { transform: translateY(-5px); }
        }
        @keyframes finbot-slideUp {
          from { opacity: 0; transform: translateY(30px) scale(0.95); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        .finbot-window { animation: finbot-slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        .finbot-starter {
          border: 1px solid rgba(0,0,0,0.08) !important;
          background: #ffffff !important;
          color: #0f172a !important;
          font-weight: 500;
          transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1) !important;
        }
        .finbot-starter:hover {
          border-color: #0284c7 !important;
          color: #0284c7 !important;
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(2, 132, 199, 0.08) !important;
        }
        .finbot-send-btn {
          transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1) !important;
        }
        .finbot-send-btn:hover:not(:disabled) { 
          transform: scale(1.05);
          background: #000000 !important;
        }
        .finbot-send-btn:active:not(:disabled) {
          transform: scale(0.95);
        }
        .finbot-toggle-btn {
          transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1) !important;
        }
        .finbot-toggle-btn:hover { 
          transform: translateY(-4px) scale(1.05); 
          box-shadow: 0 12px 24px rgba(15,23,42,0.3) !important; 
        }
      `}</style>

      {/* Cửa sổ chat */}
      {isOpen && (
        <div className="finbot-window" style={{
          position: "fixed", bottom: 100, right: 30, zIndex: 1000,
          width: 380, height: "min(560px, calc(100vh - 140px))",
          background: "#f8fafc",
          border: "1px solid rgba(0,0,0,0.08)",
          borderRadius: 24, display: "flex", flexDirection: "column",
          boxShadow: "0 20px 40px rgba(0, 0, 0, 0.12), 0 0 0 1px rgba(255,255,255,0.5) inset",
          overflow: "hidden",
        }}>

          {/* Header */}
          <div style={{
            background: "rgba(255,255,255,0.85)",
            backdropFilter: "blur(12px)",
            borderBottom: "1px solid rgba(0,0,0,0.06)",
            padding: "16px 20px", display: "flex",
            alignItems: "center", gap: 14,
            zIndex: 2,
          }}>
            <BotIcon />
            <div style={{ flex: 1 }}>
              <div style={{ color: "#0f172a", fontWeight: 800, fontSize: 16, letterSpacing: "-0.01em" }}>FinBot AI</div>
              <div style={{ color: "#475569", fontSize: 13, fontWeight: 500 }}>
                Chuyên gia rủi ro tín dụng
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              style={{
                background: "transparent", border: "none",
                color: "#64748b", width: 32, height: 32, borderRadius: "50%",
                cursor: "pointer", display: "flex",
                alignItems: "center", justifyContent: "center",
                transition: "all 0.2s"
              }}
              onMouseEnter={(e) => { e.target.style.background = "rgba(0,0,0,0.05)"; e.target.style.color = "#0f172a"; }}
              onMouseLeave={(e) => { e.target.style.background = "transparent"; e.target.style.color = "#64748b"; }}
            >
              <X size={20} />
            </button>
          </div>

          {/* Messages */}
          <div style={{
            flex: 1, overflowY: "auto", padding: "24px 20px",
            display: "flex", flexDirection: "column",
          }}>
            {messages.map(renderMessage)}

            {/* Chọn loại người dùng */}
            {messages.length === 1 && !userType && (
              <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>
                {[
                  { key: "sme",    label: "Chủ doanh nghiệp" },
                  { key: "banker", label: "Cán bộ ngân hàng" },
                ].map(opt => (
                  <button key={opt.key} onClick={() => handleUserTypeSelect(opt.key)}
                    style={{
                      flex: 1, padding: "12px 14px", borderRadius: 12, cursor: "pointer",
                      border: "1px solid rgba(0,0,0,0.1)", background: "#ffffff",
                      color: "#0f172a", fontSize: 14, fontWeight: 600,
                      transition: "all 0.2s cubic-bezier(0.16, 1, 0.3, 1)",
                      boxShadow: "0 2px 8px rgba(0,0,0,0.02)"
                    }}
                    onMouseEnter={(e) => {
                      e.target.style.borderColor = "#0f172a";
                      e.target.style.transform = "translateY(-2px)";
                      e.target.style.boxShadow = "0 6px 12px rgba(0,0,0,0.05)";
                    }}
                    onMouseLeave={(e) => {
                      e.target.style.borderColor = "rgba(0,0,0,0.1)";
                      e.target.style.transform = "translateY(0)";
                      e.target.style.boxShadow = "0 2px 8px rgba(0,0,0,0.02)";
                    }}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            )}

            {/* Câu hỏi gợi ý */}
            {showStarters && userType && (
              <div style={{ marginBottom: 10 }}>
                <div style={{ fontSize: 13, color: "#64748b", marginBottom: 10, fontWeight: 600, paddingLeft: 4 }}>
                  Gợi ý hỏi nhanh:
                </div>
                {starters.map((s, i) => (
                  <button key={i} className="finbot-starter"
                    onClick={() => sendMessage(s)}
                    style={{
                      display: "block", width: "100%", textAlign: "left",
                      padding: "12px 16px", marginBottom: 8, borderRadius: 12,
                      fontSize: 14, cursor: "pointer",
                    }}>
                    {s}
                  </button>
                ))}
              </div>
            )}

            {loading && (
              <div style={{ display: "flex", gap: 12, alignItems: "flex-end" }}>
                <BotIcon />
                <div style={{
                  background: "#ffffff", border: "1px solid rgba(0,0,0,0.06)",
                  borderRadius: "16px 16px 16px 4px", padding: "10px 16px",
                  boxShadow: "0 4px 15px rgba(0,0,0,0.03)"
                }}>
                  <TypingDots />
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input Container */}
          <div style={{ position: "relative" }}>
            {/* Suggestions Dropdown */}
            {showDropdown && (
              <div style={{
                position: "absolute", bottom: "100%", left: 20, right: 20, marginBottom: 10,
                background: "#ffffff", borderRadius: 12, border: "1px solid rgba(0,0,0,0.1)",
                boxShadow: "0 -4px 15px rgba(0,0,0,0.08)", overflow: "hidden", zIndex: 100
              }}>
                {suggestions.map((s, i) => (
                  <div key={i} 
                    style={{ 
                      padding: "10px 16px", cursor: "pointer", 
                      borderBottom: i === suggestions.length - 1 ? "none" : "1px solid rgba(0,0,0,0.05)", 
                      fontSize: 13, color: "#334155" 
                    }}
                    onClick={() => {
                      setInput(s.company_name);
                      setShowDropdown(false);
                    }}
                    onMouseEnter={(e) => e.target.style.background = "#f8fafc"}
                    onMouseLeave={(e) => e.target.style.background = "transparent"}
                  >
                    <span style={{ fontWeight: 600, color: "#0284c7", marginRight: 8 }}>{s.ticker}</span>
                    {s.company_name}
                  </div>
                ))}
              </div>
            )}
            
            <div style={{
              padding: "16px 20px 8px 20px", background: "rgba(255,255,255,0.9)",
              borderTop: "1px solid rgba(0,0,0,0.06)", backdropFilter: "blur(12px)",
              display: "flex", gap: 10, alignItems: "center"
            }}>
              <input
                value={input}
                onChange={e => {
                  const val = e.target.value;
                  setInput(val);
                  if (val.length >= 2) {
                    const term = val.toLowerCase();
                    const matches = companies.filter(c => 
                      c.company_name.toLowerCase().includes(term) || 
                      c.ticker.toLowerCase().includes(term)
                    ).slice(0, 5);
                    setSuggestions(matches);
                    setShowDropdown(matches.length > 0);
                  } else {
                    setShowDropdown(false);
                  }
                }}
                onKeyDown={e => e.key === "Enter" && !e.shiftKey && sendMessage()}
              placeholder="Hỏi FinBot bất cứ điều gì..."
              disabled={loading}
              style={{
                flex: 1, padding: "14px 20px", borderRadius: 999,
                border: "1px solid rgba(0,0,0,0.12)", fontSize: 14.5,
                background: "#f8fafc", color: "#0f172a",
                outline: "none", transition: "all 0.2s",
                fontWeight: 500
              }}
              onFocus={(e) => {
                e.target.style.borderColor = "#0284c7";
                e.target.style.background = "#ffffff";
                e.target.style.boxShadow = "0 0 0 3px rgba(2, 132, 199, 0.1)";
              }}
              onBlur={(e) => {
                e.target.style.borderColor = "rgba(0,0,0,0.12)";
                e.target.style.background = "#f8fafc";
                e.target.style.boxShadow = "none";
              }}
            />
            <button
              className="finbot-send-btn"
              onClick={() => sendMessage()}
              disabled={loading || !input.trim()}
              style={{
                width: 48, height: 48, borderRadius: "50%", border: "none",
                background: loading || !input.trim() ? "#cbd5e1" : "linear-gradient(135deg, #0f172a 0%, #0284c7 100%)",
                color: "#fff", cursor: loading || !input.trim() ? "default" : "pointer",
                display: "flex", alignItems: "center", justifyContent: "center",
                flexShrink: 0, boxShadow: loading || !input.trim() ? "none" : "0 4px 12px rgba(2,132,199,0.25)"
              }}
            >
              <Send size={20} style={{ marginLeft: loading || !input.trim() ? 0 : 2 }} />
            </button>
            </div>
            
            {/* Info Footer */}
            {totalCompanies > 0 && (
              <div style={{ 
                textAlign: "center", paddingBottom: 12, fontSize: 11.5, 
                color: "#64748b", background: "rgba(255,255,255,0.9)",
                backdropFilter: "blur(12px)"
              }}>
                Hệ thống có dữ liệu của <b>{totalCompanies}</b> công ty — hỏi tôi về bất kỳ công ty nào.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Toggle button */}
      <button
        className="finbot-toggle-btn"
        onClick={() => setIsOpen(o => !o)}
        style={{
          position: "fixed", bottom: 30, right: 30, zIndex: 1001,
          width: 64, height: 64, borderRadius: "50%", border: "none",
          background: "linear-gradient(135deg, #0f172a 0%, #0284c7 100%)",
          color: "#fff", cursor: "pointer",
          display: "flex", alignItems: "center", justifyContent: "center",
          boxShadow: "0 8px 20px rgba(2,132,199,0.3)",
        }}
        title="Mở FinBot AI"
      >
        {isOpen ? <X size={28} /> : <MessageCircle size={28} />}
      </button>
    </>
  );
}
