declare const Deno: {
  env: { get(name: string): string | undefined };
  serve(handler: (request: Request) => Promise<Response>): unknown;
};
declare module 'npm:@supabase/supabase-js@2.117.2' {
  export { createClient, type SupabaseClient } from '@supabase/supabase-js';
}
