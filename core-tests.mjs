import assert from 'node:assert/strict';
import * as C from './core.mjs';

function permutations(items) {
  if (items.length === 0) return [[]];
  return items.flatMap(n => permutations(items.filter(k=>k!==n)).map(rest=>[n,...rest]));
}
const routes = permutations([0,1,2,3]);
const p=C.profile();
for(const [index,job] of C.jobs.entries()) {
  let valid=0;
  for(const order of routes) {
    const parcel=C.newParcel(index);
    for(const flap of order) C.fold(parcel,flap);
    const expected=job.over.every(([above,below])=>order.indexOf(above)>order.indexOf(below));
    assert.equal(parcel.folds.length===4,expected);
    assert.equal(C.seal(parcel,2,0),false);
    assert.equal(C.seal(parcel,0,0),expected);
    if(expected) {
      valid++;
      assert.equal(parcel.stars,3);
      assert.equal(C.seal(parcel,0,0),false);
      assert.deepEqual(C.restore(structuredClone(parcel),p),parcel);
    }
  }
  assert(valid>0 && valid<24);
  const parcel=C.newParcel(index);
  const order=routes.find(order=>job.over.every(([a,b])=>order.indexOf(a)>order.indexOf(b)));
  C.fold(parcel,job.over[0][0]);
  order.forEach(flap=>C.fold(parcel,flap));
  assert(C.seal(parcel,.36,0));
  assert.equal(parcel.stars,1);
  p.best[index]=3;
}
assert.equal(C.total(p),24);
assert(C.canUsePaper(p,4) && C.canUsePaper(p,5));
assert(!C.canUsePaper(C.profile(),4));
assert(C.canUsePaper(C.profile({rewards:{like:true}}),4));
console.log('192 fold sequences, eight solvable orders, reload and seal scoring verified.');
