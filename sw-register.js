(function(){
var BS='position:absolute!important;right:8px!important;top:50%!important;transform:translateY(-50%)!important;z-index:5!important;display:block!important;visibility:visible!important;opacity:1!important;width:auto!important;min-width:0!important;height:auto!important;min-height:0!important;margin:0!important;padding:6px 10px!important;background:transparent!important;border:0!important;box-shadow:none!important;color:#6a5fd8!important;font:600 13px/1 inherit!important;cursor:pointer!important;text-decoration:none!important';
document.querySelectorAll('input[type=password]').forEach(function(i){
  if(i.parentNode.classList&&i.parentNode.classList.contains('pwb'))return;
  var w=document.createElement('span');w.className='pwb';w.style.cssText='position:relative!important;display:block!important';
  i.parentNode.insertBefore(w,i);w.appendChild(i);i.style.paddingRight='84px';
  var b=document.createElement('button');b.type='button';b.textContent='Mostrar';b.style.cssText=BS;
  b.setAttribute('aria-label','Mostrar a senha digitada');b.setAttribute('aria-pressed','false');
  b.addEventListener('click',function(e){e.preventDefault();e.stopPropagation();var m=i.type==='password';i.type=m?'text':'password';b.textContent=m?'Ocultar':'Mostrar';b.setAttribute('aria-pressed',m?'true':'false');i.focus()});
  if(i.closest('#lg'))b.style.setProperty('color','#0A63CF','important');w.appendChild(b);
});
})();
