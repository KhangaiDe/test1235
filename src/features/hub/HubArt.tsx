/**
 * Cover illustrations for the Business hub report cards. Inline SVG, so they
 * need no image files and scale to any card width (viewBox 640x320).
 */

/** Open-pit coal mine at dusk: benches, a haul truck and a coal stockpile. */
export function CoalArt({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 640 320" preserveAspectRatio="xMidYMid slice" className={className} aria-hidden>
      <defs>
        <linearGradient id="coal-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#0e1d1a" />
          <stop offset="0.65" stopColor="#1c3a33" />
          <stop offset="1" stopColor="#2b4a40" />
        </linearGradient>
        <linearGradient id="coal-glow" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#21cda8" stopOpacity="0.35" />
          <stop offset="1" stopColor="#21cda8" stopOpacity="0" />
        </linearGradient>
      </defs>
      <rect width="640" height="320" fill="url(#coal-sky)" />
      <circle cx="520" cy="78" r="34" fill="#f2c46d" opacity="0.9" />
      <circle cx="520" cy="78" r="60" fill="#f2c46d" opacity="0.08" />
      {/* far ridge */}
      <path d="M0 170 L90 128 L170 150 L260 108 L360 140 L450 112 L540 150 L640 126 L640 320 L0 320Z" fill="#23423a" />
      {/* pit benches */}
      <path d="M0 196 L640 182 L640 320 L0 320Z" fill="#2f2b27" />
      <path d="M40 214 L600 204 L580 226 L60 234Z" fill="#3a352f" />
      <path d="M80 244 L560 236 L540 258 L100 264Z" fill="#45403a" />
      <path d="M120 272 L520 266 L500 290 L140 294Z" fill="#514b44" />
      <path d="M40 214 L600 204 L600 208 L40 218Z" fill="#5c564e" />
      <path d="M80 244 L560 236 L560 240 L80 248Z" fill="#665f57" />
      {/* haul road */}
      <path d="M0 300 C140 290 220 262 330 252 S520 214 640 206" stroke="#7a7167" strokeWidth="6" fill="none" strokeDasharray="14 10" opacity="0.6" />
      {/* coal stockpile */}
      <path d="M392 300 Q450 214 520 300Z" fill="#111" />
      <path d="M430 300 Q480 238 560 300Z" fill="#1b1b1b" />
      <path d="M452 246 L462 240 L470 248 L460 254Z" fill="#2a2a2a" />
      {/* haul truck */}
      <g transform="translate(150 196)">
        <path d="M0 40 L18 10 L118 10 L132 40Z" fill="#21cda8" />
        <path d="M18 10 L40 0 L128 0 L118 10Z" fill="#169b80" />
        <path d="M30 6 Q70 -14 112 4 L104 10 L40 10Z" fill="#111" />
        <rect x="128" y="18" width="40" height="22" rx="3" fill="#169b80" />
        <rect x="136" y="22" width="18" height="10" rx="2" fill="#bff3e6" />
        <rect x="-4" y="38" width="176" height="8" rx="2" fill="#0b2a24" />
        {[24, 62, 148].map((x) => (
          <g key={x}>
            <circle cx={x} cy="52" r="15" fill="#0d0f12" />
            <circle cx={x} cy="52" r="6" fill="#6b7079" />
          </g>
        ))}
      </g>
      <rect x="0" y="180" width="640" height="40" fill="url(#coal-glow)" opacity="0.4" />
    </svg>
  );
}

/** Tugrik and dollar coins over a rising rate line. */
export function FxArt({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 640 320" preserveAspectRatio="xMidYMid slice" className={className} aria-hidden>
      <defs>
        <linearGradient id="fx-bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#e3f7f1" />
          <stop offset="1" stopColor="#b9eedf" />
        </linearGradient>
        <linearGradient id="fx-area" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#21cda8" stopOpacity="0.45" />
          <stop offset="1" stopColor="#21cda8" stopOpacity="0" />
        </linearGradient>
        <radialGradient id="fx-coin" cx="0.35" cy="0.3" r="0.8">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="1" stopColor="#dfe6e4" />
        </radialGradient>
      </defs>
      <rect width="640" height="320" fill="url(#fx-bg)" />
      {[70, 130, 190, 250].map((y) => (
        <line key={y} x1="0" x2="640" y1={y} y2={y} stroke="#0f8a6c" strokeOpacity="0.12" />
      ))}
      {/* rate line with a step near the end */}
      <path d="M0 238 L80 232 L150 236 L220 226 L290 228 L360 218 L420 214 L470 206 L520 170 L580 150 L640 128 L640 320 L0 320Z" fill="url(#fx-area)" />
      <path d="M0 238 L80 232 L150 236 L220 226 L290 228 L360 218 L420 214 L470 206 L520 170 L580 150 L640 128" fill="none" stroke="#0f8a6c" strokeWidth="4" strokeLinejoin="round" />
      <circle cx="520" cy="170" r="7" fill="#fff" stroke="#0f8a6c" strokeWidth="4" />
      {/* dashed scenario fan */}
      <path d="M520 170 L640 96" stroke="#b45f06" strokeWidth="3" strokeDasharray="8 7" fill="none" />
      <path d="M520 170 L640 146" stroke="#0f8a6c" strokeWidth="3" strokeDasharray="8 7" fill="none" opacity="0.6" />
      {/* coins */}
      <g transform="translate(150 118)">
        <circle r="74" fill="#0f8a6c" opacity="0.18" transform="translate(6 8)" />
        <circle r="74" fill="url(#fx-coin)" stroke="#0f8a6c" strokeWidth="5" />
        <circle r="58" fill="none" stroke="#0f8a6c" strokeOpacity="0.35" strokeWidth="2" />
        <text textAnchor="middle" dominantBaseline="central" fontSize="76" fontWeight="700" fill="#0d3b31" fontFamily="ui-sans-serif, system-ui">₮</text>
      </g>
      <g transform="translate(300 92)">
        <circle r="50" fill="#0d0f12" opacity="0.12" transform="translate(5 6)" />
        <circle r="50" fill="#0d0f12" />
        <circle r="39" fill="none" stroke="#21cda8" strokeOpacity="0.6" strokeWidth="2" />
        <text textAnchor="middle" dominantBaseline="central" fontSize="52" fontWeight="700" fill="#21cda8" fontFamily="ui-sans-serif, system-ui">$</text>
      </g>
    </svg>
  );
}
