(function(){var sb=document.getElementById('sb'),m=document.getElementById('mnu');if(!sb||!m)return;
function set(o){sb.classList.toggle('open',o);m.setAttribute('aria-expanded',o);m.textContent=o?'✕':'☰'}
m.addEventListener('click',function(){set(!sb.classList.contains('open'))});
document.getElementById('nv').addEventListener('click',function(e){if(e.target.closest('[data-v]')){set(false);window.scrollTo(0,0)}});
})();
