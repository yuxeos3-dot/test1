define([], function () {
  function throttle(func, delay) {
    let timerId
    let lastExecTime = 0

    return function (...args) {
      const now = Date.now()
      const timeSinceLastExecution = now - lastExecTime

      if (!timerId && timeSinceLastExecution >= delay) {
        func.apply(this, args)
        lastExecTime = now
      } else if (!timerId) {
        timerId = setTimeout(() => {
          func.apply(this, args)
          lastExecTime = Date.now()
          timerId = null
        }, delay - timeSinceLastExecution)
      }
    }
  }
  // css 版本号由页面模板输出（LibHtml::get_assets_version）；纯静态页未声明时兜底
  const css_version = typeof css_assets_version === 'undefined' ? '1.0.0' : css_assets_version
  const ua = navigator.userAgent
  const isWindowsPhone = /(?:Windows Phone)/.test(ua)
  const isSymbian = /(?:SymbianOS)/.test(ua) || isWindowsPhone
  const isAndroid = /(?:Android)/.test(ua)
  const isFireFox = /(?:Firefox)/.test(ua)
  const isIpad =
    (/(?:iPad|PlayBook|Macintosh)/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)) &&
    'ontouchend' in document
  const isTablet = isIpad || (isAndroid && !/(?:Mobile)/.test(ua)) || (isFireFox && /(?:Tablet)/.test(ua))
  const isPhone = /(?:iPhone)/.test(ua) && !isTablet
  const isPc = !isPhone && !isAndroid && !isSymbian && !isTablet && !isIpad

  const isMobile = !isPc

  function format_url_search_params(merge_params = {}) {
    const params = new URLSearchParams(window.location.search)
    const result = {}

    for (const [key, value] of params.entries()) {
      result[key] = value
    }
    const merged_params = {
      ...result,
      ...merge_params
    }
    const entries = Object.entries(merged_params)
    const paramString = entries
      .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
      .join('&')
    return paramString
  }

  function build_pager_url(page) {
    const params = new URLSearchParams(window.location.search)
    if (Number(page) <= 1) {
      params.delete('page')
    } else {
      params.set('page', String(page))
    }
    const qs = params.toString()
    return qs ? `${window.location.pathname}?${qs}` : window.location.pathname
  }

  function load_amd_module(module_paths, resolve_callback) {
    return new Promise((resolve) => {
      if (module_paths) {
        module_paths = Array.isArray(module_paths) ? module_paths : [module_paths]
        if (typeof resolve_callback === 'function') {
          require(module_paths, (...args) => {
            resolve_callback(...args)
            resolve(...args)
          })
        } else {
          require(module_paths, resolve)
        }
      } else {
        resolve()
      }
    })
  }

  function create_prefetch(resources = []) {
    const step = resources.length

    if (step) {
      const fragment = document.createDocumentFragment()
      for (let i = 0; i < step; i++) {
        const resource = resources[i]
        const { as, href, cache } = resource

        if (as === 'external') {
          const { tag, attrs } = resource
          const el = document.createElement(tag)
          Object.keys(attrs).forEach(attr => {
            el[attr] = attrs[attr]
          })
          el.style.display = 'none'
          fragment.append(el)
        } else {
          const link = document.createElement('link')
          link.rel = 'prefetch'
          link.as = as
          const version = as === 'style' ? css_version : js_assets_version

          link.href = cache ? '/static/web/' + `${href}?v=${version}` : '/static/web/' + `${href}`
          fragment.append(link)
        }
        const link = document.createElement('link')
      }

      document.head.appendChild(fragment)
    }
  }

  function useQrcode(text, el = '#qrCode', config = {}) {
    load_amd_module('lib/qrcode', function () {
      const $el = typeof el === 'string' ? document.querySelector(el) : el
      if ($el) {
        new QRCode($el, {
          text,
          width: 100,
          height: 100,
          colorDark: '#000000',
          colorLight: '#ffffff',
          correctLevel: QRCode.CorrectLevel.M,
          ...config
        })
      }
    })
  }

  function getCurrentDate() {
    const now = new Date()
    const year = now.getFullYear()
    const month = String(now.getMonth() + 1).padStart(2, '0')
    const day = String(now.getDate()).padStart(2, '0')
    return ''.concat(year, '-').concat(month, '-').concat(day)
  }

  function formatNumber(num) {
    if (typeof num !== 'number') {
      num = Number(num)
      if (isNaN(num)) return ''
    }

    if (num >= 10000) {
      return (num / 10000).toFixed(1).replace(/\.0$/, '') + '万'
    } else {
      return num.toString()
    }
  }

  const TOKEN_KEY = '_USER_TOKEN_KEY_'
  function get_token() {
    return window.localStorage.getItem(TOKEN_KEY) || ''
  }

  function set_token(token) {
    window.localStorage.setItem(TOKEN_KEY, token)
  }
  function remove_token() {
    window.localStorage.removeItem(TOKEN_KEY)
  }

  function getCookie(name) {
    const match = document.cookie.match(new RegExp('(?:^|; )' + encodeURIComponent(name) + '=([^;]*)'))
    return match ? decodeURIComponent(match[1]) : null
  }

  function setCookie(name, value, options = {}) {
    let cookieString = `${encodeURIComponent(name)}=${encodeURIComponent(value)}`

    if (options.expires) {
      if (typeof options.expires === 'number') {
        const date = new Date()
        date.setTime(date.getTime() + options.expires * 1000)
        cookieString += `; expires=${date.toUTCString()}`
      } else if (options.expires instanceof Date) {
        cookieString += `; expires=${options.expires.toUTCString()}`
      }
    }

    if (options.path) {
      cookieString += `; path=${options.path}`
    }

    if (options.domain) {
      cookieString += `; domain=${options.domain}`
    }

    if (options.secure) {
      cookieString += `; secure`
    }

    if (options.sameSite) {
      cookieString += `; samesite=${options.sameSite}`
    }

    document.cookie = cookieString
  }

  function debounce(fn, delay = 250, immediate = true) {
    let timer = null;
    return function (...args) {
      const callNow = immediate && !timer;
      clearTimeout(timer);
      timer = setTimeout(() => {
        timer = null;
        if (!immediate) fn.apply(this, args);
      }, delay);
      if (callNow) fn.apply(this, args);
    };
  }

  function createEventBus() {
    const map = new Map();

    function on(event, fn) {
      if (!map.has(event)) map.set(event, new Set());
      map.get(event).add(fn);
      // 返回取消订阅函数，方便用
      return () => off(event, fn);
    }

    function once(event, fn) {
      const wrap = (...args) => {
        off(event, wrap);
        fn(...args);
      };
      return on(event, wrap);
    }

    function off(event, fn) {
      if (typeof event === 'undefined') {
        map.clear();
        return;
      }

      const set = map.get(event);
      if (!set) return;

      if (typeof fn === 'undefined') {
        map.delete(event);
        return;
      }

      set.delete(fn);
      if (set.size === 0) map.delete(event);
    }

    function emit(event, ...args) {
      const set = map.get(event);
      if (!set) return;
      [...set].forEach(fn => fn(...args));
    }

    function clear(event) {
      if (typeof event === 'undefined') map.clear();
      else map.delete(event);
    }

    return { on, once, off, emit, clear };
  }

  const bus = createEventBus()

  function set_cookie(name, value, days) {
    const date = new Date()
    date.setTime(date.getTime() + days * 24 * 60 * 60 * 1000)
    const expires = `expires=${date.toUTCString()}`
    document.cookie = `${name}=${value}; ${expires};path=/;domain=${document.domain}`
  }

  function get_cookie(name) {
    const prefix = `${name}=`
    const cookies = document.cookie.split(';')
    for (let i = 0; i < cookies.length; i++) {
      const cookie = cookies[i].trim()
      if (cookie.indexOf(prefix) === 0) {
        return cookie.substring(prefix.length, cookie.length)
      }
    }
    return ''
  }

  function remove_cookie(name) {
    document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/;domain=${document.domain}`
  }

  return {
    throttle,
    isPc: isPc,
    useQrcode,
    isMobile: isMobile,
    isAndroid,
    isPhone,
    create_prefetch,
    load_amd_module,
    format_url_search_params,
    build_pager_url,
    getCurrentDate,
    formatNumber,
    get_token,
    set_token,
    remove_token,
    getCookie,
    setCookie,
    get_cookie,
    set_cookie,
    remove_cookie,
    debounce,
    bus
  }
})
