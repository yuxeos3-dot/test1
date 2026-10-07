
'use strict';

requirejs.config({
  urlArgs: 'v='.concat(js_assets_version),
  // 资源版本号
  baseUrl: '/static/web/js',
  paths: {
    jquery: 'lib/jquery',
    zui: 'lib/zui',
    xgplayer: 'lib/xgplayer',
    player: 'plugins/player',
    swiper: 'lib/swiper',
    clipboard: 'lib/clipboard',
  },
  shim: {
    zui: ['jquery'],
  },
});
requirejs(
  [
    'utils',
    'player',
    'plugins/lazyload',
    'http',
    'clipboard',
    'lib/handlebars',
    'plugins/db',
    'jquery',
    'swiper',
    'video_helper',
    'common',
  ],
  function (utils, player, lazyload, http, Clipboard, Handlebars, db) {
    const blob = new Blob([track_vtt], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const token = utils.get_token()
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
        dynamicBullets: true,
      },
    });
    lazyload.load_image();
    const $video = $('#mse');

    let ad_config = {};
    try {
      ad_config = video_ads;
    } catch (error) { }

    const isVideoAdDisable = !ad_config.url && !ad_config.gif
    let _player;
    if ($video.get(0)) {
      player
        .create_player({
          id: 'mse',
          url: $video.data('url'),
          // H.265 优先地址，模板未输出该属性时为空，自动走 264（零回归）
          url_265: $video.data('url-265') || '',
          poster: $video.data('poster'),

          pip: {
            showIcon: true,
            preferDocument: false,
            index: 1,
          },
          volume: {
            index: 7,
          },

          autoplay: true,
          muted: false,
          autoplayMuted: false,
          // 字幕，
          track: {
            url: url,
            language: 'zh-cn',
            label: '字幕1',
          },

          last_play_time: {
            key: $video.data('video'),
          },

          advertise: {
            video: ad_config.url,
            gif: ad_config.gif,
            url: ad_config.href,
            play_duration: ad_config.manual_duration, // 播放几秒后可手动关闭广告 必传
            duration: ad_config.duration, // 播放几秒后自动关闭广告，传0不会自动关闭和显示自定关闭倒计时 选传；
            disabled: !ad_config.url && !ad_config.gif, // 是否禁用广告
          },
          external: {
            href: $video.data('ads_url'),   //点击视频播放跳转
            title: ''
          },
        })
        .then((my_player) => {
          _player = my_player;
          if (window.videoPlaybackStats) {
            window.videoPlaybackStats.attach(my_player);
          }
          my_player.once('play', async function () {
            try {
              const result = await http({
                url: '/index/videohot',
                method: 'post',
                data: {
                  video_id: $video.data('video'),
                },
              });

              // console.log('hot result...', result);
              const hot_div =
                '<img class="w-5 h-5 svg-icon mr-1" src="/static/web/images/fire.png" alt="\n' +
                result.num + '">\n' + result.num;

              $('.hot-div').html(hot_div);


            } catch (error) {
              console.log('error: ', error);
            }
          });
          my_player.on('ad-click', async function () {
            // console.log(ad_config)
            // 获取广告id ，点击类型为广告点击 1
            const id = ad_config.id;
            const type = 1;

            // console.log('id ... click', id);
            try {
              await http({
                url: '/index/addclick',
                method: 'post',
                data: {
                  id,
                  type,
                },
                _options: {
                  showError: true,
                },
              });
            } catch (error) {
              $(this).attr('disabled', false);
              console.log('_e: ', error);
            } finally {
              $(this).attr('disabled', false);
            }
          });
        });
    }

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
      const video_id = $('.video-comment-show').data('video_id');
      try {
        const result = await http({
          url: '/index/get-comment',
          method: 'get',
          data: {
            video_id,
            page,
          },
          _options: {
            showError: true,
          },
        });
        var my_pager = $('.pager').data('zui.pager');
        my_pager.set(result.page, result.page_count, 10);
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

    $('.video-comment-show').on('click', async function () {
      const video_id = $(this).data('video_id');
      // console.log('video_id...', video_id);
      try {
        get_comments(1);
      } catch (error) {
        $(this).attr('disabled', false);
        console.log('_e: ', error);
      } finally {
        $(this).attr('disabled', false);
      }
    });

    // 用户关注视频作者-end
    $('.focus-user').on('click', async function () {
      const user_id = $(this).data('user_id');
      const video_id = $(this).data('video_id');
      try {
        const result = await http({
          url: '/user/save-focus',
          method: 'post',
          data: {
            user_id,
            video_id,
          },
          _options: {
            showError: true,
          },
        });
        $(this).text(result['btn_text']);

        $('.text-focus').text(result['focus_num']);
      } catch (error) {
        $(this).attr('disabled', false);
        console.log('_e: ', error);
      } finally {
        $(this).attr('disabled', false);
      }
    });

    // 视频点赞-end
    $('.video-like').on('click', async function () {
      const video_id = $(this).data('video_id');
      try {
        const result = await http({
          url: '/user/like',
          method: 'post',
          data: {
            video_id,
          },
          _options: {
            showError: true,
          },
        });

        let svg_class = '';
        if (result['user_like'] > 0) {
          svg_class = 'text-primary';
        }

        let html =
          '<svg class="w-5 h-5 ' +
          svg_class +
          ' svg-icon mr-1">' +
          '<use href="/static/web/icons/icons.svg#like"></use></svg>' +
          '<span>' +
          result['like_count'] +
          '</span>';
        $(this).html(html);
      } catch (error) {
        $(this).attr('disabled', false);
        console.log('_e: ', error);
      } finally {
        $(this).attr('disabled', false);
      }
    });
    // 视频收藏-end
    $('.collect-video,.collect-div').on('click', async function () {
      const video_id = $('.collect-video').data('video_id');

      try {
        const result = await http({
          url: '/user/save-collect',
          method: 'post',
          data: {
            video_id,
          },
          _options: {
            showError: true,
          },
        });

        let collect_txt = '';
        let text_primary = '';
        if (result['collect_status'] > 0) {
          $('.collect-video').addClass('text-primary');
          text_primary = 'text-primary';
          collect_txt = '取消收藏';
        } else {
          $('.collect-video').removeClass('text-primary');
          collect_txt = '收藏视频';
        }

        const html =
          '<svg class="w-5 h-5 svg-icon mr-1">\n' +
          '                                            <use href="/static/web/icons/icons.svg#collect"></use>\n' +
          '                                        </svg>' +
          collect_txt;

        $('.collect-video').html(html);

        const collect_div =
          '<svg class="w-5 h-5 svg-icon mr-1\n' +
          text_primary +
          '">\n' +
          '<use href="/static/web/icons/icons.svg#heart"></use>\n' +
          '</svg>' +
          result['collect_count'];

        $('.collect-div').html(collect_div);
      } catch (error) {
        $(this).attr('disabled', false);
        console.log('_e: ', error);
      } finally {
        $(this).attr('disabled', false);
      }
    });

    $('.dx-tab-content').on('click', '.btn-comment,.btn-create-comment', async function () {
      if (!token) {
        return $('#login_modal').modal({
          position: 'center',
          show: true,
          backdrop: 'static'
        })
      }
      const id = _detail_.id
      const comment_id = $(this).data('comment_id');
      let comment_key = '#comment-input';
      if (comment_id > 0) {
        comment_key = '#comment-input-' + comment_id;
      }
      const value = $(comment_key).val();
      try {

        const result = await http({
          url: '/index/comment',
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
        new $.zui.Messager('评论成功-待审核', {
          time: 2000,
          close: false,
          type: 'success',
        }).show();

        const comment_num = result.data.num || 0;
        if (comment_num > 0) {
          $('.comment-num').text(`(` + comment_num + `)`);
        }

        get_comments(1);
      } catch (error) {
        $(this).attr('disabled', false);
        console.log('_e: ', error);
      }
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
        db_name: _detail_.type === 1 ? 'video_records' : 'av_records',
        table_name: 'records',
        data: _detail_,
      });
    } catch (e) { }

    if (utils.isPc) {
      utils.useQrcode(location.href);
    }
    console.log(token)
    if (token) {
      $('.video-like').removeClass('btn-login')
      $('.collect-video').removeClass('btn-login')
      $(".btn-create-comment").removeClass('btn-login').text('发表留言')
      http({
        url: '/api.php/api/user/video_like_favorite_status',
        data: {
          video_id: _detail_.id,
          token: token
        },
        crypto: true
      }).then((res => {
        if (res.is_collect) {
          $(".collect-div svg").addClass('text-primary');
          $('.collect-video').addClass('text-primary').html(
            `<svg class="w-5 h-5 svg-icon mr-1">
                <use href="/static/web/icons/icons.svg#collect"></use>
            </svg>取消收藏`

          )
        }
        if (res.is_like) {
          $(".video-like svg").addClass('text-primary');
        }
      }))
    }
  }
);
