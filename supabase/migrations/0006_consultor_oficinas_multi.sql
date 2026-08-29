-- A consultor can now work at more than one oficina, so the 1:N
-- consultores.oficina_id column becomes an M:N join table.

create table consultor_oficinas (
  consultor_id uuid not null references consultores(id) on delete cascade,
  oficina_id uuid not null references oficinas(id) on delete cascade,
  primary key (consultor_id, oficina_id)
);

insert into consultor_oficinas (consultor_id, oficina_id)
select id, oficina_id from consultores where oficina_id is not null;

alter table consultores drop column oficina_id;

alter table consultor_oficinas enable row level security;
create policy "consultor_oficinas: vê as próprias, admin vê todas" on consultor_oficinas for select
  using (consultor_id = private.current_consultor_id() or private.is_admin());
create policy "consultor_oficinas: só admin insere" on consultor_oficinas for insert with check (private.is_admin());
create policy "consultor_oficinas: só admin remove" on consultor_oficinas for delete using (private.is_admin());
