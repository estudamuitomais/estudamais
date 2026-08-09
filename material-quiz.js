(() => {
  'use strict';

  const byId = (id) => document.getElementById(id);
  const escapeHTML = (value = '') => String(value).replace(/[&<>'"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[char]);
  const normalize = (value = '') => String(value)
    .replace(/([A-Za-zÀ-ÿ])-\s*\n\s*([A-Za-zÀ-ÿ])/g, '$1$2')
    .replace(/\r/g, '')
    .replace(/[ \t]+/g, ' ')
    .replace(/ *\n */g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
  const shuffle = (items) => {
    const copy = [...items];
    for (let index = copy.length - 1; index > 0; index--) { const target = Math.floor(Math.random() * (index + 1)); [copy[index], copy[target]] = [copy[target], copy[index]]; }
    return copy;
  };
  const stopWords = new Set('a o as os um uma uns umas de da do das dos e em no na nos nas para por com sem que se ao aos à às é são foi foram ser como mais menos muito esta este isso esse essa sua seu suas seus entre sobre também quando onde qual quais'.split(' '));

  function sentencesFrom(text) {
    return normalize(text)
      .replace(/\n+/g, ' ')
      .split(/(?<=[.!?;:])\s+(?=[A-ZÁÉÍÓÚÂÊÔÃÕÇ0-9])/u)
      .map((sentence) => sentence.replace(/^[-•·\d.)\s]+/, '').trim())
      .filter((sentence) => sentence.length >= 35 && sentence.length <= 520 && sentence.split(/\s+/).length >= 7);
  }

  function termsFrom(text) {
    const values = [];
    const add = (term) => {
      const clean = term.replace(/^[,.;:()\s]+|[,.;:()\s]+$/g, '').replace(/\s+/g, ' ').trim();
      if (clean.length >= 3 && clean.length <= 55 && !values.some((item) => item.toLocaleLowerCase('pt-BR') === clean.toLocaleLowerCase('pt-BR'))) values.push(clean);
    };
    (text.match(/\b(?:\d{1,2}[\/.]\d{1,2}[\/.]\d{2,4}|\d+(?:[.,]\d+)?%?|[IVXLCDM]{2,})\b/g) || []).forEach(add);
    (text.match(/\b[A-ZÁÉÍÓÚÂÊÔÃÕÇ][a-záéíóúâêôãõç]{3,}(?:\s+(?:de|da|do|dos|das|e)?\s*[A-ZÁÉÍÓÚÂÊÔÃÕÇ][a-záéíóúâêôãõç]{2,}){0,2}/g) || []).forEach(add);
    const frequency = new Map();
    (text.toLocaleLowerCase('pt-BR').match(/[a-záéíóúâêôãõç]{5,}/g) || []).forEach((word) => {
      if (!stopWords.has(word)) frequency.set(word, (frequency.get(word) || 0) + 1);
    });
    [...frequency.entries()].sort((a, b) => b[1] - a[1] || b[0].length - a[0].length).slice(0, 80).forEach(([word]) => add(word));
    return values;
  }

  function wordTokens(value = '') {
    return String(value).toLocaleLowerCase('pt-BR').match(/[a-záéíóúâêôãõç]{4,}/g) || [];
  }

  function scoreOcrResult(data = {}) {
    const text = String(data.text || '').trim();
    if (!text) return 0;
    const confidence = Number.isFinite(Number(data.confidence)) ? Number(data.confidence) : 0;
    const characters = [...text];
    const readable = characters.filter((char) => /[A-Za-zÀ-ÿ0-9.,;:!?%()\/\-+×=\s]/u.test(char)).length;
    const readableRatio = readable / Math.max(1, characters.length);
    const tokens = text.match(/\S+/g) || [];
    const suspicious = tokens.filter((token) => /[|]{2,}|[_~^]{2,}|�|\w[|]\w/u.test(token)).length;
    const suspiciousRatio = suspicious / Math.max(1, tokens.length);
    const lengthBonus = Math.min(5, text.length / 500);
    return Math.max(0, Math.min(100, (confidence * .76) + (readableRatio * 22) + lengthBonus - (suspiciousRatio * 35)));
  }

  function buildSummary(text, subject = 'Conteúdo da apostila') {
    const normalizedText = normalize(text);
    const sentences = sentencesFrom(normalizedText);
    if (sentences.length < 2) throw new Error('O texto ainda tem poucas frases completas para criar um resumo. Corrija a transcrição ou envie mais uma página.');
    const frequency = new Map();
    wordTokens(normalizedText).forEach((word) => {
      if (!stopWords.has(word)) frequency.set(word, (frequency.get(word) || 0) + 1);
    });
    const ranked = sentences.map((sentence, index) => {
      const words = [...new Set(wordTokens(sentence).filter((word) => !stopWords.has(word)))];
      const termScore = words.reduce((sum, word) => sum + Math.min(5, frequency.get(word) || 0), 0) / Math.max(5, Math.sqrt(words.length || 1));
      const definitionBonus = /\b(é|são|significa|consiste|define-se|refere-se|ocorre|resulta|permite|provoca)\b/i.test(sentence) ? 2.4 : 0;
      const evidenceBonus = /\d|%|[=+×÷]/.test(sentence) ? 1.8 : 0;
      const lengthPenalty = sentence.length > 360 ? 1.5 : 0;
      return { sentence, index, score: termScore + definitionBonus + evidenceBonus - lengthPenalty, words };
    });
    const target = Math.min(18, Math.max(5, Math.ceil(sentences.length * .55)));
    const selected = [];
    ranked.sort((a, b) => b.score - a.score || a.index - b.index).forEach((candidate) => {
      if (selected.length >= target) return;
      const tooSimilar = selected.some((item) => {
        const common = candidate.words.filter((word) => item.words.includes(word)).length;
        return common / Math.max(1, Math.min(candidate.words.length, item.words.length)) > .72;
      });
      if (!tooSimilar) selected.push(candidate);
    });
    ranked.forEach((candidate) => {
      if (selected.length < target && !selected.includes(candidate)) selected.push(candidate);
    });
    const points = selected.sort((a, b) => a.index - b.index).map((item) => item.sentence);
    const numericalFacts = points.filter((sentence) => /\d|%|[=+×÷]/.test(sentence));
    const keywords = termsFrom(normalizedText).filter((term) => !/^\d/.test(term)).slice(0, 14);
    const overviewCount = Math.min(3, Math.max(1, Math.ceil(points.length * .22)));
    const overview = points.slice(0, overviewCount);
    const keyPoints = points.slice(overviewCount);
    const lines = [
      `RESUMO COMPLETO — ${subject}`,
      '',
      'VISÃO GERAL',
      ...overview.map((sentence) => `• ${sentence}`),
      '',
      'PONTOS PRINCIPAIS',
      ...keyPoints.map((sentence) => `• ${sentence}`)
    ];
    if (numericalFacts.length) lines.push('', 'DATAS, NÚMEROS E FÓRMULAS', ...numericalFacts.map((sentence) => `• ${sentence}`));
    if (keywords.length) lines.push('', 'TERMOS IMPORTANTES', keywords.join(' • '));
    lines.push('', `Síntese extrativa: ${points.length} de ${sentences.length} frases selecionadas do texto conferido.`);
    return { subject, overview, keyPoints, numericalFacts, keywords, sourceSentenceCount: sentences.length, selectedSentenceCount: points.length, plainText: lines.join('\n') };
  }

  function buildMindMap(text, subject = 'Conteúdo da apostila', preparedSummary = null) {
    const normalizedText = normalize(text);
    const summaryData = preparedSummary || buildSummary(normalizedText, subject);
    const sourceSentences = sentencesFrom(normalizedText);
    const importantSentences = [...summaryData.overview, ...summaryData.keyPoints];
    const candidates = summaryData.keywords.map((term) => {
      const normalizedTerm = term.toLocaleLowerCase('pt-BR');
      const details = importantSentences.filter((sentence) => sentence.toLocaleLowerCase('pt-BR').includes(normalizedTerm));
      const fallback = sourceSentences.filter((sentence) => sentence.toLocaleLowerCase('pt-BR').includes(normalizedTerm));
      return { term, details: (details.length ? details : fallback).slice(0, 2), coverage: details.length || fallback.length };
    }).filter((candidate) => candidate.details.length);
    candidates.sort((a, b) => b.coverage - a.coverage || b.term.length - a.term.length);
    const branches = [];
    candidates.forEach((candidate) => {
      if (branches.length >= 6) return;
      const lower = candidate.term.toLocaleLowerCase('pt-BR');
      const overlaps = branches.some((branch) => {
        const existing = branch.label.toLocaleLowerCase('pt-BR');
        return existing.includes(lower) || lower.includes(existing);
      });
      if (!overlaps) branches.push({ label: candidate.term.charAt(0).toLocaleUpperCase('pt-BR') + candidate.term.slice(1), details: candidate.details });
    });
    if (branches.length < 3) {
      importantSentences.forEach((sentence) => {
        if (branches.length >= 6) return;
        const label = wordTokens(sentence).filter((word) => !stopWords.has(word)).sort((a, b) => b.length - a.length)[0];
        if (!label || branches.some((branch) => branch.label.toLocaleLowerCase('pt-BR') === label)) return;
        branches.push({ label: label.charAt(0).toLocaleUpperCase('pt-BR') + label.slice(1), details: [sentence] });
      });
    }
    if (branches.length < 3) throw new Error('O texto ainda não tem conceitos suficientes para montar um mapa mental confiável.');
    const lines = [`MAPA MENTAL — ${subject}`, '', `TEMA CENTRAL: ${subject}`];
    branches.forEach((branch) => lines.push('', `↳ ${branch.label}`, ...branch.details.map((detail) => `  • ${detail}`)));
    return { subject, branches, plainText: lines.join('\n') };
  }

  async function imageForOcr(file) {
    const bitmap = globalThis.createImageBitmap ? await globalThis.createImageBitmap(file) : await new Promise((resolve, reject) => {
      const image = new Image();
      const url = URL.createObjectURL(file);
      image.onload = () => { URL.revokeObjectURL(url); resolve(image); };
      image.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Não foi possível preparar uma das fotos.')); };
      image.src = url;
    });
    const sourceWidth = bitmap.naturalWidth || bitmap.width;
    const sourceHeight = bitmap.naturalHeight || bitmap.height;
    const longest = Math.max(sourceWidth, sourceHeight);
    const scale = Math.min(2.4, 2600 / Math.max(1, longest));
    const width = Math.round(sourceWidth * scale);
    const height = Math.round(sourceHeight * scale);
    const canvas = document.createElement('canvas');
    canvas.width = width; canvas.height = height;
    const context = canvas.getContext('2d', { willReadFrequently: true });
    context.fillStyle = '#fff'; context.fillRect(0, 0, width, height);
    context.imageSmoothingEnabled = true; context.imageSmoothingQuality = 'high';
    context.drawImage(bitmap, 0, 0, width, height);
    bitmap.close?.();
    const pixels = context.getImageData(0, 0, width, height);
    const histogram = new Uint32Array(256);
    for (let offset = 0; offset < pixels.data.length; offset += 4) {
      const luminance = Math.round((pixels.data[offset] * .299) + (pixels.data[offset + 1] * .587) + (pixels.data[offset + 2] * .114));
      histogram[luminance]++;
    }
    const pixelCount = width * height;
    const percentile = (ratio) => { let sum = 0; for (let value = 0; value < 256; value++) { sum += histogram[value]; if (sum >= pixelCount * ratio) return value; } return 255; };
    const low = percentile(.025); const high = Math.max(low + 24, percentile(.985));
    for (let offset = 0; offset < pixels.data.length; offset += 4) {
      const luminance = (pixels.data[offset] * .299) + (pixels.data[offset + 1] * .587) + (pixels.data[offset + 2] * .114);
      const contrasted = Math.max(0, Math.min(255, ((luminance - low) * 255) / (high - low)));
      pixels.data[offset] = contrasted; pixels.data[offset + 1] = contrasted; pixels.data[offset + 2] = contrasted;
    }
    context.putImageData(pixels, 0, 0);
    return new Promise((resolve, reject) => canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error('Não foi possível melhorar uma das fotos.')), 'image/png', 1));
  }

  function excerptAround(sentence, term) {
    if (sentence.length <= 300) return sentence;
    const position = sentence.toLocaleLowerCase('pt-BR').indexOf(term.toLocaleLowerCase('pt-BR'));
    const start = Math.max(0, position - 115);
    const end = Math.min(sentence.length, position + term.length + 115);
    return `${start ? '…' : ''}${sentence.slice(start, end).trim()}${end < sentence.length ? '…' : ''}`;
  }

  function buildQuestions(text, subject) {
    const sentences = sentencesFrom(text);
    const terms = termsFrom(text);
    if (sentences.length < 2 || terms.length < 8) throw new Error('O texto ainda tem poucas informações distintas. Envie páginas mais completas ou corrija a transcrição.');
    const candidates = [];
    sentences.forEach((sentence) => {
      const lower = sentence.toLocaleLowerCase('pt-BR');
      terms.filter((term) => lower.includes(term.toLocaleLowerCase('pt-BR'))).slice(0, 5).forEach((term) => candidates.push({ sentence, term }));
    });
    const chosen = [];
    const usedPrompts = new Set();
    for (const candidate of shuffle(candidates)) {
      const excerpt = excerptAround(candidate.sentence, candidate.term);
      const pattern = new RegExp(candidate.term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      const incomplete = excerpt.replace(pattern, '__________');
      const key = incomplete.toLocaleLowerCase('pt-BR');
      if (incomplete === excerpt || usedPrompts.has(key)) continue;
      usedPrompts.add(key); chosen.push({ ...candidate, excerpt, incomplete });
      if (chosen.length === 10) break;
    }
    if (chosen.length < 10) throw new Error('Não encontrei dez informações confiáveis no texto. Adicione mais uma foto ou complete a transcrição.');
    return chosen.map((item, index) => {
      const alternatives = shuffle(terms.filter((term) => term.toLocaleLowerCase('pt-BR') !== item.term.toLocaleLowerCase('pt-BR'))).slice(0, 4);
      const options = shuffle([item.term, ...alternatives]);
      const correct = options.indexOf(item.term);
      return {
        id: `material-${Date.now()}-${index}-${item.term.toLocaleLowerCase('pt-BR').replace(/\W+/g, '-').slice(0, 28)}`,
        q: `Com base na sua apostila, qual alternativa completa corretamente o trecho? “${item.incomplete}”`,
        a: options,
        correct,
        origin: 'Material próprio',
        subject,
        topic: 'Conteúdo da minha apostila',
        skill: 'Localizar, compreender e relacionar informações do material',
        note: `<p><strong>Trecho conferido:</strong> “${escapeHTML(item.excerpt)}”</p><p>A resposta está escrita no material enviado. Compare o termo com o sentido completo da frase.</p>`,
        optionNotes: options.map((option, optionIndex) => optionIndex === correct ? `Correto: “${option}” aparece nesse ponto do trecho.` : `“${option}” aparece como termo de estudo, mas não completa corretamente este trecho.`),
        materialQuiz: true
      };
    });
  }

  function create(options = {}) {
    let files = [];
    let reading = false;
    let summary = null;
    let confirmedSnapshot = '';
    const status = (message = '', error = false) => { const node = byId('material-status'); node.textContent = message; node.classList.toggle('error', error); };
    const setCreationEnabled = () => {
      const text = normalize(byId('material-extracted-text')?.value || '');
      const confirmed = Boolean(byId('material-text-confirmed')?.checked) && text === confirmedSnapshot && text.length >= 250 && !reading;
      byId('generate-material-quiz').disabled = !confirmed;
      byId('generate-material-summary').disabled = !confirmed;
    };
    const setPageConfidence = (index, confidence) => {
      const badge = document.querySelector(`[data-material-confidence="${index}"]`);
      if (!badge) return;
      const rounded = Math.round(confidence);
      badge.textContent = `${rounded}% de confiança`;
      badge.className = `material-page-confidence ${rounded >= 88 ? 'good' : rounded >= 76 ? 'warning' : 'bad'}`;
    };
    function updatePreview() {
      const box = byId('material-image-preview'); box.innerHTML = '';
      files.forEach((file, index) => {
        const item = document.createElement('article');
        const image = document.createElement('img'); image.src = URL.createObjectURL(file); image.alt = `Prévia da foto ${index + 1}`; image.onload = () => URL.revokeObjectURL(image.src);
        const remove = document.createElement('button'); remove.type = 'button'; remove.className = 'material-remove-photo'; remove.textContent = '×'; remove.setAttribute('aria-label', `Remover página ${index + 1}`); remove.disabled = reading; remove.addEventListener('click', () => { files.splice(index, 1); clearGeneratedMaterial(); updatePreview(); status(files.length ? `Página removida. ${files.length} foto(s) pronta(s) para leitura.` : 'Adicione ou escaneie uma página da apostila.'); });
        const copy = document.createElement('div'); const title = document.createElement('strong'); title.textContent = `Página ${index + 1}`; const detail = document.createElement('span'); detail.textContent = `${(file.size / 1048576).toFixed(1)} MB`; const confidence = document.createElement('em'); confidence.dataset.materialConfidence = index; confidence.className = 'material-page-confidence pending'; confidence.textContent = 'Aguardando leitura'; copy.append(title, detail, confidence); item.append(image, remove, copy); box.append(item);
      });
      syncCaptureControls();
    }
    function syncCaptureControls() {
      if (byId('material-photo-counter')) byId('material-photo-counter').textContent = `${files.length} de 5 página${files.length === 1 ? '' : 's'}`;
      if (byId('scan-material-page')) byId('scan-material-page').disabled = reading || files.length >= 5;
      if (byId('choose-material-images')) byId('choose-material-images').disabled = reading;
      document.querySelectorAll('.material-remove-photo').forEach((button) => { button.disabled = reading; });
    }
    function validateFiles(nextFiles) {
      if (!nextFiles.length) throw new Error('Escolha pelo menos uma foto da apostila.');
      if (nextFiles.length > 5) throw new Error('Escolha no máximo cinco fotos por quiz.');
      if (nextFiles.some((file) => file.size > 8 * 1024 * 1024)) throw new Error('Cada imagem pode ter no máximo 8 MB.');
      if (nextFiles.some((file) => !/^image\/(jpeg|png|webp)$/i.test(file.type))) throw new Error('Use imagens JPG, PNG ou WebP.');
    }
    function clearGeneratedMaterial() {
      summary = null; confirmedSnapshot = '';
      byId('material-extracted-text').value = '';
      byId('material-text-confirmed').checked = false;
      byId('material-text-label').hidden = true;
      byId('material-confirm-wrap').hidden = true;
      byId('material-summary-panel').hidden = true;
      byId('material-reading-progress').hidden = true;
      setCreationEnabled();
    }
    function receiveMaterialFiles(nextFiles, { append = false, scanned = false } = {}) {
      if (reading) { status('Aguarde a leitura atual terminar antes de adicionar outra página.', true); return; }
      const candidateFiles = append ? [...files, ...nextFiles] : [...nextFiles];
      try {
        validateFiles(candidateFiles);
        files = candidateFiles;
        clearGeneratedMaterial();
        updatePreview();
        status(scanned ? `Página escaneada e adicionada. Você já tem ${files.length} de 5 páginas e pode fotografar outra.` : `${files.length} foto(s) selecionada(s). Agora toque em “Ler com precisão”.`);
      } catch (error) { status(error.message, true); }
    }
    async function readImages() {
      if (reading) return;
      try { validateFiles(files); } catch (error) { status(error.message, true); return; }
      if (!globalThis.Tesseract?.createWorker) { status('O leitor de imagens não carregou. Verifique a internet e atualize a página.', true); return; }
      reading = true; summary = null; confirmedSnapshot = ''; status(''); byId('read-material-images').disabled = true; byId('material-text-confirmed').checked = false; byId('material-summary-panel').hidden = true; setCreationEnabled(); byId('material-reading-progress').hidden = false; syncCaptureControls();
      const extracted = [];
      const confidences = [];
      let worker;
      try {
        worker = await globalThis.Tesseract.createWorker('por', 1, { logger(message) {
          if (message.status !== 'recognizing text') return;
          const pageIndex = Number(byId('material-reading-progress').dataset.pageIndex || 0);
          const pass = Number(byId('material-reading-progress').dataset.pass || 0);
          const pageProgress = ((pass + (Number(message.progress) || 0)) / 2);
          const overall = Math.round(((pageIndex + pageProgress) / files.length) * 100);
          byId('material-progress-percent').textContent = `${overall}%`; byId('material-progress-bar').style.width = `${overall}%`;
        } });
        for (let index = 0; index < files.length; index++) {
          const progress = byId('material-reading-progress'); progress.dataset.pageIndex = index;
          byId('material-progress-title').textContent = `Analisando página ${index + 1} de ${files.length}…`;
          progress.dataset.pass = '0'; byId('material-progress-detail').textContent = 'Primeira leitura: preservando a estrutura original.';
          await worker.setParameters({ tessedit_pageseg_mode: globalThis.Tesseract.PSM?.AUTO || '3', preserve_interword_spaces: '1', user_defined_dpi: '300' });
          const original = await worker.recognize(files[index]);
          progress.dataset.pass = '1'; byId('material-progress-detail').textContent = 'Segunda leitura: corrigindo iluminação e contraste.';
          const enhancedImage = await imageForOcr(files[index]);
          await worker.setParameters({ tessedit_pageseg_mode: globalThis.Tesseract.PSM?.SINGLE_BLOCK || '6', preserve_interword_spaces: '1', user_defined_dpi: '300' });
          const enhanced = await worker.recognize(enhancedImage);
          const originalScore = scoreOcrResult(original.data); const enhancedScore = scoreOcrResult(enhanced.data);
          const best = enhancedScore > originalScore ? enhanced : original;
          const confidence = Math.max(originalScore, enhancedScore);
          extracted.push(best.data?.text || ''); confidences.push(confidence); setPageConfidence(index, confidence);
        }
        const text = normalize(extracted.join('\n\n'));
        if (text.length < 250) throw new Error('A leitura encontrou pouco texto. Tente fotos mais nítidas, próximas e bem iluminadas.');
        byId('material-extracted-text').value = text; byId('material-text-label').hidden = false; byId('material-confirm-wrap').hidden = false;
        byId('material-progress-percent').textContent = '100%'; byId('material-progress-bar').style.width = '100%'; byId('material-progress-detail').textContent = 'Leitura concluída. Confira o texto abaixo.';
        const average = confidences.reduce((sum, value) => sum + value, 0) / confidences.length;
        const weakPages = confidences.map((value, index) => value < 76 ? index + 1 : null).filter(Boolean);
        status(weakPages.length ? `Atenção: confira ou refaça ${weakPages.length === 1 ? `a página ${weakPages[0]}` : `as páginas ${weakPages.join(', ')}`}. Confiança geral: ${Math.round(average)}%.` : `Leitura comparativa concluída com ${Math.round(average)}% de confiança. Confira nomes, datas, fórmulas e números.` , Boolean(weakPages.length));
        byId('material-extracted-text').focus();
      } catch (error) { status(error.message || 'Não foi possível ler as fotos.', true); }
      finally { await worker?.terminate?.(); reading = false; byId('read-material-images').disabled = false; setCreationEnabled(); syncCaptureControls(); }
    }
    function submit(event) {
      event.preventDefault();
      try {
        const subject = byId('material-subject').value; const text = normalize(byId('material-extracted-text').value);
        if (text.length < 250) throw new Error('Revise o texto e mantenha pelo menos 250 caracteres de conteúdo.');
        if (!byId('material-text-confirmed').checked || text !== confirmedSnapshot) throw new Error('Confirme que você revisou o texto reconhecido antes de criar o quiz.');
        const questions = buildQuestions(text, subject); status('Quiz criado com dez questões baseadas somente no texto conferido.'); options.onStart?.({ questions, subject });
      } catch (error) { status(error.message, true); }
    }
    function renderSummary() {
      try {
        const subject = byId('material-subject').value; const text = normalize(byId('material-extracted-text').value);
        if (!byId('material-text-confirmed').checked || text !== confirmedSnapshot) throw new Error('Confirme que você revisou o texto antes de criar o resumo.');
        summary = buildSummary(text, subject);
        summary.mindMap = buildMindMap(text, subject, summary);
        const content = byId('material-summary-content'); content.innerHTML = '';
        const appendSection = (title, values, className = '') => {
          if (!values.length) return;
          const section = document.createElement('section'); if (className) section.className = className;
          const heading = document.createElement('h4'); heading.textContent = title; const list = document.createElement('ul');
          values.forEach((value) => { const item = document.createElement('li'); item.textContent = value; list.append(item); });
          section.append(heading, list); content.append(section);
        };
        appendSection('Visão geral', summary.overview);
        appendSection('Pontos principais', summary.keyPoints);
        appendSection('Datas, números e fórmulas', summary.numericalFacts, 'material-summary-numbers');
        appendSection('Termos importantes', summary.keywords, 'material-summary-keywords');
        const map = byId('material-mind-map-content'); map.innerHTML = '';
        const center = document.createElement('div'); center.className = 'material-mind-map-center';
        const centerKicker = document.createElement('span'); centerKicker.textContent = 'TEMA CENTRAL';
        const centerTitle = document.createElement('strong'); centerTitle.textContent = summary.mindMap.subject;
        center.append(centerKicker, centerTitle);
        const branches = document.createElement('div'); branches.className = 'material-mind-map-branches';
        summary.mindMap.branches.forEach((branch, index) => {
          const article = document.createElement('article'); article.dataset.tone = String((index % 6) + 1);
          const button = document.createElement('button'); button.type = 'button'; button.setAttribute('aria-expanded', String(index === 0));
          const number = document.createElement('span'); number.textContent = String(index + 1).padStart(2, '0');
          const label = document.createElement('strong'); label.textContent = branch.label;
          const action = document.createElement('i'); action.textContent = index === 0 ? '−' : '+'; action.setAttribute('aria-hidden', 'true');
          button.append(number, label, action);
          const detailBox = document.createElement('div'); detailBox.className = 'material-mind-map-details'; detailBox.hidden = index !== 0;
          const list = document.createElement('ul');
          branch.details.forEach((detail) => { const item = document.createElement('li'); item.textContent = detail; list.append(item); });
          detailBox.append(list); article.append(button, detailBox); article.classList.toggle('active', index === 0);
          button.addEventListener('click', () => { const expanded = button.getAttribute('aria-expanded') === 'true'; button.setAttribute('aria-expanded', String(!expanded)); action.textContent = expanded ? '+' : '−'; detailBox.hidden = expanded; article.classList.toggle('active', !expanded); });
          branches.append(article);
        });
        map.append(center, branches);
        byId('material-summary-meta').textContent = `${summary.selectedSentenceCount} de ${summary.sourceSentenceCount} frases essenciais, preservadas do texto conferido.`;
        byId('material-summary-panel').hidden = false; status('Resumo e mapa mental criados somente com informações presentes no texto revisado.');
        byId('material-summary-panel').scrollIntoView({ behavior: 'smooth', block: 'start' });
      } catch (error) { status(error.message, true); }
    }
    async function copySummary() {
      if (!summary) return;
      try { await navigator.clipboard.writeText(summary.plainText); byId('copy-material-summary').textContent = 'Resumo copiado ✓'; setTimeout(() => { byId('copy-material-summary').textContent = 'Copiar resumo'; }, 1800); }
      catch { status('Não foi possível copiar automaticamente. Selecione o resumo e copie manualmente.', true); }
    }
    async function copyMindMap() {
      if (!summary?.mindMap) return;
      try { await navigator.clipboard.writeText(summary.mindMap.plainText); byId('copy-material-mind-map').textContent = 'Mapa copiado ✓'; setTimeout(() => { byId('copy-material-mind-map').textContent = 'Copiar mapa'; }, 1800); }
      catch { status('Não foi possível copiar o mapa automaticamente.', true); }
    }
    byId('scan-material-page')?.addEventListener('click', () => { if (files.length >= 5) { status('Você já adicionou o limite de cinco páginas. Remova uma foto para escanear outra.', true); return; } byId('material-camera')?.click(); });
    byId('choose-material-images')?.addEventListener('click', () => byId('material-images')?.click());
    byId('material-images')?.addEventListener('change', (event) => { receiveMaterialFiles([...event.target.files]); event.target.value = ''; });
    byId('material-camera')?.addEventListener('change', (event) => { receiveMaterialFiles([...event.target.files], { append: true, scanned: true }); event.target.value = ''; });
    byId('material-extracted-text')?.addEventListener('input', () => { if (byId('material-text-confirmed').checked) byId('material-text-confirmed').checked = false; confirmedSnapshot = ''; byId('material-summary-panel').hidden = true; setCreationEnabled(); status('Texto alterado. Confira novamente e marque a confirmação para continuar.'); });
    byId('material-text-confirmed')?.addEventListener('change', (event) => { confirmedSnapshot = event.target.checked ? normalize(byId('material-extracted-text').value) : ''; setCreationEnabled(); if (event.target.checked) status('Texto confirmado. Agora você pode criar o resumo completo ou o quiz.'); });
    byId('read-material-images')?.addEventListener('click', readImages);
    byId('generate-material-summary')?.addEventListener('click', renderSummary);
    byId('copy-material-summary')?.addEventListener('click', copySummary);
    byId('copy-material-mind-map')?.addEventListener('click', copyMindMap);
    byId('material-quiz-form')?.addEventListener('submit', submit);
    return { reset() { files = []; summary = null; confirmedSnapshot = ''; byId('material-quiz-form')?.reset(); byId('material-text-label').hidden = true; byId('material-confirm-wrap').hidden = true; byId('material-summary-panel').hidden = true; byId('material-reading-progress').hidden = true; byId('generate-material-quiz').disabled = true; byId('generate-material-summary').disabled = true; updatePreview(); status(''); }, buildQuestions, buildSummary, buildMindMap };
  }

  window.EstudaMaterialQuiz = { create, buildQuestions, buildSummary, buildMindMap, scoreOcrResult };
})();
