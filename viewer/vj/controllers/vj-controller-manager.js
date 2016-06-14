import Q from 'bluebird';
import _ from 'lodash';

import Utils from '../utils/utils';
import Emitter from '../utils/emitter';

class ControllerManager {

    constructor(controllers) {
        this._controllers = controllers

        this._srtController = controllers[0]
        this._videoController = controllers[1]

        Emitter.on('controller:srt:nextSub', (sub) => {
            this._onNextSub(sub)
        })
        this._init()
    }

    _onNextSub(sub) {
        this._videoController.nextVideo(sub)
    }

    _init() {}

}

export default ControllerManager;