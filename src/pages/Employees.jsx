import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useData } from '../data'
import { Avatar, ColorPicker, Empty, Field, GroupInput, Modal, PageHead, confirmDelete } from '../components/ui'
import { PALETTE, groupBy } from '../utils'

export function EmployeeForm({ initial, onClose, onDeleted }) {
  const d = useData()
  const [f, setF] = useState({ name: '', role: '', email: '', phone: '', group_name: '', color: PALETTE[1], ...Object.fromEntries(Object.entries(initial || {}).map(([k, v]) => [k, v ?? ''])) })
  const set = (k) => (v) => setF((x) => ({ ...x, [k]: v }))
  const editing = Boolean(initial?.id)

  const submit = async (e) => {
    e.preventDefault()
    if (!f.name.trim()) return
    const { id, created_at, ...rest } = f
    const row = { ...rest, name: f.name.trim(), group_name: f.group_name?.trim() || null }
    const ok = editing ? await d.update('employees', initial.id, row) : await d.insert('employees', row)
    if (ok) onClose()
  }

  return (
    <Modal title={editing ? 'Редактировать сотрудника' : 'Новый сотрудник'} onClose={onClose}>
      <form className="form" onSubmit={submit}>
        <Field label="Имя">
          <input className="input" autoFocus value={f.name} onChange={(e) => set('name')(e.target.value)} />
        </Field>
        <div className="row2">
          <Field label="Должность">
            <input className="input" value={f.role} onChange={(e) => set('role')(e.target.value)} />
          </Field>
          <Field label="Отдел / группа">
            <GroupInput value={f.group_name} onChange={set('group_name')} rows={d.employees} />
          </Field>
        </div>
        <div className="row2">
          <Field label="Email">
            <input className="input" type="email" value={f.email} onChange={(e) => set('email')(e.target.value)} />
          </Field>
          <Field label="Телефон">
            <input className="input" value={f.phone} onChange={(e) => set('phone')(e.target.value)} />
          </Field>
        </div>
        <Field label="Цвет">
          <ColorPicker value={f.color} onChange={set('color')} />
        </Field>
        <div className="form-actions">
          {editing && onDeleted && (
            <button
              type="button"
              className="btn danger left"
              onClick={async () => {
                if (confirmDelete('сотрудника')) {
                  await d.remove('employees', initial.id)
                  onClose()
                  onDeleted()
                }
              }}
            >
              Удалить
            </button>
          )}
          <button type="button" className="btn ghost" onClick={onClose}>
            Отмена
          </button>
          <button className="btn primary">Сохранить</button>
        </div>
      </form>
    </Modal>
  )
}

export default function Employees() {
  const d = useData()
  const [form, setForm] = useState(false)
  const [by, setBy] = useState('group')
  const sections = useMemo(
    () => (by === 'group' ? groupBy(d.employees, (e) => e.group_name || 'Без группы') : [['', [...d.employees].sort((a, b) => a.name.localeCompare(b.name, 'ru'))]]),
    [d.employees, by]
  )

  return (
    <div className="page">
      <PageHead title="Сотрудники" sub={`${d.employees.length} в команде`}>
        <button className="btn primary" onClick={() => setForm(true)}>
          + Сотрудник
        </button>
      </PageHead>
      <div className="toolbar">
        <div className="seg">
          <button className={by === 'group' ? 'on' : ''} onClick={() => setBy('group')}>
            По отделам
          </button>
          <button className={by === 'none' ? 'on' : ''} onClick={() => setBy('none')}>
            Списком
          </button>
        </div>
      </div>
      {!d.employees.length && <Empty>Пока никого нет. Добавьте первого сотрудника.</Empty>}
      {sections.map(([name, list]) => (
        <section key={name} className="section">
          {name && (
            <h2 className="section-title">
              {name} <em>{list.length}</em>
            </h2>
          )}
          <div className="cards">
            {list.map((m) => {
              const open = d.tasks.filter((t) => t.employee_id === m.id && t.status !== 'done').length
              const evs = d.event_employees.filter((x) => x.employee_id === m.id).length
              return (
                <Link key={m.id} to={`/employees/${m.id}`} className="person">
                  <Avatar emp={m} size={44} />
                  <div>
                    <div className="row-title">{m.name}</div>
                    <div className="row-sub">{m.role || '—'}</div>
                    <div className="person-stats">
                      <span>{open} задач</span>
                      <span>{evs} событий</span>
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        </section>
      ))}
      {form && <EmployeeForm onClose={() => setForm(false)} />}
    </div>
  )
}
