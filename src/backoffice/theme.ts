export const backofficeTheme = {
  pageBackground: 'bg-gray-50',
  cardBackground: 'bg-white',
  cardBorder: 'border-gray-200',
  inputBackground: 'bg-gray-50',
  inputBorder: 'border-gray-200',
  hoverBackground: 'hover:bg-gray-50',
  activeBackground: 'bg-gray-100',

  textPrimary: 'text-gray-900',
  textSecondary: 'text-gray-600',
  textMuted: 'text-gray-400',
  textDisabled: 'text-gray-300',

  buttonPrimary: 'bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 text-black font-semibold',
  buttonSecondary: 'bg-white border border-gray-200 hover:bg-gray-50 text-gray-700',
  buttonSuccess: 'bg-green-600 hover:bg-green-700 text-white',
  buttonDanger: 'bg-red-600 hover:bg-red-700 text-white',
  buttonWarning: 'bg-amber-500 hover:bg-amber-600 text-black',

  gradientPrimary: 'bg-gradient-to-r from-yellow-500 to-yellow-600',
  gradientDark: 'bg-black',
  gradientGreen: 'bg-gradient-to-br from-green-600 to-emerald-700',
  gradientAmber: 'bg-gradient-to-br from-amber-500 to-yellow-600',
  gradientRed: 'bg-gradient-to-br from-red-600 to-red-700',

  statusSuccess: 'text-green-700 bg-green-50 border-green-200',
  statusWarning: 'text-amber-700 bg-amber-50 border-amber-200',
  statusError: 'text-red-700 bg-red-50 border-red-200',
  statusInfo: 'text-gray-700 bg-gray-100 border-gray-200',

  borderDefault: 'border-gray-200',
  borderHover: 'hover:border-yellow-400',
  borderFocus: 'focus:border-yellow-400',

  skeleton: 'bg-gray-200 animate-pulse',
  spinner: 'text-yellow-500',
};

export const themeClasses = {
  page: 'min-h-screen bg-gray-50 p-6',
  container: 'max-w-7xl mx-auto space-y-6',
  card: 'bg-white border border-gray-200 rounded-2xl p-6 shadow-sm',
  cardHover: 'bg-white border border-gray-200 rounded-2xl p-6 hover:border-yellow-400 hover:shadow-md transition-all cursor-pointer',
  input: 'w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:border-yellow-400 focus:ring-2 focus:ring-yellow-400/20 outline-none',
  select: 'w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 focus:border-yellow-400 focus:ring-2 focus:ring-yellow-400/20 outline-none',
  button: 'px-4 py-2.5 rounded-xl font-semibold transition-all flex items-center gap-2',
  buttonPrimary: 'px-4 py-2.5 bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 text-black rounded-xl font-semibold transition-all flex items-center gap-2 shadow-md shadow-yellow-500/20',
  buttonSecondary: 'px-4 py-2.5 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 rounded-xl font-medium transition-all flex items-center gap-2',
  buttonSuccess: 'px-4 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-xl font-semibold transition-all flex items-center gap-2',
  badge: 'px-2.5 py-1 rounded-full text-xs font-semibold',
  badgeSuccess: 'px-2.5 py-1 rounded-full text-xs font-semibold bg-green-50 text-green-700 border border-green-200',
  badgeWarning: 'px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200',
  badgeError: 'px-2.5 py-1 rounded-full text-xs font-semibold bg-red-50 text-red-700 border border-red-200',
  badgeInfo: 'px-2.5 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-700 border border-gray-200',
  table: 'w-full border-collapse',
  tableRow: 'border-b border-gray-100 hover:bg-gray-50 transition-colors',
  tableHeader: 'px-4 py-3 text-left text-gray-500 font-semibold text-xs uppercase tracking-wide',
  tableCell: 'px-4 py-3 text-gray-900 text-sm',
};

export default backofficeTheme;
