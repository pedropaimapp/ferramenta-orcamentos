import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { ConsultoresManager } from './ConsultoresManager';

const criarConsultorMock = vi.fn();
const atualizarConsultorMock = vi.fn();
const desativarConsultorMock = vi.fn();
vi.mock('@/lib/consultores/actions', () => ({
  criarConsultor: (...args: unknown[]) => criarConsultorMock(...args),
  atualizarConsultor: (...args: unknown[]) => atualizarConsultorMock(...args),
  desativarConsultor: (...args: unknown[]) => desativarConsultorMock(...args),
}));

const oficinaCentro = { id: 'of-1', nome: 'Top Stop Centro', endereco: 'Rua A', telefone: '11999999999', logoUrl: null };
const oficinaNorte = { id: 'of-2', nome: 'Top Stop Norte', endereco: 'Rua B', telefone: '11888888888', logoUrl: null };

const consultorExistente = {
  id: 'c1',
  authUserId: 'a1',
  nome: 'João',
  login: 'joao@topstop.local',
  papel: 'consultor' as const,
  oficinaIds: ['of-1'],
  ativo: true,
};

describe('ConsultoresManager', () => {
  beforeEach(() => {
    criarConsultorMock.mockReset();
    atualizarConsultorMock.mockReset();
    desativarConsultorMock.mockReset();
  });

  it('mostra os nomes das oficinas vinculadas de cada consultor na listagem', () => {
    render(<ConsultoresManager consultoresIniciais={[consultorExistente]} oficinas={[oficinaCentro, oficinaNorte]} />);
    const tabela = within(screen.getByTestId('consultores-tabela'));
    const linha = tabela.getByText('João').closest('tr')!;
    expect(within(linha).getByText('Top Stop Centro')).toBeInTheDocument();
  });

  it('cria um consultor marcando mais de uma oficina', async () => {
    criarConsultorMock.mockResolvedValue({
      id: 'c2',
      authUserId: 'a2',
      nome: 'Maria',
      login: 'maria@topstop.local',
      papel: 'consultor',
      oficinaIds: ['of-1', 'of-2'],
      ativo: true,
    });
    render(<ConsultoresManager consultoresIniciais={[]} oficinas={[oficinaCentro, oficinaNorte]} />);

    fireEvent.change(screen.getByPlaceholderText('Nome'), { target: { value: 'Maria' } });
    fireEvent.change(screen.getByPlaceholderText('Login (e-mail)'), { target: { value: 'maria@topstop.local' } });
    fireEvent.change(screen.getByPlaceholderText('Senha'), { target: { value: 'segredo123' } });
    fireEvent.click(screen.getByLabelText('Top Stop Centro'));
    fireEvent.click(screen.getByLabelText('Top Stop Norte'));
    fireEvent.click(screen.getByRole('button', { name: 'Salvar' }));

    await waitFor(() =>
      expect(criarConsultorMock).toHaveBeenCalledWith({
        nome: 'Maria',
        login: 'maria@topstop.local',
        senha: 'segredo123',
        papel: 'consultor',
        oficinaIds: ['of-1', 'of-2'],
      })
    );
  });

  it('desmarcar uma oficina já selecionada a remove da lista', async () => {
    render(<ConsultoresManager consultoresIniciais={[]} oficinas={[oficinaCentro, oficinaNorte]} />);

    fireEvent.click(screen.getByLabelText('Top Stop Centro'));
    fireEvent.click(screen.getByLabelText('Top Stop Norte'));
    fireEvent.click(screen.getByLabelText('Top Stop Centro')); // desmarca de novo

    fireEvent.change(screen.getByPlaceholderText('Nome'), { target: { value: 'Zé' } });
    fireEvent.change(screen.getByPlaceholderText('Login (e-mail)'), { target: { value: 'ze@topstop.local' } });
    fireEvent.change(screen.getByPlaceholderText('Senha'), { target: { value: 'segredo123' } });
    criarConsultorMock.mockResolvedValue({ id: 'c3', authUserId: 'a3', nome: 'Zé', login: 'ze@topstop.local', papel: 'consultor', oficinaIds: ['of-2'], ativo: true });
    fireEvent.click(screen.getByRole('button', { name: 'Salvar' }));

    await waitFor(() => expect(criarConsultorMock).toHaveBeenCalledWith(expect.objectContaining({ oficinaIds: ['of-2'] })));
  });

  it('pré-carrega as oficinas do consultor ao editar e salva a nova seleção', async () => {
    atualizarConsultorMock.mockResolvedValue(undefined);
    render(<ConsultoresManager consultoresIniciais={[consultorExistente]} oficinas={[oficinaCentro, oficinaNorte]} />);

    fireEvent.click(within(screen.getByTestId('consultores-tabela')).getByRole('button', { name: 'Editar' }));

    const checkboxCentro = screen.getByLabelText('Top Stop Centro') as HTMLInputElement;
    const checkboxNorte = screen.getByLabelText('Top Stop Norte') as HTMLInputElement;
    expect(checkboxCentro.checked).toBe(true);
    expect(checkboxNorte.checked).toBe(false);

    fireEvent.click(checkboxNorte); // agora marcado em ambas

    fireEvent.click(screen.getByRole('button', { name: 'Salvar' }));

    await waitFor(() =>
      expect(atualizarConsultorMock).toHaveBeenCalledWith('c1', { nome: 'João', papel: 'consultor', oficinaIds: ['of-1', 'of-2'] })
    );
  });
});
