// ==UserScript==
// @name         Roblox Portable
// @namespace    http://tampermonkey.net/
// @version      1.4
// @description  Portable Robux Spoofer - Full transaction support
// @match        https://*.roblox.com/*
// @grant        GM_xmlhttpRequest
// @downloadURL  https://github.com/Iwqndr/tampermonkey-scripts/raw/refs/heads/main/portable.user.js
// @run-at       document-start
// ==/UserScript==

(function() {
    'use strict';

    console.log('[Portable] Script started');

    const DATA_URL = 'https://raw.githubusercontent.com/Iwqndr/tampermonkey-scripts/refs/heads/main/robux_data.json';

    let fakeRobux = 711;
    let currencyPurchases = 0;
    let salesOfGoods = 1248;
    let pendingRobux = 400;
    let lastUpdate = 0;

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

    function fetchRobuxData() {
        console.log('[Portable] Fetching data from GitHub...');
        
        GM_xmlhttpRequest({
            method: 'GET',
            url: DATA_URL,
            onload: function(response) {
                if (response.status === 200) {
                    try {
                        const data = JSON.parse(response.responseText);
                        console.log('[Portable] Parsed data:', data);
                        
                        let changed = false;
                        if (data.fakeRobux !== undefined && data.fakeRobux !== fakeRobux) {
                            fakeRobux = data.fakeRobux;
                            changed = true;
                        }
                        if (data.currencyPurchases !== undefined && data.currencyPurchases !== currencyPurchases) {
                            currencyPurchases = data.currencyPurchases;
                            changed = true;
                        }
                        if (data.salesOfGoods !== undefined && data.salesOfGoods !== salesOfGoods) {
                            salesOfGoods = data.salesOfGoods;
                            changed = true;
                        }
                        if (data.pendingRobux !== undefined && data.pendingRobux !== pendingRobux) {
                            pendingRobux = data.pendingRobux;
                            changed = true;
                        }
                        
                        if (changed) {
                            console.log('[Portable] Data updated - fakeRobux:', fakeRobux, 'currencyPurchases:', currencyPurchases, 'salesOfGoods:', salesOfGoods, 'pendingRobux:', pendingRobux);
                            forceUpdate();
                        }
                    } catch(e) {
                        console.error('[Portable] Failed to parse JSON:', e);
                    }
                }
            },
            onerror: function(error) {
                console.error('[Portable] Request failed:', error);
            }
        });
    }

    function forceUpdate() {
        const now = Date.now();
        if (now - lastUpdate < 50) return;
        lastUpdate = now;

        const formattedFull = formatFull(fakeRobux);
        const formattedShort = formatShort(fakeRobux);
        const total = currencyPurchases + salesOfGoods;

        console.log('[Portable] Updating displays - Balance:', formattedFull, 'Total:', formatFull(total));

        let updatedCount = 0;

        // ===== NAV BAR =====
        const navAmount = document.querySelector('#nav-robux-amount');
        if (navAmount) {
            const current = navAmount.textContent.trim();
            if (current !== formattedShort) {
                navAmount.textContent = formattedShort;
                updatedCount++;
            }
        }

        const navIcon = document.querySelector('#nav-robux-icon');
        if (navIcon) {
            const parent = navIcon.closest('button');
            if (parent) {
                const current = navIcon.textContent.trim();
                if (current !== formattedShort) {
                    navIcon.textContent = formattedShort;
                    updatedCount++;
                }
            } else {
                const innerAmount = navIcon.querySelector('#nav-robux-amount');
                if (innerAmount) {
                    const current = innerAmount.textContent.trim();
                    if (current !== formattedShort) {
                        innerAmount.textContent = formattedShort;
                        updatedCount++;
                    }
                }
            }
        }

        const navBalance = document.querySelector('#nav-robux-balance');
        if (navBalance) {
            const current = navBalance.textContent.trim();
            if (current !== formattedShort) {
                navBalance.textContent = formattedShort;
                updatedCount++;
            }
        }

        // ===== "My Balance:" =====
        const balanceLabels = document.querySelectorAll('.balance-label');
        balanceLabels.forEach(el => {
            const span = el.querySelector('span');
            if (span) {
                const currentText = span.textContent || '';
                if (currentText.includes('My Balance:')) {
                    const match = currentText.match(/([\d,]+)/);
                    if (match && match[1] !== formattedFull) {
                        span.textContent = currentText.replace(match[1], formattedFull);
                        updatedCount++;
                    }
                } else if (currentText.match(/^[\d,]+$/)) {
                    span.textContent = `My Balance: ${formattedFull}`;
                    updatedCount++;
                }
            }
        });

        // ===== TRANSACTION SUMMARY =====
        // Currency Purchases
        document.querySelectorAll('.summary-transaction-label').forEach(el => {
            const label = el.textContent.trim();
            if (label === 'Currency Purchases') {
                const row = el.closest('tr');
                if (row) {
                    const amountSpan = row.querySelector('.amount-display > span:last-child, .amount-display .icon-robux-16x16 + span');
                    if (amountSpan && amountSpan.textContent.trim() !== formatFull(currencyPurchases)) {
                        amountSpan.textContent = formatFull(currencyPurchases);
                        updatedCount++;
                        console.log('[Portable] Updated Currency Purchases:', formatFull(currencyPurchases));
                    }
                }
            }
        });

        // Sales of Goods
        document.querySelectorAll('.summary-transaction-label').forEach(el => {
            const label = el.textContent.trim();
            if (label === 'Sales of Goods') {
                const row = el.closest('tr');
                if (row) {
                    const amountSpan = row.querySelector('.amount-display > span:last-child, .amount-display .icon-robux-16x16 + span');
                    if (amountSpan && amountSpan.textContent.trim() !== formatFull(salesOfGoods)) {
                        amountSpan.textContent = formatFull(salesOfGoods);
                        updatedCount++;
                        console.log('[Portable] Updated Sales of Goods:', formatFull(salesOfGoods));
                    }
                }
            }
        });

        // Pending Robux
        document.querySelectorAll('.summary-transaction-pending-text').forEach(el => {
            if (el.textContent.trim() === 'Pending Robux') {
                const row = el.closest('tr');
                if (row) {
                    const amountSpan = row.querySelector('.amount-display > span:last-child, .amount-display .icon-robux-16x16 + span');
                    if (amountSpan && amountSpan.textContent.trim() !== formatFull(pendingRobux)) {
                        amountSpan.textContent = formatFull(pendingRobux);
                        updatedCount++;
                        console.log('[Portable] Updated Pending Robux:', formatFull(pendingRobux));
                    }
                }
            }
        });

        // Incoming Total (auto-calculated)
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
                                    updatedCount++;
                                    console.log('[Portable] Updated Incoming Total:', formatFull(total));
                                }
                            }
                        }
                    }
                }
            }
        });

        // ===== font-builder-extended =====
        const fontBuilder = document.querySelector('.font-builder-extended.content-action-standard.text-title-large');
        if (fontBuilder && fontBuilder.textContent.trim() !== formattedFull) {
            fontBuilder.textContent = formattedFull;
            updatedCount++;
        }

        // ===== flex row balance =====
        document.querySelectorAll('.flex.flex-row.items-center.gap-xsmall').forEach(el => {
            const balanceSpan = el.querySelector('.text-label-medium.content-emphasis');
            if (balanceSpan && balanceSpan.textContent.trim() !== formattedFull) {
                balanceSpan.textContent = formattedFull;
                updatedCount++;
            }
        });

        // ===== Marketplace modal =====
        document.querySelectorAll('[role="dialog"]').forEach(modal => {
            const currentBalance = modal.querySelector('.text-robux.ml-1.text-body-medium');
            if (currentBalance && currentBalance.textContent.trim() !== formattedFull) {
                currentBalance.textContent = formattedFull;
                updatedCount++;
            }
        });

        // ===== Upgrades page =====
        document.querySelectorAll('span, div').forEach(el => {
            const text = el.textContent ? el.textContent.trim() : '';
            if (text.match(/^[\d,.]+[KMBTQ]$/)) {
                const parent = el.closest('.upgrade-module, .purchase-module, .robux-balance');
                if (parent && !el.closest('#nav-robux-amount') && !el.closest('#nav-robux-icon')) {
                    if (el.textContent.trim() !== formattedFull) {
                        el.textContent = formattedFull;
                        updatedCount++;
                    }
                }
            }
        });

        // ===== Any remaining .text-robux balance elements =====
        document.querySelectorAll('.text-robux').forEach(el => {
            const text = el.textContent.trim();
            if (!text.match(/^[\d,]+$/)) return;
            const parent = el.closest('div, span');
            if (parent && (parent.textContent.includes('Balance') || parent.textContent.includes('balance'))) {
                if (el.textContent.trim() !== formattedFull) {
                    el.textContent = formattedFull;
                    updatedCount++;
                }
            }
        });

        console.log('[Portable] Update complete. Updated', updatedCount, 'elements.');
    }

    // ===== SETUP =====
    let updateInterval = null;
    let observer = null;

    function startUpdating() {
        if (updateInterval) clearInterval(updateInterval);
        updateInterval = setInterval(forceUpdate, 2000);

        if (observer) observer.disconnect();
        observer = new MutationObserver(() => forceUpdate());
        if (document.body) {
            observer.observe(document.body, {
                childList: true,
                subtree: true,
                attributes: true,
                characterData: true
            });
        }
    }

    let lastUrl = location.href;
    const navObserver = new MutationObserver(() => {
        const url = location.href;
        if (url !== lastUrl) {
            lastUrl = url;
            setTimeout(forceUpdate, 0);
            setTimeout(forceUpdate, 50);
            setTimeout(forceUpdate, 100);
            setTimeout(forceUpdate, 200);
            setTimeout(forceUpdate, 500);
            setTimeout(forceUpdate, 1000);
            setTimeout(fetchRobuxData, 100);
        }
    });
    navObserver.observe(document, { subtree: true, childList: true });

    function initialize() {
        startUpdating();
        fetchRobuxData();
        setTimeout(fetchRobuxData, 1000);
        setTimeout(fetchRobuxData, 3000);
        setInterval(fetchRobuxData, 15000);

        setTimeout(forceUpdate, 0);
        setTimeout(forceUpdate, 10);
        setTimeout(forceUpdate, 50);
        setTimeout(forceUpdate, 100);
        setTimeout(forceUpdate, 200);
        setTimeout(forceUpdate, 500);
        setTimeout(forceUpdate, 1000);
        setTimeout(forceUpdate, 2000);
        setTimeout(forceUpdate, 3000);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initialize);
    } else {
        initialize();
    }

})();
