const assert = require('assert');
const fs = require('fs');
const path = require('path');

const app = fs.readFileSync(path.join(__dirname, '..', 'app.js'), 'utf8');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');

assert.ok(app.includes('const MAX_LIVES = 5') && app.includes('20 * 60 * 1000'), 'o plano grátis deve ter 5 vidas e recuperar uma a cada 20 minutos');
assert.ok(app.includes('function loseLife()') && app.includes("if (hasPremiumStudyAccess()) return;"), 'Premium e Família não devem perder vidas');
assert.ok(app.includes('function normalizeEnergy') && app.includes('Math.floor((now - updatedAt) / LIFE_RECHARGE_MS)'), 'a recuperação precisa considerar o tempo transcorrido');
assert.ok(app.includes("el('adventure-overview').hidden = false") && app.includes("el('lesson-creator').hidden = true"), 'clicar na matéria deve abrir diretamente a trilha');
assert.ok(app.includes("el('toggle-creator').textContent = 'Configurar no perfil'"), 'a alteração da trilha deve apontar para o perfil');

['profile-study-subject', 'profile-study-topic', 'profile-study-difficulty', 'profile-study-mode', 'profile-lives-count', 'profile-lives-recharge'].forEach((id) => {
  assert.ok(html.includes(`id="${id}"`), `o perfil deve conter ${id}`);
});

console.log('lives-profile-flow.test.js: fluxo direto, perfil e vidas verificados');
