// Design tokens for the kid app, taken verbatim from the final (3a) direction in
// docs/design/kid-app (see its README "Design tokens"). Match these exactly; do not approximate.

export const Color = {
  primary: '#2f7fd6',
  primaryPress: '#1f5fa6', // depth / pressed
  primaryHover: '#2a72c1',
  navy: '#123a5e', // headings
  ink: '#1b2b3a', // body
  softBlue: '#dceafa', // fills, borders, empty pip
  softBlueBorder: '#c3dcf7', // border / gradient end
  keyPress: '#eaf3fd', // key press tint, ledger row border
  inputFill: '#f8fbff',
  appBg: '#f2f8fd',
  card: '#ffffff',
  coinGold: '#ffc12b',
  coinChip: '#fff6e0',
  dashed: '#9dc4ec', // dashed / next-cell border
  white: '#ffffff',
} as const;

// Ink tints used for secondary text (rgba over the ink / navy colors).
export const Ink = {
  t50: 'rgba(27,43,58,0.5)',
  t55: 'rgba(27,43,58,0.55)',
  t60: 'rgba(27,43,58,0.6)',
  t62: 'rgba(27,43,58,0.62)',
} as const;

export const Radius = {
  pill: 99,
  sheet: 30,
  balance: 26,
  card: 22,
  row: 20,
  key: 18,
  input: 16,
  chip: 14,
} as const;

// Nunito family names as loaded by @expo-google-fonts/nunito. Set fontFamily (not fontWeight)
// so the correct weight renders on both native and web.
export const Font = {
  400: 'Nunito_400Regular',
  500: 'Nunito_500Medium',
  600: 'Nunito_600SemiBold',
  700: 'Nunito_700Bold',
  800: 'Nunito_800ExtraBold',
  900: 'Nunito_900Black',
} as const;

export type FontWeight = keyof typeof Font;

// Resting-row and lift shadows. RN cannot do the CSS "0 6px 0" hard depth, so depth buttons
// simulate it with a colored bottom border (see Button); these are the soft shadows.
export const Shadow = {
  row: {
    shadowColor: '#123a5e',
    shadowOpacity: 0.06,
    shadowRadius: 0,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  lift: {
    shadowColor: '#2f7fd6',
    shadowOpacity: 0.16,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
  },
  play: {
    shadowColor: '#123a5e',
    shadowOpacity: 0.2,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
} as const;

export const SCREEN_PADDING = 20;
export const CARD_BLEED_PADDING = 16; // where cards bleed wider than the 20px gutter
