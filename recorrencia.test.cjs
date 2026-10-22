const assert=require('node:assert/strict');const p2=n=>String(n).padStart(2,'0');const ym=d=>d.getFullYear()+'-'+p2(d.getMonth()+1);let seq=0;const uid=()=>String(++seq);const today=()=> '2026-10-22';let USER={id:'test'},KEY={pf:{},pj:{}},RAW={},AC={},S={m:'pf',pf:{l:[]},pj:{l:[]}},LE=null;let notices=[],fail=false,race=false,cancelled=[];const aviso=t=>notices.push(t),render=()=>{};const error={textContent:'',hidden:true};const $=()=>error;const tem=()=>true;const catsFor=()=>[['mor','Moradia','nec']];const cat=()=>['mor','Moradia','nec'];const isIn=g=>g==='ren';const encrypt=async(m,snapshot)=>({enc:1,ct:JSON.stringify(snapshot)});let database=null,eqs=[],writes=[];
const sb={from:table=>{let filters={};const q={select:()=>q,eq:(k,v)=>{filters[k]=v;return q},maybeSingle:async()=>({data:database?{dados:structuredClone(database)}:null}),update:row=>{q.then=(resolve)=>{if(table==='lembretes_sms'){cancelled.push(filters.transaction_id);return resolve({error:null})}if(fail)return resolve({error:{message:'offline'}});if(race){race=false;database={...database,pf:{ct:'another-write'}}}if(JSON.stringify(database)!==filters.dados)return resolve({data:[],error:null});database=structuredClone(row.dados);writes.push(row);return resolve({data:[{user_id:'test'}],error:null})};return q},upsert:row=>{q.then=resolve=>{if(fail)return resolve({error:{message:'offline'}});if(database)return resolve({data:[],error:null});database=structuredClone(row.dados);writes.push(row);return resolve({data:[{user_id:'test'}],error:null})};return q}};return q}};
const confirm=()=>true;
function makeForm(extra={}){const f={v:{value:'100,00'},d:{value:'2026-01-31'},desc:{value:'Aluguel'},c:{value:'mor'},direction:{value:'pagar'},st:{value:'a'},movtype:{value:''},rep:{value:'r'},n:{value:'3'},smslembrete:{value:''},elements:{},querySelectorAll:()=>[],querySelector:()=>error};return Object.assign(f,extra)}
const val=value=>{
 let s=String(value).trim();if(!s)return 0;
 if(s.includes(',')){if(!/^[+-]?(?:\d+|\d{1,3}(?:\.\d{3})+),\d{1,2}$/.test(s))return 0;s=s.replace(/\./g,'').replace(',','.')}
 else if(/^[+-]?\d{1,3}(?:\.\d{3})+$/.test(s))s=s.replace(/\./g,'');
 else if(!/^[+-]?\d+(?:\.\d{1,2})?$/.test(s))return 0;
 const cents=Math.round(Number(s)*100);return Number.isSafeInteger(cents)?cents:0;
};
const validDate=d=>typeof d==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(d)&&parseDateAny(d)===d;
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
function normMov(s){return String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/^(saida|entrada)\s*[·:-]\s*/,'').replace(/[^a-z0-9]+/g,' ').trim()}
const stableJson=value=>JSON.stringify(value,(_,v)=>v&&typeof v==='object'&&!Array.isArray(v)?Object.fromEntries(Object.keys(v).sort().map(k=>[k,v[k]])):v);
let WRITE_QUEUE=Promise.resolve(),PENDING_WRITES=0,LANC_BUSY=false;
const UNSAVED=new Set();
function persist(m){
 AC={};const userId=USER?.id,key=KEY[m],snapshot=JSON.parse(JSON.stringify(S[m]));
 UNSAVED.add(m);PENDING_WRITES++;
 const task=WRITE_QUEUE.then(async()=>{
  if(!sb||!userId||USER?.id!==userId||!key||KEY[m]!==key)return false;
  try{
   const cur=await sb.from('mesa_dados').select('dados').eq('user_id',userId).maybeSingle();
   if(cur.error)throw cur.error;
   const current=cur.data?.dados||{};
   if(stableJson(current[m]??null)!==stableJson(RAW[m]??null)){
    aviso('Outra aba ou dispositivo alterou estes dados. Suas alterações não foram gravadas. Não feche esta tela; confira a outra sessão antes de continuar.');return false;
   }
   const blob=await encrypt(m,snapshot),next={...current,[m]:blob},row={user_id:userId,dados:next,atualizado_em:new Date().toISOString()};
   const r=cur.data
    ?await sb.from('mesa_dados').update(row).eq('user_id',userId).eq('dados',JSON.stringify(current)).select('user_id')
    :await sb.from('mesa_dados').upsert(row,{onConflict:'user_id',ignoreDuplicates:true}).select('user_id');
   if(r.error)throw r.error;
   if(!r.data?.length){aviso('Os dados mudaram durante a gravação. Nada foi sobrescrito. Confira as outras sessões antes de tentar novamente.');return false}
   RAW=next;if(JSON.stringify(S[m])===JSON.stringify(snapshot))UNSAVED.delete(m);
   aviso('');return true;
  }catch(_){aviso('Não foi possível salvar. Suas alterações continuam nesta tela. Verifique a conexão e tente novamente antes de sair.');return false}
 }).then(ok=>{if(!ok&&!UNSAVED.has(m))UNSAVED.add(m);return ok}).finally(()=>{PENDING_WRITES--});
 WRITE_QUEUE=task.catch(()=>false);return task;
}
const save=()=>{AC={};return persist(S.m)};
async function cancelarLembreteSMS(id){
 if(!sb||!USER)return false;
 try{const r=await sb.from('lembretes_sms').update({status:'canceled'}).eq('user_id',USER.id).eq('transaction_id',id).eq('status','pending');if(r.error)throw r.error;return true}
 catch(_){aviso('Os dados foram salvos, mas não foi possível cancelar um lembrete SMS. Confira os lembretes antes do vencimento.');return false}
}
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


(async()=>{
 assert.equal(validDate('2026-06-10'),true);assert.equal(validDate('2026-02-30'),false);assert.equal(addM('2026-01-31',1),'2026-02-28');assert.equal(addM('2028-01-31',1),'2028-02-29');
 assert.equal(val('1.250'),125000);assert.equal(val('1.250,99'),125099);assert.equal(val('100abc'),0);assert.equal(val('1,2,3'),0);
 await salvarFormularioLancamento(makeForm());assert.deepEqual(S.pf.l.map(x=>x.d),['2026-01-31','2026-02-28','2026-03-31']);assert.equal(JSON.parse(database.pf.ct).l.length,3);console.log('PASS creation and saved readback');
 await salvarFormularioLancamento(makeForm());assert.equal(S.pf.l.length,3);console.log('PASS duplicate submission blocked');
 LE={m:'pf',id:S.pf.l[0].id,series:true};await salvarFormularioLancamento(makeForm({d:{value:'2026-02-15'}}));assert.deepEqual(S.pf.l.map(x=>x.d),['2026-02-15','2026-03-15','2026-04-15']);console.log('PASS edit series immutable month anchor');
 S.pf.l.push({id:'legacy',desc:'Plano',d:'2026-06-15',st:'p',v:10000,c:'mor',a:{p:'receipt'}});await persist('pf');LE={m:'pf',id:'legacy'};await salvarFormularioLancamento(makeForm({desc:{value:'Plano'},d:{value:'2026-07-15'},st:{value:'a'},elements:{editRep:{value:'r'},editMonths:{value:'3'}}}));const legacy=S.pf.l.find(x=>x.id==='legacy');assert.equal(legacy.st,'p');assert.equal(legacy.pg,'2026-06-15');assert.equal(legacy.a.p,'receipt');console.log('PASS paid legacy status date and receipt preserved');
 LE=null;const old=JSON.stringify(S.pf);fail=true;await salvarFormularioLancamento(makeForm({desc:{value:'Offline'}}));assert.equal(JSON.stringify(S.pf),old);assert.equal(UNSAVED.has('pf'),false);fail=false;console.log('PASS failed save rollback');
 const previous=database.pf;database.pf={ct:'different'};assert.equal(await persist('pf'),false);assert.equal(database.pf.ct,'different');database.pf=previous;UNSAVED.delete('pf');console.log('PASS concurrent remote update refused');
 race=true;assert.equal(await persist('pf'),false);assert.equal(database.pf.ct,'another-write');database.pf=previous;UNSAVED.delete('pf');console.log('PASS atomic race refused');
 const task=save();S.m='pj';assert.equal(await task,true);assert.equal(writes.at(-1).dados.pf.ct,JSON.stringify(S.pf));console.log('PASS environment captured before switching');
 S.m='pf';const length=S.pf.l.length;await salvarFormularioLancamento(makeForm({desc:{value:'Centavo'},v:{value:'0,01'},rep:{value:'d'}}));assert.equal(S.pf.l.length,length);console.log('PASS zero-cent installment refused');
})().catch(e=>{console.error(e);process.exitCode=1});
