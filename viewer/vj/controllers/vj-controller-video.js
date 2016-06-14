import Q from 'bluebird';
import _ from 'lodash';

import ControllerBase from './vj-controller-base';
import Utils from '../utils/utils';
import Emitter from '../utils/emitter';

import ServerService from '../service/serverService';
import VjUtils from '../vj-utils';
class VideoController {

    constructor(options) {
        this._options = options
        if (options.isAudio) {
            this._options.audioonly = true
        }

        this.youtubeItems = [];
        this.youtubeItemIds = [];

        this.sidxs = {};
    }

    addVo() {
        console.log(this._options);
    }

    set mediaSource(ms) {
        this._mediaSource = ms
            //ms.readySignal.addOnce(this._emitVoBound)
            //ms.endingSignal.add(this._onEndingSignalBound)
    }

    nextVideo(sub) {
        return new Q((resolve, reject) => {
            return this._getPlaylistVideoIds()
                .then(playlistVideoIds => {
                    if (sub.isNewSentence) {
                        //random one
                        this._setRandomVideoIndex()
                    }
                    return this._getSidx(this.currentVideoId)
                        .then(sidx => {
                            let _references = this._currentSidx.sidx.references
                            let _indexOfCurrentRef = _references.indexOf(this._currentRef) || 0
                            let _refIndex = sub.isNewSentence ?
                                Utils.getRandomNumberRange(_references.length - 1) :
                                _indexOfCurrentRef+1

                            console.log(_refIndex);
                            let _ref = _references[_refIndex]
                            let _vo = VjUtils.voFromRef(sidx, _ref);
                            this._currentRef = _ref
                            return this._mediaSource.addVo(_vo)
                        }).finally()
                        /*let _randomRef = Utils.getRandom(sidx.sidx.references);
                            return this._mediaSource.addVo(_vo)
                        }).finally()

                    /*

                                            
                                        } else {
                                            return this._getSidx(this.currentVideoId)
                                            let _references = this._currentSidx.sidx.reference
                                            let _indexOf = _references.indexOf(this._currentRef)
                                            this._currentRef = _references[_indexOf+1]
                                            let _vo = VjUtils.voFromRef(sidx, _randomRef);
                                            return this._mediaSource.addVo(_vo)
                                        }*/
                })
        })
    }

    _updateYoutubeResults(data) {
        let _ids = [];
        if (this._options.shufflePlaylist) {
            Utils.shuffle(data.items);
        }
        _.each(data.items, (item) => {
            _ids.push(Utils.getIdFromItem(item));
        });
        this.youtubeItems = [...this.youtubeItems, ...data.items];
        this.youtubeItemIds = [...this.youtubeItemIds, ..._ids];
    }

    _getSidxAndAdd(vId) {
        return this._getSidx(vId)
            .then((sidx) => {
                this.sidxResults = [...this.sidxResults, sidx];
                return this._createReferenceIndexFromResults([sidx]);
            });
    }

    _createReferenceIndexFromResults(results) {
        return results
        _.each(results, (item) => {
            this.playlistUtils.mix(item, this.playlistReferenceIndex, this._options);
        });
        return this.sidxIndexReferences;
    }

    _getSidx(vId, options = {}) {
        options.quality = this._options.quality || '360p'
        return new Q((resolve, reject) => {
            if (this.sidxs[vId]) {
                this._currentSidx = this.sidxs[vId]
                resolve(this._currentSidx)
            } else {
                ServerService.getSidx(vId, options).then(sidx => {
                    this._currentSidx = sidx
                    this.sidxs[vId] = sidx
                    resolve(this._currentSidx)
                });
            }
        });
    }

    _getPlaylistVideoIds() {
        return new Q((resolve, reject) => {
            if (this.youtubeItemIds.length) {
                resolve(this.youtubeItemIds)
            } else {
                return Q.map(this._options.playlists, (id) => {
                    return ServerService.playlistItems({
                            playlistId: id
                        })
                        .then(results => {
                            this._updateYoutubeResults(results);
                            resolve(this.youtubeItemIds)
                        });
                }, {
                    concurrency: 3
                })
            }
        });
    }

    _setRandomVideoIndex() {
        this.currentVideoIndex = Utils.getRandomNumberRange(this.youtubeItemIds.length - 1)
        return this.currentVideoIndex
    }

    set currentVideoIndex(i) {
        this._currentVideoIndex = i
    }

    get currentVideoIndex() {
        return this._currentVideoIndex || 0
    }

    set currentVideoId(id) {
        this._currentVideoId = id
    }

    get currentVideoId() {
        return this.youtubeItemIds[this.currentVideoIndex]
    }

    _getRandomVideoId() {
        return this.youtubeItemIds[Math.floor(Math.random() * this.youtubeItemIds.length - 1)]
    }
}

export default VideoController;