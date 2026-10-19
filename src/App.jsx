import { useEffect, useState } from 'react'
import { BrowserRouter, NavLink, Navigate, Route, Routes } from 'react-router-dom'
import { configured, supabase } from './supabase'
import { DataProvider } from './data'
import Auth, { SetupNotice } from './components/Auth'
import Calendar from './pages/Calendar'
import Events from './pages/Events'
import EventPage from './pages/EventPage'
import Tasks from './pages/Tasks'
import Employees from './pages/Employees'
import EmployeePage from './pages/EmployeePage'
import Equipment from './pages/Equipment'
import EquipmentPage from './pages/EquipmentPage'
import Costumes from './pages/Costumes'
import CostumePage from './pages/CostumePage'

const NAV = [
  ['/calendar', 'Календарь', '◫'],
  ['/events', 'События', '◈'],
  ['/tasks', 'Задачи', '☑'],
  ['/employees', 'Сотрудники', '◉'],
  ['/equipment', 'Оборудование', '▣'],
  ['/costumes', 'Костюмы', '✦'],
]

function Shell({ session }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="app">
      <aside className={`sidebar ${open ? 'open' : ''}`}>
        <div className="brand">
          <img src="/logo.png" alt="" />
          <span>Workspace</span>
        </div>
        <nav onClick={() => setOpen(false)}>
          {NAV.map(([to, label, ico]) => (
            <NavLink key={to} to={to} className={({ isActive }) => `nav-item ${isActive ? 'on' : ''}`}>
              <i>{ico}</i>
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="grow" />
        <div className="me">
          <span title={session.user.email}>{session.user.email}</span>
          <button className="linkbtn" onClick={() => supabase.auth.signOut()}>
            Выйти
          </button>
        </div>
      </aside>
      <button className="burger" onClick={() => setOpen((o) => !o)} aria-label="Меню">
        ☰
      </button>
      {open && <div className="scrim" onClick={() => setOpen(false)} />}
      <main className="main">
        <DataProvider>
          <Routes>
            <Route path="/" element={<Navigate to="/calendar" replace />} />
            <Route path="/calendar" element={<Calendar />} />
            <Route path="/events" element={<Events />} />
            <Route path="/events/:id" element={<EventPage />} />
            <Route path="/tasks" element={<Tasks />} />
            <Route path="/employees" element={<Employees />} />
            <Route path="/employees/:id" element={<EmployeePage />} />
            <Route path="/equipment" element={<Equipment />} />
            <Route path="/equipment/:id" element={<EquipmentPage />} />
            <Route path="/costumes" element={<Costumes />} />
            <Route path="/costumes/:id" element={<CostumePage />} />
            <Route path="*" element={<Navigate to="/calendar" replace />} />
          </Routes>
        </DataProvider>
      </main>
    </div>
  )
}

export default function App() {
  const [session, setSession] = useState(undefined)

  useEffect(() => {
    if (!configured) return
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setSession(s))
    return () => data.subscription.unsubscribe()
  }, [])

  if (!configured) return <SetupNotice />
  if (session === undefined) return <div className="boot" />
  if (!session) return <Auth />
  return (
    <BrowserRouter>
      <Shell session={session} />
    </BrowserRouter>
  )
}
