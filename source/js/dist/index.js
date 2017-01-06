(function () {
'use strict';

const transitionEndName = ['webkitTransitionEnd', 'transitionend', 'msTransitionEnd', 'oTransitionEnd'];

function onEndTransition(el){
	return new Promise(function(resolve, reject){
		const onEndCallbackFn = function(ev){
			for (let i = 0; i < transitionEndName.length; i++) {
				el.removeEventListener(transitionEndName[i], onEndCallbackFn);
			}
			resolve();
		};

		if(!el){
			reject('No element passed to on End Transition');
		}

		for (let i = 0; i < transitionEndName.length; i++) {
			el.addEventListener(transitionEndName[i], onEndCallbackFn);
		}
	});
}

function extend(){
	const objects = arguments;
	if(objects.length < 2){
		return objects[0];
	}
	const combinedObject = objects[0];

	for(let i = 1; i < objects.length; i++){
		if(!objects[i]){
			continue;
		}
		for(let key in objects[i]){
			combinedObject[key] = objects[i][key];
		}
	}

	return combinedObject;
}

function requestAnimationFramePromise(){
	return new Promise((resolve, reject) => requestAnimationFrame(resolve));
}

var knot = (object = {}) => {
  const events = {};

  function on(name, handler) {
    events[name] = events[name] || [];
    events[name].push(handler);
    return this
  }

  function once(name, handler) {
    handler._once = true;
    on(name, handler);
    return this
  }

  function off(name, handler = false) {
    handler
      ? events[name].splice(events[name].indexOf(handler), 1)
      : delete events[name];

    return this
  }

  function emit(name, ...args) {
    // cache the events, to avoid consequences of mutation
    const cache = events[name] && events[name].slice();

    // only fire handlers if they exist
    cache && cache.forEach(handler => {
      // remove handlers added with 'once'
      handler._once && off(name, handler);

      // set 'this' context, pass args to handlers
      handler.apply(this, args);
    });

    return this
  }

  const out = object;
  out.on = on;
  out.ounce = once;
  out.off = off;
  out.emit = emit;

  return out;
};

var Bricks = (options = {}) => {
	// globals

	let persist;           // updating or packing all elements?
	let ticking;           // for debounced resize

	let sizeIndex;
	let sizeDetail;

	let columnHeights;

	let nodes;
	let nodesWidth;
	let nodesHeights;

	// options
	const container = document.querySelector(options.container);
	const packed    = options.packed.indexOf('data-') === 0 ? options.packed : `data-${ options.packed }`;
	const sizes     = options.sizes.slice().reverse();

	const selectors = {
		all: `${ options.container } > *`,
		new: `${ options.container } > *:not([${ packed }])`
	};

	// series

	const setup = [
		setSizeIndex,
		setSizeDetail,
		setColumns
	];

	const run = [
		setNodes,
		setNodesDimensions,
		setNodesStyles,
		setContainerStyles
	];

	// instance

	const instance = knot({
		pack,
		update,
		resize
	});

	return instance;

	// general helpers

	function runSeries(functions) {
		functions.forEach(func => func());
	}

	// array helpers

	function toArray(selector) {
		return Array.prototype.slice.call(document.querySelectorAll(selector));
	}

	function fillArray(length) {
		return Array.apply(null, Array(length)).map(() => 0);
	}

	// size helpers

	function getSizeIndex() {
		// find index of widest matching media query
		return sizes
			.map(size => size.mq && window.matchMedia(`(min-width: ${ size.mq })`).matches)
			.indexOf(true);
	}

	function setSizeIndex() {
		sizeIndex = getSizeIndex();
	}

	function setSizeDetail() {
		// if no media queries matched, use the base case
		sizeDetail = sizeIndex === -1
			? sizes[sizes.length - 1]
			: sizes[sizeIndex];
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
		if(nodes.length === 0) {
			return;
		}

		nodesWidth   = nodes[0].clientWidth;
		nodesHeights = nodes.map(element => element.clientHeight);
	}

	function setNodesStyles() {
		nodes.forEach((element, index) => {
			const target = columnHeights.indexOf(Math.min.apply(Math, columnHeights));

			element.style.position  = 'absolute';
			element.style.top       = `${ columnHeights[target] }px`;
			element.style.left      = `${ (target * nodesWidth) + (target * sizeDetail.gutter) }px`;

			element.setAttribute(packed, '');

			columnHeights[target] += nodesHeights[index] + sizeDetail.gutter;
		});
	}

	// container helpers

	function setContainerStyles() {
		container.style.position = 'relative';
		container.style.width    = `${ sizeDetail.columns * nodesWidth + (sizeDetail.columns - 1) * sizeDetail.gutter }px`;
		container.style.height   = `${ Math.max.apply(Math, columnHeights) - sizeDetail.gutter }px`;
	}

	// resize helpers

	function resizeFrame() {
		if(!ticking) {
			requestAnimationFrame(resizeHandler);
			ticking = true;
		}
	}

	function resizeHandler() {
		if(sizeIndex !== getSizeIndex()) {
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

	function resize(flag = true) {
		const action = flag
			? 'addEventListener'
			: 'removeEventListener';

		window[action]('resize', resizeFrame);

		return instance;
	}
};

const GalleryGrid = {
	setup: setup,
	init: init$1,

	openItem: openItem,
	closeItem: closeItem,
	nextItem: nextItem,
	previousItem: previousItem
};

const defaultOptions = {
	// x and y can have values from 0 to 1 (percentage). If negative then it means the alignment is left and/or top rather than right and/or bottom
	// so, as an example, if we want our large image to be positioned vertically on 25% of the screen and centered horizontally the values would be x:1,y:-0.25
	imgPositions: [
		{pos: { x : 1, y : 1 }, pagemargin : 0}
	],
	sizes: [
		{ columns: 1, gutter: 30},
		{ mq: '1024px', columns: 5, gutter: 30}
	]
};

function createGalleryGrid$1(el, options){
	const galGridObj = Object.create(GalleryGrid);
	galGridObj.setup(el, options);
	galGridObj.init();
	return galGridObj;
}

function setup(elClass, options){
	this.elClass = elClass;
	this.el = document.querySelector(elClass);
	if(!this.el){
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
	const previewDescriptions = this.previewEl.querySelectorAll('.gallery__preview-description');
	this.previewDescriptionEl = previewDescriptions[0];
	this.emptyPreviewDescriptionEl = previewDescriptions[1];

	this.previousBtn = this.previewEl.querySelector('.gallery__preview-btn--previous');
	this.nextBtn = this.previewEl.querySelector('.gallery__preview-btn--next');

	this.openItem = this.openItem.bind(this);
	this.closeItem = this.closeItem.bind(this);
	this.nextItem = this.nextItem.bind(this);
	this.previousItem = this.previousItem.bind(this);
}

function init$1(){
	if(!this.el){
		return;
	}

	const initAfterImagesLoad = function(){
		this.bricks = Bricks({
			container: this.elClass,
			packed: 'data-packed',
			sizes: this.options.sizes
		});

		this.bricks
		.resize(true)
		.pack();

		this.el.classList.add('gallery--loaded');

		addEventListeners.call(this);
		setOriginal.call(this);
		setClone.call(this);
	};

	Promise.all(gridImagesLoaded.call(this))
	.then(initAfterImagesLoad.bind(this));
}

function addEventListeners(){
	const self = this;

	this.items.forEach(function(item){
		if(!item.querySelector('.gallery__image')){
			return;
		}
		item.addEventListener('click', function(evt){
			evt.preventDefault();
			self.openItem(item);
		});
	});

	this.closeBtn.addEventListener('click', this.closeItem);
	this.previousBtn.addEventListener('click', this.previousItem);
	this.nextBtn.addEventListener('click', this.nextItem);
	window.addEventListener('resize', resizeFrame.bind(this));
	window.addEventListener('keydown', function(evt){
		if(evt.key == "Escape"){
			this.closeItem();
		}
		if(evt.key == "ArrowRight"){
			this.nextItem();
		}
		if(evt.key == "ArrowLeft"){
			this.previousItem();
		}
	}.bind(this));
}

function getSizeIndex(){
	const newSizeIndex = this.options.imgPositions
			.map(size => size.mq && window.matchMedia(`(min-width: ${ size.mq })`).matches)
			.indexOf(true);
	return ~newSizeIndex ? newSizeIndex : 0;
}

function resizeFrame() {
	if(!this.ticking) {
		requestAnimationFrame(resizeHandler.bind(this));
		this.ticking = true;
	}
}

function resizeHandler() {
	let newSizeIndex = getSizeIndex.call(this);
	if(this.sizeIndex !== newSizeIndex){
		this.sizeIndex = newSizeIndex;
		setOriginal.call(this);

		if(this.isExpanded){
			this.originalImg.style.opacity = 1;
		}
	}
	this.ticking = false;
}

function openItem(item){
	if(this.isAnimating || this.isExpanded){
		return;
	}
	this.isAnimating = true;
	this.isExpanded = true;

	updateSlideBtnStatus.call(this, item);

	const itemImage = item.querySelector('img'),
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

	let pageMargin = 0;
	if(typeof this.options.imgPositions[this.sizeIndex].pagemargin !== 'undefined'){
		pageMargin = this.options.imgPositions[this.sizeIndex].pagemargin;
	}

	const win = getWinSize(),
		originalSizeArr = item.getAttribute('data-size').split('x'),
		originalSize = {width: originalSizeArr[0], height: originalSizeArr[1]},
		dx = ((this.options.imgPositions[this.sizeIndex].pos.x > 0 ? 1-Math.abs(this.options.imgPositions[this.sizeIndex].pos.x) : Math.abs(this.options.imgPositions[this.sizeIndex].pos.x)) * win.width + this.options.imgPositions[this.sizeIndex].pos.x * win.width/2) - itemImageBCR.left - 0.5 * itemImage.offsetWidth,
		dy = ((this.options.imgPositions[this.sizeIndex].pos.y > 0 ? 1-Math.abs(this.options.imgPositions[this.sizeIndex].pos.y) : Math.abs(this.options.imgPositions[this.sizeIndex].pos.y)) * win.height + this.options.imgPositions[this.sizeIndex].pos.y * win.height/2) - itemImageBCR.top - 0.5 * itemImage.offsetHeight,
		z = Math.min( Math.min(win.width*Math.abs(this.options.imgPositions[this.sizeIndex].pos.x) - pageMargin, originalSize.width - pageMargin)/itemImage.offsetWidth, Math.min(win.height*Math.abs(this.options.imgPositions[this.sizeIndex].pos.y) - pageMargin, originalSize.height - pageMargin)/itemImage.offsetHeight );

	const transform = `translate3d(${dx}px, ${dy}px, 0) scale3d(${z}, ${z}, 1)`;
	this.cloneImg.style.WebkitTransform = transform;
	this.cloneImg.style.transform = transform;

	const descriptionEl = item.querySelector('.gallery__description');
	if(descriptionEl){
		this.previewDescriptionEl.innerHTML = descriptionEl.innerHTML;
	}

	var self = this;
	setTimeout(function() {
		self.previewEl.classList.add('gallery__preview--open');
	}, 0);

	Promise.all([onEndTransition(this.cloneImg), originalImageLoadPromise.call(this)])
	.then(function(){
		self.originalImg.style.opacity = 1;
	})
	.then(() => onEndTransition(self.originalImg))
	.then(function(){
		self.cloneImg.style.opacity = 0;
		self.cloneImg.style.WebkitTransform = 'translate3d(0,0,0) scale3d(1,1,1)';
		self.cloneImg.style.transform = 'translate3d(0,0,0) scale3d(1,1,1)';

		self.isAnimating = false;
	})
	.catch(function(reason){
		console.error(reason);
	});
}

function setOriginal(src){
	if(!src){
		this.originalImg = document.createElement('img');
		this.originalImg.className = 'gallery__preview-original';
		this.originalImg.style.opacity = 0;
		let pageMargin = 0;
		if(typeof this.options.imgPositions[this.sizeIndex].pagemargin !== 'undefined'){
			pageMargin = this.options.imgPositions[this.sizeIndex].pagemargin;
		}
		this.originalImg.style.maxWidth = 'calc(' + parseInt(Math.abs(this.options.imgPositions[this.sizeIndex].pos.x)*100) + 'vw - ' + pageMargin + 'px)';
		this.originalImg.style.maxHeight = 'calc(' + parseInt(Math.abs(this.options.imgPositions[this.sizeIndex].pos.y)*100) + 'vh - ' + pageMargin + 'px)';
		this.originalImg.style.WebkitTransform = 'translate3d(0,0,0)';
		this.originalImg.style.transform = 'translate3d(0,0,0)';
		src = '';
		const oldEl = this.previewEl.querySelector('.'+this.originalImg.className);
		if(oldEl){
			src = oldEl.src;
			oldEl.remove();
		}
		this.previewEl.appendChild(this.originalImg);
	}

	this.originalImg.setAttribute('src', src);
}

function originalImageLoadPromise(){
	return imageLoadPromise(this.originalImg);
}

function imageLoadPromise(img){
	const imageLoadPromise = function(resolve, reject){
		if(!img.getAttribute('src')){
			reject('no src found for original image');
		}

		const imageLoad = function(){
			if(img.complete){
				resolve();
			}else{
				reject('image not loaded: '+img.getAttribute('src'));
			}
		};

		if(img.complete){
			resolve();
		}else{
			img.onload = imageLoad.bind(this);
		}
	};

	return new Promise(imageLoadPromise.bind(this));
}

function gridImagesLoaded(){
	return this.items.map(function(item){
		const img = item.querySelector('img');
		if(!img){
			return;
		}
		return imageLoadPromise(img);
	});
}

function setClone(src, settings){
	if(!src) {
		this.cloneImg = document.createElement('img');
		this.cloneImg.className = 'gallery__preview-clone';
		src = '';
		this.cloneImg.style.opacity = 0;
		this.previewEl.appendChild(this.cloneImg);
	}else{
		this.cloneImg.style.opacity = 1;
		this.cloneImg.style.width = settings.width  + 'px';
		this.cloneImg.style.height = settings.height  + 'px';
		this.cloneImg.style.top = settings.top  + 'px';
		this.cloneImg.style.left = settings.left  + 'px';
	}

	this.cloneImg.setAttribute('src', src);
}

function closeItem(){
	if(!this.isExpanded || this.isAnimating){
		return;
	}
	this.isExpanded = false;
	this.isAnimating = true;

	const item = this.items[this.current],
		itemImage = item.querySelector('img'),
		itemImageBCR = itemImage.getBoundingClientRect(),
		self = this;

	this.previewEl.classList.remove('gallery__preview--open');

	this.originalImg.classList.add('gallery__preview-original--animate');

	var win = getWinSize(),
		dx = itemImageBCR.left + itemImage.offsetWidth/2 - ((this.options.imgPositions[this.sizeIndex].pos.x > 0 ? 1-Math.abs(this.options.imgPositions[this.sizeIndex].pos.x) : Math.abs(this.options.imgPositions[this.sizeIndex].pos.x)) * win.width + this.options.imgPositions[this.sizeIndex].pos.x * win.width/2),
		dy = itemImageBCR.top + itemImage.offsetHeight/2 - ((this.options.imgPositions[this.sizeIndex].pos.y > 0 ? 1-Math.abs(this.options.imgPositions[this.sizeIndex].pos.y) : Math.abs(this.options.imgPositions[this.sizeIndex].pos.y)) * win.height + this.options.imgPositions[this.sizeIndex].pos.y * win.height/2),
		z = itemImage.offsetWidth/this.originalImg.offsetWidth;

	this.originalImg.style.WebkitTransform = `translate3d(${dx}px, ${dy}px, 0) scale3d(${z}, ${z}, 1)`;
	this.originalImg.style.transform = `translate3d(${dx}px, ${dy}px, 0) scale3d(${z}, ${z}, 1)`;

	onEndTransition(this.originalImg)
	.then(function(){
		self.previewDescriptionEl.innerHTML = '';
		item.classList.remove('gallery__item--current');
		setTimeout(function() {
			self.originalImg.style.opacity = 0;
		}, 60);
	})
	.then(() => onEndTransition(self.originalImg))
	.then(function(){
		self.originalImg.classList.remove('gallery__preview-original--animate');
		self.originalImg.style.WebkitTransform = 'translate3d(0,0,0) scale3d(1,1,1)';
		self.originalImg.style.transform = 'translate3d(0,0,0) scale3d(1,1,1)';

		self.isAnimating = false;
	})
	.catch(function(reason){
		console.error(reason);
	});
}

function nextItem(){
	slideItem.call(this, 50, getNextItem);
}

function previousItem(){
	slideItem.call(this, -50, getPreviousItem);
}

function slideItem(changeDistance, getItemCb){
	// if preview is closed or animation is happening do nothing
	if(!this.isExpanded || this.isAnimating){
		return;
	}

	const lastItem = this.items[this.current]; //get the current item
	const nextItem = getItemCb(lastItem); //get the next item
	if(!lastItem || !nextItem || !nextItem.classList.contains('gallery__item')){ //if there is no next item do nothing
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
	const itemImage = nextItem.querySelector('img'),
		itemImageBCR = itemImage.getBoundingClientRect();


	setClone.call(this, itemImage.src, {
		width: itemImage.offsetWidth,
		height: itemImage.offsetHeight,
		left: itemImageBCR.left,
		top: itemImageBCR.top
	});

	let pageMargin = 0;
	if(typeof this.options.imgPositions[this.sizeIndex].pagemargin !== 'undefined'){
		pageMargin = this.options.imgPositions[this.sizeIndex].pagemargin;
	}

	if(!changeDistance){
		changeDistance = 50;
	}

	let win = getWinSize(),
		originalSizeArr = nextItem.getAttribute('data-size').split('x'),
		originalSize = {width: originalSizeArr[0], height: originalSizeArr[1]},
		dx = ((this.options.imgPositions[this.sizeIndex].pos.x > 0 ? 1-Math.abs(this.options.imgPositions[this.sizeIndex].pos.x) : Math.abs(this.options.imgPositions[this.sizeIndex].pos.x)) * win.width + this.options.imgPositions[this.sizeIndex].pos.x * win.width/2) - itemImageBCR.left - 0.5 * itemImage.offsetWidth,
		dy = ((this.options.imgPositions[this.sizeIndex].pos.y > 0 ? 1-Math.abs(this.options.imgPositions[this.sizeIndex].pos.y) : Math.abs(this.options.imgPositions[this.sizeIndex].pos.y)) * win.height + this.options.imgPositions[this.sizeIndex].pos.y * win.height/2) - itemImageBCR.top - 0.5 * itemImage.offsetHeight,
		z = Math.min( Math.min(win.width*Math.abs(this.options.imgPositions[this.sizeIndex].pos.x) - pageMargin, originalSize.width - pageMargin)/itemImage.offsetWidth, Math.min(win.height*Math.abs(this.options.imgPositions[this.sizeIndex].pos.y) - pageMargin, originalSize.height - pageMargin)/itemImage.offsetHeight ),
		changeDistanceDx = dx + changeDistance;

	const cloneTransform = `translate3d(${changeDistanceDx}px, ${dy}px, 0) scale3d(${z}, ${z}, 1)`;
	this.cloneImg.style.transition = 'none';
	this.cloneImg.style.WebkitTransform = cloneTransform;
	this.cloneImg.style.transform = cloneTransform;

	const descriptionEl = nextItem.querySelector('.gallery__description');
	if(descriptionEl){
		this.emptyPreviewDescriptionEl.classList.add('gallery__preview-description--animate');
		this.previewDescriptionEl.classList.add('gallery__preview-description--animate');

		this.emptyPreviewDescriptionEl.innerHTML = descriptionEl.innerHTML;

		this.emptyPreviewDescriptionEl.style.transition = 'none';
		this.emptyPreviewDescriptionEl.style.opacity = 0;
		const emptyDescriptionTransform = `translate3d(0, ${changeDistance}px, 0)`;
		this.emptyPreviewDescriptionEl.style.WebkitTransform = emptyDescriptionTransform;
		this.emptyPreviewDescriptionEl.style.transform = emptyDescriptionTransform;
	}

	const self = this;

	requestAnimationFramePromise()
	.then(function(){
		//old original image fade out
		const originalImgTransform = `translate3d(-${changeDistance}px, 0, 0)`;
		self.originalImg.classList.add('gallery__preview-original--animate');
		self.originalImg.style.opacity = 0;
		self.originalImg.style.WebkitTransform = originalImgTransform;
		self.originalImg.style.transform = originalImgTransform;

		//fade in cloned image
		self.cloneImg.style.transition = '';
		const cloneTransform = `translate3d(${dx}px, ${dy}px, 0) scale3d(${z}, ${z}, 1)`;
		self.cloneImg.style.WebkitTransform = cloneTransform;
		self.cloneImg.style.transform = cloneTransform;
		self.cloneImg.style.opacity = 1;

		const descriptionTransform = `translate3d(0, -${changeDistance}px, 0)`;
		self.previewDescriptionEl.style.opacity = 0;
		self.previewDescriptionEl.style.WebkitTransform = descriptionTransform;
		self.previewDescriptionEl.style.transform = descriptionTransform;

		self.emptyPreviewDescriptionEl.style.transition = '';
		self.emptyPreviewDescriptionEl.style.opacity = 1;
		const emptyDescriptionTransform = `translate3d(0, 0, 0)`;
		self.emptyPreviewDescriptionEl.style.WebkitTransform = emptyDescriptionTransform;
		self.emptyPreviewDescriptionEl.style.transform = emptyDescriptionTransform;

		let tmpDescription = self.previewDescriptionEl;
		self.previewDescriptionEl = self.emptyPreviewDescriptionEl;
		self.emptyPreviewDescriptionEl = tmpDescription;
	})
	.then(() => onEndTransition(self.originalImg)) //when old main image has fade out
	.then(() => { // rest position of original image with no transition
		self.originalImg.classList.remove('gallery__preview-original--animate');
		const originalImgTransform = `translate3d(0, 0, 0)`;
		self.originalImg.style.WebkitTransform = originalImgTransform;
		self.originalImg.style.transform = originalImgTransform;
	})
	.then(() => setOriginal.call(self, nextItem.querySelector('a').getAttribute('href'))) //set new main image
	.then(() => imageLoadPromise.call(self, self.originalImg)) //when this has loaded
	.then(() => {
		self.originalImg.style.transition = '';
		self.originalImg.style.opacity = 1;
	})
	.then(() => onEndTransition(self.originalImg))
	.then(() => {
		self.cloneImg.style.opacity = 0;
		self.cloneImg.style.WebkitTransform = 'translate3d(0,0,0) scale3d(1,1,1)';
		self.cloneImg.style.transform = 'translate3d(0,0,0) scale3d(1,1,1)';
		this.cloneImg.style.transition = '';

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
	})
	.catch(function(reason){
		console.error(reason);
	});
}

function getNextItem(currentItem){
	let item = currentItem;
	while(item = item.nextElementSibling){
		if(item.getAttribute('data-size')){
			return item;
		}
	}
	return null;
}

function getPreviousItem(currentItem){
	let item = currentItem;
	while(item = item.previousElementSibling){
		if(item.getAttribute('data-size')){
			return item;
		}
	}
	return null;
}

function updateSlideBtnStatus(currentItem){
	if(!getNextItem(currentItem)){
		this.nextBtn.classList.add('gallery__preview-btn--disabled');
	}else{
		this.nextBtn.classList.remove('gallery__preview-btn--disabled');
	}

	if(!getPreviousItem(currentItem)){
		this.previousBtn.classList.add('gallery__preview-btn--disabled');
	}else{
		this.previousBtn.classList.remove('gallery__preview-btn--disabled');
	}
}

function getWinSize(){
	return {
		width: document.documentElement.clientWidth,
		height: window.innerHeight
	};
}

//import poly from './util/polyfills';

//import svg4everybody from '../vendor/svg4everybody';
function init(){
	//poly();

	//svg4everybody();
	setupGalleryGrid();
}

function setupGalleryGrid(){
	createGalleryGrid$1('.js-gallery', {
		imgPositions: [
			{ pos: { x : 1, y : -0.5 }, pagemargin: 30 },
			{ mq: '48em', pos: { x : -0.5, y : 1 }, pagemargin: 30 }
		],
		sizes: [
			{ columns: 2, gutter: 15},
			{ mq: '560px', columns: 2, gutter: 15},
			{ mq: '768px', columns: 3, gutter: 15},
			{ mq: '920px', columns: 4, gutter: 15},
			{ mq: '1180px', columns: 5, gutter: 15}
		]
	});
}

if(document.readyState != 'loading'){
	init();
}else{
	document.addEventListener('DOMContentLoaded', init);
}

}());

//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjpudWxsLCJzb3VyY2VzIjpbIkM6L2RhdGEvZnJvbnRlbmQtZGV2L2phdmFzY3JpcHQtcHJvamVjdHMvZ2FsbGVyeS9zb3VyY2UvanMvc3JjL3V0aWwvdXRpbC5qcyIsIkM6L2RhdGEvZnJvbnRlbmQtZGV2L2phdmFzY3JpcHQtcHJvamVjdHMvZ2FsbGVyeS9zb3VyY2UvanMvdmVuZG9yL2tub3QuanMiLCJDOi9kYXRhL2Zyb250ZW5kLWRldi9qYXZhc2NyaXB0LXByb2plY3RzL2dhbGxlcnkvc291cmNlL2pzL3ZlbmRvci9icmljay5qcyIsIkM6L2RhdGEvZnJvbnRlbmQtZGV2L2phdmFzY3JpcHQtcHJvamVjdHMvZ2FsbGVyeS9zb3VyY2UvanMvc3JjL3VpL2dhbGxlcnktZ3JpZC5qcyIsIkM6L2RhdGEvZnJvbnRlbmQtZGV2L2phdmFzY3JpcHQtcHJvamVjdHMvZ2FsbGVyeS9zb3VyY2UvanMvc3JjL2luZGV4LmpzIl0sInNvdXJjZXNDb250ZW50IjpbIid1c2Ugc3RyaWN0JztcblxuY29uc3QgYW5pbWF0aW9uRW5kRXZlbnROYW1lID0gWydhbmltYXRpb25lbmQnLCAnd2Via2l0QW5pbWF0aW9uRW5kJywgJ01TQW5pbWF0aW9uRW5kJywgJ29BbmltYXRpb25FbmQnXTtcblxuZnVuY3Rpb24gb25FbmRBbmltYXRpb24oZWwpe1xuXHRyZXR1cm4gbmV3IFByb21pc2UoZnVuY3Rpb24ocmVzb2x2ZSwgcmVqZWN0KXtcblx0XHRjb25zdCBvbkVuZENhbGxiYWNrRm4gPSBmdW5jdGlvbihldnQpe1xuXHRcdFx0Zm9yIChsZXQgaSA9IDA7IGkgPCBhbmltYXRpb25FbmRFdmVudE5hbWUubGVuZ3RoOyBpKyspIHtcblx0XHRcdFx0ZWwucmVtb3ZlRXZlbnRMaXN0ZW5lcihhbmltYXRpb25FbmRFdmVudE5hbWVbaV0sIG9uRW5kQ2FsbGJhY2tGbik7XG5cdFx0XHR9XG5cdFx0XHRyZXNvbHZlKCk7XG5cdFx0fTtcblxuXHRcdGlmKCFlbCl7XG5cdFx0XHRyZWplY3QoJ05vIGVsZW1lbnQgcGFzc2VkIHRvIG9uIEVuZCBBbmltYXRpb24nKTtcblx0XHR9XG5cblx0XHRmb3IgKGxldCBpID0gMDsgaSA8IGFuaW1hdGlvbkVuZEV2ZW50TmFtZS5sZW5ndGg7IGkrKykge1xuXHRcdFx0ZWwuYWRkRXZlbnRMaXN0ZW5lcihhbmltYXRpb25FbmRFdmVudE5hbWVbaV0sIG9uRW5kQ2FsbGJhY2tGbik7XG5cdFx0fVxuXHR9KTtcbn1cblxuY29uc3QgdHJhbnNpdGlvbkVuZE5hbWUgPSBbJ3dlYmtpdFRyYW5zaXRpb25FbmQnLCAndHJhbnNpdGlvbmVuZCcsICdtc1RyYW5zaXRpb25FbmQnLCAnb1RyYW5zaXRpb25FbmQnXTtcblxuZnVuY3Rpb24gb25FbmRUcmFuc2l0aW9uKGVsKXtcblx0cmV0dXJuIG5ldyBQcm9taXNlKGZ1bmN0aW9uKHJlc29sdmUsIHJlamVjdCl7XG5cdFx0Y29uc3Qgb25FbmRDYWxsYmFja0ZuID0gZnVuY3Rpb24oZXYpe1xuXHRcdFx0Zm9yIChsZXQgaSA9IDA7IGkgPCB0cmFuc2l0aW9uRW5kTmFtZS5sZW5ndGg7IGkrKykge1xuXHRcdFx0XHRlbC5yZW1vdmVFdmVudExpc3RlbmVyKHRyYW5zaXRpb25FbmROYW1lW2ldLCBvbkVuZENhbGxiYWNrRm4pO1xuXHRcdFx0fVxuXHRcdFx0cmVzb2x2ZSgpO1xuXHRcdH07XG5cblx0XHRpZighZWwpe1xuXHRcdFx0cmVqZWN0KCdObyBlbGVtZW50IHBhc3NlZCB0byBvbiBFbmQgVHJhbnNpdGlvbicpO1xuXHRcdH1cblxuXHRcdGZvciAobGV0IGkgPSAwOyBpIDwgdHJhbnNpdGlvbkVuZE5hbWUubGVuZ3RoOyBpKyspIHtcblx0XHRcdGVsLmFkZEV2ZW50TGlzdGVuZXIodHJhbnNpdGlvbkVuZE5hbWVbaV0sIG9uRW5kQ2FsbGJhY2tGbik7XG5cdFx0fVxuXHR9KTtcbn1cblxuZnVuY3Rpb24gZXh0ZW5kKCl7XG5cdGNvbnN0IG9iamVjdHMgPSBhcmd1bWVudHM7XG5cdGlmKG9iamVjdHMubGVuZ3RoIDwgMil7XG5cdFx0cmV0dXJuIG9iamVjdHNbMF07XG5cdH1cblx0Y29uc3QgY29tYmluZWRPYmplY3QgPSBvYmplY3RzWzBdO1xuXG5cdGZvcihsZXQgaSA9IDE7IGkgPCBvYmplY3RzLmxlbmd0aDsgaSsrKXtcblx0XHRpZighb2JqZWN0c1tpXSl7XG5cdFx0XHRjb250aW51ZTtcblx0XHR9XG5cdFx0Zm9yKGxldCBrZXkgaW4gb2JqZWN0c1tpXSl7XG5cdFx0XHRjb21iaW5lZE9iamVjdFtrZXldID0gb2JqZWN0c1tpXVtrZXldO1xuXHRcdH1cblx0fVxuXG5cdHJldHVybiBjb21iaW5lZE9iamVjdDtcbn1cblxuZnVuY3Rpb24gcmVxdWVzdEFuaW1hdGlvbkZyYW1lUHJvbWlzZSgpe1xuXHRyZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4gcmVxdWVzdEFuaW1hdGlvbkZyYW1lKHJlc29sdmUpKTtcbn1cblxuZXhwb3J0IHtvbkVuZEFuaW1hdGlvbiwgb25FbmRUcmFuc2l0aW9uLCBleHRlbmQsIHJlcXVlc3RBbmltYXRpb25GcmFtZVByb21pc2V9O1xuIiwiZXhwb3J0IGRlZmF1bHQgKG9iamVjdCA9IHt9KSA9PiB7XHJcbiAgY29uc3QgZXZlbnRzID0ge31cclxuXHJcbiAgZnVuY3Rpb24gb24obmFtZSwgaGFuZGxlcikge1xyXG4gICAgZXZlbnRzW25hbWVdID0gZXZlbnRzW25hbWVdIHx8IFtdXHJcbiAgICBldmVudHNbbmFtZV0ucHVzaChoYW5kbGVyKVxyXG4gICAgcmV0dXJuIHRoaXNcclxuICB9XHJcblxyXG4gIGZ1bmN0aW9uIG9uY2UobmFtZSwgaGFuZGxlcikge1xyXG4gICAgaGFuZGxlci5fb25jZSA9IHRydWVcclxuICAgIG9uKG5hbWUsIGhhbmRsZXIpXHJcbiAgICByZXR1cm4gdGhpc1xyXG4gIH1cclxuXHJcbiAgZnVuY3Rpb24gb2ZmKG5hbWUsIGhhbmRsZXIgPSBmYWxzZSkge1xyXG4gICAgaGFuZGxlclxyXG4gICAgICA/IGV2ZW50c1tuYW1lXS5zcGxpY2UoZXZlbnRzW25hbWVdLmluZGV4T2YoaGFuZGxlciksIDEpXHJcbiAgICAgIDogZGVsZXRlIGV2ZW50c1tuYW1lXVxyXG5cclxuICAgIHJldHVybiB0aGlzXHJcbiAgfVxyXG5cclxuICBmdW5jdGlvbiBlbWl0KG5hbWUsIC4uLmFyZ3MpIHtcclxuICAgIC8vIGNhY2hlIHRoZSBldmVudHMsIHRvIGF2b2lkIGNvbnNlcXVlbmNlcyBvZiBtdXRhdGlvblxyXG4gICAgY29uc3QgY2FjaGUgPSBldmVudHNbbmFtZV0gJiYgZXZlbnRzW25hbWVdLnNsaWNlKClcclxuXHJcbiAgICAvLyBvbmx5IGZpcmUgaGFuZGxlcnMgaWYgdGhleSBleGlzdFxyXG4gICAgY2FjaGUgJiYgY2FjaGUuZm9yRWFjaChoYW5kbGVyID0+IHtcclxuICAgICAgLy8gcmVtb3ZlIGhhbmRsZXJzIGFkZGVkIHdpdGggJ29uY2UnXHJcbiAgICAgIGhhbmRsZXIuX29uY2UgJiYgb2ZmKG5hbWUsIGhhbmRsZXIpXHJcblxyXG4gICAgICAvLyBzZXQgJ3RoaXMnIGNvbnRleHQsIHBhc3MgYXJncyB0byBoYW5kbGVyc1xyXG4gICAgICBoYW5kbGVyLmFwcGx5KHRoaXMsIGFyZ3MpXHJcbiAgICB9KVxyXG5cclxuICAgIHJldHVybiB0aGlzXHJcbiAgfVxyXG5cclxuICBjb25zdCBvdXQgPSBvYmplY3Q7XHJcbiAgb3V0Lm9uID0gb247XHJcbiAgb3V0Lm91bmNlID0gb25jZTtcclxuICBvdXQub2ZmID0gb2ZmO1xyXG4gIG91dC5lbWl0ID0gZW1pdDtcclxuXHJcbiAgcmV0dXJuIG91dDtcclxufSIsImltcG9ydCBrbm90IGZyb20gJy4va25vdC5qcyc7XG5cbmV4cG9ydCBkZWZhdWx0IChvcHRpb25zID0ge30pID0+IHtcblx0Ly8gZ2xvYmFsc1xuXG5cdGxldCBwZXJzaXN0OyAgICAgICAgICAgLy8gdXBkYXRpbmcgb3IgcGFja2luZyBhbGwgZWxlbWVudHM/XG5cdGxldCB0aWNraW5nOyAgICAgICAgICAgLy8gZm9yIGRlYm91bmNlZCByZXNpemVcblxuXHRsZXQgc2l6ZUluZGV4O1xuXHRsZXQgc2l6ZURldGFpbDtcblxuXHRsZXQgY29sdW1uSGVpZ2h0cztcblxuXHRsZXQgbm9kZXM7XG5cdGxldCBub2Rlc1dpZHRoO1xuXHRsZXQgbm9kZXNIZWlnaHRzO1xuXG5cdC8vIG9wdGlvbnNcblx0Y29uc3QgY29udGFpbmVyID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvcihvcHRpb25zLmNvbnRhaW5lcik7XG5cdGNvbnN0IHBhY2tlZCAgICA9IG9wdGlvbnMucGFja2VkLmluZGV4T2YoJ2RhdGEtJykgPT09IDAgPyBvcHRpb25zLnBhY2tlZCA6IGBkYXRhLSR7IG9wdGlvbnMucGFja2VkIH1gO1xuXHRjb25zdCBzaXplcyAgICAgPSBvcHRpb25zLnNpemVzLnNsaWNlKCkucmV2ZXJzZSgpO1xuXG5cdGNvbnN0IHNlbGVjdG9ycyA9IHtcblx0XHRhbGw6IGAkeyBvcHRpb25zLmNvbnRhaW5lciB9ID4gKmAsXG5cdFx0bmV3OiBgJHsgb3B0aW9ucy5jb250YWluZXIgfSA+ICo6bm90KFskeyBwYWNrZWQgfV0pYFxuXHR9O1xuXG5cdC8vIHNlcmllc1xuXG5cdGNvbnN0IHNldHVwID0gW1xuXHRcdHNldFNpemVJbmRleCxcblx0XHRzZXRTaXplRGV0YWlsLFxuXHRcdHNldENvbHVtbnNcblx0XTtcblxuXHRjb25zdCBydW4gPSBbXG5cdFx0c2V0Tm9kZXMsXG5cdFx0c2V0Tm9kZXNEaW1lbnNpb25zLFxuXHRcdHNldE5vZGVzU3R5bGVzLFxuXHRcdHNldENvbnRhaW5lclN0eWxlc1xuXHRdO1xuXG5cdC8vIGluc3RhbmNlXG5cblx0Y29uc3QgaW5zdGFuY2UgPSBrbm90KHtcblx0XHRwYWNrLFxuXHRcdHVwZGF0ZSxcblx0XHRyZXNpemVcblx0fSk7XG5cblx0cmV0dXJuIGluc3RhbmNlO1xuXG5cdC8vIGdlbmVyYWwgaGVscGVyc1xuXG5cdGZ1bmN0aW9uIHJ1blNlcmllcyhmdW5jdGlvbnMpIHtcblx0XHRmdW5jdGlvbnMuZm9yRWFjaChmdW5jID0+IGZ1bmMoKSk7XG5cdH1cblxuXHQvLyBhcnJheSBoZWxwZXJzXG5cblx0ZnVuY3Rpb24gdG9BcnJheShzZWxlY3Rvcikge1xuXHRcdHJldHVybiBBcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbChkb2N1bWVudC5xdWVyeVNlbGVjdG9yQWxsKHNlbGVjdG9yKSk7XG5cdH1cblxuXHRmdW5jdGlvbiBmaWxsQXJyYXkobGVuZ3RoKSB7XG5cdFx0cmV0dXJuIEFycmF5LmFwcGx5KG51bGwsIEFycmF5KGxlbmd0aCkpLm1hcCgoKSA9PiAwKTtcblx0fVxuXG5cdC8vIHNpemUgaGVscGVyc1xuXG5cdGZ1bmN0aW9uIGdldFNpemVJbmRleCgpIHtcblx0XHQvLyBmaW5kIGluZGV4IG9mIHdpZGVzdCBtYXRjaGluZyBtZWRpYSBxdWVyeVxuXHRcdHJldHVybiBzaXplc1xuXHRcdFx0Lm1hcChzaXplID0+IHNpemUubXEgJiYgd2luZG93Lm1hdGNoTWVkaWEoYChtaW4td2lkdGg6ICR7IHNpemUubXEgfSlgKS5tYXRjaGVzKVxuXHRcdFx0LmluZGV4T2YodHJ1ZSk7XG5cdH1cblxuXHRmdW5jdGlvbiBzZXRTaXplSW5kZXgoKSB7XG5cdFx0c2l6ZUluZGV4ID0gZ2V0U2l6ZUluZGV4KCk7XG5cdH1cblxuXHRmdW5jdGlvbiBzZXRTaXplRGV0YWlsKCkge1xuXHRcdC8vIGlmIG5vIG1lZGlhIHF1ZXJpZXMgbWF0Y2hlZCwgdXNlIHRoZSBiYXNlIGNhc2Vcblx0XHRzaXplRGV0YWlsID0gc2l6ZUluZGV4ID09PSAtMVxuXHRcdFx0PyBzaXplc1tzaXplcy5sZW5ndGggLSAxXVxuXHRcdFx0OiBzaXplc1tzaXplSW5kZXhdO1xuXHR9XG5cblx0Ly8gY29sdW1uIGhlbHBlcnNcblxuXHRmdW5jdGlvbiBzZXRDb2x1bW5zKCkge1xuXHRcdGNvbHVtbkhlaWdodHMgPSBmaWxsQXJyYXkoc2l6ZURldGFpbC5jb2x1bW5zKTtcblx0fVxuXG5cdC8vIG5vZGUgaGVscGVyc1xuXG5cdGZ1bmN0aW9uIHNldE5vZGVzKCkge1xuXHRcdG5vZGVzID0gdG9BcnJheShwZXJzaXN0ID8gc2VsZWN0b3JzLm5ldyA6IHNlbGVjdG9ycy5hbGwpO1xuXHR9XG5cblx0ZnVuY3Rpb24gc2V0Tm9kZXNEaW1lbnNpb25zKCkge1xuXHRcdGlmKG5vZGVzLmxlbmd0aCA9PT0gMCkge1xuXHRcdFx0cmV0dXJuO1xuXHRcdH1cblxuXHRcdG5vZGVzV2lkdGggICA9IG5vZGVzWzBdLmNsaWVudFdpZHRoO1xuXHRcdG5vZGVzSGVpZ2h0cyA9IG5vZGVzLm1hcChlbGVtZW50ID0+IGVsZW1lbnQuY2xpZW50SGVpZ2h0KTtcblx0fVxuXG5cdGZ1bmN0aW9uIHNldE5vZGVzU3R5bGVzKCkge1xuXHRcdG5vZGVzLmZvckVhY2goKGVsZW1lbnQsIGluZGV4KSA9PiB7XG5cdFx0XHRjb25zdCB0YXJnZXQgPSBjb2x1bW5IZWlnaHRzLmluZGV4T2YoTWF0aC5taW4uYXBwbHkoTWF0aCwgY29sdW1uSGVpZ2h0cykpO1xuXG5cdFx0XHRlbGVtZW50LnN0eWxlLnBvc2l0aW9uICA9ICdhYnNvbHV0ZSc7XG5cdFx0XHRlbGVtZW50LnN0eWxlLnRvcCAgICAgICA9IGAkeyBjb2x1bW5IZWlnaHRzW3RhcmdldF0gfXB4YDtcblx0XHRcdGVsZW1lbnQuc3R5bGUubGVmdCAgICAgID0gYCR7ICh0YXJnZXQgKiBub2Rlc1dpZHRoKSArICh0YXJnZXQgKiBzaXplRGV0YWlsLmd1dHRlcikgfXB4YDtcblxuXHRcdFx0ZWxlbWVudC5zZXRBdHRyaWJ1dGUocGFja2VkLCAnJyk7XG5cblx0XHRcdGNvbHVtbkhlaWdodHNbdGFyZ2V0XSArPSBub2Rlc0hlaWdodHNbaW5kZXhdICsgc2l6ZURldGFpbC5ndXR0ZXI7XG5cdFx0fSk7XG5cdH1cblxuXHQvLyBjb250YWluZXIgaGVscGVyc1xuXG5cdGZ1bmN0aW9uIHNldENvbnRhaW5lclN0eWxlcygpIHtcblx0XHRjb250YWluZXIuc3R5bGUucG9zaXRpb24gPSAncmVsYXRpdmUnO1xuXHRcdGNvbnRhaW5lci5zdHlsZS53aWR0aCAgICA9IGAkeyBzaXplRGV0YWlsLmNvbHVtbnMgKiBub2Rlc1dpZHRoICsgKHNpemVEZXRhaWwuY29sdW1ucyAtIDEpICogc2l6ZURldGFpbC5ndXR0ZXIgfXB4YDtcblx0XHRjb250YWluZXIuc3R5bGUuaGVpZ2h0ICAgPSBgJHsgTWF0aC5tYXguYXBwbHkoTWF0aCwgY29sdW1uSGVpZ2h0cykgLSBzaXplRGV0YWlsLmd1dHRlciB9cHhgO1xuXHR9XG5cblx0Ly8gcmVzaXplIGhlbHBlcnNcblxuXHRmdW5jdGlvbiByZXNpemVGcmFtZSgpIHtcblx0XHRpZighdGlja2luZykge1xuXHRcdFx0cmVxdWVzdEFuaW1hdGlvbkZyYW1lKHJlc2l6ZUhhbmRsZXIpO1xuXHRcdFx0dGlja2luZyA9IHRydWU7XG5cdFx0fVxuXHR9XG5cblx0ZnVuY3Rpb24gcmVzaXplSGFuZGxlcigpIHtcblx0XHRpZihzaXplSW5kZXggIT09IGdldFNpemVJbmRleCgpKSB7XG5cdFx0XHRwYWNrKCk7XG5cdFx0XHRpbnN0YW5jZS5lbWl0KCdyZXNpemUnLCBzaXplRGV0YWlsKTtcblx0XHR9XG5cblx0XHR0aWNraW5nID0gZmFsc2U7XG5cdH1cblxuXHQvLyBBUElcblxuXHRmdW5jdGlvbiBwYWNrKCkge1xuXHRcdHBlcnNpc3QgPSBmYWxzZTtcblx0XHRydW5TZXJpZXMoc2V0dXAuY29uY2F0KHJ1bikpO1xuXG5cdFx0cmV0dXJuIGluc3RhbmNlLmVtaXQoJ3BhY2snKTtcblx0fVxuXG5cdGZ1bmN0aW9uIHVwZGF0ZSgpIHtcblx0XHRwZXJzaXN0ID0gdHJ1ZTtcblx0XHRydW5TZXJpZXMocnVuKTtcblxuXHRcdHJldHVybiBpbnN0YW5jZS5lbWl0KCd1cGRhdGUnKTtcblx0fVxuXG5cdGZ1bmN0aW9uIHJlc2l6ZShmbGFnID0gdHJ1ZSkge1xuXHRcdGNvbnN0IGFjdGlvbiA9IGZsYWdcblx0XHRcdD8gJ2FkZEV2ZW50TGlzdGVuZXInXG5cdFx0XHQ6ICdyZW1vdmVFdmVudExpc3RlbmVyJztcblxuXHRcdHdpbmRvd1thY3Rpb25dKCdyZXNpemUnLCByZXNpemVGcmFtZSk7XG5cblx0XHRyZXR1cm4gaW5zdGFuY2U7XG5cdH1cbn07IiwiaW1wb3J0IHtvbkVuZFRyYW5zaXRpb24sIGV4dGVuZCwgcmVxdWVzdEFuaW1hdGlvbkZyYW1lUHJvbWlzZX0gZnJvbSAnLi4vdXRpbC91dGlsJztcbmltcG9ydCBCcmlja3MgZnJvbSAnLi4vLi4vdmVuZG9yL2JyaWNrJztcblxuY29uc3QgR2FsbGVyeUdyaWQgPSB7XG5cdHNldHVwOiBzZXR1cCxcblx0aW5pdDogaW5pdCxcblxuXHRvcGVuSXRlbTogb3Blbkl0ZW0sXG5cdGNsb3NlSXRlbTogY2xvc2VJdGVtLFxuXHRuZXh0SXRlbTogbmV4dEl0ZW0sXG5cdHByZXZpb3VzSXRlbTogcHJldmlvdXNJdGVtXG59O1xuXG5jb25zdCBkZWZhdWx0T3B0aW9ucyA9IHtcblx0Ly8geCBhbmQgeSBjYW4gaGF2ZSB2YWx1ZXMgZnJvbSAwIHRvIDEgKHBlcmNlbnRhZ2UpLiBJZiBuZWdhdGl2ZSB0aGVuIGl0IG1lYW5zIHRoZSBhbGlnbm1lbnQgaXMgbGVmdCBhbmQvb3IgdG9wIHJhdGhlciB0aGFuIHJpZ2h0IGFuZC9vciBib3R0b21cblx0Ly8gc28sIGFzIGFuIGV4YW1wbGUsIGlmIHdlIHdhbnQgb3VyIGxhcmdlIGltYWdlIHRvIGJlIHBvc2l0aW9uZWQgdmVydGljYWxseSBvbiAyNSUgb2YgdGhlIHNjcmVlbiBhbmQgY2VudGVyZWQgaG9yaXpvbnRhbGx5IHRoZSB2YWx1ZXMgd291bGQgYmUgeDoxLHk6LTAuMjVcblx0aW1nUG9zaXRpb25zOiBbXG5cdFx0e3BvczogeyB4IDogMSwgeSA6IDEgfSwgcGFnZW1hcmdpbiA6IDB9XG5cdF0sXG5cdHNpemVzOiBbXG5cdFx0eyBjb2x1bW5zOiAxLCBndXR0ZXI6IDMwfSxcblx0XHR7IG1xOiAnMTAyNHB4JywgY29sdW1uczogNSwgZ3V0dGVyOiAzMH1cblx0XVxufTtcblxuZnVuY3Rpb24gY3JlYXRlR2FsbGVyeUdyaWQoZWwsIG9wdGlvbnMpe1xuXHRjb25zdCBnYWxHcmlkT2JqID0gT2JqZWN0LmNyZWF0ZShHYWxsZXJ5R3JpZCk7XG5cdGdhbEdyaWRPYmouc2V0dXAoZWwsIG9wdGlvbnMpO1xuXHRnYWxHcmlkT2JqLmluaXQoKTtcblx0cmV0dXJuIGdhbEdyaWRPYmo7XG59XG5cbmZ1bmN0aW9uIHNldHVwKGVsQ2xhc3MsIG9wdGlvbnMpe1xuXHR0aGlzLmVsQ2xhc3MgPSBlbENsYXNzO1xuXHR0aGlzLmVsID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvcihlbENsYXNzKTtcblx0aWYoIXRoaXMuZWwpe1xuXHRcdHJldHVybjtcblx0fVxuXG5cdHRoaXMub3B0aW9ucyA9IGV4dGVuZCh7fSwgZGVmYXVsdE9wdGlvbnMsIG9wdGlvbnMpO1xuXHR0aGlzLnNpemVJbmRleCA9IGdldFNpemVJbmRleC5jYWxsKHRoaXMpO1xuXHR0aGlzLml0ZW1zID0gQXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwodGhpcy5lbC5xdWVyeVNlbGVjdG9yQWxsKCcuZ2FsbGVyeV9faXRlbScpKTtcblx0dGhpcy5wcmV2aWV3RWwgPSB0aGlzLmVsLm5leHRFbGVtZW50U2libGluZztcblx0dGhpcy5pc0V4cGFuZGVkID0gZmFsc2U7XG5cdHRoaXMuaXNBbmltYXRpbmcgPSBmYWxzZTtcblx0dGhpcy50aWNraW5nID0gZmFsc2U7XG5cdHRoaXMuY2xvc2VCdG4gPSB0aGlzLnByZXZpZXdFbC5xdWVyeVNlbGVjdG9yKCcuZ2FsbGVyeV9fcHJldmlldy1jbG9zZScpO1xuXHRjb25zdCBwcmV2aWV3RGVzY3JpcHRpb25zID0gdGhpcy5wcmV2aWV3RWwucXVlcnlTZWxlY3RvckFsbCgnLmdhbGxlcnlfX3ByZXZpZXctZGVzY3JpcHRpb24nKTtcblx0dGhpcy5wcmV2aWV3RGVzY3JpcHRpb25FbCA9IHByZXZpZXdEZXNjcmlwdGlvbnNbMF07XG5cdHRoaXMuZW1wdHlQcmV2aWV3RGVzY3JpcHRpb25FbCA9IHByZXZpZXdEZXNjcmlwdGlvbnNbMV07XG5cblx0dGhpcy5wcmV2aW91c0J0biA9IHRoaXMucHJldmlld0VsLnF1ZXJ5U2VsZWN0b3IoJy5nYWxsZXJ5X19wcmV2aWV3LWJ0bi0tcHJldmlvdXMnKTtcblx0dGhpcy5uZXh0QnRuID0gdGhpcy5wcmV2aWV3RWwucXVlcnlTZWxlY3RvcignLmdhbGxlcnlfX3ByZXZpZXctYnRuLS1uZXh0Jyk7XG5cblx0dGhpcy5vcGVuSXRlbSA9IHRoaXMub3Blbkl0ZW0uYmluZCh0aGlzKTtcblx0dGhpcy5jbG9zZUl0ZW0gPSB0aGlzLmNsb3NlSXRlbS5iaW5kKHRoaXMpO1xuXHR0aGlzLm5leHRJdGVtID0gdGhpcy5uZXh0SXRlbS5iaW5kKHRoaXMpO1xuXHR0aGlzLnByZXZpb3VzSXRlbSA9IHRoaXMucHJldmlvdXNJdGVtLmJpbmQodGhpcyk7XG59XG5cbmZ1bmN0aW9uIGluaXQoKXtcblx0aWYoIXRoaXMuZWwpe1xuXHRcdHJldHVybjtcblx0fVxuXG5cdGNvbnN0IGluaXRBZnRlckltYWdlc0xvYWQgPSBmdW5jdGlvbigpe1xuXHRcdHRoaXMuYnJpY2tzID0gQnJpY2tzKHtcblx0XHRcdGNvbnRhaW5lcjogdGhpcy5lbENsYXNzLFxuXHRcdFx0cGFja2VkOiAnZGF0YS1wYWNrZWQnLFxuXHRcdFx0c2l6ZXM6IHRoaXMub3B0aW9ucy5zaXplc1xuXHRcdH0pO1xuXG5cdFx0dGhpcy5icmlja3Ncblx0XHQucmVzaXplKHRydWUpXG5cdFx0LnBhY2soKTtcblxuXHRcdHRoaXMuZWwuY2xhc3NMaXN0LmFkZCgnZ2FsbGVyeS0tbG9hZGVkJyk7XG5cblx0XHRhZGRFdmVudExpc3RlbmVycy5jYWxsKHRoaXMpO1xuXHRcdHNldE9yaWdpbmFsLmNhbGwodGhpcyk7XG5cdFx0c2V0Q2xvbmUuY2FsbCh0aGlzKTtcblx0fTtcblxuXHRQcm9taXNlLmFsbChncmlkSW1hZ2VzTG9hZGVkLmNhbGwodGhpcykpXG5cdC50aGVuKGluaXRBZnRlckltYWdlc0xvYWQuYmluZCh0aGlzKSk7XG59XG5cbmZ1bmN0aW9uIGFkZEV2ZW50TGlzdGVuZXJzKCl7XG5cdGNvbnN0IHNlbGYgPSB0aGlzO1xuXG5cdHRoaXMuaXRlbXMuZm9yRWFjaChmdW5jdGlvbihpdGVtKXtcblx0XHRpZighaXRlbS5xdWVyeVNlbGVjdG9yKCcuZ2FsbGVyeV9faW1hZ2UnKSl7XG5cdFx0XHRyZXR1cm47XG5cdFx0fVxuXHRcdGl0ZW0uYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCBmdW5jdGlvbihldnQpe1xuXHRcdFx0ZXZ0LnByZXZlbnREZWZhdWx0KCk7XG5cdFx0XHRzZWxmLm9wZW5JdGVtKGl0ZW0pO1xuXHRcdH0pO1xuXHR9KTtcblxuXHR0aGlzLmNsb3NlQnRuLmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgdGhpcy5jbG9zZUl0ZW0pO1xuXHR0aGlzLnByZXZpb3VzQnRuLmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgdGhpcy5wcmV2aW91c0l0ZW0pO1xuXHR0aGlzLm5leHRCdG4uYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCB0aGlzLm5leHRJdGVtKTtcblx0d2luZG93LmFkZEV2ZW50TGlzdGVuZXIoJ3Jlc2l6ZScsIHJlc2l6ZUZyYW1lLmJpbmQodGhpcykpO1xuXHR3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcigna2V5ZG93bicsIGZ1bmN0aW9uKGV2dCl7XG5cdFx0aWYoZXZ0LmtleSA9PSBcIkVzY2FwZVwiKXtcblx0XHRcdHRoaXMuY2xvc2VJdGVtKCk7XG5cdFx0fVxuXHRcdGlmKGV2dC5rZXkgPT0gXCJBcnJvd1JpZ2h0XCIpe1xuXHRcdFx0dGhpcy5uZXh0SXRlbSgpO1xuXHRcdH1cblx0XHRpZihldnQua2V5ID09IFwiQXJyb3dMZWZ0XCIpe1xuXHRcdFx0dGhpcy5wcmV2aW91c0l0ZW0oKTtcblx0XHR9XG5cdH0uYmluZCh0aGlzKSk7XG59XG5cbmZ1bmN0aW9uIGdldFNpemVJbmRleCgpe1xuXHRjb25zdCBuZXdTaXplSW5kZXggPSB0aGlzLm9wdGlvbnMuaW1nUG9zaXRpb25zXG5cdFx0XHQubWFwKHNpemUgPT4gc2l6ZS5tcSAmJiB3aW5kb3cubWF0Y2hNZWRpYShgKG1pbi13aWR0aDogJHsgc2l6ZS5tcSB9KWApLm1hdGNoZXMpXG5cdFx0XHQuaW5kZXhPZih0cnVlKTtcblx0cmV0dXJuIH5uZXdTaXplSW5kZXggPyBuZXdTaXplSW5kZXggOiAwO1xufVxuXG5mdW5jdGlvbiByZXNpemVGcmFtZSgpIHtcblx0aWYoIXRoaXMudGlja2luZykge1xuXHRcdHJlcXVlc3RBbmltYXRpb25GcmFtZShyZXNpemVIYW5kbGVyLmJpbmQodGhpcykpO1xuXHRcdHRoaXMudGlja2luZyA9IHRydWU7XG5cdH1cbn1cblxuZnVuY3Rpb24gcmVzaXplSGFuZGxlcigpIHtcblx0bGV0IG5ld1NpemVJbmRleCA9IGdldFNpemVJbmRleC5jYWxsKHRoaXMpO1xuXHRpZih0aGlzLnNpemVJbmRleCAhPT0gbmV3U2l6ZUluZGV4KXtcblx0XHR0aGlzLnNpemVJbmRleCA9IG5ld1NpemVJbmRleDtcblx0XHRzZXRPcmlnaW5hbC5jYWxsKHRoaXMpO1xuXG5cdFx0aWYodGhpcy5pc0V4cGFuZGVkKXtcblx0XHRcdHRoaXMub3JpZ2luYWxJbWcuc3R5bGUub3BhY2l0eSA9IDE7XG5cdFx0fVxuXHR9XG5cdHRoaXMudGlja2luZyA9IGZhbHNlO1xufVxuXG5mdW5jdGlvbiBvcGVuSXRlbShpdGVtKXtcblx0aWYodGhpcy5pc0FuaW1hdGluZyB8fCB0aGlzLmlzRXhwYW5kZWQpe1xuXHRcdHJldHVybjtcblx0fVxuXHR0aGlzLmlzQW5pbWF0aW5nID0gdHJ1ZTtcblx0dGhpcy5pc0V4cGFuZGVkID0gdHJ1ZTtcblxuXHR1cGRhdGVTbGlkZUJ0blN0YXR1cy5jYWxsKHRoaXMsIGl0ZW0pO1xuXG5cdGNvbnN0IGl0ZW1JbWFnZSA9IGl0ZW0ucXVlcnlTZWxlY3RvcignaW1nJyksXG5cdFx0aXRlbUltYWdlQkNSID0gaXRlbUltYWdlLmdldEJvdW5kaW5nQ2xpZW50UmVjdCgpO1xuXG5cdHRoaXMuY3VycmVudCA9IHRoaXMuaXRlbXMuaW5kZXhPZihpdGVtKTtcblxuXHRzZXRPcmlnaW5hbC5jYWxsKHRoaXMsIGl0ZW0ucXVlcnlTZWxlY3RvcignYScpLmdldEF0dHJpYnV0ZSgnaHJlZicpKTtcblxuXHRzZXRDbG9uZS5jYWxsKHRoaXMsIGl0ZW1JbWFnZS5zcmMsIHtcblx0XHR3aWR0aDogaXRlbUltYWdlLm9mZnNldFdpZHRoLFxuXHRcdGhlaWdodDogaXRlbUltYWdlLm9mZnNldEhlaWdodCxcblx0XHRsZWZ0OiBpdGVtSW1hZ2VCQ1IubGVmdCxcblx0XHR0b3A6IGl0ZW1JbWFnZUJDUi50b3Bcblx0fSk7XG5cblx0aXRlbS5jbGFzc0xpc3QuYWRkKCdnYWxsZXJ5X19pdGVtLS1jdXJyZW50Jyk7XG5cblx0bGV0IHBhZ2VNYXJnaW4gPSAwO1xuXHRpZih0eXBlb2YgdGhpcy5vcHRpb25zLmltZ1Bvc2l0aW9uc1t0aGlzLnNpemVJbmRleF0ucGFnZW1hcmdpbiAhPT0gJ3VuZGVmaW5lZCcpe1xuXHRcdHBhZ2VNYXJnaW4gPSB0aGlzLm9wdGlvbnMuaW1nUG9zaXRpb25zW3RoaXMuc2l6ZUluZGV4XS5wYWdlbWFyZ2luO1xuXHR9XG5cblx0Y29uc3Qgd2luID0gZ2V0V2luU2l6ZSgpLFxuXHRcdG9yaWdpbmFsU2l6ZUFyciA9IGl0ZW0uZ2V0QXR0cmlidXRlKCdkYXRhLXNpemUnKS5zcGxpdCgneCcpLFxuXHRcdG9yaWdpbmFsU2l6ZSA9IHt3aWR0aDogb3JpZ2luYWxTaXplQXJyWzBdLCBoZWlnaHQ6IG9yaWdpbmFsU2l6ZUFyclsxXX0sXG5cdFx0ZHggPSAoKHRoaXMub3B0aW9ucy5pbWdQb3NpdGlvbnNbdGhpcy5zaXplSW5kZXhdLnBvcy54ID4gMCA/IDEtTWF0aC5hYnModGhpcy5vcHRpb25zLmltZ1Bvc2l0aW9uc1t0aGlzLnNpemVJbmRleF0ucG9zLngpIDogTWF0aC5hYnModGhpcy5vcHRpb25zLmltZ1Bvc2l0aW9uc1t0aGlzLnNpemVJbmRleF0ucG9zLngpKSAqIHdpbi53aWR0aCArIHRoaXMub3B0aW9ucy5pbWdQb3NpdGlvbnNbdGhpcy5zaXplSW5kZXhdLnBvcy54ICogd2luLndpZHRoLzIpIC0gaXRlbUltYWdlQkNSLmxlZnQgLSAwLjUgKiBpdGVtSW1hZ2Uub2Zmc2V0V2lkdGgsXG5cdFx0ZHkgPSAoKHRoaXMub3B0aW9ucy5pbWdQb3NpdGlvbnNbdGhpcy5zaXplSW5kZXhdLnBvcy55ID4gMCA/IDEtTWF0aC5hYnModGhpcy5vcHRpb25zLmltZ1Bvc2l0aW9uc1t0aGlzLnNpemVJbmRleF0ucG9zLnkpIDogTWF0aC5hYnModGhpcy5vcHRpb25zLmltZ1Bvc2l0aW9uc1t0aGlzLnNpemVJbmRleF0ucG9zLnkpKSAqIHdpbi5oZWlnaHQgKyB0aGlzLm9wdGlvbnMuaW1nUG9zaXRpb25zW3RoaXMuc2l6ZUluZGV4XS5wb3MueSAqIHdpbi5oZWlnaHQvMikgLSBpdGVtSW1hZ2VCQ1IudG9wIC0gMC41ICogaXRlbUltYWdlLm9mZnNldEhlaWdodCxcblx0XHR6ID0gTWF0aC5taW4oIE1hdGgubWluKHdpbi53aWR0aCpNYXRoLmFicyh0aGlzLm9wdGlvbnMuaW1nUG9zaXRpb25zW3RoaXMuc2l6ZUluZGV4XS5wb3MueCkgLSBwYWdlTWFyZ2luLCBvcmlnaW5hbFNpemUud2lkdGggLSBwYWdlTWFyZ2luKS9pdGVtSW1hZ2Uub2Zmc2V0V2lkdGgsIE1hdGgubWluKHdpbi5oZWlnaHQqTWF0aC5hYnModGhpcy5vcHRpb25zLmltZ1Bvc2l0aW9uc1t0aGlzLnNpemVJbmRleF0ucG9zLnkpIC0gcGFnZU1hcmdpbiwgb3JpZ2luYWxTaXplLmhlaWdodCAtIHBhZ2VNYXJnaW4pL2l0ZW1JbWFnZS5vZmZzZXRIZWlnaHQgKTtcblxuXHRjb25zdCB0cmFuc2Zvcm0gPSBgdHJhbnNsYXRlM2QoJHtkeH1weCwgJHtkeX1weCwgMCkgc2NhbGUzZCgke3p9LCAke3p9LCAxKWA7XG5cdHRoaXMuY2xvbmVJbWcuc3R5bGUuV2Via2l0VHJhbnNmb3JtID0gdHJhbnNmb3JtO1xuXHR0aGlzLmNsb25lSW1nLnN0eWxlLnRyYW5zZm9ybSA9IHRyYW5zZm9ybTtcblxuXHRjb25zdCBkZXNjcmlwdGlvbkVsID0gaXRlbS5xdWVyeVNlbGVjdG9yKCcuZ2FsbGVyeV9fZGVzY3JpcHRpb24nKTtcblx0aWYoZGVzY3JpcHRpb25FbCl7XG5cdFx0dGhpcy5wcmV2aWV3RGVzY3JpcHRpb25FbC5pbm5lckhUTUwgPSBkZXNjcmlwdGlvbkVsLmlubmVySFRNTDtcblx0fVxuXG5cdHZhciBzZWxmID0gdGhpcztcblx0c2V0VGltZW91dChmdW5jdGlvbigpIHtcblx0XHRzZWxmLnByZXZpZXdFbC5jbGFzc0xpc3QuYWRkKCdnYWxsZXJ5X19wcmV2aWV3LS1vcGVuJyk7XG5cdH0sIDApO1xuXG5cdFByb21pc2UuYWxsKFtvbkVuZFRyYW5zaXRpb24odGhpcy5jbG9uZUltZyksIG9yaWdpbmFsSW1hZ2VMb2FkUHJvbWlzZS5jYWxsKHRoaXMpXSlcblx0LnRoZW4oZnVuY3Rpb24oKXtcblx0XHRzZWxmLm9yaWdpbmFsSW1nLnN0eWxlLm9wYWNpdHkgPSAxO1xuXHR9KVxuXHQudGhlbigoKSA9PiBvbkVuZFRyYW5zaXRpb24oc2VsZi5vcmlnaW5hbEltZykpXG5cdC50aGVuKGZ1bmN0aW9uKCl7XG5cdFx0c2VsZi5jbG9uZUltZy5zdHlsZS5vcGFjaXR5ID0gMDtcblx0XHRzZWxmLmNsb25lSW1nLnN0eWxlLldlYmtpdFRyYW5zZm9ybSA9ICd0cmFuc2xhdGUzZCgwLDAsMCkgc2NhbGUzZCgxLDEsMSknO1xuXHRcdHNlbGYuY2xvbmVJbWcuc3R5bGUudHJhbnNmb3JtID0gJ3RyYW5zbGF0ZTNkKDAsMCwwKSBzY2FsZTNkKDEsMSwxKSc7XG5cblx0XHRzZWxmLmlzQW5pbWF0aW5nID0gZmFsc2U7XG5cdH0pXG5cdC5jYXRjaChmdW5jdGlvbihyZWFzb24pe1xuXHRcdGNvbnNvbGUuZXJyb3IocmVhc29uKTtcblx0fSk7XG59XG5cbmZ1bmN0aW9uIHNldE9yaWdpbmFsKHNyYyl7XG5cdGlmKCFzcmMpe1xuXHRcdHRoaXMub3JpZ2luYWxJbWcgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdpbWcnKTtcblx0XHR0aGlzLm9yaWdpbmFsSW1nLmNsYXNzTmFtZSA9ICdnYWxsZXJ5X19wcmV2aWV3LW9yaWdpbmFsJztcblx0XHR0aGlzLm9yaWdpbmFsSW1nLnN0eWxlLm9wYWNpdHkgPSAwO1xuXHRcdGxldCBwYWdlTWFyZ2luID0gMDtcblx0XHRpZih0eXBlb2YgdGhpcy5vcHRpb25zLmltZ1Bvc2l0aW9uc1t0aGlzLnNpemVJbmRleF0ucGFnZW1hcmdpbiAhPT0gJ3VuZGVmaW5lZCcpe1xuXHRcdFx0cGFnZU1hcmdpbiA9IHRoaXMub3B0aW9ucy5pbWdQb3NpdGlvbnNbdGhpcy5zaXplSW5kZXhdLnBhZ2VtYXJnaW47XG5cdFx0fVxuXHRcdHRoaXMub3JpZ2luYWxJbWcuc3R5bGUubWF4V2lkdGggPSAnY2FsYygnICsgcGFyc2VJbnQoTWF0aC5hYnModGhpcy5vcHRpb25zLmltZ1Bvc2l0aW9uc1t0aGlzLnNpemVJbmRleF0ucG9zLngpKjEwMCkgKyAndncgLSAnICsgcGFnZU1hcmdpbiArICdweCknO1xuXHRcdHRoaXMub3JpZ2luYWxJbWcuc3R5bGUubWF4SGVpZ2h0ID0gJ2NhbGMoJyArIHBhcnNlSW50KE1hdGguYWJzKHRoaXMub3B0aW9ucy5pbWdQb3NpdGlvbnNbdGhpcy5zaXplSW5kZXhdLnBvcy55KSoxMDApICsgJ3ZoIC0gJyArIHBhZ2VNYXJnaW4gKyAncHgpJztcblx0XHR0aGlzLm9yaWdpbmFsSW1nLnN0eWxlLldlYmtpdFRyYW5zZm9ybSA9ICd0cmFuc2xhdGUzZCgwLDAsMCknO1xuXHRcdHRoaXMub3JpZ2luYWxJbWcuc3R5bGUudHJhbnNmb3JtID0gJ3RyYW5zbGF0ZTNkKDAsMCwwKSc7XG5cdFx0c3JjID0gJyc7XG5cdFx0Y29uc3Qgb2xkRWwgPSB0aGlzLnByZXZpZXdFbC5xdWVyeVNlbGVjdG9yKCcuJyt0aGlzLm9yaWdpbmFsSW1nLmNsYXNzTmFtZSk7XG5cdFx0aWYob2xkRWwpe1xuXHRcdFx0c3JjID0gb2xkRWwuc3JjO1xuXHRcdFx0b2xkRWwucmVtb3ZlKCk7XG5cdFx0fVxuXHRcdHRoaXMucHJldmlld0VsLmFwcGVuZENoaWxkKHRoaXMub3JpZ2luYWxJbWcpO1xuXHR9XG5cblx0dGhpcy5vcmlnaW5hbEltZy5zZXRBdHRyaWJ1dGUoJ3NyYycsIHNyYyk7XG59XG5cbmZ1bmN0aW9uIG9yaWdpbmFsSW1hZ2VMb2FkUHJvbWlzZSgpe1xuXHRyZXR1cm4gaW1hZ2VMb2FkUHJvbWlzZSh0aGlzLm9yaWdpbmFsSW1nKTtcbn1cblxuZnVuY3Rpb24gaW1hZ2VMb2FkUHJvbWlzZShpbWcpe1xuXHRjb25zdCBpbWFnZUxvYWRQcm9taXNlID0gZnVuY3Rpb24ocmVzb2x2ZSwgcmVqZWN0KXtcblx0XHRpZighaW1nLmdldEF0dHJpYnV0ZSgnc3JjJykpe1xuXHRcdFx0cmVqZWN0KCdubyBzcmMgZm91bmQgZm9yIG9yaWdpbmFsIGltYWdlJyk7XG5cdFx0fVxuXG5cdFx0Y29uc3QgaW1hZ2VMb2FkID0gZnVuY3Rpb24oKXtcblx0XHRcdGlmKGltZy5jb21wbGV0ZSl7XG5cdFx0XHRcdHJlc29sdmUoKTtcblx0XHRcdH1lbHNle1xuXHRcdFx0XHRyZWplY3QoJ2ltYWdlIG5vdCBsb2FkZWQ6ICcraW1nLmdldEF0dHJpYnV0ZSgnc3JjJykpO1xuXHRcdFx0fVxuXHRcdH07XG5cblx0XHRpZihpbWcuY29tcGxldGUpe1xuXHRcdFx0cmVzb2x2ZSgpO1xuXHRcdH1lbHNle1xuXHRcdFx0aW1nLm9ubG9hZCA9IGltYWdlTG9hZC5iaW5kKHRoaXMpO1xuXHRcdH1cblx0fTtcblxuXHRyZXR1cm4gbmV3IFByb21pc2UoaW1hZ2VMb2FkUHJvbWlzZS5iaW5kKHRoaXMpKTtcbn1cblxuZnVuY3Rpb24gZ3JpZEltYWdlc0xvYWRlZCgpe1xuXHRyZXR1cm4gdGhpcy5pdGVtcy5tYXAoZnVuY3Rpb24oaXRlbSl7XG5cdFx0Y29uc3QgaW1nID0gaXRlbS5xdWVyeVNlbGVjdG9yKCdpbWcnKTtcblx0XHRpZighaW1nKXtcblx0XHRcdHJldHVybjtcblx0XHR9XG5cdFx0cmV0dXJuIGltYWdlTG9hZFByb21pc2UoaW1nKTtcblx0fSk7XG59XG5cbmZ1bmN0aW9uIHNldENsb25lKHNyYywgc2V0dGluZ3Mpe1xuXHRpZighc3JjKSB7XG5cdFx0dGhpcy5jbG9uZUltZyA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2ltZycpO1xuXHRcdHRoaXMuY2xvbmVJbWcuY2xhc3NOYW1lID0gJ2dhbGxlcnlfX3ByZXZpZXctY2xvbmUnO1xuXHRcdHNyYyA9ICcnO1xuXHRcdHRoaXMuY2xvbmVJbWcuc3R5bGUub3BhY2l0eSA9IDA7XG5cdFx0dGhpcy5wcmV2aWV3RWwuYXBwZW5kQ2hpbGQodGhpcy5jbG9uZUltZyk7XG5cdH1lbHNle1xuXHRcdHRoaXMuY2xvbmVJbWcuc3R5bGUub3BhY2l0eSA9IDE7XG5cdFx0dGhpcy5jbG9uZUltZy5zdHlsZS53aWR0aCA9IHNldHRpbmdzLndpZHRoICArICdweCc7XG5cdFx0dGhpcy5jbG9uZUltZy5zdHlsZS5oZWlnaHQgPSBzZXR0aW5ncy5oZWlnaHQgICsgJ3B4Jztcblx0XHR0aGlzLmNsb25lSW1nLnN0eWxlLnRvcCA9IHNldHRpbmdzLnRvcCAgKyAncHgnO1xuXHRcdHRoaXMuY2xvbmVJbWcuc3R5bGUubGVmdCA9IHNldHRpbmdzLmxlZnQgICsgJ3B4Jztcblx0fVxuXG5cdHRoaXMuY2xvbmVJbWcuc2V0QXR0cmlidXRlKCdzcmMnLCBzcmMpO1xufVxuXG5mdW5jdGlvbiBjbG9zZUl0ZW0oKXtcblx0aWYoIXRoaXMuaXNFeHBhbmRlZCB8fCB0aGlzLmlzQW5pbWF0aW5nKXtcblx0XHRyZXR1cm47XG5cdH1cblx0dGhpcy5pc0V4cGFuZGVkID0gZmFsc2U7XG5cdHRoaXMuaXNBbmltYXRpbmcgPSB0cnVlO1xuXG5cdGNvbnN0IGl0ZW0gPSB0aGlzLml0ZW1zW3RoaXMuY3VycmVudF0sXG5cdFx0aXRlbUltYWdlID0gaXRlbS5xdWVyeVNlbGVjdG9yKCdpbWcnKSxcblx0XHRpdGVtSW1hZ2VCQ1IgPSBpdGVtSW1hZ2UuZ2V0Qm91bmRpbmdDbGllbnRSZWN0KCksXG5cdFx0c2VsZiA9IHRoaXM7XG5cblx0dGhpcy5wcmV2aWV3RWwuY2xhc3NMaXN0LnJlbW92ZSgnZ2FsbGVyeV9fcHJldmlldy0tb3BlbicpO1xuXG5cdHRoaXMub3JpZ2luYWxJbWcuY2xhc3NMaXN0LmFkZCgnZ2FsbGVyeV9fcHJldmlldy1vcmlnaW5hbC0tYW5pbWF0ZScpO1xuXG5cdHZhciB3aW4gPSBnZXRXaW5TaXplKCksXG5cdFx0ZHggPSBpdGVtSW1hZ2VCQ1IubGVmdCArIGl0ZW1JbWFnZS5vZmZzZXRXaWR0aC8yIC0gKCh0aGlzLm9wdGlvbnMuaW1nUG9zaXRpb25zW3RoaXMuc2l6ZUluZGV4XS5wb3MueCA+IDAgPyAxLU1hdGguYWJzKHRoaXMub3B0aW9ucy5pbWdQb3NpdGlvbnNbdGhpcy5zaXplSW5kZXhdLnBvcy54KSA6IE1hdGguYWJzKHRoaXMub3B0aW9ucy5pbWdQb3NpdGlvbnNbdGhpcy5zaXplSW5kZXhdLnBvcy54KSkgKiB3aW4ud2lkdGggKyB0aGlzLm9wdGlvbnMuaW1nUG9zaXRpb25zW3RoaXMuc2l6ZUluZGV4XS5wb3MueCAqIHdpbi53aWR0aC8yKSxcblx0XHRkeSA9IGl0ZW1JbWFnZUJDUi50b3AgKyBpdGVtSW1hZ2Uub2Zmc2V0SGVpZ2h0LzIgLSAoKHRoaXMub3B0aW9ucy5pbWdQb3NpdGlvbnNbdGhpcy5zaXplSW5kZXhdLnBvcy55ID4gMCA/IDEtTWF0aC5hYnModGhpcy5vcHRpb25zLmltZ1Bvc2l0aW9uc1t0aGlzLnNpemVJbmRleF0ucG9zLnkpIDogTWF0aC5hYnModGhpcy5vcHRpb25zLmltZ1Bvc2l0aW9uc1t0aGlzLnNpemVJbmRleF0ucG9zLnkpKSAqIHdpbi5oZWlnaHQgKyB0aGlzLm9wdGlvbnMuaW1nUG9zaXRpb25zW3RoaXMuc2l6ZUluZGV4XS5wb3MueSAqIHdpbi5oZWlnaHQvMiksXG5cdFx0eiA9IGl0ZW1JbWFnZS5vZmZzZXRXaWR0aC90aGlzLm9yaWdpbmFsSW1nLm9mZnNldFdpZHRoO1xuXG5cdHRoaXMub3JpZ2luYWxJbWcuc3R5bGUuV2Via2l0VHJhbnNmb3JtID0gYHRyYW5zbGF0ZTNkKCR7ZHh9cHgsICR7ZHl9cHgsIDApIHNjYWxlM2QoJHt6fSwgJHt6fSwgMSlgO1xuXHR0aGlzLm9yaWdpbmFsSW1nLnN0eWxlLnRyYW5zZm9ybSA9IGB0cmFuc2xhdGUzZCgke2R4fXB4LCAke2R5fXB4LCAwKSBzY2FsZTNkKCR7en0sICR7en0sIDEpYDtcblxuXHRvbkVuZFRyYW5zaXRpb24odGhpcy5vcmlnaW5hbEltZylcblx0LnRoZW4oZnVuY3Rpb24oKXtcblx0XHRzZWxmLnByZXZpZXdEZXNjcmlwdGlvbkVsLmlubmVySFRNTCA9ICcnO1xuXHRcdGl0ZW0uY2xhc3NMaXN0LnJlbW92ZSgnZ2FsbGVyeV9faXRlbS0tY3VycmVudCcpO1xuXHRcdHNldFRpbWVvdXQoZnVuY3Rpb24oKSB7XG5cdFx0XHRzZWxmLm9yaWdpbmFsSW1nLnN0eWxlLm9wYWNpdHkgPSAwO1xuXHRcdH0sIDYwKTtcblx0fSlcblx0LnRoZW4oKCkgPT4gb25FbmRUcmFuc2l0aW9uKHNlbGYub3JpZ2luYWxJbWcpKVxuXHQudGhlbihmdW5jdGlvbigpe1xuXHRcdHNlbGYub3JpZ2luYWxJbWcuY2xhc3NMaXN0LnJlbW92ZSgnZ2FsbGVyeV9fcHJldmlldy1vcmlnaW5hbC0tYW5pbWF0ZScpO1xuXHRcdHNlbGYub3JpZ2luYWxJbWcuc3R5bGUuV2Via2l0VHJhbnNmb3JtID0gJ3RyYW5zbGF0ZTNkKDAsMCwwKSBzY2FsZTNkKDEsMSwxKSc7XG5cdFx0c2VsZi5vcmlnaW5hbEltZy5zdHlsZS50cmFuc2Zvcm0gPSAndHJhbnNsYXRlM2QoMCwwLDApIHNjYWxlM2QoMSwxLDEpJztcblxuXHRcdHNlbGYuaXNBbmltYXRpbmcgPSBmYWxzZTtcblx0fSlcblx0LmNhdGNoKGZ1bmN0aW9uKHJlYXNvbil7XG5cdFx0Y29uc29sZS5lcnJvcihyZWFzb24pO1xuXHR9KTtcbn1cblxuZnVuY3Rpb24gbmV4dEl0ZW0oKXtcblx0c2xpZGVJdGVtLmNhbGwodGhpcywgNTAsIGdldE5leHRJdGVtKTtcbn1cblxuZnVuY3Rpb24gcHJldmlvdXNJdGVtKCl7XG5cdHNsaWRlSXRlbS5jYWxsKHRoaXMsIC01MCwgZ2V0UHJldmlvdXNJdGVtKTtcbn1cblxuZnVuY3Rpb24gc2xpZGVJdGVtKGNoYW5nZURpc3RhbmNlLCBnZXRJdGVtQ2Ipe1xuXHQvLyBpZiBwcmV2aWV3IGlzIGNsb3NlZCBvciBhbmltYXRpb24gaXMgaGFwcGVuaW5nIGRvIG5vdGhpbmdcblx0aWYoIXRoaXMuaXNFeHBhbmRlZCB8fCB0aGlzLmlzQW5pbWF0aW5nKXtcblx0XHRyZXR1cm47XG5cdH1cblxuXHRjb25zdCBsYXN0SXRlbSA9IHRoaXMuaXRlbXNbdGhpcy5jdXJyZW50XTsgLy9nZXQgdGhlIGN1cnJlbnQgaXRlbVxuXHRjb25zdCBuZXh0SXRlbSA9IGdldEl0ZW1DYihsYXN0SXRlbSk7IC8vZ2V0IHRoZSBuZXh0IGl0ZW1cblx0aWYoIWxhc3RJdGVtIHx8ICFuZXh0SXRlbSB8fCAhbmV4dEl0ZW0uY2xhc3NMaXN0LmNvbnRhaW5zKCdnYWxsZXJ5X19pdGVtJykpeyAvL2lmIHRoZXJlIGlzIG5vIG5leHQgaXRlbSBkbyBub3RoaW5nXG5cdFx0cmV0dXJuO1xuXHR9XG5cblx0dGhpcy5pc0FuaW1hdGluZyA9IHRydWU7XG5cdHRoaXMuY3VycmVudCA9IHRoaXMuaXRlbXMuaW5kZXhPZihuZXh0SXRlbSk7IC8vdXBkYXRlIGN1cnJlbnQgaW5kZXhcblxuXHRsYXN0SXRlbS5jbGFzc0xpc3QucmVtb3ZlKCdnYWxsZXJ5X19pdGVtLS1jdXJyZW50Jyk7XG5cdG5leHRJdGVtLmNsYXNzTGlzdC5hZGQoJ2dhbGxlcnlfX2l0ZW0tLWN1cnJlbnQnKTtcblxuXHR1cGRhdGVTbGlkZUJ0blN0YXR1cy5jYWxsKHRoaXMsIG5leHRJdGVtKTtcblxuXHQvKlxuXHRzZXQgdGhlIGNsb25lZCB0aHVtYm5haWwgb2YgdGhlIG5leHQgaXRlbVxuXHRcdFx0KiBkb24ndCB0cmFuc2l0aW9uIHRoZSBjbG9uZWQgdGh1bWJuYWlsXG5cdFx0XHQqIHNldCBpdCB0byB0aGUgZmluYWwgcG9zaXRpb25cblx0Ki9cblx0Y29uc3QgaXRlbUltYWdlID0gbmV4dEl0ZW0ucXVlcnlTZWxlY3RvcignaW1nJyksXG5cdFx0aXRlbUltYWdlQkNSID0gaXRlbUltYWdlLmdldEJvdW5kaW5nQ2xpZW50UmVjdCgpO1xuXG5cblx0c2V0Q2xvbmUuY2FsbCh0aGlzLCBpdGVtSW1hZ2Uuc3JjLCB7XG5cdFx0d2lkdGg6IGl0ZW1JbWFnZS5vZmZzZXRXaWR0aCxcblx0XHRoZWlnaHQ6IGl0ZW1JbWFnZS5vZmZzZXRIZWlnaHQsXG5cdFx0bGVmdDogaXRlbUltYWdlQkNSLmxlZnQsXG5cdFx0dG9wOiBpdGVtSW1hZ2VCQ1IudG9wXG5cdH0pO1xuXG5cdGxldCBwYWdlTWFyZ2luID0gMDtcblx0aWYodHlwZW9mIHRoaXMub3B0aW9ucy5pbWdQb3NpdGlvbnNbdGhpcy5zaXplSW5kZXhdLnBhZ2VtYXJnaW4gIT09ICd1bmRlZmluZWQnKXtcblx0XHRwYWdlTWFyZ2luID0gdGhpcy5vcHRpb25zLmltZ1Bvc2l0aW9uc1t0aGlzLnNpemVJbmRleF0ucGFnZW1hcmdpbjtcblx0fVxuXG5cdGlmKCFjaGFuZ2VEaXN0YW5jZSl7XG5cdFx0Y2hhbmdlRGlzdGFuY2UgPSA1MDtcblx0fVxuXG5cdGxldCB3aW4gPSBnZXRXaW5TaXplKCksXG5cdFx0b3JpZ2luYWxTaXplQXJyID0gbmV4dEl0ZW0uZ2V0QXR0cmlidXRlKCdkYXRhLXNpemUnKS5zcGxpdCgneCcpLFxuXHRcdG9yaWdpbmFsU2l6ZSA9IHt3aWR0aDogb3JpZ2luYWxTaXplQXJyWzBdLCBoZWlnaHQ6IG9yaWdpbmFsU2l6ZUFyclsxXX0sXG5cdFx0ZHggPSAoKHRoaXMub3B0aW9ucy5pbWdQb3NpdGlvbnNbdGhpcy5zaXplSW5kZXhdLnBvcy54ID4gMCA/IDEtTWF0aC5hYnModGhpcy5vcHRpb25zLmltZ1Bvc2l0aW9uc1t0aGlzLnNpemVJbmRleF0ucG9zLngpIDogTWF0aC5hYnModGhpcy5vcHRpb25zLmltZ1Bvc2l0aW9uc1t0aGlzLnNpemVJbmRleF0ucG9zLngpKSAqIHdpbi53aWR0aCArIHRoaXMub3B0aW9ucy5pbWdQb3NpdGlvbnNbdGhpcy5zaXplSW5kZXhdLnBvcy54ICogd2luLndpZHRoLzIpIC0gaXRlbUltYWdlQkNSLmxlZnQgLSAwLjUgKiBpdGVtSW1hZ2Uub2Zmc2V0V2lkdGgsXG5cdFx0ZHkgPSAoKHRoaXMub3B0aW9ucy5pbWdQb3NpdGlvbnNbdGhpcy5zaXplSW5kZXhdLnBvcy55ID4gMCA/IDEtTWF0aC5hYnModGhpcy5vcHRpb25zLmltZ1Bvc2l0aW9uc1t0aGlzLnNpemVJbmRleF0ucG9zLnkpIDogTWF0aC5hYnModGhpcy5vcHRpb25zLmltZ1Bvc2l0aW9uc1t0aGlzLnNpemVJbmRleF0ucG9zLnkpKSAqIHdpbi5oZWlnaHQgKyB0aGlzLm9wdGlvbnMuaW1nUG9zaXRpb25zW3RoaXMuc2l6ZUluZGV4XS5wb3MueSAqIHdpbi5oZWlnaHQvMikgLSBpdGVtSW1hZ2VCQ1IudG9wIC0gMC41ICogaXRlbUltYWdlLm9mZnNldEhlaWdodCxcblx0XHR6ID0gTWF0aC5taW4oIE1hdGgubWluKHdpbi53aWR0aCpNYXRoLmFicyh0aGlzLm9wdGlvbnMuaW1nUG9zaXRpb25zW3RoaXMuc2l6ZUluZGV4XS5wb3MueCkgLSBwYWdlTWFyZ2luLCBvcmlnaW5hbFNpemUud2lkdGggLSBwYWdlTWFyZ2luKS9pdGVtSW1hZ2Uub2Zmc2V0V2lkdGgsIE1hdGgubWluKHdpbi5oZWlnaHQqTWF0aC5hYnModGhpcy5vcHRpb25zLmltZ1Bvc2l0aW9uc1t0aGlzLnNpemVJbmRleF0ucG9zLnkpIC0gcGFnZU1hcmdpbiwgb3JpZ2luYWxTaXplLmhlaWdodCAtIHBhZ2VNYXJnaW4pL2l0ZW1JbWFnZS5vZmZzZXRIZWlnaHQgKSxcblx0XHRjaGFuZ2VEaXN0YW5jZUR4ID0gZHggKyBjaGFuZ2VEaXN0YW5jZTtcblxuXHRjb25zdCBjbG9uZVRyYW5zZm9ybSA9IGB0cmFuc2xhdGUzZCgke2NoYW5nZURpc3RhbmNlRHh9cHgsICR7ZHl9cHgsIDApIHNjYWxlM2QoJHt6fSwgJHt6fSwgMSlgO1xuXHR0aGlzLmNsb25lSW1nLnN0eWxlLnRyYW5zaXRpb24gPSAnbm9uZSc7XG5cdHRoaXMuY2xvbmVJbWcuc3R5bGUuV2Via2l0VHJhbnNmb3JtID0gY2xvbmVUcmFuc2Zvcm07XG5cdHRoaXMuY2xvbmVJbWcuc3R5bGUudHJhbnNmb3JtID0gY2xvbmVUcmFuc2Zvcm07XG5cblx0Y29uc3QgZGVzY3JpcHRpb25FbCA9IG5leHRJdGVtLnF1ZXJ5U2VsZWN0b3IoJy5nYWxsZXJ5X19kZXNjcmlwdGlvbicpO1xuXHRpZihkZXNjcmlwdGlvbkVsKXtcblx0XHR0aGlzLmVtcHR5UHJldmlld0Rlc2NyaXB0aW9uRWwuY2xhc3NMaXN0LmFkZCgnZ2FsbGVyeV9fcHJldmlldy1kZXNjcmlwdGlvbi0tYW5pbWF0ZScpO1xuXHRcdHRoaXMucHJldmlld0Rlc2NyaXB0aW9uRWwuY2xhc3NMaXN0LmFkZCgnZ2FsbGVyeV9fcHJldmlldy1kZXNjcmlwdGlvbi0tYW5pbWF0ZScpO1xuXG5cdFx0dGhpcy5lbXB0eVByZXZpZXdEZXNjcmlwdGlvbkVsLmlubmVySFRNTCA9IGRlc2NyaXB0aW9uRWwuaW5uZXJIVE1MO1xuXG5cdFx0dGhpcy5lbXB0eVByZXZpZXdEZXNjcmlwdGlvbkVsLnN0eWxlLnRyYW5zaXRpb24gPSAnbm9uZSc7XG5cdFx0dGhpcy5lbXB0eVByZXZpZXdEZXNjcmlwdGlvbkVsLnN0eWxlLm9wYWNpdHkgPSAwO1xuXHRcdGNvbnN0IGVtcHR5RGVzY3JpcHRpb25UcmFuc2Zvcm0gPSBgdHJhbnNsYXRlM2QoMCwgJHtjaGFuZ2VEaXN0YW5jZX1weCwgMClgO1xuXHRcdHRoaXMuZW1wdHlQcmV2aWV3RGVzY3JpcHRpb25FbC5zdHlsZS5XZWJraXRUcmFuc2Zvcm0gPSBlbXB0eURlc2NyaXB0aW9uVHJhbnNmb3JtO1xuXHRcdHRoaXMuZW1wdHlQcmV2aWV3RGVzY3JpcHRpb25FbC5zdHlsZS50cmFuc2Zvcm0gPSBlbXB0eURlc2NyaXB0aW9uVHJhbnNmb3JtO1xuXHR9XG5cblx0Y29uc3Qgc2VsZiA9IHRoaXM7XG5cblx0cmVxdWVzdEFuaW1hdGlvbkZyYW1lUHJvbWlzZSgpXG5cdC50aGVuKGZ1bmN0aW9uKCl7XG5cdFx0Ly9vbGQgb3JpZ2luYWwgaW1hZ2UgZmFkZSBvdXRcblx0XHRjb25zdCBvcmlnaW5hbEltZ1RyYW5zZm9ybSA9IGB0cmFuc2xhdGUzZCgtJHtjaGFuZ2VEaXN0YW5jZX1weCwgMCwgMClgO1xuXHRcdHNlbGYub3JpZ2luYWxJbWcuY2xhc3NMaXN0LmFkZCgnZ2FsbGVyeV9fcHJldmlldy1vcmlnaW5hbC0tYW5pbWF0ZScpO1xuXHRcdHNlbGYub3JpZ2luYWxJbWcuc3R5bGUub3BhY2l0eSA9IDA7XG5cdFx0c2VsZi5vcmlnaW5hbEltZy5zdHlsZS5XZWJraXRUcmFuc2Zvcm0gPSBvcmlnaW5hbEltZ1RyYW5zZm9ybTtcblx0XHRzZWxmLm9yaWdpbmFsSW1nLnN0eWxlLnRyYW5zZm9ybSA9IG9yaWdpbmFsSW1nVHJhbnNmb3JtO1xuXG5cdFx0Ly9mYWRlIGluIGNsb25lZCBpbWFnZVxuXHRcdHNlbGYuY2xvbmVJbWcuc3R5bGUudHJhbnNpdGlvbiA9ICcnO1xuXHRcdGNvbnN0IGNsb25lVHJhbnNmb3JtID0gYHRyYW5zbGF0ZTNkKCR7ZHh9cHgsICR7ZHl9cHgsIDApIHNjYWxlM2QoJHt6fSwgJHt6fSwgMSlgO1xuXHRcdHNlbGYuY2xvbmVJbWcuc3R5bGUuV2Via2l0VHJhbnNmb3JtID0gY2xvbmVUcmFuc2Zvcm07XG5cdFx0c2VsZi5jbG9uZUltZy5zdHlsZS50cmFuc2Zvcm0gPSBjbG9uZVRyYW5zZm9ybTtcblx0XHRzZWxmLmNsb25lSW1nLnN0eWxlLm9wYWNpdHkgPSAxO1xuXG5cdFx0Y29uc3QgZGVzY3JpcHRpb25UcmFuc2Zvcm0gPSBgdHJhbnNsYXRlM2QoMCwgLSR7Y2hhbmdlRGlzdGFuY2V9cHgsIDApYDtcblx0XHRzZWxmLnByZXZpZXdEZXNjcmlwdGlvbkVsLnN0eWxlLm9wYWNpdHkgPSAwO1xuXHRcdHNlbGYucHJldmlld0Rlc2NyaXB0aW9uRWwuc3R5bGUuV2Via2l0VHJhbnNmb3JtID0gZGVzY3JpcHRpb25UcmFuc2Zvcm07XG5cdFx0c2VsZi5wcmV2aWV3RGVzY3JpcHRpb25FbC5zdHlsZS50cmFuc2Zvcm0gPSBkZXNjcmlwdGlvblRyYW5zZm9ybTtcblxuXHRcdHNlbGYuZW1wdHlQcmV2aWV3RGVzY3JpcHRpb25FbC5zdHlsZS50cmFuc2l0aW9uID0gJyc7XG5cdFx0c2VsZi5lbXB0eVByZXZpZXdEZXNjcmlwdGlvbkVsLnN0eWxlLm9wYWNpdHkgPSAxO1xuXHRcdGNvbnN0IGVtcHR5RGVzY3JpcHRpb25UcmFuc2Zvcm0gPSBgdHJhbnNsYXRlM2QoMCwgMCwgMClgO1xuXHRcdHNlbGYuZW1wdHlQcmV2aWV3RGVzY3JpcHRpb25FbC5zdHlsZS5XZWJraXRUcmFuc2Zvcm0gPSBlbXB0eURlc2NyaXB0aW9uVHJhbnNmb3JtO1xuXHRcdHNlbGYuZW1wdHlQcmV2aWV3RGVzY3JpcHRpb25FbC5zdHlsZS50cmFuc2Zvcm0gPSBlbXB0eURlc2NyaXB0aW9uVHJhbnNmb3JtO1xuXG5cdFx0bGV0IHRtcERlc2NyaXB0aW9uID0gc2VsZi5wcmV2aWV3RGVzY3JpcHRpb25FbDtcblx0XHRzZWxmLnByZXZpZXdEZXNjcmlwdGlvbkVsID0gc2VsZi5lbXB0eVByZXZpZXdEZXNjcmlwdGlvbkVsO1xuXHRcdHNlbGYuZW1wdHlQcmV2aWV3RGVzY3JpcHRpb25FbCA9IHRtcERlc2NyaXB0aW9uO1xuXHR9KVxuXHQudGhlbigoKSA9PiBvbkVuZFRyYW5zaXRpb24oc2VsZi5vcmlnaW5hbEltZykpIC8vd2hlbiBvbGQgbWFpbiBpbWFnZSBoYXMgZmFkZSBvdXRcblx0LnRoZW4oKCkgPT4geyAvLyByZXN0IHBvc2l0aW9uIG9mIG9yaWdpbmFsIGltYWdlIHdpdGggbm8gdHJhbnNpdGlvblxuXHRcdHNlbGYub3JpZ2luYWxJbWcuY2xhc3NMaXN0LnJlbW92ZSgnZ2FsbGVyeV9fcHJldmlldy1vcmlnaW5hbC0tYW5pbWF0ZScpO1xuXHRcdGNvbnN0IG9yaWdpbmFsSW1nVHJhbnNmb3JtID0gYHRyYW5zbGF0ZTNkKDAsIDAsIDApYDtcblx0XHRzZWxmLm9yaWdpbmFsSW1nLnN0eWxlLldlYmtpdFRyYW5zZm9ybSA9IG9yaWdpbmFsSW1nVHJhbnNmb3JtO1xuXHRcdHNlbGYub3JpZ2luYWxJbWcuc3R5bGUudHJhbnNmb3JtID0gb3JpZ2luYWxJbWdUcmFuc2Zvcm07XG5cdH0pXG5cdC50aGVuKCgpID0+IHNldE9yaWdpbmFsLmNhbGwoc2VsZiwgbmV4dEl0ZW0ucXVlcnlTZWxlY3RvcignYScpLmdldEF0dHJpYnV0ZSgnaHJlZicpKSkgLy9zZXQgbmV3IG1haW4gaW1hZ2Vcblx0LnRoZW4oKCkgPT4gaW1hZ2VMb2FkUHJvbWlzZS5jYWxsKHNlbGYsIHNlbGYub3JpZ2luYWxJbWcpKSAvL3doZW4gdGhpcyBoYXMgbG9hZGVkXG5cdC50aGVuKCgpID0+IHtcblx0XHRzZWxmLm9yaWdpbmFsSW1nLnN0eWxlLnRyYW5zaXRpb24gPSAnJztcblx0XHRzZWxmLm9yaWdpbmFsSW1nLnN0eWxlLm9wYWNpdHkgPSAxO1xuXHR9KVxuXHQudGhlbigoKSA9PiBvbkVuZFRyYW5zaXRpb24oc2VsZi5vcmlnaW5hbEltZykpXG5cdC50aGVuKCgpID0+IHtcblx0XHRzZWxmLmNsb25lSW1nLnN0eWxlLm9wYWNpdHkgPSAwO1xuXHRcdHNlbGYuY2xvbmVJbWcuc3R5bGUuV2Via2l0VHJhbnNmb3JtID0gJ3RyYW5zbGF0ZTNkKDAsMCwwKSBzY2FsZTNkKDEsMSwxKSc7XG5cdFx0c2VsZi5jbG9uZUltZy5zdHlsZS50cmFuc2Zvcm0gPSAndHJhbnNsYXRlM2QoMCwwLDApIHNjYWxlM2QoMSwxLDEpJztcblx0XHR0aGlzLmNsb25lSW1nLnN0eWxlLnRyYW5zaXRpb24gPSAnJztcblxuXHRcdHNlbGYuZW1wdHlQcmV2aWV3RGVzY3JpcHRpb25FbC5jbGFzc0xpc3QucmVtb3ZlKCdnYWxsZXJ5X19wcmV2aWV3LWRlc2NyaXB0aW9uLS1hbmltYXRlJyk7XG5cdFx0c2VsZi5wcmV2aWV3RGVzY3JpcHRpb25FbC5jbGFzc0xpc3QucmVtb3ZlKCdnYWxsZXJ5X19wcmV2aWV3LWRlc2NyaXB0aW9uLS1hbmltYXRlJyk7XG5cblx0XHRzZWxmLmVtcHR5UHJldmlld0Rlc2NyaXB0aW9uRWwuaW5uZXJIVE1MID0gJyc7XG5cdFx0c2VsZi5lbXB0eVByZXZpZXdEZXNjcmlwdGlvbkVsLnN0eWxlLm9wYWNpdHkgPSAnJztcblx0XHRzZWxmLmVtcHR5UHJldmlld0Rlc2NyaXB0aW9uRWwuc3R5bGUuV2Via2l0VHJhbnNmb3JtID0gJyc7XG5cdFx0c2VsZi5lbXB0eVByZXZpZXdEZXNjcmlwdGlvbkVsLnN0eWxlLnRyYW5zZm9ybSA9ICcnO1xuXG5cdFx0c2VsZi5wcmV2aWV3RGVzY3JpcHRpb25FbC5zdHlsZS5vcGFjaXR5ID0gJyc7XG5cdFx0c2VsZi5wcmV2aWV3RGVzY3JpcHRpb25FbC5zdHlsZS5XZWJraXRUcmFuc2Zvcm0gPSAnJztcblx0XHRzZWxmLnByZXZpZXdEZXNjcmlwdGlvbkVsLnN0eWxlLnRyYW5zZm9ybSA9ICcnO1xuXG5cdFx0c2VsZi5pc0FuaW1hdGluZyA9IGZhbHNlO1xuXHR9KVxuXHQuY2F0Y2goZnVuY3Rpb24ocmVhc29uKXtcblx0XHRjb25zb2xlLmVycm9yKHJlYXNvbik7XG5cdH0pO1xufVxuXG5mdW5jdGlvbiBnZXROZXh0SXRlbShjdXJyZW50SXRlbSl7XG5cdGxldCBpdGVtID0gY3VycmVudEl0ZW07XG5cdHdoaWxlKGl0ZW0gPSBpdGVtLm5leHRFbGVtZW50U2libGluZyl7XG5cdFx0aWYoaXRlbS5nZXRBdHRyaWJ1dGUoJ2RhdGEtc2l6ZScpKXtcblx0XHRcdHJldHVybiBpdGVtO1xuXHRcdH1cblx0fVxuXHRyZXR1cm4gbnVsbDtcbn1cblxuZnVuY3Rpb24gZ2V0UHJldmlvdXNJdGVtKGN1cnJlbnRJdGVtKXtcblx0bGV0IGl0ZW0gPSBjdXJyZW50SXRlbTtcblx0d2hpbGUoaXRlbSA9IGl0ZW0ucHJldmlvdXNFbGVtZW50U2libGluZyl7XG5cdFx0aWYoaXRlbS5nZXRBdHRyaWJ1dGUoJ2RhdGEtc2l6ZScpKXtcblx0XHRcdHJldHVybiBpdGVtO1xuXHRcdH1cblx0fVxuXHRyZXR1cm4gbnVsbDtcbn1cblxuZnVuY3Rpb24gdXBkYXRlU2xpZGVCdG5TdGF0dXMoY3VycmVudEl0ZW0pe1xuXHRpZighZ2V0TmV4dEl0ZW0oY3VycmVudEl0ZW0pKXtcblx0XHR0aGlzLm5leHRCdG4uY2xhc3NMaXN0LmFkZCgnZ2FsbGVyeV9fcHJldmlldy1idG4tLWRpc2FibGVkJyk7XG5cdH1lbHNle1xuXHRcdHRoaXMubmV4dEJ0bi5jbGFzc0xpc3QucmVtb3ZlKCdnYWxsZXJ5X19wcmV2aWV3LWJ0bi0tZGlzYWJsZWQnKTtcblx0fVxuXG5cdGlmKCFnZXRQcmV2aW91c0l0ZW0oY3VycmVudEl0ZW0pKXtcblx0XHR0aGlzLnByZXZpb3VzQnRuLmNsYXNzTGlzdC5hZGQoJ2dhbGxlcnlfX3ByZXZpZXctYnRuLS1kaXNhYmxlZCcpO1xuXHR9ZWxzZXtcblx0XHR0aGlzLnByZXZpb3VzQnRuLmNsYXNzTGlzdC5yZW1vdmUoJ2dhbGxlcnlfX3ByZXZpZXctYnRuLS1kaXNhYmxlZCcpO1xuXHR9XG59XG5cbmZ1bmN0aW9uIGdldFdpblNpemUoKXtcblx0cmV0dXJuIHtcblx0XHR3aWR0aDogZG9jdW1lbnQuZG9jdW1lbnRFbGVtZW50LmNsaWVudFdpZHRoLFxuXHRcdGhlaWdodDogd2luZG93LmlubmVySGVpZ2h0XG5cdH07XG59XG5cbmV4cG9ydCBkZWZhdWx0IGNyZWF0ZUdhbGxlcnlHcmlkO1xuIiwiLy9pbXBvcnQgcG9seSBmcm9tICcuL3V0aWwvcG9seWZpbGxzJztcblxuLy9pbXBvcnQgc3ZnNGV2ZXJ5Ym9keSBmcm9tICcuLi92ZW5kb3Ivc3ZnNGV2ZXJ5Ym9keSc7XG5pbXBvcnQgZ2FsbGVyeUdyaWQgZnJvbSAnLi91aS9nYWxsZXJ5LWdyaWQnO1xuXG5sZXQgYmFzZVBhdGg7XG5cbmZ1bmN0aW9uIGluaXQoKXtcblx0Ly9wb2x5KCk7XG5cblx0Ly9zdmc0ZXZlcnlib2R5KCk7XG5cdHNldHVwR2FsbGVyeUdyaWQoKTtcbn1cblxuZnVuY3Rpb24gc2V0dXBHYWxsZXJ5R3JpZCgpe1xuXHRnYWxsZXJ5R3JpZCgnLmpzLWdhbGxlcnknLCB7XG5cdFx0aW1nUG9zaXRpb25zOiBbXG5cdFx0XHR7IHBvczogeyB4IDogMSwgeSA6IC0wLjUgfSwgcGFnZW1hcmdpbjogMzAgfSxcblx0XHRcdHsgbXE6ICc0OGVtJywgcG9zOiB7IHggOiAtMC41LCB5IDogMSB9LCBwYWdlbWFyZ2luOiAzMCB9XG5cdFx0XSxcblx0XHRzaXplczogW1xuXHRcdFx0eyBjb2x1bW5zOiAyLCBndXR0ZXI6IDE1fSxcblx0XHRcdHsgbXE6ICc1NjBweCcsIGNvbHVtbnM6IDIsIGd1dHRlcjogMTV9LFxuXHRcdFx0eyBtcTogJzc2OHB4JywgY29sdW1uczogMywgZ3V0dGVyOiAxNX0sXG5cdFx0XHR7IG1xOiAnOTIwcHgnLCBjb2x1bW5zOiA0LCBndXR0ZXI6IDE1fSxcblx0XHRcdHsgbXE6ICcxMTgwcHgnLCBjb2x1bW5zOiA1LCBndXR0ZXI6IDE1fVxuXHRcdF1cblx0fSk7XG59XG5cbmlmKGRvY3VtZW50LnJlYWR5U3RhdGUgIT0gJ2xvYWRpbmcnKXtcblx0aW5pdCgpO1xufWVsc2V7XG5cdGRvY3VtZW50LmFkZEV2ZW50TGlzdGVuZXIoJ0RPTUNvbnRlbnRMb2FkZWQnLCBpbml0KTtcbn1cbiJdLCJuYW1lcyI6WyJpbml0IiwiY3JlYXRlR2FsbGVyeUdyaWQiLCJnYWxsZXJ5R3JpZCJdLCJtYXBwaW5ncyI6Ijs7O0FBdUJBLE1BQU0saUJBQWlCLEdBQUcsQ0FBQyxxQkFBcUIsRUFBRSxlQUFlLEVBQUUsaUJBQWlCLEVBQUUsZ0JBQWdCLENBQUMsQ0FBQzs7QUFFeEcsU0FBUyxlQUFlLENBQUMsRUFBRSxDQUFDO0NBQzNCLE9BQU8sSUFBSSxPQUFPLENBQUMsU0FBUyxPQUFPLEVBQUUsTUFBTSxDQUFDO0VBQzNDLE1BQU0sZUFBZSxHQUFHLFNBQVMsRUFBRSxDQUFDO0dBQ25DLEtBQUssSUFBSSxDQUFD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QUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsR0FBRyxDQUFDLEtBQUssR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDLFlBQVksQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsR0FBRyxHQUFHLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxHQUFHLFlBQVksQ0FBQyxJQUFJLEdBQUcsR0FBRyxHQUFHLFNBQVMsQ0FBQyxXQUFXO0VBQ3BULEVBQUUsR0FBRyxDQUFDLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxZQUFZLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsWUFBWSxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLFlBQVksQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsR0FBRyxDQUFDLE1BQU0sR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDLFlBQVksQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsR0FBRyxHQUFHLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxHQUFHLFlBQVksQ0FBQyxHQUFHLEdBQUcsR0FBRyxHQUFHLFNBQVMsQ0FBQyxZQUFZO0VBQ3RULENBQUMsR0FBRyxJQUFJLENBQUMsR0FBRyxFQUFFLElBQUksQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsWUFBWSxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEdBQUcsVUFBVSxFQUFFLFlBQVksQ0FBQyxLQUFLLEdBQUcsVUFBVSxDQUFDLENBQUMsU0FBUyxDQUFDLFdBQVcsRUFBRSxJQUFJLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLFlBQVksQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxHQUFHLFVBQVUsRUFBRSxZQUFZLENBQUMsTUFBTSxHQUFHLFVBQVUsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxZQUFZLEVBQUUsQ0FBQzs7Q0FFelQsTUFBTSxTQUFTLEdBQUcsQ0FBQyxZQUFZLEVBQUUsRUFBRSxDQUFDLElBQUksRUFBRSxFQUFFLENBQUMsZUFBZSxFQUFFLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDO0NBQzVFLElBQUksQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDLGVBQWUsR0FBRyxTQUFTLENBQUM7Q0FDaEQsSUFBSSxDQUFDLFFBQVEsQ0FBQyxLQUFLLENBQUMsU0FBUyxHQUFHLFNBQVMsQ0FBQzs7Q0FFMUMsTUFBTSxhQUFhLEdBQUcsSUFBSSxDQUFDLGFBQWEsQ0FBQyx1QkFBdUIsQ0FBQyxDQUFDO0NBQ2xFLEdBQUcsYUFBYSxDQUFDO0VBQ2hCLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxTQUFTLEdBQUcsYUFBYSxDQUFDLFNBQVMsQ0FBQztFQUM5RDs7Q0FFRCxJQUFJLElBQUksR0FBRyxJQUFJLENBQUM7Q0FDaEIsVUFBVSxDQUFDLFdBQVc7RUFDckIsSUFBSSxDQUFDLFNBQVMsQ0FBQyxTQUFTLENBQUMsR0FBRyxDQUFDLHdCQUF3QixDQUFDLENBQUM7RUFDdkQsRUFBRSxDQUFDLENBQUMsQ0FBQzs7Q0FFTixPQUFPLENBQUMsR0FBRyxDQUFDLENBQUMsZUFBZSxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsRUFBRSx3QkFBd0IsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQztFQUNqRixJQUFJLENBQUMsVUFBVTtFQUNmLElBQUksQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLE9BQU8sR0FBRyxDQUFDLENBQUM7RUFDbkMsQ0FBQztFQUNELElBQUksQ0FBQyxNQUFNLGVBQWUsQ0FBQyxJQUFJLENBQUMsV0FBVyxDQUFDLENBQUM7RUFDN0MsSUFBSSxDQUFDLFVBQVU7RUFDZixJQUFJLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQyxPQUFPLEdBQUcsQ0FBQyxDQUFDO0VBQ2hDLElBQUksQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDLGVBQWUsR0FBRyxtQ0FBbUMsQ0FBQztFQUMxRSxJQUFJLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQyxTQUFTLEdBQUcsbUNBQW1DLENBQUM7O0VBRXBFLElBQUksQ0FBQyxXQUFXLEdBQUcsS0FBSyxDQUFDO0VBQ3pCLENBQUM7RUFDRCxLQUFLLENBQUMsU0FBUyxNQUFNLENBQUM7RUFDdEIsT0FBTyxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUMsQ0FBQztFQUN0QixDQUFDLENBQUM7Q0FDSDs7QUFFRCxTQUFTLFdBQVcsQ0FBQyxHQUFHLENBQUM7Q0FDeEIsR0FBRyxDQUFDLEdBQUcsQ0FBQztFQUNQLElBQUksQ0FBQyxXQUFXLEdBQUcsUUFBUSxDQUFDLGFBQWEsQ0FBQyxLQUFLLENBQUMsQ0FBQztFQUNqRCxJQUFJLENBQUMsV0FBVyxDQUFDLFNBQVMsR0FBRywyQkFBMkIsQ0FBQztFQUN6RCxJQUFJLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxPQUFPLEdBQUcsQ0FBQyxDQUFDO0VBQ25DLElBQUksVUFBVSxHQUFHLENBQUMsQ0FBQztFQUNuQixHQUFHLE9BQU8sSUFBSSxDQUFDLE9BQU8sQ0FBQyxZQUFZLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxDQUFDLFVBQVUsS0FBSyxXQUFXLENBQUM7R0FDOUUsVUFBVSxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUMsWUFBWSxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsQ0FBQyxVQUFVLENBQUM7R0FDbEU7RUFDRCxJQUFJLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxRQUFRLEdBQUcsT0FBTyxHQUFHLFFBQVEsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsWUFBWSxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLEdBQUcsT0FBTyxHQUFHLFVBQVUsR0FBRyxLQUFLLENBQUM7RUFDbkosSUFBSSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsU0FBUyxHQUFHLE9BQU8sR0FBRyxRQUFRLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLFlBQVksQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxHQUFHLE9BQU8sR0FBRyxVQUFVLEdBQUcsS0FBSyxDQUFDO0VBQ3BKLElBQUksQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLGVBQWUsR0FBRyxvQkFBb0IsQ0FBQztFQUM5RCxJQUFJLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxTQUFTLEdBQUcsb0JBQW9CLENBQUM7RUFDeEQsR0FBRyxHQUFHLEVBQUUsQ0FBQztFQUNULE1BQU0sS0FBSyxHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsYUFBYSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsV0FBVyxDQUFDLFNBQVMsQ0FBQyxDQUFDO0VBQzNFLEdBQUcsS0FBSyxDQUFDO0dBQ1IsR0FBRyxHQUFHLEtBQUssQ0FBQyxHQUFHLENBQUM7R0FDaEIsS0FBSyxDQUFDLE1BQU0sRUFBRSxDQUFDO0dBQ2Y7RUFDRCxJQUFJLENBQUMsU0FBUyxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsV0FBVyxDQUFDLENBQUM7RUFDN0M7O0NBRUQsSUFBSSxDQUFDLFdBQVcsQ0FBQyxZQUFZLENBQUMsS0FBSyxFQUFFLEdBQUcsQ0FBQyxDQUFDO0NBQzFDOztBQUVELFNBQVMsd0JBQXdCLEVBQUU7Q0FDbEMsT0FBTyxnQkFBZ0IsQ0FBQyxJQUFJLENBQUMsV0FBVyxDQUFDLENBQUM7Q0FDMUM7O0FBRUQsU0FBUyxnQkFBZ0IsQ0FBQyxHQUFHLENBQUM7Q0FDN0IsTUFBTSxnQkFBZ0IsR0FBRyxTQUFTLE9BQU8sRUFBRSxNQUFNLENBQUM7RUFDakQsR0FBRyxDQUFDLEdBQUcsQ0FBQyxZQUFZLENBQUMsS0FBSyxDQUFDLENBQUM7R0FDM0IsTUFBTSxDQUFDLGlDQUFpQyxDQUFDLENBQUM7R0FDMUM7O0VBRUQsTUFBTSxTQUFTLEdBQUcsVUFBVTtHQUMzQixHQUFHLEdBQUcsQ0FBQyxRQUFRLENBQUM7SUFDZixPQUFPLEVBQUUsQ0FBQztJQUNWLElBQUk7SUFDSixNQUFNLENBQUMsb0JBQW9CLENBQUMsR0FBRyxDQUFDLFlBQVksQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDO0lBQ3JEO0dBQ0QsQ0FBQzs7RUFFRixHQUFHLEdBQUcsQ0FBQyxRQUFRLENBQUM7R0FDZixPQUFPLEVBQUUsQ0FBQztHQUNWLElBQUk7R0FDSixHQUFHLENBQUMsTUFBTSxHQUFHLFNBQVMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7R0FDbEM7RUFDRCxDQUFDOztDQUVGLE9BQU8sSUFBSSxPQUFPLENBQUMsZ0JBQWdCLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUM7Q0FDaEQ7O0FBRUQsU0FBUyxnQkFBZ0IsRUFBRTtDQUMxQixPQUFPLElBQUksQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLFNBQVMsSUFBSSxDQUFDO0VBQ25DLE1BQU0sR0FBRyxHQUFHLElBQUksQ0FBQyxhQUFhLENBQUMsS0FBSyxDQUFDLENBQUM7RUFDdEMsR0FBRyxDQUFDLEdBQUcsQ0FBQztHQUNQLE9BQU87R0FDUDtFQUNELE9BQU8sZ0JBQWdCLENBQUMsR0FBRyxDQUFDLENBQUM7RUFDN0IsQ0FBQyxDQUFDO0NBQ0g7O0FBRUQsU0FBUyxRQUFRLENBQUMsR0FBRyxFQUFFLFFBQVEsQ0FBQztDQUMvQixHQUFHLENBQUMsR0FBRyxFQUFFO0VBQ1IsSUFBSSxDQUFDLFFBQVEsR0FBRyxRQUFRLENBQUMsYUFBYSxDQUFDLEtBQUssQ0FBQyxDQUFDO0VBQzlDLElBQUksQ0FBQyxRQUFRLENBQUMsU0FBUyxHQUFHLHdCQUF3QixDQUFDO0VBQ25ELEdBQUcsR0FBRyxFQUFFLENBQUM7RUFDVCxJQUFJLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQyxPQUFPLEdBQUcsQ0FBQyxDQUFDO0VBQ2hDLElBQUksQ0FBQyxTQUFTLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQztFQUMxQyxJQUFJO0VBQ0osSUFBSSxDQUFDLFFBQVEsQ0FBQyxLQUFLLENBQUMsT0FBTyxHQUFHLENBQUMsQ0FBQztFQUNoQyxJQUFJLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQyxLQUFLLEdBQUcsUUFBUSxDQUFDLEtBQUssSUFBSSxJQUFJLENBQUM7RUFDbkQsSUFBSSxDQUFDLFFBQVEsQ0FBQyxLQUFLLENBQUMsTUFBTSxHQUFHLFFBQVEsQ0FBQyxNQUFNLElBQUksSUFBSSxDQUFDO0VBQ3JELElBQUksQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDLEdBQUcsR0FBRyxRQUFRLENBQUMsR0FBRyxJQUFJLElBQUksQ0FBQztFQUMvQyxJQUFJLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQyxJQUFJLEdBQUcsUUFBUSxDQUFDLElBQUksSUFBSSxJQUFJLENBQUM7RUFDakQ7O0NBRUQsSUFBSSxDQUFDLFFBQVEsQ0FBQyxZQUFZLENBQUMsS0FBSyxFQUFFLEdBQUcsQ0FBQyxDQUFDO0NBQ3ZDOztBQUVELFNBQVMsU0FBUyxFQUFFO0NBQ25CLEdBQUcsQ0FBQyxJQUFJLENBQUMsVUFBVSxJQUFJLElBQUksQ0FBQyxXQUFXLENBQUM7RUFDdkMsT0FBTztFQUNQO0NBQ0QsSUFBSSxDQUFDLFVBQVUsR0FBRyxLQUFLLENBQUM7Q0FDeEIsSUFBSSxDQUFDLFdBQVcsR0FBRyxJQUFJLENBQUM7O0NBRXhCLE1BQU0sSUFBSSxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQztFQUNwQyxTQUFTLEdBQUcsSUFBSSxDQUFDLGFBQWEsQ0FBQyxLQUFLLENBQUM7RUFDckMsWUFBWSxHQUFHLFNBQVMsQ0FBQyxxQkFBcUIsRUFBRTtFQUNoRCxJQUFJLEdBQUcsSUFBSSxDQUFDOztDQUViLElBQUksQ0FBQyxTQUFTLENBQUMsU0FBUyxDQUFDLE1BQU0sQ0FBQyx3QkFBd0IsQ0FBQyxDQUFDOztDQUUxRCxJQUFJLENBQUMsV0FBVyxDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQUMsb0NBQW9DLENBQUMsQ0FBQzs7Q0FFckUsSUFBSSxHQUFHLEdBQUcsVUFBVSxFQUFFO0VBQ3JCLEVBQUUsR0FBRyxZQUFZLENBQUMsSUFBSSxHQUFHLFNBQVMsQ0FBQyxXQUFXLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLFlBQVksQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxZQUFZLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsWUFBWSxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxHQUFHLENBQUMsS0FBSyxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUMsWUFBWSxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxHQUFHLEdBQUcsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDO0VBQ2hULEVBQUUsR0FBRyxZQUFZLENBQUMsR0FBRyxHQUFHLFNBQVMsQ0FBQyxZQUFZLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLFlBQVksQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxZQUFZLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsWUFBWSxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxHQUFHLENBQUMsTUFBTSxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUMsWUFBWSxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxHQUFHLEdBQUcsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDO0VBQ2xULENBQUMsR0FBRyxTQUFTLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxXQUFXLENBQUMsV0FBVyxDQUFDOztDQUV4RCxJQUFJLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxlQUFlLEdBQUcsQ0FBQyxZQUFZLEVBQUUsRUFBRSxDQUFDLElBQUksRUFBRSxFQUFFLENBQUMsZUFBZSxFQUFFLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDO0NBQ25HLElBQUksQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLFNBQVMsR0FBRyxDQUFDLFlBQVksRUFBRSxFQUFFLENBQUMsSUFBSSxFQUFFLEVBQUUsQ0FBQyxlQUFlLEVBQUUsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUM7O0NBRTdGLGVBQWUsQ0FBQyxJQUFJLENBQUMsV0FBVyxDQUFDO0VBQ2hDLElBQUksQ0FBQyxVQUFVO0VBQ2YsSUFBSSxDQUFDLG9CQUFvQixDQUFDLFNBQVMsR0FBRyxFQUFFLENBQUM7RUFDekMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxNQUFNLENBQUMsd0JBQXdCLENBQUMsQ0FBQztFQUNoRCxVQUFVLENBQUMsV0FBVztHQUNyQixJQUFJLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxPQUFPLEdBQUcsQ0FBQyxDQUFDO0dBQ25DLEVBQUUsRUFBRSxDQUFDLENBQUM7RUFDUCxDQUFDO0VBQ0QsSUFBSSxDQUFDLE1BQU0sZUFBZSxDQUFDLElBQUksQ0FBQyxXQUFXLENBQUMsQ0FBQztFQUM3QyxJQUFJLENBQUMsVUFBVTtFQUNmLElBQUksQ0FBQyxXQUFXLENBQUMsU0FBUyxDQUFDLE1BQU0sQ0FBQyxvQ0FBb0MsQ0FBQyxDQUFDO0VBQ3hFLElBQUksQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLGVBQWUsR0FBRyxtQ0FBbUMsQ0FBQztFQUM3RSxJQUFJLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxTQUFTLEdBQUcsbUNBQW1DLENBQUM7O0VBRXZFLElBQUksQ0FBQyxXQUFXLEdBQUcsS0FBSyxDQUFDO0VBQ3pCLENBQUM7RUFDRCxLQUFLLENBQUMsU0FBUyxNQUFNLENBQUM7RUFDdEIsT0FBTyxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUMsQ0FBQztFQUN0QixDQUFDLENBQUM7Q0FDSDs7QUFFRCxTQUFTLFFBQVEsRUFBRTtDQUNsQixTQUFTLENBQUMsSUFBSSxDQUFDLElBQUksRUFBRSxFQUFFLEVBQUUsV0FBVyxDQUFDLENBQUM7Q0FDdEM7O0FBRUQsU0FBUyxZQUFZLEVBQUU7Q0FDdEIsU0FBUyxDQUFDLElBQUksQ0FBQyxJQUFJLEVBQUUsQ0FBQyxFQUFFLEVBQUUsZUFBZSxDQUFDLENBQUM7Q0FDM0M7O0FBRUQsU0FBUyxTQUFTLENBQUMsY0FBYyxFQUFFLFNBQVMsQ0FBQzs7Q0FFNUMsR0FBRyxDQUFDLElBQUksQ0FBQyxVQUFVLElBQUksSUFBSSxDQUFDLFdBQVcsQ0FBQztFQUN2QyxPQUFPO0VBQ1A7O0NBRUQsTUFBTSxRQUFRLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUM7Q0FDMUMsTUFBTSxRQUFRLEdBQUcsU0FBUyxDQUFDLFFBQVEsQ0FBQyxDQUFDO0NBQ3JDLEdBQUcsQ0FBQyxRQUFRLElBQUksQ0FBQyxRQUFRLElBQUksQ0FBQyxRQUFRLENBQUMsU0FBUyxDQUFDLFFBQVEsQ0FBQyxlQUFlLENBQUMsQ0FBQztFQUMxRSxPQUFPO0VBQ1A7O0NBRUQsSUFBSSxDQUFDLFdBQVcsR0FBRyxJQUFJLENBQUM7Q0FDeEIsSUFBSSxDQUFDLE9BQU8sR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxRQUFRLENBQUMsQ0FBQzs7Q0FFNUMsUUFBUSxDQUFDLFNBQVMsQ0FBQyxNQUFNLENBQUMsd0JBQXdCLENBQUMsQ0FBQztDQUNwRCxRQUFRLENBQUMsU0FBUyxDQUFDLEdBQUcsQ0FBQyx3QkFBd0IsQ0FBQyxDQUFDOztDQUVqRCxvQkFBb0IsQ0FBQyxJQUFJLENBQUMsSUFBSSxFQUFFLFFBQVEsQ0FBQyxDQUFDOzs7Ozs7O0NBTzFDLE1BQU0sU0FBUyxHQUFHLFFBQVEsQ0FBQyxhQUFhLENBQUMsS0FBSyxDQUFDO0VBQzlDLFlBQVksR0FBRyxTQUFTLENBQUMscUJBQXFCLEVBQUUsQ0FBQzs7O0NBR2xELFFBQVEsQ0FBQyxJQUFJLENBQUMsSUFBSSxFQUFFLFNBQVMsQ0FBQyxHQUFHLEVBQUU7RUFDbEMsS0FBSyxFQUFFLFNBQVMsQ0FBQyxXQUFXO0VBQzVCLE1BQU0sRUFBRSxTQUFTLENBQUMsWUFBWTtFQUM5QixJQUFJLEVBQUUsWUFBWSxDQUFDLElBQUk7RUFDdkIsR0FBRyxFQUFFLFlBQVksQ0FBQyxHQUFHO0VBQ3JCLENBQUMsQ0FBQzs7Q0FFSCxJQUFJLFVBQVUsR0FBRyxDQUFDLENBQUM7Q0FDbkIsR0FBRyxPQUFPLElBQUksQ0FBQyxPQUFPLENBQUMsWUFBWSxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsQ0FBQyxVQUFVLEtBQUssV0FBVyxDQUFDO0VBQzlFLFVBQVUsR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDLFlBQVksQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLENBQUMsVUFBVSxDQUFDO0VBQ2xFOztDQUVELEdBQUcsQ0FBQyxjQUFjLENBQUM7RUFDbEIsY0FBYyxHQUFHLEVBQUUsQ0FBQztFQUNwQjs7Q0FFRCxJQUFJLEdBQUcsR0FBRyxVQUFVLEVBQUU7RUFDckIsZUFBZSxHQUFHLFFBQVEsQ0FBQyxZQUFZLENBQUMsV0FBVyxDQUFDLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQztFQUMvRCxZQUFZLEdBQUcsQ0FBQyxLQUFLLEVBQUUsZUFBZSxDQUFDLENBQUMsQ0FBQyxFQUFFLE1BQU0sRUFBRSxlQUFlLENBQUMsQ0FBQyxDQUFDLENBQUM7RUFDdEUsRUFBRSxHQUFHLENBQUMsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLFlBQVksQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxZQUFZLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsWUFBWSxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxHQUFHLENBQUMsS0FBSyxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUMsWUFBWSxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxHQUFHLEdBQUcsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLEdBQUcsWUFBWSxDQUFDLElBQUksR0FBRyxHQUFHLEdBQUcsU0FBUyxDQUFDLFdBQVc7RUFDcFQsRUFBRSxHQUFHLENBQUMsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLFlBQVksQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFD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