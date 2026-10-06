import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import axios from "axios";
import ReactMarkdown from "react-markdown";
import Sidebar from "../Sidebar";
import Toast from "../toast";
import { useAuth } from "../AuthContext";
import { supabase } from "../supabase";
import { displayName } from "../lib/user";
import { FaBars, FaRedo, FaCommentSlash } from "react-icons/fa";
import "./dashboard.css";

const TEMP_KEY = "cg-temp-mode";

const readTempMode = () => {
  try {
    return localStorage.getItem(TEMP_KEY) === "1";
  } catch {
    return false;
  }
};

const API_URL =
  import.meta.env.VITE_API_URL?.trim() || "http://localhost:5000";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const isRemoteId = (id) => UUID_RE.test(String(id));

async function authHeaders() {
  try {
    const { data } = await supabase.auth.getSession();
    const token = data?.session?.access_token;
    return token ? { Authorization: `Bearer ${token}` } : {};
  } catch {
    return {};
  }
}

/* Turn a failed request into something a person can act on, instead of a
   raw status code. */
function describeError(err) {
  if (!err.response) {
    return `⚠️ Cannot reach the API at ${API_URL}.\n\nIs the server running? Start it with \`npm run dev\`.`;
  }

  const { status, data } = err.response;
  const serverMsg = data?.error;

  if (status === 429) return "⚠️ Too many requests. Wait a minute and try again.";
  if (status === 401 || status === 403) {
    return "⚠️ Your session expired. Sign out and sign back in to continue.";
  }
  if (status === 503) {
    return `⚠️ Server not ready.\n\n${serverMsg || "Check the server configuration."}`;
  }
  if (status === 404) return "⚠️ Endpoint not found (404). Is the server code up to date?";
  if (status >= 500) {
    return `⚠️ Server error (${status}): ${
      data?.error || "check the server terminal for details"
    }${data?.detail ? ` — ${data.detail}` : ""}`;
  }

  return `⚠️ Request failed (${status})${serverMsg ? `: ${serverMsg}` : ""}`;
}

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { chatId } = useParams();

  const [chats, setChats] = useState([]);
  const [tempMode, setTempMode] = useState(readTempMode);
  const [tempChat, setTempChat] = useState(null);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [historyError, setHistoryError] = useState("");
  const [input, setInput] = useState("");
  const [pending, setPending] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [toast, setToast] = useState({ show: false, message: "", type: "success" });

  const bottomRef = useRef();
  const composerRef = useRef();

  const activeChat =
    (tempChat && tempChat.id === chatId ? tempChat : null) ||
    chats.find((c) => c.id === chatId) ||
    null;
  const messages = activeChat?.messages ?? [];
  const chatTitle = activeChat?.title || "New Chat";
  const firstName = displayName(user).split(" ")[0];

  const toggleTempMode = () => {
    const next = !tempMode;
    setTempMode(next);
    try {
      localStorage.setItem(TEMP_KEY, next ? "1" : "0");
    } catch {
      /* storage unavailable - mode still applies for this session */
    }

    /* Turning temp mode OFF while sitting inside a temporary chat should
       drop it and start a fresh normal chat - otherwise the old temp
       conversation stays on screen and silently stops saving. */
    if (!next && tempChat && tempChat.id === chatId) {
      setTempChat(null);
      navigate("/");
    }
  };

  const flashToast = useCallback((message, type = "success") => {
    setToast({ show: true, message, type });
  }, []);

  useEffect(() => {
    if (!toast.show) return;
    const id = setTimeout(() => setToast((t) => ({ ...t, show: false })), 2200);
    return () => clearTimeout(id);
  }, [toast.show]);

  /* ---------- Load history once per user ---------- */

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const { data } = await axios.get(`${API_URL}/chats`, {
          headers: await authHeaders()
        });

        if (cancelled) return;

        const remote = (data?.chats || []).map((c) => ({
          id: c.id,
          title: c.title || "New Chat",
          messages: Array.isArray(c.messages) ? c.messages : []
        }));

        setChats(remote);
      } catch (err) {
        if (cancelled) return;

        /* A brand new user has no rows. That is a success, not an error, so
           only surface a banner when the backend genuinely could not answer. */
        const status = err.response?.status;
        const code = err.response?.data?.code;

        if (code === "TABLE_MISSING") {
          setHistoryError(
            "Database setup incomplete. Run supabase/schema.sql in the Supabase SQL Editor."
          );
        } else if (status !== 401 && status !== 503) {
          setHistoryError(describeError(err));
        }
      } finally {
        if (!cancelled) setLoadingHistory(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  /* ---------- Debounced save of the open chat ---------- */

  useEffect(() => {
    if (tempMode || !isRemoteId(chatId) || !activeChat) return;

    const timer = setTimeout(async () => {
      try {
        await axios.patch(
          `${API_URL}/chats/${chatId}`,
          { title: activeChat.title, messages: activeChat.messages },
          { headers: await authHeaders() }
        );
      } catch {
        /* retried on the next edit */
      }
    }, 700);

    return () => clearTimeout(timer);
  }, [activeChat, chatId, tempMode]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length, pending]);

  /* Grow the composer with its content instead of a fixed 1-line box. */
  useEffect(() => {
    const el = composerRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 220)}px`;
  }, [input]);

  const updateChat = (id, fn) => {
    if (id && id.startsWith("temp-")) {
      setTempChat((c) => (c && c.id === id ? fn(c) : c));
      return;
    }
    setChats((prev) => prev.map((c) => (c.id === id ? fn(c) : c)));
  };

  const openChat = (id) => {
    navigate(id ? `/c/${id}` : "/");
    setSidebarOpen(false);
  };

  const deleteChat = async (id) => {
    setChats((prev) => prev.filter((c) => c.id !== id));
    if (tempChat?.id === id) setTempChat(null);
    if (id === chatId) navigate("/");
    flashToast("Chat deleted", "error");

    if (!isRemoteId(id)) return;

    try {
      await axios.delete(`${API_URL}/chats/${id}`, {
        headers: await authHeaders()
      });
    } catch {
      /* removed locally already */
    }
  };

  const clearAllChats = async () => {
    setChats([]);
    setTempChat(null);
    navigate("/");
    flashToast("All chats cleared", "error");

    try {
      await axios.delete(`${API_URL}/chats`, { headers: await authHeaders() });
    } catch {
      /* best effort */
    }
  };

  const retryHistory = () => {
    setHistoryError("");
    setLoadingHistory(true);
    window.location.reload();
  };

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || pending) return;

    setPending(true);
    setInput("");

    let targetId = chatId;

    /* No chat open yet. In temp mode the chat stays local-only (no row is
       ever created in the database); otherwise create it up front so we
       own a real UUID. */
    if (!targetId) {
      if (tempMode) {
        targetId = `temp-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
        setTempChat({ id: targetId, title: "New Chat", messages: [] });
        navigate(`/c/${targetId}`);
      } else {
        try {
          const { data } = await axios.post(
            `${API_URL}/chats`,
            { title: "New Chat", messages: [] },
            { headers: await authHeaders() }
          );

          targetId = data.chat.id;
          setChats((prev) => [
            { id: targetId, title: "New Chat", messages: [] },
            ...prev
          ]);
          navigate(`/c/${targetId}`);
        } catch (err) {
          setPending(false);
          setInput(text);
          flashToast(
            err.response?.data?.code === "TABLE_MISSING"
              ? "Database not set up yet - run supabase/schema.sql"
              : "Could not start the chat. Try again.",
            "error"
          );
          return;
        }
      }
    }

    const userMsg = { role: "user", content: text };
    const history = messages.map((m) => ({ role: m.role, content: m.content }));
    const isUntitled = messages.length === 0;

    updateChat(targetId, (c) => ({
      ...c,
      messages: [...c.messages, userMsg]
    }));

    try {
      const res = await axios.post(
        `${API_URL}/chat`,
        { message: text, messages: history },
        { headers: await authHeaders() }
      );

      updateChat(targetId, (c) => ({
        ...c,
        messages: [...c.messages, { role: "assistant", content: res.data.reply }]
      }));

      if (isUntitled) {
        axios
          .post(
            `${API_URL}/generate-title`,
            { message: text },
            { headers: await authHeaders() }
          )
          .then(({ data }) => {
            if (data?.title) {
              updateChat(targetId, (c) => ({ ...c, title: data.title }));
            }
          })
          .catch(() => {});
      }
    } catch (err) {
      updateChat(targetId, (c) => ({
        ...c,
        messages: [
          ...c.messages,
          { role: "assistant", content: describeError(err), isError: true }
        ]
      }));
    } finally {
      setPending(false);
      composerRef.current?.focus();
    }
  };

  const onComposerKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const suggestions = [
    { title: "Explain closures", prompt: "Explain JavaScript closures with a simple real-world example." },
    { title: "Write a script", prompt: "Write a Python script that bulk-renames files by pattern." },
    { title: "React vs Vue", prompt: "What are the key differences between React and Vue?" },
    { title: "Draft an email", prompt: "Draft a polite follow-up email to a client about a delayed delivery." }
  ];

  return (
    <div className="dash">
      <Toast show={toast.show} message={toast.message} type={toast.type} />

      <Sidebar
        chats={chats}
        newChat={() => openChat(null)}
        setCurrentChat={openChat}
        clearAllChats={clearAllChats}
        currentChat={chatId}
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
        deleteChatById={deleteChat}
        loading={loadingHistory}
      />

      <div className="dashMain">
        <header className="dashHeader">
          <div className="dashHeaderLeft">
            <button
              className="iconBtn onlyMobile"
              onClick={() => setSidebarOpen(true)}
              aria-label="Open sidebar"
            >
              <FaBars />
            </button>

            <div className="dashTitles">
              <span className="dashBrand">चित्रGupt</span>
              <span className="dashSubtitle">
                {activeChat ? chatTitle : `Hi ${firstName}, what can I help with?`}
              </span>
            </div>
          </div>

          <div className="dashHeaderRight">
            <button
              type="button"
              className={`tempToggle ${tempMode ? "on" : ""}`}
              onClick={toggleTempMode}
              aria-pressed={tempMode}
              title={
                tempMode
                  ? "Temporary chat is ON - nothing is saved"
                  : "Turn ON temporary chat"
              }
            >
              <FaCommentSlash />
              {tempMode && <span className="tempBadge">Temp</span>}
            </button>
          </div>
        </header>

        {historyError && (
          <div className="syncBanner" role="status">
            <div>
              <strong>History sync unavailable.</strong> {historyError}
            </div>
            <button className="syncRetry" onClick={retryHistory}>
              <FaRedo /> Retry
            </button>
          </div>
        )}

        <div className="dashBody">
          <div className="dashThread">
            {messages.length === 0 ? (
              <div className="dashEmpty">
                <div className="dashEmptyBadge">✦</div>
                <h1>{tempMode ? "Temporary chat active" : "How can I help you today?"}</h1>
                <p>
                  {tempMode
                    ? "Nothing in this chat is saved to your account. It disappears when you leave or reload."
                    : "Ask anything. Your whole conversation is saved to your account, so you can pick it up on any device."}
                </p>

                <div className="dashSuggestions">
                  {suggestions.map((s) => (
                    <button
                      key={s.title}
                      className="dashSuggestion"
                      onClick={() => {
                        setInput(s.prompt);
                        composerRef.current?.focus();
                      }}
                    >
                      <strong>{s.title}</strong>
                      <span>{s.prompt}</span>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              messages.map((msg, i) => (
                <div
                  key={`${msg.role}-${i}`}
                  className={`dashMsg ${msg.role === "user" ? "fromUser" : "fromAI"}`}
                >
                  <div className={msg.isError ? "msgBox errorBox" : "msgBox"}>
                    <ReactMarkdown>{msg.content}</ReactMarkdown>
                  </div>
                </div>
              ))
            )}

            {pending && (
              <div className="dashMsg fromAI">
                <div className="msgBox typing">
                  <span />
                  <span />
                  <span />
                </div>
              </div>
            )}

            <div ref={bottomRef} />
          </div>
        </div>

        <div className="dashComposerWrap">
          <div className="dashComposer">
            <textarea
              ref={composerRef}
              rows={1}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={onComposerKeyDown}
              placeholder="Message चित्रGupt..."
              aria-label="Message"
              disabled={pending}
            />
            <button
              className="sendBtn"
              onClick={sendMessage}
              disabled={pending || !input.trim()}
              aria-label="Send message"
            >
              {pending ? "…" : "↑"}
            </button>
          </div>
          <p className="dashDisclaimer">
            {tempMode
              ? "Temporary chat - nothing will be saved."
              : "चित्रGupt can make mistakes. Check important info."}
          </p>
        </div>
      </div>
    </div>
  );
}
