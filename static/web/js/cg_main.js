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
    $('.open-popover').on('click', function () {
      const $this = $(this);
      const $target = $(''.concat($this.data('target')));
      $target.fadeToggle(200);
      $this.toggleClass('text-primary');
      $target.one('mouseleave', function () {
        $target.fadeOut(200);
        $this.removeClass('text-primary');
      });
    });

    setTimeout(() => {
      utils.create_prefetch([
        {
          as: 'style',
          href: '/css/lib/quill.snow.css',
        },
        {
          as: 'style',
          href: '/css/lib/xgplayer.css',
        },

        {
          as: 'script',
          href: '/js/plugins/player.js',
          cache: 1,
        },
        {
          as: 'script',
          href: '/js/lib/hls.js',
          cache: 1,
        },
        {
          as: 'script',
          href: '/js/lib/xgplayer.js',
          cache: 1,
        },
      ]);
    }, 100);
  },



);
