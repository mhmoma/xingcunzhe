(function(){
'use strict';
const CFG={gemRange:260,equipRange:300,collect:30,follow:4.4};
let glState=null,raf=0;
function active(){return !!(window.S&&S.run&&S.player&&!S.rift?.active&&S.mapId!=='rift')}
function num(name,fallback){try{return typeof window[name]==='number'?window[name]:eval(`typeof ${name}==='number'?${name}:${fallback}`)}catch(_){return fallback}}
function ensurePet(){
  if(!active())return null;
  let p=S.player,pet=S.petCollector;
  if(!pet||pet.mapId!==S.mapId){pet={x:p.x-52,y:p.y+36,phase:0,mapId:S.mapId};S.petCollector=pet}
  return pet
}
function movePet(dt,pet){
  let p=S.player,t=S.time||0,tx=p.x-54+Math.cos(t*1.7)*18,ty=p.y+36+Math.sin(t*2.1)*12;
  pet.x+=(tx-pet.x)*Math.min(1,dt*CFG.follow);
  pet.y+=(ty-pet.y)*Math.min(1,dt*CFG.follow);
  pet.phase=(pet.phase||0)+dt
}
function pullToPet(o,pet,range,dt){
  let dx=pet.x-o.x,dy=pet.y-o.y,d=Math.hypot(dx,dy)||1;
  if(d>range)return false;
  if(d>CFG.collect){let sp=(range-d)/range*520+120;o.x+=dx/d*sp*dt;o.y+=dy/d*sp*dt}
  return d<=CFG.collect
}
function addPickupFx(x,y,c,size){
  S.parts=S.parts||[];
  S.parts.push({x,y,vx:0,vy:-8,life:.32,max:.32,a:1,c,boom:size||34})
}
function pickGems(pet,dt){
  let gained=0;
  for(const g of S.gems||[]){
    if(!g||g.dead)continue;
    if(pullToPet(g,pet,CFG.gemRange,dt)){g.dead=true;gained+=Number(g.v)||0;g.v=0;addPickupFx(g.x,g.y,'#38bdf8',22)}
  }
  if(gained>0)S.player.xp+=gained;
  if(S.gems)S.gems=S.gems.filter(g=>!g.dead)
}
function rarityColor(item){
  try{return typeof eqRarityColor==='function'?eqRarityColor(item?.rarity):'#facc15'}catch(_){return'#facc15'}
}
function pickEquipment(pet,dt){
  let list=S.equipGround||[],picked=[];
  for(const d of list){
    if(!d||d.dead||!d.item)continue;
    if(pullToPet(d,pet,CFG.equipRange,dt)){d.dead=true;picked.push(d.item);addPickupFx(d.x,d.y,rarityColor(d.item),64)}
  }
  if(!picked.length)return;
  S.equipDrops=S.equipDrops||[];
  for(const it of picked)S.equipDrops.unshift(it);
  S.dropsSinceAltar=(S.dropsSinceAltar||0)+picked.length;
  S.equipGround=list.filter(d=>!d.dead);
  let msg=picked.length===1?`宠物拾取装备：${picked[0].name}`:`宠物拾取装备 ×${picked.length}`;
  try{typeof showNotice==='function'&&showNotice(msg)}catch(_){}
  try{if(typeof saveGame==='function')Promise.resolve(saveGame()).catch(e=>console.error('宠物拾取保存失败:',e.message,e.stack))}catch(e){console.error('宠物拾取保存失败:',e.message,e.stack)}
  try{if(S.dropsSinceAltar>=5&&!S.rift?.guardianKilled&&typeof openAltar==='function')openAltar()}catch(e){console.error('宠物打开净化祭坛失败:',e.message,e.stack)}
}
function updatePet(dt){
  let pet=ensurePet();
  if(!pet)return;
  movePet(dt,pet);
  pickGems(pet,dt);
  pickEquipment(pet,dt)
}
function patchUpdate(){
  if(typeof window.updateObjs!=='function'||window.updateObjs._petLooter)return false;
  let base=window.updateObjs;
  window.updateObjs=function(dt){let r=base.apply(this,arguments);try{updatePet(dt||0)}catch(e){console.error('宠物拾取更新失败:',e.message,e.stack)}return r};
  window.updateObjs._petLooter=true;
  return true
}
function makeShader(gl,type,src){let s=gl.createShader(type);gl.shaderSource(s,src);gl.compileShader(s);return s}
function ensureGl(){
  if(glState)return glState;
  let host=document.querySelector('.game'),base=document.getElementById('c');
  if(!host||!base)return null;
  let cv=document.createElement('canvas');
  cv.id='petWebglLayer';
  cv.style.cssText='position:absolute;inset:0;width:100%;height:100%;pointer-events:none;z-index:3;';
  host.insertBefore(cv,base.nextSibling);
  let gl=cv.getContext('webgl',{alpha:true,premultipliedAlpha:true});
  if(!gl)return null;
  let vs=makeShader(gl,gl.VERTEX_SHADER,'attribute vec2 q;uniform vec2 c;uniform vec2 s;varying vec2 uv;void main(){uv=q;gl_Position=vec4(c+q*s,0.0,1.0);}');
  let fs=makeShader(gl,gl.FRAGMENT_SHADER,'precision mediump float;varying vec2 uv;uniform float t;void main(){float d=length(uv);float a=smoothstep(1.0,.18,d);vec3 col=mix(vec3(.16,.85,1.0),vec3(1.0,.82,.25),.35+.25*sin(t*4.0));gl_FragColor=vec4(col,a*.82);}');
  let pr=gl.createProgram();gl.attachShader(pr,vs);gl.attachShader(pr,fs);gl.linkProgram(pr);gl.useProgram(pr);
  let buf=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buf);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,1,1]),gl.STATIC_DRAW);
  let q=gl.getAttribLocation(pr,'q');gl.enableVertexAttribArray(q);gl.vertexAttribPointer(q,2,gl.FLOAT,false,0,0);
  glState={cv,gl,pr,c:gl.getUniformLocation(pr,'c'),s:gl.getUniformLocation(pr,'s'),t:gl.getUniformLocation(pr,'t')};
  return glState
}
function renderPet(){
  let st=ensureGl();
  if(st){let {cv,gl,pr}=st,dpr=window.devicePixelRatio||1,w=cv.clientWidth*dpr,h=cv.clientHeight*dpr;if(cv.width!==w||cv.height!==h){cv.width=w;cv.height=h}gl.viewport(0,0,w,h);gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT);let pet=active()?S.petCollector:null;if(pet){let camX=num('CAMX',0),camY=num('CAMY',0),vw=num('W',w/dpr),vh=num('H',h/dpr),sx=(pet.x-camX)/vw*2-1,sy=1-(pet.y-camY)/vh*2,px=(24+Math.sin((S.time||0)*6)*3)*dpr;gl.useProgram(pr);gl.uniform2f(st.c,sx,sy);gl.uniform2f(st.s,px/w*2,px/h*2);gl.uniform1f(st.t,S.time||0);gl.drawArrays(gl.TRIANGLE_STRIP,0,4)}}
  raf=requestAnimationFrame(renderPet)
}
function boot(){if(!patchUpdate())setTimeout(boot,200);if(!raf)renderPet()}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
})();
