import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import LoginPage from './page';

const pushMock = vi.fn();
const refreshMock = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: pushMock, refresh: refreshMock }) }));

const signInWithPasswordMock = vi.fn();
vi.mock('@/lib/supabase/client', () => ({
  createBrowserClient: () => ({ auth: { signInWithPassword: signInWithPasswordMock } }),
}));

describe('LoginPage', () => {
  beforeEach(() => {
    pushMock.mockReset();
    signInWithPasswordMock.mockReset();
  });

  it('mostra uma mensagem genérica quando o login falha', async () => {
    signInWithPasswordMock.mockResolvedValue({ error: { message: 'Invalid login credentials' } });
    render(<LoginPage />);

    fireEvent.change(screen.getByLabelText('Login'), { target: { value: 'joao@topstop.local' } });
    fireEvent.change(screen.getByLabelText('Senha'), { target: { value: 'errada' } });
    fireEvent.click(screen.getByRole('button', { name: /entrar/i }));

    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('Login ou senha inválidos.'));
    expect(pushMock).not.toHaveBeenCalled();
  });

  it('redireciona para o dashboard quando o login dá certo', async () => {
    signInWithPasswordMock.mockResolvedValue({ error: null });
    render(<LoginPage />);

    fireEvent.change(screen.getByLabelText('Login'), { target: { value: 'joao@topstop.local' } });
    fireEvent.change(screen.getByLabelText('Senha'), { target: { value: 'correta' } });
    fireEvent.click(screen.getByRole('button', { name: /entrar/i }));

    await waitFor(() => expect(pushMock).toHaveBeenCalledWith('/dashboard'));
  });
});
