var gulp = require('gulp');
//JS压缩
var uglify = require('gulp-uglify');
//LESS编译
var less = require('gulp-less');
//CSS压缩
var minifyCSS = require('gulp-minify-css');
//JS代码验证
var jshint = require('gulp-jshint');
//监听
var watch = require('gulp-watch');
// 图片压缩
var imagemin = require('gulp-imagemin');
//深度压缩图片
var pngquant = require('imagemin-pngquant');
//编译缓存
var cache = require('gulp-cache');
//选择
var gulpIf = require('gulp-if');
// coffee
var babel = require('gulp-babel');
// 保存，不退出
var plumber = require('gulp-plumber');
// 清理已经删除的
var clean = require('gulp-clean');
// sourcemaps
var sourcemaps = require('gulp-sourcemaps');
var minifyHTML = require('gulp-minify-html');
// 增量更新包
var newer = require('gulp-newer');
// 静态资源版本号
var gulpRoot = __dirname;
var assetRev = require('gulp-asset-rev');
var assetRevOpt = {
    resolvePath: function (src) {
        return gulpRoot + '/src' + src;
    }
};
// 按照计划执行
var gulpSequence = require('gulp-sequence');
// css 自动加 前缀
// autoprefixer(autoprefixerOpt)
var autoprefixer = require('gulp-autoprefixer');
var autoprefixerOpt = {
    browsers: ['last 2 versions', 'Android >= 4.0'],
    cascade: false
};
var options = require('minimist')(process.argv.slice(2), {
    string: 'env',
    default: {env: process.env.NODE_ENV || 'develop'}
});
var isDevelop = options.env === 'develop';
var path = options.path || '';
if (path && path.indexOf('/') != 0) {
    path = '/' + path;
}
var srcDir = 'src' + path;
var rootDir = isDevelop ? './_dest' : './_mini';
var buildDir = rootDir + path;
var tmpDir = '';
function gulpIfDevelop(fn) {
    return gulpIf(isDevelop, fn);
}
function gulpIfProduction(fn) {
    return gulpIf(!isDevelop, fn);
}
function gulpBuild() {
    var arg = Array.prototype.slice.call(arguments);
    var handle = arg.shift();
    // gulp 补丁，报错不退出
    arg.unshift(plumber());
    // 输出目录
    arg.push(gulpIf(!isDevelop && !!tmpDir, gulp.dest(tmpDir)), gulp.dest(buildDir));
    while (arg.length) {
        handle = handle.pipe(arg.shift());
    }
    return handle;
}
function initTask() {
    // es6
    var srcDirEs6 = [srcDir + '/**/*.es6'];
    gulp.task('es6', function () {
        gulpBuild(
            gulp.src(srcDirEs6),
            newer({
                dest: buildDir,
                ext: '.js'
            }),
            gulpIfDevelop(sourcemaps.init()),
            babel({presets: ['stage-0', 'es2015', 'react']}),
            gulpIfProduction(uglify()),
            gulpIfDevelop(sourcemaps.write())
        );
    });

// 压缩js文件
    var srcDirJs = [srcDir + '/**/*.js', '!' + srcDir + '/**/*.min.js'];
    gulp.task('js-mini', function () {
        gulpBuild(
            gulp.src(srcDirJs),
            newer({
                dest: buildDir,
                ext: '.js'
            }),
            //代码验证
            jshint(),
            // 压缩
            gulpIfProduction(uglify())
        );
    });

    var srcDirLess = [srcDir + '/**/*.less', '!' + srcDir + '/**/_*.less'];
    gulp.task('less', function () {
        gulpBuild(
            gulp.src(srcDirLess),
            newer({
                dest: buildDir,
                ext: '.css'
            }),
            gulpIfDevelop(sourcemaps.init()),
            //编译
            less(),
            autoprefixer(autoprefixerOpt),
            assetRev(assetRevOpt),
            //压缩
            gulpIfProduction(minifyCSS()),
            gulpIfDevelop(sourcemaps.write())
        )
    });
    var srcDirCss = [srcDir + '/**/*.css'];
    gulp.task('css-mini', function () {
        gulpBuild(
            gulp.src(srcDirCss),
            newer({
                dest: buildDir,
                ext: '.css'
            }),
            autoprefixer(autoprefixerOpt),
            assetRev(assetRevOpt),
            //压缩
            gulpIfProduction(minifyCSS())
        );
    });

//图片压缩 gif ico
// tiny 在线压缩,图片压缩比例非常高 必须有网络才能压缩
    var srcDirImg = [srcDir + '/**/*.{png,jpg,gif,ico}'];
    gulp.task('img-mini', function () {
        var imgFn = imagemin({
            progressive: true,
            svgoPlugins: [{removeViewBox: false}],
            use: [pngquant()]
        });
        gulpBuild(
            gulp.src(srcDirImg),
            newer({
                dest: buildDir
            }),
            cache(imgFn)
        );
    });

    var srcDirHtml = [srcDir + '/**/*.html'];
    gulp.task('html', function () {
        gulpBuild(
            gulp.src(srcDirHtml),
            assetRev(assetRevOpt),
            gulpIfProduction(minifyHTML())
        );
    });

    var srcDirCopy = [srcDir + '/**/*.{swf,min.js,otf,eof,svg,ttf,woff,woff2}'];
    gulp.task('copy', function () {
        gulpBuild(
            gulp.src(srcDirCopy),
            newer({
                dest: buildDir
            })
        );
    });

// 监控文件变化
    gulp.task('watch', function () {
        gulp.watch(srcDirEs6, ['es6']);
        gulp.watch(srcDirJs, ['js-mini']);
        gulp.watch(srcDirLess, ['less', 'html']);
        gulp.watch(srcDirCss, ['css-mini', 'html']);
        gulp.watch(srcDirImg, ['img-mini']);
        gulp.watch(srcDirCopy, ['copy']);
    });

    gulp.task('clean', function (done) {
        cache.clearAll(done);
        gulp.src(buildDir)
            .pipe(clean({force: true, read: false}))
    });

    gulp.task('clean-html', function () {
        gulp.src(buildDir + '/**/*.html')
            .pipe(clean({force: true, read: false}))
    });

// 执行所有任务,不做清理
    //gulp.task('run', gulpSequence(['less', 'sass', 'css-mini'], ['img-mini', 'es6', 'coffee', 'js-mini', 'html', 'copy']));
    gulp.task('run', gulpSequence(['less', 'css-mini'], ['img-mini', 'es6', 'coffee', 'js-mini', 'html', 'copy']));

    /* 默认 */
    gulp.task('default', function () {
        gulp.start('watch');
    });
}
initTask();
// // 说明
// gulp.task('help',function () {
//     console.log('	gulp watch               文件监控打包');
//     console.log('	gulp help                gulp参数说明');
//     console.log('	gulp all                 部署所有环境');
//     console.log('	gulp chean               清理当前环境下的数据');
//     console.log('	gulp --env production    生产环境（默认生产环境）');
//     console.log('	gulp --env develop       开发环境');
// });
