import { useEffect, useId } from 'react'
import { initials, PALETTE, uniq } from '../utils'

export function Modal({ title, onClose, children, wide }) {
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])
  return (
    <div className="modal-back" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className={`modal ${wide ? 'wide' : ''}`}>
        <div className="modal-head">
          <h3>{title}</h3>
          <button className="icon-btn" onClick={onClose} aria-label="Закрыть">
            ✕
          </button>
        </div>
        <div className="modal-body">{children}</div>
      </div>
    </div>
  )
}

export const Field = ({ label, children, hint }) => (
  <label className="field">
    <span>{label}</span>
    {children}
    {hint && <small>{hint}</small>}
  </label>
)

export function GroupInput({ value, onChange, rows, placeholder = 'Без группы' }) {
  const id = useId()
  return (
    <>
      <input className="input" list={id} value={value || ''} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />
      <datalist id={id}>
        {uniq(rows).map((g) => (
          <option key={g} value={g} />
        ))}
      </datalist>
    </>
  )
}

export function ColorPicker({ value, onChange }) {
  return (
    <div className="swatches">
      {PALETTE.map((c) => (
        <button
          type="button"
          key={c}
          className={`swatch ${value === c ? 'on' : ''}`}
          style={{ background: c }}
          onClick={() => onChange(c)}
          aria-label={c}
        />
      ))}
    </div>
  )
}

export const Avatar = ({ emp, size = 26 }) =>
  emp ? (
    <span className="avatar" title={emp.name} style={{ width: size, height: size, background: emp.color || '#9aa0ab', fontSize: size * 0.4 }}>
      {initials(emp.name)}
    </span>
  ) : null

export const Chip = ({ children, tone }) => <span className={`chip ${tone || ''}`}>{children}</span>

export const Empty = ({ children }) => <div className="empty">{children}</div>

export const PageHead = ({ title, sub, children, back }) => (
  <div className="page-head">
    <div>
      {back}
      <h1>{title}</h1>
      {sub && <p className="sub">{sub}</p>}
    </div>
    <div className="head-actions">{children}</div>
  </div>
)

export const confirmDelete = (what) => window.confirm(`Удалить ${what}? Это действие нельзя отменить.`)
