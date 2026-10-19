import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useData } from '../data'
import { Avatar, Chip, Empty, Field, GroupInput, Modal, confirmDelete } from './ui'
import { PRIORITY, TASK_STATUS, fmtDue } from '../utils'

export function TaskForm({ initial, onClose, title = 'Задача' }) {
  const d = useData()
  const [f, setF] = useState({
    title: '',
    description: '',
    employee_id: '',
    event_id: '',
    status: 'todo',
    priority: 'normal',
    due_date: '',
    group_name: '',
    ...Object.fromEntries(Object.entries(initial || {}).map(([k, v]) => [k, v ?? ''])),
  })
  const set = (k) => (v) => setF((x) => ({ ...x, [k]: v }))
  const editing = Boolean(initial?.id)

  const submit = async (e) => {
    e.preventDefault()
    if (!f.title.trim()) return
    const { id, created_at, ...rest } = f
    const row = {
      ...rest,
      title: f.title.trim(),
      employee_id: f.employee_id || null,
      event_id: f.event_id || null,
      due_date: f.due_date || null,
      group_name: f.group_name?.trim() || null,
    }
    const ok = editing ? await d.update('tasks', initial.id, row) : await d.insert('tasks', row)
    if (ok) onClose()
  }

  const del = async () => {
    if (confirmDelete('задачу')) {
      await d.remove('tasks', initial.id)
      onClose()
    }
  }

  return (
    <Modal title={editing ? 'Редактировать задачу' : title} onClose={onClose}>
      <form onSubmit={submit} className="form">
        <Field label="Что нужно сделать">
          <input className="input" autoFocus value={f.title} onChange={(e) => set('title')(e.target.value)} />
        </Field>
        <div className="row2">
          <Field label="Исполнитель">
            <select className="input" value={f.employee_id} onChange={(e) => set('employee_id')(e.target.value)}>
              <option value="">Не назначен</option>
              {d.employees.map((x) => (
                <option key={x.id} value={x.id}>
                  {x.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Мероприятие">
            <select className="input" value={f.event_id} onChange={(e) => set('event_id')(e.target.value)}>
              <option value="">Без мероприятия</option>
              {[...d.events]
                .sort((a, b) => new Date(b.start_at) - new Date(a.start_at))
                .map((x) => (
                  <option key={x.id} value={x.id}>
                    {x.title}
                  </option>
                ))}
            </select>
          </Field>
        </div>
        <div className="row3">
          <Field label="Статус">
            <select className="input" value={f.status} onChange={(e) => set('status')(e.target.value)}>
              {Object.entries(TASK_STATUS).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Приоритет">
            <select className="input" value={f.priority} onChange={(e) => set('priority')(e.target.value)}>
              {Object.entries(PRIORITY).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Срок">
            <input className="input" type="date" value={f.due_date} onChange={(e) => set('due_date')(e.target.value)} />
          </Field>
        </div>
        <Field label="Группа">
          <GroupInput value={f.group_name} onChange={set('group_name')} rows={d.tasks} />
        </Field>
        <Field label="Описание">
          <textarea className="input" rows={3} value={f.description || ''} onChange={(e) => set('description')(e.target.value)} />
        </Field>
        <div className="form-actions">
          {editing && (
            <button type="button" className="btn danger left" onClick={del}>
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

function TaskCard({ task, onEdit, draggable }) {
  const d = useData()
  const emp = d.employees.find((e) => e.id === task.employee_id)
  const ev = d.events.find((e) => e.id === task.event_id)
  const overdue = task.due_date && task.status !== 'done' && new Date(task.due_date + 'T23:59:59') < new Date()
  const next = { todo: 'doing', doing: 'done', done: 'todo' }[task.status]

  return (
    <div
      className={`task ${task.status}`}
      draggable={draggable}
      onDragStart={(e) => e.dataTransfer.setData('text/task', task.id)}
      onClick={() => onEdit(task)}
    >
      <button
        className={`check ${task.status}`}
        title={`Перевести: ${TASK_STATUS[next]}`}
        onClick={(e) => {
          e.stopPropagation()
          d.update('tasks', task.id, { status: next })
        }}
      />
      <div className="task-main">
        <div className="task-title">{task.title}</div>
        <div className="task-meta">
          {task.priority === 'high' && <Chip tone="hot">Высокий</Chip>}
          {task.due_date && <Chip tone={overdue ? 'hot' : ''}>{fmtDue(task.due_date)}</Chip>}
          {task.group_name && <Chip>{task.group_name}</Chip>}
          {ev && (
            <Link to={`/events/${ev.id}`} className="chip link" onClick={(e) => e.stopPropagation()}>
              {ev.title}
            </Link>
          )}
        </div>
      </div>
      <Avatar emp={emp} />
    </div>
  )
}

/** Доска (колонки по статусу, drag&drop) */
export function Board({ tasks, onEdit, onAdd }) {
  const d = useData()
  const [over, setOver] = useState(null)
  return (
    <div className="board">
      {Object.entries(TASK_STATUS).map(([status, label]) => {
        const col = tasks.filter((t) => t.status === status)
        return (
          <div
            key={status}
            className={`col ${over === status ? 'over' : ''}`}
            onDragOver={(e) => {
              e.preventDefault()
              setOver(status)
            }}
            onDragLeave={() => setOver(null)}
            onDrop={(e) => {
              e.preventDefault()
              setOver(null)
              const id = e.dataTransfer.getData('text/task')
              const t = d.tasks.find((x) => x.id === id)
              if (t && t.status !== status) d.update('tasks', id, { status })
            }}
          >
            <div className="col-head">
              <span>{label}</span>
              <em>{col.length}</em>
              <button className="icon-btn" onClick={() => onAdd(status)} title="Добавить">
                +
              </button>
            </div>
            <div className="col-body">
              {col.map((t) => (
                <TaskCard key={t.id} task={t} onEdit={onEdit} draggable />
              ))}
              {!col.length && <div className="col-empty">Пусто</div>}
            </div>
          </div>
        )
      })}
    </div>
  )
}

/** Список (для группировок не по статусу) */
export function TaskList({ tasks, onEdit }) {
  if (!tasks.length) return <Empty>Задач нет</Empty>
  return (
    <div className="tasklist">
      {tasks.map((t) => (
        <TaskCard key={t.id} task={t} onEdit={onEdit} />
      ))}
    </div>
  )
}

/** Board + модалка, для встраивания (сотрудник / мероприятие) */
export default function TaskBoard({ tasks, fixed = {} }) {
  const [form, setForm] = useState(null)
  return (
    <>
      <Board tasks={tasks} onEdit={(t) => setForm({ initial: t })} onAdd={(status) => setForm({ initial: { ...fixed, status } })} />
      {form && <TaskForm initial={form.initial} onClose={() => setForm(null)} />}
    </>
  )
}
