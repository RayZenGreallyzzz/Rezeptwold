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
    private static final int MAX_UPDATE_BYTES = 3 * 1024 * 1024;
    private static final String UPDATES_URL =
        "https://raw.githubusercontent.com/RayZenGreallyzzz/Rezeptwold/main/recipes/updates.json";

    private WebView web;
    private ValueCallback<Uri[]> imageCallback;

    @Override public void onCreate(Bundle state) {
        super.onCreate(state);
        getWindow().setStatusBarColor(Color.rgb(18, 53, 46));
        getWindow().setNavigationBarColor(Color.rgb(18, 53, 46));
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
                "(function(){let d=document.querySelector('dialog[open]');if(d){d.close();return true;}return false})()",
                value -> { if (!"true".equals(value)) MainActivity.super.onBackPressed(); }
            );
        } else super.onBackPressed();
    }

    @Override protected void onDestroy() {
        if (web != null) { web.removeJavascriptInterface("RezeptWorldNative"); web.destroy(); web=null; }
        super.onDestroy();
    }
}
