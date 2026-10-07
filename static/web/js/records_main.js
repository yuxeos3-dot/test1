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
  [
    'jquery',
    'plugins/lazyload',
    'utils',
    'plugins/db',
    'lib/handlebars',
    'video_helper',
    'common',
  ],
  function ($, lazyload, utils, db, Handlebars) {
    const params = new URLSearchParams(window.location.search);
    const legacyPageMatch = window.location.pathname.match(/\/index\/records\/(\d+)\/?$/);
    const requestedPage = params.get('page') || (legacyPageMatch && legacyPageMatch[1]);
    const currentPage = Number.isInteger(Number(requestedPage)) && Number(requestedPage) > 0
      ? Number(requestedPage)
      : 1;
    const recordsPath = window.location.pathname.replace(/\/\d+\/?$/, '') || '/index/records';
    const type = params.get('cate') || 'video';
    $('.record-tabs .dx-line-tab-item').each(function (index) {
      const cate = $(this).data('cate');
      if ((cate && cate === type) || index === 0) {
        $(this).addClass('is-active').siblings().removeClass('is-active');
      }
    });

    $('.btn-delete').on('click', function () {
      const database = [
        'video_records',
        'cg_records',
        'novel_records',
        'av_records',
      ];

      Promise.all(
        database.map((db_name) => {
          return delete_database(db_name);
        })
      ).then(() => {
        new $.zui.Messager('清除成功', {
          time: 2000,
          close: false,
          type: 'success',
        }).show();
        render_empty();
      });
    });

    function delete_database(db_name) {
      return new Promise((resolve) => {
        var request = indexedDB.open(db_name, 1);
        request.onsuccess = function (event) {
          var db = event.target.result;
          if (db.objectStoreNames.length > 0) {
            try {
              var transaction = db.transaction(['records'], 'readwrite');
              var store = transaction.objectStore('records');
              var clearRequest = store.clear();
              clearRequest.onsuccess = resolve;
              clearRequest.onerror = (e) => {
                console.log('e: ', e);
                resolve();
              };
              transaction.oncomplete = resolve;
              transaction.onerror = function (event) {
                console.log('事务失败:', event.target.error);
                resolve();
              };
            } catch (error) {
              console.log('error: ', error);
              resolve();
            }
          } else {
            resolve();
          }
        };
      });
    }

    function render_empty() {
      const item_hbs = $('#empty-template').html();
      const template = Handlebars.compile(item_hbs);
      $('.records-container').html(template());
    }
    function render_pager(recTotal) {
      $('.pager').pager({
        page: currentPage,
        recTotal,
        recPerPage: 12,
        linkCreator: function linkCreator(page) {
          return buildPagerUrl(page);
        },
        onPageChange: function onPageChange(state, oldState) {
          if (state.page !== oldState.page) {
            window.location.href = buildPagerUrl(state.page);
          }
        },
      });
    }
    function buildPagerUrl(page) {
      const pagerParams = new URLSearchParams(window.location.search);
      const targetPage = Number.isInteger(Number(page)) && Number(page) > 0 ? Number(page) : 1;
      // Page URLs are canonicalized by the backend as /index/records/{page}.
      // Put the page in the path directly so navigation does not incur a 301.
      pagerParams.delete('page');
      const query = pagerParams.toString();
      const path = targetPage > 1 ? `${recordsPath}/${targetPage}` : recordsPath;
      return query ? `${path}?${query}` : path;
    }
    db.get({
      db_name: ''.concat(type, '_records'),
      table_name: 'records',
      options: {
        offset: currentPage,
        limit: 12,
      },
    }).then(({ items, total }) => {
      if (items.length) {
        render_list(items, type);
        render_pager(total);
      } else {
        render_empty();
      }
    });
    const pattern = /^(?:https?:\/\/)?[^/]+(\/.*)$/;
    function render_list(items, type) {
      const item_hbs = $('#'.concat(type, '-template')).html();
      const template = Handlebars.compile(item_hbs);
      $('.records-container').html(
        template({
          items: items.map(function (item) {
            return Object.assign(item, {
              poster: prefix + item.poster.replace(pattern, '$1'),
            });
          }),
        })
      );
      lazyload.load_image();
      lazyload.load_bg_image();
    }
  }
);
