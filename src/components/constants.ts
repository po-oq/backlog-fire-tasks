// タスク状態設定の定数
export const STATUS_CONFIG = {
  overdue: {
    icon: '🔥',
    borderColor: 'border-red-500',
    bgColor: '',
    badgeColor: 'bg-red-100 text-red-800',
    dueDateColor: 'text-red-600',
    iconAnimation: 'fire-animation',
    hoverBg: 'hover:bg-red-50'
  },
  dueTomorrow: {
    icon: '⚠️',
    borderColor: 'border-yellow-500',
    bgColor: 'bg-yellow-50',
    badgeColor: 'bg-yellow-100 text-yellow-800',
    dueDateColor: 'text-yellow-600',
    iconAnimation: '',
    hoverBg: 'hover:bg-yellow-100'
  },
  completed: {
    icon: '✅',
    borderColor: 'border-green-500',
    bgColor: 'opacity-75',
    badgeColor: 'bg-green-100 text-green-800',
    dueDateColor: 'text-green-600',
    iconAnimation: '',
    hoverBg: 'hover:bg-green-50'
  },
  withinDeadline: {
    icon: '✅',
    borderColor: 'border-blue-500',
    bgColor: '',
    badgeColor: 'bg-green-100 text-green-800',
    dueDateColor: 'text-green-600',
    iconAnimation: '',
    hoverBg: 'hover:bg-blue-50'
  },
  noDeadline: {
    icon: '📝',
    borderColor: 'border-gray-400',
    bgColor: '',
    badgeColor: 'bg-gray-100 text-gray-800',
    dueDateColor: 'text-gray-500',
    iconAnimation: '',
    hoverBg: 'hover:bg-gray-50'
  }
} as const;

// ステータス色設定
export const STATUS_COLORS = {
  '完了': 'text-green-600',
  '処理中': 'text-yellow-600',
  default: 'text-blue-600'
} as const;

// フィルタータイプの定数
export const FILTER_CONFIG = {
  all: {
    label: '📊 取得',
    activeClass: 'bg-green-200 text-green-900 shadow-md',
    hoverClass: 'bg-green-100 text-green-800 hover:bg-green-200 hover:shadow-md'
  },
  overdue: {
    label: '🔥 期限切れ',
    activeClass: 'bg-red-200 text-red-900 shadow-md',
    hoverClass: 'bg-red-100 text-red-800 hover:bg-red-200 hover:shadow-md'
  },
  'due-tomorrow': {
    label: '⚠️ 明日期限',
    activeClass: 'bg-yellow-200 text-yellow-900 shadow-md',
    hoverClass: 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200 hover:shadow-md'
  }
} as const;