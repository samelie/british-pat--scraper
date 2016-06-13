import Q from 'bluebird';
import _ from 'lodash';

import ControllerBase from './vj-controller-base';
import Utils from '../utils/utils';
import Emitter from '../utils/emitter';

import ServerService from '../service/serverService';
import VjUtils from '../vj-utils';

const SENTENCE_FREQ = 4
    //sometimes the sub start is really close to the next buffer
const PROXIMITY_MARGIN = 1

class SrtController extends ControllerBase {

    constructor(subtitles, options) {
        super(subtitles, options)
        this._options = options
        this._subtitles = subtitles
        this._sidxs = {}
            //this._usedSubs = {}
        this._newSentenceCounter = 0
        this._videoIndex = 0
        this._subIndex = 0
        this._processing = false

        this._emitVoBound = this._emitVo.bind(this)

        this._init()
    }

    _init() {
        this._getSidx(this.activeVideo.videoId)
    }

    getVo(options) {
        //to make it compatible
        let _o = {}
        if (options.isAudio) {
            _o.audioonly = true
        } else {

        }
        let _key = this._getSidxKey(this.activeId, options)
        let _sidx = this._sidxs[_key] || null
        let _sub = this.currentSub
        return new Q((resolve, reject) => {
            if (_sidx) {
                resolve(this._getSegmentFromSub(_sidx, _sub))
            } else {
                this._newSidx(this.activeId, _o)
                    .then((sidx) => {
                        _sidx = sidx
                        this._matchSubsToRefs(_sidx)
                        resolve(this._getSegmentFromSub(_sidx, _sub))
                    })
            }
        })
    }

    set mediaSources(mediaSources) {
        this._mediasources = mediaSources
        mediaSources.forEach(mediaSource => {
            mediaSource.readySignal.addOnce(this._emitVoBound)
        })

        //audio is master
        this._mediasources[0].endingSignal.add(() => {
            this._getNextSub()
            this._mediasources.forEach((mediasource) => {
                this.getVo(mediasource.options)
                    .then(vo => {
                        mediasource.addVo(vo)
                            //Emitter.emit('controller:addvo', vo)
                    })
            })
        })
    }

    update() {

    }

    _emitVo(mediasource) {
        this.getVo(mediasource.options).then(vo => {
            mediasource.addVo(vo)
                //Emitter.emit('controller:addvo', vo)
        })
    }

    _getSegmentFromSub(sidx, sub) {
        let _sidx = sidx.sidx
        let { startTime, endTime } = sub
        let _ref = _sidx.references[sub.refIndex]
        let _vo = VjUtils.voFromRef(sidx, _ref)
        _vo.seekTime = sub.seekTime
            //console.log(_vo);
        console.log("------------");
        console.log(sub.text);
        console.log(sub);
        console.log(_vo);
        console.log("------------");
        return _vo
    }


    _getSidx(id, options = {}) {
        return ServerService.getSidx(id, options)
    }

    _getSidxKey(id, options) {
        let _type = options.isAudio || false
        return `${id}_${_type}`
    }

    _newSidx(id, options = {}) {
        //depends if it has audio or not
        let _key = this._getSidxKey(id, options)
        return this._getSidx(id, options).then(data => {
            //store the sidx for a video id
            this._sidxs[_key] = data

            return data
        })
    }

    get currentSub() {
        this._currentSub = this._currentSub || this._getNextSub()
        return this._currentSub
    }

    _getNextSub() {
        this._currentSub = (this._newSentenceCounter % SENTENCE_FREQ === 0) ? this._findNewSentence() : this._nextSub()
        this._newSentenceCounter++
            return this._currentSub
    }

    _matchSubsToRefs(sidx) {
    	console.log(sidx);
        _.each(sidx.sidx.references, (ref, i) => {
            let _refS = ref.startTimeSec
            let _refD = ref.durationSec
            let _maxSegDuration = _refS + _refD
            _.forIn(this.activeVideo, (sub) => {
                if (sub.startTime) {
                    if (sub.startTime > _refS && sub.startTime < _maxSegDuration) {
                        sub.refIndex = i
                        sub.videoId = i
                        if (sub.startTime > _maxSegDuration - PROXIMITY_MARGIN) {
                            sub.refIndex = i + 1
                        } else {
                            sub.seekTime = sub.startTime - ref.startTimeSec
                        }
                    }
                }
            })
        })
    }

    _findNewSentence(randomSentence = false) {
        let _sub;
        if(randomSentence){
        	this._randomizeVideoIndex()
        }
        let _keys = Object.keys(this.activeVideo)
        _.each(this.activeVideo, (sub,key) => {
        	let _index = _keys.indexOf(key)
            if (!_sub) {
                if (!sub.used && sub.isNewSentence) {
                    _sub = sub
                    _sub.used = true
                    this.activeVideo.activeSubIndex = _index

                    /*if (this.audioSidx) {
                        this.audioSidx.references[_sub.refIndex].used = true
                    }*/
                }
            }
        })

        if (!_sub) {
            this._nextVideo()
            return this._findNewSentence()
        }
        console.log(this.audioSidx);
        //_sub.videoId = this.audioSidx.videoId
        return _sub
    }

    _nextSub(random = true) {
        let _sub;
        let _r = Math.floor(Math.random() * this._subtitles.length)
        let _videoSubs = this._subtitles[_r]

        _.each(_videoSubs, (sub,key) => {
            if (!_sub) {	
                if (!sub.used && !sub.isNewSentence) {
                    _sub = sub
                    _sub.used = true

                    /*if (this.audioSidx) {
                        this.audioSidx.references[_sub.refIndex].used = true
                    }*/
                }
            }
        })

        return _sub
    }

    _nextVideo() {
        this._videoIndex++;
        if (this._videoIndex > this._subtitles.length - 1) {
            this._videoIndex = 0
        }
    }

    _randomizeVideoIndex() {
        this._videoIndex = Math.floor(Math.random() * this._subtitles.length)
    }

    get activeVideo() {
        return this._subtitles[this._videoIndex]
    }

    get activeId() {
        return this.activeVideo.videoId
    }

    get activeSidx() {
        let _key = this._getSidxKey(this.activeId, options)
        let _sidx = this._sidxs[_key] || null
        return this._activeSidx
    }

    get audioSidx() {
        let _key = this._getSidxKey(this.activeId, { isAudio: true })
        return this._sidxs[_key]
    }

    get videoSidx() {
        let _key = this._getSidxKey(this.activeId, { isAudio: false })
        return this._sidxs[_key]
    }


}

export default SrtController;