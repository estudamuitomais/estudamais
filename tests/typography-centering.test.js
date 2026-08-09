const fs = require('fs');
const path = require('path');
const assert = require('assert');

const css = fs.readFileSync(path.join(__dirname, '..', 'purple-modern-theme.css'), 'utf8');

assert.ok(css.includes('/* Tipografia unificada:'), 'a padronização tipográfica deve ficar documentada');
assert.ok(css.includes('--type-body: clamp('), 'os textos de conteúdo devem ter uma escala responsiva');
assert.ok(css.includes('--type-display: clamp('), 'os títulos principais devem ter uma escala responsiva');
assert.ok(css.includes('.auth-card,\n.subject-welcome,\n.journey-intro,'), 'as mensagens de boas-vindas devem receber centralização');
assert.ok(css.includes('.feedback,\n.achievement-toast,\n.friends-notice,'), 'os retornos após uma questão devem ficar centralizados');
assert.ok(css.includes('.friends-notice,\n.admin-notice,\n.chat-status,'), 'os avisos de comunidade e administração devem ficar centralizados');
assert.ok(css.includes('.tutorial-copy li { display: grid; justify-items: center;'), 'as orientações do tutorial devem seguir o novo alinhamento');
assert.ok(css.includes('.answer,\n.material-summary-content,'), 'respostas e conteúdos de estudo devem preservar alinhamento de leitura');
assert.ok(css.includes('@media (max-width: 600px)'), 'a escala de títulos deve ter um ajuste específico para celular');

console.log('typography-centering.test.js: todos os testes passaram');
