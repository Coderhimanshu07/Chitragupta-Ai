import { useState } from "react";
import { FcGoogle } from "react-icons/fc";
import { FaLock, FaEnvelope, FaEye, FaEyeSlash, FaArrowLeft } from "react-icons/fa";
import { useAuth } from "../AuthContext";
import { supabaseReady } from "../supabase";
import logo from "../assets/CAi2.jpg";
import "./auth.css";

const HIGHLIGHTS = [
  "Remembers every conversation thread",
  "Runs on Groq's fastest open models",
  "Your history, synced across devices"
];

export default function Auth() {
  const { signInWithGoogle, signInWithEmail, signUpWithEmail } = useAuth();

  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const isLogin = mode === "login";

  const onGoogle = async () => {
    if (!supabaseReady) return;
    setBusy(true);
    setError("");
    try {
      const { error: err } = await signInWithGoogle();
      if (err) setError(err.message);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      setError("Email and password are required.");
      return;
    }

    setBusy(true);
    setError("");
    setNotice("");

    try {
      if (isLogin) {
        const { error: err } = await signInWithEmail(email.trim(), password);
        if (err) setError(err.message);
      } else {
        const { data, error: err } = await signUpWithEmail(email.trim(), password);
        if (err) setError(err.message);
        else if (!data.session) setNotice("Check your inbox to confirm your email.");
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const switchMode = () => {
    setMode(isLogin ? "signup" : "login");
    setError("");
    setNotice("");
  };

  return (
    <div className="authPage">
      {/* Left: brand panel */}
      <div className="authAside">
        <div className="authAsideInner">
          <div className="authBrand">
            <img src={logo} alt="Chitragupt AI" className="authLogo" />
            {/* <span className="authBrandText">चित्रGupt</span> */}
          </div>

              {/* <h1 className="authHeadline">
                Your AI that
                <br />
                <span className="gradText">actually remembers you.</span>
              </h1> */}

          <p className="authSub">
            Sign in to keep every thread across devices and pick up exactly where you left off.
          </p>

          {/* <ul className="authHighlights">
            {HIGHLIGHTS.map((h) => (
              <li key={h}>
                <span className="tickMark">✓</span>
                {h}
              </li>
            ))}
          </ul> */}
        </div>
        <div className="authGlowOrb" aria-hidden="true" />
      </div>

      {/* Right: form panel */}
      <div className="authPanel">
        <div className="authCard">
          {!supabaseReady && (
            <div className="authAlert warn">
              <strong>Supabase not configured.</strong>
              <br />
              Add <code>VITE_SUPABASE_URL</code> and{" "}
              <code>VITE_SUPABASE_PUBLISHABLE_KEY</code> to <code>client/.env</code>, then
              restart the dev server.
            </div>
          )}

          {mode === "signup" && (
            <button className="backBtn" onClick={() => switchMode()}>
              <FaArrowLeft /> Back to login
            </button>
          )}

          <h2 className="authTitle">{isLogin ? "Welcome back" : "Create your account"}</h2>
          <p className="authMeta">
            {isLogin ? "Sign in to continue your conversations." : "It takes less than a minute."}
          </p>

          <button className="googleBtn" onClick={onGoogle} disabled={busy || !supabaseReady}>
            <FcGoogle size={20} />
            {isLogin ? "Continue with Google" : "Sign up with Google"}
          </button>

          <div className="divider">
            <span>or continue with email</span>
          </div>

          <form onSubmit={onSubmit} className="authForm">
            <label className="field">
              <span className="fieldLabel">Email</span>
              <span className="fieldBox">
                <FaEnvelope className="fieldIcon" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  autoComplete="email"
                  required
                />
              </span>
            </label>

            <label className="field">
              <span className="fieldLabel">Password</span>
              <span className="fieldBox">
                <FaLock className="fieldIcon" />
                <input
                  type={showPass ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={isLogin ? "Your password" : "At least 6 characters"}
                  autoComplete={isLogin ? "current-password" : "new-password"}
                  minLength={6}
                  required
                />
                <button
                  type="button"
                  className="passToggle"
                  onClick={() => setShowPass((v) => !v)}
                  aria-label={showPass ? "Hide password" : "Show password"}
                >
                  {showPass ? <FaEyeSlash /> : <FaEye />}
                </button>
              </span>
            </label>

            {error && <div className="authAlert error">{error}</div>}
            {notice && <div className="authAlert ok">{notice}</div>}

            <button type="submit" className="submitBtn" disabled={busy || !supabaseReady}>
              {busy ? <span className="spinner" /> : isLogin ? "Sign in" : "Create account"}
            </button>
          </form>

          <p className="switchLine">
            {isLogin ? "New to चित्रGupt?" : "Already have an account?"}{" "}
            <button onClick={switchMode} disabled={busy}>
              {isLogin ? "Create an account" : "Sign in"}
            </button>
          </p>

          <p className="legal">By continuing you agree to the Terms and Privacy Policy.</p>
        </div>
      </div>
    </div>
  );
}