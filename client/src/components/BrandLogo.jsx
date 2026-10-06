/* Brand mark for चित्रGupt - a dark app icon with a glowing AI spark,
   drawn as a flat SVG so it scales crisply everywhere. */
export default function BrandLogo({ size = 62, style }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      role="img"
      aria-label="चित्रGupt"
      style={style}
    >
      <defs>
        <linearGradient id="cg-body" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#18181c" />
          <stop offset="1" stopColor="#0b0b0e" />
        </linearGradient>
        <linearGradient id="cg-ring" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#ef6b76" />
          <stop offset="0.5" stopColor="#ce3c49" />
          <stop offset="1" stopColor="#8f1a27" />
        </linearGradient>
        <linearGradient id="cg-spark" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="1" stopColor="#ffb6bf" />
        </linearGradient>
      </defs>

      {/* Dark app icon body */}
      <rect
        x="3"
        y="3"
        width="58"
        height="58"
        rx="17"
        fill="url(#cg-body)"
        stroke="url(#cg-ring)"
        strokeWidth="2"
      />

      {/* AI four-point spark, center */}
      <path
        d="M32 19
           C33.6 25.5 37 29.6 42 31.5
           C37 33.4 33.6 37.5 32 44
           C30.4 37.5 27 33.4 22 31.5
           C27 29.6 30.4 25.5 32 19 Z"
        fill="url(#cg-spark)"
      />

      {/* Orbiting satellite nodes */}
      <circle cx="46" cy="21" r="3" fill="#ce3c49" />
      <circle cx="46" cy="21" r="3" fill="#ef6b76" stroke="#ffd7dc" strokeWidth="0.8" />
      <circle cx="47.5" cy="46" r="2.2" fill="#ef6b76" />
      <circle cx="20" cy="47" r="2.2" fill="#8f1a27" />
    </svg>
  );
}