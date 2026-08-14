const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const app = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
const admin = fs.readFileSync(path.join(root, 'admin-panel.js'), 'utf8');
const essay = fs.readFileSync(path.join(root, 'supabase/functions/correct-essay/index.ts'), 'utf8');
const migration = fs.readFileSync(path.join(root, 'access-grants-migration.sql'), 'utf8');

assert.ok(html.includes('id="admin-user-access-level"') && html.includes('id="admin-save-user-access"'), 'o painel deve permitir configurar o acesso individual');
assert.ok(html.includes('Questões e trilhas ilimitadas') && html.includes('Correções de redação sem créditos'), 'o acesso parcial deve listar permissões claras');
assert.ok(admin.includes(".rpc('admin_get_user_access'") && admin.includes(".rpc('admin_set_user_access'"), 'a administração deve ler e salvar concessões pelo servidor');
assert.ok(app.includes(".rpc('get_my_access_entitlements'") && app.includes('essayWithoutCredits'), 'o aplicativo deve consumir a permissão autoritativa');
assert.ok(migration.includes('create table if not exists public.user_access_grants') && migration.includes('enable row level security'), 'as concessões devem ter tabela protegida por RLS');
assert.ok(migration.includes("v_is_admin then v_source := 'admin'") && migration.includes("v_charge := 0"), 'administradores devem ter acesso total e redação sem crédito');
assert.ok(migration.includes('private.admin_set_user_access') && migration.includes('private.current_user_is_admin()'), 'somente um administrador deve alterar acessos');
assert.ok(essay.includes(".from('user_access_grants')") && essay.includes('essayIncluded'), 'a função de redação deve conferir o acesso no backend');

console.log('admin-access-grants.test.js: acesso administrativo e concessões verificados');
