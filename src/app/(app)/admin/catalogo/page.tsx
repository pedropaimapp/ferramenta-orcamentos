import { createServerClient } from '@/lib/supabase/server';
import { listarCatalogo } from '@/lib/catalogo/data';
import { CatalogoManager } from '@/components/admin/CatalogoManager';
import { PageHeader } from '@/components/ui/PageHeader';

export default async function CatalogoPage() {
  const supabase = await createServerClient();
  const itens = await listarCatalogo(supabase);
  return (
    <div>
      <PageHeader title="Catálogo de itens" />
      <CatalogoManager itensIniciais={itens} />
    </div>
  );
}
