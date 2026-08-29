// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { spawn } from 'node:child_process';
import path from 'node:path';

const scriptPath = path.join(process.cwd(), 'scripts', 'render-orcamento-pdf.mjs');

function renderViaScript(payload: unknown): Promise<{ code: number | null; stdout: Buffer; stderr: string }> {
  return new Promise((resolve, reject) => {
    const child = spawn('node', [scriptPath]);
    const stdoutChunks: Buffer[] = [];
    let stderr = '';
    child.stdout.on('data', (chunk) => stdoutChunks.push(chunk));
    child.stderr.on('data', (chunk) => (stderr += chunk.toString()));
    child.on('error', reject);
    child.on('close', (code) => resolve({ code, stdout: Buffer.concat(stdoutChunks), stderr }));
    child.stdin.end(JSON.stringify(payload));
  });
}

describe('scripts/render-orcamento-pdf.mjs', () => {
  // Regression test for the "Minified React error #31" bug: @react-pdf/renderer
  // rendered fine under Vitest and under an isolated call, but failed every time
  // through Next's actual App Router route handler, because Next bundles route
  // handlers against its own internal React copy. This test exercises the exact
  // script the route handler shells out to, in the same way the route calls it
  // (JSON over stdin, PDF bytes over stdout) — so a regression here is caught
  // without needing a running Next server.
  it('gera um PDF válido a partir de um payload JSON via stdin', async () => {
    const { code, stdout, stderr } = await renderViaScript({
      oficina: { id: 'of1', nome: 'Top Stop Centro', endereco: 'Rua A', telefone: '11999999999', logoUrl: null },
      consultorNome: 'João',
      orcamento: {
        id: 'o1',
        clienteNome: 'Maria',
        clienteTelefone: '5511987654321',
        veiculoPlaca: 'ABC1D23',
        veiculoModelo: 'Onix',
        consultorId: 'c1',
        oficinaId: 'of1',
        status: 'rascunho',
        validadeDias: 7,
        createdAt: '2026-08-28T00:00:00Z',
        updatedAt: '2026-08-28T00:00:00Z',
      },
      itens: [
        { id: 'i1', orcamentoId: 'o1', catalogoItemId: null, descricao: 'Troca de óleo', tipo: 'servico', quantidade: 1, valorUnitarioCentavos: 10000 },
      ],
      totalCentavos: 10000,
      entradaCentavos: 3000,
      parcelas: [7000],
      desconto: { descontoCentavos: 500, valorComDescontoCentavos: 9500 },
      cartaoPorto: { parcelas: 1, valorParcelaCentavos: 10000 },
    });

    expect(stderr).toBe('');
    expect(code).toBe(0);
    expect(stdout.subarray(0, 4).toString()).toBe('%PDF');
  }, 15000);

  it('reporta erro em JSON no stderr e sai com código != 0 para payload inválido', async () => {
    const { code, stderr } = await renderViaScript({ orcamento: {} });
    expect(code).not.toBe(0);
    expect(() => JSON.parse(stderr)).not.toThrow();
    expect(JSON.parse(stderr)).toHaveProperty('erro');
  }, 15000);
});
