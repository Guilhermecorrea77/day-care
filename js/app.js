/* =====================================================================
 * app.js — telas do Diário do Bebê.
 * Tudo fica salvo no próprio navegador (localStorage), a cada toque.
 * ===================================================================== */
import * as D from './dados.js';

const CHAVE = 'diarioBebe:v2';
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const app = $('#app');

const ABAS = [
    { id: 'registrar', ic: '✏️', nome: 'Registrar' },
    { id: 'dia', ic: '📖', nome: 'Dia' },
    { id: 'mes', ic: '🗓️', nome: 'Mês' },
    { id: 'criancas', ic: '👶', nome: 'Crianças' },
];
const CORES_AVATAR = ['c-lilas', 'c-turquesa', 'c-laranja', 'c-azul', 'c-rosa', 'c-amarelo'];
const ADESIVOS = ['mamadeira', 'refeicao', 'agua', 'sono', 'fralda', 'banho', 'remedio', 'temperatura', 'atividade'];

// ===================== dados =====================
function carregar() {
    try {
        const b = JSON.parse(localStorage.getItem(CHAVE) || 'null');
        if (b && b.v === D.VERSAO) return b;
    } catch (e) { /* segue */ }
    const b = D.bancoVazio();
    // Traz os registros da versão antiga, se houver.
    try {
        const antigos = JSON.parse(localStorage.getItem('babyDiaryReports') || 'null');
        if (antigos && Object.keys(antigos).length) {
            const cfg = JSON.parse(localStorage.getItem('babyDiarySettings') || '{}');
            const id = D.novoId();
            b.criancas.push({ id, nome: 'Meu bebê', foto: cfg.babyPhoto || '', nasc: '', obs: '' });
            b.registros[id] = D.migrarV1(antigos);
            b.config.atual = id;
            b.config.migrado = true;
        }
    } catch (e) { /* sem dados antigos */ }
    return b;
}
let banco = carregar();
const estado = { aba: 'registrar', data: D.hoje(), mes: null, novoEvento: null };

let salvoTimer = null;
function salvar() {
    try {
        localStorage.setItem(CHAVE, JSON.stringify(banco));
        const el = $('#salvo');
        el.classList.add('mostrar');
        clearTimeout(salvoTimer);
        salvoTimer = setTimeout(() => el.classList.remove('mostrar'), 1600);
        return true;
    } catch (e) {
        aviso('⚠️ Não foi possível salvar: o armazenamento do navegador está cheio. Tente uma foto menor ou baixe uma cópia em Crianças.');
        return false;
    }
}

const atual = () => banco.criancas.find((c) => c.id === banco.config.atual) || banco.criancas[0] || null;
const ehHoje = () => estado.data === D.hoje();
const agoraSeHoje = () => (ehHoje() ? D.horaAgora() : null);
const diaAtual = () => D.obterDia(banco, atual().id, estado.data);
function mudarDia(fn) {
    const c = atual();
    const novo = fn(structuredClone(D.obterDia(banco, c.id, estado.data)));
    banco = D.gravarDia(banco, c.id, estado.data, novo);
    salvar();
}

// ===================== avisos =====================
let avisoTimer = null;
function aviso(msg, acao = null) {
    const el = $('#aviso');
    el.innerHTML = `<span>${esc(msg)}</span>${acao ? `<button type="button">${esc(acao.nome)}</button>` : ''}`;
    if (acao) el.querySelector('button').onclick = () => { acao.fn(); el.classList.remove('mostrar'); };
    el.classList.add('mostrar');
    clearTimeout(avisoTimer);
    avisoTimer = setTimeout(() => el.classList.remove('mostrar'), acao ? 5000 : 3000);
}

// ===================== peças =====================
function corDe(c) { const i = banco.criancas.indexOf(c); return CORES_AVATAR[(i < 0 ? 0 : i) % CORES_AVATAR.length]; }
function avatar(c, grande = false) {
    const cls = `avatar ${grande ? 'grande' : ''} ${corDe(c)}`;
    if (c.foto) return `<img class="${cls}" src="${esc(c.foto)}" alt="">`;
    const ini = c.nome.trim().split(/\s+/).map((p) => p[0]).slice(0, 2).join('').toUpperCase();
    return `<span class="${cls}" aria-hidden="true">${esc(ini || '?')}</span>`;
}
const doTipo = (tipo) => D.TIPOS[tipo] || { nome: tipo, icone: '•', cor: 'azul' };

function dataNav() {
    const h = D.hoje();
    const rot = estado.data === h ? 'Hoje' : estado.data === D.addDias(h, -1) ? 'Ontem' : D.fmtDataCurta(estado.data);
    return `<div class="data-nav">
        <button type="button" class="seta-btn" data-dia="-1" aria-label="Dia anterior">‹</button>
        <div class="data-rotulo"><b>${rot}</b><span>${D.fmtDataLonga(estado.data)}</span>
            <label class="sr-only" for="inp-data">Escolher data</label><input type="date" id="inp-data" value="${estado.data}" max="${h}"></div>
        <button type="button" class="seta-btn" data-dia="1" aria-label="Próximo dia" ${estado.data >= h ? 'disabled' : ''}>›</button>
    </div>`;
}

function alergia(c) {
    if (!c.obs?.trim()) return '';
    return `<div class="alergia" role="note"><span aria-hidden="true">⚠️</span><span><b>Atenção:</b> ${esc(c.obs)}</span></div>`;
}

function itemTempo(e, { editavel, agora, i = 0 }) {
    const t = doTipo(e.tipo);
    const alerta = (e.tipo === 'temperatura' && D.classificarTemp(e.temp)?.id === 'febre') || e.tipo === 'remedio';
    let extra = '';
    if (e.tipo === 'sono') {
        const d = D.duracaoSono(e, e.fim ? null : agora);
        if (d != null) extra = `<span class="sono-barra" aria-hidden="true"><i style="width:${Math.min(100, (d / 180) * 100)}%"></i></span>`;
    }
    if (e.tipo === 'remedio' && e.autorizado) extra += '<span class="desc">✓ autorização dos pais conferida</span>';
    const titulo = e.tipo === 'humor' ? 'Humor' : t.nome;
    const corpo = `<span class="titulo">${esc(titulo)}</span><span class="desc" ${e.tipo === 'sono' && !e.fim ? 'data-dormindo="1"' : ''}>${esc(D.descrever(e, { agora }))}</span>${extra}`;
    return `<li class="item-tempo c-${t.cor} ${alerta ? 'alerta' : ''} ${estado.novoEvento === e.id ? 'novo' : ''}" style="--n:${i}">
        <span class="hora">${esc(e.hora)}</span>
        <span class="ponto" aria-hidden="true">${t.icone}</span>
        ${editavel ? `<button type="button" class="conteudo" data-editar="${e.id}" aria-label="Editar ${esc(titulo)} das ${esc(e.hora)}">${corpo}</button>` : `<div class="conteudo">${corpo}</div>`}
    </li>`;
}

function linhaTempo(dia, { editavel, contar = false }) {
    const agora = agoraSeHoje();
    if (!dia.eventos.length) {
        return `<div class="vazio"><span class="emoji" aria-hidden="true">🌤️</span>${editavel ? 'Nada registrado ainda. Toque em um adesivo para começar o dia.' : 'Nada registrado neste dia.'}</div>`;
    }
    return `<ol class="linha-tempo ${contar ? 'contar' : ''}">${D.ordenar(dia.eventos).map((e, i) => itemTempo(e, { editavel, agora, i })).join('')}</ol>`;
}

// ===================== cabeçalho e abas =====================
function renderTopo() {
    const c = atual();
    const btn = $('#btn-crianca');
    btn.hidden = !c;
    if (c) btn.innerHTML = `${avatar(c)}<span style="min-width:0"><span class="nome">${esc(c.nome)}</span><span class="idade">${esc(D.idade(c.nasc) || 'Toque para trocar')}</span></span>${banco.criancas.length > 1 ? '<span class="seta" aria-hidden="true">▾</span>' : ''}`;
    const abas = c ? ABAS.map((a) => `<button type="button" data-aba="${a.id}" ${estado.aba === a.id ? 'aria-current="page"' : ''}><span class="ic" aria-hidden="true">${a.ic}</span>${a.nome}</button>`).join('') : '';
    $('#abas-topo').innerHTML = abas;
    $('#abas-inferior').innerHTML = abas;
    $('#abas-inferior').hidden = !c;
    const tema = banco.config.tema || 'system';
    $('#btn-tema').textContent = { system: '🖥️', light: '☀️', dark: '🌙' }[tema];
    $('#btn-tema').title = { system: 'Tema: igual ao sistema', light: 'Tema: claro', dark: 'Tema: escuro' }[tema];
}

function render({ rolar = false } = {}) {
    renderTopo();
    const c = atual();
    if (!c) { app.innerHTML = boasVindas(); ligarBoasVindas(); return; }
    const vistas = { registrar: vistaRegistrar, dia: vistaDia, mes: vistaMes, criancas: vistaCriancas };
    app.innerHTML = `<div class="vista">${vistas[estado.aba]()}</div>`;
    ({ registrar: ligarRegistrar, dia: ligarDia, mes: ligarMes, criancas: ligarCriancas })[estado.aba]();
    estado.novoEvento = null;
    if (rolar) window.scrollTo({ top: 0 });
}

function irPara(aba) {
    estado.aba = aba;
    history.replaceState(null, '', `#${aba}`);
    render({ rolar: true });
}

// ===================== boas-vindas =====================
function boasVindas() {
    return `<section class="boas-vindas cartao vista">
        <span class="bebe" aria-hidden="true">👶</span>
        <h1>Diário do Bebê</h1>
        <p>Registre a rotina na creche com poucos toques e envie aos pais um relatório bonito do dia.</p>
        <form id="form-primeira">
            <div class="campo"><label for="pc-nome">Nome da criança</label><input class="entrada" id="pc-nome" required maxlength="40" placeholder="Ex.: Alice"></div>
            <div class="campo"><label for="pc-nasc">Data de nascimento</label><input class="entrada" type="date" id="pc-nasc" max="${D.hoje()}"></div>
            <button class="btn btn-pri btn-bloco" type="submit">Começar o diário</button>
        </form>
    </section>`;
}
function ligarBoasVindas() {
    $('#form-primeira').addEventListener('submit', (e) => {
        e.preventDefault();
        const id = D.novoId();
        banco.criancas.push({ id, nome: $('#pc-nome').value.trim(), nasc: $('#pc-nasc').value, foto: '', obs: '' });
        banco.config.atual = id;
        salvar();
        estado.aba = 'registrar';
        render({ rolar: true });
    });
}

// ===================== REGISTRAR =====================
function vistaRegistrar() {
    const c = atual();
    const dia = diaAtual();
    const dorm = D.sonoEmAndamento(dia);
    const agora = agoraSeHoje();
    const adesivos = ADESIVOS.map((tipo) => {
        const t = doTipo(tipo);
        const nome = tipo === 'sono' ? (dorm ? 'Acordou' : 'Dormiu') : t.nome;
        const icone = tipo === 'sono' && dorm ? '🌅' : t.icone;
        const rodape = tipo === 'sono' ? (dorm ? 'encerra a soneca' : 'inicia o cronômetro') : tipo === 'banho' ? 'um toque' : '';
        return `<button type="button" class="adesivo c-${t.cor}" data-adesivo="${tipo}"><span class="emoji" aria-hidden="true">${icone}</span>${nome}${rodape ? `<span class="rodape">${rodape}</span>` : ''}</button>`;
    }).join('');
    return `
        ${dataNav()}
        ${alergia(c)}
        <div class="grade-registrar">
            <div>
                ${dorm ? `<div class="dormindo" role="status"><span class="lua" aria-hidden="true">🌙</span><span><b>Dormindo desde ${esc(dorm.hora)}</b><span data-dormindo-total="1">${agora ? D.fmtDuracao(D.duracaoSono(dorm, agora)) : ''}</span></span><button type="button" data-acordou="1">Acordou</button></div>` : ''}
                <div class="adesivos" role="group" aria-label="Adicionar registro">${adesivos}</div>
                <div class="cartao" style="margin-top:16px">
                    <h3 style="margin-bottom:10px">Como está o humor?</h3>
                    <div class="chips" role="group" aria-label="Registrar humor">${D.HUMORES.map((h) => `<button type="button" class="chip grande" data-humor="${h.id}" title="${h.nome}"><span aria-hidden="true">${h.icone}</span> ${h.nome}</button>`).join('')}</div>
                </div>
                <section class="postit" aria-labelledby="t-recado">
                    <h3 id="t-recado">📝 Recado para os pais</h3>
                    <label for="inp-recado" class="sr-only">Recado</label>
                    <textarea id="inp-recado" placeholder="Ex.: Hoje brincou muito no parquinho! Mandar mais fraldas amanhã.">${esc(dia.recado)}</textarea>
                    <label for="inp-tia">Quem escreveu</label>
                    <input id="inp-tia" value="${esc(dia.tia || banco.config.tia || '')}" placeholder="Ex.: Tia Ana" maxlength="40">
                </section>
            </div>
            <section class="cartao" aria-labelledby="t-linha">
                <div class="cartao-topo"><h2 id="t-linha">Linha do dia</h2><span class="suave peq">toque para editar</span></div>
                ${linhaTempo(dia, { editavel: true })}
                <button type="button" class="btn btn-bloco" data-aba="dia" style="margin-top:16px">📖 Ver relatório para os pais</button>
            </section>
        </div>`;
}

function ligarRegistrar() {
    ligarDataNav();
    $$('[data-adesivo]').forEach((b) => b.addEventListener('click', () => tocarAdesivo(b.dataset.adesivo)));
    $('[data-acordou]')?.addEventListener('click', acordou);
    $$('[data-humor]').forEach((b) => b.addEventListener('click', () => {
        const ev = { id: D.novoId(), tipo: 'humor', hora: D.horaAgora(), humor: b.dataset.humor };
        adicionarEvento(ev, `Humor registrado: ${D.HUMORES.find((h) => h.id === b.dataset.humor).nome}`);
    }));
    $$('[data-editar]').forEach((b) => b.addEventListener('click', () => {
        const e = diaAtual().eventos.find((x) => x.id === b.dataset.editar);
        if (e) abrirEvento(e.tipo, e);
    }));
    let t = null;
    const gravarRecado = () => {
        clearTimeout(t);
        t = setTimeout(() => {
            const recado = $('#inp-recado').value, tia = $('#inp-tia').value.trim();
            banco.config.tia = tia;
            mudarDia((d) => ({ ...d, recado, tia }));
        }, 400);
    };
    $('#inp-recado').addEventListener('input', gravarRecado);
    $('#inp-tia').addEventListener('input', gravarRecado);
}

function adicionarEvento(ev, msg) {
    mudarDia((d) => ({ ...d, eventos: [...d.eventos, ev] }));
    estado.novoEvento = ev.id;
    render();
    aviso(msg || `${doTipo(ev.tipo).nome} registrado`, { nome: 'Desfazer', fn: () => { mudarDia((d) => ({ ...d, eventos: d.eventos.filter((x) => x.id !== ev.id) })); render(); } });
}

function tocarAdesivo(tipo) {
    const dorm = D.sonoEmAndamento(diaAtual());
    if (tipo === 'sono') {
        if (dorm) return acordou();
        return adicionarEvento({ id: D.novoId(), tipo: 'sono', hora: D.horaAgora(), fim: null }, 'Soneca iniciada — bons sonhos 🌙');
    }
    if (tipo === 'banho') return adicionarEvento({ id: D.novoId(), tipo: 'banho', hora: D.horaAgora() }, 'Banho registrado 🛁');
    abrirEvento(tipo);
}

function acordou() {
    const dorm = D.sonoEmAndamento(diaAtual());
    if (!dorm) return;
    const fim = D.horaAgora();
    mudarDia((d) => ({ ...d, eventos: d.eventos.map((e) => (e.id === dorm.id ? { ...e, fim } : e)) }));
    estado.novoEvento = dorm.id;
    render();
    aviso(`Acordou! Dormiu ${D.fmtDuracao(D.duracaoSono({ ...dorm, fim }))} ☀️`);
}

// ===================== FOLHA: formulário de cada registro =====================
const folha = $('#folha');
const chips = (nome, opcoes, sel, { multi = false, grande = false } = {}) => `
    <div class="chips" data-chips="${nome}" data-multi="${multi ? 1 : 0}" role="group">
        ${opcoes.map((o) => {
            const v = typeof o === 'object' ? o.v : o, r = typeof o === 'object' ? o.r : o;
            const on = multi ? (sel || []).includes(v) : String(sel) === String(v);
            return `<button type="button" class="chip ${grande ? 'grande' : ''}" data-v="${esc(v)}" aria-pressed="${on}">${r}</button>`;
        }).join('')}
    </div>`;
const campoHora = (id, rot, v) => `<div class="campo"><label for="${id}">${rot}</label><input class="entrada" type="time" id="${id}" value="${esc(v || '')}" required></div>`;
const campoTexto = (id, rot, v, ph = '', extra = '') => `<div class="campo"><label for="${id}">${rot}</label><input class="entrada" id="${id}" value="${esc(v || '')}" placeholder="${esc(ph)}" maxlength="140" ${extra}></div>`;
const lerChips = (nome) => { const g = $(`[data-chips="${nome}"]`, folha); if (!g) return null; const v = $$('[aria-pressed="true"]', g).map((b) => b.dataset.v); return g.dataset.multi === '1' ? v : v[0] ?? null; };

function corpoEvento(tipo, e) {
    const hora = e?.hora || D.horaAgora();
    switch (tipo) {
        case 'mamadeira': return campoHora('f-hora', 'Horário', hora)
            + `<div class="campo"><span class="rotulo">Quantidade</span>${chips('ml', [60, 90, 120, 150, 180, 210, 240].map((v) => ({ v, r: `${v} ml` })), e?.ml)}</div>`
            + `<div class="campo"><span class="rotulo">Aceitou</span>${chips('aceitacao', D.ACEITACAO, e?.aceitacao ?? 'Tudo')}</div>`
            + campoTexto('f-obs', 'Observação', e?.obs, 'Ex.: arrotou bem');
        case 'refeicao': return campoHora('f-hora', 'Horário', hora)
            + `<div class="campo"><span class="rotulo">Qual refeição</span>${chips('refeicao', D.REFEICOES, e?.refeicao ?? sugerirRefeicao(hora))}</div>`
            + `<div class="campo"><span class="rotulo">Quanto comeu</span>${chips('aceitacao', D.ACEITACAO, e?.aceitacao ?? 'Tudo')}</div>`
            + campoTexto('f-obs', 'O que comeu / observação', e?.obs, 'Ex.: arroz, feijão e cenoura');
        case 'agua': return campoHora('f-hora', 'Horário', hora)
            + `<div class="campo"><span class="rotulo">Quantidade</span>${chips('ml', [30, 50, 100, 150, 200].map((v) => ({ v, r: `${v} ml` })), e?.ml ?? 50)}</div>`;
        case 'sono': return `<div class="campos-2">${campoHora('f-hora', 'Dormiu às', hora)}
            <div class="campo"><label for="f-fim">Acordou às</label><input class="entrada" type="time" id="f-fim" value="${esc(e?.fim || '')}"></div></div>
            <label class="check campo"><input type="checkbox" id="f-dormindo" ${e && !e.fim ? 'checked' : ''}> Ainda está dormindo</label>`
            + campoTexto('f-obs', 'Observação', e?.obs, 'Ex.: dormiu no colo');
        case 'fralda': return campoHora('f-hora', 'Horário', hora)
            + `<div class="campo"><span class="rotulo">O que tinha</span>${chips('conteudo', [{ v: 'xixi', r: '💧 Xixi' }, { v: 'coco', r: '💩 Cocô' }], e ? [e.xixi && 'xixi', e.coco && 'coco'].filter(Boolean) : ['xixi'], { multi: true, grande: true })}</div>`
            + `<div class="campo" id="campo-consist" ${e?.coco ? '' : 'hidden'}><span class="rotulo">Como estava o cocô</span>${chips('consistencia', D.CONSISTENCIA, e?.consistencia ?? 'Normal')}</div>`
            + campoTexto('f-obs', 'Observação', e?.obs, 'Ex.: assadura leve, passada pomada');
        case 'banho': return campoHora('f-hora', 'Horário', hora) + campoTexto('f-obs', 'Observação', e?.obs);
        case 'remedio': {
            const usados = [...new Set(Object.values(banco.registros[atual().id] || {}).flatMap((d) => d.eventos.filter((x) => x.tipo === 'remedio' && x.nome).map((x) => x.nome)))];
            return campoHora('f-hora', 'Horário', hora)
                + `<datalist id="lista-remedios">${usados.map((n) => `<option value="${esc(n)}">`).join('')}</datalist>`
                + `<div class="campos-2">${campoTexto('f-nome', 'Remédio', e?.nome, 'Ex.: Paracetamol', 'list="lista-remedios" required')}${campoTexto('f-dose', 'Dose', e?.dose, 'Ex.: 8 gotas')}</div>`
                + `<label class="check campo"><input type="checkbox" id="f-autorizado" ${e?.autorizado ? 'checked' : ''}> Autorização/receita dos pais conferida</label>`
                + campoTexto('f-obs', 'Observação', e?.obs, 'Ex.: para febre');
        }
        case 'temperatura': {
            const t = Number(e?.temp) || 36.5;
            return campoHora('f-hora', 'Horário', hora)
                + `<div class="campo"><span class="rotulo">Temperatura (axilar)</span>
                    <div class="passo"><button type="button" data-temp="-1" aria-label="Diminuir">−</button><output id="f-temp">${t.toFixed(1).replace('.', ',')}</output><button type="button" data-temp="1" aria-label="Aumentar">+</button></div>
                    <p class="classe-temp" id="f-temp-classe" aria-live="polite"></p></div>`
                + campoTexto('f-obs', 'O que foi feito', e?.obs, 'Ex.: pais avisados, compressa');
        }
        case 'humor': return campoHora('f-hora', 'Horário', hora)
            + `<div class="campo"><span class="rotulo">Humor</span>${chips('humor', D.HUMORES.map((h) => ({ v: h.id, r: `${h.icone} ${h.nome}` })), e?.humor ?? 'feliz', { grande: true })}</div>`
            + campoTexto('f-obs', 'Observação', e?.obs);
        case 'atividade': return campoHora('f-hora', 'Horário', hora)
            + `<div class="campo"><span class="rotulo">Atividade</span>${chips('atividade', D.ATIVIDADES, e?.atividade ?? D.ATIVIDADES[0])}</div>`
            + campoTexto('f-obs', 'Como foi', e?.obs, 'Ex.: adorou a massinha azul!');
        default: return '';
    }
}

function sugerirRefeicao(hhmm) {
    const m = D.minutos(hhmm) ?? 0;
    if (m < 9 * 60 + 30) return 'Café da manhã';
    if (m < 10 * 60 + 30) return 'Fruta';
    if (m < 13 * 60 + 30) return 'Almoço';
    if (m < 17 * 60) return 'Lanche';
    return 'Jantar';
}

function coletarEvento(tipo, base) {
    const ev = { ...base, tipo, hora: $('#f-hora', folha).value };
    const obs = $('#f-obs', folha)?.value.trim();
    if (obs !== undefined) ev.obs = obs;
    switch (tipo) {
        case 'mamadeira': ev.ml = Number(lerChips('ml')) || ''; ev.aceitacao = lerChips('aceitacao'); break;
        case 'refeicao': ev.refeicao = lerChips('refeicao'); ev.aceitacao = lerChips('aceitacao'); break;
        case 'agua': ev.ml = Number(lerChips('ml')) || ''; break;
        case 'sono': ev.fim = $('#f-dormindo', folha).checked ? null : ($('#f-fim', folha).value || null); break;
        case 'fralda': { const c = lerChips('conteudo'); ev.xixi = c.includes('xixi'); ev.coco = c.includes('coco'); ev.consistencia = ev.coco ? lerChips('consistencia') : ''; break; }
        case 'remedio': ev.nome = $('#f-nome', folha).value.trim(); ev.dose = $('#f-dose', folha).value.trim(); ev.autorizado = $('#f-autorizado', folha).checked; break;
        case 'temperatura': ev.temp = Number($('#f-temp', folha).textContent.replace(',', '.')); break;
        case 'humor': ev.humor = lerChips('humor'); break;
        case 'atividade': ev.atividade = lerChips('atividade'); break;
        default: break;
    }
    return ev;
}

function abrirEvento(tipo, existente = null) {
    const t = doTipo(tipo);
    $('#folha-corpo').innerHTML = `
        <div class="folha-titulo c-${t.cor}"><span class="emoji" aria-hidden="true">${t.icone}</span>
            <div><h2 id="folha-titulo">${existente ? `Editar ${t.nome.toLowerCase()}` : t.nome}</h2><p class="suave peq">${esc(atual().nome)} · ${D.fmtDataLonga(estado.data)}</p></div></div>
        ${corpoEvento(tipo, existente)}`;
    $('#folha-acoes').innerHTML = `
        ${existente ? '<button type="button" class="btn btn-perigo" id="f-apagar">Apagar</button>' : '<button type="button" class="btn" id="f-cancelar">Cancelar</button>'}
        <button type="submit" class="btn btn-pri" value="ok">${existente ? 'Salvar alterações' : 'Registrar'}</button>`;

    // chips
    $$('[data-chips]', folha).forEach((g) => g.addEventListener('click', (ev) => {
        const b = ev.target.closest('.chip');
        if (!b) return;
        if (g.dataset.multi === '1') b.setAttribute('aria-pressed', String(b.getAttribute('aria-pressed') !== 'true'));
        else $$('.chip', g).forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
        if (g.dataset.chips === 'conteudo') $('#campo-consist', folha).hidden = !lerChips('conteudo').includes('coco');
    }));
    // temperatura
    const atualizarTemp = () => {
        const out = $('#f-temp', folha);
        if (!out) return;
        const c = D.classificarTemp(out.textContent.replace(',', '.'));
        const el = $('#f-temp-classe', folha);
        el.textContent = c ? (c.id === 'febre' ? '🔴 Febre — avise os pais' : c.id === 'elevada' ? '🟠 Temperatura elevada — observe' : c.id === 'baixa' ? '🔵 Temperatura baixa — confira a medição' : '🟢 Normal') : '';
        el.className = `classe-temp ${c?.id || ''}`;
    };
    $$('[data-temp]', folha).forEach((b) => b.addEventListener('click', () => {
        const out = $('#f-temp', folha);
        const v = Math.min(42, Math.max(34, Number(out.textContent.replace(',', '.')) + Number(b.dataset.temp) * 0.1));
        out.textContent = v.toFixed(1).replace('.', ',');
        atualizarTemp();
    }));
    atualizarTemp();
    // sono: "ainda dormindo" desliga o campo de fim
    const chk = $('#f-dormindo', folha);
    if (chk) { const sync = () => { $('#f-fim', folha).disabled = chk.checked; }; chk.addEventListener('change', sync); sync(); }
    if (tipo === 'refeicao' && !existente) $('#f-hora', folha).addEventListener('change', (ev) => {
        const s = sugerirRefeicao(ev.target.value);
        $$('[data-chips="refeicao"] .chip', folha).forEach((x) => x.setAttribute('aria-pressed', String(x.dataset.v === s)));
    });

    $('#f-cancelar')?.addEventListener('click', () => folha.close());
    $('#f-apagar')?.addEventListener('click', () => {
        folha.close();
        const copia = existente;
        mudarDia((d) => ({ ...d, eventos: d.eventos.filter((x) => x.id !== existente.id) }));
        render();
        aviso(`${t.nome} apagado`, { nome: 'Desfazer', fn: () => { mudarDia((d) => ({ ...d, eventos: [...d.eventos, copia] })); render(); } });
    });
    $('#folha-form').onsubmit = (ev) => {
        ev.preventDefault();
        if (!$('#folha-form').reportValidity()) return;
        const novo = coletarEvento(tipo, existente || { id: D.novoId() });
        folha.close();
        if (existente) {
            mudarDia((d) => ({ ...d, eventos: d.eventos.map((x) => (x.id === existente.id ? novo : x)) }));
            estado.novoEvento = novo.id;
            render();
            aviso('Alterações salvas');
        } else {
            adicionarEvento(novo, tipo === 'temperatura' && D.classificarTemp(novo.temp)?.id === 'febre' ? 'Febre registrada — lembre de avisar os pais' : null);
        }
    };
    folha.showModal();
}
folha.addEventListener('click', (e) => { if (e.target === folha) folha.close(); }); // toque fora fecha

// ===================== DIA (relatório para os pais) =====================
function vistaDia() {
    const c = atual();
    const dia = diaAtual();
    const r = D.resumoDia(dia, { agora: agoraSeHoje() });
    const capa = `<section class="capa">${avatar(c, true)}<div><h1>O dia de ${esc(c.nome.split(' ')[0])}</h1>
        <p>${D.fmtDataLonga(estado.data)}${c.nasc ? ` · ${esc(D.idade(c.nasc, estado.data))}` : ''}</p></div></section>`;
    if (r.vazio) {
        return `${dataNav()}${capa}<div class="cartao vazio"><span class="emoji" aria-hidden="true">📭</span>Nada registrado neste dia.
            <div style="margin-top:14px"><button type="button" class="btn btn-pri" data-aba="registrar">✏️ Registrar agora</button></div></div>`;
    }
    const alertas = [];
    if (r.febre) alertas.push(`<div class="aviso-saude"><span class="emoji" aria-hidden="true">🌡️</span><div><b>Febre: ${D.fmtTemp(r.febre.temp)} às ${esc(r.febre.hora)}</b>${r.febre.obs ? `<span>${esc(r.febre.obs)}</span>` : ''}</div></div>`);
    for (const m of r.remedios) alertas.push(`<div class="aviso-saude"><span class="emoji" aria-hidden="true">💊</span><div><b>${esc(m.nome || 'Remédio')}${m.dose ? ` · ${esc(m.dose)}` : ''} às ${esc(m.hora)}</b><span>${[m.autorizado ? '✓ autorização conferida' : '', m.obs].filter(Boolean).map(esc).join(' · ')}</span></div></div>`);
    const aceitouBem = r.aceitacao.Tudo + r.aceitacao.Bastante;
    const totalComida = r.refeicoes + r.mamadeiras;
    const humor = r.humor ? D.HUMORES.find((h) => h.id === r.humor.humor) : null;
    const chipsResumo = [
        { cor: 'azul', ic: '😴', v: r.sonecas ? D.fmtDuracao(r.sonoMin) : '—', t: r.sonecas ? `de sono · ${r.sonecas} ${r.sonecas === 1 ? 'soneca' : 'sonecas'}` : 'sem sonecas' },
        { cor: 'laranja', ic: '🍽️', v: totalComida || '—', t: totalComida ? `${totalComida === 1 ? 'refeição' : 'refeições'}${aceitouBem ? ` · ${aceitouBem} ${aceitouBem === 1 ? 'bem aceita' : 'bem aceitas'}` : ''}` : 'refeições' },
        { cor: 'turquesa', ic: '🧷', v: r.fraldas || '—', t: r.fraldas ? `${r.fraldas === 1 ? 'fralda' : 'fraldas'}${r.coco ? ` · ${r.coco} com cocô` : ''}` : 'trocas de fralda' },
        humor ? { cor: 'amarelo', ic: humor.icone, v: humor.nome, t: 'humor do dia' } : { cor: 'turquesa', ic: '🛁', v: r.banho ? 'Sim' : 'Não', t: 'banho' },
    ];
    return `${dataNav()}${capa}
        ${alertas.join('')}
        <div class="resumo-chips">${chipsResumo.map((x) => `<div class="chip-resumo c-${x.cor}"><span class="emoji" aria-hidden="true">${x.ic}</span><span><b>${esc(x.v)}</b><span>${esc(x.t)}</span></span></div>`).join('')}</div>
        <div class="grade-dia">
            <section class="cartao" aria-labelledby="t-linha-dia"><h2 id="t-linha-dia" style="margin-bottom:12px">Linha do dia</h2>${linhaTempo(dia, { editavel: false, contar: true })}</section>
            <div>
                ${dia.recado?.trim() ? `<section class="postit" style="margin-top:0"><h3>📝 Recado</h3><p style="white-space:pre-wrap">${esc(dia.recado.trim())}</p>${dia.tia ? `<p style="text-align:right;margin-top:10px;font-weight:700">— ${esc(dia.tia)}</p>` : ''}</section>` : ''}
                <section class="cartao nao-imprimir" style="margin-top:16px">
                    <h3>Enviar aos pais</h3>
                    <p class="suave peq" style="margin-top:4px">O resumo vai como texto, pronto para colar na conversa.</p>
                    <div class="compartilhar">
                        <a class="btn btn-zap" id="btn-zap" target="_blank" rel="noopener">📲 WhatsApp</a>
                        <button type="button" class="btn" id="btn-copiar">📋 Copiar texto</button>
                        <button type="button" class="btn" id="btn-imprimir">🖨️ Imprimir / PDF</button>
                    </div>
                </section>
            </div>
        </div>`;
}
function ligarDia() {
    ligarDataNav();
    const zap = $('#btn-zap');
    if (!zap) return;
    const texto = D.textoWhatsApp(atual(), estado.data, diaAtual());
    zap.href = `https://wa.me/?text=${encodeURIComponent(texto)}`;
    $('#btn-copiar').addEventListener('click', async () => {
        try { await navigator.clipboard.writeText(texto); aviso('Texto copiado — é só colar na conversa'); }
        catch (e) { aviso('Não foi possível copiar automaticamente'); }
    });
    $('#btn-imprimir').addEventListener('click', () => window.print());
}

function ligarDataNav() {
    $$('[data-dia]').forEach((b) => b.addEventListener('click', () => { estado.data = D.addDias(estado.data, Number(b.dataset.dia)); render(); }));
    $('#inp-data')?.addEventListener('change', (e) => { if (e.target.value && e.target.value <= D.hoje()) { estado.data = e.target.value; render(); } });
}

// ===================== MÊS =====================
function vistaMes() {
    const c = atual();
    if (!estado.mes) { const d = D.deIso(estado.data); estado.mes = { ano: d.getFullYear(), mes: d.getMonth() }; }
    const { ano, mes } = estado.mes;
    const m = D.resumoMes(banco.registros[c.id], ano, mes);
    const h = D.hoje();
    const primeiro = new Date(ano, mes, 1).getDay();
    const ehMesAtual = ano === new Date().getFullYear() && mes === new Date().getMonth();
    let cal = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map((s, i) => `<span class="sem" aria-hidden="true" title="${['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'][i]}">${s}</span>`).join('');
    for (let i = 0; i < primeiro; i++) cal += '<span></span>';
    for (const d of m.dias) {
        const futuro = d.data > h;
        const marcas = d.tem ? [d.sonoMin ? 'c-azul' : '', d.fraldas ? 'c-turquesa' : '', d.remedio ? 'c-lilas' : '', d.febre ? 'c-rosa' : ''].filter(Boolean).map((k) => `<i class="${k}"></i>`).join('') : '';
        const rot = `${d.d} de ${D.nomeMes(mes)}${d.tem ? ', com registros' : ''}${d.febre ? ', febre' : ''}${d.remedio ? ', remédio' : ''}`;
        cal += futuro
            ? `<span class="dia-cal futuro" aria-hidden="true"><span class="n">${d.d}</span></span>`
            : `<button type="button" class="dia-cal ${d.tem ? 'tem' : ''} ${d.data === h ? 'hoje' : ''}" data-abrir-dia="${d.data}" aria-label="${rot}"><span class="n">${d.d}</span><span class="marcas">${marcas}</span></button>`;
    }
    const num = (v, t, ic, cor) => `<div class="chip-resumo c-${cor}"><span class="emoji" aria-hidden="true">${ic}</span><span><b>${v}</b><span>${t}</span></span></div>`;
    return `
        <div class="mes-nav">
            <button type="button" class="seta-btn btn" style="width:44px;height:44px;padding:0" data-mes="-1" aria-label="Mês anterior">‹</button>
            <h2>${D.nomeMes(mes)} de ${ano}</h2>
            <button type="button" class="seta-btn btn" style="width:44px;height:44px;padding:0" data-mes="1" aria-label="Próximo mês" ${ehMesAtual ? 'disabled' : ''}>›</button>
        </div>
        ${m.diasComRegistro ? `<div class="numeros">
            ${num(m.diasComRegistro, m.diasComRegistro === 1 ? 'dia registrado' : 'dias registrados', '📅', 'lilas')}
            ${num(D.fmtDuracao(m.mediaSonoMin), 'de sono por dia, em média', '😴', 'azul')}
            ${num((m.mediaFraldas ?? 0).toLocaleString('pt-BR', { maximumFractionDigits: 1 }), 'fraldas por dia, em média', '🧷', 'turquesa')}
            ${num(m.diasFebre.length, m.diasFebre.length === 1 ? 'dia com febre' : 'dias com febre', '🌡️', 'rosa')}
        </div>` : ''}
        <section class="cartao" aria-labelledby="t-cal">
            <h2 id="t-cal" class="sr-only">Calendário</h2>
            <div class="calendario">${cal}</div>
            <div class="legenda"><span><i class="c-azul"></i>sono</span><span><i class="c-turquesa"></i>fraldas</span><span><i class="c-lilas"></i>remédio</span><span><i class="c-rosa"></i>febre</span><span>Toque num dia para ver o relatório.</span></div>
        </section>
        ${m.diasComRegistro ? `<div class="grade-mes">
            <section class="cartao" aria-labelledby="t-g-sono"><div class="cartao-topo"><h3 id="t-g-sono">😴 Sono por dia</h3><span class="suave peq">horas</span></div><div class="grafico c-azul" id="g-sono"></div></section>
            <section class="cartao" aria-labelledby="t-g-fr"><div class="cartao-topo"><h3 id="t-g-fr">🧷 Fraldas por dia</h3><span class="suave peq">trocas</span></div><div class="grafico c-turquesa" id="g-fraldas"></div></section>
        </div>` : `<div class="cartao vazio" style="margin-top:16px"><span class="emoji" aria-hidden="true">🗓️</span>Nenhum registro em ${D.nomeMes(mes)}.</div>`}`;
}

function barras(cont, dias, valor, { fmt, rotulo }) {
    const W = 360, H = 170, m = { t: 10, r: 6, b: 22, l: 26 };
    const iw = W - m.l - m.r, ih = H - m.t - m.b;
    const vals = dias.map(valor);
    const max = Math.max(1, ...vals);
    const passo = max > 8 ? Math.ceil(max / 4) : max > 4 ? 2 : 1;
    const topo = Math.ceil(max / passo) * passo;
    const bw = iw / dias.length;
    const sy = (v) => m.t + ih - (v / topo) * ih;
    let s = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(rotulo)}">`;
    for (let v = 0; v <= topo; v += passo) s += `<line class="g-grade" x1="${m.l}" x2="${W - m.r}" y1="${sy(v)}" y2="${sy(v)}"/><text class="g-eixo" x="${m.l - 5}" y="${sy(v)}" dy=".32em" text-anchor="end">${v}</text>`;
    dias.forEach((d, i) => {
        const v = vals[i];
        const x = m.l + i * bw + Math.max(1, bw * 0.15), w = Math.max(2, bw * 0.7);
        if (v > 0) {
            const y = sy(v), h = m.t + ih - y, r = Math.min(4, w / 2, h);
            s += `<path class="g-barra" data-i="${i}" d="M${x} ${m.t + ih}V${y + r}Q${x} ${y} ${x + r} ${y}H${x + w - r}Q${x + w} ${y} ${x + w} ${y + r}V${m.t + ih}Z"/>`;
        }
        if (d.d === 1 || d.d % 5 === 0) s += `<text class="g-eixo" x="${x + w / 2}" y="${H - 6}" text-anchor="middle">${d.d}</text>`;
    });
    s += `<rect x="${m.l}" y="0" width="${iw}" height="${H}" fill="transparent" class="g-alvo"/></svg><div class="g-dica" hidden></div>`;
    cont.innerHTML = s;
    const svg = $('svg', cont), dica = $('.g-dica', cont);
    const mover = (e) => {
        const bb = svg.getBoundingClientRect();
        const x = (e.clientX - bb.left) * (W / bb.width);
        const i = Math.max(0, Math.min(dias.length - 1, Math.floor((x - m.l) / bw)));
        $$('.g-barra', svg).forEach((p) => p.classList.toggle('ativa', Number(p.dataset.i) === i));
        dica.hidden = false;
        dica.textContent = `${dias[i].d}/${String(estado.mes.mes + 1).padStart(2, '0')}: ${fmt(vals[i])}`;
        dica.style.left = `${((m.l + (i + 0.5) * bw) / W) * 100}%`;
        dica.style.top = `${(sy(vals[i]) / H) * bb.height}px`;
    };
    const alvo = $('.g-alvo', svg);
    alvo.addEventListener('pointermove', mover);
    alvo.addEventListener('pointerdown', mover);
    alvo.addEventListener('pointerleave', () => { dica.hidden = true; $$('.g-barra', svg).forEach((p) => p.classList.remove('ativa')); });
}

function ligarMes() {
    $$('[data-mes]').forEach((b) => b.addEventListener('click', () => {
        let { ano, mes } = estado.mes;
        mes += Number(b.dataset.mes);
        if (mes < 0) { mes = 11; ano--; } if (mes > 11) { mes = 0; ano++; }
        estado.mes = { ano, mes };
        render();
    }));
    $$('[data-abrir-dia]').forEach((b) => b.addEventListener('click', () => { estado.data = b.dataset.abrirDia; irPara('dia'); }));
    const m = D.resumoMes(banco.registros[atual().id], estado.mes.ano, estado.mes.mes);
    if ($('#g-sono')) {
        barras($('#g-sono'), m.dias, (d) => (d.sonoMin || 0) / 60, { fmt: (v) => (v ? D.fmtDuracao(v * 60) : 'sem registro'), rotulo: 'Horas de sono por dia do mês' });
        barras($('#g-fraldas'), m.dias, (d) => d.fraldas || 0, { fmt: (v) => (v ? `${v} ${v === 1 ? 'troca' : 'trocas'}` : 'sem registro'), rotulo: 'Trocas de fralda por dia do mês' });
    }
}

// ===================== CRIANÇAS =====================
function vistaCriancas() {
    const c = atual();
    return `
        <div class="cartao-topo"><h1>Crianças</h1><button type="button" class="btn btn-pri" id="btn-nova">＋ Adicionar</button></div>
        ${banco.config.migrado ? '<div class="alergia" style="background:var(--afundado);border-color:var(--linha)"><span aria-hidden="true">ℹ️</span><span>Os registros da versão anterior foram trazidos para <b>Meu bebê</b>. Toque em Editar para colocar o nome certo.</span></div>' : ''}
        <div class="lista-criancas">
            ${banco.criancas.map((k) => `<article class="cartao cartao-crianca ${k.id === c.id ? 'atual' : ''}">
                ${avatar(k, true)}
                <div style="min-width:0"><h3>${esc(k.nome)}</h3><p class="suave peq">${esc(D.idade(k.nasc) || 'idade não informada')}</p>${k.obs ? `<p class="peq" style="margin-top:4px">⚠️ ${esc(k.obs)}</p>` : ''}</div>
                <div class="acoes">
                    ${k.id === c.id ? '<span class="peq suave" style="text-align:center">selecionada</span>' : `<button type="button" class="btn btn-peq" data-escolher="${k.id}">Selecionar</button>`}
                    <button type="button" class="btn btn-peq" data-editar-crianca="${k.id}">Editar</button>
                </div>
            </article>`).join('')}
        </div>
        <section class="cartao" style="margin-top:24px" aria-labelledby="t-bkp">
            <h2 id="t-bkp">💾 Seus dados</h2>
            <p class="suave" style="margin:6px 0 14px">Tudo fica guardado só neste aparelho. Baixe uma cópia de vez em quando — ela também serve para passar os registros para outro celular ou computador.</p>
            <div class="compartilhar" style="margin-top:0">
                <button type="button" class="btn" id="btn-exportar">⬇️ Baixar cópia</button>
                <label class="btn" style="cursor:pointer">⬆️ Restaurar cópia<input type="file" id="inp-importar" accept=".json,application/json" hidden></label>
            </div>
        </section>`;
}

function redimensionarFoto(arquivo) {
    return new Promise((ok, erro) => {
        const img = new Image();
        img.onload = () => {
            const lado = 256, esc2 = Math.min(1, lado / Math.min(img.width, img.height));
            const w = Math.round(img.width * esc2), h = Math.round(img.height * esc2);
            const cv = document.createElement('canvas');
            cv.width = Math.min(w, lado); cv.height = Math.min(h, lado);
            cv.getContext('2d').drawImage(img, (cv.width - w) / 2, (cv.height - h) / 2, w, h); // recorte central quadrado
            URL.revokeObjectURL(img.src);
            ok(cv.toDataURL('image/jpeg', 0.82));
        };
        img.onerror = () => erro(new Error('Não consegui abrir essa imagem.'));
        img.src = URL.createObjectURL(arquivo);
    });
}

function abrirCrianca(k = null) {
    let foto = k?.foto || '';
    $('#folha-corpo').innerHTML = `
        <div class="folha-titulo c-lilas"><span class="emoji" aria-hidden="true">👶</span><h2 id="folha-titulo">${k ? `Editar ${esc(k.nome)}` : 'Nova criança'}</h2></div>
        <div class="campo foto-escolher"><span id="f-foto-prev">${avatar(k || { nome: '?' }, true)}</span>
            <label class="btn btn-peq" style="cursor:pointer">📷 ${k?.foto ? 'Trocar foto' : 'Escolher foto'}<input type="file" id="f-foto" accept="image/*" hidden></label>
            ${k?.foto ? '<button type="button" class="btn btn-peq btn-perigo" id="f-sem-foto">Remover</button>' : ''}</div>
        ${campoTexto('f-nome-c', 'Nome', k?.nome, 'Ex.: Alice', 'required maxlength="40"')}
        <div class="campo"><label for="f-nasc">Data de nascimento</label><input class="entrada" type="date" id="f-nasc" value="${esc(k?.nasc || '')}" max="${D.hoje()}"></div>
        <div class="campo"><label for="f-obs-c">Alergias e cuidados importantes</label><textarea class="entrada" id="f-obs-c" rows="2" maxlength="200" placeholder="Ex.: alergia a leite de vaca; usa pomada X">${esc(k?.obs || '')}</textarea>
            <p class="suave peq" style="margin-top:4px">Aparece em destaque no topo da tela de registro.</p></div>`;
    $('#folha-acoes').innerHTML = `${k && banco.criancas.length > 1 ? '<button type="button" class="btn btn-perigo" id="f-apagar-c">Excluir</button>' : '<button type="button" class="btn" id="f-cancelar">Cancelar</button>'}
        <button type="submit" class="btn btn-pri">${k ? 'Salvar' : 'Adicionar'}</button>`;
    $('#f-foto').addEventListener('change', async (e) => {
        const arq = e.target.files[0];
        if (!arq) return;
        try { foto = await redimensionarFoto(arq); $('#f-foto-prev').innerHTML = avatar({ nome: '', foto }, true); }
        catch (err) { aviso(err.message); }
    });
    $('#f-sem-foto')?.addEventListener('click', () => { foto = ''; $('#f-foto-prev').innerHTML = avatar({ ...k, foto: '' }, true); });
    $('#f-cancelar')?.addEventListener('click', () => folha.close());
    $('#f-apagar-c')?.addEventListener('click', () => {
        if (!confirm(`Excluir ${k.nome} e todos os registros? Isso não pode ser desfeito (a não ser que você tenha uma cópia).`)) return;
        banco.criancas = banco.criancas.filter((x) => x.id !== k.id);
        delete banco.registros[k.id];
        if (banco.config.atual === k.id) banco.config.atual = banco.criancas[0]?.id;
        salvar(); folha.close(); render();
    });
    $('#folha-form').onsubmit = (ev) => {
        ev.preventDefault();
        if (!$('#folha-form').reportValidity()) return;
        const dados = { nome: $('#f-nome-c').value.trim(), nasc: $('#f-nasc').value, obs: $('#f-obs-c').value.trim(), foto };
        if (k) Object.assign(banco.criancas.find((x) => x.id === k.id), dados);
        else { const id = D.novoId(); banco.criancas.push({ id, ...dados }); banco.config.atual = id; }
        delete banco.config.migrado;
        salvar(); folha.close(); render();
        aviso(k ? 'Dados atualizados' : `${dados.nome} entrou no diário`);
    };
    folha.showModal();
}

function ligarCriancas() {
    $('#btn-nova').addEventListener('click', () => abrirCrianca());
    $$('[data-escolher]').forEach((b) => b.addEventListener('click', () => { banco.config.atual = b.dataset.escolher; salvar(); render(); }));
    $$('[data-editar-crianca]').forEach((b) => b.addEventListener('click', () => abrirCrianca(banco.criancas.find((x) => x.id === b.dataset.editarCrianca))));
    $('#btn-exportar').addEventListener('click', () => {
        const a = document.createElement('a');
        a.href = URL.createObjectURL(new Blob([JSON.stringify(banco)], { type: 'application/json' }));
        a.download = `diario-do-bebe_${D.hoje()}.json`;
        document.body.appendChild(a); a.click(); a.remove();
    });
    $('#inp-importar').addEventListener('change', async (e) => {
        const arq = e.target.files[0];
        if (!arq) return;
        try {
            const b = JSON.parse(await arq.text());
            if (b?.v !== D.VERSAO || !Array.isArray(b.criancas)) throw new Error();
            if (!confirm(`Restaurar a cópia com ${b.criancas.length} ${b.criancas.length === 1 ? 'criança' : 'crianças'}? Os dados atuais deste aparelho serão substituídos.`)) return;
            banco = b; salvar(); render(); aviso('Cópia restaurada');
        } catch (err) { aviso('Esse arquivo não é uma cópia do Diário do Bebê.'); }
    });
}

// ===================== trocar de criança (topo) =====================
$('#btn-crianca').addEventListener('click', () => {
    if (banco.criancas.length < 2) return irPara('criancas');
    $('#folha-corpo').innerHTML = `<div class="folha-titulo c-lilas"><span class="emoji" aria-hidden="true">👶</span><h2 id="folha-titulo">Trocar de criança</h2></div>
        <div style="display:grid;gap:8px">${banco.criancas.map((k) => `<button type="button" class="btn" style="justify-content:flex-start;border-radius:16px;padding:10px 14px" data-trocar="${k.id}">${avatar(k)}<span style="text-align:left"><b>${esc(k.nome)}</b><br><span class="suave peq">${esc(D.idade(k.nasc))}</span></span>${k.id === atual().id ? '<span style="margin-left:auto">✓</span>' : ''}</button>`).join('')}</div>`;
    $('#folha-acoes').innerHTML = '<button type="button" class="btn" id="f-gerenciar">Gerenciar crianças</button><button type="button" class="btn btn-pri" id="f-fechar">Fechar</button>';
    $$('[data-trocar]', folha).forEach((b) => b.addEventListener('click', () => { banco.config.atual = b.dataset.trocar; salvar(); folha.close(); render(); }));
    $('#f-fechar').addEventListener('click', () => folha.close());
    $('#f-gerenciar').addEventListener('click', () => { folha.close(); irPara('criancas'); });
    $('#folha-form').onsubmit = (e) => e.preventDefault();
    folha.showModal();
});

// ===================== tema =====================
function aplicarTema() {
    const t = banco.config.tema || 'system';
    if (t === 'system') document.documentElement.removeAttribute('data-theme');
    else document.documentElement.setAttribute('data-theme', t);
}
$('#btn-tema').addEventListener('click', () => {
    const ordem = ['system', 'light', 'dark'];
    banco.config.tema = ordem[(ordem.indexOf(banco.config.tema || 'system') + 1) % 3];
    aplicarTema(); salvar(); renderTopo();
    aviso({ system: 'Tema igual ao do aparelho', light: 'Tema claro', dark: 'Tema escuro' }[banco.config.tema]);
});

// ===================== navegação =====================
document.addEventListener('click', (e) => {
    const b = e.target.closest('[data-aba]');
    if (b) { if (b.dataset.aba === 'mes') estado.mes = null; irPara(b.dataset.aba); }
});

/** Atualiza o tempo de sono em andamento sem redesenhar a tela. */
setInterval(() => {
    if (!atual() || !ehHoje()) return;
    const dorm = D.sonoEmAndamento(diaAtual());
    if (!dorm) return;
    const agora = D.horaAgora();
    $$('[data-dormindo]').forEach((el) => { el.textContent = D.descrever(dorm, { agora }); });
    $$('[data-dormindo-total]').forEach((el) => { el.textContent = D.fmtDuracao(D.duracaoSono(dorm, agora)); });
}, 20000);

// virou o dia com a página aberta: acompanha a data de hoje
let ultimoHoje = D.hoje();
setInterval(() => { const h = D.hoje(); if (h !== ultimoHoje) { if (estado.data === ultimoHoje) estado.data = h; ultimoHoje = h; render(); } }, 60000);

// ===================== início =====================
aplicarTema();
const inicial = location.hash.replace('#', '');
if (ABAS.some((a) => a.id === inicial)) estado.aba = inicial;
if (banco.config.migrado) salvar();
render();
window.__diario = { get banco() { return banco; } }; // para testes
