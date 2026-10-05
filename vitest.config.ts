import { defineConfig } from 'vitest/config';
export default defineConfig({
  resolve: { alias: { 'npm:@supabase/supabase-js@2.117.2': '@supabase/supabase-js' } },
  oxc: { jsx: { runtime: 'automatic' } },
  test: { environment: 'jsdom', include: ['tests/**/*.test.{ts,tsx}'], clearMocks: true },
});
