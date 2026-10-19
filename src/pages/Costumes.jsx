import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useData } from '../data'
import { Chip, Empty, Field, GroupInput, Modal, PageHead, confirmDelete } from '../components/ui'
import { COSTUME_STATUS, groupBy, overlaps } from '../utils'

export function CostumeForm({ initial, onClose, onDeleted }) {
  const d = useData()
  const [f, setF] = useState({ name: '', group_name: '', description: '', size: '', quantity: 1, status: 'ok', ...Object.fromEntries(Object.entries(initial || {}).map(([k, v]) => [k, v ?? ''])) })
  const set = (k) => (v) => setF((x) => ({ ...x, [k]: v }))
  const editing = Boolean(initial?.id)

  const submit = async (e) => {
    e.preventDefault()
    if (!f.name.trim()) return
    const { id, created_at, ...rest } = f
    const row = { ...rest, name: f.name.trim(), quantity: Math.max(1, Number(f.quantity) || 1), group_name: f.group_name?.trim() || null }
    const ok = editing ? await d.update('costumes', initial.id, row) : await d.insert('costumes', row)
    if (ok) onClose()
  }

  return (
    <Modal title={editing ? 'Редактировать костюм' : 'Новый костюм'} onClose={onClose}>
      <form className="form" onSubmit={submit}>
        <Field label="Название">
          <input className="input" autoFocus value={f.name} onChange={(e) => set('name')(e.target.value)} />
        </Field>
        <div className="row2">
          <Field label="Категория">
            <GroupInput value={f.group_name} onChange={set('group_name')} rows={d.costumes} placeholder="Женские, мужские, аксессуары…" />
          </Field>
          <Field label="Размер">
            <input className="input" value={f.size} onChange={(e) => set('size')(e.target.value)} />
          </Field>
        </div>
        <div className="row2">
          <Field label="Количество единиц">
            <input className="input" type="number" min="1" value={f.quantity} onChange={(e) => set('quantity')(e.target.value)} />
          </Field>
          <Field label="Состояние">
            <select className="input" value={f.status} onChange={(e) => set('status')(e.target.value)}>
              {Object.entries(COSTUME_STATUS).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
          </Field>
        </div>
        <Field label="Описание">
          <textarea className="input" rows={3} value={f.description} onChange={(e) => set('description')(e.target.value)} />
        </Field>
        <div className="form-actions">
          {editing && onDeleted && (
            <button
              type="button"
              className="btn danger left"
              onClick={async () => {
                if (confirmDelete('костюм')) {
                  await d.remove('costumes', initial.id)
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

export default function Costumes() {
  const d = useData()
  const [form, setForm] = useState(false)
  const [q, setQ] = useState('')
  const [by, setBy] = useState('group')

  const rows = useMemo(() => d.costumes.filter((e) => (q ? (e.name + (e.group_name || '') + (e.size || '')).toLowerCase().includes(q.toLowerCase()) : true)), [d.costumes, q])
  const sections = by === 'group' ? groupBy(rows, (e) => e.group_name || 'Без категории') : [['', [...rows].sort((a, b) => a.name.localeCompare(b.name, 'ru'))]]

  const now = new Date()
  const busyNow = (eq) => {
    const ev = d.event_costumes
      .filter((x) => x.costume_id === eq.id)
      .map((x) => d.events.find((e) => e.id === x.event_id))
      .find((e) => e && e.status !== 'cancelled' && overlaps(e.start_at, e.end_at, now, now))
    const blk = d.costume_blocks.find((b) => b.costume_id === eq.id && overlaps(b.start_at, b.end_at, now, now))
    return ev?.title || blk?.reason || (blk ? 'занято' : null)
  }

  return (
    <div className="page">
      <PageHead title="Костюмы" sub={`${d.costumes.length} позиций`}>
        <button className="btn primary" onClick={() => setForm(true)}>
          + Костюм
        </button>
      </PageHead>
      <div className="toolbar">
        <input className="input sm grow-in" placeholder="Поиск…" value={q} onChange={(e) => setQ(e.target.value)} />
        <div className="seg">
          <button className={by === 'group' ? 'on' : ''} onClick={() => setBy('group')}>
            По категориям
          </button>
          <button className={by === 'none' ? 'on' : ''} onClick={() => setBy('none')}>
            Списком
          </button>
        </div>
      </div>
      {!rows.length && <Empty>Костюмов нет. Добавьте первый.</Empty>}
      {sections.map(([name, list]) => (
        <section key={name} className="section">
          {name && (
            <h2 className="section-title">
              {name} <em>{list.length}</em>
            </h2>
          )}
          <div className="cards">
            {list.map((m) => {
              const busy = busyNow(m)
              return (
                <Link key={m.id} to={`/costumes/${m.id}`} className="person gear">
                  <div className="gear-ico">✦</div>
                  <div>
                    <div className="row-title">{m.name}</div>
                    <div className="row-sub">
                      {m.quantity} шт.{m.size ? ` · р. ${m.size}` : ''}
                    </div>
                    <div className="person-stats">
                      {m.status !== 'ok' ? <Chip tone="cancelled">{COSTUME_STATUS[m.status]}</Chip> : busy ? <Chip tone="planned">Занят: {busy}</Chip> : <Chip tone="confirmed">Свободен</Chip>}
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        </section>
      ))}
      {form && <CostumeForm onClose={() => setForm(false)} />}
    </div>
  )
}
