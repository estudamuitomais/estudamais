const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const app = read('app.js');
const html = read('index.html');
const material = read('material-quiz.js');
const avatar = read('avatar-studio.js');
const migration = read('plan-entitlement-enforcement-migration.sql');

assert.ok(migration.includes('user_feature_monthly_usage') && migration.includes("v_material_limit := 30") && migration.includes("v_material_limit := 10"), 'as cotas de apostila devem existir no servidor');
assert.ok(migration.includes("'premium_required'") && migration.includes('p_difficulty text') && migration.includes('p_quiz_mode text'), 'modos avançados devem ser validados no servidor');
assert.ok(migration.includes('revoke insert, update, delete on public.user_feature_monthly_usage from authenticated'), 'o usuário não pode alterar a própria cota');
assert.ok(migration.includes('public.consume_material_access') && migration.includes('auth.uid()'), 'o consumo de apostila deve exigir identidade autenticada');
assert.ok(migration.includes('grant execute on function private.consume_quiz_access(integer, text, text, text) to authenticated, service_role') && migration.includes('grant execute on function private.consume_material_access(integer) to authenticated, service_role'), 'os RPCs SECURITY INVOKER devem conseguir delegar para as implementacoes privadas autenticadas');
assert.ok(app.includes("p_difficulty: options.difficulty") && app.includes("p_quiz_mode: options.quizMode") && app.includes(".rpc('consume_material_access'"), 'o aplicativo deve enviar as regras ao servidor');
assert.ok(material.includes('async function ensureCreationAccess') && material.includes('await ensureCreationAccess(text)'), 'resumo e quiz da apostila devem consumir uma única cota da sessão');
assert.ok(avatar.includes("premium: true") && app.includes('hasPremiumAvatarAccess'), 'itens avançados do avatar devem respeitar o plano');
assert.ok(html.includes('id="premium-report-upgrade"') && html.includes('data-premium-report'), 'relatórios detalhados devem ter bloqueio visível');
assert.ok(app.includes('1 estudo de apostila por mês') && app.includes('10 estudos de apostila por mês') && app.includes('30 estudos de apostila por mês'), 'a oferta deve mostrar limites objetivos');
assert.ok(!app.includes('Até 4 perfis de estudante'), 'o plano Família não deve prometer perfis ainda inexistentes');

console.log('plan-entitlement-enforcement.test.js: limites Free, Premium e Família verificados');
