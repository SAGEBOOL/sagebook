/* TextPressure — vanilla 移植自 React Bits <TextPressure />
   用法：<div class="text-pressure" data-text-pressure data-text="SAGE BOOK"></div>
   或在 JS 中调用 initTextPressure(el, { text, width, weight, italic, alpha, flex, scale, textColor, minFontSize, maxFontSize }) */

(function () {
    'use strict';

    function dist(a, b) {
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        return Math.sqrt(dx * dx + dy * dy);
    }

    function getAttr(distance, maxDist, minVal, maxVal) {
        const val = maxVal - Math.abs((maxVal * distance) / maxDist);
        return Math.max(minVal, val + minVal);
    }

    function debounce(func, delay) {
        let timeoutId;
        return function () {
            const args = arguments;
            clearTimeout(timeoutId);
            timeoutId = setTimeout(() => func.apply(this, args), delay);
        };
    }

    const reduceMotion = window.matchMedia &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    function initTextPressure(el, opts) {
        if (!el) return null;
        opts = opts || {};

        const text = (opts.text != null)
            ? String(opts.text)
            : (el.getAttribute('data-text') || el.textContent || '');
        if (!text) return null;

        const width = opts.width !== false;
        const weight = opts.weight !== false;
        const italic = opts.italic !== false;
        const alpha = !!opts.alpha;
        const flex = opts.flex !== false;
        const scale = !!opts.scale;
        const textColor = opts.textColor || '#f0eee6';
        const minFontSize = opts.minFontSize || 36;
        const maxFontSize = opts.maxFontSize || 110;

        // 构建结构：容器 -> <h1> -> 逐字符 <span>
        el.classList.add('text-pressure');
        el.innerHTML = '';
        const h1 = document.createElement('h1');
        if (flex) h1.classList.add('flex');
        h1.style.color = textColor;

        const chars = text.split('');
        const spans = [];
        chars.forEach((ch) => {
            const span = document.createElement('span');
            if (ch === ' ') {
                span.classList.add('space');
                span.innerHTML = '&nbsp;';
            } else {
                span.textContent = ch;
            }
            span.dataset.char = ch;
            h1.appendChild(span);
            spans.push(span);
        });
        el.appendChild(h1);

        let fontSize = minFontSize;
        let scaleY = 1;
        let lineHeight = 1;

        const mouse = { x: 0, y: 0 };
        const cursor = { x: 0, y: 0 };

        function setSize() {
            const cRect = el.getBoundingClientRect();
            if (!cRect.width) return;
            let newFontSize = cRect.width / (chars.length / 2);
            newFontSize = Math.max(newFontSize, minFontSize);
            newFontSize = Math.min(newFontSize, maxFontSize);
            fontSize = newFontSize;
            h1.style.fontSize = fontSize + 'px';
            scaleY = 1;
            lineHeight = 1;
            h1.style.transform = 'scale(1, ' + scaleY + ')';
            h1.style.lineHeight = lineHeight;

            requestAnimationFrame(() => {
                const tRect = h1.getBoundingClientRect();
                if (scale && tRect.height > 0) {
                    const yRatio = cRect.height / tRect.height;
                    scaleY = yRatio;
                    lineHeight = yRatio;
                    h1.style.transform = 'scale(1, ' + scaleY + ')';
                    h1.style.lineHeight = lineHeight;
                }
            });
        }

        function onMouseMove(e) { cursor.x = e.clientX; cursor.y = e.clientY; }
        function onTouchMove(e) {
            const t = e.touches[0];
            if (t) { cursor.x = t.clientX; cursor.y = t.clientY; }
        }

        const cRect0 = el.getBoundingClientRect();
        mouse.x = cursor.x = cRect0.left + cRect0.width / 2;
        mouse.y = cursor.y = cRect0.top + cRect0.height / 2;

        window.addEventListener('mousemove', onMouseMove);
        window.addEventListener('touchmove', onTouchMove, { passive: true });

        const debouncedSetSize = debounce(setSize, 100);
        setSize();
        window.addEventListener('resize', debouncedSetSize);

        // 静态（无障碍 / 减弱动效）：所有字符取中间值，不启动动画循环
        function applyStatic() {
            const mid = "'wght' 500, 'wdth' 100, 'ital' 0";
            spans.forEach((s) => { s.style.fontVariationSettings = mid; });
        }

        if (reduceMotion) {
            applyStatic();
            return function destroy() {
                window.removeEventListener('mousemove', onMouseMove);
                window.removeEventListener('touchmove', onTouchMove);
                window.removeEventListener('resize', debouncedSetSize);
            };
        }

        let rafId;
        function animate() {
            mouse.x += (cursor.x - mouse.x) / 15;
            mouse.y += (cursor.y - mouse.y) / 15;

            const tRect = h1.getBoundingClientRect();
            const maxDist = tRect.width / 2 || 1;

            spans.forEach((span) => {
                if (!span) return;
                const r = span.getBoundingClientRect();
                const charCenter = { x: r.x + r.width / 2, y: r.y + r.height / 2 };
                const d = dist(mouse, charCenter);

                const wdth = width ? Math.floor(getAttr(d, maxDist, 5, 200)) : 100;
                const wght = weight ? Math.floor(getAttr(d, maxDist, 100, 900)) : 400;
                const italVal = italic ? getAttr(d, maxDist, 0, 1).toFixed(2) : 0;
                const alphaVal = alpha ? getAttr(d, maxDist, 0, 1).toFixed(2) : 1;

                const fvs = "'wght' " + wght + ", 'wdth' " + wdth + ", 'ital' " + italVal;
                if (span.style.fontVariationSettings !== fvs) {
                    span.style.fontVariationSettings = fvs;
                }
                if (alpha) span.style.opacity = alphaVal;
            });

            rafId = requestAnimationFrame(animate);
        }
        animate();

        return function destroy() {
            cancelAnimationFrame(rafId);
            window.removeEventListener('mousemove', onMouseMove);
            window.removeEventListener('touchmove', onTouchMove);
            window.removeEventListener('resize', debouncedSetSize);
        };
    }

    // 自动初始化：扫描 [data-text-pressure]
    function boot() {
        document.querySelectorAll('[data-text-pressure]').forEach((el) => {
            if (!el.__tpInited) {
                el.__tpInited = true;
                initTextPressure(el);
            }
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', boot);
    } else {
        boot();
    }

    window.initTextPressure = initTextPressure;
})();
