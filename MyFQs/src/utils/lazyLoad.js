import { DEFAULT_IMAGE_URL, PLACEHOLDER_IMAGE } from '../constants/images'

function lazyLoad() {
  const images = document.querySelectorAll('img[data-src]:not([data-loaded="true"])');
  images.forEach(image => {
    if (isInViewport(image)) {
      loadImage(image);
    }
  })
}

function isInViewport(image) {
  const rect = image.getBoundingClientRect();
  return (
    rect.top >= -(window.innerHeight || document.documentElement.clientHeight)*0.5 &&
    rect.bottom <= (window.innerHeight || document.documentElement.clientHeight)*1.8
  )
}

function loadImage(image) {
  // 标记为正在加载
  image.setAttribute('data-loading', 'true');
  
  // 设置加载动画
  const loadingSrc = image.getAttribute('data-loading-src') || DEFAULT_IMAGE_URL;
  if (image.src !== loadingSrc) {
    image.src = loadingSrc;
  }

  // 创建新的图片对象来预加载真实图片
  const imgLoader = new Image();
  
  imgLoader.onload = function() {
    // 加载完成后设置真实图片
    image.src = image.dataset.src;
    image.removeAttribute('data-src');
    image.setAttribute('data-loaded', 'true');
    image.removeAttribute('data-loading');
    
    // 触发自定义加载完成事件
    image.dispatchEvent(new CustomEvent('lazyload-complete', {
      detail: { src: image.dataset.src }
    }));
  };
  
  imgLoader.onerror = function() {
    // 加载失败时使用占位图
    image.src = PLACEHOLDER_IMAGE;
    image.removeAttribute('data-src');
    image.setAttribute('data-loaded', 'true');
    image.removeAttribute('data-loading');
    
    image.dispatchEvent(new CustomEvent('lazyload-error', {
      detail: { src: image.dataset.src }
    }));
  };
  
  // 开始加载真实图片
  imgLoader.src = image.dataset.src;
}

// 初始化lazyload
export function initLazyLoad() {
  // 页面加载时执行一次
  lazyLoad();
  
  // 监听滚动事件
  window.addEventListener('scroll', lazyLoad);
  
  // 监听窗口大小变化
  window.addEventListener('resize', lazyLoad);
}

// 手动触发lazyload（可用于动态添加内容后）
export function triggerLazyLoad() {
  lazyLoad();
}

// 移除监听器（用于组件销毁时）
export function destroyLazyLoad() {
  window.removeEventListener('scroll', lazyLoad);
  window.removeEventListener('resize', lazyLoad);
}

// 为图片元素设置lazyload属性的辅助函数
export function setupLazyImage(imgElement, src, loadingSrc = DEFAULT_IMAGE_URL) {
  if (imgElement && src) {
    imgElement.setAttribute('data-src', src);
    imgElement.setAttribute('data-loading-src', loadingSrc);
    imgElement.setAttribute('data-loaded', 'false');
    
    // 设置初始占位图
    if (!imgElement.src || imgElement.src === '') {
      imgElement.src = PLACEHOLDER_IMAGE;
    }
    
    return imgElement;
  }
  return null;
}