"use strict";

requirejs.config({
  urlArgs: "v=".concat(js_assets_version),
  // 资源版本号
  baseUrl: '/static/web/js',
  paths: {
    jquery: 'lib/jquery',
    zui: 'lib/zui',
      clipboard: 'lib/clipboard',
  },
  shim: {
    zui: ['jquery']
  }
});
requirejs(['plugins/lazyload','clipboard', 'jquery', 'common'], function (lazyload, Clipboard) {
  lazyload.load_image();

    const clipboard = new Clipboard('.btn-share');
    clipboard.on('success', function (e) {
        new $.zui.Messager('复制成功', {
            time: 2000,
            close: false,
            type: 'success'
        }).show();
    });
});
