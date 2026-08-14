// ==UserScript==
// @name         Roblox
// @namespace    http://tampermonkey.net/
// @version      43.0
// @description  Spoofaloofa with GitHub sync
// @match        https://*.roblox.com/*
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_download
// @grant        GM_xmlhttpRequest
// @downloadURL  https://github.com/Iwqndr/tampermonkey-scripts/raw/refs/heads/main/spoofer.user.js
// @run-at       document-start
// ==/UserScript==

(function() {
    'use strict';

    const GITHUB_TOKEN = 'key';
    const GITHUB_REPO = 'Iwqndr/tampermonkey-scripts';
    const GITHUB_FILE = 'robux_data.json';
    const GITHUB_API = `https://api.github.com/repos/${GITHUB_REPO}/contents/${GITHUB_FILE}`;

    let syncInterval = null;
    let isSyncing = false;
    let isUploading = false;
    let lastKnownData = '';
    let pendingChanges = false;

    let fakeRobux = GM_getValue('savedRobux', 711);
    let currencyPurchases = GM_getValue('currencyPurchases', 0);
    let salesOfGoods = GM_getValue('salesOfGoods', 1248);
    let pendingRobux = GM_getValue('pendingRobux', 400);
    let lastUpdate = 0;
    let panelVisible = false;
    let isDragging = false;
    let dragOffsetX = 0;
    let dragOffsetY = 0;
    let logEntries = [];
    let purchaseObserver = null;

    function getCurrentData() {
        return {
            fakeRobux: fakeRobux,
            currencyPurchases: currencyPurchases,
            salesOfGoods: salesOfGoods,
            pendingRobux: pendingRobux,
            updated: new Date().toISOString()
        };
    }

    function getDataHash(data) {
        return JSON.stringify(data);
    }

    function uploadToGitHub() {
        if (isUploading) return;
        isUploading = true;

        const data = getCurrentData();
        const jsonString = JSON.stringify(data, null, 2);

        if (jsonString === lastKnownData) {
            isUploading = false;
            pendingChanges = false;
            return;
        }

        GM_xmlhttpRequest({
            method: 'GET',
            url: GITHUB_API,
            headers: {
                'Authorization': `token ${GITHUB_TOKEN}`,
                'Accept': 'application/json'
            },
            onload: function(response) {
                let sha = null;
                if (response.status === 200) {
                    try {
                        const existing = JSON.parse(response.responseText);
                        sha = existing.sha;
                    } catch(e) {}
                }

                const payload = {
                    message: `Update robux data - ${new Date().toISOString()}`,
                    content: btoa(unescape(encodeURIComponent(jsonString)))
                };
                if (sha) payload.sha = sha;

                GM_xmlhttpRequest({
                    method: 'PUT',
                    url: GITHUB_API,
                    headers: {
                        'Authorization': `token ${GITHUB_TOKEN}`,
                        'Content-Type': 'application/json'
                    },
                    data: JSON.stringify(payload),
                    onload: function(uploadResponse) {
                        isUploading = false;
                        if (uploadResponse.status === 200 || uploadResponse.status === 201) {
                            lastKnownData = jsonString;
                            pendingChanges = false;
                            silentLog('Data uploaded to GitHub', { status: uploadResponse.status });
                            const btn = document.getElementById('sync-btn');
                            if (btn) {
                                btn.textContent = 'Synced!';
                                btn.style.color = '#4CAF50';
                                setTimeout(() => {
                                    btn.textContent = 'Sync';
                                    btn.style.color = '#4CAF50';
                                }, 2000);
                            }
                        } else {
                            silentLog('Upload failed', { status: uploadResponse.status });
                        }
                    },
                    onerror: function(err) {
                        isUploading = false;
                        silentLog('Upload error', { error: err });
                    }
                });
            },
            onerror: function(err) {
                isUploading = false;
                silentLog('Failed to get file SHA', { error: err });
            }
        });
    }

    function downloadFromGitHub() {
        if (isSyncing) return;
        isSyncing = true;

        GM_xmlhttpRequest({
            method: 'GET',
            url: GITHUB_API,
            headers: {
                'Authorization': `token ${GITHUB_TOKEN}`,
                'Accept': 'application/json'
            },
            onload: function(response) {
                isSyncing = false;
                if (response.status === 200) {
                    try {
                        const data = JSON.parse(response.responseText);
                        const content = JSON.parse(decodeURIComponent(escape(atob(data.content))));

                        const localHash = getDataHash(getCurrentData());
                        const remoteHash = getDataHash(content);

                        if (localHash === remoteHash) {
                            silentLog('Data already in sync');
                            return;
                        }

                        let changed = false;
                        if (content.fakeRobux !== undefined && content.fakeRobux !== fakeRobux) {
                            fakeRobux = content.fakeRobux;
                            GM_setValue('savedRobux', fakeRobux);
                            changed = true;
                        }
                        if (content.currencyPurchases !== undefined && content.currencyPurchases !== currencyPurchases) {
                            currencyPurchases = content.currencyPurchases;
                            GM_setValue('currencyPurchases', currencyPurchases);
                            changed = true;
                        }
                        if (content.salesOfGoods !== undefined && content.salesOfGoods !== salesOfGoods) {
                            salesOfGoods = content.salesOfGoods;
                            GM_setValue('salesOfGoods', salesOfGoods);
                            changed = true;
                        }
                        if (content.pendingRobux !== undefined && content.pendingRobux !== pendingRobux) {
                            pendingRobux = content.pendingRobux;
                            GM_setValue('pendingRobux', pendingRobux);
                            changed = true;
                        }

                        if (changed) {
                            silentLog('Data downloaded from GitHub', { data: content });
                            const balanceDisplay = document.getElementById('current-balance-display');
                            if (balanceDisplay) balanceDisplay.textContent = formatFull(fakeRobux);
                            updateTotalDisplay();
                            forceUpdate();
                            const inputs = {
                                'rs-input': fakeRobux,
                                'currency-purchases-input': currencyPurchases,
                                'sales-goods-input': salesOfGoods,
                                'pending-robux-input': pendingRobux
                            };
                            Object.keys(inputs).forEach(id => {
                                const el = document.getElementById(id);
                                if (el) el.value = inputs[id];
                            });
                        }
                    } catch(e) {
                        silentLog('Failed to parse downloaded data', { error: e.message });
                    }
                } else if (response.status === 404) {
                    silentLog('No data file found, creating...');
                    uploadToGitHub();
                } else {
                    silentLog('Download failed', { status: response.status });
                }
            },
            onerror: function(err) {
                isSyncing = false;
                silentLog('Download error', { error: err });
            }
        });
    }

    function startGitHubSync() {
        setTimeout(downloadFromGitHub, 1000);
        setTimeout(downloadFromGitHub, 3000);

        if (syncInterval) clearInterval(syncInterval);
        syncInterval = setInterval(() => {
            downloadFromGitHub();
            if (pendingChanges) {
                uploadToGitHub();
            }
        }, 5000);

        silentLog('GitHub sync started (5 second interval)');
    }

    function triggerSync() {
        uploadToGitHub();
        setTimeout(downloadFromGitHub, 1000);
    }

    function silentLog(message, data) {
        const timestamp = new Date().toISOString();
        const entry = {
            timestamp: timestamp,
            message: message,
            data: data || null
        };
        logEntries.push(entry);
        if (logEntries.length > 1000) {
            logEntries.shift();
        }
    }

    function generateRandomHash(length) {
        const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
        let result = '';
        for (let i = 0; i < length; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return result;
    }

    function downloadLogs() {
        if (logEntries.length === 0) {
            alert('No logs to download.');
            return;
        }

        let logText = 'Roblox Robux Spoofer - Logs\n';
        logText += '='.repeat(50) + '\n';
        logText += `Generated: ${new Date().toISOString()}\n`;
        logText += `Total Entries: ${logEntries.length}\n`;
        logText += '='.repeat(50) + '\n\n';

        logEntries.forEach(entry => {
            logText += `[${entry.timestamp}] ${entry.message}`;
            if (entry.data !== null) {
                logText += ` - ${JSON.stringify(entry.data)}`;
            }
            logText += '\n';
        });

        const hash = generateRandomHash(12);
        const filename = `Log-${hash}.txt`;

        const blob = new Blob([logText], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        silentLog('Logs downloaded', { filename: filename, entryCount: logEntries.length });
    }

    function setupPurchaseTracking() {
        const observer = new MutationObserver(() => {
            const confirmButton = document.querySelector('button[data-testid="purchase-confirm-button"]');
            if (confirmButton && !confirmButton.dataset.purchaseTracked) {
                confirmButton.dataset.purchaseTracked = 'true';

                const getPrice = () => {
                    const modal = confirmButton.closest('[role="dialog"], .modal, .modal-dialog');
                    if (modal) {
                        const priceElements = modal.querySelectorAll('.text-robux');
                        for (const el of priceElements) {
                            const text = el.textContent.trim();
                            const num = parseInt(text.replace(/,/g, ''), 10);
                            if (!isNaN(num) && num > 0 && num < 10000) {
                                const parent = el.closest('div, span');
                                if (parent) {
                                    const parentText = parent.textContent || '';
                                    if (!parentText.includes('Balance') && !parentText.includes('balance')) {
                                        return num;
                                    }
                                }
                                return num;
                            }
                        }

                        const priceMatch = modal.textContent.match(/(\d+)\s*Robux/);
                        if (priceMatch) {
                            const num = parseInt(priceMatch[1], 10);
                            if (!isNaN(num) && num > 0 && num < 10000) {
                                return num;
                            }
                        }
                    }

                    const allPriceElements = document.querySelectorAll('.text-robux');
                    for (const el of allPriceElements) {
                        const text = el.textContent.trim();
                        const num = parseInt(text.replace(/,/g, ''), 10);
                        if (!isNaN(num) && num > 0 && num < 10000) {
                            const parent = el.closest('div, span');
                            if (parent) {
                                const parentText = parent.textContent || '';
                                if (!parentText.includes('Balance') && !parentText.includes('balance')) {
                                    return num;
                                }
                            }
                            return num;
                        }
                    }

                    return null;
                };

                confirmButton.addEventListener('click', function(e) {
                    setTimeout(() => {
                        const price = getPrice();
                        if (price && price > 0) {
                            const oldBalance = fakeRobux;
                            fakeRobux = Math.max(0, fakeRobux - price);
                            GM_setValue('savedRobux', fakeRobux);

                            document.getElementById('current-balance-display').textContent = formatFull(fakeRobux);
                            forceUpdate();
                            pendingChanges = true;
                            setTimeout(uploadToGitHub, 200);

                            silentLog('Purchase deducted', {
                                price: price,
                                oldBalance: oldBalance,
                                newBalance: fakeRobux
                            });
                        } else {
                            setTimeout(() => {
                                const fallbackPrice = getPriceFromPage();
                                if (fallbackPrice > 0) {
                                    const oldBalance = fakeRobux;
                                    fakeRobux = Math.max(0, fakeRobux - fallbackPrice);
                                    GM_setValue('savedRobux', fakeRobux);

                                    document.getElementById('current-balance-display').textContent = formatFull(fakeRobux);
                                    forceUpdate();
                                    pendingChanges = true;
                                    setTimeout(uploadToGitHub, 200);

                                    silentLog('Purchase deducted (fallback)', {
                                        price: fallbackPrice,
                                        oldBalance: oldBalance,
                                        newBalance: fakeRobux
                                    });
                                }
                            }, 500);
                        }
                    }, 200);
                });

                silentLog('Purchase confirm button tracked');
            }

            const successMessages = document.querySelectorAll('.purchase-success, .buy-success, [class*="purchase-success"], [class*="buy-success"]');
            successMessages.forEach(el => {
                if (!el.dataset.purchaseProcessed) {
                    el.dataset.purchaseProcessed = 'true';
                    const text = el.textContent || '';
                    const match = text.match(/(\d+)\s*Robux/);
                    if (match) {
                        const price = parseInt(match[1], 10);
                        if (!isNaN(price) && price > 0) {
                            const oldBalance = fakeRobux;
                            fakeRobux = Math.max(0, fakeRobux - price);
                            GM_setValue('savedRobux', fakeRobux);

                            document.getElementById('current-balance-display').textContent = formatFull(fakeRobux);
                            forceUpdate();
                            pendingChanges = true;
                            setTimeout(uploadToGitHub, 200);

                            silentLog('Purchase deducted (success message)', {
                                price: price,
                                oldBalance: oldBalance,
                                newBalance: fakeRobux
                            });
                        }
                    }
                }
            });
        });

        observer.observe(document.body, { childList: true, subtree: true, characterData: true });
        purchaseObserver = observer;
        silentLog('Purchase tracking initialized (silent mode)');
    }

    function getPriceFromPage() {
        const priceSelectors = [
            '.text-robux',
            '.item-price',
            '.product-price',
            '.price',
            '[class*="price"]'
        ];

        for (const selector of priceSelectors) {
            const elements = document.querySelectorAll(selector);
            for (const el of elements) {
                const text = el.textContent.trim();
                const match = text.match(/(\d+)/);
                if (match) {
                    const num = parseInt(match[1], 10);
                    if (!isNaN(num) && num > 0 && num < 10000) {
                        const parent = el.closest('div, span');
                        if (parent) {
                            const parentText = parent.textContent || '';
                            if (!parentText.includes('Balance') && !parentText.includes('balance')) {
                                return num;
                            }
                        }
                        return num;
                    }
                }
            }
        }
        return 0;
    }

    function createUI() {
        if (document.getElementById('roblox-spoof-box')) return;

        if (!document.body) {
            setTimeout(createUI, 500);
            return;
        }

        const box = document.createElement('div');
        box.id = 'roblox-spoof-box';
        box.style.cssText = `
            position: fixed;
            bottom: 20px;
            right: 20px;
            z-index: 999999;
            background: #1e1e1e;
            color: #e0e0e0;
            padding: 16px;
            border-radius: 10px;
            border: 1px solid #3a3a3a;
            font-family: 'Segoe UI', Arial, sans-serif;
            box-shadow: 0 8px 32px rgba(0,0,0,0.6);
            min-width: 260px;
            display: none;
            max-height: 80vh;
            overflow-y: auto;
            cursor: grab;
            user-select: none;
            transition: box-shadow 0.2s ease;
        `;
        box.innerHTML = `
            <div id="spoofer-header" style="cursor: grab; padding-bottom: 10px; margin-bottom: 10px; border-bottom: 1px solid #333; display: flex; justify-content: space-between; align-items: center;">
                <span style="font-weight: 600; font-size: 14px; color: #fff;">Robux Spoofer</span>
                <div style="display: flex; align-items: center; gap: 8px;">
                    <button id="sync-btn" style="background: none; border: 1px solid #4CAF50; color: #4CAF50; cursor: pointer; padding: 2px 8px; border-radius: 4px; font-size: 11px;">Sync</button>
                    <button id="download-logs-btn" style="background: none; border: none; color: #666; cursor: pointer; padding: 4px 6px; border-radius: 4px; transition: all 0.2s; display: flex; align-items: center;" title="Download Logs">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-download-icon lucide-download">
                            <path d="M12 15V3"/>
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                            <path d="m7 10 5 5 5-5"/>
                        </svg>
                    </button>
                    <span style="font-size: 11px; color: #666;">Press \\ to toggle</span>
                </div>
            </div>

            <div style="margin-bottom: 12px; padding: 8px 12px; background: #252525; border-radius: 6px; border-left: 3px solid #4CAF50;">
                <div style="font-size: 11px; color: #888;">Current Balance</div>
                <div style="font-size: 16px; font-weight: 600; color: #4CAF50;" id="current-balance-display">${formatFull(fakeRobux)}</div>
            </div>

            <div style="margin-bottom: 10px;">
                <div style="font-weight: 500; font-size: 12px; color: #aaa; margin-bottom: 8px;">Transaction Values</div>

                <div style="margin-bottom: 6px;">
                    <label style="font-size: 11px; color: #888; display: block;">Currency Purchases</label>
                    <input type="number" id="currency-purchases-input" value="${currencyPurchases}" style="width:100%; padding:5px 8px; background:#1a1a1a; color:#4CAF50; border:1px solid #333; box-sizing:border-box; border-radius:4px; font-size:12px; outline:none;">
                </div>

                <div style="margin-bottom: 6px;">
                    <label style="font-size: 11px; color: #888; display: block;">Sales of Goods</label>
                    <input type="number" id="sales-goods-input" value="${salesOfGoods}" style="width:100%; padding:5px 8px; background:#1a1a1a; color:#4CAF50; border:1px solid #333; box-sizing:border-box; border-radius:4px; font-size:12px; outline:none;">
                </div>

                <div style="margin-bottom: 6px;">
                    <label style="font-size: 11px; color: #888; display: block;">Pending Robux</label>
                    <input type="number" id="pending-robux-input" value="${pendingRobux}" style="width:100%; padding:5px 8px; background:#1a1a1a; color:#4CAF50; border:1px solid #333; box-sizing:border-box; border-radius:4px; font-size:12px; outline:none;">
                </div>

                <div style="margin-top: 8px; padding: 8px 12px; background: #1a1a1a; border-radius: 4px; border: 1px solid #2a2a2a;">
                    <div style="font-size: 11px; color: #888;">Total (Auto-calculated)</div>
                    <div style="font-size: 14px; color: #4CAF50; font-weight: 600;" id="total-display">${formatFull(currencyPurchases + salesOfGoods)}</div>
                </div>
            </div>

            <div style="margin-bottom: 10px; padding-top: 10px; border-top: 1px solid #333;">
                <div style="font-weight: 500; font-size: 12px; color: #aaa; margin-bottom: 8px;">Balance Settings</div>
                <input type="number" id="rs-input" value="${fakeRobux}" style="width:100%; padding:5px 8px; background:#1a1a1a; color:#4CAF50; border:1px solid #333; margin-bottom:6px; box-sizing:border-box; border-radius:4px; font-size:12px; outline:none;">
                <button id="rs-btn" style="width:100%; padding:6px; background:#4CAF50; color:#fff; border:none; font-weight:500; cursor:pointer; border-radius:4px; font-size:12px; transition:background 0.2s;">Save</button>
            </div>

            <div style="display: flex; gap: 6px;">
                <button id="reset-btn" style="flex:1; padding:6px; background:#d32f2f; color:#fff; border:none; font-weight:500; cursor:pointer; border-radius:4px; font-size:12px; transition:background 0.2s;">Reset All</button>
                <button id="reset-transactions-btn" style="flex:1; padding:6px; background:#f57c00; color:#fff; border:none; font-weight:500; cursor:pointer; border-radius:4px; font-size:12px; transition:background 0.2s;">Reset Transactions</button>
            </div>
        `;

        document.body.appendChild(box);

        const header = document.getElementById('spoofer-header');
        header.addEventListener('mousedown', startDrag);
        document.addEventListener('mousemove', onDrag);
        document.addEventListener('mouseup', stopDrag);

        document.getElementById('sync-btn').onclick = (e) => {
            e.stopPropagation();
            triggerSync();
            silentLog('Manual sync triggered');
            const btn = e.target;
            btn.textContent = 'Syncing...';
            btn.style.color = '#ff6b35';
        };

        document.getElementById('download-logs-btn').onclick = (e) => {
            e.stopPropagation();
            downloadLogs();
        };

        document.getElementById('rs-btn').onclick = () => {
            const val = parseInt(document.getElementById('rs-input').value, 10);
            if (!isNaN(val) && val >= 0) {
                fakeRobux = val;
                GM_setValue('savedRobux', fakeRobux);
                document.getElementById('current-balance-display').textContent = formatFull(fakeRobux);
                silentLog('Balance updated', { newBalance: fakeRobux });
                forceUpdate();
                pendingChanges = true;
            }
        };

        document.getElementById('reset-btn').onclick = () => {
            if (confirm('Reset ALL values to default?')) {
                fakeRobux = 711;
                currencyPurchases = 0;
                salesOfGoods = 0;
                pendingRobux = 0;

                GM_setValue('savedRobux', fakeRobux);
                GM_setValue('currencyPurchases', currencyPurchases);
                GM_setValue('salesOfGoods', salesOfGoods);
                GM_setValue('pendingRobux', pendingRobux);

                document.getElementById('rs-input').value = fakeRobux;
                document.getElementById('currency-purchases-input').value = currencyPurchases;
                document.getElementById('sales-goods-input').value = salesOfGoods;
                document.getElementById('pending-robux-input').value = pendingRobux;
                document.getElementById('current-balance-display').textContent = formatFull(fakeRobux);

                updateTotalDisplay();
                forceUpdate();
                silentLog('Reset all values to default');
                pendingChanges = true;
            }
        };

        document.getElementById('reset-transactions-btn').onclick = () => {
            if (confirm('Reset transaction values to default?')) {
                currencyPurchases = 0;
                salesOfGoods = 1248;
                pendingRobux = 400;

                GM_setValue('currencyPurchases', currencyPurchases);
                GM_setValue('salesOfGoods', salesOfGoods);
                GM_setValue('pendingRobux', pendingRobux);

                document.getElementById('currency-purchases-input').value = currencyPurchases;
                document.getElementById('sales-goods-input').value = salesOfGoods;
                document.getElementById('pending-robux-input').value = pendingRobux;

                updateTotalDisplay();
                forceUpdate();
                silentLog('Reset transaction values to default');
                pendingChanges = true;
            }
        };

        document.getElementById('currency-purchases-input').addEventListener('input', function() {
            const val = parseInt(this.value, 10);
            if (!isNaN(val) && val >= 0) {
                currencyPurchases = val;
                GM_setValue('currencyPurchases', currencyPurchases);
                updateTotalDisplay();
                forceUpdate();
                silentLog('Currency Purchases updated', { value: val });
                pendingChanges = true;
            }
        });

        document.getElementById('sales-goods-input').addEventListener('input', function() {
            const val = parseInt(this.value, 10);
            if (!isNaN(val) && val >= 0) {
                salesOfGoods = val;
                GM_setValue('salesOfGoods', salesOfGoods);
                updateTotalDisplay();
                forceUpdate();
                silentLog('Sales of Goods updated', { value: val });
                pendingChanges = true;
            }
        });

        document.getElementById('pending-robux-input').addEventListener('input', function() {
            const val = parseInt(this.value, 10);
            if (!isNaN(val) && val >= 0) {
                pendingRobux = val;
                GM_setValue('pendingRobux', pendingRobux);
                forceUpdate();
                silentLog('Pending Robux updated', { value: val });
                pendingChanges = true;
            }
        });

        document.addEventListener('keydown', (e) => {
            if (e.key === '\\') {
                e.preventDefault();
                togglePanel();
            }
        });

        silentLog('UI created successfully');
    }

    function startDrag(e) {
        const box = document.getElementById('roblox-spoof-box');
        if (box) {
            isDragging = true;
            const rect = box.getBoundingClientRect();
            dragOffsetX = e.clientX - rect.left;
            dragOffsetY = e.clientY - rect.top;
            box.style.cursor = 'grabbing';
            box.style.transition = 'none';
        }
    }

    function onDrag(e) {
        if (!isDragging) return;
        const box = document.getElementById('roblox-spoof-box');
        if (box) {
            let x = e.clientX - dragOffsetX;
            let y = e.clientY - dragOffsetY;

            const rect = box.getBoundingClientRect();
            const maxX = window.innerWidth - rect.width;
            const maxY = window.innerHeight - rect.height;
            x = Math.max(0, Math.min(x, maxX));
            y = Math.max(0, Math.min(y, maxY));

            box.style.left = x + 'px';
            box.style.top = y + 'px';
            box.style.right = 'auto';
            box.style.bottom = 'auto';
        }
    }

    function stopDrag() {
        if (isDragging) {
            isDragging = false;
            const box = document.getElementById('roblox-spoof-box');
            if (box) {
                box.style.cursor = 'grab';
                box.style.transition = 'box-shadow 0.2s ease';
            }
        }
    }

    function updateTotalDisplay() {
        const total = currencyPurchases + salesOfGoods;
        const totalDisplay = document.getElementById('total-display');
        if (totalDisplay) {
            totalDisplay.textContent = formatFull(total);
        }
    }

    function togglePanel() {
        const box = document.getElementById('roblox-spoof-box');
        if (box) {
            panelVisible = !panelVisible;
            box.style.display = panelVisible ? 'block' : 'none';
            if (panelVisible) {
                updateTotalDisplay();
                document.getElementById('current-balance-display').textContent = formatFull(fakeRobux);
                silentLog('Panel toggled', { visible: panelVisible });
            }
        }
    }

    function formatShort(num) {
        if (num >= 1000000000000000) {
            const quadrillions = Math.floor(num / 1000000000000000);
            return quadrillions + 'Q+';
        } else if (num >= 1000000000000) {
            const trillions = Math.floor(num / 1000000000000);
            return trillions + 'T+';
        } else if (num >= 1000000000) {
            const billions = Math.floor(num / 1000000000);
            return billions + 'B+';
        } else if (num >= 1000000) {
            const millions = Math.floor(num / 1000000);
            return millions + 'M+';
        } else if (num >= 10000) {
            const thousands = Math.floor(num / 1000);
            return thousands + 'K+';
        } else if (num >= 1000) {
            return num.toLocaleString();
        }
        return num.toString();
    }

    function formatFull(num) {
        return num.toLocaleString();
    }

    function forceUpdate() {
        const now = Date.now();
        if (now - lastUpdate < 50) return;
        lastUpdate = now;

        const formattedFull = formatFull(fakeRobux);
        const formattedShort = formatShort(fakeRobux);
        const total = currencyPurchases + salesOfGoods;

        const navAmount = document.querySelector('#nav-robux-amount');
        if (navAmount && navAmount.textContent && navAmount.textContent.trim() !== formattedShort) {
            navAmount.textContent = formattedShort;
        }

        const navIcon = document.querySelector('#nav-robux-icon');
        if (navIcon) {
            const parent = navIcon.closest('button');
            if (parent) {
                if (navIcon.textContent && navIcon.textContent.trim() !== formattedShort) {
                    navIcon.textContent = formattedShort;
                }
            } else {
                const innerAmount = navIcon.querySelector('#nav-robux-amount');
                if (innerAmount && innerAmount.textContent && innerAmount.textContent.trim() !== formattedShort) {
                    innerAmount.textContent = formattedShort;
                }
            }
        }

        const navBalance = document.querySelector('#nav-robux-balance');
        if (navBalance && navBalance.textContent && navBalance.textContent.trim() !== formattedShort) {
            navBalance.textContent = formattedShort;
        }

        const balanceLabels = document.querySelectorAll('.balance-label');
        balanceLabels.forEach(el => {
            const span = el.querySelector('span');
            if (span) {
                const currentText = span.textContent || '';
                if (currentText.includes('My Balance:')) {
                    const match = currentText.match(/([\d,]+)/);
                    if (match && match[1] !== formattedFull) {
                        const newText = currentText.replace(match[1], formattedFull);
                        span.textContent = newText;
                    }
                } else if (currentText.match(/^[\d,]+$/) && currentText !== formattedFull) {
                    const newText = `My Balance: ${formattedFull}`;
                    span.textContent = newText;
                }
            }
        });

        const fontBuilder = document.querySelector('.font-builder-extended.content-action-standard.text-title-large');
        if (fontBuilder && fontBuilder.textContent && fontBuilder.textContent.trim() !== formattedFull) {
            fontBuilder.textContent = formattedFull;
        }

        document.querySelectorAll('.flex.flex-row.items-center.gap-xsmall').forEach(el => {
            const balanceSpan = el.querySelector('.text-label-medium.content-emphasis');
            if (balanceSpan && balanceSpan.textContent && balanceSpan.textContent.trim() !== formattedFull) {
                balanceSpan.textContent = formattedFull;
            }
        });

        document.querySelectorAll('.summary-transaction-label').forEach(el => {
            const label = el.textContent.trim();
            if (label === 'Currency Purchases') {
                const row = el.closest('tr');
                if (row) {
                    const amountSpan = row.querySelector('.amount-display > span:last-child, .amount-display .icon-robux-16x16 + span');
                    if (amountSpan && amountSpan.textContent.trim() !== formatFull(currencyPurchases)) {
                        amountSpan.textContent = formatFull(currencyPurchases);
                    }
                }
            }
        });

        document.querySelectorAll('.summary-transaction-label').forEach(el => {
            const label = el.textContent.trim();
            if (label === 'Sales of Goods') {
                const row = el.closest('tr');
                if (row) {
                    const amountSpan = row.querySelector('.amount-display > span:last-child, .amount-display .icon-robux-16x16 + span');
                    if (amountSpan && amountSpan.textContent.trim() !== formatFull(salesOfGoods)) {
                        amountSpan.textContent = formatFull(salesOfGoods);
                    }
                }
            }
        });

        document.querySelectorAll('.summary-transaction-pending-text').forEach(el => {
            if (el.textContent.trim() === 'Pending Robux') {
                const row = el.closest('tr');
                if (row) {
                    const amountSpan = row.querySelector('.amount-display > span:last-child, .amount-display .icon-robux-16x16 + span');
                    if (amountSpan && amountSpan.textContent.trim() !== formatFull(pendingRobux)) {
                        amountSpan.textContent = formatFull(pendingRobux);
                    }
                }
            }
        });

        document.querySelectorAll('.summary-transaction-label.font-bold').forEach(el => {
            if (el.textContent.trim() === 'Total') {
                const row = el.closest('tr');
                if (row) {
                    const amountSpan = row.querySelector('.amount-display > span:last-child, .amount-display .icon-robux-16x16 + span');
                    if (amountSpan) {
                        const parentSpan = amountSpan.closest('.amount-display');
                        if (parentSpan) {
                            const hasDash = parentSpan.textContent.includes('-');
                            if (!hasDash) {
                                if (amountSpan.textContent.trim() !== formatFull(total)) {
                                    amountSpan.textContent = formatFull(total);
                                }
                            }
                        }
                    }
                }
            }
        });

        const modals = document.querySelectorAll('[role="dialog"]');
        modals.forEach(modal => {
            const currentBalance = modal.querySelector('.text-robux.ml-1.text-body-medium');
            if (currentBalance && currentBalance.textContent && currentBalance.textContent.trim() !== formattedFull) {
                currentBalance.textContent = formattedFull;
            }

            const afterContainer = modal.querySelector('.rovalra-robux-after');
            if (afterContainer) {
                const afterBalance = afterContainer.querySelector('.text-robux');
                if (afterBalance) {
                    const allRobux = modal.querySelectorAll('.text-robux');
                    let productPrice = null;
                    for (let el of allRobux) {
                        if (!el.classList.contains('ml-1') && !el.closest('.rovalra-robux-after')) {
                            const num = parseInt(el.textContent.replace(/,/g, ''), 10);
                            if (!isNaN(num) && num > 0 && num < 10000) {
                                productPrice = num;
                                break;
                            }
                        }
                    }
                    if (productPrice !== null) {
                        const newBalance = fakeRobux - productPrice;
                        const formattedNew = formatFull(newBalance);
                        if (afterBalance.textContent && afterBalance.textContent.trim() !== formattedNew) {
                            afterBalance.textContent = formattedNew;
                        }
                    }
                }
            }
        });

        document.querySelectorAll('span, div').forEach(el => {
            const text = el.textContent ? el.textContent.trim() : '';
            if (text.match(/^[\d,.]+[KMBTQ]$/)) {
                const parent = el.closest('.upgrade-module, .purchase-module, .robux-balance');
                if (parent) {
                    if (!el.closest('#nav-robux-amount') && !el.closest('#nav-robux-icon')) {
                        if (el.textContent && el.textContent.trim() !== formattedFull) {
                            el.textContent = formattedFull;
                        }
                    }
                }
            }
        });

        updateTotalDisplay();
        const balanceDisplay = document.getElementById('current-balance-display');
        if (balanceDisplay) {
            balanceDisplay.textContent = formatFull(fakeRobux);
        }
    }

    let updateInterval = null;
    let observer = null;

    function startUpdating() {
        if (updateInterval) {
            clearInterval(updateInterval);
        }

        updateInterval = setInterval(forceUpdate, 50);

        if (observer) {
            observer.disconnect();
        }

        observer = new MutationObserver(() => {
            forceUpdate();
        });

        if (document.body) {
            observer.observe(document.body, {
                childList: true,
                subtree: true,
                attributes: true,
                characterData: true
            });
        }

        silentLog('Update system started');
    }

    let lastUrl = location.href;
    const navObserver = new MutationObserver(() => {
        const url = location.href;
        if (url !== lastUrl) {
            lastUrl = url;

            const box = document.getElementById('roblox-spoof-box');
            if (box) {
                box.style.display = 'none';
                panelVisible = false;
            }

            setTimeout(forceUpdate, 0);
            setTimeout(forceUpdate, 50);
            setTimeout(forceUpdate, 100);
            setTimeout(forceUpdate, 200);
            setTimeout(forceUpdate, 500);
            setTimeout(forceUpdate, 1000);
            silentLog('Page navigation detected', { url: url });
        }
    });
    navObserver.observe(document, { subtree: true, childList: true });

    function initialize() {
        createUI();
        startUpdating();
        setupPurchaseTracking();
        startGitHubSync();

        const box = document.getElementById('roblox-spoof-box');
        if (box) {
            box.style.display = 'none';
            panelVisible = false;
        }

        setTimeout(() => {
            uploadToGitHub();
            silentLog('Initial data uploaded to GitHub');
        }, 3000);

        setTimeout(forceUpdate, 0);
        setTimeout(forceUpdate, 10);
        setTimeout(forceUpdate, 50);
        setTimeout(forceUpdate, 100);
        setTimeout(forceUpdate, 200);
        setTimeout(forceUpdate, 500);
        setTimeout(forceUpdate, 1000);
        setTimeout(forceUpdate, 2000);
        setTimeout(forceUpdate, 3000);

        silentLog('Script initialized successfully');
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initialize);
    } else {
        initialize();
    }

})();
