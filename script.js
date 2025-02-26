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
    storageBucket: "ptbt-d1c30.appspot.com",
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
        alert("Tidak dapat mengakses kamera. Mohon berikan izin akses kamera.");
    }
}

function uploadProp(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (e) => {
        document.getElementById('cropper-modal').style.display = 'block';
        if (cropper) {
            cropper.destroy();
        }
        document.getElementById('cropper-image').src = e.target.result;
        cropper = new Cropper(document.getElementById('cropper-image'), {
            aspectRatio: NaN,
            viewMode: 1
        });
    };
    reader.readAsDataURL(file);
}

function cropImage() {
    if (!cropper) return;
    
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
        img.style.position = 'absolute';
        img.style.left = '50px';
        img.style.top = '50px';
        img.style.width = '100px';
        img.style.zIndex = '10';
        currentProps.push(img);
        document.getElementById('video-container').appendChild(img);
    }
}

function load3DModel(url) {
    // Implementasi untuk memuat model 3D
    const texture = new THREE.TextureLoader().load(url);
    const geometry = new THREE.PlaneGeometry(2, 2);
    const material = new THREE.MeshBasicMaterial({ 
        map: texture, 
        transparent: true,
        side: THREE.DoubleSide
    });
    const plane = new THREE.Mesh(geometry, material);
    scene.add(plane);
    plane.position.z = -2;
}

function initAR() {
    if (renderer) return; // Hindari inisialisasi berulang
    
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(75, 640/480, 0.1, 1000);
    renderer = new THREE.WebGLRenderer({ alpha: true });
    renderer.setSize(640, 480);
    const container = document.getElementById('three-container');
    container.innerHTML = '';
    container.appendChild(renderer.domElement);
    
    camera.position.z = 5;

    function animate() {
        requestAnimationFrame(animate);
        renderer.render(scene, camera);
    }
    animate();
}

async function detectFaceMesh() {
    if (!faceLandmarksDetector || !video.readyState) {
        requestAnimationFrame(detectFaceMesh);
        return;
    }
    
    try {
        const faces = await faceLandmarksDetector.estimateFaces({
            input: video
        });
        
        if (faces.length > 0) {
            const keypoints = faces[0].keypoints;
            const nose = keypoints.find(kp => kp.name === 'noseTip') || keypoints[1];
            const leftEye = keypoints.find(kp => kp.name === 'leftEye') || keypoints[33];
            const rightEye = keypoints.find(kp => kp.name === 'rightEye') || keypoints[263];
            
            currentProps.forEach((prop) => {
                // Posisikan di atas kepala
                if (nose && leftEye && rightEye) {
                    const x = nose.x;
                    const y = nose.y - 100; // Posisi di atas kepala
                    
                    prop.style.left = `${x - prop.width/2}px`;
                    prop.style.top = `${y - prop.height/2}px`;
                }
            });
        }
    } catch (error) {
        console.error("Error detecting face:", error);
    }
    
    requestAnimationFrame(detectFaceMesh);
}

function takePhoto() {
    const countdown = document.createElement('div');
    countdown.classList.add('countdown');
    countdown.style.position = 'absolute';
    countdown.style.top = '50%';
    countdown.style.left = '50%';
    countdown.style.transform = 'translate(-50%, -50%)';
    countdown.style.fontSize = '100px';
    countdown.style.color = 'white';
    countdown.style.textShadow = '0 0 10px black';
    countdown.style.zIndex = '999';
    document.getElementById('video-container').appendChild(countdown);
    
    let count = 3;
    countdown.textContent = count;
    
    const interval = setInterval(() => {
        count--;
        if (count > 0) {
            countdown.textContent = count;
        } else {
            clearInterval(interval);
            countdown.remove();
            capturePhoto();
        }
    }, 1000);
}

function capturePhoto() {
    const canvas = document.createElement('canvas');
    canvas.width = 640;
    canvas.height = 480;
    const ctx = canvas.getContext('2d');
    
    // Gambar background jika ada
    if (selectedBg.src) {
        ctx.drawImage(selectedBg, 0, 0, 640, 480);
    } else {
        // Background putih jika tidak ada
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, 640, 480);
    }
    
    // Gambar video
    ctx.drawImage(video, 0, 0, 640, 480);
    
    // Gambar props
    currentProps.forEach(prop => {
        if (prop.style.display !== 'none') {
            const x = parseInt(prop.style.left) || 0;
            const y = parseInt(prop.style.top) || 0;
            const width = parseInt(prop.style.width) || prop.width || 100;
            const height = parseInt(prop.style.height) || prop.height || 100;
            
            ctx.drawImage(prop, x, y, width, height);
        }
    });

    // Jika mode AR, ambil screenshot dari renderer
    if (isARMode && renderer) {
        const threeCanvas = renderer.domElement;
        ctx.drawImage(threeCanvas, 0, 0, 640, 480);
    }

    photo.src = canvas.toDataURL('image/png');
    photo.style.display = 'block';
}

function downloadPhoto() {
    if (!photo.src || photo.src === '') {
        alert('Ambil foto terlebih dahulu!');
        return;
    }
    
    const link = document.createElement('a');
    link.download = `photobooth-ar-${Date.now()}.png`;
    link.href = photo.src;
    link.click();
}

function uploadToCloud() {
    if (!photo.src || photo.src === '') {
        alert('Ambil foto terlebih dahulu!');
        return;
    }
    
    const storageRef = storage.ref();
    const fileRef = storageRef.child(`photos/${Date.now()}.png`);
    
    // Tampilkan indikator loading
    const loadingMsg = document.createElement('div');
    loadingMsg.textContent = 'Uploading...';
    loadingMsg.style.position = 'fixed';
    loadingMsg.style.top = '50%';
    loadingMsg.style.left = '50%';
    loadingMsg.style.transform = 'translate(-50%, -50%)';
    loadingMsg.style.padding = '20px';
    loadingMsg.style.background = 'rgba(0,0,0,0.7)';
    loadingMsg.style.color = 'white';
    loadingMsg.style.borderRadius = '10px';
    loadingMsg.style.zIndex = '9999';
    document.body.appendChild(loadingMsg);
    
    fetch(photo.src)
        .then(res => res.blob())
        .then(blob => {
            fileRef.put(blob).then(snapshot => {
                snapshot.ref.getDownloadURL().then(url => {
                    document.body.removeChild(loadingMsg);
                    alert(`Foto tersimpan di: ${url}`);
                });
            }).catch(error => {
                document.body.removeChild(loadingMsg);
                console.error("Upload error:", error);
                alert("Gagal mengupload foto. Periksa koneksi internet Anda.");
            });
        })
        .catch(error => {
            document.body.removeChild(loadingMsg);
            console.error("Blob error:", error);
            alert("Gagal memproses foto");
        });
}

function toggleAR() {
    isARMode = !isARMode;
    document.getElementById('three-container').style.display = isARMode ? 'block' : 'none';
    currentProps.forEach(prop => {
        prop.style.display = isARMode ? 'none' : 'block';
    });
}

// Event Listener untuk Background
function uploadBackground(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (e) => {
        selectedBg.src = e.target.result;
        selectedBg.style.display = 'block';
    };
    reader.readAsDataURL(file);
}

async function searchBackground() {
    const query = document.getElementById('search-input').value;
    if (!query) {
        alert("Masukkan kata kunci pencarian!");
        return;
    }

    // Tampilkan indikator loading
    const resultsContainer = document.getElementById('search-results');
    resultsContainer.innerHTML = "<p>Mencari...</p>";

    // URL API Pexels
    const url = `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=10`;
    
    try {
        const response = await fetch(url, {
            headers: {
                Authorization: "HBQ7GM9g3eK9LncV6ukYCnA3WSBzNRSzzkLPTeP0l3R0JH9Cq4FhCmxR"
            }
        });

        if (!response.ok) {
            throw new Error(`Error ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        resultsContainer.innerHTML = ""; // Bersihkan hasil sebelumnya

        if (data.photos && data.photos.length > 0) {
            data.photos.forEach(photo => {
                const img = document.createElement('img');
                img.src = photo.src.medium;
                img.alt = photo.alt;
                img.onclick = () => selectBackground(photo.src.large);
                resultsContainer.appendChild(img);
            });
        } else {
            resultsContainer.innerHTML = "<p>Tidak ada hasil ditemukan.</p>";
        }
    } catch (error) {
        console.error("Error fetching background:", error);
        resultsContainer.innerHTML = "<p>Terjadi kesalahan saat mencari. Coba lagi.</p>";
        alert("Gagal memuat hasil pencarian. Silakan coba lagi.");
    }
}

function selectBackground(url) {
    selectedBg.src = url;
    selectedBg.style.display = 'block';
}

// Initialize elements after DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    video = document.getElementById('video');
    selectedBg = document.getElementById('selected-bg');
    photo = document.getElementById('photo');
    
    // Set initial styles
    selectedBg.style.display = 'none';
    selectedBg.style.position = 'absolute';
    selectedBg.style.width = '100%';
    selectedBg.style.height = '100%';
    selectedBg.style.objectFit = 'cover';
    selectedBg.style.zIndex = '1';
    
    document.getElementById('three-container').style.display = 'none';
});
