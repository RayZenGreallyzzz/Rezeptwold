/* Vkusfera individual offline illustrated covers. Illustrations are not photographs. */
(function(){
'use strict';
var cache={}, cacheKeys=[];
function esc(s){return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&apos;')}
function norm(s){return String(s||'').toLowerCase().replace(/ё/g,'е')}
function hash(s){var h=2166136261;for(var i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619)}return h>>>0}
function rng(seed){return function(){seed^=seed<<13;seed^=seed>>>17;seed^=seed<<5;return(seed>>>0)/4294967296}}
function choose(r,a){return a[Math.floor(r()*a.length)]}
function circ(x,y,r,fill,stroke,sw){return '<circle cx="'+x+'" cy="'+y+'" r="'+r+'" fill="'+fill+'"'+(stroke?' stroke="'+stroke+'" stroke-width="'+(sw||2)+'"':'')+'/>'}
function ellipse(x,y,rx,ry,fill,extra){return '<ellipse cx="'+x+'" cy="'+y+'" rx="'+rx+'" ry="'+ry+'" fill="'+fill+'" '+(extra||'')+'/>'}
function path(d,fill,extra){return '<path d="'+d+'" fill="'+fill+'" '+(extra||'')+'/>'}
function foodCategory(rec){
 var s=norm(rec.name+' '+rec.category);
 if(/коктейл|лимонад|напит|чай|кофе|какао|латте|мохито|шорле|матча|смузи|молочн.*коктей|айран|ласси|компот|кисель|морс/.test(s))return'drink';
 if(/виски|бурбон|джин|наливк|настойк|ром|бренди|ликер|ликер|водка|самогон|дистиллят|алкогол|сидр|вино|пиво|медовух|брага|перри/.test(s))return'drink';
 if(/джем|варень|конфитюр|маринад|квашен|солень|заготов|солен.*огур|соус|песто|консерв|уксус/.test(s))return'jar';
 if(/суп|борщ|рамен|похлеб|щи|ухa|суп-пюре|бульон|окрошка|гаспачо|харчо/.test(s))return'soup';
 if(/салат|винегрет|овощной микс|табуле|закуск/.test(s))return'salad';
 if(/торт|чизкейк|пирожн|эклер|тирамису|пудинг|мусс|фондан|панна-котта|крем|морожен|желе|печень|конфет/.test(s))return'dessert';
 if(/выпеч|хлеб|булоч|круассан|сдоба|батон|пирог|пирож|лепеш|лепешк|хачапури|пицца|фокачч|лаваш|брецел|брецел|сдобр|ватруш|блин|олад|панкейк|маффин|кекс|багет/.test(s))return'baking';
 return'main';
}
function palette(rec,type,seed){
 var s=norm(rec.name+' '+rec.ingredients.slice(0,5).join(' '));
 if(/свекл|борщ|вишн|клубник|томат|помидор|малин|гранат|красн|паприк|перец/.test(s))return ['#962d32','#cb5540','#ef9b64'];
 if(/шоколад|какао|кофе|печень|бурбон|виски|говядин|баранин/.test(s))return ['#6f3e28','#b47749','#dfb67c'];
 if(/тыкв|морков|манго|персик|апельсин|абрикос|шафран/.test(s))return ['#af4a26','#e38c39','#f4cd75'];
 if(/огур|кинз|песто|брокколи|шпинат|салат|мята|лайм|капуста|базилик/.test(s))return ['#3d663c','#76a655','#c0d18a'];
 if(/черник|голубик|слив|черносмород|виноград/.test(s))return ['#684267','#a579a8','#ebbece'];
 if(/яйц|сыр|молок|сливк|йогурт|сметан|ванил|кокос/.test(s))return ['#ca914f','#edc883','#fff0ba'];
 var palettes=[['#8e3c2e','#d87945','#f6c586'],['#57723d','#93b45e','#d5d59d'],['#85552d','#cc8a46','#ecd18f'],['#703d3a','#bf7660','#f2b898'],['#906b33','#e0aa58','#f6dcaa']];
 return palettes[seed%palettes.length];
}
function backdrop(seed,r){var blobs='';for(var i=0;i<15;i++){var x=Math.floor(r()*560),y=Math.floor(r()*360),rad=10+r()*52;blobs+=circ(x,y,rad,'#d0ae7620')}
 return '<defs><radialGradient id="bg" cx="52%" cy="38%" r="80%"><stop stop-color="#405443"/><stop offset=".6" stop-color="#213128"/><stop offset="1" stop-color="#0f1b17"/></radialGradient><radialGradient id="plate" cx="40%" cy="25%" r="80%"><stop stop-color="#fff1d7"/><stop offset=".7" stop-color="#ddc3a3"/><stop offset="1" stop-color="#a98a67"/></radialGradient><linearGradient id="glass" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#f1f8efff"/><stop offset=".5" stop-color="#bdd3cc65"/><stop offset="1" stop-color="#ffffffb6"/></linearGradient><linearGradient id="gold" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#f4cf93"/><stop offset=".55" stop-color="#d0a465"/><stop offset="1" stop-color="#90633d"/></linearGradient><filter id="blur"><feGaussianBlur stdDeviation="8"/></filter></defs><rect width="520" height="320" fill="url(#bg)"/>'+blobs+ellipse(255,296,188,20,'#02060465','filter="url(#blur)"');
}
function leaf(x,y,sz,angle,col){
return '<g transform="translate('+x+' '+y+') rotate('+angle+')">'+path('M0 0 Q'+sz+' -'+sz*.9+' '+sz*1.2+' -'+sz*2.1+' Q-'+sz*.7+' -'+sz*1.4+' 0 0Z',col,'stroke="#1b3d28" stroke-width="1.7"')+path('M0 0L'+(sz*1.2)+' -'+(sz*2.1),'none','stroke="#d5d9a0" stroke-width="1.2" opacity=".55"')+'</g>';
}
function garnish(seed,r,pal,shape){
var body='';for(var i=0;i<15;i++){var ang=r()*Math.PI*2,rr=Math.sqrt(r())*90,xx=260+Math.cos(ang)*rr,yy=190+Math.sin(ang)*rr*.56,sz=4+r()*12;
if(i%4===0)body+=leaf(xx,yy,sz,Math.floor(r()*360),'#608a47');
else if(i%4===1)body+=circ(xx,yy,sz*.72,choose(r,['#cc502b','#e5bb64','#d06a4c','#d1a254']), '#b87540',1);
else if(i%4===2)body+=ellipse(xx,yy,sz*1.3,sz*.5,choose(r,pal), 'transform="rotate('+Math.floor(r()*160)+' '+xx+' '+yy+')"');
else body+=circ(xx,yy,sz*.38,'#f2dd9d');
}
return body
}
function plateFood(r,pal,mode){
var h=ellipse(260,229,164,95,'#0b130e78')+ellipse(260,208,155,91,'url(#plate)','stroke="#f5e6cd" stroke-width="8"')+ellipse(260,205,127,73,'#e8d6b7','stroke="#b9a080" stroke-width="4"');
if(mode==='main'){
 h+=ellipse(260,204,108,63,pal[0]);
 for(var i=0;i<10;i++){var x=173+r()*177,y=162+r()*82,ang=Math.floor(r()*140);h+=ellipse(x,y,20+r()*19,9+r()*11,choose(r,pal),'transform="rotate('+ang+' '+x+' '+y+')" stroke="#d5a068" stroke-width="2"');}
 h+=garnish(0,r,pal);
}else if(mode==='salad'){
 h+=ellipse(260,203,122,68,'#4c7440');
 for(var i=0;i<21;i++){var a=r()*6.28,rad=Math.sqrt(r())*118,x=260+Math.cos(a)*rad,y=205+Math.sin(a)*rad*.5,sz=r()*10+9;
 h+=i%4===0?leaf(x,y,sz,Math.floor(r()*360),'#79a750'):ellipse(x,y,sz*1.4,sz*.74,choose(r,['#72ab53','#b3c87d','#c14c32','#eaad54','#f5e7b7']), 'transform="rotate('+Math.floor(r()*180)+' '+x+' '+y+')"')}
}else if(mode==='dessert'){
 h+=path('M173 237 L255 127 L345 237Z','#a65e3f','stroke="#f8dbbb" stroke-width="6"')+path('M197 219 L256 141 L319 219Z',pal[1],'stroke="#f3e2c7" stroke-width="7"')+path('M203 205 L256 155 L315 205Z','#f7e5c0','stroke="'+pal[0]+'" stroke-width="5"');
 for(var i=0;i<8;i++){var x=207+r()*103,y=192+r()*37;h+=circ(x,y,3+r()*7,choose(r,['#bc343b','#e1bb69','#fcf1d2','#644637']))}
 h+=leaf(277,180,12,34,'#6c9158');
}
return h;
}
function bowlFood(r,pal){
var h=ellipse(259,282,160,22,'#06100b89')+path('M109 166Q111 282 255 292Q402 285 408 166Z','#c9bb9c','stroke="#d6c1a5" stroke-width="8"')+ellipse(258,167,151,76,'#f6ead2','stroke="#ded0b4" stroke-width="10"')+ellipse(260,167,130,60,pal[0],'stroke="'+pal[2]+'" stroke-width="6"');
for(var i=0;i<16;i++){var a=r()*6.28,rad=Math.sqrt(r())*117,x=260+Math.cos(a)*rad,y=167+Math.sin(a)*rad*.48,sz=5+r()*12;
h+=i%3===0?leaf(x,y,sz,Math.floor(r()*360),'#79a04b'):i%3===1?ellipse(x,y,sz*1.5,sz*.68,pal[1],'transform="rotate('+Math.floor(r()*180)+' '+x+' '+y+')"'):circ(x,y,sz,pal[2],'#e0bd76',2);}
h+=path('M164 82q-16-27 4-53m70 47q18-24 2-51m66 52q-11-22 6-47','none','stroke="#f8ead0" stroke-width="9" opacity=".35" stroke-linecap="round"');
return h;
}
function pastry(r,pal){
var h=ellipse(260,274,158,25,'#060f0999')+ellipse(260,247,162,48,'url(#plate)','stroke="#f7e6c8" stroke-width="6"')+ellipse(260,243,136,34,'#b99e79');
var count=3+Math.floor(r()*3);
for(var i=0;i<count;i++){
var x=169+i*(175/(count-1))+r()*9-5,y=214+r()*29,scale=.78+r()*.3;
h+='<g transform="translate('+x+' '+y+') scale('+scale+') rotate('+(r()*22-11)+')">'+path('M-50 17Q-30-42 0-11Q28-42 50 17Q12-4 0 30Q-15-4-50 17Z',pal[1],'stroke="#f0c483" stroke-width="5"')+path('M-30 8Q-18-25 0-8M1-8Q16-24 32 9M-8-4Q0 5 8-2','none','stroke="'+pal[0]+'" stroke-width="6" stroke-linecap="round"')+'</g>';
}
return h;
}
function drinks(r,pal,rec){
var n=norm(rec.name),wine=/вино|шампан|просек|вермут|сидр|перри/.test(n),beer=/пиво|лагер|эля|стаут|квас/.test(n),coffee=/кофе|чай|матча|какао|шоколад/.test(n),cocktail=/джин|мохито|коктейл|тоник|дайкири|маргарит|шприц|лимонад/.test(n);
var glass=wine?'wine':beer?'beer':coffee?'cup':cocktail?'high':'short';
var h=ellipse(258,282,155,21,'#0508068c');
if(glass==='wine'){
 h+=path('M204 99Q198 177 260 195Q324 172 315 99Z','url(#glass)','stroke="#dfe8de" stroke-width="7"')+path('M211 134Q226 191 258 184Q302 173 307 134Z',pal[0],'opacity=".85"')+path('M260 197V266M222 268H302','none','stroke="#e8eee6" stroke-width="8" stroke-linecap="round"');
}else if(glass==='beer'){
 h+=path('M205 96H318L308 264H216Z','url(#glass)','stroke="#e6e7d6" stroke-width="7"')+path('M212 141H311L302 255H226Z',pal[1],'opacity=".83"')+path('M315 136q65-3 52 47q-3 27-59 18','none','stroke="#d2d3c3" stroke-width="12"')+ellipse(260,130,56,20,'#f8e8c5');
}else if(glass==='cup'){
 h+=path('M176 135h168l-13 105q-67 55-140 0Z','#e8e0ca','stroke="#fff4db" stroke-width="7"')+ellipse(260,138,84,23,pal[0])+path('M340 160q63-11 54 35q-9 29-61 20','none','stroke="#f3e3cf" stroke-width="13"')+path('M220 105q-19-21-2-49m47 51q20-29 6-51m37 50q-13-26 5-53','none','stroke="#e7dbbc" stroke-width="8" opacity=".6" stroke-linecap="round"');
}else{
 h+=path(glass==='high'?'M204 86H320L302 270H223Z':'M177 145H343L318 260H203Z','url(#glass)','stroke="#e8ede0" stroke-width="7"')+path(glass==='high'?'M211 125H315L295 260H231Z':'M184 173H335L310 250H212Z',pal[1],'opacity=".86"')+ellipse(glass==='high'?263:258,glass==='high'?125:171,glass==='high'?52:74,13,'#f1e8cb70');
 for(var i=0;i<7;i++){var x=223+r()*65,y=159+r()*73;h+='<rect x="'+x+'" y="'+y+'" width="'+(14+r()*10)+'" height="'+(12+r()*9)+'" rx="3" transform="rotate('+(r()*90-45)+' '+x+' '+y+')" fill="#edf8f1" opacity=".55"/>';}
 h+=ellipse(302,107,33,23,'#d2d969','stroke="#edeabe" stroke-width="7"')+circ(302,107,10,'#e6be62')+leaf(252,121,23,63,'#5d9e57');
}
h+=circ(158,251,7,pal[2])+ellipse(344,271,18,8,'#c6a168');
return h;
}
function jars(r,pal){
var h=ellipse(256,292,143,21,'#05090799')+path('M171 113H343L333 277Q261 302 180 277Z','#a9c3bb6a','stroke="#e6ead8" stroke-width="9"')+path('M178 148H335L328 270Q262 289 188 272Z',pal[1],'opacity=".8"')+path('M160 97Q257 83 350 97L346 129H164Z','url(#gold)','stroke="#cbb78d" stroke-width="8"')+ellipse(256,97,92,14,'#e6c38e');
for(var i=0;i<11;i++){var x=199+r()*119,y=159+r()*102,sz=10+r()*14;h+=i%3===0?leaf(x,y,sz,Math.floor(r()*360),'#5d8943'):ellipse(x,y,sz,sz*.7,choose(r,pal),'transform="rotate('+Math.floor(r()*180)+' '+x+' '+y+')" stroke="#e4ce8b" stroke-width="2"');}
h+=ellipse(266,214,43,35,'#e7e1c13a','stroke="#faf2cc" stroke-width="3"')+path('M249 217L260 227L284 197','none','stroke="#fff8d6" stroke-width="5" stroke-linecap="round"');
return h;
}
function cover(rec){
var name=rec.name||'Блюдо',kind=foodCategory(rec),seed=hash(name+'|'+(rec.series_number||'')+'|'+rec.ingredients.slice(0,2).join(','));
var r=rng(seed),p=palette(rec,kind,seed);
var body=backdrop(seed,r),common='<circle cx="438" cy="65" r="107" fill="'+p[1]+'" opacity=".085"/><circle cx="85" cy="286" r="120" fill="'+p[1]+'" opacity=".065"/>';
body+=common;
if(kind==='drink')body+=drinks(r,p,rec);
else if(kind==='jar')body+=jars(r,p);
else if(kind==='soup')body+=bowlFood(r,p);
else if(kind==='baking')body+=pastry(r,p);
else body+=plateFood(r,p,kind);
body+='<path d="M23 26h65M23 26v27M497 294h-65M497 294v-27" stroke="#d7b780" stroke-width="2" opacity=".6" fill="none"/>';
body+='<text x="26" y="300" font-size="13" fill="#f0c991" font-family="Georgia,serif" opacity=".88">✦ ВКУСФЕРА</text>';
var svg='<svg xmlns="http://www.w3.org/2000/svg" width="520" height="320" viewBox="0 0 520 320" role="img" aria-label="Иллюстрация: '+esc(name)+'">'+body+'</svg>';
return 'data:image/svg+xml;charset=UTF-8,'+encodeURIComponent(svg);
}
window.VkusferaArt=function(recipe){if(!recipe)return '';var k=(recipe.series_number||'')+'|'+(recipe.name||'');if(cache[k])return cache[k];var uri=cover(recipe);cache[k]=uri;cacheKeys.push(k);if(cacheKeys.length>72){var old=cacheKeys.shift();delete cache[old]}return uri};
window.VkusferaArtLabel='Индивидуальная иллюстрация рецепта';
})();