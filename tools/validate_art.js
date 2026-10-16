#!/usr/bin/env node
/* Verify deterministic and diverse offline food illustrations in GitHub Actions. */
const fs = require('fs');
const vm = require('vm');
const path = require('path');
const root = path.join(__dirname, '..', 'app', 'src', 'main', 'assets');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const m=html.match(/id="baseRecipes">([\s\S]*?)<\/script>/);
if (!m) throw Error('Missing embedded recipes');
const all=JSON.parse(m[1]);
const sources=[
  ['iba-cocktails.js','VKUSFERA_IBA'],
  ['alcohol-recipes.js','VKUSFERA_ALCOHOL'],
  ['world-baking-1.js','VKUSFERA_WORLD_A'],
  ['world-main-1.js','VKUSFERA_WORLD_B'],
  ['world-drinks-preserves-1.js','VKUSFERA_WORLD_C'],
  ['journal-recipes.js','VKUSFERA_JOURNAL'],
];
for (const [filename,variable] of sources) {
  const src=fs.readFileSync(path.join(root,filename),'utf8').trim();
  const prefix='window.'+variable+'=';
  if(!src.startsWith(prefix)) throw Error('Invalid data: '+filename);
  all.push(...JSON.parse(src.slice(prefix.length,-1)));
}
if(!html.includes('<script src="recipe-art.js"></script>')) throw Error('Cover script not linked to app');
const context={window:{}, Math, encodeURIComponent, String, Object, Array};
vm.createContext(context);
vm.runInContext(fs.readFileSync(path.join(root,'recipe-art.js'),'utf8'),context);
if(typeof context.window.VkusferaArt!=='function') throw Error('Illustration function missing');
const covers=new Set();
for (const recipe of all) {
  const cover=context.window.VkusferaArt(recipe);
  if(!cover.startsWith('data:image/svg+xml;charset=UTF-8,%3Csvg')) throw Error('Missing cover: '+recipe.name);
  const svg=decodeURIComponent(cover.split(',')[1]);
  if(!svg.includes('<svg ') || !svg.includes('</svg>')) throw Error('Malformed SVG: '+recipe.name);
  if(covers.has(cover)) throw Error('Duplicate cover: '+recipe.name);
  covers.add(cover);
}
console.log('Verified '+covers.size+' distinct offline illustrations for '+all.length+' cookbook entries.');
