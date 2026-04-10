import { createPortal } from "react-dom";
import "./toast.css";

function Toast({ show, message, type }) {
    if (!show) return null;

    return createPortal(
        <div className="toast-overlay">
            <div className={`toast-box ${type === "error" ? "toast-error" : "toast-success"}`}>
                <div className="tick"></div>
                <p>{message}</p>

            </div>
        </div>,
        document.body
    );
}

export default Toast;