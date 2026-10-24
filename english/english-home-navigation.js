(()=>{'use strict';function boot(){
const main=/\/(?:main|index)\.html$/.test(location.pathname);
const old=document.querySelector('#navbar,nav.main-nav,nav.site-header,body>nav,body>header.header');
if(!old)return;
let nav=old;
if(main){nav.classList.add('es-reference-main');}
else{document.body.classList.add('es-reference-subpage');const fragment=document.createElement('template');fragment.innerHTML="<nav id=\"navbar\" class=\"site-header\">\n  <a href=\"main.html#hero\" class=\"nav-logo\">\n    <div class=\"monogram\">ES</div>\n    <span class=\"wordmark\">Englisch lernen</span>\n  </a>\n  <ul class=\"nav-links\">\n    <li><a href=\"main.html#theorie\">Theorie</a></li>\n    <li><a href=\"main.html#Spi\">Übungen</a></li>\n    <li><a href=\"main.html#Fortschritt\">Mein Fortschritt</a></li><li><a href=\"main.html#Pruefung\">Prüfung</a></li><li><a href=\"main.html#lernwerkstatt\">Lernwerkstatt</a></li>\n  </ul>\n  <div class=\"nav-account-actions\"><a href=\"main.html\" class=\"account-link nav-cta\">Startseite</a></div>\n</nav>";nav=fragment.content.firstElementChild;old.replaceWith(nav);}
const menus=[...nav.querySelectorAll('details')];menus.forEach(menu=>menu.addEventListener('toggle',()=>{if(menu.open)menus.forEach(other=>{if(other!==menu)other.open=false})}));
document.addEventListener('click',event=>{menus.forEach(menu=>{if(menu.open&&!menu.contains(event.target))menu.open=false})});
document.addEventListener('keydown',event=>{if(event.key==='Escape')menus.forEach(menu=>{if(menu.open){menu.open=false;menu.querySelector('summary').focus()}})});
document.querySelectorAll('header .learning-goals').forEach(section=>{if(section.tagName==='DETAILS')return;const details=document.createElement('details'),summary=document.createElement('summary');details.className=section.className;summary.textContent=section.querySelector('h2')?.textContent||'Deine Lernziele';section.querySelector('h2')?.remove();details.append(summary,...section.childNodes);section.replaceWith(details)});
const file=decodeURIComponent(location.pathname.split('/').pop());document.querySelectorAll('.exercise-levels a,.levels>a,.reading-levels a').forEach(a=>{a.textContent=a.textContent.replace(/\s*·\s*(kostenlos|Premium)/gi,'');if(a.getAttribute('href')===file)a.setAttribute('aria-current','page')});
const offset=()=>{document.body.style.setProperty('padding-top',(nav.offsetHeight+(main?0:12))+'px','important');document.documentElement.style.scrollPaddingTop=(nav.offsetHeight+24)+'px'};offset();new ResizeObserver(offset).observe(nav);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot()})();
