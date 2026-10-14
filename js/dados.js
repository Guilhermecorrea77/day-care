/* =====================================================================
 * dados.js — modelo de dados do Diário do Bebê (sem tela).
 * Testado em tests/dados.test.js
 *
 * banco = {
 *   v: 2,
 *   criancas: [{ id, nome, foto, nasc: 'AAAA-MM-DD', obs }],
 *   registros: { [criancaId]: { ['AAAA-MM-DD']: { eventos: [...], recado, tia } } },
 *   config: { tema: 'system'|'light'|'dark', tia: '' }
 * }
 * evento = { id, tipo, hora: 'HH:MM', ...campos do tipo }
 * ===================================================================== */

export const VERSAO = 2;

export const TIPOS = {
    mamadeira:   { nome: 'Mamadeira',   icone: '🍼', cor: 'laranja' },
    refeicao:    { nome: 'Refeição',    icone: '🍽️', cor: 'laranja' },
    agua:        { nome: 'Água',        icone: '💧', cor: 'turquesa' },
    sono:        { nome: 'Sono',        icone: '😴', cor: 'azul' },
    fralda:      { nome: 'Fralda',      icone: '🧷', cor: 'turquesa' },
    banho:       { nome: 'Banho',       icone: '🛁', cor: 'turquesa' },
    remedio:     { nome: 'Remédio',     icone: '💊', cor: 'lilas' },
    temperatura: { nome: 'Temperatura', icone: '🌡️', cor: 'rosa' },
    humor:       { nome: 'Humor',       icone: '😊', cor: 'amarelo' },
    atividade:   { nome: 'Atividade',   icone: '🎨', cor: 'amarelo' },
};

export const ACEITACAO = ['Tudo', 'Bastante', 'Metade', 'Pouco', 'Recusou'];
export const REFEICOES = ['Café da manhã', 'Lanche', 'Almoço', 'Fruta', 'Jantar', 'Sobremesa'];
export const HUMORES = [
    { id: 'feliz', icone: '😄', nome: 'Feliz' }, { id: 'calmo', icone: '😌', nome: 'Calmo' },
    { id: 'sonolento', icone: '🥱', nome: 'Sonolento' }, { id: 'choroso', icone: '😢', nome: 'Choroso' },
    { id: 'agitado', icone: '😣', nome: 'Agitado' },
];
export const ATIVIDADES = ['Brincadeira livre', 'Pintura', 'Música', 'Parquinho', 'Leitura', 'Massinha', 'Banho de sol'];
export const CONSISTENCIA = ['Normal', 'Mole', 'Duro'];

// ---------------- datas e horas (sempre no horário local) ----------------
const pad = (n) => String(n).padStart(2, '0');
export const iso = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const deIso = (s) => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
export const hoje = (agora = new Date()) => iso(agora);
export const horaAgora = (agora = new Date()) => `${pad(agora.getHours())}:${pad(agora.getMinutes())}`;
export const addDias = (s, n) => { const d = deIso(s); d.setDate(d.getDate() + n); return iso(d); };
export const minutos = (hhmm) => { if (!/^\d{1,2}:\d{2}$/.test(hhmm || '')) return null; const [h, m] = hhmm.split(':').map(Number); return h * 60 + m; };

export function fmtDuracao(min) {
    if (min == null) return '—';
    const h = Math.floor(min / 60), m = Math.round(min % 60);
    if (!h) return `${m} min`;
    return m ? `${h}h${pad(m)}` : `${h}h`;
}

const DIAS = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'];
const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
export const nomeMes = (m) => MESES[m];
export const fmtDataLonga = (s) => { const d = deIso(s); return `${DIAS[d.getDay()]}, ${d.getDate()} de ${MESES[d.getMonth()]}`; };
export const fmtDataCurta = (s) => { const d = deIso(s); return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}`; };

/** Idade em linguagem natural: "3 semanas", "8 meses", "1 ano e 2 meses". */
export function idade(nasc, ref = hoje()) {
    if (!nasc) return '';
    const a = deIso(nasc), b = deIso(ref);
    if (b < a) return '';
    let meses = (b.getFullYear() - a.getFullYear()) * 12 + (b.getMonth() - a.getMonth());
    if (b.getDate() < a.getDate()) meses--;
    if (meses < 1) {
        const dias = Math.round((b - a) / 864e5);
        const sem = Math.floor(dias / 7);
        return sem >= 1 ? `${sem} ${sem === 1 ? 'semana' : 'semanas'}` : `${dias} ${dias === 1 ? 'dia' : 'dias'}`;
    }
    const anos = Math.floor(meses / 12), m = meses % 12;
    if (!anos) return `${m} ${m === 1 ? 'mês' : 'meses'}`;
    const ta = `${anos} ${anos === 1 ? 'ano' : 'anos'}`;
    return m ? `${ta} e ${m} ${m === 1 ? 'mês' : 'meses'}` : ta;
}

// ---------------- banco ----------------
export const novoId = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);

export function bancoVazio() {
    return { v: VERSAO, salas: [], criancas: [], registros: {}, config: { tema: 'system', tia: '' } };
}

// ---------------- salas / turmas e alunos ----------------
export const CORES_SALA = ['lilas', 'turquesa', 'laranja', 'azul', 'rosa', 'amarelo'];

/** Garante os campos novos em bancos salvos por versões anteriores. */
export function normalizar(banco) {
    const b = structuredClone(banco);
    b.salas = Array.isArray(b.salas) ? b.salas : [];
    b.criancas = (b.criancas || []).map((c) => ({ salaId: '', arquivado: false, ...c }));
    b.config = { tema: 'system', tia: '', ...(b.config || {}) };
    if (b.config.salaFiltro && b.config.salaFiltro !== 'todas' && b.config.salaFiltro !== 'sem' && !b.salas.some((x) => x.id === b.config.salaFiltro)) b.config.salaFiltro = 'todas';
    return b;
}

export function criarSala(banco, { nome, professoras = '' }) {
    const b = structuredClone(banco);
    const id = novoId();
    b.salas.push({ id, nome: nome.trim(), professoras: professoras.trim(), cor: CORES_SALA[b.salas.length % CORES_SALA.length] });
    return { banco: b, id };
}

export function editarSala(banco, id, dados) {
    const b = structuredClone(banco);
    const s = b.salas.find((x) => x.id === id);
    if (s) Object.assign(s, { nome: (dados.nome ?? s.nome).trim(), professoras: (dados.professoras ?? s.professoras).trim() });
    return b;
}

/** Apaga a sala; os alunos dela ficam "sem sala" (nada é perdido). */
export function excluirSala(banco, id) {
    const b = structuredClone(banco);
    b.salas = b.salas.filter((x) => x.id !== id);
    for (const c of b.criancas) if (c.salaId === id) c.salaId = '';
    if (b.config.salaFiltro === id) b.config.salaFiltro = 'todas';
    return b;
}

/** Alunos ativos (não arquivados), opcionalmente de uma sala: 'todas', 'sem' (sem sala) ou o id. */
export function alunos(banco, filtro = 'todas') {
    return banco.criancas
        .filter((c) => !c.arquivado)
        .filter((c) => filtro === 'todas' || (filtro === 'sem' ? !c.salaId || !banco.salas.some((s) => s.id === c.salaId) : c.salaId === filtro))
        .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
}
export const arquivados = (banco) => banco.criancas.filter((c) => c.arquivado).sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));

function trocarAtualSePreciso(b, id) {
    if (b.config.atual !== id) return;
    const lista = alunos(b, b.config.salaFiltro || 'todas');
    b.config.atual = (lista[0] || alunos(b)[0])?.id;
}

/** Arquiva: some das listas, mas todos os registros continuam guardados. */
export function arquivar(banco, id, agora = hoje()) {
    const b = structuredClone(banco);
    const c = b.criancas.find((x) => x.id === id);
    if (c) { c.arquivado = true; c.arquivadoEm = agora; }
    trocarAtualSePreciso(b, id);
    return b;
}
export function desarquivar(banco, id) {
    const b = structuredClone(banco);
    const c = b.criancas.find((x) => x.id === id);
    if (c) { c.arquivado = false; delete c.arquivadoEm; }
    if (!b.config.atual || !alunos(b).some((x) => x.id === b.config.atual)) b.config.atual = id;
    return b;
}
/** Exclui de vez o aluno e todos os registros dele. */
export function excluirCrianca(banco, id) {
    const b = structuredClone(banco);
    b.criancas = b.criancas.filter((x) => x.id !== id);
    delete b.registros[id];
    trocarAtualSePreciso(b, id);
    return b;
}

export function diaVazio() { return { eventos: [], recado: '', tia: '' }; }

export function obterDia(banco, criancaId, data) {
    return banco.registros?.[criancaId]?.[data] || diaVazio();
}

/** Devolve o banco com o dia substituído (não altera o original). */
export function gravarDia(banco, criancaId, data, dia) {
    const b = structuredClone(banco);
    b.registros[criancaId] = b.registros[criancaId] || {};
    const vazio = !dia.eventos.length && !dia.recado?.trim();
    if (vazio) delete b.registros[criancaId][data];
    else b.registros[criancaId][data] = { ...dia, eventos: ordenar(dia.eventos) };
    return b;
}

export function ordenar(eventos) {
    return [...eventos].sort((a, b) => (minutos(a.hora) ?? 0) - (minutos(b.hora) ?? 0));
}

// ---------------- sono ----------------
/** Duração da soneca em minutos. Em andamento: conta até `agoraHHMM` (se informado). */
export function duracaoSono(ev, agoraHHMM = null) {
    const ini = minutos(ev.hora);
    const fim = minutos(ev.fim || agoraHHMM);
    if (ini == null || fim == null) return null;
    return fim >= ini ? fim - ini : fim + 1440 - ini; // passou da meia-noite
}
export const sonoEmAndamento = (dia) => dia.eventos.find((e) => e.tipo === 'sono' && !e.fim) || null;

// ---------------- temperatura ----------------
/** Referência para temperatura axilar (Sociedade Brasileira de Pediatria): febre a partir de 37,8 °C. */
export const fmtTemp = (t) => `${Number(t).toFixed(1).replace('.', ',')} °C`;

export function classificarTemp(t) {
    if (t === '' || t == null) return null;
    const v = Number(String(t).replace(',', '.'));
    if (!Number.isFinite(v)) return null;
    if (v >= 37.8) return { id: 'febre', nome: 'Febre' };
    if (v >= 37.3) return { id: 'elevada', nome: 'Temperatura elevada' };
    if (v < 35.5) return { id: 'baixa', nome: 'Temperatura baixa' };
    return { id: 'normal', nome: 'Normal' };
}

// ---------------- resumos ----------------
export function resumoDia(dia, { agora = null } = {}) {
    const ev = dia.eventos || [];
    const r = {
        vazio: !ev.length && !dia.recado?.trim(),
        sonoMin: 0, sonecas: 0, dormindo: null,
        refeicoes: 0, aceitacao: Object.fromEntries(ACEITACAO.map((a) => [a, 0])),
        mamadeiraMl: 0, mamadeiras: 0, aguaMl: 0,
        fraldas: 0, xixi: 0, coco: 0, cocoTipos: [],
        banho: false, remedios: [], temperaturas: [], febre: null, maiorTemp: null,
        humor: null, atividades: [],
    };
    for (const e of ev) {
        switch (e.tipo) {
            case 'sono': {
                const d = duracaoSono(e, e.fim ? null : agora);
                if (d != null) r.sonoMin += d;
                r.sonecas++;
                if (!e.fim) r.dormindo = e;
                break;
            }
            case 'refeicao': r.refeicoes++; if (e.aceitacao in r.aceitacao) r.aceitacao[e.aceitacao]++; break;
            case 'mamadeira': r.mamadeiras++; r.mamadeiraMl += Number(e.ml) || 0; if (e.aceitacao in r.aceitacao) r.aceitacao[e.aceitacao]++; break;
            case 'agua': r.aguaMl += Number(e.ml) || 0; break;
            case 'fralda':
                r.fraldas++;
                if (e.xixi) r.xixi++;
                if (e.coco) { r.coco++; if (e.consistencia) r.cocoTipos.push(e.consistencia); }
                break;
            case 'banho': r.banho = true; break;
            case 'remedio': r.remedios.push(e); break;
            case 'temperatura': {
                r.temperaturas.push(e);
                const t = Number(e.temp);
                if (Number.isFinite(t) && (r.maiorTemp == null || t > r.maiorTemp)) r.maiorTemp = t;
                if (classificarTemp(e.temp)?.id === 'febre' && (!r.febre || t > Number(r.febre.temp))) r.febre = e;
                break;
            }
            case 'humor': r.humor = e; break;
            case 'atividade': r.atividades.push(e); break;
            default: break;
        }
    }
    return r;
}

/** Um item por dia do mês, para o calendário e os gráficos. */
export function resumoMes(registrosCrianca = {}, ano, mes) {
    const nDias = new Date(ano, mes + 1, 0).getDate();
    const dias = [];
    for (let d = 1; d <= nDias; d++) {
        const data = `${ano}-${pad(mes + 1)}-${pad(d)}`;
        const dia = registrosCrianca[data];
        if (!dia) { dias.push({ data, d, tem: false }); continue; }
        const r = resumoDia(dia);
        dias.push({ data, d, tem: !r.vazio, sonoMin: r.sonoMin, fraldas: r.fraldas, coco: r.coco, febre: !!r.febre, remedio: r.remedios.length > 0, humor: r.humor?.humor || null, refeicoes: r.refeicoes + r.mamadeiras });
    }
    const comDados = dias.filter((x) => x.tem);
    const media = (k) => (comDados.length ? comDados.reduce((s, x) => s + (x[k] || 0), 0) / comDados.length : null);
    return {
        dias, diasComRegistro: comDados.length,
        mediaSonoMin: media('sonoMin'), mediaFraldas: media('fraldas'),
        diasFebre: comDados.filter((x) => x.febre).map((x) => x.d),
        diasRemedio: comDados.filter((x) => x.remedio).map((x) => x.d),
    };
}

// ---------------- descrição de cada evento (para tela e WhatsApp) ----------------
export function descrever(e, { agora = null } = {}) {
    switch (e.tipo) {
        case 'mamadeira': return [e.ml ? `${e.ml} ml` : 'Mamadeira', e.aceitacao && e.aceitacao !== 'Tudo' ? `aceitou: ${e.aceitacao.toLowerCase()}` : e.aceitacao ? 'tomou tudo' : '', e.obs].filter(Boolean).join(' · ');
        case 'refeicao': return [e.refeicao || 'Refeição', e.aceitacao ? (e.aceitacao === 'Recusou' ? 'recusou' : `comeu ${e.aceitacao.toLowerCase()}`) : '', e.obs].filter(Boolean).join(' · ');
        case 'agua': return e.ml ? `${e.ml} ml de água` : 'Água';
        case 'sono': {
            const d = duracaoSono(e, e.fim ? null : agora);
            if (!e.fim) return `Dormindo desde ${e.hora}${d != null ? ` (${fmtDuracao(d)})` : ''}`;
            return [`Dormiu ${fmtDuracao(d)}`, `até ${e.fim}`, e.obs].filter(Boolean).join(' · ');
        }
        case 'fralda': {
            const p = [];
            if (e.xixi) p.push('xixi');
            if (e.coco) p.push(`cocô${e.consistencia && e.consistencia !== 'Normal' ? ` (${e.consistencia.toLowerCase()})` : ''}`);
            return [`Troca de fralda${p.length ? `: ${p.join(' e ')}` : ''}`, e.obs].filter(Boolean).join(' · ');
        }
        case 'banho': return e.obs || 'Tomou banho';
        case 'remedio': return [e.nome || 'Remédio', e.dose, e.obs].filter(Boolean).join(' · ');
        case 'temperatura': {
            const c = classificarTemp(e.temp);
            return [fmtTemp(e.temp), c && c.id !== 'normal' ? c.nome.toLowerCase() : '', e.obs].filter(Boolean).join(' · ');
        }
        case 'humor': { const h = HUMORES.find((x) => x.id === e.humor); return [h ? `${h.icone} ${h.nome}` : 'Humor', e.obs].filter(Boolean).join(' · '); }
        case 'atividade': return [e.atividade || 'Atividade', e.obs].filter(Boolean).join(' · ');
        default: return e.obs || '';
    }
}

// ---------------- texto para enviar aos pais ----------------
export function textoWhatsApp(crianca, data, dia) {
    const r = resumoDia(dia);
    const linhas = [`*O dia de ${crianca.nome}* — ${fmtDataLonga(data)}`, ''];
    if (r.febre) linhas.push(`⚠️ *Febre:* ${fmtTemp(r.febre.temp)} às ${r.febre.hora}${r.febre.obs ? ` — ${r.febre.obs}` : ''}`);
    for (const m of r.remedios) linhas.push(`💊 *Remédio:* ${descrever(m)} às ${m.hora}`);
    if (r.febre || r.remedios.length) linhas.push('');
    const resumo = [];
    if (r.sonecas) resumo.push(`😴 Sono: ${fmtDuracao(r.sonoMin)} (${r.sonecas} ${r.sonecas === 1 ? 'soneca' : 'sonecas'})`);
    if (r.refeicoes) resumo.push(`🍽️ Refeições: ${r.refeicoes}`);
    if (r.mamadeiras) resumo.push(`🍼 Mamadeiras: ${r.mamadeiras}${r.mamadeiraMl ? ` (${r.mamadeiraMl} ml)` : ''}`);
    if (r.fraldas) resumo.push(`🧷 Fraldas: ${r.fraldas}${r.coco ? ` (${r.coco} com cocô)` : ''}`);
    if (r.banho) resumo.push('🛁 Tomou banho');
    if (resumo.length) linhas.push(...resumo, '');
    const outros = ordenar(dia.eventos).filter((e) => e.tipo !== 'remedio' && !(r.febre && e.id === r.febre.id));
    if (outros.length) {
        linhas.push('*Linha do dia*');
        for (const e of outros) linhas.push(`${e.hora} ${TIPOS[e.tipo]?.icone || '•'} ${descrever(e)}`);
        linhas.push('');
    }
    if (dia.recado?.trim()) linhas.push(`📝 *Recado:* ${dia.recado.trim()}`);
    if (dia.tia?.trim()) linhas.push(`— ${dia.tia.trim()}`);
    return linhas.join('\n').replace(/\n{3,}/g, '\n\n').trim();
}

// ---------------- migração da versão antiga (babyDiaryReports) ----------------
export function migrarV1(relatorios) {
    const reg = {};
    const id = () => novoId();
    for (const [data, r] of Object.entries(relatorios || {})) {
        if (!/^\d{4}-\d{2}-\d{2}$/.test(data) || !r) continue;
        const ev = [];
        for (const f of r.feeding || []) {
            const tipo = f.type === 'Mamadeira' ? 'mamadeira' : f.type === 'Água' ? 'agua' : 'refeicao';
            const base = { id: id(), tipo, hora: f.time || '00:00' };
            if (tipo === 'refeicao') ev.push({ ...base, refeicao: f.type, obs: [f.quantity, f.description].filter(Boolean).join(' · ') });
            else ev.push({ ...base, ml: parseInt(f.quantity, 10) || '', obs: f.description || '' });
        }
        for (const m of r.medication || []) ev.push({ id: id(), tipo: 'remedio', hora: m.time || '00:00', nome: m.name || '', dose: m.quantity || '' });
        if (r.fever && (r.fever.temp || r.fever.time)) ev.push({ id: id(), tipo: 'temperatura', hora: r.fever.time || '00:00', temp: Number(r.fever.temp) || '', obs: r.fever.procedure || '' });
        const h = r.hygiene || {};
        const trocas = parseInt(h.diaperChanges, 10) || 0, cocos = parseInt(h.poopCount, 10) || 0;
        for (let i = 0; i < Math.max(trocas, cocos); i++) {
            ev.push({ id: id(), tipo: 'fralda', hora: '00:00', xixi: i < trocas, coco: i < cocos, consistencia: i < cocos ? (h.poopConsistency?.[0] ? h.poopConsistency[0][0].toUpperCase() + h.poopConsistency[0].slice(1) : '') : '', obs: 'importado (sem horário)' });
        }
        if (h.bath) ev.push({ id: id(), tipo: 'banho', hora: '00:00', obs: 'importado (sem horário)' });
        for (const s of r.sleep || []) {
            // A versão antiga só tinha horário + texto ("Dormiu por 1h30"): tenta achar a duração no texto.
            const ini = s.time || '00:00';
            const m = /(\d+)\s*h(?:\s*(\d+))?|(\d+)\s*min/i.exec(s.description || '');
            const dur = m ? (m[1] ? Number(m[1]) * 60 + Number(m[2] || 0) : Number(m[3])) : 0;
            const fimMin = ((minutos(ini) ?? 0) + dur) % 1440;
            ev.push({ id: id(), tipo: 'sono', hora: ini, fim: `${pad(Math.floor(fimMin / 60))}:${pad(fimMin % 60)}`, obs: s.description || '' });
        }
        const dia = { eventos: ordenar(ev), recado: r.notes?.message || '', tia: r.notes?.caregiver || '' };
        if (dia.eventos.length || dia.recado) reg[data] = dia;
    }
    return reg;
}
