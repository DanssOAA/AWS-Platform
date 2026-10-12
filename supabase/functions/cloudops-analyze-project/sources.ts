import { AnalysisError, MAX_TEXT, sanitizeText } from './core.ts';
type Source = { kind: string; url: string | null; repository_ref: string | null };
type Imported = { text: string; revision: string | null; coverage: Record<string, unknown> };
const headers = { Accept: 'application/vnd.github+json', 'User-Agent': 'CloudOps-Project-Analysis' };

export function parseSource(source: Source): { kind: string; owner?: string; repo?: string; id?: string } {
  if (source.kind === 'text' || source.kind === 'upload') return { kind: source.kind };
  let url: URL;
  try { url = new URL(source.url ?? ''); } catch { throw new AnalysisError('Enlace inválido.'); }
  if (url.protocol !== 'https:' || url.username || url.password || url.port) throw new AnalysisError('Usa un enlace HTTPS sin credenciales ni puertos.');
  if (source.kind === 'github' && url.hostname === 'github.com') {
    const match = url.pathname.match(/^\/([\w.-]+)\/([\w.-]+?)(?:\.git)?\/?$/);
    if (!match) throw new AnalysisError('Pega la URL raíz del repositorio; indica la rama por separado.');
    return { kind: source.kind, owner: match[1], repo: match[2] };
  }
  if (source.kind === 'google_docs' && url.hostname === 'docs.google.com') {
    const match = url.pathname.match(/^\/document\/d\/([\w-]+)(?:\/|$)/);
    if (match) return { kind: source.kind, id: match[1] };
  }
  if (source.kind === 'google_drive' && url.hostname === 'drive.google.com') {
    const id = url.pathname.match(/^\/file\/d\/([\w-]+)(?:\/|$)/)?.[1] ?? (url.pathname === '/open' ? url.searchParams.get('id') : null);
    if (id && /^[\w-]+$/.test(id)) return { kind: source.kind, id };
  }
  throw new AnalysisError('Usa un documento de Google Docs, un archivo de Drive o un repositorio de GitHub válido.');
}

export async function boundedText(response: Pick<Response, 'body' | 'headers'>, limit: number): Promise<string> {
  if (Number(response.headers.get('content-length')) > limit) { await response.body?.cancel(); throw new AnalysisError('El contenido excede el tamaño permitido.', 413); }
  const reader = response.body?.getReader();
  if (!reader) throw new AnalysisError('La fuente no devolvió contenido.', 422);
  const chunks: Uint8Array[] = []; let size = 0;
  try {
    while (true) {
      const { value, done } = await reader.read(); if (done) break;
      size += value.byteLength;
      if (size > limit) throw new AnalysisError('El contenido excede el tamaño permitido.', 413);
      chunks.push(value);
    }
  } finally { await reader.cancel().catch(() => {}); reader.releaseLock(); }
  const bytes = new Uint8Array(size); let offset = 0;
  chunks.forEach(chunk => { bytes.set(chunk, offset); offset += chunk.length; });
  try { return new TextDecoder('utf-8', { fatal: true }).decode(bytes); }
  catch { throw new AnalysisError('El archivo no es texto UTF-8. Expórtalo como TXT o pega su contenido.', 422); }
}
async function githubJson(path: string, fetcher: typeof fetch) {
  const response = await fetcher('https://api.github.com' + path, { headers, redirect: 'error', signal: AbortSignal.timeout(12000) });
  if (!response.ok) throw new AnalysisError(response.status === 403 || response.status === 429
    ? 'GitHub limitó las consultas. Inténtalo más tarde o pega el texto.'
    : 'No se pudo leer GitHub. Verifica que el repositorio y la rama sean públicos y existan.', 422);
  return JSON.parse(await boundedText(response, 1500000));
}
function usablePath(path: string) {
  return !/(^|\/)(node_modules|vendor|dist|build|\.git|coverage)(\/|$)/i.test(path)
    && !/(^|\/)(\.env(?:\..*)?|.*\.(pem|key|p12|pfx)|credentials.*)$/i.test(path)
    && /(?:package-lock\.json|pnpm-lock\.yaml|yarn\.lock|poetry\.lock|Pipfile\.lock|uv\.lock|(?:\.(md|txt|json|ya?ml|tf|ts|tsx|js|jsx|py|java|go|sql|cs|toml|xml|sh)|Dockerfile))$/i.test(path);
}
export async function importSource(source: Source, suppliedText: unknown, fetcher: typeof fetch = fetch): Promise<Imported> {
  const parsed = parseSource(source);
  if (parsed.kind === 'text' || parsed.kind === 'upload') {
    if (typeof suppliedText !== 'string' || !suppliedText.trim()) throw new AnalysisError('Agrega texto para importar.');
    if (new TextEncoder().encode(suppliedText).byteLength > MAX_TEXT) throw new AnalysisError('Admite hasta 60 KB de texto UTF-8.', 413);
    if (/[\x00-\x08\x0b\x0c\x0e-\x1f]/.test(suppliedText)) throw new AnalysisError('El archivo debe contener texto legible.', 422);
    return { text: sanitizeText(suppliedText), revision: null, coverage: { kind: parsed.kind, truncated: false } };
  }
  if (parsed.kind === 'github') {
    const root = '/repos/' + encodeURIComponent(parsed.owner!) + '/' + encodeURIComponent(parsed.repo!);
    const ref = source.repository_ref?.trim();
    if (ref && ref.length > 240) throw new AnalysisError('La referencia de GitHub es demasiado larga.');
    const repo = await githubJson(root, fetcher);
    if (repo.private) throw new AnalysisError('Esta versión admite repositorios públicos.');
    const commit = await githubJson(root + '/commits/' + encodeURIComponent(ref || repo.default_branch), fetcher);
    if (!/^[a-f0-9]{40}$/.test(commit.sha) || !/^[a-f0-9]{40}$/.test(commit.commit?.tree?.sha)) throw new AnalysisError('GitHub no devolvió una revisión válida.', 502);
    const tree = await githubJson(root + '/git/trees/' + commit.commit.tree.sha + '?recursive=1', fetcher);
    if (!Array.isArray(tree.tree)) throw new AnalysisError('No se pudo leer el árbol de archivos.', 502);
    const dependencyFile = (p: string) => /(?:package-lock\.json|pnpm-lock\.yaml|yarn\.lock)$/i.test(p);
    const candidates = tree.tree.filter((f: any) => f.type === 'blob' && f.mode !== '120000' && typeof f.path === 'string' && usablePath(f.path) && f.size <= (dependencyFile(f.path) ? 48000 : 12000));
    const rank = (p: string) => /(?:^|\/)package\.json$/i.test(p) ? 0
      : /(?:^|\/)(?:package-lock\.json|pnpm-lock\.yaml|yarn\.lock|poetry\.lock|Pipfile\.lock|uv\.lock)$/i.test(p) ? 1
      : /readme|requirements|dockerfile|\.tf$|\.ya?ml$/i.test(p) ? 2 : 3;
    candidates.sort((a: any, b: any) => rank(a.path) - rank(b.path) || a.path.localeCompare(b.path));
    const selected = candidates.slice(0, 12);
    const files: string[] = []; const skipped: string[] = []; let content = '';
    // Small batches bound network concurrency; every selected path belongs to the resolved commit.
    for (let i = 0; i < selected.length; i += 4) {
      const batch = await Promise.all(selected.slice(i, i + 4).map(async (file: any) => {
        if (!/^[a-f0-9]{40}$/.test(file.sha)) throw new AnalysisError('Identificador de archivo inválido.', 502);
        const blob = await githubJson(root + '/git/blobs/' + file.sha, fetcher);
        if (blob.encoding !== 'base64' || typeof blob.content !== 'string') throw new AnalysisError('Archivo de GitHub no compatible.', 422);
        const bytes = Uint8Array.from(atob(blob.content.replace(/\s/g, '')), c => c.charCodeAt(0));
        try { return { path: file.path, text: sanitizeText(new TextDecoder('utf-8', { fatal: true }).decode(bytes)) }; }
        catch { return { path: file.path, text: '' }; }
      }));
      for (const file of batch) {
        const part = '\n--- FILE: ' + file.path + ' ---\n' + file.text + '\n';
        if (!file.text || new TextEncoder().encode(content + part).byteLength > MAX_TEXT) { skipped.push(file.path); continue; }
        content += part; files.push(file.path);
      }
    }
    if (!files.length) throw new AnalysisError('No se encontraron archivos de texto compatibles. Pega los requisitos o sube un TXT.', 422);
    return { text: content.trim(), revision: commit.sha, coverage: {
      files, skipped, selected_files: selected.length, eligible_files: candidates.length, total_tree_entries: tree.tree.length,
      truncated: Boolean(tree.truncated) || tree.tree.length > files.length,
      note: 'Muestra de hasta 12 archivos y 60 KB. Se priorizan documentación y configuración; se excluyen binarios, dependencias y archivos de secretos. No es una auditoría completa del repositorio.',
    } };
  }
  let url = parsed.kind === 'google_docs'
    ? 'https://docs.google.com/document/d/' + parsed.id + '/export?format=txt'
    : 'https://drive.google.com/uc?export=download&id=' + parsed.id;
  for (let redirects = 0; redirects < 5; redirects++) {
    const target = new URL(url);
    const allowed = ['docs.google.com', 'drive.google.com', 'drive.usercontent.google.com'];
    if (target.protocol !== 'https:' || target.username || target.password || target.port
      || !(allowed.includes(target.hostname) || target.hostname.endsWith('.googleusercontent.com')))
      throw new AnalysisError('Google requiere iniciar sesión o redirigió a un destino no permitido. Exporta como TXT o pega el contenido.', 422);
    const response = await fetcher(target.href, { redirect: 'manual', signal: AbortSignal.timeout(12000) });
    if ([301,302,303,307,308].includes(response.status)) {
      const location = response.headers.get('location'); await response.body?.cancel();
      if (!location) break;
      url = new URL(location, target).href; continue;
    }
    if (!response.ok) { await response.body?.cancel(); throw new AnalysisError('No se pudo leer Google. Usa un enlace con acceso de lectura o pega el contenido.', 422); }
    const type = response.headers.get('content-type') ?? '';
    if (/text\/html|application\/pdf|image\/|officedocument|application\/zip/.test(type)) {
      await response.body?.cancel(); throw new AnalysisError('El enlace devuelve una página de acceso o un formato no compatible. Exporta a TXT o pega el texto.', 422);
    }
    const raw = await boundedText(response, MAX_TEXT);
    if (!raw.trim() || /[\x00-\x08\x0b\x0c\x0e-\x1f]/.test(raw) || /^\s*(?:<!doctype html|<html|%PDF)/i.test(raw))
      throw new AnalysisError('La fuente no contiene texto legible. Exporta a TXT o pega su contenido.', 422);
    return { text: sanitizeText(raw), revision: null, coverage: { kind: parsed.kind, truncated: false, note: 'Texto exportado al importar; sin inspeccionar permisos ni historial del documento.' } };
  }
  throw new AnalysisError('Demasiadas redirecciones de Google. Pega el texto o usa otro enlace.', 422);
}
