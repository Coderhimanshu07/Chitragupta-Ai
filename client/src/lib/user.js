/* Shared display-name / avatar logic so the header and the settings page
   never disagree about what the user is called. */

export function displayName(user) {
  const meta = user?.user_metadata || {};

  return (
    meta.full_name?.trim() ||
    meta.name?.trim() ||
    /* Fall back to the part of the email before the @ so the avatar is
       never a bare "?" for accounts without an OAuth name. */
    (user?.email || "Guest").split("@")[0]
  );
}

export function initialsFor(name = "") {
  const parts = String(name).trim().split(/\s+/).filter(Boolean);

  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();

  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/* Deterministic gradient per user so the same person always gets the same
   colour, instead of flickering between colours on every render.
   All entries stay inside the red/black brand range. */
const GRADIENTS = [
  ["#ce3c49", "#7a1421"],
  ["#e8515e", "#a81020"],
  ["#f0646f", "#8f1d2b"],
  ["#d43846", "#4a0c14"],
  ["#ef6b76", "#6b1220"],
  ["#c22a38", "#2b070c"]
];

export function avatarGradient(seed = "") {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }
  const [from, to] = GRADIENTS[hash % GRADIENTS.length];
  return `linear-gradient(135deg, ${from} 0%, ${to} 100%)`;
}

export function avatarSeed(user) {
  return user?.id || user?.email || "guest";
}
