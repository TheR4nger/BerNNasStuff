/**
 * @name PlainChat Revamp
 * @author BerNNas & ChatGPT
 * @version 1.1.4
 * @description Role-aware DK aliases in Champion Select, self-name protection, safe chat labels and lightweight lifecycle handling.
 */
const DEBUG=false; // Enable temporarily for detailed logs; status() always works
const ROLE_TO_DK = Object.freeze({
  top:'DK Doran', jungle:'DK Kanavi', middle:'DK ShowMaker',
  bottom:'DK Smash', utility:'DK Delight'
});
const ROLE = Object.freeze({
  TOP:'top', JUNGLE:'jungle', MID:'middle', MIDDLE:'middle',
  BOT:'bottom', BOTTOM:'bottom', ADC:'bottom', SUPPORT:'utility', UTILITY:'utility'
});
const SESSION='/lol-champ-select/v1/session';
const PHASE='/lol-gameflow/v1/gameflow-phase';
const CURRENT='/lol-summoner/v1/current-summoner';
const CHAT_ME='/lol-chat/v1/me';
const SLOT='.summoner-container';
const NAME='.player-name-wrapper';
const FRAME='#embedded-messages-frame';
const SELF_SELECTORS=[
  '.image-ring-spinner.is-self',
  '.summoner-object.is-self',
  '.summoner-container.is-self',
  '[data-is-self="true"]',
  '[data-local-player="true"]'
];
const MONSTERS=/^(?:Gromp|Krug|Raptor|Murk Wolf|Scuttle Crab)$/i;
const anonymous=v=>MONSTERS.test(String(v??'').trim());
const roleOf=v=>ROLE[String(v??'').trim().toUpperCase()]||null;
const cellOf=v=>v!==null&&v!==undefined&&v!==''&&Number.isSafeInteger(Number(v))?Number(v):null;
const cleanTag=v=>String(v??'').replace(/#[A-Za-z0-9]{2,6}(?=$|[\s),;.!?])/g,'');
const cleanName=v=>cleanTag(v).replace(/\s*\((?:Gromp|Krug|Raptor|Murk Wolf|Scuttle Crab)\)/gi,'').trim();
const escapeRe=v=>v.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
const nameFromMe=me=>{
  if(!me||typeof me!=='object')return '';
  const name=String(me.gameName||me.displayName||me.name||'').trim();
  return cleanTag(name).trim();
};
// Prefer exact role labels; fall back to a complete visible-text line.
// In the current League DOM the role is visible in innerText even when
// .summoner-secondary-text only contains "Banning...".
const exactRoleInSlot=slot=>{
  const found=new Set();
  for(const el of slot.querySelectorAll('.summoner-secondary-text span, .summoner-secondary-text')){
    if(el.children?.length)continue;
    const r=roleOf(el.textContent);
    if(r)found.add(r);
  }
  if(found.size===1)return [...found][0];
  if(found.size>1)return null;
  const lines=String(slot.innerText||'').split(/[\r\n]+/)
    .map(x=>x.trim()).filter(Boolean);
  // The role is its own line, not part of a champion or status label.
  const visible=new Set(lines.map(roleOf).filter(Boolean));
  return visible.size===1?[...visible][0]:null;
};
const slotId=slot=>{
  const ids=[];
  for(const el of [slot,...slot.querySelectorAll('[data-cell-id],[data-player-cell-id],[data-cellid]')]){
    for(const attr of ['data-cell-id','data-player-cell-id','data-cellid']){
      const raw=el.getAttribute?.(attr);
      if(raw!=null){const n=cellOf(raw);if(n!==null)ids.push(n)}
    }
  }
  return new Set(ids).size===1?ids[0]:null;
};
export function createEngine({doc, getSession, getMe, observe=null, Observer=MutationObserver,
  interval=setInterval, clear=clearInterval, logger=console}){
  let active=false, roles=new Map(), ownCell=null, ownRole=null, me='';
  let epoch=0, request=0, started=false, stopped=false, queued=false;
  let scheduleTimer=null, requestInFlight=false, lastIdentityRead=0;
  let pendingRefresh=false, lastWarn=0;
  let lastReconcileAt=0;
  let lastApplyMs=null, lastApplyAt=null;
  let sessionKey='', mainObserver=null, chatObserver=null, frameDoc=null;
  let subscriptions=[], polling=null, repair=null;
  let originals=new WeakMap(), lastWrites=new WeakMap(), touched=new Set();
  // Own banner is read-only: never write the summoner's nickname into a slot.
  let selfEvidence='';
  const lastDebug={};
  function debug(tag,data){
    if(!DEBUG)return;
    try{
      const sig=JSON.stringify(data);
      if(lastDebug[tag]===sig)return;
      lastDebug[tag]=sig;
      logger.log?.('[PlainChat Revamp]',tag,sig);
    }catch(_){}
  }
  let aliases=new Map(), diagnostics={reason:'not-in-champ-select',slots:0,updated:0,skipped:0};

  // Select one unambiguous text leaf, preserving all HTML wrappers.
  function textTarget(el) {
    if (!el) return null;
    if (el.nodeType === 3) return el;
    if (!el.querySelectorAll || el.nodeType === undefined) return el; // Lightweight test fixtures.
    const leaves = [];
    const walk = node => {
      if (node.nodeType === 3) {
        if (node.textContent.trim()) leaves.push(node);
        return;
      }
      // Do not touch icons, links, buttons, emotes or editable content.
      if (node.nodeType !== 1 || node.matches?.('a,button,svg,img,[contenteditable],.emote')) return;
      for (const child of node.childNodes || []) walk(child);
    };
    walk(el);
    return leaves.length === 1 ? leaves[0] : null;
  }
  function original(el) {
    const target = textTarget(el);
    if (!target) return null;
    const now = target.textContent || '';
    const prev = originals.get(target);
    if (prev === undefined || (now !== lastWrites.get(target) && now !== prev))
      originals.set(target, now);
    return originals.get(target);
  }
  function write(el, value) {
    const target = textTarget(el);
    if (!target || value == null || target.textContent === value) return;
    target.textContent = value;
    lastWrites.set(target, value);
    touched.add(target);
  }
  function resetName(el){
    const target=textTarget(el);
    if(!target||!lastWrites.has(target))return;
    if(target.textContent===lastWrites.get(target)&&originals.has(target)){
      target.textContent=originals.get(target);
    }
    lastWrites.delete(target);
    touched.delete(target);
  }
  function restore() {
    for (const target of touched) {
      if (target.isConnected !== false && target.textContent === lastWrites.get(target) &&
          originals.has(target)) {
        target.textContent = originals.get(target);
        lastWrites.set(target, target.textContent);
      }
    }
    touched.clear();
    selfEvidence='';
    aliases.clear();
    diagnostics={reason:'not-in-champ-select',slots:0,updated:0,skipped:0};
  }
  function pruneTouched() {
    for (const target of touched) if (target.isConnected === false) touched.delete(target);
  }
  function readSlots(){
    const slots=[...doc.querySelectorAll(SLOT)].filter(s=>s.querySelector(NAME));
    // The confirmed live layout contains 5 allied banners followed by 5 enemies.
    // Avoid expensive innerText/role parsing on the enemy half; alliedSlots()
    // still verifies the self marker/name before trusting this boundary.
    return slots.map((slot,index)=>({
      slot,el:slot.querySelector(NAME),
      role:(slots.length===10&&index>=5)?null:exactRoleInSlot(slot),
      id:(slots.length===10&&index>=5)?null:slotId(slot),
      marked:SELF_SELECTORS.some(s=>slot.matches?.(s)||!!slot.querySelector(s))
    }));
  }
  function alliedSlots(infos){
    // The live DOM showed 5 allies followed by 5 enemies. Only use that
    // boundary if the local self marker/name confirms we are in the ally half.
    if(infos.length===5)return infos;
    if(infos.length!==10)return [];
    const first=infos.slice(0,5), rest=infos.slice(5);
    const ownInFirst=first.some(x=>x.marked || (me && cleanName(original(x.el)??'').toLowerCase()===me.toLowerCase()));
    const ownInRest=rest.some(x=>x.marked || (me && cleanName(original(x.el)??'').toLowerCase()===me.toLowerCase()));
    if(!ownInFirst||ownInRest)return [];
    // Prevent accidentally processing enemy banners if Riot changes ordering.
    if(first.some(x=>!x.el)||rest.some(x=>!x.el))return [];
    return first;
  }
  function identify(infos){
    if(!active)return null;
    // The League Client already renders the real nickname in the local slot.
    // Prefer exact nickname evidence over any pick-order/role inference.
    const byName=me?infos.filter(x=>cleanName(original(x.el)??'').toLowerCase()===me.toLowerCase()):[];
    if(byName.length===1){
      const mine=byName[0];
      if(mine.id!==null&&ownCell!==null&&mine.id!==ownCell)return null;
      const contradictory=infos.some(x=>x!==mine&&x.id!==null&&x.id===ownCell);
      if(contradictory)return null;
      selfEvidence='nickname';return mine;
    }
    if(byName.length>1)return null;
    const marked=infos.filter(x=>x.marked);
    if(marked.length===1){
      const mine=marked[0];
      if(mine.id!==null&&ownCell!==null&&mine.id!==ownCell)return null;
      // The current summoner API name can differ from the displayed Riot ID.
      // A unique self marker with a non-anonymous label is stronger evidence.
      if(anonymous(original(mine.el)))return null;
      selfEvidence='self-marker';return mine;
    }
    if(marked.length>1)return null;
    if(ownCell!==null){
      const byCell=infos.filter(x=>x.id===ownCell);
      if(byCell.length===1){selfEvidence='cell-id';return byCell[0];}
      if(byCell.length>1)return null;
    }
    // Last-resort role matching is allowed ONLY when the candidate has a real
    // (non-anonymous) name and no other slot is marked as self.
    if(!ownRole||infos.length!==5)return null;
    const byRole=infos.filter(x=>x.role===ownRole);
    if(byRole.length!==1)return null;
    const mine=byRole[0];
    if(anonymous(original(mine.el))||!cleanName(original(mine.el)))return null;
    if(mine.id!==null&&ownCell!==null&&mine.id!==ownCell)return null;
    selfEvidence='real-name-and-role';return mine;
  }
  function updateBanners(){
    const all=readSlots();
    const infos=alliedSlots(all);
    const mine=identify(infos);
    const nextAliases=new Map();
    diagnostics={reason:'processing',slots:infos.length,updated:0,skipped:0};
    debug('slots',{
      count:infos.length,
      slots:infos.map(x=>({
        name:(x.el.textContent||'').trim(), role:x.role, cell:x.id, self:x.marked,
        labels:[...x.slot.querySelectorAll('.summoner-secondary-text')].map(e=>(e.textContent||'').trim())
      })),
      identified:!!mine, selfEvidence, me, ownRole, ownCell, apiRoles:Object.fromEntries(roles)
    });
    if(!mine){
      if(!infos.length)diagnostics.reason='ally-boundary-unconfirmed';
      // Only undo our own writes; never normalize/overwrite unknown players.
      for(const x of infos)resetName(x.el);
      aliases.clear();
      if(infos.length)diagnostics.reason='own-slot-unconfirmed';
      diagnostics.skipped=infos.length;
      return;
    }
    // Absolutely no writes to mine.el: League owns the local player's nickname.
    // Never touch the self banner, even when its position changes.
    const domRoleCounts=new Map(), apiRoleCounts=new Map();
    for(const x of infos)if(x.role)domRoleCounts.set(x.role,(domRoleCounts.get(x.role)||0)+1);
    for(const role of roles.values())apiRoleCounts.set(role,(apiRoleCounts.get(role)||0)+1);
    const candidates=[];
    for(const x of infos){
      if(x===mine)continue;
      const before=original(x.el);
      if(before===null){diagnostics.skipped++;continue;}
      const valid=anonymous(before)&&!!x.role&&!!ROLE_TO_DK[x.role]&&
        domRoleCounts.get(x.role)===1&&apiRoleCounts.get(x.role)===1&&
        (x.id===null||roles.get(x.id)===x.role)&&
        (x.id===null||x.id!==ownCell)&&
        // When the DOM has no cell id, the role must differ from ownRole.
        (x.id!==null||x.role!==ownRole);
      if(!valid){diagnostics.skipped++;resetName(x.el);continue;}
      candidates.push({x,before,dk:ROLE_TO_DK[x.role]});
    }
    const counts=new Map();
    for(const {before} of candidates){
      const key=cleanName(before).toLowerCase();
      counts.set(key,(counts.get(key)||0)+1);
    }
    for(const {x,before,dk} of candidates){
      const key=cleanName(before).toLowerCase();
      if(counts.get(key)===1)nextAliases.set(key,dk);
      write(x.el,dk);
      diagnostics.updated++;
    }
    aliases=nextAliases;
    diagnostics.reason=diagnostics.skipped?'partial':'ok';
    debug('result',{...diagnostics});
  }
  function senderName(raw){
    const source=cleanName(raw);
    return active&&aliases.get(source.toLowerCase())||source;
  }
  function systemText(raw){
    // Clean Riot IDs only in structural join/leave notifications. Never strip
    // arbitrary hashtags from message content or unrelated system messages.
    let result=String(raw??'').replace(
      /(^|\n)([^\n]*?)#[A-Za-z0-9]{2,6}(?=\s+(?:joined|left)\s+(?:the\s+)?lobby\b)/gi,
      (_,prefix,name)=>prefix+name.trimEnd()
    );
    if(!active)return result;
    for(const [name,dk] of [...aliases].sort((a,b)=>b[0].length-a[0].length)){
      if(!dk||MONSTERS.test(name))continue;
      const re=new RegExp(`(^|[^\\p{L}\\p{N}_])${escapeRe(name)}(?=$|[^\\p{L}\\p{N}_])`,'giu');
      result=result.replace(re,(_,prefix)=>prefix+dk);
    }
    // Replace known monster placeholders only in structural "X joined" messages.
    for(const [name,dk] of aliases){
      if(!dk||!MONSTERS.test(name))continue;
      const re=new RegExp(`(^|\\n)\\s*${escapeRe(name)}(?=\\s+(?:joined|left)\\b)`,'gim');
      result=result.replace(re,(_,prefix)=>prefix+dk);
    }
    return result;
  }
  function updateChat(){
    if(!frameDoc?.body)return;
    // Never rewrite message bodies: hashtags, links and emotes must be preserved.
    for(const el of frameDoc.querySelectorAll('.chat-message .message-name'))
      {const raw=original(el);if(raw!==null)write(el,senderName(raw));}
    for(const el of frameDoc.querySelectorAll('.system-message span'))
      {const raw=original(el);if(raw!==null)write(el,systemText(raw));}
    for(const el of frameDoc.querySelectorAll('.message-name')){
      if(!el.closest('.chat-message')){const raw=original(el);if(raw!==null)write(el,cleanName(raw));}
    }
  }
  function cleanOutsideLabels(){
    if(active||stopped)return;
    // Lightweight original plainChat-style tag cleanup in sender labels only.
    // Never alter the message body, URLs or user-written hashtags.
    const docs=[doc];
    try{const nested=doc.querySelector(FRAME)?.contentDocument;if(nested?.body)docs.push(nested)}catch(_){}
    for(const d of docs){
      for(const el of d.querySelectorAll?.('.chat-message .message-name, .message-name')||[]){
        const before=original(el);
        if(before!==null){const after=cleanName(before);if(after!==before)write(el,after);}
      }
    }
  }
  function attachFrame(){
    const frame=doc.querySelector(FRAME);
    let next=null;
    try{next=frame?.contentDocument||null}catch(_){}
    if(next===frameDoc)return;
    chatObserver?.disconnect();
    frameDoc=next?.body?next:null;
    if(frameDoc){
      chatObserver=new Observer(records=>{
        // Ignore champion-select chat body edits, typing and unrelated UI.
        // Only changes to sender/system labels or newly mounted messages matter.
        if(records.some(record=>{
          const target=record.target?.nodeType===3?record.target.parentElement:record.target;
          if(record.type==='characterData'&&lastWrites.get(record.target)===record.target.textContent)return false;
          if(target?.closest?.('.message-name,.system-message'))return true;
          if(record.type!=='childList')return false;
          return [...(record.addedNodes||[])].some(node=>node.nodeType===1&&(
            node.matches?.('.message-name,.system-message,.chat-message')||
            node.querySelector?.('.message-name,.system-message')
          ));
        }))schedule();
      });
      chatObserver.observe(frameDoc.body,{subtree:true,childList:true,characterData:true});
    }
  }
  function reconcile(){
    const startedAt=Date.now();
    queued=false;
    scheduleTimer=null;
    if(stopped)return;
    if(!active)return; // no DOM processing outside Champion Select
    pruneTouched();
    attachFrame();
    updateBanners();
    updateChat();
    lastApplyMs=Date.now()-startedAt;
    lastReconcileAt=Date.now();
    if(diagnostics.updated>0)lastApplyAt=Date.now();
  }
  function schedule(){
    if(queued||stopped||!active)return;
    queued=true;
    // Coalesce bursty Ember/React DOM mutations into one update.
    // Prefer client responsiveness over shaving milliseconds off DK labels.
    // Throttle repeated UI mutations to at most one scan per 160 ms.
    const wait=Math.max(120,160-(Date.now()-lastReconcileAt));
    scheduleTimer=setTimeout(reconcile,wait);
  }
  function deactivate(){
    epoch++;request++;
    active=false;roles.clear();ownCell=null;ownRole=null;sessionKey='';
    if(scheduleTimer!==null){clearTimeout(scheduleTimer);scheduleTimer=null;queued=false;}
    chatObserver?.disconnect();chatObserver=null;frameDoc=null;
    mainObserver?.disconnect();
    restore();
    cleanOutsideLabels();
  }
  function setSession(data){
    if(!data||!Array.isArray(data.myTeam)){debug('session',{rejected:'no myTeam'});return deactivate();}
    const own=cellOf(data.localPlayerCellId);
    const self=data.myTeam.find(p=>cellOf(p.cellId)===own);
    const myRole=roleOf(self?.assignedPosition);
    // During role swaps the API may briefly report no role. Keep last known
    // session but clear aliases until a complete assignment arrives.
    if(own===null||!self||!myRole){
      debug('session',{rejected:'no own cell/role',localPlayerCellId:data.localPlayerCellId,
        team:data.myTeam.map(p=>({cell:p.cellId,pos:p.assignedPosition}))});
      if(active){restore();roles.clear();ownRole=null;sessionKey='';diagnostics.reason='awaiting-own-role';}
      return;
    }
    const next=new Map();
    for(const p of data.myTeam){
      const c=cellOf(p.cellId),r=roleOf(p.assignedPosition);
      if(c!==null&&r)next.set(c,r);
    }
    debug('session',{ok:true,ownCell:own,ownRole:myRole,team:[...next]});
    const key=JSON.stringify([data.gameId??null,data.timer?.phase??null,own,[...next].sort((a,b)=>a[0]-b[0])]);
    const changed=!active||sessionKey!==key;
    if(changed)restore();
    roles=next;ownCell=own;ownRole=myRole;active=true;sessionKey=key;
    if(changed){
      mainObserver?.disconnect();
      mainObserver?.observe(doc.body,{subtree:true,childList:true,characterData:true});
      // On first confirmed session, process already-mounted banners immediately.
      // Later mutations still use a short debounce to avoid repeated DOM scans.
      if(doc.body)reconcile();
      else schedule();
    }
  }
  async function refresh(){
    if(stopped)return;
    if(requestInFlight){pendingRefresh=true;return;}
    requestInFlight=true;
    const seq=++request, generation=epoch;
    try{
      // Identity rarely changes; avoid fetching it on every LCU refresh.
      const shouldReadIdentity=!me || Date.now()-lastIdentityRead>120000;
      const [session,identity]=await Promise.all([
        getSession(),shouldReadIdentity&&getMe?getMe().catch(()=>null):Promise.resolve(null)
      ]);
      if(shouldReadIdentity)lastIdentityRead=Date.now();
      if(stopped||seq!==request||generation!==epoch)return;
      const nextMe=nameFromMe(identity);
      if(nextMe)me=nextMe;
      setSession(session);
    }catch(error){
      if(!stopped&&seq===request&&generation===epoch){
        if(error?.status===404){deactivate();}
        else if(Date.now()-lastWarn>60000){
          lastWarn=Date.now();
          logger.warn('[PlainChat Revamp] Transient LCU error; will retry',error);
        }
      }
    }finally{
      requestInFlight=false;
      if(pendingRefresh&&!stopped){pendingRefresh=false;queueMicrotask(refresh)}
    }
  }
  function onSession(event){
    if(event?.eventType==='Delete')return deactivate();
    refresh();
  }
  function onPhase(event){
    if(typeof event?.data==='string'){
      if(event.data!=='ChampSelect')return deactivate();
    }
    refresh();
  }
  function start(){
    if(started||stopped)return;
    started=true;
    mainObserver=new Observer(records=>{
      if(!active)return;
      // Ignore unrelated changes from other plugins, wallpaper/video and UI.
      if(records.some(record=>{
        const target=record.target;
        if(record.type==='characterData' && lastWrites.get(target)===target.textContent)return false;
        if((target?.nodeType===3?target.parentElement:target)?.closest?.(SLOT))return true;
        if(target?.matches?.(SLOT))return true;
        if(record.type==='childList'){
          for(const node of record.addedNodes||[]){
            if(node.nodeType!==1)continue;
            if(node.matches?.(SLOT)||node.querySelector?.(SLOT)||
               node.matches?.(FRAME)||node.querySelector?.(FRAME))return true;
          }
        }
        return false;
      }))schedule();
    });
    // Attach global DOM observer only during a confirmed selection.
    try{
      if(observe){
        subscriptions.push(observe(SESSION,onSession));
        subscriptions.push(observe(PHASE,onPhase));
      }
    }catch(e){logger.warn('[PlainChat Revamp] WebSocket unavailable',e);
      for(const sub of subscriptions)sub?.disconnect?.();subscriptions=[]}
    polling=interval(refresh,subscriptions.length===2?30000:6000);
    // Rare safety repair only: WebSocket events and targeted DOM observers
    // handle normal updates without repeatedly scanning the champion grid.
    repair=interval(()=>{if(active)schedule();else cleanOutsideLabels()},12000);
    refresh();
    cleanOutsideLabels();
  }
  function stop(){
    if(stopped)return;
    stopped=true;epoch++;request++;
    if(scheduleTimer!==null)clearTimeout(scheduleTimer);
    if(polling!==null)clear(polling);
    if(repair!==null)clear(repair);
    mainObserver?.disconnect();chatObserver?.disconnect();
    for(const sub of subscriptions)sub?.disconnect?.();
    restore();
  }
  return {start,stop,refresh,setSession,deactivate,reconcile,
    status:()=>({active,ownCell,ownRole,me,roles:Object.fromEntries(roles),
      aliases:Object.fromEntries(aliases),selfEvidence,diagnostics:{...diagnostics},
      timing:{lastReconcileMs:lastApplyMs,lastAppliedAt:lastApplyAt}})};
}
let engine=null,context=null;
export function init(ctx){context=ctx}
export function load(){
  try{window.__plainChatRevampStop?.()}catch(_){}
  try{window.__plainChatDKStop?.()}catch(_){}
  const getJson=async endpoint=>{
    const controller=new AbortController();
    const timer=setTimeout(()=>controller.abort(),4000);
    let res;
    try{res=await fetch(endpoint,{cache:'no-store',signal:controller.signal});}
    finally{clearTimeout(timer);}
    if(!res.ok){const error=new Error(`LCU ${endpoint} HTTP ${res.status}`);error.status=res.status;throw error;}
    return res.json();
  };
  engine=createEngine({
    doc:document,getSession:()=>getJson(SESSION),
    getMe:async()=>{
      try{return await getJson(CURRENT)}
      catch(_){return await getJson(CHAT_ME)}
    },
    observe:context?.socket?.observe?(endpoint,handler)=>context.socket.observe(endpoint,handler):null
  });
  window.__plainChatRevampStop=()=>engine.stop();
  window.__plainChatRevamp=engine; // console: __plainChatRevamp.status()
  engine.start();
}
