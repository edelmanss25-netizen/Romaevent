import { useState } from 'react'
import { supabase } from '../supabase'

export function SetupNotice() {
  return (
    <div className="auth">
      <div className="auth-box">
        <img src="/logo.png" alt="" className="auth-logo" />
        <h1>Подключите Supabase</h1>
        <p className="hint">
          Не заданы переменные окружения. Добавьте в <code>.env</code> (локально) или в Vercel → Settings → Environment Variables:
        </p>
        <pre className="code">{`VITE_SUPABASE_URL=...\nVITE_SUPABASE_ANON_KEY=...`}</pre>
        <p className="hint">
          Затем выполните <code>supabase/schema.sql</code> в SQL Editor. Подробности — в README.
        </p>
      </div>
    </div>
  )
}

export default function Auth() {
  const [mode, setMode] = useState('in')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [msg, setMsg] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    setBusy(true)
    setMsg('')
    const { error, data } =
      mode === 'in'
        ? await supabase.auth.signInWithPassword({ email, password })
        : await supabase.auth.signUp({ email, password })
    setBusy(false)
    if (error) setMsg(error.message)
    else if (mode === 'up' && !data.session) setMsg('Проверьте почту — отправили письмо для подтверждения.')
  }

  return (
    <div className="auth">
      <form className="auth-box" onSubmit={submit}>
        <img src="/logo.png" alt="" className="auth-logo" />
        <h1>Workspace</h1>
        <p className="hint">Планировщик агентства</p>
        <input className="input" type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required autoFocus />
        <input className="input" type="password" placeholder="Пароль" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} />
        {msg && <div className="form-err">{msg}</div>}
        <button className="btn primary wide" disabled={busy}>
          {mode === 'in' ? 'Войти' : 'Создать аккаунт'}
        </button>
        <button type="button" className="linkbtn" onClick={() => setMode(mode === 'in' ? 'up' : 'in')}>
          {mode === 'in' ? 'Нет аккаунта? Зарегистрироваться' : 'Уже есть аккаунт? Войти'}
        </button>
      </form>
    </div>
  )
}
