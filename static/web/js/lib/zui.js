(() => {
  function t(e, t) {
    var n;
    if (1 < arguments.length)
      if (2 == arguments.length && 'object' == typeof t)
        for (var a in t)
          void 0 !== t[a] &&
            ((n = new RegExp('({' + a + '})', 'g')), (e = e.replace(n, t[a])));
      else
        for (var o = 1; o < arguments.length; o++)
          void 0 !== arguments[o] &&
            ((n = new RegExp('({[' + (o - 1) + ']})', 'g')),
              (e = e.replace(n, arguments[o])));
    return e;
  }
  function e(e) {
    return null !== e && e.match(/\d*/i) == e;
  }
  var n = { formatString: t, string: { format: t, isNum: e } };
  window.$ && window.$.zui ? $.zui(n) : (window.stringHelper = n.string),
    window.noStringPrototypeHelper ||
    (String.prototype.format ||
      (String.prototype.format = function () {
        var e = [].slice.call(arguments);
        return e.unshift(this), t.apply(this, e);
      }),
      String.prototype.isNum) ||
    (String.prototype.isNum = function () {
      return e(this);
    });
})(),
  ((s, n, r) => {
    if (void 0 === s) throw new Error('ZUI requires jQuery');
    s.zui ||
      (s.zui = function (e) {
        s.isPlainObject(e) && s.extend(s.zui, e);
      });
    var t = { all: -1, left: 0, middle: 1, right: 2 },
      a = 0;
    s.zui({
      uuid: function (e) {
        var t =
          1e5 * (Date.now() - 1580890015292) +
          10 * Math.floor(1e4 * Math.random()) +
          (a++ % 10);
        return e ? t : t.toString(36);
      },
      callEvent: function (e, t, n) {
        return 'function' == typeof e
          ? ((n = (e = n !== r ? e.bind(n) : e)(t)),
            t && (t.result = n),
            !(n !== r && !n))
          : 1;
      },
      strCode: function (e) {
        var t = 0;
        if ((e = 'string' != typeof e ? String(e) : e) && e.length)
          for (var n = 0; n < e.length; ++n) t += (n + 1) * e.charCodeAt(n);
        return t;
      },
      getMouseButtonCode: function (e) {
        return (e =
          (e = 'number' != typeof e ? t[e] : e) !== r && null !== e ? e : -1);
      },
      defaultLang: 'en',
      clientLang: function () {
        var e,
          t = n.config;
        return (e =
          (e = void 0 !== t && t.clientLang ? t.clientLang : e) ||
          s('html').attr('lang') ||
          navigator.userLanguage ||
          s.zui.defaultLang)
          .replace('-', '_')
          .toLowerCase();
      },
      langDataMap: {},
      addLangData: function (t, e, a) {
        var o = {};
        a && e && t
          ? ((o[e] = {}), (o[e][t] = a))
          : t && e && !a
            ? ((a = e),
              s.each(a, function (e) {
                (o[e] = {}), (o[e][t] = a[e]);
              }))
            : !t ||
            e ||
            a ||
            s.each(a, function (t) {
              var n = a[t];
              s.each(n, function (e) {
                o[e] || (o[e] = {}), (o[e][t] = n[e]);
              });
            }),
          s.extend(!0, s.zui.langDataMap, o);
      },
      getLangData: function (e, t, n) {
        var a;
        return arguments.length
          ? 1 === arguments.length
            ? s.extend({}, s.zui.langDataMap[e])
            : 2 === arguments.length
              ? (a = s.zui.langDataMap[e])
                ? t
                  ? a[t]
                  : a
                : {}
              : 3 === arguments.length
                ? ((t = t || s.zui.clientLang()),
                  (e = (a = s.zui.langDataMap[e]) ? a[t] : {}),
                  s.extend(!0, {}, n[t] || n.en || n.zh_cn, e))
                : null
          : s.extend({}, s.zui.langDataMap);
      },
      lang: function () {
        return (
          arguments.length && s.isPlainObject(arguments[arguments.length - 1])
            ? s.zui.addLangData
            : s.zui.getLangData
        ).apply(null, arguments);
      },
      _scrollbarWidth: 0,
      checkBodyScrollbar: function () {
        var e;
        return document.body.clientWidth >= n.innerWidth
          ? 0
          : (s.zui._scrollbarWidth ||
            (((e = document.createElement('div')).className =
              'scrollbar-measure'),
              document.body.appendChild(e),
              (s.zui._scrollbarWidth = e.offsetWidth - e.clientWidth),
              document.body.removeChild(e)),
            s.zui._scrollbarWidth);
      },
      fixBodyScrollbar: function () {
        var e, t;
        if (s.zui.checkBodyScrollbar())
          return (
            (e = s('body')),
            (t = parseInt(e.css('padding-right') || 0, 10)),
            s.zui._scrollbarWidth &&
            e.css({
              paddingRight: t + s.zui._scrollbarWidth,
              overflowY: 'hidden',
            }),
            !0
          );
      },
      resetBodyScrollbar: function () {
        s('body').css({ paddingRight: '', overflowY: '' });
      },
    }),
      (s.fn.callEvent = function (e, t, n) {
        var a = s(this),
          o = e.indexOf('.zui.'),
          i = o < 0 ? e : e.substring(0, o),
          t = s.Event(i, t);
        return (
          (n = n === r && 0 < o ? a.data(e.substring(o + 1)) : n) &&
          n.options &&
          'function' == typeof (e = n.options[i]) &&
          (t.result = s.zui.callEvent(e, t, n)),
          a.trigger(t),
          t
        );
      }),
      (s.fn.callComEvent = function (e, t, n) {
        n === r || Array.isArray(n) || (n = [n]), this.trigger(t, n);
        var a,
          t = e.options[t];
        return (a = t ? t.apply(e, n) : a);
      });
  })(jQuery, window, void 0),
  ((c, s) => {
    function a(e, t) {
      var n = this;
      (n.name = o),
        (n.$ = c(e)),
        (t = n.options = c.extend({}, a.DEFAULTS, this.$.data(), t)),
        (n.langName = t.lang || c.zui.clientLang()),
        (n.lang = c.zui.getLangData(o, n.langName, i)),
        (n.state = {}),
        n.set(t.page, t.recTotal, t.recPerPage, !0),
        n.$.on('click', '.pager-goto-btn', function () {
          var e = c(this).closest('.pager-goto'),
            e = parseInt(e.find('.pager-goto-input').val());
          NaN !== e && n.set(e);
        }).on("click", ".pager-item", function () {
          var e = c(this).data("page");
          if (t.mode === 'custom') {
            "number" == typeof e && 0 < e && n.set(e)
          }
        })
          .on('click', '.pager-size-menu [data-size]', function () {
            var e = c(this).data('size');
            'number' == typeof e && 0 < e && n.set(-1, -1, e);
          });
    }
    var o = 'zui.pager',
      r = { page: 1, recTotal: 0, recPerPage: 10 },
      i = {
        zh_cn: {
          pageOfText: '第 {0} 页',
          prev: '上一页',
          next: '下一页',
          first: '第一页',
          last: '最后一页',
          goto: '跳转',
          pageOf: '第 <strong>{page}</strong> 页',
          totalPage: '共 <strong>{totalPage}</strong> 页',
          totalCount: '共 <strong>{recTotal}</strong> 项',
          pageSize: '每页 <strong>{recPerPage}</strong> 项',
          itemsRange: '第 <strong>{start}</strong> ~ <strong>{end}</strong> 项',
          pageOfTotal:
            '第 <strong>{page}</strong>/<strong>{totalPage}</strong> 页',
        },
      };
    (a.prototype.set = function (e, t, n, a) {
      var o = this;
      'object' == typeof e &&
        null !== e &&
        ((n = e.recPerPage), (t = e.recTotal), (e = e.page));
      var i = (i = o.state) || c.extend({}, r),
        s = c.extend({}, i);
      return (
        'number' == typeof n && 0 < n && (i.recPerPage = n),
        'number' == typeof t && 0 <= t && (i.recTotal = t),
        'number' == typeof e && 0 <= e && (i.page = e),
        (i.totalPage =
          i.recTotal && i.recPerPage
            ? Math.ceil(i.recTotal / i.recPerPage)
            : 1),
        (i.page = Math.max(0, Math.min(i.page, i.totalPage))),
        (i.pageRecCount = i.recTotal),
        i.page &&
        i.recTotal &&
        (i.page < i.totalPage
          ? (i.pageRecCount = i.recPerPage)
          : 1 < i.page &&
          (i.pageRecCount = i.recTotal - i.recPerPage * (i.page - 1))),
        (i.skip = 1 < i.page ? (i.page - 1) * i.recPerPage : 0),
        (i.start = i.skip + 1),
        (i.end = i.skip + i.pageRecCount),
        (i.prev = 1 < i.page ? i.page - 1 : 0),
        (i.next = i.page < i.totalPage ? i.page + 1 : 0),
        (o.state = i),
        a ||
        (s.page === i.page &&
          s.recTotal === i.recTotal &&
          s.recPerPage === i.recPerPage) ||
        o.$.callComEvent(o, 'onPageChange', [i, s]),
        o.render()
      );
    }),
      (a.prototype.createLinkItem = function (e, t, n) {
        var a = this,
          t =
            (t === s && (t = e),
              c(
                '<a title="' +
                a.lang.pageOfText.format(e) +
                '" class="pager-item" data-page="' +
                e +
                '"/>'
              )
                .attr('href', e ? a.createLink(e, a.state) : '###')
                .html(t));
        return (t = n
          ? t
          : c('<li />')
            .append(t)
            .toggleClass('active', e === a.state.page)
            .toggleClass('disabled', !e || e === a.state.page));
      }),
      (a.prototype.createNavItems = function (e) {
        function t(e, t) {
          if (!1 !== e) {
            t === s && (t = e);
            for (var n = e; n <= t; ++n) o.append(a.createLinkItem(n));
          } else o.append(a.createLinkItem(0, t || a.options.navEllipsisItem));
        }
        var a = this,
          o = a.$,
          n = a.state,
          i = n.totalPage,
          n = n.page;
        e === s && (e = a.options.maxNavCount || 10),
          t(1),
          1 < i &&
          (i <= e
            ? t(2, i)
            : n < e - 2
              ? (t(2, e - 2), t(!1), t(i))
              : i - e + 2 < n
                ? (t(!1), t(i - e + 2, i))
                : (t(!1),
                  t(n - Math.ceil((e - 4) / 2), n + Math.floor((e - 4) / 2)),
                  t(!1),
                  t(i)));
      }),
      (a.prototype.createGoto = function () {
        var e = this.state;
        return c(
          '<div class="input-group pager-goto"><input value="' +
          e.page +
          '" type="number" min="1" max="' +
          e.totalPage +
          '" placeholder="' +
          e.page +
          '" class="form-control pager-goto-input"><span class="input-group-btn"><button class="btn pager-goto-btn" type="button">' +
          this.lang.goto +
          '</button></span></div>'
        );
      }),
      (a.prototype.createSizeMenu = function () {
        var e = this.state,
          t = c('<ul class="dropdown-menu"></ul>'),
          n = this.options.pageSizeOptions;
        'string' == typeof n && (n = n.split(','));
        for (var a = 0; a < n.length; ++a) {
          var o = n[a],
            o =
              ('string' == typeof o && (o = parseInt(o)),
                c(
                  '<li><a href="###" data-size="' + o + '">' + o + '</a></li>'
                ).toggleClass('active', o === e.recPerPage));
          t.append(o);
        }
        return c(
          '<div class="btn-group pager-size-menu"><button type="button" class="btn dropdown-toggle" data-toggle="dropdown">' +
          this.lang.pageSize.format(e) +
          ' <span class="caret"></span></button></div>'
        )
          .addClass(this.options.menuDirection)
          .append(t);
      }),
      (a.prototype.createElement = function (e, t, n) {
        var a = this,
          o = a.createLinkItem.bind(a),
          i = a.lang;
        switch (e) {
          case 'prev':
            return o(n.prev, i.prev);
          case 'prev_icon':
            return o(
              n.prev,
              '<img class="icon" alt="上一页" src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAoAAAASCAYAAABit09LAAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAA4RpVFh0WE1MOmNvbS5hZG9iZS54bXAAAAAAADw/eHBhY2tldCBiZWdpbj0i77u/IiBpZD0iVzVNME1wQ2VoaUh6cmVTek5UY3prYzlkIj8+IDx4OnhtcG1ldGEgeG1sbnM6eD0iYWRvYmU6bnM6bWV0YS8iIHg6eG1wdGs9IkFkb2JlIFhNUCBDb3JlIDUuNi1jMTExIDc5LjE1ODMyNSwgMjAxNS8wOS8xMC0wMToxMDoyMCAgICAgICAgIj4gPHJkZjpSREYgeG1sbnM6cmRmPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5LzAyLzIyLXJkZi1zeW50YXgtbnMjIj4gPHJkZjpEZXNjcmlwdGlvbiByZGY6YWJvdXQ9IiIgeG1sbnM6eG1wTU09Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC9tbS8iIHhtbG5zOnN0UmVmPSJodHRwOi8vbnMuYWRvYmUuY29tL3hhcC8xLjAvc1R5cGUvUmVzb3VyY2VSZWYjIiB4bWxuczp4bXA9Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC8iIHhtcE1NOk9yaWdpbmFsRG9jdW1lbnRJRD0ieG1wLmRpZDplMjQyZjFjZS0zMmE4LWQ2NGMtYmNmNS1kYjE4Y2Q5ODU2MzIiIHhtcE1NOkRvY3VtZW50SUQ9InhtcC5kaWQ6NTBGN0ZCRUQxODc2MTFFN0FCN0VDMEE3QjAwOTA3NkEiIHhtcE1NOkluc3RhbmNlSUQ9InhtcC5paWQ6NTBGN0ZCRUMxODc2MTFFN0FCN0VDMEE3QjAwOTA3NkEiIHhtcDpDcmVhdG9yVG9vbD0iQWRvYmUgUGhvdG9zaG9wIENDIDIwMTUgKFdpbmRvd3MpIj4gPHhtcE1NOkRlcml2ZWRGcm9tIHN0UmVmOmluc3RhbmNlSUQ9InhtcC5paWQ6YzVmNTA0ODctOTQzMS0xMDRmLWIxZDktNzU0ZmJkMjYyZDNlIiBzdFJlZjpkb2N1bWVudElEPSJhZG9iZTpkb2NpZDpwaG90b3Nob3A6NTYzZDM2NmQtZWQ4MC0xMWU2LTg5ZTAtODVkMjUwNzBiNGE5Ii8+IDwvcmRmOkRlc2NyaXB0aW9uPiA8L3JkZjpSREY+IDwveDp4bXBtZXRhPiA8P3hwYWNrZXQgZW5kPSJyIj8+ag8T0QAAAItJREFUeNpi/P//PwNWMIuRGUguAuLLDGn/O1hwKGIDkguBOALKZ2DBoWgNEPsiieoyEaFoGRDHMRGjCOjGv0zEKAJxmIhRBFFIhCKYQoKKYAqJAiCFm5H4UeDYgMQKhsIQYhQzAd3zixjFEDcSoZgRJfXgCVNGjGSGQzFm8CCcsQJJ9DIjsQkXIMAAh91Jv4ZLcGEAAAAASUVORK5CYII="/>'
            );
          case 'next':
            return o(n.next, i.next);
          case 'next_icon':
            return o(
              n.next,
              '<img class="icon" alt="下一页" src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAoAAAASCAYAAABit09LAAAAWUlEQVR4AY3StQGAMBBA0UNnZhV6pGfBk0iD5Rf/qodERFVFV1m83RtUVd6qSEunN3/BvaDaVfADDgTHALhAgAsEOADCPhVhDPGn8WIQ4hvOj5BfCn7N8MU1BxnKPMtDbkgAAAAASUVORK5CYII=" />'
            );
          case 'first':
            return o(1, i.first);
          case 'first_icon':
            return o(1, '<i class="icon ' + a.options.firstIcon + '"></i>');
          case 'last':
            return o(n.totalPage, i.last);
          case 'last_icon':
            return o(
              n.totalPage,
              '<i class="icon ' + a.options.lastIcon + '"></i>'
            );
          case 'space':
          case '|':
            return c('<li class="space" />');
          case 'nav':
          case 'pages':
            return void a.createNavItems();
          case 'total_text':
            return c(
              ('<div class="pager-label">' + i.totalCount + '</div>').format(n)
            );
          case 'page_text':
            return c(
              ('<div class="pager-label">' + i.pageOf + '</div>').format(n)
            );
          case 'total_page_text':
            return c(
              ('<div class="pager-label">' + i.totalPage + '</div>').format(n)
            );
          case 'page_of_total_text':
            return c(
              ('<div class="pager-label">' + i.pageOfTotal + '</div>').format(n)
            );
          case 'page_size_text':
            return c(
              ('<div class="pager-label">' + i.pageSize + '</div>').format(n)
            );
          case 'items_range_text':
            return c(
              ('<div class="pager-label">' + i.itemsRange + '</div>').format(n)
            );
          case 'goto':
            return a.createGoto();
          case 'size_menu':
            return a.createSizeMenu();
          default:
            return c('<li/>').html(e.format(n));
        }
      }),
      (a.prototype.createLink = function (e, t) {
        e === s && (e = this.state.page), t === s && (t = this.state);
        var n = this.options.linkCreator;
        return 'string' == typeof n
          ? n.format(c.extend({}, t, { page: e }))
          : 'function' == typeof n
            ? n(e, t)
            : '#page=' + e;
      }),
      (a.prototype.render = function (e) {
        var t = this,
          n = t.state,
          a = t.options.elementCreator || t.createElement,
          o = c.isPlainObject(a);
        'string' == typeof (e = e || t.elements || t.options.elements) &&
          (e = e.split(',')),
          (t.elements = e),
          t.$.empty();
        for (var i = 0; i < e.length; ++i) {
          var s = c.trim(e[i]),
            r = ((o && a[s]) || a).call(t, s, t.$, n);
          (r = !1 === r ? t.createElement(s, t.$, n) : r) instanceof c &&
            ('LI' !== r[0].tagName && (r = c('<li/>').append(r)),
              t.$.append(r));
        }
        var l = null;
        return (
          t.$.children('li').each(function () {
            var e = c(this),
              t = !!e.children('.pager-item').length;
            l
              ? l.toggleClass('pager-item-right', !t)
              : t && e.addClass('pager-item-left'),
              (l = t ? e : null);
          }),
          l && l.addClass('pager-item-right'),
          t.$.callComEvent(t, 'onRender', [n]),
          t
        );
      }),
      (a.DEFAULTS = c.extend(
        {
          elements: [
            'first_icon',
            'prev_icon',
            'pages',
            'next_icon',
            'last_icon',
            'page_of_total_text',
            'items_range_text',
            'total_text',
          ],
          prevIcon: 'icon-double-angle-left',
          nextIcon: 'icon-double-angle-right',
          firstIcon: 'icon-step-backward',
          lastIcon: 'icon-step-forward',
          navEllipsisItem: '<i class="icon icon-ellipsis-h">...</i>',
          maxNavCount: 10,
          menuDirection: 'dropdown',
          pageSizeOptions: [10, 20, 30, 50, 100],
        },
        r
      )),
      (c.fn.pager = function (n) {
        return this.each(function () {
          var e = c(this),
            t = e.data(o);
          t || e.data(o, (t = new a(this, 'object' == typeof n && n))),
            'string' == typeof n && t[n]();
        });
      }),
      (a.NAME = o),
      (a.LANG = i),
      (c.fn.pager.Constructor = a),
      c(function () {
        c('[data-ride="pager"]').pager();
      });
  })(jQuery, void 0),
  ((a) => {
    (a.fn.emulateTransitionEnd = function (e) {
      var t = !1,
        n = this;
      return (
        a(this).one('bsTransitionEnd', function () {
          t = !0;
        }),
        setTimeout(function () {
          t || a(n).trigger(a.support.transition.end);
        }, e),
        this
      );
    }),
      a(function () {
        (a.support.transition = (() => {
          var e,
            t = document.createElement('bootstrap'),
            n = {
              WebkitTransition: 'webkitTransitionEnd',
              MozTransition: 'transitionend',
              OTransition: 'oTransitionEnd otransitionend',
              transition: 'transitionend',
            };
          for (e in n) if (void 0 !== t.style[e]) return { end: n[e] };
          return !1;
        })()),
          a.support.transition &&
          (a.event.special.bsTransitionEnd = {
            bindType: a.support.transition.end,
            delegateType: a.support.transition.end,
            handle: function (e) {
              if (a(e.target).is(this))
                return e.handleObj.handler.apply(this, arguments);
            },
          });
      });
  })(jQuery),
  ((e, t) => {
    function n() {
      var e = a.width();
      t('html')
        .toggleClass('screen-desktop', 992 <= e && e < 1200)
        .toggleClass('screen-desktop-wide', 1200 <= e)
        .toggleClass('screen-tablet', 768 <= e && e < 992)
        .toggleClass('screen-phone', e < 768)
        .toggleClass('device-mobile', e < 992)
        .toggleClass('device-desktop', 992 <= e);
    }
    var a = t(e),
      e = '',
      o = navigator.userAgent;
    o.match(/(iPad|iPhone|iPod)/i)
      ? (e += ' os-ios')
      : o.match(/android/i)
        ? (e += ' os-android')
        : o.match(/Win/i)
          ? (e += ' os-windows')
          : o.match(/Mac/i)
            ? (e += ' os-mac')
            : o.match(/Linux/i)
              ? (e += ' os-linux')
              : o.match(/X11/i) && (e += ' os-unix'),
      'ontouchstart' in document.documentElement && (e += ' is-touchable'),
      t('html').addClass(e),
      a.resize(n),
      n();
  })(window, jQuery),
  ((p, g) => {
    function s(e, t) {
      var n = this;
      (n.options = t),
        (n.$body = p(document.body)),
        (n.$element = p(e)),
        (n.$backdrop = n.isShown = null),
        (n.scrollbarWidth = 0),
        t.moveable === g &&
        (n.options.moveable = n.$element.hasClass('modal-moveable')),
        t.remote &&
        n.$element.find('.modal-content').load(t.remote, function () {
          n.$element.trigger('loaded.' + h);
        }),
        t.scrollInside &&
        p(window).on('resize.' + h, function () {
          n.isShown && n.adjustPosition(g, 100);
        });
    }
    function u(e, t) {
      var n = p(window);
      (t.left = Math.max(0, Math.min(t.left, n.width() - e.outerWidth()))),
        (t.top = Math.max(0, Math.min(t.top, n.height() - e.outerHeight()))),
        e.css(t);
    }
    var h = 'zui.modal';
    function o(a, o, i) {
      return this.each(function () {
        var e = p(this),
          t = e.data(h),
          n = p.extend({}, s.DEFAULTS, e.data(), 'object' == typeof a && a);
        t || e.data(h, (t = new s(this, n))),
          'string' == typeof a ? t[a](o, i) : n.show && t.show(o, i);
      });
    }
    (s.VERSION = '3.2.0'),
      (s.TRANSITION_DURATION = 300),
      (s.BACKDROP_TRANSITION_DURATION = 150),
      (s.DEFAULTS = { backdrop: !0, keyboard: !0, show: !0, position: 'fit' }),
      (s.prototype.toggle = function (e, t) {
        return this.isShown ? this.hide() : this.show(e, t);
      }),
      (s.prototype.adjustPosition = function (e, t) {
        var n,
          a,
          o,
          i,
          s,
          r,
          l,
          c,
          d = this;
        clearTimeout(d.reposTask),
          t
            ? (d.reposTask = setTimeout(d.adjustPosition.bind(d, e, 0), t))
            : ((t = d.options),
              (e = e === g ? t.position : e) !== g &&
              null !== e &&
              ('function' == typeof e && (e = e(d)),
                (n = d.$element.find('.modal-dialog')),
                (a = p(window).height()),
                (o = { maxHeight: 'initial', overflow: 'visible' }),
                (i = n.find('.modal-body').css(o)),
                t.scrollInside &&
                i.length &&
                ((c = t.headerHeight),
                  (s = t.footerHeight),
                  (r = n.find('.modal-header')),
                  (l = n.find('.modal-footer')),
                  'number' != typeof c &&
                  (c = r.length
                    ? r.outerHeight()
                    : 'function' == typeof c
                      ? c(r)
                      : 0),
                  'number' != typeof s &&
                  (s = l.length
                    ? l.outerHeight()
                    : 'function' == typeof s
                      ? s(l)
                      : 0),
                  (o.maxHeight = a - c - s),
                  (o.overflow =
                    i[0].scrollHeight > o.maxHeight ? 'auto' : 'visible'),
                  i.css(o)),
                (r = Math.max(0, (a - n.outerHeight()) / 2)),
                'fit' === e
                  ? (e = { top: 50 < r ? Math.floor((2 * r) / 3) : r })
                  : 'center' === e
                    ? (e = { top: r })
                    : p.isPlainObject(e) || (e = { top: e }),
                n.hasClass('modal-moveable') &&
                  ((l = null),
                    (c = t.rememberPos) &&
                    (!0 === c
                      ? (l = d.$element.data('modal-pos'))
                      : p.zui.store &&
                      (l = p.zui.store.pageGet(h + '.rememberPos.' + c))),
                    (e = p.extend(
                      e,
                      {
                        left: Math.max(0, (p(window).width() - n.outerWidth()) / 2),
                      },
                      l
                    )),
                    'inside' === t.moveable)
                  ? u(n, e)
                  : n.css(e)));
      }),
      (s.prototype.setMoveable = function () {
        p.fn.draggable ||
          console.error('Moveable modal requires draggable.js.');
        var n = this,
          a = n.options,
          t = n.$element.find('.modal-dialog').removeClass('modal-dragged');
        t.toggleClass('modal-moveable', !!a.moveable),
          n.$element.data('modal-moveable-setup') ||
          t.draggable({
            container: n.$element,
            handle: '.modal-header',
            before: function () {
              var e = t.css('margin-top');
              e &&
                '0px' !== e &&
                t
                  .css('top', e)
                  .css('margin-top', '')
                  .addClass('modal-dragged');
            },
            finish: function (e) {
              var t = a.rememberPos;
              t &&
                (n.$element.data('modal-pos', e.pos), p.zui.store) &&
                !0 !== t &&
                p.zui.store.pageSet(h + '.rememberPos.' + t, e.pos);
            },
            move:
              'inside' !== a.moveable ||
              function (e) {
                u(t, e);
              },
          });
      }),
      (s.prototype.show = function (n, a) {
        var o = this,
          e = p.Event('show.' + h, { relatedTarget: n });
        o.$element.trigger(e),
          o.$element.toggleClass(
            'modal-scroll-inside',
            !!o.options.scrollInside
          ),
          o.isShown ||
          e.isDefaultPrevented() ||
          ((o.isShown = !0),
            o.options.moveable && o.setMoveable(),
            !1 !== o.options.backdrop &&
            (o.setScrollbar(), o.$body.addClass('modal-open')),
            o.escape(),
            o.$element.on(
              'click.dismiss.' + h,
              '[data-dismiss="modal"]',
              function (e) {
                o.hide(), e.stopPropagation();
              }
            ),
            o.backdrop(function () {
              var e = p.support.transition && o.$element.hasClass('fade'),
                t =
                  (o.$element.parent().length || o.$element.appendTo(o.$body),
                    o.$element.show().scrollTop(0),
                    e && o.$element[0].offsetWidth,
                    o.$element.addClass('in').attr('aria-hidden', !1),
                    o.adjustPosition(a),
                    o.enforceFocus(),
                    p.Event('shown.' + h, { relatedTarget: n }));
              e
                ? o.$element
                  .find('.modal-dialog')
                  .one('bsTransitionEnd', function () {
                    o.$element.trigger('focus').trigger(t);
                  })
                  .emulateTransitionEnd(s.TRANSITION_DURATION)
                : o.$element.trigger('focus').trigger(t);
            }));
      }),
      (s.prototype.hide = function (e) {
        e && e.preventDefault && e.preventDefault();
        var t = this;
        (e = p.Event('hide.' + h)),
          t.$element.trigger(e),
          t.isShown &&
          !e.isDefaultPrevented() &&
          ((t.isShown = !1) !== t.options.backdrop &&
            (t.$body.removeClass('modal-open'), t.resetScrollbar()),
            t.escape(),
            p(document).off('focusin.' + h),
            t.$element
              .removeClass('in')
              .attr('aria-hidden', !0)
              .off('click.dismiss.' + h),
            p.support.transition && t.$element.hasClass('fade')
              ? t.$element
                .one('bsTransitionEnd', t.hideModal.bind(t))
                .emulateTransitionEnd(s.TRANSITION_DURATION)
              : t.hideModal());
      }),
      (s.prototype.enforceFocus = function () {
        p(document)
          .off('focusin.' + h)
          .on(
            'focusin.' + h,
            function (e) {
              this.$element[0] === e.target ||
                this.$element.has(e.target).length ||
                this.$element.trigger('focus');
            }.bind(this)
          );
      }),
      (s.prototype.escape = function () {
        this.isShown && this.options.keyboard
          ? p(document).on(
            'keydown.dismiss.' + h,
            function (e) {
              27 == e.which &&
                ((e = p.Event('escaping.' + h)),
                  ((e = this.$element.triggerHandler(e, 'esc')) != g && !e) ||
                  this.hide());
            }.bind(this)
          )
          : this.isShown || p(document).off('keydown.dismiss.' + h);
      }),
      (s.prototype.hideModal = function () {
        var e = this;
        this.$element.hide(),
          this.backdrop(function () {
            e.$element.trigger('hidden.' + h);
          });
      }),
      (s.prototype.removeBackdrop = function () {
        this.$backdrop && this.$backdrop.remove(), (this.$backdrop = null);
      }),
      (s.prototype.backdrop = function (e) {
        var t,
          n = this,
          a = this.$element.hasClass('fade') ? 'fade' : '';
        this.isShown && this.options.backdrop
          ? ((t = p.support.transition && a),
            (this.$backdrop = p(
              '<div class="modal-backdrop ' + a + '" />'
            ).appendTo(this.$body)),
            this.$element.on(
              'mousedown.dismiss.' + h,
              function (e) {
                e.target === e.currentTarget &&
                  ('static' == this.options.backdrop
                    ? this.$element[0].focus.call(this.$element[0])
                    : this.hide.call(this));
              }.bind(this)
            ),
            t && this.$backdrop[0].offsetWidth,
            this.$backdrop.addClass('in'),
            e &&
            (t
              ? this.$backdrop
                .one('bsTransitionEnd', e)
                .emulateTransitionEnd(s.BACKDROP_TRANSITION_DURATION)
              : e()))
          : !this.isShown && this.$backdrop
            ? (this.$backdrop.removeClass('in'),
              (a = function () {
                n.removeBackdrop(), e && e();
              }),
              p.support.transition && this.$element.hasClass('fade')
                ? this.$backdrop
                  .one('bsTransitionEnd', a)
                  .emulateTransitionEnd(s.BACKDROP_TRANSITION_DURATION)
                : a())
            : e && e();
      }),
      (s.prototype.setScrollbar = function () {
        p.zui.fixBodyScrollbar() &&
          this.options.onSetScrollbar &&
          this.options.onSetScrollbar();
      }),
      (s.prototype.resetScrollbar = function () {
        p.zui.resetBodyScrollbar(),
          this.options.onSetScrollbar && this.options.onSetScrollbar('');
      }),
      (s.prototype.measureScrollbar = function () {
        var e = document.createElement('div'),
          t =
            ((e.className = 'modal-scrollbar-measure'),
              this.$body.append(e),
              e.offsetWidth - e.clientWidth);
        return this.$body[0].removeChild(e), t;
      });
    var e = p.fn.modal;
    (p.fn.modal = o),
      (p.fn.modal.Constructor = s),
      (p.fn.modal.noConflict = function () {
        return (p.fn.modal = e), this;
      }),
      p(document).on(
        'click.' + h + '.data-api',
        '[data-toggle="modal"]',
        function (e) {
          var t = p(this),
            n = t.attr('href'),
            a = null;
          try {
            a = p(
              t.attr('data-target') || (n && n.replace(/.*(?=#[^\s]+$)/, ''))
            );
          } catch (e) {
            return;
          }
          a.length &&
            ((n = a.data(h)
              ? 'toggle'
              : p.extend({ remote: !/#/.test(n) && n }, a.data(), t.data())),
              t.is('a') && e.preventDefault(),
              a.one('show.' + h, function (e) {
                e.isDefaultPrevented() ||
                  a.one('hidden.' + h, function () {
                    t.is(':visible') && t.trigger('focus');
                  });
              }),
              o.call(a, n, this, t.data('position')));
        }
      );
  })(jQuery, void 0),
  ((r, l, c) => {
    function o(e, n) {
      function a(e) {
        var t = r(
          '<button type="button" class="action action-' + e.name + '"/>'
        );
        'close' === e.name && t.addClass('close'),
          e.html !== c && t.html(e.html),
          e.icon !== c &&
          t.append('<i class="action-icon icon-' + e.icon + '"/>'),
          e.text !== c &&
          t.append('<span class="action-text">' + e.text + '</span>'),
          e.tooltip !== c && t.attr('title', e.tooltip).tooltip(),
          t.data('action', e),
          s.append(t);
      }
      r.isPlainObject(e)
        ? (n = r.extend({}, n, e))
        : e && (n ? (n.content = e) : (n = { content: e }));
      var o = this;
      (n = o.options = r.extend({}, d, n)), (o.id = n.id || t++);
      (e = p[o.id]) && e.destroy(),
        ((p[o.id] = o).$ = r(
          '<div class="messager messager-{type} {placement}" style="display: none"><div class="messager-content"></div><div class="messager-actions"></div></div>'.format(
            n
          )
        )
          .toggleClass('fade', n.fade)
          .toggleClass('scale', n.scale)
          .attr('id', 'messager-' + o.id)),
        n.cssClass && o.$.addClass(n.cssClass);
      var i = !1,
        s = o.$.find('.messager-actions');
      n.actions &&
        r.each(n.actions, function (e, t) {
          t.name === c && (t.name = e), 'close' == t.name && (i = !0), a(t);
        }),
        !i && n.close && a({ name: 'close', html: '&times;' }),
        o.$.on('click', '.action', function (e) {
          var t = r(this).data('action');
          (n.onAction && !1 === n.onAction.call(this, t.name, t, o)) ||
            ('function' == typeof t.action && !1 === t.action.call(this, o)) ||
            (o.hide(), e.stopPropagation());
        }),
        o.$.on('click', function (e) {
          n.onAction &&
            !0 === n.onAction.call(this, 'content', null, o) &&
            o.hide();
        }),
        o.$.data('zui.messager', o),
        n.show && o.message !== c && o.show();
    }
    function n(e) {
      e === c
        ? r('.messager').each(function () {
          var e = r(this).data('zui.messager');
          e && e.hide && e.hide(!0);
        })
        : (e = r('#messager-' + e).data('zui.messager')) && e.hide && e.hide();
    }
    function i(e, t) {
      return (
        'string' == typeof t && (t = { type: t }),
        r.isPlainObject(e) && ((t = r.extend({}, t, e)), (e = null)),
        (t = r.extend({}, t)).id === c && n(),
        (e = p[t.id] || new o(e, t)).show(),
        e
      );
    }
    var t = 0,
      d = {
        icons: {},
        type: 'default',
        placement: 'top',
        time: 4e3,
        parent: 'body',
        close: !0,
        fade: !0,
        scale: !0,
      },
      p = {},
      s =
        ((o.prototype.update = function (e, t) {
          r.isPlainObject(e)
            ? (t = e)
            : e && (t ? (t.content = e) : (t = { content: e }));
          var n = this,
            a = n.options,
            o =
              (n.$.removeClass('messager-' + a.type),
                n.$.find('.messager-content')),
            t =
              (a.contentClass && o.removeClass(a.contentClass),
                t && (a = r.extend(a, t)),
                n.$.addClass('messager-' + a.type).toggleClass(
                  'messager-notification',
                  !!a.notification
                ),
                a.contentClass && o.addClass(a.contentClass),
                a.title),
            i = a.icon,
            s =
              ((e = a.content),
                o.empty(),
                t &&
                ((s = r('<div class="messager-title"></div>'))[
                  a.html ? 'html' : 'text'
                ](t),
                  o.append(s)),
                e &&
                ((t = r('<div class="messager-text"></div>'))[
                  a.html ? 'html' : 'text'
                ](e),
                  o.append(t)),
                n.$.find('.messager-icon'));
          i
            ? ((e = r.isPlainObject(i)
              ? i.html
              : '<i class="icon-' + i + ' icon"></i>'),
              s.length
                ? s.html(e)
                : o.before('<div class="messager-icon">' + e + '<div>'))
            : s.remove(),
            n.$.toggleClass('messager-has-icon', !!i),
            n.updateTime || (a.onUpdate && a.onUpdate.call(n, a)),
            (n.updateTime = Date.now());
        }),
          (o.prototype.show = function (e, t) {
            var n,
              a,
              o,
              i = this,
              s = this.options;
            if (
              ('function' == typeof e && ((n = t), (t = e), n !== c) && (e = n),
                !i.isShow)
            )
              return (
                i.hiding && (clearTimeout(i.hiding), (i.hiding = null)),
                i.update(e),
                (n = s.placement),
                (a = (a = (o = r(s.parent)).children('.messagers-holder.' + n))
                  .length
                  ? a
                  : r('<div/>')
                    .attr('class', 'messagers-holder ' + n)
                    .appendTo(o)).append(i.$),
                'center' === n &&
                ((o = r(l).height() - a.height()),
                  a.css('top', Math.max(-o, o / 2))),
                i.$.show().addClass('in'),
                s.time &&
                (i.hiding = setTimeout(function () {
                  i.hide();
                }, s.time)),
                (i.isShow = !0),
                t && t(),
                s.onShow && s.onShow.call(i, s),
                i
              );
            i.hide(function () {
              i.show(e, t);
            });
          }),
          (o.prototype.hide = function (t, n) {
            !0 === t && ((n = !0), (t = null));
            var e,
              a = this,
              o = a.options;
            a.$.hasClass('in')
              ? (a.$.removeClass('in'),
                (e = function () {
                  var e = a.$.parent();
                  a.$.detach(),
                    e.children().length || e.remove(),
                    t && t(!0),
                    o.onHide && o.onHide.call(a, n);
                }),
                n ? e() : setTimeout(e, 200))
              : (t && t(!1), o.onHide && o.onHide.call(a, n)),
              (a.isShow = !1);
          }),
          (o.prototype.destroy = function () {
            var e = this;
            e.hide(function () {
              e.$.remove(), (e.$ = null);
            }, !0),
              delete p[e.id];
          }),
        {
          notification: !0,
          placement: 'bottom-right',
          time: 0,
          icon: 'bell icon-2x',
        }),
      e = { show: i, hide: n };
    (o.all = p),
      (o.DEFAULTS = d),
      (o.NOTIFICATION_DEFAULTS = s),
      r.each(
        {
          primary: 0,
          success: 'ok-sign',
          info: 'info-sign',
          warning: 'warning-sign',
          danger: 'exclamation-sign',
          important: 0,
          special: 0,
        },
        function (n, a) {
          e[n] = function (e, t) {
            return i(
              e,
              r.extend(
                { type: n, icon: o.DEFAULTS.icons[n] || a || null },
                'string' == typeof t ? { placement: t } : t
              )
            );
          };
        }
      ),
      r.zui({
        Messager: o,
        showMessager: i,
        showNotification: function (e, t, n) {
          var a = r.extend({ id: r.zui.uuid() }, s),
            o = 'string' == typeof e;
          return (
            o && 'string' == typeof t
              ? (n = r.extend(a, n, { title: e, content: t }))
              : o && r.isPlainObject(t)
                ? (n = r.extend(a, n, t, { title: e }))
                : r.isPlainObject(e)
                  ? (n = r.extend(a, n, t, e))
                  : o && (n = r.extend(a, n, { title: e })),
            i(n)
          );
        },
        messager: e,
      });
  })(jQuery, window, void 0),
  (s => {
    var timer;
    s(document).ready(function () {
      s(window).scroll(function () {
        if (timer) {
          clearTimeout(timer)
          timer = null
        }
        var $this = $(this)

        s("[data-backtop]").each(function () {
          $(this).css({
            opacity: 0
          })
        })
        timer = setTimeout(() => {
          s("[data-backtop]").each(function () {
            0 < $this.scrollTop() ? $(this).css({
              opacity: 1
            }) : $(this).css({
              opacity: 0
            })
          })

        }, 300);
      })

      $('[data-backtop]').on('click', function () {
        if ($(this).data('srcoll')) {
          s("html, body").animate({
            scrollTop: 0
          }, "fast")
        }
      })

    })
  }
  )(jQuery);
