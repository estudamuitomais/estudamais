(() => {
  'use strict';

  const byId = (id) => document.getElementById(id);
  const safe = (value) => String(value ?? '').replace(/[&<>'"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[char]);
  const yearLabels = { '1EF': '1º ano EF', '2EF': '2º ano EF', '3EF': '3º ano EF', '4EF': '4º ano EF', '5EF': '5º ano EF', '6EF': '6º ano EF', '7EF': '7º ano EF', '8EF': '8º ano EF', '9EF': '9º ano EF', '1EM': '1ª série EM', '2EM': '2ª série EM', '3EM': '3ª série EM' };
  const dateLabel = (value) => value ? new Date(value).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—';

  function create(options) {
    const supabase = options.supabase;
    let user = null;
    let isAdmin = false;
    let summary = {};
    let users = [];
    let reports = [];
    let announcements = [];
    let auditRows = [];
    let selectedUser = null;
    let page = 0;
    const pageSize = 50;

    const notice = (message = '', error = false) => {
      const target = byId('admin-notice'); if (!target) return;
      target.textContent = message; target.classList.toggle('error', error); target.hidden = !message;
    };
    const friendlyError = (error) => {
      const raw = `${error?.message || error || ''}`;
      if (/ADMIN_REQUIRED/i.test(raw)) return 'Sua conta não possui permissão administrativa.';
      if (/CANNOT_SUSPEND_SELF/i.test(raw)) return 'O administrador não pode suspender a própria conta.';
      if (/WHATSAPP_NOT_AUTHORIZED/i.test(raw)) return 'Este usuário não autorizou o recebimento de novidades pelo WhatsApp.';
      if (/INVALID_ANNOUNCEMENT/i.test(raw)) return 'Preencha o título e a mensagem do aviso.';
      if (/relation .* does not exist|column .* does not exist|schema cache/i.test(raw)) return 'A estrutura administrativa ainda precisa ser ativada no Supabase.';
      return 'Não foi possível concluir a ação. Tente novamente.';
    };

    async function loadPublicAnnouncement() {
      if (!user || !supabase) return;
      const { data, error } = await supabase.from('app_announcements').select('id, title, body, updated_at').eq('published', true).order('updated_at', { ascending: false }).limit(1).maybeSingle();
      const banner = byId('app-announcement');
      if (!banner) return;
      if (error || !data || localStorage.getItem(`estuda-announcement-dismissed-${data.id}`)) { banner.hidden = true; return; }
      banner.dataset.announcementId = data.id;
      byId('app-announcement-title').textContent = data.title;
      byId('app-announcement-body').textContent = data.body;
      banner.hidden = false;
    }

    async function fetchUsers({ append = false } = {}) {
      const from = append ? page * pageSize : 0;
      const { data, error } = await supabase.from('profiles').select('id, name, school_year, points, created_at, updated_at, guardian_chat_enabled, account_status, admin_note, is_admin').order('created_at', { ascending: false }).range(from, from + pageSize - 1);
      if (error) throw error;
      const profileRows = data || [];
      const ids = profileRows.map((item) => item.id);
      let contacts = [];
      if (ids.length) {
        const contactResult = await supabase.from('user_contacts').select('user_id, whatsapp_phone, whatsapp_opt_in, whatsapp_consent_at').in('user_id', ids);
        if (contactResult.error) throw contactResult.error;
        contacts = contactResult.data || [];
      }
      const contactMap = new Map(contacts.map((item) => [item.user_id, item]));
      const enrichedRows = profileRows.map((item) => ({ ...item, ...(contactMap.get(item.id) || {}) }));
      users = append ? [...users, ...enrichedRows] : enrichedRows;
      if (!append) page = 1; else page += 1;
      byId('admin-load-more').hidden = (data || []).length < pageSize;
      renderUsers();
    }

    async function loadAdminData() {
      if (!isAdmin) { notice('Acesso administrativo não autorizado.', true); return false; }
      notice('Atualizando o painel…');
      try {
        const [summaryResult, reportsResult, announcementsResult, auditResult] = await Promise.all([
          supabase.rpc('admin_dashboard_summary'),
          supabase.from('chat_reports').select('id, reporter_id, reported_user_id, reason, status, created_at').order('created_at', { ascending: false }).limit(100),
          supabase.from('app_announcements').select('id, title, body, published, created_at, updated_at').order('updated_at', { ascending: false }).limit(50),
          supabase.from('admin_audit_log').select('id, admin_id, action, target_user_id, details, created_at').order('created_at', { ascending: false }).limit(80)
        ]);
        const firstError = summaryResult.error || reportsResult.error || announcementsResult.error || auditResult.error;
        if (firstError) throw firstError;
        summary = summaryResult.data || {};
        reports = reportsResult.data || [];
        announcements = announcementsResult.data || [];
        auditRows = auditResult.data || [];
        page = 0;
        await fetchUsers();
        renderSummary(); renderReports(); renderAnnouncements(); renderInsights(); renderAudit();
        notice('');
        return true;
      } catch (error) {
        console.warn('Administração indisponível:', error);
        notice(friendlyError(error), true);
        return false;
      }
    }

    function renderSummary() {
      byId('admin-total-users').textContent = summary.total_users || 0;
      byId('admin-active-users').textContent = summary.active_last_7_days || 0;
      byId('admin-chat-users').textContent = summary.chat_enabled || 0;
      byId('admin-open-reports').textContent = summary.open_reports || 0;
    }

    function filteredUsers() {
      const term = byId('admin-user-search').value.trim().toLocaleLowerCase('pt-BR');
      const status = byId('admin-user-status').value;
      return users.filter((item) => (!term || (item.name || '').toLocaleLowerCase('pt-BR').includes(term)) && (status === 'all' || item.account_status === status));
    }

    function renderUsers() {
      const list = byId('admin-users-list'); if (!list) return;
      list.innerHTML = '';
      const items = filteredUsers();
      if (!items.length) list.innerHTML = '<tr><td colspan="6" class="admin-empty">Nenhum usuário encontrado.</td></tr>';
      items.forEach((item) => {
        const row = document.createElement('tr');
        row.innerHTML = `<td><div class="admin-user-name"><span>${safe((item.name || 'E').slice(0, 1).toUpperCase())}</span><div><strong>${safe(item.name || 'Estudante')}</strong><small>${item.is_admin ? 'Administrador' : 'Estudante'}</small></div></div></td><td>${safe(yearLabels[item.school_year] || item.school_year || '—')}</td><td><b>${Number(item.points) || 0}</b></td><td>${dateLabel(item.updated_at)}</td><td><span class="admin-status ${item.account_status}">${item.account_status === 'suspended' ? 'Suspenso' : 'Ativo'}</span></td><td><button type="button" data-manage-user>Gerenciar</button></td>`;
        row.querySelector('[data-manage-user]').addEventListener('click', () => openUser(item));
        list.append(row);
      });
    }

    function openUser(item) {
      selectedUser = item;
      byId('admin-user-name').textContent = item.name || 'Estudante';
      byId('admin-user-summary').textContent = `${yearLabels[item.school_year] || item.school_year || 'Ano não informado'} · ${Number(item.points) || 0} pontos · cadastro em ${dateLabel(item.created_at)}`;
      byId('admin-user-note').value = item.admin_note || '';
      byId('admin-toggle-user-status').textContent = item.account_status === 'suspended' ? 'Reativar conta' : 'Suspender conta';
      byId('admin-toggle-user-status').classList.toggle('danger', item.account_status !== 'suspended');
      byId('admin-toggle-user-chat').textContent = item.guardian_chat_enabled ? 'Desativar chat' : 'Liberar chat';
      const phone = item.whatsapp_phone || '';
      byId('admin-user-whatsapp').textContent = phone ? phone.replace(/^(\+55)(\d{2})(\d{4,5})(\d{4})$/, '$1 ($2) $3-$4') : 'Não informado';
      byId('admin-user-whatsapp-consent').textContent = item.whatsapp_opt_in ? 'Autorizou receber atualizações do Estuda+.' : 'Sem autorização para receber novidades.';
      byId('admin-whatsapp-message').value = `Olá, ${item.name || 'estudante'}! Temos uma novidade importante no Estuda+: `;
      byId('admin-open-whatsapp').disabled = !phone || !item.whatsapp_opt_in;
      byId('admin-user-modal').hidden = false;
      options.onModalChange?.();
      setTimeout(() => byId('admin-user-note').focus(), 0);
    }

    function closeUser() {
      byId('admin-user-modal').hidden = true; selectedUser = null; options.onModalChange?.();
    }

    async function updateUser(action, value) {
      if (!selectedUser) return;
      notice('Salvando alteração…');
      try {
        const { error } = await supabase.rpc('admin_update_user', { p_target_user_id: selectedUser.id, p_action: action, p_value: String(value) });
        if (error) throw error;
        if (action === 'status') selectedUser.account_status = value;
        if (action === 'chat') selectedUser.guardian_chat_enabled = value === true || value === 'true';
        if (action === 'note') selectedUser.admin_note = value;
        closeUser(); await loadAdminData(); notice('Alteração administrativa registrada.');
      } catch (error) { notice(friendlyError(error), true); }
    }

    function openWhatsApp() {
      if (!selectedUser?.whatsapp_phone || !selectedUser.whatsapp_opt_in) { notice('O usuário não possui WhatsApp autorizado para novidades.', true); return; }
      const message = byId('admin-whatsapp-message').value.trim();
      if (message.length < 5) { notice('Escreva a mensagem que será enviada.', true); byId('admin-whatsapp-message').focus(); return; }
      const digits = selectedUser.whatsapp_phone.replace(/\D/g, '');
      window.open(`https://wa.me/${digits}?text=${encodeURIComponent(message)}`, '_blank', 'noopener,noreferrer');
      void supabase.rpc('admin_log_whatsapp_contact', { p_target_user_id: selectedUser.id }).then(({ error }) => {
        if (error) notice(friendlyError(error), true); else notice('Conversa aberta no WhatsApp. Confirme o envio da mensagem por lá.');
      });
    }

    async function loadReportNames() {
      const ids = [...new Set(reports.flatMap((item) => [item.reporter_id, item.reported_user_id]).filter(Boolean))];
      if (!ids.length) return new Map();
      const { data } = await supabase.from('profiles').select('id, name').in('id', ids);
      return new Map((data || []).map((item) => [item.id, item.name || 'Estudante']));
    }

    async function renderReports() {
      const list = byId('admin-reports-list'); if (!list) return;
      const names = await loadReportNames();
      list.innerHTML = '';
      if (!reports.length) list.innerHTML = '<div class="admin-empty">Nenhuma denúncia registrada.</div>';
      reports.forEach((item) => {
        const row = document.createElement('article');
        row.className = `admin-report ${item.status}`;
        row.innerHTML = `<div><span>${safe(item.status === 'open' ? 'ABERTA' : item.status === 'reviewing' ? 'EM ANÁLISE' : 'ENCERRADA')}</span><strong>${safe(names.get(item.reported_user_id) || 'Usuário reportado')}</strong><p>${safe(item.reason)}</p><small>Enviada por ${safe(names.get(item.reporter_id) || 'usuário')} em ${dateLabel(item.created_at)}</small></div><select aria-label="Status da denúncia"><option value="open">Aberta</option><option value="reviewing">Em análise</option><option value="closed">Encerrada</option></select>`;
        const select = row.querySelector('select'); select.value = item.status;
        select.addEventListener('change', async () => {
          const { error } = await supabase.rpc('admin_update_report', { p_report_id: item.id, p_status: select.value });
          if (error) { notice(friendlyError(error), true); select.value = item.status; return; }
          await loadAdminData(); notice('Status da denúncia atualizado.');
        });
        list.append(row);
      });
    }

    function renderAnnouncements() {
      const list = byId('admin-announcements-list'); if (!list) return;
      list.innerHTML = '';
      if (!announcements.length) list.innerHTML = '<div class="admin-empty">Nenhum aviso criado.</div>';
      announcements.forEach((item) => {
        const row = document.createElement('article');
        row.className = 'admin-announcement-row';
        row.innerHTML = `<div><span>${item.published ? 'PUBLICADO' : 'RASCUNHO'}</span><strong>${safe(item.title)}</strong><p>${safe(item.body)}</p><small>Atualizado em ${dateLabel(item.updated_at)}</small></div><div><button type="button" data-edit>Editar</button><button type="button" data-delete>Excluir</button></div>`;
        row.querySelector('[data-edit]').addEventListener('click', () => editAnnouncement(item));
        row.querySelector('[data-delete]').addEventListener('click', (event) => deleteAnnouncement(item, event.currentTarget));
        list.append(row);
      });
    }

    function editAnnouncement(item) {
      byId('admin-announcement-id').value = item.id;
      byId('admin-announcement-title').value = item.title;
      byId('admin-announcement-body').value = item.body;
      byId('admin-announcement-published').checked = item.published;
      byId('admin-cancel-announcement').hidden = false;
      byId('admin-announcement-title').focus();
    }
    function clearAnnouncementForm() {
      byId('admin-announcement-form').reset(); byId('admin-announcement-id').value = ''; byId('admin-cancel-announcement').hidden = true;
    }
    async function saveAnnouncement(event) {
      event.preventDefault();
      const id = byId('admin-announcement-id').value || null;
      const title = byId('admin-announcement-title').value.trim();
      const body = byId('admin-announcement-body').value.trim();
      const published = byId('admin-announcement-published').checked;
      notice('Salvando aviso…');
      const { error } = await supabase.rpc('admin_save_announcement', { p_id: id, p_title: title, p_body: body, p_published: published });
      if (error) { notice(friendlyError(error), true); return; }
      clearAnnouncementForm(); await loadAdminData(); await loadPublicAnnouncement(); notice('Aviso salvo com sucesso.');
    }
    async function deleteAnnouncement(item, button) {
      if (button?.dataset.confirm !== 'true') { if (button) { button.dataset.confirm = 'true'; button.textContent = 'Confirmar'; setTimeout(() => { button.dataset.confirm = ''; button.textContent = 'Excluir'; }, 5000); } return; }
      const { error } = await supabase.rpc('admin_delete_announcement', { p_id: item.id });
      if (error) { notice(friendlyError(error), true); return; }
      await loadAdminData(); await loadPublicAnnouncement(); notice('Aviso excluído.');
    }

    function renderInsights() {
      const box = byId('admin-learning-insights'); if (!box) return;
      const items = Array.isArray(summary.top_errors) ? summary.top_errors : [];
      box.innerHTML = '';
      if (!items.length) box.innerHTML = '<div class="admin-empty">Ainda não há erros suficientes para gerar recomendações.</div>';
      const max = Math.max(...items.map((item) => Number(item.errors) || 0), 1);
      items.forEach((item) => {
        const row = document.createElement('article'); row.innerHTML = `<div><strong>${safe(item.topic)}</strong><span>${Number(item.errors) || 0} erros registrados</span></div><i><b style="width:${Math.round(((Number(item.errors) || 0) / max) * 100)}%"></b></i>`; box.append(row);
      });
    }

    function renderAudit() {
      const list = byId('admin-audit-list'); if (!list) return;
      list.innerHTML = '';
      if (!auditRows.length) list.innerHTML = '<div class="admin-empty">Nenhuma ação administrativa registrada.</div>';
      const labels = { user_status: 'Alterou status de conta', user_chat: 'Alterou permissão de chat', user_note: 'Atualizou observação', report_status: 'Atualizou denúncia', announcement_saved: 'Salvou aviso', announcement_deleted: 'Excluiu aviso', whatsapp_contact_opened: 'Abriu contato autorizado no WhatsApp' };
      auditRows.forEach((item) => { const row = document.createElement('article'); row.innerHTML = `<span>✓</span><div><strong>${safe(labels[item.action] || item.action)}</strong><small>${dateLabel(item.created_at)} · registro #${item.id}</small></div>`; list.append(row); });
    }

    function selectTab(tab) {
      document.querySelectorAll('[data-admin-tab]').forEach((button) => button.classList.toggle('active', button.dataset.adminTab === tab));
      document.querySelectorAll('[data-admin-panel]').forEach((panel) => { const active = panel.dataset.adminPanel === tab; panel.hidden = !active; panel.classList.toggle('active', active); });
    }

    function bindEvents() {
      byId('dismiss-announcement')?.addEventListener('click', () => { const banner = byId('app-announcement'); if (banner.dataset.announcementId) localStorage.setItem(`estuda-announcement-dismissed-${banner.dataset.announcementId}`, '1'); banner.hidden = true; });
      byId('refresh-admin')?.addEventListener('click', loadAdminData);
      byId('admin-user-search')?.addEventListener('input', renderUsers);
      byId('admin-user-status')?.addEventListener('change', renderUsers);
      byId('admin-load-more')?.addEventListener('click', () => fetchUsers({ append: true }));
      byId('close-admin-user')?.addEventListener('click', closeUser);
      byId('admin-user-modal')?.addEventListener('click', (event) => { if (event.target === byId('admin-user-modal')) closeUser(); });
      byId('admin-toggle-user-status')?.addEventListener('click', () => updateUser('status', selectedUser?.account_status === 'suspended' ? 'active' : 'suspended'));
      byId('admin-toggle-user-chat')?.addEventListener('click', () => updateUser('chat', !selectedUser?.guardian_chat_enabled));
      byId('admin-save-user-note')?.addEventListener('click', () => updateUser('note', byId('admin-user-note').value.trim()));
      byId('admin-open-whatsapp')?.addEventListener('click', openWhatsApp);
      byId('admin-announcement-form')?.addEventListener('submit', saveAnnouncement);
      byId('admin-cancel-announcement')?.addEventListener('click', clearAnnouncementForm);
      byId('admin-tabs')?.addEventListener('click', (event) => { const button = event.target.closest('[data-admin-tab]'); if (button) selectTab(button.dataset.adminTab); });
    }
    bindEvents();

    return {
      async init(nextUser, adminAllowed) { user = nextUser; isAdmin = Boolean(adminAllowed); await loadPublicAnnouncement(); },
      async open() { return loadAdminData(); },
      isUserModalOpen() { return !byId('admin-user-modal')?.hidden; },
      closeUser,
      stop() { user = null; isAdmin = false; users = []; reports = []; announcements = []; auditRows = []; byId('app-announcement').hidden = true; closeUser(); }
    };
  }

  window.EstudaAdmin = { create };
})();
