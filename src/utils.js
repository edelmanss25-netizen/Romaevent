export const pad = (n) => String(n).padStart(2, '0')

export const startOfDay = (d) => {
  const x = new Date(d)
  x.setHours(0, 0, 0, 0)
  return x
}
export const endOfDay = (d) => {
  const x = new Date(d)
  x.setHours(23, 59, 59, 999)
  return x
}
export const addDays = (d, n) => {
  const x = new Date(d)
  x.setDate(x.getDate() + n)
  return x
}
export const startOfWeek = (d) => {
  const x = startOfDay(d)
  return addDays(x, -((x.getDay() + 6) % 7))
}
export const startOfMonth = (d) => new Date(d.getFullYear(), d.getMonth(), 1)
export const sameDay = (a, b) => a.toDateString() === b.toDateString()
export const dayKey = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`

// datetime-local <-> ISO
export const toInput = (iso) => {
  if (!iso) return ''
  const d = new Date(iso)
  return `${dayKey(d)}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}
export const fromInput = (v) => (v ? new Date(v).toISOString() : null)

export const fmtDate = (iso, opts) =>
  new Date(iso).toLocaleDateString('ru-RU', opts || { day: 'numeric', month: 'short', year: 'numeric' })
export const fmtTime = (iso) =>
  new Date(iso).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
export const fmtRange = (a, b) => {
  const s = new Date(a)
  const e = new Date(b)
  if (sameDay(s, e)) return `${fmtDate(a)}, ${fmtTime(a)}–${fmtTime(b)}`
  return `${fmtDate(a)} ${fmtTime(a)} — ${fmtDate(b)} ${fmtTime(b)}`
}
export const fmtDue = (date) =>
  new Date(date + 'T00:00:00').toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })
export const hhmm = (t) => (t ? t.slice(0, 5) : '')

export const overlaps = (aS, aE, bS, bE) => new Date(aS) < new Date(bE) && new Date(aE) > new Date(bS)

export const EVENT_STATUS = {
  planned: 'Планируется',
  confirmed: 'Подтверждено',
  done: 'Завершено',
  cancelled: 'Отменено',
}
export const TASK_STATUS = { todo: 'К выполнению', doing: 'В работе', done: 'Готово' }
export const PRIORITY = { low: 'Низкий', normal: 'Обычный', high: 'Высокий' }
export const EQ_STATUS = { ok: 'Исправно', repair: 'В ремонте' }

// Приглушённая серебристая палитра (с мягкими акцентами)
export const PALETTE = ['#d4d6db', '#a4a9b3', '#7f8896', '#b9a99a', '#8fa3b8', '#9fb09b', '#b49aa6']

export const initials = (name = '') =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('')

export const uniq = (rows, key = 'group_name') =>
  [...new Set(rows.map((r) => r[key]).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'ru'))

export function groupBy(rows, fn, order) {
  const map = new Map()
  rows.forEach((r) => {
    const k = fn(r) ?? '—'
    if (!map.has(k)) map.set(k, [])
    map.get(k).push(r)
  })
  let entries = [...map.entries()]
  entries.sort((a, b) => {
    if (order) return order.indexOf(a[0]) - order.indexOf(b[0])
    if (a[0] === '—') return 1
    if (b[0] === '—') return -1
    return String(a[0]).localeCompare(String(b[0]), 'ru')
  })
  return entries
}

// Проверка занятости оборудования на мероприятии
export function eqConflicts(d, equipmentId, event, qty = 1) {
  const eq = d.equipment.find((e) => e.id === equipmentId)
  const others = d.event_equipment
    .filter((x) => x.equipment_id === equipmentId && x.event_id !== event.id)
    .map((x) => ({ link: x, ev: d.events.find((e) => e.id === x.event_id) }))
    .filter(({ ev }) => ev && ev.status !== 'cancelled' && overlaps(ev.start_at, ev.end_at, event.start_at, event.end_at))
  const blocks = d.equipment_blocks.filter(
    (b) => b.equipment_id === equipmentId && overlaps(b.start_at, b.end_at, event.start_at, event.end_at)
  )
  const used = others.reduce((s, { link }) => s + link.qty, 0) + qty
  const total = eq?.quantity || 1
  return {
    others,
    blocks,
    repair: eq?.status === 'repair',
    over: used > total || blocks.length > 0 || eq?.status === 'repair',
  }
}
