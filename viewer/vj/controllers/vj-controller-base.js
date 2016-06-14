import Q from 'bluebird';
import Signals from 'signals';

import Utils from '../utils/utils';
import Emitter from '../utils/emitter';

import ServerService from '../service/serverService';
import VjUtils from '../vj-utils';

class ControllerBase {
    constructor(subtitles, options) {
        this._addVoSignal = new Signals()
        this._emitVoBound = this._emitVo.bind(this)
        this._onEndingSignalBound = this._onEndingSignal.bind(this)
    }

    get addVoSignal() {
        return this._addVoSignal
    }

    set mediaSource(ms) {
        this._mediaSource = ms
        console.log(this._mediaSource );
        ms.readySignal.addOnce(this._emitVoBound)
        ms.endingSignal.add(this._onEndingSignalBound)
    }

    _onEndingSignal() {

    }

    addVo(){

    }

    _emitVo(mediasource) {
        this.getVo(mediasource.options).then(vo => {
            mediasource.addVo(vo)
                //Emitter.emit('controller:addvo', vo)
        })
    }
}

export default ControllerBase;