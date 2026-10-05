import { createAccessHandler } from '../_shared/access-handler.ts';
import { createServices, allowedOrigins } from '../_shared/access-services.ts';

// The handler validates the JWT via getUser and checks app_metadata before writes.
Deno.serve(createAccessHandler('manage', createServices, allowedOrigins()));
