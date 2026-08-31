'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createBrowserClient } from '@/lib/supabase/client';

/**
 * Mantém o cliente Supabase do navegador ouvindo mudanças de sessão
 * (login, renovação de token, logout) desde cedo no ciclo de vida do app —
 * conforme a própria Supabase recomenda para evitar que o servidor receba um
 * refresh token desatualizado e devolva "Invalid Refresh Token: Refresh
 * Token Not Found", derrubando o usuário para a tela de login à toa.
 *
 * Sem efeito visual: só sincroniza o estado e, quando a sessão muda,
 * atualiza os Server Components (`router.refresh()`) para refletirem a
 * sessão corrente.
 */
export function SupabaseAuthListener() {
  const router = useRouter();

  useEffect(() => {
    const supabase = createBrowserClient();
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      // INITIAL_SESSION dispara ao montar, com a sessão que o servidor já
      // renderizou — não é uma mudança real. SIGNED_IN também não precisa
      // (a tela de login já faz router.push + router.refresh na hora de
      // logar); recarregar de novo aqui só duplicava a checagem de sessão
      // no servidor e deixava o login mais lento. O listener existe pra
      // pegar renovação de token e logout em segundo plano.
      if (event === 'INITIAL_SESSION' || event === 'SIGNED_IN') return;
      router.refresh();
    });
    return () => subscription.unsubscribe();
  }, [router]);

  return null;
}
