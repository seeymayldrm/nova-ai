import { useEffect, useMemo, useRef, useState } from "react";

const starters = [
  "Yarın neye öncelik verelim?",
  "Şeyma'ya ne yazsam?",
  "Beni biraz toparla",
  "Yeni dünya muhabbeti açalım"
];

function createSessionId() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  return `nova-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function greeting() {
  const hour = new Date().getHours();
  if (hour < 5) return "Yine gece vardiyası mı be adam :)";
  if (hour < 12) return "Günaydın Okan :)";
  if (hour < 18) return "Selam Okan :)";
  return "N'aptın Okan :)";
}

function Message({ role, children }) {
  return (
    <div className={`message-row ${role}`}>
      {role === "assistant" && <div className="avatar">N</div>}
      <div className="message-bubble">{children}</div>
    </div>
  );
}

export default function App() {
  const [sessionId, setSessionId] = useState(() => createSessionId());
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const isEmpty = messages.length === 0;
  const welcome = useMemo(() => greeting(), []);

  async function send(text = input) {
    const clean = text.trim();
    if (!clean || loading) return;

    setError("");
    setInput("");
    setMessages((current) => [...current, { role: "user", content: clean }]);
    setLoading(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, message: clean })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Bir şey ters gitti.");
      setMessages((current) => [...current, { role: "assistant", content: data.reply }]);
    } catch (err) {
      setError(err.message || "NOVA şu an cevap veremedi.");
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  }

  async function reset() {
    try {
      await fetch("/api/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId })
      });
    } catch {
      // ignore
    }
    setSessionId(createSessionId());
    setMessages([]);
    setInput("");
    setError("");
  }

  function onSubmit(event) {
    event.preventDefault();
    send();
  }

  function onKeyDown(event) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      send();
    }
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand-wrap">
          <div className="brand">NOVA</div>
          <div className="status"><span /> online</div>
        </div>
        <button className="ghost-button" onClick={reset}>Yeni sohbet</button>
      </header>

      <main className={`chat ${isEmpty ? "empty" : ""}`}>
        {isEmpty ? (
          <section className="hero">
            <div className="badge-row">
              <span>kişisel asistan</span>
              <span>hızlı</span>
              <span>biraz da laf sokar</span>
            </div>
            <h1>{welcome}</h1>
            <p className="hero-copy">
              Ne yapıyoruz bugün? İş mi toparlıyoruz, Şeyma'ya mı yazıyoruz,
              yoksa geleceğin dünyasını mı konuşuyoruz?
            </p>

            <div className="starters">
              {starters.map((item) => (
                <button key={item} onClick={() => send(item)}>{item}</button>
              ))}
            </div>
          </section>
        ) : (
          <section className="messages" aria-live="polite">
            {messages.map((message, index) => (
              <Message role={message.role} key={`${message.role}-${index}`}>
                {message.content}
              </Message>
            ))}
            {loading && (
              <Message role="assistant">
                <div className="typing"><i /><i /><i /></div>
              </Message>
            )}
            <div ref={bottomRef} />
          </section>
        )}
      </main>

      <footer className="composer-wrap">
        {error && <div className="error">{error}</div>}
        <form className="composer" onSubmit={onSubmit}>
          <textarea
            ref={inputRef}
            value={input}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={onKeyDown}
            placeholder="NOVA'ya yaz..."
            rows={1}
            maxLength={5000}
            disabled={loading}
          />
          <button className="send-button" type="submit" disabled={loading || !input.trim()} aria-label="Gönder">
            ↗
          </button>
        </form>
        <div className="hint">Enter ile gönder · Shift + Enter yeni satır</div>
      </footer>
    </div>
  );
}
