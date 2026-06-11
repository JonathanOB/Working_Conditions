export const Colors = {
  wbNavy: '#0A1628',
  wbBlue: '#1E3A5F',
  nbTeal: '#0E4B5A',
  nbBlue: '#0C6E8A',
  easaBlue: '#2E6DB4',
  wcPurple: '#5B4FA8',
  binding: '#D4840A',
  okGreen: '#1B6B3A',
  warnRed: '#B91C1C',
  surface: '#F7F8FA',
  border: '#E2E4EA',
  // Dark mode
  darkBg: '#0A1628',
  darkSurface: '#0F1E35',
  darkBorder: '#1E3A5F',
  darkText: '#F1F5F9',
  darkSubtext: '#94A3B8',
  // Text
  text: '#0A1628',
  subtext: '#64748B',
  white: '#FFFFFF',
};

export const fleetColor = (fleet: 'wb' | 'a320' | 'easa', isDark = false) => {
  if (fleet === 'easa') return Colors.easaBlue;
  if (fleet === 'wb') return isDark ? Colors.wbBlue : Colors.wbNavy;
  return isDark ? Colors.nbBlue : Colors.nbTeal;
};
