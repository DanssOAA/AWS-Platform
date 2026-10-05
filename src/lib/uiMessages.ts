type MessageContext = 'general' | 'login' | 'proposals' | 'planning' | 'costs' | 'requestAccess' | 'manageAccess' | 'assistant';

const fallback: Record<MessageContext, string> = {
  general: 'No se pudo completar la acción. Inténtalo de nuevo.',
  login: 'No se pudo iniciar sesión. Inténtalo de nuevo o contacta al administrador.',
  proposals: 'No se pudieron cargar las propuestas. Inténtalo de nuevo.',
  planning: 'No se pudo guardar la propuesta. Revisa los datos e inténtalo de nuevo.',
  costs: 'No se pudo guardar el presupuesto. Inténtalo de nuevo.',
  requestAccess: 'No se pudo enviar la solicitud. Inténtalo de nuevo.',
  manageAccess: 'No se pudo actualizar la solicitud. Actualiza el listado e inténtalo de nuevo.',
  assistant: 'El asistente no está disponible en este momento. Inténtalo de nuevo.',
};
const validationMessages = new Set([
  'Introduce un correo electrónico válido.',
  'El código de acceso debe contener exactamente 6 dígitos.',
  'Completa el nombre y la descripción.',
  'Selecciona un servicio e indica al menos un usuario.',
]);

// Presentation only: never forwards arbitrary provider/database text to the UI.
// The original errors, request results and authentication flow remain unchanged.
export function userMessage(message: string, context: MessageContext = 'general'): string {
  if (validationMessages.has(message)) return message;
  const text = message.toLowerCase();
  if (/usuario aprobado.*(pero|fall|error)/.test(text)) return 'El acceso fue aprobado, pero no se pudo confirmar el envío del código. Reintenta el envío desde Aprobadas.';
  if (/rate.limit|too many|demasiad|límite de envío|envío temporalmente bloqueado|intentos.*10 minutos/.test(text)) return 'Se alcanzó el límite de intentos. Espera unos minutos y vuelve a intentarlo.';
  if (/otp_expired|token.*(expired|invalid)|código.*(incorrecto|expirado|inválido)|invalid.*otp/.test(text)) return 'El código es incorrecto o venció. Revisa el código o solicita uno nuevo.';
  if (/invalid.*email|correo.*inválido|email.*invalid/.test(text)) return 'Introduce un correo electrónico válido.';
  if (/no.*acceso aprobado|public signup|alta pública bloqueada/.test(text)) return 'Tu acceso necesita aprobación. Envía una solicitud o contacta al administrador.';
  if (/se requiere un administrador|permission denied|row.level.security|not authorized|forbidden/.test(text)) return 'No tienes permiso para realizar esta acción. Contacta al administrador.';
  if (/jwt|sesión.*(inválida|expirada)|session.*(expired|missing)|refresh.token|debes iniciar sesión/.test(text)) return 'Tu sesión venció. Vuelve a iniciar sesión.';
  if (/no devolvió una sesión válida/.test(text)) return 'No se pudo confirmar el acceso. Solicita un nuevo código.';
  if (/failed to fetch|network|conexión|fetch failed|offline|timeout|timed out|aborterror/.test(text)) return 'No se pudo conectar. Revisa tu conexión e inténtalo de nuevo.';
  if (/siendo procesada|otra operación modificó|solo se pueden rechazar/.test(text)) return 'La solicitud cambió o está siendo procesada. Actualiza el listado.';
  if (/solicitud fue rechazada/.test(text)) return 'Esta solicitud ya fue rechazada. Actualiza el listado.';
  if (/vite_|no está configurado|configura una url|smtp|edge function|non-2xx|http\s*\d|schema cache|relation.*does not exist/.test(text)) return 'El servicio no está disponible en este momento. Inténtalo más tarde o contacta al administrador.';
  return fallback[context];
}
