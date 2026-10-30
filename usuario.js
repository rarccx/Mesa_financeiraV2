/* Mesa Financeira - regras do nome de usuário (sem acesso ao banco). */
(function(g){
  const RESERVADOS=['admin','administrador','adm','suporte','mesa','mesafinanceira','root','sistema','contato','financeiro'];
  const normalizar=v=>String(v||'').trim().toLowerCase();
  const ehEmail=v=>String(v||'').includes('@');
  function validar(v){
    const u=normalizar(v);
    if(u.length<3||u.length>30)return 'Use de 3 a 30 caracteres.';
    if(!/^[a-z0-9._]+$/.test(u))return 'Use só letras sem acento, números, ponto ou sublinhado.';
    if(/^[._]|[._]$/.test(u)||/[._]{2}/.test(u))return 'Não comece, termine ou repita ponto e sublinhado.';
    if(/^\d+$/.test(u))return 'Use pelo menos uma letra.';
    if(RESERVADOS.includes(u))return 'Este nome não pode ser usado.';
    return '';
  }
  g.MFUsuario={normalizar,ehEmail,validar,RESERVADOS};
})(typeof window!=='undefined'?window:globalThis);
