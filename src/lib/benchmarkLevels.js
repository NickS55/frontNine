export const LEVEL_OPTIONS = [
  { value: 'high_school', label: 'High School' },
  { value: 'college', label: 'College' },
  { value: 'mlb', label: 'MLB' },
]

export const LEVEL_LABELS = Object.fromEntries(LEVEL_OPTIONS.map(o => [o.value, o.label]))
