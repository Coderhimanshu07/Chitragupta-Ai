import logo from "./assets/logo.png";

function Sidebar({
    chats,
    newChat,
    setCurrentChat,
    clearAllChats,
    currentChat,
    sidebarOpen,
    setSidebarOpen
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

            <div className={`sidebar d-flex flex-column vh-100 p-2 ${sidebarOpen ? "open" : ""}`}>

                {/* 🔥 HEADER (logo + cut button) */}
                <div className="d-flex justify-content-between align-items-center mb-3">

                    <img src={logo} alt="logo" height="50" />

                    {/* 🔥 CUT BUTTON */}
                    <div className="d-flex align-items-center mb-1 position-relative">

                        {/* CROSS BUTTON */}
                        <button
                            className="btn d-md-none border-0 text-danger fs-4 position-absolute end-0 translate-middle-y px-3 top-50"
                            onClick={() => setSidebarOpen(false)}
                        >
                            ✕
                        </button>

                    </div>

                </div>

                <button
                    className="btn btn-primary w-100 mb-3"
                    onClick={() => {
                        newChat();
                        setSidebarOpen(false);
                    }}
                >
                    + New Chat
                </button>

                <div className="flex-grow-1 overflow-auto">

                    {chats.map(chat => (

                        <div
                            key={chat.id}
                            className={`historyItem ${currentChat === chat.id ? "activeChat" : ""}`}
                            onClick={() => {
                                setCurrentChat(chat.id);
                                setSidebarOpen(false);
                            }}
                        >
                            {chat.title}
                        </div>

                    ))}

                </div>

                <div className="mt-auto pt-2">

                    <button
                        className="btn btn-danger w-100"
                        onClick={() => {
                            clearAllChats();
                            setSidebarOpen(false);
                        }}
                    >
                        Clear All Chats
                    </button>

                </div>

            </div>
        </>

    );
}

export default Sidebar;