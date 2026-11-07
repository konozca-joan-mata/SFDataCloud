(function(){
  var S={get:function(k){try{return localStorage.getItem(k)}catch(e){return null}},set:function(k,v){try{localStorage.setItem(k,v)}catch(e){}}};
  var body=document.body;
  if(S.get('dc:mode')==='review'){body.classList.add('review');}
  var b=document.getElementById('mode');
  function label(){if(b){b.textContent=body.classList.contains('review')?'📖 Modo aprender':'⚡ Modo repaso';}}
  if(b){label();b.onclick=function(){body.classList.toggle('review');S.set('dc:mode',body.classList.contains('review')?'review':'learn');label();};}
  document.querySelectorAll('details.collapsible[data-k]').forEach(function(d){var k='dc:fold:'+d.getAttribute('data-k');if(S.get(k)==='1'){d.setAttribute('open','');}d.addEventListener('toggle',function(){S.set(k,d.open?'1':'0');});});
  var page=body.getAttribute('data-page');
  if(page){document.querySelectorAll('input[data-k]').forEach(function(i){var k='dc:'+page+':'+i.getAttribute('data-k');i.checked=S.get(k)==='1';i.onchange=function(){S.set(k,i.checked?'1':'0');};});}
  document.querySelectorAll('.nav-card[data-page]').forEach(function(c){if(S.get('dc:'+c.getAttribute('data-page')+':done')==='1'){c.classList.add('is-done');}});
})();
