/******************************************************
 * PATTERN LAB NODE
 * EDITION-NODE-GULP
 * The gulp wrapper around patternlab-node core, providing tasks to interact with the core library and move supporting frontend assets.
******************************************************/
var gulp = require('gulp'),
	path = require('path'),
	browserSync = require('browser-sync').create(),
	reload = browserSync.reload,
	reloadCSS = function(done) {
		browserSync.reload('*.css');
		if(done){
			done();
		}
	},
	reloadJS = function(done){
		browserSync.reload('*.js');
		if(done){
			done();
		}
	},
	sourcemaps 	= require('gulp-sourcemaps'),
	argv = require('minimist')(process.argv.slice(2));

//===============================
// 		Util
//===============================
var gutil = require('gulp-util'),
	chalk = require('chalk');

function map_error(err) {
	if (err.fileName) {
		// regular error
		gutil.log(chalk.red(err.name)
			+ ': '
			+ chalk.yellow(err.fileName.replace(__dirname + '/src/js/', ''))
			+ ': '
			+ 'Line '
			+ chalk.magenta(err.lineNumber)
			+ ' & '
			+ 'Column '
			+ chalk.magenta(err.columnNumber || err.column)
			+ ': '
			+ chalk.blue(err.description));
	} else {
		// browserify error..
		gutil.log(chalk.red(err.name)
			+ ': '
			+ chalk.yellow(err.message));
	}
	this.emit('end');
}

function resolvePath(pathInput) {
	return path.resolve(pathInput).replace(/\\/g,"/");
}

/******************************************************
 * COPY TASKS - stream assets from source to destination
******************************************************/
// JS copy
gulp.task('pl-copy:js', function(){
	return gulp.src(['./dist/*.js', './dist/*.js.map'], {cwd: resolvePath(paths().source.js)} )
		.pipe(gulp.dest(resolvePath(paths().public.js+'dist/')));
});

gulp.task('html-copy:js', function(){
	return gulp.src(['./dist/*.js', './dist/*.js.map'], {cwd: resolvePath(paths().source.js)} )
		.pipe(gulp.dest(resolvePath(paths().html.js+'dist/')));
});

// Images copy
gulp.task('pl-copy:img', function(){
	return gulp.src('**/*.*',{cwd: resolvePath(paths().source.images)} )
		.pipe(gulp.dest(resolvePath(paths().public.images)));
});

// Favicon copy
gulp.task('pl-copy:favicon', function(){
	return gulp.src('favicon.ico', {cwd: resolvePath(paths().source.root)} )
		.pipe(gulp.dest(resolvePath(paths().public.root)));
});

// Fonts copy
gulp.task('pl-copy:font', function(){
	return gulp.src('*', {cwd: resolvePath(paths().source.fonts)})
		.pipe(gulp.dest(resolvePath(paths().public.fonts)));
});

// CSS Copy
gulp.task('pl-copy:css', function(){
	return gulp.src([resolvePath(paths().source.css) + '/*.css', resolvePath(paths().source.css) + '/*.css.map'])
		.pipe(gulp.dest(resolvePath(paths().public.css)))
		.pipe(browserSync.stream());
});

gulp.task('html-copy:css', function(){
	return gulp.src([resolvePath(paths().source.css)+'/*.css', resolvePath(paths().source.css)+'/*.css.map'])
		.pipe(gulp.dest(resolvePath(paths().html.css)))
		.pipe(browserSync.stream());
});

// Styleguide Copy everything but css
gulp.task('pl-copy:styleguide', function(){
	return gulp.src(resolvePath(paths().source.styleguide) + '/**/!(*.css)')
		.pipe(gulp.dest(resolvePath(paths().public.root)))
		.pipe(browserSync.stream());
});

// Styleguide Copy and flatten css
gulp.task('pl-copy:styleguide-css', function(){
	return gulp.src(resolvePath(paths().source.styleguide) + '/**/*.css')
		.pipe(gulp.dest(function(file){
			//flatten anything inside the styleguide into a single output dir per http://stackoverflow.com/a/34317320/1790362
			file.path = path.join(file.base, path.basename(file.path));
			return resolvePath(path.join(paths().public.styleguide, '/css'));
		}))
		.pipe(browserSync.stream());
});

/******************************************************
 * PATTERN LAB CONFIGURATION - API with core library
******************************************************/
//read all paths from our namespaced config file
var config = require('./patternlab-config.json'),
	patternlab = require('patternlab-node')(config);

function paths() {
	return config.paths;
}

function getConfiguredCleanOption() {
	return config.cleanPublic;
}

function build(done) {
	patternlab.build(done, getConfiguredCleanOption());
}

gulp.task('pl-assets', gulp.series(
	gulp.parallel(
		'pl-copy:js',
		'pl-copy:img',
		'pl-copy:favicon',
		'pl-copy:font',
		'pl-copy:css',
		'pl-copy:styleguide',
		'pl-copy:styleguide-css'
	),
	function(done){
		done();
	})
);

gulp.task('patternlab:version', function (done) {
	patternlab.version();
	done();
});

gulp.task('patternlab:help', function (done) {
	patternlab.help();
	done();
});

gulp.task('patternlab:patternsonly', function (done) {
	patternlab.patternsonly(done, getConfiguredCleanOption());
});

gulp.task('patternlab:liststarterkits', function (done) {
	patternlab.liststarterkits();
	done();
});

gulp.task('patternlab:loadstarterkit', function (done) {
	patternlab.loadstarterkit(argv.kit, argv.clean);
	done();
});

gulp.task('patternlab:build', gulp.series('pl-assets', build, function(done){
	done();
}));

gulp.task('patternlab:installplugin', function (done) {
	patternlab.installplugin(argv.plugin);
	done();
});

/******************************************************
 * SERVER AND WATCH TASKS
******************************************************/
// watch task utility functions
function getSupportedTemplateExtensions() {
	var engines = require('./node_modules/patternlab-node/core/lib/pattern_engines');
	return engines.getSupportedFileExtensions();
}
function getTemplateWatches() {
	return getSupportedTemplateExtensions().map(function (dotExtension) {
		return resolvePath(paths().source.patterns) + '/**/*' + dotExtension;
	});
}

function watch() {
	gulp.watch(resolvePath(paths().source.styleguide) + '/**/*.*', { awaitWriteFinish: true }).on('change', gulp.series('pl-copy:styleguide', 'pl-copy:styleguide-css', reloadCSS));
	gulp.watch(resolvePath(paths().source.images) + '/*', { awaitWriteFinish: true }).on('change', gulp.series('pl-copy:img', reload));

	var patternWatches = [
		resolvePath(paths().source.patterns) + '/**/*.json',
		resolvePath(paths().source.patterns) + '/**/*.md',
		resolvePath(paths().source.data) + '/*.json',
		resolvePath(paths().source.fonts) + '/*',
		resolvePath(paths().source.meta) + '/*',
		resolvePath(paths().source.annotations) + '/*'
	].concat(getTemplateWatches());

	console.log(patternWatches);

	gulp.watch(patternWatches, { awaitWriteFinish: true }).on('change', gulp.series(build, reload));
}

gulp.task('patternlab:connect', gulp.series(function(done) {
	browserSync.init({
		server: {
			baseDir: resolvePath(paths().public.root)
		},
		snippetOptions: {
			// Ignore all HTML files within the templates folder
			blacklist: ['/index.html', '/', '/?*']
		},
		notify: {
			styles: [
				'display: none',
				'padding: 15px',
				'font-family: sans-serif',
				'position: fixed',
				'font-size: 1em',
				'z-index: 9999',
				'bottom: 0px',
				'right: 0px',
				'border-top-left-radius: 5px',
				'background-color: #1B2032',
				'opacity: 0.4',
				'margin: 0',
				'color: white',
				'text-align: center'
			]
		}
	}, function(){
		console.log('PATTERN LAB NODE WATCHING FOR CHANGES');
		done();
	});
}));

/******************************************************
 * COMPOUND TASKS
******************************************************/
gulp.task('patternlab:default', gulp.series('patternlab:build'));
gulp.task('patternlab:watch', gulp.series('patternlab:build', watch));
gulp.task('patternlab:serve', gulp.series('patternlab:build', 'patternlab:connect', watch));

//===============================
// 		My Gulp Tasks
//===============================

//===============================
// 		Css - Tasks
//===============================

var less 				= require('gulp-less'),
	LessPluginCleanCSS 	= require('less-plugin-clean-css'),
	cleancss 			= new LessPluginCleanCSS({ advanced: true });

function buildLess(){
	return gulp.src(resolvePath(paths().source.css)+'/main.less')
		.pipe(sourcemaps.init())
		.pipe(less({
			//plugins: [cleancss]
		}))
		.on('error', map_error)
		.pipe(sourcemaps.write('.'))
		.pipe(gulp.dest(resolvePath(paths().source.css)));
}

function watchLess(){
	gulp.watch(resolvePath(paths().source.css) + '/**/*.less', gulp.series(buildLess, 'pl-copy:css', reloadCSS))
	.on('change',  function(path){
		console.log('File ' + path + ' was changed');
	});
}

function watchLessHtml(){
	gulp.watch(resolvePath(paths().source.css) + '/**/*.less', gulp.series(buildLess, 'html-copy:css', reloadCSS))
	.on('change',  function(path){
		console.log('File ' + path + ' was changed');
	});
}

exports['build-less'] = buildLess;
exports['watch-less'] = watchLess;
exports['watch-less-html'] = watchLessHtml;

//===============================
// 		SVG - Tasks
//===============================
var gulpSvgstore 	= require('gulp-svgstore'),
	svgmin 			= require('gulp-svgmin');

function svgstore(){
	return gulp.src(resolvePath(paths().source.svgicons)+'/*.svg')
		.pipe(svgmin(function(file){
			var prefix = path.basename(file.relative, path.extname(file.relative));
			return {
				js2svg: {
					pretty: true
				},
				plugins: [{
					cleanupIDs: {
						prefix: prefix + '-',
						minify: true
					}
				},{
					cleanupNumericValues: {
						floatPrecision: 5
					},
				},
				{
					removeTitle: true
				},{
					sortAttrs: true
				},{
					convertShapeToPath: false
				}]
			};
		}))
		.pipe(gulpSvgstore())
		.pipe(gulp.dest(resolvePath(paths().source.images)));
};

exports.svgstore = svgstore;


//===============================
// 		Javascript - Tasks
//===============================

var rollup				= require('rollup-stream'),
	commonjs 			= require('rollup-plugin-commonjs'),
	babel 				= require('rollup-plugin-babel'),
	nodeResolve 		= require('rollup-plugin-node-resolve'),
	uglify 				= require('gulp-uglify'),
	rename 				= require('gulp-rename'),
	source 				= require('vinyl-source-stream'),
	buffer 				= require('vinyl-buffer');

var cache,
	cacheES6;

function buildES6(){
	return rollup({
		entry: resolvePath(paths().source.js)+'/src/index.js',
		sourceMap: true,
		cache: cacheES6,
		plugins: [
			nodeResolve({
				jsnext: true,
				browser: true
			}),
			commonjs()
		],
		format: 'iife'
	})
	.on('bundle', function(bundle){
		cacheES6 = bundle;
	})
	.on('error', map_error)
	.pipe(source('index.js'))
	.pipe(buffer())
	.pipe(gulp.dest(resolvePath(paths().source.js)+'/dist'));
}

function buildES5(){
	return rollup({
		entry: resolvePath(paths().source.js)+'/src/index.js',
		sourceMap: true,
		cache: cache,
		plugins: [
			nodeResolve({
				jsnext: true,
				browser: true
			}),
			commonjs(),
			babel()
		],
		format: 'iife'
	})
	.on('bundle', function(bundle){
		cache = bundle;
	})
	.on('error', map_error)
	.pipe(source('indexES5.js'))
	.pipe(buffer())
	.pipe(gulp.dest(resolvePath(paths().source.js)+'/dist'))
	.pipe(rename('main.min.js'))
	.pipe(sourcemaps.init({ loadMaps: true }))
	.pipe(uglify())
	.pipe(sourcemaps.write('.'))
	.pipe(gulp.dest(resolvePath(paths().source.js)+'/dist'));
}

var buildJS = gulp.parallel(buildES6, buildES5);

function watchJS(){
	gulp.watch(resolvePath(paths().source.js)+'/src/**/*.js', gulp.series(buildES6, 'pl-copy:js', reloadJS))
	.on('change',  function(path){
		console.log('File ' + path + ' was changed');
	});
}

function watchJSHTML(){
	gulp.watch(resolvePath(paths().source.js)+'/src/**/*.js', gulp.series(buildES6, 'html-copy:js', reloadJS))
	.on('change',  function(path){
		console.log('File ' + path + ' was changed');
	});
}

exports['build-js'] = buildJS;
exports['build-es6'] = buildES6;
exports['watch-js'] = watchJS;
exports['watch-js-html'] = watchJSHTML;

//===============================
// 		Html - Tasks
//===============================

function htmlBrowserSync(){
	browserSync.init({
		server: {
			baseDir: "./html"
		}
	});
	gulp.watch('./html/*.html', reload);
}
exports['html'] = htmlBrowserSync;

gulp.task('build', gulp.parallel(buildJS, buildLess));
gulp.task('watch', gulp.parallel(buildES6, watchLess, watchJS, 'patternlab:serve'));
gulp.task('watch-html', gulp.series(buildES6, gulp.parallel('html-copy:js', 'html-copy:css'), gulp.parallel(watchLessHtml, watchJSHTML, htmlBrowserSync)));

gulp.task('default', gulp.series("watch"));
