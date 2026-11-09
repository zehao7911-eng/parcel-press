export const symbols = ['Leaf', 'Sun', 'Moon', 'Star'];
export const glyphs = ['❧', '☀', '☾', '✦'];
export const jobs = [
  {name:'Little Thank You', to:'Milo', kind:'BOOKSHOP ORDER', w:2.65,d:2.05,h:.58, paper:0, over:[[2,0],[3,1]], clue:'Moon over Leaf. Star over Sun.'},
  {name:'Tea for Two', to:'Nora', kind:'AFTERNOON DELIVERY', w:2.30,d:2.25,h:.78, paper:1, over:[[0,3],[1,2]], clue:'Leaf over Star. Sun over Moon.'},
  {name:'Midnight Album', to:'Iris', kind:'RECORD STORE ORDER', w:2.64,d:2.54,h:.44, paper:2, over:[[3,2],[2,0]], clue:'Leaf, then Moon, then Star.'},
  {name:'Garden Notes', to:'Sage', kind:'FLOWER SHOP ORDER', w:2.09,d:2.68,h:.65, paper:3, over:[[1,0],[3,1],[2,3]], clue:'Leaf → Sun → Star → Moon.'},
  {name:'The Long Weekend', to:'Theo', kind:'BIRTHDAY DELIVERY', w:2.84,d:1.92,h:.65, paper:1, over:[[1,3],[2,1],[2,0]], clue:'Sun over Star. Moon over Sun and Leaf.'},
  {name:'Studio Opening', to:'June', kind:'GALLERY DELIVERY', w:2.4,d:2.25,h:.9, paper:0, over:[[0,2],[3,0],[1,3]], clue:'Moon → Leaf → Star → Sun.'},
  {name:'Letters From Afar', to:'Avery', kind:'SPECIAL DELIVERY', w:2.55,d:2.12,h:.74, paper:2, over:[[3,0],[3,2],[1,3]], clue:'Star over Leaf and Moon. Sun over Star.'},
  {name:'The Last Parcel', to:'Pip', kind:'CLOSING TIME', w:2.83,d:2.45,h:.92, paper:3, over:[[0,1],[2,0],[3,2]], clue:'Sun → Leaf → Moon → Star.'},
];
export const papers = [
  {name:'Peach Grove', base:'#e79775', pale:'#f4b194', ink:'#8b372d', seal:'#962e42', motif:'leaf'},
  {name:'Lemon Press', base:'#e8c45f', pale:'#f6d785', ink:'#7b491e', seal:'#a04329', motif:'sun'},
  {name:'Night Post', base:'#8c94ce', pale:'#a9b2ec', ink:'#3b406e', seal:'#4a376e', motif:'star'},
  {name:'Glass Garden', base:'#92b899', pale:'#b2ceb3', ink:'#345b4d', seal:'#376147', motif:'leaf'},
  {name:'Blue Porcelain', base:'#81bdd4', pale:'#acd6e7', ink:'#265473', seal:'#2e4e78', motif:'star', earned:8, reward:'like'},
  {name:'Berry Foil', base:'#d290ae', pale:'#edb1c9', ink:'#833c5e', seal:'#7e2c57', motif:'sun', earned:16, reward:'comment'},
];

export function profile(value) {
  const data = value && typeof value === 'object' ? value : {};
  return {
    best: jobs.map((_, i) => Number.isInteger(data.best?.[i]) ? Math.max(0, Math.min(3, data.best[i])) : 0),
    rewards: {like:data.rewards?.like === true, comment:data.rewards?.comment === true},
    mute: data.mute === true
  };
}

export function total(p) { return p.best.reduce((a, b) => a + b, 0); }
export function unlocked(p, index) { return index === 0 || p.best[index - 1] > 0; }

export function canUsePaper(p, index) {
  const paper = papers[index];
  return !!paper && (!paper.reward || p.rewards[paper.reward] || total(p) >= paper.earned);
}

export function mergeProfile(local, incoming) {
  const other = profile(incoming);
  return {
    best: local.best.map((n, i) => Math.max(n, other.best[i])),
    rewards: {like:local.rewards.like || other.rewards.like, comment:local.rewards.comment || other.rewards.comment},
    mute: local.mute
  };
}

export function newParcel(job, paper = jobs[job].paper) {
  return {job, paper, folds:[], slips:0, seal:null, stars:0};
}

export function missingUnder(state, flap) {
  return jobs[state.job].over.filter(([above, below]) => above === flap && !state.folds.includes(below)).map(pair => pair[1]);
}

export function fold(state, flap) {
  if (state.seal || !Number.isInteger(flap) || flap < 0 || flap > 3 || state.folds.includes(flap)) return {kind:'ignored'};
  const missing = missingUnder(state, flap);
  if (missing.length) {
    state.slips += 1;
    return {kind:'blocked', missing};
  }
  state.folds.push(flap);
  return {kind:'folded'};
}

export function seal(state, dx, dy) {
  if (state.seal || state.folds.length !== 4 || !Number.isFinite(dx) || !Number.isFinite(dy)) return false;
  const distance = Math.hypot(dx,dy);
  const job = jobs[state.job];
  const x = .858*dx + .514*dy/.65;
  const z = -.514*dx + .858*dy/.65;
  if (Math.abs(x) > job.w/2-.36 || Math.abs(z) > job.d/2-.36) return false;
  state.seal = [dx,dy];
  state.stars = 1 + Number(state.slips === 0) + Number(distance <= .30);
  return true;
}

export function restore(data, p) {
  const index = Number.isInteger(data?.job) && jobs[data.job] && unlocked(p,data.job) ? data.job : 0;
  const state = newParcel(index);
  if (data?.job !== index) return state;
  if (canUsePaper(p,data.paper)) state.paper = data.paper;
  if (Array.isArray(data.folds)) {
    for (const flap of data.folds.slice(0,4)) {
      if (fold(state,flap).kind !== 'folded') break;
    }
  }
  state.slips = Number.isInteger(data.slips) ? Math.max(0, Math.min(9999,data.slips)) : 0;
  if (Array.isArray(data.seal)) seal(state,...data.seal);
  return state;
}
