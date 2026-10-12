// @vitest-environment node
import { describe, expect, it, vi } from 'vitest';
import { sanitizeText, validateResult, generateAnalysis, buildEvidenceCatalog } from '../supabase/functions/cloudops-analyze-project/core';
import { boundedText, importSource, parseSource } from '../supabase/functions/cloudops-analyze-project/sources';

export const version = { id: '11111111-1111-4111-8111-111111111111', extracted_text: 'La aplicación necesita PostgreSQL y acceso privado.', coverage: {}, resolved_revision: null };
export function validResult() {
  return {
    summary: 'Requiere base de datos privada.', security_score: null, risk_level: 'unknown', limitations: ['Solo documentación.'],
    requirements: [{ key: 'R1', title: 'Base de datos', description: 'Persistencia', category: 'database', priority: 'must', origin: 'explicit',
      evidence_id: 'E1', confidence: 0.9 }],
    findings: [],
    recommendations: [{ service_code: 'rds', service_name: 'Amazon RDS', purpose: 'Datos', rationale: 'Requisito de PostgreSQL',
      priority: 'recommended', configuration: 'PostgreSQL en subred privada', alternatives: [], assumptions: ['Tráfico por definir'], deployment_order: 1, requirement_keys: ['R1'] }],
  };
}
describe('validación de resultados', () => {
  it('numera los servicios desde uno sin depender de números generados por Gemini', () => {
    const raw = validResult(); raw.recommendations[0].deployment_order = 0;
    raw.recommendations.push({ ...raw.recommendations[0], service_name: 'Servicio dos', deployment_order: -10 });
    expect(validateResult(raw, [version]).recommendations.map(r => r.deployment_order)).toEqual([1, 2]);
  });
  it('vincula servicios con IDs reales de requisitos y deja costos sin inventar', () => {
    const result = validateResult(validResult(), [version]);
    expect(result.recommendations[0].requirement_ids).toEqual([result.requirements[0].id]);
    expect(result.security_score).toBeNull();
    expect(result.recommendations[0]).not.toHaveProperty('estimated_monthly_min_usd');
  });
  it('rechaza referencias inventadas y servicios sin requisito', () => {
    const result = validResult(); result.requirements[0].evidence_id = 'E999';
    expect(() => validateResult(result, [version])).toThrow(/evidencia/);
    result.requirements[0].evidence_id = '22222222-2222-4222-8222-222222222222';
    expect(() => validateResult(result, [version])).toThrow(/evidencia/);
    const other = validResult(); other.recommendations[0].requirement_keys = ['R2'];
    expect(() => validateResult(other, [version])).toThrow(/sin requisitos/);
  });
  it('rechaza puntuaciones y duplicados incompatibles', () => {
    expect(() => validateResult({ ...validResult(), security_score: 100 }, [version])).toThrow(/puntuación/);
    const result = validResult(); result.requirements.push(result.requirements[0]);
    expect(() => validateResult(result, [version])).toThrow(/duplicó/);
  });
  it('elimina credenciales comunes', () => {
    const text = sanitizeText('api_key=supersecreto\nAKIAABCDEFGHIJKLMNOP\nghp_' + 'x'.repeat(30));
    expect(text).not.toContain('supersecreto'); expect(text).not.toContain('AKIA'); expect(text).not.toContain('ghp_');
  });
  it('envía fuentes y contexto a Gemini sin herramientas y valida respuesta', async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify({ candidates: [{ finishReason: 'STOP', content: { parts: [{ text: JSON.stringify(validResult()) }] } }] })));
    const result = await generateAnalysis('test-key', 'gemini-2.5-flash', { expected_users: 30 }, [version], fetcher);
    const body = JSON.parse(fetcher.mock.calls[0][1].body);
    expect(body.tools).toBeUndefined(); expect(body.contents[0].parts[0].text).toContain(version.id);
    expect(result.requirements).toHaveLength(1);
    const input = JSON.parse(body.contents[0].parts[0].text);
    expect(input.evidence_blocks[0]).toMatchObject({ evidence_id: 'E1', content: version.extracted_text });
    expect(result.requirements[0].evidence_excerpt).toBe(version.extracted_text);
  });
  it('repara una respuesta con evidencia inválida sin requerir otro clic', async () => {
    const invalid = validResult(); invalid.requirements[0].evidence_id = 'E999';
    const response = (value: unknown) => new Response(JSON.stringify({ candidates: [{ finishReason: 'STOP', content: { parts: [{ text: JSON.stringify(value) }] } }] }));
    const fetcher = vi.fn().mockResolvedValueOnce(response(invalid)).mockResolvedValueOnce(response(validResult()));
    const result = await generateAnalysis('test-key', 'gemini-2.5-flash', {}, [version], fetcher);
    expect(result.requirements).toHaveLength(1); expect(fetcher).toHaveBeenCalledTimes(2);
    expect(JSON.parse(fetcher.mock.calls[1][1].body).contents[0].parts[0].text).toContain('correction');
  });
  it('no convierte cuotas o respuestas truncadas en éxito', async () => {
    await expect(generateAnalysis('key', 'model', {}, [version], vi.fn().mockResolvedValue(new Response('{}', { status: 429 })))).rejects.toThrow(/cuota/);
    await expect(generateAnalysis('key', 'model', {}, [version], vi.fn().mockResolvedValue(new Response(JSON.stringify({ candidates: [{ finishReason: 'MAX_TOKENS' }] }))))).rejects.toThrow(/no completó/);
  });
  it('conserva validación local sin multiplicar restricciones del proveedor', async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify({ candidates: [{ finishReason: 'STOP', content: { parts: [{ text: JSON.stringify(validResult()) }] } }] })));
    await generateAnalysis('test-key', 'gemini-2.5-flash', {}, [version], fetcher);
    const schema = JSON.parse(fetcher.mock.calls[0][1].body).generationConfig.responseSchema;
    expect(JSON.stringify(schema)).not.toMatch(/maxItems|minItems|minimum|maximum/);
    const invalid = validResult(); invalid.requirements[0].confidence = 2;
    expect(() => validateResult(invalid, [version])).toThrow(/confianza/);
  });
  it('clasifica el HTTP 400 del esquema y no expone credenciales en registros', async () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      const fetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify({ error: { status: 'INVALID_ARGUMENT', message: 'Schema has too many states. secret-key-123' } }), { status: 400 }));
      await expect(generateAnalysis('secret-key-123', 'model', {}, [version], fetcher)).rejects.toThrow(/formato del informe/);
      expect(JSON.stringify(log.mock.calls)).toContain('INVALID_ARGUMENT');
      expect(JSON.stringify(log.mock.calls)).not.toContain('secret-key-123');
      expect(fetcher).toHaveBeenCalledTimes(1);
    } finally { log.mockRestore(); }
  });
  it('distingue una clave inválida de un problema en los documentos', async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify({ error: { message: 'API key not valid', status: 'INVALID_ARGUMENT' } }), { status: 400 }));
    await expect(generateAnalysis('test', 'model', {}, [version], fetcher)).rejects.toThrow(/clave de Gemini/);
  });
});
describe('evidencias copiadas desde la fuente', () => {
  it('conserva texto y Unicode sin alterar citas o partir caracteres al dividir fuentes largas', () => {
    const content = 'a'.repeat(1199) + '😀' + '\n' + 'La aplicación usa PostgreSQL.\n'.repeat(150);
    const source = { ...version, extracted_text: content };
    const blocks = buildEvidenceCatalog([source]);
    expect(blocks.map(b => b.content).join('')).toBe(content);
    for (const block of blocks) {
      expect(block.content.length).toBeLessThanOrEqual(1200);
      expect(content.includes(block.content)).toBe(true);
      expect(block.content).not.toMatch(/^[\uDC00-\uDFFF]|[\uD800-\uDBFF]$/);
    }
    expect(new Set(blocks.map(b => b.evidence_id)).size).toBe(blocks.length);
  });
  it('usa texto, fuente y ubicación del servidor aunque el modelo intente reemplazarlos', () => {
    const raw = validResult();
    Object.assign(raw.requirements[0], { evidence_excerpt: 'Cita inventada', evidence_location: 'archivo falso', source_version_id: 'ajena' });
    const saved = validateResult(raw, [version]).requirements[0];
    expect(saved.evidence_excerpt).toBe(version.extracted_text);
    expect(saved.source_version_id).toBe(version.id);
    expect(saved.evidence_location).toBe('Texto importado · líneas 1–1 · bloque E1');
  });
  it('resuelve correctamente referencias entre fuentes y rechaza un bloque ausente de la selección', () => {
    const second = { ...version, id: '22222222-2222-4222-8222-222222222222', extracted_text: 'Se requieren copias diarias.' };
    const raw = validResult(); raw.requirements[0].evidence_id = 'E2';
    const saved = validateResult(raw, [second, version]).requirements[0];
    expect(saved.source_version_id).toBe(second.id);
    expect(saved.evidence_excerpt).toBe(second.extracted_text);
    expect(buildEvidenceCatalog([second, version])).toEqual(buildEvidenceCatalog([version, second]));
    expect(() => validateResult(raw, [version])).toThrow(/evidencia/);
  });
  it('no acepta una cita libre sin referencia ni hallazgos con referencias inexistentes', () => {
    const raw: any = validResult();
    delete raw.requirements[0].evidence_id;
    raw.requirements[0].evidence_excerpt = version.extracted_text;
    expect(() => validateResult(raw, [version])).toThrow(/evidencia/);
    raw.requirements[0].evidence_id = 'E1';
    raw.findings = [{ title: 'Acceso', category: 'network', description: 'Revisar acceso', remediation: 'Configurar red', severity: 'high', confidence: 0.8, evidence_id: 'E999' }];
    expect(() => validateResult(raw, [version])).toThrow(/evidencia/);
  });
  it('rechaza fuentes vacías antes de llamar al proveedor', async () => {
    const fetcher = vi.fn();
    await expect(generateAnalysis('key', 'model', {}, [{ ...version, extracted_text: ' \n\t' }], fetcher)).rejects.toThrow(/no contienen texto/);
    expect(fetcher).not.toHaveBeenCalled();
  });
});
describe('importación segura', () => {
  it.each(['https://github.com.evil.test/a/b', 'http://github.com/a/b', 'https://user:pass@github.com/a/b', 'https://127.0.0.1/a/b', 'https://github.com:444/a/b'])('rechaza %s', url => {
    expect(() => parseSource({ kind: 'github', url, repository_ref: null })).toThrow();
  });
  it('normaliza repo raíz y reconoce documentos', () => {
    expect(parseSource({ kind: 'github', url: 'https://github.com/team/repo.git', repository_ref: null })).toMatchObject({ owner: 'team', repo: 'repo' });
    expect(parseSource({ kind: 'google_docs', url: 'https://docs.google.com/document/d/abc123/edit', repository_ref: null }).id).toBe('abc123');
  });
  it('no descarga redirecciones fuera de Google', async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response(null, { status: 302, headers: { location: 'http://169.254.169.254/latest/meta-data' } }));
    await expect(importSource({ kind: 'google_docs', url: 'https://docs.google.com/document/d/abc/edit', repository_ref: null }, undefined, fetcher)).rejects.toThrow(/destino no permitido/);
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
  it('rechaza HTML de login y binarios', async () => {
    await expect(importSource({ kind: 'google_drive', url: 'https://drive.google.com/file/d/abc/view', repository_ref: null }, undefined,
      vi.fn().mockResolvedValue(new Response('<html>Login</html>', { headers: { 'content-type': 'text/html' } })))).rejects.toThrow(/página de acceso/);
    await expect(importSource({ kind: 'text', url: null, repository_ref: null }, 'a\u0000b')).rejects.toThrow(/texto legible/);
  });
  it('limita tamaño también sin content-length', async () => {
    await expect(boundedText(new Response('x'.repeat(40)), 20)).rejects.toThrow(/tamaño/);
  });
  it('importa texto sin consultar la red y elimina secretos', async () => {
    const fetcher = vi.fn();
    const result = await importSource({ kind: 'text', url: null, repository_ref: null }, 'Necesito PostgreSQL\npassword=abc123', fetcher);
    expect(result.text).not.toContain('abc123'); expect(fetcher).not.toHaveBeenCalled();
  });
  it('resuelve commit y lee blobs sin ejecutar código ni seguir URLs del repositorio', async () => {
    const sha = 'a'.repeat(40);
    const responses = [{ default_branch: 'main' }, { sha, commit: { tree: { sha } } },
      { tree: [{ type: 'blob', mode: '100644', path: 'README.md', size: 30, sha }, { type: 'blob', mode: '100644', path: '.env', size: 30, sha }] },
      { encoding: 'base64', content: Buffer.from('La aplicación necesita PostgreSQL', 'utf8').toString('base64') }];
    const fetcher = vi.fn().mockImplementation(() => Promise.resolve(new Response(JSON.stringify(responses.shift()))));
    const result = await importSource({ kind: 'github', url: 'https://github.com/org/repo', repository_ref: 'feature/test' }, undefined, fetcher);
    expect(result.revision).toBe(sha); expect(result.coverage.files).toEqual(['README.md']);
    expect(fetcher.mock.calls[1][0]).toContain('feature%2Ftest');
    expect(fetcher.mock.calls.every(call => call[0].startsWith('https://api.github.com/'))).toBe(true);
  });
  it('incluye package.json y el lockfile para disponer de versiones reproducibles', async () => {
    const sha = 'b'.repeat(40);
    const responses = [{ default_branch: 'main' }, { sha, commit: { tree: { sha } } }, {
      tree: [
        { type: 'blob', mode: '100644', path: 'src/app.ts', size: 30, sha },
        { type: 'blob', mode: '100644', path: 'package.json', size: 30, sha },
        { type: 'blob', mode: '100644', path: 'package-lock.json', size: 30, sha },
      ],
    },
      { encoding: 'base64', content: Buffer.from('{"name":"app"}', 'utf8').toString('base64') },
      { encoding: 'base64', content: Buffer.from('{"lockfileVersion":3}', 'utf8').toString('base64') },
      { encoding: 'base64', content: Buffer.from('export const app = true;', 'utf8').toString('base64') },
    ];
    const fetcher = vi.fn().mockImplementation(() => Promise.resolve(new Response(JSON.stringify(responses.shift()))));
    const result = await importSource({ kind: 'github', url: 'https://github.com/org/repo', repository_ref: null }, undefined, fetcher);
    expect(result.coverage.files).toEqual(['package.json', 'package-lock.json', 'src/app.ts']);
    expect(result.text).toContain('--- FILE: package-lock.json ---');
  });
});
