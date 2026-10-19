import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useData } from '../data'
import EventForm from '../components/EventForm'
import TaskBoard from '../components/TaskBoard'
import { Avatar, Chip, Empty, Field, Modal, PageHead, confirmDelete } from '../components/ui'
import { EVENT_STATUS, COSTUME_STATUS, costumeConflicts, eqConflicts, fmtRange, hhmm } from '../utils'

/* ---------- Тайминг ---------- */
function SegmentForm({ initial, event, onClose }) {
  const d = useData()
  const editing = Boolean(initial?.id)
  const [f, setF] = useState({
    start_time: hhmm(initial?.start_time),
    end_time: hhmm(initial?.end_time),
    title: initial?.title || '',
    structure: initial?.structure || '',
  })
  const set = (k) => (v) => setF((x) => ({ ...x, [k]: v }))

  const current = editing ? d.event_timing_employees.filter((x) => x.timing_id === initial.id).map((x) => x.employee_id) : []
  const [sel, setSel] = useState(() => new Set(current))
  const [busy, setBusy] = useState(false)

  // сотрудники события + те, кто уже назначен на этот отрезок
  const staffIds = d.event_employees.filter((x) => x.event_id === event.id).map((x) => x.employee_id)
  const listIds = [...new Set([...staffIds, ...current])]
  const people = listIds.map((id) => d.employees.find((m) => m.id === id)).filter(Boolean)

  const toggle = (id) =>
    setSel((s) => {
      const n = new Set(s)
      n.has(id) ? n.delete(id) : n.add(id)
      return n
    })

  const submit = async (e) => {
    e.preventDefault()
    if (!f.title.trim() || !f.start_time || busy) return
    setBusy(true)
    const row = {
      event_id: event.id,
      title: f.title.trim(),
      start_time: f.start_time,
      end_time: f.end_time || null,
      structure: f.structure.trim() || null,
    }
    let tid = initial?.id
    if (editing) {
      if (!(await d.update('event_timing', tid, row))) return setBusy(false)
    } else {
      const r = await d.insert('event_timing', row)
      if (!r || !r.id) return setBusy(false)
      tid = r.id
    }
    const add = [...sel].filter((x) => !current.includes(x))
    const del = current.filter((x) => !sel.has(x))
    if (add.length) await d.insertMany('event_timing_employees', add.map((employee_id) => ({ timing_id: tid, employee_id })))
    for (const employee_id of del) await d.removeWhere('event_timing_employees', { timing_id: tid, employee_id })
    onClose()
  }

  return (
    <Modal title={editing ? 'Редактировать отрезок' : 'Новый отрезок тайминга'} onClose={onClose}>
      <form className="form" onSubmit={submit}>
        <div className="row2">
          <Field label="Начало">
            <input className="input" type="time" value={f.start_time} onChange={(e) => set('start_time')(e.target.value)} />
          </Field>
          <Field label="Конец">
            <input className="input" type="time" value={f.end_time} onChange={(e) => set('end_time')(e.target.value)} />
          </Field>
        </div>
        <Field label="Название блока">
          <input className="input" autoFocus value={f.title} onChange={(e) => set('title')(e.target.value)} placeholder="Например: Welcome-зона" />
        </Field>
        <Field label="Структура" hint="Каждый пункт с новой строки">
          <textarea className="input" rows={6} value={f.structure} onChange={(e) => set('structure')(e.target.value)} />
        </Field>
        <div className="field">
          <span>
            Ответственные {sel.size > 0 && <b className="count">· выбрано {sel.size}</b>}
          </span>
          {people.length > 0 ? (
            <>
              <div className="pick-list">
                {people.map((m) => (
                  <label key={m.id} className={`pick ${sel.has(m.id) ? 'on' : ''}`}>
                    <input type="checkbox" checked={sel.has(m.id)} onChange={() => toggle(m.id)} />
                    <Avatar emp={m} size={22} />
                    <span>{m.name}</span>
                  </label>
                ))}
              </div>
              <div className="pick-tools">
                <button type="button" className="linkbtn" onClick={() => setSel(new Set(people.map((m) => m.id)))}>
                  Выбрать всех
                </button>
                <button type="button" className="linkbtn" onClick={() => setSel(new Set())}>
                  Снять выбор
                </button>
              </div>
            </>
          ) : (
            <small>Сначала добавьте сотрудников на событие (блок «Сотрудники» справа).</small>
          )}
        </div>
        <div className="form-actions">
          <button type="button" className="btn ghost" onClick={onClose}>
            Отмена
          </button>
          <button className="btn primary" disabled={busy}>
            Сохранить
          </button>
        </div>
      </form>
    </Modal>
  )
}

function Timing({ event }) {
  const d = useData()
  const [form, setForm] = useState(null)
  const rows = d.event_timing.filter((t) => t.event_id === event.id).sort((a, b) => a.start_time.localeCompare(b.start_time))

  const add = () => {
    const last = rows[rows.length - 1]
    const start = last?.end_time || last?.start_time || new Date(event.start_at).toTimeString().slice(0, 5)
    setForm({ start_time: start })
  }

  return (
    <div className="card">
      <div className="card-head">
        <h2>Тайминг</h2>
        <button className="btn sm" onClick={add}>
          + Отрезок
        </button>
      </div>
      {!rows.length && <Empty>Тайминг пуст. Добавьте первый отрезок.</Empty>}
      <div className="timeline">
        {rows.map((t) => {
          const resp = d.event_timing_employees
            .filter((x) => x.timing_id === t.id)
            .map((x) => d.employees.find((m) => m.id === x.employee_id))
            .filter(Boolean)
          const items = (t.structure || '').split('\n').map((s) => s.trim()).filter(Boolean)
          return (
            <div key={t.id} className="seg-row">
              <div className="seg-time">
                <b>{hhmm(t.start_time)}</b>
                {t.end_time && <span>{hhmm(t.end_time)}</span>}
              </div>
              <div className="seg-body">
                <div className="seg-title">
                  {t.title}
                  <span className="seg-actions">
                    <button className="icon-btn" onClick={() => setForm(t)} title="Изменить">
                      ✎
                    </button>
                    <button
                      className="icon-btn"
                      title="Удалить"
                      onClick={() => confirmDelete('отрезок') && d.remove('event_timing', t.id)}
                    >
                      ✕
                    </button>
                  </span>
                </div>
                {resp.length > 0 && (
                  <div className="seg-people">
                    {resp.map((m) => (
                      <Link key={m.id} to={`/employees/${m.id}`} className="person-tag">
                        <Avatar emp={m} size={18} />
                        {m.name}
                      </Link>
                    ))}
                  </div>
                )}
                {items.length > 0 && (
                  <ul className="seg-list">
                    {items.map((s, i) => (
                      <li key={i}>{s}</li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          )
        })}
      </div>
      {form && <SegmentForm initial={form} event={event} onClose={() => setForm(null)} />}
    </div>
  )
}

/* ---------- Сотрудники ---------- */
function Staff({ event }) {
  const d = useData()
  const [emp, setEmp] = useState('')
  const [role, setRole] = useState('')
  const assigned = d.event_employees.filter((x) => x.event_id === event.id)
  const free = d.employees.filter((m) => !assigned.some((a) => a.employee_id === m.id))

  const add = async (e) => {
    e.preventDefault()
    if (!emp) return
    await d.insert('event_employees', { event_id: event.id, employee_id: emp, role: role.trim() || null })
    setEmp('')
    setRole('')
  }

  const remove = async (employee_id) => {
    // заодно снимаем сотрудника с отрезков тайминга этого события
    const timingIds = d.event_timing.filter((t) => t.event_id === event.id).map((t) => t.id)
    for (const timing_id of timingIds) {
      if (d.event_timing_employees.some((x) => x.timing_id === timing_id && x.employee_id === employee_id)) {
        await d.removeWhere('event_timing_employees', { timing_id, employee_id })
      }
    }
    await d.removeWhere('event_employees', { event_id: event.id, employee_id })
  }

  return (
    <div className="card">
      <div className="card-head">
        <h2>Сотрудники</h2>
        <em>{assigned.length}</em>
      </div>
      <div className="stack">
        {assigned.map((a) => {
          const m = d.employees.find((x) => x.id === a.employee_id)
          if (!m) return null
          return (
            <div key={a.employee_id} className="line">
              <Avatar emp={m} />
              <Link to={`/employees/${m.id}`} className="line-main">
                {m.name}
                <small>{a.role || m.role || ''}</small>
              </Link>
              <button className="icon-btn" onClick={() => remove(a.employee_id)}>
                ✕
              </button>
            </div>
          )
        })}
      </div>
      {free.length > 0 ? (
        <form className="inline-form" onSubmit={add}>
          <select className="input sm" value={emp} onChange={(e) => setEmp(e.target.value)}>
            <option value="">Сотрудник…</option>
            {free.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
          <input className="input sm" placeholder="Роль на событии" value={role} onChange={(e) => setRole(e.target.value)} />
          <button className="btn sm primary" disabled={!emp}>
            Добавить
          </button>
        </form>
      ) : (
        !d.employees.length && (
          <p className="hint">
            Сначала добавьте людей в разделе <Link to="/employees">Сотрудники</Link>.
          </p>
        )
      )}
    </div>
  )
}

/* ---------- Оборудование ---------- */
function Gear({ event }) {
  const d = useData()
  const [eq, setEq] = useState('')
  const [qty, setQty] = useState(1)
  const assigned = d.event_equipment.filter((x) => x.event_id === event.id)
  const free = d.equipment.filter((m) => !assigned.some((a) => a.equipment_id === m.id))

  const add = async (e) => {
    e.preventDefault()
    if (!eq) return
    const c = eqConflicts(d, eq, event, Number(qty))
    if (c.over && !window.confirm('Это оборудование занято в это время. Всё равно добавить?')) return
    await d.upsert('event_equipment', { event_id: event.id, equipment_id: eq, qty: Number(qty) || 1 }, 'event_id,equipment_id')
    setEq('')
    setQty(1)
  }

  return (
    <div className="card">
      <div className="card-head">
        <h2>Оборудование</h2>
        <em>{assigned.length}</em>
      </div>
      <div className="stack">
        {assigned.map((a) => {
          const m = d.equipment.find((x) => x.id === a.equipment_id)
          if (!m) return null
          const c = eqConflicts(d, m.id, event, a.qty)
          return (
            <div key={a.equipment_id} className="line">
              <Link to={`/equipment/${m.id}`} className="line-main">
                {m.name}
                {c.over && (
                  <small className="warn">
                    ⚠{' '}
                    {c.repair
                      ? 'в ремонте'
                      : c.blocks.length
                      ? `заблокировано: ${c.blocks[0].reason || 'занято'}`
                      : `занято: ${c.others.map(({ ev }) => ev.title).join(', ') || 'не хватает единиц'}`}
                  </small>
                )}
              </Link>
              <input
                className="input qty"
                type="number"
                min="1"
                value={a.qty}
                onChange={(e) =>
                  d.upsert('event_equipment', { event_id: event.id, equipment_id: a.equipment_id, qty: Number(e.target.value) || 1 }, 'event_id,equipment_id')
                }
                title="Количество"
              />
              <button className="icon-btn" onClick={() => d.removeWhere('event_equipment', { event_id: event.id, equipment_id: a.equipment_id })}>
                ✕
              </button>
            </div>
          )
        })}
      </div>
      {free.length > 0 ? (
        <form className="inline-form" onSubmit={add}>
          <select className="input sm" value={eq} onChange={(e) => setEq(e.target.value)}>
            <option value="">Оборудование…</option>
            {free.map((m) => {
              const busy = eqConflicts(d, m.id, event, 1).over
              return (
                <option key={m.id} value={m.id}>
                  {m.name}
                  {busy ? ' — занято' : ''}
                </option>
              )
            })}
          </select>
          <input className="input sm qty" type="number" min="1" value={qty} onChange={(e) => setQty(e.target.value)} />
          <button className="btn sm primary" disabled={!eq}>
            Добавить
          </button>
        </form>
      ) : (
        !d.equipment.length && (
          <p className="hint">
            Сначала добавьте технику в разделе <Link to="/equipment">Оборудование</Link>.
          </p>
        )
      )}
    </div>
  )
}

/* ---------- Костюмы ---------- */
function Costumes({ event }) {
  const d = useData()
  const [cs, setCs] = useState('')
  const [qty, setQty] = useState(1)
  const [note, setNote] = useState('')
  const assigned = d.event_costumes.filter((x) => x.event_id === event.id)
  const free = d.costumes.filter((m) => !assigned.some((a) => a.costume_id === m.id))
  const save = (row) => d.upsert('event_costumes', { event_id: event.id, ...row }, 'event_id,costume_id')

  const add = async (e) => {
    e.preventDefault()
    if (!cs) return
    const c = costumeConflicts(d, cs, event, Number(qty))
    if (c.over && !window.confirm('Этот костюм занят или недоступен в это время. Всё равно добавить?')) return
    await save({ costume_id: cs, qty: Number(qty) || 1, note: note.trim() || null })
    setCs('')
    setQty(1)
    setNote('')
  }

  return (
    <div className="card">
      <div className="card-head">
        <h2>Костюмы</h2>
        <em>{assigned.length}</em>
      </div>
      <div className="stack">
        {assigned.map((a) => {
          const m = d.costumes.find((x) => x.id === a.costume_id)
          if (!m) return null
          const c = costumeConflicts(d, m.id, event, a.qty)
          return (
            <div key={a.costume_id} className="line">
              <div className="line-main">
                <Link to={`/costumes/${m.id}`}>
                  {m.name}
                  {m.size ? <span className="muted-inline"> · {m.size}</span> : null}
                </Link>
                {c.over && (
                  <small className="warn">
                    ⚠{' '}
                    {c.bad
                      ? COSTUME_STATUS[c.status].toLowerCase()
                      : c.blocks.length
                      ? `заблокирован: ${c.blocks[0].reason || 'занят'}`
                      : `занят: ${c.others.map(({ ev }) => ev.title).join(', ') || 'не хватает единиц'}`}
                  </small>
                )}
                <input
                  className="input note"
                  placeholder="Кому / комментарий"
                  defaultValue={a.note || ''}
                  onBlur={(e) => e.target.value !== (a.note || '') && save({ costume_id: a.costume_id, qty: a.qty, note: e.target.value.trim() || null })}
                />
              </div>
              <input
                className="input qty"
                type="number"
                min="1"
                value={a.qty}
                onChange={(e) => save({ costume_id: a.costume_id, qty: Number(e.target.value) || 1, note: a.note })}
                title="Количество"
              />
              <button className="icon-btn" onClick={() => d.removeWhere('event_costumes', { event_id: event.id, costume_id: a.costume_id })}>
                ✕
              </button>
            </div>
          )
        })}
      </div>
      {free.length > 0 ? (
        <form className="inline-form" onSubmit={add}>
          <select className="input sm" value={cs} onChange={(e) => setCs(e.target.value)}>
            <option value="">Костюм…</option>
            {free.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
                {m.size ? ` (${m.size})` : ''}
                {costumeConflicts(d, m.id, event, 1).over ? ' — занят' : ''}
              </option>
            ))}
          </select>
          <input className="input sm qty" type="number" min="1" value={qty} onChange={(e) => setQty(e.target.value)} />
          <input className="input sm" placeholder="Кому / комментарий" value={note} onChange={(e) => setNote(e.target.value)} />
          <button className="btn sm primary" disabled={!cs}>
            Добавить
          </button>
        </form>
      ) : (
        !d.costumes.length && (
          <p className="hint">
            Сначала добавьте костюмы в разделе <Link to="/costumes">Костюмы</Link>.
          </p>
        )
      )}
    </div>
  )
}

/* ---------- Страница ---------- */
export default function EventPage() {
  const { id } = useParams()
  const d = useData()
  const nav = useNavigate()
  const [edit, setEdit] = useState(false)
  const ev = d.events.find((e) => e.id === id)

  if (d.loading) return <div className="page" />
  if (!ev)
    return (
      <div className="page">
        <Empty>
          Событие не найдено. <Link to="/events">К списку</Link>
        </Empty>
      </div>
    )

  const tasks = d.tasks.filter((t) => t.event_id === id)

  return (
    <div className="page">
      <PageHead
        back={
          <Link to="/events" className="back">
            ← События
          </Link>
        }
        title={ev.title}
        sub={`${fmtRange(ev.start_at, ev.end_at)}${ev.location ? ' · ' + ev.location : ''}`}
      >
        <Chip tone={ev.status}>{EVENT_STATUS[ev.status]}</Chip>
        {ev.group_name && <Chip>{ev.group_name}</Chip>}
        <button className="btn ghost" onClick={() => setEdit(true)}>
          Изменить
        </button>
        <button
          className="btn danger"
          onClick={async () => {
            if (confirmDelete('событие вместе с таймингом и задачами')) {
              await d.remove('events', id)
              nav('/events')
            }
          }}
        >
          Удалить
        </button>
      </PageHead>

      {ev.description && <p className="desc">{ev.description}</p>}

      <div className="two-col">
        <Timing event={ev} />
        <div className="side-col">
          <Staff event={ev} />
          <Gear event={ev} />
          <Costumes event={ev} />
        </div>
      </div>

      <div className="card">
        <div className="card-head">
          <h2>Задачи по событию</h2>
          <em>{tasks.length}</em>
        </div>
        <TaskBoard tasks={tasks} fixed={{ event_id: id }} />
      </div>

      {edit && <EventForm title="Изменить событие" initial={ev} onClose={() => setEdit(false)} onSave={async (row) => (await d.update('events', id, row)) && setEdit(false)} />}
    </div>
  )
}
