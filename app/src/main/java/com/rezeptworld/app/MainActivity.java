package com.rezeptworld.app;

import android.app.Activity;
import android.content.ActivityNotFoundException;
import android.content.Intent;
import android.graphics.Color;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.webkit.JavascriptInterface;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Toast;
import android.util.Base64;
import java.io.File;
import java.io.FileOutputStream;
import java.io.FileInputStream;
import java.io.OutputStream;
import java.util.zip.ZipEntry;
import java.util.zip.ZipInputStream;
import java.util.zip.ZipOutputStream;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.BufferedReader;
import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;

public class MainActivity extends Activity {
    private static final int PICK_IMAGE = 401;
    private static final int PICK_BACKUP = 402;
    private static final int EXPORT_DISH_PHOTOS = 403;
    private static final int IMPORT_DISH_PHOTOS = 404;
    private static final int MAX_UPDATE_BYTES = 3 * 1024 * 1024;
    private static final String UPDATES_URL =
        "https://raw.githubusercontent.com/RayZenGreallyzzz/Rezeptwold/main/recipes/updates.json";

    private WebView web;
    private ValueCallback<Uri[]> imageCallback;

    @Override public void onCreate(Bundle state) {
        super.onCreate(state);
        getWindow().setStatusBarColor(Color.rgb(16, 16, 15));
        getWindow().setNavigationBarColor(Color.rgb(16, 16, 15));
        web = new WebView(this);
        setContentView(web);
        WebSettings settings = web.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setDefaultTextEncodingName("UTF-8");
        settings.setAllowFileAccess(true);
        settings.setAllowContentAccess(true);
        settings.setBuiltInZoomControls(false);
        settings.setDisplayZoomControls(false);
        if (Build.VERSION.SDK_INT >= 21) {
            settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        }
        web.addJavascriptInterface(new Bridge(), "RezeptWorldNative");
        web.setWebViewClient(new WebViewClient() {
            private boolean shouldHandle(String url) {
                if (url.startsWith("file:///android_asset/")) return false;
                if (url.startsWith("about:blank")) return false;
                if (url.startsWith("https://") || url.startsWith("http://")) {
                    try { startActivity(new Intent(Intent.ACTION_VIEW, Uri.parse(url))); }
                    catch (Exception ignored) {}
                }
                return true;
            }
            @Override public boolean shouldOverrideUrlLoading(WebView view, String url) {
                return shouldHandle(url);
            }
            @Override public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest req) {
                return shouldHandle(req.getUrl().toString());
            }
        });
        web.setWebChromeClient(new WebChromeClient() {
            @Override public boolean onShowFileChooser(WebView view,
                    ValueCallback<Uri[]> callback, FileChooserParams params) {
                if (imageCallback != null) imageCallback.onReceiveValue(null);
                imageCallback = callback;
                try {
                    Intent intent = new Intent(Intent.ACTION_GET_CONTENT);
                    intent.addCategory(Intent.CATEGORY_OPENABLE);
                    intent.setType("image/*");
                    startActivityForResult(Intent.createChooser(intent, "Фотография рецепта"), PICK_IMAGE);
                    return true;
                } catch (Exception e) {
                    imageCallback = null;
                    return false;
                }
            }
        });
        web.loadUrl("file:///android_asset/index.html");
    }

    private void emit(String method, String argument) {
        runOnUiThread(() -> {
            if (web != null) web.evaluateJavascript("window." + method + "(" + argument + ");", null);
        });
    }

    public final class Bridge {
        private boolean permitted(String key) {
            return "rz_mine_v1".equals(key) || "rz_remote_v1".equals(key) ||
                   "rz_favorites_v1".equals(key) || "rz_online_v1".equals(key);
        }
        @JavascriptInterface public String loadState(String key) {
            if (!permitted(key)) return null;
            return getSharedPreferences("vkusfera_settings", MODE_PRIVATE).getString(key, null);
        }
        @JavascriptInterface public boolean saveState(String key, String value) {
            if (!permitted(key) || value == null || value.length() > 4000000) return false;
            return getSharedPreferences("vkusfera_settings", MODE_PRIVATE)
                   .edit().putString(key, value).commit();
        }
        // One compressed JPEG for each recipe. IDs are numeric strings (personal IDs may exceed int).
        private File dishPhotoFile(String key) {
            if (key == null || !key.matches("-?[0-9]{1,18}")) return null;
            File dir = new File(getFilesDir(), "dish_photos");
            return new File(dir, "r_" + key + ".jpg");
        }

        @JavascriptInterface public boolean hasDishPhoto(String key) {
            File file = dishPhotoFile(key);
            return file != null && file.isFile() && file.length() > 0 && file.length() <= 500000;
        }

        @JavascriptInterface public String getDishPhoto(String key) {
            File file = dishPhotoFile(key);
            if (file == null || !file.isFile() || file.length() == 0 || file.length() > 500000) return "";
            try {
                byte[] data = new byte[(int) file.length()];
                try (FileInputStream in = new FileInputStream(file)) {
                    int pos=0,n;
                    while (pos<data.length && (n=in.read(data,pos,data.length-pos))!=-1) pos+=n;
                    if (pos!=data.length) return "";
                }
                return "data:image/jpeg;base64," + Base64.encodeToString(data, Base64.NO_WRAP);
            } catch (Exception ignored) { return ""; }
        }

        @JavascriptInterface public boolean saveDishPhoto(String key, String dataUri) {
            File file=dishPhotoFile(key);
            if (file == null || dataUri == null || !dataUri.startsWith("data:image/jpeg;base64,")
                || dataUri.length()>680000) return false;
            try {
                byte[] bytes=Base64.decode(dataUri.substring("data:image/jpeg;base64,".length()),Base64.DEFAULT);
                if (bytes.length<800 || bytes.length>500000 || (bytes[0]&255)!=255 || (bytes[1]&255)!=216) return false;
                File dir=file.getParentFile();
                if (!dir.isDirectory() && !dir.mkdirs()) return false;
                File tmp=new File(dir,file.getName()+".tmp");
                try (FileOutputStream out=new FileOutputStream(tmp)) {
                    out.write(bytes);
                    out.flush();
                }
                if (file.exists() && !file.delete()) { tmp.delete(); return false; }
                if (!tmp.renameTo(file)) { tmp.delete(); return false; }
                return true;
            } catch (Exception e) { return false; }
        }

        @JavascriptInterface public boolean deleteDishPhoto(String key) {
            File file=dishPhotoFile(key);
            return file != null && (!file.exists() || file.delete());
        }

        @JavascriptInterface public void exportDishPhotos() {
            runOnUiThread(() -> {
                try {
                    Intent intent=new Intent(Intent.ACTION_CREATE_DOCUMENT);
                    intent.addCategory(Intent.CATEGORY_OPENABLE);
                    intent.setType("application/zip");
                    intent.putExtra(Intent.EXTRA_TITLE, "Vkusfera-my-dish-photos.zip");
                    startActivityForResult(intent, EXPORT_DISH_PHOTOS);
                } catch (Exception e) {
                    Toast.makeText(MainActivity.this, "Не удалось открыть сохранение фото", Toast.LENGTH_LONG).show();
                }
            });
        }

        @JavascriptInterface public void importDishPhotos() {
            runOnUiThread(() -> {
                try {
                    Intent intent=new Intent(Intent.ACTION_OPEN_DOCUMENT);
                    intent.addCategory(Intent.CATEGORY_OPENABLE);
                    intent.setType("application/zip");
                    startActivityForResult(intent, IMPORT_DISH_PHOTOS);
                } catch (Exception e) {
                    Toast.makeText(MainActivity.this, "Не удалось выбрать архив фото", Toast.LENGTH_LONG).show();
                }
            });
        }

        @JavascriptInterface public void searchGoogle(String rawQuery) {
            if (rawQuery == null) return;
            final String query = rawQuery.trim().replaceAll("\\s+", " ");
            if (query.length() < 2 || query.length() > 350) {
                runOnUiThread(() ->
                    Toast.makeText(MainActivity.this, "Введите название блюда (2–350 символов)", Toast.LENGTH_SHORT).show());
                return;
            }
            runOnUiThread(() -> {
                try {
                    Uri googleUri = new Uri.Builder()
                        .scheme("https")
                        .authority("www.google.com")
                        .path("/search")
                        .appendQueryParameter("q", query + " рецепт ингредиенты пошаговое приготовление")
                        .appendQueryParameter("hl", "ru")
                        .build();
                    Intent browser = new Intent(Intent.ACTION_VIEW, googleUri);
                    browser.addCategory(Intent.CATEGORY_BROWSABLE);
                    startActivity(browser);
                } catch (ActivityNotFoundException e) {
                    Toast.makeText(MainActivity.this, "Установите браузер для поиска Google", Toast.LENGTH_LONG).show();
                } catch (Exception e) {
                    Toast.makeText(MainActivity.this, "Не удалось открыть Google", Toast.LENGTH_SHORT).show();
                }
            });
        }

        @JavascriptInterface public void requestUpdates() {
            new Thread(() -> {
                HttpURLConnection conn = null;
                try {
                    conn = (HttpURLConnection) new URL(UPDATES_URL).openConnection();
                    conn.setConnectTimeout(9000);
                    conn.setReadTimeout(12000);
                    conn.setRequestProperty("Accept", "application/json");
                    if (conn.getResponseCode() != 200) throw new Exception("HTTP " + conn.getResponseCode());
                    ByteArrayOutputStream out = new ByteArrayOutputStream();
                    byte[] buffer = new byte[8192];
                    try (InputStream in = conn.getInputStream()) {
                        int n;
                        while ((n = in.read(buffer)) != -1) {
                            if (out.size() + n > MAX_UPDATE_BYTES) throw new Exception("Too many bytes");
                            out.write(buffer, 0, n);
                        }
                    }
                    String raw = out.toString("UTF-8");
                    JSONObject obj = new JSONObject(raw);
                    JSONArray newRecipes = obj.optJSONArray("recipes");
                    if (newRecipes == null) throw new Exception("Missing recipes field");
                    emit("RezeptWorldReceiveUpdates", JSONObject.quote(raw) + ",null");
                } catch (Exception error) {
                    emit("RezeptWorldReceiveUpdates", "null," + JSONObject.quote("Нет соединения или ошибка обновления"));
                } finally { if (conn != null) conn.disconnect(); }
            }).start();
        }

        @JavascriptInterface public void exportBackup(String json) {
            if (json == null || json.length() > 1500000) return;
            runOnUiThread(() -> {
                try {
                    Intent send = new Intent(Intent.ACTION_SEND);
                    send.setType("application/json");
                    send.putExtra(Intent.EXTRA_TEXT, json);
                    startActivity(Intent.createChooser(send, "Сохранить резервную копию RezeptWorld"));
                } catch (Exception e) {
                    Toast.makeText(MainActivity.this, "Не удалось экспортировать", Toast.LENGTH_SHORT).show();
                }
            });
        }

        @JavascriptInterface public void importBackup() {
            runOnUiThread(() -> {
                try {
                    Intent intent = new Intent(Intent.ACTION_GET_CONTENT);
                    intent.setType("*/*");
                    intent.addCategory(Intent.CATEGORY_OPENABLE);
                    startActivityForResult(Intent.createChooser(intent, "Выбрать JSON резервной копии"), PICK_BACKUP);
                } catch (Exception e) {
                    Toast.makeText(MainActivity.this, "Не удалось открыть файл", Toast.LENGTH_SHORT).show();
                }
            });
        }
    }

    @Override protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);
        if (requestCode == PICK_IMAGE) {
            if (imageCallback != null) {
                Uri[] result = resultCode == RESULT_OK && data != null && data.getData() != null
                    ? new Uri[]{data.getData()} : null;
                imageCallback.onReceiveValue(result);
                imageCallback = null;
            }
        } else if (requestCode == EXPORT_DISH_PHOTOS && resultCode == RESULT_OK && data != null && data.getData() != null) {
            final Uri uri=data.getData();
            new Thread(() -> {
                int count=0;
                try (OutputStream raw=getContentResolver().openOutputStream(uri);
                     ZipOutputStream out=new ZipOutputStream(raw)) {
                    File dir=new File(getFilesDir(),"dish_photos");
                    File[] photos=dir.listFiles();
                    if (photos!=null) for (File file:photos) {
                        if (!file.getName().matches("r_-?[0-9]{1,18}\\.jpg") || !file.isFile() || file.length()>500000 || file.length()<800) continue;
                        out.putNextEntry(new ZipEntry(file.getName()));
                        try (FileInputStream in=new FileInputStream(file)) {
                            byte[] buffer=new byte[8192];int len;
                            while ((len=in.read(buffer))!=-1) out.write(buffer,0,len);
                        }
                        out.closeEntry();
                        if (++count>=1000) break;
                    }
                    out.finish();
                    emit("RezeptWorldPhotoBackupStatus", JSONObject.quote("Сохранён архив фото: "+count));
                } catch (Exception e) {
                    emit("RezeptWorldPhotoBackupStatus",JSONObject.quote("Не удалось сохранить архив фотографий"));
                }
            }).start();
        } else if (requestCode == IMPORT_DISH_PHOTOS && resultCode == RESULT_OK && data != null && data.getData() != null) {
            final Uri uri=data.getData();
            new Thread(() -> {
                int count=0;int sum=0;
                try (InputStream raw=getContentResolver().openInputStream(uri);
                     ZipInputStream zip=new ZipInputStream(raw)) {
                    File dir=new File(getFilesDir(),"dish_photos");
                    if (!dir.isDirectory() && !dir.mkdirs()) throw new Exception("Storage");
                    ZipEntry entry;
                    while ((entry=zip.getNextEntry())!=null) {
                        if (entry.isDirectory() || !entry.getName().matches("r_-?[0-9]{1,18}\\.jpg")) throw new Exception("Bad archive entry");
                        ByteArrayOutputStream bytes=new ByteArrayOutputStream();
                        byte[] buffer=new byte[8192];int n;
                        while ((n=zip.read(buffer))!=-1) {
                            if (bytes.size()+n>500000) throw new Exception("Large photo");
                            bytes.write(buffer,0,n);
                        }
                        byte[] picture=bytes.toByteArray();
                        if (picture.length<800 || (picture[0]&255)!=255 || (picture[1]&255)!=216) throw new Exception("Invalid JPEG");
                        File target=new File(dir,entry.getName());
                        try (FileOutputStream output=new FileOutputStream(target)) {output.write(picture);}
                        zip.closeEntry();
                        count++;sum+=picture.length;
                        if (count>1000 || sum>50000000) throw new Exception("Archive too large");
                    }
                    emit("RezeptWorldPhotoBackupStatus",JSONObject.quote("Восстановлено фотографий: "+count));
                } catch (Exception e) {
                    emit("RezeptWorldPhotoBackupStatus",JSONObject.quote("Не удалось восстановить архив фото"));
                }
            }).start();
        } else if (requestCode == PICK_BACKUP && resultCode == RESULT_OK &&
                   data != null && data.getData() != null) {
            final Uri uri = data.getData();
            new Thread(() -> {
                try {
                    ByteArrayOutputStream out = new ByteArrayOutputStream();
                    try (InputStream in = getContentResolver().openInputStream(uri)) {
                        if (in == null) throw new Exception("No file");
                        byte[] buf = new byte[4096];
                        int n;
                        while ((n = in.read(buf)) > 0) {
                            if (out.size() + n > 1500000) throw new Exception("Backup too large");
                            out.write(buf, 0, n);
                        }
                    }
                    emit("RezeptWorldReceiveBackup", JSONObject.quote(out.toString("UTF-8")));
                } catch (Exception e) {
                    emit("RezeptWorldReceiveBackup", "null");
                }
            }).start();
        }
    }

    @Override public void onBackPressed() {
        if (web != null) {
            web.evaluateJavascript(
                "(function(){return !!(window.VkusferaBack&&window.VkusferaBack())})()",
                value -> { if (!"true".equals(value)) MainActivity.super.onBackPressed(); }
            );
        } else super.onBackPressed();
    }

    @Override protected void onDestroy() {
        if (web != null) { web.removeJavascriptInterface("RezeptWorldNative"); web.destroy(); web=null; }
        super.onDestroy();
    }
}
