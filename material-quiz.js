(() => {
  'use strict';

  const byId = (id) => document.getElementById(id);
  const escapeHTML = (value = '') => String(value).replace(/[&<>'"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[char]);
  const normalize = (value = '') => String(value).replace(/-\s*\n\s*/g, '').replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim();
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
    const status = (message = '', error = false) => { const node = byId('material-status'); node.textContent = message; node.classList.toggle('error', error); };
    function updatePreview() {
      const box = byId('material-image-preview'); box.innerHTML = '';
      files.forEach((file, index) => {
        const item = document.createElement('article');
        const image = document.createElement('img'); image.src = URL.createObjectURL(file); image.alt = `Prévia da foto ${index + 1}`; image.onload = () => URL.revokeObjectURL(image.src);
        const copy = document.createElement('div'); const title = document.createElement('strong'); title.textContent = `Página ${index + 1}`; const detail = document.createElement('span'); detail.textContent = `${(file.size / 1048576).toFixed(1)} MB`; copy.append(title, detail); item.append(image, copy); box.append(item);
      });
    }
    function validateFiles(nextFiles) {
      if (!nextFiles.length) throw new Error('Escolha pelo menos uma foto da apostila.');
      if (nextFiles.length > 5) throw new Error('Escolha no máximo cinco fotos por quiz.');
      if (nextFiles.some((file) => file.size > 8 * 1024 * 1024)) throw new Error('Cada imagem pode ter no máximo 8 MB.');
      if (nextFiles.some((file) => !/^image\/(jpeg|png|webp)$/i.test(file.type))) throw new Error('Use imagens JPG, PNG ou WebP.');
    }
    async function readImages() {
      if (reading) return;
      try { validateFiles(files); } catch (error) { status(error.message, true); return; }
      if (!globalThis.Tesseract?.recognize) { status('O leitor de imagens não carregou. Verifique a internet e atualize a página.', true); return; }
      reading = true; status(''); byId('read-material-images').disabled = true; byId('generate-material-quiz').disabled = true; byId('material-reading-progress').hidden = false;
      const extracted = [];
      try {
        for (let index = 0; index < files.length; index++) {
          byId('material-progress-title').textContent = `Lendo página ${index + 1} de ${files.length}…`;
          const result = await globalThis.Tesseract.recognize(files[index], 'por', { logger(message) {
            if (message.status !== 'recognizing text') return;
            const pageProgress = Number(message.progress) || 0; const overall = Math.round(((index + pageProgress) / files.length) * 100);
            byId('material-progress-percent').textContent = `${overall}%`; byId('material-progress-bar').style.width = `${overall}%`; byId('material-progress-detail').textContent = 'Reconhecendo letras, números e parágrafos…';
          } });
          extracted.push(result.data?.text || '');
        }
        const text = normalize(extracted.join('\n\n'));
        if (text.length < 250) throw new Error('A leitura encontrou pouco texto. Tente fotos mais nítidas, próximas e bem iluminadas.');
        byId('material-extracted-text').value = text; byId('material-text-label').hidden = false; byId('generate-material-quiz').disabled = false;
        byId('material-progress-percent').textContent = '100%'; byId('material-progress-bar').style.width = '100%'; byId('material-progress-detail').textContent = 'Leitura concluída. Confira o texto abaixo.';
        status('Texto reconhecido. Revise especialmente nomes, datas, fórmulas e números antes de criar o quiz.'); byId('material-extracted-text').focus();
      } catch (error) { status(error.message || 'Não foi possível ler as fotos.', true); }
      finally { reading = false; byId('read-material-images').disabled = false; }
    }
    function submit(event) {
      event.preventDefault();
      try {
        const subject = byId('material-subject').value; const text = normalize(byId('material-extracted-text').value);
        if (text.length < 250) throw new Error('Revise o texto e mantenha pelo menos 250 caracteres de conteúdo.');
        const questions = buildQuestions(text, subject); status('Quiz criado com dez questões baseadas somente no texto conferido.'); options.onStart?.({ questions, subject });
      } catch (error) { status(error.message, true); }
    }
    byId('material-images')?.addEventListener('change', (event) => { files = [...event.target.files]; try { validateFiles(files); status(`${files.length} foto(s) selecionada(s). Agora toque em “Ler as fotos”.`); } catch (error) { files = []; event.target.value = ''; status(error.message, true); } updatePreview(); });
    byId('read-material-images')?.addEventListener('click', readImages);
    byId('material-quiz-form')?.addEventListener('submit', submit);
    return { reset() { files = []; byId('material-quiz-form')?.reset(); byId('material-image-preview').innerHTML = ''; byId('material-text-label').hidden = true; byId('material-reading-progress').hidden = true; byId('generate-material-quiz').disabled = true; status(''); }, buildQuestions };
  }

  window.EstudaMaterialQuiz = { create, buildQuestions };
})();
