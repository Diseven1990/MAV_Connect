// Substitui estes dois valores pelos dados do teu projeto Supabase.
// Usa apenas a Project URL e a Publishable/anon key. Nunca uses a service_role key no frontend.
const SUPABASE_URL = "COLOCAR_SUPABASE_URL_AQUI";
const SUPABASE_ANON_KEY = "COLOCAR_SUPABASE_ANON_KEY_AQUI";

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
