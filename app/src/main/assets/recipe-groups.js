/* Vkusfera: stable, inclusive group taxonomy. No recipe data is removed. */
(function(){
'use strict';
function n(s){return String(s||'').toLowerCase().replace(/ё/g,'е').replace(/\s+/g,' ').trim()}
function rx(pattern,s){return pattern.test(s)}
function primary(r){
  var c=n(r.category), title=n(r.name), full=c+' '+title;
  // Specific types before generic. "Безалкогольные" must NEVER equal "алкоголь".
  if(rx(/коктейл/,c))return 'cocktail';
  if(rx(/самогоноварение|дистиллят|дистилляц|сётю|шочу|аквавит/,c))return 'distill';
  if(rx(/виски|бурбон/,c))return 'whisky';
  if(rx(/джин/,c))return 'gin';
  if(rx(/ром(?!ашк)/,c))return 'rum';
  if(rx(/бренди|кальвадос/,c))return 'brandy';
  if(rx(/ликер|настойк|наливк/,c))return 'liqueur';
  if(rx(/вино|винодел|сидр|перри|медовух|пивовар|пиво|^мид$/,c))return 'wine';
  if(rx(/безалкогольн|горячие напитки|холодные напитки|напитки|кофе|чай|сиропы|газированные|кукурузные напитки|травяные напитки/,c))return 'drinks';
  if(rx(/заготов|марин|варень|повидло|джем|квашен|ферментац|консерв|цукат|овощные закуски/,c))return 'preserve';
  if(rx(/суп|борщ|похлеб|бульон/,c))return 'soup';
  if(rx(/соус|приправа|специ/,c))return 'sauce';
  if(rx(/салат|закуск|сэндвич/,c))return 'salad';
  if(rx(/выпеч|хлеб|булоч|сдоб|пирог|киш|кекс|маффин|печень|торты|пирожные|слоен|несладкая выпечка|тесто|лепеш/,c))return 'baking';
  if(rx(/десерт|морожен|пудинг/,c))return 'dessert';
  if(rx(/основн|мяс|птиц|рыб|морепродукт|рис|паста|лапша|овощ|карри|гарнир|бобов|круп|завтрак|капуст|кукуруз/,c))return 'main';
  // Real uncategorized titles still appear under main or "other"; never vanish.
  return 'other';
}
function alcoholic(r){
 var c=n(r.category),k=primary(r);
 return ['distill','whisky','gin','rum','brandy','liqueur','cocktail','wine'].indexOf(k)>=0
   || (rx(/алкогол/,c)&&!rx(/безалкогол/,c));
}
function matches(r,group){
 var c=n(r.category),t=n(r.name),s=c+' '+t,k=primary(r);
 if(group==='all'||group==='countries')return true;
 if(group==='alcohol')return alcoholic(r);
 if(group==='wine'||group==='viniculture')return k==='wine'||rx(/винодел|сидр|перри|пивовар|пиво|медовух/,c);
 if(group==='cocktail')return k==='cocktail'||rx(/коктейл/,c);
 if(group==='whisky')return k==='whisky'||(alcoholic(r)&&rx(/виски|бурбон/,s));
 if(group==='gin')return k==='gin'||(alcoholic(r)&&rx(/джин/,s));
 if(group==='rum')return k==='rum'||(alcoholic(r)&&rx(/ром(?!ашк)/,s));
 if(group==='brandy')return k==='brandy'||(alcoholic(r)&&rx(/бренди|кальвадос|коньяк/,s));
 if(group==='liqueur')return k==='liqueur'||(alcoholic(r)&&rx(/ликер|настойк|наливк/,c));
 if(group==='distill')return k==='distill';
 if(group==='baking')return k==='baking'||rx(/круассан|пирог|булоч|пицц|хлеб|хачапури|тарт|эклер|кекс|печенье|блин|олад|лепеш|маффин|чизкейк/,t);
 if(group==='dessert')return k==='dessert'||rx(/торты|пирожные|печенье|кексы|маффины/,c)||rx(/торт|тирамису|чизкейк|фондан|пудинг|морожен|крем|пирожн|эклер|кекс|печенье|мусс|конфет|мармелад|чак-чак|пахлава|панна-котта/,t);
 if(group==='drinks')return k==='drinks'||(rx(/коктейл/,c)&&rx(/безалкогол/,s));
 if(group==='preserve')return k==='preserve';
 if(group==='jam')return k==='preserve'&&rx(/варен|джем|повидло|конфитюр|цукат|мармелад|фруктов/,s);
 if(group==='soup')return k==='soup'||rx(/суп|борщ|похлеб|бульон|рамен|гаспачо|харчо|минестроне|окрошк|ухa/,t);
 if(group==='salad')return k==='salad'||rx(/салат|винегрет|табуле|пхали/,t);
 if(group==='sauce')return k==='sauce'||rx(/соус|песто|майонез|аджик|чатни|сальс/,t);
 if(group==='meat')return !alcoholic(r)&&rx(/говядин|свин|барани|курин|куриц|индейк|утк|котлет|стейк|мяс|птиц|фарш|бекон|шашлык|ягнен|теляти|крылышк|окороч|ребрыш/,s);
 if(group==='fish')return !alcoholic(r)&&rx(/рыб|морепродукт|кревет|мидии|осьминог|кальмар|лосос|тунец|треск|семг|сёмг|форел|судак|краб|анчоус|дорадо|палтус|хек/,s);
 if(group==='side')return k==='main'&&rx(/гарнир|рис|картоф|круп|пюре|овощ|паста|лапша|бобов|фасол|чечевиц/,s);
 if(group==='main')return k==='main'||matches(r,'meat')||matches(r,'fish')||matches(r,'side');
 if(group==='other')return k==='other';
 return k===group;
}
function mainCountry(s){return String(s||'').split(/\s+[—–/]\s+/)[0].trim()}
function countryMatches(r,selected){return !selected||r.country===selected||mainCountry(r.country)===selected}
window.VkusferaGroups={primary:primary,matches:matches,mainCountry:mainCountry,countryMatches:countryMatches};
})();
