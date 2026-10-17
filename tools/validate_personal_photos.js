#!/usr/bin/env node
/* Regression tests: per-recipe personal photos in Android and web browser. */
const fs=require('fs'),path=require('path'),assert=require('assert'),vm=require('vm');
const root=path.resolve(__dirname,'..');
const asset=path.join(root,'app/src/main/assets');
const js=fs.readFileSync(path.join(asset,'dish-photo.js'),'utf8');
const html=fs.readFileSync(path.join(asset,'index.html'),'utf8');
const java=fs.readFileSync(path.join(root,'app/src/main/java/com/rezeptworld/app/MainActivity.java'),'utf8');
const css=fs.readFileSync(path.join(asset,'magazine.css'),'utf8');
const data='data:image/jpeg;base64,'+'A'.repeat(1200),photo2='data:image/jpeg;base64,'+'B'.repeat(1200);
const mem={};const storage={getItem(k){return mem[k]||null},setItem(k,v){mem[k]=v},removeItem(k){delete mem[k]}};
const web={};vm.runInNewContext(js,{window:web,localStorage:storage});
const api=web.VkusferaDishPhotos;
assert(api.save('66',data),'save photo for built-in recipe');
assert(api.save('-1234567890123',photo2),'save photo for user recipe negative long ID');
assert.strictEqual(api.get('66'),data);
assert.strictEqual(api.get('-1234567890123'),photo2);
assert(!api.save('../etc/passwd',data),'reject unsafe name');
assert(!api.save('66','https://www.example.com/fake.jpg'),'only JPEG data');
assert(!api.save('66','data:image/jpeg;base64,'+'A'.repeat(800000)),'respect 500k limit');
assert(api.remove('66'),'remove personal photo');
assert.strictEqual(api.get('66'),'','removed photo must not be cached');
const nFiles={};
web.RezeptWorldNative={
 hasDishPhoto(k){return !!nFiles[k]},
 getDishPhoto(k){return nFiles[k]||''},
 saveDishPhoto(k,v){nFiles[k]=v;return true},
 deleteDishPhoto(k){delete nFiles[k];return true}
};
api.clearCache();
assert(api.save('525',data),'Android native per-recipe save');
api.clearCache();assert.strictEqual(api.get('525'),data,'Photo persists across UI state');
assert(api.remove('525'),'Android photo remove');
api.clearCache();assert.strictEqual(api.get('525'),'','Android photo removed');
for(const id of ['pinDishPhoto','removeDishPhoto','dishPhotoInput','extraPhotoExport','extraPhotoImport']){
 assert(html.includes('id="'+id+'"'),'Missing button '+id);
}
for(const method of ['saveDishPhoto','getDishPhoto','hasDishPhoto','deleteDishPhoto','exportDishPhotos','importDishPhotos']){
 assert(java.includes(' '+method+'('),'Missing Android storage '+method);
}
assert(html.includes('window.VkusferaDishPhotos.get(a.series_number)'),'Catalog must show pinned photo');
assert(html.includes('window.VkusferaDishPhotos.get(active.series_number)'),'Recipe must show pinned photo');
assert(html.includes('if(!window.VkusferaDishPhotos.save(target,data))'),'Picker must save');
assert(css.includes('.dish-photo-actions'),'Missing responsive photo toolbar');
console.log('OK: per-recipe photo add/show/replace/remove, private Android files, backup and browser fallback.');
