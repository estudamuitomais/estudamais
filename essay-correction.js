(function () {
  'use strict';

  const DRAFT_KEY = 'estuda-plus-essay-draft-v1';
  const COMPETENCY_LABELS = [
    'Domínio da norma-padrão',
    'Compreensão do tema',
    'Organização dos argumentos',
    'Coesão textual',
    'Proposta de intervenção'
  ];

  const byId = (id) => document.getElementById(id);
  const cleanText = (value) => String(value || '').trim();
  const escapeHTML = (value) => String(value || '').replace(/[&<>'"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[char]));
  const safeList = (value) => Array.isArray(value) ? value.map(cleanText).filter(Boolean).slice(0, 5) : [];

  function create(options = {}) {
    const supabase = options.supabase;
    let currentCorrection = null;
    let draftTimer = null;
    let correctionIncluded = false;

    function updateAccessDisplay(entitlements = {}) {
      correctionIncluded = Boolean(entitlements?.essayWithoutCredits);
      const credits = Math.max(0, Number(entitlements?.credits) || 0);
      if (byId('essay-credit-balance')) byId('essay-credit-balance').textContent = correctionIncluded ? '✓' : String(credits);
      if (byId('essay-credit-label')) byId('essay-credit-label').textContent = correctionIncluded ? 'incluído' : 'créditos';
      if (byId('essay-access-price')) byId('essay-access-price').textContent = correctionIncluded ? 'Incluído' : '5 créditos';
      if (byId('essay-access-price-note')) byId('essay-access-price-note').textContent = correctionIncluded ? 'sem consumir seu saldo' : 'por correção concluída';
      const button = byId('submit-essay');
      if (button && !button.disabled) button.innerHTML = correctionIncluded ? 'Corrigir com meu acesso <span>→</span>' : 'Corrigir por 5 créditos <span>→</span>';
    }

    function setStatus(message = '', type = '') {
      const status = byId('essay-status');
      if (!status) return;
      status.textContent = message;
      status.className = `essay-status${type ? ` ${type}` : ''}`;
    }

    function updateCounter() {
      const value = byId('essay-text')?.value || '';
      const words = value.trim() ? value.trim().split(/\s+/).length : 0;
      const paragraphs = value.trim() ? value.trim().split(/\n\s*\n/).filter(Boolean).length : 0;
      if (byId('essay-word-count')) byId('essay-word-count').textContent = `${words} palavra${words === 1 ? '' : 's'} · ${paragraphs} parágrafo${paragraphs === 1 ? '' : 's'}`;
    }

    function saveDraft() {
      const draft = { mode: byId('essay-mode')?.value || 'enem', theme: byId('essay-theme')?.value || '', text: byId('essay-text')?.value || '', savedAt: new Date().toISOString() };
      try { localStorage.setItem(DRAFT_KEY, JSON.stringify(draft)); } catch { return; }
      if (byId('essay-draft-status')) byId('essay-draft-status').textContent = 'Rascunho salvo somente neste aparelho';
    }

    function scheduleDraftSave() {
      updateCounter();
      if (byId('essay-draft-status')) byId('essay-draft-status').textContent = 'Salvando rascunho…';
      clearTimeout(draftTimer);
      draftTimer = setTimeout(saveDraft, 500);
    }

    function loadDraft() {
      try {
        const draft = JSON.parse(localStorage.getItem(DRAFT_KEY) || 'null');
        if (!draft) return;
        byId('essay-mode').value = draft.mode === 'free' ? 'free' : 'enem';
        byId('essay-theme').value = String(draft.theme || '').slice(0, 300);
        byId('essay-text').value = String(draft.text || '').slice(0, 12000);
      } catch { /* rascunho inválido é ignorado */ }
      updateCounter();
    }

    function clearDraft(confirmFirst = true) {
      if (confirmFirst && (byId('essay-theme').value || byId('essay-text').value) && !window.confirm('Deseja apagar o rascunho deste aparelho?')) return;
      localStorage.removeItem(DRAFT_KEY);
      byId('essay-theme').value = '';
      byId('essay-text').value = '';
      byId('essay-safety-confirm').checked = false;
      updateCounter();
      if (byId('essay-draft-status')) byId('essay-draft-status').textContent = 'Rascunho salvo somente neste aparelho';
    }

    function renderList(id, values) {
      const list = byId(id);
      if (!list) return;
      list.innerHTML = safeList(values).map((item) => `<li>${escapeHTML(item)}</li>`).join('') || '<li>Sem observações adicionais.</li>';
    }

    function renderCorrection(correction) {
      currentCorrection = correction;
      byId('essay-result').hidden = false;
      byId('essay-result-title').textContent = correction.title || 'Avaliação concluída';
      byId('essay-result-summary').textContent = correction.summary || '';
      byId('essay-total-score').textContent = String(Math.max(0, Math.min(1000, Number(correction.total_score) || 0)));
      const scores = Array.isArray(correction.competencies) ? correction.competencies : [];
      byId('essay-competencies').innerHTML = COMPETENCY_LABELS.map((label, index) => {
        const item = scores[index] || {};
        const score = Math.max(0, Math.min(200, Number(item.score) || 0));
        return `<article><header><span>C${index + 1}</span><strong>${escapeHTML(label)}</strong><b>${score}/200</b></header><i><b style="width:${score / 2}%"></b></i><p>${escapeHTML(item.feedback || 'Continue praticando esta competência.')}</p></article>`;
      }).join('');
      renderList('essay-strengths', correction.strengths);
      renderList('essay-improvements', correction.improvements);
      byId('essay-detailed-comment').textContent = correction.detailed_comment || '';
      byId('essay-rewritten-excerpt').textContent = correction.rewritten_excerpt || '';
      byId('essay-result').scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
    }

    function historyCard(row) {
      const date = new Date(row.created_at).toLocaleDateString('pt-BR');
      return `<button type="button" data-essay-history-id="${escapeHTML(row.id)}"><span><small>${escapeHTML(date)}</small><strong>${escapeHTML(row.theme)}</strong><em>${escapeHTML(row.essay_excerpt || '')}</em></span><b>${Number(row.total_score) || 0}<small>/1000</small></b></button>`;
    }

    async function loadHistory() {
      if (!supabase) return;
      const container = byId('essay-history');
      container.innerHTML = '<p class="essay-empty">Carregando correções…</p>';
      const { data, error } = await supabase.from('essay_corrections').select('id, theme, essay_excerpt, word_count, total_score, correction, created_at').order('created_at', { ascending: false }).limit(20);
      if (error) {
        container.innerHTML = '<p class="essay-empty">O histórico ficará disponível após a ativação do serviço de redação.</p>';
        return;
      }
      container.innerHTML = data?.length ? data.map(historyCard).join('') : '<p class="essay-empty">Suas correções concluídas aparecerão aqui.</p>';
      container.querySelectorAll('[data-essay-history-id]').forEach((button) => button.addEventListener('click', () => {
        const row = data.find((item) => item.id === button.dataset.essayHistoryId);
        if (row?.correction) renderCorrection(row.correction);
      }));
    }

    async function submit(event) {
      event.preventDefault();
      const theme = cleanText(byId('essay-theme').value);
      const essay = cleanText(byId('essay-text').value);
      if (essay.length < 300) { setStatus('Escreva pelo menos 300 caracteres para receber uma avaliação útil.', 'error'); byId('essay-text').focus(); return; }
      if (!byId('essay-safety-confirm').checked) { setStatus('Confirme que removeu dados pessoais antes de enviar.', 'error'); return; }
      if (!supabase) { setStatus('O serviço de correção não carregou. Atualize a página e tente novamente.', 'error'); return; }
      const button = byId('submit-essay');
      button.disabled = true;
      button.innerHTML = 'Analisando sua redação… <span>⏳</span>';
      setStatus('Avaliando argumentos, coesão, linguagem e proposta de intervenção. Nenhum crédito será retirado se a correção falhar.', 'loading');
      try {
        const { data, error } = await supabase.functions.invoke('correct-essay', { body: { mode: byId('essay-mode').value, theme, essay } });
        if (error) throw error;
        if (!data?.ok) {
          if (data?.error === 'INSUFFICIENT_CREDITS') {
            setStatus('Você precisa de 5 créditos para corrigir esta redação.', 'error');
            options.onBuyCredits?.();
            return;
          }
          const friendly = data?.error === 'PERSONAL_DATA_DETECTED' ? 'Remova os dados pessoais indicados e envie novamente.' : data?.error === 'UNSAFE_CONTENT' ? 'Não foi possível avaliar esse conteúdo. Peça ajuda a um adulto responsável ou professor.' : 'Não foi possível concluir a correção. Nenhum crédito foi retirado.';
          setStatus(friendly, 'error');
          return;
        }
        renderCorrection(data.correction);
        localStorage.removeItem(DRAFT_KEY);
        if (byId('essay-credit-balance') && !correctionIncluded) byId('essay-credit-balance').textContent = String(data.credits_remaining ?? 0);
        options.onCreditsChanged?.(Number(data.credits_remaining) || 0);
        setStatus(data.access_included ? 'Correção concluída sem usar créditos: este recurso está incluído no seu acesso.' : `Correção concluída. Saldo atual: ${data.credits_remaining ?? 0} créditos.`, 'success');
        await loadHistory();
      } catch (error) {
        console.error('Essay correction failed', error);
        setStatus('A correção está temporariamente indisponível. Seu rascunho continua salvo e nenhum crédito foi retirado.', 'error');
      } finally {
        button.disabled = false;
        button.innerHTML = correctionIncluded ? 'Corrigir com meu acesso <span>→</span>' : 'Corrigir por 5 créditos <span>→</span>';
      }
    }

    byId('essay-form')?.addEventListener('submit', submit);
    ['essay-theme', 'essay-text'].forEach((id) => byId(id)?.addEventListener('input', scheduleDraftSave));
    byId('essay-mode')?.addEventListener('change', saveDraft);
    byId('clear-essay-draft')?.addEventListener('click', () => clearDraft(true));
    byId('refresh-essay-history')?.addEventListener('click', loadHistory);
    loadDraft();

    return {
      async open(entitlements = {}) {
        updateAccessDisplay(typeof entitlements === 'number' ? { credits: entitlements } : entitlements);
        updateCounter();
        await loadHistory();
      },
      getCurrentCorrection: () => currentCorrection
    };
  }

  window.EstudaEssay = { create };
})();
