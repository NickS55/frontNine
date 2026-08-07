// Shared by the Pitch DNA lookup and the profile's MLB Comparisons card, so
// the control and its explanation stay identical in both places.
//
// On (the default), comps are matched on movement shape scaled to a 90 mph
// reference — a 78 mph high-school curveball is judged by how it moves, not by
// how far off big-league velocity it is. Off compares raw numbers, which only
// makes sense once a pitcher's velocity is genuinely in MLB range.
export function VelocityNormalizeToggle({ value, onChange, disabled = false }) {
  return (
    <div className="rounded-xl border border-border p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-foreground" id="normalize-velocity-label">
            Normalize for velocity
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {value
              ? 'Compares movement shape regardless of how hard you throw — recommended for youth/HS pitchers.'
              : 'Compares raw numbers. Best when your velocity is similar to MLB.'}
          </p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={value}
          aria-labelledby="normalize-velocity-label"
          disabled={disabled}
          onClick={() => onChange(!value)}
          className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus:outline-none disabled:cursor-not-allowed disabled:opacity-50 ${
            value ? 'bg-primary' : 'bg-muted'
          }`}
        >
          <span
            className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
              value ? 'translate-x-5' : 'translate-x-0'
            }`}
          />
        </button>
      </div>
    </div>
  )
}
