import THREE from 'three';
import ShaderLib from './shaders/shader_lib';
import Shaders from './shaders/shaders';
import EaseNumbers from './utils/ease-numbers';

//import FxComposer from './vj-fx-layer';
import ControlPerameters from './vj-control-perameters';
//import ServerServise from 'serverService';
import FxLayer from './vj-fx-layer';
//import BlendModes from './vj-fx-layer';
// import MoonLayer from './vj-moon-layer';
// import ShapeLayer from './vj-shape-layer';
// import TextCanvas from './vj-text-layer';


import {
    createShaderPass
}
from './vj-shader-pass';

const VIDEO_WIDTH = 853;
const VIDEO_HEIGHT = 480;
//const FXComposer = require('three-fx-composer').FXComposer(THREE)

/*
OPTIONS
record
*/
class Renderer {
    constructor(parentEl, options = {}) {
        this.options = options

        this.time = 0;
        this.renderer = new THREE.WebGLRenderer({
            antialias: false,
            preserveDrawingBuffer: options.record || false
        });

        parentEl.appendChild(this.renderer.domElement);

        this._init();
    }

    _init() {
        this.camera = new THREE.OrthographicCamera(window.innerWidth / -2, window.innerHeight / 2, window.innerHeight * 0.5, window.innerHeight * -0.5, 0, 1000);
        this.scene = new THREE.Scene();
        this.scene.add(new THREE.AmbientLight(0xffffff));

        this.beatEase = EaseNumbers.addNew(0, 0.1);

    }

    setTextures(textures) {

        this._layers = []

        textures.forEach((texture, i) => {
            let _l = new FxLayer(
                texture[0],
                this.renderer,
                this.camera, {
                    index: i,
                    width: VIDEO_WIDTH,
                    texture: texture[1],
                    height: VIDEO_HEIGHT
                });
            this._layers.push(_l)
        })

        this._layersLength = this._layers.length

        let videoMaterial = new THREE.MeshBasicMaterial({
            map: this._layers[0].fbo
        });

        let quadgeometry = new THREE.PlaneBufferGeometry(VIDEO_WIDTH, VIDEO_HEIGHT, 2, 2);
        this.mesh = new THREE.Mesh(quadgeometry, videoMaterial);
        this.scene.add(this.mesh);

        this.controls = ControlPerameters.renderer
        this.controlKeys = Object.keys(ControlPerameters.renderer)
        this.controlKeysLength = this.controlKeys.length

        this.onWindowResize();
    }

    update() {
        this._threeRender();
        this.time++;
    }

    onWindowResize(w, h) {
        var w = w || window.innerWidth;
        var h = h || window.innerHeight;
        var a = h / w;
        var cameraWidth, cameraHeight;
        var scale;
        if (a < VIDEO_HEIGHT / VIDEO_WIDTH) {
            scale = w / VIDEO_WIDTH;
        } else {
            scale = h / VIDEO_HEIGHT;
        }
        cameraHeight = VIDEO_HEIGHT * scale;
        cameraWidth = VIDEO_WIDTH * scale;
        this.camera.left = cameraWidth / -2;
        this.camera.right = cameraWidth / 2;
        this.camera.top = cameraHeight / 2;
        this.camera.bottom = cameraHeight / -2;
        this.camera.updateProjectionMatrix();
        for (var i = 0; i < this._layersLength; i++) {
            this._layers[i].resize(w, h, VIDEO_WIDTH, VIDEO_HEIGHT, scale)
        }
        this.mesh.scale.x = this.mesh.scale.y = scale;

        this.renderer.setSize(cameraWidth, cameraHeight);
        /*if (this.options.record) {
            this.renderer.setSize(VIDEO_WIDTH, VIDEO_HEIGHT);
        } else {
        }*/
    }

    _threeRender() {
        for (var i = 0; i < this._layersLength; i++) {
            this._layers[i].render()
        }
        this.renderer.render(this.scene, this.camera, null, true);
    }

    get canvas() {
        return this.renderer.domElement
    }
}

export default Renderer