const fs = require('fs');
const path = require('path');
const assert = require('assert');

const app = fs.readFileSync(path.join(__dirname, '..', 'app.js'), 'utf8');

assert.ok(
  /el\('subject'\)\.addEventListener\('change',\s*\(\)\s*=>\s*\{[\s\S]*?el\('topic'\)\.value\s*=\s*'';/.test(app),
  'trocar a matéria no seletor deve limpar o assunto da matéria anterior'
);

assert.ok(
  /el\('topic'\)\.value\s*=\s*'';[\s\S]*?renderTopicExamples\(\);[\s\S]*?renderPhaseMap\(\);/.test(app),
  'depois de limpar, o aplicativo deve atualizar sugestões e trilha'
);

console.log('subject-topic-reset.test.js: todos os testes passaram');
