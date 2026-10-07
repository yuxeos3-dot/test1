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
    'plugins/lazyload',
    'http',
    'lib/clipboard',
    'lib/handlebars',
    'plugins/db',
    'utils',
    'lib/swiper',
    'common',
  ],
  function (lazyload, http, Clipboard, Handlebars, db, utils) {
    lazyload.load_image()
    const clipboard = new Clipboard('.btn-share');
    clipboard.on('success', function (e) {
      new $.zui.Messager('复制成功', {
        time: 2000,
        close: false,
        type: 'success',
      }).show();

      $('.share-container').addClass('is-success');
    });

    $('.btn-show-share').on('click', function () {
      $('.share-container').removeClass('is-success').toggleClass('is-open');

      $(this).toggleClass('is-open');
    });
    new Swiper('.swiper', {
      loop: true,
      autoplay: true,
      pagination: {
        el: '.swiper-pagination',
      },
    });
    const params = new URLSearchParams(window.location.search);

    async function get_comments(page) {
      const id = $('.comment-show').data('id');
      //console.log('id...', id);
      try {
        const result = await http({
          url: '/novel/comment',
          method: 'get',
          data: {
            id,
            page,
          },
          _options: {
            showError: true,
          },
        });

        var my_pager = $('.pager').data('zui.pager');

        my_pager.set(result.page, result.count, 10);

        //console.log('data... ',result.data);
        const item_hbs = $('#comment-template').html();
        const template = Handlebars.compile(item_hbs);
        $('.comments').html(
          template({
            items: result.data,
          })
        );

        $('#comment-input').val('');
        lazyload.load_image();
      } catch (e) {
        return Promise.reject(e);
      }
    }

    $('.dx-tab-content').on('click', '.btn-comment,.btn-create-comment', async function () {
      const id = $(this).data('id');
      const comment_id = $(this).data('comment_id');
      let comment_key = '#comment-input';
      if (comment_id > 0) {
        comment_key = '#comment-input-' + comment_id;
      }

      const value = $(comment_key).val();

      try {
        const result = await http({
          url: '/novel/add-comment',
          method: 'post',
          data: {
            id,
            comment_id,
            value,
          },
          _options: {
            showError: true,
          },
        });

        const comment_num = result.num || 0;
        if (comment_num > 0) {
          $('.comment-num').text(`(` + comment_num + `)`);
        }
        new $.zui.Messager('评论成功-待审核', {
          time: 3000,
          type: 'success',
          close: false
        }).show()
        get_comments(1);
      } catch (error) {
        $(this).attr('disabled', false);
        console.log('_e: ', error);
      }
    });

    // 评论-end
    $('.comment-show').on('click', async function () {
      const id = $(this).data('id');
      try {
        get_comments(1);
      } catch (error) {
        $(this).attr('disabled', false);
        console.log('_e: ', error);
      } finally {
        $(this).attr('disabled', false);
      }
    });

    $('.pager').pager({
      page: 1,
      onPageChange: function onPageChange(state, oldState) {
        if (state.page !== oldState.page) {
          get_comments(state.page);
        }
      },
    });
    $("#btn-expand").on('click', function () {
      $(this).parent().toggleClass('is-expand')
    })
    $('.dx-tabs').on('click', '.dx-tab', function () {
      const $this = $(this);
      const index = $this.index();
      $this.addClass('dx-tab--active').siblings().removeClass('dx-tab--active').parents('.dx-tab-list').siblings('.dx-tab-content').removeClass('dx-tab-content--active').eq(index).addClass('dx-tab-content--active');
    });
    $('.comments').on('click', '.btn-reply', function () {
      const $root = $(this).parents('.video-comment');
      const user_name = $(this)
        .siblings('div')
        .find('.avatar-link')
        .text()
        .trim();
      const $c = $root.find('.reply-container');
      $c.find('input').attr('placeholder', '\u56DE\u590D'.concat(user_name));
      $c.show();
      setTimeout(() => {
        $c.find('input').focus();
      }, 0);
    });
    try {
      db.set({
        db_name: 'novel_records',
        table_name: 'records',
        data: _detail_,
      });
    } catch (error) { }

    const token = utils.get_token()
    if (token) {
      $(".btn-create-comment").removeClass('btn-login').text('发表留言')
    }
  }
);
