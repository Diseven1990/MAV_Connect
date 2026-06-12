// Substitui estes dois valores pelos dados do teu projeto Supabase.
// Usa apenas a Project URL e a Publishable/anon key. Nunca uses a service_role key no frontend.
const SUPABASE_URL = "https://fhsrdgxrxknlqkvleitr.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_KHLexFWFCHbUStwaTGLu6w_HkQM4gWh";

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
