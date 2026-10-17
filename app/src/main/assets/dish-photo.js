/* Personal dish photos: per-recipe JPEG in Android private files; browser localStorage fallback. */
(function(){
'use strict';
var cache={}, order=[];
function key(id){var k=String(id);return /^-?[0-9]{1,18}$/.test(k)?k:null}
function remember(k,value){cache[k]=value;var i=order.indexOf(k);if(i>=0)order.splice(i,1);order.push(k);if(order.length>36){var old=order.shift();delete cache[old]}}
function bridge(){try{return window.RezeptWorldNative&&typeof window.RezeptWorldNative.getDishPhoto==='function'?window.RezeptWorldNative:null}catch(e){return null}}
function get(id){
 var k=key(id);if(!k)return '';
 if(Object.prototype.hasOwnProperty.call(cache,k))return cache[k];
 var data='';
 try{
  var a=bridge();
  if(a&&a.hasDishPhoto(k))data=a.getDishPhoto(k)||'';
  else if(!a)data=localStorage.getItem('vkusfera_dish_photo_'+k)||'';
 }catch(e){data=''}
 if(!/^data:image\/jpeg;base64,/.test(data)||data.length>680000)data='';
 remember(k,data);return data;
}
function save(id,data){
 var k=key(id);if(!k||typeof data!=='string'||!/^data:image\/jpeg;base64,/.test(data)||data.length>680000)return false;
 try{
  var a=bridge();
  if(a){if(!a.saveDishPhoto(k,data))return false}
  else localStorage.setItem('vkusfera_dish_photo_'+k,data);
  remember(k,data);return true;
 }catch(e){return false}
}
function remove(id){
 var k=key(id);if(!k)return false;
 try{
  var a=bridge();if(a){if(!a.deleteDishPhoto(k))return false}
  else localStorage.removeItem('vkusfera_dish_photo_'+k);
  remember(k,'');return true;
 }catch(e){return false}
}
window.VkusferaDishPhotos={get:get,save:save,remove:remove,clearCache:function(){cache={};order=[]}};
})();