-- Estuda+ / endurecimento para lançamento
-- Índices recomendados pelo Supabase Advisor para chaves estrangeiras usadas no app.

create index if not exists admin_audit_log_admin_id_idx on public.admin_audit_log (admin_id);
create index if not exists admin_audit_log_target_user_id_idx on public.admin_audit_log (target_user_id);
create index if not exists app_announcements_created_by_idx on public.app_announcements (created_by);
create index if not exists chat_reports_conversation_id_idx on public.chat_reports (conversation_id);
create index if not exists chat_reports_reported_user_id_idx on public.chat_reports (reported_user_id);
create index if not exists chat_reports_reporter_id_idx on public.chat_reports (reporter_id);
create index if not exists conversations_user_a_idx on public.conversations (user_a);
create index if not exists conversations_user_b_idx on public.conversations (user_b);
create index if not exists friendships_addressee_id_idx on public.friendships (addressee_id);
create index if not exists friendships_requester_id_idx on public.friendships (requester_id);
create index if not exists hotmart_webhook_events_target_user_id_idx on public.hotmart_webhook_events (target_user_id);
create index if not exists messages_sender_id_idx on public.messages (sender_id);
create index if not exists stripe_webhook_events_target_user_id_idx on public.stripe_webhook_events (target_user_id);
create index if not exists user_blocks_blocked_id_idx on public.user_blocks (blocked_id);
create index if not exists user_credit_transactions_event_id_idx on public.user_credit_transactions (event_id);
create index if not exists user_credit_transactions_user_id_idx on public.user_credit_transactions (user_id);

notify pgrst, 'reload schema';
