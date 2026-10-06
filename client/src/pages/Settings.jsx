import { useState } from "react";
import { useNavigate } from "react-router-dom";
import UserAvatar from "../components/UserAvatar";
import { useAuth } from "../AuthContext";
import { supabase } from "../supabase";
import { displayName } from "../lib/user";
import {
  FaArrowLeft,
  FaCheck,
  FaExclamationTriangle,
  FaKey,
  FaEnvelope,
  FaUser,
  FaSignOutAlt
} from "react-icons/fa";
import "./settings.css";

const MIN_PASSWORD = 8;

function Banner({ kind, children }) {
  if (!children) return null;
  return (
    <div className={`setBanner ${kind}`} role="status">
      {kind === "ok" ? <FaCheck /> : <FaExclamationTriangle />}
      <span>{children}</span>
    </div>
  );
}

export default function Settings() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  const meta = user?.user_metadata || {};
  const isGoogle = user?.app_metadata?.provider === "google";

  const [name, setName] = useState(() => displayName(user));
  const [nameMsg, setNameMsg] = useState("");
  const [nameBusy, setNameBusy] = useState(false);

  const [email, setEmail] = useState(user?.email || "");
  const [emailMsg, setEmailMsg] = useState("");
  const [emailBusy, setEmailBusy] = useState(false);

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [pwMsg, setPwMsg] = useState("");
  const [pwBusy, setPwBusy] = useState(false);

  /* ---------- Display name ---------- */

  const saveName = async (e) => {
    e.preventDefault();
    const clean = name.trim();

    if (!clean) {
      setNameMsg({ kind: "err", text: "Name cannot be empty." });
      return;
    }
    if (clean === displayName(user)) {
      setNameMsg({ kind: "ok", text: "No changes to save." });
      return;
    }

    setNameBusy(true);
    setNameMsg("");

    /* Keep `name` in sync too so Google/avatar lookups stay consistent. */
    const { error } = await supabase.auth.updateUser({
      data: { full_name: clean, name: clean }
    });

    setNameBusy(false);
    setNameMsg(
      error
        ? { kind: "err", text: error.message }
        : { kind: "ok", text: "Name updated." }
    );
  };

  /* ---------- Email ---------- */

  const saveEmail = async (e) => {
    e.preventDefault();
    const clean = email.trim().toLowerCase();

    if (clean === user?.email?.toLowerCase()) {
      setEmailMsg({ kind: "ok", text: "That is already your email." });
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean)) {
      setEmailMsg({ kind: "err", text: "Enter a valid email address." });
      return;
    }

    setEmailBusy(true);
    setEmailMsg("");

    const { error } = await supabase.auth.updateUser({ email: clean });

    setEmailBusy(false);
    setEmailMsg(
      error
        ? { kind: "err", text: error.message }
        : {
            kind: "ok",
            text: "Confirmation link sent. Verify it to finish changing your email."
          }
    );
  };

  /* ---------- Password ---------- */

  const savePassword = async (e) => {
    e.preventDefault();

    if (password.length < MIN_PASSWORD) {
      setPwMsg({ kind: "err", text: `Use at least ${MIN_PASSWORD} characters.` });
      return;
    }
    if (password !== confirm) {
      setPwMsg({ kind: "err", text: "Both passwords must match." });
      return;
    }

    setPwBusy(true);
    setPwMsg("");

    const { error } = await supabase.auth.updateUser({ password });

    setPwBusy(false);

    if (error) {
      setPwMsg({ kind: "err", text: error.message });
      return;
    }

    setPassword("");
    setConfirm("");
    setPwMsg({ kind: "ok", text: "Password updated." });
  };

  return (
    <div className="setPage">
      <header className="setHeader">
        <button className="iconBtn" onClick={() => navigate("/")} aria-label="Back to dashboard">
          <FaArrowLeft />
        </button>

        <span className="setHeaderTitle">Settings</span>

        <UserAvatar user={user} size="md" />
      </header>

      <main className="setMain">
        <div className="setIntro">
          <div className="setAvatarWrap">
            <UserAvatar user={user} size="xl" />
          </div>
          <h1>Your account</h1>
          <p>{user?.email}</p>
        </div>

        {/* Display name */}
        <section className="setCard">
          <div className="setCardHead">
            <FaUser className="setCardIcon" />
            <div>
              <h2>Display name</h2>
              <p>Shown on your account and next to your avatar.</p>
            </div>
          </div>

          <form className="setForm" onSubmit={saveName}>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
              maxLength={80}
              autoComplete="name"
              aria-label="Display name"
            />
            <button type="submit" className="setBtn" disabled={nameBusy}>
              {nameBusy ? "Saving…" : "Save"}
            </button>
          </form>

          <Banner kind={nameMsg.kind}>{nameMsg.text}</Banner>
        </section>

        {/* Email */}
        <section className="setCard">
          <div className="setCardHead">
            <FaEnvelope className="setCardIcon" />
            <div>
              <h2>Email address</h2>
              <p>Used to sign in. Changing it requires email confirmation.</p>
            </div>
          </div>

          <form className="setForm" onSubmit={saveEmail}>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              autoComplete="email"
              aria-label="Email address"
            />
            <button type="submit" className="setBtn" disabled={emailBusy}>
              {emailBusy ? "Sending…" : "Update"}
            </button>
          </form>

          <Banner kind={emailMsg.kind}>{emailMsg.text}</Banner>
        </section>

        {/* Password */}
        <section className="setCard">
          <div className="setCardHead">
            <FaKey className="setCardIcon" />
            <div>
              <h2>Password</h2>
              <p>Minimum {MIN_PASSWORD} characters.</p>
            </div>
          </div>

          {isGoogle ? (
            <div className="setNote">
              You signed in with Google, so your password is managed by Google.
              Use{" "}
              <a
                href="https://myaccount.google.com/security"
                target="_blank"
                rel="noreferrer"
              >
                Google Account Security
              </a>{" "}
              to change it.
            </div>
          ) : (
            <>
              <form className="setForm" onSubmit={savePassword}>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="New password"
                  autoComplete="new-password"
                  aria-label="New password"
                />
                <input
                  type="password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  placeholder="Confirm password"
                  autoComplete="new-password"
                  aria-label="Confirm password"
                />
                <button type="submit" className="setBtn" disabled={pwBusy}>
                  {pwBusy ? "Updating…" : "Update"}
                </button>
              </form>

              <Banner kind={pwMsg.kind}>{pwMsg.text}</Banner>
            </>
          )}
        </section>

        {/* Account details */}
        <section className="setCard">
          <h2 className="setPlainHead">Account details</h2>

          <dl className="setMeta">
            <div>
              <dt>Provider</dt>
              <dd>{user?.app_metadata?.provider || "email"}</dd>
            </div>
            <div>
              <dt>User ID</dt>
              <dd className="setMono">{user?.id}</dd>
            </div>
            <div>
              <dt>Joined</dt>
              <dd>
                {user?.created_at
                  ? new Date(user.created_at).toLocaleDateString(undefined, {
                      year: "numeric",
                      month: "short",
                      day: "numeric"
                    })
                  : "—"}
              </dd>
            </div>
            <div>
              <dt>Full name on record</dt>
              <dd>{meta.full_name || meta.name || "—"}</dd>
            </div>
          </dl>
        </section>

        <button className="setSignOut" onClick={signOut}>
          <FaSignOutAlt /> Sign out
        </button>
      </main>
    </div>
  );
}
