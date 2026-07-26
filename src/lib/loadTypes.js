// Assignment load types + intensities, shared by CoachPlayerPage and AssignWorkForm.
// Mirrors backend's throw_load_type / throw_intensity enums
// (backNine/src/migrations/021_throwing_workload.sql), minus 'game' — a coach
// assigns training, not a scheduled game.
export const LOAD_TYPES = [
  { value: 'bullpen',          label: 'Bullpen' },
  { value: 'game_performance', label: 'Game Performance' },
  { value: 'long_toss',        label: 'Long Toss' },
  { value: 'flat_ground',      label: 'Flat Ground' },
  { value: 'plyo',             label: 'Plyo / Weighted' },
  { value: 'warmup',           label: 'Warm-up' },
  { value: 'recovery',         label: 'Recovery' },
  { value: 'pulldown',         label: 'Pull-downs' },
  { value: 'live_ab',          label: 'Live ABs' },
  { value: 'other',            label: 'Other' },
]

export const INTENSITIES = ['low', 'medium', 'high', 'max']

export function loadTypeLabel(value) {
  return LOAD_TYPES.find(t => t.value === value)?.label ?? value
}

export function throwUnitLabel(loadType) {
  return loadType === 'bullpen' ? 'pitches' : 'throws'
}
