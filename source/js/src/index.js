//import poly from './util/polyfills';

//import svg4everybody from '../vendor/svg4everybody';
import galleryGrid from './ui/gallery-grid';

let basePath;

function init(){
	//poly();

	//svg4everybody();
	setupGalleryGrid();
}

function setupGalleryGrid(){
	galleryGrid('.js-gallery', {
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
