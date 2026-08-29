import { createServerClient } from '@/lib/supabase/server';
import { listarConsultores } from '@/lib/consultores/data';
import { listarOficinas } from '@/lib/oficinas/data';
import { ConsultoresManager } from '@/components/admin/ConsultoresManager';
import { PageHeader } from '@/components/ui/PageHeader';

export default async function ConsultoresPage() {
  const supabase = await createServerClient();
  const [consultores, oficinas] = await Promise.all([listarConsultores(supabase), listarOficinas(supabase)]);
  return (
    <div>
      <PageHeader title="Consultores" />
      <ConsultoresManager consultoresIniciais={consultores} oficinas={oficinas} />
    </div>
  );
}
