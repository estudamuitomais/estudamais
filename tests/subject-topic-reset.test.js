const fs = require('fs');
const path = require('path');
const assert = require('assert');

const app = fs.readFileSync(path.join(__dirname, '..', 'app.js'), 'utf8');

assert.ok(
  app.includes("el('subject').addEventListener('change', () => {\n  // Um assunto digitado pertence à matéria anterior. Ao trocar a matéria no seletor,\n  // voltamos para a revisão geral em vez de misturar conteúdos de áreas diferentes.\n  el('topic').value = '';"),
  'trocar a matéria no seletor deve limpar o assunto da matéria anterior'
);
assert.ok(
  app.includes("el('topic').value = '';\n  renderTopicExamples();\n  renderPhaseMap();"),
  'depois de limpar, o aplicativo deve atualizar sugestões e trilha'
);

console.log('subject-topic-reset.test.js: todos os testes passaram');
