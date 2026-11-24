// Formatters. Every number, amount, percentage, date, time and file size a person reads goes
// through these, so a figure looks the same on every screen.

/* Formatting, per the system rules: thousands with a comma, one decimal, a no-break space
   before the percent sign and units, bands at 10 % and 40 %. */

export const NBSP = ' '
// fmtInt: a count. Counts derived by a share (orders of one product) are rounded, never shown with decimals.
export const fmtInt = n => Math.round(n).toLocaleString('en-US')
export const fmtPct = f => `${(f * 100).toFixed(1)}${NBSP}%`
export const band = p => (p > 0.4 ? 'high' : p >= 0.1 ? 'mid' : 'low')
// The only other number formats pages may use. Everything on screen goes through this file.
// fmtNum: any number with a fixed count of decimals, thousands with a comma.
export const fmtNum = (n, decimals = 0) => n.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })
// fmtPctN: a share with a chosen count of decimals, for confidences ("86 %") and axis ticks.
export const fmtPctN = (f, decimals = 0) => `${fmtNum(f * 100, decimals)}${NBSP}%`
// fmtDelta: a signed change in percent, "+6.9 %" or "-2.0 %".
export const fmtDelta = f => `${f > 0 ? '+' : f < 0 ? '-' : ''}${fmtNum(Math.abs(f) * 100, 1)}${NBSP}%`
// fmtPts: a signed change in percentage points, "+4.2 pts".
export const fmtPts = f => `${f > 0 ? '+' : f < 0 ? '-' : ''}${fmtNum(Math.abs(f) * 100, 1)}${NBSP}pts`
// fmtCompact: short counts for tight spaces and axes, "1.9k", "48k", "1.2M".
export const fmtCompact = n => {
  const a = Math.abs(n)
  if (a >= 1e6) return `${fmtNum(n / 1e6, a >= 1e7 ? 0 : 1)}M`
  if (a >= 1e3) return `${fmtNum(n / 1e3, a >= 1e4 ? 0 : 1)}k`
  return fmtNum(n)
}
export const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
export const probHtml = (p, bar = true) => `<span class="tb-prob tb-prob--${band(p)}">${fmtPct(p)}${
  bar ? `<span class="tb-prob-bar" style="--value: ${(p * 100).toFixed(1)}"></span>` : ''}</span>`
export const fmtEur = n => `${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}${NBSP}€`
// fmtEurRound: whole euros for totals, "17,012,331 €". fmtEurCompact: axes and tight cells, "17M €".
export const fmtEurRound = n => `${fmtNum(Math.round(n))}${NBSP}€`
export const fmtEurCompact = n => `${fmtCompact(n)}${NBSP}€`
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
// Dates are ISO strings in Paris time. They are read as text, so the viewer's time zone never
// shifts a day.
export const fmtDate = iso => `${+iso.slice(8, 10)} ${MONTHS[+iso.slice(5, 7) - 1]} ${iso.slice(0, 4)}`
export const fmtTime = iso => iso.slice(11, 16)
// fmtDay: the day in full, for a masthead, "Thursday 25 September".
const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const MONTHS_LONG = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
export const fmtDay = iso => `${DAYS[new Date(Date.UTC(+iso.slice(0, 4), +iso.slice(5, 7) - 1, +iso.slice(8, 10))).getUTCDay()]} ${+iso.slice(8, 10)} ${MONTHS_LONG[+iso.slice(5, 7) - 1]}`
export const fmtDateTime = iso => `${fmtDate(iso)}, ${fmtTime(iso)}`
export const fmtBytes = b => {
  const units = ['B', 'KB', 'MB', 'GB']
  let i = 0
  while (b >= 1024 && i < units.length - 1) { b /= 1024; i += 1 }
  return `${i ? b.toFixed(1) : b}${NBSP}${units[i]}`
}

