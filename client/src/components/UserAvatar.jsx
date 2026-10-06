import { useNavigate } from "react-router-dom";
import {
  displayName,
  initialsFor,
  avatarGradient,
  avatarSeed
} from "../lib/user";
import "./avatar.css";

/* Presentational circle - no interactivity, so it is safe to nest inside
   another button (a <button> inside a <button> is invalid HTML). */
export function AvatarCircle({ user, size = "md", name: given }) {
  const label = given ?? displayName(user);
  const sizeClass = size ? `avatar-${size}` : "";

  return (
    <span
      className={`avatarCircle ${sizeClass}`.trim()}
      style={{ background: avatarGradient(avatarSeed(user)) }}
      aria-hidden="true"
    >
      {initialsFor(label)}
    </span>
  );
}

/* Standalone clickable avatar. */
export default function UserAvatar({ user, size = "md", showLabel = false }) {
  const navigate = useNavigate();
  const name = displayName(user);

  return (
    <button
      type="button"
      className={`userAvatarBtn avatar-${size}`}
      onClick={() => navigate("/settings")}
      title="Account settings"
      aria-label={`Account settings for ${name}`}
    >
      <AvatarCircle user={user} size="" name={name} />
      {showLabel && <span className="avatarLabel">{name}</span>}
    </button>
  );
}
