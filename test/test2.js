var startY = null;
var deltaY = null;


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


wrapper.addEventListener('touchstart', function (e) {
  e.preventDefault();

  e.touches = e.touches || [{
      screenX: e.screenX,
      screenY: e.screenY
    }];

  startY = Math.floor(e.touches[0].screenY);
});



document.addEventListener('touchmove', function (e) {
  e.touches = e.touches || [{
      screenX: e.screenX,
      screenY: e.screenY
    }];

  if (startY === null) {
    startY = e.touches[0].screenY;
  }

  deltaY = e.touches[0].screenY - startY;

  console.log(deltaY);
});
