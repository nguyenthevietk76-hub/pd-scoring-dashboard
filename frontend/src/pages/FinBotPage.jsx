import { useState, useRef, useEffect } from "react";
import { Bot, User, Send, Plus, History, X, Trash2 } from "lucide-react";
import { API_BASE_URL } from "../config";

const API_BASE = `${API_BASE_URL}/api`;

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

export default function FinBotPage({ companyContext = null }) {
  const [messages, setMessages]   = useState([]);
  const [input, setInput]         = useState("");
  const [loading, setLoading]     = useState(false);
  const [userType, setUserType]   = useState(null); // "sme" | "banker"
  const chatContainerRef = useRef(null);

  // Lịch sử cuộc trò chuyện
  const [sessions, setSessions] = useState(() => {
    try { return JSON.parse(localStorage.getItem('finbot_sessions')) || []; }
    catch { return []; }
  });
  const [currentSessionId, setCurrentSessionId] = useState(null);
  const [showHistory, setShowHistory] = useState(false);

  useEffect(() => {
    localStorage.setItem('finbot_sessions', JSON.stringify(sessions));
  }, [sessions]);

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTo({
        top: chatContainerRef.current.scrollHeight,
        behavior: 'smooth'
      });
    }
  }, [messages, loading]);

  const startNewChat = () => {
    setMessages([]);
    setCurrentSessionId(null);
    setInput("");
    setUserType(null);
    setShowHistory(false);
  };

  const sendMessage = async (text) => {
    const userText = text || input.trim();
    if (!userText || loading) return;
    setInput("");

    // Nếu là tin nhắn đầu tiên của cuộc hội thoại mới
    let currentMessages = messages;
    if (messages.length === 0) {
      currentMessages = [{
        role: "assistant",
        content: `Xin chào! Tôi là **FinBot AI** — chuyên gia tư vấn rủi ro tín dụng.\n\nBạn là **chủ doanh nghiệp** hay **cán bộ ngân hàng**? Tôi sẽ điều chỉnh cách phân tích phù hợp.`,
      }];
    }

    const newHistory = [...currentMessages, { role: "user", content: userText }];
    setMessages(newHistory);
    setLoading(true);

    // Lưu / Cập nhật session
    let sessionId = currentSessionId;
    if (!sessionId) {
      sessionId = Date.now().toString();
      setCurrentSessionId(sessionId);
      setSessions(prev => [{
        id: sessionId,
        title: userText.slice(0, 30) + (userText.length > 30 ? "..." : ""),
        messages: newHistory,
        updatedAt: Date.now()
      }, ...prev]);
    } else {
      setSessions(prev => prev.map(s => s.id === sessionId ? { ...s, messages: newHistory, updatedAt: Date.now() } : s));
    }

    try {
      const res = await fetch(`${API_BASE}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userText,
          history: currentMessages.filter(m => !m.isError).map(m => ({ role: m.role, content: m.content })),
          context: companyContext,
          stream: false,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || "Lỗi kết nối");
      }

      const data = await res.json();
      const responseText = data.reply || data.response || "Xin lỗi, tôi không thể trả lời lúc này.";
      const finalHistory = [...newHistory, { role: "assistant", content: responseText }];
      setMessages(finalHistory);
      setSessions(prev => prev.map(s => s.id === sessionId ? { ...s, messages: finalHistory, updatedAt: Date.now() } : s));
    } catch (err) {
      const finalHistory = [...newHistory, {
        role: "assistant",
        content: `Xin lỗi, đã xảy ra lỗi: ${err.message}. Vui lòng thử lại.`,
        isError: true,
      }];
      setMessages(finalHistory);
      setSessions(prev => prev.map(s => s.id === sessionId ? { ...s, messages: finalHistory, updatedAt: Date.now() } : s));
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
        display: "flex", gap: 16,
        flexDirection: isBot ? "row" : "row-reverse",
        alignItems: "flex-end", marginBottom: 24,
      }}>
        {isBot ? <BotIcon /> : <UserIcon />}
        <div style={{
          maxWidth: "75%",
          background: isBot ? "#ffffff" : "#f1f5f9",
          color: "#0f172a",
          borderRadius: "24px",
          borderBottomLeftRadius: isBot ? "4px" : "24px",
          borderBottomRightRadius: isBot ? "24px" : "4px",
          padding: "16px 24px",
          fontSize: "15px", lineHeight: 1.6,
          border: "1px solid rgba(0,0,0,0.05)",
          boxShadow: isBot ? "0 2px 10px rgba(0,0,0,0.02)" : "none",
          whiteSpace: "pre-wrap",
          opacity: msg.isError ? 0.8 : 1,
        }}>
          {(msg.content || "").replace(/\*\*(.*?)\*\*/g, (match, p1) => `<b>${p1}</b>`).split('<b>').map((part, i) => {
             if (i === 0) return part;
             const subParts = part.split('</b>');
             return <span key={i}><strong style={{fontWeight: 700}}>{subParts[0]}</strong>{subParts[1]}</span>
          })}
        </div>
      </div>
    );
  };

  const starters = userType === "banker" ? STARTERS_BANKER : STARTERS_SME;
  const showStarters = messages.length > 0 && messages.length <= 2 && !loading;

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%', width: '100%', position: 'relative' }}>
      <style>{`
        /* Ép thẻ body và layout-container chỉ cao 100% màn hình, khóa thanh cuộn tổng */
        html, body {
          margin: 0 !important;
          padding: 0 !important;
          height: 100vh !important;
          overflow: hidden !important;
        }
        .layout-container {
          height: 100vh !important;
          overflow: hidden !important;
        }
        /* Ghi đè CSS của Layout chỉ cho trang FinBot này */
        .main-content {
          padding: 0 !important;
          overflow: hidden !important;
          display: flex !important;
          flex-direction: column !important;
          height: 100vh !important;
        }

        @keyframes finbot-bounce {
          0%, 80%, 100% { transform: translateY(0); }
          40% { transform: translateY(-5px); }
        }
        .starter-btn {
          border: 1px solid rgba(0,0,0,0.08) !important;
          background: #ffffff !important;
          color: #0f172a !important;
          font-weight: 500;
          transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1) !important;
        }
        .starter-btn:hover {
          border-color: #0284c7 !important;
          color: #0284c7 !important;
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(2, 132, 199, 0.08) !important;
        }
        .finbot-input-container {
          transition: all 0.3s ease;
        }
        .finbot-input-container:focus-within {
          box-shadow: 0 8px 30px rgba(0, 0, 0, 0.08);
          border-color: #e2e8f0 !important;
        }
        
        .chat-container::-webkit-scrollbar {
          width: 6px;
        }
        .chat-container::-webkit-scrollbar-track {
          background: transparent;
        }
        .chat-container::-webkit-scrollbar-thumb {
          background-color: rgba(156, 163, 175, 0.5);
          border-radius: 20px;
        }
        
        .header-btn {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 8px 14px;
          border-radius: 8px;
          border: 1px solid #e2e8f0;
          background: #ffffff;
          color: #334155;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
          box-shadow: 0 2px 5px rgba(0,0,0,0.02);
        }
        .header-btn:hover {
          background: #f8fafc;
          border-color: #cbd5e1;
        }
      `}</style>

      {/* FIXED HEADER FOR CONTROLS */}
      <div style={{ position: 'absolute', top: 20, right: 30, zIndex: 40, display: 'flex', gap: 12 }}>
        <button className="header-btn" onClick={startNewChat}>
          <Plus size={16} /> Chat mới
        </button>
        <button className="header-btn" onClick={() => setShowHistory(true)}>
          <History size={16} /> Lịch sử
        </button>
      </div>

      {/* HISTORY SIDEBAR */}
      {showHistory && (
        <div style={{
          position: 'absolute', top: 0, right: 0, bottom: 0, width: '320px',
          background: '#ffffff', boxShadow: '-5px 0 25px rgba(0,0,0,0.08)',
          zIndex: 100, display: 'flex', flexDirection: 'column',
          borderLeft: '1px solid #e2e8f0',
          animation: 'slideIn 0.3s ease-out forwards'
        }}>
          <style>{`
            @keyframes slideIn {
              from { transform: translateX(100%); }
              to { transform: translateX(0); }
            }
          `}</style>
          <div style={{ padding: '24px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #f1f5f9' }}>
            <h3 style={{ margin: 0, fontSize: '1.1rem', color: '#0f172a', display: 'flex', alignItems: 'center', gap: 8 }}>
               <History size={18} /> Lịch sử trò chuyện
            </h3>
            <button onClick={() => setShowHistory(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', padding: 4 }}>
              <X size={20} />
            </button>
          </div>
          <div style={{ flex: 1, overflowY: 'auto', padding: '16px 12px' }}>
            {sessions.length === 0 ? (
              <div style={{ textAlign: 'center', color: '#94a3b8', marginTop: '60px' }}>
                <Bot size={40} style={{ opacity: 0.2, marginBottom: 16 }} />
                <p style={{ fontSize: '14px' }}>Chưa có cuộc trò chuyện nào</p>
              </div>
            ) : (
              sessions.map(s => (
                <div key={s.id} 
                  style={{
                    padding: '14px 16px', borderRadius: '12px', cursor: 'pointer',
                    background: currentSessionId === s.id ? '#f0f9ff' : 'transparent',
                    border: currentSessionId === s.id ? '1px solid #bae6fd' : '1px solid transparent',
                    marginBottom: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    transition: 'all 0.2s',
                    boxShadow: currentSessionId === s.id ? '0 2px 10px rgba(2, 132, 199, 0.05)' : 'none'
                  }}
                  onClick={() => {
                    setMessages(s.messages);
                    setCurrentSessionId(s.id);
                    setShowHistory(false);
                  }}
                  onMouseEnter={e => { if (currentSessionId !== s.id) e.currentTarget.style.background = '#f8fafc'; }}
                  onMouseLeave={e => { if (currentSessionId !== s.id) e.currentTarget.style.background = 'transparent'; }}
                >
                  <div style={{ overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis', color: currentSessionId === s.id ? '#0284c7' : '#334155', fontSize: '14px', fontWeight: currentSessionId === s.id ? 500 : 400, flex: 1 }}>
                    {s.title}
                  </div>
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      setSessions(prev => prev.filter(x => x.id !== s.id));
                      if (currentSessionId === s.id) startNewChat();
                    }}
                    style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '6px', opacity: 0.5, borderRadius: '6px' }}
                    onMouseEnter={e => { e.currentTarget.style.opacity = 1; e.currentTarget.style.background = '#fee2e2'; }}
                    onMouseLeave={e => { e.currentTarget.style.opacity = 0.5; e.currentTarget.style.background = 'none'; }}
                    title="Xóa cuộc trò chuyện"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {messages.length === 0 ? (
        // INITIAL VIEW (Empty State)
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '2.5rem' }}>
          <h1 style={{ fontSize: '2.5rem', fontWeight: 400, color: '#1f2937', marginBottom: '40px', letterSpacing: '-0.02em', textAlign: 'center' }}>
            Chào người dùng, vào việc thôi
          </h1>
          
          <div className="finbot-input-container" style={{
            width: '100%', maxWidth: '720px', display: 'flex', alignItems: 'center',
            background: '#ffffff', borderRadius: '999px',
            padding: '8px 16px 8px 24px',
            boxShadow: '0 4px 20px rgba(0,0,0,0.04)',
            border: '1px solid #f1f5f9'
          }}>
            <input 
              style={{
                flex: 1, border: 'none', outline: 'none', background: 'transparent',
                fontSize: '1.1rem', color: '#334155', height: '48px'
              }}
              placeholder="Hỏi FinBot"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === "Enter" && !e.shiftKey && sendMessage()}
            />
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#64748b' }}>
              <button 
                onClick={() => sendMessage()}
                disabled={loading || !input.trim()}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: loading || !input.trim() ? '#f8fafc' : '#0f172a',
                  color: loading || !input.trim() ? '#cbd5e1' : '#ffffff', 
                  border: 'none',
                  width: '44px', height: '44px', borderRadius: '50%', cursor: loading || !input.trim() ? 'default' : 'pointer',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={e => {
                  if (!loading && input.trim()) e.currentTarget.style.transform = 'scale(1.05)';
                }}
                onMouseLeave={e => {
                   e.currentTarget.style.transform = 'scale(1)';
                }}
              >
                <Send size={18} style={{ marginLeft: loading || !input.trim() ? 0 : 2 }} />
              </button>
            </div>
          </div>
        </div>
      ) : (
        // CHAT VIEW
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', width: '100%', height: '100%', overflow: 'hidden' }}>
          
          {/* KHỐI TRÊN: Cuộn nội bộ (Scrollable messages area) */}
          <div ref={chatContainerRef} className="chat-container" style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '2.5rem 20px 0' }}>
            <div style={{ width: '100%', maxWidth: '900px', display: 'flex', flexDirection: 'column' }}>
              {messages.map(renderMessage)}

              {/* Chọn loại người dùng */}
              {messages.length === 2 && !userType && (
                <div style={{ display: "flex", gap: 12, marginBottom: 24, paddingLeft: 52 }}>
                  {[
                    { key: "sme",    label: "Chủ doanh nghiệp" },
                    { key: "banker", label: "Cán bộ ngân hàng" },
                  ].map(opt => (
                    <button key={opt.key} onClick={() => handleUserTypeSelect(opt.key)}
                      style={{
                        padding: "12px 20px", borderRadius: 100, cursor: "pointer",
                        border: "1px solid rgba(0,0,0,0.1)", background: "#ffffff",
                        color: "#0f172a", fontSize: 14, fontWeight: 500,
                        transition: "all 0.2s",
                        boxShadow: "0 2px 5px rgba(0,0,0,0.02)"
                      }}
                      onMouseEnter={(e) => {
                        e.target.style.borderColor = "#0284c7";
                        e.target.style.color = "#0284c7";
                      }}
                      onMouseLeave={(e) => {
                        e.target.style.borderColor = "rgba(0,0,0,0.1)";
                        e.target.style.color = "#0f172a";
                      }}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              )}

              {/* Câu hỏi gợi ý */}
              {showStarters && userType && (
                <div style={{ marginBottom: 24, paddingLeft: 52, maxWidth: '80%' }}>
                  <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                    {starters.map((s, i) => (
                      <button key={i} className="starter-btn"
                        onClick={() => sendMessage(s)}
                        style={{
                          padding: "10px 16px", borderRadius: 100,
                          fontSize: 13, cursor: "pointer",
                          border: "1px solid #e2e8f0", background: "#fff",
                        }}>
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {loading && (
                <div style={{ display: "flex", gap: 16, alignItems: "flex-end" }}>
                  <BotIcon />
                  <div style={{
                    background: "#ffffff",
                    borderRadius: "24px 24px 24px 4px", padding: "16px 20px",
                    border: "1px solid rgba(0,0,0,0.05)"
                  }}>
                    <TypingDots />
                  </div>
                </div>
              )}
              <div style={{ height: 20 }} />
            </div>
          </div>

          {/* KHỐI DƯỚI: Cố định kích thước (Fixed Input Area at the bottom) */}
          <div style={{ flexShrink: 0, padding: '10px 20px 2.5rem', display: 'flex', flexDirection: 'column', alignItems: 'center', background: 'transparent' }}>
            <div style={{ width: '100%', maxWidth: '900px' }}>
              <div className="finbot-input-container" style={{
                width: '100%', display: 'flex', alignItems: 'center',
                background: '#ffffff', borderRadius: '24px',
                padding: '8px 16px 8px 24px',
                border: '1px solid #e2e8f0',
                boxShadow: '0 4px 15px rgba(0,0,0,0.02)'
              }}>
                <input 
                  style={{
                    flex: 1, border: 'none', outline: 'none', background: 'transparent',
                    fontSize: '1rem', color: '#334155', height: '40px'
                  }}
                  placeholder="Hỏi FinBot"
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && !e.shiftKey && sendMessage()}
                  disabled={loading}
                />
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#64748b' }}>
                  <button 
                    onClick={() => sendMessage()}
                    disabled={loading || !input.trim()}
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      background: loading || !input.trim() ? '#f8fafc' : '#0f172a', 
                      color: loading || !input.trim() ? '#cbd5e1' : '#fff', border: 'none',
                      width: '38px', height: '38px', borderRadius: '50%', 
                      cursor: loading || !input.trim() ? 'default' : 'pointer',
                      transition: 'all 0.2s'
                    }}
                    onMouseEnter={e => {
                      if (!loading && input.trim()) e.currentTarget.style.transform = 'scale(1.05)';
                    }}
                    onMouseLeave={e => {
                       e.currentTarget.style.transform = 'scale(1)';
                    }}
                  >
                    <Send size={16} style={{ marginLeft: loading || !input.trim() ? 0 : 2 }} />
                  </button>
                </div>
              </div>
              <div style={{ textAlign: 'center', fontSize: '12px', color: '#94a3b8', marginTop: '12px' }}>
                FinBot có thể đưa ra câu trả lời không chính xác. Hãy kiểm tra lại những thông tin quan trọng.
              </div>
            </div>
          </div>

        </div>
      )}
    </div>
  );
}
