var startY = null;
var deltaY = null;
var lastOverscroll = 0;
var scrollTime = 500;

var CSS_TRANSFORM = '-webkit-transform';
var isPrevent = true;

//animations:
var Animate = {
  easeOutCubic: function (t) {
    return (--t) * t * t + 1;
  }
};

//attach fastclick:
FastClick.attach(document.body);

//swiper:

var swiper = new Swiper('.swiper-container', {
  pagination: '.swiper-pagination',
  paginationClickable: true
});


//refreisher
var refresher = document.querySelector('.ion-refresher');
var wrapper = document.querySelector('.wrapper');
var scroller = document.querySelector('.scroller');
var data = document.querySelector('#data');
var btn = document.querySelector('#btn');


function overscroll(val) {
  scroller.style[CSS_TRANSFORM] = 'translate3d(0, ' + val + 'px, 0)';
  lastOverscroll = val;
}


function scrollTo(Y, duration, callback) {
  // scroll animation loop w/ easing
  // credit https://gist.github.com/dezinezync/5487119
  var self = this;
  var start = Date.now(),
    from = lastOverscroll;

  if (from === Y) {
    callback();
    return;
    /* Prevent scrolling to the Y point if already there */
  }

  // scroll loop
  function scroll() {
    var currentTime = Date.now(),
      time = Math.min(1, ((currentTime - start) / duration)),
      // where .5 would be 50% of time on a linear scale easedT gives a
      // fraction based on the easing method
      easedT = Animate.easeOutCubic(time);

    overscroll(Math.floor((easedT * (Y - from)) + from));

    if (time < 1) {
      requestAnimationFrame(scroll);

    }
  }

  // start scroll loop
  requestAnimationFrame(scroll);
}


function prevent(e) {
  if (isPrevent) {
    e.preventDefault();
  }
}

wrapper.addEventListener('touchstart', function (e) {


  e.touches = e.touches || [{
      screenX: e.screenX,
      screenY: e.screenY
    }];

  startY = Math.floor(e.touches[0].screenY);
});


wrapper.addEventListener('scroll', function (e) {
  // console.log(e.target.scrollTop);
  // e.preventDefault();
});

document.addEventListener('touchmove', function (e) {

  //e.preventDefault();

  prevent(e);

  e.touches = e.touches || [{
      screenX: e.screenX,
      screenY: e.screenY
    }];

  if (startY === null) {
    startY = e.touches[0].screenY;
  }

  deltaY = e.touches[0].screenY - startY;

  // console.log(deltaY);




  if (deltaY < 0) {
    isPrevent = false;
  } else {
    isPrevent = true;
  }

  overscroll(deltaY / 3);

});


document.addEventListener('touchend', function (e) {
  scrollTo(0, scrollTime);
});
