// Run with: npm run codegen:test
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { mkdtemp, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { after, before, describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';
import { GENERATED_MARKER } from './codegen.mjs';

const SCRIPT = fileURLToPath(new URL('./codegen.mjs', import.meta.url));

/** Same shape as Swashbuckle's output for this API: a Result<T> envelope, string enums, nullable fields. */
const DOCUMENT = {
  openapi: '3.0.4',
  info: { title: 'Fixture', version: 'v1' },
  paths: {
    '/v1/students/{id}': {
      get: {
        tags: ['Student'],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: {
          200: {
            description: 'OK',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/StudentResponseResult' } } },
          },
        },
      },
    },
  },
  components: {
    schemas: {
      StudentStatus: { enum: ['ACTIVE', 'SUSPENDED', 'GRADUATED'], type: 'string' },
      StudentResponse: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          fullName: { type: 'string', nullable: true },
          status: { $ref: '#/components/schemas/StudentStatus' },
        },
        additionalProperties: false,
      },
      StudentResponseResult: {
        type: 'object',
        properties: {
          messages: { type: 'array', items: { type: 'string' }, nullable: true },
          status: { type: 'boolean' },
          data: { $ref: '#/components/schemas/StudentResponse' },
        },
        additionalProperties: false,
      },
    },
  },
};

let dir;
let server;
let baseUrl;
const responses = new Map();

function runCodegen(args) {
  return new Promise((resolve) => {
    execFile(process.execPath, [SCRIPT, ...args], { cwd: dir }, (error, stdout, stderr) => {
      resolve({ code: error ? (error.code ?? 1) : 0, stdout, stderr });
    });
  });
}

async function writeJson(name, value) {
  const file = path.join(dir, name);
  await writeFile(file, typeof value === 'string' ? value : JSON.stringify(value), 'utf8');
  return file;
}

async function exists(file) {
  return stat(file).then(() => true, () => false);
}

before(async () => {
  dir = await mkdtemp(path.join(os.tmpdir(), 'codegen-test-'));
  server = createServer((request, response) => {
    const { status, type, body } = responses.get(request.url) ?? { status: 404, type: 'text/plain', body: 'Not Found' };
    response.writeHead(status, { 'content-type': type });
    response.end(body);
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
  responses.set('/swagger/v1/swagger.json', { status: 200, type: 'application/json', body: JSON.stringify(DOCUMENT) });
  responses.set('/swagger/index.html', { status: 200, type: 'text/html', body: '<!DOCTYPE html><html>Swagger UI</html>' });
  responses.set('/broken', { status: 500, type: 'text/plain', body: 'boom' });
});

after(async () => {
  await new Promise((resolve) => server.close(resolve));
  await rm(dir, { recursive: true, force: true });
});

describe('codegen', () => {
  it('generates the same compilable file from a local file and from the backend URL', async () => {
    const input = await writeJson('swagger.json', DOCUMENT);
    const fromFile = path.join(dir, 'from-file.ts');
    const fromUrl = path.join(dir, 'from-url.ts');

    const first = await runCodegen(['--input', input, '--output', fromFile]);
    assert.equal(first.code, 0, first.stderr);
    const second = await runCodegen(['--input', `${baseUrl}/swagger/v1/swagger.json`, '--output', fromUrl]);
    assert.equal(second.code, 0, second.stderr);

    const generated = await readFile(fromFile, 'utf8');
    assert.equal(await readFile(fromUrl, 'utf8'), generated);
    assert.ok(generated.startsWith(`${GENERATED_MARKER}\n`));
    assert.match(generated, /^export interface paths \{/m);
    assert.match(generated, /StudentStatus: "ACTIVE" \| "SUSPENDED" \| "GRADUATED";/);
    assert.doesNotMatch(generated, /\r|\d{4}-\d{2}-\d{2}T/, 'output must not depend on line endings or the time of generation');

    const usage = path.join(dir, 'usage.ts');
    await writeFile(
      usage,
      [
        "import type { components, paths } from './from-file';",
        "type Student = components['schemas']['StudentResponse'];",
        "type Envelope = paths['/v1/students/{id}']['get']['responses'][200]['content']['application/json'];",
        "export const student: Student = { id: '1', fullName: null, status: 'ACTIVE' };",
        'export const envelope: Envelope = { status: true, messages: null, data: student };',
        '',
      ].join('\n'),
    );
    const program = ts.createProgram([usage], {
      strict: true,
      noEmit: true,
      target: ts.ScriptTarget.ES2023,
      module: ts.ModuleKind.ESNext,
      moduleResolution: ts.ModuleResolutionKind.Bundler,
      verbatimModuleSyntax: true,
      noUnusedLocals: true,
      skipLibCheck: false,
    });
    const diagnostics = ts.getPreEmitDiagnostics(program).map((d) => ts.flattenDiagnosticMessageText(d.messageText, '\n'));
    assert.deepEqual(diagnostics, []);
  });

  it('produces the same file when the backend lists paths and schemas in a different order', async () => {
    const reordered = structuredClone(DOCUMENT);
    reordered.paths = { '/': { get: { responses: { 200: { description: 'OK' } } } }, ...reordered.paths };
    const swapped = structuredClone(reordered);
    swapped.paths = Object.fromEntries(Object.entries(swapped.paths).reverse());
    swapped.components.schemas = Object.fromEntries(Object.entries(swapped.components.schemas).reverse());

    const first = path.join(dir, 'order-a.ts');
    const second = path.join(dir, 'order-b.ts');
    assert.equal((await runCodegen(['--input', await writeJson('order-a.json', reordered), '--output', first])).code, 0);
    assert.equal((await runCodegen(['--input', await writeJson('order-b.json', swapped), '--output', second])).code, 0);
    assert.equal(await readFile(second, 'utf8'), await readFile(first, 'utf8'));
  });

  it('does not rewrite an up-to-date file and --check detects drift', async () => {
    const input = await writeJson('check.json', DOCUMENT);
    const output = path.join(dir, 'check.ts');
    assert.equal((await runCodegen(['--input', input, '--output', output])).code, 0);
    const firstWrite = (await stat(output)).mtimeMs;

    const again = await runCodegen(['--input', input, '--output', output]);
    assert.equal(again.code, 0);
    assert.match(again.stdout, /already up to date/);
    assert.equal((await stat(output)).mtimeMs, firstWrite);

    assert.equal((await runCodegen(['--input', input, '--output', output, '--check'])).code, 0);
    const changed = structuredClone(DOCUMENT);
    changed.components.schemas.StudentResponse.properties.email = { type: 'string' };
    const drift = await runCodegen(['--input', await writeJson('changed.json', changed), '--output', output, '--check']);
    assert.equal(drift.code, 1);
    assert.match(drift.stderr, /out of date/);
  });

  it('explains how to start the backend when it is unreachable', async () => {
    const probe = createServer();
    await new Promise((resolve) => probe.listen(0, '127.0.0.1', resolve));
    const closedPort = probe.address().port;
    await new Promise((resolve) => probe.close(resolve));

    const output = path.join(dir, 'unreachable.ts');
    const result = await runCodegen(['--input', `http://127.0.0.1:${closedPort}/swagger/v1/swagger.json`, '--output', output]);
    assert.equal(result.code, 1);
    assert.match(result.stderr, /Could not reach the backend/);
    assert.match(result.stderr, /dotnet run --project \S+\.Api/);
    assert.equal(await exists(output), false);
  });

  const rejected = [
    ['a 404 from the backend', () => `${baseUrl}/swagger/v2/swagger.json`, /HTTP 404.*Development/],
    ['a server error', () => `${baseUrl}/broken`, /HTTP 500/],
    ['the Swagger UI page instead of the JSON', () => `${baseUrl}/swagger/index.html`, /not valid JSON/],
    ['a missing file', () => path.join(dir, 'missing.json'), /OpenAPI file not found/],
    ['a Swagger 2.0 document', () => writeJson('v2.json', { swagger: '2.0', paths: { '/a': {} } }), /not an OpenAPI 3\.0\/3\.1 document/],
    ['a document without paths', () => writeJson('empty.json', { ...DOCUMENT, paths: {} }), /refusing to generate empty types/],
    [
      'a document with an unresolvable $ref',
      () => {
        const broken = structuredClone(DOCUMENT);
        broken.components.schemas.StudentResponse.properties.status = { $ref: '#/components/schemas/Missing' };
        return writeJson('broken-ref.json', broken);
      },
      /not a valid OpenAPI document/,
    ],
  ];

  for (const [name, input, message] of rejected) {
    it(`fails without writing anything for ${name}`, async () => {
      const output = path.join(dir, `rejected-${name.replace(/\W+/g, '-')}.ts`);
      const result = await runCodegen(['--input', await input(), '--output', output]);
      assert.equal(result.code, 1, result.stdout);
      assert.match(result.stderr, message);
      assert.equal(await exists(output), false);
    });
  }

  it('refuses to overwrite a file it did not generate', async () => {
    const output = path.join(dir, 'handwritten.ts');
    await writeFile(output, 'export type Mine = string;\n');
    const result = await runCodegen(['--input', await writeJson('own.json', DOCUMENT), '--output', output]);
    assert.equal(result.code, 1);
    assert.match(result.stderr, /was not created by codegen; refusing to overwrite/);
    assert.equal(await readFile(output, 'utf8'), 'export type Mine = string;\n');
  });

  it('rejects unknown options', async () => {
    const result = await runCodegen(['--url', 'http://localhost']);
    assert.equal(result.code, 1);
    assert.match(result.stderr, /Usage: npm run codegen/);
  });
});
