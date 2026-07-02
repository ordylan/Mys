//BAD!!  未来再优化
(function () {
  const THRESHOLD_RATIO = 1.6;
  const WRAP_ID = '__landscape_wrap_threshold';

  // 存储原始样式 & 滚动位置
  const _saved = {
    htmlHeight: null,
    bodyHeight: null,
    bodyMargin: null,
    bodyOverflow: null,
    scrollX: 0,
    scrollY: 0,
  };

  function ensureWrap() {
    let wrap = document.getElementById(WRAP_ID);
    if (!wrap) {
      wrap = document.createElement('div');
      wrap.id = WRAP_ID;
      Object.assign(wrap.style, {
        width: '100%',
        height: '100%',
        boxSizing: 'border-box'
      });
      // 将 body 的现有子节点移入 wrap
      while (document.body.firstChild) wrap.appendChild(document.body.firstChild);
      document.body.appendChild(wrap);
    }
    return wrap;
  }

  function isPortrait() {
    return window.innerHeight > window.innerWidth;
  }

  function shouldRotate(vw, vh) {
    // 调试输出可以临时保留
   console.log('ratio', vh / vw);
    return isPortrait() && (vh / vw) >= THRESHOLD_RATIO;
  }

  function saveOriginalState() {
    _saved.htmlHeight = document.documentElement.style.height || '';
    _saved.bodyHeight = document.body.style.height || '';
    _saved.bodyMargin = document.body.style.margin || '';
    _saved.bodyOverflow = document.body.style.overflow || '';
    _saved.scrollX = window.pageXOffset || window.scrollX || 0;
    _saved.scrollY = window.pageYOffset || window.scrollY || 0;
  }

  function restoreOriginalState() {
    document.documentElement.style.height = _saved.htmlHeight;
    document.body.style.height = _saved.bodyHeight;
    document.body.style.margin = _saved.bodyMargin;
    document.body.style.overflow = _saved.bodyOverflow;
  }

  function apply() {
    const wrap = ensureWrap();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const dpr = window.devicePixelRatio || 1;

    if (shouldRotate(vw, vh)) {
      // 如果尚未进入旋转模式，保存状态
      if (wrap.dataset.rotated !== '1') {
        saveOriginalState();
      }

      // 计算旋转前应有的尺寸（使 rotate 后铺满视口）
      const preW = vh;
      const preH = vw;
      const Wpx = Math.round(preW * dpr) / dpr;
      const Hpx = Math.round(preH * dpr) / dpr;

      // 设置 html/body 以避免滚动条影响布局（保存过旧值，可恢复）
      document.documentElement.style.height = '100%';
      document.body.style.height = '100%';
      document.body.style.margin = '0';

      // 设置 wrap 为固定并旋转
      Object.assign(wrap.style, {
        position: 'fixed',
        top: '50%',
        left: '50%',
        width: Wpx + 'px',
        height: Hpx + 'px',
        transformOrigin: 'center center',
        willChange: 'transform',
        backfaceVisibility: 'hidden',
        WebkitBackfaceVisibility: 'hidden',
        WebkitFontSmoothing: 'antialiased',
        zIndex: '9999',
        overflow: 'auto',
        boxSizing: 'border-box'
      });

      wrap.style.transform = 'translate3d(-50%,-50%,0) rotate(90deg)';
      document.body.style.overflow = 'hidden';
      wrap.dataset.rotated = '1';

      // 把 wrap 的滚动位置设到之前的 scrollY，能保持视觉位置（按需）
      wrap.scrollTop = _saved.scrollY || 0;
    } else {
      // 只有当之前处于旋转状态时才恢复（避免覆盖用户样式）
      if (wrap.dataset.rotated === '1') {
        // 恢复 html/body 的原始内联样式
        restoreOriginalState();

        // 把 wrapper 恢复为流式样式
        wrap.style.transform = '';
        wrap.style.position = '';
        wrap.style.top = '';
        wrap.style.left = '';
        wrap.style.width = '100%';
        wrap.style.height = '100%';
        wrap.style.transformOrigin = '';
        wrap.style.willChange = '';
        wrap.style.backfaceVisibility = '';
        wrap.style.WebkitBackfaceVisibility = '';
        wrap.style.WebkitFontSmoothing = '';
        wrap.style.zIndex = '';
        wrap.style.overflow = '';
        wrap.style.boxSizing = 'border-box';

        // 強制一次回流，讓浏览器应用上面的清除
        // （在某些移动浏览器上这是必要的）
        // eslint-disable-next-line no-unused-expressions
        wrap.getBoundingClientRect();

        // 还原 body 的 overflow（保存的值）
        document.body.style.overflow = _saved.bodyOverflow || '';

        // 在短延时后恢复滚动位置（有助于 iOS/Android 在恢复布局后正确滚动）
        setTimeout(() => {
          try {
            window.scrollTo(_saved.scrollX || 0, _saved.scrollY || 0);
          } catch (e) {
            // ignore
          }
        }, 40);

        wrap.dataset.rotated = '0';
      } else {
        // 确保常规流式时也是 100% 覆盖的样式（第一次加载时）
        wrap.style.width = '100%';
        wrap.style.height = '100%';
      }
    }
  }

  // 节流 resize
  let timer = null;
  window.addEventListener('resize', () => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => { apply(); timer = null; }, 80);
  }, { passive: true });

  // orientationchange 需要小延迟以便尺寸稳定
  window.addEventListener('orientationchange', () => setTimeout(apply, 200), { passive: true });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', apply);
  } else {
    apply();
  }
})();

