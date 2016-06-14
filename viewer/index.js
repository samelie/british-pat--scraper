import VjRenderer from './vj/vj-fx-renderer'
import VJManager from './vj/vj-mediasource-manager';
import ControllerSrt from './vj/controllers/vj-controller-srt';
import ControllerVideo from './vj/controllers/vj-controller-video';
import ControllerManager from './vj/controllers/vj-controller-manager';
//import SocketIo from './vj/socket/socket';
import dat from 'dat-gui';
import maximize from 'maximize.js'
import JSONLOADER from 'load-json-xhr'


const PLAYLIST_VIDEO = "PLfLZBA-EW1RXgj4u_HEIlVeW52XnheGtd";
const PLAYLIST_AUDIO = "PLfLZBA-EW1RVTTGauj7U10Y7hTfAZ1bEb";

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


JSONLOADER(`playlists/${PLAYLIST_AUDIO}.json`, function(err, data) {
    //vj.controller = new ControllerSrt(data)
    let _srtController = new ControllerSrt(data, {isAudio: true, playlists: [PLAYLIST_AUDIO]})
    let _videoController = new ControllerVideo({isAudio: false, playlists: [PLAYLIST_VIDEO]})
    let _controller = new ControllerManager([_srtController, _videoController])
    vj = new VJManager(appEl, {
        autoUpdate: false,
        mediaSources: [{
            playlists: [PLAYLIST_AUDIO],
            controller:_srtController,
            shufflePlaylist: true,
            shuffleVideoSegments: true,
            maxVideoTime: 700,
            isAudio: true,
            quality: {
                chooseBest: true,
                resolution: '360p'
            },
            rewindable: true,
            verbose: false
        }, {
            playlists: [PLAYLIST_VIDEO],
            shufflePlaylist: true,
            controller:_videoController,
            shuffleVideoSegments: true,
            maxVideoTime: 700,
            isAudio: false,
            quality: {
                chooseBest: true,
                resolution: '360p'
            },
            rewindable: true,
            verbose: false
        }]
    });

    renderer = new VjRenderer(threeEl, OPTIONS);

    renderer.setTextures([
        vj.getBuffersAt(0)
    ]);

    window.addEventListener('resize', () => {
        let windowWidth = window.innerWidth;
        let windowHeight = window.innerHeight;
        if (vj) {
            vj.onWindowResize(windowWidth, windowHeight);
            renderer.onWindowResize(windowWidth, windowHeight);
        }
    });

    update()
})


function update() {
    vj.update();
    renderer.update();
    window.requestAnimationFrame(update);
}
