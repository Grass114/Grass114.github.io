// ============================================================
//  Service Worker - 离线模式缓存
//  缓存所有页面和资源，断网时从缓存加载
// ============================================================

const CACHE_NAME = 'bluecat-cache-v1';

// 需要缓存的页面列表
const PAGES = [
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
];

// 需要缓存的资源
const ASSETS = [
    '/favicon.png',
    '/mcskin3d.ico',
    '/huise25.jpg',
    '/pet-loader.js',
];

// 所有需要缓存的资源
const CACHE_URLS = [...PAGES, ...ASSETS];

// ============================================================
//  install 事件 - 缓存资源
// ============================================================
self.addEventListener('install', function(event) {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(function(cache) {
                console.log('[SW] 开始缓存资源...');
                // 逐个添加，失败的不影响整体
                return Promise.allSettled(
                    CACHE_URLS.map(function(url) {
                        return cache.add(url).catch(function(err) {
                            console.warn('[SW] 缓存失败:', url, err);
                        });
                    })
                ).then(function() {
                    console.log('[SW] 缓存完成');
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
                        console.log('[SW] 删除旧缓存:', cacheName);
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
                        return response;
                    }
                    // 缓存中没有，尝试网络
                    return fetch(request).catch(function() {
                        // 网络失败，返回离线提示页
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
                    // 只缓存成功的响应
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

    // 清理缓存
    if (data && data.type === 'clearCache') {
        event.waitUntil(
            caches.delete(CACHE_NAME).then(function() {
                console.log('[SW] 缓存已清理');
                // 重新缓存
                return caches.open(CACHE_NAME).then(function(cache) {
                    return Promise.allSettled(
                        CACHE_URLS.map(function(url) {
                            return cache.add(url).catch(function(err) {
                                console.warn('[SW] 重新缓存失败:', url, err);
                            });
                        })
                    );
                });
            })
        );
        return;
    }

    // 获取缓存状态
    if (data && data.type === 'getCacheStatus') {
        event.waitUntil(
            caches.open(CACHE_NAME).then(function(cache) {
                return cache.keys();
            }).then(function(keys) {
                const count = keys.length;
                // 计算缓存大小（估算）
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
                    // 发送响应给页面
                    if (event.ports && event.ports.length) {
                        event.ports[0].postMessage({
                            count: count,
                            size: totalSize
                        });
                    }
                });
            })
        );
    }
});