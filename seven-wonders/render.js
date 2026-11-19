const {chromium}=require('playwright');const {spawn}=require('child_process');const http=require('http');const fs=require('fs');const path=require('path');
const root=__dirname;const srv=http.createServer((q,r)=>{const f=path.join(root,decodeURIComponent(q.url.split('?')[0]));fs.readFile(f,(e,d)=>{if(e){r.writeHead(404);return r.end()}r.writeHead(200,{'Content-Type':f.endsWith('.html')?'text/html':'application/javascript'});r.end(d)})}).listen(8765);
(async()=>{const mode=process.argv[2]||'preview';
 const b=await chromium.launch({args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']});
 const p=await b.newPage({viewport:{width:1080,height:1920},deviceScaleFactor:1});
 p.on('console',m=>console.log('C:',m.text()));p.on('pageerror',e=>console.log('ERR',e.message));
 await p.goto('http://localhost:8765/index.html');await p.waitForFunction('window.ready===true',{timeout:60000});
 const total=await p.evaluate('TOTAL');
 if(mode==='preview'){const ts=process.argv.slice(3).map(Number);for(const t of ts){await p.evaluate(t=>renderAt(t),t);await p.screenshot({path:`prev_${t}.jpg`,type:'jpeg',quality:80})}}
 else{const fps=30,N=Math.round(total*fps);const ff=spawn('ffmpeg',['-y','-f','image2pipe','-framerate',''+fps,'-c:v','mjpeg','-i','-','-c:v','libx264','-preset','medium','-crf','18','-pix_fmt','yuv420p','video.mp4'],{stdio:['pipe','ignore','inherit']});
  const t0=Date.now();for(let f=0;f<N;f++){await p.evaluate(t=>renderAt(t),f/fps);const buf=await p.screenshot({type:'jpeg',quality:92});if(!ff.stdin.write(buf))await new Promise(r=>ff.stdin.once('drain',r));if(f%100===0)console.log(f,'/',N,((Date.now()-t0)/1000).toFixed(0)+'s')}
  ff.stdin.end();await new Promise(r=>ff.on('close',r))}
 await b.close();srv.close()})();
