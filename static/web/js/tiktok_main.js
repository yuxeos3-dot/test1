
requirejs.config({
  urlArgs: `v=${js_assets_version}`, // 资源版本号
  baseUrl: '/static/web/js',
  paths: {
    jquery: 'lib/jquery',
    zui: 'lib/zui',
    xgplayer: 'lib/xgplayer',
    player: 'plugins/tiktok-player',
    swiper: 'lib/swiper',
  },
  shim: {
    zui: ['jquery']
  }
})

requirejs(
  [
    'player',
    'plugins/lazyload',
    'http',
    'utils',
    'lib/handlebars',
    'common',
    'jquery',
    'swiper',

  ],
  function (player, lazyload, http, utils, Handlebars, common) {

    const userAgent = navigator.userAgent
    const l_user_agent = userAgent.toLocaleLowerCase()

    const isChrome = /Chrome\/[\d.]+/.test(userAgent) && /Google Inc/.test(navigator.vendor)
    const isIos = l_user_agent.includes('iphone') || l_user_agent.includes('ipad') || l_user_agent.includes('ipod') || l_user_agent.includes('safari') && !isChrome
    let isMuted = false
    lazyload.load_image()
    const isPc = utils.isPc
    const token = utils.get_token()
    // lottie 鼠标滑动提示
    const SHOW_LOTTIE = "_SHOW_LOTTIE_";
    // 是否已经显示过鼠标滑动动画
    let hasShowedLottie = !!window.localStorage.getItem(SHOW_LOTTIE)
    // 是否正在显示鼠标滑动动画
    let isShowLottie = false
    function showLottie() {
      if (isPc && !hasShowedLottie) {
        utils.load_amd_module('lib/lottie', function (lottie) {
          $('.lottie-root').css({
            opacity: 1,
            visibility: 'visible'
          }).on('wheel', function (event) {
            const e = event.originalEvent;
            if (e.deltaY > 0) {
              $('.lottie-root').addClass('slide-up')
            }
          }).on('animationend', hideLottie)
          lottie.loadAnimation({
            container: document.getElementById('lottie-container'),
            renderer: 'svg',
            loop: true,
            autoplay: true,
            path: '/static/web/js/lottie.json' // 本地路径
          });
          isShowLottie = true
        })
      }
    }
    function hideLottie() {
      window.localStorage.setItem(SHOW_LOTTIE, 1)
      isShowLottie = false
      $('.lottie-root').css({
        opacity: 0,
        visibility: 'hidden'
      })
    }
    // 评论分页
    let commentPageMap = new Map()

    $('.close-lottie').on('click', function () {
      hideLottie()
      $('.close-lottie').off('click')
    })

    let userInfo
    const AUTOMIC_CACHE_KEY = '_IS_AUTOMIC_'
    const $video_container = $('.video-container')

    // 是否展开右侧面板
    let isOpenRightPanel = false
    // 视频总数
    let videosCount = 0
    // 视频列表
    let videos = []
    // 开启连播
    let isAutomic = getCache(AUTOMIC_CACHE_KEY)
    // 开启清屏
    let isPure = getCache(player.PURE_CACHE_KEY)
    // 存放播放器实例
    const players = new Map();
    // 快捷键事件key
    const SHORT_CUT_KEYS_MAP = {
      pure: {
        key: "P",
        handler: (val) => {
          utils.bus.emit('pure', val)
        }
      },
      automatic: {
        key: "K",
        handler: () => {
          setAutomic(!isAutomic)
        }
      },
      fullscreen: {
        key: 'H',
        handler: () => {
          const currentPlayer = getActivePlayer();

          if (currentPlayer) {
            if (currentPlayer.isFullscreen) {
              currentPlayer.exitFullscreen()
            } else {
              currentPlayer.getFullscreen()
            }
          }
        }
      },
      like: {
        key: "Z",
        handler: () => {
          console.log('点赞了')
          const $root = getCurrentPlayerRootElement()
          $root.find('.btn-like').trigger('click')
        }
      },
      comment: {
        key: 'X',
        handler: () => {
          console.log('评论了')
          const $root = getCurrentPlayerRootElement()
          $root.find('.video-btn-comment').trigger('click')
        }
      },
      favorite: {
        key: 'C',
        handler: () => {
          console.log('收藏')
          const $root = getCurrentPlayerRootElement()
          $root.find('.btn-favorite').trigger('click')
        }
      },
      creator: {
        key: 'F',
        handler: () => {
          const $root = getCurrentPlayerRootElement()
          $root.find('.video-creator-name').trigger('click')
        }
      },
      follow: {
        key: 'G',
        handler: () => {
          console.log('关注了')
          const $root = getCurrentPlayerRootElement()
          $root.find('.btn-follow').trigger('click')
        }
      },
    }
    // 列表分页
    let page = 1

    const observer = new IntersectionObserver(function (entries, observer) {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          // 1 作者视频 2 评论列表 3 推荐列表;

          const type = entry.target.dataset.type
          if (type === '2') {
            loadData(entry.target)
          } else {
            loadData(entry.target)
            observer.unobserve(entry.target)
          }


        }
      })
    })
    function getCurrentPlayerRootElement() {
      return $(`.tiktok-player-${swiperInstance.activeIndex}`).parents('.swiper-slide')
    }
    function getActivePlayer() {
      return players.get(swiperInstance.activeIndex)
    }

    const SHORT_CUT_KEYS = Object.values(SHORT_CUT_KEYS_MAP)
    function getCache(key) {
      return !!window.localStorage.getItem(key)
    }
    function setAutomic(isOn) {
      isAutomic = isOn
      window.localStorage.setItem(AUTOMIC_CACHE_KEY, isOn ? 1 : '')


      $('.mobile-expand-action .xg-switch[data-type="automatic"]')[isOn ? 'addClass' : 'removeClass']('xg-switch-checked')
      for (const index of players.keys()) {
        const player = players.get(index);
        if (player) {
          const automaticPlugin = player.getPlugin('automatic')
          automaticPlugin.updateSwitchStatus(isOn)
          player.loop = !isOn
        }
      }
    }


    // swiper
    const swiperInstance = new Swiper('.tiktok-wiper', {
      slidesPerView: 1,
      centeredSlides: true,
      spaceBetween: 0,
      direction: 'vertical',
      allowTouchMove: true,
      noSwipingClass: 'xgplayer-controls',
      mousewheel: {
        enabled: isPc,
        noMousewheelClass: isPc ? 'swiper-no-mousewheel' : '',
        thresholdTime: 800,
        sensitivity: 0.4,    // 默认 1，调小一点，手势就不会那么夸张
        thresholdDelta: 50,  // 每次滚动的最小 delta，太小忽略
        releaseOnEdges: true //
      },
      virtual: {
        addSlidesBefore: 2, // 默认值（视图前渲染2个）
        addSlidesAfter: 2,
        cache: false,
        slides: [],
        renderSlide: function (slide, index) {
          return `<div class="swiper-slide swiper-slide-${index}">
          ${!isIos ? `<div class="xgplayer-blur-bg">
            <img class="xgplayer-blur-img" src="/static/web/images/poster_loading.png" data-src="${slide.first_img}" alt="" />
          </div>` : '<div class="absolute left-0 top-0 w-full h-full bg-black"></div>'
            }
          
          <div class="player-wrapper">
            <div class="player-container tiktok-player-${index}" data-id="${slide.id}" data-index="${index}" data-url="${slide.video_url}" data-url265="${slide.video_url_265 || ''}" data-poster="${slide.first_img}"></div>
           
            <div class="video-info-bottom">
              <div class="flex items-center mb-2">
                <span class="video-creator-name xgplayer-open-right-panel" data-index="0">@${slide.user.user_name}</span>
              </div>
              <div class="video-info-desc">
                <span>${slide.video_title}</span>
                ${renderTags(slide.tags)}
              </div>
              <time class="video-create-time" datetime="${slide.add_time}">${slide.add_time}</time>
            </div>
            <div class="video-info-right">
              <div class="grid grid-cols-1 action-panel">
             
                <div class="video-creator-avatar mb-3">
                
                  <div class="xgplayer-right-item">
                    <div class="xgplayer-right-icon relative xgplayer-open-right-panel" data-index="0">
                      <img src="/static/web/images/default.jpeg" class="avatar-image" data-src="${slide.user.avatar}" alt="" />
                      <div class="video-shortcutKey-container">
                        进入作者主页
                        <span class="shortcutKey">${SHORT_CUT_KEYS_MAP.creator.key}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div class="btn-follow btn-follow-user ${getUserStatus(slide.user.user_id, 'focus', index)} type-icon" data-id="${slide.user.user_id}">
                    <div class="xgplayer-right-item">
                    <button class="xgplayer-right-icon">
                      <svg viewBox="0 0 32 33" fill="none" xmlns="http://www.w3.org/2000/svg" width="24px" height="24px" focusable="false">
                        <g filter="url(#filter0_d_38277_51136)">
                        <path fill-rule="evenodd" clip-rule="evenodd" d="M16 26.7319C22.6274 26.7319 28 21.3594 28 14.7319C28 8.10452 22.6274 2.73193 16 2.73193C9.37258 2.73193 4 8.10452 4 14.7319C4 21.3594 9.37258 26.7319 16 26.7319Z" fill="#FE2C55"></path></g><path d="M12 15.7319C11.4477 15.7319 11 15.2842 11 14.7319V14.7319C11 14.1796 11.4477 13.7319 12 13.7319H20C20.5523 13.7319 21 14.1796 21 14.7319V14.7319C21 15.2842 20.5523 15.7319 20 15.7319H12Z" fill="white"></path><path d="M15 10.7319C15 10.1796 15.4477 9.73193 16 9.73193V9.73193C16.5523 9.73193 17 10.1796 17 10.7319V18.7319C17 19.2842 16.5523 19.7319 16 19.7319V19.7319C15.4477 19.7319 15 19.2842 15 18.7319V10.7319Z" fill="white"></path><defs><filter id="filter0_d_38277_51136" x="0" y="0.732" width="32" height="32" filterUnits="userSpaceOnUse" color-interpolation-filters="sRGB"><feFlood flood-opacity="0" result="BackgroundImageFix"></feFlood><feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha"></feColorMatrix><feOffset dy="2"></feOffset><feGaussianBlur stdDeviation="2"></feGaussianBlur><feColorMatrix type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.06 0"></feColorMatrix><feBlend mode="normal" in2="BackgroundImageFix" result="effect1_dropShadow_38277_51136"></feBlend><feBlend mode="normal" in="SourceGraphic" in2="effect1_dropShadow_38277_51136" result="shape"></feBlend></filter></defs>
                      </svg>
                      <div class="video-shortcutKey-container">
                        关注
                        <span class="shortcutKey">${SHORT_CUT_KEYS_MAP.follow.key}</span>
                      </div>
                    </button>
                    </div>
                  </div>
                  
                </div>
                <div class="flex-col-center xgplayer-right-item btn-like ${getUserStatus(slide.id, 'like', index)}" data-id="${slide.id}">
                  <div class="xgplayer-right-icon">
                    <svg class="icon" width="28px" height="28px" viewBox="0 0 38 34" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M37.4749 12.0822C37.4749 12.1263 37.4791 12.1784 37.4791 12.2385C37.4791 13.2885 37.2489 14.3905 36.776 15.6087C36.6044 16.0696 36.3909 16.5384 36.123 17.0474L36.1147 17.0594L36.1021 17.0914L36.0352 17.2037C36.0184 17.2277 36.0017 17.2598 35.9807 17.3038L35.9347 17.388C35.8384 17.5723 35.7129 17.8048 35.5539 18.0492C33.8881 20.8383 31.084 23.9841 27.2168 27.3984C25.2246 29.1576 23.0441 30.9049 20.738 32.584C20.6543 32.6481 20.5957 32.6881 20.5706 32.7082L20.558 32.7202C20.0265 33.1169 19.3736 33.3333 18.7207 33.3333C18.0594 33.3333 17.4275 33.1209 16.8917 32.7242L16.8876 32.7202C16.8666 32.7042 16.8164 32.6681 16.7494 32.62C13.5017 30.2677 10.9989 28.1237 9.47545 26.7372C5.11858 22.7939 2.2433 19.2314 0.929129 16.1577C0.899832 16.0976 0.883091 16.0455 0.86635 16.0095L0.862165 15.9974C0.305524 14.663 0.0251115 13.3966 0.0251115 12.2345C0.0251115 12.2025 0.0251115 12.1624 0.0292967 12.1183C0.0125557 11.962 0 11.7937 0 11.5973C0 5.20157 5.13532 0 11.4467 0C12.9953 0 14.502 0.316582 15.9333 0.94574C16.9545 1.39457 17.9004 1.97964 18.7458 2.70097C19.5912 1.98365 20.5329 1.39457 21.5541 0.94574C22.9897 0.316582 24.5006 0 26.0533 0C32.3647 0 37.5 5.20157 37.5 11.5973C37.5 11.7937 37.4874 11.962 37.4749 12.0822Z" fill="currentColor"/>
                    </svg>
                    <div class="video-shortcutKey-container">
                      点赞
                      <span class="shortcutKey">${SHORT_CUT_KEYS_MAP.like.key}</span>
                    </div>
                  </div>
                  <span class="like-count" data-value="${slide.like_count}">${utils.formatNumber(slide.like_count)}</span>
                </div>
                <div class="flex-col-center xgplayer-right-item">
                  <div class="xgplayer-right-icon xgplayer-open-right-panel video-btn-comment" data-index="1">
                    <svg width="38" height="38" viewBox="0 0 50 50" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path fill-rule="evenodd" clip-rule="evenodd" d="M6.66663 25.4448C6.66663 15.5675 14.5604 6.66666 25.4541 6.66666C36.1041 6.66666 44.1666 15.3985 44.1666 25.3885C44.1666 36.9746 34.7166 44.1667 25.4166 44.1667C22.3416 44.1667 18.9291 43.3404 16.1916 41.7255C15.2354 41.1434 14.4291 40.7115 13.3979 41.0495L9.61038 42.1762C8.65413 42.4766 7.79163 41.7255 8.07288 40.7115L9.32913 36.5052C9.53538 35.923 9.49788 35.3034 9.19788 34.8151C7.58538 31.8482 6.66663 28.5996 6.66663 25.4448ZM22.9791 25.445C22.9791 26.7782 24.0479 27.8486 25.3791 27.8674C26.7104 27.8674 27.7791 26.7782 27.7791 25.4638C27.7791 24.1305 26.7104 23.0602 25.3791 23.0602C24.0666 23.0414 22.9791 24.1305 22.9791 25.445ZM31.6229 25.4639C31.6229 26.7783 32.6916 27.8675 34.0229 27.8675C35.3541 27.8675 36.4229 26.7783 36.4229 25.4639C36.4229 24.1306 35.3541 23.0603 34.0229 23.0603C32.6916 23.0603 31.6229 24.1306 31.6229 25.4639ZM16.7354 27.8674C15.4229 27.8674 14.3354 26.7783 14.3354 25.4638C14.3354 24.1306 15.4041 23.0602 16.7354 23.0602C18.0666 23.0602 19.1354 24.1306 19.1354 25.4638C19.1354 26.7783 18.0666 27.8487 16.7354 27.8674Z" fill="white"/>
                    </svg>

                  </div>
                  <span>${utils.formatNumber(slide.comment_count)}</span>
                  <div class="video-shortcutKey-container">
                    评论
                    <span class="shortcutKey">${SHORT_CUT_KEYS_MAP.comment.key}</span>
                  </div>
                </div>
                <div class="flex-col-center xgplayer-right-item btn-favorite ${getUserStatus(slide.id, 'collect', index)}"  data-id="${slide.id}">
                  <div class="xgplayer-right-icon">
                    <svg width="30" height="30" viewBox="0 0 39 38" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M27.359 36.6605C30.133 37.857 32.5604 36.0753 32.2849 33.058L31.5006 24.4154L38.1328 16.785C39.5814 15.1175 38.862 12.8794 36.7118 12.3871L26.8955 10.1409L21.7427 1.42978C20.6133 -0.475777 18.2751 -0.477407 17.1457 1.42978L11.9913 10.1409L2.17509 12.3871C0.0361969 12.8778 -0.696213 15.1158 0.754023 16.785L7.38622 24.4154L6.47394 34.5169C6.27464 36.7241 8.16562 38.1096 10.1911 37.2343L19.4434 33.2406L27.359 36.6589V36.6605Z" fill="currentColor"/>
                    </svg>
                  </div>
                  <span class="like-count" data-value="${slide.collect_count}">${utils.formatNumber(slide.collect_count)}</span>
                  <div class="video-shortcutKey-container">
                    收藏
                    <span class="shortcutKey">${SHORT_CUT_KEYS_MAP.favorite.key}</span>
                  </div>
                </div>
                 <div class="flex-col-center xgplayer-right-item share-container ${!isPc ? 'btn-copy' : ''}" data-clipboard-text="${slide.detail_full_url}">
                  <div class="xgplayer-right-icon">
                    <svg width="30" height="26" viewBox="0 0 38 34" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M19.554 24.5521C19.554 23.7321 18.8203 23.1116 18.0088 23.2335C12.3394 24.0756 7.41473 27.5441 4.7023 32.5751C4.14647 33.5946 3.1571 34.1597 2.04544 33.9602C0.933789 33.7608 0.0666992 32.8964 0 31.6996V29.5499C0 18.9339 7.77046 9.99121 18.1533 8.56172C18.9648 8.4509 19.5651 7.76386 19.5651 6.95492V2.52236C19.5651 1.48071 20.1543 0.594203 21.0214 0.217436C21.9885 -0.203656 23.0446 -0.00419135 23.8005 0.738261L36.9514 13.8365C37.9296 14.8116 38.0853 16.3519 37.0625 17.3714L23.7783 30.6026C23.0446 31.3229 22.0219 31.5223 21.0992 31.1677C20.2321 30.8353 19.5762 29.9709 19.5762 28.9404V24.5411L19.554 24.5521Z" fill="currentColor"/>
                    </svg>

                  </div>
                 <span>分享</span>
                  ${isPc ? `<div class="video-share-container">
                    <div class="bg-container">
                      <div class="inner">
                        <div class="video-share-title">手机扫码观看/分享</div>
                          <div class='qrcode-container flex-shrink-0'></div>
                          <img class="girl" src="/static/web/images/tiktok/girl.png" alt="" />
                          <button class="video-share-btn-link btn-copy" data-clipboard-text="${slide.detail_full_url}">复制并分享</button>
                        </div>
                      </div>
                    </div>
                  ` : ''
            }
                </div>
               
                 <div class="flex-col-center xgplayer-right-item mobile-volume-button mobile-action-item">
                  <div class="xgplayer-right-icon" data-index="5">
                    ${isMuted ? player.volume_off : player.volume_on}
                  </div>
                </div>

                <div class="flex-col-center xgplayer-right-item xgplayer-controls swiper-no-mousewheel expand-container">
                  <div class="xgplayer-right-icon " data-index="6">
                    <svg width="13" height="4" viewBox="0 0 13 4" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path fill-rule="evenodd" clip-rule="evenodd" d="M11.2 3.20007C12.08 3.20007 12.8 2.48007 12.8 1.60007C12.8 0.720074 12.08 7.43237e-05 11.2 7.42467e-05C10.32 7.41698e-05 9.6 0.720074 9.6 1.60007C9.6 2.48007 10.32 3.20007 11.2 3.20007ZM1.59999 3.20006C2.47999 3.20006 3.19999 2.48006 3.19999 1.60006C3.19999 0.720063 2.47999 6.34708e-05 1.59999 6.33939e-05C0.719992 6.33169e-05 -7.41259e-06 0.720063 -7.48952e-06 1.60006C-7.56645e-06 2.48006 0.719992 3.20006 1.59999 3.20006ZM6.4 3.19998C7.28 3.19998 8 2.47998 8 1.59998C8 0.719982 7.28 -1.78871e-05 6.4 -1.79641e-05C5.52 -1.8041e-05 4.8 0.719982 4.8 1.59998C4.8 2.47998 5.52 3.19998 6.4 3.19998Z" fill="white"/>
                    </svg>
                  </div>
                  <div class="mobile-expand-action">
                      <div class="xgplayer-icon pure-item">
                        <div class="xgplayer-setting-label">
                          <span class="xgplayer-setting-title">清屏</span>
                          <button data-type="pure" class="xg-switch${isPure ? ' xg-switch-checked' : ''}" aria-labelledby="xg-switch-pip" type="button">
                            <span class="xg-switch-inner"></span>
                          </button>
                        </div>
                      </div>
                      <div class="xgplayer-icon">
                        <div class="xgplayer-setting-label">
                          <span class="xgplayer-setting-title">连播</span>
                          <button data-type="automatic" class="xg-switch${isAutomic ? ' xg-switch-checked' : ''}" aria-labelledby="xg-switch-pip" type="button">
                            <span class="xg-switch-inner"></span>
                          </button>
                        </div>
                      </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        
          <div class="tiktok-right-panel swiper-no-mousewheel xgplayer-controls flex-shrink-0 ${isOpenRightPanel ? 'is-open' : ''}">
            <div class="dx-tabs py-3">
              <div class="dx-tab-list flex items-center dx-hairline--bottom px-3">
                <button class="dx-tab flex items-center dx-tab--active">Ta的作品</button>
                <button class="dx-tab flex items-center">评论</button>
                <button class="dx-tab flex items-center">相关推荐</button>
                <button class="btn-close-right-panel"><svg width="36" height="36" fill="none" xmlns="http://www.w3.org/2000/svg" class="Rg2nrszA" viewBox="0 0 36 36"><path d="M22.133 23.776a1.342 1.342 0 1 0 1.898-1.898l-4.112-4.113 4.112-4.112a1.342 1.342 0 0 0-1.898-1.898l-4.112 4.112-4.113-4.112a1.342 1.342 0 1 0-1.898 1.898l4.113 4.112-4.113 4.113a1.342 1.342 0 0 0 1.898 1.898l4.113-4.113 4.112 4.113z" fill="currentColor"></path></svg></button>
              </div>
              <div class="dx-tab-content md:px-0 w-full overflow-hidden dx-tab-content--active">
                <div class="creator-videos h-full flex flex-col">
                  <div class="flex items-center pb-3">
                    <div>
                      <div class="mb-2"><a class="text-xl flex items-center" target="__blank" href="/public-video/${slide.user.id}/list">@${slide.user.user_name}<svg width="14" height="14" fill="none" xmlns="http://www.w3.org/2000/svg" class="" viewBox="-7 -1 19 19"><path fill-rule="evenodd" clip-rule="evenodd" d="M.793 14.23a1 1 0 0 1 0-1.415l5.293-5.293L.793 2.23A1 1 0 0 1 2.207.815l6 6a1 1 0 0 1 0 1.415l-6 6a1 1 0 0 1-1.414 0z" fill="currentColor"></path></svg></a></div>
                      <div class="flex items-center text-sm text-font1">
                        <span>${utils.formatNumber(slide.user.fan_count || 0)}粉丝</span> 
                        <span class="divider"></span>
                        <span>${utils.formatNumber(slide.user.video_count || 0)}作品</span>
                      </div>
                    </div>
                    <button class="btn btn-primary flex items-center ml-auto btn-follow-user ${getUserStatus(slide.user.user_id, 'focus', index)} type-button" data-id="${slide.user.user_id}">
                      <svg viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" focusable="false"><path fill-rule="evenodd" clip-rule="evenodd" d="M7.03 1.5C6.61579 1.5 6.28 1.83579 6.28 2.25L6.28 6.01063L2.25018 6.01064C1.83597 6.01064 1.50018 6.34642 1.50018 6.76064C1.50018 7.17485 1.83597 7.51064 2.25018 7.51064L6.27999 7.51063L6.27998 11.75C6.27998 12.1642 6.61577 12.5 7.02998 12.5C7.4442 12.5 7.77998 12.1642 7.77998 11.75L7.77999 7.51063L11.7498 7.51063C12.164 7.51063 12.4998 7.17484 12.4998 6.76063C12.4998 6.34642 12.164 6.01063 11.7498 6.01063L7.78 6.01063L7.78 2.25C7.78 1.83579 7.44422 1.5 7.03 1.5Z" fill="currentColor"></path></svg>
                      <span>${getUserStatus(slide.user.user_id, 'focus', index) ? '已关注' : '关注'}</span>
                    </button>
                  </div>
                  <div class="flex-1 overflow-auto">
                    <ul class="grid grid-cols-3 gap-2.5 mb-3 creator-videos-container">
                    </ul>
                    <div data-type="1" data-video-id="${slide.id}" data-user-id="${slide.user.user_id}" class="list-loading-placeholder"></div>
                  </div>
                </div>
              </div>
              <div class="dx-tab-content md:px-0 w-full overflow-hidden">
                <div class="flex flex-col h-full">
                  <div class="flex-1 overflow-auto">
                    <div class="video-comments">
                    </div>
                    <div data-type="2" data-video-id="${slide.id}" class="list-loading-placeholder"></div>
                  </div>
                   <div class="flex-shrink-0 flex items-center mb-3 comment-container">
                    <input class="form-control input-comment" placeholder="分享你的感受" type="text" />
                    <button class="btn btn-primary btn-create-comment" data-id="${slide.id}">发表评论</button>
                  </div>
                </div>
              </div>
              <div class="dx-tab-content md:px-0 w-full overflow-auto">
                <ul class="video-recommends grid grid-cols-1 gap-2.5 mb-3">
                </ul>
                <div data-type="3" data-video-id="${slide.id}" class="list-loading-placeholder"></div>
              </div>
            </div>
          </div>
        </div>
        
          `
        },
      },
      on: {
        slideChangeTransitionEnd: function () {
          managePlayers(swiperInstance.activeIndex);
          // 提前加载列表
          if (swiperInstance.activeIndex === videosCount - 3) {
            appendSlides()
          }
          setTimeout(() => {
            $(".expand-container").removeClass('is-expand')
          });
        },
        init: function () {
          initApp().then(((res) => {
            const [items, _userInfo] = res
            if (_userInfo) {
              userInfo = _userInfo
            }
            addSlides(items)
            page++
            videosCount += items.length
            showLottie()
            managePlayers(0);
            $video_container.addClass('is-ready')
            $('.app-loading').css({
              opacity: 0,
              visibility: 'hidden'
            })
          }))

        },
        // 滑动最后加载列表
        reachEnd: function () {

        }
      }
    })
    const creator_video_template = Handlebars.compile($('#creator-video-template').html())
    const video_comment_template = Handlebars.compile($('#comment-template').html())
    const video_recommend_template = Handlebars.compile($('#video-recommend-template').html())
    // 渲染作者视频列表
    function loadData(el) {
      const { type, videoId } = el.dataset
      switch (type) {
        case '1':
          const { userId } = el.dataset
          return fetchCreatorVideos(userId).then((items) => {
            const $root = getCurrentPlayerRootElement().find('.creator-videos-container')
            if (items.length) {
              $root.html(
                creator_video_template({
                  items: items.map(item => {
                    return {
                      ...item,
                      like_count: utils.formatNumber(item.like_count),
                      isPlaying: item.id.toString() === videoId
                    }
                  })
                })
              )
              lazyload.load_image()
              el.remove()
            } else {
              $root.html(renderEmpty('暂无作品'))
              el.remove()
            }
          })
        case '2':
          const page = commentPageMap.get(videoId) || 1
          return fetchVideoComments(videoId, page)
            .then((items) => {
              const $root = getCurrentPlayerRootElement().find('.video-comments')

              if (items.length > 0) {
                commentPageMap.set(videoId, page + 1)
                $root.append(
                  video_comment_template({
                    items: items.map(item => {
                      return {
                        ...item,
                      }
                    })
                  })
                )
                lazyload.load_image()
                if (items.length < 20) {
                  $root.append($('<div class="flex-center py-3">～已经到底了～</div>'))
                  observer.unobserve(el)
                  el.remove()
                }
              } else {
                if (page === 1) {
                  $root.html(renderEmpty('暂无评论'))
                } else {
                  $root.append($('<div class="flex-center py-3">～已经到底了～</div>'))
                }
                observer.unobserve(el)
                el.remove()
              }
            })
        case '3':
          return fetchVideoRecommends(videoId)
            .then((items) => {
              const $root = getCurrentPlayerRootElement().find('.video-recommends')
              if (items.length) {
                $root.html(
                  video_recommend_template({
                    items: items.map(item => {
                      return {
                        ...item,
                        like_count: utils.formatNumber(item.like_count),
                        tags: item.tags.map(tag => `#${tag}`).join(' ')
                      }
                    })
                  })
                )
                lazyload.load_image()
                el.remove()
              } else {
                $root.html(renderEmpty('暂无推荐'))
                el.remove()
              }
            })
        default:
          break;
      }
    }

    // 处理清屏
    utils.bus.on('pure', e => {
      console.log('e: ', e);
      const action = typeof e === 'undefined' ? 'toggleClass' : e ? 'addClass' : 'removeClass'
      $('.tiktok-wiper')[action]('is-pure-mode')
      const status = typeof e === 'undefined' ? !isPure : e
      isPure = status

      window.localStorage.setItem(utils.PURE_CACHE_KEY, status ? 1 : '')

      $('.mobile-expand-action .pure-item .xg-switch')[action]('xg-switch-checked')
    })

    if (!!localStorage.getItem(player.PURE_CACHE_KEY)) {
      $('.tiktok-wiper').addClass('is-pure-mode')
    }
    const $fullscreen = document.querySelector('.tiktok-wiper');
    // 初始化播放器
    function initPlayer(index) {
      const autoplay = index === swiperInstance.activeIndex
      if (players.has(index)) {
        const cachePlayer = players.get(index)
        cachePlayer.muted = isMuted
        if (autoplay) {
          cachePlayer.play();
          cachePlayer.loop = !isAutomic
        }
        return
      }
      const selector = `.tiktok-player-${index}`
      const el = document.querySelector(selector)

      if (!el) return;

      const $root = $(selector).parents('.swiper-slide')
      createQrcode($root.find('.qrcode-container').get(0));


      const playerInstance = player
        .create_player({
          el: el,
          url: el.dataset.url,
          url_265: el.dataset.url265,
          poster: el.dataset.poster,
          muted: isMuted || utils.isAndroid,
          loop: !isAutomic,
          isAutomic: isAutomic,
          autoplay: autoplay || utils.isAndroid,
          autoplayMuted: autoplay || utils.isAndroid,
          automatic: {
            shortcutKey: SHORT_CUT_KEYS_MAP.automatic.key
          },
          playbackRate: isPc,
          fullscreen: isPc ? {
            shortcutKey: SHORT_CUT_KEYS_MAP.fullscreen.key
          } : false,
          closeVideoDblclick: !isPc,
          pure: {
            shortcutKey: SHORT_CUT_KEYS_MAP.pure.key
          },
          fullscreen: {
            target: $fullscreen
          }
        })

      playerInstance.on('automic', setAutomic)
      playerInstance.on('ended', (e) => {
        if (isAutomic && e.player === getActivePlayer() && Math.floor(e.currentTime) === Math.floor(e.duration)) {
          swiperInstance.slideNext()
        }
      })

      if (!autoplay && utils.isAndroid) {
        async function _update(e) {
          console.log('我暂停啦')
          if (e.currentTime > 0 && index !== swiperInstance.activeIndex) {
            try {
              await playerInstance.pause()
              playerInstance.off('timeupdate', _update)
              console.log('我暂停啦')
            } catch (error) {
              console.log(error)
            }
          }
        }
        playerInstance.once('timeupdate', _update)
      }
      // 针对chrome浏览器优化

      playerInstance.on('volumechange', e => {
        isMuted = e.muted
        update_mobile_volume()
      })

      if (autoplay) {
        playerInstance.once('play', (e) => {
          isMuted = e.muted;
          update_mobile_volume()
        })
      }
      players.set(index, playerInstance);

      // 监听右侧面板loading
      $root.find('.list-loading-placeholder').each(function () {
        observer.observe($(this).get(0))
      })
    }

    function destroyPlayer(index) {
      const player = players.get(index);
      if (player) {
        player.destroy();
        players.delete(index);
        const $root = $(`.tiktok-player-${index}`).parents('.swiper-slide')
        $root.find('.qrcode-container').empty()

        $root.find('.list-loading-placeholder').each(function () {
          observer.unobserve($(this).get(0))
        })

        commentPageMap.delete(player.root.dataset.id)
      }
    }

    function pauseAllExcept(indexToPlay) {
      for (const [index, player] of players.entries()) {
        if (index === indexToPlay) {
          // 播放当前 slide 的播放器
          if (player.video.paused) player.play().catch(() => { });
        } else {
          // 暂停其他播放器
          if (!player.video.paused) player.pause();
        }
      }
    }

    function managePlayers(activeIndex) {
      const keep = new Set(utils.isAndroid ? [activeIndex] : [
        activeIndex - 1,
        activeIndex,
        activeIndex + 1
      ]);

      // 初始化应保留的播放器
      keep.forEach((index) => {
        if (index >= 0 && index < videosCount) {
          initPlayer(index);
        }
      });
      pauseAllExcept(activeIndex);

      // 暂停非当前的播放器

      const destoryCache = new Set([
        activeIndex - 2,
        activeIndex - 1,
        activeIndex,
        activeIndex + 1,
        activeIndex + 2
      ]);
      initSwitch(activeIndex)
      // 销毁多余的播放器
      for (const index of players.keys()) {
        if (!destoryCache.has(index)) {
          destroyPlayer(index);
        }
      }

      lazyload.load_image()
    }

    function initSwitch(activeIndex) {
      if (activeIndex === 0) {
        $('.xgplayer-playswitch-next').removeClass('disabled')
        $('.xgplayer-playswitch-prev').addClass('disabled')
      } else if (activeIndex === videosCount - 1) {
        $('.xgplayer-playswitch-next').addClass('disabled')
        $('.xgplayer-playswitch-prev').removeClass('disabled')
      } else {
        $('.xgplayer-playswitch-next').removeClass('disabled')
        $('.xgplayer-playswitch-prev').removeClass('disabled')
      }

    }

    function createQrcode(el) {
      if (isPc) {
        utils.useQrcode(location.href, el)
      }
    }

    function addSlides(items = []) {
      videos = [...videos, ...items]
      swiperInstance.virtual.slides = videos
      swiperInstance.virtual.update()
    }

    // 页面初始化请求
    function initApp() {
      const requestQueue = [fetchVideos(page)]
      if (token) {
        requestQueue.push(common.getUserInfo())
      }
      return Promise.all(requestQueue)
    }

    // 视频列表
    function fetchVideos() {
      return http({
        url: '/api.php/api/video/videolist',
        data: {
          page: page,
        },
        crypto: true
      }).then(res => {
        return res.list
      })

    }
    // 作者作品
    function fetchCreatorVideos(user_id) {
      return http({
        url: '/api.php/api/video/uservideo',
        data: {
          user_id: user_id,
        },
        crypto: true
      }).then(res => {
        return res.list
      })
    }
    // 评论列表
    function fetchVideoComments(video_id, page = 1) {

      return http({
        url: '/api.php/api/video/videocomment',
        data: {
          video_id: video_id,
          page,
          limit: 20
        },
        crypto: true
      }).then(res => {
        return res.list
      })

    }
    // 推荐列表
    function fetchVideoRecommends(video_id) {
      return http({
        url: '/api.php/api/video/videorecommend',
        data: {
          video_id: video_id,
        },
        crypto: true
      }).then(list => {
        console.log('res: ', list);
        return list
      })

    }

    // 动态添加视频
    function appendSlides() {
      return fetchVideos(page).then((items => {
        addSlides(items)
        page++
        videosCount += items.length
      }))
    }
    // 视频标签
    function renderTags(tags = []) {
      tags = Array.isArray(tags) ? tags : typeof tags === 'string' ? tags.split(',') : []
      return tags.map(tag => {
        return `<a class="video-tag" target="__blank" href="/video/search?search=${tag}">#${tag}</a>`
      }).join(' ')
    }
    // 打开右侧面板
    $video_container.on('click', '.xgplayer-open-right-panel', function () {
      const $this = $(this)
      const index = $this.data('index')
      const $parent = $this.parents('.player-wrapper').siblings('.tiktok-right-panel')
      const activeTabIndex = $parent.find('.dx-tab--active').index()
      if (isOpenRightPanel) {
        if (activeTabIndex === index) {
          toggleRightPanel()
        } else {
          $parent.find('.dx-tab').eq(index).addClass('dx-tab--active').siblings().removeClass('dx-tab--active')
          $parent.find('.dx-tab-content')
            .eq(index)
            .addClass('dx-tab-content--active')
            .siblings()
            .removeClass('dx-tab-content--active')
        }
      } else {
        toggleRightPanel()
        $parent.find('.dx-tab').eq(index).addClass('dx-tab--active').siblings().removeClass('dx-tab--active')
        $parent.find('.dx-tab-content')
          .eq(index)
          .addClass('dx-tab-content--active')
          .siblings()
          .removeClass('dx-tab-content--active')
      }

    })

    $video_container.on('click', '.btn-close-right-panel', function () {
      toggleRightPanel()
    })
    function toggleRightPanel() {
      isOpenRightPanel = !isOpenRightPanel

      const action = isOpenRightPanel ? 'addClass' : 'removeClass'
      $('.tiktok-right-panel')[action]('is-open');
    }

    // 右侧switch
    $(".xgplayer-playswitch-item").on('click', utils.throttle(function () {
      if (isShowLottie) {
        $('.lottie-root').addClass('slide-up')
      } else {
        const num = $(this).data('num')
        const action = num === 1 ? 'slideNext' : 'slidePrev'
        swiperInstance[action]()
      }
    }, 800))
    if (isPc) {
      // 空格键同步拦截：阻止默认滚动 & 阻止焦点元素的 click，并手动控制活跃播放器
      window.addEventListener('keydown', (event) => {
        if (event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA') {
          return
        }
        if (event.key === ' ' || event.code === 'Space' || event.keyCode === 32) {
          event.preventDefault()
          event.stopImmediatePropagation()
          if (event.target && typeof event.target.blur === 'function') {
            event.target.blur()
          }
          const activePlayer = getActivePlayer()
          if (activePlayer) {
            activePlayer.paused ? activePlayer.play() : activePlayer.pause()
          }
        }
      }, true);
      // 热键
      window.addEventListener('keydown', utils.debounce((event) => {
        if (event.target.tagName === 'INPUT') {
          return
        }
        const key = event.key;
        const _key = key.toUpperCase()
        if (key === ' ' || event.code === 'Space' || event.keyCode === 32) {
          return
        }
        const shortcutEvent = SHORT_CUT_KEYS.find(item => item.key === _key)
        if (shortcutEvent) {
          shortcutEvent.handler()
        } else {
          switch (_key) {
            case "ARROWUP":
            case "W":
              swiperInstance.slidePrev()
              break;
            case "S":
            case "ARROWDOWN":
              if (isShowLottie) {
                $('.lottie-root').addClass('slide-up')
              } else {
                swiperInstance.slideNext();
              }
              break;
            default:
              break;
          }
        }
      }));
    }

    $('.video-container').on('click', '.dx-tab', function () {
      const $this = $(this)
      const index = $this.index()
      $this
        .addClass('dx-tab--active')
        .siblings()
        .removeClass('dx-tab--active')
        .parents('.dx-tab-list')
        .siblings('.dx-tab-content')
        .removeClass('dx-tab-content--active')
        .eq(index)
        .addClass('dx-tab-content--active')
    })


    // 状态
    function getUserStatus(videoId, type, index) {
      if (userInfo) {
        const isIn = userInfo[type].includes(videoId.toString())
        return isIn ? 'user-active' : ''
      }
      return ''
    }
    // 更新状态
    function updateUserStatus(videoId, type) {
      videoId = videoId.toString()
      if (userInfo) {
        const target = userInfo[type];
        const index = target.indexOf(videoId);
        if (index >= 0) {
          target.splice(index, 1)
          getCurrentPlayerRootElement().find('.type-button span').text('关注')
        } else {
          target.push(videoId)
          getCurrentPlayerRootElement().find('.type-button span').text('已关注')
        }
      }
    }


    // 关注用户
    $video_container.on('click', '.btn-follow-user', async function () {
      try {
        const user_id = $(this).data('id')
        await http({
          url: '/api.php/api/video/focus',
          data: {
            user_id: user_id,
            token: token
          },
          _options: {
            showError: true
          },
          crypto: true
        })
        $('.btn-follow-user').toggleClass('user-active')
        updateUserStatus(user_id, 'focus')
      } catch (error) {

      }
    })
    // 视频点赞
    $video_container.on('click', '.btn-like', async function () {
      try {
        const $this = $(this)
        const video_id = $this.data('id')
        await http({
          url: '/api.php/api/video/like',
          data: {
            video_id: video_id,
            token: token
          },
          _options: {
            showError: true
          },
          crypto: true
        })
        $this.toggleClass('user-active')
        updateUserStatus(video_id, 'like')
        const isLike = $this.hasClass('user-active')

        const $span = $this.find('.like-count')
        const count = Number($span.data('value'))
        $span.text(utils.formatNumber(isLike ? count + 1 : Math.max(0, count - 1)))
      } catch (error) {
      }
    })

    // 视频收藏
    $video_container.on('click', '.btn-favorite', async function () {
      const $this = $(this)
      const video_id = $this.data('id')
      try {
        await http({
          url: '/api.php/api/video/collect',
          data: {
            video_id: video_id,
            token: token
          },
          _options: {
            showError: true
          },
          crypto: true
        })
        $this.toggleClass('user-active')
        updateUserStatus(video_id, 'collect')
        const isLike = $this.hasClass('user-active')

        const $span = $this.find('.like-count')
        const count = Number($span.data('value'))
        $span.text(utils.formatNumber(isLike ? count + 1 : Math.max(0, count - 1)))
      } catch (error) {
      }
    })

    let reply = null
    // 发起评论
    $video_container.on('click', '.btn-create-comment', async function () {
      try {
        const $this = $(this)
        const $root = getCurrentPlayerRootElement()
        const $input = $root.find('.input-comment')
        const content = $input.val();
        if (!content) {
          return $input.focus()
        }
        const video_id = $this.data('id')

        await http({
          url: '/api.php/api/video/addcomment',
          data: {
            token,
            content,
            video_id,
            comment_id: reply ? reply.comment_id : 0
          },
          _options: {
            showSuccess: true,
            showError: true
          },
          crypto: true
        })
        $input.val('')
      } catch (error) {
      }
    })
    // 回复评论
    $video_container.on('click', '.btn-reply', async function () {
      const $this = $(this)
      const $root = getCurrentPlayerRootElement()
      const $input = $root.find('.input-comment')
      const nickname = $this.data('nickname')
      const comment_id = $this.data('commentId')
      reply = {
        nickname,
        comment_id
      }
      if (nickname) {
        $input.attr({
          placeholder: `@${nickname}`
        })
      } else {
        $input.attr({
          placeholder: `分享你的感受`
        })
      }
      if (!$input.val()) {
        return $input.focus()
      }
    })

    // 移动端展开更多
    $video_container.on('click', '.expand-container', function (e) {
      if (e.target.closest('.mobile-expand-action')) {
        return
      }
      $(this).toggleClass('is-expand')
    })
    // 移动端弹框清屏连播
    $video_container.on('click', '.mobile-expand-action .xg-switch', function () {
      const $this = $(this)
      const type = $this.data('type')
      $this.toggleClass('xg-switch-checked')

      const item = SHORT_CUT_KEYS_MAP[type]

      if (item) {
        item.handler($this.hasClass('xg-switch-checked'))
      }
    })
    function update_mobile_volume() {
      $('.mobile-volume-button .xgplayer-right-icon').html(
        isMuted ? player.volume_off : player.volume_on
      )
    }
    // 移动端音量
    $video_container.on('click', '.mobile-volume-button', function () {
      isMuted = !isMuted
      for (const index of players.keys()) {
        const player = players.get(index);
        if (player) {
          player.muted = isMuted
        }
      }
      update_mobile_volume()
    })


    $(document).on('click', function (event) {
      const $target = $(event.target)
      if ($target.parents('.comment-container').length == 0 && !$target.hasClass('btn-reply')) {
        reply = null
        const $root = getCurrentPlayerRootElement()
        const $input = $root.find('.input-comment');
        $input.val('')
        $input.attr({
          placeholder: `分享你的感受`
        })
      }
    })

    function renderEmpty(tip = '暂无数据') {
      return $(`<div class="empty-container">
      <svg viewBox="0 0 64 41" class="empty-image">
        <g transform="translate(0 1)" fill="none" fill-rule="evenodd">
          <ellipse fill="currentColor" cx="32" cy="33" rx="32" ry="7"></ellipse>
          <g stroke="currentColor">
            <path d="M55 12.76L44.854 1.258C44.367.474 43.656 0 42.907 0H21.093c-.749 0-1.46.474-1.947 1.257L9 12.761V22h46v-9.24z"></path>
            <path d="M41.613 15.931c0-1.605.994-2.93 2.227-2.931H55v18.137C55 33.26 53.68 35 52.05 35h-40.1C10.32 35 9 33.259 9 31.137V13h11.16c1.233 0 2.227 1.323 2.227 2.928v.022c0 1.605 1.005 2.901 2.237 2.901h14.752c1.232 0 2.237-1.308 2.237-2.913v-.007z" fill="currentColor"></path>
            </g>
            </g>
          </svg>
          <span class="empty-tip">${tip}</span>
      </div>`)
    }



    function isPWA() {
      return window.navigator.standalone || window.matchMedia('(display-mode: standalone)').matches
    }
    if (utils.isMobile) {
      if (!isPWA()) {
        const pwa_session_key = '__pwa__dialog__';
        const is_hide_pwa = localStorage.getItem(pwa_session_key);
        if (!is_hide_pwa) {
          const $pwa = $('.dx-pwa-dialog');
          document.documentElement.style.setProperty('--pwa-height', '70px');
          $pwa.show();

          $('.dx-pwa-close').on('click', function () {
            document.documentElement.style.setProperty('--pwa-height', '0px');
            $pwa.fadeOut();
            localStorage.setItem(pwa_session_key, 1);
          });
          $('.dx-open-pwa').on('click', function () {

            if (utils.isPhone) {
              $('.swiper-wrapper.and-swiper').remove();
            } else {
              $('.swiper-wrapper.ios-swiper').remove();
            }
            new Swiper('.swiper', {
              loop: true,
              autoplay: false,
              pagination: {
                el: '.swiper-pagination',
              },
            });
            $('#pwa_modal').modal({
              position: '160px',
              show: true,
              backdrop: 'static',
            });
          });
        }
      }
    }

  }
)
