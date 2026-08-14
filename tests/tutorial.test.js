const fs = require('fs');
const path = require('path');
const assert = require('assert');

const root = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const app = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
const css = fs.readFileSync(path.join(root, 'purple-modern-theme.css'), 'utf8');

assert.ok(app.includes('const APP_TUTORIAL_VERSION = 4;'), 'a nova versão deve ser oferecida uma vez aos usuários');
assert.ok(app.includes('tutorialPendingVersion > 0 && state.tutorialSeenVersion < APP_TUTORIAL_VERSION'), 'uma atualização do tutorial deve aparecer uma vez para contas que já receberam o guia');
assert.ok(html.includes('PASSO 1 DE 9') && html.includes('aria-valuemax="9"'), 'o modal deve anunciar as nove etapas');
assert.ok(app.includes("progress.setAttribute('aria-valuemax', String(tutorialSteps.length))"), 'o limite acessível deve acompanhar a quantidade de etapas');

[
  "kind: 'subjects'",
  "kind: 'config'",
  "kind: 'path'",
  "kind: 'question'",
  "kind: 'material'",
  "kind: 'essay'",
  "kind: 'avatar'",
  "kind: 'friends'",
  "kind: 'progress'"
].forEach((kind) => assert.ok(app.includes(kind), `etapa ausente: ${kind}`));

assert.ok(app.includes('O assunto é opcional'), 'o tutorial deve explicar que o assunto é opcional');
assert.ok(app.includes('Acerte pelo menos 7 de 10'), 'o tutorial deve explicar a regra de avanço da trilha');
assert.ok(app.includes('resumo completo e um mapa mental'), 'o tutorial deve apresentar os recursos da apostila');
assert.ok(app.includes('A conversa flutuante avisa'), 'o tutorial deve apresentar o chat flutuante');
assert.ok(css.includes('.tutorial-config-demo') && css.includes('.tutorial-material-demo') && css.includes('.tutorial-friends-demo'), 'as novas etapas devem possuir demonstrações visuais');

console.log('tutorial.test.js: todos os testes passaram');
