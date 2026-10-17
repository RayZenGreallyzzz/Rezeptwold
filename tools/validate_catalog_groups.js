#!/usr/bin/env node
'use strict';
const fs=require('fs'),path=require('path'),assert=require('assert'),vm=require('vm');
const root=path.resolve(__dirname,'../app/src/main/assets');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const match=html.match(/id="baseRecipes">([\s\S]*?)<\/script>/);
assert(match,'missing 332 embedded originals');
const recipes=JSON.parse(match[1]);
const inputs=[
['iba-cocktails.js','VKUSFERA_IBA'],
['alcohol-recipes.js','VKUSFERA_ALCOHOL'],
['world-baking-1.js','VKUSFERA_WORLD_A'],
['world-main-1.js','VKUSFERA_WORLD_B'],
['world-drinks-preserves-1.js','VKUSFERA_WORLD_C'],
['journal-recipes.js','VKUSFERA_JOURNAL'],
['extra-cuisines-1.js','VKUSFERA_EXTRA']
];
for(const [file,name] of inputs){
 const src=fs.readFileSync(path.join(root,file),'utf8').trim();
 assert(src.startsWith('window.'+name+'=')&&src.endsWith(';'),file);
 recipes.push(...JSON.parse(src.slice(('window.'+name+'=').length,-1)));
}
assert.strictEqual(recipes.length,579,'Catalog shrank');
assert.strictEqual(recipes.filter(r=>!r.reference_only).length,569,'Actual recipe count changed');
assert.strictEqual(new Set(recipes.map(r=>r.series_number)).size,579,'Duplicate IDs');
const w={};vm.runInNewContext(fs.readFileSync(path.join(root,'recipe-groups.js'),'utf8'),{window:w});
assert(w.VkusferaGroups,'Group classifier missing');
const g=w.VkusferaGroups;
const count=k=>recipes.filter(x=>g.matches(x,k)).length;
assert.strictEqual(count('all'),579,'All recipes must be visible');
for(const [k,min] of Object.entries({baking:140,dessert:50,soup:30,drinks:35,alcohol:110,cocktail:50,main:110,preserve:40})){
 assert(count(k)>=min,'Incomplete '+k+': '+count(k));
}
assert(recipes.filter(r=>/безалкогол/i.test(r.category)).every(r=>!g.matches(r,'alcohol')),'Soft drinks leak into alcohol');
assert(recipes.filter(r=>r.category==='Безалкогольные напитки').every(r=>g.matches(r,'drinks')),'Soft drinks are hidden');
assert(g.countryMatches({country:'Италия — домашняя адаптация'},'Италия'),'Variant cuisine must count under home country');
assert(html.includes("['all','Все рецепты'"),'Prominent full catalog home tile missing');
assert(html.includes('id="resetFiltersBtn"'),'Open whole catalog button missing');
assert(html.includes('el(\'category\').value=\'\';shown=24'),'Switching tabs must clear previous hidden category filter');
assert(html.includes("el('category').onchange=function(){tab='all'"),'Choosing category must reset competing tab');
assert(html.includes("if(c&&!window.VkusferaGroups.countryMatches(r,c))continue;"),'Country selection must use canonical aliases');
assert(html.includes("if(cat&&!categoryMatch(r,cat))continue;"),'Category select must be broad, not exact subcategory');
console.log('OK: '+recipes.length+' cards, '+(recipes.length-10)+' recipes; categories '+JSON.stringify(Object.fromEntries(['baking','dessert','soup','drinks','alcohol','cocktail','main','preserve'].map(x=>[x,count(x)]))));
