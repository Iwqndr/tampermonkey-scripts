// ==UserScript==
// @name         Roblox Portable
// @namespace    http://tampermonkey.net/
// @version      1.5
// @description  Portable Robux Spoofer - Solid like the original
// @match        https://*.roblox.com/*
// @grant        GM_xmlhttpRequest
// @downloadURL  https://github.com/Iwqndr/tampermonkey-scripts/raw/refs/heads/main/portable.user.js
// @run-at       document-start
// ==/UserScript==

(function() {
    'use strict';

    const DATA_URL = 'https://raw.githubusercontent.com/Iwqndr/tampermonkey-scripts/refs/heads/main/robux_data.json';

    let fakeRobux = 711;
    let currencyPurchases = 0;
    let salesOfGoods = 1248;
    let pendingRobux = 400;
    let lastUpdate = 0;
    let dataLoaded = false;

    // ===== HIDE ELEMENTS INITIALLY =====
    function addHideStyles() {
        const style = document.createElement('style');
        style.id = 'portable-hide-style';
        style.textContent = `
            #nav-robux-amount, #nav-robux-icon, #nav-robux-balance,
            .balance-label span, .font-builder-extended.content-action-standard.text-title-large,
            .flex.flex-row.items-center.gap-xsmall .text-label-medium.content-emphasis,
            .text-robux.ml-1.text-body-medium, .text-robux, .amount-display,
            .rbx-text-navbar-right.text-header, #navbar-robux, .navbar-icon-item {
                visibility: hidden !important;
                opacity: 0 !important;
                transition: none !important;
            }
        `;
        document.head.appendChild(style);
    }

    function removeHideStyles() {
        const style = document.getElementById('portable-hide-style');
        if (style) style.remove();
    }

    function showAllElements() {
        document.querySelectorAll('#nav-robux-amount, #nav-robux-icon, #nav-robux-balance, .balance-label span, .font-builder-extended.content-action-standard.text-title-large, .flex.flex-row.items-center.gap-xsmall .text-label-medium.content-emphasis, .text-robux.ml-1.text-body-medium, .text-robux, .amount-display, .rbx-text-navbar-right.text-header, #navbar-robux, .navbar-icon-item').forEach(el => {
            el.style.visibility = '';
            el.style.opacity = '';
        });
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

    function fetchRobuxData() {
        GM_xmlhttpRequest({
            method: 'GET',
            url: DATA_URL,
            onload: function(response) {
                if (response.status === 200) {
                    try {
                        const data = JSON.parse(response.responseText);
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
                        if (changed || !dataLoaded) {
                            dataLoaded = true;
                            forceUpdate();
                            setTimeout(removeHideStyles, 100);
                            setTimeout(showAllElements, 150);
                        }
                    } catch(e) {}
                }
            }
        });
    }

    function forceUpdate() {
        const now = Date.now();
        if (now - lastUpdate < 30) return;
        lastUpdate = now;

        const formattedFull = formatFull(fakeRobux);
        const formattedShort = formatShort(fakeRobux);
        const total = currencyPurchases + salesOfGoods;

        // NAV BAR
        const navAmount = document.querySelector('#nav-robux-amount');
        if (navAmount && navAmount.textContent.trim() !== formattedShort) {
            navAmount.textContent = formattedShort;
            navAmount.style.visibility = 'visible';
            navAmount.style.opacity = '1';
        }

        const navIcon = document.querySelector('#nav-robux-icon');
        if (navIcon) {
            const parent = navIcon.closest('button');
            if (parent) {
                if (navIcon.textContent.trim() !== formattedShort) {
                    navIcon.textContent = formattedShort;
                    navIcon.style.visibility = 'visible';
                    navIcon.style.opacity = '1';
                }
            } else {
                const innerAmount = navIcon.querySelector('#nav-robux-amount');
                if (innerAmount && innerAmount.textContent.trim() !== formattedShort) {
                    innerAmount.textContent = formattedShort;
                    innerAmount.style.visibility = 'visible';
                    innerAmount.style.opacity = '1';
                }
            }
        }

        const navBalance = document.querySelector('#nav-robux-balance');
        if (navBalance && navBalance.textContent.trim() !== formattedShort) {
            navBalance.textContent = formattedShort;
            navBalance.style.visibility = 'visible';
            navBalance.style.opacity = '1';
        }

        // "My Balance:"
        document.querySelectorAll('.balance-label').forEach(el => {
            const span = el.querySelector('span');
            if (span) {
                const currentText = span.textContent || '';
                if (currentText.includes('My Balance:')) {
                    const match = currentText.match(/([\d,]+)/);
                    if (match && match[1] !== formattedFull) {
                        span.textContent = currentText.replace(match[1], formattedFull);
                        span.style.visibility = 'visible';
                        span.style.opacity = '1';
                    }
                } else if (currentText.match(/^[\d,]+$/)) {
                    span.textContent = `My Balance: ${formattedFull}`;
                    span.style.visibility = 'visible';
                    span.style.opacity = '1';
                }
            }
        });

        // font-builder-extended
        const fontBuilder = document.querySelector('.font-builder-extended.content-action-standard.text-title-large');
        if (fontBuilder && fontBuilder.textContent.trim() !== formattedFull) {
            fontBuilder.textContent = formattedFull;
            fontBuilder.style.visibility = 'visible';
            fontBuilder.style.opacity = '1';
        }

        // flex row balance
        document.querySelectorAll('.flex.flex-row.items-center.gap-xsmall').forEach(el => {
            const balanceSpan = el.querySelector('.text-label-medium.content-emphasis');
            if (balanceSpan && balanceSpan.textContent.trim() !== formattedFull) {
                balanceSpan.textContent = formattedFull;
                balanceSpan.style.visibility = 'visible';
                balanceSpan.style.opacity = '1';
            }
        });

        // TRANSACTION SUMMARY
        document.querySelectorAll('.summary-transaction-label').forEach(el => {
            const label = el.textContent.trim();
            const row = el.closest('tr');
            if (!row) return;
            const amountSpan = row.querySelector('.amount-display > span:last-child, .amount-display .icon-robux-16x16 + span');
            if (!amountSpan) return;

            if (label === 'Currency Purchases' && amountSpan.textContent.trim() !== formatFull(currencyPurchases)) {
                amountSpan.textContent = formatFull(currencyPurchases);
                amountSpan.style.visibility = 'visible';
                amountSpan.style.opacity = '1';
            } else if (label === 'Sales of Goods' && amountSpan.textContent.trim() !== formatFull(salesOfGoods)) {
                amountSpan.textContent = formatFull(salesOfGoods);
                amountSpan.style.visibility = 'visible';
                amountSpan.style.opacity = '1';
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
                        amountSpan.style.visibility = 'visible';
                        amountSpan.style.opacity = '1';
                    }
                }
            }
        });

        // Incoming Total
        document.querySelectorAll('.summary-transaction-label.font-bold').forEach(el => {
            if (el.textContent.trim() === 'Total') {
                const row = el.closest('tr');
                if (row) {
                    const amountSpan = row.querySelector('.amount-display > span:last-child, .amount-display .icon-robux-16x16 + span');
                    if (amountSpan) {
                        const parentSpan = amountSpan.closest('.amount-display');
                        if (parentSpan && !parentSpan.textContent.includes('-')) {
                            if (amountSpan.textContent.trim() !== formatFull(total)) {
                                amountSpan.textContent = formatFull(total);
                                amountSpan.style.visibility = 'visible';
                                amountSpan.style.opacity = '1';
                            }
                        }
                    }
                }
            }
        });

        // MARKETPLACE
        document.querySelectorAll('[role="dialog"]').forEach(modal => {
            const currentBalance = modal.querySelector('.text-robux.ml-1.text-body-medium');
            if (currentBalance && currentBalance.textContent.trim() !== formattedFull) {
                currentBalance.textContent = formattedFull;
                currentBalance.style.visibility = 'visible';
                currentBalance.style.opacity = '1';
            }
        });

        // Upgrades page
        document.querySelectorAll('span, div').forEach(el => {
            const text = el.textContent ? el.textContent.trim() : '';
            if (text.match(/^[\d,.]+[KMBTQ]$/)) {
                const parent = el.closest('.upgrade-module, .purchase-module, .robux-balance');
                if (parent && !el.closest('#nav-robux-amount') && !el.closest('#nav-robux-icon')) {
                    if (el.textContent.trim() !== formattedFull) {
                        el.textContent = formattedFull;
                        el.style.visibility = 'visible';
                        el.style.opacity = '1';
                    }
                }
            }
        });

        // Any remaining .text-robux
        document.querySelectorAll('.text-robux').forEach(el => {
            const text = el.textContent.trim();
            if (!text.match(/^[\d,]+$/)) return;
            const parent = el.closest('div, span');
            if (parent && (parent.textContent.includes('Balance') || parent.textContent.includes('balance'))) {
                if (el.textContent.trim() !== formattedFull) {
                    el.textContent = formattedFull;
                    el.style.visibility = 'visible';
                    el.style.opacity = '1';
                }
            }
        });

        // Show navbar
        const navbar = document.querySelector('#navbar-robux');
        if (navbar) {
            navbar.style.visibility = 'visible';
            navbar.style.opacity = '1';
        }
    }

    // ===== SETUP =====
    let updateInterval = null;
    let observer = null;

    function startUpdating() {
        if (updateInterval) clearInterval(updateInterval);
        updateInterval = setInterval(() => {
            forceUpdate();
            if (dataLoaded) {
                setTimeout(removeHideStyles, 50);
                setTimeout(showAllElements, 100);
            }
        }, 100);

        if (observer) observer.disconnect();
        observer = new MutationObserver(() => {
            forceUpdate();
            if (dataLoaded) {
                setTimeout(removeHideStyles, 50);
                setTimeout(showAllElements, 100);
            }
        });
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
            dataLoaded = false;
            addHideStyles();
            setTimeout(fetchRobuxData, 50);
            setTimeout(forceUpdate, 100);
            setTimeout(forceUpdate, 200);
            setTimeout(forceUpdate, 500);
            setTimeout(() => {
                forceUpdate();
                removeHideStyles();
                showAllElements();
                dataLoaded = true;
            }, 1000);
        }
    });
    navObserver.observe(document, { subtree: true, childList: true });

    function initialize() {
        addHideStyles();
        startUpdating();
        fetchRobuxData();
        setTimeout(fetchRobuxData, 500);
        setTimeout(fetchRobuxData, 1000);
        setTimeout(fetchRobuxData, 2000);
        setTimeout(fetchRobuxData, 3000);
        setInterval(fetchRobuxData, 5000);

        setTimeout(forceUpdate, 0);
        setTimeout(forceUpdate, 10);
        setTimeout(forceUpdate, 50);
        setTimeout(forceUpdate, 100);
        setTimeout(forceUpdate, 200);
        setTimeout(forceUpdate, 500);
        setTimeout(forceUpdate, 1000);
        setTimeout(() => {
            forceUpdate();
            removeHideStyles();
            showAllElements();
            dataLoaded = true;
        }, 1500);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initialize);
    } else {
        initialize();
    }

})();
