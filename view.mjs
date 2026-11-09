import {jobs, papers} from './core.mjs';

const axes = [[-1,0],[0,-1],[1,0],[0,1]];
const clamp = (n,a,b) => Math.max(a,Math.min(b,n));
const ease = t => t*t*(3-2*t);
const project = ([x,y,z]) => [.858*x-.514*z, .65*(.514*x+.858*z)-.76*y, .76*(.514*x+.858*z)+.65*y];

function hinge(job, index, progress, layer) {
  const [dx,dz] = axes[index];
  const half = dx ? job.w/2 : job.d/2;
  const width = dx ? job.d : job.w;
  const height = job.h + .018 + layer*.018;
  const reach = half + .085;
  const rise = ease(clamp(progress / .64, 0, 1))*Math.PI/2;
  const turn = rise + ease(clamp((progress-.31) / .69,0,1))*Math.PI/2;
  const line = (travel, y) => [
    [dx*(half+travel) - dz*width/2, y, dz*(half+travel) + dx*width/2],
    [dx*(half+travel) + dz*width/2, y, dz*(half+travel) - dx*width/2]
  ];
  const root = line(0, .004);
  const bend = line(height*Math.cos(rise), height*Math.sin(rise)+.004);
  const tip = line(height*Math.cos(rise)+reach*Math.cos(turn), height*Math.sin(rise)+reach*Math.sin(turn)+.004);
  return [[root[0],root[1],bend[1],bend[0]],[bend[0],bend[1],tip[1],tip[0]]];
}

function quad(x0,x1,y,z0,z1) { return [[x0,y,z0],[x1,y,z0],[x1,y,z1],[x0,y,z1]]; }

function rounded(ctx,x,y,w,h,r) {
  ctx.beginPath();
  ctx.moveTo(x+r,y);
  ctx.arcTo(x+w,y,x+w,y+h,r);
  ctx.arcTo(x+w,y+h,x,y+h,r);
  ctx.arcTo(x,y+h,x,y,r);
  ctx.arcTo(x,y,x+w,y,r);
  ctx.closePath();
}

function decoration(ctx,type,x,y,s) {
  ctx.save();
  ctx.translate(x,y);
  ctx.scale(s,s);
  ctx.lineWidth /= s;
  ctx.beginPath();
  if (type === 'leaf') {
    ctx.moveTo(-.8,.65);
    ctx.quadraticCurveTo(-.9,-.95,.8,-.65);
    ctx.quadraticCurveTo(.9,.82,-.8,.65);
    ctx.moveTo(-.79,.64);
    ctx.lineTo(.49,-.43);
  } else if (type === 'sun') {
    ctx.arc(0,0,.48,0,Math.PI*2);
    for (let k=0;k<8;k++) {
      const a=k*Math.PI/4;
      ctx.moveTo(.65*Math.cos(a),.65*Math.sin(a));
      ctx.lineTo(.92*Math.cos(a),.92*Math.sin(a));
    }
  } else {
    ctx.moveTo(0,-1);
    ctx.quadraticCurveTo(.13,-.16,.9,0);
    ctx.quadraticCurveTo(.13,.16,0,1);
    ctx.quadraticCurveTo(-.13,.16,-.9,0);
    ctx.quadraticCurveTo(-.13,-.16,0,-1);
  }
  ctx.stroke();
  ctx.restore();
}

export class View {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.w = this.h = 0;
    this.scale = 1;
    this.fx = [];
    this.bg = document.createElement('canvas');
    this.density = 1;
  }

  resize(job) {
    const w = this.canvas.clientWidth, h = this.canvas.clientHeight;
    const dpr = Math.min(devicePixelRatio || 1, 1.65);
    if (w !== this.w || h !== this.h || dpr !== this.density) {
      this.w=w; this.h=h; this.density=dpr;
      this.canvas.width=Math.max(1,Math.round(w*dpr));
      this.canvas.height=Math.max(1,Math.round(h*dpr));
      this.ctx.setTransform(dpr,0,0,dpr,0,0);
      this.makeDesk();
    }
    const flat = axes.flatMap((_, i) => hinge(job,i,0,0).flat()).map(project);
    const extents = flat.reduce((acc, [x,y]) => [Math.min(acc[0],x),Math.max(acc[1],x),Math.min(acc[2],y),Math.max(acc[3],y)], [0,0,0,0]);
    const [left,right,top,bottom] = extents;
    this.scale = Math.max(1, Math.min((w-36)/(right-left), (h-45)/(bottom-top), 85));
    this.cx = w/2-(left+right)*this.scale/2;
    this.cy = h*.5-(top+bottom)*this.scale/2+3;
  }

  screen(point) {
    const [x,y] = project(point);
    return [this.cx+x*this.scale, this.cy+y*this.scale];
  }

  marker(job,index) {
    const flap = hinge(job,index,0,0)[1];
    const center = flap[0].map((_,a)=>flap.reduce((sum,p)=>sum+p[a],0)/4);
    const [x,y] = this.screen(center);
    return [clamp(x,25,this.w-25),clamp(y,28,this.h-30)];
  }

  target(job) { return this.screen([0,job.h+.1,0]); }

  makeDesk() {
    const {w,h,bg} = this;
    bg.width=Math.max(1,w); bg.height=Math.max(1,h);
    const ctx=bg.getContext('2d');
    const grad=ctx.createLinearGradient(0,0,w,h);
    grad.addColorStop(0,'#687b77'); grad.addColorStop(.47,'#455c61'); grad.addColorStop(1,'#303d48');
    ctx.fillStyle=grad; ctx.fillRect(0,0,w,h);
    for(let i=0;i<1150;i++){
      const x=(i*197.47)%w, y=(i*87.37)%h;
      ctx.fillStyle=i%2?'#ffffff13':'#1727341d';
      ctx.fillRect(x,y,1+(i%4)*.3,.7);
    }
    ctx.lineWidth=1; ctx.strokeStyle='#d0d9b621';
    rounded(ctx,5,5,w-10,h-10,10); ctx.stroke();
    ctx.strokeStyle='#e0e7c21d';
    for(let x=13;x<w-7;x+=9){
      ctx.beginPath();ctx.moveTo(x,h-4);ctx.lineTo(x,h-(x%45<10?12:8));ctx.stroke();
    }
    if(h>w*.98){
      ctx.save();
      ctx.translate(31,43);ctx.rotate(-.10);
      ctx.fillStyle='#21303973';rounded(ctx,3,5,91,73,4);ctx.fill();
      ctx.fillStyle='#e6c6a2';rounded(ctx,0,0,91,73,4);ctx.fill();
      ctx.fillStyle='#fbebcb';rounded(ctx,-3,-3,91,70,4);ctx.fill();
      ctx.fillStyle='#8e4a44';ctx.font='bold 9px system-ui';ctx.fillText('AIR POST',10,15);
      ctx.fillStyle='#5f6257';ctx.font='8px system-ui';ctx.fillText('HAND WRAPPED',10,26);
      ctx.fillStyle='#d9b594';ctx.fillRect(10,34,66,1);ctx.fillRect(10,44,56,1);ctx.fillRect(10,54,63,1);
      ctx.strokeStyle='#ac6c61';ctx.lineWidth=1;ctx.beginPath();ctx.arc(75,12,8,0,Math.PI*2);ctx.stroke();
      ctx.restore();
      ctx.save();ctx.translate(34,h-80);ctx.rotate(.27);
      ctx.fillStyle='#1e303760';rounded(ctx,0,4,77,11,4);ctx.fill();
      ctx.fillStyle='#d8a562';rounded(ctx,0,0,69,9,4);ctx.fill();
      ctx.fillStyle='#965c46';ctx.fillRect(4,2,59,1.2);
      ctx.fillStyle='#f1c89d';ctx.beginPath();ctx.moveTo(68,0);ctx.lineTo(80,4.5);ctx.lineTo(68,9);ctx.fill();
      ctx.fillStyle='#333943';ctx.beginPath();ctx.moveTo(77,3.4);ctx.lineTo(81,4.5);ctx.lineTo(77,5.8);ctx.fill();
      ctx.restore();
    }
    ctx.save();ctx.translate(w-44,25);ctx.rotate(-.16);
    ctx.fillStyle='#17263155'; rounded(ctx,-27,-13,65,27,6);ctx.fill();
    ctx.fillStyle='#cb9a6b';rounded(ctx,-30,-16,65,25,5);ctx.fill();
    ctx.strokeStyle='#f4cda1';ctx.stroke();
    ctx.strokeStyle='#825c4a';ctx.lineWidth=1;
    for(let i=-25;i<32;i+=5){ctx.beginPath();ctx.moveTo(i,-15);ctx.lineTo(i,-(i%2?9:5));ctx.stroke();}
    ctx.restore();
    ctx.save();ctx.translate(w-27,h-29);ctx.rotate(.22);
    ctx.fillStyle='#17263188'; ctx.beginPath();ctx.ellipse(3,5,24,14,0,0,Math.PI*2);ctx.fill();
    for(let y=4;y>=0;y--){
      ctx.fillStyle=y?'#b39261':'#e9cb96';ctx.beginPath();ctx.ellipse(0,y,23,13,0,0,Math.PI*2);ctx.fill();
    }
    ctx.fillStyle='#4a5856';ctx.beginPath();ctx.ellipse(0,0,12,6,0,0,Math.PI*2);ctx.fill();
    ctx.strokeStyle='#a0815e';ctx.stroke();
    ctx.restore();
  }

  face(points, fill, edge='#613e3460') {
    const ctx=this.ctx;
    ctx.beginPath();
    points.forEach((p,i)=>{ const [x,y]=this.screen(p); if(i)ctx.lineTo(x,y);else ctx.moveTo(x,y); });
    ctx.closePath();
    ctx.fillStyle=fill; ctx.fill();
    ctx.strokeStyle=edge;ctx.lineWidth=.9;ctx.stroke();
  }

  inkOnFace(points,width,height,draw) {
    const ctx=this.ctx, [a,b,,d]=points.map(p=>this.screen(p));
    ctx.save();
    ctx.transform((b[0]-a[0])/width,(b[1]-a[1])/width,(d[0]-a[0])/height,(d[1]-a[1])/height,a[0],a[1]);
    ctx.beginPath();ctx.rect(0,0,width,height);ctx.clip();
    draw(ctx);
    ctx.restore();
  }

  printed(points,paper,fill, width, height, faint=false) {
    this.face(points,fill);
    this.inkOnFace(points,width,height,ctx=>{
      ctx.strokeStyle=paper.ink;ctx.lineWidth=.014;ctx.globalAlpha=faint?.34:.56;
      for(let x=.17;x<width+.2;x+=.36){
        for(let y=.14+(Math.round(x/.36)%2)*.13;y<height+.12;y+=.33) {
          decoration(ctx,paper.motif,x,y,.082);
          ctx.fillStyle=paper.ink;ctx.fillRect(x+.15,y+.06,.013,.014);
        }
      }
      ctx.globalAlpha=.6;ctx.lineWidth=.017;
      ctx.strokeRect(.035,.035,width-.07,height-.07);
    });
  }

  draw(state,values,now) {
    const {ctx,w,h,scale} = this;
    if(!w||!h) return;
    const job=jobs[state.job], paper=papers[state.paper];
    ctx.drawImage(this.bg,0,0,w,h);
    const [shadowX,shadowY]=this.screen([.13,0,.19]);
    ctx.fillStyle='#15252c64';
    ctx.beginPath();ctx.ellipse(shadowX,shadowY,scale*1.84,scale*1.05,.03,0,Math.PI*2);ctx.fill();
    this.printed(quad(-job.w/2,job.w/2,0,-job.d/2,job.d/2),paper,paper.base,job.w,job.d);
    const panels=axes.map((_,index)=>{
      const order=state.folds.indexOf(index);
      return { index, order, progress:values[index], pieces:hinge(job,index,values[index],order<0?state.folds.length:order) };
    });
    const drawPanel = ({index,progress,pieces}) => {
      const width = index%2 ? job.w : job.d;
      const reach = (index%2 ? job.d : job.w)/2+.085;
      this.printed(pieces[0],paper,index===3?paper.pale:paper.base,width,job.h+.06,true);
      this.printed(pieces[1],paper,progress>.68?paper.pale:paper.base,width,reach);
    };
    panels.filter(p=>p.progress<.12 || (p.index===0||p.index===1)&&p.progress<.68).forEach(drawPanel);

    const x=job.w/2,z=job.d/2,y=job.h;
    const lid = quad(-x,x,y,-z,z);
    this.face([[x,0,-z],[x,0,z],[x,y,z],[x,y,-z]],'#b78055');
    this.face([[-x,0,z],[x,0,z],[x,y,z],[-x,y,z]],'#d5a475');
    this.face(lid,'#edc591');
    this.inkOnFace(lid,job.w,job.d,c=>{
      c.fillStyle='#b1815642';
      for(let i=0;i<99;i++) c.fillRect(.04+(i*.239)%(job.w-.08),.05+(i*.173)%(job.d-.1),.05,.006);
      c.strokeStyle='#8c644951'; c.lineWidth=.025;c.strokeRect(.1,.1,job.w-.2,job.d-.2);
      c.fillStyle='#f8e3b9';c.fillRect(job.w*.22,job.d*.22,job.w*.56,job.d*.56);
      c.strokeStyle='#a26954';c.setLineDash([.035,.025]);c.strokeRect(job.w*.25,job.d*.25,job.w*.5,job.d*.5);c.setLineDash([]);
      c.fillStyle='#865447';c.font='bold .11px system-ui';c.textAlign='center';c.fillText('PREPARED FOR',job.w*.5,job.d*.44);
      c.fillStyle='#543e36';c.font='.31px Georgia';c.fillText(job.to,job.w*.5,job.d*.64);
    });
    panels.filter(p=>p.progress>=.12 && !((p.index===0||p.index===1)&&p.progress<.68))
      .sort((a,b)=>(a.order<0?99:a.order)-(b.order<0?99:b.order)).forEach(drawPanel);
    if(state.seal) this.stamp(job,paper,state.seal);
    this.fx = this.fx.filter(p=>now-p.start<620);
    for(const p of this.fx) {
      const t=(now-p.start)/620;
      ctx.globalAlpha=(1-t)*(1-t);ctx.fillStyle=p.fill;
      ctx.save();ctx.translate(p.x+p.dx*t,p.y+p.dy*t+24*t*t);ctx.rotate(p.rot*t);ctx.fillRect(-2,-2,4,4);ctx.restore();
    }
    ctx.globalAlpha=1;
  }

  stamp(job,paper,offset) {
    const ctx=this.ctx;
    const [x,y]=this.target(job);
    ctx.save();
    ctx.translate(x+offset[0]*this.scale,y+offset[1]*this.scale);
    ctx.scale(1,.65);
    const r=this.scale*.40;
    ctx.fillStyle='#6d423c77';ctx.beginPath();ctx.arc(1.5,3,r,0,Math.PI*2);ctx.fill();
    ctx.fillStyle=paper.seal;ctx.beginPath();ctx.arc(0,0,r,0,Math.PI*2);ctx.fill();
    ctx.strokeStyle='#ffddaa';ctx.lineWidth=1.5;ctx.beginPath();ctx.arc(0,0,r*.82,0,Math.PI*2);ctx.stroke();
    ctx.lineWidth=2;decoration(ctx,'star',0,0,r*.59);
    ctx.restore();
  }

  burst(x,y,fill,now) {
    this.fx = Array.from({length:16},(_,i)=>{
      const a=i*2.399, r=28+(i%7)*9;
      return {x,y,dx:Math.cos(a)*r,dy:Math.sin(a)*r,fill:i%3?fill:'#fff2bc',rot:i*.52,start:now};
    });
  }
}
