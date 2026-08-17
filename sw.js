// ============================================================
//  Service Worker - 离线模式主动缓存
//  开启后主动缓存所有页面，无需用户逐个访问
//  缓存名称: bluecat-cache-v1
//  需要缓存: 所有HTML页面 + 资源文件
// ============================================================

const CACHE_NAME = 'bluecat-cache-v1';

// ===== 需要主动缓存的所有页面 =====
const ALL_PAGES = [
    '/',
    '/index.html',
    '/about.html',
    '/project.html',
    '/game.html',
    '/thankyou.html',
    '/mcskin3d.html',
    '/brick.html',
    '/minesweeper.html',
    '/settings.html',
    '/search.html',
    '/verify.html',
    '/pet.html',
    '/404.html',
];

// ===== 需要主动缓存的资源 =====
const ASSETS = [
    '/favicon.png',
    '/mcskin3d.ico',
    '/huise25.jpg',
    '/pet-loader.js',
];

// ===== 所有需要缓存的资源 =====
const PRECACHE_URLS = [...ALL_PAGES, ...ASSETS];

// 记录已缓存的 URL
let cachedUrls = [];

// ============================================================
//  install 事件 - 主动预缓存所有资源
// ============================================================
self.addEventListener('install', function(event) {
    console.log('[SW] 📦 开始主动缓存所有页面...');
    console.log('[SW] 📄 需要缓存的页面:', ALL_PAGES.length, '个');
    console.log('[SW] 📦 需要缓存的资源:', ASSETS.length, '个');
    console.log('[SW] 📋 总计:', PRECACHE_URLS.length, '个文件');

    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(function(cache) {
                // 逐个添加，确保即使某个失败也不影响整体
                const promises = PRECACHE_URLS.map(function(url) {
                    return cache.add(url)
                        .then(function() {
                            console.log('[SW] ✅ 缓存成功:', url);
                            cachedUrls.push(url);
                            // 发送进度消息给页面
                            self.clients.matchAll().then(function(clients) {
                                clients.forEach(function(client) {
                                    client.postMessage({
                                        type: 'cacheProgress',
                                        current: cachedUrls.length,
                                        total: PRECACHE_URLS.length,
                                        url: url
                                    });
                                });
                            });
                        })
                        .catch(function(err) {
                            console.warn('[SW] ⚠️ 缓存失败:', url, err);
                        });
                });

                return Promise.allSettled(promises)
                    .then(function(results) {
                        const successCount = results.filter(r => r.status === 'fulfilled').length;
                        console.log('[SW] ✅ 预缓存完成，成功:', successCount, '/', PRECACHE_URLS.length);
                        return cache;
                    });
            })
            .then(function() {
                // 强制激活，控制所有页面
                return self.skipWaiting();
            })
    );
});

// ============================================================
//  activate 事件 - 清理旧缓存
// ============================================================
self.addEventListener('activate', function(event) {
    event.waitUntil(
        caches.keys().then(function(cacheNames) {
            return Promise.all(
                cacheNames.map(function(cacheName) {
                    if (cacheName !== CACHE_NAME) {
                        console.log('[SW] 🗑️ 删除旧缓存:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        }).then(function() {
            // 立即控制所有页面
            return self.clients.claim();
        })
    );
});

// ============================================================
//  fetch 事件 - 拦截请求，从缓存返回
// ============================================================
self.addEventListener('fetch', function(event) {
    const request = event.request;
    const url = new URL(request.url);

    // 只处理同源请求（不处理跨域）
    if (url.origin !== self.location.origin) {
        return;
    }

    // 对于 HTML 页面请求：优先从缓存返回
    if (request.mode === 'navigate') {
        event.respondWith(
            caches.match(request)
                .then(function(response) {
                    if (response) {
                        console.log('[SW] 📄 从缓存返回:', url.pathname);
                        return response;
                    }
                    // 缓存中没有，尝试网络
                    console.log('[SW] 🌐 网络请求:', url.pathname);
                    return fetch(request).catch(function() {
                        // 网络失败，返回首页
                        console.log('[SW] 📡 离线状态，返回首页');
                        return caches.match('/index.html');
                    });
                })
        );
        return;
    }

    // 对于静态资源：优先从缓存返回
    event.respondWith(
        caches.match(request)
            .then(function(response) {
                if (response) {
                    return response;
                }
                // 缓存中没有，尝试网络并缓存
                return fetch(request).then(function(networkResponse) {
                    if (networkResponse && networkResponse.status === 200) {
                        const responseClone = networkResponse.clone();
                        caches.open(CACHE_NAME).then(function(cache) {
                            cache.put(request, responseClone);
                        });
                    }
                    return networkResponse;
                }).catch(function() {
                    // 网络失败，返回一个简单的响应
                    return new Response('资源加载失败，请检查网络连接', {
                        status: 503,
                        statusText: 'Service Unavailable'
                    });
                });
            })
    );
});

// ============================================================
//  message 事件 - 接收来自页面的命令
// ============================================================
self.addEventListener('message', function(event) {
    const data = event.data;

    // 获取缓存状态
    if (data && data.type === 'getCacheStatus') {
        event.waitUntil(
            caches.open(CACHE_NAME).then(function(cache) {
                return cache.keys();
            }).then(function(keys) {
                const count = keys.length;
                let totalSize = 0;
                return Promise.all(
                    keys.map(function(request) {
                        return cache.match(request).then(function(response) {
                            if (response) {
                                return response.clone().blob().then(function(blob) {
                                    totalSize += blob.size;
                                });
                            }
                        });
                    })
                ).then(function() {
                    if (event.ports && event.ports.length) {
                        event.ports[0].postMessage({
                            count: count,
                            size: totalSize
                        });
                    }
                });
            })
        );
        return;
    }

    // 清理缓存
    if (data && data.type === 'clearCache') {
        event.waitUntil(
            caches.delete(CACHE_NAME).then(function() {
                console.log('[SW] 🗑️ 缓存已清理');
                // 重新预缓存
                return caches.open(CACHE_NAME).then(function(cache) {
                    const promises = PRECACHE_URLS.map(function(url) {
                        return cache.add(url).catch(function(err) {
                            console.warn('[SW] ⚠️ 重新缓存失败:', url, err);
                        });
                    });
                    return Promise.allSettled(promises);
                });
            })
        );
        return;
    }

    // 主动缓存所有页面（手动触发）
    if (data && data.type === 'precacheAll') {
        event.waitUntil(
            caches.open(CACHE_NAME).then(function(cache) {
                const promises = PRECACHE_URLS.map(function(url) {
                    return cache.add(url)
                        .then(function() {
                            console.log('[SW] ✅ 手动缓存成功:', url);
                            // 通知页面进度
                            self.clients.matchAll().then(function(clients) {
                                clients.forEach(function(client) {
                                    client.postMessage({
                                        type: 'cacheProgress',
                                        current: cachedUrls.length + 1,
                                        total: PRECACHE_URLS.length,
                                        url: url
                                    });
                                });
                            });
                        })
                        .catch(function(err) {
                            console.warn('[SW] ⚠️ 手动缓存失败:', url, err);
                        });
                });
                return Promise.allSettled(promises);
            })
        );
        return;
    }
});

console.log('[SW] 🚀 Service Worker 已加载');