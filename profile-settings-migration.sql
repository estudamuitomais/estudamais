-- Estuda+ — permite que contas antigas incluam seu próprio WhatsApp no Perfil.
-- Execute uma vez no SQL Editor do Supabase.
begin;

alter table public.user_contacts enable row level security;

drop policy if exists "Usuario insere o proprio contato" on public.user_contacts;
create policy "Usuario insere o proprio contato"
on public.user_contacts for insert to authenticated
with check ((select auth.uid()) = user_id);

grant select on public.user_contacts to authenticated;
grant insert (user_id, whatsapp_phone, whatsapp_opt_in, whatsapp_consent_at, updated_at)
on public.user_contacts to authenticated;
grant update (whatsapp_phone, whatsapp_opt_in, whatsapp_consent_at, updated_at)
on public.user_contacts to authenticated;

commit;

-- LOGIN ADMINISTRATIVO
-- No Supabase > Authentication > Users, use o e-mail admin@estudemais.net
-- na conta administrativa. A senha deve ser definida no Supabase e poderá ser alterada
-- depois pelo Perfil; nenhuma senha fica gravada nos arquivos do site.
