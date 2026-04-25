import logo from "./assets/logo.png";
import { FaPlus, FaTrash, FaRegCommentAlt, FaFlag } from "react-icons/fa";
import { BsThreeDotsVertical } from "react-icons/bs";
import { useState, useRef, useEffect } from "react";

function SidebarMenu({ onDelete, onReport }) {
    const [open, setOpen] = useState(false);
    const menuRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (menuRef.current && !menuRef.current.contains(event.target)) {
                setOpen(false);
            }
        };

        if (open) {
            document.addEventListener("mousedown", handleClickOutside);
        }
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [open]);

    return (
        <div className="position-relative ms-auto" ref={menuRef}>
            <button
                className="btn btn-sm text-light p-0 border-0 d-flex align-items-center justify-content-center"
                style={{ width: '24px', height: '24px', opacity: 0.7 }}
                onClick={(e) => {
                    e.stopPropagation();
                    setOpen(!open);
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
                        <FaTrash size={12} /> Delete Chat
                    </button>

                    <button
                        className="sidebar-dropdown-item text-warning"
                        onClick={(e) => {
                            e.stopPropagation();
                            onReport();
                            setOpen(false);
                        }}
                    >
                        <FaFlag size={12} /> Report
                    </button>
                </div>
            )}
        </div>
    );
}

function Sidebar({
    chats,
    newChat,
    setCurrentChat,
    clearAllChats,
    currentChat,
    sidebarOpen,
    setSidebarOpen,
    deleteChatById,
    onReport
}) {

    return (

        <>
            {/* 🔥 OVERLAY */}
            {sidebarOpen && (
                <div
                    className="sidebarOverlay"
                    onClick={() => setSidebarOpen(false)}
                />
            )}

            <div className={`sidebar ${sidebarOpen ? "open" : ""}`}>

                {/* 🔥 HEADER (logo + cut button) */}
                <div className="d-flex justify-content-between align-items-center mb-3">

                    <img src={logo} alt="logo" height="45" className="img-fluid" style={{ maxHeight: '45px' }} />

                    {/* 🔥 CUT BUTTON - visible on mobile */}
                    <button
                        className="btn d-lg-none border-0 text-white fs-5 p-1"
                        onClick={() => setSidebarOpen(false)}
                        aria-label="Close sidebar"
                    >
                        ✕
                    </button>

                </div>

                <button
                    className="newChatBtn"
                    onClick={() => {
                        newChat();
                        setSidebarOpen(false);
                    }}
                >
                    <FaPlus size={14} /> New Chat
                </button>

                <div className="historyList">

                    {chats.length === 0 ? (
                        <div className="text-muted small text-center py-3">
                            No chats yet
                        </div>
                    ) : (
                        chats.map(chat => (

                            <div
                                key={chat.id}
                                className={`historyItem ${currentChat === chat.id ? "activeChat" : ""}`}
                                onClick={() => {
                                    setCurrentChat(chat.id);
                                    setSidebarOpen(false);
                                }}
                            >
                                <FaRegCommentAlt size={14} className="flex-shrink-0" />
                                <span>{chat.title}</span>
                                {currentChat === chat.id && (
                                    <SidebarMenu 
                                        onDelete={() => deleteChatById(chat.id)}
                                        onReport={onReport}
                                    />
                                )}
                            </div>

                        ))
                    )}

                </div>

                <div className="mt-auto pt-2">

                    <button
                        className="clearBtn"
                        onClick={() => {
                            clearAllChats();
                            setSidebarOpen(false);
                        }}
                    >
                        <FaTrash size={14} /> Clear All Chats
                    </button>

                </div>

            </div>
        </>

    );
}

export default Sidebar;