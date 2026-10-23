/* carrossel da tela de login: avanca um slide a cada login concluido */
(function(){
var side=document.getElementById('gate-side');if(!side)return;
var slides=[].slice.call(side.querySelectorAll('.gate-slide')),box=side.querySelector('.gate-dots'),KEY='mf_login_slide',cur=0,timer;
var reduz=window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches;
function ler(){try{return parseInt(localStorage.getItem(KEY),10)||0}catch(_){return 0}}
function gravar(n){try{localStorage.setItem(KEY,String(n))}catch(_){}}
window.avancarCarrossel=function(){gravar((ler()+1)%slides.length)};
var dots=slides.map(function(_,i){var b=document.createElement('button');b.type='button';b.setAttribute('aria-label','Slide '+(i+1)+' de '+slides.length);b.addEventListener('click',function(){show(i);play()});box.appendChild(b);return b});
function show(i){cur=i;slides.forEach(function(s,n){s.classList.toggle('on',n===i);s.setAttribute('aria-hidden',n===i?'false':'true')});dots.forEach(function(d,n){d.setAttribute('aria-current',n===i?'true':'false')})}
function play(){clearInterval(timer);if(reduz)return;timer=setInterval(function(){if(side.offsetParent)show((cur+1)%slides.length)},6000)}
show(ler()%slides.length);play();
side.addEventListener('mouseenter',function(){clearInterval(timer)});
side.addEventListener('mouseleave',play);
side.addEventListener('focusin',function(){clearInterval(timer)});
side.addEventListener('focusout',play);
})();
