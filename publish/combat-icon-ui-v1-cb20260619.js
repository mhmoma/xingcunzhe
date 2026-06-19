(function(){
'use strict';
const labels={
  saveBtn:['💾','存档'],
  settingsBtn:['⚙','设置'],
  relicBtn:['✦','职业神器'],
  skillBtn:['✧','技能'],
  invBtn:['🎒','神器栏'],
  equipBtn:['🛡','装备']
};
let collapsed=false,tipTimer=0;
function iconButton(btn,icon,label){
  if(!btn)return;
  btn.dataset.iconUi='1';
  btn.dataset.label=label;
  btn.classList.add('combatIconButton');
  btn.setAttribute('aria-label',label);
  btn.title=label;
  if(!btn.querySelector('.combatIcon')){
    btn.innerHTML=`<span class="combatIcon" aria-hidden="true">${icon}</span><span class="srOnly">${label}</span>`;
  }
}
function iconize(){
  for(const [id,[icon,label]] of Object.entries(labels))iconButton(document.getElementById(id),icon,label);
  const mode=document.getElementById('modeBtn');
  if(mode){
    const raw=(mode.textContent||'').trim();
    if(raw&&!mode.querySelector('.swordsIcon'))mode.dataset.modeLabel=raw;
    mode.dataset.iconUi='1';
    mode.classList.add('combatIconButton');
    mode.setAttribute('aria-label','自动战斗模式');
    mode.title='自动战斗';
    if(!mode.querySelector('.swordsIcon'))mode.innerHTML='<span class="swordsIcon" aria-hidden="true"></span><span class="srOnly">自动战斗</span>';
    if(!mode.dataset.modeTipBound){
      mode.dataset.modeTipBound='1';
      mode.addEventListener('click',()=>setTimeout(showModeTip,40),true);
    }
  }
  ensureToggle();
  applyHudState();
}
function ensureToggle(){
  const game=document.querySelector('.game');
  if(!game||document.getElementById('hudFoldBtn'))return;
  const btn=document.createElement('button');
  btn.id='hudFoldBtn';
  btn.className='hudFoldBtn';
  btn.type='button';
  btn.textContent='▾';
  btn.setAttribute('aria-label','折叠状态栏');
  btn.onclick=()=>{collapsed=!collapsed;applyHudState();};
  game.appendChild(btn);
}
function setHudLabel(id,foldText,fullText){
  const span=document.querySelector(`#${id} label span:first-child`);
  if(span)span.textContent=collapsed?foldText:fullText;
}
function applyHudState(){
  const hud=document.querySelector('.hud'),btn=document.getElementById('hudFoldBtn');
  if(!hud||!btn)return;
  hud.classList.toggle('hudCollapsed',collapsed);
  btn.classList.toggle('folded',collapsed);
  btn.textContent=collapsed?'▸':'▾';
  btn.setAttribute('aria-label',collapsed?'展开状态栏':'折叠状态栏');
  setHudLabel('hudHp','血量','生命');
  setHudLabel('hudBoss','Boss进度','下个魔王');
}
function showModeTip(){
  const mode=document.getElementById('modeBtn');
  if(!mode)return;
  const label=(mode.dataset.modeLabel||'自动·均衡').replace(/自动[·・]?/,'')||'均衡';
  let box=document.getElementById('modeTip');
  if(!box){
    box=document.createElement('div');
    box.id='modeTip';
    box.className='modeTip';
    document.querySelector('.game')?.appendChild(box);
  }
  box.textContent=`自动战斗：${label}`;
  box.classList.add('show');
  clearTimeout(tipTimer);
  tipTimer=setTimeout(()=>box.classList.remove('show'),1400);
}
new MutationObserver(iconize).observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['class']});
document.addEventListener('DOMContentLoaded',iconize);
iconize();
})();
