/* Authorization lives in Auth hooks and RLS; this helper never grants access. */
(function(root){
 'use strict';
 function isGoogleSession(session){
  if(!session?.access_token)return false;
  try{
   const part=session.access_token.split('.')[1];
   const claims=JSON.parse(atob(part.replace(/-/g,'+').replace(/_/g,'/')));
   return claims.mf_google_session===true||(claims.amr||[]).some(x=>x.method==='oauth');
  }catch(_){return true;}
 }
 async function check(client,user,session){
  if(!user?.id)return false;
  if(!isGoogleSession(session))return true;
  const {data,error}=await client.rpc('mf_google_status');
  return !error&&data===true;
 }
 root.MFGoogleAccess={isGoogleSession,check};
 if(typeof module==='object'&&module.exports)module.exports=root.MFGoogleAccess;
})(typeof window==='object'?window:globalThis);
