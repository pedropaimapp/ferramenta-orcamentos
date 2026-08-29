import { createServerClient } from '@/lib/supabase/server';
import { listarCatalogo } from '@/lib/catalogo/data';
import { CatalogoManager } from '@/components/admin/CatalogoManager';

export default async function CatalogoPage() {
  const supabase = await createServerClient();
  const itens = await listarCatalogo(supabase);
  return (
    <div>
      <h1 className="mb-4 text-lg font-semibold">Catálogo de itens</h1>
      <CatalogoManager itensIniciais={itens} />
    </div>
  );
}
