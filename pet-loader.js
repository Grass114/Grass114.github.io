// ============================================================
//  pet-loader.js - 统一的宠物加载器
//  自动读取 localStorage 配置，控制猫和狗的显示
// ============================================================

(function() {
    'use strict';

    // 防止重复加载
    if (window.__petLoaderLoaded) return;
    window.__petLoaderLoaded = true;

    // ---------- 读取配置 ----------
    function getPetSettings() {
        const defaults = { cat: true, dog: true };
        try {
            const saved = localStorage.getItem('petSettings');
            if (saved) {
                const parsed = JSON.parse(saved);
                return {
                    cat: parsed.cat !== undefined ? parsed.cat : defaults.cat,
                    dog: parsed.dog !== undefined ? parsed.dog : defaults.dog
                };
            }
        } catch (e) {}
        return defaults;
    }

    // ---------- 加载/更新宠物 iframe ----------
    let iframe = null;

    function loadPet() {
        const settings = getPetSettings();

        // 如果猫和狗都隐藏，移除 iframe
        if (!settings.cat && !settings.dog) {
            if (iframe) {
                iframe.remove();
                iframe = null;
            }
            return;
        }

        // 构建 URL 参数
        const params = new URLSearchParams();
        params.set('cat', settings.cat ? 'true' : 'false');
        params.set('dog', settings.dog ? 'true' : 'false');
        const src = 'pet.html?' + params.toString();

        // 如果 iframe 已存在，更新 src
        if (iframe) {
            iframe.src = src;
            return;
        }

        // 创建新的 iframe
        iframe = document.createElement('iframe');
        iframe.src = src;
        iframe.style.cssText =
            'position:fixed;top:0;left:0;width:100%;height:100%;border:none;z-index:9999;pointer-events:none;background:transparent;';
        iframe.scrolling = 'no';
        document.body.appendChild(iframe);
    }

    // ---------- 监听配置变化（跨标签页同步） ----------
    window.addEventListener('storage', function(e) {
        if (e.key === 'petSettings') {
            loadPet();
        }
    });

    // ---------- 监听设置页面发来的消息（同标签页内同步） ----------
    window.addEventListener('message', function(e) {
        if (e.data && e.data.type === 'petSettingsChanged') {
            loadPet();
        }
    });

    // ---------- 页面可见性变化时重新检查（用户从设置页切回来） ----------
    document.addEventListener('visibilitychange', function() {
        if (!document.hidden) {
            loadPet();
        }
    });

    // ---------- 初始化加载 ----------
    // 等待 DOM 就绪
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', loadPet);
    } else {
        loadPet();
    }

    console.log('🐱🐶 宠物加载器已启动，猫和狗可由设置页控制');
})();