/* ===========================================================
 * bootstrap-tooltip.js v2.0.4
 * http://twitter.github.com/bootstrap/javascript.html#tooltips
 * Inspired by the original jQuery.tipsy by Jason Frame
 * ===========================================================
 * Copyright 2012 Twitter, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 * ========================================================== */


!($ => {

  "use strict"; // jshint ;_;


 /* TOOLTIP PUBLIC CLASS DEFINITION
  * =============================== */

  var Tooltip = function (element, options) {
    this.init('tooltip', element, options)
  }

  Tooltip.prototype = {

    constructor: Tooltip

  , init(type, element, options) {
    var eventIn;
    var eventOut;

    this.type = type
    this.$element = $(element)
    this.options = this.getOptions(options)
    this.enabled = true

    if (this.options.trigger != 'manual') {
      eventIn  = this.options.trigger == 'hover' ? 'mouseenter' : 'focus'
      eventOut = this.options.trigger == 'hover' ? 'mouseleave' : 'blur'
      this.$element.on(eventIn, this.options.selector, $.proxy(this.enter, this))
      this.$element.on(eventOut, this.options.selector, $.proxy(this.leave, this))
    }

    this.options.selector ?
      (this._options = $.extend({}, this.options, { trigger: 'manual', selector: '' })) :
      this.fixTitle()
  }

  , getOptions(options) {
      options = $.extend({}, $.fn[this.type].defaults, options, this.$element.data())

      if (options.delay && typeof options.delay == 'number') {
        options.delay = {
          show: options.delay
        , hide: options.delay
        }
      }

      return options
    }

  , enter(e) {
      var self = $(e.currentTarget)[this.type](this._options).data(this.type)

      if (!self.options.delay || !self.options.delay.show) return self.show()

      clearTimeout(this.timeout)
      self.hoverState = 'in'
      this.timeout = setTimeout(() => {
        if (self.hoverState == 'in') self.show()
      }, self.options.delay.show)
    }

  , leave(e) {
      var self = $(e.currentTarget)[this.type](this._options).data(this.type)

      if (this.timeout) clearTimeout(this.timeout)
      if (!self.options.delay || !self.options.delay.hide) return self.hide()

      self.hoverState = 'out'
      this.timeout = setTimeout(() => {
        if (self.hoverState == 'out') self.hide()
      }, self.options.delay.hide)
    }

  , show() {
    var $tip;
    var inside;
    var pos;
    var actualWidth;
    var actualHeight;
    var placement;
    var tp;

    if (this.hasContent() && this.enabled) {
      $tip = this.tip()
      this.setContent()

      if (this.options.animation) {
        $tip.addClass('fade')
      }

      placement = typeof this.options.placement == 'function' ?
        this.options.placement.call(this, $tip[0], this.$element[0]) :
        this.options.placement

      inside = /in/.test(placement)

      $tip
        .remove()
        .css({ top: 0, left: 0, display: 'block' })
        .appendTo(inside ? this.$element : document.body)

      pos = this.getPosition(inside)

      actualWidth = $tip[0].offsetWidth
      actualHeight = $tip[0].offsetHeight

      switch (inside ? placement.split(' ')[1] : placement) {
        case 'bottom':
          tp = {top: pos.top + pos.height, left: pos.left + pos.width / 2 - actualWidth / 2}
          break
        case 'top':
          tp = {top: pos.top - actualHeight, left: pos.left + pos.width / 2 - actualWidth / 2}
          break
        case 'left':
          tp = {top: pos.top + pos.height / 2 - actualHeight / 2, left: pos.left - actualWidth}
          break
        case 'right':
          tp = {top: pos.top + pos.height / 2 - actualHeight / 2, left: pos.left + pos.width}
          break
      }

      $tip
        .css(tp)
        .addClass(placement)
        .addClass('in')
    }
  }

  , isHTML(text) {
      // html string detection logic adapted from jQuery
      return typeof text != 'string'
        || ( text.charAt(0) === "<"
          && text.charAt( text.length - 1 ) === ">"
          && text.length >= 3
        ) || /^(?:[^<]*<[\w\W]+>[^>]*$)/.exec(text)
    }

  , setContent() {
    var $tip = this.tip();
    var title = this.getTitle();

    $tip.find('.tooltip-inner')[this.isHTML(title) ? 'html' : 'text'](title)
    $tip.removeClass('fade in top bottom left right')
  }

  , hide() {
    var that = this;
    var $tip = this.tip();

    $tip.removeClass('in')

    function removeWithAnimation() {
      var timeout = setTimeout(() => {
        $tip.off($.support.transition.end).remove()
      }, 500)

      $tip.one($.support.transition.end, () => {
        clearTimeout(timeout)
        $tip.remove()
      })
    }

    $.support.transition && this.$tip.hasClass('fade') ?
      removeWithAnimation() :
      $tip.remove()
  }

  , fixTitle() {
      var $e = this.$element
      if ($e.attr('title') || typeof($e.attr('data-original-title')) != 'string') {
        $e.attr('data-original-title', $e.attr('title') || '').removeAttr('title')
      }
    }

  , hasContent() {
      return this.getTitle()
    }

  , getPosition(inside) {
      return $.extend({}, (inside ? {top: 0, left: 0} : this.$element.offset()), {
        width: this.$element[0].offsetWidth
      , height: this.$element[0].offsetHeight
      })
    }

  , getTitle() {
    var title;
    var $e = this.$element;
    var o = this.options;

    title = $e.attr('data-original-title')
      || (typeof o.title == 'function' ? o.title.call($e[0]) :  o.title)

    return title
  }

  , tip() {
      return this.$tip = this.$tip || $(this.options.template)
    }

  , validate() {
      if (!this.$element[0].parentNode) {
        this.hide()
        this.$element = null
        this.options = null
      }
    }

  , enable() {
      this.enabled = true
    }

  , disable() {
      this.enabled = false
    }

  , toggleEnabled() {
      this.enabled = !this.enabled
    }

  , toggle() {
      this[this.tip().hasClass('in') ? 'hide' : 'show']()
    }

  }


 /* TOOLTIP PLUGIN DEFINITION
  * ========================= */

  $.fn.tooltip = function ( option ) {
    return this.each(function () {
      var $this = $(this);
      var data = $this.data('tooltip');
      var options = typeof option == 'object' && option;
      if (!data) $this.data('tooltip', (data = new Tooltip(this, options)))
      if (typeof option == 'string') data[option]()
    });
  }

  $.fn.tooltip.Constructor = Tooltip

  $.fn.tooltip.defaults = {
    animation: true
  , placement: 'top'
  , selector: false
  , template: '<div class="tooltip"><div class="tooltip-arrow"></div><div class="tooltip-inner"></div></div>'
  , trigger: 'hover'
  , title: ''
  , delay: 0
  }

})(window.jQuery);
