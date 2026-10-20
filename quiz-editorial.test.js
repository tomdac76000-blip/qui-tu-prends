import {quizBank} from './quiz-content.js';
import {test} from 'node:test';
import assert from 'node:assert/strict';
test('Catalogue : TCG jouable et exclusion du questionnaire informatique',()=>{assert.equal(quizBank.filter(q=>q.theme==='tcg').length,39);assert.ok(quizBank.filter(q=>q.theme==='tcg'&&q.format!=='link').every(q=>/Magic|Pokémon|Pok.mon|Yu.Gi.Oh|One Piece|Lorcana/i.test(q.text)));assert.ok(quizBank.every(q=>q.theme!=='internet'));assert.ok(!quizBank.some(q=>/\bHTTP\b|\bPNG\b|\bJSON\b|\bHTML\b|\bCSS\b|\bIPv4\b|\bGitHub\b/.test(q.text)));assert.ok(!quizBank.some(q=>q.text.startsWith('Donne cinq noms différents. Chaque réponse doit être')));});
