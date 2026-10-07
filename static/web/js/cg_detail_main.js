'use strict';

requirejs.config({
  urlArgs: 'v='.concat(js_assets_version),
  // 资源版本号
  baseUrl: '/static/web/js',
  paths: {
    jquery: 'lib/jquery',
    zui: 'lib/zui',
    xgplayer: 'lib/xgplayer',
    hlsPlugin: 'lib/xgplayer-hlsjs',
    player: 'plugins/player',
    clipboard: 'lib/clipboard',
  },
  shim: {
    zui: ['jquery'],
    hlsPlugin: ['xgplayer'],
  },
});
requirejs(
  [
    'player',
    'plugins/lazyload',
    'http',
    'clipboard',
    'lib/handlebars',
    'plugins/db',
    'utils',
    'jquery',
    'video_helper',
    'common',
  ],
  function (player, lazyload, http, Clipboard, Handlebars, db, utils) {
    let url = '';
    try {
      if (typeof track_vtt) {
        const blob = new Blob([track_vtt], {
          type: 'text/plain',
        });
        url = URL.createObjectURL(blob);
      }
    } catch (error) { }
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
    lazyload.load_image();
    lazyload.load_image('file');
    const params = new URLSearchParams(window.location.search);

    const options = {
      rootMargin: '200px'
    }
    const video_observer = new IntersectionObserver(function (entries, observer) {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const el = entry.target
          const video = el.querySelector('video')
          player.create_player({
            el: el,
            url: video.querySelector('source').getAttribute('src'),
            // H.265 优先地址，模板未输出该属性时为空，自动走 264（零回归）
            url_265: video.getAttribute('data-url-265') || '',
            poster: video.getAttribute('poster'),
            pip: {
              showIcon: true,
              preferDocument: false,
              index: 1,
            },
            volume: {
              index: 7,
            },
            autoplay: false,
            muted: false,
            autoplayMuted: false,
            // 字幕，
            track: {
              url: url,
              language: 'zh-cn',
              label: '字幕1',
            },
          });

          observer.unobserve(el);
        }
      });
    }, options);
    $.each($('.player'), function (index, el) {
      video_observer.observe(el)
    });
    $('.dx-tabs').on('click', '.dx-tab', function () {
      const $this = $(this);
      const index = $this.index();
      $this
        .addClass('dx-tab--active')
        .siblings()
        .removeClass('dx-tab--active')
        .parents('.dx-tab-list')
        .siblings('.dx-tab-content')
        .removeClass('dx-tab-content--active')
        .eq(index)
        .addClass('dx-tab-content--active');
    });

    async function get_comments(page) {
      const key = params.get('key');
      // 获取单个元素
      const element = document.querySelector('.btn-comment');
      const melon_id = element.getAttribute('data-id'); // 或 element.dataset.id

      try {
        const result = await http({
          url: '/melon/get-comment',
          method: 'get',
          data: {
            melon_id,
            page,
          },
          _options: {
            showError: true,
          },
        });

        var my_pager = $('.pager').data('zui.pager');

        // console.log('result... ',result);

        my_pager.set(result.page, result.count, 10);

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

    $('.detail-comments').on('click', '.btn-comment', async function () {
      const comment_id = $(this).data('comment_id');
      const melon_id = $(this).data('id');
      let comment_key = '#comment-input';
      if (comment_id > 0) {
        comment_key = '#comment-input-' + comment_id;
      }
      const value = $(comment_key).val();
      try {
        const result = await http({
          url: '/melon/add-comment',
          method: 'post',
          data: {
            melon_id,
            comment_id,
            value,
          },
          _options: {
            showError: true,
          },
        });

        new $.zui.Messager('评论成功-待审核', {
          time: 2000,
          close: false,
          type: 'success',
        }).show();

        const comment_num = result.num || 0;

        if (comment_num > 0) {
          $('.comment-num').text(`(` + comment_num + `)`);
        }

        get_comments(1);
      } catch (error) {
        $(this).attr('disabled', false);
        console.log('_e: ', error);
      }
    });

    // 评论-end
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

    $('.pager').pager({
      page: 1,
      onPageChange: function onPageChange(state, oldState) {
        if (state.page !== oldState.page) {
          get_comments(state.page);
        }
      },
    });

    try {

      db.set({
        db_name: 'cg_records',
        table_name: 'records',
        data: _detail_,
      });
    } catch (error) {
      console.log(error)
    }

    const token = utils.get_token()
    if (token) {
      $(".btn-create-comment").removeClass('btn-login').text('发表留言')
    }
  }
);
