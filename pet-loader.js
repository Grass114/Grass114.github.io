// ============================================================
//  离线模式（无网模式）
// ============================================================

(function() {
    'use strict';

    // ---------- 检测是否支持 Service Worker ----------
    function isSWSupported() {
        return 'serviceWorker' in navigator;
    }

    // ---------- 注册 Service Worker ----------
    function registerSW() {
        if (!isSWSupported()) return;
        // 只在离线模式开启时注册
        const offlineMode = localStorage.getItem('offlineMode') === 'true';
        if (!offlineMode) return;

        navigator.serviceWorker.register('/sw.js')
            .then(function(registration) {
                console.log('[离线模式] Service Worker 注册成功');
            })
            .catch(function(err) {
                console.warn('[离线模式] Service Worker 注册失败:', err);
            });
    }

    // ---------- 创建离线横幅 ----------
    function createOfflineBanner() {
        // 检查是否已存在
        if (document.querySelector('.offline-banner')) return;

        const banner = document.createElement('div');
        banner.className = 'offline-banner';
        banner.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            z-index: 99999;
            background: #f59e0b;
            color: #1a1a2e;
            padding: 8px 16px;
            text-align: center;
            font-size: 14px;
            font-weight: 500;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            display: none;
            box-shadow: 0 2px 12px rgba(245, 158, 11, 0.3);
            letter-spacing: 0.3px;
            pointer-events: none;
        `;
        banner.id = 'offlineBanner';
        banner.innerHTML = '📡 离线模式 · 当前显示缓存内容';

        // 暗色模式适配
        if (document.documentElement.getAttribute('data-theme') === 'dark') {
            banner.style.background = '#b45309';
            banner.style.color = '#fef3c7';
        }

        document.body.appendChild(banner);
        return banner;
    }

    // ---------- 更新横幅状态 ----------
    function updateOfflineBanner() {
        const banner = document.getElementById('offlineBanner');
        if (!banner) return;

        const offlineMode = localStorage.getItem('offlineMode') === 'true';

        // 如果离线模式未开启，隐藏横幅
        if (!offlineMode) {
            banner.style.display = 'none';
            return;
        }

        // 检测网络状态
        const isOffline = !navigator.onLine;

        // 检测是否从缓存加载（通过 Service Worker 的响应头判断，这里简化：断网时显示）
        if (isOffline) {
            banner.style.display = 'block';
        } else {
            // 联网时隐藏横幅
            banner.style.display = 'none';
        }
    }

    // ---------- 监听网络变化 ----------
    function initOfflineMode() {
        // 创建横幅
        const banner = createOfflineBanner();

        // 注册 Service Worker
        registerSW();

        // 初始更新
        setTimeout(updateOfflineBanner, 500);

        // 监听网络变化
        window.addEventListener('online', function() {
            updateOfflineBanner();
        });

        window.addEventListener('offline', function() {
            updateOfflineBanner();
        });

        // 监听 localStorage 变化（跨标签页同步离线模式状态）
        window.addEventListener('storage', function(e) {
            if (e.key === 'offlineMode') {
                updateOfflineBanner();
                if (e.newValue === 'true') {
                    registerSW();
                }
            }
        });

        // 监听来自设置页的消息
        window.addEventListener('message', function(e) {
            if (e.data && e.data.type === 'offlineModeChanged') {
                updateOfflineBanner();
            }
        });

        // 页面可见性变化时重新检查
        document.addEventListener('visibilitychange', function() {
            if (!document.hidden) {
                setTimeout(updateOfflineBanner, 200);
            }
        });

        // 主题变化时更新横幅颜色
        const observer = new MutationObserver(function() {
            const banner = document.getElementById('offlineBanner');
            if (!banner) return;
            const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
            if (isDark) {
                banner.style.background = '#b45309';
                banner.style.color = '#fef3c7';
            } else {
                banner.style.background = '#f59e0b';
                banner.style.color = '#1a1a2e';
            }
        });
        observer.observe(document.documentElement, {
            attributes: true,
            attributeFilter: ['data-theme']
        });

        console.log('📶 离线模式已初始化');
    }

    // ---------- 启动离线模式 ----------
    // 等待 DOM 加载完成
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initOfflineMode);
    } else {
        initOfflineMode();
    }

})();