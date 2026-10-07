'use strict';

requirejs.config({
  urlArgs: 'v='.concat(js_assets_version),
  // 资源版本号
  baseUrl: '/static/web/js',
  paths: {
    jquery: 'lib/jquery',
    zui: 'lib/zui',
  },
  shim: {
    zui: ['jquery'],
  },
});
requirejs(
  ['jquery', 'plugins/lazyload', 'utils', 'video_helper', 'common'],
  function ($, lazyload, utils) {
    lazyload.load_image();
    lazyload.load_bg_image();

    setTimeout(() => {
      utils.create_prefetch([
        {
          as: 'style',
          href: 'css/lib/xgplayer.css',
        },
        {
          as: 'style',
          href: 'css/lib/swiper.css',
        },
        {
          as: 'script',
          href: 'js/lib/xgplayer.js',
        },
        {
          as: 'script',
          href: 'js/lib/hls.js',
        },
        {
          as: 'script',
          href: 'js/lib/swiper.js',
        },
        {
          as: 'script',
          href: `js/plugins/player.js`,
        },
        {
          as: 'script',
          href: `js/plugins/db.js`,
        },
      ]);
    }, 100);

    if (utils.isMobile) {
      const pwa_session_key = '__pwa__dialog__';
      const is_hide_pwa = sessionStorage.getItem(pwa_session_key);
      if (!is_hide_pwa) {
        const $pwa = $('.dx-pwa-dialog');

        $pwa.show();

        $('.dx-pwa-close').on('click', function () {
          $pwa.fadeOut();
          sessionStorage.setItem(pwa_session_key, 1);
        });
        function execute_async_task(fn_task) {
          return new Promise((resolve) => {
            fn_task(resolve);
          });
        }
        $('.dx-open-pwa').on('click', function () {
          Promise.all([
            execute_async_task((resolve) => {
              const link = document.createElement('link');
              link.href = '/static/web/css/lib/swiper.css';
              link.rel = 'stylesheet';
              document.head.appendChild(link);

              link.onload = resolve;
            }),
            execute_async_task((resolve) => {
              utils.load_amd_module('lib/swiper', resolve);
            }),
          ]).then(() => {
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
        });
      }
    }
  }
);
