(function(){
'use strict';
const KEY='arcane-pets-v1',PET_CORE=150,CFG={gemRange:260,equipRange:300,collect:30,follow:4.4};
const PETS=[
  {id:'sprigatito',name:'新叶喵',src:'./assets/pokemom/sprigatito.gif'},
  {id:'fuecoco',name:'呆火鳄',src:'./assets/pokemom/fuecoco.gif'},
  {id:'quaxly',name:'润水鸭',src:'./assets/pokemom/quaxly.gif'}
];
let glState=null,raf=0,state={owned:false,selected:'sprigatito'},ready=false,imgCache={};
const $=id=>document.getElementById(id),esc=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
function notice(t){try{typeof showNotice==='function'&&showNotice(t)}catch(_){}}
function petDef(id=state.selected){return PETS.find(p=>p.id===id)||PETS[0]}
async function init(){if(ready)return state;try{let v=await StorageSync.get(KEY);state={owned:!!v?.owned,selected:petDef(v?.selected).id};ready=true}catch(e){ready=true;console.error('宠物数据读取失败:',e.message,e.stack)}return state}
async function save(){try{await StorageSync.put(KEY,state,'宠物')}catch(e){console.error('宠物数据保存失败:',e.message,e.stack)}}
function hasPet(){return !!state.owned}
function active(){return !!(hasPet()&&window.S&&S.run&&S.player&&!S.rift?.active&&S.mapId!=='rift')}
function num(name,fallback){try{return typeof window[name]==='number'?window[name]:eval(`typeof ${name}==='number'?${name}:${fallback}`)}catch(_){return fallback}}
function ensureUi(){
  if(!$('petPanel'))document.querySelector('.game')?.insertAdjacentHTML('beforeend',`<section id="petPanel" class="overlay hidden"><div class="panel petPanelBox"><h1 class="title">宠物</h1><div id="petPanelBody" class="shopDetailBody"></div><p class="sub"><button id="petPanelClose" class="ghostBtn" type="button">关闭</button></p></div></section>`);
  $('petPanelClose')?.addEventListener('click',()=>{$('petPanel')?.classList.add('hidden');if(S&&!S.run)S.paused=false});
  if(!$('petStyle'))document.head.insertAdjacentHTML('beforeend',`<style id="petStyle">.petEquipBtn{margin-left:6px!important;min-width:34px!important;padding:5px 9px!important;border-radius:10px!important;background:rgba(56,189,248,.18)!important;color:#dff8ff!important;border:1px solid rgba(125,211,252,.6)!important;box-shadow:0 0 12px rgba(56,189,248,.22)!important}.petStatusCard{display:grid;gap:10px;text-align:left}.petPickGrid{display:grid;grid-template-columns:repeat(3,1fr);gap:10px}.petPick{min-height:116px!important;padding:8px!important;border-radius:14px!important}.petPick.selected{outline:2px solid #facc15!important;box-shadow:0 0 18px rgba(250,204,21,.42)!important}.petPick img,.petOrbPreview img{image-rendering:auto;object-fit:contain}.petPick img{width:64px;height:64px}.petOrbPreview{width:88px;height:88px;margin:0 auto 8px;display:grid;place-items:center;border-radius:50%;background:radial-gradient(circle,rgba(125,211,252,.22),rgba(14,165,233,.08) 65%,transparent);box-shadow:0 0 22px rgba(56,189,248,.38)}.petOrbPreview img{max-width:82px;max-height:82px}</style>`)
}
function petCards(){return PETS.map(p=>`<button class="petPick ${state.selected===p.id?'selected':''}" data-pet-pick="${esc(p.id)}" ${hasPet()?'':'disabled'}><img src="${esc(p.src)}" alt="${esc(p.name)}"><b>${esc(p.name)}</b><small>${state.selected===p.id?'出战中':'点击出战'}</small></button>`).join('')}
function panelHtml(){let p=petDef();return `<div class="petStatusCard"><div class="petOrbPreview"><img src="${esc(p.src)}" alt="${esc(p.name)}"></div><p><b>${esc(p.name)}</b> · 拾取宠物</p><p>普通和无尽模式自动拾取附近经验球与地上装备。大秘境不生效。</p><p><b>状态：</b>${hasPet()?'已拥有，进入普通/无尽自动出战':'未拥有'}</p>${hasPet()?'<div class="petPickGrid">'+petCards()+'</div>':'<p><b>价格：</b>'+PET_CORE+' 魔核</p>'}</div>`}
function openPanel(){ensureUi();$('petPanelBody').innerHTML=panelHtml();$('petPanel')?.classList.remove('hidden')}
async function buyPet(){
  let b=$('shopDetailBuy');
  if(hasPet()){openPanel();return}
  try{
    b&&(b.disabled=true,b.textContent='购买中...');
    await init();await Progression?.init?.();
    if(hasPet()){b&&(b.disabled=false,b.textContent='查看宠物');openPanel();return}
    if(!await Progression.spendCore(PET_CORE)){b&&(b.disabled=false,b.textContent='购买宠物');$('shopDetailMsg')&&($('shopDetailMsg').textContent='魔核不足');notice('魔核不足');return}
    state.owned=true;state.selected=state.selected||PETS[0].id;await save();
    $('shopDetailBody')&&($('shopDetailBody').innerHTML=panelHtml());$('shopDetailMsg')&&($('shopDetailMsg').textContent='购买成功：宠物已解锁');
    b&&(b.disabled=false,b.textContent='查看宠物');notice('宠物已解锁');try{renderProgression?.()}catch(_){}
  }catch(e){b&&(b.disabled=false,b.textContent='购买宠物');$('shopDetailMsg')&&($('shopDetailMsg').textContent='购买失败，请重试');console.error('宠物购买失败:',e.code,e.message,e.stack)}
}
function shopDetail(){return{title:'宠物',body:panelHtml(),buyText:hasPet()?'查看宠物':'购买宠物',buy:hasPet()?openPanel:buyPet}}
function ensurePet(){if(!active())return null;let p=S.player,pet=S.petCollector;if(!pet||pet.mapId!==S.mapId){pet={x:p.x-52,y:p.y+36,phase:0,mapId:S.mapId};S.petCollector=pet}return pet}
function movePet(dt,pet){let p=S.player,t=S.time||0,tx=p.x-54+Math.cos(t*1.7)*18,ty=p.y+36+Math.sin(t*2.1)*12;pet.x+=(tx-pet.x)*Math.min(1,dt*CFG.follow);pet.y+=(ty-pet.y)*Math.min(1,dt*CFG.follow);pet.phase=(pet.phase||0)+dt}
function pullToPet(o,pet,range,dt){let dx=pet.x-o.x,dy=pet.y-o.y,d=Math.hypot(dx,dy)||1;if(d>range)return false;if(d>CFG.collect){let sp=(range-d)/range*520+120;o.x+=dx/d*sp*dt;o.y+=dy/d*sp*dt}return d<=CFG.collect}
function addPickupFx(x,y,c,size){S.parts=S.parts||[];S.parts.push({x,y,vx:0,vy:-8,life:.32,max:.32,a:1,c,boom:size||34})}
function pickGems(pet,dt){let gained=0;for(const g of S.gems||[]){if(!g||g.dead)continue;if(pullToPet(g,pet,CFG.gemRange,dt)){g.dead=true;gained+=Number(g.v)||0;g.v=0;addPickupFx(g.x,g.y,'#38bdf8',22)}}if(gained>0)S.player.xp+=gained;if(S.gems)S.gems=S.gems.filter(g=>!g.dead)}
function rarityColor(item){try{return typeof eqRarityColor==='function'?eqRarityColor(item?.rarity):'#facc15'}catch(_){return'#facc15'}}
function pickEquipment(pet,dt){let list=S.equipGround||[],picked=[];for(const d of list){if(!d||d.dead||!d.item)continue;if(pullToPet(d,pet,CFG.equipRange,dt)){d.dead=true;picked.push(d.item);addPickupFx(d.x,d.y,rarityColor(d.item),64)}}if(!picked.length)return;S.equipDrops=S.equipDrops||[];for(const it of picked)S.equipDrops.unshift(it);S.dropsSinceAltar=(S.dropsSinceAltar||0)+picked.length;S.equipGround=list.filter(d=>!d.dead);notice(picked.length===1?`宠物拾取装备：${picked[0].name}`:`宠物拾取装备 ×${picked.length}`);try{if(typeof saveGame==='function')Promise.resolve(saveGame()).catch(e=>console.error('宠物拾取保存失败:',e.message,e.stack))}catch(e){console.error('宠物拾取保存失败:',e.message,e.stack)}try{if(S.dropsSinceAltar>=5&&!S.rift?.guardianKilled&&typeof openAltar==='function')openAltar()}catch(e){console.error('宠物打开净化祭坛失败:',e.message,e.stack)}}
function updatePet(dt){let pet=ensurePet();if(!pet)return;movePet(dt,pet);pickGems(pet,dt);pickEquipment(pet,dt)}
function patchUpdate(){if(typeof window.updateObjs!=='function'||window.updateObjs._petLooter)return false;let base=window.updateObjs;window.updateObjs=function(dt){let r=base.apply(this,arguments);try{updatePet(dt||0)}catch(e){console.error('宠物拾取更新失败:',e.message,e.stack)}return r};window.updateObjs._petLooter=true;return true}
function patchEquipment(){if(typeof window.renderEquipment!=='function'||window.renderEquipment._petLooter)return false;let base=window.renderEquipment;window.renderEquipment=function(){let r=base.apply(this,arguments);addEquipButton();return r};window.renderEquipment._petLooter=true;addEquipButton();return true}
function addEquipButton(){let sub=$('equipSub');if(!sub||sub.querySelector('[data-pet-open]'))return;let ref=sub.querySelector('[data-eq-class-switch]')||sub.firstChild,btn=document.createElement('button');btn.className='petEquipBtn';btn.type='button';btn.dataset.petOpen='1';btn.textContent='宠';btn.title='宠物';ref?.after?ref.after(btn):sub.prepend(btn)}
function imgFor(){let p=petDef();if(!imgCache[p.id]){let img=new Image();img.src=p.src;imgCache[p.id]=img}return imgCache[p.id]}
function makeShader(gl,type,src){let s=gl.createShader(type);gl.shaderSource(s,src);gl.compileShader(s);return s}
function ensureGl(){if(glState)return glState;let host=document.querySelector('.game'),base=$('c');if(!host||!base)return null;let cv=document.createElement('canvas');cv.id='petWebglLayer';cv.style.cssText='position:absolute;inset:0;width:100%;height:100%;pointer-events:none;z-index:3;';host.insertBefore(cv,base.nextSibling);let gl=cv.getContext('webgl',{alpha:true,premultipliedAlpha:true});if(!gl)return null;let vs=makeShader(gl,gl.VERTEX_SHADER,'attribute vec2 q;uniform vec2 c;uniform vec2 s;varying vec2 uv;void main(){uv=(q+1.0)*0.5;gl_Position=vec4(c+q*s,0.0,1.0);}'),fs=makeShader(gl,gl.FRAGMENT_SHADER,'precision mediump float;varying vec2 uv;uniform sampler2D tex;uniform float flip;void main(){vec2 v=vec2(uv.x,flip>0.5?1.0-uv.y:uv.y);vec4 col=texture2D(tex,v);if(col.a<.05)discard;gl_FragColor=col;}'),pr=gl.createProgram();gl.attachShader(pr,vs);gl.attachShader(pr,fs);gl.linkProgram(pr);gl.useProgram(pr);let buf=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buf);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,1,1]),gl.STATIC_DRAW);let q=gl.getAttribLocation(pr,'q');gl.enableVertexAttribArray(q);gl.vertexAttribPointer(q,2,gl.FLOAT,false,0,0);let tex=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,tex);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);glState={cv,gl,pr,tex,c:gl.getUniformLocation(pr,'c'),s:gl.getUniformLocation(pr,'s'),flip:gl.getUniformLocation(pr,'flip')};return glState}
function drawSprite(st,pet){let {cv,gl}=st,dpr=window.devicePixelRatio||1,w=cv.width,h=cv.height,img=imgFor();if(!img.complete||!img.naturalWidth)return;gl.bindTexture(gl.TEXTURE_2D,st.tex);try{gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL,true);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,img)}catch(e){return}let camX=num('CAMX',0),camY=num('CAMY',0),vw=num('W',w/dpr),vh=num('H',h/dpr),sx=(pet.x-camX)/vw*2-1,sy=1-(pet.y-camY)/vh*2,base=60*dpr,ratio=(img.naturalHeight||1)/(img.naturalWidth||1);gl.useProgram(st.pr);gl.uniform2f(st.c,sx,sy);gl.uniform2f(st.s,base/w*2,base*ratio/h*2);gl.uniform1f(st.flip,1);gl.drawArrays(gl.TRIANGLE_STRIP,0,4)}
function renderPet(){let st=ensureGl();if(st){let {cv,gl}=st,dpr=window.devicePixelRatio||1,w=cv.clientWidth*dpr,h=cv.clientHeight*dpr;if(cv.width!==w||cv.height!==h){cv.width=w;cv.height=h}gl.viewport(0,0,w,h);gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT);let pet=active()?S.petCollector:null;if(pet)drawSprite(st,pet)}raf=requestAnimationFrame(renderPet)}
async function pickPet(id){await init();if(!hasPet())return;state.selected=petDef(id).id;await save();openPanel();notice('宠物出战：'+petDef().name)}
function bind(){document.addEventListener('click',e=>{let b=e.target.closest('[data-pet-open]');if(b){e.preventDefault();e.stopPropagation();openPanel();return}let p=e.target.closest('[data-pet-pick]');if(p){e.preventDefault();e.stopPropagation();pickPet(p.dataset.petPick)}},true)}
function boot(){ensureUi();init();bind();if(!patchUpdate())setTimeout(boot,200);if(!patchEquipment())setTimeout(patchEquipment,300);if(!raf)renderPet()}
window.PetLooter={init,hasPet,shopDetail,openPanel,buyPet};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
})();
