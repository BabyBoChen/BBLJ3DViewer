let renderer = null;
let scene = null;
let camera = null;
const MAX_FOV = 240;
window.displayWidth = 0;
window.displayHeight = 0;

const models = [];

let isPlaying = false;

async function init() {
    renderer = createRenderer();
    let widthHeight = calcScreenResolution(renderer);
    window.displayWidth = widthHeight.x;
    window.displayHeight = widthHeight.y;
    scene = createScene();
    camera = createCamera();
    let floor = await createFloor('Gltf/World/floor.glb');
    scene.add(floor.gltfFile.scene);

    addLight(scene);

    addWindowEventListener(renderer, camera);

    let viewModel = await chrome.webview.hostObjects.vm;
    let modelPath = await viewModel.ModelPath;

    if (modelPath) {
        let gltfModel = await loadModel(modelPath, 'gltfModel');
        scene.add(gltfModel.gltfFile.scene);
        models.push(gltfModel.gltfFile);
    }    

    document.body.appendChild(renderer.domElement);

    isPlaying = true;
}

/**
 * @returns {WebGLRenderer}
 */
function createRenderer() {
    let r = new WebGLRenderer();
    r.shadowMap.enabled = true;
    r.shadowMap.type = PCFSoftShadowMap;
    r.outputEncoding = sRGBEncoding;
    return r;
}

/**
 * @param {WebGLRenderer} renderer
 * @returns {Vector2}
 */
function calcScreenResolution(renderer) {
    let screenWidth = window.innerWidth;
    let screenHeight = window.innerHeight;
    let displayW = 0;
    let displayH = 0;

    if (screenWidth / screenHeight >= 16 / 9) {
        renderer.setSize(screenHeight * 16 / 9, screenHeight);
        displayW = screenHeight * 16 / 9;
        displayH = screenHeight;
    } else {
        renderer.setSize(screenWidth, screenWidth * 9/16);
        displayW = screenWidth;
        displayH = screenWidth * 9 / 16;
    }
    return new Vector2(displayW, displayH);
}

/** @returns {Scene} */
function createScene() {
    let s = new Scene();
    s.background = new Color('skyblue');
    return s;
}

/** @returns {PerspectiveCamera} */
function createCamera() {
    let cam = new PerspectiveCamera(80, 16/9, 0.1, 1000);
    cam.position.z = 7;
    cam.position.y = 4;
    cam.rotation.deltaX = 0;
    cam.rotation.deltaWorldY = 0;
    //cam.rotation.deltaZ = 0;
    //cam.moving = true;
    return cam;
}

/**
 * @param {string} url
 * @returns {GLTFModel}
 */
async function createFloor(url) {
    let gltf = new GLTFModel();
    let loader = new GLTFLoader();
    await loader.loadAsync(url).then(function (model) {
        gltf.gltfFile = model;
        gltf.name = "floor";
        model.scene.traverse(function (node) {
            if (node instanceof Mesh) {
                node.receiveShadow = true;
                gltf.meshes.push(node);
            }
        });
    });
    return gltf;
}

/**
 * @param {string} url
 * @param {string} name
 * @returns {GLTFModel}
 */
async function loadModel(url, name='unnamed') {
    let gltf = new GLTFModel();
    let loader = new GLTFLoader();
    await loader.loadAsync(url).then(function (model) {
        gltf.gltfFile = model;
        gltf.name = name;
        model.scene.traverse(function (node) {
            if (node instanceof Mesh) {
                node.castShadow = true;
                node.receiveShadow = true;
                gltf.meshes.push(node);
            }
        });
    });
    return gltf;
}

/**
 * @param {Scene} scene
 */
function addLight(scene) {
    let ambientLight = new AmbientLight('#fff', 0.5);
    scene.add(ambientLight);
    let pointLight = new SpotLight("#fff");
    pointLight.castShadow = true;
    pointLight.shadow.mapSize.width = 512;
    pointLight.shadow.mapSize.height = 512;
    pointLight.shadow.camera.near = 0.5;
    pointLight.shadow.camera.far = 30;
    pointLight.position.set(-10, 15, 0);;
    pointLight.target.position.set(0, 0, 0);
    pointLight.distance = 25;
    pointLight.intensity = 2;
    scene.add(pointLight.target);
    scene.add(pointLight);
    let sphereSize = 1;
    let pointLightHelper = new PointLightHelper(pointLight, sphereSize);
    //scene.add(pointLightHelper);
}

function dispose() {
    isPlaying = false;
    const cleanMaterial = material => {
        material.dispose();
        // dispose textures
        for (const key of Object.keys(material)) {
            const value = material[key];
            if (value && typeof value === 'object' && 'minFilter' in value) {
                value.dispose();
            }
        }
    };
    if (scene instanceof Scene) {
        scene.traverse(object => {
            if (!object.isMesh) {
                return;
            }
            object.geometry.dispose();
            if (object.material.isMaterial) {
                cleanMaterial(object.material);
            } else {
                for (const material of object.material) {
                    cleanMaterial(material);
                }
            }
        });
    }
    if (renderer instanceof WebGLRenderer) {
        renderer.dispose();
    }
    renderer = null;
    scene = null;
    camera = null;
    window.displayWidth = 0;
    window.displayHeight = 0;
    models.splice(0, models.length);
}

/**
 * @param {WebGLRenderer} renderer
 * @param {PerspectiveCamera} camera
 */
function addWindowEventListener(renderer, camera) {
    window.addEventListener("resize", function () {
        let widthHeight = calcScreenResolution(renderer);
        window.displayWidth = widthHeight.x;
        window.displayHeight = widthHeight.y;
    });

    const worldX = new Vector3(1, 0, 0);
    const worldY = new Vector3(0, 1, 0);
    const worldZ = new Vector3(0, 0, 1);
    let beginAngleX;
    let beginAngleY;
    let movingAngle = false;

    window.addEventListener("mousedown", function (mouseEvent) {
        beginAngleX = mouseEvent.clientX;
        beginAngleY = mouseEvent.clientY;
        movingAngle = true;
    });

    window.addEventListener("mouseup", function (mouseEvent) {
        movingAngle = false;
    });

    window.addEventListener("mousemove", function (mouseEvent) {

        let angleX = (mouseEvent.clientX - beginAngleX) / window.displayWidth * 2;
        let angleY = (mouseEvent.clientY - beginAngleY) / window.displayHeight * 2;

        if (movingAngle) {
            camera.rotateOnWorldAxis(worldY, angleX);
            camera.rotation.deltaWorldY += angleX;
            if (Math.abs(radians_to_degrees(camera.rotation.deltaWorldY)) >= 360) {
                if (radians_to_degrees(camera.rotation.deltaWorldY) > 0) {
                    camera.rotation.deltaWorldY -= Math.PI * 2;
                } else if (radians_to_degrees(camera.rotation.deltaWorldY) < 0) {
                    camera.rotation.deltaWorldY += Math.PI * 2;
                }
            }
            //console.log(radians_to_degrees(camera.rotation.deltaWorldY));
            beginAngleX = mouseEvent.clientX;
            if (Math.abs(radians_to_degrees(camera.rotation.deltaX + angleY)) <= 60) {
                camera.rotateX(angleY);
                camera.rotation.deltaX += angleY;
            }
            //console.log(radians_to_degrees(camera.rotation.deltaX));
            beginAngleY = mouseEvent.clientY;
        }
    });

    window.addEventListener("wheel", function (e) {
        if (e.deltaY < 0) {
            if (camera.fov >= 15) {
                camera.fov -= 3;
            }
        } else if (e.deltaY > 0) {
            if (camera.fov <= MAX_FOV) {
                camera.fov += 3;
            }
        }
        camera.updateProjectionMatrix();
    });

    window.addEventListener('keydown', function (evt) {
        console.log(evt.key);
        if (evt.key == 'w') {
            camera.position.z -= 1;
        } else if (evt.key == 's') {
            camera.position.z += 1;
        } else if (evt.key == 'ArrowUp') {
            camera.position.y += 1;
        } else if (evt.key == 'ArrowDown') {
            camera.position.y -= 1;
        }
    });

    window.addEventListener('beforeunload', function (e) {
        dispose();
    });
}

function animate() {
    models.forEach(model => {
        if (model) {
            model.scene.rotateY(degrees_to_radians(-1));
        };        
    });

    if(isPlaying){        
        renderer.render(scene, camera);
        requestAnimationFrame(animate);
    }
}

window.onload = async function () {
    await init();
    animate();
};

async function reloadGLTFModel() {
    dispose();
    let canvas = document.querySelector('canvas');
    canvas.remove();
    await init();
    animate();
}

