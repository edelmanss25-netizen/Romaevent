import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useData } from '../data'
import TaskBoard from '../components/TaskBoard'
import { Avatar, Chip, Empty, PageHead } from '../components/ui'
import { EmployeeForm } from './Employees'
import { EVENT_STATUS, fmtRange } from '../utils'

export default function EmployeePage() {
  const { id } = useParams()
  const d = useData()
  const nav = useNavigate()
  const [edit, setEdit] = useState(false)
  const m = d.employees.find((x) => x.id === id)

  if (d.loading) return <div className="page" />
  if (!m)
    return (
      <div className="page">
        <Empty>
          Сотрудник не найден. <Link to="/employees">К списку</Link>
        </Empty>
      </div>
    )

  const tasks = d.tasks.filter((t) => t.employee_id === id)
  const now = new Date()
  const events = d.event_employees
    .filter((x) => x.employee_id === id)
    .map((x) => ({ ...d.events.find((e) => e.id === x.event_id), role: x.role }))
    .filter((e) => e.id && new Date(e.end_at) >= now)
    .sort((a, b) => new Date(a.start_at) - new Date(b.start_at))

  return (
    <div className="page">
      <PageHead
        back={
          <Link to="/employees" className="back">
            ← Сотрудники
          </Link>
        }
        title={m.name}
        sub={[m.role, m.group_name, m.email, m.phone].filter(Boolean).join(' · ')}
      >
        <Avatar emp={m} size={40} />
        <button className="btn ghost" onClick={() => setEdit(true)}>
          Изменить
        </button>
      </PageHead>

      <div className="card">
        <div className="card-head">
          <h2>Задачи</h2>
          <em>{tasks.filter((t) => t.status !== 'done').length} открытых</em>
        </div>
        <TaskBoard tasks={tasks} fixed={{ employee_id: id }} />
      </div>

      <div className="card">
        <div className="card-head">
          <h2>Ближайшие события</h2>
          <em>{events.length}</em>
        </div>
        {!events.length && <Empty>Нет назначенных событий</Empty>}
        <div className="list">
          {events.map((e) => (
            <Link key={e.id} to={`/events/${e.id}`} className="row-card">
              <i className="bar" style={{ background: e.color }} />
              <div className="row-main">
                <div className="row-title">{e.title}</div>
                <div className="row-sub">
                  {fmtRange(e.start_at, e.end_at)}
                  {e.role ? ` · ${e.role}` : ''}
                </div>
              </div>
              <Chip tone={e.status}>{EVENT_STATUS[e.status]}</Chip>
            </Link>
          ))}
        </div>
      </div>

      {edit && <EmployeeForm initial={m} onClose={() => setEdit(false)} onDeleted={() => nav('/employees')} />}
    </div>
  )
}
