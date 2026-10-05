import { createAccessHandler } from '../_shared/access-handler.ts';
import { createServices, allowedOrigins } from '../_shared/access-services.ts';

Deno.serve(createAccessHandler('request', createServices, allowedOrigins()));
