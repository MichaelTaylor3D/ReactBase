const fs = require('fs');
const path = require('path');

const babelify = require('babelify');
const browserify = require('browserify');
const cleanCss = require('gulp-clean-css');
const gulp = require('gulp');
const gutil = require('gulp-util');
const filesize = require('filesize');
const prettyHrtime = require('pretty-hrtime');
const rimraf = require('rimraf');
const sass = require('gulp-sass');
const source = require('vinyl-source-stream');
const uglify = require('gulp-uglify');
const watchify = require('watchify');


gulp.task('clean', function(cb) {
	rimraf('distro', cb);
});

gulp.task('copy-html', ['clean'], function() {
	return gulp.src(['index.html'])
	.pipe(gulp.dest('distro/content/'));
});

gulp.task('copy-fonts', ['clean'], function() {
	return gulp.src('resources/fonts/**/*')
		.pipe(gulp.dest('distro/content/resources/fonts/'));
});

gulp.task('copy-images', ['clean'], function() {
	return gulp.src('resources/images/**/*')
		.pipe(gulp.dest('distro/content/resources/images/'));
});

gulp.task('copy-assets', ['clean', 'copy-html', 'copy-fonts', 'copy-images']);

gulp.task('compile-js', ['clean'], function() {
	return buildJS(false);
});

gulp.task('compile-css', ['clean'], function() {
	return buildCSS(false);
});

gulp.task('compress-js', ['build'], function() {
	return gulp.src('distro/content/js/bundle.js')
		.pipe(uglify({ mangle: false }))
		.pipe(gulp.dest('distro/content/js'));
});

gulp.task('compress-css', ['build'], function() {
	return gulp.src('distro/content/css/main.css')
		.pipe(cleanCss())
		.pipe(gulp.dest('distro/content/css'));
});

gulp.task('watch-js', function() {
	return buildJS(true);
});

gulp.task('watch-css', function () {
	buildCSS(true);
	gulp.watch('css/**/*.scss', function(event) {
		const relativeFile = path.relative(__dirname, event.path);
		gutil.log(
			gutil.colors.cyan('watch-css'),
			`File '${gutil.colors.cyan(relativeFile)}' ${event.type}`
		);
		const start = process.hrtime();
		return buildCSS(true)
			.on('end', () => {
				const delta = process.hrtime(start);
				gutil.log(
					gutil.colors.cyan('watch-css'),
					'Rebuilt CSS in',
					gutil.colors.magenta(prettyHrtime(delta))
				);
			});
	});
});

gulp.task('build', ['clean', 'copy-assets', 'compile-js', 'compile-css']);
gulp.task('build-release', ['build', 'compress-js', 'compress-css']);
gulp.task('watch', ['watch-js', 'watch-css']);


function buildJS(watch) {
	const paths = {
		dist: 'distro/content/js',
		dev: 'js'
	};

	const props = {
		entries: ['js/app.js'],
		debug: true,
		cache: {},
		packageCache: {}
	};

	if (watch) {
		props.plugin = [watchify];
	}

	const bundler = browserify(props);
	bundler.transform(babelify, {
		presets: ['es2015', 'react'],
		plugins: ['jsx-control-statements', 'transform-object-rest-spread', 'transform-class-properties']
	});

	function rebundle() {
		return bundler.bundle()
			.on('error', gutil.log.bind(gutil,
				gutil.colors.cyan('Browserify'),
				gutil.colors.red('ERROR')
			))
			.pipe(source('bundle.js'))
			.pipe(gulp.dest(watch ? paths.dev : paths.dist));
	}

	bundler.on('update', function() {
		rebundle();
	});

	bundler.on('log', function(data) {
		// expected data := `XX bytes written (YY.zz seconds)`
		const regex = /(:?\d+) bytes written \(:?([\d\.]+) seconds\)/.exec(data);
		if (regex !== null) {
			const size = Number(regex[1]);
			const time = Number(regex[2]);

			gutil.log(
				gutil.colors.cyan('watch-js'),
				gutil.colors.magenta(filesize(size)), 'written in',
				gutil.colors.magenta(`${time} s`)
			);
		} else { // Just in case
			gutil.log(
				gutil.colors.cyan('watch-js'),
				data.replace(/\d+/g, num => gutil.colors.magenta(num))
			);
		}
	});

	return rebundle();
}

function buildCSS(watch) {
	const paths = {
		dist: 'distro/content/css',
		dev: 'css'
	};

	return gulp.src('css/main.scss')
		.pipe(sass().on('error', sass.logError))
		.pipe(gulp.dest(watch ? paths.dev : paths.dist));
}
