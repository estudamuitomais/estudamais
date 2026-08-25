const fs = require('fs');
const path = require('path');
const assert = require('assert');

const root = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const app = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
const css = fs.readFileSync(path.join(root, 'purple-modern-theme.css'), 'utf8');
const setupSql = fs.readFileSync(path.join(root, 'supabase-setup.sql'), 'utf8');
const migrationSql = fs.readFileSync(path.join(root, 'leaderboard-migration.sql'), 'utf8');

assert.ok(html.includes('id="global-leaderboard-title"') && html.includes('id="leaderboard-list"'), 'a lateral da trilha deve exibir o ranking geral');
assert.ok(html.includes('id="mobile-global-leaderboard-title"') && html.includes('id="mobile-leaderboard-list"'), 'o ranking também deve aparecer no mobile');

assert.ok(app.includes("answered_total, correct_total, streak_days") && app.includes("{ count: 'exact' }"), 'o app deve ler as estatísticas e a quantidade de participantes do ranking');
assert.ok(app.includes("renderLeaderboardHighlights('Ranking geral sendo preparado para todos os estudantes.')"), 'o app deve ter fallback quando a estrutura do ranking ainda não existir');
assert.ok(app.includes("Você também lidera o ranking geral") || app.includes("Voce tambem lidera o ranking geral"), 'o perfil deve refletir quando o usuário lidera o ranking');

assert.ok(css.includes('.rail-leaderboard') && css.includes('.setup-mobile-leaderboard'), 'o ranking precisa ter estilos dedicados para desktop e mobile');
assert.ok(css.includes('.leaderboard-row.current-user') && css.includes('.leaderboard-crown'), 'o líder e o usuário atual devem ter destaque visual');
assert.ok(html.includes('id="leaderboard-stats"') && html.includes('id="profile-ranking-accuracy"'), 'ranking e perfil devem apresentar estatísticas reais');

assert.ok(setupSql.includes('create table if not exists public.public_leaderboard'), 'novas instalações devem criar a tabela do ranking público');
assert.ok(setupSql.includes('create policy "Usuários veem o ranking global"'), 'a política do ranking precisa permitir leitura segura a usuários autenticados');
assert.ok(setupSql.includes('create trigger sync_public_leaderboard_from_profiles'), 'o ranking deve sincronizar automaticamente com os perfis');

assert.ok(migrationSql.includes('public.public_leaderboard') && migrationSql.includes('sync_public_leaderboard_from_profiles'), 'projetos já existentes devem ter uma migração pronta do ranking');
assert.ok(migrationSql.includes('answered_total') && migrationSql.includes('correct_total') && migrationSql.includes('streak_days'), 'a migração deve sincronizar questões, acertos e sequência');

console.log('leaderboard.test.js: todos os testes passaram');
