(() => {
  'use strict';

  const byId = (id) => document.getElementById(id);
  const safe = (value) => String(value ?? '').replace(/[&<>'"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[char]);
  const relativeTime = (value) => {
    const seconds = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 1000));
    if (seconds < 60) return 'agora';
    if (seconds < 3600) return `${Math.floor(seconds / 60)} min`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)} h`;
    return new Date(value).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
  };

  function create(options) {
    const supabase = options.supabase;
    let user = null;
    let ownProfile = null;
    let friendships = [];
    let profiles = new Map();
    let presence = new Map();
    let conversations = new Map();
    let unreadByConversation = new Map();
    let activeFriend = null;
    let activeConversationId = null;
    let questionDraft = null;
    let realtimeChannel = null;
    let heartbeatTimer = null;
    let guardianConfirmTimer = null;
    let busy = false;

    const notice = (message = '', error = false) => {
      const target = byId('friends-notice');
      if (!target) return;
      target.textContent = message;
      target.classList.toggle('error', error);
      target.hidden = !message;
    };

    const chatStatus = (message = '', error = false) => {
      const target = byId('chat-status');
      if (!target) return;
      target.textContent = message;
      target.classList.toggle('error', error);
    };

    const friendlyError = (error) => {
      const raw = `${error?.message || error || ''}`;
      if (/FRIEND_CODE_NOT_FOUND/i.test(raw)) return 'Código não encontrado. Confira os oito caracteres.';
      if (/CANNOT_ADD_SELF/i.test(raw)) return 'Esse é o seu próprio código.';
      if (/ALREADY_FRIENDS/i.test(raw)) return 'Essa pessoa já está na sua lista de amigos.';
      if (/REQUEST_ALREADY_EXISTS/i.test(raw)) return 'Já existe um convite entre vocês.';
      if (/CONVERSATION_BLOCKED/i.test(raw)) return 'Esta conversa está bloqueada.';
      if (/FRIENDSHIP_REQUIRED/i.test(raw)) return 'A amizade precisa estar aprovada antes da conversa.';
      if (/relation .* does not exist|column .* does not exist|schema cache/i.test(raw)) return 'A área de amigos ainda precisa ser ativada no banco de dados.';
      return 'Não foi possível concluir agora. Confira a conexão e tente novamente.';
    };

    const friendshipOtherId = (row) => row.requester_id === user?.id ? row.addressee_id : row.requester_id;
    const acceptedFriends = () => friendships.filter((row) => row.status === 'accepted').map((row) => ({ ...row, userId: friendshipOtherId(row), profile: profiles.get(friendshipOtherId(row)) })).filter((item) => item.profile);
    const pendingRequests = () => friendships.filter((row) => row.status === 'pending' && row.addressee_id === user?.id).map((row) => ({ ...row, userId: row.requester_id, profile: profiles.get(row.requester_id) })).filter((item) => item.profile);
    const isOnline = (userId) => {
      const item = presence.get(userId);
      return Boolean(item?.online && Date.now() - new Date(item.last_seen).getTime() < 120000);
    };
    const friendConversation = (userId) => [...conversations.values()].find((row) => row.user_a === userId || row.user_b === userId);
    const unreadForFriend = (userId) => unreadByConversation.get(friendConversation(userId)?.id) || 0;

    function updateBadges() {
      const total = pendingRequests().length + [...unreadByConversation.values()].reduce((sum, value) => sum + value, 0);
      ['nav-friends-badge', 'side-friends-badge'].forEach((id) => {
        const badge = byId(id); if (!badge) return;
        badge.hidden = total === 0;
        badge.textContent = total > 9 ? '9+' : String(total);
      });
    }

    function renderGuardianControl() {
      const enabled = Boolean(ownProfile?.guardian_chat_enabled);
      const card = byId('guardian-chat-card');
      const button = byId('toggle-guardian-chat');
      const copy = byId('guardian-chat-copy');
      card?.classList.toggle('enabled', enabled);
      if (button) {
        button.textContent = enabled ? 'Desativar chat' : 'Ativar chat';
        button.setAttribute('aria-pressed', String(enabled));
      }
      if (copy) copy.textContent = enabled
        ? 'Conversas liberadas somente com amigos aprovados. Você pode desativar a qualquer momento.'
        : 'O chat está desativado. Um adulto responsável pode liberar conversas somente com amigos aprovados.';
    }

    function emptyCard(message) {
      return `<div class="friend-empty"><span aria-hidden="true">♧</span><p>${safe(message)}</p></div>`;
    }

    function renderRequests() {
      const items = pendingRequests();
      const list = byId('friend-requests-list');
      if (byId('friend-request-count')) byId('friend-request-count').textContent = String(items.length);
      if (!list) return;
      list.innerHTML = items.length ? '' : emptyCard('Nenhum convite aguardando.');
      items.forEach((item) => {
        const row = document.createElement('article');
        row.className = 'friend-row request';
        row.innerHTML = `<div class="friend-avatar">${safe(item.profile.avatar || '☺')}</div><div><strong>${safe(item.profile.name || 'Estudante')}</strong><span>Quer estudar com você</span></div><div class="friend-request-actions"><button type="button" data-answer="accept">Aceitar</button><button type="button" data-answer="decline">Recusar</button></div>`;
        row.querySelector('[data-answer="accept"]').addEventListener('click', () => answerRequest(item.id, true));
        row.querySelector('[data-answer="decline"]').addEventListener('click', () => answerRequest(item.id, false));
        list.append(row);
      });
    }

    function renderFriends() {
      const items = acceptedFriends().sort((a, b) => Number(isOnline(b.userId)) - Number(isOnline(a.userId)) || (a.profile.name || '').localeCompare(b.profile.name || '', 'pt-BR'));
      const list = byId('friends-list');
      const onlineCount = items.filter((item) => isOnline(item.userId)).length;
      if (byId('online-friend-count')) byId('online-friend-count').textContent = `${onlineCount} online`;
      if (!list) return;
      list.innerHTML = items.length ? '' : emptyCard('Adicione uma pessoa conhecida pelo código de amizade.');
      items.forEach((item) => {
        const online = isOnline(item.userId);
        const unread = unreadForFriend(item.userId);
        const row = document.createElement('article');
        row.className = `friend-row ${online ? 'online' : ''}`;
        row.innerHTML = `<div class="friend-avatar"><span>${safe(item.profile.avatar || '☺')}</span><i aria-label="${online ? 'Online' : 'Offline'}"></i></div><div><strong>${safe(item.profile.name || 'Estudante')}</strong><span>${online ? 'Online agora' : presence.get(item.userId)?.last_seen ? `Visto ${relativeTime(presence.get(item.userId).last_seen)}` : 'Ainda não apareceu online'}</span></div>${unread ? `<b class="friend-unread">${unread > 9 ? '9+' : unread}</b>` : ''}<button type="button">${questionDraft ? 'Enviar dúvida' : 'Conversar'}</button>`;
        row.querySelector('button').addEventListener('click', () => openChat(item));
        list.append(row);
      });
    }

    function renderQuestionDraft() {
      const banner = byId('shared-question-banner');
      const preview = byId('chat-question-preview');
      if (banner) banner.hidden = !questionDraft;
      if (byId('shared-question-title')) byId('shared-question-title').textContent = questionDraft?.q || '';
      if (preview) preview.hidden = !questionDraft;
      if (byId('chat-question-text')) byId('chat-question-text').textContent = questionDraft?.q || '';
    }

    function renderHub() {
      if (byId('my-friend-code')) byId('my-friend-code').textContent = ownProfile?.friend_code || '••••••••';
      renderGuardianControl();
      renderQuestionDraft();
      renderRequests();
      renderFriends();
      updateBadges();
    }

    async function updatePresence(online) {
      if (!user || !supabase) return;
      await supabase.from('user_presence').upsert({ user_id: user.id, online, last_seen: new Date().toISOString() }, { onConflict: 'user_id' });
    }

    async function loadHub({ quiet = false } = {}) {
      if (!user || !supabase || busy) return;
      busy = true;
      if (!quiet) notice('Atualizando seus amigos…');
      try {
        const [profileResult, friendshipResult, conversationResult, unreadResult] = await Promise.all([
          supabase.from('profiles').select('id, name, avatar, friend_code, guardian_chat_enabled').eq('id', user.id).single(),
          supabase.from('friendships').select('id, requester_id, addressee_id, status, created_at, responded_at').or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`).order('created_at', { ascending: false }),
          supabase.from('conversations').select('id, user_a, user_b, created_at'),
          supabase.from('messages').select('id, conversation_id').neq('sender_id', user.id).is('read_at', null)
        ]);
        const firstError = profileResult.error || friendshipResult.error || conversationResult.error || unreadResult.error;
        if (firstError) throw firstError;
        ownProfile = profileResult.data;
        friendships = friendshipResult.data || [];
        conversations = new Map((conversationResult.data || []).map((row) => [row.id, row]));
        unreadByConversation = new Map();
        (unreadResult.data || []).forEach((row) => unreadByConversation.set(row.conversation_id, (unreadByConversation.get(row.conversation_id) || 0) + 1));
        const ids = [...new Set(friendships.map(friendshipOtherId).filter(Boolean))];
        if (ids.length) {
          const [profileList, presenceList] = await Promise.all([
            supabase.from('profiles').select('id, name, avatar, guardian_chat_enabled').in('id', ids),
            supabase.from('user_presence').select('user_id, online, last_seen').in('user_id', ids)
          ]);
          if (profileList.error) throw profileList.error;
          profiles = new Map((profileList.data || []).map((row) => [row.id, row]));
          presence = new Map((presenceList.data || []).map((row) => [row.user_id, row]));
        } else { profiles = new Map(); presence = new Map(); }
        renderHub();
        if (!quiet) notice('');
      } catch (error) {
        console.warn('Área de amigos indisponível:', error);
        notice(friendlyError(error), true);
        renderHub();
      } finally { busy = false; }
    }

    async function sendRequest(event) {
      event.preventDefault();
      if (!ownProfile?.guardian_chat_enabled) { notice('Peça a um responsável para ativar o chat antes de adicionar amigos.', true); return; }
      const input = byId('friend-code-input');
      const code = input.value.trim().toUpperCase();
      if (!/^[A-Z0-9]{8}$/.test(code)) { notice('Digite um código com oito letras ou números.', true); return; }
      const button = event.currentTarget.querySelector('button[type="submit"]');
      button.disabled = true;
      try {
        const { data, error } = await supabase.rpc('send_friend_request', { p_friend_code: code });
        if (error) throw error;
        input.value = '';
        notice(`Convite enviado para ${data?.friend_name || 'seu amigo'}!`);
        await loadHub({ quiet: true });
      } catch (error) { notice(friendlyError(error), true); }
      finally { button.disabled = false; }
    }

    async function answerRequest(requestId, accept) {
      try {
        const { error } = await supabase.rpc('respond_friend_request', { p_request_id: requestId, p_accept: accept });
        if (error) throw error;
        notice(accept ? 'Amizade aprovada! Agora vocês podem estudar juntos.' : 'Convite recusado.');
        await loadHub({ quiet: true });
      } catch (error) { notice(friendlyError(error), true); }
    }

    async function toggleGuardianChat() {
      if (!ownProfile) return;
      const next = !ownProfile.guardian_chat_enabled;
      const button = byId('toggle-guardian-chat');
      if (next && button.dataset.confirm !== 'true') {
        button.dataset.confirm = 'true';
        button.textContent = 'Confirmar ativação';
        notice('Responsável: confirme que as conversas serão apenas com pessoas conhecidas.');
        clearTimeout(guardianConfirmTimer);
        guardianConfirmTimer = setTimeout(() => { button.dataset.confirm = ''; renderGuardianControl(); notice(''); }, 7000);
        return;
      }
      button.dataset.confirm = '';
      button.disabled = true;
      try {
        const { error } = await supabase.from('profiles').update({ guardian_chat_enabled: next, updated_at: new Date().toISOString() }).eq('id', user.id);
        if (error) throw error;
        ownProfile.guardian_chat_enabled = next;
        renderGuardianControl();
        notice(next ? 'Chat ativado para amizades aprovadas.' : 'Chat desativado. Nenhuma nova mensagem poderá ser enviada.');
      } catch (error) { notice(friendlyError(error), true); }
      finally { button.disabled = false; }
    }

    async function openChat(friend) {
      if (!ownProfile?.guardian_chat_enabled) { notice('O chat precisa ser ativado por um responsável.', true); return; }
      if (!friend.profile.guardian_chat_enabled) { notice(`${friend.profile.name || 'Seu amigo'} ainda não possui autorização para conversar.`, true); return; }
      activeFriend = friend;
      chatStatus('Abrindo conversa…');
      try {
        const { data, error } = await supabase.rpc('open_friend_conversation', { p_friend_id: friend.userId });
        if (error) throw error;
        activeConversationId = data;
        byId('chat-friend-name').textContent = friend.profile.name || 'Amigo de estudo';
        byId('chat-friend-avatar').textContent = friend.profile.avatar || '☺';
        byId('chat-presence-label').textContent = isOnline(friend.userId) ? 'ONLINE AGORA' : 'AMIGO DE ESTUDO';
        byId('chat-modal').hidden = false;
        document.body.classList.add('modal-open');
        options.onModalChange?.();
        byId('chat-options-menu').hidden = true;
        byId('chat-options').setAttribute('aria-expanded', 'false');
        renderQuestionDraft();
        await loadMessages();
        chatStatus('');
        byId('chat-input').focus();
      } catch (error) { notice(friendlyError(error), true); chatStatus(''); }
    }

    async function loadMessages() {
      if (!activeConversationId) return;
      const { data, error } = await supabase.from('messages').select('id, sender_id, body, kind, question_payload, created_at, read_at').eq('conversation_id', activeConversationId).order('created_at', { ascending: true }).limit(200);
      if (error) { chatStatus(friendlyError(error), true); return; }
      renderMessages(data || []);
      const unreadIds = (data || []).filter((row) => row.sender_id !== user.id && !row.read_at).map((row) => row.id);
      if (unreadIds.length) await supabase.from('messages').update({ read_at: new Date().toISOString() }).in('id', unreadIds);
      unreadByConversation.set(activeConversationId, 0);
      updateBadges();
      renderFriends();
    }

    function renderMessages(messages) {
      const list = byId('chat-messages');
      list.innerHTML = '';
      if (!messages.length) list.innerHTML = '<div class="chat-empty"><span>👋</span><strong>Comecem estudando juntos</strong><p>Envie uma dúvida, uma explicação ou compartilhe uma questão do quiz.</p></div>';
      messages.forEach((message) => {
        const item = document.createElement('article');
        item.className = `chat-message ${message.sender_id === user.id ? 'mine' : 'theirs'}`;
        const question = message.kind === 'question' && message.question_payload?.q
          ? `<div class="message-question"><span>${safe(message.question_payload.subject || 'Questão')}</span><strong>${safe(message.question_payload.q)}</strong></div>` : '';
        item.innerHTML = `${question}<p>${safe(message.body)}</p><time>${new Date(message.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}${message.sender_id === user.id ? (message.read_at ? ' · lida' : ' · enviada') : ''}</time>`;
        list.append(item);
      });
      requestAnimationFrame(() => { list.scrollTop = list.scrollHeight; });
    }

    async function sendMessage(event, quickReply = '') {
      event?.preventDefault?.();
      if (!activeConversationId || !activeFriend) return;
      const input = byId('chat-input');
      const body = (quickReply || input.value).trim() || (questionDraft ? 'Tenho uma dúvida nesta questão. Você pode me ajudar?' : '');
      if (!body || body.length > 1000) { chatStatus('Escreva uma mensagem de até 1000 caracteres.', true); return; }
      const submit = byId('chat-form').querySelector('button[type="submit"]');
      submit.disabled = true;
      const payload = questionDraft ? { q: questionDraft.q, subject: questionDraft.subject || '', topic: questionDraft.topic || '', schoolYear: questionDraft.schoolYear || '' } : null;
      try {
        const { error } = await supabase.from('messages').insert({ conversation_id: activeConversationId, sender_id: user.id, body, kind: payload ? 'question' : quickReply ? 'quick_reply' : 'text', question_payload: payload });
        if (error) throw error;
        input.value = '';
        questionDraft = null;
        renderQuestionDraft();
        await loadMessages();
        chatStatus('');
      } catch (error) { chatStatus(friendlyError(error), true); }
      finally { submit.disabled = false; }
    }

    function closeChat() {
      byId('chat-modal').hidden = true;
      byId('chat-options-menu').hidden = true;
      document.body.classList.remove('modal-open');
      activeFriend = null;
      activeConversationId = null;
      chatStatus('');
      options.onModalChange?.();
    }

    function safetyAction(kind) {
      if (!activeFriend) return;
      const panel = byId('chat-modal').querySelector('.chat-panel');
      panel.querySelector('.chat-safety-action')?.remove();
      const overlay = document.createElement('section');
      overlay.className = 'chat-safety-action';
      if (kind === 'report') {
        overlay.innerHTML = '<div><span>DENUNCIAR CONVERSA</span><h3>Conte o que aconteceu</h3><p>Um responsável pela plataforma poderá analisar este registro.</p><textarea maxlength="500" placeholder="Descreva o problema sem incluir dados pessoais."></textarea><div><button type="button" data-cancel>Cancelar</button><button type="button" data-confirm>Enviar denúncia</button></div></div>';
        overlay.querySelector('[data-confirm]').addEventListener('click', async () => {
          const reason = overlay.querySelector('textarea').value.trim();
          if (reason.length < 3) { overlay.querySelector('textarea').focus(); return; }
          const { error } = await supabase.from('chat_reports').insert({ reporter_id: user.id, reported_user_id: activeFriend.userId, conversation_id: activeConversationId, reason });
          if (error) { chatStatus(friendlyError(error), true); return; }
          overlay.remove(); chatStatus('Denúncia enviada. Obrigado por pedir ajuda.');
        });
      } else {
        const copy = kind === 'block' ? ['BLOQUEAR PESSOA', 'Bloquear esta conversa?', 'Vocês não poderão trocar novas mensagens.'] : ['REMOVER AMIZADE', 'Remover esta pessoa?', 'A conversa ficará indisponível até uma nova amizade ser aceita.'];
        overlay.innerHTML = `<div><span>${copy[0]}</span><h3>${copy[1]}</h3><p>${copy[2]}</p><div><button type="button" data-cancel>Cancelar</button><button type="button" data-confirm>Confirmar</button></div></div>`;
        overlay.querySelector('[data-confirm]').addEventListener('click', async () => {
          const result = kind === 'block'
            ? await supabase.from('user_blocks').upsert({ blocker_id: user.id, blocked_id: activeFriend.userId }, { onConflict: 'blocker_id,blocked_id' })
            : await supabase.from('friendships').delete().eq('id', activeFriend.id);
          if (result.error) { chatStatus(friendlyError(result.error), true); return; }
          overlay.remove(); closeChat(); await loadHub(); notice(kind === 'block' ? 'Pessoa bloqueada.' : 'Amizade removida.');
        });
      }
      overlay.querySelector('[data-cancel]').addEventListener('click', () => overlay.remove());
      panel.append(overlay);
    }

    function subscribe() {
      if (!supabase || !user) return;
      if (realtimeChannel) supabase.removeChannel(realtimeChannel);
      realtimeChannel = supabase.channel(`study-friends-${user.id}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'friendships' }, () => loadHub({ quiet: true }))
        .on('postgres_changes', { event: '*', schema: 'public', table: 'user_presence' }, () => loadHub({ quiet: true }))
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, (payload) => {
          if (payload.new?.conversation_id === activeConversationId) loadMessages();
          else loadHub({ quiet: true });
        }).subscribe();
    }

    function bindEvents() {
      byId('add-friend-form')?.addEventListener('submit', sendRequest);
      byId('toggle-guardian-chat')?.addEventListener('click', toggleGuardianChat);
      byId('refresh-friends')?.addEventListener('click', () => loadHub());
      byId('copy-friend-code')?.addEventListener('click', async () => {
        if (!ownProfile?.friend_code) return;
        try { await navigator.clipboard.writeText(ownProfile.friend_code); notice('Código copiado! Envie apenas para uma pessoa conhecida.'); }
        catch { notice(`Seu código é ${ownProfile.friend_code}.`); }
      });
      byId('cancel-question-share')?.addEventListener('click', () => { questionDraft = null; renderQuestionDraft(); renderFriends(); });
      byId('remove-chat-question')?.addEventListener('click', () => { questionDraft = null; renderQuestionDraft(); });
      byId('close-chat')?.addEventListener('click', closeChat);
      byId('chat-modal')?.addEventListener('click', (event) => { if (event.target === byId('chat-modal')) closeChat(); });
      byId('chat-options')?.addEventListener('click', () => { const menu = byId('chat-options-menu'); menu.hidden = !menu.hidden; byId('chat-options').setAttribute('aria-expanded', String(!menu.hidden)); });
      byId('block-chat-user')?.addEventListener('click', () => safetyAction('block'));
      byId('report-chat-user')?.addEventListener('click', () => safetyAction('report'));
      byId('remove-chat-friend')?.addEventListener('click', () => safetyAction('remove'));
      byId('chat-form')?.addEventListener('submit', sendMessage);
      document.querySelectorAll('[data-quick-reply]').forEach((button) => button.addEventListener('click', () => sendMessage(null, button.dataset.quickReply)));
      document.addEventListener('visibilitychange', () => updatePresence(!document.hidden));
      window.addEventListener('beforeunload', () => { if (user) supabase.from('user_presence').upsert({ user_id: user.id, online: false, last_seen: new Date().toISOString() }, { onConflict: 'user_id' }); });
    }

    bindEvents();

    return {
      async init(nextUser) {
        user = nextUser;
        await updatePresence(true);
        clearInterval(heartbeatTimer);
        heartbeatTimer = setInterval(() => updatePresence(!document.hidden), 45000);
        subscribe();
        await loadHub({ quiet: true });
      },
      async open() { await loadHub(); },
      shareQuestion(question) { questionDraft = question ? { q: question.q, subject: question.subject, topic: question.topic, schoolYear: question.schoolYear } : null; renderQuestionDraft(); renderFriends(); },
      hasQuestionDraft() { return Boolean(questionDraft); },
      isChatOpen() { return Boolean(byId('chat-modal') && !byId('chat-modal').hidden); },
      closeChat,
      async stop() {
        clearInterval(heartbeatTimer);
        await updatePresence(false);
        if (realtimeChannel) await supabase.removeChannel(realtimeChannel);
        realtimeChannel = null; user = null; ownProfile = null; friendships = []; profiles = new Map(); presence = new Map();
        updateBadges(); closeChat();
      }
    };
  }

  window.EstudaFriends = { create };
})();
