import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.117.2";
import { createAnalysisHandler } from './handler.ts';

const origins = (Deno.env.get('CLOUDOPS_ALLOWED_ORIGINS') ?? [
  'http://localhost:5173', 'http://127.0.0.1:5173',
  'https://cloudops-dashboard-blue.vercel.app',
  'https://cloudops-dashboard-danss-projects-056f3308.vercel.app',
  'https://cloudops-dashboard-git-main-danss-projects-056f3308.vercel.app',
].join(',')).split(',').map(value => value.trim()).filter(Boolean);

Deno.serve(createAnalysisHandler({
  db: createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
    auth: { persistSession: false, autoRefreshToken: false },
  }),
  apiKey: Deno.env.get('GEMINI_API_KEY'),
  model: Deno.env.get('CLOUDOPS_GEMINI_MODEL') ?? 'gemini-2.5-flash',
  origins,
}));
