'use strict';

/**
 * 列表页页尾：切页 / 跳页改版
 *
 * 页码规则（设计稿 figma llJD26NkpUDM3AF0k8k10F 节点 1047-308「页码设计08-21」）：
 *   页码集合 = {1, 2} ∪ {当前页-1, 当前页, 当前页+1} ∪ {末页-1, 末页}
 *   去重升序后，凡不连续处插入一个「...」
 * 例（共 999 页）：
 *   第 1 页    ->  1 2 ... 998 999
 *   第 4 页    ->  1 2 3 4 5 ... 998 999
 *   第 5 页    ->  1 2 ... 4 5 6 ... 998 999
 *   倒数第 4 页 ->  1 2 ... 995 996 997 998 999
 *
 * 实现方式：覆写 zui pager 的 elementCreator，只接管 pages / goto 两个元素，
 * 其余元素仍交回 zui 默认实现。不改动 lib/zui.js（后台也在用同一份）。
 *
 * 本模块必须在 common.js 的 init_pager() 之前执行 —— 已通过把它列为
 * common 的 AMD 依赖来保证（依赖工厂先于宿主工厂运行）。
 *
 * @ai-assisted reason="generated-initial-implementation" reviewed-by="wenlong" reviewed-on="2026-08-21"
 */
define(['jquery', 'zui'], function ($) {
    // 省略号占位页码：zui 的点击委托只响应 data-page > 0，故 0 天然不可点
    var ELLIPSIS_PAGE = 0;
    // 头部固定显示的页码个数（1、2）
    var HEAD_FIXED = 2;
    // 尾部固定显示的页码个数（末页-1、末页）
    var TAIL_FIXED = 2;
    // 当前页左右各展开的页码个数
    var AROUND = 1;

    var ARROW_SVG =
        '<svg class="dxp-arrow-icon" width="16" height="16" viewBox="0 0 16 16" fill="none" ' +
        'xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">' +
        '<path d="M11.41 12.59L6.83 8L11.41 3.41L10 2L4 8L10 14L11.41 12.59Z" fill="currentColor"/></svg>';

    /**
     * 生成页码序列；元素为 0 时表示省略号
     *
     * @param {number} total   总页数
     * @param {number} current 当前页
     * @returns {number[]}
     */
    function build_page_list(total, current) {
        var marked = {};
        var i;

        function mark(page) {
            if (page >= 1 && page <= total) {
                marked[page] = true;
            }
        }

        for (i = 1; i <= HEAD_FIXED; i++) {
            mark(i);
        }
        for (i = current - AROUND; i <= current + AROUND; i++) {
            mark(i);
        }
        for (i = total - TAIL_FIXED + 1; i <= total; i++) {
            mark(i);
        }

        var pages = Object.keys(marked)
            .map(Number)
            .sort(function (a, b) {
                return a - b;
            });

        var list = [];
        var prev = 0;
        for (i = 0; i < pages.length; i++) {
            if (prev && pages[i] - prev > 1) {
                list.push(ELLIPSIS_PAGE);
            }
            list.push(pages[i]);
            prev = pages[i];
        }
        return list;
    }

    /**
     * 上一页 / 下一页箭头。target 为 0 表示已在首页 / 末页，此时置为禁用态
     */
    function create_arrow(pager, type, target) {
        return pager
            .createLinkItem(target, ARROW_SVG, true)
            .addClass('dxp-arrow dxp-arrow-' + type)
            .toggleClass('dxp-disabled', !target)
            .attr('title', type === 'prev' ? '上一页' : '下一页');
    }

    /**
     * 页码行：[‹] 1 2 ... 4 5 6 ... 998 999 [›]
     */
    function create_pages_row(pager) {
        var state = pager.state;
        var $row = $('<div class="dxp-pages"/>');
        var list = build_page_list(state.totalPage, state.page);
        var i;

        $row.append(create_arrow(pager, 'prev', state.prev));

        for (i = 0; i < list.length; i++) {
            var page = list[i];
            if (page === ELLIPSIS_PAGE) {
                $row.append(
                    pager
                        .createLinkItem(ELLIPSIS_PAGE, '...', true)
                        .addClass('dxp-page dxp-ellipsis')
                        .removeAttr('title')
                        .attr('aria-hidden', 'true')
                );
                continue;
            }
            var $item = pager.createLinkItem(page, page, true).addClass('dxp-page');
            if (page === state.page) {
                $item.addClass('dxp-current').attr('aria-current', 'page');
            }
            $row.append($item);
        }

        $row.append(create_arrow(pager, 'next', state.next));
        return $row;
    }

    /**
     * 跳页行：跳转至 [输入框] 页 [GO]
     * 外层保留 pager-goto、控件保留 pager-goto-input / pager-goto-btn，
     * 以便复用 zui 自带的点击委托。
     */
    function create_goto_row(pager) {
        var state = pager.state;
        var $row = $('<div class="dxp-goto pager-goto"/>');

        $row.append($('<span class="dxp-goto-label"/>').text('跳转至'));
        $row.append(
            $('<input type="number" inputmode="numeric" class="pager-goto-input dxp-goto-input"/>')
                .attr('min', 1)
                .attr('max', state.totalPage)
                .attr('aria-label', '跳转至指定页')
        );
        $row.append($('<span class="dxp-goto-label"/>').text('页'));
        $row.append($('<button type="button" class="pager-goto-btn dxp-goto-btn"/>').text('GO'));

        return $row;
    }

    /**
     * zui pager 的 elementCreator：返回 false 表示该元素交回 zui 默认实现
     */
    function element_creator(name) {
        if (name === 'pages' || name === 'nav') {
            return $('<li class="dxp-row dxp-row-pages"/>').append(create_pages_row(this));
        }
        if (name === 'goto') {
            return $('<li class="dxp-row dxp-row-goto"/>').append(create_goto_row(this));
        }
        return false;
    }

    var Pager = $.fn.pager && $.fn.pager.Constructor;
    if (Pager) {
        Pager.DEFAULTS.elementCreator = element_creator;
    }

    // 跳页输入框有值时，输入框描边与 GO 按钮转为高亮态（设计稿 1040-2787）
    $(document)
        .on('input', '.dxp-goto-input', function () {
            var filled = $.trim(this.value) !== '';
            var $goto = $(this).closest('.dxp-goto');
            $(this).toggleClass('is-filled', filled);
            $goto.find('.dxp-goto-btn').toggleClass('is-active', filled);
        })
        .on('keydown', '.dxp-goto-input', function (e) {
            if (e.which === 13) {
                e.preventDefault();
                $(this).closest('.dxp-goto').find('.dxp-goto-btn').trigger('click');
            }
        });

    return { build_page_list: build_page_list };
});
