const $=s=>document.querySelector(s);
const E=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const safeSummaryNumber=value=>{const n=Number(value);return Number.isSafeInteger(n)&&n>=0?n:0};
const NF=new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'});
const brl=c=>(c<0?'−':'')+NF.format(Math.abs(c)/100);
const pc=x=>Math.round(x*100)+'%';
const p2=n=>String(n).padStart(2,'0');
const ym=d=>d.getFullYear()+'-'+p2(d.getMonth()+1);
const sh=(m,n)=>ym(new Date(+m.slice(0,4),+m.slice(5)-1+n,1));
const MN=['janeiro','fevereiro','março','abril','maio','junho','julho','agosto','setembro','outubro','novembro','dezembro'];
const ml=m=>MN[+m.slice(5)-1]+' de '+m.slice(0,4);
const mab=m=>MN[+m.slice(5)-1].slice(0,3);
const today=()=>{const d=new Date();return ym(d)+'-'+p2(d.getDate())};
function atualizarStatusConexao(){
 const el=$('#connection-status');if(!el)return;
 const online=navigator.onLine;
 el.classList.toggle('is-online',online);el.classList.toggle('is-offline',!online);
 el.querySelector('span').textContent=online?'On line':'Off line';
 el.setAttribute('aria-label',online?'Conexão on line':'Conexão off line');
}
window.addEventListener('online',atualizarStatusConexao);
window.addEventListener('offline',atualizarStatusConexao);
document.addEventListener('DOMContentLoaded',atualizarStatusConexao);
const val=value=>{
 let s=String(value).trim();if(!s)return 0;
 if(s.includes(',')){if(!/^[+-]?(?:\d+|\d{1,3}(?:\.\d{3})+),\d{1,2}$/.test(s))return 0;s=s.replace(/\./g,'').replace(',','.')}
 else if(/^[+-]?\d{1,3}(?:\.\d{3})+$/.test(s))s=s.replace(/\./g,'');
 else if(!/^[+-]?\d+(?:\.\d{1,2})?$/.test(s))return 0;
 const cents=Math.round(Number(s)*100);return Number.isSafeInteger(cents)?cents:0;
};
const validDate=d=>typeof d==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(d)&&parseDateAny(d)===d;
const dl=(a,b)=>b?(a>=b?'+':'−')+pc(Math.abs(a-b)/b)+' vs. mês anterior':'Sem mês anterior para comparar';
const uid=()=>crypto.randomUUID();

/* ---------- categorias: [id, nome, grupo] ---------- */
const CFG={
 pf:{nome:'pessoa física',cx:'Reserva de emergência',
  g:{ren:'Renda',nec:'Necessidades',des:'Desejos',fut:'Futuro'},
  c:[['sal','Salário','ren'],['ext','Renda extra','ren'],['rend','Rendimentos','ren'],
     ['mor','Moradia','nec'],['mer','Mercado','nec'],['tra','Transporte','nec'],['sau','Saúde','nec'],['edu','Educação','nec'],['con','Contas e dívidas','nec'],
     ['laz','Lazer','des'],['res','Restaurantes e delivery','des'],['cpr','Compras','des'],['ass','Assinaturas','des'],
     ['inv','Investimentos e reserva','fut']]},
 pj:{nome:'pessoa jurídica',cx:'Caixa da empresa',
  g:{rec:'Receitas',ded:'Impostos sobre vendas',cus:'Custos',des:'Despesas',ret:'Retiradas dos sócios'},
  c:[['ven','Vendas','rec'],['ser','Serviços','rec'],['orec','Outras receitas','rec'],
     ['imp','Impostos (DAS, ICMS)','ded'],
     ['cmv','Mercadorias e insumos','cus'],['fre','Fretes e embalagens','cus'],
     ['fol','Folha e encargos','des'],['alu','Aluguel','des'],['mkt','Marketing','des'],['sis','Sistemas e assinaturas','des'],['ter','Contabilidade e terceiros','des'],['out','Outras despesas','des'],
     ['pro','Pró-labore e retirada de lucro','ret']]}
};
const catGroupBase=(m,base)=>m==='pf'?({rec:'ren',cus:'nec',ded:'nec',ret:'des'}[base]||base):base;
const isIn=g=>g==='ren'||g==='rec';
const groupName=(m,id)=>S[m]?.groupNames?.[id]||CFG[m].g[id]||id;
const suggestedNeedGroup=name=>{
 const n=String(name||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('pt-BR');
 if(/moradia|aluguel|condominio|garagem|imovel/.test(n))return'Casa e moradia';
 if(/mercado|aliment|supermercado|feira/.test(n))return'Alimentação';
 if(/transporte|abastec|combust|gasolina|etanol|veiculo|uber|taxi|onibus/.test(n))return'Transporte e combustível';
 if(/saude|farmac|medic|clinica|dent/.test(n))return'Saúde e bem-estar';
 if(/educa|escola|curso|material escolar/.test(n))return'Educação e cursos';
 if(/contas|divida|telefon|internet|agua|energia|luz/.test(n))return'Contas e compromissos';
 return'Outros · '+String(name||'necessidade').trim().replace(/\s+/g,' ');
};
const catsFor=m=>{
 const overrides=S[m]?.catOverrides||{};
 const hidden=new Set(S[m]?.hiddenCats||[]);
 const base=CFG[m].c.filter(c=>!hidden.has(c[0])).map(c=>{const o=overrides[c[0]]||{};return[c[0],o.name||c[1],o.base||c[2],o.groupId||null]});
 return base.concat(S[m]?.cats||[]);
};
const catGroupsFor=m=>{
 const base=Object.keys(CFG[m].g).map(id=>({id,name:groupName(m,id),base:id}));
 const custom=(S[m]?.groups||[]).filter(g=>g&&g.id&&g.name).map(g=>({id:g.id,name:g.name,base:catGroupBase(m,g.nature||natureById(m,g.natureId).base),custom:true}));
 return base.concat(custom);
};
const catsInGroup=(m,g)=>catsFor(m).filter(c=>g.custom?c[3]===g.id:!c[3]&&c[2]===g.id);
const cat=(m,id)=>(catsFor(m)).find(x=>x[0]===id)||[id,'Outros','des'];
const NATURES_BASE=[
 {id:'rec',name:'Receita',base:'rec',locked:true},
 {id:'des',name:'Despesa',base:'des',locked:true},
 {id:'cus',name:'Custo',base:'cus',locked:true},
 {id:'ded',name:'Imposto / dedução',base:'ded',locked:true},
 {id:'ret',name:'Retirada',base:'ret',locked:true}
];
function natureList(m){
 const saved=S[m]?.natures;
 if(Array.isArray(saved)&&saved.length)return saved;
 return NATURES_BASE.map(n=>({...n}));
}
function natureById(m,id){return natureList(m).find(n=>n.id===id)||natureList(m).find(n=>n.base===id)||NATURES_BASE.find(n=>n.id===id)||NATURES_BASE[1];}
function natureName(m,id){return natureById(m,id).name;}
function ensureNatureList(m){if(!Array.isArray(S[m].natures)||!S[m].natures.length)S[m].natures=NATURES_BASE.map(n=>({...n}));return S[m].natures;}
/* ---------- estado ---------- */
const K='mesa-financeira-v2';
let S={m:'pf',v:'p',mes:ym(new Date()),pf:{l:[],cx:0},pj:{l:[],cx:0}};
let LANC_SEARCH='';
let DASH_LANC_FILTER=null;
let AVISOS_SEARCH='';
let RECEBER_PAGAR_SEARCH={receber:'',pagar:''};
S.mes=ym(new Date());
function envChip(m){const el=document.getElementById('who-env');if(!el)return;const pj=m==='pj';el.dataset.env=pj?'pj':'pf';el.innerHTML='<i aria-hidden="true">'+(pj?'PJ':'PF')+'</i><span><small>Você está em</small><b>'+(pj?'Pessoa jurídica':'Pessoa física')+'</b></span>'}
let MES_APAGAR=ym(new Date()),MES_ARECEBER=ym(new Date());
let LE=null,CLI_EDIT_ID=null;
const _h=new URLSearchParams((location.hash||'').slice(1));
const SETPW=['invite','recovery'].includes(_h.get('type'));
const AUTH_ERR=_h.get('error_description')||new URLSearchParams(location.search).get('error_description')||'';
const RECOVER_ENV=new URLSearchParams(location.search).get('recuperar_ambiente');
const CF=window.MF_CONFIG||{};
const sb=window.supabase&&CF.SB_URL&&CF.SB_KEY?window.supabase.createClient(CF.SB_URL,CF.SB_KEY,{auth:{persistSession:false,autoRefreshToken:true,detectSessionInUrl:true}}):null;
try{const legacyRef=new URL(CF.SB_URL).hostname.split('.')[0];if(legacyRef)localStorage.removeItem('sb-'+legacyRef+'-auth-token')}catch(_){}
try{sessionStorage.removeItem('mf-refresh-session')}catch(_){}
let USER=null,tm,idleLogoutTimer=null;
const IDLE_LOGOUT_MS=15*60*1000;
function renovarExpiracaoSessao(){clearTimeout(idleLogoutTimer);if(USER)idleLogoutTimer=setTimeout(()=>{if(USER)$('#sair')?.click()},IDLE_LOGOUT_MS)}
document.addEventListener('pointerdown',renovarExpiracaoSessao,{passive:true});document.addEventListener('keydown',renovarExpiracaoSessao);
const aviso=t=>{const a=$('#aviso');a.textContent=t||'';a.hidden=!t};
const REGISTROS=MFRegistros.create();
let RAW={},KEY={},ENV='',RECOVERING=null;
let USER_MODULES={},USER_MODULE_ERROR='',ADMIN_USER_MODULES={},ADMIN_MODULE_ERROR='';
let WA={loaded:false,loading:false,items:[],linked:false,last4:'',code:'',expires:'',error:''};
let VD_EDIT=null;
const te=new TextEncoder(),td=new TextDecoder(),KDF=600000;
const b64=u=>{const a=new Uint8Array(u);let x='';for(let i=0;i<a.length;i+=8192)x+=String.fromCharCode.apply(null,a.subarray(i,i+8192));return btoa(x)};
const unb=t=>Uint8Array.from(atob(t),c=>c.charCodeAt(0));
async function derive(pw,salt,it){
  const k=await crypto.subtle.importKey('raw',te.encode(pw),'PBKDF2',false,['deriveKey']);
  return crypto.subtle.deriveKey({name:'PBKDF2',salt,iterations:it,hash:'SHA-256'},k,{name:'AES-GCM',length:256},false,['encrypt','decrypt']);
}
async function novaChaveAmbiente(pw,raw=crypto.getRandomValues(new Uint8Array(32))){
  const salt=crypto.getRandomValues(new Uint8Array(16)),wrap=await derive(pw,salt,KDF);
  const k=await crypto.subtle.importKey('raw',raw,{name:'AES-GCM'},true,['encrypt','decrypt']);
  return{k,wrap,raw,salt:b64(salt),it:KDF,version:2};
}
async function guardarChaveRecuperacao(m,raw){
  const {data,error}=await sb.functions.invoke('recuperar-chave-ambiente',{body:{acao:'guardar',ambiente:m,chave:b64(raw)}});
  if(error||!data?.ok)throw new Error(error?.message||data?.erro||'Não foi possível ativar a recuperação por e-mail.');
}
async function encrypt(m,snapshot=S[m],recordId=null){
  const context=JSON.stringify(["mf-v11",USER.id,m,recordId===null?"metadata":"record",recordId]);
  const iv=crypto.getRandomValues(new Uint8Array(12));
  const ct=await crypto.subtle.encrypt({name:'AES-GCM',iv,additionalData:te.encode(context)},KEY[m].k,te.encode(JSON.stringify(snapshot)));
  if(KEY[m].version!==2)return{enc:1,it:KEY[m].it,salt:KEY[m].salt,iv:b64(iv),ct:b64(ct)};
  const wrapIv=crypto.getRandomValues(new Uint8Array(12));
  const wrapCt=await crypto.subtle.encrypt({name:'AES-GCM',iv:wrapIv},KEY[m].wrap,KEY[m].raw);
  return{context,enc:2,it:KEY[m].it,salt:KEY[m].salt,iv:b64(iv),ct:b64(ct),wrapIv:b64(wrapIv),wrapCt:b64(wrapCt)};
}
async function decryptRecord(blob,key,env=null,recordId=null){
 if(blob.context&&env&&blob.context!==JSON.stringify(["mf-v11",USER.id,env,recordId===null?"metadata":"record",recordId]))throw new Error("Contexto criptografado inválido.");
 if(env&&recordId!==null&&!blob.context)throw new Error("Registro sem contexto criptografado.");
 const pt=await crypto.subtle.decrypt({name:'AES-GCM',iv:unb(blob.iv),...(blob.context?{additionalData:te.encode(blob.context)}:{})},key.k,unb(blob.ct));
 return JSON.parse(td.decode(pt));
}
async function decrypt(blob,pw){
  const wrap=await derive(pw,unb(blob.salt),blob.it);
  let k=wrap,raw=null,version=1;
  if(blob.enc===2){raw=new Uint8Array(await crypto.subtle.decrypt({name:'AES-GCM',iv:unb(blob.wrapIv)},wrap,unb(blob.wrapCt)));k=await crypto.subtle.importKey('raw',raw,{name:'AES-GCM'},true,['encrypt','decrypt']);version=2}
  const pt=await crypto.subtle.decrypt({name:'AES-GCM',iv:unb(blob.iv),...(blob.context?{additionalData:te.encode(blob.context)}:{})},k,unb(blob.ct));
  return{key:{k,wrap,raw,salt:blob.salt,it:blob.it,version},data:JSON.parse(td.decode(pt))};
}
// Serialize all writes and use an atomic JSONB comparison to prevent lost updates.
const stableJson=value=>JSON.stringify(value,(_,v)=>v&&typeof v==='object'&&!Array.isArray(v)?Object.fromEntries(Object.keys(v).sort().map(k=>[k,v[k]])):v);
let WRITE_QUEUE=Promise.resolve(),PENDING_WRITES=0,LANC_BUSY=false;
const UNSAVED=new Set();
function persist(m){
 AC={};const userId=USER?.id,key=KEY[m],snapshot=JSON.parse(JSON.stringify(S[m]));
 UNSAVED.add(m);PENDING_WRITES++;
 const task=WRITE_QUEUE.then(async()=>{
  if(!sb||!userId||USER?.id!==userId||!key||KEY[m]!==key)return false;
  try{
   const blob=await REGISTROS.write(sb,userId,m,snapshot,key,encrypt);
   RAW={...RAW,[m]:blob};if(JSON.stringify(S[m])===JSON.stringify(snapshot))UNSAVED.delete(m);
   aviso('');return true;
  }catch(_e){console.error('Falha ao salvar',_e);const det=String(_e?.message||_e?.details||_e?.code||_e||'').slice(0,200);aviso('Não foi possível salvar. Suas alterações continuam nesta tela. Detalhe: '+det);return false}
 }).then(ok=>{if(!ok&&!UNSAVED.has(m))UNSAVED.add(m);return ok}).finally(()=>{PENDING_WRITES--});
 WRITE_QUEUE=task.catch(()=>false);return task;
}
const save=()=>{AC={};return persist(S.m)};
async function cancelarLembreteSMS(id){
 if(!sb||!USER)return false;
 try{const r=await sb.from('lembretes_sms').update({status:'canceled'}).eq('user_id',USER.id).eq('transaction_id',id).eq('status','pending');if(r.error)throw r.error;return true}
 catch(_){aviso('Os dados foram salvos, mas não foi possível cancelar um lembrete SMS. Confira os lembretes antes do vencimento.');return false}
}
window.addEventListener('beforeunload',e=>{if(PENDING_WRITES||UNSAVED.size){e.preventDefault();e.returnValue=''}});

let AC={};
const dataRealLancamento=l=>l&&l.st!=='a'&&/^\d{4}-\d{2}-\d{2}$/.test(l.pg||'')?l.pg:(l?.d||'');
const agg=(m,mes)=>AC[m+mes]||(AC[m+mes]=agg0(m,mes));
function agg0(m,mes){
  const o={bc:{}};Object.keys(CFG[m].g).forEach(g=>o[g]=0);
  S[m].l.forEach(l=>{if(!dataRealLancamento(l).startsWith(mes))return;o[cat(m,l.c)[2]]+=l.v;o.bc[l.c]=(o.bc[l.c]||0)+l.v});
  return o;
}
const tOut=(m,a)=>Object.keys(CFG[m].g).reduce((s,g)=>s+(isIn(g)?0:a[g]),0);
const tIn=(m,a)=>Object.keys(CFG[m].g).reduce((s,g)=>s+(isIn(g)?a[g]:0),0);

/* ---------- recomendações ---------- */
function insights(m,a,p,cx){
  const I=[],push=(k,t)=>I.push([k,t]);
  if(m==='pf'){
    const r=a.ren,gs=a.nec+a.des;
    if(!r)return[['info','Registre sua renda do mês para calcular quanto você consegue guardar.']];
    const g=r-gs,t=g/r;
    if(g<0)push('bad',`Você gastou ${brl(-g)} a mais do que ganhou. Comece pelos desejos (${brl(a.des)}): é onde o corte dói menos.`);
    else if(t<.1)push('warn',`Você guardou só ${pc(t)} da renda. A referência é 20%, ou seja, ${brl(r*.2)} por mês.`);
    else if(t>=.2)push('ok',`Você guardou ${pc(t)} da renda, acima da referência de 20%. Direcione esse valor para a reserva e para investimentos.`);
    else push('info',`Você guardou ${pc(t)} da renda. Faltam ${brl(r*.2-g)} para a referência de 20%.`);
    if(a.nec/r>.5)push('warn',`Necessidades consomem ${pc(a.nec/r)} da renda (referência: 50%). Revise moradia, contas fixas e dívidas antes de cortar o resto.`);
    if(a.des/r>.3)push('warn',`Desejos consomem ${pc(a.des/r)} da renda (referência: 30%). Chegar a 30% libera ${brl(a.des-r*.3)} por mês.`);
    if(gs>0){
      const n=cx/gs,ns=n.toFixed(1).replace('.',',');
      if(!cx)push('info','Informe o saldo da sua reserva abaixo para ver quantos meses de gastos ela cobre.');
      else if(n<3)push('bad',`Sua reserva cobre ${ns} meses de gastos. O mínimo é 3 meses; faltam ${brl(gs*3-cx)}.`);
      else if(n<6)push('warn',`Sua reserva cobre ${ns} meses de gastos. Para chegar a 6 meses, faltam ${brl(gs*6-cx)}.`);
      else push('ok',`Sua reserva cobre ${ns} meses de gastos. Novos aportes podem ir para investimentos de prazo maior.`);
    }
  }else{
    const rec=a.rec;
    if(!rec)return[['info','Registre as receitas do mês para calcular margem, ponto de equilíbrio e caixa.']];
    const res=rec-a.ded-a.cus-a.des,mg=res/rec,mc=(rec-a.ded-a.cus)/rec;
    if(res<0)push('bad',`A empresa fechou o mês com prejuízo de ${brl(-res)}. Revise primeiro os custos (${pc(a.cus/rec)} da receita) e as despesas (${pc(a.des/rec)}).`);
    else if(mg<.1)push('warn',`Margem de ${pc(mg)}: o resultado é apertado e uma queda pequena nas vendas pode virar prejuízo.`);
    else push('ok',`Margem de ${pc(mg)}. ${mg>=.2?'Acima de 20%, há folga para reinvestir ou reforçar o caixa.':'Saudável, mas ainda há espaço para melhorar custos e preços.'}`);
    if(mc>0&&a.des>0){
      const pe=a.des/mc;
      if(rec<pe)push('bad',`Ponto de equilíbrio: ${brl(pe)} em vendas por mês. Você vendeu ${brl(rec)} e faltaram ${brl(pe-rec)}.`);
      else push('ok',`Ponto de equilíbrio: ${brl(pe)} em vendas por mês. Você vendeu ${pc(rec/pe-1)} acima dele.`);
    }
    if(a.ded/rec>.15)push('warn',`Impostos sobre vendas pesam ${pc(a.ded/rec)} da receita. Vale conversar com o contador sobre o regime tributário.`);
    if(a.ret>0){
      if(a.ret>Math.max(res,0))push('warn',`As retiradas (${brl(a.ret)}) superaram o resultado (${brl(Math.max(res,0))}): a empresa está sendo descapitalizada.`);
      else push('ok',`As retiradas dos sócios (${brl(a.ret)}) cabem no resultado do mês.`);
    }
    const op=a.ded+a.cus+a.des;
    if(op>0){
      const d=Math.round(cx/(op/30));
      if(!cx)push('info','Informe o saldo do caixa abaixo para ver por quantos dias a empresa se sustenta.');
      else if(d<30)push('bad',`O caixa cobre ${d} dias de operação. Abaixo de 30 dias, um atraso de cliente já causa aperto.`);
      else if(d<90)push('warn',`O caixa cobre ${d} dias de operação. O ideal é ter pelo menos 90.`);
      else push('ok',`O caixa cobre ${d} dias de operação, uma margem confortável.`);
    }
    if(p.rec>0&&Math.abs(rec/p.rec-1)>=.05)push('info',`A receita ${rec>=p.rec?'subiu':'caiu'} ${pc(Math.abs(rec/p.rec-1))} em relação ao mês anterior.`);
  }
  const ta=tOut(m,a),tp=tOut(m,p);
  if(tp>0&&ta>tp*1.1){
    let best=null,bd=0;
    Object.keys(a.bc).forEach(c=>{if(isIn(cat(m,c)[2]))return;const d=a.bc[c]-(p.bc[c]||0);if(d>bd){bd=d;best=c}});
    if(best)push('warn',`As saídas subiram ${pc(ta/tp-1)} em relação ao mês anterior. A maior alta foi em ${cat(m,best)[1]} (+${brl(bd)}).`);
  }
  const R={bad:0,warn:1,info:2,ok:3};
  return I.sort((x,y)=>R[x[0]]-R[y[0]]);
}

/* ---------- parcelas e repetições ---------- */
const addM=(d,k)=>{
  const y=+d.slice(0,4),m=+d.slice(5,7)-1+k,dia=+d.slice(8),ult=new Date(y,m+1,0).getDate();
  const x=new Date(y,m,Math.min(dia,ult));return ym(x)+'-'+p2(x.getDate());
};
function gerar(o){
  const g=o.n>1?uid():undefined,base=o.rep==='d'?Math.floor(o.v/o.n):o.v,out=[];
  for(let i=0;i<o.n;i++)out.push({id:uid(),desc:o.n>1?o.desc+' ('+(i+1)+'/'+o.n+')':o.desc,
    v:o.rep==='d'&&i===o.n-1?o.v-base*(o.n-1):base,c:o.c,tipoMov:o.tipoMov,d:addM(o.d,i),st:i===0?o.st:'a',b:o.b,a:i===0?o.a:null,g});
  return out;
}

function parseDateAny(v){v=(v||'').trim();let m,y,mo,d;if((m=v.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/))){y=+m[1];mo=+m[2];d=+m[3]}else if((m=v.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{2,4})/))){d=+m[1];mo=+m[2];y=+m[3];if(y<100)y+=2000}else return '';const dt=new Date(Date.UTC(y,mo-1,d));if(dt.getUTCFullYear()!==y||dt.getUTCMonth()!==mo-1||dt.getUTCDate()!==d)return '';return `${y}-${p2(mo)}-${p2(d)}`}
function parseMoneyAny(v){v=(v||'').replace(/R\$|\s/g,'').replace(/[^0-9,.-]/g,'');if(v.includes(',')&&v.includes('.'))v=v.lastIndexOf(',')>v.lastIndexOf('.')?v.replace(/\./g,'').replace(',','.'):v.replace(/,/g,'');else if(v.includes(','))v=v.replace(',','.');return Number(v)}
function parseExtratoTexto(txt,fileName=''){
 const year=(String(fileName).match(/(?:19|20)\d{2}/)||[])[0]||String(new Date().getFullYear()),out=[];
 const dateRe=/(\d{2}[./-]\d{2}(?:[./-]\d{2,4})?|\d{4}-\d{2}-\d{2})/g,moneyRe=/(?:R\$\s*)?[-+]?\s*\d[\d.,]*[,.]\d{2}\s*(?:DEB|CRED|D|C)?/gi;
 for(const line of String(txt||'').split(/\r?\n/).map(x=>x.replace(/\s+/g,' ').trim()).filter(Boolean)){
  if(/\b(total|saldo anterior|saldo do dia|saldo final|saldo em conta|limite disponível)\b/i.test(line))continue;
  const dm=dateRe.exec(line);dateRe.lastIndex=0;if(!dm)continue;const d=parseDateAny(dm[1])||(/^\d{2}[./-]\d{2}$/.test(dm[1])?parseDateAny(`${dm[1]}/${year}`):'');if(!d)continue;
  const amounts=[...line.matchAll(moneyRe)];if(!amounts.length)continue;const raw=amounts[0][0],amount=parseMoneyAny(raw);if(!Number.isFinite(amount)||!amount)continue;
  const suffix=(raw.match(/(DEB|CRED|D|C)\s*$/i)||[])[1]?.toUpperCase()||'',desc=line.replace(dm[1],' ').replace(raw,' ').replace(/\s+/g,' ').trim().slice(0,100)||'Movimentação bancária',debit=/^-/.test(raw.trim())||/^(D|DEB)$/.test(suffix)||(!/^(C|CRED)$/.test(suffix)&&/\b(debito|débito|pagamento|compra|saque|tarifa|enviado|boleto pago|pix enviado)\b/i.test(desc)),signed=debit?-Math.abs(amount):Math.abs(amount);
  out.push({d,desc:(signed<0?'Saída · ':'Entrada · ')+desc,v:Math.round(Math.abs(signed)*100),c:signed>0?'orec':'out',signed});
 }
 return out
}
async function converterPdfViaOfxFacil(file){
 if(!sb)throw new Error('O sistema não está conectado ao Supabase.');
 const body=new FormData();body.append('file',file,file.name);
 const {data,error}=await sb.functions.invoke('ofxfacil-convert',{body});
 if(error){let message=error.message||'Não foi possível converter o PDF.';try{const response=error.context?.clone?error.context.clone():error.context,detail=response?.json?await response.json():null;if(detail?.error?.message)message=detail.error.message}catch(_){}throw new Error(message)}
 if(data?.error)throw new Error(data.error.message||'O conversor não conseguiu processar o PDF.');
 if(!Array.isArray(data?.transactions)||!data.transactions.length)throw new Error('O conversor não encontrou movimentações nesse extrato.');
 const rows=data.transactions.map(t=>{const d=parseDateAny(String(t.date||'')),amount=Number(t.amount);if(!d||!Number.isFinite(amount)||!amount)return null;const type=String(t.type||'').toUpperCase(),signed=/^(D|DEBIT|DEBITO)$/.test(type)?-Math.abs(amount):/^(C|CREDIT|CREDITO)$/.test(type)?Math.abs(amount):amount;return{d,desc:(signed<0?'Saída · ':'Entrada · ')+String(t.description||'Movimentação bancária').trim().slice(0,100),v:Math.round(Math.abs(signed)*100),c:signed>0?'orec':'out',signed}}).filter(Boolean);
 if(!rows.length)throw new Error('O conversor retornou lançamentos sem data ou valor válido.');
 return rows
}
async function carregarScriptExtrato(src,globalName){if(window[globalName])return;await new Promise((resolve,reject)=>{const sc=document.createElement('script');sc.src=src;sc.onload=resolve;sc.onerror=()=>reject(new Error('Não foi possível carregar o leitor do arquivo. Confira a conexão e tente novamente.'));document.head.appendChild(sc)});if(!window[globalName])throw new Error('O leitor do arquivo não iniciou corretamente.')}
async function criarLeitorOcrExtrato(){await carregarScriptExtrato('https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js','Tesseract');const worker=await window.Tesseract.createWorker('por');await worker.setParameters({tessedit_pageseg_mode:'6',preserve_interword_spaces:'1',user_defined_dpi:'300'});return worker}
function ampliarImagemExtrato(file){return createImageBitmap(file).then(bitmap=>{const canvas=document.createElement('canvas'),scale=Math.max(1,Math.min(3.5,2400/bitmap.width));canvas.width=Math.round(bitmap.width*scale);canvas.height=Math.round(bitmap.height*scale);const ctx=canvas.getContext('2d',{willReadFrequently:true});ctx.fillStyle='#fff';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';ctx.drawImage(bitmap,0,0,canvas.width,canvas.height);bitmap.close?.();const image=ctx.getImageData(0,0,canvas.width,canvas.height),p=image.data;for(let i=0;i<p.length;i+=4){const gray=.299*p[i]+.587*p[i+1]+.114*p[i+2],contrast=Math.max(0,Math.min(255,(gray-128)*1.35+128));p[i]=p[i+1]=p[i+2]=contrast}ctx.putImageData(image,0,0);return canvas})}
function recortarImagemExtrato(canvas,x,y,w,h){const crop=document.createElement('canvas');crop.width=Math.max(1,Math.round(w));crop.height=Math.max(1,Math.round(h));crop.getContext('2d').drawImage(canvas,x,y,w,h,0,0,crop.width,crop.height);return crop}
async function parseExtrato(file){const ext=file.name.split('.').pop().toLowerCase();let txt='';if(['ofx','qfx','txt'].includes(ext)){txt=await file.text();const out=[];const blocks=txt.match(/<STMTTRN>[\s\S]*?<\/STMTTRN>/gi)||txt.match(/<STMTTRN>[\s\S]*?(?=<STMTTRN>|<\/BANKTRANLIST>|$)/gi)||[];blocks.forEach(b=>{const get=t=>(b.match(new RegExp('<'+t+'>([^<\\r\\n]+)','i'))||[])[1]||'';let date=(get('DTPOSTED').match(/^\d{8}/)||[])[0]||'';if(date.length!==8)return;const amount=Number(get('TRNAMT'));if(!Number.isFinite(amount)||!amount)return;out.push({d:`${date.slice(0,4)}-${date.slice(4,6)}-${date.slice(6,8)}`,desc:(get('NAME')||get('MEMO')||get('FITID')||'Movimentação bancária').trim(),v:Math.round(Math.abs(amount)*100),c:amount>0?'orec':'out',signed:amount})});return out.map(x=>({...x,v:Math.round(Math.abs(x.signed)*100),desc:(x.signed<0?'Saída · ':'Entrada · ')+x.desc})).filter(x=>x.d)}
 if(ext==='csv'||ext==='txt'){txt=await file.text();const lines=txt.replace(/^\uFEFF/,'').split(/\r?\n/).filter(x=>x.trim());if(lines.length<2)return[];const delim=(lines[0].match(/;/g)||[]).length>(lines[0].match(/,/g)||[]).length?';':',';const split=line=>{const a=[];let cur='',q=false;for(let i=0;i<line.length;i++){const ch=line[i];if(ch==='"'&&line[i+1]==='"'&&q){cur+='"';i++}else if(ch==='"')q=!q;else if(ch===delim&&!q){a.push(cur.trim());cur=''}else cur+=ch}a.push(cur.trim());return a};const first=split(lines[0]).map(x=>x.toLowerCase());const di=first.findIndex(x=>/data|date|lançamento/.test(x)),vi=first.findIndex(x=>/valor|value|amount|montante/.test(x)),ti=first.findIndex(x=>/descri|histórico|memo|description|lançamento/.test(x));const start=di>=0&&vi>=0?1:0;const out=[];for(const line of lines.slice(start)){const a=split(line),d=parseDateAny(a[di>=0?di:0]),v=parseMoneyAny(a[vi>=0?vi:2]);if(!d||!Number.isFinite(v)||v===0)continue;out.push({d,desc:(a[ti>=0?ti:1]||'Movimentação bancária').slice(0,80),v:Math.round(Math.abs(v)*100),c:v>0?'orec':'out',signed:v})}return out.map(x=>({...x,desc:(x.signed<0?'Saída · ':'Entrada · ')+x.desc}))}
  if(ext==='pdf')return await converterPdfViaOfxFacil(file);
  if(['png','jpg','jpeg'].includes(ext)){
   const image=await ampliarImagemExtrato(file),worker=await criarLeitorOcrExtrato();try{
    txt=(await worker.recognize(image)).data?.text||'';
    if(/comprovante.{0,40}pix|pix.{0,30}(recebido|recebimento)/i.test(txt)){
     await worker.setParameters({tessedit_pageseg_mode:'7',tessedit_char_whitelist:'0123456789R$.,/-',preserve_interword_spaces:'1'});
     const amountCrop=recortarImagemExtrato(image,image.width*.18,image.height*.36,image.width*.64,image.height*.34),dateCrop=recortarImagemExtrato(image,image.width*.08,image.height*.68,image.width*.84,image.height*.25),amountText=(await worker.recognize(amountCrop)).data?.text||'',dateText=(await worker.recognize(dateCrop)).data?.text||'';
     const amountMatch=amountText.match(/(?:R\s*\$?\s*)?(\d[\d.]*[,.]\d{2})/),dateCandidates=[...(`${dateText} ${txt}`).matchAll(/(\d{2}[./-]\d{2}[./-]\d{4})/g)],d=dateCandidates.map(m=>parseDateAny(m[1])).find(Boolean)||'',amount=amountMatch?parseMoneyAny(amountMatch[1]):NaN;
     if(d&&Number.isFinite(amount)&&amount>0)return[{d,desc:'Entrada · Pix recebido',v:Math.round(amount*100),c:'orec',signed:amount}];
    }
   }finally{await worker.terminate()}
   const rows=parseExtratoTexto(txt,file.name);if(rows.length)return rows;throw new Error('Não consegui identificar com segurança data e valor nesta imagem. Use uma imagem nítida que mostre o comprovante inteiro e confira a prévia antes de importar.')
  }
  throw new Error('Formato não suportado. Use OFX, QFX, CSV, PDF, PNG ou JPEG.')}
function natureBaseLabel(base){return ({rec:'Receita',des:'Despesa',cus:'Custo',ded:'Imposto / dedução',ret:'Retirada'})[base]||'Despesa';}
function normMov(s){return String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/^(saida|entrada)\s*[·:-]\s*/,'').replace(/[^a-z0-9]+/g,' ').trim()}
function conciliacao(rows){const existing=S[S.m].l||[];return rows.map((x,i)=>{const nd=normMov(x.desc);const duplicate=existing.some(y=>y.d===x.d&&Math.abs(Number(y.v)||0)===Math.abs(Number(x.v)||0)&&(normMov(y.desc)===nd||normMov(y.desc).includes(nd)||nd.includes(normMov(y.desc))));const desc=nd;let category='';if(/salario|salario|folha/.test(desc))category='sal';else if(/aluguel|moradia/.test(desc))category='mor';else if(/mercado|supermercado|alimentacao/.test(desc))category='mer';else if(/combustivel|posto|gasolina|uber|taxi/.test(desc))category='tra';else if(/imposto|das|darf|tribut/.test(desc))category='imp';else if(/pix|transferencia/.test(desc))category='';return {...x,_i:i,_dup:duplicate,_cat:category,_use:!duplicate}})}
function importCategories(direction){return catsFor(S.m).filter(c=>isIn(catGroupBase(S.m,c[2]))===(direction==='entrada'))}
function importCategoryOptions(direction,selected){return importCategories(direction).map(c=>`<option value="${E(c[0])}" ${c[0]===selected?'selected':''}>${E(c[1])}</option>`).join('')}
function importFallbackCategory(direction){return importCategories(direction)[0]?.[0]||''}
function importarView(){return `<section class="pn"><h2>Importar planilha de vendas e despesas</h2><p>Importe um arquivo preparado para a Mesa Financeira. A prévia confere a conta de destino, preserva as situações das despesas e separa as vendas por unidade. Os dados são gravados cifrados no ambiente PJ.</p><p class="cap">Você também pode carregar um arquivo de correção para ajustar despesas já importadas, sem duplicar vendas ou lançamentos.</p><form id="workbook-import-form" class="g"><label class="f full">Arquivo de importação ou correção<input id="workbook-import-file" type="file" accept=".json,application/json" required></label><p class="cap full">A planilha não será enviada a outro serviço. Confira a prévia; nada será salvo até você confirmar.</p><button class="pri full" type="submit">Ler arquivo e mostrar prévia</button></form><div id="workbook-import-preview"></div></section>
  <section class="pn"><h2>Importar extrato bancário</h2><p>Formatos comuns: <b>OFX</b> (exportado por muitos bancos), <b>CSV</b>, <b>PDF</b>, <b>PNG</b> e <b>JPEG</b>. Extratos PDF são enviados ao OFX Fácil para conversão; imagens PNG/JPEG são lidas por OCR e podem precisar de revisão manual.</p>
  <form id="import-form" class="g"><label class="f full">Arquivo de extrato<input id="statement-file" type="file" accept=".ofx,.qfx,.csv,.txt,.pdf,.png,.jpg,.jpeg,application/pdf,image/png,image/jpeg" required></label><p class="cap full">A importação primeiro apresenta uma prévia. Nenhum lançamento é salvo até você confirmar. Confira datas, valores, descrições e categorias antes de importar.</p><button class="pri full" type="submit">Ler arquivo e mostrar prévia</button></form><div id="import-preview"></div></section>
 <section class="pn"><h3>Antes de importar</h3><ul><li>Baixe o extrato diretamente no aplicativo/site do seu banco.</li><li>Evite enviar senhas, tokens ou dados de acesso bancário.</li><li>Verifique duplicidades na prévia; a importação não substitui a conciliação.</li></ul></section>`}
function ajustesView(){
 const cats=catsFor(S.m), groups=S[S.m].groups||[], natures=natureList(S.m);
 const pf=S.m==='pf';
 const needCats=pf?catsInGroup(S.m,{id:'nec',custom:false}):[];
 const needGroupNames=[...new Set(needCats.map(c=>suggestedNeedGroup(c[1])))];
 const baseOptions=Object.keys(CFG[S.m].g).map(id=>`<option value="${E(id)}">${E(groupName(S.m,id))}</option>`).join('');
 const groupNatures=pf?[natureById(S.m,'des'),natureById(S.m,'rec')]:natures;
 const groupNatureOptions=(selected,base='des')=>groupNatures.map(n=>{const selectedByBase=pf?(catGroupBase(S.m,n.base)===base):(n.id===selected||(!selected&&n.base===base));return`<option value="${E(n.id)}"${selectedByBase?' selected':''}>${E(pf?(n.base==='rec'?'Entrada (a receber)':'Saída (a pagar)'):n.name+' · '+natureBaseLabel(n.base))}</option>`}).join('');
 const categoryGroupOptions=catGroupsFor(S.m).map(g=>`<option value="${E(g.id)}">${E(g.name)}</option>`).join('');
 return `<section class="pn"><h2>Ajustes do ambiente ${E(CFG[S.m].nome)}</h2><p class="cap">Organize as opções que aparecem nos lançamentos deste ambiente.</p></section>
 <section class="pn category-config"><h2>Categorias e subcategorias</h2><p class="category-intro">Um <b>grupo</b> reúne opções parecidas. A <b>categoria</b> é a opção que você escolhe no lançamento. Exemplo: <b>Necessidades → Moradia</b>. Você pode criar outros grupos além dos que já vêm prontos.</p>
 <div class="category-steps">
  <div class="category-step"><h3>1. Criar um grupo</h3><p>Exemplo: “Pensão Alimentícia”, “Educação” ou “Pets”.</p><form id="group-form"><label class="f">Nome do grupo<input name="groupname" maxlength="45" required placeholder="Ex.: Pensão Alimentícia"></label>${pf?`<label class="f">Esse grupo será usado para<select name="groupnature">${groupNatureOptions('', 'des')}</select></label>`:`<label class="f">Tipo de movimentação<select name="groupnature">${groupNatureOptions('', 'des')}</select></label>`}<button class="pri" type="submit">Criar grupo</button></form></div>
  <div class="category-step"><h3>2. Criar uma categoria</h3><p>Essa é a opção que você selecionará ao registrar uma conta ou receita.</p><form id="cat-form"><label class="f">Nome da categoria<input name="catname" maxlength="45" required placeholder="Ex.: Pagamento mensal"></label><label class="f">Adicionar dentro de<select name="catgroup" required><option value="" selected disabled>Escolha um grupo</option>${baseOptions}${groups.map(g=>`<option value="${E(g.id)}">${E(g.name)}</option>`).join('')}</select></label><button class="pri" type="submit">Criar categoria</button></form></div>
 </div>
 ${pf&&needCats.length?`<div class="category-step category-organize"><h3>Separar gastos por assunto</h3><p>${needCats.length} categoria(s) ainda estão em Necessidades. Vamos distribuí-las em grupos próprios: ${needGroupNames.map(E).join(', ')}. Os lançamentos existentes acompanham a categoria e não serão apagados.</p><button type="button" class="pri" data-a="pf-organize-needs">Organizar Necessidades</button></div>`:''}
 <details class="category-group-list"><summary><b>Grupos que você criou</b><span class="cap">${groups.length} grupo(s)</span></summary>${groups.length?`<ul class="ls">${groups.map(g=>{const nid=g.natureId||g.nature||'des',base=catGroupBase(S.m,natureById(S.m,nid).base),groupBase=isIn(base)?'ren':'des',count=catsInGroup(S.m,{id:g.id,custom:true}).length;return `<li><span style="flex:1;min-width:220px"><input data-group-name="${E(g.id)}" aria-label="Nome do grupo ${E(g.name)}" maxlength="45" value="${E(g.name)}"><small>${count} categoria(s) · ${E(pf?(isIn(base)?'Entrada':'Saída'):natureName(S.m,nid))}</small><select data-group-nature="${E(g.id)}" aria-label="Tipo de ${E(g.name)}">${groupNatureOptions(nid,groupBase)}</select></span><button data-a="group-rename" data-id="${E(g.id)}">Salvar</button><button data-a="group-del" data-id="${E(g.id)}">Excluir</button></li>`}).join('')}</ul>`:'<p class="cap">Os grupos que você criar aparecerão aqui.</p>'}</details>
 <p class="cap">Edite o nome do grupo pelo botão ao lado do título. Para renomear uma categoria, altere o campo correspondente e salve.</p>
 <details class="category-group-list category-manager-list" open><summary><b>Categorias disponíveis</b><span class="cap">${cats.length} categoria(s)</span></summary>${cats.length?catGroupsFor(S.m).map(g=>{const items=catsInGroup(S.m,g);return items.length?`<details class="category-subgroup"><summary><b>${E(g.name)}</b><button type="button" class="category-title-edit" data-a="group-title-rename" data-id="${E(g.id)}" title="Editar nome de ${E(g.name)}" aria-label="Editar nome do grupo ${E(g.name)}">✎ Editar nome</button><span class="cap">${items.length} categoria(s)</span></summary><ul class="ls">${items.map(c=>{const isDefault=CFG[S.m].c.some(x=>x[0]===c[0]),selectedId=c[3]||c[2];return `<li><span><input data-cat-name="${E(c[0])}" aria-label="Nome da categoria ${E(c[1])}" maxlength="45" value="${E(c[1])}"><small>${isDefault?'Padrão do sistema':'Criada por você'}</small><select data-cat-group="${E(c[0])}" aria-label="Grupo de ${E(c[1])}">${categoryGroupOptions.replace(`value="${E(selectedId)}"`,`value="${E(selectedId)}" selected`)}</select></span><div class="category-tools"><button data-a="cat-save" data-id="${E(c[0])}">Salvar alteração</button><button data-a="cat-del" data-id="${E(c[0])}">Excluir</button></div></li>`}).join('')}</ul></details>`:''}).join(''):'<p class="cap">Nenhuma categoria cadastrada.</p>'}</details>
 <p class="cap">Alterações de nome e grupo também atualizam como os lançamentos anteriores são exibidos. Categorias vinculadas a lançamentos não podem ser excluídas, para preservar seu histórico.</p></section>
 <section class="pn"><details class="category-advanced"><summary>Opções financeiras avançadas</summary><p class="cap">Use estas opções para personalizar as classificações usadas nos relatórios.</p><h3>Naturezas financeiras</h3><form id="nature-form" class="g"><label class="f">Nome da classificação<input name="naturename" maxlength="45" required placeholder="Ex.: Despesas administrativas"></label><label class="f">Tipo<select name="naturebase"><option value="des">Despesa</option><option value="rec">Receita</option><option value="cus">Custo</option><option value="ded">Imposto / dedução</option><option value="ret">Retirada</option></select></label><button class="pri" type="submit">Criar classificação</button></form><ul class="ls">${natures.map(n=>`<li><span style="flex:1;min-width:180px"><input data-nature-name="${E(n.id)}" aria-label="Nome da natureza ${E(n.name)}" maxlength="45" value="${E(n.name)}"><small>${E(natureBaseLabel(n.base))}${n.locked?' · padrão':''}</small></span><button data-a="nature-rename" data-id="${E(n.id)}">Salvar</button>${n.locked?'':`<button data-a="nature-del" data-id="${E(n.id)}">Excluir</button>`}</li>`).join('')}</ul></details></section>
 <section class="pn"><h2>Tipos personalizados de movimentação</h2><p class="cap">Cadastre tipos como Pix, transferência, dinheiro, cartão ou boleto. Eles ficam disponíveis no formulário de lançamentos deste ambiente.</p><form id="type-form" class="g"><label class="f">Nome do tipo<input name="typename" maxlength="35" required placeholder="Ex.: Pix, Cartão, Boleto"></label><button class="pri" type="submit">Adicionar tipo</button></form>${(S[S.m].types||[]).length?`<ul class="ls">${S[S.m].types.map(t=>`<li><span><b>${E(t)}</b></span><button data-a="type-del" data-id="${E(t)}">Excluir</button></li>`).join('')}</ul>`:'<p class="cap">Nenhum tipo personalizado ainda.</p>'}</section>
  <section class="pn"><h3>Importação bancária</h3><p>Use a aba <b>Importar extrato</b> para carregar arquivos OFX, CSV, PDF, PNG ou JPEG.</p></section>`;
}

function cadastroView(){
 const m=S.m,pf=m==='pf',d=S[m].cadastro||{};
 return `<section class="pn"><h2>${pf?'Cadastro da pessoa':'Cadastro da empresa'}</h2><p class="cap">Esses dados identificam o titular do ambiente ${pf?'PF':'PJ'} da conta atual. ${pf?'Preencha apenas os dados de contato que deseja guardar.':'Este é o cadastro da sua própria empresa; para cadastrar e consultar seus clientes, use a aba Clientes. O cadastro não faz verificação fiscal nem substitui registros oficiais.'}</p>
 <form id="cadastro-form" class="g">
 ${pf?`<label class="f full">Nome completo<input name="nome" maxlength="100" autocomplete="name" value="${E(d.nome||'')}" required></label>`:`<label class="f full">Razão social ou nome empresarial<input name="razaoSocial" maxlength="120" value="${E(d.razaoSocial||'')}" required></label><label class="f full">Nome fantasia (opcional)<input name="nomeFantasia" maxlength="120" value="${E(d.nomeFantasia||'')}"></label><label class="f">CNPJ (opcional)<input name="cnpj" maxlength="18" inputmode="numeric" placeholder="00.000.000/0000-00" value="${E(d.cnpj||'')}"></label><label class="f">Atividade principal (opcional)<input name="atividade" maxlength="100" value="${E(d.atividade||'')}"></label>`}
 <label class="f">E-mail de contato<input name="email" type="email" maxlength="254" autocomplete="email" value="${E(d.email||USER?.email||'')}"></label><label class="f">Telefone (opcional)<input name="telefone" type="tel" maxlength="25" autocomplete="tel" value="${E(d.telefone||'')}"></label>
 <button class="pri full" type="submit">Salvar cadastro</button></form></section>`;
}

function getDailySales(){
 const P=S.pj;P.dailySales=P.dailySales||{unidades:[{id:'matriz',nome:'Matriz'},{id:'oliveira',nome:'Oliveira'}],registros:[]};
 P.dailySales.unidades=Array.isArray(P.dailySales.unidades)?P.dailySales.unidades:[{id:'matriz',nome:'Matriz'},{id:'oliveira',nome:'Oliveira'}];
 P.dailySales.registros=Array.isArray(P.dailySales.registros)?P.dailySales.registros:[];
 return P.dailySales;
}
function vendasDiariasView(){
 const data=getDailySales(),entry=VD_EDIT?data.registros.find(x=>x.id===VD_EDIT):null;
 const units=data.unidades,month=data.registros.filter(x=>x.date?.startsWith(S.mes)).sort((a,b)=>b.date.localeCompare(a.date));
 const sums=keys=>keys.reduce((a,k)=>a+(month.reduce((n,x)=>n+(Number(x[k])||0),0)),0);
 const inputs=[['cash','Dinheiro'],['pix','Pix'],['card','Cartão'],['credit','Crediário'],['check','Cheque']];
 const unitStats=units.map(u=>{const rows=month.filter(x=>x.unitId===u.id);return {unit:u,total:rows.reduce((n,x)=>n+(Number(x.total)||0),0),count:rows.length}});
 const exp=S.pj.l.filter(x=>x.d?.startsWith(S.mes)&&!isIn(cat('pj',x.c)[2])&&!x.dailySalesId).sort((a,b)=>b.d.localeCompare(a.d));
 return mon()+`<section class="pn hero"><p class="cap">Vendas registradas em ${ml(S.mes)}</p><p class="big">${brl(sums(['total']))}</p><p class="cap">Dinheiro ${brl(sums(['cash']))} · Pix ${brl(sums(['pix']))} · Cartão ${brl(sums(['card']))} · Crediário ${brl(sums(['credit']))} · Cheque ${brl(sums(['check']))}</p></section>
 <section class="pn"><h2>Resumo por unidade</h2>${unitStats.length?`<ul class="ls">${unitStats.map(x=>`<li><span><b>${E(x.unit.nome)}</b><small>${x.count} dia(s) registrados</small></span><span class="v pos">${brl(x.total)}</span></li>`).join('')}</ul>`:'<p class="cap">Cadastre uma unidade para começar.</p>'}</section>
 <section class="pn"><h2>${entry?'Editar':'Registrar'} venda do dia</h2><p class="cap">Registre o total diário por forma de pagamento. O total é enviado ao financeiro como uma única receita vinculada, evitando duplicidade.</p>
 <form id="daily-sales-form" class="g"><label class="f">Data<input name="date" type="date" required value="${entry?entry.date:(S.mes===ym(new Date())?today():S.mes+'-01')}"></label><label class="f">Unidade<select name="unit" required>${units.map(u=>`<option value="${E(u.id)}"${(entry?entry.unitId===u.id:u.id===units[0]?.id)?' selected':''}>${E(u.nome)}</option>`).join('')}</select></label>
 ${inputs.map(([key,label])=>`<label class="f">${label} (R$)<input name="${key}" inputmode="decimal" placeholder="0,00" value="${entry?(Number(entry[key]||0)/100).toFixed(2).replace('.',','):''}"></label>`).join('')}
 <p class="cap full" id="daily-sales-total">Total desta venda: ${brl(entry?.total||0)}</p><p class="neg full" id="daily-sales-error" role="alert" hidden></p><button class="pri full" type="submit">${entry?'Salvar alterações':'Salvar venda diária'}</button>${entry?'<button class="full" type="button" data-a="vd-cancel">Cancelar edição</button>':''}</form></section>
 <section class="pn"><h2>Unidades</h2><p class="cap">Altere os nomes exibidos nos lançamentos. As vendas existentes continuam vinculadas à unidade correspondente.</p><form id="daily-sales-units-form" class="g">${[0,1].map(i=>`<label class="f">Unidade ${i+1}<input name="unit${i+1}" maxlength="50" required value="${E(units[i]?.nome||'Unidade '+(i+1))}"></label>`).join('')}<button class="pri" type="submit">Salvar unidades</button></form></section>
 <section class="pn"><h2>Vendas diárias</h2>${month.length?`<ul class="ls">${month.map(x=>{const u=units.find(y=>y.id===x.unitId)?.nome||'Unidade';return `<li><span><b>${x.date.slice(8)}/${x.date.slice(5,7)}/${x.date.slice(0,4)} · ${E(u)}</b><small>Dinheiro ${brl(x.cash||0)} · Pix ${brl(x.pix||0)} · Cartão ${brl(x.card||0)} · Crediário ${brl(x.credit||0)} · Cheque ${brl(x.check||0)}</small></span><span class="v pos">${brl(x.total)}</span><button class="gh" data-a="vd-edit" data-id="${E(x.id)}">Editar</button><button class="gh" data-a="vd-del" data-id="${E(x.id)}">Excluir</button></li>`}).join('')}</ul>`:`<p class="cap">Ainda não há vendas registradas em ${ml(S.mes)}.</p>`}</section>
 <section class="pn"><h2>Despesas do mês</h2><p class="cap">Registre despesas em Lançamentos. Quando este módulo está ativo, você também pode guardar fornecedor, referência de cheque ou boleto e observações no lançamento.</p><div class="ac"><button class="pri" data-a="novac" data-t="d">Adicionar despesa</button></div>${exp.length?`<ul class="ls">${exp.map(x=>`<li><span><b>${E(x.desc)}</b><small>${E(cat('pj',x.c)[1])} · ${x.d.slice(8)}/${x.d.slice(5,7)}${x.st==='a'?' · em aberto':''}${x.fornecedor?' · Fornecedor: '+E(x.fornecedor):''}${x.refPagamento?' · Ref.: '+E(x.refPagamento):''}${x.obs?' · '+E(x.obs):''}</small></span><span class="v">${brl(x.v)}</span>${!x.vendaId&&!x.g&&!x.cartao?`<button class="gh" data-a="edit" data-id="${E(x.id)}">Editar</button>`:''}</li>`).join('')}</ul>`:'<p class="cap">Nenhuma despesa registrada neste mês.</p>'}</section>`;
}

/* ---------- comprovantes ---------- */
async function subir(file){
  if(!USER)return null;
  if(file.size>5*1024*1024){aviso('O arquivo passa de 5 MB. Envie um menor.');return null}
  const p=USER.id+'/'+uid()+'-'+file.name.replace(/[^\w.\-]+/g,'_').slice(-60);
  const r=await sb.storage.from('comprovantes').upload(p,file,{contentType:file.type||undefined});
  if(r.error){aviso('Não foi possível enviar o comprovante. Confira se o arquivo supabase-v2.sql foi executado.');return null}
  aviso('');return{p,n:file.name};
}
async function abrir(p){
  const w=window.open('','_blank');
  const r=await sb.storage.from('comprovantes').createSignedUrl(p,120);
  if(r.data&&w)w.location.href=r.data.signedUrl;else{if(w)w.close();aviso('Não foi possível abrir o comprovante.')}
}

/* ---------- telas ---------- */
const mon=()=>`<div class="tb"><button data-a="pm" aria-label="Mês anterior">‹</button><b>${ml(S.mes)}</b><button data-a="nm" aria-label="Próximo mês">›</button></div>`;

function hist(m){
  const ms=[];for(let i=-5;i<=0;i++)ms.push(sh(S.mes,i));
  const d=ms.map(x=>{const a=agg(m,x);return[x,tIn(m,a),tOut(m,a)]});
  const mx=Math.max(1,...d.map(x=>Math.max(x[1],x[2])));
  let h='<svg class="ch" viewBox="0 0 360 140" role="img" aria-label="Entradas e saídas dos últimos 6 meses">';
  d.forEach((x,i)=>{
    const X=i*60+8,he=x[1]/mx*100,hs=x[2]/mx*100;
    h+=`<rect x="${X}" y="${110-he}" width="20" height="${he}" rx="2" fill="var(--in)"/><rect x="${X+23}" y="${110-hs}" width="20" height="${hs}" rx="2" fill="var(--out)"/><text x="${X+22}" y="128" text-anchor="middle" font-size="11" fill="var(--mu)">${mab(x[0])}</text>`;
  });
  return h+'</svg><p class="cap">Em cada mês: entradas à esquerda (verde), saídas à direita (vermelho).</p>';
}

function painel(){
  const m=S.m,pf=m==='pf',C=CFG[m],a=agg(m,S.mes),p=agg(m,sh(S.mes,-1)),B=banco(m),cx=B?B.atual:S[m].cx;
  let big,sub,seg,t,ref='',panelIncome=0,panelOut=0,panelResult=0;
  const variacao=(atual,anterior,nome)=>!anterior?(atual?'Há dados de '+nome+' neste mês, mas ainda não há mês anterior para comparar.':'Sem dados de '+nome+' neste mês.'):`${nome} ${atual>=anterior?'aumentou':'diminuiu'} ${pc(Math.abs(atual-anterior)/anterior)} em relação ao mês passado.`;
  if(pf){
    const r=a.ren;
    const customGroups=new Map((S.pf.groups||[]).map(g=>[g.id,g.name]));
    const distribution=new Map();
    S.pf.l.forEach(l=>{if(!dataRealLancamento(l).startsWith(S.mes))return;const category=cat('pf',l.c),value=Number(l.v)||0;if(isIn(category[2])||value<=0)return;const label=category[3]&&customGroups.get(category[3])||groupName('pf',category[2])||'Outros gastos';const item=distribution.get(label)||{value:0,categories:new Set()};item.value+=value;item.categories.add(l.c);distribution.set(label,item)});
    const palette=['#7C6BDA','#E3A15F','#54B58F','#D9786F','#4F9DD9','#B56BC5','#D8B64C','#5D9B8D'];
    const expenses=[...distribution].sort((x,y)=>y[1].value-x[1].value).map(([label,item],i)=>[label,item.value,palette[i%palette.length],[...item.categories]]);
    const gs=expenses.reduce((sum,item)=>sum+item[1],0),g=r-gs;
    panelIncome=r;panelOut=gs;panelResult=g;
    big=B?B.atual:null;sub=B?'Saldo inicial mais pagamentos e recebimentos confirmados até hoje.':'Cadastre uma conta e seu saldo inicial na aba Banco.';
    seg=expenses.concat(g>0?[['Sobra do mês',g,'#54B58F']]:[]);
    if(g<0)seg.push(['Déficit do mês',Math.abs(g),'#D9786F']);
    ref='';
    t=[['Renda',brl(r),dl(r,p.ren),variacao(r,p.ren,'A renda')],['Gastos',brl(gs),dl(gs,p.nec+p.des+p.fut),variacao(gs,p.nec+p.des+p.fut,'Os gastos')],['Sobra do mês',brl(g),r?`${pc(g/r)} da renda`:'Registre sua renda',g<0?'Os gastos superaram a renda neste mês. Revise as despesas para recuperar a sobra.':r?`Você manteve ${pc(g/r)} da renda depois dos gastos.`:'Registre sua renda para calcular quanto sobrou.']];
  }else{
    const rec=a.rec,op=a.ded+a.cus+a.des,res=rec-op;panelIncome=rec;panelOut=op;panelResult=res;
    big=res;sub=rec?`margem de ${pc(res/rec)}`:'Registre as receitas para ver a margem';
        const categoryIdsForBase=id=>catsFor(m).filter(c=>catGroupBase(m,c[2])===id).map(c=>c[0]);
    seg=[['Impostos',a.ded,'c3',categoryIdsForBase('ded')],['Custos',a.cus,'c1',categoryIdsForBase('cus')],['Despesas',a.des,'c2',categoryIdsForBase('des')],['Retiradas',a.ret,'c4',categoryIdsForBase('ret')],['Resultado após retiradas',Math.max(rec-op-a.ret,0),'c5']];
    t=[['Receita',brl(rec),dl(rec,p.rec),variacao(rec,p.rec,'A receita')],['Custos e despesas',brl(op),dl(op,p.ded+p.cus+p.des),rec?`${pc(op/rec)} da receita foi consumida por custos e despesas.`:'Registre receita para avaliar o peso dos custos e despesas.'],['Caixa',cx&&op?Math.round(cx/(op/30))+' dias':'—','de operação cobertos',cx&&op?`Com o ritmo de gastos deste mês, o saldo atual cobre cerca de ${Math.round(cx/(op/30))} dias.`:'Informe o saldo bancário e registre despesas para estimar os dias de caixa.']];
  }
  const den=pf?(panelIncome||panelOut||1):(seg.reduce((s,x)=>s+x[1],0)||1);
  const bar=seg.filter(x=>x[1]>0&&x[0]!=='Déficit do mês').map(x=>`<i style="flex:${x[1]};background:${x[2].startsWith('#')?x[2]:`var(--${x[2]})`}"></i>`).join('');
    const lg=seg.map(x=>{const label=x[3]?.length?`<button type="button" class="dash-group-link" data-a="dash-drill" data-label="${E(x[0])}" data-cats="${E(x[3].join(','))}">${E(x[0])}</button>`:E(x[0]);return`<li><span class="s" style="background:${x[2].startsWith('#')?x[2]:`var(--${x[2]})`}"></span><span>${label}</span><b>${brl(x[1])}</b><em>${pc(x[1]/den)}</em></li>`}).join('');
  const I=venc(m,B).concat(insights(m,a,p,cx)).map(x=>`<li class="${x[0]}">${x[1]}</li>`).join('');
  const outs=Object.entries(a.bc).filter(x=>!isIn(cat(m,x[0])[2])).sort((x,y)=>y[1]-x[1]);
  const cats=outs.length?`<ul class="cats">${outs.map(x=>`<li data-value="${x[1]}" style="--w:0%"><span>${E(cat(m,x[0])[1])}</span><b>${brl(x[1])}</b></li>`).join('')}</ul>`:'<p class="cap">Nenhuma saída registrada neste mês.</p>';
  const historico=[];for(let i=-5;i<=0;i++){const mes=sh(S.mes,i),x=agg(m,mes);historico.push({mes,entradas:tIn(m,x),saidas:tOut(m,x)})}
  const ultimo=historico[historico.length-1],saldoUltimo=ultimo.entradas-ultimo.saidas;
  const histAnalise=ultimo.entradas||ultimo.saidas?`Em ${ml(ultimo.mes)}, as entradas ${ultimo.entradas>=ultimo.saidas?'superaram':'ficaram abaixo de'} as saídas em ${brl(Math.abs(saldoUltimo))}. No período, compare as barras para acompanhar a tendência.`:'Ainda não há movimentações nos seis meses exibidos. Registre receitas e despesas para acompanhar a tendência.';
  const dragHandle='<button type="button" class="dash-drag-handle" draggable="true" data-dash-handle aria-label="Arraste para mudar a posição deste cartão" title="Clique e arraste para mudar a posição">⠿ Mover</button>';
 const resetDash=(S[m].dashboardOrder?.length||S[m].dashboardColumns)?'<button type="button" class="dash-drag-handle" data-a="dash-reset">Restaurar posições</button>':'';
  return mon()+`<div class="dashboard-sortable" aria-label="Cartões do painel. Arraste pelo botão Mover para reorganizar.">
  <section class="pn dash-all" data-dash-card="summary"><div class="dash-card-tools">${resetDash}${dragHandle}</div>
   <div class="dash-head"><div class="dash-main-balance"><p class="cap">${pf?'Saldo em caixa hoje':'Resultado operacional em '+MN[+S.mes.slice(5)-1]}</p><p class="big ${((pf&&B&&big<0)||(!pf&&big<0))?'neg':'pos'}">${pf?(B?brl(big):'—'):brl(big)}</p><p class="cap">${pf?sub:(sub+(a.rec?` · ${pc((a.rec-a.ded-a.cus-a.des)/a.rec)} da receita`:''))}</p>${!pf?'<p class="cap">Resultado dos lançamentos do mês; não indica quanto está disponível para retirada. Confira o saldo atualizado na aba Banco.</p>':''}</div>${!pf?`<div class="dash-bank"><p class="cap">Saldo no banco</p><p class="big">${B?brl(B.atual):'—'}</p><p class="cap">${B?'Saldo disponível registrado na aba Banco.':'Configure a conta para acompanhar o caixa.'}</p><button data-v="b">${B?'Ver extrato':'Configurar banco'}</button></div>`:''}</div>
   <div class="dash-kpis">${t.map(x=>`<div class="dash-kpi"><span>${x[0]}</span><b class="${x[0]==='Gastos'||x[0]==='Custos e despesas'?'neg':''}">${x[1]}</b><span class="dash-compare">${x[2]}</span><span class="dash-analysis">${x[3]}</span></div>`).join('')}</div>
   <div class="dash-bottom"><div class="dash-box"><h2>${pf?'Para onde foi sua renda':'Para onde foi a receita'}</h2>${pf?'<p class="cap">Distribuição neste mês · valores por grupo</p>':''}<div class="bar">${bar}</div>${ref}<ul class="lg">${lg}</ul><p class="dash-history-analysis">${pf?(panelIncome?`Você usou ${pc(panelOut/panelIncome)} da renda nos grupos de gastos deste mês. A sobra é ${brl(panelResult)}.`:'Informe sua renda para avaliar a distribuição.'):(panelIncome?`A sobra operacional antes das retiradas é ${brl(panelResult)} (${pc(panelResult/panelIncome)} da receita).`:'Registre receitas para avaliar a distribuição.')}</p></div><div class="dash-box"><h2>Últimos 6 meses</h2>${hist(m)}<p class="dash-history-analysis">${histAnalise}</p></div></div>
  </section>
  <div class="dash-summary">
  <section class="pn" data-dash-card="decisions"><div class="dash-card-tools">${dragHandle}</div><h2>Pontos de decisão</h2><ul class="ins">${I}</ul></section>
  <div class="dash-pair${pf?'':' solo'}">
  <section class="pn" data-dash-card="outflows"><div class="dash-card-tools">${dragHandle}</div><h2>Maiores saídas do mês</h2>${cats}</section>
  ${pf?`<section class="pn g" data-dash-card="savings"><div class="dash-card-tools full">${dragHandle}</div><h2 class="full">Dinheiro guardado</h2><p class="cap full">Anote aqui o valor que você separou. Esse valor fica à parte e não altera o saldo em caixa nem a sobra calculada no mês.</p><label class="f">Valor guardado (R$)<input data-rv="atual" inputmode="decimal" placeholder="0,00" value="${vr(S.pf.rsv?.atual||0)}"></label>${tem(2)?'<button data-v="rv">Ver planejamento da reserva</button>':''}</section>`:''}
  </div></div></div>
  `;
 }
const bancos=m=>S[m].bks||[];
const mig=(x,m)=>{if(!x.bks){x.bks=x.bk?[{id:'b0',nome:'Conta principal',saldo:x.bk.saldo,d:x.bk.d}]:[];delete x.bk}if(m==='pf'){
  (Array.isArray(x.cats)?x.cats:[]).forEach(c=>{c[2]=catGroupBase(m,c[2])});
  (Array.isArray(x.groups)?x.groups:[]).forEach(g=>{g.nature=catGroupBase(m,g.nature)});
 }return x};
function banco(m){
  const bs=bancos(m),t=today();if(!bs.length)return null;
  const c={};bs.forEach(b=>c[b.id]={b,atual:b.saldo,proj:0});
  S[m].l.forEach(l=>{
    const k=c[l.b]||c[bs[0].id],d=l.pg||l.d;
    if(l.st!=='a'&&d<k.b.d)return;
    const x=isIn(cat(m,l.c)[2])?l.v:-l.v;
    if(l.st!=='a'&&d<=t)k.atual+=x;else k.proj+=x;
  });
  const L=Object.values(c);let A=0,P=0;
  L.forEach(k=>{k.proj+=k.atual;A+=k.atual;P+=k.proj});
  return{atual:A,proj:P,contas:L};
}
const addD=(d,n)=>{const x=new Date(+d.slice(0,4),+d.slice(5,7)-1,+d.slice(8)+n);return ym(x)+'-'+p2(x.getDate())};
function venc(m,B){
  const t=today(),t7=addD(t,7),o=[];let ap=0,vp=0,ar=0,vr=0,p7=0,r7=0;
  S[m].l.forEach(l=>{
    if(l.st!=='a')return;
    const g=isIn(cat(m,l.c)[2]);
    if(l.d<t){if(g){ar++;vr+=l.v}else{ap++;vp+=l.v}}
    else if(l.d<=t7){if(g)r7+=l.v;else p7+=l.v}
  });
  if(ap)o.push(['bad',`${ap} ${ap>1?'contas a pagar estão atrasadas':'conta a pagar está atrasada'}, somando ${brl(vp)}. Priorize as que geram juros e multa.`]);
  if(ar)o.push(['warn',`${ar} ${ar>1?'valores a receber estão atrasados':'valor a receber está atrasado'}, somando ${brl(vr)}. Cobre hoje para não faltar caixa.`]);
  if(p7||r7){
    o.push(['info',`Nos próximos 7 dias: ${brl(p7)} a pagar e ${brl(r7)} a receber.`]);
    if(B&&p7>B.atual+r7)o.push(['bad',`O saldo do banco não cobre os pagamentos dos próximos 7 dias: faltam ${brl(p7-B.atual-r7)}.`]);
  }
  return o;
}
function contasSepResultados(receber){
  const m=S.m,t=today(),g=l=>isIn(cat(m,l.c)[2]),consulta=receber?MES_ARECEBER:MES_APAGAR,key=receber?'receber':'pagar',query=(RECEBER_PAGAR_SEARCH[key]||'').trim();
  let it=S[m].l.filter(l=>g(l)===receber&&(query||(l.st==='a'?l.d.slice(0,7):dataRealLancamento(l).slice(0,7))===consulta));
  if(query)it=it.filter(l=>lancMatches(l,m,query));
  const ab=it.filter(l=>l.st==='a').sort((x,y)=>x.d.localeCompare(y.d));
  const pg=it.filter(l=>l.st!=='a').sort((x,y)=>(y.pg||y.d).localeCompare(x.pg||x.d));
  const sm=a=>a.reduce((n,l)=>n+l.v,0),fd=d=>d.slice(8)+'/'+d.slice(5,7)+'/'+d.slice(0,4);
  const item=l=>{const canManage=!l.vendaId&&!l.dailySalesId&&!l.cartao;const linkedDaily=!!l.dailySalesId;const actions=linkedDaily?`<button class="gh" data-a="vd-edit" data-id="${E(l.dailySalesId)}">Editar venda diária</button><button class="gh" data-a="vd-del" data-id="${E(l.dailySalesId)}">Excluir</button>`:canManage?`${l.g?`<button class="gh" data-a="edit-series" data-id="${E(l.id)}">Editar repetição</button>`:''}<button class="gh" data-a="edit" data-id="${E(l.id)}">Editar parcela</button><button class="gh" data-a="del" data-id="${E(l.id)}">Excluir</button>`:'<small>Vinculado à origem</small>';return`<li><div><b>${E(l.desc)}</b><small>${E(cat(m,l.c)[1])} · Vencimento ${fd(l.d)} · ${l.st==='a'?(l.d<t?'<b class="neg">vencida</b>':l.d===t?'<b>vence hoje</b>':'em aberto'):(l.pg?'liquidada em '+fd(l.pg):receber?'recebida':'paga')}</small></div><span class="v ${receber?'pos':''}">${brl(l.v)}</span>${l.st==='a'?`<button class="pri sm" data-a="pay" data-id="${E(l.id)}">${receber?'Marcar recebido':'Marcar pago'}</button>`:`<button class="gh" data-a="pay" data-id="${E(l.id)}">Editar data</button>`}${actions}</li>`};
  const venc=ab.filter(l=>l.d<t).length,kind=receber?'Contas a receber':'Contas a pagar';
  return`<section class="pn hero${!receber&&venc?' loss':''}"><p class="cap">${query?'Resultados da busca · ':''}Total ${receber?'a receber':'a pagar'} em aberto${query?' em todos os meses':' em '+ml(consulta)}</p><p class="big">${brl(sm(ab))}</p><p class="cap">${ab.length} em aberto · ${venc} vencida(s) · ${brl(sm(pg))} já ${receber?'recebidos':'pagos'}${query?' nos resultados':' neste mês'}</p><div class="ac"><button data-a="novac" data-t="${receber?'e':'s'}" style="color:var(--ink)">Nova conta ${receber?'a receber':'a pagar'}</button></div></section>
  <section class="pn"><h2>${kind} · em aberto${query?'':' em '+ml(consulta)}</h2>${ab.length?`<ul class="ls">${ab.map(item).join('')}</ul>`:`<p class="cap">${query?'Nenhuma conta encontrada. Tente buscar por descrição, categoria ou valor.':'Nenhuma conta em aberto neste mês. Escolha outro mês ou registre uma conta com vencimento.'}</p>`}</section>
  <section class="pn"><h2>Histórico · já ${receber?'recebidos':'pagos'}${query?' · resultados':''}</h2>${pg.length?`<ul class="ls">${pg.slice(0,query?pg.length:30).map(item).join('')}</ul>${!query&&pg.length>30?'<p class="cap" style="margin-top:12px">Mostrando os 30 mais recentes.</p>':''}`:`<p class="cap">${query?'Nenhum lançamento encontrado. Tente buscar por descrição, categoria ou valor.':'Ainda não há contas liquidadas.'}</p>`}</section>`;
}
function contasSep(receber){
  const m=S.m,consulta=receber?MES_ARECEBER:MES_APAGAR,key=receber?'receber':'pagar';
  const seletorMes=(()=>{const now=ym(new Date()),dates=S[m].l.map(l=>l.d).filter(d=>/^\d{4}-\d{2}-\d{2}$/.test(d)).map(d=>d.slice(0,7)),inicio=dates.length&&dates.reduce((a,b)=>a<b?a:b)<sh(now,-24)?dates.reduce((a,b)=>a<b?a:b):sh(now,-24),fim=dates.length&&dates.reduce((a,b)=>a>b?a:b)>sh(now,60)?dates.reduce((a,b)=>a>b?a:b):sh(now,60),meses=[];for(let d=inicio;d<=fim;d=sh(d,1))meses.push(d);return`<section class="pn g month-query"><label class="f">Consultar contas ${receber?'a receber':'a pagar'} em<select data-query-month="${receber?'receive':'pay'}">${meses.map(d=>`<option value="${d}"${d===consulta?' selected':''}>${ml(d)}</option>`).join('')}</select></label><p class="cap">A busca abaixo também localiza contas de outros meses.</p></section>`})();
  return seletorMes+`<section class="pn"><h2>Buscar ${receber?'contas a receber':'contas a pagar'}</h2><div class="launch-search"><label class="launch-search-control"><svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2"><circle cx="10.8" cy="10.8" r="6.8"></circle><path d="m16 16 5 5"></path></svg><input id="${receber?'receber':'pagar'}-search" type="search" autocomplete="off" aria-label="Buscar ${receber?'contas a receber':'contas a pagar'}" placeholder="Buscar descrição, categoria, data ou valor..." value="${E(RECEBER_PAGAR_SEARCH[key]||'')}"></label><p class="cap">A busca consulta todos os meses.</p></div></section><div id="pay-receive-results">${contasSepResultados(receber)}</div>`;
}
function refreshContasSearch(){const host=document.querySelector('#pay-receive-results');if(host&&(S.v==='cr'||S.v==='cp'))host.innerHTML=contasSepResultados(S.v==='cr')}
function ensureClientCodes(P=S.pj){
  P.clientes=Array.isArray(P.clientes)?P.clientes:[];
  let max=999;P.clientes.forEach(c=>{const n=Number(c.codigo);if(Number.isInteger(n)&&n>=1000)max=Math.max(max,n)});
  let next=Math.max(1000,Number(P.nextClienteCode)||1000,max+1),changed=false;
  P.clientes.forEach(c=>{if(!Number.isInteger(Number(c.codigo))||Number(c.codigo)<1000){c.codigo=next++;changed=true}});
  if((Number(P.nextClienteCode)||0)<next){P.nextClienteCode=next;changed=true}
  return changed;
}
function allocateClientCode(P=S.pj){ensureClientCodes(P);const code=Math.max(1000,Number(P.nextClienteCode)||1000);P.nextClienteCode=code+1;return code}
const UF_BY_IBGE={'11':'RO','12':'AC','13':'AM','14':'RR','15':'PA','16':'AP','17':'TO','21':'MA','22':'PI','23':'CE','24':'RN','25':'PB','26':'PE','27':'AL','28':'SE','29':'BA','31':'MG','32':'ES','33':'RJ','35':'SP','41':'PR','42':'SC','43':'RS','50':'MS','51':'MT','52':'GO','53':'DF'};
const IBGE_ID_BY_UF=Object.fromEntries(Object.entries(UF_BY_IBGE).map(([id,uf])=>[uf,id]));
function cnpjValido(value){const s=String(value||'').replace(/\D/g,'');if(s.length!==14||/^([0-9])\1{13}$/.test(s))return false;const digit=(base,weights)=>{const sum=base.split('').reduce((n,d,i)=>n+Number(d)*weights[i],0),r=sum%11;return r<2?0:11-r};const first=digit(s.slice(0,12),[5,4,3,2,9,8,7,6,5,4,3,2]);const second=digit(s.slice(0,12)+first,[6,5,4,3,2,9,8,7,6,5,4,3,2]);return Number(s[12])===first&&Number(s[13])===second}
function clientesView(){
  const P=S.pj;const changed=ensureClientCodes(P);if(changed)save();
  P.vendas=Array.isArray(P.vendas)?P.vendas:[];
  const clientes=P.clientes.slice().sort((a,b)=>Number(a.codigo)-Number(b.codigo));
  const edit=CLI_EDIT_ID?P.clientes.find(c=>c.id===CLI_EDIT_ID):null;
  const rows=clientes.map(c=>{const count=P.vendas.filter(v=>v.clienteId===c.id&&!v.cancelada).length;return `<li><div><b>${E(String(c.codigo).padStart(4,'0'))} · ${E(c.nome)}</b><small>${c.razaoSocial?E(c.razaoSocial)+' · ':''}${c.documento?E(c.documento)+' · ':''}${c.telefone?E(c.telefone):''}${c.telefone&&c.email?' · ':''}${c.email?E(c.email):''}${c.telefone||c.email?' · ':''}${count} ${count===1?'venda':'vendas'}</small></div><button data-a="client-open" data-id="${E(c.id)}">Abrir cadastro</button><button data-a="client-del" data-id="${E(c.id)}">Excluir</button></li>`}).join('');
  return `<section class="pn hero"><p class="cap">Cadastro de clientes</p><p class="big">${clientes.length}</p><p class="cap">Cada cliente recebe um código sequencial permanente, começando em 1000. Use “Abrir cadastro” para consultar ou editar os dados.</p></section>
  <form class="pn g client-form" id="client-form"><h2 class="full">${edit?'Editar cliente '+String(edit.codigo).padStart(4,'0'):'Cadastrar cliente'}</h2>
  <div class="full client-section-title"><b>Identificação</b></div>
  <label class="f full">Nome ou razão social<input name="nome" maxlength="150" required value="${E(edit?.nome||'')}" placeholder="Nome para identificar o cliente"></label>
  <label class="f">Tipo de pessoa<select name="tipoPessoa"><option value="fisica"${edit?.tipoPessoa==='fisica'?' selected':''}>Pessoa física</option><option value="juridica"${!edit||edit.tipoPessoa==='juridica'?' selected':''}>Pessoa jurídica</option><option value="estrangeiro"${edit?.tipoPessoa==='estrangeiro'?' selected':''}>Estrangeiro</option><option value="produtor_rural"${edit?.tipoPessoa==='produtor_rural'?' selected':''}>Produtor rural</option></select></label>
  <div class="f cnpj-lookup-field" id="client-document-field"><label id="client-document-label" for="client-documento">${edit?.tipoPessoa==='fisica'?'CPF':'CNPJ / CPF'}</label><div class="cnpj-lookup-row"><input id="client-documento" name="documento" maxlength="14" inputmode="numeric" value="${E(String(edit?.documento||'').replace(/\D/g,''))}" placeholder="Somente números"><button type="button" class="secondary" data-a="client-cnpj-lookup"${edit?.tipoPessoa==='fisica'?' hidden':''}>Buscar</button></div></div>
  <p id="client-cnpj-status" class="client-cnpj-status full" aria-live="polite" hidden></p>
  <label class="f">Código do cliente<input value="${edit?E(String(edit.codigo).padStart(4,'0')):'Gerado ao salvar'}" readonly></label>
  <label class="f">Apelido / nome de contato<input name="apelido" maxlength="100" value="${E(edit?.apelido||'')}" placeholder="Como prefere identificar"></label>
  <label class="f full">Razão social<input name="razaoSocial" maxlength="150" value="${E(edit?.razaoSocial||'')}" placeholder="Nome empresarial"></label>
  <label class="f full">Nome fantasia<input name="nomeFantasia" maxlength="150" value="${E(edit?.nomeFantasia||'')}" placeholder="Nome comercial"></label>
  <label class="f">Pessoa de contato<input name="contato" maxlength="100" value="${E(edit?.contato||'')}"></label>
  <label class="f">Início da atividade<input name="inicioAtividade" type="date" value="${E(edit?.inicioAtividade||'')}"></label>
  <div class="full client-section-title"><b>Dados fiscais</b></div>
  <label class="f">Inscrição estadual<input name="inscricaoEstadual" maxlength="30" value="${E(edit?.inscricaoEstadual||'')}" placeholder="Preencha após a consulta"></label>
  <label class="f">Inscrição municipal<input name="inscricaoMunicipal" maxlength="30" value="${E(edit?.inscricaoMunicipal||'')}"></label>
  <div class="client-lookup-actions full" id="client-ie-actions"${edit?.tipoPessoa==='fisica'?' hidden':''}><div class="client-lookup-buttons"><button type="button" data-a="client-ie-auto-lookup">Buscar IE automaticamente</button><button type="button" class="secondary" data-a="client-ie-lookup">Consultar manualmente (grátis)</button></div><p class="cap">A busca automática consulta a SEFAZ por um serviço externo e pode consumir créditos da sua conta. Configure a chave da API no Supabase. A consulta manual abre o portal oficial e não usa créditos da API.</p></div>
  <div class="full client-section-title"><b>Endereço</b></div>
  <label class="f">CEP<input name="cep" maxlength="9" inputmode="numeric" value="${E(edit?.cep||'')}" placeholder="00000-000"></label>
  <label class="f full">Endereço<input name="endereco" maxlength="150" value="${E(edit?.endereco||'')}" placeholder="Rua, avenida"></label>
  <label class="f">Número<input name="numero" maxlength="20" value="${E(edit?.numero||'')}"></label>
  <label class="f">Complemento<input name="complemento" maxlength="80" value="${E(edit?.complemento||'')}"></label>
  <label class="f">Bairro<input name="bairro" maxlength="80" value="${E(edit?.bairro||'')}"></label>
  <label class="f">Cidade<input name="cidade" maxlength="100" value="${E(edit?.cidade||'')}" placeholder="Município"></label>
  <label class="f">UF<select name="uf"><option value="">Selecione</option>${['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO'].map(uf=>`<option value="${uf}"${edit?.uf===uf?' selected':''}>${uf}</option>`).join('')}</select></label>
  <label class="f">Código IBGE do município<input name="codigoIbge" maxlength="7" inputmode="numeric" value="${E(edit?.codigoIbge||'')}" placeholder="Ex.: 3106200"></label>
  <div class="client-lookup-actions full"><button type="button" data-a="client-ibge-lookup">Buscar código IBGE pela cidade e UF</button><p class="cap">O código municipal ajuda a identificar a UF para a consulta estadual.</p></div>
  <div class="full client-section-title"><b>Contato</b></div>
  <label class="f">Telefone<input name="telefone" type="tel" maxlength="25" value="${E(edit?.telefone||'')}" placeholder="(00) 00000-0000"></label>
  <label class="f">Telefone 2<input name="telefone2" type="tel" maxlength="25" value="${E(edit?.telefone2||'')}"></label>
  <label class="f">WhatsApp<input name="whatsapp" type="tel" maxlength="25" value="${E(edit?.whatsapp||'')}"></label>
  <label class="f">E-mail<input name="email" type="email" maxlength="254" value="${E(edit?.email||'')}" placeholder="cliente@empresa.com.br"></label>
  <label class="f">Responsável comercial<input name="responsavel" maxlength="100" value="${E(edit?.responsavel||'')}"></label>
  <div class="ac full"><button class="pri" type="submit">${edit?'Salvar alterações':'Cadastrar cliente'}</button>${edit?'<button type="button" data-a="client-cancel">Cancelar</button>':''}</div></form>
  <section class="pn"><h2>Clientes cadastrados · ${clientes.length}</h2>${clientes.length?`<ul class="ls">${rows}</ul>`:'<p class="cap">Ainda não há clientes. Cadastre o primeiro acima.</p>'}</section>`;
}
function vendasView(){
  const P=S.pj;ensureClientCodes(P);P.vendas=Array.isArray(P.vendas)?P.vendas:[];P.l=Array.isArray(P.l)?P.l:[];
  const fd=d=>d?d.slice(8,10)+'/'+d.slice(5,7)+'/'+d.slice(0,4):'—';
  const todayDefault=today();
  const clientes=P.clientes.slice().sort((a,b)=>a.nome.localeCompare(b.nome,'pt-BR'));
  const vendas=P.vendas.slice().sort((a,b)=>(b.data||'').localeCompare(a.data||''));
  const totalMes=vendas.filter(v=>(v.data||'').startsWith(S.mes)&&!v.cancelada).reduce((n,v)=>n+(Number(v.valor)||0),0);
  const vendaRows=vendas.map(v=>{
    const refs=Array.isArray(v.recebiveis)?v.recebiveis:[],items=refs.map(id=>P.l.find(l=>l.id===id)).filter(Boolean);
    const missing=items.length!==refs.length,recebido=items.filter(l=>l.st!=='a').reduce((n,l)=>n+l.v,0),aberto=items.filter(l=>l.st==='a').reduce((n,l)=>n+l.v,0);
    const status=v.cancelada?'Cancelada':missing?'Confira os recebimentos':aberto===0?'Recebida':recebido?'Parcialmente recebida':'A receber';
    const canCancel=!v.cancelada&&items.length===refs.length&&items.length>0&&items.every(l=>l.st==='a');
    return `<li><div><b>${E(v.clienteNome)} · ${E(v.descricao)}</b><small>Venda em ${fd(v.data)} · ${v.parcelas} parcela(s) · ${status}${v.cancelada?'':` · ${recebido?`recebido ${brl(recebido)} · `:''}em aberto ${brl(aberto)}`}</small></div><span class="v pos">${brl(v.valor)}</span>${canCancel?`<button class="gh" data-a="sale-cancel" data-id="${E(v.id)}">Cancelar</button>`:'<span></span>'}</li>`;
  }).join('');
  const clienteRows=clientes.map(c=>{const count=vendas.filter(v=>v.clienteId===c.id&&!v.cancelada).length;return `<li><div><b>${E(c.nome)}</b><small>${c.telefone?E(c.telefone):''}${c.telefone&&c.email?' · ':''}${c.email?E(c.email):''}${c.telefone||c.email?' · ':''}${count} ${count===1?'venda':'vendas'}</small></div><span></span><span></span></li>`}).join('');
  return `<section class="pn hero"><p class="cap">Vendas em ${ml(S.mes)}</p><p class="big">${brl(totalMes)}</p><p class="cap">${vendas.filter(v=>(v.data||'').startsWith(S.mes)&&!v.cancelada).length} venda(s) registrada(s) no mês · cada venda cria contas em A receber.</p></section>
  <form class="pn g" id="sale-form"><h2 class="full">Registrar venda</h2>
    <label class="f full">Cliente<input name="cliente" list="sale-clients" maxlength="100" required placeholder="Nome do cliente ou empresa"><datalist id="sale-clients">${clientes.map(c=>`<option value="${E(c.nome)}">`).join('')}</datalist></label>
    <label class="f">Telefone (opcional)<input name="telefone" type="tel" maxlength="25" placeholder="(00) 00000-0000"></label>
    <label class="f">E-mail (opcional)<input name="email" type="email" maxlength="120" placeholder="cliente@empresa.com.br"></label>
    <label class="f full">Produto ou serviço<input name="descricao" maxlength="80" required placeholder="Ex.: Consultoria financeira"></label>
    <label class="f">Tipo de receita<select name="categoria"><option value="ven">Venda de produto</option><option value="ser">Prestação de serviço</option></select></label>
    <label class="f">Valor total (R$)<input name="valor" inputmode="decimal" required placeholder="1.250,00"></label>
    <label class="f">Data da venda<input name="data" type="date" required value="${todayDefault}"></label>
    <label class="f">Vencimento da 1ª parcela<input name="vencimento" type="date" required value="${todayDefault}"></label>
    <label class="f">Parcelas mensais<input name="parcelas" type="number" min="1" max="36" value="1" required></label>
    <p class="cap full">Ao salvar, o sistema registra a venda e cria as parcelas em <b>A receber</b>, incluídas no fluxo de caixa e nos relatórios. O valor é dividido em centavos para fechar exatamente com o total.</p>
    <button class="pri full" type="submit">Salvar venda e gerar recebíveis</button>
  </form>
  <section class="pn"><h2>Histórico de vendas</h2>${vendas.length?`<ul class="ls">${vendaRows}</ul>`:'<p class="cap">Nenhuma venda registrada. Cadastre uma venda acima para iniciar o histórico.</p>'}</section>
  <section class="pn"><h2>Clientes</h2>${clientes.length?`<ul class="ls">${clienteRows}</ul>`:'<p class="cap">Os clientes aparecem aqui quando você registra a primeira venda.</p>'}</section>`;
}
function contasAvisadas(m=S.m){
  const t=today(),limite=addD(t,7);
  return (S[m].l||[]).filter(l=>l.st==='a'&&l.d<=limite)
    .map(l=>({...l,receber:isIn(cat(m,l.c)[2])}))
    .sort((a,b)=>a.d.localeCompare(b.d));
}
function avisosItens(query=AVISOS_SEARCH){
  const q=query.trim(),m=S.m;
  const candidatas=q?(S[m].l||[]).filter(l=>l.st==='a'):contasAvisadas(m);
  return candidatas.map(l=>({...l,receber:isIn(cat(m,l.c)[2])}))
    .filter(l=>!q||lancMatches(l,m,q))
    .sort((a,b)=>a.d.localeCompare(b.d));
}
function avisosLista(itens,query=AVISOS_SEARCH){
  if(!itens.length)return `<p class="cap">${query.trim()?'Nenhuma conta em aberto encontrada. Tente outra descrição, categoria, data ou valor.':'Nenhuma conta em aberto vence nos próximos 7 dias.'}</p>`;
  const t=today(),fd=d=>d.slice(8)+'/'+d.slice(5,7)+'/'+d.slice(0,4);
  return `<ul class="ls">${itens.map(l=>{
    const dias=Math.round((new Date(l.d+'T00:00:00')-new Date(t+'T00:00:00'))/864e5);
    const quando=dias<0?`<b class="neg">Atrasada há ${-dias} ${-dias===1?'dia':'dias'}</b>`:dias===0?'<b class="neg">Vence hoje</b>':`Vence em ${dias} ${dias===1?'dia':'dias'}`;
    return `<li><div><b>${E(l.desc)}</b><small>${E(cat(S.m,l.c)[1])} · ${l.receber?'A receber':'A pagar'} · ${quando} · ${fd(l.d)}</small></div><span class="v ${l.receber?'pos':''}">${brl(l.v)}</span><button class="pri sm" data-a="pay" data-id="${E(l.id)}">${l.receber?'Marcar recebido':'Marcar pago'}</button></li>`;
  }).join('')}</ul>`;
}
function refreshAvisosSearch(){
  const itens=avisosItens(),query=AVISOS_SEARCH.trim(),atrasadas=itens.filter(l=>l.d<today()).length;
  const title=document.querySelector('[data-aviso-title]'),summary=document.querySelector('[data-aviso-summary]'),results=document.querySelector('[data-aviso-results]'),help=document.querySelector('[data-aviso-help]');
  if(title)title.textContent=query?`Resultados da busca (${itens.length})`:'Contas vencidas e próximas do vencimento';
  if(summary)summary.textContent=query?`${itens.length} conta(s) em aberto encontrada(s) em todos os meses${atrasadas?`; ${atrasadas} atrasada(s)`:''}.`:itens.length?`${itens.length} conta(s) precisam de atenção${atrasadas?`; ${atrasadas} atrasada(s)`:''}.`:'Nenhuma conta em aberto vence nos próximos 7 dias.';
  if(results)results.innerHTML=avisosLista(itens,query);
  if(help)help.textContent=query?'A busca consulta contas em aberto de todos os meses.':'Pesquise contas por descrição, categoria, data ou valor.';
}
function avisosV(){
  const itens=avisosItens(),query=AVISOS_SEARCH.trim(),atrasadas=itens.filter(l=>l.d<today()).length;
  const resumo=query?`${itens.length} conta(s) em aberto encontrada(s) em todos os meses${atrasadas?`; ${atrasadas} atrasada(s)`:''}.`:itens.length?`${itens.length} conta(s) precisam de atenção${atrasadas?`; ${atrasadas} atrasada(s)`:''}.`:'Nenhuma conta em aberto vence nos próximos 7 dias.';
  return `<section class="pn ${atrasadas?'loss':''}"><p class="cap">Central de avisos</p><h2 data-aviso-title>${query?`Resultados da busca (${itens.length})`:'Contas vencidas e próximas do vencimento'}</h2><p data-aviso-summary>${resumo}</p></section>
  <section class="pn"><div class="launch-search"><label class="launch-search-control"><svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2"><circle cx="10.8" cy="10.8" r="6.8"></circle><path d="m16 16 5 5"></path></svg><input id="avisos-search" type="search" autocomplete="off" aria-label="Buscar avisos" placeholder="Buscar descrição, categoria, data ou valor..." value="${E(AVISOS_SEARCH)}"></label><p class="cap" data-aviso-help>${query?'A busca consulta contas em aberto de todos os meses.':'Pesquise contas por descrição, categoria, data ou valor.'}</p></div><div data-aviso-results>${avisosLista(itens,query)}</div></section>`;
}
let CV_MES='todos';
function contasV(){
  const m=S.m,t=today(),B=banco(m);
  const months=[...new Set((S[m].l||[]).map(l=>l.d?.slice(0,7)).filter(Boolean))].sort((a,b)=>a.localeCompare(b));
  if(CV_MES!=='todos'&&!months.includes(CV_MES))CV_MES='todos';
  const ab=S[m].l.filter(l=>l.st==='a'&&(CV_MES==='todos'||l.d.startsWith(CV_MES))).sort((x,y)=>x.d.localeCompare(y.d));
  const P=ab.filter(l=>!isIn(cat(m,l.c)[2])),R=ab.filter(l=>isIn(cat(m,l.c)[2]));
  const sm=a=>a.reduce((x,l)=>x+l.v,0);
  const chip=l=>{const n=Math.round((new Date(l.d+'T00:00')-new Date(t+'T00:00'))/864e5);return n<0?`<b class="neg">atrasada há ${-n} ${-n>1?'dias':'dia'}</b>`:n===0?'<b>vence hoje</b>':`vence em ${n} ${n>1?'dias':'dia'}`};
  const li=(l,g)=>`<li><div><b>${E(l.desc)}</b><small>${E(cat(m,l.c)[1])} · ${l.d.slice(8)}/${l.d.slice(5,7)}/${l.d.slice(0,4)} · ${chip(l)}</small></div><span class="v ${g?'pos':''}">${brl(l.v)}</span><button class="pri sm" data-a="pay" data-id="${E(l.id)}">${g?'Marcar recebido':'Marcar pago'}</button></li>`;
  const blk=(tt,A,g)=>`<section class="pn"><h2>${tt} · ${brl(sm(A))}</h2>${A.length?`<ul class="ls">${A.map(l=>li(l,g)).join('')}</ul>`:'<p class="cap">Nada em aberto. Para registrar, escolha "Em aberto" ao adicionar um lançamento.</p>'}</section>`;
  const prev=(B?B.atual:0)+sm(R)-sm(P);
  return`<section class="pn"><label class="f" style="max-width:360px">Período da consulta<select data-overview-month><option value="todos"${CV_MES==='todos'?' selected':''}>Todos os meses</option>${months.map(x=>`<option value="${x}"${CV_MES===x?' selected':''}>${E(ml(x))}</option>`).join('')}</select></label><p class="cap">${CV_MES==='todos'?'Exibindo todas as contas em aberto, de todos os meses.':`Exibindo contas em aberto com vencimento em ${E(ml(CV_MES))}.`}</p></section>
  <section class="pn hero${prev<0?' loss':''}"><p class="cap">${CV_MES==='todos'?'Saldo previsto após pagar e receber tudo':'Saldo previsto após pagar e receber em '+E(ml(CV_MES))}</p><p class="big">${brl(prev)}</p><p class="cap">${B?'Banco hoje '+brl(B.atual)+' · ':'Sem saldo bancário informado · '}a receber ${brl(sm(R))} · a pagar ${brl(sm(P))}</p></section>
  <div class="ac" style="margin-top:0"><button class="pri" data-a="novac" data-t="s">Nova conta a pagar</button><button data-a="novac" data-t="e">Nova conta a receber</button></div>
  ${blk(m==='pf'?'A pagar':'Contas a pagar',P,false)}${blk(m==='pf'?'A receber':'Contas a receber',R,true)}`;
}
function bancoV(){
  const m=S.m,bs=bancos(m),B=banco(m),t=today();
  const ed=bs.find(b=>b.id===S.be),sel=bs.find(b=>b.id===S.bx);
  const acc=l=>bs.find(b=>b.id===l.b)||bs[0];
  const fd=d=>d.slice(8)+'/'+d.slice(5,7)+'/'+d.slice(0,4);
  let ext='';
  if(B){
    let run=sel?sel.saldo:0;
    const R=S[m].l.filter(l=>{const d=l.pg||l.d;return l.st!=='a'&&d<=t&&d>=acc(l).d&&(!sel||acc(l)===sel)})
      .sort((x,y)=>(x.pg||x.d).localeCompare(y.pg||y.d)).map(l=>{
        const g=isIn(cat(m,l.c)[2]);run+=g?l.v:-l.v;
        return`<li><div><b>${E(l.desc)}</b><small>${fd(l.pg||l.d)} · ${E(cat(m,l.c)[1])}${!sel&&bs.length>1?' · '+E(acc(l).nome):''}</small></div><span class="v ${g?'pos':''}">${g?'+':'−'}${brl(l.v)}</span><span class="cap">${sel?brl(run):''}</span></li>`});
    ext=R.length?`<ul class="ls">${R.reverse().slice(0,40).join('')}</ul>`:'<p class="cap">Nenhuma movimentação desde a data do saldo inicial.</p>';
  }
  const contas=B?B.contas.map(k=>`<li><div><b>${E(k.b.nome)}</b><small>Saldo inicial ${brl(k.b.saldo)} em ${fd(k.b.d)}</small></div><span class="v">${brl(k.atual)}</span><button class="gh" data-a="eb" data-id="${k.b.id}">Editar</button></li>`).join(''):'';
  return`<section class="pn hero"><p class="cap">${bs.length>1?'Saldo somado dos bancos hoje':'Saldo no banco hoje'}</p><p class="big">${B?brl(B.atual):'—'}</p><p class="cap">${B?'Projetado com os lançamentos futuros: '+brl(B.proj):'Adicione uma conta para começar'}</p></section>
  ${B?`<section class="pn"><h2>Contas</h2><ul class="ls">${contas}</ul></section>`:''}
  <form class="pn g" id="bkf"><h2 class="full">${ed?'Editar conta':bs.length?'Adicionar outra conta':'Adicionar conta'}</h2>
    <label class="f full">Nome do banco ou conta<input name="nome" required maxlength="40" placeholder="Ex.: Nubank, Itaú PJ, Caixa" value="${ed?E(ed.nome):''}"></label>
    <label class="f">Saldo inicial (R$)<input name="s" required inputmode="decimal" placeholder="0,00" value="${ed?(ed.saldo/100).toFixed(2).replace('.',','):''}"></label>
    <label class="f">Na data<input name="d" type="date" required value="${ed?ed.d:t}"></label>
    <p class="cap full">${bs.length&&!ed&&!tem(3)?'Mais de uma conta bancária faz parte do plano Pro. ':''}Entradas a partir dessa data somam ao saldo e saídas descontam. Lançamentos de datas futuras e contas em aberto entram só na projeção.</p>
    <button class="pri full" type="submit">${ed?'Salvar alterações':'Adicionar conta'}</button>
    ${ed?`<button type="button" data-a="cb">Cancelar</button><button type="button" class="neg-b" data-a="db" data-id="${ed.id}">Excluir conta</button>`:''}
  </form>
  <section class="pn"><h2>Extrato</h2>${bs.length>1?`<div style="margin-bottom:12px"><label class="f">Conta<select id="bxs"><option value="">Todas as contas</option>${bs.map(b=>`<option value="${b.id}"${b.id===S.bx?' selected':''}>${E(b.nome)}</option>`).join('')}</select></label></div>`:''}${ext}</section>
  ${m==='pj'&&ADM?openFinanceSection():''}`;
}

function openFinanceSection(){
  const P=S.pj;P.openFinance=Array.isArray(P.openFinance)?P.openFinance:[];
  const preview=window.__ofPreview,accounts=preview?.accounts||[],accountId=window.__ofSelectedAccount||accounts[0]?.id||'',account=accounts.find(a=>a.id===accountId),transactions=(preview?.transactions||[]).filter(t=>t.accountId===accountId),banks=bancos('pj');
  const conns=P.openFinance.map(x=>`<li><div><b>${E(x.institution||'Banco conectado')}</b><small>Consulta autorizada · ${E(x.status||'conectado')}</small></div><button class="pri sm" data-a="of-sync" data-id="${E(x.id)}">Consultar movimentações</button></li>`).join('');
  const rows=transactions.map((t,i)=>{
    const dup=P.l.some(l=>l.ofTxId===t.id)||(P.l||[]).some(l=>l.d===t.date&&Math.abs(l.v)===Math.round(Math.abs(t.amount)*100)&&normMov(l.desc)===normMov(t.description));
    return `<tr><td><input type="checkbox" data-of-row="${i}" ${dup?'':'checked'} ${dup?'disabled title="Já consta nos lançamentos"':''}></td><td>${E(t.date.split('-').reverse().join('/'))}</td><td>${E(t.description)}</td><td>${Number(t.amount)<0?'Saída':'Entrada'}</td><td>${brl(Math.round(Math.abs(t.amount)*100))}</td><td>${dup?'<span class="neg">Já importada</span>':'Revisar'}</td></tr>`;
  }).join('');
  return `<section class="pn"><h2>Conectar banco · Open Finance</h2><p class="cap">A conexão abre a autorização do próprio banco. A Mesa Financeira não solicita sua senha bancária. Nesta etapa, a integração está em modo de teste; após consultar, você revisa e escolhe o que importar.</p><button class="pri" data-a="of-connect">Conectar banco de teste</button>
    ${conns?`<h3 style="margin-top:18px">Conexões</h3><ul class="ls">${conns}</ul>`:'<p class="cap">Nenhuma conta conectada ainda.</p>'}</section>
    ${preview?`<section class="pn"><h2>Movimentações consultadas</h2><div class="g"><label class="f">Conta conectada<select id="of-account">${accounts.map(a=>`<option value="${E(a.id)}"${a.id===accountId?' selected':''}>${E(a.name)}${a.balance===null?'':' · saldo '+brl(Math.round(a.balance*100))}</option>`).join('')}</select></label><label class="f">Conta no sistema<select id="of-bank">${banks.map(b=>`<option value="${E(b.id)}">${E(b.nome)}</option>`).join('')}</select></label></div><p class="cap">Importe depois de conferir. Para que o saldo bancário fique correto, a data do saldo inicial na aba Banco deve ser anterior ao período importado. Só transações confirmadas são listadas.</p>
      ${!banks.length?'<p class="neg">Cadastre primeiro a conta e o saldo inicial na aba Banco para escolher onde lançar estas movimentações.</p>':transactions.length?`<p class="cap">${transactions.length} movimentação(ões) desta conta · duplicadas ficam desmarcadas.</p><div style="overflow:auto"><table><thead><tr><th>Importar</th><th>Data</th><th>Descrição</th><th>Tipo</th><th>Valor</th><th>Status</th></tr></thead><tbody>${rows}</tbody></table></div><button class="pri" data-a="of-import" ${account?'':'disabled'}>Importar selecionadas</button>`:'<p class="cap">Não há movimentações confirmadas para importar nesta conta.</p>'}</section>`:''}`;
}

async function loadPluggyWidget(){
  if(window.PluggyConnect)return;
  await new Promise((resolve,reject)=>{const s=document.createElement('script');s.src='https://cdn.pluggy.ai/pluggy-connect/v2.7.0/pluggy-connect.js';s.onload=resolve;s.onerror=()=>reject(new Error('Não foi possível carregar a tela segura de conexão.'));document.head.appendChild(s)});
  if(!window.PluggyConnect)throw new Error('A tela de conexão não iniciou. Atualize a página e tente novamente.');
}
async function conectarOpenFinance(){
  if(!ADM){aviso('A integração bancária de teste está disponível somente para administradores.');return}
  if(S.m!=='pj'||!sb||!USER){aviso('Entre na conta e selecione o ambiente PJ para conectar um banco.');return}
  aviso('Preparando conexão segura…');
  try{
    const {data,error}=await sb.functions.invoke('pluggy-connect-token');
    if(error||!data?.accessToken)throw new Error(data?.error||error?.message||'Não foi possível preparar a conexão.');
    await loadPluggyWidget();aviso('');
    new window.PluggyConnect({connectToken:data.accessToken,includeSandbox:true,
      onSuccess:async payload=>{
        const item=payload?.item;if(!item?.id){aviso('O banco não retornou uma conexão válida.');return}
        const P=S.pj;P.openFinance=Array.isArray(P.openFinance)?P.openFinance:[];
        const saved={id:item.id,institution:item.connector?.name||item.name||'Banco conectado',status:item.status||'conectado'};
        P.openFinance=P.openFinance.filter(x=>x.id!==saved.id).concat([saved]);save();
        await consultarOpenFinance(saved.id);
      },
      onError:error=>aviso(error?.message||'Não foi possível concluir a conexão bancária.'),
    }).init();
  }catch(e){aviso(e.message||'Não foi possível iniciar a conexão bancária.')}
}
async function consultarOpenFinance(itemId){
  if(!ADM){aviso('A integração bancária de teste está disponível somente para administradores.');return}
  if(!sb||!USER){aviso('Entre na conta para consultar as movimentações.');return}
  aviso('Consultando as movimentações autorizadas…');
  try{
    const {data,error}=await sb.functions.invoke('pluggy-sync-transactions',{body:{itemId}});
    if(error||!data?.accounts)throw new Error(data?.error||error?.message||'Não foi possível consultar as movimentações.');
    window.__ofPreview=data;window.__ofSelectedAccount=data.accounts[0]?.id||'';
    const saved=(S.pj.openFinance||[]).find(x=>x.id===itemId);if(saved){saved.status=data.item.status;saved.institution=data.item.institution}
    aviso('Consulta concluída. Revise as movimentações antes de importar.');render();
  }catch(e){aviso(e.message||'Erro ao consultar movimentações.')}
}

function lancSearchNorm(value){return String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('pt-BR')}
function lancMatches(l,m,query){
 const bank=bancos(m).find(b=>b.id===l.b)?.nome||'',incoming=isIn(cat(m,l.c)[2]),status=l.st==='a'?'em aberto pendente':incoming?'recebido entrada confirmado':'pago saída confirmado';
 const date=String(dataRealLancamento(l)||'').split('-').reverse().join('/'),month=ml(String(dataRealLancamento(l)||'').slice(0,7)),dueDate=String(l.d||'').split('-').reverse().join('/'),fields=[l.desc,cat(m,l.c)[1],catGroupsFor(m).find(g=>g.id===(cat(m,l.c)[3]||cat(m,l.c)[2]))?.name,l.tipoMov,date,month,dataRealLancamento(l),dueDate,l.d,brl(l.v),String((l.v/100).toFixed(2)).replace('.',','),bank,l.fornecedor,l.refPagamento,l.obs,status];
 const haystack=lancSearchNorm(fields.filter(Boolean).join(' '));
 return lancSearchNorm(query).trim().split(/\s+/).filter(Boolean).every(term=>haystack.includes(term));
}
function lancRows(items,m,showFullDate=false){
 if(!items.length)return`<p class="cap">${showFullDate?'Nenhum lançamento encontrado. Tente outra descrição, categoria ou valor.':'Nenhum lançamento em '+ml(S.mes)+'. Use o formulário acima para adicionar o primeiro.'}</p>`;
 return`<ul class="ls">${items.map(l=>{const g=cat(m,l.c)[2],canEdit=!l.vendaId&&!l.dailySalesId&&!l.cartao,realDate=dataRealLancamento(l),date=showFullDate?realDate.split('-').reverse().join('/'):realDate.slice(8)+'/'+realDate.slice(5,7),due=l.st!=='a'&&l.pg&&l.pg!==l.d?' · Vencimento '+l.d.split('-').reverse().join('/'):'' ,liquidacao=l.st==='a'?'em aberto':l.pg?`${isIn(g)?'recebido':'pago'} em ${l.pg.split('-').reverse().join('/')}`:isIn(g)?'recebido':'pago';return`<li><div><b>${E(l.desc)}</b><small>${E(cat(m,l.c)[1])}${l.tipoMov?' · '+E(l.tipoMov):''} · ${date}${due} · ${liquidacao}${bancos(m).length>1?' · '+E((bancos(m).find(b=>b.id===l.b)||bancos(m)[0]).nome):''}${l.fornecedor?' · Fornecedor: '+E(l.fornecedor):''}${l.refPagamento?' · Ref.: '+E(l.refPagamento):''}${l.obs?' · '+E(l.obs):''} · ${l.a?`<button class="lk" data-a="ver" data-p="${E(l.a.p)}">Ver comprovante</button>`:`<button class="lk" data-a="att" data-id="${E(l.id)}">Anexar comprovante</button>`}${l.g&&l.st==='a'?` · <button class="lk" data-a="dels" data-g="${E(l.g)}">Cancelar parcelas em aberto</button>`:''}</small></div><span class="v ${isIn(g)?'pos':''}">${isIn(g)?'+':'−'}${brl(l.v)}</span>${l.st==='a'?`<button class="pri sm" data-a="pay" data-id="${E(l.id)}">${isIn(g)?'Marcar recebido':'Marcar pago'}</button>`:`<button class="gh" data-a="pay" data-id="${E(l.id)}">Editar data</button>`}${l.vendaId?'<small>venda vinculada</small>':l.dailySalesId?'<small>venda diária vinculada</small>':`${canEdit?`${l.g?`<button class="gh" data-a="edit-series" data-id="${E(l.id)}">Editar repetição</button> `:''}<button class="gh" data-a="edit" data-id="${E(l.id)}">Editar parcela</button> `:''}<button class="gh" data-a="del" data-id="${E(l.id)}" aria-label="Excluir ${E(l.desc)}">Excluir</button>`}</li>`}).join('')}</ul>`;
}
function refreshLaunchSearch(){
  const m=S.m,query=LANC_SEARCH.trim(),filter=DASH_LANC_FILTER,base=filter?S[m].l.filter(l=>dataRealLancamento(l).startsWith(filter.month)&&filter.categories.includes(l.c)):S[m].l.filter(l=>dataRealLancamento(l).startsWith(S.mes)),items=(query?base.filter(l=>lancMatches(l,m,query)):base).sort((a,b)=>dataRealLancamento(b).localeCompare(dataRealLancamento(a)));
  const results=document.querySelector('[data-launch-results]'),title=document.querySelector('[data-launch-title]');if(results)results.innerHTML=lancRows(items,m,!!query||!!filter);if(title)title.textContent=filter?`${filter.label} · ${ml(filter.month)} (${items.length})`:query?`Resultados da busca (${items.length})`:`Lançamentos de ${ml(S.mes)}`;const total=document.querySelector('[data-launch-filter-total]');if(total)total.textContent=brl(items.reduce((sum,l)=>sum+(Number(l.v)||0),0));
}
function lanc(){
  const m=S.m,C=CFG[m],bs=bancos(m);
  const editing=LE?.m===m?S[m].l.find(l=>l.id===LE.id):null;
  const editingSeries=!!(editing&&LE?.series&&editing.g&&!editing.vendaId&&!editing.cartao&&!editing.dailySalesId);
  const seriesOpen=editingSeries?S[m].l.filter(l=>l.g===editing.g&&l.st==='a'):[];
  const seriesAll=editingSeries?S[m].l.filter(l=>l.g===editing.g):[];
  const editDesc=editing?editing.desc.replace(/\s+\(\d+\/\d+\)$/,''):'';
  const clientExtra=m==='pj'&&USER_MODULES.vendas_diarias===true;
  const dirReceber=editing?isIn(cat(m,editing.c)[2]):S.pre?.t==='e';
  let done=false;const opts=catGroupsFor(m).map(g=>{const items=catsInGroup(m,g),direction=isIn(g.base)?'receber':'pagar';return items.length?`<optgroup label="${E(g.name)}" data-direction="${direction}"${(direction==='receber')!==dirReceber?' hidden':''}>${items.map(c=>{const sl=editing?editing.c===c[0]:!done&&(direction==='receber')===dirReceber;if(sl)done=true;return`<option value="${E(c[0])}"${sl?' selected':''}>${E(c[1])}</option>`}).join('')}</optgroup>`:''}).join('');
  const L=S[m].l.filter(l=>dataRealLancamento(l).startsWith(S.mes)).sort((x,y)=>dataRealLancamento(y).localeCompare(dataRealLancamento(x)));
  const query=LANC_SEARCH.trim(),filter=DASH_LANC_FILTER,base=filter?S[m].l.filter(l=>dataRealLancamento(l).startsWith(filter.month)&&filter.categories.includes(l.c)):L,matches=(query?base.filter(l=>lancMatches(l,m,query)):base).sort((x,y)=>dataRealLancamento(y).localeCompare(dataRealLancamento(x)));
  const dflt=S.mes===ym(new Date())?today():S.mes+'-01';
  const rows=lancRows(matches,m,!!query||!!filter);
   const filterSummary=filter?`<section class="pn dash-filter-summary" data-launch-filter><div><h2>${E(filter.label)} · ${ml(filter.month)}</h2><p class="cap">${matches.length} lançamento(s) · total exibido <b data-launch-filter-total>${brl(matches.reduce((sum,l)=>sum+(Number(l.v)||0),0))}</b>. Você pode editar ou excluir cada item abaixo.</p></div><button type="button" data-a="dash-filter-clear">Ver todos os lançamentos</button></section>`:'';
  return mon()+`
  <form class="pn g" id="fm">
    ${editing?'<p class="cap full">Editando lançamento. O comprovante anexado será mantido.</p>':''}${editing?.g?`<p class="cap full">${editingSeries?`Descrição, valor e data serão ajustados nas ${seriesOpen.length} parcelas em aberto. A categoria será atualizada nas ${seriesAll.length} parcelas da repetição, inclusive nas já pagas.`:'Este lançamento faz parte de uma repetição. A edição altera somente esta parcela; para atualizar a categoria de todas, use “Editar repetição”.'}</p>`:''}
    <label class="f full">Descrição<input name="desc" required maxlength="80" value="${editing?E(editDesc):''}" placeholder="${m==='pf'?'Ex.: Mercado da semana':'Ex.: Venda para cliente'}"></label>
    <label class="f">${editingSeries?'Valor por parcela / ocorrência (R$)':'Valor (R$)'}<input name="v" required inputmode="decimal" value="${editing?(editing.v/100).toFixed(2).replace('.',','):''}" placeholder="1.250,00"></label>
    <label class="f">${editingSeries?'Vencimento da parcela selecionada':'Data (vencimento, se em aberto)'}<input name="d" type="date" required value="${editing?editing.d:dflt}"></label>
    <label class="f">Tipo de conta<select name="direction" data-direction-select><option value="pagar"${dirReceber?'':' selected'}>A pagar</option><option value="receber"${dirReceber?' selected':''}>A receber</option></select></label>
    <label class="f">Categoria<select name="c">${opts}</select></label>
    <label class="f full">Tipo de movimentação<select name="movtype"><option value="">Não especificado</option>${(S[m].types||[]).map(t=>`<option value="${E(t)}"${editing?.tipoMov===t?' selected':''}>${E(t)}</option>`).join('')}</select></label>
    ${clientExtra?`<label class="f">Fornecedor (opcional)<input name="fornecedor" maxlength="100" value="${editing?E(editing.fornecedor||''):''}"></label><label class="f">Nº cheque / boleto (opcional)<input name="refPagamento" maxlength="60" value="${editing?E(editing.refPagamento||''):''}"></label><label class="f full">Observações (opcional)<input name="obs" maxlength="180" value="${editing?E(editing.obs||''):''}"></label>`:''}
    ${bs.length>1?`<label class="f full">Conta bancária<select name="conta">${bs.map(b=>`<option value="${b.id}"${(editing?editing.b===b.id:b.id===bs[0]?.id)?' selected':''}>${E(b.nome)}</option>`).join('')}</select></label>`:''}
    ${editingSeries?'<p class="cap full">A data das próximas parcelas será recalculada mês a mês a partir desta parcela.</p>':`<label class="f full">Situação<select name="st"><option value="p"${editing?editing.st!=='a'?' selected':'': ''}>Já foi pago ou recebido</option><option value="a"${editing?editing.st==='a'?' selected':'':S.pre?' selected':''}>Em aberto (a pagar ou a receber)</option></select></label>`}
    ${editing&&!editing.g&&!editingSeries?'<label class="f full">Recorrência desta conta<select name="editRep"><option value="u">Não repetir</option><option value="r">Repetir o mesmo valor todo mês</option></select></label><label class="f">Número de meses<input name="editMonths" type="number" min="2" max="120" value="12" disabled></label><p class="cap full">A quantidade inclui esta conta. As próximas serão criadas em aberto, mês a mês. A situação e a data de pagamento desta conta serão preservadas.</p>':''}
    ${editing?`<button class="pri full" type="submit">${editingSeries?'Atualizar repetição':'Salvar alterações'}</button> <button class="full" type="button" data-a="edit-cancel">Cancelar edição</button>`:`
    <label class="f full">Lembrete por SMS (opcional)<select name="smslembrete"><option value="">Sem lembrete</option><option value="same">No dia do vencimento, às 9h</option><option value="before">Um dia antes, às 9h</option></select></label>
    <label class="f full">Celular para receber o SMS<input name="smsphone" type="tel" inputmode="tel" placeholder="+55 11 91234-5678" autocomplete="tel" aria-describedby="sms-help"></label>
    <p class="cap full" id="sms-help">Use o formato internacional, com +55 e DDD. O aviso será genérico e não mostrará o valor nem a descrição da conta. Disponível para contas em aberto.</p>
    <label class="f full"><span><input name="smsconsent" type="checkbox"> Confirmo que este número autorizou o recebimento de lembretes por SMS.</span></label>
    <label class="f">Repetição<select name="rep"><option value="u">Lançamento único</option><option value="r">Repetir o mesmo valor todo mês</option>${tem(2)?'<option value="d">Parcelar: dividir o valor total</option>':''}</select></label>
    <label class="f">Número de meses<input name="n" type="number" min="2" max="120" inputmode="numeric" placeholder="Ex.: 5" disabled></label>
    <p class="cap full">${tem(2)?'':'Parcelar em partes iguais faz parte do plano Gestão. '}Repetir lança o mesmo valor em cada mês, ideal para empréstimo com parcela fixa, aluguel ou assinatura. A primeira segue a situação escolhida e as demais ficam em aberto, nos meses seguintes.</p>
    ${tem(2)?'<label class="f full">Comprovante (opcional)<input name="arq" type="file" accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,.png,.jpg,.jpeg"></label>':''}
    <button class="pri full" type="submit">Adicionar lançamento</button>`}
    <p class="neg full" id="er" role="alert" hidden>Digite um valor maior que zero, por exemplo 1.250,00.</p>
  </form>
   ${filterSummary}<section class="pn"><h2 data-launch-title>${filter?`${E(filter.label)} · ${ml(filter.month)} (${matches.length})`:query?'Resultados da busca ('+matches.length+')':'Lançamentos de '+ml(S.mes)}</h2><div class="launch-search"><label class="launch-search-control"><svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2"><circle cx="10.8" cy="10.8" r="6.8"></circle><path d="m16 16 5 5"></path></svg><input id="launch-search" type="search" autocomplete="off" aria-label="Buscar lançamentos em todos os meses" placeholder="${filter?'Filtrar por descrição, data ou valor...':'Buscar descrição, categoria, valor...'}" value="${E(LANC_SEARCH)}"></label><p class="cap">${filter?'A busca filtra os lançamentos deste grupo e mês.':'A busca consulta lançamentos de todos os meses.'}</p></div><div data-launch-results>${rows}</div></section>`;
}

function demo(){
  const m=S.m,P={
    pf:[['sal',6800,5],['ext',600,20],['mor',1800,10],['mer',1250,12],['mer',480,22],['tra',520,15],['sau',260,18],['con',390,8],['laz',540,25],['res',720,19],['cpr',610,14],['ass',130,6],['inv',600,6]],
    pj:[['ven',41000,28],['ser',9500,15],['imp',4500,20],['cmv',17000,5],['fre',2100,8],['fol',10200,5],['alu',3200,10],['mkt',3100,12],['sis',650,6],['ter',900,10],['pro',7000,28]]
  }[m];
  [-2,-1,0].forEach(i=>P.forEach((x,k)=>{
    const f=['sal','ven','ser','alu','fol'].includes(x[0])?1:1+(((k+i*3)%5+5)%5-2)*.04;
    S[m].l.push({id:uid(),c:x[0],desc:cat(m,x[0])[1],v:Math.round(x[1]*f)*100,d:sh(S.mes,i)+'-'+p2(x[2]),b:k%4===3?'b2':'b1'});
  }));
  ({pf:[['con',320,3,'Conta de luz'],['mor',1800,-2,'Aluguel'],['ext',500,5,'Freela a receber']],
    pj:[['alu',3200,2,'Aluguel da loja'],['fol',10200,-1,'Folha de pagamento'],['ven',8500,-3,'Cliente Alfa'],['ser',4200,6,'Cliente Beta']]}[m]).forEach(x=>
    S[m].l.push({id:uid(),c:x[0],desc:x[3],v:x[1]*100,d:addD(today(),x[2]),st:'a'}));
  if(!bancos(m).length){const d0=sh(S.mes,-2)+'-01';
    S[m].bks=m==='pf'?[{id:'b1',nome:'Conta corrente',saldo:850000,d:d0},{id:'b2',nome:'Poupança',saldo:1200000,d:d0}]
                      :[{id:'b1',nome:'Banco principal',saldo:2000000,d:d0},{id:'b2',nome:'Conta digital',saldo:600000,d:d0}]}
  if(m==='pf'&&!cards().length){const c={id:'k1',nome:'Cartão principal',limite:600000,fecha:25,vence:5},b=today();S.pf.cards=[c];
    [['Notebook',3600,10,'cpr',-90],['Tênis de corrida',480,3,'cpr',-35],['Presente de casamento',350,2,'laz',-6]].forEach(x=>{const dt=addD(b,x[4]),g=x[2]>1?uid():undefined;
      planCompra(c,dt,x[1]*100,x[2]).forEach(p=>S.pf.l.push({id:uid(),desc:x[2]>1?x[0]+' ('+p.n+'/'+x[2]+')':x[0],v:p.v,c:x[3],tipoMov:'',d:p.venc,st:p.venc<=b?'p':'a',pg:p.venc<=b?p.venc:undefined,g,cartao:c.id,compra:dt}))});
    S.pf.rsv={meses:6,atual:980000,aporte:60000,atualEm:b}}
}

/* ---------- planos e módulos ---------- */
const PLANOS={
 ess:{n:'Essencial',c:'Essencial',p:'R$ 19,90/mês',f:['Painel com resumo e recomendações','Lançamentos únicos, pagos ou em aberto','Uma conta bancária com saldo e extrato','Categorias e histórico por mês','Regra 50/30/20 com metas, leitura do mês e explicações (pessoa física)']},
 bpo:{n:'Gestão',c:'Gestão',p:'R$ 59,90/mês nos 3 primeiros meses; depois R$ 79,90/mês',f:['Tudo do Essencial','Contas a pagar e a receber com alertas de vencimento','Parcelamento e lançamentos recorrentes','Comprovantes anexados aos lançamentos','Fluxo de caixa projetado por mês','Calculadora de preço de venda (pessoa jurídica) e botão com os dados do mês','Cartões e parcelas, faturas e reserva de emergência (pessoa física)','Cadastro de clientes PJ com código sequencial']},
 pro:{n:'Pro',c:'Pro',p:'R$ 99,90/mês nos 3 primeiros meses; depois R$ 129,90/mês',f:['Tudo do Gestão','DRE gerencial por mês','Orçamento previsto x realizado e metas','Cenários de projeção de caixa','Várias contas bancárias consolidadas','Exportação dos lançamentos em CSV','Precificação completa: preço mínimo, margem real, lista de produtos e explicações']}
};
const NIV={ess:1,bpo:2,pro:3},NOME=['','ess','bpo','pro'],LK={2:'Gestão',3:'Pro'};
let PL='ess';
const tem=n=>NIV[PL]>=n;
const TABS=[['p','Painel',1],['nt','Avisos',1],['l','Lançamentos',1],['cr','A receber',2],['sales','Vendas',2],['clients','Clientes',2],['vd','Vendas diárias',1],['cp','A pagar',2],['c','Visão geral',2],['b','Banco',1],['imp','Importar extrato',2],['f','Fluxo',2],['b5','Regra 50/30/20',1],['cc','Cartões',2],['rv','Reserva',2],['o','Orçamento',3],['r','DRE',3],['pre','Precificação',2],['aj','Ajustes',1],['cad','Cadastro PF/PJ',1],['wa','WhatsApp',1],['lg','Privacidade e LGPD',1],['u','Meu plano',1],['a','Admin',1]];
const MOD_LABELS={p:'Painel',nt:'Avisos',l:'Lançamentos',cr:'Contas a receber',sales:'Vendas',clients:'Clientes',cp:'Contas a pagar',c:'Visão geral',b:'Banco',imp:'Importar extrato',f:'Fluxo de caixa',b5:'Regra 50/30/20',cc:'Cartões',rv:'Reserva',o:'Orçamento',r:'DRE',pre:'Precificação',aj:'Ajustes',wa:'WhatsApp',lg:'Privacidade e LGPD'};
let PM={},PMError='';
const PMTimers={},PMQueues={},PMRev={};
const modOn=(plan,id)=>PM[plan]&&Object.prototype.hasOwnProperty.call(PM[plan],id)?PM[plan][id]===true:NIV[plan]>=(TABS.find(t=>t[0]===id)?.[2]||99);
function garantirModulos(plan){PM[plan]=PM[plan]||{};Object.keys(MOD_LABELS).forEach(id=>{if(!Object.prototype.hasOwnProperty.call(PM[plan],id))PM[plan][id]=NIV[plan]>=(TABS.find(t=>t[0]===id)?.[2]||99)})}
async function carregarModulos(){if(!sb)return;const r=await sb.from('config_modulos_plano').select('plano,modulos');if(r.error){PMError=r.error.message;return}PMError='';PM={};(r.data||[]).forEach(x=>{PM[x.plano]=x.modulos||{}})}
async function carregarModulosUsuario(user){USER_MODULES={};USER_MODULE_ERROR='';if(!sb||!user)return;const r=await sb.from('modulos_usuario').select('modulos').eq('user_id',user.id).maybeSingle();if(r.error){USER_MODULE_ERROR=r.error.message;return}USER_MODULES=r.data?.modulos||{}}
const ambienteLiberado=m=>ADM||USER_MODULES?.ambientes?.[m]===true;
async function salvarModulos(plan){if(PMError){aviso('A tabela de módulos não foi carregada. Execute supabase-plan-modules.sql no Supabase e tente novamente.');return false}const rev=PMRev[plan]||0,snapshot=JSON.parse(JSON.stringify(PM[plan]||{}));const r=await sb.from('config_modulos_plano').upsert({plano:plan,modulos:snapshot,atualizado_em:new Date().toISOString()},{onConflict:'plano'});if(r.error){aviso('Não foi possível salvar os módulos. Confira se executou supabase-plan-modules.sql no Supabase. Detalhe: '+r.error.message);return false}const check=await sb.from('config_modulos_plano').select('plano,modulos').eq('plano',plan).maybeSingle();if(check.error||!check.data){aviso('O Supabase não confirmou a configuração. Verifique as permissões da tabela config_modulos_plano.');return false}if((PMRev[plan]||0)===rev)PM[plan]=check.data.modulos||{};PMError='';return true}
function salvarFilaModulos(plan){PMQueues[plan]=(PMQueues[plan]||Promise.resolve()).then(()=>salvarModulos(plan));return PMQueues[plan]}
function statusModulos(plan,texto){const el=document.querySelector(`[data-module-status="${plan}"]`);if(el)el.textContent=texto}
const vr=c=>c?(c/100).toFixed(2).replace('.',','):'';
const bloqueio=t=>{const k=NOME[t[2]];return`<section class="pn em"><h2>${t[1]} faz parte do plano ${PLANOS[k].n}</h2><p>Seu plano atual é ${PLANOS[PL].n}. ${PLANOS[k].p}.</p><div class="ac"><button class="pri" data-v="u">Ver planos</button></div></section>`};
const planoV=()=>`<section class="pn hero"><p class="cap">Seu plano</p><p class="big" style="font-size:30px">${PLANOS[PL].n}</p><p class="cap">${PLANOS[PL].p}</p></section>`
 +['ess','bpo','pro'].map(k=>`<section class="pn"><h2>${PLANOS[k].n}${k===PL?' · seu plano':''}</h2><p class="cap">${PLANOS[k].p}</p><ul class="ins" style="margin-top:12px">${PLANOS[k].f.map(x=>`<li class="${NIV[k]<=NIV[PL]?'ok':''}">${x}</li>`).join('')}</ul></section>`).join('')
 +'<section class="pn"><p class="cap">Para trocar de plano, fale com o suporte. A liberação é feita na sua conta pelo administrador.</p></section>';

/* ---------- precificação (pessoa jurídica) ---------- */
const pn=s=>{s=String(s==null?'':s).trim();if(s.includes(','))s=s.replace(/\./g,'').replace(',','.');const n=parseFloat(s);return isFinite(n)?n:0};
const pf1=n=>String(Math.round(n*10)/10).replace('.',',');
const pct1=x=>pf1(x*100)+'%';
const PRC0={imp:0,com:0,tax:0,fix:0,mrg:10};
const prPar=()=>Object.assign({},PRC0,S.pj.prc||{});
function precCard(it,par,full,calc){
  const dir=it.custo+it.frete,v=(par.imp+par.com+par.tax)/100,f=par.fix/100,l=par.mrg/100,den=1-(v+f+l),id=calc?'calc':it.id;
  let h='<section class="pn g"><h2 class="full">'+(calc?'Calculadora de preço':E(it.nome||'Produto'))+'</h2>'+
   '<label class="f">Custo do produto (R$)<input data-pi="'+id+':custo" inputmode="decimal" placeholder="0,00" value="'+vr(it.custo)+'"></label>'+
   '<label class="f">Frete e embalagem por unidade (R$)<input data-pi="'+id+':frete" inputmode="decimal" placeholder="0,00" value="'+vr(it.frete)+'"></label>'+
   (full?'<label class="f full">Preço que você pratica hoje (R$, opcional)<input data-pi="'+id+':preco" inputmode="decimal" placeholder="0,00" value="'+vr(it.preco)+'"></label>':'');
  if(dir<=0){return h+'<p class="cap full">Informe o custo para calcular o preço.</p></section>'}
  if(den<=0){return h+'<ul class="ins full"><li class="bad">A soma dos percentuais (impostos, comissão, taxa, despesas fixas e lucro) chegou a '+pf1(par.imp+par.com+par.tax+par.fix+par.mrg)+'%. Ela precisa ficar abaixo de 100% para existir um preço. Reduza o lucro desejado ou revise as despesas.</li></ul></section>'}
  const P=Math.round(dir/den),rows=[['Preço de venda',P,1],['(−) Custo e frete',-dir],['(−) Impostos',-Math.round(P*par.imp/100)],['(−) Comissão',-Math.round(P*par.com/100)],['(−) Taxa de cartão ou marketplace',-Math.round(P*par.tax/100)],['(−) Despesas fixas rateadas',-Math.round(P*par.fix/100)]];
  const luc=rows.reduce((s,r)=>s+r[1],0);rows.push(['= Lucro por unidade',luc,1]);
  const mc=P-dir-Math.round(P*(v)),mk=P/dir-1;
  h+='<div class="full"><p class="cap">Preço de venda sugerido</p><p class="big">'+brl(P)+'</p><p class="cap">Markup de '+pct1(mk)+' sobre o custo · margem de contribuição de '+pct1(mc/P)+' · lucro de '+brl(luc)+' por unidade ('+pct1(luc/P)+' do preço)</p></div>'+
   '<ul class="ls full">'+rows.map(r=>'<li><span>'+(r[2]?'<b>'+r[0]+'</b>':r[0])+'</span><span class="v '+(r[1]<0?'neg':'')+'">'+brl(r[1])+'</span><span class="cap">'+pct1(r[1]/P)+'</span></li>').join('')+'</ul>';
  if(full){
    const pm=1-(v+f)>0?Math.round(dir/(1-(v+f))):0,pp=1-v>0?Math.round(dir/(1-v)):0;
    h+='<ul class="ls full"><li><div><b>Preço mínimo</b><small>Cobre custo, impostos e despesas fixas, com lucro zero</small></div><span class="v">'+brl(pm)+'</span></li>'+
       '<li><div><b>Preço de piso</b><small>Cobre só o que varia com a venda. Abaixo disso, cada venda dá prejuízo</small></div><span class="v">'+brl(pp)+'</span></li></ul>';
    if(it.preco>0){
      const P2=it.preco,luc2=P2-dir-Math.round(P2*(v+f)),mg=luc2/P2,mk2=P2/dir-1,mc2=(P2-dir-Math.round(P2*v))/P2;
      const st=P2<pp?['bad','Abaixo do piso: cada venda dá prejuízo, mesmo sem contar as despesas fixas.']:P2<pm?['bad','Cobre os custos que variam, mas não paga as despesas fixas rateadas. A empresa perde dinheiro com esse produto.']:P2<P?['','Dá lucro, mas abaixo dos '+pf1(par.mrg)+'% desejados. Faltam '+brl(P-P2)+' no preço, ou reduza custos.']:['ok','Atinge o lucro desejado.'];
      h+='<div class="full"><p class="cap">Com o preço de '+brl(P2)+'</p><p class="big" style="font-size:26px">Margem líquida '+pct1(mg)+'</p><p class="cap">Lucro de '+brl(luc2)+' por unidade · markup real de '+pct1(mk2)+' · margem de contribuição de '+pct1(mc2)+'</p><ul class="ins"><li class="'+st[0]+'">'+st[1]+'</li></ul></div>';
    }
    h+='<div class="ac full"><button data-a="prdel" data-id="'+id+'">Remover produto</button></div>';
  }
  return h+'</section>';
}
function precV(){
  const X=S.pj,par=prPar(),full=tem(3);
  const campos=[['imp','Impostos sobre a venda (%)'],['com','Comissão de vendas (%)'],['tax','Taxa de cartão ou marketplace (%)'],['fix','Despesas fixas, % do faturamento'],['mrg','Lucro desejado (% do preço)']];
  const soma=par.imp+par.com+par.tax+par.fix+par.mrg;
  let h='<section class="pn g"><h2 class="full">Premissas, em % do preço de venda</h2>'+campos.map(c=>'<label class="f">'+c[1]+'<input data-pp="'+c[0]+'" inputmode="decimal" placeholder="0" value="'+(par[c[0]]?pf1(par[c[0]]):'')+'"></label>').join('')+
   '<div class="ac full"><button data-a="prdados">Usar meus dados de '+ml(S.mes)+'</button></div>'+
   '<p class="cap full">Soma dos percentuais: '+pf1(soma)+'%. O botão preenche impostos e despesas fixas dividindo o que foi lançado no mês pela receita do mês. Comissão, taxa e lucro desejado você informa.</p></section>';
  if(!full){
    h+=precCard(X.calc||{custo:0,frete:0},par,false,true)+
     '<section class="pn em"><h2>Mais no plano Pro</h2><p>Preço mínimo e preço de piso, margem real do preço que você pratica, lista de produtos salva e explicações de markup e margem.</p><div class="ac"><button class="pri" data-v="u">Ver planos</button></div></section>';
    return h;
  }
  const L=X.prod||[];
  h+='<form class="pn g" id="prf"><h2 class="full">Adicionar produto</h2><label class="f full">Produto<input name="n" required maxlength="60" placeholder="Ex.: Mandioca descascada 1 kg"></label><label class="f">Custo (R$)<input name="c" inputmode="decimal" placeholder="0,00"></label><label class="f">Frete e embalagem (R$)<input name="fr" inputmode="decimal" placeholder="0,00"></label><div class="ac full"><button class="pri" type="submit">Adicionar</button></div></form>';
  h+=L.length?L.map(it=>precCard(it,par,true,false)).join(''):'<section class="pn em"><p>Adicione seus produtos para comparar preços e margens lado a lado.</p></section>';
  const ex=L.find(x=>x.custo+x.frete>0),den=1-soma/100;
  const num=ex&&den>0?'Com os seus números, para '+E(ex.nome)+': ('+brl(ex.custo)+' + '+brl(ex.frete)+') ÷ (1 − '+pct1(soma/100)+') = '+brl(Math.round((ex.custo+ex.frete)/den))+'.':'Informe o custo de um produto e as premissas para ver o cálculo com os seus números.';
  const dt=(t,b)=>'<details class="pn"><summary><b>'+t+'</b></summary><div style="margin-top:8px;display:flex;flex-direction:column;gap:8px">'+b+'</div></details>';
  h+='<section class="pn"><h2>Entenda</h2></section>'+
   dt('Markup e margem não são a mesma coisa','<p>O <b>markup</b> diz quanto você soma ao custo: (preço − custo) ÷ custo. A <b>margem</b> diz quanto do preço sobra: (preço − custo) ÷ preço.</p><p>Exemplo: custo de R$ 60 e preço de R$ 120 dão markup de 100% e margem de 50%. O erro mais comum é somar 50% ao custo e achar que a margem é 50%: ela é 33,3%.</p>')+
   dt('Como foi calculado','<p>Todos os percentuais (impostos, comissão, taxa, despesas fixas e lucro) incidem sobre o <b>preço de venda</b>, por isso o preço sai da divisão e não da multiplicação:</p><p><b>Preço = (custo + frete) ÷ (1 − soma dos percentuais)</b></p><p>'+num+'</p><p><b>Margem de contribuição</b> = preço − custo − impostos, comissão e taxa: o que sobra de cada venda para pagar as despesas fixas e dar lucro.</p>')+
   dt('Preço mínimo e preço de piso','<p>O <b>preço mínimo</b> deixa o lucro em zero depois de pagar custo, impostos, comissão, taxa e a parte das despesas fixas. É o menor preço para o negócio não perder dinheiro de forma contínua.</p><p>O <b>preço de piso</b> considera só os custos que variam com a venda. Vender entre o piso e o mínimo pode servir numa liquidação pontual, mas não paga as despesas fixas se virar rotina.</p>')+
   dt('Cuidados com os percentuais','<p><b>Impostos:</b> dependem do regime (Simples Nacional, presumido), da faixa de faturamento e do produto (substituição tributária, produto monofásico etc.). Use o percentual efetivo que o seu contador informa; o botão do mês usa os impostos lançados dividido pela receita, que é uma aproximação.</p><p><b>Despesas fixas:</b> o percentual muda se o faturamento mudar. Em meses fracos ele sobe e o preço sugerido também.</p><p><b>Lucro desejado:</b> deve cobrir as retiradas dos sócios (pró-labore e lucro), que não entram no percentual de despesas fixas do botão.</p>');
  return h;
}

/* ---------- pessoa física: 50/30/20, cartões, reserva ---------- */
const sumv=a=>a.reduce((x,l)=>x+l.v,0);
const dtl=(t,b)=>'<details class="pn"><summary><b>'+t+'</b></summary><div style="margin-top:8px;display:flex;flex-direction:column;gap:8px">'+b+'</div></details>';
const catOpts=(m,sel)=>catGroupsFor(m).filter(g=>!isIn(g.base)).map(g=>{const items=catsInGroup(m,g);return items.length?'<optgroup label="'+E(g.name)+'">'+items.map(c=>'<option value="'+E(c[0])+'"'+(c[0]===sel?' selected':'')+'>'+E(c[1])+'</option>').join('')+'</optgroup>':''}).join('');
const clampDia=(mes,dia)=>mes+'-'+p2(Math.min(dia,new Date(+mes.slice(0,4),+mes.slice(5,7),0).getDate()));
const M5=()=>Object.assign({n:50,d:30,f:20},S.pf.m5||{});
const BKN={n:'Necessidades',d:'Desejos',f:'Futuro'},BKG={n:'nec',d:'des',f:'fut'},BKC={n:'c1',d:'c2',f:'c4'};

function b5V(){
  const m='pf',a=agg(m,S.mes),mt=M5(),r=a.ren,v={n:a.nec,d:a.des,f:a.fut},gasto=v.n+v.d+v.f,sobra=r-gasto,soma=mt.n+mt.d+mt.f;
  let h=mon();
  h+='<section class="pn hero"><p class="cap">Renda de '+ml(S.mes)+'</p><p class="big">'+brl(r)+'</p><p class="cap">'+(r?'Gastos e destinos lançados: '+brl(gasto)+' · '+(sobra>=0?'sem destino ainda: '+brl(sobra):'gasto acima da renda: '+brl(-sobra)):'Lance suas entradas do mês para o cálculo funcionar')+'</p></section>';
  if(r>0){
    h+='<section class="pn"><h2>Meta '+mt.n+'/'+mt.d+'/'+mt.f+'</h2>'+['n','d','f'].map(b=>{
      const p=v[b]/r*100,alvo=Math.round(r*mt[b]/100),ok=b==='f'?p>=mt[b]:p<=mt[b];
      const st=b==='f'?(ok?'meta atingida':'faltam '+brl(Math.max(0,alvo-v[b]))+' para a meta'):(ok?'dentro da meta, sobram '+brl(alvo-v[b]):'acima da meta em '+brl(v[b]-alvo));
      return '<div style="margin-top:14px"><b>'+BKN[b]+'</b> · '+brl(v[b])+' ('+pf1(p)+'% da renda) · meta '+mt[b]+'% = '+brl(alvo)+'<div class="bar" style="height:10px"><i style="flex:'+Math.min(v[b],alvo)+';background:var(--'+(ok?'in':(b==='f'?'c2':'out'))+')"></i><i style="flex:'+Math.max(alvo-v[b],0)+';background:var(--c5)"></i></div><p class="cap">'+st+'</p></div>';
    }).join('')+'</section>';
    const ins=[];
    if(v.n/r*100>mt.n)ins.push(['bad','As necessidades consomem '+pf1(v.n/r*100)+'% da renda, '+brl(v.n-Math.round(r*mt.n/100))+' acima da meta. Os maiores itens costumam ser moradia, transporte e dívidas: renegociar contratos ou trocar de plano tem efeito mais duradouro do que cortar pequenos gastos.']);
    if(v.d/r*100>mt.d)ins.push(['bad','Os desejos estão '+pf1(v.d/r*100-mt.d)+' pontos acima da meta. Escolha 1 ou 2 itens da lista abaixo para reduzir, em vez de cortar tudo.']);
    if(v.f/r*100<mt.f)ins.push(['','Para chegar a '+mt.f+'% no futuro, faltam '+brl(Math.max(0,Math.round(r*mt.f/100)-v.f))+'. Uma forma prática é programar a transferência no dia em que o salário cai, antes de gastar.']);
    if(sobra<0)ins.push(['bad','Você lançou mais gastos do que renda neste mês. Se não é erro de lançamento, a diferença está saindo do saldo ou virando dívida.']);
    if(sobra>r*0.05)ins.push(['','Ainda há '+brl(sobra)+' sem destino. Dinheiro sem destino costuma virar gasto pequeno e esquecido: destine para a reserva, uma dívida ou um objetivo.']);
    if(!ins.length)ins.push(['ok','Tudo dentro das metas neste mês. Mantenha o hábito e revise as metas quando a renda ou a rotina mudar.']);
    h+='<section class="pn"><h2>Leitura do mês</h2><ul class="ins">'+ins.map(x=>'<li class="'+x[0]+'">'+x[1]+'</li>').join('')+'</ul></section>';
    h+='<section class="pn"><h2>Onde foi o dinheiro</h2>'+['n','d','f'].map(b=>{
      const ks=Object.entries(a.bc).filter(x=>cat(m,x[0])[2]===BKG[b]).sort((x,y)=>y[1]-x[1]);
      return '<details><summary><b>'+BKN[b]+'</b> · '+brl(v[b])+'</summary>'+(ks.length?'<ul class="ls">'+ks.map(x=>'<li><span>'+E(cat(m,x[0])[1])+'</span><span class="v">'+brl(x[1])+'</span></li>').join('')+'</ul>':'<p class="cap">Nada lançado neste grupo.</p>')+'</details>';
    }).join('')+'</section>';
  }else h+='<section class="pn em"><p>Sem entradas em '+ml(S.mes)+'. Lance seu salário e outras entradas na aba Lançamentos para ver o orçamento.</p><div class="ac"><button class="pri" data-a="go">Adicionar lançamento</button></div></section>';
  h+='<section class="pn g"><h2 class="full">Metas (%)</h2>'+['n','d','f'].map(b=>'<label class="f">'+BKN[b]+'<input data-m5="'+b+'" inputmode="numeric" value="'+mt[b]+'"></label>').join('')+
   '<p class="cap full">'+(soma===100?'Os três percentuais somam 100.':'Atenção: os percentuais somam '+soma+'. Ajuste para 100.')+'</p><div class="ac full"><button data-a="m5r">Voltar para 50/30/20</button></div></section>';
  h+='<section class="pn"><h2>Entenda</h2></section>'+
   dtl('O que é a regra 50/30/20','<p>É uma referência simples para organizar a renda líquida (o que de fato cai na conta, depois de descontos e impostos): até <b>50%</b> para necessidades, até <b>30%</b> para desejos e pelo menos <b>20%</b> para o futuro. Foi popularizada pela professora e senadora norte-americana Elizabeth Warren no livro <i>All Your Worth</i> (2005).</p><p>É um ponto de partida, não uma regra legal. Com renda baixa ou moradia cara, as necessidades podem passar de 50%: nesse caso, reduza aos poucos e proteja ao menos um valor pequeno e constante para o futuro.</p>')+
   dtl('Como foi calculado','<p><b>Renda</b> = entradas do mês (salário, renda extra, rendimentos). <b>Cada grupo</b> = soma dos lançamentos do mês nas categorias do grupo. <b>% da renda</b> = valor do grupo ÷ renda. <b>Meta em reais</b> = renda × percentual da meta'+(r?' (ex.: '+brl(r)+' × '+mt.n+'% = '+brl(Math.round(r*mt.n/100))+' para necessidades)':'')+'. <b>Sem destino</b> = renda − tudo o que foi lançado.</p><p>Compras no cartão entram no mês em que a fatura vence, pois é quando o dinheiro sai.</p>')+
   dtl('Como classificar um gasto','<p><b>Necessidades</b>: o que você não consegue deixar de pagar sem consequência séria: moradia, mercado, transporte para trabalhar, saúde, educação, parcela mínima de dívidas.</p><p><b>Desejos</b>: o que melhora a vida, mas dá para adiar ou trocar: lazer, restaurantes, compras, assinaturas.</p><p><b>Futuro</b>: dinheiro que sai do consumo para virar patrimônio ou menos dívida: reserva e investimentos.</p>');
  return h;
}

/* cartões */
const cards=()=>S.pf.cards||[];
function faturaDe(c,data){
  const ym0=data.slice(0,7),cm=+data.slice(8)<=c.fecha?ym0:sh(ym0,1),dm=c.vence>c.fecha?cm:sh(cm,1);
  return{mes:dm,venc:clampDia(dm,c.vence)};
}
function planCompra(c,data,total,n){
  const f=faturaDe(c,data),pv=Math.floor(total/n);
  return Array.from({length:n},(_,i)=>({n:i+1,venc:clampDia(sh(f.mes,i),c.vence),v:i===n-1?total-pv*(n-1):pv}));
}
function taxaImp(vista,parc,n){
  if(n<2||vista<=0||parc*n<=vista)return 0;
  let lo=0,hi=1;const f=i=>parc*(1-Math.pow(1+i,-n))/i-vista;
  for(let k=0;k<80;k++){const mid=(lo+hi)/2;if(f(mid)>0)lo=mid;else hi=mid}
  return(lo+hi)/2;
}
const cItens=c=>S.pf.l.filter(l=>l.cartao===c.id);
function ccV(){
  const cs=cards(),r3=(()=>{const a=[];for(let i=1;i<=3;i++){const x=agg('pf',sh(ym(new Date()),-i)).ren;if(x)a.push(x)}return a.length?a.reduce((x,y)=>x+y,0)/a.length:0})();
  let h='<section class="pn"><h2>Cartões e parcelas</h2><p class="cap">Cadastre o cartão e lance cada compra com as parcelas. A fatura de cada mês, o limite comprometido e o peso das parcelas na sua renda aparecem aqui.</p></section>';
  h+='<form class="pn g" id="ccf"><h2 class="full">Novo cartão</h2><label class="f full">Nome do cartão<input name="n" required maxlength="40" placeholder="Ex.: Cartão principal"></label><label class="f full">Limite (R$, opcional)<input name="l" inputmode="decimal" placeholder="0,00"></label><label class="f">Dia do fechamento<input name="f" type="number" min="1" max="31" value="25" required></label><label class="f">Dia do vencimento<input name="v" type="number" min="1" max="31" value="5" required></label><p class="cap full">Os dois dias estão no aplicativo do cartão. Se o vencimento é um dia menor que o do fechamento (fecha 25, vence 5), a fatura vence no mês seguinte.</p><div class="ac full"><button class="pri" type="submit">Adicionar cartão</button></div></form>';
  if(!cs.length)return h;
  const aberto=cs.reduce((a,c)=>a.concat(cItens(c).filter(l=>l.st==='a')),[]);
  const prox=[];for(let i=0;i<6;i++){const mo=sh(ym(new Date()),i);prox.push([mo,sumv(aberto.filter(l=>l.d.slice(0,7)===mo))])}
  h+='<section class="pn hero"><p class="cap">Já comprometido nas próximas faturas</p><p class="big">'+brl(sumv(aberto))+'</p><p class="cap">'+aberto.length+(aberto.length===1?' parcela em aberto':' parcelas em aberto')+'</p></section>';
  h+='<section class="pn"><h2>Faturas dos próximos meses</h2><ul class="ls">'+prox.map(x=>'<li><span>'+ml(x[0])+'</span><span class="v">'+(x[1]?brl(x[1]):'—')+'</span><span class="cap">'+(r3&&x[1]?pf1(x[1]/r3*100)+'% da renda':'')+'</span></li>').join('')+'</ul><p class="cap">'+(r3?'Renda média usada: '+brl(Math.round(r3))+' (3 meses anteriores). Quanto maior a parte da renda presa em parcelas, menor a margem para imprevistos.':'Sem renda nos 3 meses anteriores para comparar.')+'</p></section>';
  h+='<form class="pn g" id="cpf"><h2 class="full">Nova compra no cartão</h2><label class="f full">Cartão<select name="c">'+cs.map(c=>'<option value="'+c.id+'">'+E(c.nome)+'</option>').join('')+'</select></label><label class="f full">O que foi comprado<input name="d" required maxlength="60" placeholder="Ex.: Tênis de corrida"></label><label class="f">Data da compra<input name="dt" type="date" required value="'+today()+'"></label><label class="f">Parcelas<input name="n" type="number" min="1" max="48" value="1"></label><label class="f">Valor total que será pago (R$)<input name="v" inputmode="decimal" placeholder="0,00" required></label><label class="f">Preço à vista (R$, opcional)<input name="pv" inputmode="decimal" placeholder="0,00"></label><label class="f full">Categoria<select name="cat">'+catOpts('pf','cpr')+'</select></label><p class="cap full" id="cp-prev"></p><div class="ac full"><button class="pri" type="submit">Lançar compra</button></div></form>';
  cs.forEach(c=>{
    const it=cItens(c),ab=it.filter(l=>l.st==='a'),comp=sumv(ab),meses=Array.from(new Set(it.map(l=>l.d.slice(0,7)))).sort();
    const aberM=meses.filter(mo=>ab.some(l=>l.d.slice(0,7)===mo)),pagM=meses.filter(mo=>!aberM.includes(mo)).slice(-1);
    h+='<section class="pn"><h2>'+E(c.nome)+'</h2><p class="cap">Fecha dia '+c.fecha+' · vence dia '+c.vence+'</p><p class="cap">Comprometido: <b>'+brl(comp)+'</b>'+(c.limite?' · limite disponível: <b>'+brl(c.limite-comp)+'</b> de '+brl(c.limite)+' ('+pf1(comp/c.limite*100)+'% usado)':'')+'</p>'+
     pagM.concat(aberM).map(mo=>{
       const li=it.filter(l=>l.d.slice(0,7)===mo).sort((x,y)=>x.d<y.d?-1:1),op=li.filter(l=>l.st==='a'),ve=clampDia(mo,c.vence);
       return '<details><summary><b>Fatura de '+ml(mo)+'</b> · vence '+ve.slice(8)+'/'+ve.slice(5,7)+' · '+(op.length?(ve<today()?'vencida':'em aberto'):'paga')+' · '+brl(sumv(li))+'</summary><ul class="ls">'+li.map(l=>'<li><span>'+E(l.desc)+'</span><span class="v">'+brl(l.v)+'</span></li>').join('')+'</ul>'+(op.length?'<div class="ac"><button class="pri" data-a="ccpay" data-id="'+c.id+'" data-mes="'+mo+'">Marcar fatura como paga ('+brl(sumv(op))+')</button></div>':'')+'</details>';
     }).join('')+(it.length?'':'<p class="cap">Nenhuma compra lançada neste cartão.</p>')+'<div class="ac"><button data-a="ccdel" data-id="'+c.id+'">Excluir cartão</button></div></section>';
  });
  h+='<section class="pn"><h2>Entenda</h2></section>'+
   dtl('Como funciona a fatura','<p>O cartão tem o <b>fechamento</b> (quando a fatura do mês é calculada) e o <b>vencimento</b> (quando você paga). Compras feitas até o dia do fechamento entram nessa fatura; depois dele, na seguinte. A regra exata varia entre bancos: confirme no aplicativo do seu cartão.</p><p>Cada parcela vira um lançamento na data de vencimento da fatura em que cai. Por isso ela aparece nos seus lançamentos e entra no saldo previsto.</p>')+
   dtl('Parcelar sem juros também pesa','<p>Mesmo sem juros, o parcelamento <b>compromete a renda dos próximos meses</b>: uma compra em 10 vezes ocupa parte do orçamento por 10 meses. Quando várias compras parceladas se acumulam, o valor fixo das faturas cresce e sobra menos para imprevistos.</p>')+
   dtl('Como saber se o parcelado tem juros','<p>Ao lançar uma compra parcelada, informe o <b>preço à vista</b>. Se o total das parcelas for maior, o sistema calcula a <b>taxa de juros mensal embutida</b>: a que faz as parcelas, trazidas a valor presente, igualarem o preço à vista (1ª parcela um mês após a compra). É uma estimativa para comparar: se o desconto à vista for maior que o rendimento do seu dinheiro, vale pagar à vista.</p>')+
   dtl('Pagar só o mínimo da fatura','<p>O saldo que não for pago vai para o <b>crédito rotativo</b> (ou parcelamento da fatura), uma das modalidades de crédito mais caras do país. Em geral, é melhor pagar a fatura inteira e, se não der, buscar uma linha mais barata do que deixar no rotativo. Confira no site do Banco Central e no contrato a regra e a taxa vigentes.</p>')+
   dtl('Como foi calculado','<p><b>Comprometido</b> = soma das parcelas em aberto do cartão. <b>Limite disponível</b> = limite − comprometido. <b>Fatura de um mês</b> = soma das parcelas que vencem nesse mês. <b>% da renda</b> = fatura ÷ média da renda dos 3 meses anteriores.</p>');
  return h;
}

/* reserva de emergência */
function rvCalc(){
  const R=S.pf.rsv||{},meses=R.meses||6,usados=[],vals=[];
  for(let i=1;i<=3;i++){const mo=sh(ym(new Date()),-i),v=agg('pf',mo).nec;if(v>0){usados.push(mo);vals.push(v)}}
  const auto=vals.length?Math.round(vals.reduce((a,b)=>a+b,0)/vals.length):0,manual=R.custo>0,custo=manual?R.custo:auto,alvo=custo*meses,atual=R.atual||0;
  return{R,meses,usados,custo,manual,alvo,atual,cob:custo?atual/custo:0};
}
function rvV(){
  const c=rvCalc(),R=c.R;
  let h='<section class="pn"><h2>Reserva de emergência</h2><p class="cap">É o dinheiro guardado para cobrir imprevistos (perda de renda, problema de saúde, conserto urgente) sem recorrer a dívida cara. Ela não é para viagens, trocas de celular ou oportunidades de investimento.</p></section>';
  h+='<section class="pn g"><h2 class="full">Seus dados</h2><label class="f full">Quantos meses de gastos essenciais quer cobrir?<select data-rv="meses">'+[3,4,6,9,12].map(n=>'<option value="'+n+'"'+(n===c.meses?' selected':'')+'>'+n+' meses</option>').join('')+'</select></label>'+
   '<label class="f full">Quanto você tem guardado hoje para emergências (R$)<input data-rv="atual" inputmode="decimal" placeholder="0,00" value="'+vr(R.atual)+'"></label>'+
   '<label class="f full">Aporte mensal planejado (R$, opcional)<input data-rv="aporte" inputmode="decimal" placeholder="0,00" value="'+vr(R.aporte)+'"></label>'+
   '<label class="f full">Custo essencial mensal, se quiser informar (R$, opcional)<input data-rv="custo" inputmode="decimal" placeholder="0,00" value="'+vr(R.custo)+'"></label><p class="cap full">Deixe o custo vazio para usar a média das suas necessidades ('+(c.manual?'valor informado':(c.custo?brl(c.custo):'sem dados ainda'))+'). Atualize o valor guardado de vez em quando.</p></section>';
  if(!c.custo)h+='<section class="pn em"><p>Ainda não há custo mensal essencial para calcular. Lance despesas de <b>necessidades</b> dos últimos meses ou informe o valor manualmente.</p></section>';
  else{
    const pct=c.alvo?Math.min(100,c.atual/c.alvo*100):0,ap=R.aporte||0;
    h+='<section class="pn hero'+(c.atual>=c.alvo?'':'')+'"><p class="cap">Reserva atual</p><p class="big">'+brl(c.atual)+'</p><p class="cap">cobre '+pf1(c.cob)+(c.cob===1?' mês':' meses')+' de gastos essenciais · alvo de '+c.meses+' meses: '+brl(c.alvo)+'</p></section>';
    h+='<section class="pn"><div class="bar" style="height:10px"><i style="flex:'+Math.min(c.atual,c.alvo)+';background:var(--'+(c.atual>=c.alvo?'in':'c1')+')"></i><i style="flex:'+Math.max(c.alvo-c.atual,0)+';background:var(--c5)"></i></div><p class="cap">'+pf1(c.alvo?c.atual/c.alvo*100:0)+'% do alvo'+(c.atual<c.alvo?' · faltam '+brl(c.alvo-c.atual):' · alvo atingido')+'</p>'+
     '<ul class="ls"><li><span>Custo essencial mensal <small class="cap">'+(c.manual?'informado por você':'média de '+c.usados.length+(c.usados.length===1?' mês':' meses')+' de necessidades')+'</small></span><span class="v">'+brl(c.custo)+'</span></li><li><span>Alvo da reserva <small class="cap">'+c.meses+' × '+brl(c.custo)+'</small></span><span class="v">'+brl(c.alvo)+'</span></li></ul>'+
     (c.atual<c.alvo?(ap>0?'<p class="cap">Com aportes de <b>'+brl(ap)+'</b> por mês, você chega ao alvo em cerca de <b>'+Math.ceil((c.alvo-c.atual)/ap)+' meses</b> (por volta de '+ml(sh(ym(new Date()),Math.ceil((c.alvo-c.atual)/ap)))+'), sem contar rendimentos.</p>':'<p class="cap">Informe um aporte mensal para ver em quanto tempo você chega ao alvo.</p>'):'')+
     '<ul class="ls">'+[1,3,6,12].map(k=>{const v=c.custo*k;return '<li><span>'+k+(k===1?' mês':' meses')+' de gastos essenciais <small class="cap">'+brl(v)+'</small></span><span class="v">'+(c.atual>=v?'atingido':'falta '+brl(v-c.atual))+'</span></li>'}).join('')+'</ul></section>';
  }
  h+='<section class="pn"><h2>Entenda</h2></section>'+
   dtl('Quantos meses guardar?','<p>A faixa mais citada por educadores financeiros vai de <b>3 a 12 meses</b> de gastos essenciais. Não é regra legal; depende do risco da sua renda:</p><p>• <b>3 meses</b>: renda muito estável, sem dependentes e com outra pessoa que também ganha.<br>• <b>6 meses</b>: ponto de partida comum para quem tem carteira assinada.<br>• <b>12 meses</b>: renda variável (autônomo, comissão, empresário) ou quando você sustenta outras pessoas.</p><p>Se hoje você não tem nada guardado, comece pelo primeiro degrau: <b>1 mês</b> de gastos essenciais.</p>')+
   dtl('Onde guardar','<p>A reserva precisa de <b>liquidez</b> (resgate rápido), <b>segurança</b> (baixo risco de perder o valor guardado) e <b>rendimento que acompanhe a taxa básica de juros</b>. Por isso costuma ficar em produtos conservadores, como conta remunerada, títulos públicos pós-fixados (Tesouro Selic) ou CDBs com liquidez diária.</p><p>Antes de escolher, confirme no contrato: prazo de resgate, rentabilidade líquida (depois de imposto e taxas) e se o produto tem a cobertura do FGC. Informação educacional, não recomendação de investimento.</p>')+
   dtl('Como foi calculado','<p><b>Custo essencial mensal</b> = média das despesas do grupo <i>Necessidades</i> dos '+(c.usados.length?c.usados.map(mab).join(', '):'últimos 3 meses fechados')+(c.manual?' (você informou um valor, que tem prioridade)':'')+'.</p><p><b>Alvo</b> = custo essencial × '+c.meses+' meses'+(c.custo?' = '+brl(c.custo)+' × '+c.meses+' = '+brl(c.alvo):'')+'.</p><p><b>Meses cobertos</b> = valor guardado ÷ custo essencial. <b>Prazo</b> = (alvo − guardado) ÷ aporte mensal, sem considerar rendimento.</p>');
  return h;
}

const PFT=['b5','cc','rv'];

function fluxoV(){
  const m=S.m,B=banco(m),t=today(),m0=ym(new Date()),cn={r:[1,1],p:[.8,1.1],o:[1.1,.95]}[tem(3)&&S.cn||'r'];
  let saldo=B?B.atual:0,neg='';const R=[];
  for(let i=0;i<6;i++){
    const mes=sh(m0,i);let e=0,x=0;
    S[m].l.forEach(l=>{if(l.st!=='a')return;if((l.d<t?m0:l.d.slice(0,7))!==mes)return;isIn(cat(m,l.c)[2])?e+=l.v:x+=l.v});
    e=Math.round(e*cn[0]);x=Math.round(x*cn[1]);saldo+=e-x;if(saldo<0&&!neg)neg=mes;
    R.push(`<li><div><b>${ml(mes)}</b><small>Entradas ${brl(e)} · Saídas ${brl(x)}</small></div><span class="v ${saldo<0?'neg':''}">${brl(saldo)}</span></li>`);
  }
  const sel=tem(3)?`<div style="margin-bottom:12px"><label class="f">Cenário<select id="cns"><option value="r"${!S.cn||S.cn==='r'?' selected':''}>Realista</option><option value="p"${S.cn==='p'?' selected':''}>Pessimista (receitas −20%, saídas +10%)</option><option value="o"${S.cn==='o'?' selected':''}>Otimista (receitas +10%, saídas −5%)</option></select></label></div>`:'';
  return`<section class="pn hero${saldo<0?' loss':''}"><p class="cap">Saldo projetado em 6 meses</p><p class="big">${brl(saldo)}</p><p class="cap">${B?'Parte do saldo atual dos bancos: '+brl(B.atual):'Informe o saldo na aba Banco para uma projeção mais precisa'}</p></section>
  ${neg?`<section class="pn"><ul class="ins"><li class="bad">O saldo fica negativo em ${ml(neg)}. Antecipe recebimentos ou renegocie vencimentos antes desse mês.</li></ul></section>`:''}
  <section class="pn"><h2>Fluxo de caixa mês a mês</h2>${sel}<ul class="ls">${R.join('')}</ul><p class="cap" style="margin-top:12px">Considera as contas em aberto. Atrasadas entram no mês atual.</p></section>`;
}

function orcV(){
  const m=S.m,pf=m==='pf',a=agg(m,S.mes),o=S[m].orc||{},mt=S[m].meta||{};
  const rc=pf?a.ren:a.rec,gs=pf?a.nec+a.des:a.ded+a.cus+a.des;
  const pr=(lb,real,meta,inv)=>meta?`<div style="margin-top:14px"><b>${lb}</b> · ${brl(real)} de ${brl(meta)} (${pc(real/meta)})<div class="bar" style="height:10px"><i style="flex:${Math.min(real,meta)};background:var(--${inv?(real>meta?'out':'in'):(real>=meta?'in':'c2')})"></i><i style="flex:${Math.max(meta-real,0)};background:var(--c5)"></i></div></div>`:'';
  const rows=catsFor(m).map(c=>{
    const real=a.bc[c[0]]||0,pv=o[c[0]]||0,st=pv?(isIn(c[2])?(real>=pv?'in':'wn'):(real>pv?'out':'in')):'ln';
    return`<li class="orc"><span>${E(c[1])}<small class="cap">Realizado ${brl(real)}${pv?' · '+pc(real/pv):''}</small></span><input data-orc="${c[0]}" inputmode="decimal" placeholder="Previsto" aria-label="Previsto para ${E(c[1])}" value="${vr(pv)}" style="border-color:var(--${st})"></li>`}).join('');
  return mon()+`<section class="pn g"><h2 class="full">Metas de ${ml(S.mes)}</h2>
    <label class="f">${pf?'Meta de renda':'Meta de receita'} (R$)<input data-mt="rec" inputmode="decimal" placeholder="0,00" value="${vr(mt.rec)}"></label>
    <label class="f">Teto de gastos (R$)<input data-mt="des" inputmode="decimal" placeholder="0,00" value="${vr(mt.des)}"></label>
    <div class="full">${pr(pf?'Renda':'Receita',rc,mt.rec,false)}${pr('Gastos',gs,mt.des,true)}${!mt.rec&&!mt.des?'<p class="cap">Defina uma meta para acompanhar o progresso.</p>':''}</div></section>
  <section class="pn"><h2>Orçamento previsto x realizado</h2><p class="cap" style="margin-bottom:8px">O previsto vale para todos os meses. Verde: dentro do previsto. Vermelho: estourou.</p><ul class="ls">${rows}</ul></section>`;
}

function dreV(){
  const m=S.m,pf=m==='pf',a=agg(m,S.mes);
  const R=pf?[['Renda',a.ren,1],['(−) Necessidades',-a.nec],['(−) Desejos',-a.des],['= Sobra do mês',a.ren-a.nec-a.des,1],['Do qual já investido',a.fut]]
   :[['Receita bruta',a.rec,1],['(−) Impostos sobre vendas',-a.ded],['= Receita líquida',a.rec-a.ded,1],['(−) Custos',-a.cus],['= Lucro bruto',a.rec-a.ded-a.cus,1],['(−) Despesas',-a.des],['= Resultado operacional',a.rec-a.ded-a.cus-a.des,1],['(−) Retiradas dos sócios',-a.ret],['= Resultado após retiradas',a.rec-a.ded-a.cus-a.des-a.ret,1]];
  const base=pf?a.ren:a.rec;
  return mon()+`<section class="pn"><h2>${pf?'Demonstrativo do mês':'DRE gerencial'} · ${ml(S.mes)}</h2><ul class="ls">${R.map(x=>`<li><span>${x[2]?'<b>'+x[0]+'</b>':x[0]}</span><span class="v ${x[1]<0?'neg':''}">${brl(x[1])}</span><span class="cap">${base?pc(x[1]/base):''}</span></li>`).join('')}</ul></section>
  <div class="ac"><button class="pri" data-a="csv">Exportar lançamentos do mês (CSV)</button></div>`;
}

function csv(){
  const m=S.m,L=S[m].l.filter(l=>dataRealLancamento(l).startsWith(S.mes)).sort((x,y)=>dataRealLancamento(x).localeCompare(dataRealLancamento(y)));
  const q=t=>'"'+String(t).replace(/"/g,'""')+'"';
  const rows=[['Data financeira','Vencimento','Descrição','Categoria','Tipo','Situação','Valor']].concat(L.map(l=>{const g=cat(m,l.c)[2];return[dataRealLancamento(l),l.d,l.desc,cat(m,l.c)[1],isIn(g)?'Entrada':'Saída',l.st==='a'?'Em aberto':'Pago',vr(l.v)||'0,00']}));
  const blob=new Blob(['\ufeff'+rows.map(r=>r.map(q).join(';')).join('\r\n')],{type:'text/csv;charset=utf-8'});
  const x=document.createElement('a');x.href=URL.createObjectURL(blob);x.download='lancamentos-'+S.mes+'-'+m+'.csv';x.click();setTimeout(()=>URL.revokeObjectURL(x.href),1000);
}
/* ---------- administração ---------- */
let ADM=false,ADL=null,ADLD=false,SALVO='',GOOGLE_ALLOWED={},GOOGLE_ADMIN_ERROR='';
function carregarAdm(){
  ADLD=true;
  sb.rpc('admin_listar').then(async r=>{ADLD=false;if(r.error){aviso('Não foi possível carregar os clientes: '+r.error.message);ADL=[]}else{aviso('');ADL=r.data||[];const gr=await sb.rpc('mf_google_admin_list');GOOGLE_ADMIN_ERROR=gr.error?'Liberação Google indisponível. Conclua a instalação de segurança.':'';GOOGLE_ALLOWED={};(gr.data||[]).forEach(x=>GOOGLE_ALLOWED[x.user_id]=true);const mr=await sb.from('modulos_usuario').select('user_id,modulos');if(mr.error){ADMIN_MODULE_ERROR=mr.error.message;ADMIN_USER_MODULES={}}else{ADMIN_MODULE_ERROR='';ADMIN_USER_MODULES={};(mr.data||[]).forEach(x=>ADMIN_USER_MODULES[x.user_id]=x.modulos||{})}}render()});
}
function adminV(){
  if(!ADL&&!ADLD&&sb)carregarAdm();
  if(!ADL)return'<section class="pn"><p class="cap">Carregando clientes…</p></section>';
  const c={ess:0,bpo:0,pro:0};ADL.forEach(u=>c[u.plano]=(c[u.plano]||0)+1);
  const fd=d=>d?d.slice(8,10)+'/'+d.slice(5,7)+'/'+d.slice(0,4):'nunca';
  const rows=ADL.map(u=>`<li class="adm"><div><b>${E(u.email||'(sem e-mail)')}</b>${u.user_id===SALVO?' <span class="pos">· salvo</span>':''}<small>Último acesso: ${fd(u.ultimo_acesso)}</small><label class="module-option"><input type="checkbox" data-google-user="${E(u.user_id)}" ${GOOGLE_ADMIN_ERROR?'disabled':''} ${GOOGLE_ALLOWED[u.user_id]?'checked':''}> <span>Liberar Google para este e-mail</span></label><label class="module-option"><input type="checkbox" data-user-module="${u.user_id}" ${ADMIN_MODULE_ERROR?'disabled':''} ${ADMIN_USER_MODULES[u.user_id]?.vendas_diarias?'checked':''}> <span>Ativar Vendas diárias para este cliente</span></label><label class="module-option"><input type="checkbox" data-user-env="${u.user_id}" data-env-key="pf" ${ADMIN_MODULE_ERROR?'disabled':''} ${ADMIN_USER_MODULES[u.user_id]?.ambientes?.pf===true?'checked':''}> <span>Liberar ambiente Pessoa Física</span></label><label class="module-option"><input type="checkbox" data-user-env="${u.user_id}" data-env-key="pj" ${ADMIN_MODULE_ERROR?'disabled':''} ${ADMIN_USER_MODULES[u.user_id]?.ambientes?.pj===true?'checked':''}> <span>Liberar ambiente Pessoa Jurídica</span></label></div><select data-pl="${u.user_id}" aria-label="Plano de ${E(u.email||'')}">${['ess','bpo','pro'].map(k=>`<option value="${k}"${u.plano===k?' selected':''}>${PLANOS[k].c}</option>`).join('')}</select><input type="date" data-vd="${u.user_id}" value="${u.valido_ate||''}" aria-label="Válido até"><button class="pri sm" data-a="admsv" data-id="${u.user_id}">Salvar</button></li>`).join('');
  const modCards=['ess','bpo','pro'].map(k=>`<section class="pn"><details class="module-details"><summary><b>Módulos do plano ${PLANOS[k].n}</b><span class="cap">Editar módulos</span></summary><p class="cap">Marque as abas disponíveis para este plano.</p><p class="cap" data-module-status="${k}">${PMError?'Configuração indisponível — confira o aviso acima.':'As alterações são salvas automaticamente.'}</p><div class="module-grid">${Object.entries(MOD_LABELS).map(([id,label])=>`<label class="module-option"><input type="checkbox" data-plan-module="${k}" data-module="${id}" ${modOn(k,id)?'checked':''}> <span>${label}</span></label>`).join('')}</div><button class="pri sm" data-a="save-modules" data-plan="${k}">Salvar módulos agora</button></details></section>`).join('');
  return`<section class="pn hero"><p class="cap">Painel administrativo</p><p class="big" style="font-size:30px">${ADL.length} ${ADL.length===1?'cliente':'clientes'}</p><p class="cap">Essencial ${c.ess} · Gestão ${c.bpo} · Pro ${c.pro}</p></section>
  <section class="pn"><h2>Clientes e planos</h2><ul class="ls">${rows}</ul><div class="ac"><button data-a="admr">Atualizar lista</button></div></section>
  ${PMError?`<section class="pn em"><b>Configuração de módulos não carregada.</b><p>Execute o arquivo supabase-plan-modules.sql no SQL Editor do Supabase para criar a tabela e as permissões necessárias.</p><small>${E(PMError)}</small></section>`:''}
  ${ADMIN_MODULE_ERROR?`<section class="pn em"><b>Ativação de módulos por cliente indisponível.</b><p>Execute o arquivo supabase-client-modules.sql no SQL Editor do Supabase e atualize a lista de clientes.</p><small>${E(ADMIN_MODULE_ERROR)}</small></section>`:''}
  ${GOOGLE_ADMIN_ERROR?`<section class="pn em"><p>${E(GOOGLE_ADMIN_ERROR)}</p></section>`:''}
  ${modCards}
  <section class="pn"><p class="cap">Para convidar um novo cliente, use Authentication, depois Users, Add user, Send invitation, no Supabase, e depois defina o plano aqui. Os dados financeiros dos clientes são criptografados e você não consegue vê-los: aparecem só e-mail, plano e último acesso. Deixe a validade em branco para um plano sem data de término.</p></section>`;
}
function parseWaMessage(text){
  const source=String(text||'').trim(),income=/\b(recebi|ganhei|entrada|vendi|venda)\b/i.test(source),amountMatch=source.match(/(?:R\$\s*)?(\d{1,3}(?:\.\d{3})+(?:,\d{1,2})?|\d+(?:,\d{1,2})?)(?!\d)/i);
  const amount=amountMatch?val(amountMatch[1]):0;let description=source;
  if(amountMatch)description=description.replace(amountMatch[0],' ');
  description=description.replace(/^\s*(gastei|paguei|comprei|despesa|sa[ií]da|recebi|ganhei|entrada|vendi|venda)\b\s*/i,'').replace(/\s+/g,' ').replace(/^[-–—,:;\s]+|[-–—,:;\s]+$/g,'').slice(0,80);
  return{amount,description,income};
}
function waSuggestedCategory(m,income,description){
  const q=String(description||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
  if(m==='pf'){if(income)return'ext';if(/supermerc|mercado|feira|hortifruti|acougue/.test(q))return'mer';if(/restaurante|delivery|ifood|lanche|cafe/.test(q))return'res';if(/aluguel|condominio/.test(q))return'mor';return'con'}
  return income?'orec':'out';
}
function waCategoryOptions(m,income,description){const selected=waSuggestedCategory(m,income,description),direction=income?'receber':'pagar';return catGroupsFor(m).filter(g=>(isIn(g.base)?'receber':'pagar')===direction).map(g=>{const items=catsInGroup(m,g);return items.length?`<optgroup label="${E(g.name)}">${items.map(c=>`<option value="${E(c[0])}"${c[0]===selected?' selected':''}>${E(c[1])}</option>`).join('')}</optgroup>`:''}).join('')}
function waDate(item){const d=new Date(item.received_at||Date.now());return Number.isNaN(d.getTime())?today():`${d.getFullYear()}-${p2(d.getMonth()+1)}-${p2(d.getDate())}`}
function whatsappView(){
  if(!WA.loaded&&!WA.loading)setTimeout(loadWhatsApp,0);
  const status=WA.loading?'Consultando…':WA.linked?`Conectado ·•••• ${E(WA.last4)}`:'Nenhum telefone conectado';
  const pairing=WA.code?`<section class="pn em"><b>Código: <code>${E(WA.code)}</code></b><p>Envie <b>CONECTAR ${E(WA.code)}</b> para o número WhatsApp Business da Mesa. O código expira às ${E(new Date(WA.expires).toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'}))}.</p><button data-a="wa-copy">Copiar código</button></section>`:'';
  const cards=WA.items.map(item=>{const parsed=parseWaMessage(item.text),id=E(item.id),date=waDate(item),m=S.m;return`<section class="pn" data-wa-card="${id}"><p class="cap">Mensagem recebida · ${E(new Date(item.received_at).toLocaleString('pt-BR'))}</p><blockquote>${E(item.text)}</blockquote><p>Confirme os dados antes de adicionar ao ambiente <b>${E(CFG[m].nome)}</b>.</p><label class="f">Descrição<input data-wa-desc="${id}" maxlength="80" value="${E(parsed.description)}"></label><label class="f">Valor (R$)<input data-wa-value="${id}" inputmode="decimal" placeholder="0,00" value="${parsed.amount?(parsed.amount/100).toFixed(2).replace('.',','):''}"></label><label class="f">Data<input data-wa-date="${id}" type="date" value="${date}"></label><label class="f">Categoria<select data-wa-category="${id}">${waCategoryOptions(m,parsed.income,parsed.description)}</select></label><p class="cap">Tipo sugerido: ${parsed.income?'entrada':'despesa'} · ${parsed.amount?'valor identificado':'informe o valor'}</p><div class="ac"><button class="pri" data-a="wa-confirm" data-id="${id}" data-income="${parsed.income?'1':'0'}">Confirmar lançamento</button><button data-a="wa-discard" data-id="${id}">Descartar</button></div></section>`}).join('');
  return`<section class="pn hero"><p class="cap">Registro de despesas pelo WhatsApp</p><h2>Conecte seu número e envie gastos por mensagem</h2><p>Exemplo: <b>gastei R$ 200 supermercado</b>. A mensagem aparece aqui para revisar e confirmar antes de entrar nos seus lançamentos.</p><p class="cap">${status} · ${WA.items.length} mensagem(ns) aguardando revisão</p><div class="ac"><button class="pri" data-a="wa-connect">${WA.linked?'Gerar novo código de conexão':'Conectar WhatsApp'}</button><button data-a="wa-refresh">Atualizar mensagens</button></div></section>${pairing}${WA.error?`<section class="pn em"><b>Não foi possível acessar o WhatsApp.</b><p>${E(WA.error)}</p></section>`:''}${cards||'<section class="pn"><p class="cap">Nenhuma mensagem aguardando revisão.</p></section>'}`;
}
async function waRequest(action,extra={}){if(!sb||!USER)throw new Error('Entre na sua conta para usar a integração.');const {data,error}=await sb.functions.invoke('whatsapp-inbox',{body:{action,...extra}});if(error||data?.error)throw new Error(data?.error||error?.message||'Falha na integração WhatsApp.');return data}
async function loadWhatsApp(){if(WA.loading)return;WA.loading=true;WA.error='';try{const [status,inbox]=await Promise.all([waRequest('status'),waRequest('list_pending')]);WA.linked=status.linked;WA.last4=status.phone_last4||'';WA.items=inbox.messages||[];WA.loaded=true}catch(error){WA.error=error.message||'Não foi possível carregar a caixa do WhatsApp.';WA.loaded=true}finally{WA.loading=false;render()}}
async function confirmWhatsAppMessage(button){
  const id=button.dataset.id,card=document.querySelector(`[data-wa-card="${CSS.escape(id)}"]`),description=card?.querySelector(`[data-wa-desc="${CSS.escape(id)}"]`)?.value.trim(),amount=val(card?.querySelector(`[data-wa-value="${CSS.escape(id)}"]`)?.value||''),date=card?.querySelector(`[data-wa-date="${CSS.escape(id)}"]`)?.value,category=card?.querySelector(`[data-wa-category="${CSS.escape(id)}"]`)?.value,m=S.m;
  if(!description||amount<=0||!date||!category){aviso('Confira descrição, valor, data e categoria antes de confirmar.');return}
  if(!KEY[m]){aviso('Desbloqueie o ambiente '+CFG[m].nome+' antes de confirmar o lançamento.');return}
  const list=S[m].l=Array.isArray(S[m].l)?S[m].l:[];
  if(!list.some(x=>x.sourceWhatsappId===id)){
    const created=gerar({desc:description,v:amount,c:category,d:date,st:'p',b:bancos(m)[0]?.id,tipoMov:''}).map(x=>({...x,sourceWhatsappId:id}));list.push(...created);AC={};clearTimeout(tm);
    if(!await persist(m)){S[m].l=list.filter(x=>x.sourceWhatsappId!==id);render();aviso('Não foi possível salvar o lançamento criptografado. A mensagem continua aguardando revisão.');return}
    S.mes=date.slice(0,7);
  }
  try{await waRequest('remove_pending',{id,status:'confirmed'});WA.items=WA.items.filter(x=>x.id!==id);render();aviso('Lançamento confirmado e salvo no ambiente '+CFG[m].nome+'.')}
  catch(error){aviso('O lançamento foi salvo, mas a mensagem continua na caixa. Atualize e confirme novamente para removê-la sem duplicar. '+error.message)}
}
const lgpdView=()=>`<section class="pn hero"><p class="cap">Privacidade e proteção de dados</p><h2>Seus dados pessoais importam</h2><p>A Lei Geral de Proteção de Dados (LGPD) estabelece regras para o uso de informações pessoais e garante direitos a você.</p></section>
  <section class="pn"><h2>Quais informações o sistema utiliza</h2><p>Para oferecer os recursos da Mesa Financeira, o sistema pode tratar os dados da sua conta e os registros que você inclui, como receitas, despesas, contas, vencimentos, categorias e comprovantes. Se você habilitar o Open Finance, contas e movimentações autorizadas pelo banco também poderão ser consultadas para revisão e importação.</p><p>Se você conectar o WhatsApp, as mensagens de texto recebidas ficam temporariamente cifradas na fila de revisão. Ao confirmar, os dados do lançamento são gravados no ambiente financeiro cifrado; ao descartar, o conteúdo da mensagem é apagado.</p><p>As informações financeiras ficam associadas à conta autenticada e são usadas para apresentar os painéis, relatórios, avisos e lembretes solicitados por você.</p><p><b>Cifragem dos registros PF/PJ:</b> AES-GCM de 256 bits; a senha do ambiente é processada com PBKDF2/SHA-256 (600.000 iterações). Os comprovantes anexados seguem um fluxo de armazenamento separado. Os detalhes e limites estão na Política de Privacidade.</p></section>
 <section class="pn"><h2>Seus direitos</h2><p>Você pode solicitar confirmação do tratamento e acesso aos seus dados, correção de informações, portabilidade quando aplicável, informações sobre o uso e compartilhamento, além de exclusão ou revisão nos casos previstos pela LGPD.</p><p>Para fazer uma solicitação ou tirar dúvidas sobre privacidade, fale com a Mesa Financeira:</p><div class="ac"><a class="pri" style="display:inline-flex;align-items:center;min-height:44px;padding:10px 16px;border-radius:12px;text-decoration:none" href="https://wa.me/5537991928875" target="_blank" rel="noopener noreferrer">Contato pelo WhatsApp · (37) 99192-8875</a></div></section>
 <section class="pn"><h2>Gerencie seus dados</h2><p>Você pode exportar os lançamentos do mês em CSV pela área de lançamentos. Para apagar os registros de um ambiente, use o botão ao final desta página; a ação remove os dados do ambiente atual e não pode ser desfeita.</p><div class="ac"><button class="neg-b" data-a="clr">Apagar dados de ${CFG[S.m].nome}</button></div></section>
  <section class="pn"><h2>Política de Privacidade completa</h2><p class="cap">Leia a política detalhada sobre dados tratados, finalidades, fornecedores, segurança e direitos. A versão disponível é uma minuta e precisa da validação dos dados da empresa antes da publicação.</p><div class="ac"><a class="pri" style="display:inline-flex;align-items:center;min-height:44px;padding:10px 16px;border-radius:12px;text-decoration:none" href="./politica-de-privacidade.html">Ler Política de Privacidade</a></div></section>`;
const VIEWS={p:painel,nt:avisosV,l:lanc,b:bancoV,c:contasV,cr:()=>contasSep(true),cp:()=>contasSep(false),sales:vendasView,clients:clientesView,vd:vendasDiariasView,f:fluxoV,o:orcV,r:dreV,pre:precV,b5:b5V,cc:ccV,rv:rvV,u:planoV,imp:importarView,aj:ajustesView,cad:cadastroView,wa:whatsappView,lg:lgpdView,a:adminV};

let rq,DASH_DRAG=null,DASH_DRAG_ENV=null;
const render=()=>{cancelAnimationFrame(rq);rq=requestAnimationFrame(draw)};
function applyDashboardOrder(){
 const root=document.querySelector('.dashboard-sortable');if(!root)return;
 const order=S[S.m].dashboardOrder||[],cards=[...root.querySelectorAll('[data-dash-card]')];
 const columns=S[S.m].dashboardColumns||{};
 const left=document.createElement('div'),right=document.createElement('div');
 left.className=right.className='dashboard-column';left.dataset.dashColumn='1';right.dataset.dashColumn='2';
 root.replaceChildren(left,right);
 cards.sort((a,b)=>{const ai=order.indexOf(a.dataset.dashCard),bi=order.indexOf(b.dataset.dashCard);return(ai<0?999:ai)-(bi<0?999:bi)}).forEach(card=>{
  const saved=Number(columns[card.dataset.dashCard]),col=saved===1||saved===2?saved:(card.dataset.dashCard==='summary'?1:2);
  card.dataset.dashCol=String(col);(col===1?left:right).append(card);card.style.removeProperty('grid-column');
 });
}
function animateOutflowBars(){
 const items=[...document.querySelectorAll('.cats li[data-value]')];
 if(!items.length)return;
 const values=items.map(item=>Number(item.dataset.value)||0),max=Math.max(...values);
 if(max<=0)return;
 requestAnimationFrame(()=>items.forEach((item,index)=>setTimeout(()=>item.style.setProperty('--w',`${(values[index]/max*100).toFixed(1)}%`),index*100)));
}
document.addEventListener('dragstart',e=>{
 const handle=e.target.closest?.('[data-dash-handle]'),card=handle?.closest('[data-dash-card]');
 if(!handle||!card)return;DASH_DRAG=card;DASH_DRAG_ENV=S.m;card.classList.add('is-dragging');card.closest('.dashboard-sortable')?.classList.add('is-rearranging');
 if(e.dataTransfer){e.dataTransfer.effectAllowed='move';e.dataTransfer.setData('text/plain',card.dataset.dashCard)}
});
document.addEventListener('dragover',e=>{
 if(!DASH_DRAG)return;const root=document.querySelector('.dashboard-sortable'),app=document.querySelector('#app');
 if(!root||!app?.contains(e.target))return;e.preventDefault();
 const columns=[...root.querySelectorAll('.dashboard-column')],bounds=root.getBoundingClientRect(),col=e.clientX<bounds.left+bounds.width/2?1:2;
 const target=e.target.closest?.('[data-dash-card]');
 const column=target?.closest('.dashboard-column')||columns[col-1];if(!column)return;
 DASH_DRAG.dataset.dashCol=column.dataset.dashColumn;
 if(target&&target!==DASH_DRAG&&column.contains(target)){const rect=target.getBoundingClientRect();column.insertBefore(DASH_DRAG,e.clientY>rect.top+rect.height/2?target.nextSibling:target)}
 else column.append(DASH_DRAG);
});
document.addEventListener('dragend',()=>{
 if(!DASH_DRAG)return;const card=DASH_DRAG,env=DASH_DRAG_ENV;card.classList.remove('is-dragging');
 const root=document.querySelector('.dashboard-sortable');if(root){root.classList.remove('is-rearranging');if(env===S.m){const cards=[...root.querySelectorAll('[data-dash-card]')];S[env].dashboardOrder=cards.map(x=>x.dataset.dashCard);S[env].dashboardColumns=Object.fromEntries(cards.map(x=>[x.dataset.dashCard,Number(x.dataset.dashCol)||1]));save()}}
 DASH_DRAG=null;DASH_DRAG_ENV=null;
});
const abv=n=>{const st=['de','do','da','e','para'],w=String(n).split(/\s+/).filter(x=>x&&!st.includes(x.toLowerCase()));
  if(w.length>1&&!/^[A-Z]{2,}$/.test(w[0]))return(w[0][0]+w[1][0]).toUpperCase();return String(n).replace(/[^A-Za-zÀ-ÿ0-9]/g,'').slice(0,2).toUpperCase()};
function cabecalho(){
  const t=TABS.find(x=>x[0]===S.v)||TABS[0],pj=S.m==='pj';
  $('#crumb').innerHTML='Mesa Financeira <span>/</span> '+t[1];
  const h=$('#ph');
  h.innerHTML=S.v==='p'?'<h2 class="ph-t">Finanças organizadas.</h2><p class="ph-s">Uma visão mais clara para cuidar '+(pj?'do seu negócio':'do seu dinheiro')+'.</p>':'<h2 class="ph-t">'+t[1]+'</h2>';
  h.hidden=false;
}
function draw(){
  if((S.v==='pre'&&S.m!=='pj')||((S.v==='sales'||S.v==='clients')&&S.m!=='pj')||(S.v==='vd'&&(S.m!=='pj'||USER_MODULES.vendas_diarias!==true))||(PFT.includes(S.v)&&S.m!=='pf'))S.v='p';
  // Normalize the active view before rendering navigation, title, and content.
  // Otherwise the sidebar can mark one tab selected while the page shows another.
  if(!['a','u'].includes(S.v)&&!modOn(PL,S.v))S.v='p';
  document.documentElement.dataset.mod=S.m;
  envChip(S.m);
  document.querySelectorAll('[data-m]').forEach(b=>b.setAttribute('aria-pressed',b.dataset.m===S.m));
    const tabsDisponiveis=TABS.filter(t=>(t[0]!=='a'||ADM)&&(t[0]==='u'||t[0]==='a'||modOn(PL,t[0]))&&(t[0]!=='vd'||USER_MODULES.vendas_diarias===true)&&(t[0]!=='pre'||S.m==='pj')&&(t[0]!=='sales'||S.m==='pj')&&(t[0]!=='clients'||S.m==='pj')&&(t[0]!=='vd'||S.m==='pj')&&(!PFT.includes(t[0])||S.m==='pf'));
  const gruposNavegacao=[['Financeiro',['p','nt','l','cr','cp','b','imp','f','b5','cc','rv']],['Vendas e clientes',['sales','clients','vd','pre']],['Gestão',['c','o','r']],['Configurações',['aj','cad','wa','lg','u','a']]];
  $('#nv').innerHTML=gruposNavegacao.map(([nome,ids])=>{const itens=tabsDisponiveis.filter(t=>ids.includes(t[0]));if(!itens.length)return '';const ativo=itens.some(t=>t[0]===S.v);return `<details class="nav-group"${ativo?' open':''}><summary>${nome}</summary><div class="nav-group-items">${itens.map(t=>{const n=t[0]==='nt'?contasAvisadas().length:0;return `<button data-v="${t[0]}" aria-pressed="${t[0]===S.v}"><i class="ab" aria-hidden="true">${abv(t[1])}</i><span class="nl">${t[1]}</span>${n?` <small class="alert-count" aria-label="${n} conta(s) com vencimento próximo ou atrasado">${n>99?'99+':n}</small>`:''}</button>`}).join('')}</div></details>`}).join('');
  const activeView=S.v;
  try{
    $('#app').innerHTML=(activeView==='a'&&!ADM?painel:(VIEWS[activeView]||painel))();
    if(activeView==='p'){applyDashboardOrder();animateOutflowBars()}
    cabecalho();
  }catch(error){
    // Never leave the previous screen under a newly selected sidebar tab.
    console.error('Falha ao renderizar a tela '+activeView,error);
    S.v='p';
    $('#nv').querySelectorAll('[data-v]').forEach(b=>b.setAttribute('aria-pressed',b.dataset.v==='p'));
    $('#app').innerHTML=mon()+'<section class="pn em"><h2>Não foi possível carregar o resumo</h2><p>O Painel encontrou um problema ao ler os dados deste ambiente. Tente atualizar a página. Se continuar, envie esta mensagem ao suporte.</p><button class="pri" data-v="p">Tentar novamente</button></section>';
    cabecalho();
  }
  $('[data-a=clr]').textContent='Apagar dados de '+CFG[S.m].nome;
}

document.addEventListener('click',async e=>{
  const b=e.target.closest('[data-m],[data-v],[data-a]');if(!b)return;
  const D=b.dataset,a=D.a;if(LANC_BUSY&&b.closest('#app'))return;
  if(a==='page-refresh'){
    b.disabled=true;b.textContent='Atualizando…';
    try{
      if(USER&&KEY[S.m]){
        clearTimeout(tm);if(!(await persist(S.m))){b.disabled=false;b.textContent='Atualizar';return}
        const env=S.m,view=S.v,month=S.mes;
        const fresh=await REGISTROS.read(sb,USER.id);
        const blob=fresh[env];
        if(blob){const data=await decryptRecord(blob,KEY[env],env);S[env]=mig(await REGISTROS.hydrate(env,data,KEY[env],decryptRecord),env)}
        RAW=fresh;
        S.v=view;S.mes=month;AC={};
      }
      render();aviso('Dados atualizados.');
    }catch(err){aviso(err.message||'Não foi possível atualizar agora. Confira sua conexão e tente novamente.')}
    finally{b.disabled=false;b.textContent='Atualizar'}
    return;
  }
  if(a==='payment-date-cancel'){document.querySelector('#payment-date-backdrop')?.remove();window.__mfPaymentTarget=null;return}
  if(a==='client-open'){CLI_EDIT_ID=D.id;S.v='clients';S.m='pj';render();requestAnimationFrame(()=>document.querySelector('#client-form [name=nome]')?.focus());return}
  if(a==='client-cnpj-lookup'){
    const f=document.querySelector('#client-form'),cnpj=(f?.elements.namedItem('documento')?.value||'').replace(/\D/g,''),statusEl=document.querySelector('#client-cnpj-status');
    if(!cnpjValido(cnpj)){aviso('Confira os 14 números do CNPJ. O número informado não passou na validação dos dígitos.');return}
    const duplicado=(S.pj.clientes||[]).find(c=>c.id!==CLI_EDIT_ID&&String(c.documento||'').replace(/\D/g,'')===cnpj);
    if(duplicado){const msg=`Este CNPJ já está cadastrado para ${duplicado.nome} (cliente ${String(duplicado.codigo).padStart(4,'0')}). Abra o cadastro existente para consultar ou atualizar.`;if(statusEl){statusEl.hidden=false;statusEl.className='client-cnpj-status warn';statusEl.textContent=msg}aviso(msg);return}
    if(!sb){aviso('Não foi possível conectar ao Supabase. Confira o config.js e entre novamente.');return}
    b.disabled=true;b.textContent='Buscando…';
    sb.functions.invoke('consultar-cnpj',{body:{cnpj}}).then(({data,error})=>{
      if(error||data?.error)throw new Error(data?.error||error?.message||'Não foi possível consultar este CNPJ.');
      const d=data?.dados;if(!d)throw new Error('A consulta não retornou os dados cadastrais.');
      const put=(name,value)=>{const el=f.elements.namedItem(name);if(el&&value!==undefined&&value!==null&&String(value).trim()!=='')el.value=String(value)};
      put('nome',d.RazaoSocial||d.NomeFantasia||'');put('razaoSocial',d.RazaoSocial);put('nomeFantasia',d.NomeFantasia);
      const dt=d.DataAbertura;if(typeof dt==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(dt)&&!dt.startsWith('0000'))put('inicioAtividade',dt);
      put('atividade',d.AtividadePrincipal?.Descricao);
      const en=d.Endereco||{},municipio=d.Municipio||{},municipioEndereco=en.Municipio||{};
      const nomeCidade=typeof municipioEndereco==='string'?municipioEndereco:typeof municipioEndereco==='object'?(municipioEndereco.Nome||municipioEndereco.Descricao||''):'';
      const nomeMunicipio=typeof municipio==='string'?municipio:typeof municipio==='object'?(municipio.Nome||municipio.Descricao||''):'';
      const codigoMunicipio=municipioEndereco.IBGE||municipio.IBGE||municipioEndereco.CodigoIBGE||municipio.CodigoIBGE||'';
      put('cep',en.CEP?String(en.CEP).replace(/\D/g,'').replace(/^(\d{5})(\d{3})$/,'$1-$2'):null);
      put('endereco',[en.TipoLogradouro,en.Logradouro].filter(Boolean).join(' '));put('numero',en.Numero);put('complemento',en.Complemento);put('bairro',en.Bairro);put('cidade',nomeCidade||nomeMunicipio);put('uf',en.UF||municipioEndereco.UF||municipio.UF);put('codigoIbge',String(codigoMunicipio).replace(/\D/g,''));
      const contato=d.Contato||{};put('email',contato.Email);
      const telefone=(ddd,num)=>[String(ddd||'').replace(/\D/g,''),String(num||'').replace(/\D/g,'')].filter(Boolean).join('');put('telefone',telefone(contato.DDD1,contato.Telefone1));put('telefone2',telefone(contato.DDD2,contato.Telefone2));
      const situacao=d.SituacaoCadastral?.Descricao,ativa=situacao==='ATIVA';
      if(statusEl){statusEl.hidden=false;statusEl.className='client-cnpj-status '+(ativa?'ok':'warn');statusEl.textContent=situacao?`Situação cadastral na consulta: ${situacao}${ativa?' — ativa na base consultada.':' — confira antes de concluir o cadastro.'}`:'Dados encontrados; situação cadastral não retornada. Confira antes de salvar.'}
      aviso('Dados da CNPJAPI preenchidos nos campos disponíveis. Confira antes de salvar. A Inscrição Estadual é consultada separadamente.');
    }).catch(err=>aviso(err.message||'Falha na consulta do CNPJ. Confira a configuração e tente novamente.')).finally(()=>{b.disabled=false;b.textContent='Buscar'});
    return;
  }
  if(a==='client-ibge-lookup'){const f=document.querySelector('#client-form'),cidade=f?.elements.namedItem('cidade')?.value.trim(),uf=f?.elements.namedItem('uf')?.value,stateCode=IBGE_ID_BY_UF[uf];if(!cidade||!stateCode){aviso('Informe cidade e UF para buscar o código IBGE.');return}b.disabled=true;fetch(`https://servicodados.ibge.gov.br/api/v1/localidades/estados/${stateCode}/municipios`).then(r=>{if(!r.ok)throw new Error('O serviço do IBGE respondeu com erro ('+r.status+').');return r.json()}).then(rows=>{if(!Array.isArray(rows))throw new Error('O IBGE retornou uma resposta inesperada.');const norm=x=>String(x||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('pt-BR').trim(),matches=rows.filter(x=>norm(x.nome)===norm(cidade));if(matches.length!==1){aviso(matches.length?'Há mais de um resultado; confira a cidade e a UF.':'Município não encontrado nessa UF.');return}f.elements.namedItem('codigoIbge').value=String(matches[0].id);aviso('Código IBGE preenchido: '+matches[0].id+'.')}).catch(err=>aviso(err.message||'Não foi possível consultar o IBGE. Verifique sua conexão.')).finally(()=>{b.disabled=false});return}
  if(a==='client-ie-auto-lookup'){const f=document.querySelector('#client-form'),cnpj=(f?.elements.namedItem('documento')?.value||'').replace(/\D/g,''),ibge=(f?.elements.namedItem('codigoIbge')?.value||'').replace(/\D/g,''),uf=UF_BY_IBGE[ibge.slice(0,2)];if(cnpj.length!==14){aviso('Informe um CNPJ com 14 dígitos.');return}if(ibge.length!==7||!uf){aviso('Informe o código IBGE do município para identificar a UF da consulta.');return}if(!sb){aviso('Não foi possível conectar ao sistema. Confira o config.js e entre novamente.');return}b.disabled=true;b.textContent='Consultando…';sb.functions.invoke('consultar-inscricao-estadual',{body:{cnpj,uf}}).then(({data,error})=>{if(error||data?.error)throw new Error(data?.error||error?.message||'Não foi possível consultar a IE.');if(data?.status==='nao_contribuinte'){aviso(`A consulta à SEFAZ de ${uf} retornou que o CNPJ não possui IE ativa como contribuinte.`);return}if(!data?.ie){aviso(data?.message||`Não foi encontrada uma IE para este CNPJ em ${uf}. Use a consulta manual para conferir.`);return}f.elements.namedItem('inscricaoEstadual').value=data.ie;aviso(`IE de ${uf} preenchida automaticamente${data.situacao?` (${data.situacao})`:''}. Confira antes de salvar.`)}).catch(err=>aviso(err.message||'Falha na consulta automática. Você ainda pode consultar no portal oficial.')).finally(()=>{b.disabled=false;b.textContent='Buscar IE automaticamente'});return}
  if(a==='client-ie-lookup'){const f=document.querySelector('#client-form'),cnpj=(f?.elements.namedItem('documento')?.value||'').replace(/\D/g,''),ibge=(f?.elements.namedItem('codigoIbge')?.value||'').replace(/\D/g,''),uf=UF_BY_IBGE[ibge.slice(0,2)];if(cnpj.length!==14){aviso('Informe um CNPJ com 14 dígitos.');return}if(ibge.length!==7||!uf){aviso('Informe o código IBGE do município para identificar a UF da consulta.');return}const url='https://dfe-portal.svrs.rs.gov.br/NFE/CCC?cnpj='+encodeURIComponent(cnpj);window.open(url,'_blank','noopener,noreferrer');const clipboard=navigator.clipboard?.writeText(cnpj);const msg=`Consulta oficial aberta. CNPJ copiado; selecione a UF ${uf}. O portal pode solicitar login Gov.br.`;if(clipboard)clipboard.then(()=>aviso(msg)).catch(()=>aviso(msg));else aviso(msg);return}
  if(a==='client-cancel'){CLI_EDIT_ID=null;render();return}
  if(a==='client-del'){const P=S.pj,c=P.clientes.find(x=>x.id===D.id);if(!c)return;if(P.vendas.some(v=>v.clienteId===c.id)){aviso('Este cliente tem vendas no histórico e não pode ser excluído. Você ainda pode editar os dados do cadastro.');return}if(!confirm('Excluir o cadastro de '+c.nome+'? O código não será reutilizado.'))return;P.clientes=P.clientes.filter(x=>x.id!==c.id);save();render();aviso('Cadastro excluído.');return}
  if(a==='dash-drill'){const categories=String(D.cats||'').split(',').filter(Boolean);if(!categories.length)return;DASH_LANC_FILTER={label:D.label||'Gastos',month:S.mes,categories};LANC_SEARCH='';LE=null;S.v='l';render();requestAnimationFrame(()=>document.querySelector('[data-launch-filter]')?.scrollIntoView({behavior:'smooth',block:'start'}));return}
   if(a==='dash-filter-clear'){DASH_LANC_FILTER=null;LANC_SEARCH='';render();return}
   if(a==='dash-reset'){delete S[S.m].dashboardOrder;delete S[S.m].dashboardColumns;save();render();aviso('Organização inicial do Painel restaurada.');return}
  if(a==='save-modules'){garantirModulos(D.plan);clearTimeout(PMTimers[D.plan]);statusModulos(D.plan,'Salvando e confirmando…');b.disabled=true;salvarFilaModulos(D.plan).then(ok=>{b.disabled=false;statusModulos(D.plan,ok?'Salvo e confirmado.':'Falha ao salvar — veja o aviso.');if(ok)aviso('Módulos do plano '+PLANOS[D.plan].n+' salvos e confirmados.')});return}
  if(a==='wa-connect'){b.disabled=true;WA.error='';waRequest('create_pairing_code').then(x=>{WA.code=x.code;WA.expires=x.expires_at;render()}).catch(err=>{WA.error=err.message;render()});return}
  if(a==='wa-copy'){navigator.clipboard.writeText('CONECTAR '+WA.code).then(()=>aviso('Código de conexão copiado.')).catch(()=>aviso('Não foi possível copiar o código.'));return}
  if(a==='wa-refresh'){WA.loaded=false;loadWhatsApp();return}
  if(a==='wa-confirm'){b.disabled=true;confirmWhatsAppMessage(b).catch(err=>aviso(err.message||'Não foi possível confirmar a mensagem.'));return}
  if(a==='wa-discard'){b.disabled=true;waRequest('remove_pending',{id:D.id,status:'discarded'}).then(()=>{WA.items=WA.items.filter(x=>x.id!==D.id);render();aviso('Mensagem descartada.')}).catch(err=>{b.disabled=false;aviso(err.message)});return}
  if(a==='edit-series'){const x=S[S.m].l.find(l=>l.id===D.id);if(!x?.g||x.vendaId||x.cartao||x.dailySalesId){aviso('Esta repetição está vinculada a uma venda ou compra no cartão e deve ser alterada pela tela de origem.');return}LE={m:S.m,id:x.id,series:true};S.v='l';S.mes=x.d.slice(0,7);render();requestAnimationFrame(()=>{const f=$('#fm');f?.scrollIntoView({behavior:'smooth',block:'center'});f?.querySelector('[name="desc"]')?.focus()});return}
  if(a==='edit'){const x=S[S.m].l.find(l=>l.id===D.id);if(!x||x.vendaId||x.cartao||x.dailySalesId){aviso('Este lançamento está vinculado a uma venda, venda diária ou compra no cartão. Edite pela tela de origem para manter os vínculos.');return}LE={m:S.m,id:x.id};S.v='l';S.mes=x.d.slice(0,7);render();requestAnimationFrame(()=>{const f=$('#fm');f?.scrollIntoView({behavior:'smooth',block:'center'});f?.querySelector('[name="desc"]')?.focus()});return}
  if(a==='edit-cancel'){LE=null;render();return}
  if(a==='vd-edit'){const x=getDailySales().registros.find(y=>y.id===D.id);if(!x)return;VD_EDIT=x.id;S.m='pj';S.v='vd';S.mes=x.date.slice(0,7);render();requestAnimationFrame(()=>$('#daily-sales-form')?.scrollIntoView({behavior:'smooth',block:'center'}));return}
  if(a==='vd-cancel'){VD_EDIT=null;render();return}
  if(a==='vd-del'){const data=getDailySales(),x=data.registros.find(y=>y.id===D.id);if(!x)return;if(!confirm('Excluir esta venda diária e o lançamento de receita vinculado?'))return;data.registros=data.registros.filter(y=>y.id!==x.id);S.pj.l=(S.pj.l||[]).filter(y=>y.dailySalesId!==x.id);if(VD_EDIT===x.id)VD_EDIT=null;save();render();aviso('Venda diária e lançamento vinculado excluídos.');return}
  if(VD_EDIT&&(D.m||D.v&&D.v!=='vd'||['pm','nm','go','novac'].includes(a)))VD_EDIT=null;
  if(LE&&(D.m||D.v||['pm','nm','go','novac'].includes(a)))LE=null;
  if(D.m){S.m=D.m;DASH_LANC_FILTER=null}
  else if(D.v){S.v=D.v;S.pre=null}
  else if(a==='pm'){S.mes=sh(S.mes,-1);if(DASH_LANC_FILTER)DASH_LANC_FILTER.month=S.mes}
  else if(a==='nm'){S.mes=sh(S.mes,1);if(DASH_LANC_FILTER)DASH_LANC_FILTER.month=S.mes}
  else if(a==='go')S.v='l';
  else if(a==='novac'){S.pre={t:D.t};S.v='l'}
  else if(a==='demo')demo();
  else if(a==='m5r')S.pf.m5=null;
  else if(a==='ccpay'){const li=S.pf.l.filter(l=>l.cartao===D.id&&l.st==='a'&&l.d.slice(0,7)===D.mes);if(!confirm('Marcar '+li.length+(li.length===1?' lançamento':' lançamentos')+' desta fatura como pagos hoje?'))return;li.forEach(x=>{cancelarLembreteSMS(x.id);x.st='p';x.pg=today()})}
  else if(a==='ccdel'){if(!confirm('Excluir este cartão? As compras já lançadas continuam, mas sem o cartão.'))return;S.pf.cards=cards().filter(c=>c.id!==D.id)}
  else if(a==='prdados'){const a2=agg('pj',S.mes);if(!a2.rec){aviso('Não há receitas lançadas em '+ml(S.mes)+' para calcular os percentuais.');return}aviso('');const X=S.pj;X.prc=Object.assign({},PRC0,X.prc||{},{imp:Math.round(a2.ded/a2.rec*1000)/10,fix:Math.round(a2.des/a2.rec*1000)/10})}
  else if(a==='prdel'){if(D.id==='calc')S.pj.calc=null;else{if(!confirm('Remover este produto?'))return;S.pj.prod=(S.pj.prod||[]).filter(x=>x.id!==D.id)}}
  else if(a==='pay'){
    const env=S.m,x=S[env].l.find(l=>l.id===D.id);
    if(!x){aviso('Não foi possível localizar este lançamento.');return}
    const receiving=isIn(cat(env,x.c)[2]),verb=receiving?'recebimento':'pagamento',label=receiving?'recebimento':'pagamento',editingDate=x.st!=='a';
    document.querySelector('#payment-date-backdrop')?.remove();window.__mfPaymentTarget={env,id:x.id};
    document.body.insertAdjacentHTML('beforeend',`<div class="mf-date-backdrop" id="payment-date-backdrop"><section class="mf-date-card" role="dialog" aria-modal="true" aria-labelledby="payment-date-title"><h2 id="payment-date-title">${editingDate?'Editar data do':'Registrar'} ${label}</h2><p><b>${E(x.desc)}</b> · ${brl(x.v)}<br>${editingDate?'Ajuste a data real em que o '+verb+' aconteceu.':'Informe a data em que o '+verb+' aconteceu.'}</p><form id="payment-date-form"><label>Data do ${label}<input type="date" name="actualDate" value="${x.pg||today()}" max="${today()}" required></label><div class="mf-date-actions"><button type="button" data-a="payment-date-cancel">Cancelar</button><button class="pri" type="submit">${editingDate?'Salvar data':`Confirmar ${receiving?'recebimento':'pagamento'}`}</button></div></form></section></div>`);
    requestAnimationFrame(()=>document.querySelector('#payment-date-form [name="actualDate"]')?.focus());return;
  }
  else if(a==='sale-cancel'){
    const sale=(S.pj.vendas||[]).find(v=>v.id===D.id),refs=Array.isArray(sale?.recebiveis)?sale.recebiveis:[],items=refs.map(id=>S.pj.l.find(l=>l.id===id)).filter(Boolean);
    if(!sale||sale.cancelada||items.length!==refs.length||!items.length||!items.every(l=>l.st==='a')){aviso('Só é possível cancelar a venda enquanto todas as parcelas estiverem em aberto.');return}
    if(!confirm('Cancelar esta venda e remover todas as parcelas ainda em aberto de A receber?'))return;
    items.forEach(l=>cancelarLembreteSMS(l.id));S.pj.l=S.pj.l.filter(l=>!refs.includes(l.id));sale.cancelada=true;sale.canceladaEm=today();
  }
  else if(a==='of-connect'){conectarOpenFinance();return}
  else if(a==='of-sync'){consultarOpenFinance(D.id);return}
  else if(a==='of-import'){
    const preview=window.__ofPreview,accountId=window.__ofSelectedAccount,txs=(preview?.transactions||[]).filter(t=>t.accountId===accountId),bankId=$('#of-bank')?.value;
    if(S.m!=='pj'||!bankId||!txs.length){aviso('Selecione uma conta no sistema e confira as movimentações.');return}
    const checks=[...document.querySelectorAll('[data-of-row]')];let imported=0,skipped=0,last='';
    txs.forEach((t,i)=>{
      const checkbox=checks.find(c=>Number(c.dataset.ofRow)===i);
      if(!checkbox||!checkbox.checked){skipped++;return}
      if(S.pj.l.some(l=>l.ofTxId===t.id)){skipped++;return}
      const amount=Math.abs(Number(t.amount));if(!Number.isFinite(amount)||amount<=0||!/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(t.date)){skipped++;return}
      const entrada=Number(t.amount)>0;
      S.pj.l.push({id:uid(),desc:String(t.description||'Movimentação bancária').slice(0,80),v:Math.round(amount*100),c:entrada?'orec':'out',d:t.date,pg:t.date,st:'p',b:bankId,src:'openfinance',ofTxId:t.id,ofItemId:preview.item.id,ofAccountId:accountId});
      imported++;if(t.date>last)last=t.date;
    });
    if(imported){window.__ofPreview=null;save();if(last)S.mes=last.slice(0,7);aviso(imported+' movimentação(ões) importada(s). '+skipped+' não importada(s) por duplicidade ou desmarcação.');S.v='l';render();return}
    aviso('Nenhuma movimentação nova foi selecionada.');return;
  }
  else if(a==='eb')S.be=D.id;
  else if(a==='cb')S.be='';
  else if(a==='db'){if(!confirm('Excluir esta conta? Os lançamentos dela passam para a primeira conta da lista.'))return;S[S.m].bks=bancos(S.m).filter(b=>b.id!==D.id);S.be='';S.bx=''}
  else if(a==='dels'){if(!confirm('Cancelar todas as parcelas em aberto desta série? As já pagas permanecem.'))return;S[S.m].l.filter(l=>l.g===D.g&&l.st==='a').forEach(l=>cancelarLembreteSMS(l.id));S[S.m].l=S[S.m].l.filter(l=>!(l.g===D.g&&l.st==='a'))}
  else if(a==='nature-rename'){const id=D.id, input=document.querySelector(`[data-nature-name="${CSS.escape(id)}"]`),name=(input?.value||'').trim();if(!name){aviso('Informe um nome para a natureza.');return}const ns=ensureNatureList(S.m),n=ns.find(x=>x.id===id);if(!n)return;if(ns.some(x=>x.id!==id&&x.name.trim().toLocaleLowerCase('pt-BR')===name.toLocaleLowerCase('pt-BR'))){aviso('Já existe uma natureza com esse nome.');return}n.name=name;save();render();aviso('Nome da natureza atualizado. A classificação dos cálculos foi preservada.');return}
  else if(a==='nature-del'){const id=D.id,ns=ensureNatureList(S.m),n=ns.find(x=>x.id===id);if(!n||n.locked){aviso('As naturezas padrão não podem ser excluídas.');return}if((S[S.m].groups||[]).some(g=>(g.natureId||g.nature)===id)){aviso('Esta natureza está vinculada a um grupo. Altere a natureza do grupo antes de excluir.');return}S[S.m].natures=ns.filter(x=>x.id!==id);save();render();aviso('Natureza excluída.');return}
  else if(a==='cat-save'){const id=D.id,input=document.querySelector(`[data-cat-name="${CSS.escape(id)}"]`),groupInput=document.querySelector(`[data-cat-group="${CSS.escape(id)}"]`),name=(input?.value||'').trim().replace(/\s+/g,' '),group=catGroupsFor(S.m).find(g=>g.id===groupInput?.value),entry=catsFor(S.m).find(c=>c[0]===id);if(!entry||!group||!name){aviso('Confira o nome e o grupo da categoria.');return}const norm=s=>String(s).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('pt-BR').trim();if(catsFor(S.m).some(c=>c[0]!==id&&norm(c[1])===norm(name))){aviso('Já existe uma categoria com esse nome neste ambiente.');return}const base=group.base,groupId=group.custom?group.id:null,custom=(S[S.m].cats||[]).find(c=>c[0]===id);if(custom){custom[1]=name;custom[2]=base;custom[3]=groupId}else{S[S.m].catOverrides=S[S.m].catOverrides||{};S[S.m].catOverrides[id]={name,base,groupId}}save();render();aviso('Categoria atualizada. Os lançamentos anteriores continuam vinculados a ela.');return}
  else if(a==='cat-del'){const id=D.id;if(S[S.m].l.some(l=>l.c===id)){aviso('Esta categoria está ligada a lançamentos. Mova esses lançamentos para outra categoria antes de excluí-la.');return}if(CFG[S.m].c.some(c=>c[0]===id)){S[S.m].hiddenCats=S[S.m].hiddenCats||[];if(!S[S.m].hiddenCats.includes(id))S[S.m].hiddenCats.push(id)}else S[S.m].cats=(S[S.m].cats||[]).filter(c=>c[0]!==id);save();render();aviso('Categoria excluída.');return}
  else if(a==='pf-organize-needs'){
    const pending=catsInGroup('pf',{id:'nec',custom:false});if(!pending.length){aviso('Não há categorias em Necessidades para organizar.');return}
    const norm=s=>String(s).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('pt-BR').trim();
    const groups=S.pf.groups=S.pf.groups||[];
    pending.forEach(c=>{
      let name=suggestedNeedGroup(c[1]);
      let group=groups.find(g=>norm(g.name)===norm(name)&&catGroupBase('pf',g.nature||natureById('pf',g.natureId).base)==='des');
      if(!group){let finalName=name;if(catGroupsFor('pf').some(g=>norm(g.name)===norm(finalName)))finalName=name+' (gastos)';let suffix=2;while(catGroupsFor('pf').some(g=>norm(g.name)===norm(finalName))){finalName=name+' (gastos '+suffix+')';suffix++}group={id:'group_'+uid(),name:finalName,nature:'des',natureId:'des'};groups.push(group)}
      const custom=(S.pf.cats||[]).find(item=>item[0]===c[0]);
      if(custom){custom[2]='des';custom[3]=group.id}else{S.pf.catOverrides=S.pf.catOverrides||{};S.pf.catOverrides[c[0]]={...(S.pf.catOverrides[c[0]]||{}),base:'des',groupId:group.id}}
    });
    save();render();aviso(pending.length+' categoria(s) separada(s) em grupos próprios. Os lançamentos antigos foram mantidos.');return
  }
  else if(a==='group-title-rename'){const id=D.id,current=catGroupsFor(S.m).find(g=>g.id===id);if(!current)return;const name=(prompt('Novo nome para o grupo:',current.name)||'').trim().replace(/\s+/g,' ');if(!name)return;if(name.length>45){aviso('Use até 45 caracteres no nome do grupo.');return}const norm=s=>String(s).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('pt-BR').trim();if(catGroupsFor(S.m).some(g=>g.id!==id&&norm(g.name)===norm(name))){aviso('Já existe um grupo com esse nome neste ambiente.');return}const entry=(S[S.m].groups||[]).find(g=>g.id===id);if(entry)entry.name=name;else{S[S.m].groupNames=S[S.m].groupNames||{};S[S.m].groupNames[id]=name}save();render();aviso('Grupo renomeado. As categorias e os lançamentos continuam vinculados.');return}
  else if(a==='group-rename'){const id=D.id,input=document.querySelector(`[data-group-name="${CSS.escape(id)}"]`),name=(input?.value||'').trim().replace(/\s+/g,' '),entry=(S[S.m].groups||[]).find(g=>g.id===id);if(!entry||!name){aviso('Informe um nome para o grupo.');return}const norm=s=>String(s).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('pt-BR').trim();if(catGroupsFor(S.m).some(g=>g.id!==id&&norm(g.name)===norm(name))){aviso('Já existe um grupo com esse nome neste ambiente.');return}entry.name=name;save();render();aviso('Grupo renomeado. As categorias e os lançamentos permanecem vinculados.');return}
  else if(a==='group-del'){const id=D.id;if(catsFor(S.m).some(c=>c[3]===id)){aviso('Este grupo tem categorias associadas. Mova essas categorias para outro grupo antes de excluir.');return}S[S.m].groups=(S[S.m].groups||[]).filter(g=>g.id!==id);save();render();return}
  else if(a==='type-del'){const id=D.id;S[S.m].types=(S[S.m].types||[]).filter(t=>t!==id);save();render();return}
  else if(a==='workbook-import-cancel'){window.__mfWorkbookPlan=null;window.__mfCorrectionPlan=null;render();return}
  else if(a==='workbook-correction-confirm'){
    const plan=window.__mfCorrectionPlan,P=S.pj,imported=P?.workbookImports?.find(x=>x.importId===plan?.sourceImportId);
    if(!plan||plan.schema!=='mesa-financeira-workbook-corrections-v1'||!USER||USER.id!==plan.targetUserId||S.m!=='pj'||!KEY.pj||!imported){aviso('Abra e desbloqueie o ambiente PJ da conta que recebeu a importação original e carregue novamente o arquivo de correção.');return}
    if(imported.corrections?.includes(plan.correctionId)){aviso('Este arquivo de correção já foi aplicado.');return}
    const fmt=d=>String(d||'').split('-').reverse().join('/'),targets=plan.corrections.map(src=>{
      const x=P.l?.find(item=>item.id==='xls_'+src.sourceId),obs=String(x?.obs||''),oldDate=`Data registrada na planilha: ${fmt(src.expected.date)}`,newDate=`Data registrada na planilha: ${fmt(src.updated.date)}`;
      const ok=!!x&&x.sourceImportId===plan.sourceImportId&&Math.abs(x.v)===src.amount&&x.desc===src.description.slice(0,80)&&[src.expected.dueDate,src.updated.dueDate].includes(x.d)&&[src.expected.status,src.updated.status].includes(x.st)&&(obs.includes(oldDate)||obs.includes(newDate));
      return{src,x,ok};
    });
    if(!targets.every(x=>x.ok)){aviso('Os lançamentos foram alterados desde a conferência. Nenhuma correção foi aplicada; recarregue o arquivo para revisar.');return}
    const backup=JSON.parse(JSON.stringify(P)),toCancel=[];
    targets.forEach(({src,x})=>{
      if(x.st==='a'&&src.updated.status==='p')toCancel.push(x.id);
      x.d=src.updated.dueDate;x.st=src.updated.status;
      if(src.updated.status==='a')delete x.pg;
      const prefix=`Data registrada na planilha: ${fmt(src.updated.date)}`,pattern=/Data registrada na planilha: \d{2}\/\d{2}\/\d{4}/;
      x.obs=pattern.test(String(x.obs||''))?String(x.obs).replace(pattern,prefix):[prefix,String(x.obs||'')].filter(Boolean).join(' · ');
    });
    imported.corrections=Array.isArray(imported.corrections)?imported.corrections:[];imported.corrections.push(plan.correctionId);imported.lastCorrectionAt=new Date().toISOString();
    if(!await persist('pj')){S.pj=backup;return}
    toCancel.forEach(cancelarLembreteSMS);window.__mfCorrectionPlan=null;LANC_SEARCH='';S.v='l';S.m='pj';render();aviso(`${targets.length} lançamento(s) corrigido(s) sem duplicar despesas ou vendas. Datas reais de pagamento/recebimento não foram presumidas.`);return;
  }
  else if(a==='workbook-import-confirm'){
    const plan=window.__mfWorkbookPlan;
    if(!plan||plan.schema!=='mesa-financeira-workbook-import-v1'){aviso('Carregue novamente o arquivo preparado da planilha.');return}
    if(!USER||USER.id!==plan.targetUserId){aviso('Esta importação foi preparada para outro usuário. Nenhum dado foi salvo.');return}
    if(S.m!=='pj'||!KEY.pj){aviso('Abra e desbloqueie o ambiente PJ desta conta antes de importar.');return}
    S.pj.workbookImports=Array.isArray(S.pj.workbookImports)?S.pj.workbookImports:[];
    if(S.pj.workbookImports.some(x=>x.importId===plan.importId)){aviso('Este arquivo já foi importado nesta conta; nenhum dado foi duplicado.');return}
    const daily=getDailySales(),collisions=plan.sales.filter(x=>daily.registros.some(y=>y.date===x.date&&y.unitId===x.unitId));
    if(collisions.length){aviso(`Importação interrompida: ${collisions.length} dia(s) já têm vendas registradas para a mesma unidade. Revise esses dias antes de importar para evitar duplicidade.`);return}
    const validDate=d=>/^\d{4}-\d{2}-\d{2}$/.test(d||'')&&!Number.isNaN(new Date(d+'T00:00:00').getTime())&&new Date(d+'T00:00:00').toISOString().slice(0,10)===d;
    if(plan.sales.some(x=>!validDate(x.date)||!['matriz','oliveira'].includes(x.unitId)||['cash','pix','card','credit','check','total'].some(k=>!Number.isSafeInteger(x[k])||x[k]<0)||x.total!==x.cash+x.pix+x.card+x.credit+x.check)||plan.expenses.some(x=>!validDate(x.date)||!validDate(x.dueDate)||!Number.isSafeInteger(x.amount)||x.amount<=0||!['a','p'].includes(x.status))){aviso('O conteúdo da planilha preparada tem campos inválidos. Nenhum dado foi salvo.');return}
    const backup=JSON.parse(JSON.stringify(S.pj)),timestamp=new Date().toISOString();
    try{
      const P=S.pj,store=getDailySales();
      for(const src of plan.sales){
        if(!store.unidades.some(x=>x.id===src.unitId))store.unidades.push({id:src.unitId,nome:src.unitName||src.unitId});
        const id='xls_'+src.sourceId,record={id,date:src.date,unitId:src.unitId,cash:src.cash,pix:src.pix,card:src.card,credit:src.credit,check:src.check,total:src.total,sourceImportId:plan.importId,sourceRowIds:src.sourceRows||[]};
        store.registros.push(record);
        P.l=P.l||[];P.l.push({id:'xls_ledger_'+src.sourceId,dailySalesId:id,src:'workbook-import',sourceImportId:plan.importId,desc:'Vendas diárias · '+(src.unitName||src.unitId),v:src.total,c:'ven',d:src.date,st:'p',pg:src.date,b:bancos('pj')[0]?.id||''});
      }
      P.l=P.l||[];
      for(const src of plan.expenses){
        const details=[`Data registrada na planilha: ${src.date.split('-').reverse().join('/')}`,src.sourceCategory?`Categoria original: ${src.sourceCategory}`:'Categoria a classificar',src.paymentType?`Tipo: ${src.paymentType}`:'',src.notes?`Observação da planilha: ${src.notes}`:''].filter(Boolean).join(' · ');
        P.l.push({id:'xls_'+src.sourceId,sourceImportId:plan.importId,src:'workbook-import',desc:src.description.slice(0,80),v:-src.amount,c:'out',d:src.dueDate||src.date,st:src.status,fornecedor:src.description.slice(0,120),tipoMov:src.paymentType||'',refPagamento:src.reference||'',obs:details});
      }
      P.workbookImports.push({importId:plan.importId,sourceName:plan.sourceName||'Planilha de vendas e despesas',importedAt:timestamp,sales:plan.sales.length,expenses:plan.expenses.length,excludedExpenses:plan.excludedExpenses.length});
      if(!await persist('pj'))throw new Error('Não foi possível confirmar o salvamento no ambiente PJ.');
      window.__mfWorkbookPlan=null;S.v='vd';S.m='pj';render();aviso(`Importação concluída: ${plan.sales.length} dias de vendas e ${plan.expenses.length} despesas salvos. ${plan.excludedExpenses.length} despesa(s) sem valor ficaram fora da importação.`);
    }catch(err){S.pj=backup;render();aviso(err.message||'Não foi possível concluir a importação. Os dados desta tentativa foram revertidos na tela.');}
    return;
  }
  else if(a==='import-cancel'){window.__mfImportRows=[];render();return}
  else if(a==='import-ai-suggest'){
    const rows=window.__mfImportRows||[];if(!sb||!USER){aviso('Entre na sua conta para usar as sugestões de categoria.');return}
    b.disabled=true;b.textContent='Analisando…';aviso('');
    try{
      const transactions=rows.slice(0,100).map((x,index)=>({index,direction:document.querySelector(`[data-import-direction="${index}"]`)?.value||(Number(x.signed)>0?'entrada':'saida'),description:String(x.desc||'').slice(0,120)}));
      const categories=catsFor(S.m).map(c=>({id:c[0],name:c[1],group:catGroupsFor(S.m).find(g=>g.custom?g.id===c[3]:!c[3]&&g.base===c[2])?.name||groupName(S.m,c[2]),direction:isIn(catGroupBase(S.m,c[2]))?'entrada':'saida'}));
      const {data,error}=await sb.functions.invoke('ai-categorize-import',{body:{transactions,categories}});
      if(error)throw new Error(data?.error?.message||'Não foi possível pedir sugestões à IA. Confira se a função está publicada e se OPENAI_API_KEY está nos Secrets do Supabase.');
      if(data?.error)throw new Error(data.error.message||'A IA não conseguiu sugerir categorias.');
      let applied=0;for(const suggestion of (data?.suggestions||[])){const index=Number(suggestion.index),row=rows[index],direction=transactions[index]?.direction,allowed=importCategories(direction);if(!row||!allowed.some(c=>c[0]===suggestion.categoryId))continue;row._cat=suggestion.categoryId;row._aiReason=String(suggestion.reason||'Sugestão da IA').slice(0,100);const select=document.querySelector(`[data-import-category="${index}"]`);if(select)select.value=row._cat;const note=document.querySelector(`[data-import-ai-note="${index}"]`);if(note)note.textContent='Sugestão da IA · '+row._aiReason;applied++}
      aviso(applied+' sugestão(ões) de categoria aplicadas à prévia. Revise antes de importar.');
    }catch(err){aviso(err.message||'Não foi possível sugerir categorias.');}
    finally{b.disabled=false;b.textContent='Sugerir categorias com IA'}return;
  }
  else if(a==='import-confirm'){const rows=window.__mfImportRows||[],checks=[...document.querySelectorAll('[data-import-row]')];let count=0,skipped=0;rows.forEach((x,i)=>{const checkbox=checks.find(c=>Number(c.dataset.importRow)===i);if(checkbox&&!checkbox.checked){skipped++;return}if(!x||!x.d||!x.desc||!(Math.abs(Number(x.v))>0))return;const dir=document.querySelector(`[data-import-direction="${i}"]`)?.value||(Number(x.signed)>0?'entrada':'saida'),amount=Math.abs(Number(x.v))*(dir==='entrada'?1:-1),selected=document.querySelector(`[data-import-category="${i}"]`)?.value||x._cat,category=importCategories(dir).some(c=>c[0]===selected)?selected:importFallbackCategory(dir);if(!category){skipped++;return}S[S.m].l.push({id:'imp_'+Date.now().toString(36)+'_'+Math.random().toString(36).slice(2,7),d:x.d,desc:x.desc.slice(0,80),v:amount,c:category,st:'p',b:bancos(S.m)[0]?.id||'',src:'import'});count++});window.__mfImportRows=[];save();aviso(count+' lançamento(s) importado(s) com as categorias revisadas. '+skipped+' ignorado(s), incluindo possíveis duplicados desmarcados.');S.v='l';render();return}
  else if(a==='ver'){abrir(D.p);return}
  else if((a==='att'||a==='ver')&&!tem(2)){aviso('Comprovantes fazem parte do plano Gestão.');return}
  else if(a==='csv'){csv();return}
  else if(a==='admr'){ADL=null;SALVO=''}
  else if(a==='admsv'){
    const id=D.id,pl=document.querySelector('[data-pl="'+id+'"]').value,vd=document.querySelector('[data-vd="'+id+'"]').value||null;
    sb.rpc('admin_definir_plano',{p_user:id,p_plano:pl,p_valido:vd}).then(r=>{
      if(r.error){aviso('Não foi possível salvar: '+r.error.message);return}
      aviso('');const x=ADL.find(u=>u.user_id===id);if(x){x.plano=pl;x.valido_ate=vd}SALVO=id;render();
    });
    return;
  }
  else if(a==='att'){$('#fi').dataset.id=D.id;$('#fi').click();return}
  else if(a==='del'){const x=S[S.m].l.find(l=>l.id===D.id);if(x?.vendaId){aviso('Esta parcela está vinculada a uma venda. Cancele pela aba Vendas enquanto todas as parcelas estiverem em aberto.');return}if(x?.dailySalesId){aviso('Esta receita está vinculada a uma venda diária. Edite ou exclua pela aba Vendas diárias.');return}if(!x)return;if(!confirm('Excluir “'+x.desc+'” · '+x.d.slice(8,10)+'/'+x.d.slice(5,7)+'/'+x.d.slice(0,4)+' · '+brl(x.v)+'?'))return;cancelarLembreteSMS(D.id);if(x.a&&sb)sb.storage.from('comprovantes').remove([x.a.p]);S[S.m].l=S[S.m].l.filter(l=>l.id!==D.id)}
  else if(a==='clr'){if(!confirm('Apagar todos os dados de '+CFG[S.m].nome+'? Esta ação não pode ser desfeita.'))return;S[S.m]={l:[],cx:0,bks:[]}}
  save();render();
});
document.addEventListener('change',e=>{
 if(e.target.matches('[data-import-direction]')){const index=Number(e.target.dataset.importDirection),row=(window.__mfImportRows||[])[index];if(row){const direction=e.target.value,select=document.querySelector(`[data-import-category="${index}"]`),allowed=importCategories(direction);if(!allowed.some(c=>c[0]===select?.value)){row._cat=importFallbackCategory(direction);if(select)select.innerHTML=importCategoryOptions(direction,row._cat)}row._aiReason='';const note=document.querySelector(`[data-import-ai-note="${index}"]`);if(note)note.textContent='Confira a categoria'}return}
 if(e.target.matches('[data-import-category]')){const index=Number(e.target.dataset.importCategory),row=(window.__mfImportRows||[])[index];if(row){row._cat=e.target.value;row._aiReason='';const note=document.querySelector(`[data-import-ai-note="${index}"]`);if(note)note.textContent='Categoria revisada por você'}return}
  if(e.target.name==='tipoPessoa'){const pj=e.target.value==='juridica',label=document.querySelector('#client-document-label'),doc=document.querySelector('#client-documento'),lookup=document.querySelector('[data-a="client-cnpj-lookup"]'),ie=document.querySelector('#client-ie-actions'),status=document.querySelector('#client-cnpj-status');if(label)label.textContent=pj?'CNPJ / CPF':'CPF';if(doc){doc.maxLength=pj?14:11;doc.placeholder=pj?'Somente números (CNPJ)':'Somente números (CPF)';doc.value=doc.value.replace(/\D/g,'').slice(0,pj?14:11)}if(lookup)lookup.hidden=!pj;if(ie)ie.hidden=!pj;if(status)status.hidden=true;return}
  const overviewMonth=e.target.closest('[data-overview-month]');if(overviewMonth){CV_MES=overviewMonth.value;render();return}
  const consultaMes=e.target.closest('[data-query-month]');if(consultaMes){if(consultaMes.dataset.queryMonth==='receive')MES_ARECEBER=consultaMes.value;else MES_APAGAR=consultaMes.value;render();return}
  const direction=e.target.closest('[data-direction-select]');if(direction){const c=direction.form?.querySelector('[name="c"]');if(!c)return;const income=direction.value==='receber';[...c.querySelectorAll('optgroup[data-direction]')].forEach(g=>{g.hidden=(g.dataset.direction==='receber')!==income});if(c.selectedOptions[0]?.parentElement?.hidden){const first=[...c.querySelectorAll('optgroup[data-direction]')].find(g=>!g.hidden)?.querySelector('option');if(first)c.value=first.value}return}
  const pm=e.target.closest('[data-plan-module]');if(pm){const plan=pm.dataset.plan;garantirModulos(plan);PM[plan][pm.dataset.module]=pm.checked;PMRev[plan]=(PMRev[plan]||0)+1;statusModulos(plan,'Salvando alteração…');clearTimeout(PMTimers[plan]);PMTimers[plan]=setTimeout(()=>salvarFilaModulos(plan).then(ok=>statusModulos(plan,ok?'Alteração salva.':'Falha ao salvar — veja o aviso.')),350);return}
 const sel=e.target.closest('[data-group-nature]');if(!sel)return;
 const id=sel.dataset.groupNature, natureId=sel.value, group=(S[S.m].groups||[]).find(g=>g.id===id);if(!group)return;
 const def=natureById(S.m,natureId);group.natureId=def.id;group.nature=def.base;
 // Preserve the accounting base used by existing calculations and linked categories.
 (S[S.m].cats||[]).forEach(c=>{if(c[3]===id)c[2]=catGroupBase(S.m,def.base)});
 Object.values(S[S.m].catOverrides||{}).forEach(c=>{if(c.groupId===id)c.base=catGroupBase(S.m,def.base)});
 save();render();aviso('Natureza financeira atualizada; os cálculos continuam usando a classificação-base.');
});


function sameOccurrence(a,b){return a.d===b.d&&a.c===b.c&&a.v===Math.abs(Number(b.v))&&normMov(String(a.desc).replace(/\s+\(\d+\/\d+\)$/,''))===normMov(String(b.desc||'').replace(/\s+\(\d+\/\d+\)$/,''))}
async function salvarFormularioLancamento(f){
 if(LANC_BUSY)return;LANC_BUSY=true;const env=S.m,backup=JSON.parse(JSON.stringify(S[env]));
 const buttons=[...f.querySelectorAll('button')];buttons.forEach(b=>b.disabled=true);
 let committed=false;const commit=async()=>{if(await persist(env)){committed=true;return true}S[env]=backup;AC={};UNSAVED.delete(env);const er=f.querySelector('#er');if(er){er.textContent='Não foi possível gravar. A alteração não foi aplicada; mantenha este formulário aberto e confira o aviso acima.';er.hidden=false}return false};
 try{
  const v=val(f.v.value);
  const er=$('#er');
  if(v<=0){er.textContent='Digite um valor maior que zero, por exemplo 1.250,00.';er.hidden=false;return}
  if(LE?.m===env){
    const x=S[env].l.find(l=>l.id===LE.id),date=f.d.value,dateOk=validDate(date);
    if(!x||x.vendaId||x.cartao||x.dailySalesId){LE=null;aviso('Este lançamento é gerenciado pela tela de origem e não pode ser editado aqui.');render();return}
    if(!f.desc.value.trim()||!dateOk||!f.c.value||((f.direction.value==='receber')!==isIn(cat(env,f.c.value)[2]))){er.textContent='Confira a descrição, o valor, a categoria, o tipo de conta e a data.';er.hidden=false;return}
    if(LE.series){
      const open=S[env].l.filter(y=>y.g===x.g&&y.st==='a');
      if(!open.length){er.textContent='Esta repetição não tem parcelas em aberto para atualizar.';er.hidden=false;return}
      const series=S[env].l.filter(y=>y.g===x.g),categoryChanged=series.some(y=>y.c!==f.c.value);
      const seriesName=x.desc.replace(/\s+\(\d+\/\d+\)$/,'');
      if(!confirm(`Atualizar ${open.length} parcela(s) em aberto da repetição “${seriesName}”? A data será recalculada mês a mês a partir da parcela selecionada.${categoryChanged?` A nova categoria será aplicada às ${series.length} parcelas, inclusive às já pagas.`:''}`))return;
      const monthIndex=d=>Number(d.slice(0,4))*12+Number(d.slice(5,7)),anchorMonth=monthIndex(x.d);
      open.forEach(y=>{const delta=monthIndex(y.d)-anchorMonth,match=y.desc.match(/\s+\((\d+)\/(\d+)\)$/);Object.assign(y,{desc:(f.desc.value.trim()+(match?` (${match[1]}/${match[2]})`:'' )).slice(0,80),v,c:f.c.value,d:addM(date,delta),tipoMov:f.movtype.value,b:f.conta?f.conta.value:y.b})});
      if(categoryChanged)series.forEach(y=>{y.c=f.c.value});
      if(!await commit())return;await Promise.all(open.map(y=>cancelarLembreteSMS(y.id)));LE=null;S.pre=null;S.mes=date.slice(0,7);render();aviso(`Repetição salva: ${open.length} parcela(s) em aberto atualizadas.${categoryChanged?" A categoria das parcelas pagas também foi atualizada.":" Valores e datas das parcelas pagas foram mantidos."}`);return;
    }
    if(f.elements.editRep?.value==='r'){
      const months=parseInt(f.elements.editMonths.value,10),baseDesc=f.desc.value.trim();
      if(!(months>=2&&months<=120)){er.textContent='Informe de 2 a 120 meses para criar a recorrência.';er.hidden=false;return}
      if(!confirm(`Transformar esta conta em uma recorrência mensal de ${months} meses? A conta atual será a primeira; ${months-1} nova(s) conta(s) em aberto serão criadas nos meses seguintes.`))return;
      const baseNorm=normMov(baseDesc),collision=Array.from({length:months-1},(_,index)=>addM(date,index+1)).some(due=>S[env].l.some(y=>y.id!==x.id&&y.d===due&&y.c===f.c.value&&Math.abs(Number(y.v))===v&&normMov(String(y.desc||'').replace(/\s+\(\d+\/\d+\)$/,''))===baseNorm));
      if(collision){er.textContent='Já existe uma conta com o mesmo nome, categoria e valor em um dos vencimentos futuros. Nada foi repetido; confira os lançamentos antes de tentar novamente.';er.hidden=false;return}
      const groupId=uid(),oldStatus=x.st,oldDate=x.pg||x.d;
      Object.assign(x,{desc:(baseDesc+` (1/${months})`).slice(0,80),v,c:f.c.value,d:date,st:oldStatus,tipoMov:f.movtype.value,b:f.conta?f.conta.value:x.b,g:groupId});
      if(f.fornecedor)Object.assign(x,{fornecedor:f.fornecedor.value.trim(),refPagamento:f.refPagamento.value.trim(),obs:f.obs.value.trim()});
      if(oldStatus==='a')delete x.pg;else x.pg=oldDate;
      const future=[];for(let i=1;i<months;i++)future.push({id:uid(),desc:(baseDesc+` (${i+1}/${months})`).slice(0,80),v,c:f.c.value,d:addM(date,i),st:'a',b:x.b,tipoMov:x.tipoMov,g:groupId});
      S[env].l.push(...future);if(!await commit())return;await cancelarLembreteSMS(x.id);LE=null;S.pre=null;S.mes=date.slice(0,7);render();aviso(`Recorrência criada: ${months} meses no total, incluindo esta conta. As ${future.length} próximas foram adicionadas em aberto.`);return;
    }

    Object.assign(x,{desc:f.desc.value.trim(),v,c:f.c.value,d:date,st:f.st.value,tipoMov:f.movtype.value,b:f.conta?f.conta.value:x.b});
    if(f.fornecedor)Object.assign(x,{fornecedor:f.fornecedor.value.trim(),refPagamento:f.refPagamento.value.trim(),obs:f.obs.value.trim()});
    if(x.st==='a')delete x.pg;else if(!x.pg||x.st!=='a')x.pg=x.pg||today();
    if(!await commit())return;await cancelarLembreteSMS(x.id);LE=null;S.pre=null;S.mes=date.slice(0,7);render();aviso('Lançamento salvo.');return;
  }
  const rp=f.rep.value==='r'?'r':(tem(2)&&f.rep.value==='d'?'d':'u'),n=rp==='u'?1:parseInt(f.n.value,10);
  if(rp!=='u'&&!(n>=2&&n<=120)){er.textContent='Informe de 2 a 120 meses para repetir.';er.hidden=false;return}
  if(!f.desc.value.trim()||!validDate(f.d.value)||!catsFor(env).some(c=>c[0]===f.c.value)||((f.direction.value==='receber')!==isIn(cat(env,f.c.value)[2]))){er.textContent='Confira descrição, categoria, tipo de conta e data.';er.hidden=false;return}
  if(rp==='d'&&v<n){er.textContent='O valor total precisa permitir ao menos R$ 0,01 por parcela.';er.hidden=false;return}
  const planned=gerar({desc:f.desc.value.trim(),v,c:f.c.value,d:f.d.value,st:f.st.value,rep:rp,n});
  if(planned.some(p=>S[env].l.some(y=>sameOccurrence(p,y)))){er.textContent='Já existe uma conta com o mesmo nome, valor, categoria e vencimento. Confira os lançamentos antes de repetir.';er.hidden=false;return}
  let a=null;
  if(f.arq&&f.arq.files[0]){a=await subir(f.arq.files[0]);if(!a)return}
  const novos=gerar({desc:f.desc.value.trim(),v,c:f.c.value,d:f.d.value,st:f.st.value,b:f.conta?f.conta.value:undefined,tipoMov:f.movtype?f.movtype.value:'',a,rep:rp,n});
  if(f.fornecedor)novos.forEach(x=>Object.assign(x,{fornecedor:f.fornecedor.value.trim(),refPagamento:f.refPagamento.value.trim(),obs:f.obs.value.trim()}));
  S[env].l.push(...novos);
  if(f.smslembrete.value&&f.st.value!=='a'){
    er.textContent='Lembretes por SMS só podem ser criados para contas em aberto.';er.hidden=false;S[env].l=S[env].l.filter(x=>!novos.some(n=>n.id===x.id));return
  }
  if(f.smslembrete.value&&f.st.value==='a'){
    const phone=f.smsphone.value.trim().replace(/[\s().-]/g,'');
    if(!f.smsconsent.checked){er.textContent='Confirme que este número autorizou o recebimento de lembretes.';er.hidden=false;S[env].l=S[env].l.filter(x=>!novos.some(n=>n.id===x.id));return}
    if(!/^\+[1-9]\d{7,14}$/.test(phone)){er.textContent='Para criar o lembrete, informe o celular com código do país e DDD, como +5511912345678.';er.hidden=false;S[env].l=S[env].l.filter(x=>!novos.some(n=>n.id===x.id));return}
    if(!sb||!USER){er.textContent='Entre na sua conta para salvar um lembrete por SMS.';er.hidden=false;S[env].l=S[env].l.filter(x=>!novos.some(n=>n.id===x.id));return}
    const rows=novos.filter(x=>x.st==='a').map(x=>{
      const [yy,mm,dd]=x.d.split('-').map(Number),when=new Date(yy,mm-1,dd-(f.smslembrete.value==='before'?1:0),9,0,0,0);
      return{user_id:USER.id,transaction_id:x.id,phone_e164:phone,send_at:when.toISOString(),kind:isIn(cat(env,x.c)[2])?'receber':'pagar',status:'pending'};
    }).filter(x=>new Date(x.send_at)>new Date());
    if(!rows.length){er.textContent='O horário do lembrete já passou. Escolha uma data de vencimento futura.';er.hidden=false;S[env].l=S[env].l.filter(x=>!novos.some(n=>n.id===x.id));return}
    if(!await commit())return;
    if(rows.length){const rr=await sb.from('lembretes_sms').insert(rows);if(rr.error){S.pre=null;S.mes=f.d.value.slice(0,7);render();aviso('As contas foram salvas, mas os lembretes SMS não foram criados. Confira os lembretes.');return}}
  }
  if(!f.smslembrete.value&&!await commit())return;S.pre=null;S.mes=f.d.value.slice(0,7);render();aviso('Lançamentos salvos.');
 }catch(_){if(!committed){S[env]=backup;AC={}}aviso(committed?'As contas foram salvas, mas uma ação adicional falhou. Confira os lembretes antes de tentar novamente.':'Não foi possível concluir. Confira a conexão antes de tentar novamente.')}
 finally{LANC_BUSY=false;buttons.forEach(b=>b.disabled=false)}
}

document.addEventListener('submit',async e=>{
 if(e.target.id==='workbook-import-form'){
   e.preventDefault();
   const file=$('#workbook-import-file')?.files?.[0];
   if(file){
     try{
       const candidate=JSON.parse(await file.text());
       if(candidate?.schema==='mesa-financeira-workbook-corrections-v1'){
         e.preventDefault();const host=$('#workbook-import-preview'),plan=candidate;
         if(plan.environment!=='pj'||!plan.targetUserId||!plan.sourceImportId||!plan.correctionId||!Array.isArray(plan.corrections)||!plan.summary)throw new Error('O arquivo de correção está incompleto.');
         const imported=(S.pj?.workbookImports||[]).find(x=>x.importId===plan.sourceImportId),already=!!imported?.corrections?.includes(plan.correctionId),rightUser=USER?.id===plan.targetUserId;
         const fmt=d=>String(d||'').split('-').reverse().join('/'),matches=plan.corrections.map(src=>{
           const x=S.pj?.l?.find(item=>item.id==='xls_'+src.sourceId),obs=String(x?.obs||''),dateOld=`Data registrada na planilha: ${fmt(src.expected.date)}`,dateNew=`Data registrada na planilha: ${fmt(src.updated.date)}`;
           return !!x&&x.sourceImportId===plan.sourceImportId&&Math.abs(x.v)===src.amount&&x.desc===src.description.slice(0,80)&&[src.expected.dueDate,src.updated.dueDate].includes(x.d)&&[src.expected.status,src.updated.status].includes(x.st)&&(obs.includes(dateOld)||obs.includes(dateNew));
         });
         const safe=matches.every(Boolean),statusName=s=>s==='p'?'Pago':'Pendente',rows=plan.corrections.map(src=>`<li><b>${E(src.description)}</b> · ${src.changedFields.map(field=>field==='status'?`${statusName(src.expected.status)} → ${statusName(src.updated.status)}`:field==='dueDate'?`vencimento ${E(fmt(src.expected.dueDate))} → ${E(fmt(src.updated.dueDate))}`:`data registrada ${E(fmt(src.expected.date))} → ${E(fmt(src.updated.date))}`).join(' · ')}</li>`).join('');
         window.__mfCorrectionPlan=plan;
         host.innerHTML=`<h3>Conferir correções da planilha</h3><p><b>${safeSummaryNumber(plan.summary.records)}</b> lançamento(s) localizado(s) da importação original.</p><p class="cap">${safeSummaryNumber(plan.summary.statusChanges)} status atualizado(s) para o que consta na planilha · ${safeSummaryNumber(plan.summary.dueDateChanges)} vencimento(s) corrigido(s) · ${safeSummaryNumber(plan.summary.recordDateChanges)} data(s) registrada(s) corrigida(s). A data real do pagamento não será inventada; use “Editar data” para informá-la.</p><details><summary>Ver lançamentos e alterações</summary><ul>${rows}</ul></details>${!rightUser?'<p class="neg" role="alert">Este arquivo foi preparado para outro usuário.</p>':''}${!imported?'<p class="neg" role="alert">A importação original não foi encontrada nesta conta. As correções não podem ser aplicadas.</p>':''}${!safe?'<p class="neg" role="alert">Alguns lançamentos não correspondem ao registro original. Nada será alterado; revise a conta e a importação.</p>':''}${already?'<p class="neg" role="alert">Este arquivo de correção já foi aplicado.</p>':''}<button class="pri" data-a="workbook-correction-confirm" ${rightUser&&imported&&safe&&!already&&S.m==='pj'&&KEY.pj?'':'disabled'}>Aplicar correções sem duplicar lançamentos</button> <button data-a="workbook-import-cancel">Cancelar</button>`;
         return;
       }
     }catch(err){if(err?.message==='O arquivo de correção está incompleto.'){e.preventDefault();$('#workbook-import-preview').innerHTML='<p class="neg">'+E(err.message)+'</p>';return}}
   }
 }
 if(e.target.id==='payment-date-form'){
   e.preventDefault();const target=window.__mfPaymentTarget,form=e.target,date=form.elements.actualDate.value;
   if(!target){document.querySelector('#payment-date-backdrop')?.remove();aviso('Não foi possível localizar o lançamento.');return}
   const {env,id}=target,x=S[env]?.l.find(l=>l.id===id),valid=validDate(date)&&date<=today();
   if(!x){aviso('Não foi possível localizar este lançamento. Atualize a tela e tente novamente.');return}
   if(!valid){aviso('Informe uma data válida, até hoje.');return}
   if(form.dataset.saving)return;form.dataset.saving='true';const submit=form.querySelector('[type=submit]');if(submit)submit.disabled=true;
   const oldStatus=x.st,oldDate=x.pg;x.st='p';x.pg=date;
   const ok=await persist(env);
   if(!ok){x.st=oldStatus;if(oldDate===undefined)delete x.pg;else x.pg=oldDate;UNSAVED.delete(env);delete form.dataset.saving;if(submit)submit.disabled=false;return}
   if(oldStatus==='a')await cancelarLembreteSMS(x.id);window.__mfPaymentTarget=null;document.querySelector('#payment-date-backdrop')?.remove();render();aviso(`${oldStatus==='a'?'':`Data do ${isIn(cat(env,x.c)[2])?'recebimento':'pagamento'} ajustada para `}${date.split('-').reverse().join('/')}.`);return;
 }
 if(e.target.id==='daily-sales-units-form'){
   e.preventDefault();const data=getDailySales(),f=e.target,names=[f.unit1.value.trim(),f.unit2.value.trim()];
   if(!names.every(Boolean)||names[0].toLocaleLowerCase('pt-BR')===names[1].toLocaleLowerCase('pt-BR')){aviso('Informe dois nomes de unidade diferentes.');return}
   data.unidades=[{id:data.unidades[0]?.id||'matriz',nome:names[0]},{id:data.unidades[1]?.id||'oliveira',nome:names[1]}];save();render();aviso('Unidades atualizadas.');return;
 }
 if(e.target.id==='daily-sales-form'){
   e.preventDefault();const f=e.target,data=getDailySales(),date=f.date.value,unitId=f.unit.value,keys=['cash','pix','card','credit','check'],amounts=Object.fromEntries(keys.map(k=>[k,val(f[k].value)])),total=Object.values(amounts).reduce((n,x)=>n+x,0),err=$('#daily-sales-error');
   const dateOk=validDate(date);
   if(!dateOk||!data.unidades.some(x=>x.id===unitId)||keys.some(k=>amounts[k]<0)||total<=0){err.textContent='Confira a data, unidade e valores. Informe ao menos uma venda maior que zero.';err.hidden=false;return}
   const editing=VD_EDIT?data.registros.find(x=>x.id===VD_EDIT):null,duplicate=data.registros.find(x=>x.id!==editing?.id&&x.date===date&&x.unitId===unitId);
   if(duplicate){err.textContent='Já há um registro para esta unidade e data. Edite o registro existente na lista.';err.hidden=false;return}
   const id=editing?.id||uid(),record={...(editing||{}),id,date,unitId,...amounts,total};
   data.registros=data.registros.filter(x=>x.id!==id).concat(record);
   S.pj.l=Array.isArray(S.pj.l)?S.pj.l:[];
   let ledger=S.pj.l.find(x=>x.dailySalesId===id);
   if(!ledger){ledger={id:uid(),dailySalesId:id,src:'daily-sales'};S.pj.l.push(ledger)}
   Object.assign(ledger,{desc:'Vendas diárias · '+(data.unidades.find(x=>x.id===unitId)?.nome||'Unidade'),v:total,c:'ven',d:date,st:'p',pg:date,b:ledger.b||bancos('pj')[0]?.id||''});
   S.mes=date.slice(0,7);VD_EDIT=null;save();render();aviso(editing?'Venda diária atualizada e total financeiro sincronizado.':'Venda diária salva e total financeiro lançado.');return;
 }
 if(e.target.id==='client-form'){
   e.preventDefault();if(S.m!=='pj'){aviso('O cadastro de clientes está disponível no ambiente PJ.');return}
   const f=e.target,nome=f.nome.value.trim().replace(/\s+/g,' '),telefone=f.telefone.value.trim(),email=f.email.value.trim(),P=S.pj;ensureClientCodes(P);
   if(!nome){aviso('Informe o nome do cliente.');return}
   const norm=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('pt-BR').replace(/\s+/g,' ').trim();
   if(P.clientes.some(c=>c.id!==CLI_EDIT_ID&&norm(c.nome)===norm(nome))){aviso('Já existe um cliente com esse nome. Abra o cadastro existente para editar os dados.');return}
   const documento=String(f.elements.documento?.value||'').replace(/\D/g,'');
   if(f.tipoPessoa.value==='juridica'&&documento&&!cnpjValido(documento)){aviso('Confira o CNPJ: informe os 14 números corretos, sem pontuação.');return}
   const documentoDuplicado=documento&&P.clientes.find(c=>c.id!==CLI_EDIT_ID&&String(c.documento||'').replace(/\D/g,'')===documento);
   if(documentoDuplicado){aviso(`Este documento já está cadastrado para ${documentoDuplicado.nome} (cliente ${String(documentoDuplicado.codigo).padStart(4,'0')}). Abra o cadastro existente.`);return}
   let cliente=CLI_EDIT_ID?P.clientes.find(c=>c.id===CLI_EDIT_ID):null;
   const fields=['tipoPessoa','documento','apelido','razaoSocial','nomeFantasia','contato','inicioAtividade','inscricaoEstadual','inscricaoMunicipal','cep','endereco','numero','complemento','bairro','cidade','uf','codigoIbge','telefone','telefone2','whatsapp','email','responsavel'];
   if(cliente){cliente.nome=nome;fields.forEach(k=>{const value=String(f.elements[k]?.value||'').trim();cliente[k]=k==='documento'?value.replace(/\D/g,''):value})}
   else{cliente={id:uid(),codigo:allocateClientCode(P),nome};fields.forEach(k=>{const value=String(f.elements[k]?.value||'').trim();cliente[k]=k==='documento'?value.replace(/\D/g,''):value});P.clientes.push(cliente)}
   CLI_EDIT_ID=null;save();render();aviso('Cadastro de cliente salvo.');return;
 }
 if(e.target.id==='sale-form'){
   e.preventDefault();if(S.m!=='pj'){aviso('Vendas estão disponíveis no ambiente PJ.');return}
   const f=e.target,nome=f.cliente.value.trim().replace(/\s+/g,' '),descricao=f.descricao.value.trim(),valor=val(f.valor.value),data=f.data.value,due=f.vencimento.value,n=Math.max(1,Math.min(36,parseInt(f.parcelas.value,10)||0)),categoria=f.categoria.value;
   const dateOk=d=>{if(!/^\d{4}-\d{2}-\d{2}$/.test(d))return false;const x=new Date(d+'T00:00:00');return !Number.isNaN(x.getTime())&&x.toISOString().slice(0,10)===d};
   if(!nome||!descricao||valor<=0||!dateOk(data)||!dateOk(due)||!(n>=1&&n<=36)||!['ven','ser'].includes(categoria)){aviso('Confira cliente, descrição, valor, datas e quantidade de parcelas.');return}
   const P=S.pj;ensureClientCodes(P);P.vendas=Array.isArray(P.vendas)?P.vendas:[];P.l=Array.isArray(P.l)?P.l:[];
   const norm=s=>s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('pt-BR').replace(/\s+/g,' ').trim();
   let cliente=P.clientes.find(c=>norm(c.nome)===norm(nome));
   if(!cliente){cliente={id:uid(),codigo:allocateClientCode(P),nome};P.clientes.push(cliente)}else cliente.nome=nome;
   const telefone=f.telefone.value.trim(),email=f.email.value.trim();if(telefone)cliente.telefone=telefone;if(email)cliente.email=email;
   const vendaId=uid(),parcelaBase=Math.floor(valor/n),resto=valor-(parcelaBase*n),ids=[];
   for(let i=0;i<n;i++){
     const id=uid(),v=parcelaBase+(i===n-1?resto:0),d=addM(due,i);ids.push(id);
     P.l.push({id,desc:(descricao+' · '+nome+(n>1?' ('+(i+1)+'/'+n+')':'')).slice(0,80),v,c:categoria,d,st:'a',vendaId,clienteId:cliente.id,parcela:i+1,origem:'venda'});
   }
   P.vendas.push({id:vendaId,clienteId:cliente.id,clienteNome:nome,descricao,categoria,valor,data,parcelas:n,recebiveis:ids,cancelada:false});
   S.mes=data.slice(0,7);aviso('Venda registrada e '+n+' parcela(s) adicionada(s) em A receber.');save();render();return;
 }
 if(e.target.id==='ccf'){e.preventDefault();const f=e.target,n=f.n.value.trim(),fe=parseInt(f.f.value,10),ve=parseInt(f.v.value,10);if(!n||!(fe>=1&&fe<=31&&ve>=1&&ve<=31)){aviso('Informe o nome e dias entre 1 e 31.');return}aviso('');S.pf.cards=cards().concat([{id:uid(),nome:n,limite:val(f.l.value),fecha:fe,vence:ve}]);save();render();return}
 if(e.target.id==='cpf'){e.preventDefault();const f=e.target,c=cards().find(x=>x.id===f.c.value),dt=f.dt.value,n=Math.max(1,Math.min(48,parseInt(f.n.value,10)||1)),v=val(f.v.value),d=f.d.value.trim();if(!c||!d||v<=0||!dt){aviso('Preencha a descrição, a data e o valor total da compra.');return}aviso('');const g=n>1?uid():undefined;planCompra(c,dt,v,n).forEach(p=>S.pf.l.push({id:uid(),desc:n>1?d+' ('+p.n+'/'+n+')':d,v:p.v,c:f.cat.value,tipoMov:'',d:p.venc,st:'a',g,cartao:c.id,compra:dt}));S.mes=planCompra(c,dt,v,n)[0].venc.slice(0,7);save();render();return}
 if(e.target.id==='prf'){e.preventDefault();const f=e.target,n=f.n.value.trim();if(!n)return;const X=S.pj;X.prod=X.prod||[];X.prod.push({id:uid(),nome:n,custo:val(f.c.value),frete:val(f.fr.value),preco:0});save();render();return}
 if(e.target.id==='nature-form'){e.preventDefault();const f=e.target,name=f.naturename.value.trim(),base=f.naturebase.value;if(!name)return;const ns=ensureNatureList(S.m);if(ns.some(n=>n.name.trim().toLocaleLowerCase('pt-BR')===name.toLocaleLowerCase('pt-BR'))){aviso('Já existe uma natureza com esse nome.');return}ns.push({id:'nature_'+Date.now().toString(36),name,base,locked:false});save();render();aviso('Natureza adicionada. Agora ela está disponível nos grupos financeiros.');return}
 if(e.target.id==='group-form'){e.preventDefault();const f=e.target,name=f.groupname.value.trim().replace(/\s+/g,' '),natureId=f.groupnature.value,def=natureById(S.m,natureId),norm=s=>String(s).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('pt-BR').trim();if(!name)return;if(catGroupsFor(S.m).some(g=>norm(g.name)===norm(name))){aviso('Já existe um grupo com esse nome neste ambiente.');return}S[S.m].groups=S[S.m].groups||[];S[S.m].groups.push({id:'group_'+Date.now().toString(36),name,nature:def.base,natureId:def.id});save();render();aviso('Grupo criado. Agora adicione categorias dentro dele.');return}
 if(e.target.id==='cat-form'){
   e.preventDefault();const f=e.target,m=S.m,name=f.catname.value.trim().replace(/\s+/g,' '),group=f.catgroup.value;
   if(!name){aviso('Informe o nome da categoria.');return}
   const custom=(S[m].groups||[]).find(g=>g.id===group),base=catGroupBase(m,custom?(custom.nature||natureById(m,custom.natureId).base):group);
   if(!Object.hasOwn(CFG[m].g,base)){aviso('Escolha um grupo financeiro válido para esta categoria.');return}
   const norm=s=>String(s).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('pt-BR').trim();
   if(catsFor(m).some(c=>norm(c[1])===norm(name))){aviso('Já existe uma categoria com esse nome neste ambiente.');return}
   const id='custom_'+uid();S[m].cats=Array.isArray(S[m].cats)?S[m].cats:[];S[m].cats.push([id,name,base,custom?custom.id:null]);AC={};clearTimeout(tm);
   try{if(await persist(m)){render();aviso('Categoria criada e salva neste ambiente.');}else{render();aviso('A categoria foi criada nesta sessão, mas não foi possível confirmar o salvamento na conta. Verifique sua conexão e tente salvar novamente.')}}
   catch(_){render();aviso('A categoria foi criada nesta sessão, mas ocorreu um erro ao salvar na conta. Verifique sua conexão e tente novamente.')}
   return;
 }
 if(e.target.id==='type-form'){e.preventDefault();const name=e.target.typename.value.trim();if(!name)return;S[S.m].types=S[S.m].types||[];if(S[S.m].types.some(t=>t.toLowerCase()===name.toLowerCase())){aviso('Esse tipo já existe neste ambiente.');return}S[S.m].types.push(name);save();render();return}
 if(e.target.id==='workbook-import-form'){e.preventDefault();const file=$('#workbook-import-file')?.files?.[0],host=$('#workbook-import-preview');if(!file||!host)return;host.innerHTML='<p>Lendo o arquivo preparado…</p>';try{const plan=JSON.parse(await file.text()),summary=plan?.summary;if(plan?.schema!=='mesa-financeira-workbook-import-v1'||plan?.environment!=='pj'||!plan?.targetUserId||!plan?.importId||!Array.isArray(plan.sales)||!Array.isArray(plan.expenses)||!Array.isArray(plan.excludedExpenses)||!summary)throw new Error('Este arquivo não é uma importação preparada da planilha Mesa Financeira.');if(summary.salesRecords!==plan.sales.length||summary.expenseRecords!==plan.expenses.length)throw new Error('A contagem do arquivo não confere. Gere novamente a importação a partir da planilha original.');window.__mfWorkbookPlan=plan;const rightUser=USER?.id===plan.targetUserId,already=(S.pj?.workbookImports||[]).some(x=>x.importId===plan.importId),salesM=summary.salesByUnit?.Matriz||{records:0,total:0},salesO=summary.salesByUnit?.Oliveira||{records:0,total:0};host.innerHTML=`<h3>Prévia da planilha</h3><p><b>${safeSummaryNumber(summary.salesRecords)}</b> vendas diárias · ${brl(safeSummaryNumber(summary.salesTotal))} no total</p><p class="cap">Matriz: ${safeSummaryNumber(salesM.records)} dias · ${brl(safeSummaryNumber(salesM.total))}<br>Oliveira: ${safeSummaryNumber(salesO.records)} dias · ${brl(safeSummaryNumber(salesO.total))}</p><p><b>${safeSummaryNumber(summary.expenseRecords)}</b> despesas com valor · ${brl(safeSummaryNumber(summary.expenseTotal))}</p><p class="cap">Pago: ${safeSummaryNumber(summary.expenseStatus?.Pago)} · Pendente: ${safeSummaryNumber(summary.expenseStatus?.Pendente)}. O vencimento será usado como data da conta; a data original da planilha e as observações ficam guardadas no lançamento. As categorias irão para “Outras despesas” para você reclassificar depois.</p><ul><li>${safeSummaryNumber(summary.expensesWithoutAmount)} despesa(s) sem valor serão ignoradas e listadas para conferência.</li><li>${safeSummaryNumber(summary.dueBeforeRecordDate)} vencimento(s) são anteriores à data registrada; as duas datas serão preservadas.</li><li>${safeSummaryNumber(summary.zeroSalesRowsSkipped)} dia(s) sem venda serão ignorados; ${safeSummaryNumber(summary.duplicateSaleRowsMerged)} linha(s) de venda repetida(s) na mesma unidade e data foram somadas no mesmo dia.</li><li>${safeSummaryNumber(summary.expensesWithoutSourceCategory)} despesas não têm categoria preenchida na planilha.</li></ul>${!rightUser?'<p class="neg" role="alert">Este arquivo foi preparado para outro usuário. Não é possível importá-lo nesta conta.</p>':''}${already?'<p class="neg" role="alert">Este arquivo já foi importado nesta conta; a importação repetida foi bloqueada.</p>':''}<button class="pri" data-a="workbook-import-confirm" ${rightUser&&!already&&S.m==='pj'&&KEY.pj?'':'disabled'}>Importar para este ambiente PJ</button> <button data-a="workbook-import-cancel">Cancelar</button>`}catch(err){window.__mfWorkbookPlan=null;host.innerHTML='<p class="neg">Não foi possível preparar a prévia: '+E(err.message||'arquivo inválido')+'</p>'}return}
 if(e.target.id==='import-form'){e.preventDefault();const file=$('#statement-file')?.files?.[0],host=$('#import-preview');if(!file||!host)return;host.innerHTML='<p>Processando arquivo…</p>';try{let rows=await parseExtrato(file);if(!rows.length){host.innerHTML='<p class="neg">Não encontrei lançamentos reconhecíveis. Confira o formato ou use CSV/OFX exportado pelo banco.</p>';return}rows=conciliacao(rows);rows.forEach(x=>{const dir=Number(x.signed)>0?'entrada':'saida',allowed=importCategories(dir);if(!allowed.some(c=>c[0]===x._cat))x._cat=importFallbackCategory(dir)});window.__mfImportRows=rows;const novos=rows.filter(x=>!x._dup).length,dups=rows.filter(x=>x._dup).length;host.innerHTML=`<h3>Conciliação e prévia (${rows.length} lançamentos)</h3><p class="cap">${novos} possível(is) lançamento(s) novo(s) · ${dups} possível(is) duplicado(s). Duplicados ficam desmarcados. Confira antes de importar.</p><div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap;margin:14px 0"><button type="button" data-a="import-ai-suggest">Sugerir categorias com IA</button><span class="cap">Ao pedir sugestões, a descrição, o tipo e a lista de categorias serão enviados à OpenAI (sem valores ou datas). O uso da API pode gerar custo.</span></div><div style="overflow:auto"><table><thead><tr><th>Importar</th><th>Data</th><th>Descrição</th><th>Tipo</th><th>Valor</th><th>Categoria</th><th>Resultado</th></tr></thead><tbody>${rows.slice(0,100).map((x,i)=>{const dir=Number(x.signed)>0?'entrada':'saida';return`<tr><td><input type="checkbox" data-import-row="${i}" ${x._use?'checked':''} ${x._dup?'title="Possível duplicidade"':''}></td><td>${E((x.d||'').split('-').reverse().join('-'))}</td><td>${E(x.desc)}</td><td><select data-import-direction="${i}" aria-label="Tipo de movimentação"><option value="entrada" ${dir==='entrada'?'selected':''}>Entrada</option><option value="saida" ${dir==='saida'?'selected':''}>Saída</option></select></td><td>${brl(Math.abs(Number(x.v)))}</td><td><select data-import-category="${i}" aria-label="Categoria de ${E(x.desc)}">${importCategoryOptions(dir,x._cat)}</select><small data-import-ai-note="${i}" class="cap">${x._aiReason?E(x._aiReason):'Confira a categoria'}</small></td><td>${x._dup?'<span class="neg">Possível duplicado</span>':'<span>Revisar / novo</span>'}</td></tr>`}).join('')}</tbody></table></div>${rows.length>100?`<p>Mostrando 100 de ${rows.length} registros. A IA e a revisão manual se aplicam às primeiras 100 linhas exibidas.</p>`:''}<p class="cap">As sugestões apenas preenchem os campos da prévia. Nada é salvo até você clicar em Importar selecionados. Confira o tipo e a categoria de cada movimentação. A comparação de duplicidades usa data, valor e descrição; confira manualmente.</p><button class="pri" data-a="import-confirm">Importar selecionados</button> <button data-a="import-cancel">Cancelar</button>`}catch(err){host.innerHTML='<p class="neg">Não foi possível ler o arquivo: '+E(err.message||'formato não suportado')+'</p>'}return}
  const f=e.target;
  if(f.id==='cadastro-form'){
    e.preventDefault();
    const values=Object.fromEntries(new FormData(f).entries());
    S[S.m].cadastro=Object.fromEntries(Object.entries(values).map(([k,v])=>[k,String(v).trim()]));
    save();render();aviso('Cadastro salvo no ambiente '+(S.m==='pf'?'PF':'PJ')+'.');return;
  }
  if(f.id==='bkf'){
    e.preventDefault();
    if(!S.be&&bancos(S.m).length>=1&&!tem(3)){aviso('Mais de uma conta bancária faz parte do plano Pro.');return}
    const o={nome:f.nome.value.trim(),saldo:val(f.s.value),d:f.d.value},bs=S[S.m].bks=S[S.m].bks||[],b=bs.find(x=>x.id===S.be);
    if(b)Object.assign(b,o);else bs.push(Object.assign({id:uid()},o));
    S.be='';save();render();return;
  }
  if(f.id!=='fm')return;
  e.preventDefault();
  await salvarFormularioLancamento(f);
});
document.addEventListener('input',e=>{
  if(e.target.id==='client-documento'){const el=e.target,pj=document.querySelector('#client-form [name="tipoPessoa"]')?.value==='juridica';el.value=el.value.replace(/\D/g,'').slice(0,pj?14:11);const notice=document.querySelector('#client-cnpj-status'),cnpj=el.value,duplicate=pj&&cnpj.length===14?(S.pj.clientes||[]).find(c=>c.id!==CLI_EDIT_ID&&String(c.documento||'').replace(/\D/g,'')===cnpj):null;if(notice){notice.hidden=!duplicate&&(!pj||cnpj.length!==14);notice.className='client-cnpj-status '+(duplicate?'warn':'');notice.textContent=duplicate?`CNPJ já cadastrado para ${duplicate.nome} (cliente ${String(duplicate.codigo).padStart(4,'0')}). Abra o cadastro existente.`:''}return}
  if(e.target.id==='launch-search'){LANC_SEARCH=e.target.value;refreshLaunchSearch();return}
  if(e.target.id==='avisos-search'){AVISOS_SEARCH=e.target.value;refreshAvisosSearch();return}
  if(e.target.id==='receber-search'){RECEBER_PAGAR_SEARCH.receber=e.target.value;refreshContasSearch();return}
  if(e.target.id==='pagar-search'){RECEBER_PAGAR_SEARCH.pagar=e.target.value;refreshContasSearch();return}
  const f=e.target.form;if(!f||f.id!=='cpf')return;
  const c=cards().find(x=>x.id===f.c.value),dt=f.dt.value,n=Math.max(1,Math.min(48,parseInt(f.n.value,10)||1)),v=val(f.v.value),pv=val(f.pv.value),o=$('#cp-prev');if(!c||!/^\d{4}-\d{2}-\d{2}$/.test(dt)||!o)return;
  const pl=planCompra(c,dt,v||0,n);let t='A 1ª parcela cai na fatura que vence em '+pl[0].venc.split('-').reverse().join('/')+'.';
  if(v>0)t+=' '+(n>1?n+' × '+brl(pl[0].v)+(pl[n-1].v!==pl[0].v?' (a última ajusta os centavos)':''):'1 × '+brl(v))+'.';
  if(n>1&&pv>0&&v>0){const i=taxaImp(pv,v/n,n);t+=i>0?' Juros embutidos: cerca de '+pf1(i*100)+'% ao mês (a compra custa '+brl(v-pv)+' a mais que o à vista).':' Sem juros em relação ao à vista.'}
  o.textContent=t;
});
document.addEventListener('change',async e=>{
  const D=e.target.dataset;
  const googleBox=e.target.closest('[data-google-user]');if(googleBox){const id=googleBox.dataset.googleUser,enabled=googleBox.checked;googleBox.disabled=true;const r=await sb.rpc('mf_google_admin_set',{p_user:id,p_enabled:enabled});googleBox.disabled=false;if(r.error){googleBox.checked=!enabled;aviso('Não foi possível alterar a liberação Google: '+r.error.message);return}GOOGLE_ALLOWED[id]=enabled;aviso(enabled?'Google liberado para o e-mail deste cliente.':'Acesso Google removido para este cliente.');return}const userEnv=e.target.closest('[data-user-env]');if(userEnv){if(!ADM){userEnv.checked=false;aviso('Somente um administrador pode liberar ambientes para clientes.');return}const id=userEnv.dataset.userEnv,key=userEnv.dataset.envKey,enabled=userEnv.checked,current=ADMIN_USER_MODULES[id]||{},ambientes=Object.assign({pf:false,pj:false},current.ambientes||{});ambientes[key]=enabled;const next=Object.assign({},current,{ambientes});userEnv.disabled=true;const r=await sb.from('modulos_usuario').upsert({user_id:id,modulos:next,atualizado_em:new Date().toISOString()},{onConflict:'user_id'});userEnv.disabled=false;if(r.error){userEnv.checked=!enabled;aviso('Não foi possível salvar a liberação do ambiente. Confira as permissões da tabela modulos_usuario no Supabase.');return}ADMIN_USER_MODULES[id]=next;if(id===USER?.id)USER_MODULES=next;aviso('Acesso ao ambiente '+(key==='pf'?'Pessoa Física':'Pessoa Jurídica')+(enabled?' liberado.':' removido.'));render();return} const userModule=e.target.closest('[data-user-module]');if(userModule){if(!ADM){userModule.checked=false;aviso('Somente um administrador pode ativar módulos para clientes.');return}const id=userModule.dataset.userModule,enabled=userModule.checked,next=Object.assign({},ADMIN_USER_MODULES[id]||{},{vendas_diarias:enabled});userModule.disabled=true;const r=await sb.from('modulos_usuario').upsert({user_id:id,modulos:next,atualizado_em:new Date().toISOString()},{onConflict:'user_id'});if(r.error){userModule.disabled=false;userModule.checked=!enabled;aviso('Não foi possível salvar o módulo do cliente. Execute supabase-client-modules.sql no Supabase.');return}ADMIN_USER_MODULES[id]=next;if(id===USER?.id)USER_MODULES=next;aviso(enabled?'Vendas diárias ativadas para este cliente.':'Vendas diárias desativadas para este cliente.');render();return}
  if(e.target.id==='of-account'){window.__ofSelectedAccount=e.target.value;render();return}
  if(D.m5){S.pf.m5=Object.assign(M5(),{[D.m5]:Math.max(0,Math.round(pn(e.target.value)))});save();render();return}
  if(D.rv){const R=S.pf.rsv=Object.assign({},S.pf.rsv);R[D.rv]=D.rv==='meses'?parseInt(e.target.value,10)||6:val(e.target.value);if(D.rv==='atual')R.atualEm=today();save();render();return}
  if(D.pp){const X=S.pj;X.prc=Object.assign({},PRC0,X.prc||{});X.prc[D.pp]=Math.max(0,pn(e.target.value));save();render();return}
  if(D.pi){const p=D.pi.split(':'),X=S.pj;let it;if(p[0]==='calc'){it=X.calc=X.calc||{custo:0,frete:0}}else it=(X.prod||[]).find(x=>x.id===p[0]);if(it){it[p[1]]=val(e.target.value);save();render()}return}
  if(D.orc||D.mt){const x=S[S.m];if(D.orc){x.orc=x.orc||{};x.orc[D.orc]=val(e.target.value)}else{x.meta=x.meta||{};x.meta[D.mt]=val(e.target.value)}save();render();return}
  if(e.target.id==='cns'){S.cn=e.target.value;render();return}
  if(e.target.name==='rep'){e.target.form.n.disabled=e.target.value==='u';return}
  if(e.target.name==='editRep'){const count=e.target.form.elements.editMonths;count.disabled=e.target.value!=='r';count.required=e.target.value==='r';return}
  if(e.target.id==='bxs'){S.bx=e.target.value;render();return}
  if(e.target.id!=='fi')return;
  const file=e.target.files[0],id=e.target.dataset.id;e.target.value='';
  if(!file)return;
  const a=await subir(file),l=a&&S[S.m].l.find(x=>x.id===id);
  if(l){l.a=a;save();render()}
});

function aplicarBotoesPlano(){
  if(S.v!=="u"||!USER)return;
  const cards=Array.from(document.querySelectorAll("#app .pn"));
  Object.entries(PLANOS).forEach(([key,plano])=>{
    const card=cards.find(c=>{const h=c.querySelector("h2");return h&&h.textContent.startsWith(plano.n)});
    if(!card||card.querySelector('[data-a="comprar"]'))return;
    const wrap=document.createElement("div");wrap.className="ac plan-acao";
    const btn=document.createElement("button");btn.className="pri";btn.dataset.a="comprar";btn.dataset.plano=key;
    btn.textContent=key===PL?"Renovar por 30 dias":"Contratar por 30 dias";
    wrap.appendChild(btn);card.appendChild(wrap);
  });
  const note=cards.length&&cards[cards.length-1].querySelector(".cap");
  const message="O pagamento será processado pelo PagBank. O plano é liberado após a confirmação do pagamento.";
  if(note&&note.textContent!==message)note.textContent=message;
}
const planoObserver=new MutationObserver(()=>aplicarBotoesPlano());
const appNode=document.getElementById("app");
if(appNode)planoObserver.observe(appNode,{childList:true,subtree:true});
document.addEventListener("click",async e=>{
  const btn=e.target.closest('[data-a="comprar"]');
  if(!btn)return;
  e.preventDefault();e.stopImmediatePropagation();
  if(!sb||!USER){aviso("Entre na sua conta para contratar um plano.");return}
  const oldText=btn.textContent;btn.disabled=true;btn.textContent="Abrindo checkout…";aviso("");
  try{
    const {data,error}=await sb.functions.invoke("criar-checkout",{body:{plano:btn.dataset.plano}});
    if(error)throw error;
    const url=data&&typeof data.url==="string"?data.url:"";
    if(!/^https:\/\//i.test(url))throw new Error("Resposta de checkout inválida.");
    location.assign(url);
  }catch(err){
    console.error("Falha ao iniciar checkout",err);
    aviso("Não foi possível iniciar o checkout agora. Confira sua conexão e tente novamente.");
    btn.disabled=false;btn.textContent=oldText;
  }
},true);
/* ---------- login e logoff ---------- */
const msg=t=>{$('#lg-msg').textContent=t||''};
const cred=()=>({email:$('#lg-em').value.trim(),password:$('#lg-pw').value});
async function prepararRecuperacao(m){
  const blob=RAW[m];if(!blob||blob.enc!==2)throw new Error('Este ambiente ainda usa a proteção antiga. Para preservar os dados, abra-o uma vez com a senha atual e conclua a migração.');
  const {data,error}=await sb.functions.invoke('recuperar-chave-ambiente',{body:{acao:'recuperar',ambiente:m}});
  if(error||!data?.chave)throw new Error(data?.erro||error?.message||'Não foi possível recuperar a chave do ambiente.');
  const raw=unb(data.chave),k=await crypto.subtle.importKey('raw',raw,{name:'AES-GCM'},true,['encrypt','decrypt']);
  const pt=await crypto.subtle.decrypt({name:'AES-GCM',iv:unb(blob.iv),...(blob.context?{additionalData:te.encode(blob.context)}:{})},k,unb(blob.ct));
  const dados=mig(await REGISTROS.hydrate(m,JSON.parse(td.decode(pt)),{k},decryptRecord),m);
  RECOVERING={m,raw,dados};ENV=m;S[m]=dados;
  $('#lg').hidden=true;$('#np').hidden=true;$('#ev').hidden=true;$('#pw').hidden=false;$('#gate').hidden=false;
  $('#pw-t').textContent='Crie uma nova senha: '+CFG[m].nome;
  $('#pw-d').textContent='Acesso à conta confirmado pelo e-mail. Cadastre uma nova senha para este ambiente; seus dados serão mantidos.';
  $('#pw-2l').hidden=false;$('#pw-2').required=true;$('#pw-ck').hidden=true;$('#pw-forgot').hidden=true;
  $('#pw-ok').textContent='Salvar senha e manter dados';$('#pw-1').value='';$('#pw-2').value='';$('#pw-msg').textContent='';
  $('#pw-1').focus();history.replaceState(null,'',location.pathname);
}
async function entrar(user){
  const verified=await sb.auth.getUser();
  if(verified.error||!verified.data.user||verified.data.user.id!==user?.id){msg('Sua sessão expirou. Entre novamente.');return}
  const sr=await sb.auth.getSession();
  if(!await MFGoogleAccess.check(sb,verified.data.user,sr.data.session)){await sb.auth.signOut();msg('Acesso Google não autorizado. Solicite liberação ao administrador.');return}
  user=verified.data.user;
  USER=user;renovarExpiracaoSessao();AC={};
  await carregarModulosUsuario(user);
  try{RAW=await REGISTROS.read(sb,user.id)}catch(err){USER=null;clearTimeout(idleLogoutTimer);msg(err.message||'Não foi possível carregar seus dados.');return}
  const pr=await sb.from('planos').select('plano,valido_ate').eq('user_id',user.id).maybeSingle();
  PL=pr.data&&NIV[pr.data.plano]?pr.data.plano:'ess';
  await carregarModulos();
  if(pr.error)aviso('Não foi possível ler o seu plano. Confira se o arquivo supabase-v3.sql foi executado.');
  const ad=await sb.rpc('sou_admin');ADM=ad.data===true;ADL=null;
  const validade=pr.data?.valido_ate;
  if(!ADM&&validade&&validade<=today()){
    ['lg','ev','pw','np'].forEach(x=>{const el=$('#'+x);if(el)el.hidden=true});
    $('#expired-msg').textContent='A validade do seu acesso terminou em '+validade.slice(8,10)+'/'+validade.slice(5,7)+'/'+validade.slice(0,4)+'. Fale com o administrador para renovar o acesso.';
    $('#expired').hidden=false;$('#gate').hidden=false;$('#amb').hidden=true;$('#sair').hidden=true;$('#app').innerHTML='';
    return;
  }
  $('#expired').hidden=true;
  const profile=await sb.from('mf_profiles').select('display_name').eq('user_id',user.id).maybeSingle();
  $('#who').textContent=(profile.data?.display_name?profile.data.display_name+' · ':'')+user.email;$('#lg-pw').value='';msg('');
  if(['pf','pj'].includes(RECOVER_ENV)){
    try{await prepararRecuperacao(RECOVER_ENV);return}
    catch(err){history.replaceState(null,'',location.pathname);escolher();$('#ev-msg').textContent='Não foi possível recuperar o ambiente: '+(err.message||'verifique a configuração e tente novamente.');$('#ev-msg').hidden=false;return}
  }
  escolher();
}
function escolher(){
  $('#ev-msg').hidden=true;$('#ev-msg').textContent='';
  ['pf','pj'].forEach(m=>{const b=RAW[m],button=$(`[data-env="${m}"]`),allowed=ambienteLiberado(m);if(button)button.hidden=!allowed;$('#ev-'+m).textContent=b&&b.enc?'Protegido por senha':b&&b.l?'Dados sem proteção. Toque para criar a senha':'Novo ambiente. Toque para criar a senha'});
  $('#env-no-access').hidden=['pf','pj'].some(ambienteLiberado);
  ['lg','np','pw'].forEach(x=>$('#'+x).hidden=true);$('#who-env').hidden=true;
  $('#ev').hidden=false;$('#gate').hidden=false;$('#amb').hidden=true;$('#sair').hidden=true;$('#app').innerHTML='';
}
function abrirPw(m){
  if(!ambienteLiberado(m)){aviso('Este ambiente não está liberado para sua conta. Solicite acesso ao administrador.');return}
  ENV=m;RECOVERING=null;const b=RAW[m],has=!!(b&&b.enc),nm=CFG[m].nome;
  document.documentElement.dataset.mod=m;
  $('#pw-t').textContent=(has?'Abrir ':'Criar senha: ')+nm;
  $('#pw-d').textContent=has?'Digite a senha deste ambiente. Ela é diferente da senha de login. Se esqueceu, use a opção de recuperação por e-mail.':(b&&b.l?'Seus dados atuais deste ambiente serão criptografados com esta senha. ':'')+'Os dados são embaralhados no seu navegador antes de serem salvos. Esta senha é diferente da senha de login.';
  $('#pw-2l').hidden=$('#pw-ck').hidden=has;$('#pw-2').required=!has;$('#pw-c').checked=false;
  $('#pw-forgot').hidden=!has;
  $('#pw-ok').textContent=has?'Abrir ambiente':'Criar senha e abrir';
  $('#pw-msg').textContent='';$('#ev').hidden=true;$('#pw').hidden=false;$('#pw-1').focus();
}
function entrarAmb(m){
  if(!ambienteLiberado(m)){escolher();$('#ev-msg').textContent='Este ambiente não está liberado para sua conta. Solicite acesso ao administrador.';$('#ev-msg').hidden=false;return}
  S.m=m;S.v='p';S.mes=ym(new Date());AC={};envChip(m);$('#who-env').hidden=false;
  $('#gate').hidden=true;$('#pw').hidden=true;$('#sair').hidden=false;$('#amb').hidden=false;render();
}
async function trancar(){
  const m=S.m;clearTimeout(tm);
  if(KEY[m]&&!(await persist(m)))return false;
  KEY[m]=null;S[m]={l:[],cx:0,bks:[]};AC={};$('#app').innerHTML='';return true;
}
$('#ev').addEventListener('click',e=>{const b=e.target.closest('[data-env]');if(b)abrirPw(b.dataset.env)});
$('#ev-out').addEventListener('click',()=>$('#sair').click());
$('#expired-out').addEventListener('click',()=>$('#sair').click());
$('#pw-back').addEventListener('click',()=>{if(RECOVERING){S[RECOVERING.m]={l:[],cx:0,bks:[]};KEY[RECOVERING.m]=null;RECOVERING=null}$('#pw').hidden=true;$('#ev').hidden=false});
$('#pw-forgot').addEventListener('click',async()=>{
  if(!sb||!USER?.email)return;
  const btn=$('#pw-forgot'),m=ENV,url=new URL(location.pathname,location.origin);
  url.searchParams.set('recuperar_ambiente',m);btn.disabled=true;$('#pw-msg').textContent='';
  try{
    const {error}=await sb.auth.signInWithOtp({email:USER.email,options:{emailRedirectTo:url.toString(),shouldCreateUser:false}});
    $('#pw-msg').textContent=error?'Não foi possível enviar o link. Confira a configuração de e-mail e URLs permitidas no Supabase.':'Enviamos um link para o e-mail da conta. Abra-o para cadastrar uma nova senha deste ambiente e manter os dados.';
  }catch(_){$('#pw-msg').textContent='Não foi possível enviar o link agora. Confira sua conexão e tente novamente.'}
  finally{btn.disabled=false}
});
$('#amb').addEventListener('click',async()=>{if(await trancar())escolher()});
$('#pw').addEventListener('submit',async e=>{
  e.preventDefault();
  const m=ENV,b=RAW[m],pw=$('#pw-1').value,ok=$('#pw-ok');
  $('#pw-msg').textContent='';ok.disabled=true;
  try{
    if(RECOVERING){
      if(pw.length<8)throw 'Use pelo menos 8 caracteres.';
      if(pw!==$('#pw-2').value)throw 'As senhas não conferem.';
      const rec=RECOVERING,newKey=await novaChaveAmbiente(pw,rec.raw);KEY[rec.m]=newKey;S[rec.m]=rec.dados;
      if(!(await persist(rec.m))){KEY[rec.m]=null;throw 'Não foi possível salvar a nova senha. Seus dados continuam protegidos; tente novamente.'}
      RECOVERING=null;S.m=rec.m;entrarAmb(rec.m);return;
    }else if(b&&b.enc){
      let x;try{x=await decrypt(b,pw)}catch(_){throw 'Senha incorreta.'}
      S[m]=mig(await REGISTROS.hydrate(m,x.data,x.key,decryptRecord),m);KEY[m]=x.key;
      if(x.key.version!==2){KEY[m]=null;throw 'Este ambiente usa criptografia antiga. Abra-o na versão anterior, conclua a atualização e só depois use V11.'}
      try{await guardarChaveRecuperacao(m,x.key.raw)}
      catch(_){aviso('A recuperação por e-mail não foi confirmada. A senha atual continua válida.')}
    }else{
      if(pw.length<8)throw 'Use pelo menos 8 caracteres.';
      if(pw!==$('#pw-2').value)throw 'As senhas não conferem.';
      if(!$('#pw-c').checked)throw 'Marque a confirmação para continuar.';
      KEY[m]=await novaChaveAmbiente(pw);
      S[m]=mig(await REGISTROS.hydrate(m,b&&b.l?b:{l:[],cx:0},KEY[m],decryptRecord),m);
      try{await guardarChaveRecuperacao(m,KEY[m].raw)}catch(_){aviso('A recuperação por e-mail ainda não está ativa neste servidor. Guarde bem a senha do ambiente.')}
      if(!(await persist(m))){KEY[m]=null;throw 'Não foi possível salvar. Tente de novo.'}
    }
    entrarAmb(m);
  }catch(err){$('#pw-msg').textContent=typeof err==='string'?err:'Não foi possível abrir o ambiente neste navegador.'}
  finally{ok.disabled=false;$('#pw-1').value='';$('#pw-2').value=''}
});
$('#lg-google').addEventListener('click',async()=>{
 if(!sb){msg('Não foi possível conectar ao sistema.');return}
 const b=$('#lg-google');b.disabled=true;msg('');
 try{
  const {error}=await sb.auth.signInWithOAuth({provider:'google',options:{redirectTo:location.origin+location.pathname,queryParams:{prompt:'select_account'}}});
  if(error)throw error;
 }catch(_){msg('Não foi possível entrar com Google. Confira se o acesso Google foi configurado e liberado.');b.disabled=false}
});
$('#lg').addEventListener('submit',async e=>{
  e.preventDefault();if(!sb)return;msg('');
  const r=await sb.auth.signInWithPassword(cred());
  if(r.error){
    const t=r.error.message||'';
    return msg(/invalid login/i.test(t)?'E-mail ou senha inválidos.':/not confirmed/i.test(t)?'Este e-mail ainda não foi confirmado. Confirme pelo link recebido ou peça ao administrador.':r.error.status===429?'Muitas tentativas. Aguarde alguns minutos.':'Não foi possível entrar agora. Confira sua conexão e tente novamente.');
  }
  if(window.avancarCarrossel)window.avancarCarrossel();
  entrar(r.data.user);
});
$('#lg-new').addEventListener('click',async()=>{
  if(!sb)return;const c=cred();
  if(!c.email||c.password.length<8)return msg('Informe um e-mail e uma senha com pelo menos 8 caracteres.');
  const r=await sb.auth.signUp(c);
  if(r.error)return msg(/not allowed/i.test(r.error.message)?'O cadastro aberto está desativado. Peça um convite ao administrador do sistema.':'Não foi possível criar a conta agora. Confira os dados e tente novamente.');
  if(r.data.session)entrar(r.data.user);else msg('Conta criada. Confirme o e-mail que enviamos e depois clique em Entrar.');
});
$('#lg-fg').addEventListener('click',async()=>{
  if(!sb)return;const em=$('#lg-em').value.trim();
  if(!em)return msg('Digite seu e-mail acima.');
  const r=await sb.auth.resetPasswordForEmail(em,{redirectTo:location.origin+location.pathname});
  if(r.error)return msg(r.error.status===429?'Muitas tentativas de envio. Aguarde alguns minutos e tente de novo.':'Não foi possível enviar o e-mail agora. Confira a conexão e tente novamente.');
  msg('Se esse e-mail tiver conta, enviamos o link para redefinir a senha. Olhe também o spam.');
});
$('#sair').addEventListener('click',async()=>{
  clearTimeout(idleLogoutTimer);
  if(KEY[S.m]&&!(await trancar()))return;
  await WRITE_QUEUE;if(UNSAVED.size){aviso('Há alterações não salvas. Verifique a conexão antes de sair.');return}await sb.auth.signOut();REGISTROS.reset();USER=null;RAW={};KEY={};PL='ess';ADM=false;ADL=null;USER_MODULES={};USER_MODULE_ERROR='';ADMIN_USER_MODULES={};ADMIN_MODULE_ERROR='';VD_EDIT=null;
  RECOVERING=null;
  S.pf={l:[],cx:0,bks:[]};S.pj={l:[],cx:0,bks:[]};
  $('#app').innerHTML='';$('#who').textContent='';$('#who-env').hidden=true;$('#sair').hidden=true;$('#amb').hidden=true;aviso('');
  ['ev','pw','np'].forEach(x=>$('#'+x).hidden=true);$('#lg').hidden=false;$('#gate').hidden=false;$('#lg-pw').value='';
});
const needPw=u=>SETPW||(u.invited_at&&!(u.user_metadata&&u.user_metadata.senha_definida));
function defSenha(u){USER=u;renovarExpiracaoSessao();$('#lg').hidden=true;$('#np').hidden=false;$('#gate').hidden=false;$('#np-1').focus()}
$('#np').addEventListener('submit',async e=>{
  e.preventDefault();
  const a=$('#np-1').value,b=$('#np-2').value,m=$('#np-msg');
  if(a.length<8){m.textContent='Use pelo menos 8 caracteres.';return}
  if(a!==b){m.textContent='As senhas não conferem.';return}
  const r=await sb.auth.updateUser({password:a,data:{senha_definida:true}});
  if(r.error){m.textContent='Não foi possível salvar a senha. Peça um novo convite ou use "Esqueci minha senha".';return}
  m.textContent='';$('#np').hidden=true;$('#lg').hidden=false;
  history.replaceState(null,'',location.pathname+location.search);
  entrar(USER);
});
let GOOGLE_LOGIN_PENDING=false;
if(sb)sb.auth.onAuthStateChange((event,session)=>{
 if(event==='SIGNED_IN'&&!USER&&!GOOGLE_LOGIN_PENDING&&MFGoogleAccess.isGoogleSession(session)){
  GOOGLE_LOGIN_PENDING=true;setTimeout(()=>{entrar(session.user).catch(()=>msg('Não foi possível validar seu acesso. Tente novamente.')).finally(()=>{GOOGLE_LOGIN_PENDING=false})},0);
 }
});
(async function boot(){
  if(!sb){msg('Falta configurar o Supabase: preencha SB_URL e SB_KEY no arquivo config.js.');return}
  if(AUTH_ERR){msg(/google|autorizad|hook/i.test(AUTH_ERR)?'Acesso Google não autorizado. Solicite liberação ao administrador.':'Este link expirou ou já foi usado. Peça um novo convite ou use "Esqueci minha senha".');history.replaceState(null,'',location.pathname+location.search)}
  const r=await sb.auth.getUser();
  if(r.data.user&&!GOOGLE_LOGIN_PENDING){const u=r.data.user;needPw(u)?defSenha(u):entrar(u)}
})();
