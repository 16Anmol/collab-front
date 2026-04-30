import React, { useState, useRef, useEffect } from 'react';
import styles from './ChatPanel.module.css';

// Render message with clickable links
function renderMessage(text) {
  const urlRegex = /(https?:\/\/[^\s]+)|(www\.[^\s]+\.[^\s]+)/gi;
  const parts = text.split(urlRegex);
  return parts.map((part, i) => {
    if (!part) return null;
    const isUrl = /^(https?:\/\/|www\.)/i.test(part);
    if (isUrl) {
      const href = part.startsWith('http') ? part : `https://${part}`;
      return (
        <a key={i} href={href} target="_blank" rel="noopener noreferrer"
          style={{ color: 'inherit', textDecoration: 'underline', opacity: 0.9, wordBreak: 'break-all' }}
          onClick={e => e.stopPropagation()}>
          {part}
        </a>
      );
    }
    return <span key={i}>{part}</span>;
  });
}

export default function ChatPanel({ messages, onSend, myPeerId }) {
  const [text, setText] = useState('');
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const send = () => {
    const t = text.trim();
    if (!t) return;
    onSend(t);
    setText('');
  };

  const fmt = (iso) => {
    const d = new Date(iso);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className={styles.panel}>
      <div className={styles.header}>
        <span>💬</span> Chat
      </div>

      <div className={styles.messages}>
        {messages.length === 0 && (
          <p className={styles.empty}>No messages yet. Say hi! 👋</p>
        )}
        {messages.map((m, i) => {
          const isMine = m.from === myPeerId;
          return (
            <div key={i} className={`${styles.msg} ${isMine ? styles.mine : ''}`}>
              {!isMine && <span className={styles.sender}>{m.name}</span>}
              <div className={`${styles.bubble} ${isMine ? styles.mineBubble : ''}`}>
                {renderMessage(m.message)}
              </div>
              <span className={styles.time}>{fmt(m.timestamp)}</span>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      <div className={styles.inputRow}>
        <input
          className={styles.input}
          placeholder="Type a message..."
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && send()}
        />
        <button className={styles.sendBtn} onClick={send}>↑</button>
      </div>
    </div>
  );
}
