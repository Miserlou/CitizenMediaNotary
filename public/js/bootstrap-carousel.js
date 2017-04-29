/* ==========================================================
 * bootstrap-carousel.js v2.0.4
 * http://twitter.github.com/bootstrap/javascript.html#carousel
 * ==========================================================
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


 /* CAROUSEL CLASS DEFINITION
  * ========================= */

  var Carousel = function (element, options) {
    this.$element = $(element)
    this.options = options
    this.options.slide && this.slide(this.options.slide)
    this.options.pause == 'hover' && this.$element
      .on('mouseenter', $.proxy(this.pause, this))
      .on('mouseleave', $.proxy(this.cycle, this))
  }

  Carousel.prototype = {

    cycle(e) {
      if (!e) this.paused = false
      this.options.interval
        && !this.paused
        && (this.interval = setInterval($.proxy(this.next, this), this.options.interval))
      return this
    }

  , to(pos) {
    var $active = this.$element.find('.active');
    var children = $active.parent().children();
    var activePos = children.index($active);
    var that = this;

    if (pos > (children.length - 1) || pos < 0) return

    if (this.sliding) {
      return this.$element.one('slid', () => {
        that.to(pos)
      });
    }

    if (activePos == pos) {
      return this.pause().cycle()
    }

    return this.slide(pos > activePos ? 'next' : 'prev', $(children[pos]))
  }

  , pause(e) {
      if (!e) this.paused = true
      clearInterval(this.interval)
      this.interval = null
      return this
    }

  , next() {
      if (this.sliding) return
      return this.slide('next')
    }

  , prev() {
      if (this.sliding) return
      return this.slide('prev')
    }

  , slide(type, next) {
    var $active = this.$element.find('.active');
    var $next = next || $active[type]();
    var isCycling = this.interval;
    var direction = type == 'next' ? 'left' : 'right';
    var fallback  = type == 'next' ? 'first' : 'last';
    var that = this;
    var e = $.Event('slide');

    this.sliding = true

    isCycling && this.pause()

    $next = $next.length ? $next : this.$element.find('.item')[fallback]()

    if ($next.hasClass('active')) return

    if ($.support.transition && this.$element.hasClass('slide')) {
      this.$element.trigger(e)
      if (e.isDefaultPrevented()) return
      $next.addClass(type)
      $next[0].offsetWidth // force reflow
      $active.addClass(direction)
      $next.addClass(direction)
      this.$element.one($.support.transition.end, () => {
        $next.removeClass([type, direction].join(' ')).addClass('active')
        $active.removeClass(['active', direction].join(' '))
        that.sliding = false
        setTimeout(() => { that.$element.trigger('slid') }, 0)
      })
    } else {
      this.$element.trigger(e)
      if (e.isDefaultPrevented()) return
      $active.removeClass('active')
      $next.addClass('active')
      this.sliding = false
      this.$element.trigger('slid')
    }

    isCycling && this.cycle()

    return this
  }

  }


 /* CAROUSEL PLUGIN DEFINITION
  * ========================== */

  $.fn.carousel = function (option) {
    return this.each(function () {
      var $this = $(this);
      var data = $this.data('carousel');
      var options = $.extend({}, $.fn.carousel.defaults, typeof option == 'object' && option);
      if (!data) $this.data('carousel', (data = new Carousel(this, options)))
      if (typeof option == 'number') data.to(option)
      else if (typeof option == 'string' || (option = options.slide)) data[option]()
      else if (options.interval) data.cycle()
    });
  }

  $.fn.carousel.defaults = {
    interval: 5000
  , pause: 'hover'
  }

  $.fn.carousel.Constructor = Carousel


 /* CAROUSEL DATA-API
  * ================= */

  $(() => {
    $('body').on('click.carousel.data-api', '[data-slide]', function ( e ) {
      var $this = $(this);
      var href;

      var //strip for ie7
      $target = $($this.attr('data-target') || (href = $this.attr('href')) && href.replace(/.*(?=#[^\s]+$)/, ''));

      var options = !$target.data('modal') && $.extend({}, $target.data(), $this.data());
      $target.carousel(options)
      e.preventDefault()
    })
  })

})(window.jQuery);