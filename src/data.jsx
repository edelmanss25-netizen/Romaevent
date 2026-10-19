import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { supabase } from './supabase'

const Ctx = createContext(null)
export const useData = () => useContext(Ctx)

const TABLES = [
  'employees',
  'tasks',
  'events',
  'event_timing',
  'event_employees',
  'equipment',
  'event_equipment',
  'equipment_blocks',
]
const empty = Object.fromEntries(TABLES.map((t) => [t, []]))

export function DataProvider({ children }) {
  const [data, setData] = useState(empty)
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState(null)

  const notify = useCallback((msg, kind = 'info') => {
    setToast({ msg, kind })
    setTimeout(() => setToast((t) => (t && t.msg === msg ? null : t)), 4000)
  }, [])

  const load = useCallback(
    async (t) => {
      const { data: rows, error } = await supabase.from(t).select('*')
      if (error) {
        notify(`${t}: ${error.message}`, 'error')
        return
      }
      setData((d) => ({ ...d, [t]: rows }))
    },
    [notify]
  )

  const loadAll = useCallback(() => Promise.all(TABLES.map(load)), [load])

  useEffect(() => {
    loadAll().then(() => setLoading(false))
    const ch = supabase
      .channel('agency-sync')
      .on('postgres_changes', { event: '*', schema: 'public' }, (p) => {
        if (TABLES.includes(p.table)) load(p.table)
      })
      .subscribe()
    return () => {
      supabase.removeChannel(ch)
    }
  }, [load, loadAll])

  const run = async (t, query, all = false) => {
    const { data: res, error } = await query
    if (error) {
      notify(error.message, 'error')
      return null
    }
    if (all) await loadAll()
    else await load(t)
    return res ?? true
  }

  const api = {
    insert: (t, row) => run(t, supabase.from(t).insert(row).select().single()),
    update: (t, id, patch) => run(t, supabase.from(t).update(patch).eq('id', id)),
    remove: (t, id) => run(t, supabase.from(t).delete().eq('id', id), true),
    upsert: (t, row, onConflict) => run(t, supabase.from(t).upsert(row, { onConflict })),
    removeWhere: (t, match) => run(t, supabase.from(t).delete().match(match)),
  }

  return (
    <Ctx.Provider value={{ ...data, loading, notify, ...api }}>
      {children}
      {toast && <div className={`toast ${toast.kind}`}>{toast.msg}</div>}
    </Ctx.Provider>
  )
}
