(function () {
'use strict';

var transitionEndName = ['webkitTransitionEnd', 'transitionend', 'msTransitionEnd', 'oTransitionEnd'];

function onEndTransition(el) {
	return new Promise(function (resolve, reject) {
		var onEndCallbackFn = function onEndCallbackFn(ev) {
			for (var i = 0; i < transitionEndName.length; i++) {
				el.removeEventListener(transitionEndName[i], onEndCallbackFn);
			}
			resolve();
		};

		if (!el) {
			reject('No element passed to on End Transition');
		}

		for (var i = 0; i < transitionEndName.length; i++) {
			el.addEventListener(transitionEndName[i], onEndCallbackFn);
		}
	});
}

function extend() {
	var objects = arguments;
	if (objects.length < 2) {
		return objects[0];
	}
	var combinedObject = objects[0];

	for (var i = 1; i < objects.length; i++) {
		if (!objects[i]) {
			continue;
		}
		for (var key in objects[i]) {
			combinedObject[key] = objects[i][key];
		}
	}

	return combinedObject;
}

function requestAnimationFramePromise() {
	return new Promise(function (resolve, reject) {
		return requestAnimationFrame(resolve);
	});
}

var knot = (function () {
  var object = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};

  var events = {};

  function on(name, handler) {
    events[name] = events[name] || [];
    events[name].push(handler);
    return this;
  }

  function once(name, handler) {
    handler._once = true;
    on(name, handler);
    return this;
  }

  function off(name) {
    var handler = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : false;

    handler ? events[name].splice(events[name].indexOf(handler), 1) : delete events[name];

    return this;
  }

  function emit(name) {
    var _this = this;

    for (var _len = arguments.length, args = Array(_len > 1 ? _len - 1 : 0), _key = 1; _key < _len; _key++) {
      args[_key - 1] = arguments[_key];
    }

    // cache the events, to avoid consequences of mutation
    var cache = events[name] && events[name].slice();

    // only fire handlers if they exist
    cache && cache.forEach(function (handler) {
      // remove handlers added with 'once'
      handler._once && off(name, handler);

      // set 'this' context, pass args to handlers
      handler.apply(_this, args);
    });

    return this;
  }

  var out = object;
  out.on = on;
  out.ounce = once;
  out.off = off;
  out.emit = emit;

  return out;
});

var Bricks = (function () {
	var options = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};

	// globals

	var persist = void 0; // updating or packing all elements?
	var ticking = void 0; // for debounced resize

	var sizeIndex = void 0;
	var sizeDetail = void 0;

	var columnHeights = void 0;

	var nodes = void 0;
	var nodesWidth = void 0;
	var nodesHeights = void 0;

	// options
	var container = document.querySelector(options.container);
	var packed = options.packed.indexOf('data-') === 0 ? options.packed : 'data-' + options.packed;
	var sizes = options.sizes.slice().reverse();

	var selectors = {
		all: options.container + ' > *',
		new: options.container + ' > *:not([' + packed + '])'
	};

	// series

	var setup = [setSizeIndex, setSizeDetail, setColumns];

	var run = [setNodes, setNodesDimensions, setNodesStyles, setContainerStyles];

	// instance

	var instance = knot({
		pack: pack,
		update: update,
		resize: resize
	});

	return instance;

	// general helpers

	function runSeries(functions) {
		functions.forEach(function (func) {
			return func();
		});
	}

	// array helpers

	function toArray(selector) {
		return Array.prototype.slice.call(document.querySelectorAll(selector));
	}

	function fillArray(length) {
		return Array.apply(null, Array(length)).map(function () {
			return 0;
		});
	}

	// size helpers

	function getSizeIndex() {
		// find index of widest matching media query
		return sizes.map(function (size) {
			return size.mq && window.matchMedia('(min-width: ' + size.mq + ')').matches;
		}).indexOf(true);
	}

	function setSizeIndex() {
		sizeIndex = getSizeIndex();
	}

	function setSizeDetail() {
		// if no media queries matched, use the base case
		sizeDetail = sizeIndex === -1 ? sizes[sizes.length - 1] : sizes[sizeIndex];
	}

	// column helpers

	function setColumns() {
		columnHeights = fillArray(sizeDetail.columns);
	}

	// node helpers

	function setNodes() {
		nodes = toArray(persist ? selectors.new : selectors.all);
	}

	function setNodesDimensions() {
		if (nodes.length === 0) {
			return;
		}

		nodesWidth = nodes[0].clientWidth;
		nodesHeights = nodes.map(function (element) {
			return element.clientHeight;
		});
	}

	function setNodesStyles() {
		nodes.forEach(function (element, index) {
			var target = columnHeights.indexOf(Math.min.apply(Math, columnHeights));

			element.style.position = 'absolute';
			element.style.top = columnHeights[target] + 'px';
			element.style.left = target * nodesWidth + target * sizeDetail.gutter + 'px';

			element.setAttribute(packed, '');

			columnHeights[target] += nodesHeights[index] + sizeDetail.gutter;
		});
	}

	// container helpers

	function setContainerStyles() {
		container.style.position = 'relative';
		container.style.width = sizeDetail.columns * nodesWidth + (sizeDetail.columns - 1) * sizeDetail.gutter + 'px';
		container.style.height = Math.max.apply(Math, columnHeights) - sizeDetail.gutter + 'px';
	}

	// resize helpers

	function resizeFrame() {
		if (!ticking) {
			requestAnimationFrame(resizeHandler);
			ticking = true;
		}
	}

	function resizeHandler() {
		if (sizeIndex !== getSizeIndex()) {
			pack();
			instance.emit('resize', sizeDetail);
		}

		ticking = false;
	}

	// API

	function pack() {
		persist = false;
		runSeries(setup.concat(run));

		return instance.emit('pack');
	}

	function update() {
		persist = true;
		runSeries(run);

		return instance.emit('update');
	}

	function resize() {
		var flag = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : true;

		var action = flag ? 'addEventListener' : 'removeEventListener';

		window[action]('resize', resizeFrame);

		return instance;
	}
});

var GalleryGrid = {
	setup: setup,
	init: init$1,

	openItem: openItem,
	closeItem: closeItem,
	nextItem: nextItem,
	previousItem: previousItem
};

var defaultOptions = {
	// x and y can have values from 0 to 1 (percentage). If negative then it means the alignment is left and/or top rather than right and/or bottom
	// so, as an example, if we want our large image to be positioned vertically on 25% of the screen and centered horizontally the values would be x:1,y:-0.25
	imgPositions: [{ pos: { x: 1, y: 1 }, pagemargin: 0 }],
	sizes: [{ columns: 1, gutter: 30 }, { mq: '1024px', columns: 5, gutter: 30 }]
};

function createGalleryGrid$1(el, options) {
	var galGridObj = Object.create(GalleryGrid);
	galGridObj.setup(el, options);
	galGridObj.init();
	return galGridObj;
}

function setup(elClass, options) {
	this.elClass = elClass;
	this.el = document.querySelector(elClass);
	if (!this.el) {
		return;
	}

	this.options = extend({}, defaultOptions, options);
	this.sizeIndex = getSizeIndex.call(this);
	this.items = Array.prototype.slice.call(this.el.querySelectorAll('.gallery__item'));
	this.previewEl = this.el.nextElementSibling;
	this.isExpanded = false;
	this.isAnimating = false;
	this.ticking = false;
	this.closeBtn = this.previewEl.querySelector('.gallery__preview-close');
	var previewDescriptions = this.previewEl.querySelectorAll('.gallery__preview-description');
	this.previewDescriptionEl = previewDescriptions[0];
	this.emptyPreviewDescriptionEl = previewDescriptions[1];

	this.previousBtn = this.previewEl.querySelector('.gallery__preview-btn--previous');
	this.nextBtn = this.previewEl.querySelector('.gallery__preview-btn--next');

	this.openItem = this.openItem.bind(this);
	this.closeItem = this.closeItem.bind(this);
	this.nextItem = this.nextItem.bind(this);
	this.previousItem = this.previousItem.bind(this);
}

function init$1() {
	if (!this.el) {
		return;
	}

	var initAfterImagesLoad = function initAfterImagesLoad() {
		this.bricks = Bricks({
			container: this.elClass,
			packed: 'data-packed',
			sizes: this.options.sizes
		});

		this.bricks.resize(true).pack();

		this.el.classList.add('gallery--loaded');

		addEventListeners.call(this);
		setOriginal.call(this);
		setClone.call(this);
	};

	Promise.all(gridImagesLoaded.call(this)).then(initAfterImagesLoad.bind(this));
}

function addEventListeners() {
	var self = this;

	this.items.forEach(function (item) {
		if (!item.querySelector('.gallery__image')) {
			return;
		}
		item.addEventListener('click', function (evt) {
			evt.preventDefault();
			self.openItem(item);
		});
	});

	this.closeBtn.addEventListener('click', this.closeItem);
	this.previousBtn.addEventListener('click', this.previousItem);
	this.nextBtn.addEventListener('click', this.nextItem);
	window.addEventListener('resize', resizeFrame.bind(this));
	window.addEventListener('keydown', function (evt) {
		if (evt.key == "Escape") {
			this.closeItem();
		}
		if (evt.key == "ArrowRight") {
			this.nextItem();
		}
		if (evt.key == "ArrowLeft") {
			this.previousItem();
		}
	}.bind(this));
}

function getSizeIndex() {
	var newSizeIndex = this.options.imgPositions.map(function (size) {
		return size.mq && window.matchMedia('(min-width: ' + size.mq + ')').matches;
	}).indexOf(true);
	return ~newSizeIndex ? newSizeIndex : 0;
}

function resizeFrame() {
	if (!this.ticking) {
		requestAnimationFrame(resizeHandler.bind(this));
		this.ticking = true;
	}
}

function resizeHandler() {
	var newSizeIndex = getSizeIndex.call(this);
	if (this.sizeIndex !== newSizeIndex) {
		this.sizeIndex = newSizeIndex;
		setOriginal.call(this);

		if (this.isExpanded) {
			this.originalImg.style.opacity = 1;
		}
	}
	this.ticking = false;
}

function openItem(item) {
	if (this.isAnimating || this.isExpanded) {
		return;
	}
	this.isAnimating = true;
	this.isExpanded = true;

	updateSlideBtnStatus.call(this, item);

	var itemImage = item.querySelector('img'),
	    itemImageBCR = itemImage.getBoundingClientRect();

	this.current = this.items.indexOf(item);

	setOriginal.call(this, item.querySelector('a').getAttribute('href'));

	setClone.call(this, itemImage.src, {
		width: itemImage.offsetWidth,
		height: itemImage.offsetHeight,
		left: itemImageBCR.left,
		top: itemImageBCR.top
	});

	item.classList.add('gallery__item--current');

	var pageMargin = 0;
	if (typeof this.options.imgPositions[this.sizeIndex].pagemargin !== 'undefined') {
		pageMargin = this.options.imgPositions[this.sizeIndex].pagemargin;
	}

	var win = getWinSize(),
	    originalSizeArr = item.getAttribute('data-size').split('x'),
	    originalSize = { width: originalSizeArr[0], height: originalSizeArr[1] },
	    dx = (this.options.imgPositions[this.sizeIndex].pos.x > 0 ? 1 - Math.abs(this.options.imgPositions[this.sizeIndex].pos.x) : Math.abs(this.options.imgPositions[this.sizeIndex].pos.x)) * win.width + this.options.imgPositions[this.sizeIndex].pos.x * win.width / 2 - itemImageBCR.left - 0.5 * itemImage.offsetWidth,
	    dy = (this.options.imgPositions[this.sizeIndex].pos.y > 0 ? 1 - Math.abs(this.options.imgPositions[this.sizeIndex].pos.y) : Math.abs(this.options.imgPositions[this.sizeIndex].pos.y)) * win.height + this.options.imgPositions[this.sizeIndex].pos.y * win.height / 2 - itemImageBCR.top - 0.5 * itemImage.offsetHeight,
	    z = Math.min(Math.min(win.width * Math.abs(this.options.imgPositions[this.sizeIndex].pos.x) - pageMargin, originalSize.width - pageMargin) / itemImage.offsetWidth, Math.min(win.height * Math.abs(this.options.imgPositions[this.sizeIndex].pos.y) - pageMargin, originalSize.height - pageMargin) / itemImage.offsetHeight);

	var transform = 'translate3d(' + dx + 'px, ' + dy + 'px, 0) scale3d(' + z + ', ' + z + ', 1)';
	this.cloneImg.style.WebkitTransform = transform;
	this.cloneImg.style.transform = transform;

	var descriptionEl = item.querySelector('.gallery__description');
	if (descriptionEl) {
		this.previewDescriptionEl.innerHTML = descriptionEl.innerHTML;
	}

	var self = this;
	setTimeout(function () {
		self.previewEl.classList.add('gallery__preview--open');
	}, 0);

	Promise.all([onEndTransition(this.cloneImg), originalImageLoadPromise.call(this)]).then(function () {
		self.originalImg.style.opacity = 1;
	}).then(function () {
		return onEndTransition(self.originalImg);
	}).then(function () {
		self.cloneImg.style.opacity = 0;
		self.cloneImg.style.WebkitTransform = 'translate3d(0,0,0) scale3d(1,1,1)';
		self.cloneImg.style.transform = 'translate3d(0,0,0) scale3d(1,1,1)';

		self.isAnimating = false;
	}).catch(function (reason) {
		console.error(reason);
	});
}

function setOriginal(src) {
	if (!src) {
		this.originalImg = document.createElement('img');
		this.originalImg.className = 'gallery__preview-original';
		this.originalImg.style.opacity = 0;
		var pageMargin = 0;
		if (typeof this.options.imgPositions[this.sizeIndex].pagemargin !== 'undefined') {
			pageMargin = this.options.imgPositions[this.sizeIndex].pagemargin;
		}
		this.originalImg.style.maxWidth = 'calc(' + parseInt(Math.abs(this.options.imgPositions[this.sizeIndex].pos.x) * 100) + 'vw - ' + pageMargin + 'px)';
		this.originalImg.style.maxHeight = 'calc(' + parseInt(Math.abs(this.options.imgPositions[this.sizeIndex].pos.y) * 100) + 'vh - ' + pageMargin + 'px)';
		this.originalImg.style.WebkitTransform = 'translate3d(0,0,0)';
		this.originalImg.style.transform = 'translate3d(0,0,0)';
		src = '';
		var oldEl = this.previewEl.querySelector('.' + this.originalImg.className);
		if (oldEl) {
			src = oldEl.src;
			oldEl.remove();
		}
		this.previewEl.appendChild(this.originalImg);
	}

	this.originalImg.setAttribute('src', src);
}

function originalImageLoadPromise() {
	return imageLoadPromise(this.originalImg);
}

function imageLoadPromise(img) {
	var imageLoadPromise = function imageLoadPromise(resolve, reject) {
		if (!img.getAttribute('src')) {
			reject('no src found for original image');
		}

		var imageLoad = function imageLoad() {
			if (img.complete) {
				resolve();
			} else {
				reject('image not loaded: ' + img.getAttribute('src'));
			}
		};

		if (img.complete) {
			resolve();
		} else {
			img.onload = imageLoad.bind(this);
		}
	};

	return new Promise(imageLoadPromise.bind(this));
}

function gridImagesLoaded() {
	return this.items.map(function (item) {
		var img = item.querySelector('img');
		if (!img) {
			return;
		}
		return imageLoadPromise(img);
	});
}

function setClone(src, settings) {
	if (!src) {
		this.cloneImg = document.createElement('img');
		this.cloneImg.className = 'gallery__preview-clone';
		src = '';
		this.cloneImg.style.opacity = 0;
		this.previewEl.appendChild(this.cloneImg);
	} else {
		this.cloneImg.style.opacity = 1;
		this.cloneImg.style.width = settings.width + 'px';
		this.cloneImg.style.height = settings.height + 'px';
		this.cloneImg.style.top = settings.top + 'px';
		this.cloneImg.style.left = settings.left + 'px';
	}

	this.cloneImg.setAttribute('src', src);
}

function closeItem() {
	if (!this.isExpanded || this.isAnimating) {
		return;
	}
	this.isExpanded = false;
	this.isAnimating = true;

	var item = this.items[this.current],
	    itemImage = item.querySelector('img'),
	    itemImageBCR = itemImage.getBoundingClientRect(),
	    self = this;

	this.previewEl.classList.remove('gallery__preview--open');

	this.originalImg.classList.add('gallery__preview-original--animate');

	var win = getWinSize(),
	    dx = itemImageBCR.left + itemImage.offsetWidth / 2 - ((this.options.imgPositions[this.sizeIndex].pos.x > 0 ? 1 - Math.abs(this.options.imgPositions[this.sizeIndex].pos.x) : Math.abs(this.options.imgPositions[this.sizeIndex].pos.x)) * win.width + this.options.imgPositions[this.sizeIndex].pos.x * win.width / 2),
	    dy = itemImageBCR.top + itemImage.offsetHeight / 2 - ((this.options.imgPositions[this.sizeIndex].pos.y > 0 ? 1 - Math.abs(this.options.imgPositions[this.sizeIndex].pos.y) : Math.abs(this.options.imgPositions[this.sizeIndex].pos.y)) * win.height + this.options.imgPositions[this.sizeIndex].pos.y * win.height / 2),
	    z = itemImage.offsetWidth / this.originalImg.offsetWidth;

	this.originalImg.style.WebkitTransform = 'translate3d(' + dx + 'px, ' + dy + 'px, 0) scale3d(' + z + ', ' + z + ', 1)';
	this.originalImg.style.transform = 'translate3d(' + dx + 'px, ' + dy + 'px, 0) scale3d(' + z + ', ' + z + ', 1)';

	onEndTransition(this.originalImg).then(function () {
		self.previewDescriptionEl.innerHTML = '';
		item.classList.remove('gallery__item--current');
		setTimeout(function () {
			self.originalImg.style.opacity = 0;
		}, 60);
	}).then(function () {
		return onEndTransition(self.originalImg);
	}).then(function () {
		self.originalImg.classList.remove('gallery__preview-original--animate');
		self.originalImg.style.WebkitTransform = 'translate3d(0,0,0) scale3d(1,1,1)';
		self.originalImg.style.transform = 'translate3d(0,0,0) scale3d(1,1,1)';

		self.isAnimating = false;
	}).catch(function (reason) {
		console.error(reason);
	});
}

function nextItem() {
	slideItem.call(this, 50, getNextItem);
}

function previousItem() {
	slideItem.call(this, -50, getPreviousItem);
}

function slideItem(changeDistance, getItemCb) {
	var _this = this;

	// if preview is closed or animation is happening do nothing
	if (!this.isExpanded || this.isAnimating) {
		return;
	}

	var lastItem = this.items[this.current]; //get the current item
	var nextItem = getItemCb(lastItem); //get the next item
	if (!lastItem || !nextItem || !nextItem.classList.contains('gallery__item')) {
		//if there is no next item do nothing
		return;
	}

	this.isAnimating = true;
	this.current = this.items.indexOf(nextItem); //update current index

	lastItem.classList.remove('gallery__item--current');
	nextItem.classList.add('gallery__item--current');

	updateSlideBtnStatus.call(this, nextItem);

	/*
 set the cloned thumbnail of the next item
 		* don't transition the cloned thumbnail
 		* set it to the final position
 */
	var itemImage = nextItem.querySelector('img'),
	    itemImageBCR = itemImage.getBoundingClientRect();

	setClone.call(this, itemImage.src, {
		width: itemImage.offsetWidth,
		height: itemImage.offsetHeight,
		left: itemImageBCR.left,
		top: itemImageBCR.top
	});

	var pageMargin = 0;
	if (typeof this.options.imgPositions[this.sizeIndex].pagemargin !== 'undefined') {
		pageMargin = this.options.imgPositions[this.sizeIndex].pagemargin;
	}

	if (!changeDistance) {
		changeDistance = 50;
	}

	var win = getWinSize(),
	    originalSizeArr = nextItem.getAttribute('data-size').split('x'),
	    originalSize = { width: originalSizeArr[0], height: originalSizeArr[1] },
	    dx = (this.options.imgPositions[this.sizeIndex].pos.x > 0 ? 1 - Math.abs(this.options.imgPositions[this.sizeIndex].pos.x) : Math.abs(this.options.imgPositions[this.sizeIndex].pos.x)) * win.width + this.options.imgPositions[this.sizeIndex].pos.x * win.width / 2 - itemImageBCR.left - 0.5 * itemImage.offsetWidth,
	    dy = (this.options.imgPositions[this.sizeIndex].pos.y > 0 ? 1 - Math.abs(this.options.imgPositions[this.sizeIndex].pos.y) : Math.abs(this.options.imgPositions[this.sizeIndex].pos.y)) * win.height + this.options.imgPositions[this.sizeIndex].pos.y * win.height / 2 - itemImageBCR.top - 0.5 * itemImage.offsetHeight,
	    z = Math.min(Math.min(win.width * Math.abs(this.options.imgPositions[this.sizeIndex].pos.x) - pageMargin, originalSize.width - pageMargin) / itemImage.offsetWidth, Math.min(win.height * Math.abs(this.options.imgPositions[this.sizeIndex].pos.y) - pageMargin, originalSize.height - pageMargin) / itemImage.offsetHeight),
	    changeDistanceDx = dx + changeDistance;

	var cloneTransform = 'translate3d(' + changeDistanceDx + 'px, ' + dy + 'px, 0) scale3d(' + z + ', ' + z + ', 1)';
	this.cloneImg.style.transition = 'none';
	this.cloneImg.style.WebkitTransform = cloneTransform;
	this.cloneImg.style.transform = cloneTransform;

	var descriptionEl = nextItem.querySelector('.gallery__description');
	if (descriptionEl) {
		this.emptyPreviewDescriptionEl.classList.add('gallery__preview-description--animate');
		this.previewDescriptionEl.classList.add('gallery__preview-description--animate');

		this.emptyPreviewDescriptionEl.innerHTML = descriptionEl.innerHTML;

		this.emptyPreviewDescriptionEl.style.transition = 'none';
		this.emptyPreviewDescriptionEl.style.opacity = 0;
		var emptyDescriptionTransform = 'translate3d(0, ' + changeDistance + 'px, 0)';
		this.emptyPreviewDescriptionEl.style.WebkitTransform = emptyDescriptionTransform;
		this.emptyPreviewDescriptionEl.style.transform = emptyDescriptionTransform;
	}

	var self = this;

	requestAnimationFramePromise().then(function () {
		//old original image fade out
		var originalImgTransform = 'translate3d(-' + changeDistance + 'px, 0, 0)';
		self.originalImg.classList.add('gallery__preview-original--animate');
		self.originalImg.style.opacity = 0;
		self.originalImg.style.WebkitTransform = originalImgTransform;
		self.originalImg.style.transform = originalImgTransform;

		//fade in cloned image
		self.cloneImg.style.transition = '';
		var cloneTransform = 'translate3d(' + dx + 'px, ' + dy + 'px, 0) scale3d(' + z + ', ' + z + ', 1)';
		self.cloneImg.style.WebkitTransform = cloneTransform;
		self.cloneImg.style.transform = cloneTransform;
		self.cloneImg.style.opacity = 1;

		var descriptionTransform = 'translate3d(0, -' + changeDistance + 'px, 0)';
		self.previewDescriptionEl.style.opacity = 0;
		self.previewDescriptionEl.style.WebkitTransform = descriptionTransform;
		self.previewDescriptionEl.style.transform = descriptionTransform;

		self.emptyPreviewDescriptionEl.style.transition = '';
		self.emptyPreviewDescriptionEl.style.opacity = 1;
		var emptyDescriptionTransform = 'translate3d(0, 0, 0)';
		self.emptyPreviewDescriptionEl.style.WebkitTransform = emptyDescriptionTransform;
		self.emptyPreviewDescriptionEl.style.transform = emptyDescriptionTransform;

		var tmpDescription = self.previewDescriptionEl;
		self.previewDescriptionEl = self.emptyPreviewDescriptionEl;
		self.emptyPreviewDescriptionEl = tmpDescription;
	}).then(function () {
		return onEndTransition(self.originalImg);
	}) //when old main image has fade out
	.then(function () {
		// rest position of original image with no transition
		self.originalImg.classList.remove('gallery__preview-original--animate');
		var originalImgTransform = 'translate3d(0, 0, 0)';
		self.originalImg.style.WebkitTransform = originalImgTransform;
		self.originalImg.style.transform = originalImgTransform;
	}).then(function () {
		return setOriginal.call(self, nextItem.querySelector('a').getAttribute('href'));
	}) //set new main image
	.then(function () {
		return imageLoadPromise.call(self, self.originalImg);
	}) //when this has loaded
	.then(function () {
		self.originalImg.style.transition = '';
		self.originalImg.style.opacity = 1;
	}).then(function () {
		return onEndTransition(self.originalImg);
	}).then(function () {
		self.cloneImg.style.opacity = 0;
		self.cloneImg.style.WebkitTransform = 'translate3d(0,0,0) scale3d(1,1,1)';
		self.cloneImg.style.transform = 'translate3d(0,0,0) scale3d(1,1,1)';
		_this.cloneImg.style.transition = '';

		self.emptyPreviewDescriptionEl.classList.remove('gallery__preview-description--animate');
		self.previewDescriptionEl.classList.remove('gallery__preview-description--animate');

		self.emptyPreviewDescriptionEl.innerHTML = '';
		self.emptyPreviewDescriptionEl.style.opacity = '';
		self.emptyPreviewDescriptionEl.style.WebkitTransform = '';
		self.emptyPreviewDescriptionEl.style.transform = '';

		self.previewDescriptionEl.style.opacity = '';
		self.previewDescriptionEl.style.WebkitTransform = '';
		self.previewDescriptionEl.style.transform = '';

		self.isAnimating = false;
	}).catch(function (reason) {
		console.error(reason);
	});
}

function getNextItem(currentItem) {
	var item = currentItem;
	while (item = item.nextElementSibling) {
		if (item.getAttribute('data-size')) {
			return item;
		}
	}
	return null;
}

function getPreviousItem(currentItem) {
	var item = currentItem;
	while (item = item.previousElementSibling) {
		if (item.getAttribute('data-size')) {
			return item;
		}
	}
	return null;
}

function updateSlideBtnStatus(currentItem) {
	if (!getNextItem(currentItem)) {
		this.nextBtn.classList.add('gallery__preview-btn--disabled');
	} else {
		this.nextBtn.classList.remove('gallery__preview-btn--disabled');
	}

	if (!getPreviousItem(currentItem)) {
		this.previousBtn.classList.add('gallery__preview-btn--disabled');
	} else {
		this.previousBtn.classList.remove('gallery__preview-btn--disabled');
	}
}

function getWinSize() {
	return {
		width: document.documentElement.clientWidth,
		height: window.innerHeight
	};
}

//import poly from './util/polyfills';

//import svg4everybody from '../vendor/svg4everybody';
function init() {
	//poly();

	//svg4everybody();
	setupGalleryGrid();
}

function setupGalleryGrid() {
	createGalleryGrid$1('.js-gallery', {
		imgPositions: [{ pos: { x: 1, y: -0.5 }, pagemargin: 30 }, { mq: '48em', pos: { x: -0.5, y: 1 }, pagemargin: 30 }],
		sizes: [{ columns: 2, gutter: 15 }, { mq: '560px', columns: 2, gutter: 15 }, { mq: '768px', columns: 3, gutter: 15 }, { mq: '920px', columns: 4, gutter: 15 }, { mq: '1180px', columns: 5, gutter: 15 }]
	});
}

if (document.readyState != 'loading') {
	init();
} else {
	document.addEventListener('DOMContentLoaded', init);
}

}());

//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjpudWxsLCJzb3VyY2VzIjpbIkM6L2RhdGEvZnJvbnRlbmQtZGV2L2phdmFzY3JpcHQtcHJvamVjdHMvZ2FsbGVyeS9zb3VyY2UvanMvc3JjL3V0aWwvdXRpbC5qcyIsIkM6L2RhdGEvZnJvbnRlbmQtZGV2L2phdmFzY3JpcHQtcHJvamVjdHMvZ2FsbGVyeS9zb3VyY2UvanMvdmVuZG9yL2tub3QuanMiLCJDOi9kYXRhL2Zyb250ZW5kLWRldi9qYXZhc2NyaXB0LXByb2plY3RzL2dhbGxlcnkvc291cmNlL2pzL3ZlbmRvci9icmljay5qcyIsIkM6L2RhdGEvZnJvbnRlbmQtZGV2L2phdmFzY3JpcHQtcHJvamVjdHMvZ2FsbGVyeS9zb3VyY2UvanMvc3JjL3VpL2dhbGxlcnktZ3JpZC5qcyIsIkM6L2RhdGEvZnJvbnRlbmQtZGV2L2phdmFzY3JpcHQtcHJvamVjdHMvZ2FsbGVyeS9zb3VyY2UvanMvc3JjL2luZGV4LmpzIl0sInNvdXJjZXNDb250ZW50IjpbIid1c2Ugc3RyaWN0JztcblxuY29uc3QgYW5pbWF0aW9uRW5kRXZlbnROYW1lID0gWydhbmltYXRpb25lbmQnLCAnd2Via2l0QW5pbWF0aW9uRW5kJywgJ01TQW5pbWF0aW9uRW5kJywgJ29BbmltYXRpb25FbmQnXTtcblxuZnVuY3Rpb24gb25FbmRBbmltYXRpb24oZWwpe1xuXHRyZXR1cm4gbmV3IFByb21pc2UoZnVuY3Rpb24ocmVzb2x2ZSwgcmVqZWN0KXtcblx0XHRjb25zdCBvbkVuZENhbGxiYWNrRm4gPSBmdW5jdGlvbihldnQpe1xuXHRcdFx0Zm9yIChsZXQgaSA9IDA7IGkgPCBhbmltYXRpb25FbmRFdmVudE5hbWUubGVuZ3RoOyBpKyspIHtcblx0XHRcdFx0ZWwucmVtb3ZlRXZlbnRMaXN0ZW5lcihhbmltYXRpb25FbmRFdmVudE5hbWVbaV0sIG9uRW5kQ2FsbGJhY2tGbik7XG5cdFx0XHR9XG5cdFx0XHRyZXNvbHZlKCk7XG5cdFx0fTtcblxuXHRcdGlmKCFlbCl7XG5cdFx0XHRyZWplY3QoJ05vIGVsZW1lbnQgcGFzc2VkIHRvIG9uIEVuZCBBbmltYXRpb24nKTtcblx0XHR9XG5cblx0XHRmb3IgKGxldCBpID0gMDsgaSA8IGFuaW1hdGlvbkVuZEV2ZW50TmFtZS5sZW5ndGg7IGkrKykge1xuXHRcdFx0ZWwuYWRkRXZlbnRMaXN0ZW5lcihhbmltYXRpb25FbmRFdmVudE5hbWVbaV0sIG9uRW5kQ2FsbGJhY2tGbik7XG5cdFx0fVxuXHR9KTtcbn1cblxuY29uc3QgdHJhbnNpdGlvbkVuZE5hbWUgPSBbJ3dlYmtpdFRyYW5zaXRpb25FbmQnLCAndHJhbnNpdGlvbmVuZCcsICdtc1RyYW5zaXRpb25FbmQnLCAnb1RyYW5zaXRpb25FbmQnXTtcblxuZnVuY3Rpb24gb25FbmRUcmFuc2l0aW9uKGVsKXtcblx0cmV0dXJuIG5ldyBQcm9taXNlKGZ1bmN0aW9uKHJlc29sdmUsIHJlamVjdCl7XG5cdFx0Y29uc3Qgb25FbmRDYWxsYmFja0ZuID0gZnVuY3Rpb24oZXYpe1xuXHRcdFx0Zm9yIChsZXQgaSA9IDA7IGkgPCB0cmFuc2l0aW9uRW5kTmFtZS5sZW5ndGg7IGkrKykge1xuXHRcdFx0XHRlbC5yZW1vdmVFdmVudExpc3RlbmVyKHRyYW5zaXRpb25FbmROYW1lW2ldLCBvbkVuZENhbGxiYWNrRm4pO1xuXHRcdFx0fVxuXHRcdFx0cmVzb2x2ZSgpO1xuXHRcdH07XG5cblx0XHRpZighZWwpe1xuXHRcdFx0cmVqZWN0KCdObyBlbGVtZW50IHBhc3NlZCB0byBvbiBFbmQgVHJhbnNpdGlvbicpO1xuXHRcdH1cblxuXHRcdGZvciAobGV0IGkgPSAwOyBpIDwgdHJhbnNpdGlvbkVuZE5hbWUubGVuZ3RoOyBpKyspIHtcblx0XHRcdGVsLmFkZEV2ZW50TGlzdGVuZXIodHJhbnNpdGlvbkVuZE5hbWVbaV0sIG9uRW5kQ2FsbGJhY2tGbik7XG5cdFx0fVxuXHR9KTtcbn1cblxuZnVuY3Rpb24gZXh0ZW5kKCl7XG5cdGNvbnN0IG9iamVjdHMgPSBhcmd1bWVudHM7XG5cdGlmKG9iamVjdHMubGVuZ3RoIDwgMil7XG5cdFx0cmV0dXJuIG9iamVjdHNbMF07XG5cdH1cblx0Y29uc3QgY29tYmluZWRPYmplY3QgPSBvYmplY3RzWzBdO1xuXG5cdGZvcihsZXQgaSA9IDE7IGkgPCBvYmplY3RzLmxlbmd0aDsgaSsrKXtcblx0XHRpZighb2JqZWN0c1tpXSl7XG5cdFx0XHRjb250aW51ZTtcblx0XHR9XG5cdFx0Zm9yKGxldCBrZXkgaW4gb2JqZWN0c1tpXSl7XG5cdFx0XHRjb21iaW5lZE9iamVjdFtrZXldID0gb2JqZWN0c1tpXVtrZXldO1xuXHRcdH1cblx0fVxuXG5cdHJldHVybiBjb21iaW5lZE9iamVjdDtcbn1cblxuZnVuY3Rpb24gcmVxdWVzdEFuaW1hdGlvbkZyYW1lUHJvbWlzZSgpe1xuXHRyZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4gcmVxdWVzdEFuaW1hdGlvbkZyYW1lKHJlc29sdmUpKTtcbn1cblxuZXhwb3J0IHtvbkVuZEFuaW1hdGlvbiwgb25FbmRUcmFuc2l0aW9uLCBleHRlbmQsIHJlcXVlc3RBbmltYXRpb25GcmFtZVByb21pc2V9O1xuIiwiZXhwb3J0IGRlZmF1bHQgKG9iamVjdCA9IHt9KSA9PiB7XHJcbiAgY29uc3QgZXZlbnRzID0ge31cclxuXHJcbiAgZnVuY3Rpb24gb24obmFtZSwgaGFuZGxlcikge1xyXG4gICAgZXZlbnRzW25hbWVdID0gZXZlbnRzW25hbWVdIHx8IFtdXHJcbiAgICBldmVudHNbbmFtZV0ucHVzaChoYW5kbGVyKVxyXG4gICAgcmV0dXJuIHRoaXNcclxuICB9XHJcblxyXG4gIGZ1bmN0aW9uIG9uY2UobmFtZSwgaGFuZGxlcikge1xyXG4gICAgaGFuZGxlci5fb25jZSA9IHRydWVcclxuICAgIG9uKG5hbWUsIGhhbmRsZXIpXHJcbiAgICByZXR1cm4gdGhpc1xyXG4gIH1cclxuXHJcbiAgZnVuY3Rpb24gb2ZmKG5hbWUsIGhhbmRsZXIgPSBmYWxzZSkge1xyXG4gICAgaGFuZGxlclxyXG4gICAgICA/IGV2ZW50c1tuYW1lXS5zcGxpY2UoZXZlbnRzW25hbWVdLmluZGV4T2YoaGFuZGxlciksIDEpXHJcbiAgICAgIDogZGVsZXRlIGV2ZW50c1tuYW1lXVxyXG5cclxuICAgIHJldHVybiB0aGlzXHJcbiAgfVxyXG5cclxuICBmdW5jdGlvbiBlbWl0KG5hbWUsIC4uLmFyZ3MpIHtcclxuICAgIC8vIGNhY2hlIHRoZSBldmVudHMsIHRvIGF2b2lkIGNvbnNlcXVlbmNlcyBvZiBtdXRhdGlvblxyXG4gICAgY29uc3QgY2FjaGUgPSBldmVudHNbbmFtZV0gJiYgZXZlbnRzW25hbWVdLnNsaWNlKClcclxuXHJcbiAgICAvLyBvbmx5IGZpcmUgaGFuZGxlcnMgaWYgdGhleSBleGlzdFxyXG4gICAgY2FjaGUgJiYgY2FjaGUuZm9yRWFjaChoYW5kbGVyID0+IHtcclxuICAgICAgLy8gcmVtb3ZlIGhhbmRsZXJzIGFkZGVkIHdpdGggJ29uY2UnXHJcbiAgICAgIGhhbmRsZXIuX29uY2UgJiYgb2ZmKG5hbWUsIGhhbmRsZXIpXHJcblxyXG4gICAgICAvLyBzZXQgJ3RoaXMnIGNvbnRleHQsIHBhc3MgYXJncyB0byBoYW5kbGVyc1xyXG4gICAgICBoYW5kbGVyLmFwcGx5KHRoaXMsIGFyZ3MpXHJcbiAgICB9KVxyXG5cclxuICAgIHJldHVybiB0aGlzXHJcbiAgfVxyXG5cclxuICBjb25zdCBvdXQgPSBvYmplY3Q7XHJcbiAgb3V0Lm9uID0gb247XHJcbiAgb3V0Lm91bmNlID0gb25jZTtcclxuICBvdXQub2ZmID0gb2ZmO1xyXG4gIG91dC5lbWl0ID0gZW1pdDtcclxuXHJcbiAgcmV0dXJuIG91dDtcclxufSIsImltcG9ydCBrbm90IGZyb20gJy4va25vdC5qcyc7XG5cbmV4cG9ydCBkZWZhdWx0IChvcHRpb25zID0ge30pID0+IHtcblx0Ly8gZ2xvYmFsc1xuXG5cdGxldCBwZXJzaXN0OyAgICAgICAgICAgLy8gdXBkYXRpbmcgb3IgcGFja2luZyBhbGwgZWxlbWVudHM/XG5cdGxldCB0aWNraW5nOyAgICAgICAgICAgLy8gZm9yIGRlYm91bmNlZCByZXNpemVcblxuXHRsZXQgc2l6ZUluZGV4O1xuXHRsZXQgc2l6ZURldGFpbDtcblxuXHRsZXQgY29sdW1uSGVpZ2h0cztcblxuXHRsZXQgbm9kZXM7XG5cdGxldCBub2Rlc1dpZHRoO1xuXHRsZXQgbm9kZXNIZWlnaHRzO1xuXG5cdC8vIG9wdGlvbnNcblx0Y29uc3QgY29udGFpbmVyID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvcihvcHRpb25zLmNvbnRhaW5lcik7XG5cdGNvbnN0IHBhY2tlZCAgICA9IG9wdGlvbnMucGFja2VkLmluZGV4T2YoJ2RhdGEtJykgPT09IDAgPyBvcHRpb25zLnBhY2tlZCA6IGBkYXRhLSR7IG9wdGlvbnMucGFja2VkIH1gO1xuXHRjb25zdCBzaXplcyAgICAgPSBvcHRpb25zLnNpemVzLnNsaWNlKCkucmV2ZXJzZSgpO1xuXG5cdGNvbnN0IHNlbGVjdG9ycyA9IHtcblx0XHRhbGw6IGAkeyBvcHRpb25zLmNvbnRhaW5lciB9ID4gKmAsXG5cdFx0bmV3OiBgJHsgb3B0aW9ucy5jb250YWluZXIgfSA+ICo6bm90KFskeyBwYWNrZWQgfV0pYFxuXHR9O1xuXG5cdC8vIHNlcmllc1xuXG5cdGNvbnN0IHNldHVwID0gW1xuXHRcdHNldFNpemVJbmRleCxcblx0XHRzZXRTaXplRGV0YWlsLFxuXHRcdHNldENvbHVtbnNcblx0XTtcblxuXHRjb25zdCBydW4gPSBbXG5cdFx0c2V0Tm9kZXMsXG5cdFx0c2V0Tm9kZXNEaW1lbnNpb25zLFxuXHRcdHNldE5vZGVzU3R5bGVzLFxuXHRcdHNldENvbnRhaW5lclN0eWxlc1xuXHRdO1xuXG5cdC8vIGluc3RhbmNlXG5cblx0Y29uc3QgaW5zdGFuY2UgPSBrbm90KHtcblx0XHRwYWNrLFxuXHRcdHVwZGF0ZSxcblx0XHRyZXNpemVcblx0fSk7XG5cblx0cmV0dXJuIGluc3RhbmNlO1xuXG5cdC8vIGdlbmVyYWwgaGVscGVyc1xuXG5cdGZ1bmN0aW9uIHJ1blNlcmllcyhmdW5jdGlvbnMpIHtcblx0XHRmdW5jdGlvbnMuZm9yRWFjaChmdW5jID0+IGZ1bmMoKSk7XG5cdH1cblxuXHQvLyBhcnJheSBoZWxwZXJzXG5cblx0ZnVuY3Rpb24gdG9BcnJheShzZWxlY3Rvcikge1xuXHRcdHJldHVybiBBcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbChkb2N1bWVudC5xdWVyeVNlbGVjdG9yQWxsKHNlbGVjdG9yKSk7XG5cdH1cblxuXHRmdW5jdGlvbiBmaWxsQXJyYXkobGVuZ3RoKSB7XG5cdFx0cmV0dXJuIEFycmF5LmFwcGx5KG51bGwsIEFycmF5KGxlbmd0aCkpLm1hcCgoKSA9PiAwKTtcblx0fVxuXG5cdC8vIHNpemUgaGVscGVyc1xuXG5cdGZ1bmN0aW9uIGdldFNpemVJbmRleCgpIHtcblx0XHQvLyBmaW5kIGluZGV4IG9mIHdpZGVzdCBtYXRjaGluZyBtZWRpYSBxdWVyeVxuXHRcdHJldHVybiBzaXplc1xuXHRcdFx0Lm1hcChzaXplID0+IHNpemUubXEgJiYgd2luZG93Lm1hdGNoTWVkaWEoYChtaW4td2lkdGg6ICR7IHNpemUubXEgfSlgKS5tYXRjaGVzKVxuXHRcdFx0LmluZGV4T2YodHJ1ZSk7XG5cdH1cblxuXHRmdW5jdGlvbiBzZXRTaXplSW5kZXgoKSB7XG5cdFx0c2l6ZUluZGV4ID0gZ2V0U2l6ZUluZGV4KCk7XG5cdH1cblxuXHRmdW5jdGlvbiBzZXRTaXplRGV0YWlsKCkge1xuXHRcdC8vIGlmIG5vIG1lZGlhIHF1ZXJpZXMgbWF0Y2hlZCwgdXNlIHRoZSBiYXNlIGNhc2Vcblx0XHRzaXplRGV0YWlsID0gc2l6ZUluZGV4ID09PSAtMVxuXHRcdFx0PyBzaXplc1tzaXplcy5sZW5ndGggLSAxXVxuXHRcdFx0OiBzaXplc1tzaXplSW5kZXhdO1xuXHR9XG5cblx0Ly8gY29sdW1uIGhlbHBlcnNcblxuXHRmdW5jdGlvbiBzZXRDb2x1bW5zKCkge1xuXHRcdGNvbHVtbkhlaWdodHMgPSBmaWxsQXJyYXkoc2l6ZURldGFpbC5jb2x1bW5zKTtcblx0fVxuXG5cdC8vIG5vZGUgaGVscGVyc1xuXG5cdGZ1bmN0aW9uIHNldE5vZGVzKCkge1xuXHRcdG5vZGVzID0gdG9BcnJheShwZXJzaXN0ID8gc2VsZWN0b3JzLm5ldyA6IHNlbGVjdG9ycy5hbGwpO1xuXHR9XG5cblx0ZnVuY3Rpb24gc2V0Tm9kZXNEaW1lbnNpb25zKCkge1xuXHRcdGlmKG5vZGVzLmxlbmd0aCA9PT0gMCkge1xuXHRcdFx0cmV0dXJuO1xuXHRcdH1cblxuXHRcdG5vZGVzV2lkdGggICA9IG5vZGVzWzBdLmNsaWVudFdpZHRoO1xuXHRcdG5vZGVzSGVpZ2h0cyA9IG5vZGVzLm1hcChlbGVtZW50ID0+IGVsZW1lbnQuY2xpZW50SGVpZ2h0KTtcblx0fVxuXG5cdGZ1bmN0aW9uIHNldE5vZGVzU3R5bGVzKCkge1xuXHRcdG5vZGVzLmZvckVhY2goKGVsZW1lbnQsIGluZGV4KSA9PiB7XG5cdFx0XHRjb25zdCB0YXJnZXQgPSBjb2x1bW5IZWlnaHRzLmluZGV4T2YoTWF0aC5taW4uYXBwbHkoTWF0aCwgY29sdW1uSGVpZ2h0cykpO1xuXG5cdFx0XHRlbGVtZW50LnN0eWxlLnBvc2l0aW9uICA9ICdhYnNvbHV0ZSc7XG5cdFx0XHRlbGVtZW50LnN0eWxlLnRvcCAgICAgICA9IGAkeyBjb2x1bW5IZWlnaHRzW3RhcmdldF0gfXB4YDtcblx0XHRcdGVsZW1lbnQuc3R5bGUubGVmdCAgICAgID0gYCR7ICh0YXJnZXQgKiBub2Rlc1dpZHRoKSArICh0YXJnZXQgKiBzaXplRGV0YWlsLmd1dHRlcikgfXB4YDtcblxuXHRcdFx0ZWxlbWVudC5zZXRBdHRyaWJ1dGUocGFja2VkLCAnJyk7XG5cblx0XHRcdGNvbHVtbkhlaWdodHNbdGFyZ2V0XSArPSBub2Rlc0hlaWdodHNbaW5kZXhdICsgc2l6ZURldGFpbC5ndXR0ZXI7XG5cdFx0fSk7XG5cdH1cblxuXHQvLyBjb250YWluZXIgaGVscGVyc1xuXG5cdGZ1bmN0aW9uIHNldENvbnRhaW5lclN0eWxlcygpIHtcblx0XHRjb250YWluZXIuc3R5bGUucG9zaXRpb24gPSAncmVsYXRpdmUnO1xuXHRcdGNvbnRhaW5lci5zdHlsZS53aWR0aCAgICA9IGAkeyBzaXplRGV0YWlsLmNvbHVtbnMgKiBub2Rlc1dpZHRoICsgKHNpemVEZXRhaWwuY29sdW1ucyAtIDEpICogc2l6ZURldGFpbC5ndXR0ZXIgfXB4YDtcblx0XHRjb250YWluZXIuc3R5bGUuaGVpZ2h0ICAgPSBgJHsgTWF0aC5tYXguYXBwbHkoTWF0aCwgY29sdW1uSGVpZ2h0cykgLSBzaXplRGV0YWlsLmd1dHRlciB9cHhgO1xuXHR9XG5cblx0Ly8gcmVzaXplIGhlbHBlcnNcblxuXHRmdW5jdGlvbiByZXNpemVGcmFtZSgpIHtcblx0XHRpZighdGlja2luZykge1xuXHRcdFx0cmVxdWVzdEFuaW1hdGlvbkZyYW1lKHJlc2l6ZUhhbmRsZXIpO1xuXHRcdFx0dGlja2luZyA9IHRydWU7XG5cdFx0fVxuXHR9XG5cblx0ZnVuY3Rpb24gcmVzaXplSGFuZGxlcigpIHtcblx0XHRpZihzaXplSW5kZXggIT09IGdldFNpemVJbmRleCgpKSB7XG5cdFx0XHRwYWNrKCk7XG5cdFx0XHRpbnN0YW5jZS5lbWl0KCdyZXNpemUnLCBzaXplRGV0YWlsKTtcblx0XHR9XG5cblx0XHR0aWNraW5nID0gZmFsc2U7XG5cdH1cblxuXHQvLyBBUElcblxuXHRmdW5jdGlvbiBwYWNrKCkge1xuXHRcdHBlcnNpc3QgPSBmYWxzZTtcblx0XHRydW5TZXJpZXMoc2V0dXAuY29uY2F0KHJ1bikpO1xuXG5cdFx0cmV0dXJuIGluc3RhbmNlLmVtaXQoJ3BhY2snKTtcblx0fVxuXG5cdGZ1bmN0aW9uIHVwZGF0ZSgpIHtcblx0XHRwZXJzaXN0ID0gdHJ1ZTtcblx0XHRydW5TZXJpZXMocnVuKTtcblxuXHRcdHJldHVybiBpbnN0YW5jZS5lbWl0KCd1cGRhdGUnKTtcblx0fVxuXG5cdGZ1bmN0aW9uIHJlc2l6ZShmbGFnID0gdHJ1ZSkge1xuXHRcdGNvbnN0IGFjdGlvbiA9IGZsYWdcblx0XHRcdD8gJ2FkZEV2ZW50TGlzdGVuZXInXG5cdFx0XHQ6ICdyZW1vdmVFdmVudExpc3RlbmVyJztcblxuXHRcdHdpbmRvd1thY3Rpb25dKCdyZXNpemUnLCByZXNpemVGcmFtZSk7XG5cblx0XHRyZXR1cm4gaW5zdGFuY2U7XG5cdH1cbn07IiwiaW1wb3J0IHtvbkVuZFRyYW5zaXRpb24sIGV4dGVuZCwgcmVxdWVzdEFuaW1hdGlvbkZyYW1lUHJvbWlzZX0gZnJvbSAnLi4vdXRpbC91dGlsJztcbmltcG9ydCBCcmlja3MgZnJvbSAnLi4vLi4vdmVuZG9yL2JyaWNrJztcblxuY29uc3QgR2FsbGVyeUdyaWQgPSB7XG5cdHNldHVwOiBzZXR1cCxcblx0aW5pdDogaW5pdCxcblxuXHRvcGVuSXRlbTogb3Blbkl0ZW0sXG5cdGNsb3NlSXRlbTogY2xvc2VJdGVtLFxuXHRuZXh0SXRlbTogbmV4dEl0ZW0sXG5cdHByZXZpb3VzSXRlbTogcHJldmlvdXNJdGVtXG59O1xuXG5jb25zdCBkZWZhdWx0T3B0aW9ucyA9IHtcblx0Ly8geCBhbmQgeSBjYW4gaGF2ZSB2YWx1ZXMgZnJvbSAwIHRvIDEgKHBlcmNlbnRhZ2UpLiBJZiBuZWdhdGl2ZSB0aGVuIGl0IG1lYW5zIHRoZSBhbGlnbm1lbnQgaXMgbGVmdCBhbmQvb3IgdG9wIHJhdGhlciB0aGFuIHJpZ2h0IGFuZC9vciBib3R0b21cblx0Ly8gc28sIGFzIGFuIGV4YW1wbGUsIGlmIHdlIHdhbnQgb3VyIGxhcmdlIGltYWdlIHRvIGJlIHBvc2l0aW9uZWQgdmVydGljYWxseSBvbiAyNSUgb2YgdGhlIHNjcmVlbiBhbmQgY2VudGVyZWQgaG9yaXpvbnRhbGx5IHRoZSB2YWx1ZXMgd291bGQgYmUgeDoxLHk6LTAuMjVcblx0aW1nUG9zaXRpb25zOiBbXG5cdFx0e3BvczogeyB4IDogMSwgeSA6IDEgfSwgcGFnZW1hcmdpbiA6IDB9XG5cdF0sXG5cdHNpemVzOiBbXG5cdFx0eyBjb2x1bW5zOiAxLCBndXR0ZXI6IDMwfSxcblx0XHR7IG1xOiAnMTAyNHB4JywgY29sdW1uczogNSwgZ3V0dGVyOiAzMH1cblx0XVxufTtcblxuZnVuY3Rpb24gY3JlYXRlR2FsbGVyeUdyaWQoZWwsIG9wdGlvbnMpe1xuXHRjb25zdCBnYWxHcmlkT2JqID0gT2JqZWN0LmNyZWF0ZShHYWxsZXJ5R3JpZCk7XG5cdGdhbEdyaWRPYmouc2V0dXAoZWwsIG9wdGlvbnMpO1xuXHRnYWxHcmlkT2JqLmluaXQoKTtcblx0cmV0dXJuIGdhbEdyaWRPYmo7XG59XG5cbmZ1bmN0aW9uIHNldHVwKGVsQ2xhc3MsIG9wdGlvbnMpe1xuXHR0aGlzLmVsQ2xhc3MgPSBlbENsYXNzO1xuXHR0aGlzLmVsID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvcihlbENsYXNzKTtcblx0aWYoIXRoaXMuZWwpe1xuXHRcdHJldHVybjtcblx0fVxuXG5cdHRoaXMub3B0aW9ucyA9IGV4dGVuZCh7fSwgZGVmYXVsdE9wdGlvbnMsIG9wdGlvbnMpO1xuXHR0aGlzLnNpemVJbmRleCA9IGdldFNpemVJbmRleC5jYWxsKHRoaXMpO1xuXHR0aGlzLml0ZW1zID0gQXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwodGhpcy5lbC5xdWVyeVNlbGVjdG9yQWxsKCcuZ2FsbGVyeV9faXRlbScpKTtcblx0dGhpcy5wcmV2aWV3RWwgPSB0aGlzLmVsLm5leHRFbGVtZW50U2libGluZztcblx0dGhpcy5pc0V4cGFuZGVkID0gZmFsc2U7XG5cdHRoaXMuaXNBbmltYXRpbmcgPSBmYWxzZTtcblx0dGhpcy50aWNraW5nID0gZmFsc2U7XG5cdHRoaXMuY2xvc2VCdG4gPSB0aGlzLnByZXZpZXdFbC5xdWVyeVNlbGVjdG9yKCcuZ2FsbGVyeV9fcHJldmlldy1jbG9zZScpO1xuXHRjb25zdCBwcmV2aWV3RGVzY3JpcHRpb25zID0gdGhpcy5wcmV2aWV3RWwucXVlcnlTZWxlY3RvckFsbCgnLmdhbGxlcnlfX3ByZXZpZXctZGVzY3JpcHRpb24nKTtcblx0dGhpcy5wcmV2aWV3RGVzY3JpcHRpb25FbCA9IHByZXZpZXdEZXNjcmlwdGlvbnNbMF07XG5cdHRoaXMuZW1wdHlQcmV2aWV3RGVzY3JpcHRpb25FbCA9IHByZXZpZXdEZXNjcmlwdGlvbnNbMV07XG5cblx0dGhpcy5wcmV2aW91c0J0biA9IHRoaXMucHJldmlld0VsLnF1ZXJ5U2VsZWN0b3IoJy5nYWxsZXJ5X19wcmV2aWV3LWJ0bi0tcHJldmlvdXMnKTtcblx0dGhpcy5uZXh0QnRuID0gdGhpcy5wcmV2aWV3RWwucXVlcnlTZWxlY3RvcignLmdhbGxlcnlfX3ByZXZpZXctYnRuLS1uZXh0Jyk7XG5cblx0dGhpcy5vcGVuSXRlbSA9IHRoaXMub3Blbkl0ZW0uYmluZCh0aGlzKTtcblx0dGhpcy5jbG9zZUl0ZW0gPSB0aGlzLmNsb3NlSXRlbS5iaW5kKHRoaXMpO1xuXHR0aGlzLm5leHRJdGVtID0gdGhpcy5uZXh0SXRlbS5iaW5kKHRoaXMpO1xuXHR0aGlzLnByZXZpb3VzSXRlbSA9IHRoaXMucHJldmlvdXNJdGVtLmJpbmQodGhpcyk7XG59XG5cbmZ1bmN0aW9uIGluaXQoKXtcblx0aWYoIXRoaXMuZWwpe1xuXHRcdHJldHVybjtcblx0fVxuXG5cdGNvbnN0IGluaXRBZnRlckltYWdlc0xvYWQgPSBmdW5jdGlvbigpe1xuXHRcdHRoaXMuYnJpY2tzID0gQnJpY2tzKHtcblx0XHRcdGNvbnRhaW5lcjogdGhpcy5lbENsYXNzLFxuXHRcdFx0cGFja2VkOiAnZGF0YS1wYWNrZWQnLFxuXHRcdFx0c2l6ZXM6IHRoaXMub3B0aW9ucy5zaXplc1xuXHRcdH0pO1xuXG5cdFx0dGhpcy5icmlja3Ncblx0XHQucmVzaXplKHRydWUpXG5cdFx0LnBhY2soKTtcblxuXHRcdHRoaXMuZWwuY2xhc3NMaXN0LmFkZCgnZ2FsbGVyeS0tbG9hZGVkJyk7XG5cblx0XHRhZGRFdmVudExpc3RlbmVycy5jYWxsKHRoaXMpO1xuXHRcdHNldE9yaWdpbmFsLmNhbGwodGhpcyk7XG5cdFx0c2V0Q2xvbmUuY2FsbCh0aGlzKTtcblx0fTtcblxuXHRQcm9taXNlLmFsbChncmlkSW1hZ2VzTG9hZGVkLmNhbGwodGhpcykpXG5cdC50aGVuKGluaXRBZnRlckltYWdlc0xvYWQuYmluZCh0aGlzKSk7XG59XG5cbmZ1bmN0aW9uIGFkZEV2ZW50TGlzdGVuZXJzKCl7XG5cdGNvbnN0IHNlbGYgPSB0aGlzO1xuXG5cdHRoaXMuaXRlbXMuZm9yRWFjaChmdW5jdGlvbihpdGVtKXtcblx0XHRpZighaXRlbS5xdWVyeVNlbGVjdG9yKCcuZ2FsbGVyeV9faW1hZ2UnKSl7XG5cdFx0XHRyZXR1cm47XG5cdFx0fVxuXHRcdGl0ZW0uYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCBmdW5jdGlvbihldnQpe1xuXHRcdFx0ZXZ0LnByZXZlbnREZWZhdWx0KCk7XG5cdFx0XHRzZWxmLm9wZW5JdGVtKGl0ZW0pO1xuXHRcdH0pO1xuXHR9KTtcblxuXHR0aGlzLmNsb3NlQnRuLmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgdGhpcy5jbG9zZUl0ZW0pO1xuXHR0aGlzLnByZXZpb3VzQnRuLmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgdGhpcy5wcmV2aW91c0l0ZW0pO1xuXHR0aGlzLm5leHRCdG4uYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCB0aGlzLm5leHRJdGVtKTtcblx0d2luZG93LmFkZEV2ZW50TGlzdGVuZXIoJ3Jlc2l6ZScsIHJlc2l6ZUZyYW1lLmJpbmQodGhpcykpO1xuXHR3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcigna2V5ZG93bicsIGZ1bmN0aW9uKGV2dCl7XG5cdFx0aWYoZXZ0LmtleSA9PSBcIkVzY2FwZVwiKXtcblx0XHRcdHRoaXMuY2xvc2VJdGVtKCk7XG5cdFx0fVxuXHRcdGlmKGV2dC5rZXkgPT0gXCJBcnJvd1JpZ2h0XCIpe1xuXHRcdFx0dGhpcy5uZXh0SXRlbSgpO1xuXHRcdH1cblx0XHRpZihldnQua2V5ID09IFwiQXJyb3dMZWZ0XCIpe1xuXHRcdFx0dGhpcy5wcmV2aW91c0l0ZW0oKTtcblx0XHR9XG5cdH0uYmluZCh0aGlzKSk7XG59XG5cbmZ1bmN0aW9uIGdldFNpemVJbmRleCgpe1xuXHRjb25zdCBuZXdTaXplSW5kZXggPSB0aGlzLm9wdGlvbnMuaW1nUG9zaXRpb25zXG5cdFx0XHQubWFwKHNpemUgPT4gc2l6ZS5tcSAmJiB3aW5kb3cubWF0Y2hNZWRpYShgKG1pbi13aWR0aDogJHsgc2l6ZS5tcSB9KWApLm1hdGNoZXMpXG5cdFx0XHQuaW5kZXhPZih0cnVlKTtcblx0cmV0dXJuIH5uZXdTaXplSW5kZXggPyBuZXdTaXplSW5kZXggOiAwO1xufVxuXG5mdW5jdGlvbiByZXNpemVGcmFtZSgpIHtcblx0aWYoIXRoaXMudGlja2luZykge1xuXHRcdHJlcXVlc3RBbmltYXRpb25GcmFtZShyZXNpemVIYW5kbGVyLmJpbmQodGhpcykpO1xuXHRcdHRoaXMudGlja2luZyA9IHRydWU7XG5cdH1cbn1cblxuZnVuY3Rpb24gcmVzaXplSGFuZGxlcigpIHtcblx0bGV0IG5ld1NpemVJbmRleCA9IGdldFNpemVJbmRleC5jYWxsKHRoaXMpO1xuXHRpZih0aGlzLnNpemVJbmRleCAhPT0gbmV3U2l6ZUluZGV4KXtcblx0XHR0aGlzLnNpemVJbmRleCA9IG5ld1NpemVJbmRleDtcblx0XHRzZXRPcmlnaW5hbC5jYWxsKHRoaXMpO1xuXG5cdFx0aWYodGhpcy5pc0V4cGFuZGVkKXtcblx0XHRcdHRoaXMub3JpZ2luYWxJbWcuc3R5bGUub3BhY2l0eSA9IDE7XG5cdFx0fVxuXHR9XG5cdHRoaXMudGlja2luZyA9IGZhbHNlO1xufVxuXG5mdW5jdGlvbiBvcGVuSXRlbShpdGVtKXtcblx0aWYodGhpcy5pc0FuaW1hdGluZyB8fCB0aGlzLmlzRXhwYW5kZWQpe1xuXHRcdHJldHVybjtcblx0fVxuXHR0aGlzLmlzQW5pbWF0aW5nID0gdHJ1ZTtcblx0dGhpcy5pc0V4cGFuZGVkID0gdHJ1ZTtcblxuXHR1cGRhdGVTbGlkZUJ0blN0YXR1cy5jYWxsKHRoaXMsIGl0ZW0pO1xuXG5cdGNvbnN0IGl0ZW1JbWFnZSA9IGl0ZW0ucXVlcnlTZWxlY3RvcignaW1nJyksXG5cdFx0aXRlbUltYWdlQkNSID0gaXRlbUltYWdlLmdldEJvdW5kaW5nQ2xpZW50UmVjdCgpO1xuXG5cdHRoaXMuY3VycmVudCA9IHRoaXMuaXRlbXMuaW5kZXhPZihpdGVtKTtcblxuXHRzZXRPcmlnaW5hbC5jYWxsKHRoaXMsIGl0ZW0ucXVlcnlTZWxlY3RvcignYScpLmdldEF0dHJpYnV0ZSgnaHJlZicpKTtcblxuXHRzZXRDbG9uZS5jYWxsKHRoaXMsIGl0ZW1JbWFnZS5zcmMsIHtcblx0XHR3aWR0aDogaXRlbUltYWdlLm9mZnNldFdpZHRoLFxuXHRcdGhlaWdodDogaXRlbUltYWdlLm9mZnNldEhlaWdodCxcblx0XHRsZWZ0OiBpdGVtSW1hZ2VCQ1IubGVmdCxcblx0XHR0b3A6IGl0ZW1JbWFnZUJDUi50b3Bcblx0fSk7XG5cblx0aXRlbS5jbGFzc0xpc3QuYWRkKCdnYWxsZXJ5X19pdGVtLS1jdXJyZW50Jyk7XG5cblx0bGV0IHBhZ2VNYXJnaW4gPSAwO1xuXHRpZih0eXBlb2YgdGhpcy5vcHRpb25zLmltZ1Bvc2l0aW9uc1t0aGlzLnNpemVJbmRleF0ucGFnZW1hcmdpbiAhPT0gJ3VuZGVmaW5lZCcpe1xuXHRcdHBhZ2VNYXJnaW4gPSB0aGlzLm9wdGlvbnMuaW1nUG9zaXRpb25zW3RoaXMuc2l6ZUluZGV4XS5wYWdlbWFyZ2luO1xuXHR9XG5cblx0Y29uc3Qgd2luID0gZ2V0V2luU2l6ZSgpLFxuXHRcdG9yaWdpbmFsU2l6ZUFyciA9IGl0ZW0uZ2V0QXR0cmlidXRlKCdkYXRhLXNpemUnKS5zcGxpdCgneCcpLFxuXHRcdG9yaWdpbmFsU2l6ZSA9IHt3aWR0aDogb3JpZ2luYWxTaXplQXJyWzBdLCBoZWlnaHQ6IG9yaWdpbmFsU2l6ZUFyclsxXX0sXG5cdFx0ZHggPSAoKHRoaXMub3B0aW9ucy5pbWdQb3NpdGlvbnNbdGhpcy5zaXplSW5kZXhdLnBvcy54ID4gMCA/IDEtTWF0aC5hYnModGhpcy5vcHRpb25zLmltZ1Bvc2l0aW9uc1t0aGlzLnNpemVJbmRleF0ucG9zLngpIDogTWF0aC5hYnModGhpcy5vcHRpb25zLmltZ1Bvc2l0aW9uc1t0aGlzLnNpemVJbmRleF0ucG9zLngpKSAqIHdpbi53aWR0aCArIHRoaXMub3B0aW9ucy5pbWdQb3NpdGlvbnNbdGhpcy5zaXplSW5kZXhdLnBvcy54ICogd2luLndpZHRoLzIpIC0gaXRlbUltYWdlQkNSLmxlZnQgLSAwLjUgKiBpdGVtSW1hZ2Uub2Zmc2V0V2lkdGgsXG5cdFx0ZHkgPSAoKHRoaXMub3B0aW9ucy5pbWdQb3NpdGlvbnNbdGhpcy5zaXplSW5kZXhdLnBvcy55ID4gMCA/IDEtTWF0aC5hYnModGhpcy5vcHRpb25zLmltZ1Bvc2l0aW9uc1t0aGlzLnNpemVJbmRleF0ucG9zLnkpIDogTWF0aC5hYnModGhpcy5vcHRpb25zLmltZ1Bvc2l0aW9uc1t0aGlzLnNpemVJbmRleF0ucG9zLnkpKSAqIHdpbi5oZWlnaHQgKyB0aGlzLm9wdGlvbnMuaW1nUG9zaXRpb25zW3RoaXMuc2l6ZUluZGV4XS5wb3MueSAqIHdpbi5oZWlnaHQvMikgLSBpdGVtSW1hZ2VCQ1IudG9wIC0gMC41ICogaXRlbUltYWdlLm9mZnNldEhlaWdodCxcblx0XHR6ID0gTWF0aC5taW4oIE1hdGgubWluKHdpbi53aWR0aCpNYXRoLmFicyh0aGlzLm9wdGlvbnMuaW1nUG9zaXRpb25zW3RoaXMuc2l6ZUluZGV4XS5wb3MueCkgLSBwYWdlTWFyZ2luLCBvcmlnaW5hbFNpemUud2lkdGggLSBwYWdlTWFyZ2luKS9pdGVtSW1hZ2Uub2Zmc2V0V2lkdGgsIE1hdGgubWluKHdpbi5oZWlnaHQqTWF0aC5hYnModGhpcy5vcHRpb25zLmltZ1Bvc2l0aW9uc1t0aGlzLnNpemVJbmRleF0ucG9zLnkpIC0gcGFnZU1hcmdpbiwgb3JpZ2luYWxTaXplLmhlaWdodCAtIHBhZ2VNYXJnaW4pL2l0ZW1JbWFnZS5vZmZzZXRIZWlnaHQgKTtcblxuXHRjb25zdCB0cmFuc2Zvcm0gPSBgdHJhbnNsYXRlM2QoJHtkeH1weCwgJHtkeX1weCwgMCkgc2NhbGUzZCgke3p9LCAke3p9LCAxKWA7XG5cdHRoaXMuY2xvbmVJbWcuc3R5bGUuV2Via2l0VHJhbnNmb3JtID0gdHJhbnNmb3JtO1xuXHR0aGlzLmNsb25lSW1nLnN0eWxlLnRyYW5zZm9ybSA9IHRyYW5zZm9ybTtcblxuXHRjb25zdCBkZXNjcmlwdGlvbkVsID0gaXRlbS5xdWVyeVNlbGVjdG9yKCcuZ2FsbGVyeV9fZGVzY3JpcHRpb24nKTtcblx0aWYoZGVzY3JpcHRpb25FbCl7XG5cdFx0dGhpcy5wcmV2aWV3RGVzY3JpcHRpb25FbC5pbm5lckhUTUwgPSBkZXNjcmlwdGlvbkVsLmlubmVySFRNTDtcblx0fVxuXG5cdHZhciBzZWxmID0gdGhpcztcblx0c2V0VGltZW91dChmdW5jdGlvbigpIHtcblx0XHRzZWxmLnByZXZpZXdFbC5jbGFzc0xpc3QuYWRkKCdnYWxsZXJ5X19wcmV2aWV3LS1vcGVuJyk7XG5cdH0sIDApO1xuXG5cdFByb21pc2UuYWxsKFtvbkVuZFRyYW5zaXRpb24odGhpcy5jbG9uZUltZyksIG9yaWdpbmFsSW1hZ2VMb2FkUHJvbWlzZS5jYWxsKHRoaXMpXSlcblx0LnRoZW4oZnVuY3Rpb24oKXtcblx0XHRzZWxmLm9yaWdpbmFsSW1nLnN0eWxlLm9wYWNpdHkgPSAxO1xuXHR9KVxuXHQudGhlbigoKSA9PiBvbkVuZFRyYW5zaXRpb24oc2VsZi5vcmlnaW5hbEltZykpXG5cdC50aGVuKGZ1bmN0aW9uKCl7XG5cdFx0c2VsZi5jbG9uZUltZy5zdHlsZS5vcGFjaXR5ID0gMDtcblx0XHRzZWxmLmNsb25lSW1nLnN0eWxlLldlYmtpdFRyYW5zZm9ybSA9ICd0cmFuc2xhdGUzZCgwLDAsMCkgc2NhbGUzZCgxLDEsMSknO1xuXHRcdHNlbGYuY2xvbmVJbWcuc3R5bGUudHJhbnNmb3JtID0gJ3RyYW5zbGF0ZTNkKDAsMCwwKSBzY2FsZTNkKDEsMSwxKSc7XG5cblx0XHRzZWxmLmlzQW5pbWF0aW5nID0gZmFsc2U7XG5cdH0pXG5cdC5jYXRjaChmdW5jdGlvbihyZWFzb24pe1xuXHRcdGNvbnNvbGUuZXJyb3IocmVhc29uKTtcblx0fSk7XG59XG5cbmZ1bmN0aW9uIHNldE9yaWdpbmFsKHNyYyl7XG5cdGlmKCFzcmMpe1xuXHRcdHRoaXMub3JpZ2luYWxJbWcgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdpbWcnKTtcblx0XHR0aGlzLm9yaWdpbmFsSW1nLmNsYXNzTmFtZSA9ICdnYWxsZXJ5X19wcmV2aWV3LW9yaWdpbmFsJztcblx0XHR0aGlzLm9yaWdpbmFsSW1nLnN0eWxlLm9wYWNpdHkgPSAwO1xuXHRcdGxldCBwYWdlTWFyZ2luID0gMDtcblx0XHRpZih0eXBlb2YgdGhpcy5vcHRpb25zLmltZ1Bvc2l0aW9uc1t0aGlzLnNpemVJbmRleF0ucGFnZW1hcmdpbiAhPT0gJ3VuZGVmaW5lZCcpe1xuXHRcdFx0cGFnZU1hcmdpbiA9IHRoaXMub3B0aW9ucy5pbWdQb3NpdGlvbnNbdGhpcy5zaXplSW5kZXhdLnBhZ2VtYXJnaW47XG5cdFx0fVxuXHRcdHRoaXMub3JpZ2luYWxJbWcuc3R5bGUubWF4V2lkdGggPSAnY2FsYygnICsgcGFyc2VJbnQoTWF0aC5hYnModGhpcy5vcHRpb25zLmltZ1Bvc2l0aW9uc1t0aGlzLnNpemVJbmRleF0ucG9zLngpKjEwMCkgKyAndncgLSAnICsgcGFnZU1hcmdpbiArICdweCknO1xuXHRcdHRoaXMub3JpZ2luYWxJbWcuc3R5bGUubWF4SGVpZ2h0ID0gJ2NhbGMoJyArIHBhcnNlSW50KE1hdGguYWJzKHRoaXMub3B0aW9ucy5pbWdQb3NpdGlvbnNbdGhpcy5zaXplSW5kZXhdLnBvcy55KSoxMDApICsgJ3ZoIC0gJyArIHBhZ2VNYXJnaW4gKyAncHgpJztcblx0XHR0aGlzLm9yaWdpbmFsSW1nLnN0eWxlLldlYmtpdFRyYW5zZm9ybSA9ICd0cmFuc2xhdGUzZCgwLDAsMCknO1xuXHRcdHRoaXMub3JpZ2luYWxJbWcuc3R5bGUudHJhbnNmb3JtID0gJ3RyYW5zbGF0ZTNkKDAsMCwwKSc7XG5cdFx0c3JjID0gJyc7XG5cdFx0Y29uc3Qgb2xkRWwgPSB0aGlzLnByZXZpZXdFbC5xdWVyeVNlbGVjdG9yKCcuJyt0aGlzLm9yaWdpbmFsSW1nLmNsYXNzTmFtZSk7XG5cdFx0aWYob2xkRWwpe1xuXHRcdFx0c3JjID0gb2xkRWwuc3JjO1xuXHRcdFx0b2xkRWwucmVtb3ZlKCk7XG5cdFx0fVxuXHRcdHRoaXMucHJldmlld0VsLmFwcGVuZENoaWxkKHRoaXMub3JpZ2luYWxJbWcpO1xuXHR9XG5cblx0dGhpcy5vcmlnaW5hbEltZy5zZXRBdHRyaWJ1dGUoJ3NyYycsIHNyYyk7XG59XG5cbmZ1bmN0aW9uIG9yaWdpbmFsSW1hZ2VMb2FkUHJvbWlzZSgpe1xuXHRyZXR1cm4gaW1hZ2VMb2FkUHJvbWlzZSh0aGlzLm9yaWdpbmFsSW1nKTtcbn1cblxuZnVuY3Rpb24gaW1hZ2VMb2FkUHJvbWlzZShpbWcpe1xuXHRjb25zdCBpbWFnZUxvYWRQcm9taXNlID0gZnVuY3Rpb24ocmVzb2x2ZSwgcmVqZWN0KXtcblx0XHRpZighaW1nLmdldEF0dHJpYnV0ZSgnc3JjJykpe1xuXHRcdFx0cmVqZWN0KCdubyBzcmMgZm91bmQgZm9yIG9yaWdpbmFsIGltYWdlJyk7XG5cdFx0fVxuXG5cdFx0Y29uc3QgaW1hZ2VMb2FkID0gZnVuY3Rpb24oKXtcblx0XHRcdGlmKGltZy5jb21wbGV0ZSl7XG5cdFx0XHRcdHJlc29sdmUoKTtcblx0XHRcdH1lbHNle1xuXHRcdFx0XHRyZWplY3QoJ2ltYWdlIG5vdCBsb2FkZWQ6ICcraW1nLmdldEF0dHJpYnV0ZSgnc3JjJykpO1xuXHRcdFx0fVxuXHRcdH07XG5cblx0XHRpZihpbWcuY29tcGxldGUpe1xuXHRcdFx0cmVzb2x2ZSgpO1xuXHRcdH1lbHNle1xuXHRcdFx0aW1nLm9ubG9hZCA9IGltYWdlTG9hZC5iaW5kKHRoaXMpO1xuXHRcdH1cblx0fTtcblxuXHRyZXR1cm4gbmV3IFByb21pc2UoaW1hZ2VMb2FkUHJvbWlzZS5iaW5kKHRoaXMpKTtcbn1cblxuZnVuY3Rpb24gZ3JpZEltYWdlc0xvYWRlZCgpe1xuXHRyZXR1cm4gdGhpcy5pdGVtcy5tYXAoZnVuY3Rpb24oaXRlbSl7XG5cdFx0Y29uc3QgaW1nID0gaXRlbS5xdWVyeVNlbGVjdG9yKCdpbWcnKTtcblx0XHRpZighaW1nKXtcblx0XHRcdHJldHVybjtcblx0XHR9XG5cdFx0cmV0dXJuIGltYWdlTG9hZFByb21pc2UoaW1nKTtcblx0fSk7XG59XG5cbmZ1bmN0aW9uIHNldENsb25lKHNyYywgc2V0dGluZ3Mpe1xuXHRpZighc3JjKSB7XG5cdFx0dGhpcy5jbG9uZUltZyA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2ltZycpO1xuXHRcdHRoaXMuY2xvbmVJbWcuY2xhc3NOYW1lID0gJ2dhbGxlcnlfX3ByZXZpZXctY2xvbmUnO1xuXHRcdHNyYyA9ICcnO1xuXHRcdHRoaXMuY2xvbmVJbWcuc3R5bGUub3BhY2l0eSA9IDA7XG5cdFx0dGhpcy5wcmV2aWV3RWwuYXBwZW5kQ2hpbGQodGhpcy5jbG9uZUltZyk7XG5cdH1lbHNle1xuXHRcdHRoaXMuY2xvbmVJbWcuc3R5bGUub3BhY2l0eSA9IDE7XG5cdFx0dGhpcy5jbG9uZUltZy5zdHlsZS53aWR0aCA9IHNldHRpbmdzLndpZHRoICArICdweCc7XG5cdFx0dGhpcy5jbG9uZUltZy5zdHlsZS5oZWlnaHQgPSBzZXR0aW5ncy5oZWlnaHQgICsgJ3B4Jztcblx0XHR0aGlzLmNsb25lSW1nLnN0eWxlLnRvcCA9IHNldHRpbmdzLnRvcCAgKyAncHgnO1xuXHRcdHRoaXMuY2xvbmVJbWcuc3R5bGUubGVmdCA9IHNldHRpbmdzLmxlZnQgICsgJ3B4Jztcblx0fVxuXG5cdHRoaXMuY2xvbmVJbWcuc2V0QXR0cmlidXRlKCdzcmMnLCBzcmMpO1xufVxuXG5mdW5jdGlvbiBjbG9zZUl0ZW0oKXtcblx0aWYoIXRoaXMuaXNFeHBhbmRlZCB8fCB0aGlzLmlzQW5pbWF0aW5nKXtcblx0XHRyZXR1cm47XG5cdH1cblx0dGhpcy5pc0V4cGFuZGVkID0gZmFsc2U7XG5cdHRoaXMuaXNBbmltYXRpbmcgPSB0cnVlO1xuXG5cdGNvbnN0IGl0ZW0gPSB0aGlzLml0ZW1zW3RoaXMuY3VycmVudF0sXG5cdFx0aXRlbUltYWdlID0gaXRlbS5xdWVyeVNlbGVjdG9yKCdpbWcnKSxcblx0XHRpdGVtSW1hZ2VCQ1IgPSBpdGVtSW1hZ2UuZ2V0Qm91bmRpbmdDbGllbnRSZWN0KCksXG5cdFx0c2VsZiA9IHRoaXM7XG5cblx0dGhpcy5wcmV2aWV3RWwuY2xhc3NMaXN0LnJlbW92ZSgnZ2FsbGVyeV9fcHJldmlldy0tb3BlbicpO1xuXG5cdHRoaXMub3JpZ2luYWxJbWcuY2xhc3NMaXN0LmFkZCgnZ2FsbGVyeV9fcHJldmlldy1vcmlnaW5hbC0tYW5pbWF0ZScpO1xuXG5cdHZhciB3aW4gPSBnZXRXaW5TaXplKCksXG5cdFx0ZHggPSBpdGVtSW1hZ2VCQ1IubGVmdCArIGl0ZW1JbWFnZS5vZmZzZXRXaWR0aC8yIC0gKCh0aGlzLm9wdGlvbnMuaW1nUG9zaXRpb25zW3RoaXMuc2l6ZUluZGV4XS5wb3MueCA+IDAgPyAxLU1hdGguYWJzKHRoaXMub3B0aW9ucy5pbWdQb3NpdGlvbnNbdGhpcy5zaXplSW5kZXhdLnBvcy54KSA6IE1hdGguYWJzKHRoaXMub3B0aW9ucy5pbWdQb3NpdGlvbnNbdGhpcy5zaXplSW5kZXhdLnBvcy54KSkgKiB3aW4ud2lkdGggKyB0aGlzLm9wdGlvbnMuaW1nUG9zaXRpb25zW3RoaXMuc2l6ZUluZGV4XS5wb3MueCAqIHdpbi53aWR0aC8yKSxcblx0XHRkeSA9IGl0ZW1JbWFnZUJDUi50b3AgKyBpdGVtSW1hZ2Uub2Zmc2V0SGVpZ2h0LzIgLSAoKHRoaXMub3B0aW9ucy5pbWdQb3NpdGlvbnNbdGhpcy5zaXplSW5kZXhdLnBvcy55ID4gMCA/IDEtTWF0aC5hYnModGhpcy5vcHRpb25zLmltZ1Bvc2l0aW9uc1t0aGlzLnNpemVJbmRleF0ucG9zLnkpIDogTWF0aC5hYnModGhpcy5vcHRpb25zLmltZ1Bvc2l0aW9uc1t0aGlzLnNpemVJbmRleF0ucG9zLnkpKSAqIHdpbi5oZWlnaHQgKyB0aGlzLm9wdGlvbnMuaW1nUG9zaXRpb25zW3RoaXMuc2l6ZUluZGV4XS5wb3MueSAqIHdpbi5oZWlnaHQvMiksXG5cdFx0eiA9IGl0ZW1JbWFnZS5vZmZzZXRXaWR0aC90aGlzLm9yaWdpbmFsSW1nLm9mZnNldFdpZHRoO1xuXG5cdHRoaXMub3JpZ2luYWxJbWcuc3R5bGUuV2Via2l0VHJhbnNmb3JtID0gYHRyYW5zbGF0ZTNkKCR7ZHh9cHgsICR7ZHl9cHgsIDApIHNjYWxlM2QoJHt6fSwgJHt6fSwgMSlgO1xuXHR0aGlzLm9yaWdpbmFsSW1nLnN0eWxlLnRyYW5zZm9ybSA9IGB0cmFuc2xhdGUzZCgke2R4fXB4LCAke2R5fXB4LCAwKSBzY2FsZTNkKCR7en0sICR7en0sIDEpYDtcblxuXHRvbkVuZFRyYW5zaXRpb24odGhpcy5vcmlnaW5hbEltZylcblx0LnRoZW4oZnVuY3Rpb24oKXtcblx0XHRzZWxmLnByZXZpZXdEZXNjcmlwdGlvbkVsLmlubmVySFRNTCA9ICcnO1xuXHRcdGl0ZW0uY2xhc3NMaXN0LnJlbW92ZSgnZ2FsbGVyeV9faXRlbS0tY3VycmVudCcpO1xuXHRcdHNldFRpbWVvdXQoZnVuY3Rpb24oKSB7XG5cdFx0XHRzZWxmLm9yaWdpbmFsSW1nLnN0eWxlLm9wYWNpdHkgPSAwO1xuXHRcdH0sIDYwKTtcblx0fSlcblx0LnRoZW4oKCkgPT4gb25FbmRUcmFuc2l0aW9uKHNlbGYub3JpZ2luYWxJbWcpKVxuXHQudGhlbihmdW5jdGlvbigpe1xuXHRcdHNlbGYub3JpZ2luYWxJbWcuY2xhc3NMaXN0LnJlbW92ZSgnZ2FsbGVyeV9fcHJldmlldy1vcmlnaW5hbC0tYW5pbWF0ZScpO1xuXHRcdHNlbGYub3JpZ2luYWxJbWcuc3R5bGUuV2Via2l0VHJhbnNmb3JtID0gJ3RyYW5zbGF0ZTNkKDAsMCwwKSBzY2FsZTNkKDEsMSwxKSc7XG5cdFx0c2VsZi5vcmlnaW5hbEltZy5zdHlsZS50cmFuc2Zvcm0gPSAndHJhbnNsYXRlM2QoMCwwLDApIHNjYWxlM2QoMSwxLDEpJztcblxuXHRcdHNlbGYuaXNBbmltYXRpbmcgPSBmYWxzZTtcblx0fSlcblx0LmNhdGNoKGZ1bmN0aW9uKHJlYXNvbil7XG5cdFx0Y29uc29sZS5lcnJvcihyZWFzb24pO1xuXHR9KTtcbn1cblxuZnVuY3Rpb24gbmV4dEl0ZW0oKXtcblx0c2xpZGVJdGVtLmNhbGwodGhpcywgNTAsIGdldE5leHRJdGVtKTtcbn1cblxuZnVuY3Rpb24gcHJldmlvdXNJdGVtKCl7XG5cdHNsaWRlSXRlbS5jYWxsKHRoaXMsIC01MCwgZ2V0UHJldmlvdXNJdGVtKTtcbn1cblxuZnVuY3Rpb24gc2xpZGVJdGVtKGNoYW5nZURpc3RhbmNlLCBnZXRJdGVtQ2Ipe1xuXHQvLyBpZiBwcmV2aWV3IGlzIGNsb3NlZCBvciBhbmltYXRpb24gaXMgaGFwcGVuaW5nIGRvIG5vdGhpbmdcblx0aWYoIXRoaXMuaXNFeHBhbmRlZCB8fCB0aGlzLmlzQW5pbWF0aW5nKXtcblx0XHRyZXR1cm47XG5cdH1cblxuXHRjb25zdCBsYXN0SXRlbSA9IHRoaXMuaXRlbXNbdGhpcy5jdXJyZW50XTsgLy9nZXQgdGhlIGN1cnJlbnQgaXRlbVxuXHRjb25zdCBuZXh0SXRlbSA9IGdldEl0ZW1DYihsYXN0SXRlbSk7IC8vZ2V0IHRoZSBuZXh0IGl0ZW1cblx0aWYoIWxhc3RJdGVtIHx8ICFuZXh0SXRlbSB8fCAhbmV4dEl0ZW0uY2xhc3NMaXN0LmNvbnRhaW5zKCdnYWxsZXJ5X19pdGVtJykpeyAvL2lmIHRoZXJlIGlzIG5vIG5leHQgaXRlbSBkbyBub3RoaW5nXG5cdFx0cmV0dXJuO1xuXHR9XG5cblx0dGhpcy5pc0FuaW1hdGluZyA9IHRydWU7XG5cdHRoaXMuY3VycmVudCA9IHRoaXMuaXRlbXMuaW5kZXhPZihuZXh0SXRlbSk7IC8vdXBkYXRlIGN1cnJlbnQgaW5kZXhcblxuXHRsYXN0SXRlbS5jbGFzc0xpc3QucmVtb3ZlKCdnYWxsZXJ5X19pdGVtLS1jdXJyZW50Jyk7XG5cdG5leHRJdGVtLmNsYXNzTGlzdC5hZGQoJ2dhbGxlcnlfX2l0ZW0tLWN1cnJlbnQnKTtcblxuXHR1cGRhdGVTbGlkZUJ0blN0YXR1cy5jYWxsKHRoaXMsIG5leHRJdGVtKTtcblxuXHQvKlxuXHRzZXQgdGhlIGNsb25lZCB0aHVtYm5haWwgb2YgdGhlIG5leHQgaXRlbVxuXHRcdFx0KiBkb24ndCB0cmFuc2l0aW9uIHRoZSBjbG9uZWQgdGh1bWJuYWlsXG5cdFx0XHQqIHNldCBpdCB0byB0aGUgZmluYWwgcG9zaXRpb25cblx0Ki9cblx0Y29uc3QgaXRlbUltYWdlID0gbmV4dEl0ZW0ucXVlcnlTZWxlY3RvcignaW1nJyksXG5cdFx0aXRlbUltYWdlQkNSID0gaXRlbUltYWdlLmdldEJvdW5kaW5nQ2xpZW50UmVjdCgpO1xuXG5cblx0c2V0Q2xvbmUuY2FsbCh0aGlzLCBpdGVtSW1hZ2Uuc3JjLCB7XG5cdFx0d2lkdGg6IGl0ZW1JbWFnZS5vZmZzZXRXaWR0aCxcblx0XHRoZWlnaHQ6IGl0ZW1JbWFnZS5vZmZzZXRIZWlnaHQsXG5cdFx0bGVmdDogaXRlbUltYWdlQkNSLmxlZnQsXG5cdFx0dG9wOiBpdGVtSW1hZ2VCQ1IudG9wXG5cdH0pO1xuXG5cdGxldCBwYWdlTWFyZ2luID0gMDtcblx0aWYodHlwZW9mIHRoaXMub3B0aW9ucy5pbWdQb3NpdGlvbnNbdGhpcy5zaXplSW5kZXhdLnBhZ2VtYXJnaW4gIT09ICd1bmRlZmluZWQnKXtcblx0XHRwYWdlTWFyZ2luID0gdGhpcy5vcHRpb25zLmltZ1Bvc2l0aW9uc1t0aGlzLnNpemVJbmRleF0ucGFnZW1hcmdpbjtcblx0fVxuXG5cdGlmKCFjaGFuZ2VEaXN0YW5jZSl7XG5cdFx0Y2hhbmdlRGlzdGFuY2UgPSA1MDtcblx0fVxuXG5cdGxldCB3aW4gPSBnZXRXaW5TaXplKCksXG5cdFx0b3JpZ2luYWxTaXplQXJyID0gbmV4dEl0ZW0uZ2V0QXR0cmlidXRlKCdkYXRhLXNpemUnKS5zcGxpdCgneCcpLFxuXHRcdG9yaWdpbmFsU2l6ZSA9IHt3aWR0aDogb3JpZ2luYWxTaXplQXJyWzBdLCBoZWlnaHQ6IG9yaWdpbmFsU2l6ZUFyclsxXX0sXG5cdFx0ZHggPSAoKHRoaXMub3B0aW9ucy5pbWdQb3NpdGlvbnNbdGhpcy5zaXplSW5kZXhdLnBvcy54ID4gMCA/IDEtTWF0aC5hYnModGhpcy5vcHRpb25zLmltZ1Bvc2l0aW9uc1t0aGlzLnNpemVJbmRleF0ucG9zLngpIDogTWF0aC5hYnModGhpcy5vcHRpb25zLmltZ1Bvc2l0aW9uc1t0aGlzLnNpemVJbmRleF0ucG9zLngpKSAqIHdpbi53aWR0aCArIHRoaXMub3B0aW9ucy5pbWdQb3NpdGlvbnNbdGhpcy5zaXplSW5kZXhdLnBvcy54ICogd2luLndpZHRoLzIpIC0gaXRlbUltYWdlQkNSLmxlZnQgLSAwLjUgKiBpdGVtSW1hZ2Uub2Zmc2V0V2lkdGgsXG5cdFx0ZHkgPSAoKHRoaXMub3B0aW9ucy5pbWdQb3NpdGlvbnNbdGhpcy5zaXplSW5kZXhdLnBvcy55ID4gMCA/IDEtTWF0aC5hYnModGhpcy5vcHRpb25zLmltZ1Bvc2l0aW9uc1t0aGlzLnNpemVJbmRleF0ucG9zLnkpIDogTWF0aC5hYnModGhpcy5vcHRpb25zLmltZ1Bvc2l0aW9uc1t0aGlzLnNpemVJbmRleF0ucG9zLnkpKSAqIHdpbi5oZWlnaHQgKyB0aGlzLm9wdGlvbnMuaW1nUG9zaXRpb25zW3RoaXMuc2l6ZUluZGV4XS5wb3MueSAqIHdpbi5oZWlnaHQvMikgLSBpdGVtSW1hZ2VCQ1IudG9wIC0gMC41ICogaXRlbUltYWdlLm9mZnNldEhlaWdodCxcblx0XHR6ID0gTWF0aC5taW4oIE1hdGgubWluKHdpbi53aWR0aCpNYXRoLmFicyh0aGlzLm9wdGlvbnMuaW1nUG9zaXRpb25zW3RoaXMuc2l6ZUluZGV4XS5wb3MueCkgLSBwYWdlTWFyZ2luLCBvcmlnaW5hbFNpemUud2lkdGggLSBwYWdlTWFyZ2luKS9pdGVtSW1hZ2Uub2Zmc2V0V2lkdGgsIE1hdGgubWluKHdpbi5oZWlnaHQqTWF0aC5hYnModGhpcy5vcHRpb25zLmltZ1Bvc2l0aW9uc1t0aGlzLnNpemVJbmRleF0ucG9zLnkpIC0gcGFnZU1hcmdpbiwgb3JpZ2luYWxTaXplLmhlaWdodCAtIHBhZ2VNYXJnaW4pL2l0ZW1JbWFnZS5vZmZzZXRIZWlnaHQgKSxcblx0XHRjaGFuZ2VEaXN0YW5jZUR4ID0gZHggKyBjaGFuZ2VEaXN0YW5jZTtcblxuXHRjb25zdCBjbG9uZVRyYW5zZm9ybSA9IGB0cmFuc2xhdGUzZCgke2NoYW5nZURpc3RhbmNlRHh9cHgsICR7ZHl9cHgsIDApIHNjYWxlM2QoJHt6fSwgJHt6fSwgMSlgO1xuXHR0aGlzLmNsb25lSW1nLnN0eWxlLnRyYW5zaXRpb24gPSAnbm9uZSc7XG5cdHRoaXMuY2xvbmVJbWcuc3R5bGUuV2Via2l0VHJhbnNmb3JtID0gY2xvbmVUcmFuc2Zvcm07XG5cdHRoaXMuY2xvbmVJbWcuc3R5bGUudHJhbnNmb3JtID0gY2xvbmVUcmFuc2Zvcm07XG5cblx0Y29uc3QgZGVzY3JpcHRpb25FbCA9IG5leHRJdGVtLnF1ZXJ5U2VsZWN0b3IoJy5nYWxsZXJ5X19kZXNjcmlwdGlvbicpO1xuXHRpZihkZXNjcmlwdGlvbkVsKXtcblx0XHR0aGlzLmVtcHR5UHJldmlld0Rlc2NyaXB0aW9uRWwuY2xhc3NMaXN0LmFkZCgnZ2FsbGVyeV9fcHJldmlldy1kZXNjcmlwdGlvbi0tYW5pbWF0ZScpO1xuXHRcdHRoaXMucHJldmlld0Rlc2NyaXB0aW9uRWwuY2xhc3NMaXN0LmFkZCgnZ2FsbGVyeV9fcHJldmlldy1kZXNjcmlwdGlvbi0tYW5pbWF0ZScpO1xuXG5cdFx0dGhpcy5lbXB0eVByZXZpZXdEZXNjcmlwdGlvbkVsLmlubmVySFRNTCA9IGRlc2NyaXB0aW9uRWwuaW5uZXJIVE1MO1xuXG5cdFx0dGhpcy5lbXB0eVByZXZpZXdEZXNjcmlwdGlvbkVsLnN0eWxlLnRyYW5zaXRpb24gPSAnbm9uZSc7XG5cdFx0dGhpcy5lbXB0eVByZXZpZXdEZXNjcmlwdGlvbkVsLnN0eWxlLm9wYWNpdHkgPSAwO1xuXHRcdGNvbnN0IGVtcHR5RGVzY3JpcHRpb25UcmFuc2Zvcm0gPSBgdHJhbnNsYXRlM2QoMCwgJHtjaGFuZ2VEaXN0YW5jZX1weCwgMClgO1xuXHRcdHRoaXMuZW1wdHlQcmV2aWV3RGVzY3JpcHRpb25FbC5zdHlsZS5XZWJraXRUcmFuc2Zvcm0gPSBlbXB0eURlc2NyaXB0aW9uVHJhbnNmb3JtO1xuXHRcdHRoaXMuZW1wdHlQcmV2aWV3RGVzY3JpcHRpb25FbC5zdHlsZS50cmFuc2Zvcm0gPSBlbXB0eURlc2NyaXB0aW9uVHJhbnNmb3JtO1xuXHR9XG5cblx0Y29uc3Qgc2VsZiA9IHRoaXM7XG5cblx0cmVxdWVzdEFuaW1hdGlvbkZyYW1lUHJvbWlzZSgpXG5cdC50aGVuKGZ1bmN0aW9uKCl7XG5cdFx0Ly9vbGQgb3JpZ2luYWwgaW1hZ2UgZmFkZSBvdXRcblx0XHRjb25zdCBvcmlnaW5hbEltZ1RyYW5zZm9ybSA9IGB0cmFuc2xhdGUzZCgtJHtjaGFuZ2VEaXN0YW5jZX1weCwgMCwgMClgO1xuXHRcdHNlbGYub3JpZ2luYWxJbWcuY2xhc3NMaXN0LmFkZCgnZ2FsbGVyeV9fcHJldmlldy1vcmlnaW5hbC0tYW5pbWF0ZScpO1xuXHRcdHNlbGYub3JpZ2luYWxJbWcuc3R5bGUub3BhY2l0eSA9IDA7XG5cdFx0c2VsZi5vcmlnaW5hbEltZy5zdHlsZS5XZWJraXRUcmFuc2Zvcm0gPSBvcmlnaW5hbEltZ1RyYW5zZm9ybTtcblx0XHRzZWxmLm9yaWdpbmFsSW1nLnN0eWxlLnRyYW5zZm9ybSA9IG9yaWdpbmFsSW1nVHJhbnNmb3JtO1xuXG5cdFx0Ly9mYWRlIGluIGNsb25lZCBpbWFnZVxuXHRcdHNlbGYuY2xvbmVJbWcuc3R5bGUudHJhbnNpdGlvbiA9ICcnO1xuXHRcdGNvbnN0IGNsb25lVHJhbnNmb3JtID0gYHRyYW5zbGF0ZTNkKCR7ZHh9cHgsICR7ZHl9cHgsIDApIHNjYWxlM2QoJHt6fSwgJHt6fSwgMSlgO1xuXHRcdHNlbGYuY2xvbmVJbWcuc3R5bGUuV2Via2l0VHJhbnNmb3JtID0gY2xvbmVUcmFuc2Zvcm07XG5cdFx0c2VsZi5jbG9uZUltZy5zdHlsZS50cmFuc2Zvcm0gPSBjbG9uZVRyYW5zZm9ybTtcblx0XHRzZWxmLmNsb25lSW1nLnN0eWxlLm9wYWNpdHkgPSAxO1xuXG5cdFx0Y29uc3QgZGVzY3JpcHRpb25UcmFuc2Zvcm0gPSBgdHJhbnNsYXRlM2QoMCwgLSR7Y2hhbmdlRGlzdGFuY2V9cHgsIDApYDtcblx0XHRzZWxmLnByZXZpZXdEZXNjcmlwdGlvbkVsLnN0eWxlLm9wYWNpdHkgPSAwO1xuXHRcdHNlbGYucHJldmlld0Rlc2NyaXB0aW9uRWwuc3R5bGUuV2Via2l0VHJhbnNmb3JtID0gZGVzY3JpcHRpb25UcmFuc2Zvcm07XG5cdFx0c2VsZi5wcmV2aWV3RGVzY3JpcHRpb25FbC5zdHlsZS50cmFuc2Zvcm0gPSBkZXNjcmlwdGlvblRyYW5zZm9ybTtcblxuXHRcdHNlbGYuZW1wdHlQcmV2aWV3RGVzY3JpcHRpb25FbC5zdHlsZS50cmFuc2l0aW9uID0gJyc7XG5cdFx0c2VsZi5lbXB0eVByZXZpZXdEZXNjcmlwdGlvbkVsLnN0eWxlLm9wYWNpdHkgPSAxO1xuXHRcdGNvbnN0IGVtcHR5RGVzY3JpcHRpb25UcmFuc2Zvcm0gPSBgdHJhbnNsYXRlM2QoMCwgMCwgMClgO1xuXHRcdHNlbGYuZW1wdHlQcmV2aWV3RGVzY3JpcHRpb25FbC5zdHlsZS5XZWJraXRUcmFuc2Zvcm0gPSBlbXB0eURlc2NyaXB0aW9uVHJhbnNmb3JtO1xuXHRcdHNlbGYuZW1wdHlQcmV2aWV3RGVzY3JpcHRpb25FbC5zdHlsZS50cmFuc2Zvcm0gPSBlbXB0eURlc2NyaXB0aW9uVHJhbnNmb3JtO1xuXG5cdFx0bGV0IHRtcERlc2NyaXB0aW9uID0gc2VsZi5wcmV2aWV3RGVzY3JpcHRpb25FbDtcblx0XHRzZWxmLnByZXZpZXdEZXNjcmlwdGlvbkVsID0gc2VsZi5lbXB0eVByZXZpZXdEZXNjcmlwdGlvbkVsO1xuXHRcdHNlbGYuZW1wdHlQcmV2aWV3RGVzY3JpcHRpb25FbCA9IHRtcERlc2NyaXB0aW9uO1xuXHR9KVxuXHQudGhlbigoKSA9PiBvbkVuZFRyYW5zaXRpb24oc2VsZi5vcmlnaW5hbEltZykpIC8vd2hlbiBvbGQgbWFpbiBpbWFnZSBoYXMgZmFkZSBvdXRcblx0LnRoZW4oKCkgPT4geyAvLyByZXN0IHBvc2l0aW9uIG9mIG9yaWdpbmFsIGltYWdlIHdpdGggbm8gdHJhbnNpdGlvblxuXHRcdHNlbGYub3JpZ2luYWxJbWcuY2xhc3NMaXN0LnJlbW92ZSgnZ2FsbGVyeV9fcHJldmlldy1vcmlnaW5hbC0tYW5pbWF0ZScpO1xuXHRcdGNvbnN0IG9yaWdpbmFsSW1nVHJhbnNmb3JtID0gYHRyYW5zbGF0ZTNkKDAsIDAsIDApYDtcblx0XHRzZWxmLm9yaWdpbmFsSW1nLnN0eWxlLldlYmtpdFRyYW5zZm9ybSA9IG9yaWdpbmFsSW1nVHJhbnNmb3JtO1xuXHRcdHNlbGYub3JpZ2luYWxJbWcuc3R5bGUudHJhbnNmb3JtID0gb3JpZ2luYWxJbWdUcmFuc2Zvcm07XG5cdH0pXG5cdC50aGVuKCgpID0+IHNldE9yaWdpbmFsLmNhbGwoc2VsZiwgbmV4dEl0ZW0ucXVlcnlTZWxlY3RvcignYScpLmdldEF0dHJpYnV0ZSgnaHJlZicpKSkgLy9zZXQgbmV3IG1haW4gaW1hZ2Vcblx0LnRoZW4oKCkgPT4gaW1hZ2VMb2FkUHJvbWlzZS5jYWxsKHNlbGYsIHNlbGYub3JpZ2luYWxJbWcpKSAvL3doZW4gdGhpcyBoYXMgbG9hZGVkXG5cdC50aGVuKCgpID0+IHtcblx0XHRzZWxmLm9yaWdpbmFsSW1nLnN0eWxlLnRyYW5zaXRpb24gPSAnJztcblx0XHRzZWxmLm9yaWdpbmFsSW1nLnN0eWxlLm9wYWNpdHkgPSAxO1xuXHR9KVxuXHQudGhlbigoKSA9PiBvbkVuZFRyYW5zaXRpb24oc2VsZi5vcmlnaW5hbEltZykpXG5cdC50aGVuKCgpID0+IHtcblx0XHRzZWxmLmNsb25lSW1nLnN0eWxlLm9wYWNpdHkgPSAwO1xuXHRcdHNlbGYuY2xvbmVJbWcuc3R5bGUuV2Via2l0VHJhbnNmb3JtID0gJ3RyYW5zbGF0ZTNkKDAsMCwwKSBzY2FsZTNkKDEsMSwxKSc7XG5cdFx0c2VsZi5jbG9uZUltZy5zdHlsZS50cmFuc2Zvcm0gPSAndHJhbnNsYXRlM2QoMCwwLDApIHNjYWxlM2QoMSwxLDEpJztcblx0XHR0aGlzLmNsb25lSW1nLnN0eWxlLnRyYW5zaXRpb24gPSAnJztcblxuXHRcdHNlbGYuZW1wdHlQcmV2aWV3RGVzY3JpcHRpb25FbC5jbGFzc0xpc3QucmVtb3ZlKCdnYWxsZXJ5X19wcmV2aWV3LWRlc2NyaXB0aW9uLS1hbmltYXRlJyk7XG5cdFx0c2VsZi5wcmV2aWV3RGVzY3JpcHRpb25FbC5jbGFzc0xpc3QucmVtb3ZlKCdnYWxsZXJ5X19wcmV2aWV3LWRlc2NyaXB0aW9uLS1hbmltYXRlJyk7XG5cblx0XHRzZWxmLmVtcHR5UHJldmlld0Rlc2NyaXB0aW9uRWwuaW5uZXJIVE1MID0gJyc7XG5cdFx0c2VsZi5lbXB0eVByZXZpZXdEZXNjcmlwdGlvbkVsLnN0eWxlLm9wYWNpdHkgPSAnJztcblx0XHRzZWxmLmVtcHR5UHJldmlld0Rlc2NyaXB0aW9uRWwuc3R5bGUuV2Via2l0VHJhbnNmb3JtID0gJyc7XG5cdFx0c2VsZi5lbXB0eVByZXZpZXdEZXNjcmlwdGlvbkVsLnN0eWxlLnRyYW5zZm9ybSA9ICcnO1xuXG5cdFx0c2VsZi5wcmV2aWV3RGVzY3JpcHRpb25FbC5zdHlsZS5vcGFjaXR5ID0gJyc7XG5cdFx0c2VsZi5wcmV2aWV3RGVzY3JpcHRpb25FbC5zdHlsZS5XZWJraXRUcmFuc2Zvcm0gPSAnJztcblx0XHRzZWxmLnByZXZpZXdEZXNjcmlwdGlvbkVsLnN0eWxlLnRyYW5zZm9ybSA9ICcnO1xuXG5cdFx0c2VsZi5pc0FuaW1hdGluZyA9IGZhbHNlO1xuXHR9KVxuXHQuY2F0Y2goZnVuY3Rpb24ocmVhc29uKXtcblx0XHRjb25zb2xlLmVycm9yKHJlYXNvbik7XG5cdH0pO1xufVxuXG5mdW5jdGlvbiBnZXROZXh0SXRlbShjdXJyZW50SXRlbSl7XG5cdGxldCBpdGVtID0gY3VycmVudEl0ZW07XG5cdHdoaWxlKGl0ZW0gPSBpdGVtLm5leHRFbGVtZW50U2libGluZyl7XG5cdFx0aWYoaXRlbS5nZXRBdHRyaWJ1dGUoJ2RhdGEtc2l6ZScpKXtcblx0XHRcdHJldHVybiBpdGVtO1xuXHRcdH1cblx0fVxuXHRyZXR1cm4gbnVsbDtcbn1cblxuZnVuY3Rpb24gZ2V0UHJldmlvdXNJdGVtKGN1cnJlbnRJdGVtKXtcblx0bGV0IGl0ZW0gPSBjdXJyZW50SXRlbTtcblx0d2hpbGUoaXRlbSA9IGl0ZW0ucHJldmlvdXNFbGVtZW50U2libGluZyl7XG5cdFx0aWYoaXRlbS5nZXRBdHRyaWJ1dGUoJ2RhdGEtc2l6ZScpKXtcblx0XHRcdHJldHVybiBpdGVtO1xuXHRcdH1cblx0fVxuXHRyZXR1cm4gbnVsbDtcbn1cblxuZnVuY3Rpb24gdXBkYXRlU2xpZGVCdG5TdGF0dXMoY3VycmVudEl0ZW0pe1xuXHRpZighZ2V0TmV4dEl0ZW0oY3VycmVudEl0ZW0pKXtcblx0XHR0aGlzLm5leHRCdG4uY2xhc3NMaXN0LmFkZCgnZ2FsbGVyeV9fcHJldmlldy1idG4tLWRpc2FibGVkJyk7XG5cdH1lbHNle1xuXHRcdHRoaXMubmV4dEJ0bi5jbGFzc0xpc3QucmVtb3ZlKCdnYWxsZXJ5X19wcmV2aWV3LWJ0bi0tZGlzYWJsZWQnKTtcblx0fVxuXG5cdGlmKCFnZXRQcmV2aW91c0l0ZW0oY3VycmVudEl0ZW0pKXtcblx0XHR0aGlzLnByZXZpb3VzQnRuLmNsYXNzTGlzdC5hZGQoJ2dhbGxlcnlfX3ByZXZpZXctYnRuLS1kaXNhYmxlZCcpO1xuXHR9ZWxzZXtcblx0XHR0aGlzLnByZXZpb3VzQnRuLmNsYXNzTGlzdC5yZW1vdmUoJ2dhbGxlcnlfX3ByZXZpZXctYnRuLS1kaXNhYmxlZCcpO1xuXHR9XG59XG5cbmZ1bmN0aW9uIGdldFdpblNpemUoKXtcblx0cmV0dXJuIHtcblx0XHR3aWR0aDogZG9jdW1lbnQuZG9jdW1lbnRFbGVtZW50LmNsaWVudFdpZHRoLFxuXHRcdGhlaWdodDogd2luZG93LmlubmVySGVpZ2h0XG5cdH07XG59XG5cbmV4cG9ydCBkZWZhdWx0IGNyZWF0ZUdhbGxlcnlHcmlkO1xuIiwiLy9pbXBvcnQgcG9seSBmcm9tICcuL3V0aWwvcG9seWZpbGxzJztcblxuLy9pbXBvcnQgc3ZnNGV2ZXJ5Ym9keSBmcm9tICcuLi92ZW5kb3Ivc3ZnNGV2ZXJ5Ym9keSc7XG5pbXBvcnQgZ2FsbGVyeUdyaWQgZnJvbSAnLi91aS9nYWxsZXJ5LWdyaWQnO1xuXG5sZXQgYmFzZVBhdGg7XG5cbmZ1bmN0aW9uIGluaXQoKXtcblx0Ly9wb2x5KCk7XG5cblx0Ly9zdmc0ZXZlcnlib2R5KCk7XG5cdHNldHVwR2FsbGVyeUdyaWQoKTtcbn1cblxuZnVuY3Rpb24gc2V0dXBHYWxsZXJ5R3JpZCgpe1xuXHRnYWxsZXJ5R3JpZCgnLmpzLWdhbGxlcnknLCB7XG5cdFx0aW1nUG9zaXRpb25zOiBbXG5cdFx0XHR7IHBvczogeyB4IDogMSwgeSA6IC0wLjUgfSwgcGFnZW1hcmdpbjogMzAgfSxcblx0XHRcdHsgbXE6ICc0OGVtJywgcG9zOiB7IHggOiAtMC41LCB5IDogMSB9LCBwYWdlbWFyZ2luOiAzMCB9XG5cdFx0XSxcblx0XHRzaXplczogW1xuXHRcdFx0eyBjb2x1bW5zOiAyLCBndXR0ZXI6IDE1fSxcblx0XHRcdHsgbXE6ICc1NjBweCcsIGNvbHVtbnM6IDIsIGd1dHRlcjogMTV9LFxuXHRcdFx0eyBtcTogJzc2OHB4JywgY29sdW1uczogMywgZ3V0dGVyOiAxNX0sXG5cdFx0XHR7IG1xOiAnOTIwcHgnLCBjb2x1bW5zOiA0LCBndXR0ZXI6IDE1fSxcblx0XHRcdHsgbXE6ICcxMTgwcHgnLCBjb2x1bW5zOiA1LCBndXR0ZXI6IDE1fVxuXHRcdF1cblx0fSk7XG59XG5cbmlmKGRvY3VtZW50LnJlYWR5U3RhdGUgIT0gJ2xvYWRpbmcnKXtcblx0aW5pdCgpO1xufWVsc2V7XG5cdGRvY3VtZW50LmFkZEV2ZW50TGlzdGVuZXIoJ0RPTUNvbnRlbnRMb2FkZWQnLCBpbml0KTtcbn1cbiJdLCJuYW1lcyI6WyJ0cmFuc2l0aW9uRW5kTmFtZSIsIm9uRW5kVHJhbnNpdGlvbiIsImVsIiwiUHJvbWlzZSIsInJlc29sdmUiLCJyZWplY3QiLCJvbkVuZENhbGxiYWNrRm4iLCJldiIsImkiLCJsZW5ndGgiLCJyZW1vdmVFdmVudExpc3RlbmVyIiwiYWRkRXZlbnRMaXN0ZW5lciIsImV4dGVuZCIsIm9iamVjdHMiLCJhcmd1bWVudHMiLCJjb21iaW5lZE9iamVjdCIsImtleSIsInJlcXVlc3RBbmltYXRpb25GcmFtZVByb21pc2UiLCJyZXF1ZXN0QW5pbWF0aW9uRnJhbWUiLCJvYmplY3QiLCJldmVudHMiLCJvbiIsIm5hbWUiLCJoYW5kbGVyIiwicHVzaCIsIm9uY2UiLCJfb25jZSIsIm9mZiIsInNwbGljZSIsImluZGV4T2YiLCJlbWl0IiwiYXJncyIsImNhY2hlIiwic2xpY2UiLCJmb3JFYWNoIiwiYXBwbHkiLCJvdXQiLCJvdW5jZSIsIm9wdGlvbnMiLCJwZXJzaXN0IiwidGlja2luZyIsInNpemVJbmRleCIsInNpemVEZXRhaWwiLCJjb2x1bW5IZWlnaHRzIiwibm9kZXMiLCJub2Rlc1dpZHRoIiwibm9kZXNIZWlnaHRzIiwiY29udGFpbmVyIiwiZG9jdW1lbnQiLCJxdWVyeVNlbGVjdG9yIiwicGFja2VkIiwic2l6ZXMiLCJyZXZlcnNlIiwic2VsZWN0b3JzIiwic2V0dXAiLCJzZXRTaXplSW5kZXgiLCJzZXRTaXplRGV0YWlsIiwic2V0Q29sdW1ucyIsInJ1biIsInNldE5vZGVzIiwic2V0Tm9kZXNEaW1lbnNpb25zIiwic2V0Tm9kZXNTdHlsZXMiLCJzZXRDb250YWluZXJTdHlsZXMiLCJpbnN0YW5jZSIsImtub3QiLCJydW5TZXJpZXMiLCJmdW5jdGlvbnMiLCJmdW5jIiwidG9BcnJheSIsInNlbGVjdG9yIiwiQXJyYXkiLCJwcm90b3R5cGUiLCJjYWxsIiwicXVlcnlTZWxlY3RvckFsbCIsImZpbGxBcnJheSIsIm1hcCIsImdldFNpemVJbmRleCIsInNpemUiLCJtcSIsIndpbmRvdyIsIm1hdGNoTWVkaWEiLCJtYXRjaGVzIiwiY29sdW1ucyIsIm5ldyIsImFsbCIsImNsaWVudFdpZHRoIiwiZWxlbWVudCIsImNsaWVudEhlaWdodCIsImluZGV4IiwidGFyZ2V0IiwiTWF0aCIsIm1pbiIsInN0eWxlIiwicG9zaXRpb24iLCJ0b3AiLCJsZWZ0IiwiZ3V0dGVyIiwic2V0QXR0cmlidXRlIiwid2lkdGgiLCJoZWlnaHQiLCJtYXgiLCJyZXNpemVGcmFtZSIsInJlc2l6ZUhhbmRsZXIiLCJwYWNrIiwiY29uY2F0IiwidXBkYXRlIiwicmVzaXplIiwiZmxhZyIsImFjdGlvbiIsIkdhbGxlcnlHcmlkIiwiaW5pdCIsIm9wZW5JdGVtIiwiY2xvc2VJdGVtIiwibmV4dEl0ZW0iLCJwcmV2aW91c0l0ZW0iLCJkZWZhdWx0T3B0aW9ucyIsInBvcyIsIngiLCJ5IiwicGFnZW1hcmdpbiIsImNyZWF0ZUdhbGxlcnlHcmlkIiwiZ2FsR3JpZE9iaiIsIk9iamVjdCIsImNyZWF0ZSIsImVsQ2xhc3MiLCJpdGVtcyIsInByZXZpZXdFbCIsIm5leHRFbGVtZW50U2libGluZyIsImlzRXhwYW5kZWQiLCJpc0FuaW1hdGluZyIsImNsb3NlQnRuIiwicHJldmlld0Rlc2NyaXB0aW9ucyIsInByZXZpZXdEZXNjcmlwdGlvbkVsIiwiZW1wdHlQcmV2aWV3RGVzY3JpcHRpb25FbCIsInByZXZpb3VzQnRuIiwibmV4dEJ0biIsImJpbmQiLCJpbml0QWZ0ZXJJbWFnZXNMb2FkIiwiYnJpY2tzIiwiQnJpY2tzIiwiY2xhc3NMaXN0IiwiYWRkIiwiZ3JpZEltYWdlc0xvYWRlZCIsInRoZW4iLCJhZGRFdmVudExpc3RlbmVycyIsInNlbGYiLCJpdGVtIiwiZXZ0IiwicHJldmVudERlZmF1bHQiLCJuZXdTaXplSW5kZXgiLCJpbWdQb3NpdGlvbnMiLCJvcmlnaW5hbEltZyIsIm9wYWNpdHkiLCJpdGVtSW1hZ2UiLCJpdGVtSW1hZ2VCQ1IiLCJnZXRCb3VuZGluZ0NsaWVudFJlY3QiLCJjdXJyZW50IiwiZ2V0QXR0cmlidXRlIiwic3JjIiwib2Zmc2V0V2lkdGgiLCJvZmZzZXRIZWlnaHQiLCJwYWdlTWFyZ2luIiwid2luIiwiZ2V0V2luU2l6ZSIsIm9yaWdpbmFsU2l6ZUFyciIsInNwbGl0Iiwib3JpZ2luYWxTaXplIiwiZHgiLCJhYnMiLCJkeSIsInoiLCJ0cmFuc2Zvcm0iLCJjbG9uZUltZyIsIldlYmtpdFRyYW5zZm9ybSIsImRlc2NyaXB0aW9uRWwiLCJpbm5lckhUTUwiLCJvcmlnaW5hbEltYWdlTG9hZFByb21pc2UiLCJjYXRjaCIsInJlYXNvbiIsImVycm9yIiwic2V0T3JpZ2luYWwiLCJjcmVhdGVFbGVtZW50IiwiY2xhc3NOYW1lIiwibWF4V2lkdGgiLCJwYXJzZUludCIsIm1heEhlaWdodCIsIm9sZEVsIiwicmVtb3ZlIiwiYXBwZW5kQ2hpbGQiLCJpbWFnZUxvYWRQcm9taXNlIiwiaW1nIiwiaW1hZ2VMb2FkIiwiY29tcGxldGUiLCJvbmxvYWQiLCJzZXRDbG9uZSIsInNldHRpbmdzIiwiZ2V0TmV4dEl0ZW0iLCJnZXRQcmV2aW91c0l0ZW0iLCJzbGlkZUl0ZW0iLCJjaGFuZ2VEaXN0YW5jZSIsImdldEl0ZW1DYiIsImxhc3RJdGVtIiwiY29udGFpbnMiLCJjaGFuZ2VEaXN0YW5jZUR4IiwiY2xvbmVUcmFuc2Zvcm0iLCJ0cmFuc2l0aW9uIiwiZW1wdHlEZXNjcmlwdGlvblRyYW5zZm9ybSIsIm9yaWdpbmFsSW1nVHJhbnNmb3JtIiwiZGVzY3JpcHRpb25UcmFuc2Zvcm0iLCJ0bXBEZXNjcmlwdGlvbiIsImN1cnJlbnRJdGVtIiwicHJldmlvdXNFbGVtZW50U2libGluZyIsInVwZGF0ZVNsaWRlQnRuU3RhdHVzIiwiZG9jdW1lbnRFbGVtZW50IiwiaW5uZXJIZWlnaHQiLCJzZXR1cEdhbGxlcnlHcmlkIiwicmVhZHlTdGF0ZSJdLCJtYXBwaW5ncyI6Ijs7O0FBdUJBLElBQU1BLG9CQUFvQixDQUFDLHFCQUFELEVBQXdCLGVBQXhCLEVBQXlDLGlCQUF6QyxFQUE0RCxnQkFBNUQsQ0FBMUI7O0FBRUEsU0FBU0MsZUFBVCxDQUF5QkMsRUFBekIsRUFBNEI7UUFDcEIsSUFBSUMsT0FBSixDQUFZLFVBQVNDLE9BQVQsRUFBa0JDLE1BQWxCLEVBQXlCO01BQ3JDQyxrQkFBa0IsU0FBbEJBLGVBQWtCLENBQVNDLEVBQVQsRUFBWTtRQUM5QixJQUFJQyxJQUFJLENBQWIsRUFBZ0JBLElBQUlSLGtCQUFrQlMsTUFBdEMsRUFBOENELEdBQTlDLEVBQW1EO09BQy9DRSxtQkFBSCxDQUF1QlYsa0JBQWtCUSxDQUFsQixDQUF2QixFQUE2Q0YsZUFBN0M7OztHQUZGOztNQU9HLENBQUNKLEVBQUosRUFBTztVQUNDLHdDQUFQOzs7T0FH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