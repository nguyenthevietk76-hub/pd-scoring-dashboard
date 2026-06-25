import React, { useState, useEffect, useRef, useContext } from 'react';
import { MessageCircle, X, Send, Bot } from 'lucide-react';
import { AnalysisContext } from '../context/AnalysisContext';
import { API_BASE_URL } from '../config';

const ChatWidget = () => {
  const { analysisContext } = useContext(AnalysisContext);
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const bodyRef = useRef(null);

  // Initialize and reset messages when context changes
  useEffect(() => {
    if (analysisContext === null) {
      setMessages([
        {
          sender: 'bot',
          text: 'Chào bạn! Hãy phân tích một doanh nghiệp ở Dashboard trước, tôi sẽ giúp giải thích kết quả.'
        }
      ]);
    } else {
      const activeName = (analysisContext.company_name && !/^\d+$/.test(analysisContext.company_name) && analysisContext.company_name !== 'Công ty Chưa rõ tên' && analysisContext.company_name !== 'Doanh nghiệp Chưa rõ tên') ? analysisContext.company_name : "doanh nghiệp";
      setMessages([
        {
          sender: 'bot',
          text: `Chào bạn! Tôi là AI Credit Analyst. Tôi đã nhận được dữ liệu phân tích của **${activeName}**. Bạn cần tôi hỗ trợ giải thích điều gì?`
        }
      ]);
    }
  }, [analysisContext]);

  // Scroll to bottom when messages list updates
  useEffect(() => {
    if (bodyRef.current) {
      bodyRef.current.scrollTop = bodyRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  const handleSendMessage = async (textToSend) => {
    const text = textToSend || inputValue;
    if (!text.trim() || isLoading) return;

    // Append user message
    const newMessages = [...messages, { sender: 'user', text }];
    setMessages(newMessages);
    if (!textToSend) setInputValue('');
    setIsLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          message: text,
          context: analysisContext
        })
      });

      if (!response.ok) {
        throw new Error('Không thể kết nối đến máy chủ AI.');
      }

      const data = await response.json();
      setMessages(prev => [...prev, { sender: 'bot', text: data.response }]);
    } catch (error) {
      console.error(error);
      setMessages(prev => [
        ...prev,
        { sender: 'bot', text: 'Có lỗi xảy ra khi xử lý yêu cầu. Vui lòng thử lại sau.' }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSendMessage();
    }
  };

  // 8 diverse quick chips
  const chips = [
    "Tại sao điểm cao?",
    "Nên cho vay bao nhiêu?",
    "Xu hướng rủi ro?",
    "So sánh với ngành?",
    "Biện pháp giảm thiểu rủi ro?",
    "Đánh giá khả năng thanh toán?",
    "Kiểm tra chất lượng dữ liệu?",
    "Phân tích cơ cấu nguồn vốn?"
  ];

  return (
    <div className="chat-widget-wrapper" style={{ zIndex: 9999, position: 'fixed', bottom: '24px', right: '24px' }}>
      {/* Chat window */}
      {isOpen && (
        <div 
          className="chat-window card" 
          style={{
            position: 'absolute',
            bottom: '72px',
            right: 0,
            width: '360px',
            height: '480px',
            padding: 0,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            backgroundColor: 'var(--surface)',
            border: '1px solid var(--border-color)',
            boxShadow: '0 10px 40px rgba(0, 0, 0, 0.12)',
            borderRadius: '16px'
          }}
        >
          {/* Header */}
          <div 
            className="chat-header" 
            style={{
              background: 'var(--navy-900)',
              color: '#ffffff',
              padding: '14px 16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              borderTopLeftRadius: '15px',
              borderTopRightRadius: '15px',
              flexShrink: 0
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Bot size={20} color="var(--teal-500)" />
              <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>AI Credit Analyst</span>
            </div>
            <button 
              onClick={() => setIsOpen(false)} 
              style={{
                background: 'transparent',
                border: 'none',
                color: '#ffffff',
                opacity: 0.8,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '4px'
              }}
            >
              <X size={18} />
            </button>
          </div>

          {/* Body */}
          <div 
            className="chat-body" 
            ref={bodyRef}
            style={{
              flex: 1,
              overflowY: 'auto',
              padding: '16px',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
              backgroundColor: '#f8fafc'
            }}
          >
            {messages.map((msg, index) => {
              const isBot = msg.sender === 'bot';
              return (
                <div 
                  key={index} 
                  style={{
                    display: 'flex',
                    flexDirection: isBot ? 'row' : 'row-reverse',
                    alignItems: 'flex-start',
                    gap: '8px',
                    width: '100%'
                  }}
                >
                  {isBot && (
                    <div 
                      style={{
                        width: '28px',
                        height: '28px',
                        borderRadius: '50%',
                        backgroundColor: 'rgba(2, 132, 199, 0.1)',
                        border: '1px solid rgba(2, 132, 199, 0.2)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                        marginTop: '4px'
                      }}
                    >
                      <Bot size={14} color="var(--teal-500)" />
                    </div>
                  )}
                  <div 
                    style={{
                      maxWidth: '75%',
                      padding: '10px 14px',
                      fontSize: '0.875rem',
                      lineHeight: '1.4',
                      borderRadius: isBot ? '12px 12px 12px 0px' : '12px 12px 0px 12px',
                      backgroundColor: isBot ? 'var(--surface)' : 'var(--teal-500)',
                      color: isBot ? 'var(--ink-900)' : '#ffffff',
                      boxShadow: '0 2px 6px rgba(0,0,0,0.03)',
                      border: isBot ? '1px solid var(--border-color)' : 'none',
                      whiteSpace: 'pre-line'
                    }}
                  >
                    {msg.text}
                  </div>
                </div>
              );
            })}

            {isLoading && (
              <div 
                style={{
                  display: 'flex',
                  flexDirection: 'row',
                  alignItems: 'flex-start',
                  gap: '8px',
                  width: '100%'
                }}
              >
                <div 
                  style={{
                    width: '28px',
                    height: '28px',
                    borderRadius: '50%',
                    backgroundColor: 'rgba(2, 132, 199, 0.1)',
                    border: '1px solid rgba(2, 132, 199, 0.2)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                  }}
                >
                  <Bot size={14} color="var(--teal-500)" />
                </div>
                <div 
                  style={{
                    maxWidth: '75%',
                    padding: '10px 14px',
                    borderRadius: '12px 12px 12px 0px',
                    backgroundColor: 'var(--surface)',
                    color: 'var(--ink-500)',
                    boxShadow: '0 2px 6px rgba(0,0,0,0.03)',
                    border: '1px solid var(--border-color)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                >
                  <span style={{ fontSize: '0.85rem' }}>Đang phân tích</span>
                  <span className="dot-animation" style={{ display: 'inline-flex', gap: '2px' }}>
                    <span className="dot" style={{ animation: 'bounce 1.4s infinite ease-in-out both' }}>.</span>
                    <span className="dot" style={{ animation: 'bounce 1.4s infinite ease-in-out both', animationDelay: '0.2s' }}>.</span>
                    <span className="dot" style={{ animation: 'bounce 1.4s infinite ease-in-out both', animationDelay: '0.4s' }}>.</span>
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Quick chips (only show when there is context) */}
          {analysisContext !== null && (
            <div 
              className="chat-chips"
              style={{
                display: 'flex',
                gap: '6px',
                padding: '10px 12px',
                overflowX: 'auto',
                whiteSpace: 'nowrap',
                backgroundColor: 'var(--surface)',
                borderTop: '1px solid var(--border-color)',
                scrollbarWidth: 'none'
              }}
            >
              {chips.map((chipText, index) => (
                <button
                  key={index}
                  onClick={() => handleSendMessage(chipText)}
                  disabled={isLoading}
                  style={{
                    backgroundColor: 'rgba(2, 132, 199, 0.06)',
                    color: 'var(--teal-500)',
                    border: '1px solid rgba(2, 132, 199, 0.15)',
                    borderRadius: '999px',
                    padding: '5px 12px',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    transition: 'all 0.2s'
                  }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.backgroundColor = 'var(--teal-500)';
                    e.currentTarget.style.color = '#ffffff';
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.backgroundColor = 'rgba(2, 132, 199, 0.06)';
                    e.currentTarget.style.color = 'var(--teal-500)';
                  }}
                >
                  {chipText}
                </button>
              ))}
            </div>
          )}

          {/* Warning button for data quality anomaly */}
          {analysisContext !== null && (
            (() => {
              const hasAnomaly = analysisContext.top_factors?.some(f => {
                const valStr = f.display_val || '';
                const contrib = f.contribution || 0;
                if (valStr.includes('%') && parseFloat(valStr.replace(/[^0-9]/g, '')) > 500) return true;
                if (contrib > 500) return true;
                return false;
              });
              
              if (!hasAnomaly) return null;
              
              return (
                <div style={{ padding: '8px 12px 0 12px', flexShrink: 0, backgroundColor: 'var(--surface)' }}>
                  <button 
                    onClick={() => handleSendMessage("Kiểm tra chất lượng dữ liệu và làm rõ các cảnh báo dị biệt tài chính?")}
                    disabled={isLoading}
                    style={{
                      width: '100%',
                      backgroundColor: 'rgba(239, 68, 68, 0.08)',
                      color: 'rgba(239, 68, 68, 0.95)',
                      border: '1px solid rgba(239, 68, 68, 0.2)',
                      borderRadius: '8px',
                      padding: '8px 12px',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                      cursor: 'pointer',
                      transition: 'all 0.2s'
                    }}
                    onMouseOver={(e) => {
                      e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.95)';
                      e.currentTarget.style.color = '#ffffff';
                    }}
                    onMouseOut={(e) => {
                      e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.08)';
                      e.currentTarget.style.color = 'rgba(239, 68, 68, 0.95)';
                    }}
                  >
                    ⚠️ Phát hiện số liệu bất thường - Nhấp để tra soát
                  </button>
                </div>
              );
            })()
          )}

          {/* Footer input */}
          <div 
            className="chat-footer" 
            style={{
              padding: '12px',
              borderTop: '1px solid var(--border-color)',
              display: 'flex',
              gap: '8px',
              alignItems: 'center',
              backgroundColor: 'var(--surface)',
              flexShrink: 0
            }}
          >
            <input 
              type="text" 
              placeholder={
                analysisContext === null 
                  ? "Vui lòng chọn doanh nghiệp..." 
                  : `Hỏi về ${analysisContext?.company_name && !/^\d+$/.test(analysisContext.company_name) && analysisContext.company_name !== 'Công ty Chưa rõ tên' && analysisContext.company_name !== 'Doanh nghiệp Chưa rõ tên' ? analysisContext.company_name : "doanh nghiệp này"}...`
              }
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyPress}
              disabled={analysisContext === null || isLoading}
              style={{
                flex: 1,
                border: '1px solid var(--border-color)',
                borderRadius: '999px',
                padding: '10px 16px',
                fontSize: '0.875rem',
                outline: 'none',
                backgroundColor: analysisContext === null ? '#f1f5f9' : '#ffffff',
                color: 'var(--ink-900)'
              }}
            />
            <button 
              onClick={() => handleSendMessage()} 
              disabled={analysisContext === null || !inputValue.trim() || isLoading}
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '50%',
                backgroundColor: (analysisContext === null || !inputValue.trim() || isLoading) ? '#f1f5f9' : 'var(--teal-500)',
                color: (analysisContext === null || !inputValue.trim() || isLoading) ? 'var(--ink-500)' : '#ffffff',
                border: 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}
            >
              <Send size={16} />
            </button>
          </div>
        </div>
      )}

      {/* Floating bubble button */}
      <button 
        className="chat-bubble-button" 
        onClick={() => setIsOpen(!isOpen)}
        style={{
          width: '56px',
          height: '56px',
          borderRadius: '50%',
          backgroundColor: 'var(--teal-500)',
          color: '#ffffff',
          border: 'none',
          boxShadow: '0 6px 20px rgba(2, 132, 199, 0.3)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
        }}
        onMouseOver={(e) => {
          e.currentTarget.style.backgroundColor = 'var(--teal-hover)';
          e.currentTarget.style.transform = 'scale(1.05)';
        }}
        onMouseOut={(e) => {
          e.currentTarget.style.backgroundColor = 'var(--teal-500)';
          e.currentTarget.style.transform = 'scale(1)';
        }}
      >
        <MessageCircle size={24} />
      </button>

      <style dangerouslySetInnerHTML={{__html: `
        @keyframes bounce {
          0%, 80%, 100% { transform: scale(0); opacity: 0.3; }
          40% { transform: scale(1.0); opacity: 1; }
        }
      `}} />
    </div>
  );
};

export default ChatWidget;
