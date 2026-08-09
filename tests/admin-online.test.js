const fs = require('fs');
const path = require('path');
const assert = require('assert');

const root = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const admin = fs.readFileSync(path.join(root, 'admin-panel.js'), 'utf8');
const css = fs.readFileSync(path.join(root, 'purple-modern-theme.css'), 'utf8');
const security = fs.readFileSync(path.join(root, 'security-hardening-migration.sql'), 'utf8');

assert.ok(html.includes('id="admin-online-users"') && html.includes('data-admin-tab="online"'), 'o painel deve mostrar a quantidade e a aba de usuários online');
assert.ok(html.includes('id="admin-online-list"') && html.includes('PRESENÇA EM TEMPO REAL'), 'a lista online deve explicar o monitoramento ao administrador');
assert.ok(admin.includes("from('user_presence').select('user_id, online, last_seen')"), 'a lista deve usar a presença registrada no Supabase');
assert.ok(admin.includes("Date.now() - 120000") && admin.includes(".gte('last_seen', cutoff)"), 'presenças antigas não devem aparecer como online');
assert.ok(admin.includes("table: 'user_presence'") && admin.includes('startOnlineMonitoring()'), 'a lista deve receber atualizações em tempo real');
assert.ok(admin.includes("setInterval(scheduleOnlineRefresh, 30000)"), 'o painel deve confirmar periodicamente quem continua online');
assert.ok(css.includes('.admin-online-list') && css.includes('.admin-online-live-status'), 'a área online deve ter apresentação visual própria e responsiva');
assert.ok(security.includes('drop policy if exists "Administrador vê presenças"') && security.includes('private.current_user_is_admin()'), 'somente administradores autenticados devem visualizar todas as presenças');

console.log('admin-online.test.js: todos os testes passaram');
