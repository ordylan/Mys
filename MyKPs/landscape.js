(function () {
  'use strict';
  const CONFIG = {
    phoneAspectThreshold: 1.6,
    transitionDuration: '0.01s',
    touchScrollSensitivity: 1
  };

  let stage = null;
  let scroller = null;
  let isPhone = false;
  let isRotated = false;

  let touchStartX = 0;
  let touchStartScrollTop = 0;
  let isTouching = false;

  function init() {
    stage = document.createElement('div');
    stage.id = 'landscape-stage';

    scroller = document.createElement('div');
    scroller.id = 'landscape-scroller';

    const fragment = document.createDocumentFragment();
    while (document.body.firstChild) {
      fragment.appendChild(document.body.firstChild);
    }
    scroller.appendChild(fragment);
    stage.appendChild(scroller);
    document.body.appendChild(stage);

    injectStyles();
    bindTouchEvents();
    handleResize();

    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleResize);
  }

  function injectStyles() {
    const style = document.createElement('style');
    style.textContent = `
      * {
        box-sizing: border-box;
      }
      html, body {
        margin: 0;
        padding: 0;
        width: 100%;
        height: 100%;
        overflow: hidden;
        -webkit-text-size-adjust: 100%;
        -webkit-tap-highlight-color: transparent;
      }
      #landscape-stage {
        position: fixed;
        top: 0;
        left: 0;
        transform-origin: center center;
        transition: transform ${CONFIG.transitionDuration} ease;
        z-index: 1;
        overflow: hidden;
        will-change: transform;
      }
      #landscape-scroller {
        width: 100%;
        height: 100%;
        overflow-y: auto;
        overflow-x: hidden;
        background: inherit;
      }
      #landscape-scroller::-webkit-scrollbar {
        width: 6px;
      }
      #landscape-scroller::-webkit-scrollbar-thumb {
        background: rgba(0,0,0,0.2);
        border-radius: 3px;
      }
    `;
    document.head.appendChild(style);
  }

  function bindTouchEvents() {
    scroller.addEventListener('touchstart', onTouchStart, { passive: false });
    scroller.addEventListener('touchmove', onTouchMove, { passive: false });
    scroller.addEventListener('touchend', onTouchEnd, { passive: false });
    scroller.addEventListener('touchcancel', onTouchEnd, { passive: false });
  }

  function onTouchStart(e) {
    if (!isRotated) return;
    if (e.touches.length !== 1) return;

    isTouching = true;
    touchStartX = e.touches[0].clientX;
    touchStartScrollTop = scroller.scrollTop;
  }

  function onTouchMove(e) {
    if (!isRotated) return;
    if (!isTouching || e.touches.length !== 1) return;

    e.preventDefault();

    const currentX = e.touches[0].clientX;
    const deltaX = currentX - touchStartX;
    scroller.scrollTop = touchStartScrollTop + deltaX * CONFIG.touchScrollSensitivity;
  }

  function onTouchEnd() {
    isTouching = false;
  }

  function handleResize() {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const deviceAspect = Math.max(vw, vh) / Math.min(vw, vh);
    isPhone = deviceAspect >= CONFIG.phoneAspectThreshold;

    if (!isPhone) {
      resetToNormal(vw, vh);
      return;
    }

    applyForceLandscape(vw, vh);
  }
  function resetToNormal(vw, vh) {
    isRotated = false;
    stage.style.width = vw + 'px';
    stage.style.height = vh + 'px';
    stage.style.transform = 'none';
    stage.style.top = '0';
    stage.style.left = '0';
    stage.style.margin = '0';
    document.body.style.touchAction = 'auto';
  }

  function applyForceLandscape(vw, vh) {
    const isPortrait = vw < vh;
    isRotated = isPortrait;

    if (isPortrait) {
      stage.style.width = vh + 'px';
      stage.style.height = vw + 'px';
      stage.style.top = '50%';
      stage.style.left = '50%';
      stage.style.marginLeft = -(vh / 2) + 'px';
      stage.style.marginTop = -(vw / 2) + 'px';
      stage.style.transform = 'rotate(90deg)';
      document.body.style.touchAction = 'none';
    } else {
      stage.style.width = vw + 'px';
      stage.style.height = vh + 'px';
      stage.style.top = '0';
      stage.style.left = '0';
      stage.style.margin = '0';
      stage.style.transform = 'none';
      document.body.style.touchAction = 'auto';
    }
  }

  function mapClientToContent(clientX, clientY) {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    let x = clientX;
    let y = clientY;

    if (isRotated) {
      const temp = x;
      x = vh - y;
      y = temp;
    }

    y += scroller.scrollTop;
    return { x, y };
  }

  window.Landscape = {
    refresh: handleResize,
    isPhoneDevice: () => isPhone,
    isRotated: () => isRotated,
    getScrollTop: () => scroller.scrollTop,
    setScrollTop: (val) => { scroller.scrollTop = val; },
    mapClientToContent: mapClientToContent,
    scrollerElement: () => scroller,
    setPhoneThreshold: (threshold) => {
      CONFIG.phoneAspectThreshold = threshold;
      handleResize();
    },
    setTouchSensitivity: (val) => {
      CONFIG.touchScrollSensitivity = val;
    }
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();