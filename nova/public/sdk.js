/* NOVA game SDK. Add <script src="https://nova-games.up.railway.app/sdk.js"></script> to your game.
   Nova.user()            who is playing, or {signedIn:false}
   Nova.signIn()          ask the player to sign in
   Nova.save(key, value)  keep data in the player's NOVA account
   Nova.load(key)         read it back
   Nova.config()          the auth and database you connected in the creator portal (public values only) */
(function(){ var wait={}, n=0;
  function call(type,data){ return new Promise(function(res){ if(window.parent===window) return res(null); var id=++n; wait[id]=res; window.parent.postMessage({novaCall:id,type:type,data:data},'*'); }); }
  window.addEventListener('message',function(e){ var d=e.data; if(e.source!==window.parent||!d||!d.novaReply||!wait[d.novaReply]) return; var r=wait[d.novaReply]; delete wait[d.novaReply]; r(d.result); });
  window.Nova={ user:function(){ return call('user'); }, signIn:function(){ return call('signin'); }, config:function(){ return call('config'); }, save:function(k,v){ return call('save',{key:k,data:{data:v}}).then(function(r){ return r; }); }, load:function(k){ return call('load',{key:k}).then(function(r){ return r?r.data:null; }); } };
})();
