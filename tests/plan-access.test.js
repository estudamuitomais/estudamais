const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const app = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
const migration = fs.readFileSync(path.join(root, 'plan-access-migration.sql'), 'utf8');

assert.ok(html.includes('class="selected-subject-summary"') && html.includes('id="subject" required hidden'), 'a matéria deve ser apenas resumida na configuração');
assert.ok(!html.includes('<section id="admin-access-card"'), 'o atalho administrativo não deve permanecer no perfil');
assert.ok(html.includes('id="side-admin-button"') && html.includes('data-side-nav="admin" hidden'), 'o painel administrativo deve continuar reservado ao menu do administrador');
assert.ok(app.includes("if (id === 'admin-screen' && !activeUserIsAdmin) id = 'dashboard-screen';"), 'navegação direta não pode abrir a tela administrativa para usuário comum');
assert.ok(html.includes('data-requires-plan="premium"'), 'recursos avançados precisam indicar a exigência de plano');
assert.ok(app.includes(".rpc('consume_quiz_access'") && app.includes('async function consumeQuizAccess'), 'cada rodada deve validar a permissão no servidor');
assert.ok(app.includes("['active', 'paid', 'complete', 'trialing']") && app.includes("planId.startsWith('family')"), 'somente assinaturas ativas devem liberar o plano');
assert.ok(migration.includes('private.consume_quiz_access') && migration.includes('security definer') && migration.includes('security invoker') && migration.includes('auth.uid()') && migration.includes('daily_limit'), 'o limite gratuito deve usar implementação privada e chamada pública sem privilégios');
assert.ok(migration.includes('revoke insert, update, delete on public.user_quiz_daily_usage from authenticated'), 'o usuário não pode alterar o próprio contador pela API');
assert.ok(migration.includes('grant execute on function public.consume_quiz_access(integer) to authenticated') && migration.includes('revoke all on function public.consume_quiz_access(integer) from public, anon'), 'a função não pode ser executada anonimamente');

console.log('plan-access.test.js: permissões de plano e navegação verificadas');
