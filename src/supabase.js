import { createClient } from '@supabase/supabase-js'

// La clave publicable es segura en el navegador: RLS solo permite leer e insertar en `felicitaciones`.
const URL = import.meta.env.VITE_SUPABASE_URL ?? 'https://zoidnphuqxuvocoelrfj.supabase.co'
const KEY = import.meta.env.VITE_SUPABASE_KEY ?? 'sb_publishable_a8U0UY8TqbgHtQsSo1Cqvw_jIyyphzc'

export const supabase = createClient(URL, KEY, { auth: { persistSession: false } })
