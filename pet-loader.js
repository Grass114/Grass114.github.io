// ============================================================
//  pet-loader.js - 统一的宠物加载器 + 主题色应用
//  自动读取 localStorage 配置，控制猫和狗的显示
//  同时应用用户自定义的主题色
// ============================================================

(function() {
    'use strict';

    if (window.__petLoaderLoaded) return;
    window.__petLoaderLoaded = true;

    // ---------- 所有页面列表 ----------
    const ALL_PAGES = [
        'index', 'about', 'project', 'game',
        'thankyou', 'mcskin3d', 'brick', 'minesweeper'
    ];

    // ---------- 读取配置 ----------
    function getPetSettings() {
        const defaults = {
            cat: true,
            dog: true,
            catPages: ALL_PAGES,
            dogPages: ALL_PAGES
        };
        try {
            const saved = localStorage.getItem('petSettings');
            if (saved) {
                const parsed = JSON.parse(saved);
                return {
                    cat: parsed.cat !== undefined ? parsed.cat : defaults.cat,
                    dog: parsed.dog !== undefined ? parsed.dog : defaults.dog,
                    catPages: parsed.catPages || defaults.catPages,
                    dogPages: parsed.dogPages || defaults.dogPages
                };
            }
        } catch (e) {
            console.warn('宠物配置读取失败，使用默认值', e);
        }
        return defaults;
    }

    // ---------- 获取当前页面 ----------
    function getCurrentPage() {
        const pathname = window.location.pathname;
        const page = pathname.split('/').pop() || 'index.html';
        return page.replace('.html', '');
    }

    // ---------- 判断是否显示 ----------
    function shouldShowPet(petType, settings) {
        if (petType === 'cat' && !settings.cat) return false;
        if (petType === 'dog' && !settings.dog) return false;

        const currentPage = getCurrentPage();
        if (currentPage === 'settings') return false;

        const pages = petType === 'cat' ? settings.catPages : settings.dogPages;
        if (!pages || pages.length === 0) return false;

        return pages.includes(currentPage);
    }

    // ---------- 主题色工具 ----------
    function hexToRgb(hex) {
        if (hex && hex.startsWith('#')) {
            const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
            return result ? {
                r: parseInt(result[1], 16),
                g: parseInt(result[2], 16),
                b: parseInt(result[3], 16)
            } : { r: 108, g: 99, b: 255 };
        }
        return { r: 108, g: 99, b: 255 };
    }

    function applyThemeColor() {
        const color = localStorage.getItem('themeColor');
        if (color) {
            document.documentElement.style.setProperty('--theme-color', color);
            const rgb = hexToRgb(color);
            document.documentElement.style.setProperty('--theme-color-rgb', `${rgb.r}, ${rgb.g}, ${rgb.b}`);
        }
    }

    // ---------- 加载宠物 ----------
    let iframe = null;
    let currentShown = false;

    function loadPet() {
        const settings = getPetSettings();
        const catShown = shouldShowPet('cat', settings);
        const dogShown = shouldShowPet('dog', settings);
        const shouldShow = catShown || dogShown;

        if (shouldShow === currentShown && iframe) {
            const params = new URLSearchParams();
            params.set('cat', catShown ? 'true' : 'false');
            params.set('dog', dogShown ? 'true' : 'false');
            const newSrc = 'pet.html?' + params.toString();
            if (iframe && iframe.src !== newSrc) {
                iframe.src = newSrc;
            }
            return;
        }

        currentShown = shouldShow;

        if (!shouldShow) {
            if (iframe) {
                iframe.remove();
                iframe = null;
            }
            return;
        }

        const params = new URLSearchParams();
        params.set('cat', catShown ? 'true' : 'false');
        params.set('dog', dogShown ? 'true' : 'false');
        const src = 'pet.html?' + params.toString();

        if (iframe) {
            iframe.src = src;
            return;
        }

        iframe = document.createElement('iframe');
        iframe.src = src;
        iframe.style.cssText =
            'position:fixed;top:0;left:0;width:100%;height:100%;border:none;z-index:9999;pointer-events:auto;background:transparent;';
        iframe.scrolling = 'no';
        document.body.appendChild(iframe);
    }

    // ---------- 监听变化 ----------
    window.addEventListener('storage', function(e) {
        if (e.key === 'petSettings' || e.key === 'petSettings_trigger') {
            setTimeout(loadPet, 50);
        }
        if (e.key === 'themeColor') {
            setTimeout(applyThemeColor, 50);
        }
    });

    window.addEventListener('message', function(e) {
        if (e.data && e.data.type === 'petSettingsChanged') {
            setTimeout(loadPet, 50);
        }
    });

    document.addEventListener('visibilitychange', function() {
        if (!document.hidden) {
            setTimeout(loadPet, 50);
        }
    });

    // ---------- 启动 ----------
    applyThemeColor();

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', loadPet);
    } else {
        setTimeout(loadPet, 100);
    }

    console.log('🎨 主题色已应用');
    console.log('🐱🐶 宠物加载器已启动（按页面勾选显示）');
})();