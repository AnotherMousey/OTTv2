import fs from 'node:fs';
import path from 'node:path';
const root = path.resolve('frontend');
let html = fs.readFileSync(path.join(root,'dist/index.html'),'utf8');
const cssPath = html.match(/<link[^>]*href="([^"]+\.css)"[^>]*>/)?.[1];
const jsPath = html.match(/<script[^>]*src="([^"]+\.js)"[^>]*><\/script>/)?.[1];
if(!cssPath || !jsPath) throw Error('Build outputs not found.');
let css = fs.readFileSync(path.resolve(root,'dist',cssPath),'utf8');
css=css.replace(/url\((['"]?)([^)'" ]+\.ttf)\1\)/g,(_,quote,url)=>{
  const file=url.startsWith('/') ? path.resolve(root,'dist',url.slice(1)) : path.resolve(path.dirname(path.resolve(root,'dist',cssPath)),url);
  return `url("data:font/ttf;base64,${fs.readFileSync(file).toString('base64')}")`;
});
const js = fs.readFileSync(path.resolve(root,'dist',jsPath),'utf8');
html=html.replace(/<link[^>]*href="[^"]+\.css"[^>]*>/,'').replace(/<script[^>]*src="[^"]+\.js"[^>]*><\/script>/,'');
html=html.replace('</head>',()=>`<style>${css}</style></head>`).replace('</body>',()=>`<script type="module">${js.replaceAll('</script','<\\/script')}</script></body>`);
if(/\.\.data:/.test(html) || /url\([^)]*\.ttf/.test(html)) throw Error('Unembedded font URL.');
fs.writeFileSync(path.join(root,'preview.html'),html);
console.log('Built offline demo preview with embedded Pixeloid fonts.');
