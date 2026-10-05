import { createClient } from 'npm:@supabase/supabase-js@2.117.2';
import { createAuthHandler } from './handler.ts';

Deno.serve(createAuthHandler({
  env: name => Deno.env.get(name),
  createClient,
}));
