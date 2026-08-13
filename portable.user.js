// ==UserScript==
// @name         Roblox Portable
// @namespace    http://tampermonkey.net/
// @version      1.3
// @description  Portable Robux Spoofer - Reads public GitHub JSON
// @match        https://*.roblox.com/*
// @grant        GM_xmlhttpRequest
// @downloadURL  https://github.com/Iwqndr/tampermonkey-scripts/raw/refs/heads/main/portable.user.js
// @run-at       document-start
// ==/UserScript==

(function() {
    'use strict';

    console.log('[Portable] Script started');

    // ===== PUBLIC GITHUB DATA =====
    const DATA_URL = 'https://raw.githubusercontent.com/Iwqndr/tampermonkey-scripts/refs/heads/main/robux_data.json';

    let fakeRobux = 711;
    let lastUpdate = 0;

    // ===== FORMATTING =====
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

    // ===== FETCH DATA FROM GITHUB =====
    function fetchRobuxData() {
        console.log('[Portable] Fetching data from GitHub...');
        console.log('[Portable] URL:', DATA_URL);
        
        GM_xmlhttpRequest({
            method: 'GET',
            url: DATA_URL,
            onload: function(response) {
                console.log('[Portable] Response status:', response.status);
                console.log('[Portable] Response text:', response.responseText);
                
                if (response.status === 200) {
                    try {
                        const data = JSON.parse(response.responseText);
                        console.log('[Portable] Parsed data:', data);
                        
                        if (data.fakeRobux !== undefined && data.fakeRobux !== fakeRobux) {
                            console.log('[Portable] Updating fakeRobux from', fakeRobux, 'to', data.fakeRobux);
                            fakeRobux = data.fakeRobux;
                            forceUpdate();
                        } else {
                            console.log('[Portable] fakeRobux unchanged:', fakeRobux);
                        }
                    } catch(e) {
                        console.error('[Portable] Failed to parse JSON:', e);
                        console.error('[Portable] Response was:', response.responseText);
                    }
                } else {
                    console.error('[Portable] HTTP error:', response.status);
                }
            },
            onerror: function(error) {
                console.error('[Portable] Request failed:', error);
            }
        });
    }

    // ===== UPDATE FUNCTION =====
    function forceUpdate() {
        const now = Date.now();
        if (now - lastUpdate < 50) return;
        lastUpdate = now;

        const formattedFull = formatFull(fakeRobux);
        const formattedShort = formatShort(fakeRobux);

        console.log('[Portable] Updating displays to:', formattedFull, '(short:', formattedShort, ')');

        let updatedCount = 0;

        // Nav bar
        const navAmount = document.querySelector('#nav-robux-amount');
        if (navAmount) {
            const current = navAmount.textContent.trim();
            if (current !== formattedShort) {
                console.log('[Portable] Updating nav-robux-amount:', current, '->', formattedShort);
                navAmount.textContent = formattedShort;
                updatedCount++;
            }
        } else {
            console.log('[Portable] nav-robux-amount not found');
        }

        const navIcon = document.querySelector('#nav-robux-icon');
        if (navIcon) {
            const parent = navIcon.closest('button');
            if (parent) {
                const current = navIcon.textContent.trim();
                if (current !== formattedShort) {
                    console.log('[Portable] Updating nav-robux-icon:', current, '->', formattedShort);
                    navIcon.textContent = formattedShort;
                    updatedCount++;
                }
            } else {
                const innerAmount = navIcon.querySelector('#nav-robux-amount');
                if (innerAmount) {
                    const current = innerAmount.textContent.trim();
                    if (current !== formattedShort) {
                        console.log('[Portable] Updating nav-robux-icon inner:', current, '->', formattedShort);
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
                console.log('[Portable] Updating nav-robux-balance:', current, '->', formattedShort);
                navBalance.textContent = formattedShort;
                updatedCount++;
            }
        }

        // "My Balance:"
        const balanceLabels = document.querySelectorAll('.balance-label');
        console.log('[Portable] Found', balanceLabels.length, 'balance-label elements');
        balanceLabels.forEach(el => {
            const span = el.querySelector('span');
            if (span) {
                const currentText = span.textContent || '';
                if (currentText.includes('My Balance:')) {
                    const match = currentText.match(/([\d,]+)/);
                    if (match && match[1] !== formattedFull) {
                        const newText = currentText.replace(match[1], formattedFull);
                        console.log('[Portable] Updating My Balance:', currentText, '->', newText);
                        span.textContent = newText;
                        updatedCount++;
                    }
                } else if (currentText.match(/^[\d,]+$/) && currentText !== formattedFull) {
                    const newText = `My Balance: ${formattedFull}`;
                    console.log('[Portable] Adding My Balance text:', currentText, '->', newText);
                    span.textContent = newText;
                    updatedCount++;
                }
            }
        });

        // font-builder-extended
        const fontBuilder = document.querySelector('.font-builder-extended.content-action-standard.text-title-large');
        if (fontBuilder) {
            const current = fontBuilder.textContent.trim();
            if (current !== formattedFull) {
                console.log('[Portable] Updating font-builder-extended:', current, '->', formattedFull);
                fontBuilder.textContent = formattedFull;
                updatedCount++;
            }
        }

        // Flex row balance
        document.querySelectorAll('.flex.flex-row.items-center.gap-xsmall').forEach(el => {
            const balanceSpan = el.querySelector('.text-label-medium.content-emphasis');
            if (balanceSpan) {
                const current = balanceSpan.textContent.trim();
                if (current !== formattedFull) {
                    console.log('[Portable] Updating flex row balance:', current, '->', formattedFull);
                    balanceSpan.textContent = formattedFull;
                    updatedCount++;
                }
            }
        });

        // Marketplace balances
        document.querySelectorAll('[role="dialog"]').forEach(modal => {
            const currentBalance = modal.querySelector('.text-robux.ml-1.text-body-medium');
            if (currentBalance) {
                const current = currentBalance.textContent.trim();
                if (current !== formattedFull) {
                    console.log('[Portable] Updating modal balance:', current, '->', formattedFull);
                    currentBalance.textContent = formattedFull;
                    updatedCount++;
                }
            }
        });

        // Any remaining .text-robux elements
        document.querySelectorAll('.text-robux').forEach(el => {
            const text = el.textContent.trim();
            if (!text.match(/^[\d,]+$/)) return;
            const num = parseInt(text.replace(/,/g, ''), 10);
            if (isNaN(num)) return;
            
            const parent = el.closest('div, span');
            if (parent) {
                const parentText = parent.textContent || '';
                if (parentText.includes('Balance') || parentText.includes('balance')) {
                    const current = el.textContent.trim();
                    if (current !== formattedFull) {
                        console.log('[Portable] Updating .text-robux balance:', current, '->', formattedFull);
                        el.textContent = formattedFull;
                        updatedCount++;
                    }
                }
            }
        });

        console.log('[Portable] Update complete. Updated', updatedCount, 'elements.');
    }

    // ===== SETUP =====
    let updateInterval = null;
    let observer = null;

    function startUpdating() {
        console.log('[Portable] Starting update system...');
        
        if (updateInterval) clearInterval(updateInterval);
        updateInterval = setInterval(() => {
            console.log('[Portable] Tick - forcing update');
            forceUpdate();
        }, 2000);

        if (observer) observer.disconnect();
        observer = new MutationObserver(() => {
            console.log('[Portable] DOM mutation detected');
            forceUpdate();
        });
        if (document.body) {
            observer.observe(document.body, {
                childList: true,
                subtree: true,
                attributes: true,
                characterData: true
            });
            console.log('[Portable] Observer attached');
        } else {
            console.warn('[Portable] document.body not ready yet');
        }
    }

    let lastUrl = location.href;
    const navObserver = new MutationObserver(() => {
        const url = location.href;
        if (url !== lastUrl) {
            console.log('[Portable] Navigation detected from', lastUrl, 'to', url);
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
    console.log('[Portable] Navigation observer attached');

    function initialize() {
        console.log('[Portable] Initializing...');
        console.log('[Portable] Document readyState:', document.readyState);
        console.log('[Portable] URL:', window.location.href);
        
        startUpdating();
        
        console.log('[Portable] Fetching initial data...');
        fetchRobuxData();
        setTimeout(() => {
            console.log('[Portable] Fetching data (delay 1s)...');
            fetchRobuxData();
        }, 1000);
        setTimeout(() => {
            console.log('[Portable] Fetching data (delay 3s)...');
            fetchRobuxData();
        }, 3000);
        setInterval(() => {
            console.log('[Portable] Periodic fetch...');
            fetchRobuxData();
        }, 15000);

        console.log('[Portable] Running initial updates...');
        setTimeout(forceUpdate, 0);
        setTimeout(forceUpdate, 10);
        setTimeout(forceUpdate, 50);
        setTimeout(forceUpdate, 100);
        setTimeout(forceUpdate, 200);
        setTimeout(forceUpdate, 500);
        setTimeout(forceUpdate, 1000);
        setTimeout(forceUpdate, 2000);
        setTimeout(forceUpdate, 3000);
        
        console.log('[Portable] Initialization complete');
    }

    if (document.readyState === 'loading') {
        console.log('[Portable] Waiting for DOMContentLoaded...');
        document.addEventListener('DOMContentLoaded', initialize);
    } else {
        console.log('[Portable] DOM already loaded, initializing now');
        initialize();
    }

    console.log('[Portable] Script loaded successfully');
})();
