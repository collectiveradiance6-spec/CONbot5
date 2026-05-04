export type ThemeName =
  | 'Prismatic Silk'
  | 'Glacial Silk'
  | 'Ocean Glass'
  | 'Sunrise Blush'
  | 'Soft Violet'
  | 'Clear Minimal'

export type ConbotTheme = {
  name: ThemeName
  fluidTint: string
  subsurfaceGlow: string
  cardTint: string
  accent: string
  controlGlow: string
}

export type LightingMode = 'day' | 'night'

export const lightingTokens: Record<LightingMode, Record<string, string>> = {
  day: {
    '--mode-bg': '#fbfdff',
    '--mode-text': '#172033',
    '--mode-muted': 'rgba(23,32,51,.52)',
    '--mode-glass': 'rgba(255,255,255,.48)',
    '--mode-control': 'rgba(255,255,255,.62)',
    '--mode-nav': 'rgba(255,255,255,.48)',
    '--app-bg': 'linear-gradient(135deg,#fbfdff,#eafaff 48%,#fff7ed)',
    '--panel-bg': 'rgba(255,255,255,.52)',
    '--panel-border': 'rgba(255,255,255,.64)',
    '--glass-highlight': 'rgba(255,255,255,.82)',
    '--text-main': '#172033',
    '--text-muted': 'rgba(23,32,51,.56)',
    '--button-bg': 'rgba(255,255,255,.62)',
    '--button-active-bg': '#111827',
    '--dock-bg': 'rgba(255,255,255,.7)',
    '--island-bg': 'rgba(255,255,255,.62)',
    '--island-glow': 'rgba(105,217,255,.22)',
    '--waveform-color': '#48d7ff',
    '--visualizer-gradient': 'linear-gradient(135deg,#58e6ff,#ff7be8,#ffd95a)',
    '--shadow-color': 'rgba(68,95,126,.16)',
  },
  night: {
    '--mode-bg': '#070a12',
    '--mode-text': '#f6fbff',
    '--mode-muted': 'rgba(236,245,255,.62)',
    '--mode-glass': 'rgba(13,20,34,.62)',
    '--mode-control': 'rgba(16,24,40,.72)',
    '--mode-nav': 'rgba(10,15,28,.78)',
    '--app-bg': 'radial-gradient(circle at 50% 0%,rgba(42,85,120,.28),transparent 36%),radial-gradient(circle at 78% 28%,rgba(255,70,220,.18),transparent 34%),linear-gradient(135deg,#050712,#09101e 48%,#120818)',
    '--panel-bg': 'rgba(9,14,28,.66)',
    '--panel-border': 'rgba(255,255,255,.14)',
    '--glass-highlight': 'rgba(255,255,255,.18)',
    '--text-main': '#f7fbff',
    '--text-muted': 'rgba(235,245,255,.64)',
    '--button-bg': 'rgba(255,255,255,.08)',
    '--button-active-bg': '#ffffff',
    '--dock-bg': 'rgba(8,12,24,.78)',
    '--island-bg': 'rgba(8,12,24,.78)',
    '--island-glow': 'rgba(79,220,255,.42)',
    '--waveform-color': '#62eaff',
    '--visualizer-gradient': 'linear-gradient(135deg,#42eaff,#ff4fe0,#ffd95a)',
    '--shadow-color': 'rgba(0,0,0,.36)',
  },
}

export const themes: ConbotTheme[] = [
  {
    name: 'Prismatic Silk',
    fluidTint: '#fbfdff',
    subsurfaceGlow: 'rgba(140, 230, 255, .38), rgba(255, 191, 240, .34), rgba(255, 242, 148, .32)',
    cardTint: 'rgba(255,255,255,.46)',
    accent: '#69d9ff',
    controlGlow: 'rgba(122, 219, 255, .48)',
  },
  {
    name: 'Glacial Silk',
    fluidTint: '#f7fcff',
    subsurfaceGlow: 'rgba(132, 218, 255, .34), rgba(194, 237, 255, .28), rgba(255,255,255,.36)',
    cardTint: 'rgba(248,253,255,.52)',
    accent: '#7ddcff',
    controlGlow: 'rgba(126, 221, 255, .44)',
  },
  {
    name: 'Ocean Glass',
    fluidTint: '#f7fffd',
    subsurfaceGlow: 'rgba(86, 224, 214, .32), rgba(117, 196, 255, .3), rgba(212, 255, 239, .26)',
    cardTint: 'rgba(246,255,253,.5)',
    accent: '#48d7c8',
    controlGlow: 'rgba(80, 218, 205, .42)',
  },
  {
    name: 'Sunrise Blush',
    fluidTint: '#fffaf8',
    subsurfaceGlow: 'rgba(255, 190, 177, .34), rgba(255, 221, 138, .3), rgba(255, 196, 235, .28)',
    cardTint: 'rgba(255,250,248,.52)',
    accent: '#ff9f8e',
    controlGlow: 'rgba(255, 171, 144, .42)',
  },
  {
    name: 'Soft Violet',
    fluidTint: '#fdfbff',
    subsurfaceGlow: 'rgba(211, 190, 255, .3), rgba(255, 198, 241, .28), rgba(176, 226, 255, .28)',
    cardTint: 'rgba(253,251,255,.52)',
    accent: '#b99cff',
    controlGlow: 'rgba(186, 160, 255, .4)',
  },
  {
    name: 'Clear Minimal',
    fluidTint: '#ffffff',
    subsurfaceGlow: 'rgba(212, 232, 246, .24), rgba(255,255,255,.4), rgba(230, 238, 247, .22)',
    cardTint: 'rgba(255,255,255,.56)',
    accent: '#8ab7d6',
    controlGlow: 'rgba(138, 183, 214, .32)',
  },
]

export const defaultTheme = themes[0]
