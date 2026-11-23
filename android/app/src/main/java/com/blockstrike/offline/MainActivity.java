package com.blockstrike.offline;

import android.app.Activity;
import android.content.ActivityNotFoundException;
import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.view.View;
import android.view.Window;
import android.view.WindowManager;
import android.view.WindowInsets;
import android.view.WindowInsetsController;
import android.view.DisplayCutout;
import android.widget.FrameLayout;
import android.webkit.CookieManager;
import android.webkit.ServiceWorkerClient;
import android.webkit.ServiceWorkerController;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Toast;

import java.io.IOException;
import java.io.InputStream;
import java.util.HashMap;
import java.util.Map;

/** Native Android shell. Game logic remains unchanged JavaScript/HTML5. */
public final class MainActivity extends Activity {
    private static final String HOST = "appassets.androidplatform.net";
    private static final String START_URL = "https://" + HOST + "/index.html";
    private static final int FILE_CHOOSER = 101;
    private WebView webView;
    private boolean activityPaused;
    private android.webkit.ValueCallback<Uri[]> pendingFiles;

    @Override public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        getWindow().setFlags(WindowManager.LayoutParams.FLAG_HARDWARE_ACCELERATED,
                             WindowManager.LayoutParams.FLAG_HARDWARE_ACCELERATED);
        if (Build.VERSION.SDK_INT >= 28) {
            WindowManager.LayoutParams layout = getWindow().getAttributes();
            layout.layoutInDisplayCutoutMode =
                    WindowManager.LayoutParams.LAYOUT_IN_DISPLAY_CUTOUT_MODE_SHORT_EDGES;
            getWindow().setAttributes(layout);
        }
        immersive();

        webView = new WebView(this);
        webView.setBackgroundColor(0xff171d12);
        webView.setOverScrollMode(View.OVER_SCROLL_NEVER);
        // Use the Activity hardware-accelerated window; avoid forcing an extra layer buffer.
        WebSettings s = webView.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true); // localStorage and IndexedDB for maps/weapon imports
        s.setAllowFileAccess(false);
        s.setAllowContentAccess(true); // ACTION_OPEN_DOCUMENT file picker
        s.setMediaPlaybackRequiresUserGesture(false);
        s.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        s.setSupportMultipleWindows(false);
        s.setUseWideViewPort(true);
        s.setLoadWithOverviewMode(true);
        s.setCacheMode(WebSettings.LOAD_DEFAULT);
        s.setJavaScriptCanOpenWindowsAutomatically(false);
        s.setUserAgentString(s.getUserAgentString() + " BlockStrikeAndroid/1.1");
        if (Build.VERSION.SDK_INT >= 26) s.setSafeBrowsingEnabled(true);
        CookieManager.getInstance().setAcceptCookie(false);

        final GameAssets assets = new GameAssets();
        webView.setWebViewClient(new WebViewClient() {
            @Override public void onPageFinished(WebView view, String url) {
                super.onPageFinished(view, url);
                notifyLifecycle();
            }
            @Override public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest req) {
                return assets.respond(req.getUrl(), req.getMethod());
            }
            @Override public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest req) {
                Uri uri = req.getUrl();
                if (HOST.equalsIgnoreCase(uri.getHost()) && "https".equalsIgnoreCase(uri.getScheme()))
                    return false;
                if ("http".equalsIgnoreCase(uri.getScheme()) || "https".equalsIgnoreCase(uri.getScheme())) {
                    try { startActivity(new Intent(Intent.ACTION_VIEW, uri)); }
                    catch (ActivityNotFoundException e) { Toast.makeText(MainActivity.this, "Browser tidak tersedia", Toast.LENGTH_SHORT).show(); }
                    return true;
                }
                return true;
            }
        });
        // Should old service workers survive an app upgrade, their fetches still hit bundled assets.
        if (Build.VERSION.SDK_INT >= 24) {
            ServiceWorkerController.getInstance().setServiceWorkerClient(new ServiceWorkerClient() {
                @Override public WebResourceResponse shouldInterceptRequest(WebResourceRequest req) {
                    return assets.respond(req.getUrl(), req.getMethod());
                }
            });
        }
        webView.setWebChromeClient(new WebChromeClient() {
            @Override public boolean onShowFileChooser(WebView view,
                    android.webkit.ValueCallback<Uri[]> callback, FileChooserParams params) {
                if (pendingFiles != null) pendingFiles.onReceiveValue(null);
                pendingFiles = callback;
                try {
                    Intent intent = new Intent(Intent.ACTION_OPEN_DOCUMENT);
                    intent.addCategory(Intent.CATEGORY_OPENABLE);
                    intent.setType("*/*"); // MDL, GLB, ZIP, WAV, PNG, JPG, BSP, WAD, GRAPH
                    intent.putExtra(Intent.EXTRA_ALLOW_MULTIPLE,
                            params.getMode() == FileChooserParams.MODE_OPEN_MULTIPLE);
                    startActivityForResult(intent, FILE_CHOOSER);
                    return true;
                } catch (ActivityNotFoundException e) {
                    pendingFiles = null;
                    callback.onReceiveValue(null);
                    Toast.makeText(MainActivity.this, "Pemilih berkas tidak tersedia", Toast.LENGTH_SHORT).show();
                    return true;
                }
            }
        });
        FrameLayout frame = new FrameLayout(this);
        frame.setBackgroundColor(0xff171d12);
        frame.addView(webView, new FrameLayout.LayoutParams(-1, -1));
        if (Build.VERSION.SDK_INT >= 28) {
            // Landscape cutouts must not cover touch controls. WebView occupies the safe rectangle.
            frame.setOnApplyWindowInsetsListener((view, insets) -> {
                DisplayCutout cutout = insets.getDisplayCutout();
                view.setPadding(cutout == null ? 0 : cutout.getSafeInsetLeft(),
                        cutout == null ? 0 : cutout.getSafeInsetTop(),
                        cutout == null ? 0 : cutout.getSafeInsetRight(),
                        cutout == null ? 0 : cutout.getSafeInsetBottom());
                return insets.consumeDisplayCutout();
            });
        }
        setContentView(frame);
        frame.requestApplyInsets();
        webView.loadUrl(START_URL);
    }

    @Override protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);
        if (requestCode != FILE_CHOOSER || pendingFiles == null) return;
        Uri[] result = null;
        if (resultCode == RESULT_OK && data != null) {
            if (data.getClipData() != null) {
                int size = data.getClipData().getItemCount();
                result = new Uri[size];
                for (int i = 0; i < size; ++i) result[i] = data.getClipData().getItemAt(i).getUri();
            } else if (data.getData() != null) result = new Uri[] { data.getData() };
        }
        pendingFiles.onReceiveValue(result);
        pendingFiles = null;
        immersive();
    }

    private void immersive() {
        Window w = getWindow();
        if (Build.VERSION.SDK_INT >= 30) {
            w.setDecorFitsSystemWindows(false);
            WindowInsetsController controller = w.getInsetsController();
            if (controller != null) {
                controller.setSystemBarsBehavior(WindowInsetsController.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE);
                controller.hide(WindowInsets.Type.systemBars());
                return;
            }
        }
        w.getDecorView().setSystemUiVisibility(
                View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY |
                View.SYSTEM_UI_FLAG_FULLSCREEN |
                View.SYSTEM_UI_FLAG_HIDE_NAVIGATION |
                View.SYSTEM_UI_FLAG_LAYOUT_STABLE |
                View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN |
                View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION);
    }

    @Override public void onWindowFocusChanged(boolean focus) {
        super.onWindowFocusChanged(focus);
        if (focus) immersive();
    }
    private void notifyLifecycle() {
        if (webView == null) return;
        webView.evaluateJavascript("document.dispatchEvent(new CustomEvent('blockstrike:native-lifecycle',{detail:{paused:"
                + activityPaused + "}}))", null);
    }
    @Override protected void onPause() {
        activityPaused = true;
        notifyLifecycle();
        if (webView != null) webView.onPause();
        super.onPause();
    }
    @Override protected void onResume() {
        super.onResume();
        activityPaused = false;
        if (webView != null) webView.onResume();
        notifyLifecycle();
        immersive();
    }
    @Override protected void onDestroy() {
        if (pendingFiles != null) { pendingFiles.onReceiveValue(null); pendingFiles = null; }
        if (webView != null) {
            if (webView.getParent() instanceof android.view.ViewGroup)
                ((android.view.ViewGroup) webView.getParent()).removeView(webView);
            webView.destroy();
            webView = null;
        }
        super.onDestroy();
    }
    @Override public void onBackPressed() {
        if (webView != null && webView.canGoBack()) webView.goBack();
        else super.onBackPressed();
    }

    /** Intercepts a dedicated HTTPS origin, retaining IndexedDB, fetch and WebGL behavior. */
    private final class GameAssets {
        WebResourceResponse respond(Uri uri, String method) {
            if (!"https".equalsIgnoreCase(uri.getScheme()) ||
                    !HOST.equalsIgnoreCase(uri.getHost())) return null;
            if (!"GET".equalsIgnoreCase(method)) return null;
            String path = uri.getPath();
            if (path == null || path.equals("/")) path = "/index.html";
            path = path.startsWith("/") ? path.substring(1) : path;
            // Never serve files outside the explicitly bundled www assets directory.
            if (path.contains("..") || path.indexOf('\\') >= 0 || path.indexOf('\u0000') >= 0)
                return notFound();
            String mime = mimeOf(path);
            try {
                InputStream input = getAssets().open("www/" + path);
                Map<String, String> headers = new HashMap<>();
                headers.put("Cache-Control", "no-store");
                headers.put("X-Content-Type-Options", "nosniff");
                return new WebResourceResponse(mime, isText(mime) ? "UTF-8" : null,
                        200, "OK", headers, input);
            } catch (IOException e) {
                return notFound();
            }
        }
        WebResourceResponse notFound() {
            return new WebResourceResponse("text/plain", "UTF-8", 404, "Not Found",
                    new HashMap<>(), new java.io.ByteArrayInputStream("Not found".getBytes()));
        }
        boolean isText(String mime) {
            return mime.startsWith("text/") || "application/javascript".equals(mime) ||
                    "application/json".equals(mime) || "image/svg+xml".equals(mime);
        }
        String mimeOf(String name) {
            String s = name.toLowerCase(java.util.Locale.ROOT);
            if (s.endsWith(".html")) return "text/html";
            if (s.endsWith(".js")) return "application/javascript";
            if (s.endsWith(".css")) return "text/css";
            if (s.endsWith(".json") || s.endsWith(".webmanifest")) return "application/json";
            if (s.endsWith(".svg")) return "image/svg+xml";
            if (s.endsWith(".png")) return "image/png";
            if (s.endsWith(".jpg") || s.endsWith(".jpeg")) return "image/jpeg";
            if (s.endsWith(".webp")) return "image/webp";
            if (s.endsWith(".gif")) return "image/gif";
            if (s.endsWith(".wav")) return "audio/wav";
            if (s.endsWith(".ogg")) return "audio/ogg";
            if (s.endsWith(".mp3")) return "audio/mpeg";
            if (s.endsWith(".zip")) return "application/zip";
            if (s.endsWith(".woff2")) return "font/woff2";
            if (s.endsWith(".woff")) return "font/woff";
            if (s.endsWith(".txt") || s.endsWith(".md")) return "text/plain";
            return "application/octet-stream";
        }
    }
}
