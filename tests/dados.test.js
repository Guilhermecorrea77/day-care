import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as D from '../js/dados.js';

const ev = (tipo, hora, extra = {}) => ({ id: `${tipo}${hora}`, tipo, hora, ...extra });

test('data local de hoje (não usa UTC)', () => {
    // 22h em São Paulo já é dia seguinte em UTC; o diário deve continuar no dia local
    const d = new Date(2026, 9, 13, 22, 30);
    assert.equal(D.hoje(d), '2026-10-13');
    assert.equal(D.horaAgora(d), '22:30');
});

test('duração do sono, inclusive em andamento e passando da meia-noite', () => {
    assert.equal(D.duracaoSono(ev('sono', '12:10', { fim: '13:40' })), 90);
    assert.equal(D.duracaoSono(ev('sono', '23:30', { fim: '00:15' })), 45);
    assert.equal(D.duracaoSono(ev('sono', '14:00'), '14:25'), 25);
    assert.equal(D.duracaoSono(ev('sono', '14:00')), null);
});

test('formatação de duração', () => {
    assert.equal(D.fmtDuracao(45), '45 min');
    assert.equal(D.fmtDuracao(90), '1h30');
    assert.equal(D.fmtDuracao(120), '2h');
});

test('idade em linguagem natural', () => {
    assert.equal(D.idade('2026-01-13', '2026-10-13'), '9 meses');
    assert.equal(D.idade('2025-08-01', '2026-10-13'), '1 ano e 2 meses');
    assert.equal(D.idade('2026-09-22', '2026-10-13'), '3 semanas');
    assert.equal(D.idade('2024-10-13', '2026-10-13'), '2 anos');
});

test('classificação da temperatura', () => {
    assert.equal(D.classificarTemp(36.5).id, 'normal');
    assert.equal(D.classificarTemp(37.5).id, 'elevada');
    assert.equal(D.classificarTemp('37.8').id, 'febre');
    assert.equal(D.classificarTemp(''), null);
});

test('resumo do dia', () => {
    const dia = { eventos: [
        ev('sono', '09:00', { fim: '10:00' }), ev('sono', '13:00', { fim: '14:30' }),
        ev('refeicao', '11:00', { refeicao: 'Almoço', aceitacao: 'Metade' }),
        ev('mamadeira', '15:00', { ml: 150, aceitacao: 'Tudo' }),
        ev('fralda', '10:05', { xixi: true, coco: true, consistencia: 'Mole' }),
        ev('fralda', '14:40', { xixi: true }),
        ev('temperatura', '15:30', { temp: 38.1 }), ev('temperatura', '16:30', { temp: 37.2 }),
        ev('remedio', '15:35', { nome: 'Paracetamol', dose: '5 gotas' }),
        ev('banho', '16:00'),
    ], recado: 'Dia tranquilo', tia: 'Tia Ana' };
    const r = D.resumoDia(dia);
    assert.equal(r.sonoMin, 150);
    assert.equal(r.sonecas, 2);
    assert.equal(r.refeicoes, 1);
    assert.equal(r.mamadeiraMl, 150);
    assert.equal(r.fraldas, 2);
    assert.equal(r.coco, 1);
    assert.equal(r.febre.temp, 38.1);
    assert.equal(r.maiorTemp, 38.1);
    assert.equal(r.remedios.length, 1);
    assert.equal(r.banho, true);
    assert.equal(r.vazio, false);
});

test('soneca em andamento aparece no resumo', () => {
    const r = D.resumoDia({ eventos: [ev('sono', '13:00')] }, { agora: '13:40' });
    assert.equal(r.sonoMin, 40);
    assert.ok(r.dormindo);
});

test('gravarDia ordena por horário, não altera o original e remove dias vazios', () => {
    let b = D.bancoVazio();
    b.criancas.push({ id: 'c1', nome: 'Alice' });
    const b2 = D.gravarDia(b, 'c1', '2026-10-13', { eventos: [ev('banho', '16:00'), ev('agua', '08:00', { ml: 50 })], recado: '' });
    assert.deepEqual(b2.registros.c1['2026-10-13'].eventos.map((e) => e.hora), ['08:00', '16:00']);
    assert.equal(b.registros.c1, undefined);
    const b3 = D.gravarDia(b2, 'c1', '2026-10-13', D.diaVazio());
    assert.equal(b3.registros.c1['2026-10-13'], undefined);
});

test('resumo do mês', () => {
    const reg = {
        '2026-10-01': { eventos: [ev('sono', '13:00', { fim: '15:00' }), ev('fralda', '10:00', { xixi: true })] },
        '2026-10-02': { eventos: [ev('temperatura', '10:00', { temp: 38 }), ev('remedio', '10:05', { nome: 'X' })] },
    };
    const m = D.resumoMes(reg, 2026, 9);
    assert.equal(m.dias.length, 31);
    assert.equal(m.diasComRegistro, 2);
    assert.deepEqual(m.diasFebre, [2]);
    assert.deepEqual(m.diasRemedio, [2]);
    assert.equal(m.mediaSonoMin, 60);
});

test('texto do WhatsApp destaca febre e remédio e inclui o recado', () => {
    const dia = { eventos: [
        ev('refeicao', '11:00', { refeicao: 'Almoço', aceitacao: 'Tudo' }),
        ev('temperatura', '15:30', { temp: 38.1, obs: 'pais avisados' }),
        ev('remedio', '15:35', { nome: 'Paracetamol', dose: '5 gotas' }),
    ], recado: 'Mandar fraldas amanhã', tia: 'Tia Ana' };
    const t = D.textoWhatsApp({ nome: 'Alice' }, '2026-10-13', dia);
    assert.match(t, /^\*O dia de Alice\* — terça, 13 de outubro/);
    assert.match(t, /⚠️ \*Febre:\* 38,1 °C às 15:30 — pais avisados/);
    assert.match(t, /💊 \*Remédio:\* Paracetamol · 5 gotas às 15:35/);
    assert.match(t, /11:00 🍽️ Almoço · comeu tudo/);
    assert.match(t, /📝 \*Recado:\* Mandar fraldas amanhã/);
    assert.match(t, /— Tia Ana$/);
    assert.doesNotMatch(t, /15:30 🌡️/); // febre não se repete na linha do dia
});

test('migração dos dados da versão antiga', () => {
    const antigo = {
        '2025-10-10': {
            feeding: [{ type: 'Almoço', time: '11:30', quantity: 'meio prato', description: 'Aceitou bem' }, { type: 'Mamadeira', time: '15:00', quantity: '150ml', description: '' }],
            medication: [{ name: 'Paracetamol', quantity: '5ml', time: '14:00' }],
            fever: { time: '13:50', temp: '38.2', procedure: 'Medicado' },
            hygiene: { poopCount: '1', poopConsistency: ['mole'], bath: true, diaperChanges: '3' },
            sleep: [{ time: '12:30', description: 'Dormiu por 1h30' }],
            notes: { message: 'Tudo bem', caregiver: 'Tia Bia' },
        },
        '2025-10-11': { feeding: [], medication: [], fever: null, hygiene: { poopCount: 0, poopConsistency: [], bath: false, diaperChanges: 0 }, sleep: [], notes: { message: '', caregiver: '' } },
    };
    const reg = D.migrarV1(antigo);
    assert.deepEqual(Object.keys(reg), ['2025-10-10']);
    const r = D.resumoDia(reg['2025-10-10']);
    assert.equal(r.refeicoes, 1);
    assert.equal(r.mamadeiraMl, 150);
    assert.equal(r.remedios[0].nome, 'Paracetamol');
    assert.equal(r.febre.temp, 38.2);
    assert.equal(r.fraldas, 3);
    assert.equal(r.coco, 1);
    assert.equal(r.banho, true);
    assert.equal(r.sonoMin, 90);
    assert.equal(reg['2025-10-10'].tia, 'Tia Bia');
});

test('salas: criar, filtrar alunos e excluir sala sem perder alunos', () => {
    let b = D.normalizar(D.bancoVazio());
    let r = D.criarSala(b, { nome: 'Berçário 1', professoras: 'Tia Ana' }); b = r.banco; const s1 = r.id;
    r = D.criarSala(b, { nome: 'Maternal', professoras: 'Tia Bia' }); b = r.banco; const s2 = r.id;
    b.criancas.push({ id: 'a', nome: 'Alice', salaId: s1 }, { id: 'b', nome: 'Bento', salaId: s2 }, { id: 'c', nome: 'Caio', salaId: '' });
    b = D.normalizar(b);
    assert.deepEqual(D.alunos(b, s1).map((c) => c.id), ['a']);
    assert.deepEqual(D.alunos(b, 'sem').map((c) => c.id), ['c']);
    assert.deepEqual(D.alunos(b).map((c) => c.nome), ['Alice', 'Bento', 'Caio']);
    b = D.editarSala(b, s1, { nome: 'Berçário A' });
    assert.equal(b.salas[0].nome, 'Berçário A');
    b.config.salaFiltro = s2;
    b = D.excluirSala(b, s2);
    assert.equal(b.criancas.find((c) => c.id === 'b').salaId, '');
    assert.equal(b.config.salaFiltro, 'todas');
    assert.deepEqual(D.alunos(b, 'sem').map((c) => c.id), ['b', 'c']);
});

test('arquivar guarda os registros; restaurar devolve; excluir apaga tudo', () => {
    let b = D.normalizar(D.bancoVazio());
    b.criancas.push({ id: 'a', nome: 'Alice' }, { id: 'b', nome: 'Bento' });
    b.registros.a = { '2026-10-13': { eventos: [{ id: 'x', tipo: 'banho', hora: '10:00' }], recado: '' } };
    b.config.atual = 'a';
    b = D.arquivar(D.normalizar(b), 'a', '2026-10-13');
    assert.deepEqual(D.alunos(b).map((c) => c.id), ['b']);
    assert.deepEqual(D.arquivados(b).map((c) => c.id), ['a']);
    assert.equal(b.config.atual, 'b');
    assert.ok(b.registros.a['2026-10-13']);
    b = D.desarquivar(b, 'a');
    assert.deepEqual(D.alunos(b).map((c) => c.id), ['a', 'b']);
    b = D.excluirCrianca(b, 'a');
    assert.equal(b.registros.a, undefined);
    assert.deepEqual(b.criancas.map((c) => c.id), ['b']);
});

test('normalizar banco antigo (sem salas)', () => {
    const b = D.normalizar({ v: 2, criancas: [{ id: 'a', nome: 'Alice' }], registros: {}, config: { tema: 'dark' } });
    assert.deepEqual(b.salas, []);
    assert.equal(b.criancas[0].arquivado, false);
    assert.equal(b.config.tema, 'dark');
});
