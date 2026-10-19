import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useData } from '../data'
import EventForm from '../components/EventForm'
import { Avatar, Chip, Empty, PageHead } from '../components/ui'
import { EVENT_STATUS, fmtRange, groupBy } from '../utils'

const GROUPS = { none: 'Без группировки', group: 'По группе', status: 'По статусу', month: 'По месяцу' }

export default function Events() {
  const d = useData()
  const nav = useNavigate()
  const [q, setQ] = useState('')
  const [by, setBy] = useState('month')
  const [scope, setScope] = useState('upcoming')
  const [form, setForm] = useState(false)

  const rows = useMemo(() => {
    const now = new Date()
    return d.events
      .filter((e) => (q ? (e.title + (e.location || '') + (e.group_name || '')).toLowerCase().includes(q.toLowerCase()) : true))
      .filter((e) => (scope === 'upcoming' ? new Date(e.end_at) >= now : scope === 'past' ? new Date(e.end_at) < now : true))
      .sort((a, b) => (scope === 'past' ? new Date(b.start_at) - new Date(a.start_at) : new Date(a.start_at) - new Date(b.start_at)))
  }, [d.events, q, scope])

  const sections = useMemo(() => {
    if (by === 'none') return [['', rows]]
    if (by === 'group') return groupBy(rows, (e) => e.group_name || 'Без группы')
    if (by === 'status') return groupBy(rows, (e) => EVENT_STATUS[e.status], Object.values(EVENT_STATUS))
    return groupBy(
      rows,
      (e) => new Date(e.start_at).toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' }),
      [...new Set(rows.map((e) => new Date(e.start_at).toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' })))]
    )
  }, [rows, by])

  return (
    <div className="page">
      <PageHead title="События" sub={`${d.events.length} всего`}>
        <button className="btn primary" onClick={() => setForm(true)}>
          + Новое событие
        </button>
      </PageHead>

      <div className="toolbar">
        <input className="input sm grow-in" placeholder="Поиск…" value={q} onChange={(e) => setQ(e.target.value)} />
        <div className="seg">
          {[
            ['upcoming', 'Предстоящие'],
            ['past', 'Прошедшие'],
            ['all', 'Все'],
          ].map(([k, v]) => (
            <button key={k} className={scope === k ? 'on' : ''} onClick={() => setScope(k)}>
              {v}
            </button>
          ))}
        </div>
        <select className="input sm" value={by} onChange={(e) => setBy(e.target.value)}>
          {Object.entries(GROUPS).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>
      </div>

      {!rows.length && <Empty>Событий нет. Создайте первое.</Empty>}

      {sections.map(([name, list]) => (
        <section key={name} className="section">
          {name && (
            <h2 className="section-title">
              {name} <em>{list.length}</em>
            </h2>
          )}
          <div className="list">
            {list.map((e) => {
              const staff = d.event_employees.filter((x) => x.event_id === e.id).map((x) => d.employees.find((m) => m.id === x.employee_id))
              return (
                <Link key={e.id} to={`/events/${e.id}`} className="row-card">
                  <i className="bar" style={{ background: e.color }} />
                  <div className="row-main">
                    <div className="row-title">{e.title}</div>
                    <div className="row-sub">
                      {fmtRange(e.start_at, e.end_at)}
                      {e.location ? ` · ${e.location}` : ''}
                    </div>
                  </div>
                  {e.group_name && <Chip>{e.group_name}</Chip>}
                  <Chip tone={e.status}>{EVENT_STATUS[e.status]}</Chip>
                  <div className="avatars">
                    {staff.slice(0, 4).map((m) => m && <Avatar key={m.id} emp={m} size={24} />)}
                    {staff.length > 4 && <span className="more">+{staff.length - 4}</span>}
                  </div>
                </Link>
              )
            })}
          </div>
        </section>
      ))}

      {form && (
        <EventForm
          title="Новое событие"
          onClose={() => setForm(false)}
          onSave={async (row) => {
            const r = await d.insert('events', row)
            if (r && r.id) nav(`/events/${r.id}`)
          }}
        />
      )}
    </div>
  )
}
