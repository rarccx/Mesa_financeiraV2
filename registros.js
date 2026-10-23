/* Mesa Financeira V11: adaptador criptografado, sem senhas/chaves no armazenamento local. */
(function(root){
 'use strict';
 const copy=x=>JSON.parse(JSON.stringify(x));
 const stable=x=>JSON.stringify(x,(_,v)=>v&&typeof v==='object'&&!Array.isArray(v)?Object.fromEntries(Object.keys(v).sort().map(k=>[k,v[k]])):v);
 function create(){
  let owner=null,contexts={};
  function reset(){owner=null;contexts={}}
  async function read(sb,user){
   if(owner!==user){reset();owner=user}
   const legacy=await sb.from('mesa_dados').select('dados').eq('user_id',user).maybeSingle();
   if(legacy.error)throw legacy.error;
   const raw=copy(legacy.data?.dados||{}),next={};
   for(const env of ['pf','pj']){
    const result=await sb.rpc('mf_registros_ler',{p_ambiente:env});
    if(result.error)throw new Error('Não foi possível ler os registros V11. Confira a instalação antes de continuar. '+result.error.message);
    const bundle=result.data;
    next[env]={revision:bundle?.revisao||0,bundle,base:null,key:null,legacy:raw[env]??null};
    if(bundle)raw[env]=bundle.metadados;
   }
   contexts=next;return raw;
  }
  async function hydrate(env,data,key,decryptRecord){
   const ctx=contexts[env];if(!ctx)throw new Error('Reentre na conta para carregar os registros.');
   let hydrated=data;
   if(ctx.bundle){
    const list=[];
    for(const row of ctx.bundle.registros){
     const entry=await decryptRecord(row.conteudo,key,env,row.id);
     if(!entry||entry.id!==row.id)throw new Error('Registro inválido: nenhum dado foi alterado.');
     list.push(entry);
    }
    const order=data.__mf_v11_order;
    if(!Array.isArray(order)||order.length!==list.length||new Set(order).size!==list.length)throw new Error('Ordem de registros inválida.');
    const byId=new Map(list.map(row=>[row.id,row]));
    if(order.some(id=>!byId.has(id)))throw new Error('Registro ausente.');
    const {__mf_v11_order,...meta}=data;hydrated={...meta,l:order.map(id=>byId.get(id))};
   }
   ctx.base=copy(hydrated.l||[]);ctx.key=key.k;return hydrated;
  }
  async function write(sb,user,env,snapshot,key,encrypt){
   if(owner!==user||!contexts[env])throw new Error('Reentre na conta antes de salvar.');
   const ctx=contexts[env],list=snapshot.l;
   if(key.version!==2)throw new Error('Abra e atualize este ambiente na versão anterior antes de usar V11.');
   if(Object.hasOwn(snapshot,'__mf_v11_order'))throw new Error('Nome de configuração reservado; nenhum dado foi alterado.');
   if(!Array.isArray(list))throw new Error('Lista de lançamentos inválida.');
   const ids=new Set();
   for(const row of list){if(typeof row.id!=='string'||!row.id||row.id.length>512||ids.has(row.id))throw new Error('Há lançamentos sem identificador válido ou duplicados. A migração foi cancelada sem alterar seus dados.');ids.add(row.id)}
   const base=new Map((ctx.base||[]).map(row=>[row.id,row]));
   const records=[];
   for(const row of list){if(!ctx.revision||ctx.key!==key.k||stable(base.get(row.id))!==stable(row))records.push({id:row.id,conteudo:await encrypt(env,row,row.id)})}
   const remove=ctx.revision?(ctx.base||[]).filter(row=>!ids.has(row.id)).map(row=>row.id):[];
   const {l,...meta}=snapshot;
   const blob=await encrypt(env,{...meta,__mf_v11_order:list.map(row=>row.id)});
   const result=await sb.rpc('mf_registros_gravar',{p_ambiente:env,p_revisao:ctx.revision,p_legado:ctx.legacy,p_metadados:blob,p_registros:records,p_excluir:remove});
   if(result.error)throw result.error;
   if(!Number.isSafeInteger(Number(result.data))||Number(result.data)<1)throw new Error('O banco não confirmou a gravação. Reabra o ambiente antes de tentar novamente.');
   ctx.revision=Number(result.data);ctx.base=copy(list);ctx.key=key.k;
   const old=new Map((ctx.bundle?.registros||[]).map(row=>[row.id,row]));
   for(const id of remove)old.delete(id);for(const row of records)old.set(row.id,row);
   ctx.bundle={revisao:ctx.revision,metadados:blob,registros:[...old.values()]};
   return blob;
  }
  return{read,hydrate,write,reset};
 }
 root.MFRegistros={create};
})(globalThis);
