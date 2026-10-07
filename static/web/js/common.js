
define([
  'jquery',
  'utils',
  'plugins/lazyload',
  'http',
  'pager_nav',
], function ($, utils, lazyload, http) {
  const TRACE_UID = "_dx_trace_uid"
  const $search = $('.app-search')
  init_pager('.pager');
  const copyText = (function () {
    return function (text, autoToast = true) {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.position = 'fixed'; // 避免页面滚动影响
      textarea.style.opacity = '0'; // 避免视觉干扰
      document.body.appendChild(textarea);
      textarea.focus();
      textarea.select();
      try {
        const success = document.execCommand('copy');
        if (autoToast) {
          new $.zui.Messager('复制成功', {
            time: 3000,
            type: 'success',
            close: false
          }).show()
        }
        return Promise.resolve(success);
      } catch (err) {
        console.error('Fallback copy failed:', err);
        return Promise.reject(err);
      } finally {
        document.body.removeChild(textarea);
      }
    };
  })();
  // 复制粘贴。统一处理
  $(document).on('click', '.btn-copy', function () {
    const $this = $(this)
    copyText($this.data('clipboard-text'))
  })

  const token = utils.get_token()

  let userInfo

  function getUserInfo() {
    return new Promise((resolve, reject) => {
      if (userInfo) {
        $(document).off('get_user')
        return resolve(userInfo)
      }
      $(document).on('get_user:success', () => {
        resolve(userInfo)
      })
      $(document).on('get_user:fail', () => {
        reject('token过期')
      })
    })
  }
  async function init_user(token) {
    try {
      const user = await http({
        url: '/api.php/api/video/user',
        method: 'post',
        data: {
          token,
        },
        crypto: true,
        _options: {
          showLogin: false
        }
      });
      if (!user || (Array.isArray(user) && user.length === 0)) {
        return new $.zui.Messager('用户异常！', {
          time: 3000,
          type: 'danger',
          close: false
        }).show();
      }
      userInfo = user
      $(document).trigger('get_user:success')

      $('.my-user-tabbar').attr('href', user.user_href).removeClass('btn-login')
      var html = '<a href="' + user.user_href + '">';
      html += '<div class="popover-container mt-1 relative hidden md:flex items-center text-sm text-primary" style="justify-content: center;">';
      html += '<button class="mr-2.5" type="button" title="' + user.username + '">';
      html += '<img data-cache="1" class="w-[32px] h-[32px] md:w-[32px] md:h-[32px] rounded-full" ';
      html += 'src="/static/web/images/icon-192x192.png" data-src="' + user.avatar + '" />';
      html += '</button>';
      html += '</div>';
      html += '</a>';

      html += '<button class="py-2 hidden md:block" data-dismiss="popover" id="toggle-button" data-type="login" type="button" title="' + user.username + '">';
      html += user.username;
      html += '</button>';

      html += '<div class="popover bottom top-[34px] w-[104px] right-0" id="popover-content" style="left: initial; display: none;">';
      html += '<div class="popover-content !p-0 overflow-auto text-font1 dx-shadow">';
      html += '<a class="text-center block hover:opacity-80 dx-hairline--bottom py-2 mb-1" href="' + user.user_href + '">个人设置</a>';
      html += '<a class="text-center block hover:opacity-80 py-2 btn-logout cursor-pointer" href="' + user.out_href + '" role="button">退出登录</a>';
      html += '</div>';
      html += '</div>';

      $('.user-login-detail').addClass('flex').html(html);

      var html2 = '<div class="flex justify-between">';
      html2 += '<a class="flex-shrink-0 items-center flex" href="' + user.user_href + '">';
      html2 += '<img data-cache="1" class="app-logo flex-shrink-0 mr-3.5 w-[40px] h-[40px] rounded-full" src="/static/web/icons/icons.svg#user" data-src="' + user.avatar + '"/>';
      html2 += '<span class="mr-1 max-w-[160px] truncate">' + user.username + '</span>';
      html2 += '</a>';
      html2 += '<button class="dx-drawer-close" type="button" title="close">';
      html2 += '<svg class="w-7 h-7 text-primary">';
      html2 += '<use href="/static/web/icons/icons.svg#close"></use>';
      html2 += '</svg>';
      html2 += '</button>';
      html2 += '</div>';

      $('#left_user_detail').replaceWith(html2)

      var html3 = ' <div class="dx-collapse-toggle py-3 pl-5 rounded bg-base5 flex items-center justify-between">';
      html3 += '<div class="flex items-center text-subtitle">';
      html3 += '<svg class="w-6 h-6 mr-4">';
      html3 += '<use href="/static/web/icons/icons.svg#logout"></use>';
      html3 += '</svg>';
      html3 += '<button class="btn-logout hover:opacity-80 py-2"';
      html3 += 'type="button" title="退出登录">退出登录';
      html3 += '</button>';
      html3 += '</div>';
      html3 += '</div>';

      $('#left_user_logout').replaceWith(html3)

      lazyload.load_image();

      // 点击按钮时切换显示/隐藏
      $('#toggle-button').on('click', function () {
        // 点击按钮时切换显示/隐藏
        $('#popover-content').toggle();
      });

      // 鼠标移出 popover 时隐藏
      $('#popover-content').on('mouseleave', function () {
        $(this).hide(); // 鼠标离开时隐藏 div
      });

      $('#login_modal').fadeOut(300, function () {
        $(this).removeClass('in').hide(); // 确保 modal 关闭
        $('.modal-backdrop').remove(); // 移除遮罩层
        $('body').removeClass('modal-open').css('overflow', ''); // 允许页面滚动
      });

    } catch (error) {
      console.log('_e: ', error);
      $(document).trigger('get_user:fail')
      window.location.reload()
    }
  }

  //已经登录了
  if (token) {
    init_user(token)
  }
  function useMessage(message, type = 'success', time = 3000) {
    if (message) {
      new $.zui.Messager(message, {
        time: time,
        type: type,
        close: false
      }).show()
    }

  }

  // 头部导航
  $('#app-nav').on('click', 'li', function () {
    $(this).addClass('is-active').siblings().removeClass('is-active');
  });
  $('.dx-tabs').on('click', '.dx-tab-item', function () {
    const $this = $(this);
    const index = $this.index();
    $this
      .addClass('is-active')
      .siblings()
      .removeClass('is-active')
      .parents('.dx-tabs')
      .find('.dx-tab-content')
      .removeClass('dx-tab-content--active')
      .eq(index)
      .addClass('dx-tab-content--active');
  });

  // 点击按钮时切换显示/隐藏
  $('#toggle-button').on('click', function () {
    // 点击按钮时切换显示/隐藏
    $('#popover-content').toggle();
  });

  // 鼠标移出 popover 时隐藏
  $('#popover-content').on('mouseleave', function () {
    $(this).hide(); // 鼠标离开时隐藏 div
  });

  $('.checkNum').on('click', async function () {
    const type = $(this).data('type');
    const id = $(this).data('id');
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

  // 登录注册
  $(document).on('click', '.btn-login', function () {
    const ctx = $(this);
    const type = ctx.data('type');
    show_login(type);
    const dismiss = ctx.data('dismiss');
    const className = ctx.data('class');
    if (dismiss) {
      $('.dx-overlay').hide();
      if (className) {
        ctx.parents('.'.concat(dismiss)).removeClass(className);
      } else {
        ctx.parents('.'.concat(dismiss)).hide();
      }
    }
    const index = type === 'login' ? 0 : 1;
    $('#login_modal')
      .find('.dx-tabs')
      .find('.dx-tab-content')
      .eq(index)
      .addClass('dx-tab-content--active')
      .siblings()
      .removeClass('dx-tab-content--active');
    $('#login_modal')
      .find('.dx-tab-item')
      .eq(index)
      .addClass('is-active')
      .siblings()
      .removeClass('is-active');
    return false;
  });

  //  显示登录框
  function show_login() {
    let _type =
      arguments.length > 0 && arguments[0] !== undefined
        ? arguments[0]
        : 'login';
    $('#login_modal').modal({
      position: 'center',
      show: true,
      backdrop: 'static',
    });
  }

  $('#login_modal').on('click', '.btn-change', function () {
    const type = $(this).data('type');
    $('#login_modal .modal-content')
      .children()
      .eq(type)
      .show()
      .siblings()
      .hide();
  });

  // 登录
  $('.btn-login-submit').on('click', async function () {
    const type = $(this).data('type');
    const username = $('#'.concat(type, '-email')).val();
    const password = $('#'.concat(type, '-password')).val();

    var api_url = '';
    let rules
    let data
    // 用类型区分登陆或者注册
    if (type == 'login') {
      api_url = '/login/do-login';
      rules = {
        username: [
          {
            type: 'string',
            required: true,
            message: '用户名不能为空',
          },
        ],
        password: [
          {
            type: 'string',
            required: true,
            message: '密码不能为空',
          },
          {
            min: 8,
            max: 128,
            message: '密码长度必须为(8-128)个字符',
          },
        ],
      }
      data = {
        username,
        password,
      }
    } else {
      api_url = '/login/do-register';

      rules = {
        username: [
          {
            type: 'string',
            required: true,
            message: '用户名不能为空',
          },
        ],
        email: {
          type: 'email',
          required: true,
          message: '请填写正确的邮箱',
        },
        verify: {
          type: 'string',
          required: true,
          message: '请填写邮箱验证码',
        },
        password: [
          {
            type: 'string',
            required: true,
            message: '密码不能为空',
          },
          {
            min: 8,
            max: 128,
            message: '密码长度必须为(8-128)个字符',
          },
        ],


      }
      data = {
        username,
        password,
        email: $("#register-account").val(),
        verify: $("#register-verify").val(),
        code: $("#register-code").val(),
      }
    }

    const validator = await utils.load_amd_module('validate')


    const validate = validator.useValidator(rules);
    try {
      $(this).attr('disabled', true);

      await validate(data);

      const user = await http({
        url: api_url,
        method: 'post',
        data: data,
        _options: {
          showError: true,
        },
      });

      if (!user || (Array.isArray(user) && user.length === 0)) {
        return new $.zui.Messager('用户异常！', {
          time: 3000,
          type: 'danger',
          close: false
        }).show();
      }
      utils.set_cookie(TRACE_UID, user.id, 365)
      utils.set_token(user.token)
      location.reload();

    } catch (error) {
      $(this).attr('disabled', false);
      console.log('_e: ', error);
    }
  });

  // 注册获取验证码
  var countdown = 60
  var timer = null

  $('.btn-send-code').on('click', async function () {
    var $btn = $(this)
    try {

      const validator = await utils.load_amd_module('validate')
      const email = $("#register-account").val()

      const validate = validator.useValidator({
        email: {
          type: 'email',
          required: true,
          message: '请填写正确的邮箱',
        },
      });

      await validate({
        email
      })

      // 👉 发送验证码
      await http({
        url: '/login/send-email',
        _options: {
          showError: true,
          showSuccess: true
        },
        data: {
          email
        },
      })

      // 防止重复点击
      if ($btn.prop('disabled')) return

      startCountdown($btn)

    } catch (error) {
      clearInterval(timer)
      timer = null
      $btn.prop('disabled', false)
      $btn.text('获取验证码')
    }
  })

  function startCountdown($btn) {
    var time = countdown

    $btn.prop('disabled', true)
    $btn.text(time + 's后重新获取')

    timer = setInterval(function () {
      time--
      if (time <= 0) {
        clearInterval(timer)
        $btn.prop('disabled', false)
        $btn.text('获取验证码')
      } else {
        $btn.text(time + 's后重新获取')
      }
    }, 1000)
  }

  const SEARCH_MAP = {
    1: 'video',
    2: 'novel',
    3: 'av',
    4: 'melon'
  }
  // 新增搜索
  // 最大本地存储搜索数量
  const CACHE_COUNT = 10
  const SEARCH_CACHE_KEY = "__SEARCH__KEY__"
  let history = get_history()
  function get_history() {
    try {
      return JSON.parse(localStorage.getItem(SEARCH_CACHE_KEY)) || []
    } catch (error) {
      return []
    }
  }
  function save_history(val) {
    if (!history.includes(val)) {
      if (history.length < CACHE_COUNT) {
        history.unshift(val)
      } else {
        history = history.slice(0, 10)
        history.splice(9, 1)
        history.unshift(val)
      }
      localStorage.setItem(SEARCH_CACHE_KEY, JSON.stringify(history))
    }
  }
  function remove_history(val) {
    history = history.filter(item => item !== val)

    localStorage.setItem(SEARCH_CACHE_KEY, JSON.stringify(history))
  }

  function renderHistory() {
    if (history.length) {

      $('.history-container-body').html(
        history.map(item => {
          return `<div class="history-item" data-text="${item}">
                <span class="history-item-text">${item}</span>
                <button class="btn-remove-history-item">
                  <svg class="size-3">
                    <use href="/static/web/icons/icons.svg?v=1767787665908#close"></use>
                  </svg>
                </button>
              </div>`
        })
      )
    } else {
      $('.history-container').hide()
    }
  }

  $('.history-container-body').on('click', '.btn-remove-history-item', function () {
    const keyword = $(this).parent().data('text')
    remove_history(keyword.toString())

    renderHistory()

    return false
  })

  $('.history-container-body').on('click', '.history-item', function () {
    const keyword = $(this).data('text')

    const type = $search.data('type') || 1

    search(keyword, type)
  })

  $('.btn-clear-history').on('click', function () {
    history = []
    localStorage.setItem(SEARCH_CACHE_KEY, JSON.stringify(history))
    renderHistory()
  })
  let _search_placeholder = $search.attr('placeholder')
  $('.search-box > .input-control > .app-search').on('click', function () {
    $('.hot-absolute-container').show()
    $('.search-box').removeClass('is-open')
    $(this).attr({
      placeholder: ''
    })
  })

  $('.search-box').on('mouseleave', function () {
    $('.hot-absolute-container').hide()
    $search.attr({
      placeholder: _search_placeholder
    })
  })

  renderHistory()
  // 搜索弹框换一换
  $('.btn-refresh').on('click', function () {
    $(this).attr('disabled', true).addClass('loading')
    http({
      url: '/api.php/api/video/getHotVideo',
      crypto: true
    }).then((res) => {
      let $html = '';
      if (Array.isArray(res) && res.length > 0) {
        let i = 0;
        for (const item of res) {
          i++;
          let cls;
          if (i <= 3) {
            cls = 'truncate text-primary guess-item';
          } else {
            cls = 'truncate guess-item';
          }
          $html += `<a class="${cls}" href="${item.detail_url}">
            ${item.video_title}
          </a>`;
        }
      }

      $('.guess-items').html($html);
    }).finally(() => {
      $(this).attr('disabled', false).removeClass('loading')
    })
  })


  function search(keyword, search_type) {
    if (keyword) {
      keyword = keyword.toString()
    }
    let search_val = $search.attr('placeholder')
    console.log('keyword.length: ', keyword.length);
    if (keyword && keyword.length) {
      save_history(keyword)
      search_val = keyword
    }
    const url = `/${SEARCH_MAP[search_type] || 'video'}/search/${search_val}`
    window.location.href = url;

  }
  $('.search-box .search-icon').on('click', search);
  $('.search-input').keyup(function (event) {
    if (event.keyCode === 13) {
      const search_val = $(this).val();
      const search_type = $(this).data('type');
      // 没内容直接返回，不执行搜索
      if (!search_val || !search_val.trim()) {
        return;
      }
      search(search_val, search_type);
    }
  });
  $('.btn-open-search').on('click', function () {
    $('.search-box').toggleClass('is-open');
    $('body').addClass('mobile-search-open')
  });
  $('.btn-back').on('click', function () {
    $('.search-box').removeClass('is-open');
    $('body').removeClass('mobile-search-open')
  })
  $('.btn-search').on('click', function () {
    const val = $(this).siblings('.search-input').val();
    const search_type = $(this).siblings('.search-input').data('type');
    // 没内容直接返回，不执行搜索
    if (!val || !val.trim()) {
      return;
    }
    search(val, search_type);
  });

  // 登录、注册弹框
  $('.btn-change-type').on('click', function () {
    const ctx = $(this);
    const index = ctx.data('index');
    ctx
      .parents('.dx-tabs')
      .find('.dx-tab-content')
      .eq(index)
      .addClass('dx-tab-content--active')
      .siblings()
      .removeClass('dx-tab-content--active');
    ctx
      .parents('.dx-tabs')
      .find('.dx-tab-item')
      .eq(index)
      .addClass('is-active')
      .siblings()
      .removeClass('is-active');
  });

  // 左侧菜单栏
  $('.btn-menu-collapse').on('click', function () {
    const overlay = $(this).data('overlay');
    const close_class = $(this).data('class');
    $('.dx-drawer').addClass('dx-drawer--open');
    if (overlay) {
      $('.dx-overlay')
        .fadeIn()
        .attr('data-close', overlay)
        .attr('data-class', close_class);
    }
  });
  $('.dx-overlay').on('click', function () {
    const close = $(this).data('close');
    const close_class = $(this).data('class');
    $(this).fadeOut();
    if (close) {
      if (close_class) {
        $(close).removeClass(close_class);
      } else {
        $(close).hide();
      }
    }
  });
  $('.dx-drawer-close').on('click', function () {
    $(this).parents('.dx-drawer').removeClass('dx-drawer--open');
    $('.dx-overlay').fadeOut();
    return false;
  });
  $('.dx-drawer').on('click', '.drawer-nav-toggle', function () {
    const $group = $(this).closest('.drawer-nav-group');
    const isOpen = $group.hasClass('is-open');
    $group.toggleClass('is-open', !isOpen);
    $(this).attr('aria-expanded', String(!isOpen));
  });

  $('.app-header').on('click', '.btn-logout', function () {
    utils.remove_cookie(TRACE_UID)
    utils.remove_token();
    window.location.reload()
  })
  const landing_modal_key = '__landing_modal_at__';
  let _timer;
  let now = utils.getCurrentDate();

  $('#tip_modal').on('hidden.zui.modal', function () {
    localStorage.setItem(landing_modal_key, now);
    if (_timer) {
      clearTimeout(_timer);
      _timer = null;
    }
  });

  function show_landing_modal() {
    const $time = $('#tip_modal .time');
    let duration = Number($time.text());
    const cache_date = localStorage.getItem(landing_modal_key);
    if (duration > 0 && (!cache_date || cache_date !== now)) {

      $('#tip_modal').modal({
        position: 'center',
        show: true,
        backdrop: 'static',
      });
      function _tick() {
        if (duration === 0) {
          $('#tip_modal').modal('hide');
          clearTimeout(_timer);
          _timer = null;
          return;
        }
        _timer = setTimeout(() => {
          $time.text(--duration);
          _tick();
        }, 1000);
      }
      _tick();
    }
  }

  let index = 0;
  const $ads = $(".ad-dialog")
  const adCount = $ads.length
  const adKey = '_show_ad_dialog_'
  function showAdDialog() {
    const currentDialog = $ads.eq(index)

    // 监听弹框显示，设置最大高度和滚动条
    currentDialog.on('shown.zui.modal', function () {
      $(this).find('.modal-body').css({
        maxHeight: '50vh',
        overflowY: 'auto'
      })
    })

    if (currentDialog.length) {
      currentDialog.modal({
        position: '160px',
        show: true,
        backdrop: 'static',
        // 备注：设置滚动条在弹框内部，而不是整个页面
        scrollInside: true
      })
      function hidden() {
        index++
        currentDialog.off('hidden.zui.modal', hidden)
        if (index < adCount) {
          showAdDialog()
        } else {
          localStorage.setItem(adKey, now)
          show_landing_modal();
        }
      }

      currentDialog.on('hidden.zui.modal', hidden)
    }
  }
  const cache_date = localStorage.getItem(adKey);
  if (!cache_date || cache_date !== now) {
    showAdDialog()
  } else {
    show_landing_modal()
  }

  $('#tip_modal').on('click', '.btn-download', function (e) {
    const element = document.getElementById('tip_content');
    utils.load_amd_module(['lib/html2canvas'], function (html2canvas) {
      html2canvas(element, {
        ignoreElements: function ignoreElements(element) {
          return element.classList.contains('btn-download');
        },
      }).then((canvas) => {
        canvas.toBlob((blob) => {
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = '91prontv.png';
          link.click();
        });
      });
    });
  });

  $('.fixed-menu-more').on('click', function () {
    $(".fixed-menu").toggleClass('show-items');
  });
  const report = (function () {
    if (navigator.sendBeacon) {
      return function (url, data) {
        data = new URLSearchParams(data).toString();
        const blob = new Blob([data], {
          type: 'application/x-www-form-urlencoded'
        });

        navigator.sendBeacon(url, blob);
      }
    }
    return function (url, data) {
      return http({
        url,
        data
      }).catch(() => { })
    }
  })();
  $(document).on('click', '.report-item', function () {
    const $this = $(this)

    report('/api.php/api/video/viewVideoCate', {
      cate_id: $this.data('id')
    })
  });
  function generateUniqueId() {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      return crypto.randomUUID();
    }
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
      const r = (crypto.getRandomValues(new Uint8Array(1))[0] & 0xf) >> 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }

  const OAUTH_KEY = "OAUTH_ID"
  const OAUTH_ID = utils.getCookie(OAUTH_KEY)
  if (!OAUTH_ID) {
    utils.setCookie(OAUTH_KEY, generateUniqueId())
  }

  function warningForMinors() {

    const isOverHidden = $(".tiktok-root.overflow-hidden").length === 1;

    const WARN_AT = "WARN_AT";
    const i18n = {
      Chinese: {
        title: "这是个成人网站",
        content:
          "本网站包含有年龄限制的内容，包括裸体和露骨色情素材的内容。点击继续即表示您确认您已年满 18 岁，或在您访问本网站时所在的司法管辖区已是成年人",
        confirm: "我已年满18岁-进入",
        cancel: "我未满18岁-退出",
      },
      English: {
        title: "This is an adult website",
        content:
          "This website contains age-restricted materials including nudity and explicit depictions of sexual activity. By entering, you affirm that you are at least 18 years of age or the age of majority in the jurisdiction you are accessing the website from and you consent to viewing sexually explicit content.",
        confirm: "I am 18 or older - Enter",
        cancel: "I am under 18 - Exit",
      },
    };

    function injectStyle() {
      const style = document.createElement('style')
      style.textContent = `
         #dx-age-warning {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          background-color: #000;
          z-index: 9999
        }
        #dx-age-warning .dx-warning-container {
          width: 80vw;
          box-shadow: 6px 3px 20px 8px rgb(64 64 64/45%);
          padding: 12px 12px 24px;
          border-radius: 8px
        }
        @media (min-width:768px) {
          #dx-age-warning .dx-warning-container {
            width: 80vw;
            max-width: 600px;
          }
          .btn-warn-group {
            display: flex;
            align-items: center;
            gap: 12px
          }
          #dx-age-warning .btn-item {
            height: 60px !important;
          }
        }
        #dx-age-warning .dx-warning-flex-box {
          display: flex;
          align-items: center;
          background: #292828;
          padding: 6px 12px;
          width: -moz-fit-content;
          width: fit-content;
          border-radius: 8px
        }
        #dx-age-warning .dx-lang-icon {
          width: 24px;
          margin-right: 4px
        }

        #dx-age-warning #lang {
          background-color: transparent;
          color: #fff;
          outline: 0;
          border: 0;
        }
        #dx-age-warning .dx-warn-logo {
          width: 120px;
          display: block;
          margin: 24px auto
        }
        #dx-age-warning .dx-content-container {
          text-align: center
        }
        #dx-age-warning .dx-warn-title {
          font-size: 24px
        }
        #dx-age-warning .dx-warn-content {
          margin: 12px 0;
          font-size: 18px
        }
        #dx-age-warning .btn-item {
          display: block;
          margin: auto;
          width: 80%;
          padding: 6px 0;
          border-radius: 4px;
          border: 0;
          background-color: transparent;
          height: 42px;
        }
        #dx-age-warning .btn-age-confirm {
          color: #fff;
          margin: 16px auto;
          border: 1px solid #fe2855;
          background: #1f1f1f;
        }
        #dx-age-warning .btn-age-cancel {
          color: #fff;
          background: #1f1f1f;
         }
        `
      document.head.appendChild(style)
    }
    if (!utils.getCookie(WARN_AT)) {
      $("body").append(`<div id="dx-age-warning">
        <div class="dx-warning-container">
          <div class="dx-warning-flex-box"><img class="dx-lang-icon" src="/static/web/images/lang.png" alt="">
            <select id="lang">
              <option value="Chinese">中文</option>
              <option value="English">English</option>
            </select>
          </div>
          <div class="dx-content-container"><img class="dx-warn-logo" src="/static/web/images/logo.png" alt="">
            <p class="dx-warn-title">这是个成人网站</p>
            <p class="dx-warn-content">本网站包含有年龄限制的内容，包括裸体和露骨色情素材的内容。 点击继续即表示您确认您已年满 18 岁，或在您访问本网站时所在的司法管辖区已是成年人</p>
            <div class="btn-warn-group"> 
              <button class="btn-age-confirm btn-item">我已年满18岁-进入</button>
              <button class="btn-age-cancel btn-item">我未满18岁-退出</button>
            </div>
          </div>
        </div>
      </div>`);
      injectStyle()
      $("body").css({
        overflow: "hidden",
      });

      $("#lang").on("change", function () {
        const lang = $(this).val();
        $(".dx-warn-title").text(i18n[lang].title);
        $(".dx-warn-content").text(i18n[lang].content);
        $(".btn-age-confirm").text(i18n[lang].confirm);
        $(".btn-age-cancel").text(i18n[lang].cancel);
      });

      $(".btn-age-confirm").on("click", function () {
        utils.setCookie(WARN_AT, 1);
        $("#dx-age-warning").css({
          display: "none",
        });

        if (!isOverHidden) {
          $("body").css({
            overflow: "auto",
          });
        }

      });

      $(".btn-age-cancel").on("click", function () {
        window.location.replace('about:blank')
      });
    }
  }

  function init_pager(el) {
    const $el = $(el)
    const mode = $el.data('mode') || 'pathname';
    if (mode === 'pathname') {
      const pathname = location.pathname
      const currentPage = Number($el.data('page') || 1)
      const trailingMatch = pathname.match(/^(.*?)(?:\/(\d+))\/?$/);
      let base_url = pathname.replace(/\/+$/, '')
      if (trailingMatch && currentPage > 1 && Number(trailingMatch[2]) === currentPage) {
        base_url = trailingMatch[1].replace(/\/+$/, '')
      }
      const search = location.search

      $(el).pager({
        page: currentPage,
        linkCreator: function linkCreator(page) {
          const url = page > 1 ? `${base_url}/${page}` : base_url
          return search ? `${url}${search}` : url;
        },
        onPageChange: function onPageChange(state, oldState) {
          if (state.page !== oldState.page) {
            const url = state.page > 1 ? `${base_url}/${state.page}` : base_url
            window.location.href = search ? `${url}${search}` : url;
          }
        },
      });
    }

    if (mode === 'query') {
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
    }

  }

  function extractAffCode(url) {
    const match = url.match(/\/aff\/([a-zA-Z0-9]{4})/);
    return match ? match[1] : null;
  }

  function getAffCode() {
    const aff = extractAffCode(location.href)
    if (aff) {
      $('#register-code').val(aff)
    }
  }

  getAffCode()

  return {
    getUserInfo,
    useMessage,
    copyText,
    show_login
  }
});
