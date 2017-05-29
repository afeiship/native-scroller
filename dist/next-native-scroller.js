(function () {

  var global = global || this;

  var nx = global.nx || require('next-js-core2');
  var CSS_TRANSFORM = '-webkit-transform';
  var Event = {
    on: function (type, callback, element) {
      var el = element || global;
      el.addEventListener(type, callback);
    },
    off: function (type, callback, element) {
      element.removeEventListener(type, callback);
    }
  };


  //raf polyfill:
  global.requestAnimFrame = (function () {
    return global.requestAnimationFrame ||
      global.webkitRequestAnimationFrame ||
      global.mozRequestAnimationFrame ||
      function (callback) {
        global.setTimeout(callback, 1000 / 60);
      };
  })();

  var touchStartEvent, touchMoveEvent, touchEndEvent;
  if (global.navigator.pointerEnabled) {
    touchStartEvent = 'pointerdown';
    touchMoveEvent = 'pointermove';
    touchEndEvent = 'pointerup';
  } else if (global.navigator.msPointerEnabled) {
    touchStartEvent = 'MSPointerDown';
    touchMoveEvent = 'MSPointerMove';
    touchEndEvent = 'MSPointerUp';
  } else {
    touchStartEvent = 'touchstart';
    touchMoveEvent = 'touchmove';
    touchEndEvent = 'touchend';
  }


  var isDragging = false,
    isOverscrolling = false,
    dragOffset = 0,
    lastOverscroll = 0,
    ptrThreshold = 60,
    activated = false,
    scrollTime = 500,
    startY = null,
    deltaY = null,
    canOverscroll = true,
    scrollParent,
    scrollChild,
    refresher;


  var NativeScroller = nx.declare('nx.NativeScroller', {
    methods: {
      init: function (inScrollParent, inScrollChild, inRefresher) {
        scrollParent = inScrollParent;
        scrollChild = inScrollChild;
        refresher = inRefresher;

        Event.on(touchStartEvent, this.handleTouchstart, scrollChild);
        Event.on(touchMoveEvent, this.handleTouchmove, scrollChild);
        Event.on(touchEndEvent, this.handleTouchend, scrollChild);
        Event.on('mousedown', this.handleMousedown, scrollChild);
        Event.on('mousemove', this.handleTouchmove, scrollChild);
        Event.on('mouseup', this.handleTouchend, scrollChild);
        Event.on('scroll', this.handleScroll, scrollParent);
      },
      destroy: function () {
        if (scrollChild) {
          Event.off(touchStartEvent, this.handleTouchstart, scrollChild);
          Event.off(touchMoveEvent, this.handleTouchmove, scrollChild);
          Event.off(touchEndEvent, this.handleTouchend, scrollChild);
          Event.off('mousedown', this.handleMousedown, scrollChild);
          Event.off('mousemove', this.handleTouchmove, scrollChild);
          Event.off('mouseup', this.handleTouchend, scrollChild);
        }
        if (scrollParent) {
          Event.off('scroll', this.handleScroll, scrollParent);
        }
        scrollParent = null;
        scrollChild = null;
      },
      finish: function () {
        var self = this;
        setTimeout(function () {

          global.requestAnimationFrame(tail);

          // scroll back to home during tail animation
          scrollTo(0, scrollTime, self.deactivate);

          // return to native scrolling after tail animation has time to finish
          setTimeout(function () {

            if (isOverscrolling) {
              isOverscrolling = false;
              self.setScrollLock(false);
            }

          }, scrollTime);

        }, scrollTime);
      },
      handleMousedown: function (e) {
        e.touches = e.touches || [{
            screenX: e.screenX,
            screenY: e.screenY
          }];
        // Mouse needs this
        startY = Math.floor(e.touches[0].screenY);
      },
      handleTouchstart: function (e) {
        e.touches = e.touches || [{
            screenX: e.screenX,
            screenY: e.screenY
          }];

        startY = e.touches[0].screenY;
      },
      handleTouchend: function (e) {
        // reset Y
        startY = null;
        // if this wasn't an overscroll, get out immediately
        if (!canOverscroll && !isDragging) {
          return;
        }
        // the user has overscrolled but went back to native scrolling
        if (!isDragging) {
          dragOffset = 0;
          isOverscrolling = false;
          this.setScrollLock(false);
        } else {
          isDragging = false;
          dragOffset = 0;

          // the user has scroll far enough to trigger a refresh
          if (lastOverscroll > ptrThreshold) {
            this.start();
            scrollTo(ptrThreshold, scrollTime);

            // the user has overscrolled but not far enough to trigger a refresh
          } else {
            scrollTo(0, scrollTime, this.deactivate);
            isOverscrolling = false;
          }
        }
      },
      handleTouchmove: function (e) {
        e.touches = e.touches || [{
            screenX: e.screenX,
            screenY: e.screenY
          }];

        // Force mouse events to have had a down event first
        if (!startY && e.type == 'mousemove') {
          return;
        }

        // if multitouch or regular scroll event, get out immediately
        //   if (!canOverscroll || e.touches.length > 1) {
        //     return;
        //   }
        //if this is a new drag, keep track of where we start
        if (startY === null) {
          startY = e.touches[0].screenY;
        }

        deltaY = e.touches[0].screenY - startY;

        // how far have we dragged so far?
        // kitkat fix for touchcancel events http://updates.html5rocks.com/2014/05/A-More-Compatible-Smoother-Touch
        // Only do this if we're not on crosswalk
        //   if (ionic.Platform.isAndroid() && ionic.Platform.version() === 4.4 && !ionic.Platform.isCrosswalk() && scrollParent.scrollTop === 0 && deltaY > 0) {
        //     isDragging = true;
        //     e.preventDefault();
        //   }


        // if we've dragged up and back down in to native scroll territory
        if (deltaY - dragOffset <= 0 || scrollParent.scrollTop > 0) {

          if (isOverscrolling) {
            isOverscrolling = false;
            this.setScrollLock(false);
          }

          if (isDragging) {
            this.nativescroll(scrollParent, deltaY - dragOffset * -1);
          }

          // if we're not at overscroll 0 yet, 0 out
          if (lastOverscroll !== 0) {
            this.overscroll(0);
          }
          return;

        } else if (deltaY > 0 && scrollParent.scrollTop === 0 && !isOverscrolling) {
          // starting overscroll, but drag started below scrollTop 0, so we need to offset the position
          dragOffset = deltaY;
        }

        // prevent native scroll events while overscrolling
        e.preventDefault();

        // if not overscrolling yet, initiate overscrolling
        if (!isOverscrolling) {
          isOverscrolling = true;
          this.setScrollLock(true);
        }

        isDragging = true;
        // overscroll according to the user's drag so far
        this.overscroll((deltaY - dragOffset) / 3);

        // update the icon accordingly
        if (!activated && lastOverscroll > ptrThreshold) {
          activated = true;
          global.requestAnimationFrame(activate);

        } else if (activated && lastOverscroll < ptrThreshold) {
          activated = false;
          global.requestAnimationFrame(deactivate);
        }
      },
      handleScroll: function (e) {
        // canOverscrol is used to greatly simplify the drag handler during normal scrolling
        canOverscroll = (e.target.scrollTop === 0) || isDragging;
      },
      overscroll: function (val) {
        scrollChild.style[CSS_TRANSFORM] = 'translate3d(0px, ' + val + 'px, 0px)';
        lastOverscroll = val;
      },
      nativescroll: function (target, newScrollTop) {
        // creates a scroll event that bubbles, can be cancelled, and with its view
        // and detail property initialized to global and 1, respectively
        target.scrollTop = newScrollTop;
        var e = document.createEvent("UIEvents");
        e.initUIEvent("scroll", true, true, global, 1);
        target.dispatchEvent(e);
      },
      setScrollLock: function (enabled) {
        // set the scrollbar to be position:fixed in preparation to overscroll
        // or remove it so the app can be natively scrolled
        if (enabled) {
          global.requestAnimationFrame(function () {
            scrollChild.classList.add('overscroll');
            this.show();
          });

        } else {
          global.requestAnimationFrame(function () {
            scrollChild.classList.remove('overscroll');
            this.hide();
            this.deactivate();
          });
        }
      },
      scrollTo: function (Y, duration, callback) {
        // scroll animation loop w/ easing
        // credit https://gist.github.com/dezinezync/5487119
        var start = Date.now(),
          from = lastOverscroll;

        if (from === Y) {
          callback();
          return;
          /* Prevent scrolling to the Y point if already there */
        }

        // decelerating to zero velocity
        function easeOutCubic(t) {
          return (--t) * t * t + 1;
        }

        // scroll loop
        function scroll() {
          var currentTime = Date.now(),
            time = Math.min(1, ((currentTime - start) / duration)),
            // where .5 would be 50% of time on a linear scale easedT gives a
            // fraction based on the easing method
            easedT = easeOutCubic(time);

          this.overscroll(Math.floor((easedT * (Y - from)) + from));

          if (time < 1) {
            global.requestAnimationFrame(scroll);

          } else {

            if (Y < 5 && Y > -5) {
              isOverscrolling = false;
              setScrollLock(false);
            }

            callback && callback();
          }
        }

        // start scroll loop
        global.requestAnimationFrame(scroll);
      },
      show: function () {
        refresher.classList.remove('invisible');
      },
      hide: function () {
        refresher.classList.add('invisible');
      },
      activate: function () {
        refresher.classList.add('active');
      },
      deactivate: function () {
        setTimeout(function () {
          refresher.classList.remove('active');
          refresher.classList.remove('refreshing');
          refresher.classList.remove('refreshing-tail');
          activated && (activated = false);
        }, 150);
      },
      tail: function () {
        refresher.classList.add('refreshing-tail');
      },
      start: function () {
        refresher.classList.add('refreshing');
      }
    }
  });


  if (typeof module !== 'undefined' && module.exports) {
    module.exports = NativeScroller;
  }

}());
