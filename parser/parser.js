const Youtube = require("youtube-api"),
    fs = require("fs"),
    readJson = require("r-json"),
    Lien = require("lien"),
    Logger = require("bug-killer"),
    opn = require("opn"),
    _ = require("lodash"),
    Q = require("bluebird"),
    prettyBytes = require("pretty-bytes");
var argv = require('yargs').argv;
var PL = Q.promisifyAll(Youtube.playlistItems);
var SRC = require("srt").fromString

const PLAYLIST = argv.p
const PAUSE_FOR_NEW_SENTENCE = 1 || argv.pause
const CREDENTIALS = readJson(`${__dirname}/credentials.json`);

// Init lien server
let server = new Lien({
    host: "localhost",
    port: 5000
});

// Authenticate
// You can access the Youtube resources via OAuth2 only.
// https://developers.google.com/youtube/v3/guides/moving_to_oauth#service_accounts
let oauth = Youtube.authenticate({
    type: "oauth",
    client_id: CREDENTIALS.web.client_id,
    client_secret: CREDENTIALS.web.client_secret,
    redirect_url: CREDENTIALS.web.redirect_uris[0]
});

opn(oauth.generateAuthUrl({
    access_type: "offline",
    scope: ["https://www.googleapis.com/auth/youtube.force-ssl",
        "https://www.googleapis.com/auth/youtubepartner"
    ]
}));

function _getSrt(id) {
    return new Q((resolve, reject) => {
        Youtube.captions.list({
            part: 'id',
            videoId: id
        }, (err, data) => {
            let _auto = data.items[0]
            if (_auto) {
                Youtube.captions.download({
                    id: _auto.id,
                    tfmt: "srt"
                }, (err, data) => {
                    let _srt = SRC(data)
                    let _previousEnd = 0
                    let _previousBlock
                    let _srts = {
                        videoId:undefined,
                        subs:[]
                    }
                    _.forIn(_srt, (block, i) => {
                        block.index = block.number
                        block.endTime /= 1000
                        block.startTime /= 1000
                        block.duration = block.endTime - block.startTime
                        block.isNewSentence = /[A-Z]/.test(block.text.charAt(0))
                        block.isNewSentence = false
                        block.videoId = id
                        if (block.startTime - _previousEnd > PAUSE_FOR_NEW_SENTENCE) {
                            if(_previousBlock){
                                _previousBlock.isSentenceEnd = true
                            }
                            block.isNewSentence = true
                        }
                        _previousBlock = block
                        _previousEnd = block.endTime
                        _srts.subs.push(block)
                    })
                    _srts.videoId = id
                    Logger.log(`Success for ${id}`);
                    resolve(_srts)
                })
            } else {
                Logger.log(`No Srt for ${id}`);
                resolve(null)
            }
        })
    })
}

// Handle oauth2 callback
server.addPage("/oauth2callback", lien => {
    Logger.log("Trying to get the token using the following code: " + lien.query.code);
    oauth.getToken(lien.query.code, (err, tokens) => {

        if (err) {
            lien.lien(err, 400);
            return Logger.log(err);
        }

        Logger.log("Got the tokens.");

        oauth.setCredentials(tokens);

        lien.end("The video is being uploaded. Check out the logs in the terminal.");
        return new Q((resolve, reject) => {
            Youtube.playlistItems.list({
                part: 'snippet',
                playlistId: PLAYLIST,
                maxResults: 50
            }, (err, data) => {
                return Q.map(data.items, (item) => {
                    return _getSrt(item.snippet.resourceId.videoId);
                }, {
                    concurrency: 1
                }).then((all) => {
                    let _c = _.compact(all)
                    fs.writeFileSync(`${PLAYLIST}.json`, JSON.stringify(_c), 'utf-8')
                    process.exit()
                })
            });

        })
    });
});