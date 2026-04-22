// ═══════════════════════════════════════════════════════════════════════
// CONbot5 — Design Token System v5.0 — Liquid Glass Supreme
// ═══════════════════════════════════════════════════════════════════════

export const COLORS = {
  bg:      '#040609',
  bg1:     '#080c14',
  bg2:     '#0d1220',
  glass:   'rgba(255,255,255,0.07)',
  glassHi: 'rgba(255,255,255,0.13)',
  border:  'rgba(255,255,255,0.12)',
  borderHi:'rgba(255,255,255,0.22)',
  cyan:    '#56D9FF',
  cyanD:   'rgba(86,217,255,0.15)',
  mag:     '#FF6ADF',
  magD:    'rgba(255,106,223,0.15)',
  vio:     '#8B72FF',
  vioD:    'rgba(139,114,255,0.15)',
  gold:    '#FFCE69',
  goldD:   'rgba(255,206,105,0.15)',
  red:     '#FF4B4B',
  green:   '#4BFFB5',
  text:    '#EEF4FF',
  muted:   '#8A9BC4',
  dim:     '#3D4E6E',
} as const;

export const FONTS = {
  display: "'Clash Display', sans-serif",
  body:    "'Satoshi', sans-serif",
  mono:    "'DM Mono', monospace",
} as const;

export const RADII = {
  sm:  '8px',
  md:  '14px',
  lg:  '22px',
  xl:  '32px',
  full:'999px',
} as const;

export const SHADOWS = {
  glass:     '0 20px 60px rgba(0,0,0,.5), 0 4px 20px rgba(0,0,0,.35)',
  glassHover:'0 28px 72px rgba(0,0,0,.55), 0 0 40px rgba(86,217,255,.06)',
  glow:      (color: string) => `0 0 20px ${color}, 0 0 40px ${color}`,
  primary:   '0 0 24px rgba(139,114,255,.5)',
} as const;

export const MOODS: Record<string, { label:string; color:string; emoji:string }> = {
  'midnight-lofi':    { label:'Midnight Lo-Fi',   color:'#7B2FFF', emoji:'🌙' },
  'synthwave-lounge': { label:'Synthwave Lounge',  color:'#FF4CD2', emoji:'🌊' },
  'ambient-void':     { label:'Ambient Void',      color:'#00D4FF', emoji:'🌌' },
  'raid-prep':        { label:'Raid Prep',          color:'#FF4500', emoji:'⚔️' },
  'party-room':       { label:'Party Room',         color:'#FFD700', emoji:'🎉' },
  'vgm-lounge':       { label:'VGM Lounge',         color:'#4ECDC4', emoji:'🎮' },
  'metal-forge':      { label:'Metal Forge',        color:'#8B0000', emoji:'🔥' },
  'chill-rnb':        { label:'Chill R&B',          color:'#9B59B6', emoji:'💜' },
};
