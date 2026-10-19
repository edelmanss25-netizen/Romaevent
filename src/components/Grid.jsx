import { Link } from 'react-router-dom'
import { dayKey, sameDay } from '../utils'

const WEEKDAYS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс']

/**
 * Универсальная сетка дней (месяц/неделя).
 * getItems(day) → [{ key, label, color, to, muted, title }]
 */
export default function Grid({ days, month, getItems, onDay, week }) {
  const today = new Date()
  return (
    <div className={`cal ${week ? 'week' : ''}`}>
      {WEEKDAYS.map((w) => (
        <div key={w} className="cal-wd">
          {w}
        </div>
      ))}
      {days.map((day) => {
        const items = getItems(day)
        const limit = week ? 99 : 3
        const out = month !== undefined && day.getMonth() !== month
        return (
          <div
            key={dayKey(day)}
            className={`cal-cell ${out ? 'out' : ''} ${sameDay(day, today) ? 'today' : ''}`}
            onClick={() => onDay && onDay(day)}
          >
            <div className="cal-num">{week ? day.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' }) : day.getDate()}</div>
            <div className="cal-items">
              {items.slice(0, limit).map((it) => {
                const inner = (
                  <>
                    <i style={{ background: it.color }} />
                    <span>{it.label}</span>
                  </>
                )
                const cls = `cal-item ${it.muted ? 'muted' : ''}`
                return it.to ? (
                  <Link key={it.key} to={it.to} className={cls} title={it.title || it.label} onClick={(e) => e.stopPropagation()}>
                    {inner}
                  </Link>
                ) : (
                  <div key={it.key} className={cls} title={it.title || it.label} onClick={(e) => e.stopPropagation()}>
                    {inner}
                  </div>
                )
              })}
              {items.length > limit && <div className="cal-more">ещё {items.length - limit}</div>}
            </div>
          </div>
        )
      })}
    </div>
  )
}
