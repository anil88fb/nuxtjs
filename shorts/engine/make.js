// Usage:
//   node make.js <content.json> preview            -> renders a contact sheet (sheet.jpg) next to the content file
//   node make.js <content.json> full <out.mp4>     -> renders the full video with synthesized audio
const {chromium}=require('playwright');const {spawn,execFileSync}=require('child_process');const http=require('http');const fs=require('fs');const path=require('path');
const root=__dirname;const contentPath=path.resolve(process.argv[2]);const mode=process.argv[3]||'preview';const out=path.resolve(process.argv[4]||path.join(path.dirname(contentPath),'video.mp4'));
const content=JSON.parse(fs.readFileSync(contentPath,'utf8'));const work=path.dirname(contentPath);
const types={'.html':'text/html','.js':'application/javascript'};
const srv=http.createServer((q,r)=>{const f=path.join(root,decodeURIComponent(q.url.split('?')[0]));fs.readFile(f,(e,d)=>{if(e){r.writeHead(404);return r.end()}r.writeHead(200,{'Content-Type':types[path.extname(f)]||'application/octet-stream'});r.end(d)})}).listen(0);
(async()=>{const port=srv.address().port;
 const b=await chromium.launch({args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']});
 const p=await b.newPage({viewport:{width:1080,height:1920},deviceScaleFactor:1});
 let errs=0;p.on('pageerror',e=>{errs++;console.log('PAGE ERROR',e.message)});
 await p.addInitScript(c=>{window.CONTENT=c},content);
 await p.goto(`http://localhost:${port}/index.html`);await p.waitForFunction('window.ready===true',{timeout:120000});
 const TL=await p.evaluate('TIMELINE');console.log('timeline',JSON.stringify(TL));
 if(mode==='preview'){const ts=[1.8];for(let i=0;i<TL.n;i++)ts.push(TL.T_INTRO+i*TL.T_SCENE+TL.T_SCENE*.72);ts.push(TL.TOTAL-2);
   const files=[];for(const t of ts){await p.evaluate(t=>renderAt(t),t);const f=path.join(work,`prev_${t.toFixed(1)}.jpg`);await p.screenshot({path:f,type:'jpeg',quality:80});files.push(f)}
   const cols=Math.min(5,files.length),rows=Math.ceil(files.length/cols);
   execFileSync('ffmpeg',['-y','-loglevel','error',...files.flatMap(f=>['-i',f]),'-filter_complex',files.map((_,i)=>`[${i}]scale=270:480[s${i}]`).join(';')+';'+files.map((_,i)=>`[s${i}]`).join('')+`xstack=inputs=${files.length}:layout=${files.map((_,i)=>`${(i%cols)*270}_${Math.floor(i/cols)*480}`).join('|')}:fill=black`,path.join(work,'sheet.jpg')]);
   files.forEach(f=>fs.unlinkSync(f));console.log('sheet:',path.join(work,'sheet.jpg'),'errors:',errs)}
 else{const fps=30,N=Math.round(TL.TOTAL*fps);const vid=path.join(work,'_video.mp4');
  const ff=spawn('ffmpeg',['-y','-loglevel','error','-f','image2pipe','-framerate',''+fps,'-c:v','mjpeg','-i','-','-c:v','libx264','-preset','medium','-crf','19','-pix_fmt','yuv420p',vid],{stdio:['pipe','inherit','inherit']});
  const t0=Date.now();for(let f=0;f<N;f++){await p.evaluate(t=>renderAt(t),f/fps);const buf=await p.screenshot({type:'jpeg',quality:92});if(!ff.stdin.write(buf))await new Promise(r=>ff.stdin.once('drain',r));if(f%150===0)console.log(`frame ${f}/${N} ${((Date.now()-t0)/1000).toFixed(0)}s`)}
  ff.stdin.end();await new Promise(r=>ff.on('close',r));
  const wav=path.join(work,'_audio.wav');fs.writeFileSync(path.join(work,'_timeline.json'),JSON.stringify({...TL,seed:content.audioSeed??content.date??'x'}));
  execFileSync('python3',[path.join(root,'audio.py'),path.join(work,'_timeline.json'),wav],{stdio:'inherit'});
  execFileSync('ffmpeg',['-y','-loglevel','error','-i',vid,'-i',wav,'-c:v','copy','-c:a','aac','-b:a','192k','-shortest','-movflags','+faststart',out]);
  fs.unlinkSync(vid);fs.unlinkSync(wav);fs.unlinkSync(path.join(work,'_timeline.json'));console.log('done:',out,'errors:',errs)}
 await b.close();srv.close()})().catch(e=>{console.error(e);process.exit(1)});
