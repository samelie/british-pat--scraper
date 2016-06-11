var xray = require('x-ray');
var fs = require('fs');
var _ = require('lodash');
var r = require('request');
var Q = require('bluebird');
var path = require('path');
var nUrl = require('url');
var colors = require('colors');
var readDir = require('readdir');
var rimraf = require('rimraf');
var argv = require('yargs').argv;
var x = new xray();
var X = Q.promisify(x);
require('shelljs/global')

var urls = [];
const QUERIES_FOLDER = 'queryies'
const WORKSPACE_FOLDER = 'workspaces'
const PATH = argv.w ? path.join(process.cwd(), WORKSPACE_FOLDER) :
    path.join(process.cwd(), QUERIES_FOLDER);

if (!fs.existsSync(PATH)) {
    fs.mkdirSync(PATH);
}

const QUERY_URL = "http://www.britishpathe.com/search/query/"
const VIDEO_URL = "http://www.britishpathe.com/video/"
const MANIFEST_BASE = 'http://streaming.britishpathe.com/hds-vod/FLASH/00000000/'
const MAX_QUERY = argv.max || 2

//*** load the workspaces
const WORKSPACES = JSON.parse(fs.readFileSync('./workspaces.json', 'utf8'));
let useWorkspaces = argv.w ? true : false

if (argv.reset) {
    rimraf.sync(PATH);
}

//*** default is query
var _q = argv.q.split(' ').join('+');
var query = `${QUERY_URL}${_q}`
let OUTPUT_DIRECTORY = path.join(PATH, _q)

if (argv.start) {
    query += `/start/${argv.start}`
}

if (argv.end) {
    query += `/end/${argv.end}`
}

const EXISTING_IDS = _getExistingIds()

function doQuery(query) {
    return new Q((resolve, reject) => {
        x(query, 'a', [{
            //a:''
            href: '@href'
                //link: x('@href', 'title')
                //href:'@href'
        }])((err, info) => {

            if (!info.length) {
                console.log(colors.red('Did not find any info'));
                return
            }

            var simple = []
            _.each(info, (obj) => {
                if (simple.indexOf(obj.href) < 0) {
                    simple.push(obj.href)
                }
            })

            var pages = simple.filter(item => {
                return item.match('page/')
            })
            var _lastPage = pages[pages.length - 1]

            //****just the search results
            var filtered = simple.filter(obj => {
                return obj.indexOf(VIDEO_URL) > -1
            })

            console.log(colors.cyan(`${filtered.length} results`));
            //console.log(filtered);
            if (filtered.length) {
                //var chosenVideos = filtered.splice(0, MAX_QUERY)
                return Q.map(filtered, (url) => {
                    return _queryVideoPage(url);
                }, {
                    concurrency: 1
                }).then(results => {
                    var videoVos = results.map(url => {
                        var categoryId = _extractCategoryId(url)
                        var id = _extractVideoId(url)
                        var manifest = `${MANIFEST_BASE}${categoryId}/${id}.mp4.f4m`
                        if (EXISTING_IDS.indexOf(id) > -1) {
                            return false
                        } else {
                            return { manifest, id, categoryId }
                        }
                    })
                    var compactedVos = _.compact(videoVos)
                    console.log(colors.cyan(`Downloading ${compactedVos.length} videos`));

                    _.each(compactedVos, vo => { _download(vo) })
                });
            } else {
                console.log(colors.red('Nothing found for: '), query);
            }
        })
    });
}

/*
The category Id is in the FLV url
data-rel attr
href: 'flv:/FLASH/00000000/00062000/00062866'
*/

function _extractCategoryId(url) {
    var s = url.split('/')
    var id = s[s.length - 2]
    return id
}

function _extractVideoId(url) {
    var s = url.split('/')
    var id = s[s.length - 1]
    return id
}

function _queryVideoPage(query) {
    return new Q((resolve, reject) => {
        x(query, 'div', [{
            //a:''
            href: '@data-rel'
                //link: x('@href', 'title')
                //href:'@href'
        }])((err, info) => {
            //****just the search results
            var filtered = info.filter(obj => {
                return obj.href.indexOf('flv') > -1
            })
            resolve(filtered[0].href)
                /*var s = filtered[0].href.split('/')
                var id = s[s.length - 2]
                resolve(id)*/
        })
    });
}

function _getExistingIds() {
    var files = readDir.readSync(PATH, ['**.mp4'], readDir.ABSOLUTE_PATHS);
    var ids = files.filter(p => {
        var parsed = path.parse(p)
        var id = parsed.name.split('_')[1].replace('.mp4', ' ').trim()
        return id
    })
    return ids
}

function _download(vo) {
    var { id, manifest, categoryId } = vo
    var fileId = `${categoryId}_${id}`
    exec(`php AdobeHDS.php --delete --manifest \"${manifest}\" --outfile ${fileId}`)
    console.log(colors.cyan(`Downloaded video id ${id}`));
    var outFile = path.join(`${fileId}.flv`)
    var mp4File = path.join(OUTPUT_DIRECTORY, `${fileId}.mp4`)
    exec(`ffmpeg -i ${outFile} -loglevel panic -vf crop=352:224:0:0 -c:v libx264 -c:a copy -y ${mp4File}`)
    console.log(colors.cyan(`Converted it to: ${mp4File}`));
    //remove orig
    fs.unlinkSync(path.join(process.cwd(), `${outFile}`))
        //  var dis = 1000;
        //       var command = process.env.MP4BOX_PATH + ' -dash ' + dis + ' -frag ' + dis + ' -rap -frag-rap -profile onDemand -mpd-title ' + seg['name'] + ' -out ' + out + ' ' + seg['clip']['path'];
}


//************
// START
//************
if (useWorkspaces) {
    return Q.map(WORKSPACES, (url) => {
        console.log(colors.green(url));
        let _s = url.split('/')
        let _workspaceId = _s[_s.length - 1]
        OUTPUT_DIRECTORY = path.join(PATH, _workspaceId)
        if (!fs.existsSync(OUTPUT_DIRECTORY)) {
            fs.mkdirSync(OUTPUT_DIRECTORY);
        }
        return doQuery(url);
    }, {
        concurrency: 1
    })
} else {
    console.log(colors.green(query));
    if (!fs.existsSync(OUTPUT_DIRECTORY)) {
        fs.mkdirSync(OUTPUT_DIRECTORY);
    }
    doQuery(query)
}