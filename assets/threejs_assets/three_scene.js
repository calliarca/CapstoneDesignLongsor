import * as THREE from './libs/three.module.js';       // Pastikan path ini benar
import { STLLoader } from './libs/STLLoader.js';       // Pastikan path ini benar
import { OrbitControls } from './libs/OrbitControls.js'; // Pastikan path ini benar

let scene, camera, renderer, modelMesh, controls;

// Elemen DOM
const container = document.getElementById('threejs-container-gyro');
const gyroInfoElement = document.getElementById('threejs-gyro-info');

if (typeof window.globalGyroData === 'undefined') {
    console.warn("window.globalGyroData belum diinisialisasi oleh home-admin.js, three_scene.js membuat default.");
    window.globalGyroData = { x: 0, y: 0, z: 0, updated: false };
}

function initThreeJS() {
    if (!container) {
        console.error("Kontainer Three.js '#threejs-container-gyro' tidak ditemukan.");
        if (gyroInfoElement) gyroInfoElement.textContent = "Error: Kontainer 3D tidak ada.";
        return;
    }

    scene = new THREE.Scene();
    scene.background = null; // Background transparan

    camera = new THREE.PerspectiveCamera(65, container.clientWidth / container.clientHeight, 0.1, 1000);

    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.shadowMap.enabled = true;
    // === TAMBAHAN: Atur outputColorSpace untuk rendering warna yang lebih akurat ===
    renderer.outputColorSpace = THREE.SRGBColorSpace; // Sebelumnya outputEncoding
    // ========================================================================
    container.appendChild(renderer.domElement);

    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;

    // === PENYESUAIAN: Tingkatkan Intensitas Cahaya ===
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.5); // Sebelumnya 1.0, coba naikkan lagi
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 2.5); // Sebelumnya 1.5, coba naikkan signifikan
    // ================================================
    directionalLight.position.set(5, 15, 10); // Coba naikkan posisi Y dan Z lampu agar menyinari dari sudut yang lebih baik
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 1024; // Bisa dinaikkan ke 2048 untuk shadow lebih detail jika performa memungkinkan
    directionalLight.shadow.mapSize.height = 1024; // Bisa dinaikkan ke 2048
    directionalLight.shadow.camera.near = 0.5;
    directionalLight.shadow.camera.far = 50;
    directionalLight.shadow.camera.left = -15; // Sesuaikan area shadow jika model besar atau posisi lampu berubah
    directionalLight.shadow.camera.right = 15;
    directionalLight.shadow.camera.top = 15;
    directionalLight.shadow.camera.bottom = -15;
    scene.add(directionalLight);

    // Helper untuk melihat posisi directional light (opsional, untuk debugging)
    // const helper = new THREE.DirectionalLightHelper(directionalLight, 5);
    // scene.add(helper);
    // const shadowHelper = new THREE.CameraHelper(directionalLight.shadow.camera);
    // scene.add(shadowHelper);


    loadSTLModel();
    window.addEventListener('resize', onWindowResize, false);
    animate();
}

function loadSTLModel() {
    if (!scene) return;
    const loader = new STLLoader();
    const modelPath = '../assets/threejs_assets/models/untitledCube.027.stl';
    console.log(`[three_scene.js] Mencoba memuat model dari: ${modelPath}`);

    const textureLoader = new THREE.TextureLoader();
    const steelTexture = textureLoader.load(
        '../assets/threejs_assets/models/steel-texture.png',
        function (texture) {
            console.log("[three_scene.js] Tekstur steel berhasil dimuat.");
             // Atur bagaimana tekstur di-render jika terlalu gelap karena sifat SGRBColorSpace
            // texture.colorSpace = THREE.SRGBColorSpace; // Sebelumnya encoding, kini colorSpace
        },
        undefined,
        function (err) {
            console.error('[three_scene.js] Error memuat tekstur steel:', err);
        }
    );

    loader.load(
        modelPath,
        function (geometry) {
            console.log("[three_scene.js] Model STL berhasil dimuat.");

            const material = new THREE.MeshStandardMaterial({
                map: steelTexture,
                metalness: 0.7,    // Turunkan sedikit metalness jika terlalu gelap, agar lebih banyak cahaya dipantulkan difus
                roughness: 0.5,    // Sesuaikan roughness
            });

            modelMesh = new THREE.Mesh(geometry, material);
            modelMesh.scale.set(0.5, 0.5, 0.5);

            const box = new THREE.Box3().setFromObject(modelMesh);
            const modelCenter = box.getCenter(new THREE.Vector3());
            const modelSize = box.getSize(new THREE.Vector3());

            modelMesh.position.sub(modelCenter);
            modelMesh.position.y += modelSize.y / 2;

            modelMesh.castShadow = true;
            modelMesh.receiveShadow = true;
            scene.add(modelMesh);

            const targetY = modelSize.y * 0.35;
            controls.target.set(0, targetY, 0);

            const camDistanceMultiplier = 0.65;
            const camDistance = Math.max(modelSize.x, modelSize.y, modelSize.z) * camDistanceMultiplier + (modelSize.z * 0.3);

            const cameraY = targetY + modelSize.y * 0.6;
            camera.position.set(0, cameraY, camDistance);

            camera.lookAt(controls.target);
            controls.update();

            if (gyroInfoElement) gyroInfoElement.textContent = "Model dimuat.";
        },
        undefined,
        function (error) {
            console.error('[three_scene.js] Error loading STL model:', error);
            if (gyroInfoElement) gyroInfoElement.textContent = "Gagal memuat model 3D.";
        }
    );
}

function animate() {
    requestAnimationFrame(animate);
    if (controls) controls.update();

    if (window.globalGyroData && window.globalGyroData.updated && modelMesh) {
        const { x, y, z } = window.globalGyroData;
        modelMesh.rotation.set(
            -parseFloat(z) * Math.PI / 180,
            -parseFloat(x) * Math.PI / 180,
            -parseFloat(y) * Math.PI / 180
        );
    }

    if (renderer && scene && camera) {
        renderer.render(scene, camera);
    }
}

function onWindowResize() {
    if (container && camera && renderer) {
        camera.aspect = container.clientWidth / container.clientHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(container.clientWidth, container.clientHeight);
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initThreeJS);
} else {
    initThreeJS();
}