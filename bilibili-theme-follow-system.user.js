// ==UserScript==
// @name         B站主题跟随 Chrome 深色模式
// @namespace    https://github.com/Romisthesia/bilibili-theme-follow-system
// @version      13.0.0
// @description  让哔哩哔哩主题跟随 Chrome 配色。尊重B站 cookie 继承机制（不主动干预 cookie）；只检测页面实际显示，不一致时才发送等同"按下主题切换按钮"的原生信号（modifyTheme）；不改不建任何样式表
// @author       Romisthesia
// @match        *://*.bilibili.com/*
// @match        *://bilibili.com/*
// @run-at       document-start
// @grant        none
// @license      MIT
// ==/UserScript==

(function () {
  'use strict';

  // ============ 原理 ============
  // B站各页面之间通过 theme_style cookie 自然继承主题：某页切换成功后，B站自己把 cookie 写好，
  // 后续页面的请求就自带正确 cookie → B站原生渲染正确主题。
  // 所以本脚本绝不主动写 cookie、绝不做心跳，只在"页面实际显示 ≠ Chrome 配色"这个必要时刻，
  // 发送一个与"按下主题切换按钮"等价的信号（调用 B站头像组件的 modifyTheme，由 B站自己完成一切）。
  // 找不到按钮的页面（如新版首页静态头部）才退化为复刻 B站自己的切换动作：主题类 + cookie。

  function chromeDark() {
    try { return !!window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches; } catch (e) { return false; }
  }

  // 页面实际显示是否深色：只信呈现信号（css-map 样式表 / html 主题类），不看 cookie
  function shownDark() {
    var el = document.documentElement;
    if (!el) return false;
    var map = document.getElementById('__css-map__');
    if (map && /dark\.css/.test(map.getAttribute('href') || '')) return true;
    return /night-mode|bili_dark/.test(el.className || '');
  }

  // 信号①：等同按下 B站头像菜单「主题→深色/浅色」按钮 —— modifyTheme 会更新 B站内部状态、
  // 样式表与 cookie（B站自己写，天然参与后续页面的 cookie 继承）
  function pressThemeButton(dark) {
    var sels = ['.header-avatar-wrap', '.header-entry-avatar', '.bili-header', '[class*="right-entry"]'];
    for (var i = 0; i < sels.length; i++) {
      var el;
      try { el = document.querySelector(sels[i]); } catch (e) { continue; }
      if (!el || !el.__vueParentComponent) continue;
      var c = el.__vueParentComponent, n = 0;
      while (c && n < 40) {
        n++;
        try {
          if (c.setupState && typeof c.setupState.modifyTheme === 'function') {
            c.setupState.modifyTheme(dark ? 'dark' : 'light');
            return true;
          }
        } catch (e) {}
        c = c.parent;
      }
    }
    return false;
  }

  // 信号②（退化，无按钮可按时，例如新版首页静态头部）：复刻 B站自己的切换动作 = 主题类 + cookie（+已有 __css-map__）
  function fallbackSignal(dark) {
    var el = document.documentElement;
    if (el) {
      el.classList.toggle('night-mode', dark);
      el.classList.toggle('bili_dark', dark);
    }
    var t = dark ? 'dark' : 'light';
    var base = 'theme_style=' + t + '; path=/; max-age=' + (365 * 24 * 3600);
    try {
      document.cookie = base;
      document.cookie = base + '; domain=.bilibili.com';
    } catch (e) {}
    var map = document.getElementById('__css-map__');
    if (map) {
      var href = '//s1.hdslb.com/bfs/seed/jinkela/short/bili-theme/' + t + '.css';
      if (map.getAttribute('href') !== href) map.setAttribute('href', href);
    }
  }

  // 检测 → 必要才发信号；返回是否已对齐
  function detectAndFix() {
    var dark = chromeDark();
    if (shownDark() === dark) return true;                      // 已对齐：只检测，不动
    if (pressThemeButton(dark)) return true;                    // 发原生信号
    fallbackSignal(dark);                                       // 退化信号
    return shownDark() === chromeDark();                        // 再确认（B站可能尚未应用完）
  }

  // ============ 挂载 ============

  // ① 页面加载后持续检测直到对齐：等 B站完成自身初始化 + 头像组件就绪（最多约 15 秒，对齐即停）
  var tries = 0;
  function poll() {
    if (tries++ >= 9) return;
    var ok = false;
    try { ok = detectAndFix(); } catch (e) {}
    if (!ok) setTimeout(poll, tries < 3 ? 1200 : 3000);
  }
  function start() { setTimeout(poll, 1200); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
  window.addEventListener('load', function () { setTimeout(function () { try { detectAndFix(); } catch (e) {} }, 400); });

  // ② Chrome 配色变化（真正需要切换的时刻）→ 立即检测并发信号
  try {
    var mq = window.matchMedia('(prefers-color-scheme: dark)');
    var onChange = function () { try { detectAndFix(); } catch (e) {} };
    if (mq.addEventListener) mq.addEventListener('change', onChange);
    else if (mq.addListener) mq.addListener(onChange);
  } catch (e) {}

  // ③ 回到前台补一次（防后台标签页漏掉配色变化）
  document.addEventListener('visibilitychange', function () { if (!document.hidden) setTimeout(function () { try { detectAndFix(); } catch (e) {} }, 300); });
  window.addEventListener('focus', function () { setTimeout(function () { try { detectAndFix(); } catch (e) {} }, 300); });
})();
