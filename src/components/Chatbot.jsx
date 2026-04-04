import React, { useState, useRef, useEffect } from 'react';
import { MessageCircle, X, Send, Sparkles, BookOpen } from 'lucide-react';
import { API_URL } from '../utils/api';

const GREETING_MESSAGE = {
  role: 'assistant',
  content: `Hey there, future CPA! 🌸✨\n\nI'm your **SED Study Buddy** — here to help you crush the CPALE!\n\nI can help you with:\n📚 **CPALE Subjects** — FAR, AFAR, MAS, AT, AP, TAX, RFBT\n💡 **Study Tips** & Exam Strategies\n🙏 **Encouragement** & Bible Verses\n\n*"For I know the plans I have for you," declares the Lord, "plans to prosper you and not to harm you, plans to give you hope and a future."* — Jeremiah 29:11\n\nWhat would you like to study today? 💪🍵`,
};

function Chatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([GREETING_MESSAGE]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [hasNewMessage, setHasNewMessage] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Scroll to bottom when messages change
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  // Focus input when chat opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [isOpen]);

  const toggleChat = () => {
    setIsOpen(!isOpen);
    setHasNewMessage(false);
  };

  const handleInput = (e) => {
    setInput(e.target.value);
    // Auto-grow textarea
    const target = e.target;
    target.style.height = 'auto'; // Reset first
    
    // Calculate new height, max out at something reasonable
    // Set directly via style so it smoothly grows without breaking layout
    target.style.height = `${target.scrollHeight}px`;
  };

  const handleSend = async () => {
    const trimmed = input.trim();
    if (!trimmed || isLoading) return;

    const userMessage = { role: 'user', content: trimmed };
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setInput('');
    if (inputRef.current) inputRef.current.style.height = 'auto';
    setIsLoading(true);

    try {
      // Send only the conversation messages (not the greeting) to API
      const apiMessages = updatedMessages
        .filter(m => m.content !== GREETING_MESSAGE.content)
        .map(m => ({ role: m.role, content: m.content }));

      const res = await fetch(`${API_URL}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: apiMessages }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to get response from server');
      }

      if (data.reply) {
        const assistantMessage = { role: 'assistant', content: data.reply };
        setMessages(prev => [...prev, assistantMessage]);
        if (!isOpen) setHasNewMessage(true);
      }
    } catch (err) {
      console.error('Chat error:', err);
      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: "I'm having trouble connecting right now. But don't worry — you're doing great! Try again in a moment. 🙏💚",
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleClearChat = () => {
    setMessages([GREETING_MESSAGE]);
  };

  // Simple markdown-like formatting
  const formatMessage = (text) => {
    return text
      .split('\n')
      .map((line, i) => {
        // Bold
        let formatted = line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        // Italic
        formatted = formatted.replace(/\*(.*?)\*/g, '<em>$1</em>');
        // Emoji-prefixed bullets
        if (formatted.match(/^[📚💡🙏✅❌📝🔥💪🌟✨🍵☕]/)) {
          return `<div class="chat-bullet" key="${i}">${formatted}</div>`;
        }
        if (formatted.trim() === '') return '<br />';
        return `<div>${formatted}</div>`;
      })
      .join('');
  };

  return (
    <>
      {/* Floating Chat Button */}
      <button
        className={`chatbot-fab ${isOpen ? 'chatbot-fab-hidden' : ''} ${hasNewMessage ? 'chatbot-fab-pulse' : ''}`}
        onClick={toggleChat}
        aria-label="Open study chatbot"
        id="chatbot-toggle"
      >
        <div className="chatbot-fab-icon">
          <Sparkles size={14} className="chatbot-fab-sparkle" />
          <MessageCircle size={24} />
        </div>
        {hasNewMessage && <span className="chatbot-fab-badge" />}
      </button>

      {/* Chat Window */}
      <div className={`chatbot-window ${isOpen ? 'chatbot-window-open' : ''}`}>
        {/* Header */}
        <div className="chatbot-header">
          <div className="chatbot-header-left">
            <div className="chatbot-avatar">
              <BookOpen size={18} />
            </div>
            <div className="chatbot-header-info">
              <span className="chatbot-header-name">SED Study Buddy</span>
              <span className="chatbot-header-status">
                <span className="chatbot-status-dot" />
                CPALE Helper • Always here for you
              </span>
            </div>
          </div>
          <div className="chatbot-header-actions">
            <button
              className="chatbot-header-btn"
              onClick={handleClearChat}
              title="Clear chat"
              aria-label="Clear chat"
            >
              🗑️
            </button>
            <button
              className="chatbot-header-btn chatbot-close-btn"
              onClick={toggleChat}
              aria-label="Close chatbot"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Messages */}
        <div className="chatbot-messages" id="chatbot-messages">
          {messages.map((msg, index) => (
            <div
              key={index}
              className={`chatbot-message ${msg.role === 'user' ? 'chatbot-message-user' : 'chatbot-message-assistant'}`}
            >
              {msg.role === 'assistant' && (
                <div className="chatbot-msg-avatar">🍵</div>
              )}
              <div
                className={`chatbot-bubble ${msg.role === 'user' ? 'chatbot-bubble-user' : 'chatbot-bubble-assistant'}`}
                dangerouslySetInnerHTML={{ __html: formatMessage(msg.content) }}
              />
            </div>
          ))}

          {isLoading && (
            <div className="chatbot-message chatbot-message-assistant">
              <div className="chatbot-msg-avatar">🍵</div>
              <div className="chatbot-bubble chatbot-bubble-assistant chatbot-typing">
                <div className="chatbot-typing-dots">
                  <span />
                  <span />
                  <span />
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="chatbot-input-area">
          <div className="chatbot-input-wrapper">
            <textarea
              ref={inputRef}
              className="chatbot-input"
              value={input}
              onChange={handleInput}
              onKeyDown={handleKeyDown}
              placeholder="Ask me about CPALE..."
              rows={1}
              id="chatbot-input"
            />
            <button
              className={`chatbot-send-btn ${input.trim() ? 'chatbot-send-active' : ''}`}
              onClick={handleSend}
              disabled={!input.trim() || isLoading}
              aria-label="Send message"
            >
              <Send size={16} />
            </button>
          </div>
          <div className="chatbot-input-hint">
            Press Enter to send • Shift+Enter for new line
          </div>
        </div>
      </div>
    </>
  );
}

export default Chatbot;
