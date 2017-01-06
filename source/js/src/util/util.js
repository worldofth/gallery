'use strict';

const animationEndEventName = ['animationend', 'webkitAnimationEnd', 'MSAnimationEnd', 'oAnimationEnd'];

function onEndAnimation(el){
	return new Promise(function(resolve, reject){
		const onEndCallbackFn = function(evt){
			for (let i = 0; i < animationEndEventName.length; i++) {
				el.removeEventListener(animationEndEventName[i], onEndCallbackFn);
			}
			resolve();
		};

		if(!el){
			reject('No element passed to on End Animation');
		}

		for (let i = 0; i < animationEndEventName.length; i++) {
			el.addEventListener(animationEndEventName[i], onEndCallbackFn);
		}
	});
}

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

export {onEndAnimation, onEndTransition, extend, requestAnimationFramePromise};
