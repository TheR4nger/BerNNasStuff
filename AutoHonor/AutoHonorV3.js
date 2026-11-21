/**
* @name AutoHonorV3
* @author Elaina and BerNNas
* @link https://github.com/Elaina69
* @Nyan Meow~~~
*/

const CONSOLE_STYLE = {
  prefix: "%c AutoHonorV3 ",
  css: "color: #ffffff; background-color: #f77fbe"
};
const log = (message, ...args) => console.log(CONSOLE_STYLE.prefix + "%c " + message, CONSOLE_STYLE.css, "", ...args);
const error = (message, ...args) => console.error(CONSOLE_STYLE.prefix + "%c " + message, CONSOLE_STYLE.css, "", ...args);

let pvp_net_id, summoner_id, phase;
const routines = [];
const mutationCallbacks = [];
async function stop(time) {
  return await new Promise((resolve) => setTimeout(resolve, time));
}
function addStyle(style) {
  const styleElement = document.createElement("style");
  styleElement.appendChild(document.createTextNode(style));
  document.body.appendChild(styleElement);
}
function addStyleWithID(Id, style) {
  const styleElement = document.createElement("style");
  styleElement.id = Id;
  styleElement.appendChild(document.createTextNode(style));
  document.body.appendChild(styleElement);
}
function addFont(folder, font_id, font_family) {
  const fontStyle = document.createElement("style");
  fontStyle.id = font_id;
  fontStyle.appendChild(document.createTextNode(
    `@font-face {font-family: ${font_family}; src: url(${folder})}`
  ));
  document.body.appendChild(fontStyle);
}
function CustomCursor(folder, css) {
  const cursor = document.createElement("div");
  cursor.classList.add("cursor");
  cursor.style.background = folder;
  document.addEventListener("mousemove", (e) => {
    cursor.style.transform = `translate3d(calc(${e.clientX}px - 40%), calc(${e.clientY}px - 40%), 0)`;
  });
  let htmlElement = document.querySelector("html");
  htmlElement.appendChild(cursor);
  addStyle(css);
}
async function getSummonerID() {
  const response = await fetch("/lol-summoner/v1/current-summoner");
  const data = await response.json();
  return JSON.parse(data.summonerId);
}
async function subscribe_endpoint(endpoint, callback) {
  const getUri = document.querySelector('link[rel="riot:plugins:websocket"]');
  const uri = getUri?.href;
  const ws = new WebSocket(uri, "wamp");
  ws.onopen = () => ws.send(JSON.stringify([5, "OnJsonApiEvent" + endpoint.replace(/\//g, "_")]));
  ws.onmessage = callback;
}
const updateUserPvpNetInfos = async (message) => {
  const data = JSON.parse(message.data)[2].data;
  if (data) {
    pvp_net_id = data.id;
    summoner_id = data.summonerId;
  }
};
const updatePhaseCallback = async (message) => {
  phase = JSON.parse(message.data)[2].data;
};
function routineAddCallback(callback, target) {
  routines.push({ callback, target });
}
function mutationObserverAddCallback(callback, target) {
  mutationCallbacks.push({ callback, target });
}
function freezeProperties(object, properties) {
  for (const type in object) {
    if (properties && properties.length && properties.includes(type) || (!properties || !properties.length)) {
      let value = object[type];
      try {
        Object.defineProperty(object, type, {
          configurable: false,
          get: () => value,
          set: (v) => v
        });
      } catch {
      }
    }
  }
}
window.addEventListener("load", () => {
  subscribe_endpoint("/lol-gameflow/v1/gameflow-phase", updatePhaseCallback);
  subscribe_endpoint("/lol-chat/v1/me", updateUserPvpNetInfos);
  setInterval(() => {
    routines.forEach((routine) => routine.callback());
  }, 1e3);
  const observer = new MutationObserver((mutationsList) => {
    for (const mutation of mutationsList) {
      for (const addedNode of mutation.addedNodes) {
        if (addedNode.nodeType === Node.ELEMENT_NODE && addedNode.classList) {
          for (const addedNodeClass of addedNode.classList) {
            for (const obj of mutationCallbacks) {
              if (obj.target.indexOf(addedNodeClass) !== -1 || obj.target.indexOf("*") !== -1) {
                obj.callback(addedNode);
              }
            }
          }
        }
      }
    }
  });
  observer.observe(document, { attributes: true, childList: true, subtree: true });
});
const utils = {
  get phase() { return phase; },
  get summoner_id() { return summoner_id; },
  get pvp_net_id() { return pvp_net_id; },
  subscribe_endpoint,
  routineAddCallback,
  mutationObserverAddCallback,
  addStyle,
  addFont,
  CustomCursor,
  getSummonerID,
  addStyleWithID,
  freezeProperties,
  stop
};

class FetchData {
  get = async (lcu) => {
    let data = (await fetch(lcu)).json();
    return data;
  };
  post = async (lcu, body) => {
    await fetch(lcu, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(body)
    });
  };
}
const Scoring = {
    normalizeEogStats(eogStats) {
        const players = [];
        for (const team of eogStats?.teams || []) {
            for (const p of team.players || []) {
                const s = p.stats || {};
                players.push({
                    puuid: p.puuid,
                    kills: s.CHAMPIONS_KILLED || 0,
                    deaths: s.NUM_DEATHS || 0,
                    assists: s.ASSISTS || 0,
                    damage: s.TOTAL_DAMAGE_DEALT_TO_CHAMPIONS || 0,
                    gold: s.GOLD_EARNED || 0,
                    cs: (s.MINIONS_KILLED || 0) + (s.NEUTRAL_MINIONS_KILLED || 0),
                    vision: s.VISION_SCORE || 0,
                    healing: (s.TOTAL_HEAL_ON_TEAMMATES || 0) + (s.TOTAL_DAMAGE_SHIELDED_ON_TEAMMATES || 0),
                    tanking: (s.TOTAL_DAMAGE_TAKEN || 0) + (s.TOTAL_DAMAGE_SELF_MITIGATED || 0),
                    win: s.WIN || false,
                    teamId: team.teamId,
                    championName: p.championName || p.championId
                });
            }
        }
        return players;
    },

    normalizeParticipants(participants) {
        return (participants || []).map(p => ({
            puuid: p.puuid,
            kills: p.kills || 0,
            deaths: p.deaths || 0,
            assists: p.assists || 0,
            damage: p.totalDamageDealtToChampions || 0,
            gold: p.goldEarned || 0,
            cs: (p.totalMinionsKilled || 0) + (p.neutralMinionsKilled || 0),
            healing: (p.totalHealsOnTeammates || 0) + (p.totalDamageShieldedOnTeammates || 0),
            tanking: (p.totalDamageTaken || 0) + (p.damageSelfMitigated || 0),
            win: p.win || false,
            teamId: p.teamId,
            championName: p.championName || p.championId
        }));
    },

    computeScores(players) {
        return this._compute(players).scores;
    },

    computeScoresDetailed(players) {
        return this._compute(players);
    },

    _compute(players) {
        if (!players?.length) return { scores: new Map(), entries: [] };

        const gameDmg = players.reduce((s, p) => s + p.damage, 0) || 1;
        const gameGold = players.reduce((s, p) => s + p.gold, 0) || 1;

        const teamKills = {};
        players.forEach(p => {
            teamKills[p.teamId] = (teamKills[p.teamId] || 0) + p.kills;
        });

        function mmNorm(arr) {
            const mn = Math.min(...arr), mx = Math.max(...arr), rng = mx - mn || 1e-6;
            return arr.map(v => (v - mn) / rng);
        }

        const entries = players.map(p => {
            const kda = (p.kills + p.assists) / Math.max(1, p.deaths);
            const kdaNorm = kda / (kda + 4);
            const tk = teamKills[p.teamId] || 1;
            const kp = (p.kills + p.assists) / tk;
            const killShare = p.kills / tk;
            const dmgFrac = p.damage / gameDmg;
            const healFrac = (p.healing || 0) / gameDmg;
            const tankFrac = (p.tanking || 0) / gameDmg;

            return {
                puuid: p.puuid,
                kills: p.kills,
                deaths: p.deaths,
                assists: p.assists,
                kda,
                kdaNorm,
                kp,
                killShare,
                dmg: p.damage,
                gold: p.gold,
                cs: p.cs,
                vision: p.vision || 0,
                healing: p.healing || 0,
                tanking: p.tanking || 0,
                win: p.win,
                teamId: p.teamId,
                championName: p.championName,
                dmgFrac,
                healFrac,
                tankFrac
            };
        });

        const kdaN = mmNorm(entries.map(e => e.kdaNorm));
        const kpN = mmNorm(entries.map(e => e.kp));
        const killN = mmNorm(entries.map(e => e.killShare));
        const dmgN = mmNorm(entries.map(e => e.dmg));
        const goldN = mmNorm(entries.map(e => e.gold));

        const composites = entries.map((e, i) => {
            const hasRoleData = e.healFrac !== undefined || e.tankFrac !== undefined;
            let composite;

            if (hasRoleData && e.healFrac > 0.04) {
                const healN = mmNorm(entries.map(x => x.healFrac))[i];
                composite = kdaN[i] * 0.20 + kpN[i] * 0.30 + healN * 0.25 + dmgN[i] * 0.10 + goldN[i] * 0.15;
            } else if (hasRoleData && e.tankFrac > 0.12 && e.dmgFrac < 0.10) {
                const tankN = mmNorm(entries.map(x => x.tankFrac))[i];
                composite = kdaN[i] * 0.25 + kpN[i] * 0.25 + tankN * 0.15 + dmgN[i] * 0.15 + goldN[i] * 0.20;
            } else {
                composite = kdaN[i] * 0.25 + kpN[i] * 0.20 + killN[i] * 0.15 + dmgN[i] * 0.25 + goldN[i] * 0.15;
            }

            return composite;
        });

        const mean = composites.reduce((a, b) => a + b, 0) / composites.length;
        const std = Math.sqrt(composites.reduce((a, v) => a + (v - mean) ** 2, 0) / composites.length) || 1e-6;

        const rawScores = entries.map((e, i) => {
            const z = (composites[i] - mean) / std;
            let score = 5.5 + z * 1.5 + (e.win ? 0.5 : -0.5);
            score = Math.max(1.0, Math.min(10.0, Math.round(score * 10) / 10));
            return { puuid: e.puuid, score, z, composite: composites[i] };
        });

        const scoreVals = rawScores.map(s => s.score);
        const minScore = Math.min(...scoreVals);
        const maxScore = Math.max(...scoreVals);
        const range = maxScore - minScore || 1;

        const result = new Map();
        const detailed = entries.map((e, i) => {
            const s = rawScores[i];
            const hasRoleData = e.healFrac !== undefined || e.tankFrac !== undefined;
            let role = 'carry';
            if (hasRoleData && e.healFrac > 0.04) role = 'enchanter';
            else if (hasRoleData && e.tankFrac > 0.12 && e.dmgFrac < 0.10) role = 'tank';

            result.set(s.puuid, {
                score: s.score,
                kda: e.kda.toFixed(1),
                kills: e.kills,
                deaths: e.deaths,
                assists: e.assists,
                _scoreRatio: (s.score - minScore) / range
            });

            const tk = teamKills[e.teamId] || 1;

            return {
                puuid: e.puuid,
                win: e.win,
                score: s.score,
                kda: +e.kda.toFixed(3),
                kdaNorm: +e.kdaNorm.toFixed(3),
                kp: +e.kp.toFixed(3),
                killShare: +e.killShare.toFixed(3),
                kills: e.kills,
                deaths: e.deaths,
                assists: e.assists,
                teamKills: tk,
                dmg: e.dmg,
                gold: e.gold,
                cs: e.cs,
                healing: e.healing || 0,
                tanking: e.tanking || 0,
                teamId: e.teamId,
                championName: e.championName,
                healFrac: +e.healFrac.toFixed(4),
                tankFrac: +e.tankFrac.toFixed(4),
                dmgFrac: +e.dmgFrac.toFixed(4),
                role,
                kdaN: +kdaN[i].toFixed(3),
                kpN: +kpN[i].toFixed(3),
                killN: +killN[i].toFixed(3),
                dmgN: +dmgN[i].toFixed(3),
                goldN: +goldN[i].toFixed(3),
                composite: +s.composite.toFixed(4),
                z: +s.z.toFixed(3)
            };
        });

        return { scores: result, entries: detailed, gameDmg, teamKills };
    }
};

class AutoHonor extends FetchData {
  constructor() {
    super(); this.busy=false; this.completed=false; this.lastReport=null;
    this.attempts=0; this.maxAttempts=3; this.submittedPuuids=new Set();
    this.eogStatsCache=null; this.statsPromise=null; this.lastGameId=null; this.cacheGameId=null;
  }
  debug(message,...args) { if (window.DataStore.get("Auto-Honor-Gold-Debug")) log(`[Performance Debug] ${message}`,...args); }
  record(status,extra={}) {
    this.lastReport={...this.lastReport,status,timestamp:new Date().toISOString(),...extra};
    if(window.AutoHonorV3) window.AutoHonorV3.lastReport=this.lastReport;
    this.debug(`Status: ${status}`,extra);
  }
  async json(url) { const r=await fetch(url,{cache:"no-store"}); if(!r.ok) throw Error(`${url}: HTTP ${r.status}`); return r.json(); }
  async getBallot() {
    const b=await this.json('/lol-honor-v2/v1/ballot');
    if(!b?.votePool) throw Error('Honor ballot missing votePool'); return b;
  }
  getPuuid(p) { return p?.puuid || p?.playerPuuid || p?.recipientPuuid || p?.summonerPuuid || null; }
  receiveStats(data,source='websocket') {
    if(!data?.teams?.length) return;
    // EOG payloads are not always game-id tagged; never trust a cached payload across game transitions.
    const incomingId=data.gameId ?? data.gameID ?? data.game_id ?? null;
    if(incomingId != null && this.lastGameId != null && String(incomingId)!==this.lastGameId) {
      this.debug('Ignored EOG stats from a different game'); return;
    }
    this.eogStatsCache=data; this.cacheGameId=incomingId==null?null:String(incomingId);
    this.debug(`End-of-game stats received via ${source}`);
  }
  async waitForStats(maxAttempts=8) {
    if(this.eogStatsCache?.teams?.length) return this.eogStatsCache;
    if(this.statsPromise) return this.statsPromise;
    this.statsPromise=(async()=>{
      let last;
      for(let i=0;i<maxAttempts;i++) {
        try { const d=await this.json('/lol-end-of-game/v1/eog-stats-block');
          if(d?.teams?.length) { this.receiveStats(d,'HTTP'); return d; }
          last=Error('End-of-game stats block not ready');
        } catch(e) { last=e; }
        this.debug(`Stats attempt ${i+1}/${maxAttempts}: ${last.message}`);
        if(i<maxAttempts-1) await stop(Math.min(1000*(i+1),4000));
        if(this.eogStatsCache?.teams?.length) return this.eogStatsCache;
      }
      throw last;
    })();
    try { return await this.statsPromise; } finally { this.statsPromise=null; }
  }
  async honorByPerformance(mode) {
    if(this.busy||this.completed) return;
    this.busy=true; this.attempts++;
    this.record('started',{mode:mode===1?'Enemy':'Allies',attempt:this.attempts,ranking:[],submissions:[]});
    try {
      const ballot=await this.getBallot();
      const gameId=ballot.gameId==null?null:String(ballot.gameId);
      if(gameId && gameId!==this.lastGameId) {
        // A new ballot invalidates all prior-game statistics, including websocket cache.
        if(this.lastGameId !== null) { this.eogStatsCache=null; this.cacheGameId=null; this.statsPromise=null; }
        this.lastGameId=gameId; this.submittedPuuids.clear();
      }
      if(gameId && this.cacheGameId && this.cacheGameId!==gameId) {
        this.eogStatsCache=null; this.cacheGameId=null;
      }
      const votes=Number(ballot.votePool.votes);
      if(!Number.isSafeInteger(votes)||votes<0) throw Error('Invalid vote count');
      this.record('ballot-loaded',{gameId,votesAvailable:votes});
      if(votes===0) {this.completed=true;this.record('no-votes');return;}
      const eligible=mode===1?ballot.eligibleOpponents:ballot.eligibleAllies;
      if(!Array.isArray(eligible)||!eligible.length) throw Error('No eligible players');
      this.record('loading-stats');
      const stats=await this.waitForStats();
      const players=Scoring.normalizeEogStats(stats);
      if(players.length<2 || players.some(p=>!p.puuid)) throw Error('Insufficient EOG player identifiers');
      const calculation=Scoring.computeScoresDetailed(players);
      const scores=calculation.scores;
      const details=calculation.entries;
      const detailByPuuid=new Map(details.map(p=>[p.puuid,p]));
      const honored=new Set((ballot.honoredPlayers||[]).map(p=>typeof p==='string'?p:this.getPuuid(p)).filter(Boolean));
      const ranking=eligible.map(p=>{
        const puuid=this.getPuuid(p), score=scores.get(puuid), detail=detailByPuuid.get(puuid);
        return {puuid,name:p.gameName||p.summonerName||detail?.championName||'Unknown',
          score:score?.score??null,kda:score?.kda??null,gold:detail?.gold??null,
          role:detail?.role??null,alreadyHonored:honored.has(puuid)};
      }).filter(p=>p.puuid&&!p.alreadyHonored&&!this.submittedPuuids.has(p.puuid)&&p.score!==null)
        .sort((a,b)=>b.score-a.score||b.gold-a.gold||a.puuid.localeCompare(b.puuid));
      this.record('ranked',{eligibleCount:eligible.length,matchedCount:ranking.length,ranking,screenVersion:this.screenVersion||'unknown'});
      if(window.DataStore.get('Auto-Honor-Gold-Debug')) console.table(ranking);
      if(!ranking.length) throw Error('No matching eligible PUUIDs and performance scores');
      const submissions=[];
      for(const player of ranking.slice(0,votes)) {
        // Never automatically retry an ambiguous honor POST.
        this.submittedPuuids.add(player.puuid);
        const r=await fetch('/lol-honor/v1/honor',{method:'POST',headers:{'Content-Type':'application/json'},
          body:JSON.stringify({honorType:'HEART',recipientPuuid:player.puuid})});
        submissions.push({player:player.name,puuid:player.puuid,score:player.score,httpStatus:r.status,accepted:r.ok});
        this.record('submitting',{submissions:[...submissions]});
        if(!r.ok) {this.completed=true;throw Error(`Honor HTTP ${r.status}`);}
        await stop(250);
      }
      // Snooze's explicit ballot commit; its availability is client-version dependent.
      this.completed=true;
      this.record('finalizing',{submissions});
      try {
        const r=await fetch('/lol-honor/v1/ballot',{method:'POST',headers:{'Content-Type':'application/json'}});
        this.record(r.ok?'submitted-unverified':'commit-rejected',{submissions,commitHttpStatus:r.status,
          note:'HTTP status alone does not prove votes were recorded'});
      } catch(e) {this.record('commit-error',{submissions,commitError:String(e),note:'Do not retry blindly'});}
      log(`Performance honor: ${submissions.length} request(s). Check AutoHonorV3.report().`);
    } catch(e) {
      this.record('error',{error:String(e?.message||e)});error('Performance honor error:',e);
      if(this.submittedPuuids.size) this.completed=true;
      window.Toast?.error?.('AutoHonorV3: check debug report');
    } finally {this.busy=false;}
  }
  reset() {
    if(this.busy)return;
    this.busy=false;this.completed=false;this.attempts=0;this.lastGameId=null;
    this.eogStatsCache=null;this.cacheGameId=null;this.statsPromise=null;this.submittedPuuids.clear();
    this.debug('Reset for next match');
  }
  skipHonor(element) {if(window.DataStore.get('Auto-Honor-V2')&&window.DataStore.get('Auto-Honor-V2_skipHonor'))element.click();}
}

let autoHonor = new AutoHonor();
window.AutoHonorV3 = window.ElainaHonorGold = {
  lastReport: null,
  report() {
    const r = autoHonor.lastReport;
    if (!r) { console.info("[AutoHonorV3] No match report yet"); return null; }
    console.log("[AutoHonorV3] Last report:", r);
    if (r.ranking?.length) console.table(r.ranking.map((x, i) => ({ rank: i + 1, player: x.name, score: x.score, kda: x.kda, gold: x.gold, puuid: x.puuid })));
    if (r.submissions?.length) console.table(r.submissions);
    return r;
  },
  retry() {
    if (autoHonor.completed) { console.warn("[AutoHonorV3] Already submitted or rejected; automatic retry blocked to avoid duplicates"); return; }
    return autoHonor.honorByPerformance(window.DataStore.get("Auto-Honor-V2-Mode"));
  },
  reset() { autoHonor.reset(); }
};

const UI = {
  Row: (id, childs) => {
    const row = document.createElement("div");
    row.classList.add("elaina-theme-settings-row");
    row.id = id;
    if (Array.isArray(childs))
      childs.forEach((el) => row.appendChild(el));
    return row;
  },
  Link: (text, href, onClick, ID) => {
    const link = document.createElement("p");
    link.classList.add("lol-settings-code-of-conduct-link");
    link.classList.add("lol-settings-window-size-text");
    const a = document.createElement("a");
    a.innerText = text;
    a.target = "_blank";
    a.href = href;
    a.onclick = onClick || null;
    a.id = ID || null;
    link.append(a);
    return link;
  },
  CheckBox: (text, ID, boxID, check, show, datastore_name) => {
    const container = document.createElement("div");
    const origin = document.createElement("lol-uikit-flat-checkbox");
    const checkbox = document.createElement("input");
    const label = document.createElement("label");
    const none = document.createElement("div");
    origin.id = ID;
    origin.setAttribute("lastDatastore", window.DataStore.get(datastore_name));
    checkbox.type = "checkbox";
    checkbox.id = boxID;
    if (window.DataStore.get(datastore_name)) {
      checkbox.checked = true;
      origin.setAttribute("class", "checked");
    } else {
      checkbox.checked = false;
      origin.setAttribute("class", "");
    }
    checkbox.onclick = () => {
      if (window.DataStore.get(datastore_name)) {
        origin.removeAttribute("class");
        checkbox.checked = false;
        window.DataStore.set(datastore_name, false);
        check();
      } else {
        origin.setAttribute("class", "checked");
        checkbox.checked = true;
        window.DataStore.set(datastore_name, true);
        check();
      }
    };
    checkbox.setAttribute("slot", "input");
    label.innerHTML = text;
    label.setAttribute("slot", "label");
    if (show) {
      container.appendChild(origin);
      origin.appendChild(checkbox);
      origin.appendChild(label);
      return container;
    } else {
      container.appendChild(none);
      return container;
    }
  },
  Dropdown: (list, target, text, name, id) => {
    const origin = document.createElement("div");
    const title = document.createElement("div");
    const dropdown = document.createElement("lol-uikit-framed-dropdown");
    origin.classList.add("Dropdown-div");
    title.classList.add("lol-settings-window-size-text");
    title.innerHTML = text;
    dropdown.classList.add("lol-settings-general-dropdown");
    origin.append(title, dropdown);
    for (let i = 0; i < list[target].length; i++) {
      const opt = list[target][i];
      const el = document.createElement("lol-uikit-dropdown-option");
      el.setAttribute("slot", "lol-uikit-dropdown-option");
      el.innerText = opt[name];
      el.id = opt[id];
      el.onclick = () => {
        window.DataStore.set(target, opt[id]);
      };
      if (window.DataStore.get(target) == opt[id]) {
        el.setAttribute("selected", "true");
      }
      dropdown.appendChild(el);
    }
    return origin;
  },
  Label: (text, id) => {
    const label = document.createElement("p");
    label.classList.add("lol-settings-window-size-text");
    label.innerText = text;
    label.id = id;
    return label;
  }
};

class Settings {
  data;
  constructor() {
    this.data = [
      {
        "groupName": "auto-honor-v2",
        "titleKey": "el_auto-honor-v2",
        "titleName": "AutoHonorV3",
        "capitalTitleKey": "el_auto-honor-v2_capital",
        "capitalTitleName": "AUTOHONORV3",
        "element": [
          {
            "name": "auto-honor-v2-settings",
            "title": "el_auto-honor-v2-settings",
            "titleName": "SETTINGS",
            "class": "auto-honor-v2-settings",
            "id": "auto-honor-v2-settings"
          }
        ]
      }
    ];
  }
  settingsUI = (panel) => {
    let option = {
      "Auto-Honor-V2-Mode": [
        {
          "id": 0,
          "type": "Allies"
        },
        {
          "id": 1,
          "type": "Enemy"
        }
        // {
        //     "id": 2,
        //     "type": "All"
        // },
      ]
    };
    panel.prepend(
      UI.Row("", [
        UI.Row("Info", [
          UI.Row("Info-div", [
            UI.Link(
              "AutoHonorV3 Best Performance — Elaina and BerNNas",
              "https://github.com/Elaina69/Elaina-V4",
              () => {
              },
              ""
            )
          ])
        ]),
        UI.CheckBox("Auto honor players", "autohv2", "autohv2box", () => {
          let skipHonorCheckbox = document.getElementById("autohv2_skip");
          if (window.DataStore.get("Auto-Honor-V2")) {
            skipHonorCheckbox.style.display = "flex";
          } else {
            skipHonorCheckbox.style.display = "none";
          }
        }, true, "Auto-Honor-V2"),
        document.createElement("br"),
        UI.Dropdown(option, "Auto-Honor-V2-Mode", "Best Performance — Contribution Score", "type", "id"),
        document.createElement("br"),
        UI.Label("", "auto-honor-v2-warning_1"),
        UI.CheckBox("Skip honor", "autohv2_skip", "autohv2_skipbox", () => {
        }, true, "Auto-Honor-V2_skipHonor"),
        document.createElement("br"),
        UI.CheckBox("Debug mode (performance score + API logs)", "autohv2_debug", "autohv2_debugbox", () => {}, true, "Auto-Honor-Gold-Debug"),
        UI.Label("DevTools: AutoHonorV3.report() | AutoHonorV3.retry()", "auto-honor-gold-debug-help")
      ])
    );
  };
  injectSettingsUI = () => {
    const interval = setInterval(() => {
      const manager = document.getElementById("lol-uikit-layer-manager-wrapper");
      if (manager) {
        clearInterval(interval);
        new MutationObserver((mutations) => {
          const plugin = document.querySelector("lol-uikit-scrollable.auto-honor-v2-settings");
          if (plugin && mutations.some((record) => Array.from(record.addedNodes).includes(plugin))) {
            this.settingsUI(plugin);
            let skipHonorCheckbox = document.getElementById("autohv2_skip");
            if (window.DataStore.get("Auto-Honor-V2")) {
              skipHonorCheckbox.style.display = "flex";
            } else {
              skipHonorCheckbox.style.display = "none";
            }
          }
        }).observe(manager, {
          childList: true,
          subtree: true
        });
      }
    }, 500);
  };
}
let settings = new Settings();

function settingsUtils(context, groupDataArray) {
  log("Loaded settings utils");
  context.rcp.postInit("rcp-fe-lol-settings", async (api) => {
    window.__RCP_SETTINGS_API = api;
    const emberApi = window.__RCP_EMBER_API;
    const ember = await emberApi.getEmber();
    groupDataArray.forEach((groupData) => {
      const newGroup = {
        name: groupData.groupName,
        titleKey: groupData.titleKey,
        capitalTitleKey: groupData.capitalTitleKey,
        categories: []
      };
      const addCategoryToGroup = (name, title) => {
        newGroup.categories.push({
          name,
          titleKey: title,
          routeName: name,
          group: newGroup,
          loginStatus: true,
          requireLogin: false,
          forceDisabled: false,
          computeds: ember.Object.create({
            disabled: false
          }),
          isEnabled: () => true
        });
      };
      groupData.element.forEach((element) => {
        addCategoryToGroup(element.name, element.title);
      });
      api._modalManager._registeredCategoryGroups.splice(1, 0, newGroup);
      api._modalManager._refreshCategoryGroups();
    });
  });
  context.rcp.postInit("rcp-fe-ember-libs", async (api) => {
    window.__RCP_EMBER_API = api;
    const ember = await api.getEmber();
    const originalExtend = ember.Router.extend;
    ember.Router.extend = function() {
      const result = originalExtend.apply(this, arguments);
      result.map(function() {
        groupDataArray.forEach((groupData) => {
          groupData.element.forEach((element) => {
            this.route(element.name);
          });
        });
      });
      return result;
    };
  });
  context.rcp.postInit("rcp-fe-lol-l10n", async (api) => {
    const tra = api.tra();
    const originalGet = tra.__proto__.get;
    tra.__proto__.get = function(key) {
      if (key.startsWith("el_")) {
        for (const groupData of groupDataArray) {
          if (key === groupData.titleKey) {
            return groupData.titleName;
          } else if (key === groupData.capitalTitleKey) {
            return groupData.capitalTitleName;
          }
          for (const element of groupData.element) {
            if (key === element.title) {
              return element.titleName;
            }
          }
        }
      }
      return originalGet.apply(this, [key]);
    };
  });
  context.rcp.postInit("rcp-fe-ember-libs", async (api) => {
    window.__RCP_EMBER_API = api;
    const ember = await api.getEmber();
    const originalExtend = ember.Router.extend;
    ember.Router.extend = function() {
      const result = originalExtend.apply(this, arguments);
      result.map(function() {
        groupDataArray.forEach((groupData) => {
          groupData.element.forEach((element) => {
            this.route(element.name);
          });
        });
      });
      return result;
    };
    const factory = await api.getEmberApplicationFactory();
    const originalBuilder = factory.factoryDefinitionBuilder;
    factory.factoryDefinitionBuilder = function() {
      const builder = originalBuilder.apply(this, arguments);
      const originalBuild = builder.build;
      builder.build = function() {
        const name = this.getName();
        if (name === "rcp-fe-lol-settings") {
          window.__SETTINGS_OBJECT = this;
          const addTab = (name2, id, tab) => {
            this.addTemplate(
              name2,
              ember.HTMLBars.template({
                id,
                block: JSON.stringify(tab),
                meta: {}
              })
            );
          };
          const createSettingsTab = (className) => ({
            statements: [
              ["open-element", "lol-uikit-scrollable", []],
              ["static-attr", "class", className],
              ["flush-element"],
              ["close-element"]
            ],
            locals: [],
            named: [],
            yields: [],
            blocks: [],
            hasPartials: false
          });
          groupDataArray.forEach((groupData) => {
            groupData.element.forEach((element) => {
              addTab(
                element.name,
                element.id,
                createSettingsTab(element.class)
              );
            });
          });
        }
        return originalBuild.apply(this, arguments);
      };
      return builder;
    };
  });
}

class Once {
  constructor(callback) {
    this._callback = callback;
  }
  trigger() {
    if (this._callback !== void 0) {
      this._callback();
      this._callback = void 0;
    }
  }
}
let _observer;
const _initOnce$3 = new Once(init$4);
const _entriesCreation = [];
const _entriesDeletion = [];
function matches(element, selector) {
  return Element.prototype.matches.call(element, selector);
}
function observerHandleElement(element, isNew) {
  if (isNew) {
    for (const entry of _entriesCreation) {
      if (matches(element, entry.selector)) {
        entry.callback(element);
      }
    }
  } else {
    for (const entry of _entriesDeletion) {
      if (matches(element, entry.selector)) {
        entry.callback(element);
      }
    }
  }
  for (const child of element.children) {
    observerHandleElement(child, isNew);
  }
  if (element.shadowRoot != null) {
    for (const child of element.shadowRoot.children) {
      observerHandleElement(child, isNew);
    }
    if (isNew) {
      _observer.observe(element.shadowRoot, { attributes: false, childList: true, subtree: true });
    }
  }
}
function observerCallback(mutationsList) {
  for (const mutation of mutationsList) {
    for (const node of mutation.addedNodes) {
      if (node.nodeType === Node.ELEMENT_NODE) {
        observerHandleElement(node, true);
      }
    }
    for (const node of mutation.removedNodes) {
      if (node.nodeType === Node.ELEMENT_NODE) {
        observerHandleElement(node, false);
      }
    }
  }
}
function init$4() {
  _observer = new MutationObserver(observerCallback);
  _observer.observe(document, { attributes: false, childList: true, subtree: true });
}
function subscribeToElementCreation(selector, callback) {
  _initOnce$3.trigger();
  _entriesCreation.push({ selector, callback });
}
function subscribeToElementDeletion(selector, callback) {
  _initOnce$3.trigger();
  _entriesDeletion.push({ selector, callback });
}
let loadCallbacks = [];
let loadInitialized = false;
let loadedOnce = false;
function subscribeToLoad(callback) {
  if (!loadInitialized) {
    loadInitialized = true;
    subscribeToElementDeletion(".lol-loading-screen-container", () => {
      if (loadedOnce) {
        return;
      }
      loadedOnce = true;
      for (let callback2 of loadCallbacks) {
        callback2();
      }
    });
  }
  loadCallbacks.push(callback);
}
const observer = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  subscribeToElementCreation,
  subscribeToElementDeletion,
  subscribeToLoad
}, Symbol.toStringTag, { value: "Module" }));

if (!window.DataStore.has("Auto-Honor-V2"))
  window.DataStore.set("Auto-Honor-V2", true);
if (!window.DataStore.has("Auto-Honor-V2-Mode"))
  window.DataStore.set("Auto-Honor-V2-Mode", 0);
if (!window.DataStore.has("Auto-Honor-V2_skipHonor"))
  window.DataStore.set("Auto-Honor-V2_skipHonor", false);
if (!window.DataStore.has("Auto-Honor-Gold-Debug"))
  window.DataStore.set("Auto-Honor-Gold-Debug", true);
let main = async (screenVersion) => {
  autoHonor.screenVersion=screenVersion;
  autoHonor.debug(`Honor screen ${screenVersion} detected`);
  if (window.DataStore.get("Auto-Honor-V2") && !window.DataStore.get("Auto-Honor-V2_skipHonor")) {
    await autoHonor.honorByPerformance(window.DataStore.get("Auto-Honor-V2-Mode"));
  }
};
let pageListenner = async (node) => {
  const pagename = node.getAttribute("data-screen-name");
  if (pagename === "rcp-fe-lol-champ-select") autoHonor.reset();
};
let observeHonorScreen = () => {
  observer.subscribeToElementCreation(".vote-ceremony-player-container", async (element) => {
    log("Honor screen detected.");
    await main("V1");
  });
  observer.subscribeToElementCreation(".vote-ceremony-v3-player-container", async (element) => {
    log("Honor screen V3 detected.");
    await main("V3");
  });
  observer.subscribeToElementCreation(".vote-ceremony-submit-button", async (element) => {
    autoHonor.skipHonor(element);
  });
  observer.subscribeToElementCreation(".vote-ceremony-v3-submit-button", async (element) => {
    autoHonor.skipHonor(element);
  });
};
window.addEventListener("load", () => {
  settings.injectSettingsUI();
  utils.mutationObserverAddCallback(pageListenner, ["screen-root"]);
  observeHonorScreen();
  // Use the existing Elaina websocket subsystem, without depending on Snooze generalUtils.
  subscribe_endpoint('/lol-end-of-game/v1/eog-stats-block', (message) => {
    try {
      const packet=JSON.parse(message.data);
      const event=packet?.[2];
      if(event?.data?.teams?.length) autoHonor.receiveStats(event.data);
    } catch(e) {autoHonor.debug('EOG websocket packet ignored',String(e));}
  });
});
function init(context) {
  settingsUtils(context, settings.data);
}

export { init };
