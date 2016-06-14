import _ from 'lodash';

import Utils from './utils/utils';
import Emitter from './utils/emitter';

import Signals from 'signals';

import ControlPerameters from './vj-control-perameters';
import VjMediaSource from './vj-mediasource';
import VjVideoCanvas from './vj-video-canvas';

import VjUtils from './vj-utils';

class VjManager {

    constructor(parent, options = {}) {
        this.options = options
        this.mediaSourcesConfigs = options.mediaSources;

        this.mediaSources = [];
        this.videoCanvases = [];
        this.playlists = [];

        this.parent = parent;
        this.boundUpdate = this._update.bind(this);


        Emitter.on('mediasource:ready', (mediasource) => {
            // this._contoller.getVo(mediasource.options)
            // .then(vo=>{
            //     mediasource.addVo(vo)
            // })
        })

        Emitter.on('controller:addVo', (mediasource) => {
            // this._contoller.getVo(mediasource.options)
            // .then(vo=>{
            //     mediasource.addVo(vo)
            // })
        })

        Emitter.on('mediasource:ending', (mediasource) => {

        })

        Emitter.on('mediasource:videostarting', (mediasource) => {
            for (let i = 0; i < this._videoCanvasesLength; i++) {
                this.videoCanvases[i].onResize(window.innerWidth, window.innerHeight);
            }
        })

        _.each(this.mediaSourcesConfigs, (mediaPlayers) => {
            let _o = _.merge(mediaPlayers, {
                readySignal: new Signals(),
                videoStartedSignal: new Signals(),
                endingSignal: new Signals(),
                endedSignal: new Signals()
            });
            _o.videoStartedSignal.iii = Math.random()
            Object.freeze(_o)
            this._createMediaSource(_o)
        })

        //the controller
        // this._contoller = options.controller
        //this._contoller.mediaSources = this.mediaSources

        /*Emitter.on(`playother`, (index) => {
            this.mediaSources.forEach((ms, i) => {
                if (i !== index) {
                    ms.play()
                }
            })
        })

        Emitter.on(`source0Video`, (direction) => {
            if (direction === 'down') {
                this.mediaSources[0].stepBack(5 * ControlPerameters.video.stepBack.value)
            } else {
                this.mediaSources[0].stepForward(5 * ControlPerameters.video.stepBack.value)
            }
        })

        Emitter.on(`source1Video`, (direction) => {
            if (direction === 'down') {
                this.mediaSources[1].stepBack(5 * ControlPerameters.video.stepBack.value)
            } else {
                this.mediaSources[1].stepForward(5 * ControlPerameters.video.stepBack.value)
            }
        })*/


        this._update();
    }

    _createMediaSource(options) {
        let _type = options.isAudio ? 'audio' : 'video'
        let el = document.createElement(_type);
        el.setAttribute('controls', 'true');
        if (options.verbose) {
            this.parent.appendChild(el);
        }
        if (!options.paused) {
            el.setAttribute('autoplay', 'true');
        }

        if (!options.isAudio) {
            this.videoCanvases.push(new VjVideoCanvas(el, options));
            this._videoCanvasesLength = this.videoCanvases.length
        }

        let _ms = new VjMediaSource(el, options)
        this.mediaSources.push(_ms);
        this.mediaSourcesLength = this.mediaSources.length
        options.controller.mediaSource = _ms
    }

    _update() {
        for (let i = 0; i < this._videoCanvasesLength; i++) {
            this.videoCanvases[i].update();
        }
        if (this.options.autoUpdate) {
            this.requestId = window.requestAnimationFrame(this.boundUpdate);
        }
    }

    onWindowResize(w, h) {
        for (let i = 0; i < this._videoCanvasesLength; i++) {
            this.videoCanvases[i].onResize(w, h);
        }
    }

    // set controller(contoller) {
    //     this._controller = contoller
    //     this._controller.addVoSignal.add(() => {

    //     })
    // }

    update() {
        this.boundUpdate();
    }

    getCanvasAt(index) {
        return this.videoCanvases[index].getCanvas();
    }

    getBuffersAt(index) {
        return this.videoCanvases[index].getBuffers();
    }

    getVideoAt(index) {
        return this.mediaSources[index].videoElement;
    }
}

export default VjManager;