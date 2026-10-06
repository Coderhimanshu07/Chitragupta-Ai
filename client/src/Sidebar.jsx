import { useEffect, useRef, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { FaPlus, FaTrash, FaRegCommentAlt } from "react-icons/fa";
import { BsThreeDotsVertical } from "react-icons/bs";
import { useAuth } from "./AuthContext";
import { displayName } from "./lib/user";
import { AvatarCircle } from "./components/UserAvatar";
import logo from "./assets/logo.png";

function ItemMenu({ onDelete }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;

    const onDown = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };

    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  return (
    <div className="itemMenuWrap" ref={ref}>
      <button
        className="itemMenuBtn"
        aria-label="Chat options"
        aria-expanded={open}
        onClick={(e) => {
          e.stopPropagation();
          setOpen((o) => !o);
        }}
      >
        <BsThreeDotsVertical />
      </button>

      {open && (
        <div className="sidebar-dropdown">
          <button
            className="sidebar-dropdown-item text-danger"
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
              setOpen(false);
            }}
          >
            <FaTrash size={12} /> Delete chat
          </button>
        </div>
      )}
    </div>
  );
}

export default function Sidebar({
  chats,
  newChat,
  setCurrentChat,
  clearAllChats,
  currentChat,
  sidebarOpen,
  setSidebarOpen,
  deleteChatById,
  loading = false
}) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

  const go = (fn) => {
    fn();
    setSidebarOpen(false);
  };

  return (
    <>
      {sidebarOpen && (
        <div className="sidebarOverlay" onClick={() => setSidebarOpen(false)} />
      )}

      <aside className={`sidebar ${sidebarOpen ? "open" : ""}`}>
        <div className="sideHead">
          <img className="sideLogo" src={logo} alt="चित्रGupt" />

          <button
            className="sideClose"
            onClick={() => setSidebarOpen(false)}
            aria-label="Close sidebar"
          >
            ✕
          </button>
        </div>

        <button className="newChatBtn" onClick={() => go(newChat)}>
          <FaPlus size={14} /> New chat
        </button>

        <div className="historyList">
          {/* Don't claim "no chats yet" before the request has answered -
              that reads as a failure to a brand new user. */}
          {loading ? (
            <p className="historyEmpty">Loading chats…</p>
          ) : chats.length === 0 ? (
            <p className="historyEmpty">No chats yet</p>
          ) : (
            chats.map((chat) => {
              const active = currentChat === chat.id;

              return (
                <div
                  key={chat.id}
                  className={`historyItem ${active ? "activeChat" : ""}`}
                  role="button"
                  tabIndex={0}
                  onClick={() => go(() => setCurrentChat(chat.id))}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      go(() => setCurrentChat(chat.id));
                    }
                  }}
                >
                  <FaRegCommentAlt size={14} className="flex-shrink-0" />
                  <span title={chat.title}>{chat.title}</span>

                  {active && (
                    <ItemMenu onDelete={() => deleteChatById(chat.id)} />
                  )}
                </div>
              );
            })
          )}
        </div>

        <div className="sideFoot">
          <button
            className={`sideLink ${location.pathname === "/settings" ? "on" : ""}`}
            onClick={() => go(() => navigate("/settings"))}
            title="Account settings"
            aria-label="Account settings"
          >
            <AvatarCircle user={user} size="sm" />
            <span className="sideLinkName">{displayName(user)}</span>
          </button>

          {chats.length > 0 && (
            <button className="clearBtn" onClick={() => go(clearAllChats)}>
              <FaTrash size={14} /> Clear all chats
            </button>
          )}
        </div>
      </aside>
    </>
  );
}
