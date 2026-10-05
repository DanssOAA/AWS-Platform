import { createAccessHandler } from '../_shared/access-handler.ts';
import { createServices, allowedOrigins } from '../_shared/access-services.ts';

// Account creation belongs exclusively to the approval endpoint.
Deno.serve(createAccessHandler('otp', createServices, allowedOrigins()));
