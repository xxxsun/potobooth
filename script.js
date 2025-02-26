// Inisialisasi Variabel
let video = document.getElementById('video');
let selectedBg = document.getElementById('selected-bg');
let photo = document.getElementById('photo');
let cropper;
let faceLandmarksDetector;
let currentProps = [];
let isARMode = false;
let renderer, scene, camera;

// Konfigurasi Firebase (Ganti dengan milik Anda)
const firebaseConfig = {
    apiKey: "AIzaSyD7US9GSq4tBMYofZuHdT6DnBSgcWcjL24",
    authDomain: "ptbt-d1c30.firebaseapp.com",
    projectId: "ptbt-d1c30",
    storageBucket: "ptbt-d1c30.firebasestorage.app",
    messagingSenderId: "935684465833",
    appId: "1:935684465833:web:1b8e3bea4ac8a18252b5b8"
};

// Inisialisasi Firebase
firebase.initializeApp(firebaseConfig);
const storage = firebase.storage();

// Fungsi Utama
async function loadFaceMesh() {
    faceLandmarksDetector = await faceLandmarksDetection.load(
        faceLandmarksDetection.SupportedPackages.mediapipeFacemesh,
        { maxFaces: 1 }
    );
}

async function startCamera() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        video.srcObject = stream;
        await loadFaceMesh();
        initAR();
        detectFaceMesh();
    } catch (err) {
        console.error("Error accessing camera:", err);
    }
}

function uploadProp(event) {
    const file = event.target.files[0];
    const reader = new FileReader();
    reader.onload = (e) => {
        document.getElementById('cropper-modal').style.display = 'block';
        cropper = new Cropper(document.getElementById('cropper-image'), {
            aspectRatio: NaN,
            viewMode: 1
        });
        document.getElementById('cropper-image').src = e.target.result;
    };
    reader.readAsDataURL(file);
}

function cropImage() {
    const canvas = cropper.getCroppedCanvas();
    const croppedUrl = canvas.toDataURL('image/png');
    const img = document.createElement('img');
    img.src = croppedUrl;
    img.classList.add('prop-preview');
    img.onclick = () => selectProp(croppedUrl);
    document.getElementById('custom-props').appendChild(img);
    document.getElementById('cropper-modal').style.display = 'none';
}

function selectProp(url) {
    if (isARMode) {
        load3DModel(url);
    } else {
        const img = new Image();
        img.src = url;
        img.classList.add('prop');
        currentProps.push(img);
        document.getElementById('video-container').appendChild(img);
    }
}

function initAR() {
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(75, 640/480, 0.1, 1000);
    renderer = new THREE.WebGLRenderer({ alpha: true });
    renderer.setSize(640, 480);
    document.getElementById('three-container').appendChild(renderer.domElement);
    
    // Contoh model 3D
    const geometry = new THREE.BoxGeometry(1, 1, 1);
    const material = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
    const cube = new THREE.Mesh(geometry, material);
    scene.add(cube);
    camera.position.z = 5;

    function animate() {
        requestAnimationFrame(animate);
        cube.rotation.x += 0.01;
        cube.rotation.y += 0.01;
        renderer.render(scene, camera);
    }
    animate();
}

async function detectFaceMesh() {
    if (!faceLandmarksDetector) return;
    
    const faces = await faceLandmarksDetector.estimateFaces(video);
    if (faces.length > 0) {
        const keypoints = faces[0].keypoints;
        currentProps.forEach((prop, index) => {
            if (index === 0) { // Contoh: Prop pertama di kepala
                const nose = keypoints[2];
                prop.style.left = `${nose.x - 50}px`;
                prop.style.top = `${nose.y - 100}px`;
            }
        });
    }
    requestAnimationFrame(detectFaceMesh);
}

function takePhoto() {
    setTimeout(() => {
        const canvas = document.createElement('canvas');
        canvas.width = 640;
        canvas.height = 480;
        const ctx = canvas.getContext('2d');
        
        // Gambar background
        ctx.drawImage(selectedBg, 0, 0, 640, 480);
        
        // Gambar video
        ctx.drawImage(video, 0, 0);
        
        // Gambar props
        currentProps.forEach(prop => {
            ctx.drawImage(prop, parseInt(prop.style.left), parseInt(prop.style.top));
        });

        photo.src = canvas.toDataURL('image/png');
        photo.style.display = 'block';
    }, 3000);
}

function downloadPhoto() {
    const link = document.createElement('a');
    link.download = 'photobooth-ar.png';
    link.href = photo.src;
    link.click();
}

function uploadToCloud() {
    const storageRef = storage.ref();
    const fileRef = storageRef.child(`photos/${Date.now()}.png`);
    
    fetch(photo.src)
        .then(res => res.blob())
        .then(blob => {
            fileRef.put(blob).then(snapshot => {
                snapshot.ref.getDownloadURL().then(url => {
                    alert(`Foto tersimpan di: ${url}`);
                });
            });
        });
}

function toggleAR() {
    isARMode = !isARMode;
    document.getElementById('three-container').style.display = isARMode ? 'block' : 'none';
    document.querySelectorAll('.prop').forEach(prop => prop.style.display = isARMode ? 'none' : 'block');
}

// Event Listener untuk Background
function uploadBackground(event) {
    const file = event.target.files[0];
    const reader = new FileReader();
    reader.onload = (e) => {
        selectedBg.src = e.target.result;
    };
    reader.readAsDataURL(file);
}

async function searchBackground() {
    const query = document.getElementById('search-input').value;
    if (!query) {
        alert("Masukkan kata kunci pencarian!");
        return;
    }

    const url = `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=10`;
    try {
        const response = await fetch(url, {
            headers: {
                Authorization: HBQ7GM9g3eK9LncV6ukYCnA3WSBzNRSzzkLPTeP0l3R0JH9Cq4FhCmxR
            }
        });

        if (!response.ok) {
            throw new Error(`Error ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();

        // Tampilkan hasil pencarian
        const resultsContainer = document.getElementById('search-results');
        resultsContainer.innerHTML = ""; // Bersihkan hasil sebelumnya

        if (data.photos && data.photos.length > 0) {
            data.photos.forEach(photo => {
                const img = document.createElement('img');
                img.src = photo.src.medium; // Ukuran medium
                img.alt = photo.alt;
                img.onclick = () => selectBackground(photo.src.large); // Gunakan ukuran besar saat dipilih
                resultsContainer.appendChild(img);
            });
        } else {
            resultsContainer.innerHTML = "<p>Tidak ada hasil ditemukan.</p>";
        }
    } catch (error) {
        console.error("Error fetching background:", error);
        alert("Gagal memuat hasil pencarian. Silakan coba lagi.");
    }
}

function selectBackground(url) {
    selectedBg.src = url;
    selectedBg.style.display = 'block';
}
