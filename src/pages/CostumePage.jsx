import { useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useData } from '../data'
import Grid from '../components/Grid'
import { Chip, Empty, Field, Modal, PageHead, confirmDelete } from '../components/ui'
import { CostumeForm } from './Costumes'
import { COSTUME_STATUS, addDays, endOfDay, fmtRange, fromInput, overlaps, startOfDay, startOfMonth, startOfWeek, toInput } from '../utils'

function BlockForm({ costumeId, initial, onClose }) {
  const d = useData()
  const [f, setF] = useState({ start_at: toInput(initial?.start_at), end_at: toInput(initial?.end_at), reason: initial?.reason || '' })
  const [err, setErr] = useState('')
  const editing = Boolean(initial?.id)

  const submit = async (e) => {
    e.preventDefault()
    if (!f.start_at || !f.end_at) return setErr('Укажите период')
    if (new Date(f.end_at) <= new Date(f.start_at)) return setErr('Конец должен быть позже начала')
    const row = { costume_id: costumeId, start_at: fromInput(f.start_at), end_at: fromInput(f.end_at), reason: f.reason.trim() || null }
    const ok = editing ? await d.update('costume_blocks', initial.id, row) : await d.insert('costume_blocks', row)
    if (ok) onClose()
  }

  return (
    <Modal title={editing ? 'Изменить блокировку' : 'Занять костюм'} onClose={onClose}>
      <form className="form" onSubmit={submit}>
        <div className="row2">
          <Field label="С">
            <input className="input" type="datetime-local" value={f.start_at} onChange={(e) => setF({ ...f, start_at: e.target.value })} />
          </Field>
          <Field label="До">
            <input className="input" type="datetime-local" value={f.end_at} onChange={(e) => setF({ ...f, end_at: e.target.value })} />
          </Field>
        </div>
        <Field label="Причина">
          <input className="input" value={f.reason} onChange={(e) => setF({ ...f, reason: e.target.value })} placeholder="Химчистка, ремонт, выдан на сторону…" />
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

export default function CostumePage() {
  const { id } = useParams()
  const d = useData()
  const nav = useNavigate()
  const [cursor, setCursor] = useState(new Date())
  const [edit, setEdit] = useState(false)
  const [block, setBlock] = useState(null)
  const eq = d.costumes.find((x) => x.id === id)

  const days = useMemo(() => {
    const s = startOfWeek(startOfMonth(cursor))
    return Array.from({ length: 42 }, (_, i) => addDays(s, i))
  }, [cursor])

  if (d.loading) return <div className="page" />
  if (!eq)
    return (
      <div className="page">
        <Empty>
          Костюм не найден. <Link to="/costumes">К списку</Link>
        </Empty>
      </div>
    )

  const bookings = d.event_costumes
    .filter((x) => x.costume_id === id)
    .map((x) => ({ kind: 'event', ev: d.events.find((e) => e.id === x.event_id), qty: x.qty, note: x.note }))
    .filter((b) => b.ev)
  const blocks = d.costume_blocks.filter((b) => b.costume_id === id)

  const getItems = (day) => {
    const s = startOfDay(day)
    const e = endOfDay(day)
    const a = bookings
      .filter((b) => b.ev.status !== 'cancelled' && overlaps(b.ev.start_at, b.ev.end_at, s, e))
      .map((b) => ({ key: `e${b.ev.id}`, label: b.ev.title, color: b.ev.color, to: `/events/${b.ev.id}` }))
    const c = blocks
      .filter((b) => overlaps(b.start_at, b.end_at, s, e))
      .map((b) => ({ key: `b${b.id}`, label: b.reason || 'Занято', color: '#8a8f99', muted: true }))
    return [...a, ...c]
  }

  const now = new Date()
  const list = [
    ...bookings.map((b) => ({ key: 'e' + b.ev.id, at: b.ev.start_at, end: b.ev.end_at, title: b.ev.title, sub: `${b.qty} шт.${b.note ? ' · ' + b.note : ''}`, to: `/events/${b.ev.id}`, status: b.ev.status })),
    ...blocks.map((b) => ({ key: 'b' + b.id, at: b.start_at, end: b.end_at, title: b.reason || 'Занято', sub: 'Ручная блокировка', block: b })),
  ].sort((a, b) => new Date(a.at) - new Date(b.at))
  const upcoming = list.filter((x) => new Date(x.end) >= now)
  const past = list.filter((x) => new Date(x.end) < now).reverse()

  const shiftMonth = (n) => {
    const x = new Date(cursor)
    x.setMonth(x.getMonth() + n, 1)
    setCursor(x)
  }

  const Row = ({ x }) => {
    const inner = (
      <>
        <div className="row-main">
          <div className="row-title">{x.title}</div>
          <div className="row-sub">
            {fmtRange(x.at, x.end)} · {x.sub}
          </div>
        </div>
        {x.block && (
          <span className="seg-actions on">
            <button className="icon-btn" onClick={() => setBlock(x.block)}>
              ✎
            </button>
            <button className="icon-btn" onClick={() => confirmDelete('блокировку') && d.remove('costume_blocks', x.block.id)}>
              ✕
            </button>
          </span>
        )}
      </>
    )
    return x.to ? (
      <Link to={x.to} className="row-card">
        {inner}
      </Link>
    ) : (
      <div className="row-card">{inner}</div>
    )
  }

  return (
    <div className="page">
      <PageHead
        back={
          <Link to="/costumes" className="back">
            ← Костюмы
          </Link>
        }
        title={eq.name}
        sub={[eq.group_name, eq.size ? `размер ${eq.size}` : null, `${eq.quantity} шт.`].filter(Boolean).join(' · ')}
      >
        <Chip tone={eq.status === 'ok' ? 'confirmed' : 'cancelled'}>{COSTUME_STATUS[eq.status]}</Chip>
        <button className="btn ghost" onClick={() => setEdit(true)}>
          Изменить
        </button>
      </PageHead>

      {eq.description && <p className="desc">{eq.description}</p>}

      <div className="card">
        <div className="card-head">
          <h2>График занятости</h2>
          <div className="head-actions">
            <div className="seg">
              <button onClick={() => shiftMonth(-1)}>←</button>
              <button onClick={() => setCursor(new Date())}>{cursor.toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' })}</button>
              <button onClick={() => shiftMonth(1)}>→</button>
            </div>
            <button className="btn sm" onClick={() => setBlock({})}>
              + Занять
            </button>
          </div>
        </div>
        <Grid days={days} month={cursor.getMonth()} getItems={getItems} />
      </div>

      <div className="two-col even">
        <div className="card">
          <div className="card-head">
            <h2>Предстоящие</h2>
            <em>{upcoming.length}</em>
          </div>
          {!upcoming.length && <Empty>Свободно — броней нет</Empty>}
          <div className="list">{upcoming.map((x) => <Row key={x.key} x={x} />)}</div>
        </div>
        <div className="card">
          <div className="card-head">
            <h2>История</h2>
            <em>{past.length}</em>
          </div>
          {!past.length && <Empty>Пока пусто</Empty>}
          <div className="list">{past.slice(0, 15).map((x) => <Row key={x.key} x={x} />)}</div>
        </div>
      </div>

      {edit && <CostumeForm initial={eq} onClose={() => setEdit(false)} onDeleted={() => nav('/costumes')} />}
      {block && <BlockForm costumeId={id} initial={block.id ? block : null} onClose={() => setBlock(null)} />}
    </div>
  )
}
