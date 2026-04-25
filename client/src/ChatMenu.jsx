import { useState, useRef, useEffect } from "react";
import { BsThreeDotsVertical } from "react-icons/bs";
import { FaShareAlt, FaTrash, FaFlag } from "react-icons/fa";
import "bootstrap/dist/css/bootstrap.min.css";
import "./chat.css";

function ChatMenu({ deleteCurrentChat, onReport, isReportEnabled }) {

    const [open, setOpen] = useState(false);
    const menuRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (menuRef.current && !menuRef.current.contains(event.target)) {
                setOpen(false);
            }
        };

        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    return (
        <div className="position-relative" ref={menuRef}>

            {/* 3-dot button */}
            <button
                className="btn btn-light border rounded-circle shadow-sm"
                onClick={() => setOpen(!open)}
            >
                <BsThreeDotsVertical />
            </button>

            {open && (
                <div className="dropdown-menu show shadow-lg p-2 custom-dropdown">

                    <button
                        className="dropdown-item d-flex align-items-center gap-2 text-danger"
                        onClick={() => {
                            deleteCurrentChat();
                            setOpen(false);
                        }}
                    >
                        <FaTrash /> Delete Chat
                    </button>

                    <button
                        onClick={() => {
                            onReport();
                            setOpen(false);
                        }}
                        disabled={!isReportEnabled}
                        className={`dropdown-item d-flex align-items-center gap-2 ${isReportEnabled ? "text-warning" : "text-muted"
                            }`}
                    >
                        <FaFlag /> Report
                    </button>

                </div>
            )}

        </div>
    );
}

export default ChatMenu;