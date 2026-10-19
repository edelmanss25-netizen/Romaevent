import { useState } from 'react'
import { useData } from '../data'
import { ColorPicker, Field, GroupInput, Modal } from './ui'
import { EVENT_STATUS, PALETTE, fromInput, toInput } from '../utils'

export default function EventForm({ initial, onSave, onClose, title }) {
  const d = useData()
  const [f, setF] = useState({
    title: '',
    description: '',
    location: '',
    status: 'planned',
    group_name: '',
    color: PALETTE[0],
    ...initial,
    start_at: initial?.start_at ? toInput(initial.start_at) : '',
    end_at: initial?.end_at ? toInput(initial.end_at) : '',
  })
  const [err, setErr] = useState('')
  const set = (k) => (v) => setF((x) => ({ ...x, [k]: v }))

  const submit = async (e) => {
    e.preventDefault()
    if (!f.title.trim()) return setErr('Укажите название')
    if (!f.start_at || !f.end_at) return setErr('Укажите начало и конец')
    if (new Date(f.end_at) <= new Date(f.start_at)) return setErr('Конец должен быть позже начала')
    const { id, created_at, ...rest } = f
    await onSave({
      ...rest,
      title: f.title.trim(),
      start_at: fromInput(f.start_at),
      end_at: fromInput(f.end_at),
      group_name: f.group_name?.trim() || null,
    })
  }

  return (
    <Modal title={title} onClose={onClose}>
      <form onSubmit={submit} className="form">
        <Field label="Название">
          <input className="input" autoFocus value={f.title} onChange={(e) => set('title')(e.target.value)} />
        </Field>
        <div className="row2">
          <Field label="Начало">
            <input
              className="input"
              type="datetime-local"
              value={f.start_at}
              onChange={(e) => {
                const v = e.target.value
                setF((x) => {
                  let end = x.end_at
                  if (!end || new Date(end) <= new Date(v)) {
                    const dt = new Date(v)
                    dt.setHours(dt.getHours() + 1)
                    end = toInput(dt.toISOString())
                  }
                  return { ...x, start_at: v, end_at: v ? end : x.end_at }
                })
              }}
            />
          </Field>
          <Field label="Конец">
            <input className="input" type="datetime-local" value={f.end_at} onChange={(e) => set('end_at')(e.target.value)} />
          </Field>
        </div>
        <div className="row2">
          <Field label="Место">
            <input className="input" value={f.location || ''} onChange={(e) => set('location')(e.target.value)} />
          </Field>
          <Field label="Группа / клиент">
            <GroupInput value={f.group_name} onChange={set('group_name')} rows={d.events} />
          </Field>
        </div>
        <div className="row2">
          <Field label="Статус">
            <select className="input" value={f.status} onChange={(e) => set('status')(e.target.value)}>
              {Object.entries(EVENT_STATUS).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Цвет">
            <ColorPicker value={f.color} onChange={set('color')} />
          </Field>
        </div>
        <Field label="Описание">
          <textarea className="input" rows={3} value={f.description || ''} onChange={(e) => set('description')(e.target.value)} />
        </Field>
        {err && <div className="form-err">{err}</div>}
        <div className="form-actions">
          <button type="button" className="btn ghost" onClick={onClose}>
            Отмена
          </button>
          <button className="btn primary">Сохранить</button>
        </div>
      </form>
    </Modal>
  )
}
