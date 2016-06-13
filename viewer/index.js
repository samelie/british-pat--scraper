import VjRenderer from './vj/vj-fx-renderer'
import VJManager from './vj/vj-mediasource-manager';
import ControllerSrt from './vj/controllers/vj-controller-srt';
//import SocketIo from './vj/socket/socket';
import dat from 'dat-gui';
import maximize from 'maximize.js'
import JSONLOADER from 'load-json-xhr'


const PLAYLIST = "PLfLZBA-EW1RWysn04AlIRl2vea-G80Hf3";

var appEl = document.getElementById('app')
var threeEl = document.getElementById('three')
var vj, renderer, recorder, recorderctx;

const FPS = 30
var now, then = 0,
    interval = 1000 / FPS,
    allowSave = true,
    _isStopped = true

maximize(appEl, appEl, () => {})

const OPTIONS = {
    record: true
}


JSONLOADER(`playlists/${PLAYLIST}.json`, function(err, data) {
    //vj.controller = new ControllerSrt(data)
    let _controller = new ControllerSrt(data)
    vj = new VJManager(appEl, {
        autoUpdate: false,
        controller: _controller,
        mediaSources: [{
            playlists: [PLAYLIST],
            shufflePlaylist: true,
            shuffleVideoSegments: true,
            maxVideoTime: 700,
            isAudio: true,
            quality: {
                chooseBest: true,
                resolution: '360p'
            },
            rewindable: true,
            verbose: true
        }/*, {
            playlists: [PLAYLIST],
            shufflePlaylist: true,
            shuffleVideoSegments: true,
            maxVideoTime: 700,
            isAudio: true,
            quality: {
                chooseBest: true,
                resolution: '360p'
            },
            rewindable: true,
            verbose: true
        }*/]
    });

    update()
})


function update() {
    vj.update();
    window.requestAnimationFrame(update);
}
