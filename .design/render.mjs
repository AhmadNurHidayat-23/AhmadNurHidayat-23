import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import opentype from 'opentype.js';
import {Resvg} from '@resvg/resvg-js';
import gifenc from 'gifenc';
import sharp from 'sharp';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const {GIFEncoder} = gifenc;
const OUT = path.join(ROOT, 'assets/motion');
const VENDOR = path.join(ROOT, '.design/vendor');
const PREVIEW = path.join(ROOT, '.design/preview');
await fs.mkdir(OUT, {recursive:true});
await fs.mkdir(PREVIEW, {recursive:true});
const parseFont = async name => {
  const bytes = await fs.readFile(path.join(VENDOR, name));
  const font = opentype.parse(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength));
  // The artwork uses basic Latin lettering only; avoid optional shaping lookups.
  delete font.tables.gsub;
  return font;
};
const display = await parseFont('ArchivoBlack-Regular.ttf');
const mono = await parseFont('SpaceMono-Regular.ttf');
const BG='#0A0A0A', FG='#FFFFFF', MUTED='#8A8A8A';
const TAU=Math.PI*2, PERIOD=8, FRAMES=160, DELAY=50;
const wave=(t,phase=0)=>Math.sin(TAU*(t+phase));
const ease=t=>(1-Math.cos(TAU*t))/2;
const cache=new Map();
function text(value,x,y,size,fill=FG,font=display){
  const key=[value,size,font===display?'d':'m'].join('|');
  if(!cache.has(key)) cache.set(key,font.getPath(value,0,0,size,{kerning:true}).toPathData(2));
  return `<path d="${cache.get(key)}" fill="${fill}" transform="translate(${x.toFixed(2)} ${y.toFixed(2)})"/>`;
}
function fit(value,max,size,font=display){return Math.min(size,max/font.getAdvanceWidth(value,1));}
function label(value,x,y,size=18,fill=MUTED){return text(value,x,y,size,fill,mono);}
function line(x1,y1,x2,y2,color=MUTED,opacity=.4,width=1){return `<path d="M${x1} ${y1}L${x2} ${y2}" fill="none" stroke="${color}" stroke-width="${width}" opacity="${opacity}"/>`;}
function arrow(x,y,size=26,offset=0){return `<g transform="translate(${x+offset} ${y-offset})" fill="none" stroke="${FG}" stroke-width="2.5"><path d="M0 ${size}L${size} 0M0 0H${size}V${size}"/></g>`;}
function svg(w,h,body,title='Ahmad Nur Hidayat — portfolio motion',background=BG){
 return `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" role="img"><title>${title.replaceAll('&','&amp;').replaceAll('<','&lt;')}</title><rect width="${w}" height="${h}" fill="${background}"/>${body}</svg>`;
}
function movingText(value,x,y,size,t,amplitude=6){
 let body='',cursor=x;
 for(let i=0;i<value.length;i++){
   body+=text(value[i],cursor,y+amplitude*wave(t,i*.035),size);
   cursor+=display.getAdvanceWidth(value[i],size)+(i<value.length-1?display.getKerningValue(display.charToGlyph(value[i]),display.charToGlyph(value[i+1]))*size/display.unitsPerEm:0);
 }
 return body;
}
function perspectiveGrid(w,h,t,cx,cy,mobile){
 const stroke=mobile?1.3:1.05;
 let body='';
 // The same vanishing point anchors the floor, ceiling and orbital object.
 for(let i=-8;i<=14;i++){
   const x=i*w/6;
   body+=line(cx,cy,x,h+80,MUTED,.14,stroke);
   body+=line(cx,cy,x,-80,MUTED,.09,stroke);
 }
 const phase=(t*2)%1;
 for(const direction of [-1,1]){
   const span=(direction>0?h-cy:cy)+70;
   for(let i=-3;i<28;i++){
     const distance=span*Math.pow(.69,i+phase);
     if(distance<7) continue;
     const y=cy+direction*distance;
     if(y<0||y>h) continue;
     const opacity=Math.min(.23,.07+.16*Math.min(1,distance/span));
     body+=line(0,y,w,y,MUTED,direction>0?opacity:opacity*.68,stroke);
   }
 }
 body+=line(0,cy,w,cy,MUTED,.055,stroke);
 return `<g aria-hidden="true">${body}</g>`;
}
function orbitalWireframe(cx,cy,scale,t,mobile){
 const angle=t*TAU+.42,cosY=Math.cos(angle),sinY=Math.sin(angle);
 const rotate=([x,y,z])=>{
   const tilt=.61;
   const yy=y*Math.cos(tilt)-z*Math.sin(tilt),zz=y*Math.sin(tilt)+z*Math.cos(tilt);
   return [x*cosY+zz*sinY,yy,-x*sinY+zz*cosY];
 };
 const project=point=>{
   const [x,y,z]=rotate(point),perspective=6/(6-z);
   const xx=x*perspective,yy=y*perspective,roll=-.24;
   return {x:cx+scale*(xx*Math.cos(roll)-yy*Math.sin(roll)),y:cy+scale*(xx*Math.sin(roll)+yy*Math.cos(roll)),z};
 };
 const curves=[];
 const torus=(u,v)=>project([(1+.235*Math.cos(v))*Math.cos(u),(1+.235*Math.cos(v))*Math.sin(u),.235*Math.sin(v)]);
 for(let v=0;v<6;v++)curves.push({points:Array.from({length:97},(_,i)=>torus(i*TAU/96,v*TAU/6)),orbit:false});
 for(let u=0;u<12;u++)curves.push({points:Array.from({length:33},(_,i)=>torus(u*TAU/12,i*TAU/32)),orbit:false});
 const orbitPoint=(u,index)=>{
   const tilt=[.88,-.72,.30][index],turn=[.3,-.65,1.1][index],r=[1.36,1.41,1.31][index];
   const x=r*Math.cos(u),y=r*Math.sin(u)*Math.cos(tilt),z=r*Math.sin(u)*Math.sin(tilt);
   return project([x*Math.cos(turn)-y*Math.sin(turn),x*Math.sin(turn)+y*Math.cos(turn),z]);
 };
 for(let i=0;i<3;i++)curves.push({points:Array.from({length:113},(_,j)=>orbitPoint(j*TAU/112,i)),orbit:true});
 const layers={back:[],front:[]};
 for(const curve of curves){
   let group=[],previousSide;
   const flush=()=>{
     if(group.length<2)return;
     const d=group.map((p,i)=>`${i?'L':'M'}${p.x.toFixed(2)} ${p.y.toFixed(2)}`).join('');
     layers[previousSide].push(`<path d="${d}" fill="none" stroke="${curve.orbit?MUTED:FG}" stroke-width="${mobile?1.25:1.0}" opacity="${previousSide==='back'?(curve.orbit?.22:.20):(curve.orbit?.50:.73)}"/>`);
   };
   for(let i=1;i<curve.points.length;i++){
     const a=curve.points[i-1],b=curve.points[i],side=(a.z+b.z)/2>0?'front':'back';
     if(side!==previousSide){flush();group=[a];previousSide=side;}
     group.push(b);
   }
   flush();
 }
 const particles=[];
 for(let i=0;i<3;i++){
   const p=orbitPoint(t*TAU*(i===1?1:2)+i*2.1,i);
   particles.push(`<circle cx="${p.x.toFixed(2)}" cy="${p.y.toFixed(2)}" r="${mobile?2.1:2.0}" fill="${FG}" opacity="${p.z>0?.75:.36}"/>`);
 }
 return `<g aria-hidden="true">${layers.back.join('')}${layers.front.join('')}${particles.join('')}</g>`;
}
function welcomeTypewriter(t,mobile,p){
 const headline='WELCOME TO MY GITHUB',seconds=t*PERIOD;
 let count=headline.length;
 if(seconds>=2&&seconds<3.3) count=Math.max(0,headline.length-Math.floor((seconds-2)/1.3*headline.length));
 else if(seconds>=3.3&&seconds<3.6) count=0;
 else if(seconds>=3.6&&seconds<5.8) count=Math.min(headline.length,Math.floor((seconds-3.6)/2.2*headline.length));
 const visible=headline.slice(0,count);
 // At typical GitHub content widths these render at ~36px desktop / ~23px mobile.
 const size=mobile?56:52;
 const first=mobile?visible.slice(0,10):visible;
 const second=mobile&&count>10?visible.slice(11):'';
 const firstY=mobile?199:270,secondY=271;
 let body=first?text(first,p,firstY,size):'';
 if(second) body+=text(second,p,secondY,size);
 const cursorLine=mobile&&count>10?second:first;
 const cursorY=mobile&&count>10?secondY:firstY;
 if(Math.floor(seconds/.4)%2===0){
   const cursorX=p+display.getAdvanceWidth(cursorLine,size)+8;
   body+=`<rect x="${cursorX}" y="${cursorY-size*.76}" width="4" height="${size*.82}" fill="${FG}"/>`;
 }
 return body;
}
function hero(t,mobile=false){
 const w=mobile?720:1200,h=mobile?490:480,p=mobile?36:56;
 const cx=mobile?594:1000,cy=mobile?245:250;
 let b=perspectiveGrid(w,h,t,cx,cy,mobile);
 b+=orbitalWireframe(cx,cy,mobile?70:103,t,mobile);
 b+=label('WEB + MOBILE DEVELOPER',p,mobile?56:53,mobile?24:18);
 b+=line(p,80,w-p,80);
 b+=welcomeTypewriter((t*2)%1,mobile,p);
 if(mobile){
   b+=line(p,405,w-p,405);
   b+=label('DESIGN. DEVELOP. CREATE.',p,451,26,FG);
 }else{
   b+=label('DESIGN. DEVELOP. CREATE.',p,439,20,FG);
   b+=label('SELECTED WORK / GITHUB',863,439,17);
 }
 return svg(w,h,b,'Orbital Infinity Motion. Welcome to my GitHub. Design. Develop. Create.','#080808');
}
const technologies=[['Laravel','laravel'],['PHP','php'],['JavaScript','javascript'],['React','react'],['Tailwind CSS','tailwindcss'],['MySQL','mysql'],['Flutter','flutter'],['Git','git'],['GitHub','github']];
const logos={};
for(const [,slug] of technologies){
 const raw=await fs.readFile(path.join(VENDOR,slug+'.svg'),'utf8');
 logos[slug]=raw.match(/<path[^>]+d="([^"]+)"/)?.[1];
 if(!logos[slug]) throw new Error(`Missing logo path for ${slug}`);
}
function technology(t,mobile=false){
 const w=mobile?720:1200,h=mobile?445:230,p=mobile?36:56;
 let b=label('01 / TOOLS & TECHNOLOGIES',p,42,mobile?22:18);
 b+=line(p,64,w-p,64);
 const cols=mobile?3:9,cell=(w-2*p)/cols;
 technologies.forEach(([name,slug],i)=>{
   const row=Math.floor(i/cols),col=i%cols,x=p+cell*(col+.5),y=(mobile?113:102)+row*116;
   const dy=3*wave(t,i/9);
   const size=mobile?44:43;
   b+=`<g transform="translate(${x-size/2} ${y+dy}) scale(${size/24})"><path d="${logos[slug]}" fill="${FG}"/></g>`;
   b+=label(name,x-mono.getAdvanceWidth(name,mobile?24:15)/2,y+(mobile?77:79),mobile?24:15,FG);
   if(!mobile&&i<8) b+=line(p+cell*(i+1),110,p+cell*(i+1),152,MUTED,.25);
 });
 b+=`<rect x="${p}" y="${h-12}" width="${w-2*p}" height="1" fill="${MUTED}" opacity=".3"/><rect x="${p+(w-2*p-80)*ease(t)}" y="${h-13}" width="80" height="2" fill="${FG}"/>`;
 return svg(w,h,b,'Laravel, PHP, JavaScript, React, Tailwind CSS, MySQL, Flutter, Git and GitHub.');
}
const projects=[
 {slug:'simaul-web',index:'01',title:'SIMAUL',type:'WEB APPLICATION',stack:'LARAVEL / MYSQL / TAILWIND',desc:['Multi-branch service operations.','Bookings, POS & role-based workflows.'],image:'simaul.webp',repo:'sistem-manajement-usaha-layanan-web'},
 {slug:'simaul-mobile',index:'02',title:'SIMAUL',type:'MOBILE APPLICATION',stack:'FLUTTER / DART / REST API',desc:['Service booking, on the go.','Customer & employee experiences.'],image:'simaul-mobile.webp',repo:'sistem-manajement-usaha-layanan-mobile'},
 {slug:'task-board',index:'03',title:'TASK BOARD',type:'REACT APPLICATION',stack:'REACT / TYPESCRIPT / VITE',desc:['A focused Kanban workspace.','Drag, prioritize & keep tasks locally.'],repo:'task-board'},
];
const pictures={};
for(const project of projects.filter(p=>p.image)){
 const file=path.join(VENDOR,project.image);
 try { const data=await sharp(file).resize({width:1100,withoutEnlargement:true}).greyscale().png().toBuffer();pictures[project.slug]='data:image/png;base64,'+data.toString('base64'); }
 catch {if(!process.argv.includes('--activity')) throw Error(`Missing genuine project image: ${file}`);}
}
function projectCard(project,t,mobile=false){
 const first=project.index==='01',w=mobile?720:1200,h=mobile?(first?608:550):(first?380:322),p=mobile?36:56;
 const extra=first?58:0,top=extra+24;
 let b='';
 if(first){b+=label('02 / SELECTED WORK',p,38,mobile?22:18);b+=line(p,60,w-p,60);}
 b+=label(`${project.index} / ${project.type}`,p,top+33,mobile?22:17);
 const titleSize=fit(project.title,mobile?600:500,mobile?70:70);
 b+=movingText(project.title,p-2,top+(mobile?116:119),titleSize,t,.9);
 const descSize=mobile?26:19;
 project.desc.forEach((l,i)=>b+=label(l,p,top+(mobile?155:165)+i*31,descSize,i===0?FG:MUTED));
 b+=label(project.stack,p,top+(mobile?234:262),mobile?23:16,MUTED);
 b+=arrow(w-p-25,top+6,25,3*ease(t));
 const rx=mobile?p:638,ry=mobile?top+270:top+45,rw=mobile?w-p*2:506,rh=mobile?228:221;
 if(project.image){
   b+=`<defs><clipPath id="image"><rect x="${rx}" y="${ry}" width="${rw}" height="${rh}"/></clipPath></defs>`;
   b+=`<rect x="${rx}" y="${ry}" width="${rw}" height="${rh}" fill="${project.slug==='simaul-web'?BG:FG}"/><image xlink:href="${pictures[project.slug]}" x="${rx}" y="${ry}" width="${rw}" height="${rh}" preserveAspectRatio="${project.slug==='simaul-web'?'xMidYMin slice':'xMidYMid meet'}" clip-path="url(#image)"/>`;
   b+=`<path d="M${rx+rw*ease(t)} ${ry-8}h${Math.max(0,Math.min(40,rw-rw*ease(t)))}" stroke="${FG}" stroke-width="2"/>`;
 }else{
   // Typographic project study: deliberately no invented application screenshot.
   b+=`<rect x="${rx}" y="${ry}" width="${rw}" height="${rh}" fill="none" stroke="${MUTED}" stroke-opacity=".3"/>`;
   const verbs=['PLAN.','MOVE.','DONE.'];
   verbs.forEach((v,i)=>{
     const vy=ry+54+i*65,shift=8*wave(t,i*.08);
     b+=text(v,rx+28+shift,vy,45,i===2?FG:MUTED);
     b+=line(rx+316,vy-14,rx+rw-26,vy-14,MUTED,.35);
     b+=`<rect x="${rx+316+(rw-368)*ease(t+i*.08)}" y="${vy-17}" width="6" height="6" fill="${FG}"/>`;
   });
 }
 b+=line(p,h-1,w-p,h-1);
 return svg(w,h,b,`${project.title} — ${project.type}. ${project.desc.join(' ')} Open the repository.`);
}
const calendar=JSON.parse(await fs.readFile(path.join(ROOT,'.design/data/activity.json'),'utf8'));
const allDays=calendar.weeks.flatMap(w=>w.contributionDays);
const total=allDays.reduce((sum,d)=>sum+d.contributionCount,0);
if(total!==calendar.totalContributions) throw new Error('Contribution total mismatch.');
const levels={NONE:BG,FIRST_QUARTILE:'#535353',SECOND_QUARTILE:MUTED,THIRD_QUARTILE:'#C5C5C5',FOURTH_QUARTILE:FG};
function activity(t,mobile=false){
 const w=mobile?720:1200,h=mobile?430:335,p=mobile?36:56;
 let b=label('03 / GITHUB ACTIVITY',p,42,mobile?22:18);
 b+=line(p,64,w-p,64);
 b+=text(String(total),p-3,mobile?166:161,mobile?84:86);
 b+=label('CONTRIBUTIONS / PAST YEAR',mobile?237:260,mobile?147:143,mobile?20:19,FG);
 const weeks=calendar.weeks,step=(w-2*p)/(weeks.length),cell=Math.max(3,step-5),start=mobile?212:190;
 weeks.forEach((week,col)=>week.contributionDays.forEach(day=>{
   b+=`<rect x="${p+col*step}" y="${start+day.weekday*(mobile?19:15)}" width="${cell}" height="${mobile?14:10}" fill="${levels[day.contributionLevel]}" stroke="${MUTED}" stroke-width=".6" stroke-opacity="${day.contributionCount?.2:.45}"/>`;
 }));
 // A moving locator above the real, unchanged calendar; no synthetic contributions.
 const scan=p+(w-2*p-8)*ease(t);
 b+=`<path d="M${scan-4} ${start-13}h8l-4 5Z" fill="${FG}"/>`;
 const date=new Date(calendar.fetchedAt).toISOString().slice(0,10);
 b+=label(`${allDays[0].date} — ${allDays.at(-1).date}`,p,h-24,mobile?18:16,MUTED);
 b+=label(`UPDATED ${date}`,mobile?439:899,h-24,mobile?16:16,MUTED);
 return svg(w,h,b,`${total} real GitHub contributions from ${allDays[0].date} to ${allDays.at(-1).date}. Updated ${date}.`);
}
function footer(t,mobile=false){
 const w=mobile?720:1200,h=mobile?310:244,p=mobile?36:56;
 let b=line(p,1,w-p,1);
 b+=label('04 / ALWAYS IN PROGRESS',p,48,mobile?22:18);
 if(mobile){
   b+=movingText('BUILDING THINGS',p-2,132,fit('BUILDING THINGS',w-2*p,62),t,2);
   b+=movingText('FOR THE WEB.',p-2,209,69,t+.08,2);
   b+=label('LET’S CONNECT',p,278,24,FG);
   b+=arrow(w-p-26,254,25,3*ease(t));
 }else{
   b+=movingText('BUILDING THINGS',p-2,127,fit('BUILDING THINGS',900,78),t,2);
   b+=movingText('FOR THE WEB.',p-2,212,78,t+.08,2);
   b+=arrow(1080,161,55,4*ease(t));
 }
 return svg(w,h,b,'Building things for the web.');
}

// Reserved transparent index 0 plus an evenly spaced grayscale palette.
// Delta frames preserve all unchanged pixels and avoid repeating screenshot data.
const grayscalePalette=(black=10,colors=128)=>[[0,0,0],...Array.from({length:colors-1},(_,i)=>{const v=Math.round(black+i*(255-black)/(colors-2));return[v,v,v];})];
function indexed(pixels,black=10,colors=128){
 const result=new Uint8Array(pixels.length/4);
 for(let p=0,i=0;p<pixels.length;p+=4,i++) result[i]=1+Math.max(0,Math.min(colors-2,Math.round((pixels[p]-black)*(colors-2)/(255-black))));
 return result;
}
async function render(name,draw,{black=10,frames=FRAMES,period=PERIOD,colors=128,width}={}){
 const still=draw(0);
 await fs.writeFile(path.join(OUT,name+'.svg'),still);
 const rasterOptions={font:{loadSystemFonts:false},...(width?{fitTo:{mode:'width',value:width}}:{})};
 const first=new Resvg(still,rasterOptions).render();
 await fs.writeFile(path.join(PREVIEW,name+'.png'),first.asPng());
 if(process.argv.includes('--stills')) return;
 const encoder=GIFEncoder(),palette=grayscalePalette(black,colors); let previous;
 for(let i=0;i<frames;i++){
   const frame=i===0?first:new Resvg(draw(i/frames),rasterOptions).render();
   const current=indexed(frame.pixels,black,colors);
   const delta=current.slice();
   if(previous) for(let j=0;j<delta.length;j++) if(current[j]===previous[j]) delta[j]=0;
   encoder.writeFrame(delta,frame.width,frame.height,{
     ...(i===0?{palette}:{}),delay:DELAY,repeat:0,dispose:1,transparent:i>0,transparentIndex:0,colorDepth:colors===128?8:Math.log2(colors),
   });
   previous=current;
 }
 encoder.finish();
 const bytes=encoder.bytes();
 await fs.writeFile(path.join(OUT,name+'.gif'),bytes);
 console.log(`${name}: ${(bytes.length/1024).toFixed(0)} KB / ${frames} frames / ${period}s`);
}
const activityOnly=process.argv.includes('--activity');
const heroOnly=process.argv.includes('--hero');
for(const mobile of (process.argv.includes('--mobile')?[true]:[false,true])){
 const suffix=mobile?'-mobile':'';
 if(heroOnly){
   await render('hero-orbital-infinity'+suffix,t=>hero(t,mobile),{black:8,frames:320,period:16,colors:32,width:mobile?600:1000});
   continue;
 }
 if(!activityOnly){
   await render('hero-orbital-infinity'+suffix,t=>hero(t,mobile),{black:8,frames:320,period:16,colors:32,width:mobile?600:1000});
   await render('technologies'+suffix,t=>technology(t,mobile));
   for(const project of projects) await render(project.slug+suffix,t=>projectCard(project,t,mobile));
   await render('footer'+suffix,t=>footer(t,mobile));
 }
 await render('activity'+suffix,t=>activity(t,mobile));
}
if(!activityOnly&&!heroOnly){
 const contact=async(mobile)=>{
   const suffix=mobile?'-mobile':'';
   const names=['hero-orbital-infinity','technologies','simaul-web','simaul-mobile','task-board','activity','footer'];
   const width=mobile?390:900;let y=0;const items=[];
   for(const name of names){const data=await sharp(path.join(PREVIEW,name+suffix+'.png')).resize({width}).png().toBuffer();const meta=await sharp(data).metadata();items.push({input:data,left:0,top:y});y+=meta.height+12;}
   await sharp({create:{width,height:y,channels:3,background:BG}}).composite(items).png().toFile(path.join(PREVIEW,`overview${suffix}.png`));
 };
 await contact(false);await contact(true);
}
