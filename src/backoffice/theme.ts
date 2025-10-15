// Thème unifié du Backoffice - Basé sur QRCodeGenerator
// Couleurs professionnelles slate-blue

export const backofficeTheme = {
  // Backgrounds
  pageBackground: 'bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900',
  cardBackground: 'bg-slate-800',
  cardBorder: 'border-slate-700',
  inputBackground: 'bg-slate-700',
  inputBorder: 'border-slate-600',
  hoverBackground: 'hover:bg-slate-700',
  activeBackground: 'bg-slate-700',

  // Text colors
  textPrimary: 'text-white',
  textSecondary: 'text-slate-300',
  textMuted: 'text-slate-400',
  textDisabled: 'text-slate-500',

  // Button colors
  buttonPrimary: 'bg-orange-600 hover:bg-orange-700 text-white',
  buttonSecondary: 'bg-slate-700 hover:bg-slate-600 text-white',
  buttonSuccess: 'bg-green-600 hover:bg-green-700 text-white',
  buttonDanger: 'bg-red-600 hover:bg-red-700 text-white',
  buttonWarning: 'bg-amber-600 hover:bg-amber-700 text-white',

  // Accent gradients
  gradientBlue: 'bg-gradient-to-br from-orange-600 to-orange-700',
  gradientPurple: 'bg-gradient-to-br from-orange-600 to-orange-700',
  gradientGreen: 'bg-gradient-to-br from-green-600 to-green-700',
  gradientAmber: 'bg-gradient-to-br from-amber-600 to-amber-700',
  gradientRed: 'bg-gradient-to-br from-red-600 to-red-700',
  gradientCyan: 'bg-gradient-to-br from-cyan-600 to-cyan-700',

  // Status colors
  statusSuccess: 'text-green-400 bg-green-900/20',
  statusWarning: 'text-amber-400 bg-amber-900/20',
  statusError: 'text-red-400 bg-red-900/20',
  statusInfo: 'text-orange-400 bg-orange-900/20',

  // Border colors
  borderDefault: 'border-slate-700',
  borderHover: 'hover:border-slate-600',
  borderFocus: 'focus:border-orange-500',

  // Loading states
  skeleton: 'bg-slate-700 animate-pulse',
  spinner: 'text-orange-500',
};

// Classes complètes pré-composées pour usage direct
export const themeClasses = {
  page: 'min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 p-6',
  container: 'max-w-7xl mx-auto space-y-6',
  card: 'bg-slate-800 border border-slate-700 rounded-lg p-6',
  cardHover: 'bg-slate-800 border border-slate-700 rounded-lg p-6 hover:border-slate-600 transition',
  input: 'w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:border-orange-500 focus:ring-1 focus:ring-blue-500',
  select: 'w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:border-orange-500 focus:ring-1 focus:ring-blue-500',
  button: 'px-4 py-2 rounded-lg font-semibold transition flex items-center gap-2',
  buttonPrimary: 'px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg font-semibold transition flex items-center gap-2',
  buttonSecondary: 'px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-semibold transition flex items-center gap-2',
  buttonSuccess: 'px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold transition flex items-center gap-2',
  badge: 'px-3 py-1 rounded-full text-sm font-semibold',
  badgeSuccess: 'px-3 py-1 rounded-full text-sm font-semibold bg-green-900/20 text-green-400 border border-green-500/30',
  badgeWarning: 'px-3 py-1 rounded-full text-sm font-semibold bg-amber-900/20 text-amber-400 border border-amber-500/30',
  badgeError: 'px-3 py-1 rounded-full text-sm font-semibold bg-red-900/20 text-red-400 border border-red-500/30',
  badgeInfo: 'px-3 py-1 rounded-full text-sm font-semibold bg-orange-900/20 text-orange-400 border border-orange-500/30',
  table: 'w-full border-collapse',
  tableRow: 'border-b border-slate-700 hover:bg-slate-700/30 transition',
  tableHeader: 'px-4 py-3 text-left text-slate-300 font-semibold text-sm',
  tableCell: 'px-4 py-3 text-white',
};

export default backofficeTheme;
