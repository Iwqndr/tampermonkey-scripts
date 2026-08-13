// ==UserScript==
// @name         Roblox Portable
// @namespace    http://tampermonkey.net/
// @version      1.2
// @description  Portable Robux Spoofer - Reads public GitHub JSON
// @match        https://*.roblox.com/*
// @grant        GM_xmlhttpRequest
// @downloadURL  https://github.com/Iwqndr/tampermonkey-scripts/raw/refs/heads/main/portable.user.js
// @run-at       document-start
// ==/UserScript==

(function() {
    'use strict';

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
        GM_xmlhttpRequest({
            method: 'GET',
            url: DATA_URL,
            onload: function(response) {
                if (response.status === 200) {
                    try {
                        const data = JSON.parse(response.responseText);
                        if (data.fakeRobux !== undefined && data.fakeRobux !== fakeRobux) {
                            fakeRobux = data.fakeRobux;
                            forceUpdate();
                        }
                    } catch(e) {
                        // Silent fail - keep current value
                    }
                }
            },
            onerror: function() {
                // Silent fail - keep current value
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

        // Nav bar
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

        // "My Balance:"
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

        // font-builder-extended
        const fontBuilder = document.querySelector('.font-builder-extended.content-action-standard.text-title-large');
        if (fontBuilder && fontBuilder.textContent && fontBuilder.textContent.trim() !== formattedFull) {
            fontBuilder.textContent = formattedFull;
        }

        // Flex row balance
        document.querySelectorAll('.flex.flex-row.items-center.gap-xsmall').forEach(el => {
            const balanceSpan = el.querySelector('.text-label-medium.content-emphasis');
            if (balanceSpan && balanceSpan.textContent && balanceSpan.textContent.trim() !== formattedFull) {
                balanceSpan.textContent = formattedFull;
            }
        });

        // Marketplace balances
        document.querySelectorAll('[role="dialog"]').forEach(modal => {
            const currentBalance = modal.querySelector('.text-robux.ml-1.text-body-medium');
            if (currentBalance && currentBalance.textContent && currentBalance.textContent.trim() !== formattedFull) {
                currentBalance.textContent = formattedFull;
            }
        });

        // Upgrades page
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
                    if (el.textContent.trim() !== formattedFull) {
                        el.textContent = formattedFull;
                    }
                }
            }
        });
    }

    // ===== SETUP =====
    let updateInterval = null;
    let observer = null;

    function startUpdating() {
        if (updateInterval) clearInterval(updateInterval);
        updateInterval = setInterval(forceUpdate, 50);

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
            // Fetch fresh data on navigation
            setTimeout(fetchRobuxData, 100);
        }
    });
    navObserver.observe(document, { subtree: true, childList: true });

    function initialize() {
        startUpdating();
        
        // Fetch data on load
        fetchRobuxData();
        setTimeout(fetchRobuxData, 1000);
        setTimeout(fetchRobuxData, 3000);
        setInterval(fetchRobuxData, 10000); // Check every 10 seconds

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
