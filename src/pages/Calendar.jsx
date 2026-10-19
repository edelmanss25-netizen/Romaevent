import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useData } from '../data'
import Grid from '../components/Grid'
import EventForm from '../components/EventForm'
import { TaskForm } from '../components/TaskBoard'
import { PageHead } from '../components/ui'
import { addDays, endOfDay, fmtTime, overlaps, startOfDay, startOfMonth, startOfWeek, uniq } from '../utils'

export default function Calendar() {
  const d = useData()
  const nav = useNavigate()
  const [cursor, setCursor] = useState(new Date())
  const [view, setView] = useState('month')
  const [emp, setEmp] = useState('')
  const [group, setGroup] = useState('')
  const [showTasks, setShowTasks] = useState(true)
  const [newEvent, setNewEvent] = useState(null)
  const [newTask, setNewTask] = useState(null)

  const days = useMemo(() => {
    if (view === 'week') {
      const s = startOfWeek(cursor)
      return Array.from({ length: 7 }, (_, i) => addDays(s, i))
    }
    const s = startOfWeek(startOfMonth(cursor))
    return Array.from({ length: 42 }, (_, i) => addDays(s, i))
  }, [cursor, view])

  const events = useMemo(
    () =>
      d.events.filter((e) => {
        if (group && e.group_name !== group) return false
        if (emp && !d.event_employees.some((x) => x.event_id === e.id && x.employee_id === emp)) return false
        return true
      }),
    [d.events, d.event_employees, emp, group]
  )

  const getItems = (day) => {
    const s = startOfDay(day)
    const e = endOfDay(day)
    const evItems = events
      .filter((ev) => overlaps(ev.start_at, ev.end_at, s, e))
      .sort((a, b) => new Date(a.start_at) - new Date(b.start_at))
      .map((ev) => ({
        key: `e${ev.id}`,
        label: `${new Date(ev.start_at) >= s ? fmtTime(ev.start_at) + ' ' : ''}${ev.title}`,
        title: ev.title,
        color: ev.color,
        to: `/events/${ev.id}`,
        muted: ev.status === 'cancelled' || ev.status === 'done',
      }))
    if (!showTasks) return evItems
    const key = `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, '0')}-${String(day.getDate()).padStart(2, '0')}`
    const tItems = d.tasks
      .filter((t) => t.due_date === key && t.status !== 'done' && (!emp || t.employee_id === emp))
      .map((t) => ({ key: `t${t.id}`, label: `☐ ${t.title}`, color: '#6d7480', title: t.title, muted: true }))
    return [...evItems, ...tItems]
  }

  const shift = (n) => {
    const x = new Date(cursor)
    if (view === 'week') x.setDate(x.getDate() + 7 * n)
    else x.setMonth(x.getMonth() + n, 1)
    setCursor(x)
  }

  const title =
    view === 'month'
      ? cursor.toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' })
      : `${days[0].toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })} — ${days[6].toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', year: 'numeric' })}`

  const defaults = (day) => {
    const s = new Date(day)
    s.setHours(10, 0, 0, 0)
    const e = new Date(day)
    e.setHours(11, 0, 0, 0)
    return { start_at: s.toISOString(), end_at: e.toISOString() }
  }

  return (
    <div className="page">
      <PageHead title="Календарь" sub="Все события агентства">
        <button className="btn ghost" onClick={() => setNewTask({})}>
          + Задача
        </button>
        <button className="btn primary" onClick={() => setNewEvent(defaults(new Date()))}>
          + Событие
        </button>
      </PageHead>

      <div className="toolbar">
        <div className="seg">
          <button onClick={() => shift(-1)}>←</button>
          <button onClick={() => setCursor(new Date())}>Сегодня</button>
          <button onClick={() => shift(1)}>→</button>
        </div>
        <div className="cal-title">{title}</div>
        <div className="grow" />
        <div className="seg">
          <button className={view === 'month' ? 'on' : ''} onClick={() => setView('month')}>
            Месяц
          </button>
          <button className={view === 'week' ? 'on' : ''} onClick={() => setView('week')}>
            Неделя
          </button>
        </div>
        <select className="input sm" value={emp} onChange={(e) => setEmp(e.target.value)}>
          <option value="">Все сотрудники</option>
          {d.employees.map((x) => (
            <option key={x.id} value={x.id}>
              {x.name}
            </option>
          ))}
        </select>
        <select className="input sm" value={group} onChange={(e) => setGroup(e.target.value)}>
          <option value="">Все группы</option>
          {uniq(d.events).map((g) => (
            <option key={g}>{g}</option>
          ))}
        </select>
        <label className="toggle">
          <input type="checkbox" checked={showTasks} onChange={(e) => setShowTasks(e.target.checked)} />
          Сроки задач
        </label>
      </div>

      <Grid
        days={days}
        month={view === 'month' ? cursor.getMonth() : undefined}
        week={view === 'week'}
        getItems={getItems}
        onDay={(day) => setNewEvent(defaults(day))}
      />

      {newEvent && (
        <EventForm
          title="Новое событие"
          initial={newEvent}
          onClose={() => setNewEvent(null)}
          onSave={async (row) => {
            const r = await d.insert('events', row)
            if (r && r.id) nav(`/events/${r.id}`)
          }}
        />
      )}
      {newTask && <TaskForm initial={newTask} onClose={() => setNewTask(null)} title="Новая задача" />}
    </div>
  )
}
