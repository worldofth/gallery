import {onEndTransition, extend, requestAnimationFramePromise} from '../util/util';
import Bricks from '../../vendor/brick';

const GalleryGrid = {
	setup: setup,
	init: init,

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

function createGalleryGrid(el, options){
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

function init(){
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

export default createGalleryGrid;
