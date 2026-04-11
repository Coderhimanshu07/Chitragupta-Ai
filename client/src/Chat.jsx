import { useState, useEffect, useRef } from "react";
import axios from "axios";
import ReactMarkdown from "react-markdown";
import "./chat.css";
import "bootstrap/dist/css/bootstrap.min.css";
import logo from "./assets/logo.png";
import Sidebar from "./Sidebar";
import ChatMenu from "./ChatMenu";
import Toast from "./toast";
import { FaBars } from "react-icons/fa";

function Chat() {
  const [showToast, setShowToast] = useState(false);
  const [showDeleteToast, setShowDeleteToast] = useState(false); // 🔥 NEW
  const [input, setInput] = useState("");
  const [chats, setChats] = useState(() => {
    const saved = localStorage.getItem("chats");
    return saved ? JSON.parse(saved) : [];
  });

  const [currentChat, setCurrentChat] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showClearToast, setShowClearToast] = useState(false);


  const bottomRef = useRef();
  const activeChat = chats.find(chat => chat.id === currentChat);
  const currentTitle = activeChat?.title || "New Chat";
  const isReportEnabled =
    activeChat && activeChat.messages.length > 0;

  // ✅ New Chat
  const newChat = () => {
    const chat = {
      id: Date.now(),
      title: "New Chat",
      messages: []
    };

    setChats(prev => [chat, ...prev]);
    setCurrentChat(chat.id);
    setSidebarOpen(false);
  };

  // ✅ Delete Chat (🔥 UPDATED)
  const deleteCurrentChat = () => {
    if (!currentChat) return;
    setChats(prev => prev.filter(chat => chat.id !== currentChat));
    setCurrentChat(null);

    // 🔥 SHOW DELETE TOAST
    setShowDeleteToast(true);
    setTimeout(() => setShowDeleteToast(false), 2000);
  };

  // ✅ Clear All
  const clearAllChats = () => {
    setChats([]);
    setCurrentChat(null);
    localStorage.removeItem("chats");
    // 🔥 Toast trigger
    setShowClearToast(true);
    setTimeout(() => setShowClearToast(false), 2000);
  };

  // ✅ Report
  const handleReport = () => {
    setShowToast(true);
    setTimeout(() => setShowToast(false), 2000);
  };

  // ✅ Save chats
  useEffect(() => {
    localStorage.setItem("chats", JSON.stringify(chats));
  }, [chats]);

  // ✅ Auto scroll
  useEffect(() => {
    setTimeout(() => {
      bottomRef.current?.scrollIntoView({
        behavior: "smooth"
      });
    }, 100);
  }, [chats]);

  // ✅ Send Message
  const sendMessage = async () => {
    if (!input) return;

    let chatId = currentChat;

    if (!chatId) {
      const chat = {
        id: Date.now(),
        title: "New Chat",
        messages: []
      };

      setChats(prev => [chat, ...prev]);
      setCurrentChat(chat.id);
      chatId = chat.id;
    }

    const userMsg = {
      role: "user",
      content: input
    };

    const active = chats.find(c => c.id === chatId);
    let newTitle = active?.title || "New Chat";

    if (!active || active.messages.length === 0) {
      try {
        const titleRes = await axios.post(
          `${import.meta.env.VITE_API_URL}/generate-title`,
          { message: input }
        );
        newTitle = titleRes.data.title;
      } catch {
        console.log("Title generation failed");
      }
    }

    setChats(prev =>
      prev.map(chat =>
        chat.id === chatId
          ? {
            ...chat,
            title: newTitle,
            messages: [...chat.messages, userMsg]
          }
          : chat
      )
    );

    const res = await axios.post(
      `${import.meta.env.VITE_API_URL}/chat`,
      { message: input }
    );

    const aiMsg = {
      role: "assistant",
      content: res.data.reply
    };

    setChats(prev =>
      prev.map(chat =>
        chat.id === chatId
          ? {
            ...chat,
            messages: [...chat.messages, aiMsg]
          }
          : chat
      )
    );

    setInput("");
  };

  return (
    <div className="app">

      {/* TOASTS */}
      <Toast show={showToast} message="Thanks for reporting" />
      <Toast show={showDeleteToast} message="Chat Deleted" type="error" />
      <Toast show={showClearToast} message="All Chats Cleared" type="error" />

      {/* Sidebar */}
      <Sidebar
        chats={chats}
        newChat={newChat}
        setCurrentChat={(id) => {
          setCurrentChat(id);
          setSidebarOpen(false);
        }}
        clearAllChats={clearAllChats}
        currentChat={currentChat}
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
      />

      <div className="main d-flex flex-column min-vh-100">

        {/* HEADER */}
        <div className="header border-bottom bg-white sticky-top">
          <div className="container-fluid py-2">
            <div className="d-flex align-items-center flex-wrap">

              {/* LEFT */}
              <div className="d-flex align-items-center gap-3">
                <button
                  className="btn btn-light d-md-none"
                  onClick={() => setSidebarOpen(true)}
                >
                  <FaBars />
                </button>

                <div className="lh-sm">
                  <h5 className="m-0 fw-bold text-danger">
                    चित्रGupt
                  </h5>
                  <small className="text-muted">
                    India's First Leading AI
                  </small>
                </div>
              </div>

              {/* RIGHT */}
              <div className="d-flex align-items-center gap-3 ms-auto flex-wrap">

                {currentChat && (
                  <div className="text-dark fw-semibold ms-3 border-start ps-3 d-none d-md-block">
                    {currentTitle}
                  </div>
                )}

                <ChatMenu
                  deleteCurrentChat={deleteCurrentChat}
                  onReport={handleReport}
                  isReportEnabled={isReportEnabled}
                />
              </div>
            </div>
          </div>
        </div>

        {/* CHAT */}
        <div className="chatWrapper d-flex flex-column flex-grow-1">
          <div className="chatMessages">
            {activeChat?.messages.map((msg, i) => (
              <div
                key={i}
                className={
                  msg.role === "user"
                    ? "msgRow userRow"
                    : "msgRow aiRow"
                }
              >
                <div className="msgBox">
                  <ReactMarkdown>
                    {msg.content}
                  </ReactMarkdown>
                </div>
              </div>
            ))}
            <div ref={bottomRef}></div>
          </div>

          <div className="inputArea">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") sendMessage();
              }}
              placeholder="Ask to चित्रGupt ..."
            />

            <button
              className="bg-primary text-white"
              onClick={sendMessage}
            >
              Send
            </button>
          </div>

        </div>

        <div className="bg-light border-top py-2 text-center small">
          Copyright © 2026 | Made with ❤️ by <strong>Coderhimanshu</strong>
        </div>

      </div>
    </div>
  );
}

export default Chat;