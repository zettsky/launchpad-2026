// Shared visual constants for the "EatWhere!" redesign — rounded cornflower-blue pill
// buttons, bold titles. LIGHT_COLORS/DARK_COLORS back the app-wide theme toggle (see
// ThemeContext); getCommonStyles(colors) builds the shared button styles for whichever
// palette is active, since StyleSheet.create can't react to a runtime theme switch on
// its own — each screen recomputes it from the current colors instead of importing a
// static object.
export const LIGHT_COLORS = {
  mode: 'light',
  primary: '#7B93DE',
  primaryDark: '#5F7BCB',
  background: '#fff',
  text: '#111',
  textMuted: '#666',
  border: '#7B93DE',
  danger: '#e53935',
  chipInactive: '#ebebeb',
  cardBackground: '#fff',
  modalBackdrop: 'rgba(0,0,0,0.4)',
};

export const DARK_COLORS = {
  mode: 'dark',
  primary: '#7B93DE',
  primaryDark: '#9DB0E8',
  background: '#121212',
  text: '#F2F2F2',
  textMuted: '#AAAAAA',
  border: '#7B93DE',
  danger: '#FF6B6B',
  chipInactive: '#2A2A2A',
  cardBackground: '#1E1E1E',
  modalBackdrop: 'rgba(0,0,0,0.6)',
};

export const RADIUS = {
  pill: 999,
  card: 20,
};

export function getCommonStyles(COLORS) {
  return {
    screenTitle: { fontSize: 34, fontWeight: '800', color: COLORS.text },
    filledButton: {
      backgroundColor: COLORS.primary,
      paddingVertical: 16,
      borderRadius: RADIUS.pill,
      alignItems: 'center',
    },
    filledButtonText: { color: '#000', fontSize: 17, fontWeight: '800' },
    outlineButton: {
      backgroundColor: COLORS.cardBackground,
      borderWidth: 2,
      borderColor: COLORS.primary,
      paddingVertical: 14,
      borderRadius: RADIUS.pill,
      alignItems: 'center',
    },
    outlineButtonText: { color: COLORS.text, fontSize: 16, fontWeight: '700' },
  };
}
