package com.lzpresence.kikkergrocery

import android.annotation.SuppressLint
import android.app.Activity
import android.content.Intent
import android.os.Bundle
import android.webkit.WebResourceRequest
import android.webkit.WebView
import android.webkit.WebViewClient

/**
 * Kikker Grocery: the shared list web app, full screen. Sync, offline storage and the list itself
 * all live in the web app (Firebase); this wrapper only gives it a home-screen icon.
 * Join links (https://lzpresence.github.io/kikker-grocery/#join=...) open straight in the app.
 */
class MainActivity : Activity() {
    private lateinit var web: WebView

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        web = WebView(this)
        setContentView(web)
        web.settings.javaScriptEnabled = true
        web.settings.domStorageEnabled = true
        web.settings.databaseEnabled = true

        web.webViewClient = object : WebViewClient() {
            override fun shouldOverrideUrlLoading(view: WebView, request: WebResourceRequest): Boolean {
                if (request.url.host == HOST) return false
                try { startActivity(Intent(Intent.ACTION_VIEW, request.url)) } catch (e: Exception) { /* no browser */ }
                return true
            }
        }

        val start = intent?.data?.takeIf { it.host == HOST }?.toString() ?: URL
        if (savedInstanceState != null) web.restoreState(savedInstanceState) else web.loadUrl(start)
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        intent.data?.takeIf { it.host == HOST }?.let { web.loadUrl(it.toString()) }
    }

    override fun onSaveInstanceState(outState: Bundle) {
        super.onSaveInstanceState(outState)
        web.saveState(outState)
    }

    @Deprecated("Still the simplest back handling for a plain Activity")
    override fun onBackPressed() {
        if (web.canGoBack()) web.goBack() else @Suppress("DEPRECATION") super.onBackPressed()
    }

    companion object {
        private const val HOST = "lzpresence.github.io"
        private const val URL = "https://lzpresence.github.io/kikker-grocery/"
    }
}
