(function(){
  'use strict';
  var root=document.documentElement,btn=document.getElementById('themeToggle');
  var themeMachine=kpibMachines.createThemeMachine(root.dataset.theme);
  function paint(t){
    root.dataset.theme=t;
    if(btn){btn.innerHTML=(window.kpibIcon?kpibIcon(t==='dark'?'sun':'moon'):'')+'<span class="tlabel">'+(t==='dark'?'Light':'Dark')+'</span>';btn.setAttribute('aria-label','Switch to '+(t==='dark'?'light':'dark')+' theme');}
  }
  themeMachine.subscribe(function(next){
    paint(next);
    try{localStorage.setItem('kpib-theme',next);}catch(e){}
  });
  paint(themeMachine.getState());
  if(btn)btn.addEventListener('click',function(){themeMachine.send({type:'TOGGLE'});});
  var menu=document.querySelector('.kp-menu');
  if(menu){
    var menuMachine=kpibMachines.createToggleMachine('closed','open',menu.open);
    menuMachine.subscribe(function(state){menu.open=state==='open';});
    menu.addEventListener('toggle',function(){menuMachine.send({type:menu.open?'OPEN':'CLOSE'});});
    menu.querySelectorAll('a').forEach(function(a){a.addEventListener('click',function(){menuMachine.send({type:'CLOSE'});});});
    menu.addEventListener('keydown',function(e){if(e.key==='Escape'&&menuMachine.getState()==='open'){menuMachine.send({type:'CLOSE'});menu.querySelector('summary').focus();}});
  }
})();
