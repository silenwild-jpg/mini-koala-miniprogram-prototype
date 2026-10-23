const http=require('node:http'),fs=require('node:fs'),path=require('node:path');
const args=process.argv.slice(2),index=args.indexOf('--port');
const port=Number(index>=0?args[index+1]:8765),root=path.resolve(__dirname,'..');
if(!Number.isInteger(port)||port<1||port>65535)throw Error('Invalid port');
const mime={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'application/javascript; charset=utf-8','.json':'application/json','.png':'image/png','.svg':'image/svg+xml','.jpg':'image/jpeg','.jpeg':'image/jpeg','.webp':'image/webp'};
const server=http.createServer((req,res)=>{let file;try{const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);file=path.resolve(root,'.'+(pathname==='/'?'/index.html':pathname));}catch{res.writeHead(400).end();return;}
if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return;}
if(req.url==='/favicon.ico'){res.writeHead(204).end();return;}
fs.readFile(file,(err,data)=>{if(err){res.writeHead(404).end('Not found');return;}res.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream','Cache-Control':'no-store'});res.end(data);});});
server.listen(port,'127.0.0.1',()=>console.log('Mini Koala preview: http://127.0.0.1:'+port+'/prototype/product_demo_hub_v1.html'));
for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>server.close(()=>process.exit(0)));
