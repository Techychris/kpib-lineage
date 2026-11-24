(function(){
  'use strict';
  var root=document.documentElement,btn=document.getElementById('themeToggle');
  function paint(t){
    root.dataset.theme=t;
    if(btn){btn.textContent=t==='dark'?'Light':'Dark';btn.setAttribute('aria-label','Switch to '+(t==='dark'?'light':'dark')+' theme');}
  }
  paint(root.dataset.theme==='dark'?'dark':'light');
  if(btn)btn.addEventListener('click',function(){
    var next=root.dataset.theme==='dark'?'light':'dark';
    paint(next);
    try{localStorage.setItem('kpib-theme',next);}catch(e){}
  });
  var menu=document.querySelector('.kp-menu');
  if(menu){
    menu.querySelectorAll('a').forEach(function(a){a.addEventListener('click',function(){menu.open=false;});});
    menu.addEventListener('keydown',function(e){if(e.key==='Escape'&&menu.open){menu.open=false;menu.querySelector('summary').focus();}});
  }
})();
