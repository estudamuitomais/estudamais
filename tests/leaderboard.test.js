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

assert.ok(app.includes("from('public_leaderboard').select('user_id, display_name, avatar, points, school_year')"), 'o app deve ler o ranking global da tabela pública');
assert.ok(app.includes("renderLeaderboardHighlights('Ranking geral sendo preparado para todos os estudantes.')"), 'o app deve ter fallback quando a estrutura do ranking ainda não existir');
assert.ok(app.includes("Você também lidera o ranking geral") || app.includes("Voce tambem lidera o ranking geral"), 'o perfil deve refletir quando o usuário lidera o ranking');

assert.ok(css.includes('.rail-leaderboard') && css.includes('.setup-mobile-leaderboard'), 'o ranking precisa ter estilos dedicados para desktop e mobile');
assert.ok(css.includes('.leaderboard-row.current-user') && css.includes('.leaderboard-crown'), 'o líder e o usuário atual devem ter destaque visual');

assert.ok(setupSql.includes('create table if not exists public.public_leaderboard'), 'novas instalações devem criar a tabela do ranking público');
assert.ok(setupSql.includes('create policy "Usuários veem o ranking global"'), 'a política do ranking precisa permitir leitura segura a usuários autenticados');
assert.ok(setupSql.includes('create trigger sync_public_leaderboard_from_profiles'), 'o ranking deve sincronizar automaticamente com os perfis');

assert.ok(migrationSql.includes('public.public_leaderboard') && migrationSql.includes('sync_public_leaderboard_from_profiles'), 'projetos já existentes devem ter uma migração pronta do ranking');

console.log('leaderboard.test.js: todos os testes passaram');
