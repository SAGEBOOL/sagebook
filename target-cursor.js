/* TargetCursor — vanilla port of React Bits <TargetCursor />
 * 依赖: GSAP (window.gsap)。若无 GSAP 则安全退出，不隐藏系统光标。
 * 用法: 给需要触发锁定效果的元素加 class="cursor-target"（默认选择器 .cursor-target）。
 */
(function () {
    'use strict';
    var gsap = window.gsap;
    if (!gsap) {
        console.warn('[TargetCursor] GSAP 未加载，跳过自定义光标。');
        return;
    }

    var opts = {
        targetSelector: '.cursor-target',
        spinDuration: 2,
        hideDefaultCursor: true,
        hoverDuration: 0.2,
        parallaxOn: true,
        cursorColor: '#ffffff',
        cursorColorOnTarget: '#a78bfa' // 悬停目标时平滑过渡到强调紫
    };

    // 移动端不渲染花哨光标
    var isMobile = (function () {
        var hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
        var smallScreen = window.innerWidth <= 768;
        var ua = navigator.userAgent || navigator.vendor || window.opera;
        var mobileRegex = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i;
        return (hasTouch && smallScreen) || mobileRegex.test(ua.toLowerCase());
    })();
    if (isMobile) return;

    // 构建光标 DOM
    var cursor = document.createElement('div');
    cursor.className = 'target-cursor-wrapper';
    cursor.innerHTML =
        '<div class="target-cursor-dot"></div>' +
        '<div class="target-cursor-corner corner-tl"></div>' +
        '<div class="target-cursor-corner corner-tr"></div>' +
        '<div class="target-cursor-corner corner-br"></div>' +
        '<div class="target-cursor-corner corner-bl"></div>';
    document.body.appendChild(cursor);

    var dot = cursor.querySelector('.target-cursor-dot');
    var corners = cursor.querySelectorAll('.target-cursor-corner');
    var cornerEls = Array.prototype.slice.call(corners);

    // 注入颜色
    dot.style.backgroundColor = opts.cursorColor;
    cornerEls.forEach(function (c) { c.style.borderColor = opts.cursorColor; });

    // 包含块补偿（fixed 元素若处于 transform 祖先内会错位）
    function getContainingBlock(element) {
        var node = element && element.parentElement;
        while (node && node !== document.documentElement) {
            var s = getComputedStyle(node);
            if (
                s.transform !== 'none' || s.perspective !== 'none' || s.filter !== 'none' ||
                s.willChange.indexOf('transform') !== -1 ||
                s.willChange.indexOf('perspective') !== -1 ||
                s.willChange.indexOf('filter') !== -1 ||
                /paint|layout|strict|content/.test(s.contain)
            ) {
                return node;
            }
            node = node.parentElement;
        }
        return null;
    }
    function getContainingBlockOffset(block) {
        if (!block) return { x: 0, y: 0 };
        var rect = block.getBoundingClientRect();
        return { x: rect.left + block.clientLeft, y: rect.top + block.clientTop };
    }

    var constants = { borderWidth: 3, cornerSize: 12 };
    var containingBlock = getContainingBlock(cursor);
    function getOffset() { return getContainingBlockOffset(containingBlock); }

    var spinTl = null;
    var activeTarget = null;
    var currentLeaveHandler = null;
    var resumeTimeout = null;
    var targetCornerPositions = null;
    var activeStrength = { current: 0 };

    function moveCursor(x, y) {
        var off = getOffset();
        gsap.to(cursor, { x: x - off.x, y: y - off.y, duration: 0.1, ease: 'power3.out' });
    }

    var initialOffset = getOffset();
    gsap.set(cursor, {
        xPercent: -50, yPercent: -50,
        x: window.innerWidth / 2 - initialOffset.x,
        y: window.innerHeight / 2 - initialOffset.y
    });

    function createSpinTimeline() {
        if (spinTl) spinTl.kill();
        spinTl = gsap.timeline({ repeat: -1 }).to(cursor, { rotation: '+=360', duration: opts.spinDuration, ease: 'none' });
    }
    createSpinTimeline();

    function tickerFn() {
        if (!targetCornerPositions) return;
        var strength = activeStrength.current;
        if (strength === 0) return;
        var cursorX = gsap.getProperty(cursor, 'x');
        var cursorY = gsap.getProperty(cursor, 'y');
        cornerEls.forEach(function (corner, i) {
            var currentX = gsap.getProperty(corner, 'x');
            var currentY = gsap.getProperty(corner, 'y');
            var targetX = targetCornerPositions[i].x - cursorX;
            var targetY = targetCornerPositions[i].y - cursorY;
            var finalX = currentX + (targetX - currentX) * strength;
            var finalY = currentY + (targetY - currentY) * strength;
            var duration = strength >= 0.99 ? (opts.parallaxOn ? 0.2 : 0) : 0.05;
            gsap.to(corner, {
                x: finalX, y: finalY, duration: duration,
                ease: duration === 0 ? 'none' : 'power1.out', overwrite: 'auto'
            });
        });
    }

    var originalCursor;
    if (opts.hideDefaultCursor) {
        originalCursor = document.body.style.cursor;
        document.body.style.cursor = 'none';
    }

    function cleanupTarget(target) {
        if (currentLeaveHandler) target.removeEventListener('mouseleave', currentLeaveHandler);
        currentLeaveHandler = null;
    }

    window.addEventListener('mousemove', function (e) { moveCursor(e.clientX, e.clientY); });

    window.addEventListener('scroll', function () {
        if (!activeTarget) return;
        var off = getOffset();
        var mouseX = gsap.getProperty(cursor, 'x') + off.x;
        var mouseY = gsap.getProperty(cursor, 'y') + off.y;
        var elUnder = document.elementFromPoint(mouseX, mouseY);
        var stillOver = elUnder && (elUnder === activeTarget || (elUnder.closest && elUnder.closest(opts.targetSelector) === activeTarget));
        if (!stillOver && currentLeaveHandler) currentLeaveHandler();
    }, { passive: true });

    window.addEventListener('mousedown', function () {
        gsap.to(dot, { scale: 0.7, duration: 0.3 });
        gsap.to(cursor, { scale: 0.9, duration: 0.2 });
    });
    window.addEventListener('mouseup', function () {
        gsap.to(dot, { scale: 1, duration: 0.3 });
        gsap.to(cursor, { scale: 1, duration: 0.2 });
    });

    window.addEventListener('mouseover', function (e) {
        var directTarget = e.target;
        var allTargets = [];
        var current = directTarget;
        while (current && current !== document.body) {
            if (current.matches && current.matches(opts.targetSelector)) allTargets.push(current);
            current = current.parentElement;
        }
        var target = allTargets[0] || null;
        if (!target) return;
        if (activeTarget === target) return;
        if (activeTarget) cleanupTarget(activeTarget);
        if (resumeTimeout) { clearTimeout(resumeTimeout); resumeTimeout = null; }

        activeTarget = target;
        cornerEls.forEach(function (c) { gsap.killTweensOf(c, 'x,y'); });
        gsap.killTweensOf(cursor, 'rotation');
        if (spinTl) spinTl.pause();
        gsap.set(cursor, { rotation: 0 });

        if (opts.cursorColorOnTarget) {
            gsap.to(cornerEls, { borderColor: opts.cursorColorOnTarget, duration: 0.15, ease: 'power2.out' });
            gsap.to(dot, { backgroundColor: opts.cursorColorOnTarget, duration: 0.15, ease: 'power2.out' });
        }

        var rect = target.getBoundingClientRect();
        var borderWidth = constants.borderWidth, cornerSize = constants.cornerSize;
        var off = getOffset();
        var cursorX = gsap.getProperty(cursor, 'x');
        var cursorY = gsap.getProperty(cursor, 'y');

        targetCornerPositions = [
            { x: rect.left - borderWidth - off.x, y: rect.top - borderWidth - off.y },
            { x: rect.right + borderWidth - cornerSize - off.x, y: rect.top - borderWidth - off.y },
            { x: rect.right + borderWidth - cornerSize - off.x, y: rect.bottom + borderWidth - cornerSize - off.y },
            { x: rect.left - borderWidth - off.x, y: rect.bottom + borderWidth - cornerSize - off.y }
        ];

        gsap.ticker.add(tickerFn);
        gsap.to(activeStrength, { current: 1, duration: opts.hoverDuration, ease: 'power2.out' });

        cornerEls.forEach(function (corner, i) {
            gsap.to(corner, {
                x: targetCornerPositions[i].x - cursorX,
                y: targetCornerPositions[i].y - cursorY,
                duration: 0.2, ease: 'power2.out'
            });
        });

        var leaveHandler = function () {
            gsap.ticker.remove(tickerFn);
            targetCornerPositions = null;
            gsap.set(activeStrength, { current: 0, overwrite: true });
            activeTarget = null;

            if (opts.cursorColorOnTarget) {
                gsap.to(cornerEls, { borderColor: opts.cursorColor, duration: 0.15, ease: 'power2.out' });
                gsap.to(dot, { backgroundColor: opts.cursorColor, duration: 0.15, ease: 'power2.out' });
            }

            gsap.killTweensOf(cornerEls, 'x,y');
            var positions = [
                { x: -cornerSize * 1.5, y: -cornerSize * 1.5 },
                { x: cornerSize * 0.5, y: -cornerSize * 1.5 },
                { x: cornerSize * 0.5, y: cornerSize * 0.5 },
                { x: -cornerSize * 1.5, y: cornerSize * 0.5 }
            ];
            var tl = gsap.timeline();
            cornerEls.forEach(function (corner, idx) {
                tl.to(corner, { x: positions[idx].x, y: positions[idx].y, duration: 0.3, ease: 'power3.out' }, 0);
            });

            resumeTimeout = setTimeout(function () {
                if (!activeTarget && spinTl) {
                    var curRot = gsap.getProperty(cursor, 'rotation');
                    var norm = curRot % 360;
                    spinTl.kill();
                    spinTl = gsap.timeline({ repeat: -1 }).to(cursor, { rotation: '+=360', duration: opts.spinDuration, ease: 'none' });
                    gsap.to(cursor, {
                        rotation: norm + 360,
                        duration: opts.spinDuration * (1 - norm / 360),
                        ease: 'none',
                        onComplete: function () { if (spinTl) spinTl.restart(); }
                    });
                }
                resumeTimeout = null;
            }, 50);

            cleanupTarget(target);
        };
        currentLeaveHandler = leaveHandler;
        target.addEventListener('mouseleave', leaveHandler);
    }, { passive: true });

    window.addEventListener('resize', function () { containingBlock = getContainingBlock(cursor); });
})();
