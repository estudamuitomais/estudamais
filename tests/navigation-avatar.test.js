const fs = require('fs');
const path = require('path');
const assert = require('assert');

const root = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const app = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
const css = fs.readFileSync(path.join(root, 'purple-modern-theme.css'), 'utf8');

assert.ok(html.includes('<b>Aprenda Jogando</b>'), 'o início lateral deve se chamar Aprenda Jogando');
assert.ok(html.includes('<b>Configure seu estudo</b>'), 'a configuração de estudo deve ter um nome claro');
assert.ok(html.includes('data-side-nav="avatar"') && html.includes('data-nav="avatar"'), 'o avatar deve estar disponível nas navegações desktop e móvel');
assert.ok(!html.includes('class="avatar-home-card"'), 'o cartão grande do avatar deve sair da tela inicial');

assert.ok(!html.includes('<label>Sistema de ensino'), 'o usuário não deve escolher manualmente um sistema de ensino');
assert.ok(html.includes('<select id="curriculum" hidden'), 'a referência curricular interna deve continuar disponível para montar os exercícios');
assert.ok(app.includes("function automaticCurriculum(code = schoolYear)"), 'a referência deve ser definida automaticamente pelo ano escolar');
assert.ok(app.includes("schoolYearProfile(code).stage === 'Médio' ? 'Base Enem/Inep' : 'BNCC'"), 'Ensino Médio deve usar a base Inep e Fundamental deve usar a BNCC');

assert.ok(html.includes('Escolha o gênero do avatar'), 'a escolha de gênero deve ficar explícita no estúdio');
assert.ok(html.includes('data-avatar-presentation="masculine"') && html.includes('data-avatar-presentation="feminine"'), 'as opções masculino e feminino devem existir');
assert.ok(app.includes("category.id !== 'presentation'") && app.includes('renderAvatarGenderChoice()'), 'o gênero dedicado deve substituir a antiga aba escondida de estilo');
assert.ok(app.includes("destination === 'avatar'") && app.includes("button.dataset.nav === 'avatar'"), 'os novos atalhos devem abrir o estúdio');
assert.ok(css.includes('.avatar-gender-card') && css.includes('.side-avatar-feature'), 'as novas opções devem possuir apresentação visual própria');
assert.ok(css.includes('repeat(7, minmax(0, 1fr))'), 'a navegação móvel deve comportar os sete destinos');

console.log('navigation-avatar.test.js: todos os testes passaram');
