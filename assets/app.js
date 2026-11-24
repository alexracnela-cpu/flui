// FLUI · aplicação (site estático + Supabase)
{
const CFG = window.FLUI_CONFIG || {};
const CONFIGURADO = !!(CFG.SUPABASE_URL && !/^COLE/.test(CFG.SUPABASE_URL) && CFG.SUPABASE_CHAVE && !/^COLE/.test(CFG.SUPABASE_CHAVE));
const sb = CONFIGURADO ? supabase.createClient(CFG.SUPABASE_URL, CFG.SUPABASE_CHAVE) : null;
const BUCKET = 'flui';

/* ---------- constantes ---------- */
const EQS = ['Manutenção', 'Obras leves', 'Obras pesadas', 'Cadastro'];
const SETORES_TODOS = ['Cadastro de pedidos', ...EQS, 'Levantamento', 'Gerência'];
const COR_SETOR = {'Manutenção':'#2E7D32','Obras leves':'#7A4FC0','Obras pesadas':'#3567B5','Cadastro':'#C2563B','Levantamento':'#2B8C9A','Quem cadastrou':'#D08A1E','Concluídos':'#6B7F6E','Inválidos':'#A1261B'};
const SERVICOS = ['Implantação de iluminação pública','Instalação de luminária','Instalação de projetores','Instalação de cabo','Instalação provisória','Implantação de poste','Lançamento de cabo','Manutenção','Melhoramento de iluminação','Reposição de cabo','Reposição de iluminação','Reposição de luminária','Cadastro','Outro'];
const MOT_INV = ['Fora da área do contrato','Serviço já executado','Pedido duplicado','Informações insuficientes no documento','Não é serviço de iluminação pública','Outro'];
const MOT_NEX = ['Sem rede BT / sem baixa tensão','Risco de execução','Sem acesso a caminhão','Rede SMC','Outro'];
const ST = {P:['Pendente','c-amb','#C27A0E'],X:['Executado','c-ok','#2E7D32'],N:['Não executado','c-red','#C0392B'],C:['Cancelado','','#7A867C'],R:['Reequilíbrio','c-pur','#6D4BC2']};
const ETAPA = {aval:['Em avaliação','c-amb'],lev:['Em levantamento','c-blu'],exec:['Em execução','c-amb'],resp:['Aguardando resposta','c-amb'],fim:['Concluído','c-ok'],inv:['Inválido','c-red']};
const TIPO = {E:'Encaminhamento',O:'Ofício',V:'Ouvidoria'};
const NOMEPZ = {resposta:'resposta', execucao:'execução'};
const ICON = {todos:'<path d="M4 6h16M4 12h16M4 18h10"/>',novo:'<path d="M12 5v14M5 12h14"/>',aprov:'<rect x="4" y="5" width="16" height="15" rx="2.5"/><path d="M4 10h16M9 3v4M15 3v4M9 15l2 2 4-4"/>',resp:'<path d="M21 3L10 14M21 3l-7 18-4-7-7-4z"/>',aval:'<path d="M7 3.5h7l4 4V20a.5.5 0 0 1-.5.5h-10.5A.5.5 0 0 1 6.5 20V4a.5.5 0 0 1 .5-.5zM9.5 14l2 2 3.5-4"/>',exec:'<path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L4 17l3 3 5.3-5.3a4 4 0 0 0 5.4-5.4l-2.4 2.4-2.1-.6-.6-2.1z"/>',lev:'<path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/>',usuarios:'<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c.8-3.5 3.4-5.5 6.5-5.5s5.7 2 6.5 5.5M16 4.5a3.5 3.5 0 0 1 0 7M18 14.8c1.9.7 3.1 2.4 3.5 5.2"/>'};

/* ---------- utilidades ---------- */
const $ = s => document.querySelector(s);
const pad = n => String(n).padStart(2,'0');
const isoDe = d => d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate());
const hoje = () => isoDe(new Date());
const dt = iso => iso ? String(iso).slice(8,10)+'/'+String(iso).slice(5,7)+'/'+String(iso).slice(0,4) : '—';
const dataHora = t => t ? new Date(t).toLocaleDateString('pt-BR')+' às '+new Date(t).toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'}) : '';
const dias = (a,b) => Math.round((new Date(String(b).slice(0,10)+'T12:00')-new Date(String(a).slice(0,10)+'T12:00'))/864e5);
const mais = (iso,n) => { const d=new Date(iso+'T12:00'); d.setDate(d.getDate()+n); return isoDe(d); };
const esc = s => String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function msgErro(e){ if(!e) return 'Algo deu errado. Tente de novo.'; const m=e.message||String(e);
  if(/Failed to fetch|NetworkError|network/i.test(m)) return 'Sem internet no momento. Confira a conexão e tente de novo.';
  if(/JWT|session|not authenticated/i.test(m)) return 'Sua sessão expirou. Entre de novo.';
  if(/Could not find the function|schema cache/i.test(m)) return 'O banco ainda não foi atualizado. Rode o último arquivo .sql no Supabase.';
  if(/row-level security|violates/i.test(m)) return 'Você não tem permissão para isso.';
  if(/Invalid login/i.test(m)) return 'Email ou senha incorretos.';
  return m; }
async function rpc(nome,args){ const {data,error}=await sb.rpc(nome,args||{}); if(error) throw new Error(msgErro(error)); return data; }
function toast(t,erro){ const c=$('#camada'), el=document.createElement('div'); el.className='toast'+(erro?' erro':''); el.setAttribute('role','status'); el.textContent=t; c.appendChild(el); setTimeout(()=>el.remove(), erro?6500:3800); }
const ocupado = v => { $('#carregando').hidden = !v; };
async function tarefa(fn, ok){ ocupado(true); try{ const r=await fn(); if(ok) toast(ok); return r===undefined?true:r; } catch(e){ console.error(e); toast(msgErro(e),true); return undefined; } finally{ ocupado(false); } }

/* arquivos */
function arqOk(f, imagens){ const pdf=/\.pdf$/i.test(f.name)||f.type==='application/pdf', img=imagens&&/^image\/(jpeg|png)$/.test(f.type); if(!pdf&&!img) return f.name+' não é '+(imagens?'PDF nem foto JPG/PNG.':'PDF.'); if(f.size>10*1024*1024) return f.name+' passa de 10 MB.'; return ''; }
const slug = s => s.normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/[^\w.-]+/g,'_').slice(-80);
async function enviarArq(file, pasta){ const path=pasta+'/'+Date.now()+'-'+slug(file.name); const {error}=await sb.storage.from(BUCKET).upload(path,file,{upsert:false}); if(error) throw new Error('Não consegui enviar '+file.name+': '+msgErro(error)); return path; }
async function abrirArq(path){ if(!path) return; const w=window.open('','_blank'); const {data,error}=await sb.storage.from(BUCKET).createSignedUrl(path,600); if(error||!data){ if(w) w.close(); toast('Não consegui abrir o arquivo.',true); return; } if(w) w.location=data.signedUrl; else location.href=data.signedUrl; }
const nomeArq = p => p ? p.split('/').pop().replace(/^\d+-/,'') : '';

/* ---------- estado ---------- */
let EU=null, D=[], BAIRROS=[], ZONA={}, DET={}, MSG=null;
const S = { aba:'', sel:{}, f:{} };
const ARQ = {};   // arquivos escolhidos: ARQ[ctx][campo] = File ou [File]
const F = k => (S.f[k] = S.f[k] || {});
const val = (k,f,d='') => S.f[k] && S.f[k][f] != null ? S.f[k][f] : d;
const arq = (k,f) => ARQ[k] && ARQ[k][f];

const limite = (r,tipo) => { const aj = tipo==='resposta' ? r.ajuste_resposta : r.ajuste_execucao; if(aj) return aj; const n = tipo==='resposta' ? r.prazo_resposta : r.prazo_execucao; return n ? mais(r.recebido_em,n) : null; };
const prazoDe = (r,tipo) => { const lim=limite(r,tipo); if(!lim) return {t:'Não informado', s:'Sem prazo no cadastro', v:null, lim:null}; const v=dias(hoje(),lim); const aj = tipo==='resposta'?r.ajuste_resposta:r.ajuste_execucao; return {t: v<0?'Vencido há '+(-v)+' dias':v===0?'Vence hoje':'Vence em '+v+' dias', s:'Limite '+dt(lim)+(aj?' · novo prazo aprovado':''), v, lim}; };
const prazoTxt = r => { const a=prazoDe(r,'execucao'), b=prazoDe(r,'resposta'); if(a.v==null&&b.v==null) return {t:'Sem prazo', v:null}; const m = a.v==null?['Resposta',b]:b.v==null?['Execução',a]:(a.v<=b.v?['Execução',a]:['Resposta',b]); return {t:m[0]+': '+m[1].t.toLowerCase(), v:m[1].v}; };
const nomeP = r => TIPO[r.tipo]+' '+r.numero;
const fechado = r => ['fim','inv'].includes(r.etapa);
const ordemFila = a => a.sort((x,y)=>{ const vx=prazoTxt(x).v, vy=prazoTxt(y).v; return (vx==null?1e5:vx)-(vy==null?1e5:vy) || String(x.recebido_em).localeCompare(String(y.recebido_em)); });
const meu = () => EU.setor;
const filas = {
  aval: eq => D.filter(r=>r.equipe===eq && r.etapa==='aval'),
  exec: eq => D.filter(r=>r.equipe===eq && r.etapa==='exec'),
  lev: () => D.filter(r=>r.etapa==='lev'),
  aprov: () => D.filter(r=>r.prazo_id),
  resp: () => D.filter(r=>r.etapa==='resp')
};

async function recarregar(){
  let todos=[], de=0; const N=1000;
  for(;;){ const {data,error}=await sb.from('flui_v_trilhas').select('*').order('id').range(de,de+N-1); if(error) throw new Error(msgErro(error)); todos=todos.concat(data); if(data.length<N) break; de+=N; }
  D=todos;
}
async function carregarDet(id, forcar){
  if(DET[id] && !forcar) return DET[id];
  const q = t => sb.from(t).select('*').eq('trilha_id',id).order('id');
  const [ev,ro,ar,pz] = await Promise.all([q('flui_eventos'),q('flui_rondas'),q('flui_arquivos'),q('flui_prazos')]);
  for(const x of [ev,ro,ar,pz]) if(x.error) throw new Error(msgErro(x.error));
  return DET[id] = {eventos:ev.data, rondas:ro.data, arquivos:ar.data, prazos:pz.data};
}
function precisaDet(id){ if(DET[id]) return DET[id]; carregarDet(id).then(render).catch(e=>toast(msgErro(e),true)); return null; }
async function depois(id, msg, tipo){ delete DET[id]; await recarregar(); MSG = msg ? [msg, tipo||'ok'] : null; render(); window.scrollTo({top:0, behavior:'smooth'}); }

/* ---------- abas por setor ---------- */
function abasDo(){
  const s=meu(); let a;
  if(s==='Cadastro de pedidos') a=[['todos','Todos',null],['novo','Novo cadastro',null],['aprov','Aprovações',filas.aprov().length],['resp','Respostas',filas.resp().length]];
  else if(s==='Levantamento') a=[['todos','Todos',null],['lev','Levantamento',filas.lev().length]];
  else if(EQS.includes(s)) a=[['todos','Todos',null],['aval','Avaliação',filas.aval(s).length],['exec','Execução',filas.exec(s).length]];
  else a=[['todos','Todos',null]];
  if(EU.admin) a.push(['usuarios','Usuários',null]);
  return a;
}
const temaAtual = () => document.documentElement.dataset.tema || 'light';

function render(){
  const ab=abasDo(); if(!ab.some(a=>a[0]===S.aba)) S.aba = ab.length>1 && ab[1][0]!=='usuarios' ? ab[1][0] : 'todos';
  $('#abas').innerHTML = ab.map(([id,n,c])=>`<button class="aba" role="tab" type="button" data-act="aba" data-v="${id}" aria-selected="${S.aba===id}"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICON[id]}</svg>${n}${c!=null?`<span class="n">${c}</span>`:''}</button>`).join('');
  $('#lado-perfil').innerHTML = 'Você está como<b>'+esc(EU.nome)+'</b>'+esc(EU.setor)+(EU.admin?' · administrador':'');
  $('#u-ini').textContent = EU.nome.split(/\s+/).map(w=>w[0]).join('').slice(0,2).toUpperCase();
  $('#u-quem').innerHTML = '<b>'+esc(EU.nome)+'</b>'+esc(EU.email);
  $('#tema').textContent = temaAtual()==='dark' ? 'Modo claro' : 'Modo escuro';
  const V = {todos:vTodos, novo:vNovo, aval:vAval, exec:vExec, lev:vLev, aprov:vAprov, resp:vResp, usuarios:vUsuarios};
  $('#main').innerHTML = (MSG?`<div class="aviso ${MSG[1]}" role="status" style="margin-bottom:16px">${esc(MSG[0])}</div>`:'') + V[S.aba]();
}

/* ---------- componentes ---------- */
const chipsP = (r,extra) => `<div class="chips"><span class="chip">${TIPO[r.tipo].toUpperCase()}</span>${r.origem?`<span class="chip">${esc(r.origem)}</span>`:''}<span class="chip">${esc(r.equipe.toUpperCase())}</span>${extra||''}</div>`;
const cabecalho = (r,extra) => `${chipsP(r,extra)}<h2 class="tit">${esc(nomeP(r))}</h2><p class="sub">${esc(r.logradouro)}${r.bairro?', '+esc(r.bairro):''} · ${esc(r.servico)}</p>`;
const blocoDados = r => { const pr=prazoDe(r,'resposta'), pe=prazoDe(r,'execucao'), cl=v=>v!=null&&v<0?' venc':''; const irm=D.filter(x=>x.pedido_id===r.pedido_id).map(x=>x.equipe);
  return `<section class="dados" aria-label="Dados do pedido"><div class="prz${cl(pe.v)}"><small>Prazo de execução</small><b>${pe.t}</b><small>${pe.s}</small></div><div class="prz${cl(pr.v)}"><small>Prazo de resposta (carta)</small><b>${pr.t}</b><small>${pr.s}</small></div><dl class="kv">${[['Recebido em',dt(r.recebido_em)],['Bairro',r.bairro||'—'],['Zona',r.zona||'—'],['Equipes',irm.join(', ')],...(r.protocolo?[['Protocolo',r.protocolo]]:[])].map(([k,v])=>`<div><dt>${k}</dt><dd>${esc(v)}</dd></div>`).join('')}</dl></section>`; };
const histHtml = det => det ? `<ul class="hist">${det.eventos.map(h=>`<li><i></i><span><b>${esc(h.texto)}</b> <small>· ${dataHora(h.quando)}${h.quem_nome?' · '+esc(h.quem_nome):''}</small></span></li>`).join('')}</ul>` : '<p class="sub">Carregando histórico…</p>';
const filaHtml = (titulo, itens, sel, vazio, l3) => `<aside class="fila" aria-label="${titulo}"><h3>${titulo}<span>${itens.length}</span></h3>${itens.map(r=>{ const pz=prazoTxt(r); return `<button type="button" class="it ${pz.v!=null&&pz.v<0?'venc':''}" data-act="sel" data-v="${r.id}" aria-current="${r.id===sel}"><span class="l1">${esc(r.numero)}<small>${r.tipo==='O'?'OFÍCIO':r.tipo==='V'?'OUVIDORIA':'ENC.'}</small></span><span class="l2">${esc(r.logradouro)}${r.bairro?' · '+esc(r.bairro):''}</span><span class="l3">${esc(l3(r))}</span></button>`; }).join('')||`<p class="vazio">${vazio}</p>`}</aside>`;
const botaoArq = (path, rotulo) => path ? `<div class="arq" style="background:var(--s1);color:var(--ink)"><span>${rotulo?`<small class="sub">${rotulo}</small><br>`:''}${esc(nomeArq(path))}</span><button type="button" class="b min" data-act="abrir" data-v="${esc(path)}">Abrir</button></div>` : '';
const escolheArq = (k,f,rot,dica,err,multi,imagens) => { const a=arq(k,f); if(a && !multi) return `<div class="arq"><span>${esc(a.name)}</span><button type="button" class="b min" data-act="tira" data-k="${k}" data-f="${f}">Trocar arquivo</button></div>`;
  return `<label class="drop ${err?'err':''}"><span aria-hidden="true">⇪</span><span>${rot}<small>${dica}</small></span><input type="file" data-k="${k}" data-f="${f}" ${multi?'multiple':''} accept="${imagens?'.pdf,image/jpeg,image/png':'.pdf'}"></label>`; };
const selAtual = (aba, itens) => { let s=S.sel[aba]; if(!itens.some(x=>x.id===s)) s = itens[0] ? itens[0].id : null; S.sel[aba]=s; return s; };
const outroCampo = (k,f,v) => v==='Outro' ? `<input class="f" style="margin-top:8px" aria-label="Qual?" data-f="${f}Outro" value="${esc(val(k,f+'Outro'))}" placeholder="Qual?">` : '';
const comOutro = (fo,f) => fo[f]==='Outro' ? (fo[f+'Outro']||'').trim() : (fo[f]||'');

/* ---------- Todos ---------- */
function vTodos(){
  const k='todos', q=val(k,'q').toLowerCase(), et=val(k,'et','aberto'), tp=val(k,'tp','*'), zn=val(k,'zn','*'), ord=val(k,'ord','setor'), se=val(k,'se','*'), vis=val(k,'vis','lista'), pg=+val(k,'pg',0);
  const ANO = hoje().slice(0,4);
  const SETORES = [...EQS,'Levantamento','Quem cadastrou'];
  const setorDe = r => ({aval:r.equipe,exec:r.equipe,lev:'Levantamento',resp:'Quem cadastrou',fim:'Concluídos',inv:'Inválidos'})[r.etapa];
  const ORD = ['aval','lev','exec','resp','fim','inv'], ORDS=[...SETORES,'Concluídos','Inválidos'];
  const ok = r => (et==='*'||(et==='aberto'?!fechado(r):r.etapa===et)) && (se==='*'||setorDe(r)===se) && (tp==='*'||r.tipo===tp) && (zn==='*'||r.zona===zn) && (!q||(r.numero+' '+r.logradouro+' '+(r.bairro||'')).toLowerCase().includes(q));
  const linhas = D.filter(ok).sort(ord==='setor' ? (a,b)=>ORDS.indexOf(setorDe(a))-ORDS.indexOf(setorDe(b))||ORD.indexOf(a.etapa)-ORD.indexOf(b.etapa)||String(a.recebido_em).localeCompare(String(b.recebido_em)) : ord==='recentes' ? (a,b)=>String(b.recebido_em).localeCompare(String(a.recebido_em))||b.id-a.id : ord==='prazo' ? (a,b)=>{const va=prazoTxt(a).v, vb=prazoTxt(b).v; return (va==null?1e5:va)-(vb==null?1e5:vb);} : (a,b)=>ORD.indexOf(a.etapa)-ORD.indexOf(b.etapa)||String(a.recebido_em).localeCompare(String(b.recebido_em)));
  const POR=30, tot=Math.max(1,Math.ceil(linhas.length/POR)), pagina=Math.min(pg,tot-1);
  const zonas=[...new Set(D.map(r=>r.zona).filter(Boolean))].sort();
  const sel=(id,f,lb,ops,v)=>`<div><label class="lb" for="${id}">${lb}</label><select id="${id}" class="f" data-f="${f}" data-re="1">${ops.map(([a,b])=>`<option value="${esc(a)}" ${v===a?'selected':''}>${esc(b)}</option>`).join('')}</select></div>`;
  const trilha = r => { const passos=['Cadastro','Avaliação','Levan­tamento','Execução','Resposta'], idx={aval:1,lev:2,exec:3,resp:4,fim:5,inv:1}[r.etapa];
    return `<span class="trilha" aria-label="Etapa atual: ${ETAPA[r.etapa][0]}">${passos.map((n,i)=>{ let c=i<idx?'feito':i===idx?'agora':'pend'; if(r.etapa==='inv'&&i===1) c='canc'; if(r.etapa==='inv'&&i>1) c='nada'; return `<span class="tp ${c}"><i></i><em>${n}</em></span>`; }).join('')}</span>`; };
  const frase = r => { const d=dias(r.etapa_desde,hoje());
    if(r.etapa==='fim') return `<span class="quem">Concluído</span><span>${ST[r.status][0]}${r.resposta_num?' · carta <b>'+esc(r.resposta_num)+'</b>':''}</span>${r.resposta_num?`<span class="envio">${r.resposta_data?'Enviada em <b>'+dt(r.resposta_data)+'</b>':'Data de envio não registrada'}</span>`:''}`;
    if(r.etapa==='inv') return `<span class="quem">Inválido</span><span>${esc(r.motivo_inv||'')}</span>`;
    const quem={aval:r.equipe,lev:'Levantamento',exec:r.equipe,resp:'Quem cadastrou'}[r.etapa], pz=prazoTxt(r);
    return `<span class="quem">${esc(quem)}</span><span>${ETAPA[r.etapa][0]} · há <b>${d} dias</b>${pz.v!=null&&pz.v<0?' · <b class="vermelho">vencido</b>':''}</span>`; };
  const card = r => `<button type="button" class="pcard" style="--c:${COR_SETOR[setorDe(r)]}" data-act="det" data-v="${r.id}"><span class="top"><b>${esc(r.numero)}</b><small>${TIPO[r.tipo]}${r.importado?' · planilha':''}</small></span><span class="lg">${esc(r.logradouro||'—')}${r.bairro?' · '+esc(r.bairro):''}<small>${esc(r.servico)} · ${esc(r.equipe)}</small></span>${trilha(r)}<span class="fr">${frase(r)}</span></button>`;
  const porSetor = q => D.filter(r=>setorDe(r)===q);
  const pend = tq => { const ids=new Set(D.filter(r=>r.tipo===tq&&!fechado(r)).map(r=>r.pedido_id)); const vc=new Set(D.filter(r=>r.tipo===tq&&!fechado(r)&&(v=>v!=null&&v<0)(prazoDe(r,'resposta').v)).map(r=>r.pedido_id)); return [ids.size, vc.size]; };
  const quadro = SETORES.map(q=>{ const it=D.filter(r=>setorDe(r)===q&&ok(r)).sort((a,b)=>String(a.recebido_em).localeCompare(String(b.recebido_em))); return `<div class="col" style="--c:${COR_SETOR[q]}"><h3><span>${q==='Quem cadastrou'?'Respostas':q}</span><b>${it.length}</b></h3>${it.slice(0,12).map(r=>`<button type="button" class="cartao" data-act="det" data-v="${r.id}"><b>${esc(r.numero)}</b><span>${esc(r.logradouro)}${r.bairro?' · '+esc(r.bairro):''}</span><small>${ETAPA[r.etapa][0]}</small></button>`).join('')||'<p class="vazio">Nada aqui.</p>'}${it.length>12?`<p class="sub" style="text-align:center;font-size:13px">+ ${it.length-12} na lista</p>`:''}</div>`; }).join('');
  let g0=null; const totG={}; linhas.forEach(r=>{const g=setorDe(r); totG[g]=(totG[g]||0)+1;});
  const lista = linhas.slice(pagina*POR,pagina*POR+POR).map(r=>{ let h=''; if(ord==='setor'){ const g=setorDe(r); if(g!==g0){ g0=g; h=`<div class="grp-cab" style="--c:${COR_SETOR[g]}"><i></i><span>${g==='Quem cadastrou'?'Quem cadastrou · respostas':g}</span><b>${totG[g]}</b></div>`; } } return h+card(r); }).join('');
  return `<div class="cab"><div><h2>Todos os pedidos</h2><p>Com quem cada pedido está agora. Clique num setor para filtrar, ou num pedido para ver o caminho dele.</p></div>
  <div class="seg-v" role="group" aria-label="Forma de ver"><button type="button" data-act="set" data-k="${k}" data-f="vis" data-v="lista" aria-pressed="${vis==='lista'}">Lista</button><button type="button" data-act="set" data-k="${k}" data-f="vis" data-v="quadro" aria-pressed="${vis==='quadro'}">Quadro por setor</button></div></div>
  <div class="resumo">${['O','E','V'].map(tq=>{ const [n,vc]=pend(tq), on=tp===tq&&et==='aberto'; return `<button type="button" class="res" data-act="fres" data-v="${tq}" aria-pressed="${on}"><span class="rt">${{O:'Ofícios',E:'Encaminhamentos',V:'Ouvidorias'}[tq]}</span><span class="rq">${n}</span><span class="rs">pendentes de resposta${vc?` · <b class="vermelho">${vc} vencido${vc>1?'s':''}</b>`:''}</span></button>`; }).join('')}</div>
  <div class="esteira">${SETORES.map(q=>{ const it=porSetor(q), sub=EQS.includes(q)?[['aval','Avaliação'],['exec','Execução']].map(([e,n])=>[e,n,it.filter(r=>r.etapa===e).length]):null, on=se===q;
    return `<div class="est ${on?'on':''}" style="--c:${COR_SETOR[q]}"><button type="button" class="est-bt" data-act="fse" data-v="${q}" aria-pressed="${on}"><span class="setor">${q==='Quem cadastrou'?'Cadastro de pedidos':'Equipe'}</span><span class="nome">${q==='Quem cadastrou'?'Respostas':q}</span><span class="qt">${it.length}</span></button>${sub?`<ul class="poreq">${sub.map(([e,n,c])=>`<li><button type="button" data-act="fseEt" data-v="${q}|${e}" aria-pressed="${on&&et===e}" ${c?'':'disabled'}><span>${n}</span><b>${c}</b></button></li>`).join('')}</ul>`:`<ul class="poreq"><li><button type="button" disabled><span>${q==='Levantamento'?'Para levantar':'Para responder'}</span><b>${it.length}</b></button></li></ul>`}</div>`; }).join('')}<div class="est fim ${et==='fim'?'on':''}" style="--c:${COR_SETOR['Concluídos']}"><button type="button" class="est-bt" data-act="fet" data-v="fim" aria-pressed="${et==='fim'}"><span class="setor">Concluídos</span><span class="nome">em ${ANO}</span><span class="qt">${D.filter(r=>r.etapa==='fim'&&String(r.recebido_em).startsWith(ANO)).length}</span></button></div></div>
  <div class="filtros" data-k="${k}"><div class="g"><label class="lb" for="t-q">Buscar</label><input id="t-q" type="search" class="f" data-f="q" data-re="1" value="${esc(val(k,'q'))}" placeholder="Número, rua ou bairro"></div>
  ${sel('t-tp','tp','Tipo',[['*','Todos'],...Object.entries(TIPO)],tp)}
  ${sel('t-et','et','Etapa',[['aberto','Em andamento'],['*','Todas'],...Object.entries(ETAPA).map(([a,b])=>[a,b[0]])],et)}
  ${sel('t-se','se','Setor',[['*','Todos'],...SETORES.map(e=>[e,e==='Quem cadastrou'?'Quem cadastrou (respostas)':e])],se)}
  ${sel('t-zn','zn','Zona',[['*','Todas'],...zonas.map(z=>[z,z])],zn)}
  ${sel('t-or','ord','Organizar por',[['setor','Setor'],['etapa','Etapa'],['recentes','Mais recentes'],['prazo','Prazo']],ord)}</div>
  ${vis==='quadro'?`<div class="quadro">${quadro}</div>`:`<div class="lista">${lista||'<p class="vazio">Nenhum pedido com esses filtros.</p>'}</div>
  <div class="pag"><span>${linhas.length} pedidos · página ${pagina+1} de ${tot}</span><span style="display:flex;gap:8px"><button type="button" class="b min" data-act="pg" data-v="${pagina-1}" ${pagina?'':'disabled'}>← Anterior</button><button type="button" class="b min" data-act="pg" data-v="${pagina+1}" ${pagina<tot-1?'':'disabled'}>Próxima →</button></span></div>`}`;
}
async function detalhe(id){
  const r=D.find(x=>x.id===id); if(!r) return;
  const pinta = det => { $('#camada').innerHTML = `<div class="modal" data-act="fechar"><div class="card" role="dialog" aria-modal="true" aria-label="${esc(nomeP(r))}" data-stop="1">${cabecalho(r,`<span class="chip ${ETAPA[r.etapa][1]}">${ETAPA[r.etapa][0]}</span>`)}${blocoDados(r)}
    ${r.etapa==='fim'?`<p class="sub" style="margin:0">Resultado: <b>${ST[r.status][0]}</b>${r.resposta_num?' · carta '+esc(r.resposta_num)+(r.resposta_data?' enviada em '+dt(r.resposta_data):''):''}</p>`:''}
    ${r.etapa==='inv'?`<p class="sub" style="margin:0">Inválido: <b>${esc(r.motivo_inv)}</b> · ${esc(r.just_inv)}</p>`:''}${r.obs?`<p class="sub" style="margin:0">${esc(r.obs)}</p>`:''}
    <h2>Caminho</h2>${histHtml(det)}<h2>Documentos</h2>${[botaoArq(r.doc_path,'Cadastro'),botaoArq(r.rel_lev_path,'Levantamento'),...(det?det.arquivos.map(a=>botaoArq(a.path,'Execução')):[]),botaoArq(r.resposta_path,'Carta de resposta')].join('')||'<p class="sub">Nenhum documento.</p>'}
    <div class="acoes"><button type="button" class="b" data-act="fechar">Fechar</button></div></div></div>`; };
  pinta(DET[id]); if(!DET[id]) { try { pinta(await carregarDet(id)); } catch(e){ toast(msgErro(e),true); } }
}

/* ---------- Novo cadastro ---------- */
function vNovo(){
  const k='novo', tp=val(k,'tipo','O'), eqs=val(k,'eqs',[]), er=val(k,'_er',{}), b=val(k,'bairro'), rec=val(k,'receb',hoje());
  return `<div class="cab"><div><h2>Novo pedido</h2><p>Registre o encaminhamento, ofício ou ouvidoria assim que o documento chegar.</p></div><p class="sub"><span class="req">*</span> obrigatório</p></div>
  <div class="trab" data-k="${k}" style="max-width:860px">
  <section class="card"><h2>1 · Documento</h2>
    <div><span class="lb">Tipo <span class="req">*</span></span><div class="seg">${Object.entries(TIPO).map(([v,n])=>`<button type="button" class="op-bt" data-act="set" data-k="${k}" data-f="tipo" data-v="${v}" aria-pressed="${tp===v}">${n}</button>`).join('')}</div></div>
    <div><span class="lb">Origem <span class="req">*</span></span><div class="seg">${['AGEMAN','UGPM'].map(v=>`<button type="button" class="op-bt" data-act="set" data-k="${k}" data-f="origem" data-v="${v}" aria-pressed="${val(k,'origem','AGEMAN')===v}">${v}</button>`).join('')}</div></div>
    <div class="lin"><div><label class="lb" for="n-num">Número do ${TIPO[tp].toLowerCase()} <span class="req">*</span></label><input id="n-num" class="f ${er.numero?'err':''}" data-f="numero" value="${esc(val(k,'numero'))}" placeholder="Ex.: 412/2026">${er.numero?`<small style="color:var(--redt);font-weight:600">${er.numero}</small>`:'<small class="sub">Como está no documento</small>'}</div>
    ${tp==='V'?`<div><label class="lb" for="n-prot">Nº do protocolo <span class="req">*</span></label><input id="n-prot" class="f ${er.protocolo?'err':''}" data-f="protocolo" value="${esc(val(k,'protocolo'))}"></div>`:''}
    <div><label class="lb" for="n-rec">Data do recebimento <span class="req">*</span></label><input id="n-rec" type="date" class="f" data-f="receb" data-re="1" value="${rec}"></div></div>
  </section>
  <section class="card"><h2>2 · Local</h2>
    <div><label class="lb" for="n-log">Logradouro <span class="req">*</span></label><input id="n-log" class="f ${er.logradouro?'err':''}" data-f="logradouro" value="${esc(val(k,'logradouro'))}" placeholder="Rua, avenida, ponto de referência"></div>
    <div class="lin"><div style="flex:2 1 260px"><label class="lb" for="n-bai">Bairro <span class="req">*</span></label><select id="n-bai" class="f ${er.bairro?'err':''}" data-f="bairro" data-re="1"><option value="">Selecione o bairro</option>${BAIRROS.map(x=>`<option value="${esc(x.nome)}" ${b===x.nome?'selected':''}>${esc(x.nome)}</option>`).join('')}</select></div>
    <div><span class="lb">Zona <span class="op">(automático)</span></span><div class="f" style="display:flex;align-items:center;background:var(--s1);border-color:var(--s1);font-weight:700">${b?esc(ZONA[b]||''):'Escolha o bairro'}</div></div></div>
  </section>
  <section class="card"><h2>3 · Serviço e prazos</h2>
    <div><label class="lb" for="n-srv">Descrição do serviço <span class="req">*</span></label><select id="n-srv" class="f ${er.servico?'err':''}" data-f="servico" data-re="1"><option value="">Selecione o serviço</option>${SERVICOS.map(x=>`<option ${val(k,'servico')===x?'selected':''}>${x}</option>`).join('')}</select>${val(k,'servico')==='Outro'?`<input class="f ${er.servicoOutro?'err':''}" style="margin-top:8px" aria-label="Qual serviço?" data-f="servicoOutro" value="${esc(val(k,'servicoOutro'))}" placeholder="Qual serviço?">`:''}</div>
    ${[['prazoExec','n-pe','Prazo de execução do serviço','Executar até'],['prazo','n-pz','Prazo de resposta (carta)','Responder até']].map(([f,id,lb,frase])=>{ const d=+val(k,f,0); return `<div><label class="lb" for="${id}">${lb} <span class="op">(dias)</span></label><div class="seg" style="align-items:center"><input id="${id}" type="number" min="0" class="f" style="width:120px;flex:none" data-f="${f}" data-re="1" value="${d||''}" placeholder="0">${[5,10,15,30].map(n=>`<button type="button" class="b min" data-act="set" data-k="${k}" data-f="${f}" data-v="${n}">${n}d</button>`).join('')}</div><p class="sub" style="margin-top:6px">${d?frase+' <b>'+dt(mais(rec,d))+'</b> (dias corridos a partir do recebimento)':'Sem prazo definido'}</p></div>`; }).join('')}
  </section>
  <section class="card"><h2>4 · Documento digitalizado <span class="req">*</span></h2>${escolheArq(k,'doc','Anexar o PDF do '+TIPO[tp].toLowerCase(),'Só PDF, até 10 MB',er.doc)}</section>
  <section class="card"><h2>5 · Encaminhar</h2><span class="lb">Para quais equipes? <span class="req">*</span></span>
    <div class="seg">${EQS.map(e=>`<button type="button" class="op-bt" data-act="eqs" data-v="${e}" aria-pressed="${eqs.includes(e)}" ${er.eqs&&!eqs.length?'style="border-color:var(--redt)"':''}>${eqs.includes(e)?'☑':'☐'} ${e}</button>`).join('')}</div>
    ${Object.keys(er).length?`<div class="aviso er">Faltam campos obrigatórios. Eles estão marcados em vermelho.</div>`:''}
    <div class="acoes"><button type="button" class="b" data-act="limpaNovo">Limpar</button><button type="button" class="b p" data-act="enviarNovo">${eqs.length?'Enviar para '+(eqs.length===1?eqs[0]:eqs.length+' equipes'):'Enviar'}</button></div>
  </section></div>`;
}
async function enviarNovo(){
  const k='novo', f=F(k), tp=f.tipo||'O', er={}, num=(f.numero||'').trim(), doc=arq(k,'doc');
  if(!num) er.numero='Informe o número.'; else if(!/^0*\d+\s*[\/-]\s*\d{4}$/.test(num)) er.numero='Use número/ano, ex.: 412/2026.'; else if(D.some(r=>r.tipo===tp&&r.numero.replace(/^0+/,'')===num.replace(/^0+/,''))) er.numero='Já existe '+TIPO[tp].toLowerCase()+' com esse número.';
  if(tp==='V'&&!(f.protocolo||'').trim()) er.protocolo=1;
  if(!(f.logradouro||'').trim()) er.logradouro=1; if(!f.bairro) er.bairro=1; if(!f.servico) er.servico=1; else if(f.servico==='Outro'&&!(f.servicoOutro||'').trim()) er.servicoOutro=1;
  if(!doc) er.doc=1; if(!(f.eqs||[]).length) er.eqs=1;
  if(Object.keys(er).length){ f._er=er; MSG=null; return render(); }
  const ok = await tarefa(async()=>{
    const path = await enviarArq(doc, 'pedidos/'+tp+'-'+slug(num));
    return rpc('flui_cadastrar_pedido',{p:{tipo:tp, origem:f.origem||'AGEMAN', numero:num, protocolo:f.protocolo||'', recebido_em:f.receb||hoje(), logradouro:f.logradouro.trim(), bairro:f.bairro, servico:comOutro(f,'servico'), prazo_resposta:+f.prazo||0, prazo_execucao:+f.prazoExec||0, doc_path:path, equipes:f.eqs}});
  });
  if(ok===undefined) return;
  const eqs=f.eqs.join(', '); S.f[k]={}; delete ARQ[k];
  await depois(null, TIPO[tp]+' '+num+' cadastrado e enviado para '+eqs+'.');
}

/* ---------- Avaliação ---------- */
function vAval(){
  const eq=meu(), itens=ordemFila(filas.aval(eq)), sel=selAtual('aval',itens), r=itens.find(x=>x.id===sel);
  const fila = filaHtml('Aguardando avaliação', itens, sel, 'Nada para avaliar agora.', r=>{const pz=prazoTxt(r);return pz.v==null?'Há '+dias(r.recebido_em,hoje())+' dias · sem prazo':pz.t;});
  let corpo='';
  if(r){ const k='av:'+r.id, d=val(k,'dec'), er=val(k,'_er','');
    corpo=`<div class="trab" data-k="${k}">${cabecalho(r,'<span class="chip c-amb">AGUARDANDO AVALIAÇÃO</span>')}${blocoDados(r)}
    <section class="card"><h2>Documento</h2>${botaoArq(r.doc_path)||'<p class="sub">Pedido importado da planilha, sem documento anexado.</p>'}</section>
    <section class="card"><h2>O pedido é válido?</h2><div class="seg"><button type="button" class="op-bt" data-act="set" data-k="${k}" data-f="dec" data-v="V" aria-pressed="${d==='V'}">✓ Válido<small>Encaminhar para o Levantamento</small></button><button type="button" class="op-bt neg" data-act="set" data-k="${k}" data-f="dec" data-v="I" aria-pressed="${d==='I'}">✕ Inválido<small>Responder com justificativa</small></button></div>
    ${d==='V'?`<div class="caixa"><div><label class="lb" for="av-or">Orientação para o Levantamento <span class="op">(opcional)</span></label><textarea id="av-or" class="f" data-f="orient">${esc(val(k,'orient'))}</textarea></div><div class="acoes"><button type="button" class="b p" data-act="validar">Encaminhar para Levantamento →</button></div></div>`:''}
    ${d==='I'?`<div class="caixa" style="background:var(--red)"><div><label class="lb" for="av-mo">Motivo <span class="req">*</span></label><select id="av-mo" class="f" data-f="motivo" data-re="1"><option value="">Selecione</option>${MOT_INV.map(m=>`<option ${val(k,'motivo')===m?'selected':''}>${m}</option>`).join('')}</select>${outroCampo(k,'motivo',val(k,'motivo'))}</div><div><label class="lb" for="av-ju">Justificativa <span class="req">*</span></label><textarea id="av-ju" class="f" data-f="just" placeholder="Esse texto vai na resposta">${esc(val(k,'just'))}</textarea></div>${er?`<div class="aviso er">${er}</div>`:''}<div class="acoes"><button type="button" class="b neg" data-act="invalidar">Registrar como inválido</button></div></div>`:''}
    </section></div>`; }
  return `<div class="cab"><div><h2>${esc(eq)} · Avaliação</h2><p>Veja o documento e decida: segue para o Levantamento ou é respondido como inválido.</p></div></div><div class="grid2">${fila}${corpo}</div>`;
}

/* ---------- Levantamento ---------- */
function vLev(){
  const itens=filas.lev().sort((a,b)=>String(a.etapa_desde).localeCompare(String(b.etapa_desde))), sel=selAtual('lev',itens), r=itens.find(x=>x.id===sel);
  const fila = filaHtml('Para levantar', itens, sel, 'Nenhum levantamento pendente.', r=>r.equipe+' · há '+dias(r.etapa_desde,hoje())+' dias');
  let corpo='';
  if(r){ const k='lv:'+r.id, er=val(k,'_er'), det=precisaDet(r.id);
    corpo=`<div class="trab" data-k="${k}">${cabecalho(r,'<span class="chip c-blu">EM LEVANTAMENTO</span>')}${blocoDados(r)}
    <section class="card"><h2>O que já aconteceu</h2>${histHtml(det)}${r.orient_lev?`<div class="aviso am">Orientação da ${esc(r.equipe)}: ${esc(r.orient_lev)}</div>`:''}${botaoArq(r.doc_path,'Documento do cadastro')}</section>
    <section class="card"><h2>Relatório do levantamento <span class="req">*</span></h2>${escolheArq(k,'rel','Anexar relatório em PDF','Com as informações levantadas em campo',er)}
    <div><label class="lb" for="lv-obs">Observação <span class="op">(opcional)</span></label><textarea id="lv-obs" class="f" data-f="obs">${esc(val(k,'obs'))}</textarea></div>
    ${er?'<div class="aviso er">Anexe o relatório para concluir.</div>':''}<div class="acoes"><button type="button" class="b p" data-act="concluirLev">Concluir e devolver para ${esc(r.equipe)} →</button></div></section></div>`; }
  return `<div class="cab"><div><h2>Levantamento</h2><p>Depois do campo, anexe o relatório: o pedido volta para a equipe que avaliou, para executar.</p></div></div><div class="grid2">${fila}${corpo}</div>`;
}

/* ---------- Execução ---------- */
function vExec(){
  const eq=meu(), itens=ordemFila(filas.exec(eq)), sel=selAtual('exec',itens), r=itens.find(x=>x.id===sel);
  const fila = filaHtml('Para executar', itens, sel, 'Nada para executar agora.', r=>(r.prazo_id?'Prazo em aprovação · ':'')+prazoTxt(r).t);
  let corpo='';
  if(r){ const k='ex:'+r.id, st=val(k,'st',r.status||'P'), er=val(k,'_er',''), det=precisaDet(r.id);
    const ultimo = det && det.prazos.length ? det.prazos[det.prazos.length-1] : null;
    corpo=`<div class="trab" data-k="${k}">${cabecalho(r,'<span class="chip c-amb">EM EXECUÇÃO</span>')}${blocoDados(r)}
    <section class="card"><h2>O que já aconteceu</h2>${histHtml(det)}${botaoArq(r.doc_path,'Documento do cadastro')}${botaoArq(r.rel_lev_path,'Relatório do levantamento')}${r.rel_lev_obs?`<p class="sub" style="margin:0">Levantamento: ${esc(r.rel_lev_obs)}</p>`:''}${r.obs&&!val(k,'obs')?'':''}</section>
    <section class="card"><div style="display:flex;flex-wrap:wrap;justify-content:space-between;gap:10px;align-items:center"><h2>Prazos</h2>${!r.prazo_id?`<button type="button" class="b min" data-act="set" data-k="${k}" data-f="npOpen" data-v="1">Pedir novo prazo</button>`:''}</div>
    ${r.prazo_id?`<div class="aviso am"><span><b>Aguardando aprovação.</b> Novo prazo de ${NOMEPZ[r.prazo_tipo]} para ${dt(r.prazo_sugerido)} · "${esc(r.prazo_motivo)}". A execução continua normalmente.</span><button type="button" class="b min" data-act="cancelarPrazo" data-v="${r.prazo_id}">Desistir</button></div>`:''}
    ${!r.prazo_id&&ultimo&&ultimo.situacao==='aprov'?`<div class="aviso ok">Novo prazo de ${NOMEPZ[ultimo.tipo]} aprovado até ${dt(ultimo.data_aprovada)}${ultimo.data_aprovada!==ultimo.data_sugerida?' (sugerido era '+dt(ultimo.data_sugerida)+')':''}.</div>`:''}
    ${!r.prazo_id&&ultimo&&ultimo.situacao==='recus'?`<div class="aviso er">Pedido de novo prazo de ${NOMEPZ[ultimo.tipo]} recusado: ${esc(ultimo.motivo_recusa)}</div>`:''}
    ${val(k,'npOpen')&&!r.prazo_id?`<div class="caixa"><div><span class="lb">Qual prazo? <span class="req">*</span></span><div class="seg">${[['execucao','Prazo de execução'],['resposta','Prazo de resposta (carta)']].map(([v,n])=>`<button type="button" class="op-bt" data-act="set" data-k="${k}" data-f="npTipo" data-v="${v}" aria-pressed="${val(k,'npTipo','execucao')===v}">${n}<small>Atual: ${prazoDe(r,v).lim?dt(prazoDe(r,v).lim):'sem prazo'}</small></button>`).join('')}</div></div><div class="lin"><div><label class="lb" for="np-d">Novo prazo sugerido <span class="req">*</span></label><input id="np-d" type="date" class="f" data-f="npData" value="${val(k,'npData')}"></div><div style="flex:3 1 260px"><label class="lb" for="np-j">Por que precisa de mais prazo? <span class="req">*</span></label><input id="np-j" class="f" data-f="npJust" value="${esc(val(k,'npJust'))}"></div></div><p class="sub" style="font-size:13px">Vai para quem cadastrou. Não trava a execução.</p><div class="acoes"><button type="button" class="b min" data-act="set" data-k="${k}" data-f="npOpen" data-v="">Cancelar</button><button type="button" class="b min" style="background:var(--act);color:#fff;border-color:var(--act)" data-act="pedirPrazo">Enviar pedido de prazo</button></div></div>`:''}</section>
    <section class="card"><h2>Status da execução</h2><div class="seg">${Object.entries(ST).map(([v,s])=>`<button type="button" class="op-bt" data-act="set" data-k="${k}" data-f="st" data-v="${v}" aria-pressed="${st===v}"><span class="dot" style="background:${s[2]}"></span>${s[0]}</button>`).join('')}</div>
    ${st==='N'?`<div><label class="lb" for="ex-mo">Motivo <span class="req">*</span></label><select id="ex-mo" class="f" data-f="motivo" data-re="1"><option value="">Selecione</option>${MOT_NEX.map(m=>`<option ${val(k,'motivo')===m?'selected':''}>${m}</option>`).join('')}</select>${outroCampo(k,'motivo',val(k,'motivo'))}</div>`:''}
    ${st==='R'?`<div><label class="lb" for="ex-re">Nº do reequilíbrio <span class="req">*</span></label><input id="ex-re" class="f" data-f="reeq" value="${esc(val(k,'reeq',r.reequilibrio||''))}"></div>`:''}
    ${st==='X'?`<div><label class="lb" for="ex-de">Data da execução <span class="req">*</span></label><input id="ex-de" type="date" class="f" style="max-width:240px" data-f="dataExec" value="${val(k,'dataExec',r.data_exec||hoje())}"></div>`:''}
    <div><label class="lb" for="ex-ob">Observação</label><textarea id="ex-ob" class="f" data-f="obs">${esc(val(k,'obs',r.obs||''))}</textarea></div></section>
    <section class="card"><h2>Rondas</h2><ul class="hist">${det?(det.rondas.map(o=>`<li><i></i><span><b>Ronda ${dt(o.data)}</b> <small>· ${o.data>hoje()?'agendada':'realizada'}${o.obs?' · '+esc(o.obs):''}</small></span></li>`).join('')||'<li class="sub">Nenhuma ronda registrada.</li>'):'<li class="sub">Carregando…</li>'}</ul>
    <div class="lin" style="align-items:flex-end"><div><label class="lb" for="ro-d">Data da ronda</label><input id="ro-d" type="date" class="f" data-f="roData" value="${val(k,'roData')}"></div><div style="flex:3 1 220px"><label class="lb" for="ro-o">O que foi feito / previsto</label><input id="ro-o" class="f" data-f="roObs" value="${esc(val(k,'roObs'))}"></div><div style="flex:0 0 auto"><button type="button" class="b" data-act="addRonda">+ Ronda</button></div></div></section>
    <section class="card"><h2>Documentos da execução</h2>${det?det.arquivos.map(a=>`<div class="arq"><span>${esc(a.nome)}</span><span style="display:flex;gap:6px;flex:0 0 auto"><button type="button" class="b min" data-act="abrir" data-v="${esc(a.path)}">Abrir</button><button type="button" class="b min" data-act="tiraDoc" data-v="${a.id}">Remover</button></span></div>`).join(''):''}<label class="drop"><span aria-hidden="true">⇪</span><span>Anexar arquivos<small>Fotos (JPG/PNG) ou PDF · obrigatório para finalizar</small></span><input type="file" multiple accept=".pdf,image/jpeg,image/png" data-k="${k}" data-f="docs" data-up="1"></label></section>
    ${er?`<div class="aviso er">${er}</div>`:''}<div class="acoes"><button type="button" class="b p" data-act="salvarExec">${st==='P'?'Salvar atualização':'Finalizar e enviar para resposta'}</button></div></div>`; }
  return `<div class="cab"><div><h2>${esc(eq)} · Execução</h2><p>Pedidos que voltaram do Levantamento. Registre rondas, documentos e o status.</p></div></div><div class="grid2">${fila}${corpo}</div>`;
}

/* ---------- Aprovações ---------- */
function vAprov(){
  const itens=filas.aprov().sort((a,b)=>String(a.prazo_pedido_em).localeCompare(String(b.prazo_pedido_em))), sel=selAtual('aprov',itens), r=itens.find(x=>x.id===sel);
  const fila = filaHtml('Pedidos de novo prazo', itens, sel, 'Nenhum pedido de prazo esperando você.', r=>r.equipe+' · '+NOMEPZ[r.prazo_tipo]+' até '+dt(r.prazo_sugerido));
  let corpo='';
  if(r){ const k='ap:'+r.id, d=val(k,'dec'), dAp=val(k,'data',r.prazo_sugerido), er=val(k,'_er',''), tpz=r.prazo_tipo, lim=limite(r,tpz);
    corpo=`<div class="trab" data-k="${k}">${cabecalho(r,'<span class="chip c-amb">EM EXECUÇÃO</span>')}
    <div class="lin"><div class="card" style="gap:4px"><small class="sub">Prazo de ${NOMEPZ[tpz]} atual</small><b style="font-size:22px">${lim?dt(lim):'Sem prazo'}</b><small class="sub">${lim?prazoDe(r,tpz).t:'Não foi definido no cadastro'}</small></div>
    <div class="card" style="gap:6px;background:var(--sel);color:var(--selink);border:2px solid var(--act)"><label for="ap-d" style="font-size:13px;color:var(--mut)">Novo prazo de ${NOMEPZ[tpz]} <b style="color:var(--act)">· pode editar</b></label><input id="ap-d" type="date" class="f" data-f="data" data-re="1" value="${dAp}" style="font-weight:800;color:#1E2B21;background:#fff"><small class="sub">Daqui a ${dias(hoje(),dAp)} dias${dAp!==r.prazo_sugerido?' · sugerido pela equipe: '+dt(r.prazo_sugerido):''}</small>${dAp!==r.prazo_sugerido?`<button type="button" class="b min" style="align-self:flex-start" data-act="set" data-k="${k}" data-f="data" data-v="${r.prazo_sugerido}">Voltar para a sugestão</button>`:''}</div></div>
    <section class="card"><h2>Motivo informado pela ${esc(r.equipe)}</h2><p style="margin:0">${esc(r.prazo_motivo)}</p><small class="sub">Pedido em ${dataHora(r.prazo_pedido_em)} · a execução continua enquanto você decide</small></section>
    <section class="card"><h2>Sua decisão</h2><div class="seg"><button type="button" class="op-bt" data-act="set" data-k="${k}" data-f="dec" data-v="A" aria-pressed="${d==='A'}">✓ Aprovar<small>Com a data acima, anexando a carta</small></button><button type="button" class="op-bt neg" data-act="set" data-k="${k}" data-f="dec" data-v="R" aria-pressed="${d==='R'}">✕ Recusar<small>Mantém o prazo atual</small></button></div>
    ${d==='A'?`<div class="caixa">${escolheArq(k,'carta','Anexar a carta em PDF','A carta que formaliza o novo prazo',er)}${er?'<div class="aviso er">Anexe a carta para aprovar.</div>':''}<div class="acoes"><button type="button" class="b p" data-act="aprovar">Aprovar prazo até ${dt(dAp)}</button></div></div>`:''}
    ${d==='R'?`<div class="caixa" style="background:var(--red)"><div><label class="lb" for="ap-m">Por que foi recusado? <span class="req">*</span></label><textarea id="ap-m" class="f" data-f="mot">${esc(val(k,'mot'))}</textarea></div>${er?'<div class="aviso er">Explique o motivo da recusa.</div>':''}<div class="acoes"><button type="button" class="b neg" data-act="recusar">Recusar pedido de prazo</button></div></div>`:''}</section></div>`; }
  return `<div class="cab"><div><h2>Aprovações de prazo</h2><p>As equipes pedem mais prazo durante a execução. Aprove anexando a carta, ou recuse explicando.</p></div></div><div class="grid2">${fila}${corpo}</div>`;
}

/* ---------- Respostas ---------- */
function vResp(){
  const itens=filas.resp().sort((a,b)=>String(a.etapa_desde).localeCompare(String(b.etapa_desde))), sel=selAtual('resp',itens), r=itens.find(x=>x.id===sel);
  const fila = filaHtml('Para responder', itens, sel, 'Tudo respondido.', r=>ST[r.status][0]+' · '+r.equipe);
  let corpo='';
  if(r){ const k='rs:'+r.id, er=val(k,'_er',''), s=ST[r.status], det=precisaDet(r.id);
    corpo=`<div class="trab" data-k="${k}">${cabecalho(r,'<span class="chip c-amb">AGUARDANDO RESPOSTA</span>')}${blocoDados(r)}
    <section class="card"><span class="chip ${s[1]}" style="align-self:flex-start">${s[0].toUpperCase()}</span><b style="font-size:18px">${r.status==='X'?'Executado em '+dt(r.data_exec):r.status==='N'?'Motivo: '+esc(r.motivo):r.status==='R'?'Reequilíbrio '+esc(r.reequilibrio):'Cancelado'}</b>${r.obs?`<p class="sub" style="margin:0">Observação da equipe: ${esc(r.obs)}</p>`:''}${det?`<p class="sub" style="margin:0">${det.rondas.length} ronda(s) registrada(s)</p>`:''}${histHtml(det)}</section>
    <section class="card"><h2>Documentos do pedido</h2>${botaoArq(r.doc_path,'Cadastro')}${botaoArq(r.rel_lev_path,'Levantamento')}${det?det.arquivos.map(a=>botaoArq(a.path,'Execução')).join(''):'<p class="sub">Carregando…</p>'}</section>
    <section class="card"><h2>Resposta ao ${TIPO[r.tipo].toLowerCase()}</h2><div class="lin"><div><label class="lb" for="rs-n">Nº da carta de resposta <span class="req">*</span></label><input id="rs-n" class="f ${er&&!val(k,'num')?'err':''}" data-f="num" value="${esc(val(k,'num'))}" placeholder="Ex.: 0640/2026"></div><div><label class="lb" for="rs-d">Data de envio <span class="req">*</span></label><input id="rs-d" type="date" class="f" data-f="data" value="${val(k,'data',hoje())}"></div></div>
    ${escolheArq(k,'carta','Anexar a carta assinada','PDF · até 10 MB',er&&!arq(k,'carta'))}${er?`<div class="aviso er">${er}</div>`:''}<div class="acoes"><button type="button" class="b p" data-act="responder">Registrar resposta e concluir</button></div></section></div>`; }
  return `<div class="cab"><div><h2>Responder pedidos</h2><p>A equipe finalizou. Confira o que foi feito e registre a carta de resposta.</p></div></div><div class="grid2">${fila}${corpo}</div>`;
}

/* ---------- Usuários (administrador) ---------- */
let USU=null;
async function carregarUsuarios(){ const {data,error}=await sb.from('flui_perfis').select('*').order('nome'); if(error) throw new Error(msgErro(error)); USU=data||[]; }
function vUsuarios(){
  if(!USU){ carregarUsuarios().then(render).catch(e=>toast(msgErro(e),true)); return '<p class="sub">Carregando…</p>'; }
  const k='usu', f=S.f[k]||{}, st=u=>!u.ativo?'off':u.senha_ok?'ativo':(u.convite_expira&&new Date(u.convite_expira)<new Date()?'exp':'pend');
  const sit={ativo:'<span class="chip c-ok">Ativo</span>',pend:'<span class="chip c-amb">Aguardando primeiro acesso</span>',exp:'<span class="chip c-red">Senha provisória venceu</span>',off:'<span class="chip">Desativado</span>'};
  return `<div class="cab"><div><h2>Usuários</h2><p>Cada pessoa só vê as abas do próprio setor. ${USU.filter(u=>st(u)==='ativo').length} ativos.</p></div>${f.aberto?'':`<button type="button" class="b p" data-act="set" data-k="${k}" data-f="aberto" data-v="1">+ Novo acesso</button>`}</div>
  ${f.aberto?`<section class="card" data-k="${k}" style="max-width:720px;margin-bottom:16px"><h2>Novo acesso</h2><div class="lin"><div><label class="lb" for="u-n">Nome <span class="req">*</span></label><input id="u-n" class="f" data-f="nome" value="${esc(f.nome||'')}"></div><div><label class="lb" for="u-e">Email <span class="req">*</span></label><input id="u-e" class="f" data-f="email" value="${esc(f.email||'')}" inputmode="email"></div><div><label class="lb" for="u-s">Setor <span class="req">*</span></label><select id="u-s" class="f" data-f="setor"><option value="">Selecione</option>${SETORES_TODOS.map(s=>`<option ${f.setor===s?'selected':''}>${s}</option>`).join('')}</select></div></div>
  <p class="sub" style="font-size:13px;margin:0">Se a pessoa já tem conta no Rondaluz, ela entra com a mesma senha. Se não tem, o sistema gera uma senha provisória para você repassar.</p>${f._er?`<div class="aviso er">${esc(f._er)}</div>`:''}<div class="acoes"><button type="button" class="b" data-act="set" data-k="${k}" data-f="aberto" data-v="">Cancelar</button><button type="button" class="b p" data-act="criarUsuario">Criar acesso</button></div></section>`:''}
  <div class="tabela scroll"><table class="stack"><thead><tr><th scope="col" style="padding:10px 14px">Pessoa</th><th scope="col" style="padding:10px 14px">Setor</th><th scope="col" style="padding:10px 14px">Situação</th><th scope="col" style="padding:10px 14px">Último acesso</th><th scope="col" style="padding:10px 14px"></th></tr></thead><tbody>
  ${USU.map(u=>{ const s=st(u), euMesmo=u.id===EU.id; return `<tr style="cursor:default"><td><b>${esc(u.nome)}</b>${u.admin?' <span class="chip">Admin</span>':''}<small class="tp">${esc(u.email)}</small></td><td>${euMesmo?esc(u.setor):`<select class="f" style="height:40px;font-size:14px" data-setor="${u.id}" aria-label="Setor de ${esc(u.nome)}">${SETORES_TODOS.map(x=>`<option ${x===u.setor?'selected':''}>${x}</option>`).join('')}</select>`}</td><td>${sit[s]}${s==='pend'?`<small class="tp">vale até ${dataHora(u.convite_expira)}</small>`:''}</td><td>${u.ultimo_acesso?dataHora(u.ultimo_acesso):'—'}</td><td>${euMesmo?'<span class="sub">você</span>':s==='off'?`<button type="button" class="b min" data-act="ativar" data-v="${u.id}">Reativar</button>`:`<span style="display:flex;gap:6px;flex-wrap:wrap"><button type="button" class="b min" data-act="novaSenha" data-v="${u.id}">Nova senha provisória</button><button type="button" class="b min" data-act="desativar" data-v="${u.id}">Desativar</button></span>`}</td></tr>`; }).join('')}
  </tbody></table></div>`;
}
async function acesso(corpo){
  const {data,error}=await sb.functions.invoke('flui-convidar',{body:corpo});
  if(error){ let m=error.message; try{ const j=await error.context.json(); m=j.erro||m; }catch(e){} throw new Error(/Failed to send|not found|404/i.test(m)?'A função "flui-convidar" ainda não foi publicada no Supabase.':m); }
  if(data&&data.erro) throw new Error(data.erro); return data;
}
function mostraSenha(nome, r){
  const site=location.origin+location.pathname;
  const txt = r.senha ? `Olá, ${nome.split(' ')[0]}! Seu acesso ao Flui (encaminhamentos e ofícios) foi criado.\n\nSite: ${site}\nEmail: ${r.email}\nSenha provisória: ${r.senha}\n\nA senha provisória vale até ${dataHora(r.expira)}. No primeiro acesso você vai criar a sua própria senha.`
    : `Olá, ${nome.split(' ')[0]}! Você agora tem acesso ao Flui (encaminhamentos e ofícios).\n\nSite: ${site}\nEmail: ${r.email}\nUse a mesma senha do Rondaluz.`;
  $('#camada').innerHTML = `<div class="modal"><div class="card" role="dialog" aria-modal="true" aria-label="Acesso criado"><h2>Acesso de ${esc(nome)} pronto</h2><p class="sub" style="margin:0">Copie a mensagem e mande para a pessoa (WhatsApp, email…).</p><textarea class="f" id="ms-txt" style="height:180px" readonly>${esc(txt)}</textarea><div class="acoes"><button type="button" class="b" data-act="fechar">Fechar</button><button type="button" class="b p" id="ms-copiar">Copiar mensagem</button></div></div></div>`;
  $('#ms-copiar').onclick = () => { const t=$('#ms-txt'); (navigator.clipboard?navigator.clipboard.writeText(t.value):Promise.reject()).then(()=>toast('Mensagem copiada'),()=>{ t.select(); toast('Selecionado: use Ctrl+C'); }); };
}

/* ---------- ações ---------- */
const ctx = el => { const c=el.closest('[data-k]'); return c?c.dataset.k:null; };
const idDe = k => +k.split(':')[1];
const A = {
  aba: v => { S.aba=v; MSG=null; if(v==='usuarios') USU=null; },
  sel: v => { S.sel[S.aba]=+v; MSG=null; },
  set: (v,el) => { const k=el.dataset.k; F(k)[el.dataset.f]=v; delete F(k)._er; if(k==='todos') F(k).pg=0; },
  eqs: v => { const f=F('novo'), a=f.eqs||[]; f.eqs = a.includes(v)?a.filter(x=>x!==v):EQS.filter(e=>a.includes(e)||e===v); },
  tira: (v,el) => { if(ARQ[el.dataset.k]) delete ARQ[el.dataset.k][el.dataset.f]; },
  fres: v => { const f=F('todos'); if(f.tp===v&&(f.et||'aberto')==='aberto'){ f.tp='*'; } else { f.tp=v; f.et='aberto'; f.se='*'; } f.pg=0; },
  fse: v => { const f=F('todos'); if(f.se===v){ f.se='*'; } else { f.se=v; f.et='aberto'; } f.pg=0; },
  fseEt: v => { const [q,e]=v.split('|'), f=F('todos'); if(f.se===q&&f.et===e){ f.et='aberto'; } else { f.se=q; f.et=e; } f.pg=0; },
  fet: v => { const f=F('todos'); f.et=(f.et||'aberto')===v?'aberto':v; f.se='*'; f.pg=0; },
  pg: v => { F('todos').pg=+v; },
  det: v => { detalhe(+v); return 'skip'; },
  fechar: () => { $('#camada').querySelectorAll('.modal').forEach(m=>m.remove()); return 'skip'; },
  abrir: v => { abrirArq(v); return 'skip'; },
  limpaNovo: () => { S.f.novo={}; delete ARQ.novo; },
  enviarNovo: () => { enviarNovo(); return 'skip'; },
  validar: async (v,el) => { const k=ctx(el), id=idDe(k), f=F(k); if(await tarefa(()=>rpc('flui_avaliar',{p_trilha:id,p_valido:true,p_orient:f.orient||'',p_motivo:null,p_just:null}))===undefined) return 'skip'; const r=D.find(x=>x.id===id); delete S.f[k]; await depois(id, nomeP(r)+' encaminhado para o Levantamento.'); return 'skip'; },
  invalidar: async (v,el) => { const k=ctx(el), id=idDe(k), f=F(k), mo=comOutro(f,'motivo'); if(!mo||!(f.just||'').trim()){ f._er='Escolha o motivo e escreva a justificativa.'; return; }
    if(await tarefa(()=>rpc('flui_avaliar',{p_trilha:id,p_valido:false,p_orient:null,p_motivo:mo,p_just:f.just}))===undefined) return 'skip'; const r=D.find(x=>x.id===id); delete S.f[k]; await depois(id, nomeP(r)+' registrado como inválido.','er'); return 'skip'; },
  concluirLev: async (v,el) => { const k=ctx(el), id=idDe(k), f=F(k), a=arq(k,'rel'); if(!a){ f._er=1; return; } const r=D.find(x=>x.id===id);
    if(await tarefa(async()=>{ const p=await enviarArq(a,'trilhas/'+id+'/levantamento'); return rpc('flui_concluir_levantamento',{p_trilha:id,p_path:p,p_obs:f.obs||''}); })===undefined) return 'skip';
    delete S.f[k]; delete ARQ[k]; await depois(id, 'Levantamento concluído. '+nomeP(r)+' voltou para a Execução da '+r.equipe+'.'); return 'skip'; },
  pedirPrazo: async (v,el) => { const k=ctx(el), id=idDe(k), f=F(k); if(!f.npData||!(f.npJust||'').trim()){ f._er='Para pedir novo prazo, informe a data e o motivo.'; return; }
    if(await tarefa(()=>rpc('flui_pedir_prazo',{p_trilha:id,p_tipo:f.npTipo||'execucao',p_data:f.npData,p_motivo:f.npJust}))===undefined) return 'skip';
    Object.assign(f,{npOpen:'',npData:'',npJust:'',npTipo:''}); delete f._er; await depois(id,'Pedido de novo prazo enviado para quem cadastrou. A execução continua.'); return 'skip'; },
  cancelarPrazo: async (v,el) => { const id=idDe(ctx(el)); if(await tarefa(()=>rpc('flui_cancelar_pedido_prazo',{p_prazo:+v}))===undefined) return 'skip'; await depois(id,'Pedido de prazo retirado.'); return 'skip'; },
  addRonda: async (v,el) => { const k=ctx(el), id=idDe(k), f=F(k); if(!f.roData){ f._er='Informe a data da ronda.'; return; }
    if(await tarefa(()=>rpc('flui_registrar_ronda',{p_trilha:id,p_data:f.roData,p_obs:f.roObs||''}))===undefined) return 'skip'; f.roData=''; f.roObs=''; delete f._er; await depois(id,'Ronda registrada.'); return 'skip'; },
  tiraDoc: async (v,el) => { const id=idDe(ctx(el)); if(await tarefa(()=>rpc('flui_remover_arquivo',{p_id:+v}))===undefined) return 'skip'; await depois(id,null); return 'skip'; },
  salvarExec: async (v,el) => { const k=ctx(el), id=idDe(k), f=F(k), r=D.find(x=>x.id===id), st=f.st||r.status||'P', mo=comOutro(f,'motivo');
    if(st==='N'&&!mo){ f._er='Escolha o motivo de não execução.'; return; }
    if(st==='R'&&!(f.reeq||r.reequilibrio||'').trim()){ f._er='Informe o número do reequilíbrio.'; return; }
    if(st!=='P'&&!(DET[id]&&DET[id].arquivos.length)){ f._er='Anexe pelo menos um documento da execução para finalizar.'; return; }
    const obs = f.obs!=null ? f.obs : (r.obs||'');
    if(await tarefa(()=>rpc('flui_salvar_execucao',{p_trilha:id,p_status:st,p_motivo:mo||null,p_reeq:f.reeq||r.reequilibrio||null,p_data_exec:st==='X'?(f.dataExec||r.data_exec||hoje()):null,p_obs:obs}))===undefined) return 'skip';
    delete S.f[k]; await depois(id, st==='P'?'Atualização salva. O pedido continua em execução.':nomeP(r)+' finalizado como '+ST[st][0]+'. Foi para quem cadastrou responder.'); return 'skip'; },
  aprovar: async (v,el) => { const k=ctx(el), id=idDe(k), f=F(k), r=D.find(x=>x.id===id), d=f.data||r.prazo_sugerido, a=arq(k,'carta'); if(!a){ f._er=1; return; }
    if(await tarefa(async()=>{ const p=await enviarArq(a,'trilhas/'+id+'/prazo'); return rpc('flui_decidir_prazo',{p_prazo:r.prazo_id,p_aprovar:true,p_data:d,p_carta:p,p_motivo:null}); })===undefined) return 'skip';
    delete S.f[k]; delete ARQ[k]; await depois(id,'Novo prazo de '+NOMEPZ[r.prazo_tipo]+' de '+nomeP(r)+' aprovado até '+dt(d)+'.'); return 'skip'; },
  recusar: async (v,el) => { const k=ctx(el), id=idDe(k), f=F(k), r=D.find(x=>x.id===id); if(!(f.mot||'').trim()){ f._er=1; return; }
    if(await tarefa(()=>rpc('flui_decidir_prazo',{p_prazo:r.prazo_id,p_aprovar:false,p_data:null,p_carta:null,p_motivo:f.mot}))===undefined) return 'skip';
    delete S.f[k]; await depois(id,'Pedido de prazo recusado. O prazo atual continua valendo.','er'); return 'skip'; },
  responder: async (v,el) => { const k=ctx(el), id=idDe(k), f=F(k), r=D.find(x=>x.id===id), a=arq(k,'carta'); if(!(f.num||'').trim()||!a){ f._er='Preencha o número da carta e anexe a carta para concluir.'; return; }
    if(await tarefa(async()=>{ const p=await enviarArq(a,'trilhas/'+id+'/resposta'); return rpc('flui_responder',{p_trilha:id,p_num:f.num,p_data:f.data||hoje(),p_carta:p}); })===undefined) return 'skip';
    delete S.f[k]; delete ARQ[k]; await depois(id, nomeP(r)+' respondido. Pedido concluído.'); return 'skip'; },
  criarUsuario: async () => { const f=F('usu'), nome=(f.nome||'').trim(), email=(f.email||'').trim().toLowerCase(), setor=f.setor;
    if(!nome) f._er='Informe o nome.'; else if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) f._er='Esse email não parece válido.'; else if(!setor) f._er='Escolha o setor.'; else delete f._er;
    if(f._er) return; const r=await tarefa(()=>acesso({acao:'criar',nome,email,setor})); if(r===undefined) return 'skip';
    S.f.usu={}; USU=null; render(); mostraSenha(nome,r); return 'skip'; },
  novaSenha: async v => { const u=USU.find(x=>x.id===v); const r=await tarefa(()=>acesso({acao:'nova_senha',email:u.email})); if(r===undefined) return 'skip'; USU=null; render(); mostraSenha(u.nome,r); return 'skip'; },
  desativar: async v => { const u=USU.find(x=>x.id===v); if(await tarefa(()=>rpc('flui_admin_alterar_perfil',{p_id:v,p_setor:null,p_ativo:false}),u.nome+' não consegue mais entrar')===undefined) return 'skip'; USU=null; render(); return 'skip'; },
  ativar: async v => { const u=USU.find(x=>x.id===v); if(await tarefa(()=>rpc('flui_admin_alterar_perfil',{p_id:v,p_setor:null,p_ativo:true}),u.nome+' reativado')===undefined) return 'skip'; USU=null; render(); return 'skip'; }
};
document.addEventListener('click', async e => {
  const el=e.target.closest('[data-act]'); if(!el) return;
  if(el.classList.contains('modal') && e.target.closest('[data-stop]')) return;
  if(el.closest('#app') || el.closest('#camada')){ const r = await A[el.dataset.act](el.dataset.v, el); if(r!=='skip') render(); }
});
document.addEventListener('input', e => {
  const el=e.target; if(!el.dataset || !el.dataset.f || el.type==='file' || !el.closest('#app')) return; const k=ctx(el); if(!k) return;
  F(k)[el.dataset.f]=el.value; if(el.dataset.re && el.tagName!=='INPUT'){ if(k==='todos') F(k).pg=0; render(); }
});
document.addEventListener('change', async e => {
  const el=e.target; if(!el.closest || !el.closest('#app')) return;
  if(el.dataset.setor){ await tarefa(()=>rpc('flui_admin_alterar_perfil',{p_id:el.dataset.setor,p_setor:el.value,p_ativo:null}),'Setor alterado'); USU=null; render(); return; }
  if(!el.dataset.f) return; const k=el.dataset.k||ctx(el); if(!k) return;
  if(el.type==='file'){ const fs=[...el.files]; el.value=''; if(!fs.length) return; const imagens=el.accept.includes('image'); for(const f of fs){ const m=arqOk(f,imagens); if(m){ toast(m,true); return; } }
    if(el.dataset.up){ const id=idDe(k); if(await tarefa(async()=>{ for(const f of fs){ const p=await enviarArq(f,'trilhas/'+id+'/execucao'); await rpc('flui_anexar_arquivo',{p_trilha:id,p_etapa:'exec',p_nome:f.name,p_path:p}); } }, fs.length>1?fs.length+' arquivos anexados':'Arquivo anexado')===undefined) return; await carregarDet(id,true); delete F(k)._er; render(); return; }
    ARQ[k]=ARQ[k]||{}; ARQ[k][el.dataset.f]=fs[0]; delete F(k)._er; return render(); }
  if(el.dataset.re){ if(k==='todos') F(k).pg=0; render(); }
});
document.addEventListener('keydown', e => { if(e.key==='Escape') A.fechar(); if(e.key==='Enter'&&e.target.matches&&e.target.matches('tr[data-act]')) detalhe(+e.target.dataset.v); });

/* ---------- menu da conta ---------- */
$('#tema').addEventListener('click', () => { const n=temaAtual()==='dark'?'light':'dark'; document.documentElement.dataset.tema=n; try{localStorage.setItem('flui-tema',n)}catch(e){} $('#menu-eu').open=false; render(); });
$('#sair').addEventListener('click', async () => { $('#menu-eu').open=false; await sb.auth.signOut(); location.reload(); });
$('#trocar-senha').addEventListener('click', () => { $('#menu-eu').open=false; telaSenha('trocar'); });
$('#atualizar').addEventListener('click', async () => { DET={}; USU=null; if(await tarefa(recarregar,'Atualizado')!==undefined) render(); });
document.addEventListener('click', e => { const m=$('#menu-eu'); if(m.open && !e.target.closest('#menu-eu')) m.open=false; });

/* ---------- acesso ---------- */
const LOGO = `<div class="marca"><svg width="34" height="34" viewBox="0 0 32 32" aria-hidden="true"><path d="M4 11c6-5 12 5 24-1" fill="none" stroke="#2E7D32" stroke-width="3.2" stroke-linecap="round"/><path d="M4 18c6-5 12 5 24-1" fill="none" stroke="#8FD16A" stroke-width="3.2" stroke-linecap="round"/><path d="M4 25c6-5 12 5 24-1" fill="none" stroke="#8AAA88" stroke-width="3.2" stroke-linecap="round"/></svg>Flui</div>`;
function mostra(qual){ $('#app').hidden = qual!=='app'; $('#tela-acesso').hidden = qual==='app'; }
function aviso(t){ mostra('acesso'); $('#tela-acesso').innerHTML=`<div class="acesso-cx">${LOGO}<p style="margin:0">${esc(t)}</p><button type="button" class="b p" id="av-sair">Sair</button></div>`; $('#av-sair').onclick=async()=>{ await sb.auth.signOut(); location.reload(); }; }
function telaLogin(){
  mostra('acesso'); const c=$('#tela-acesso');
  c.innerHTML = `<form class="acesso-cx" id="f-login" novalidate>${LOGO}
    <div><label class="lb" for="l-email">Email</label><input type="text" id="l-email" class="f" inputmode="email" autocomplete="username"></div>
    <div><label class="lb" for="l-senha">Senha</label><input type="password" id="l-senha" class="f" autocomplete="current-password"></div>
    <span class="erro-msg" id="l-erro" hidden></span>
    <button type="submit" class="b p">Entrar</button>
    <button type="button" class="link" id="l-esq">Esqueci a senha</button>
    <span class="sub" id="l-dica" hidden style="text-align:center;font-size:13px">Peça ao administrador do Flui uma nova senha provisória.</span></form>`;
  $('#l-esq').onclick=()=>{ $('#l-dica').hidden=false; };
  $('#f-login').onsubmit = async e => { e.preventDefault(); const em=$('#l-email').value.trim().toLowerCase(), se=$('#l-senha').value, er=$('#l-erro'); er.hidden=true;
    if(!em||!se){ er.textContent='Informe o email e a senha.'; er.hidden=false; return; }
    ocupado(true); const {error}=await sb.auth.signInWithPassword({email:em,password:se}); ocupado(false);
    if(error){ er.textContent=msgErro(error); er.hidden=false; return; } entrar(); };
  $('#l-email').focus();
}
function telaSenha(modo){
  mostra('acesso'); const c=$('#tela-acesso'), trocar=modo==='trocar';
  c.innerHTML = `<form class="acesso-cx" id="f-senha" novalidate>${LOGO}<b style="font-size:17px">${trocar?'Trocar minha senha':'Bem-vindo(a) ao Flui! Crie sua senha'}</b><span class="sub" style="font-size:13px">${esc(EU?EU.email:'')}${trocar?'':' · você entrou com uma senha provisória'}</span>
    <div><label class="lb" for="s1">${trocar?'Nova senha':'Crie sua senha'}</label><input type="password" id="s1" class="f" autocomplete="new-password"></div>
    <ul class="regras" id="regras"><li data-r="len">Pelo menos 8 caracteres</li><li data-r="let">Uma letra</li><li data-r="num">Um número</li><li data-r="eq">As duas senhas iguais</li></ul>
    <div><label class="lb" for="s2">Repita a senha</label><input type="password" id="s2" class="f" autocomplete="new-password"></div>
    <span class="erro-msg" id="s-erro" hidden></span>
    <button type="submit" class="b p" id="s-ok" disabled>${trocar?'Salvar nova senha':'Criar senha e entrar'}</button>${trocar?'<button type="button" class="link" id="s-volta">Voltar</button>':''}</form>`;
  const regras=()=>{ const a=$('#s1').value, b=$('#s2').value, r={len:a.length>=8,let:/[a-zA-ZÀ-ú]/.test(a),num:/\d/.test(a),eq:!!a&&a===b}; c.querySelectorAll('#regras li').forEach(li=>li.classList.toggle('ok',r[li.dataset.r])); $('#s-ok').disabled=!Object.values(r).every(Boolean); };
  c.querySelectorAll('#s1,#s2').forEach(i=>i.addEventListener('input',regras));
  if(trocar) $('#s-volta').onclick=()=>mostra('app');
  $('#f-senha').onsubmit = async e => { e.preventDefault(); if($('#s-ok').disabled) return; ocupado(true);
    const {error}=await sb.auth.updateUser({password:$('#s1').value}); ocupado(false);
    if(error){ $('#s-erro').textContent=msgErro(error); $('#s-erro').hidden=false; return; }
    if(trocar){ mostra('app'); toast('Senha trocada'); return; } toast('Senha criada'); entrar(true); };
  $('#s1').focus();
}
async function entrar(senhaOk){
  ocupado(true);
  try { EU = await rpc('flui_registrar_acesso',{p_senha_ok:!!senhaOk}); }
  catch(e){ ocupado(false); aviso(e.message); return; }
  if(!EU.senha_ok){ ocupado(false); telaSenha('primeiro'); return; }
  try {
    const {data:b}=await sb.from('flui_bairros').select('*').order('nome'); BAIRROS=b||[]; ZONA={}; BAIRROS.forEach(x=>ZONA[x.nome]=x.zona);
    await recarregar();
  } catch(e){ ocupado(false); aviso(msgErro(e)); return; }
  ocupado(false); mostra('app'); render();
}
(async function iniciar(){
  if(!CONFIGURADO){ mostra('acesso'); $('#tela-acesso').innerHTML=`<div class="acesso-cx">${LOGO}<p>O Flui ainda não foi ligado ao banco de dados. Preencha o arquivo assets/config.js com os dados do Supabase.</p></div>`; return; }
  const {data:{session}} = await sb.auth.getSession();
  if(session) entrar(); else telaLogin();
})();
}
