import Q from 'bluebird';
import Signals from 'signals';

import Utils from '../utils/utils';
import Emitter from '../utils/emitter';

import ServerService from '../service/serverService';
import VjUtils from '../vj-utils';

class ControllerBase {
	constructor(subtitles, options) {
		this._addVoSignal = new Signals()
	}

	get addVoSignal(){
		return this._addVoSignal
	}
}

export default ControllerBase;
