import type { ChatMessage } from "@fang-x/shared";
import { type FormEvent, useEffect, useRef, useState } from "react";

interface ChatPanelProps {
  messages: ChatMessage[];
  myId: string | null;
  onSend: (text: string) => void;
}

function formatTime(at: number): string {
  return new Date(at).toLocaleTimeString("de-CH", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function ChatPanel({ messages, myId, onSend }: ChatPanelProps) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const [unread, setUnread] = useState(0);
  const previousCount = useRef(0);
  const listRef = useRef<HTMLDivElement>(null);
  const lastMessageId = messages.length > 0 ? messages[messages.length - 1].id : null;

  useEffect(() => {
    const previous = previousCount.current;
    previousCount.current = messages.length;
    if (messages.length > previous && !open) {
      setUnread((count) => count + messages.length - previous);
    }
    if (open) setUnread(0);
  }, [messages, open]);

  useEffect(() => {
    if (!open || lastMessageId === null) return;
    const list = listRef.current;
    if (list) list.scrollTop = list.scrollHeight;
  }, [lastMessageId, open]);

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open]);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const text = draft.trim();
    if (!text) return;
    onSend(text);
    setDraft("");
  };

  return (
    <>
      <button
        type="button"
        className={`chat-fab${open ? " is-open" : ""}`}
        onClick={() => setOpen((value) => !value)}
        aria-label={open ? "Chat schließen" : "Chat öffnen"}
        aria-expanded={open}
        aria-controls="game-chat-window"
      >
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M21 11.5a8.5 8.5 0 0 1-12.4 7.6L4 21l1.4-4.4A8.5 8.5 0 1 1 21 11.5Z" />
        </svg>
        {unread > 0 && !open && <span className="chat-unread">{unread > 9 ? "9+" : unread}</span>}
      </button>

      {open && (
        <section className="chat-window" id="game-chat-window" aria-label="Chat">
          <header className="chat-window-head">
            <strong>Chat</strong>
            <span className="chat-window-sub">Nur während des Spiels</span>
            <button
              type="button"
              className="chat-close"
              aria-label="Chat schließen"
              onClick={() => setOpen(false)}
            >
              ×
            </button>
          </header>

          <div
            className="chat-messages"
            ref={listRef}
            role="log"
            aria-live="polite"
            aria-label="Chatnachrichten"
          >
            {messages.length === 0 ? (
              <p className="chat-empty">Noch keine Nachrichten.</p>
            ) : (
              messages.map((message) => (
                <div
                  key={message.id}
                  className={`chat-message${message.playerId === myId ? " is-own" : ""}`}
                >
                  <div className="chat-message-head">
                    <span className="chat-author" style={{ color: message.color }}>
                      {message.name}
                    </span>
                    <span className="chat-time">{formatTime(message.at)}</span>
                  </div>
                  <p>{message.text}</p>
                </div>
              ))
            )}
          </div>

          <form className="chat-form" onSubmit={submit}>
            <input
              type="text"
              value={draft}
              maxLength={300}
              placeholder="Nachricht …"
              aria-label="Chatnachricht"
              onChange={(event) => setDraft(event.target.value)}
            />
            <button type="submit" disabled={!draft.trim()}>
              Senden
            </button>
          </form>
          <small className="chat-hint">
            Chat der laufenden Runde – nach Spielende wird er gelöscht.
          </small>
        </section>
      )}
    </>
  );
}
