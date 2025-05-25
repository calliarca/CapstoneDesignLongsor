import * as THREE from './threejs/three.module.js';
import { STLLoader } from './threejs/STLLoader.js';
import { OrbitControls } from './threejs/OrbitControls.js';

let mesh, camera, cameraTarget, scene, renderer, container;
let angles, x, y, z;

var socket = io('ws://localhost:9000', {transports: ['websocket']});

init();

let loader = new STLLoader();
loader.load( './models/untitledCube.027.stl', function( geometry ) {
    var material = new THREE.MeshLambertMaterial( { color: 0x19be26} );

    mesh = new THREE.Mesh( geometry, material);
    mesh.position.set( 0, 0, 0);
    mesh.scale.set( 0.7, 0.7, 0.7 );
    // mesh.rotation.z = 90 * Math.PI / 180; // Putar 90 derajat di sumbu X
    // mesh.rotation.y = 0 * Math.PI / 180; // Putar 90 derajat di sumbu Y
    mesh.castShadow = true;
    mesh.receiveShadow = true;

    scene.add(mesh)

    render();
} );

function init(){
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0xa0a0a0);
    scene.fog = new THREE.Fog();

    camera = new THREE.PerspectiveCamera( 100, window.innerWidth / window.innerHeight, 0.1, 10000 );
    camera.position.set( -20, 40, -60);
    scene.add(camera);

    //var helper = new THREE.GridHelper( 50, 10);
    var helper = new THREE.GridHelper( 1200, 60, 0xff4444, 0x404040);
    helper.rotation.x = 0;//Math.PI / 2;
    scene.add( helper );

    var hemiLight = new THREE.HemisphereLight( 0xffffff, 0x444444 );
    hemiLight.position.set( 0, 100, 0 );
    scene.add( hemiLight );
    var dirLight = new THREE.DirectionalLight( 0xffffff );
    dirLight.position.set( - 0, 40, 50 );
    dirLight.castShadow = true;
    dirLight.shadow.camera.top = 50;
    dirLight.shadow.camera.bottom = - 25;
    dirLight.shadow.camera.left = - 25;
    dirLight.shadow.camera.right = 25;
    dirLight.shadow.camera.near = 0.1;
    dirLight.shadow.camera.far = 200;
    dirLight.shadow.mapSize.set( 1024, 1024 );
    scene.add( dirLight );

    //scene.add(mesh);
    
    renderer = new THREE.WebGLRenderer();
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);

    document.getElementById('container').appendChild(renderer.domElement);

    var controls = new OrbitControls( camera, renderer.domElement );
    window.addEventListener( 'resize', resize, false );
}

function render(){
    socket.on('gyr-data', function(data){
        //console.log(data)
        angles = data.split(' ')
        x = parseInt(angles[1], 10)
        y = parseInt(angles[2], 10)
        z = parseInt(angles[3], 10)
    
        document.getElementById('info').innerHTML = "Koordinat X: " + x + " Y: " + y + " Z: " + z;
        mesh.rotation.set(- z * Math.PI / 180, - x * Math.PI / 180, - y * Math.PI / 180)
    })

    renderer.render( scene, camera );
    requestAnimationFrame(render);
}

function resize(){
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize( window.innerWidth, window.innerHeight );
}

//reset button
// function resetRotation() {
//     if (mesh) {
//         mesh.rotation.set(0, 0, 0); // Reset rotasi ke 0
//     }
// }

// document.getElementById('resetButton').addEventListener('click', resetRotation);
