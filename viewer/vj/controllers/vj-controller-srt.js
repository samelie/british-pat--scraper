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
const RANDOM_FACTOR = 0.5

const VERBOSE = false
class SrtController extends ControllerBase {

    constructor(subtitles, options) {
        super(subtitles, options)
        this._options = options
        if (options.isAudio) {
            this._options.audioonly = true
        }
        this._subtitles = subtitles
        this._sidxs = {}
        this._newSentenceCounter = 0
        this._videoIndex = 0
        this._subIndex = 0
        this._processing = false

        this._emitVoBound = this._emitVo.bind(this)

        this._init()
    }

    _init() {
        _.each(this._subtitles, (sub) => {
            sub.index = 0
        })
        this._getSidx(this.activeSubtitles.videoId)
    }

    /*
     */
    getVo() {
        //to make it compatible
        // let _o = {}
        // if (options.isAudio) {
        //     _o.audioonly = true
        // }

        return this._getNextSub().then(sub => {
            Emitter.emit('controller:srt:nextSub', sub)
            let _sidx = this._sidxs[sub.videoId]
            return this._getSegmentFromSub(_sidx, sub)
        })
    }

    //*************
    //overridde
    //*************

    _onEndingSignal() {
        this.getVo()
            .then(vo => {
                this._mediaSource.addVo(vo)
            })
    }

    _getSegmentFromSub(sidx, sub) {
        let _sidx = sidx.sidx

        //** store active ref
        this._activeRef = _sidx.references[sub.refIndex || 0]

        let _vo = VjUtils.voFromRef(sidx, this._activeRef)
        _vo.seekTime = sub.seekTime
        if (VERBOSE) {
            console.log("------------");
            console.log(sub.refIndex);
            console.log(sub.text);
            console.log(sub);
            console.log(_vo);
            console.log("------------");
        }
        return _vo
    }


    _getSidx(id, options = {}) {
        return ServerService.getSidx(id, options)
    }

    /*
    Save the SIDX
    */
    _newSidx(id, options = {}) {
        //depends if it has audio or not
        return this._getSidx(id, options).then(data => {
            //store the sidx for a video id
            this._sidxs[id] = data

            //this._matchSubsToRefs(id, data)

            return data
        })
    }

    _matchSubsToRefs(id, sidx) {
        let _subs = _.filter(this._subtitles, { videoId: id })[0]
        _.each(sidx.sidx.references, (ref, i) => {
            let _refS = ref.startTimeSec
            let _refD = ref.durationSec
            let _maxSegDuration = _refS + _refD
            _.each(_subs.subs, (sub) => {
                if (sub.startTime > _refS && sub.startTime < _maxSegDuration) {
                    sub.refIndex = i
                    sub.videoId = id
                    if (sub.startTime > _maxSegDuration - PROXIMITY_MARGIN) {
                        sub.refIndex = i + 1
                    } else {
                        sub.seekTime = sub.startTime - ref.startTimeSec
                    }
                }
            })
        })
    }

    // get currentSub() {
    //     return new Q((resolve, reject) => {
    //         this._currentSub = this._currentSub || this._getNextSub()
    //         return this._currentSub
    //     })
    // }

    /*
    Decide whether it should be a new sentence or a phrase
    */
    _getNextSub() {
        let _m = (this._newSentenceCounter % SENTENCE_FREQ === 0)
        let _random = Math.random()
        this._newSentenceCounter++
            return _m ? this._findNewSentence(true) : this._nextRef(_random)
    }

    /*
    uses activeVideoId
    */
    _prepareSubWithRef(sub) {
        let sidx = this.activeSidx
        let id = this.activeVideoId
        let _references = sidx.sidx.references
        let _indexOf = _references.indexOf(this._activeRef)

        _.each(sidx.sidx.references, (ref, i) => {
            let _refS = ref.startTimeSec
            let _refD = ref.durationSec
            let _maxSegDuration = _refS + _refD
            if (sub.startTime > _refS && sub.startTime < _maxSegDuration) {
                sub.refIndex = Math.max(i, _indexOf + 1)
                sub.videoId = id
                if (sub.startTime > _maxSegDuration - PROXIMITY_MARGIN) {
                    sub.refIndex += 1
                } else {
                    sub.seekTime = sub.startTime - ref.startTimeSec
                }
            }
        })
        return sub
    }

    /*
    Here we look at the subtitles for a new Sentence
    And go to that ref
    */
    _findNewSentence(randomSentence = false) {
        return new Q((resolve, reject) => {
            let _sub;
            if (randomSentence) {
                this._randomizeVideoIndex()
            }

            let _videoId = this.activeVideoId
            let _findSub = () => {
                _.each(this.activeSubtitles.subs, (sub, i) => {
                    if (!_sub) {
                        if (!sub.used && sub.isNewSentence) {
                            _sub = sub
                            this.activeSubtitles.index = i
                            _sub.used = true
                            this._prepareSubWithRef(_sub)
                        }
                    }
                })
                resolve(_sub)
            }

            if (!this._sidxs[_videoId]) {
                this._newSidx(_videoId, this._options)
                    .then(sidx => {
                        return _findSub()
                    })
            } else {
                _findSub()
            }
        })
    }


    _nextRef(randomFactor = RANDOM_FACTOR) {
        return new Q((resolve, reject) => {

            randomFactor = 0.8

            let _sidx = this.activeSidx
            let _references = _sidx.sidx.references
            let _indexOf = _references.indexOf(this._activeRef)
            let _sub, _videoSubs, _videoIndex, _ref, _videoId, _subIndex


            /*   let _findSub = (videoSubs, subIndex) => {
                _sub = videoSubs[subIndex]
                let _i = subIndex
                while(videoSubs[_i].isNewSentence || videoSubs[_i].used){
                    _sub = videoSubs[_i]
                    _i++
                }
                _sub.videoId = _videoId
                _sub.used = true
                resolve(_sub)
            }

            if (randomFactor > 0.75) {
                //random video from playlist
                _videoIndex = Math.floor(Math.random() * this._subtitles.length)
                _videoId = this._subtitles[_videoIndex].videoId
                this._subtitles[_videoIndex].index++;
                _subIndex = this._subtitles[_videoIndex].index
                    //the subs
                _videoSubs = this._subtitles[_videoIndex].subs


                if (!this._sidxs[_videoId]) {
                    this._newSidx(_videoId, this._options)
                        .then(sidx => {
                            return _findSub(_videoSubs, _subIndex)
                        })
                } else {
                    _findSub(_videoSubs, _subIndex)
                }

            } else if (randomFactor > 0.25 && randomFactor < 0.5) {
                //clone and shuffle
                _videoSubs = Utils.shuffle(this.activeSubtitles.subs.slice(0))
*/
            /*
            Just move down subIndex
            */
            // } else {

            _videoSubs = this.activeSubtitles.subs
            _sub = _videoSubs[this.activeSubtitles.index + 1] || _videoSubs[this.activeSubtitles]

            _ref = _references[_indexOf + 1]
            if (!_ref) {
                throw new Error('Out of Refs!')
                return
            }
            _sub.videoId = this.activeVideoId
            _sub.refIndex = _indexOf + 1
            _sub.used = true

            resolve(_sub)

            //_nextSub.seekTime = 0
            /*console.log("))))))))))))");
            console.log(this.activeVideoId, this.activeSubtitles.index, randomFactor);
            console.log("))))))))))))");*/
            //}

        })

    }

    _nextSub(randomFactor = RANDOM_FACTOR) {
        return new Q((resolve, reject) => {
            randomFactor = 0.1

            let _sub, _videoSubs, _videoId, _videoIndex = this.activeVideoId;
            _videoId = this.activeVideoId
            if (randomFactor > 0.75) {
                //random video from playlist
                _videoIndex = Math.floor(Math.random() * this._subtitles.length)
                _videoId = this._subtitles[_videoIndex].videoId
                    //the subs
                _videoSubs = this._subtitles[_videoIndex].subs
            } else if (randomFactor > 0.25 && randomFactor < 0.5) {
                //clone and shuffle
                _videoSubs = Utils.shuffle(this.activeSubtitles.subs.slice(0))
            } else {
                _videoSubs = this.activeSubtitles.subs

                let _nextSub = _videoSubs[this.activeSubtitles.index + 1] || _videoSubs[this.activeSubtitles]
                _nextSub.refIndex += 1
                _nextSub.seekTime = 0
                if (VERBOSE) {
                    console.log("))))))))))))");
                    console.log(this.activeVideoId, this.activeSubtitles.index, randomFactor);
                    console.log("))))))))))))");
                }
            }

            let _findSub = () => {
                _.each(_videoSubs, (sub, i) => {
                    if (!_sub) {
                        if (!sub.used && !sub.isNewSentence) {
                            _sub = sub
                            this.activeSubtitles.index = i
                            if (VERBOSE) {
                                console.log(">>>>>>>>>>>");
                                console.log(this.activeVideoId, this.activeSubtitles.index, randomFactor);
                                console.log("refIndex", _sub.refIndex);
                                console.log(">>>>>>>>>>>");
                            }
                            _sub.used = true
                        }
                    }
                })
                _sub.videoId = _videoId
                resolve(_sub)
            }

            if (!this._sidxs[_videoId]) {
                this._newSidx(_videoId, this._options)
                    .then(sidx => {
                        return _findSub()
                    })
            } else {
                _findSub()
            }
        })
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

    get activeSubtitles() {
        return this._subtitles[this._videoIndex]
    }

    get activeVideoId() {
        return this.activeSubtitles.videoId
    }

    get activeSidx() {
        return this._sidxs[this.activeVideoId] || null
    }
}

export default SrtController;