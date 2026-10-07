/*
 * @Author: li jin dexing.2723@gmail.com
 * @Date: 2025-02-10 13:54:56
 * @LastEditors: li jin dexing.2723@gmail.com
 * @LastEditTime: 2025-05-19 14:17:55
 * @FilePath: /91pron_web/public/static/web/js/hot_search_main.js
 * @Description: 
 * 
 * Copyright (c) 2025 by ${git_name_email}, All Rights Reserved. 
 */
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
requirejs(['jquery', 'utils', 'common'], function ($, utils) {
  const params = new URLSearchParams(window.location.search);
  $('.pager').pager({
    page: Number(params.get('page') || 1),
    linkCreator: function linkCreator(page) {
      return utils.build_pager_url(page);
    },
    onPageChange: function onPageChange(state, oldState) {
      if (state.page !== oldState.page) {
        window.location.href = utils.build_pager_url(state.page);
      }
    },
  });
});
