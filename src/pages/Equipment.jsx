import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useData } from '../data'
import { Chip, Empty, Field, GroupInput, Modal, PageHead, confirmDelete } from '../components/ui'
import { EQ_STATUS, groupBy, overlaps } from '../utils'

export function EquipmentForm({ initial, onClose, onDeleted }) {
  const d = useData()
  const [f, setF] = useState({ name: '', group_name: '', description: '', serial: '', quantity: 1, status: 'ok', ...Object.fromEntries(Object.entries(initial || {}).map(([k, v]) => [k, v ?? ''])) })
  const set = (k) => (v) => setF((x) => ({ ...x, [k]: v }))
  const editing = Boolean(initial?.id)

  const submit = async (e) => {
    e.preventDefault()
    if (!f.name.trim()) return
    const { id, created_at, ...rest } = f
    const row = { ...rest, name: f.name.trim(), quantity: Math.max(1, Number(f.quantity) || 1), group_name: f.group_name?.trim() || null }
    const ok = editing ? await d.update('equipment', initial.id, row) : await d.insert('equipment', row)
    if (ok) onClose()
  }

  return (
    <Modal title={editing ? 'Редактировать оборудование' : 'Новая единица оборудования'} onClose={onClose}>
      <form className="form" onSubmit={submit}>
        <Field label="Название">
          <input className="input" autoFocus value={f.name} onChange={(e) => set('name')(e.target.value)} />
        </Field>
        <div className="row2">
          <Field label="Категория">
            <GroupInput value={f.group_name} onChange={set('group_name')} rows={d.equipment} placeholder="Свет, звук, видео…" />
          </Field>
          <Field label="Серийный номер">
            <input className="input" value={f.serial} onChange={(e) => set('serial')(e.target.value)} />
          </Field>
        </div>
        <div className="row2">
          <Field label="Количество единиц">
            <input className="input" type="number" min="1" value={f.quantity} onChange={(e) => set('quantity')(e.target.value)} />
          </Field>
          <Field label="Состояние">
            <select className="input" value={f.status} onChange={(e) => set('status')(e.target.value)}>
              {Object.entries(EQ_STATUS).map(([k, v]) => (
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
                if (confirmDelete('оборудование')) {
                  await d.remove('equipment', initial.id)
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

export default function Equipment() {
  const d = useData()
  const [form, setForm] = useState(false)
  const [q, setQ] = useState('')
  const [by, setBy] = useState('group')

  const rows = useMemo(() => d.equipment.filter((e) => (q ? (e.name + (e.group_name || '')).toLowerCase().includes(q.toLowerCase()) : true)), [d.equipment, q])
  const sections = by === 'group' ? groupBy(rows, (e) => e.group_name || 'Без категории') : [['', [...rows].sort((a, b) => a.name.localeCompare(b.name, 'ru'))]]

  const now = new Date()
  const busyNow = (eq) => {
    const ev = d.event_equipment
      .filter((x) => x.equipment_id === eq.id)
      .map((x) => d.events.find((e) => e.id === x.event_id))
      .find((e) => e && e.status !== 'cancelled' && overlaps(e.start_at, e.end_at, now, now))
    const blk = d.equipment_blocks.find((b) => b.equipment_id === eq.id && overlaps(b.start_at, b.end_at, now, now))
    return ev?.title || blk?.reason || (blk ? 'занято' : null)
  }

  return (
    <div className="page">
      <PageHead title="Оборудование" sub={`${d.equipment.length} позиций`}>
        <button className="btn primary" onClick={() => setForm(true)}>
          + Оборудование
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
      {!rows.length && <Empty>Оборудования нет. Добавьте первую позицию.</Empty>}
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
                <Link key={m.id} to={`/equipment/${m.id}`} className="person gear">
                  <div className="gear-ico">▣</div>
                  <div>
                    <div className="row-title">{m.name}</div>
                    <div className="row-sub">
                      {m.quantity} шт.{m.serial ? ` · ${m.serial}` : ''}
                    </div>
                    <div className="person-stats">
                      {m.status === 'repair' ? <Chip tone="cancelled">В ремонте</Chip> : busy ? <Chip tone="planned">Занято: {busy}</Chip> : <Chip tone="confirmed">Свободно</Chip>}
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        </section>
      ))}
      {form && <EquipmentForm onClose={() => setForm(false)} />}
    </div>
  )
}
