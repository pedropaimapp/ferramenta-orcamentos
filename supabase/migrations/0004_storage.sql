insert into storage.buckets (id, name, public)
values ('logos', 'logos', true)
on conflict (id) do nothing;

create policy "logos: leitura pública" on storage.objects for select using (bucket_id = 'logos');
create policy "logos: só admin envia" on storage.objects for insert with check (bucket_id = 'logos' and is_admin());
create policy "logos: só admin atualiza" on storage.objects for update using (bucket_id = 'logos' and is_admin());
