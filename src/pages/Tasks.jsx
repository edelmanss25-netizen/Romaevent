import { useMemo, useState } from 'react'
import { useData } from '../data'
import { Board, TaskForm, TaskList } from '../components/TaskBoard'
import { PageHead } from '../components/ui'
import { PRIORITY, TASK_STATUS, groupBy, uniq } from '../utils'

const MODES = {
  status: 'Статус (доска)',
  employee: 'Сотрудник',
  group: 'Группа',
  event: 'Мероприятие',
  due: 'Срок',
  priority: 'Приоритет',
}

export default function Tasks() {
  const d = useData()
  const [by, setBy] = useState('status')
  const [emp, setEmp] = useState('')
  const [group, setGroup] = useState('')
  const [hideDone, setHideDone] = useState(false)
  const [form, setForm] = useState(null)

  const tasks = useMemo(
    () =>
      d.tasks
        .filter((t) => (emp === '__none' ? !t.employee_id : emp ? t.employee_id === emp : true))
        .filter((t) => (group ? t.group_name === group : true))
        .filter((t) => !(hideDone && t.status === 'done'))
        .sort((a, b) => (a.due_date || '9999').localeCompare(b.due_date || '9999')),
    [d.tasks, emp, group, hideDone]
  )

  const sections = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10)
    switch (by) {
      case 'employee':
        return groupBy(tasks, (t) => d.employees.find((e) => e.id === t.employee_id)?.name || 'Не назначено')
      case 'group':
        return groupBy(tasks, (t) => t.group_name || 'Без группы')
      case 'event':
        return groupBy(tasks, (t) => d.events.find((e) => e.id === t.event_id)?.title || 'Без мероприятия')
      case 'priority':
        return groupBy(tasks, (t) => PRIORITY[t.priority], Object.values(PRIORITY).reverse())
      case 'due': {
        const order = ['Просрочено', 'Сегодня', 'Позже', 'Без срока']
        return groupBy(
          tasks,
          (t) => (!t.due_date ? 'Без срока' : t.status !== 'done' && t.due_date < today ? 'Просрочено' : t.due_date === today ? 'Сегодня' : 'Позже'),
          order
        )
      }
      default:
        return []
    }
  }, [by, tasks, d.employees, d.events])

  return (
    <div className="page">
      <PageHead title="Задачи" sub={`${d.tasks.filter((t) => t.status !== 'done').length} открытых`}>
        <button className="btn primary" onClick={() => setForm({ initial: {} })}>
          + Новая задача
        </button>
      </PageHead>

      <div className="toolbar">
        <span className="lbl">Группировать:</span>
        <select className="input sm" value={by} onChange={(e) => setBy(e.target.value)}>
          {Object.entries(MODES).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>
        <select className="input sm" value={emp} onChange={(e) => setEmp(e.target.value)}>
          <option value="">Все исполнители</option>
          <option value="__none">Не назначены</option>
          {d.employees.map((x) => (
            <option key={x.id} value={x.id}>
              {x.name}
            </option>
          ))}
        </select>
        <select className="input sm" value={group} onChange={(e) => setGroup(e.target.value)}>
          <option value="">Все группы</option>
          {uniq(d.tasks).map((g) => (
            <option key={g}>{g}</option>
          ))}
        </select>
        <label className="toggle">
          <input type="checkbox" checked={hideDone} onChange={(e) => setHideDone(e.target.checked)} />
          Скрыть готовые
        </label>
      </div>

      {by === 'status' ? (
        <Board tasks={tasks} onEdit={(t) => setForm({ initial: t })} onAdd={(status) => setForm({ initial: { status } })} />
      ) : (
        sections.map(([name, list]) => (
          <section key={name} className="section">
            <h2 className="section-title">
              {name} <em>{list.length}</em>
            </h2>
            <TaskList tasks={list} onEdit={(t) => setForm({ initial: t })} />
          </section>
        ))
      )}

      {form && <TaskForm initial={form.initial} onClose={() => setForm(null)} title="Новая задача" />}
    </div>
  )
}
