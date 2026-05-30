let chart, scene, camera, renderer, rocket;
let alt = 0, vel = 0, batt = 100, pres = 1013, time = 0, packetCount = 0, dataLog = [];
let timer;
let lat = 8.5241, lon = 76.9366, rssi = -45;
let altOffset = 0;

// 1. Initialize Map & Store Start
const startLat = 8.5241;
const startLon = 76.9366;
const map = L.map('map', { attributionControl: false }).setView([startLat, startLon], 13);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);

// Add the starting marker (Static)
//L.marker([startLat, startLon]).addTo(map).bindPopup("Launch Site");

// Add the moving rocket marker
const marker = L.marker([lat, lon]).addTo(map).bindPopup("Rocket");

let currentPos = L.latLng(lat, lon);
let startPos = L.latLng(startLat, startLon);

// Calculate distance in meters, convert to feet (1 meter = 3.28084 feet)
let distanceMeters = currentPos.distanceTo(startPos);
let distanceFeet = (distanceMeters * 3.28084).toFixed(0);

// Update the UI
document.getElementById('val-range').innerText = distanceFeet;


// 2. Setup Chart
const ctx = document.getElementById('altChart').getContext('2d');
chart = new Chart(ctx, { type: 'line', data: { labels: [], datasets: [{ label: 'Altitude (ft)', data: [], borderColor: '#e74c3c', fill: false }] }, options: { animation: false, scales: { y: { beginAtZero: true } } } });

// 3. Setup 3D Rocket
function init3D() {
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(75, 1, 0.1, 1000);
    renderer = new THREE.WebGLRenderer({antialias: true});
    renderer.setSize(250, 200);
    document.getElementById('three-container').appendChild(renderer.domElement);
    const geometry = new THREE.BoxGeometry(0.5, 2, 0.5);
    rocket = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial({color: 0xff0000, wireframe: true}));
    scene.add(rocket);
    camera.position.z = 5;
    animate3D();
}

function animate3D() { requestAnimationFrame(animate3D); renderer.render(scene, camera); }

// Calibration Function
/*function calibrate() {
    altOffset = alt; // Set current reading as 0
    logEvent("System Calibrated: Alt offset set.");
}
*/
// 4. Simulator Logic
document.getElementById('launch-btn').onclick = () => {
    if (timer) return;
    resetFlight();
    timer = setInterval(() => {
        time++;
        packetCount++;
        
        if (time < 30) { alt += 50; vel += 10; updateStatus("Ascent"); }
        else if (time < 40) { updateStatus("Apogee"); }
        else { alt -= 30; vel -= 5; updateStatus("Descent"); }
        
        batt -= 0.01; // Slower battery drain
        pres = 1013 - (alt / 30);
        
        // Update GPS
        lat += 0.0001; lon += 0.0001;

        // Update Map Marker position slightly
        marker.setLatLng([lat, lon]);

        let currentPos = L.latLng(lat, lon);
        let startPos = L.latLng(startLat, startLon);
        let distanceMeters = currentPos.distanceTo(startPos);
        let distanceFeet = (distanceMeters * 3.28084).toFixed(0);

        //Update Signal
        rssi = -45 + Math.floor(Math.random() * 20); // Random noise
        document.getElementById('val-rssi').innerText = rssi;

        document.getElementById('stop-btn').onclick = () => {
                if (!timer) return; // Nothing to stop

                // Show confirmation dialog
                if (confirm("Are you sure you want to stop telemetry?")) {
                    clearInterval(timer);
                    timer = null; // Reset the timer variable
                    updateStatus("Telemetry Stopped by User");
                    
                    // Optional: Change button back to a "Stopped" state
                    document.getElementById('stop-btn').style.backgroundColor = "#7f8c8d";
                    document.getElementById('stop-btn').disabled = true;
                }
            };

       document.getElementById('val-range').innerText = distanceFeet;
        
        let currentStage = document.getElementById('status-display').innerText;

        dataLog.push({
            time, 
            stage: currentStage, 
            alt: alt.toFixed(0), 
            vel: vel.toFixed(2), 
            batt: batt.toFixed(1), 
            pres: pres.toFixed(2), 
            lat: lat.toFixed(4), 
            lon: lon.toFixed(4), 
            rssi: rssi
        });
        updateUI();
    }, 200);
};

function resetFlight() {
    time = 0;
    packetCount = 0;
    alt = 0;
    vel = 0;
    batt = 100;
    pres = 1013;
    lat = 8.5241;
    lon = 76.9366;
    dataLog = []; // Clear previous flight logs
    
    // Reset UI
    document.getElementById('console').innerHTML = ""; // Clear log
    chart.data.labels = []; // Clear chart
    chart.data.datasets[0].data = [];
    chart.update();
    
    // Re-enable/reset Stop button
    const stopBtn = document.getElementById('stop-btn');
    stopBtn.disabled = false;
    stopBtn.style.backgroundColor = "#c0392b"; 
}

function updateUI() {
    document.getElementById('p-count').innerText = packetCount;
    document.getElementById('m-time').innerText = new Date(time * 1000).toISOString().substr(11, 8);
    document.getElementById('val-alt').innerText = alt.toFixed(0);
    document.getElementById('val-vel').innerText = vel.toFixed(0);
    document.getElementById('val-batt').innerText = Math.max(0, batt).toFixed(1);
    document.getElementById('val-pres').innerText = pres.toFixed(0);
    document.getElementById('val-gps').innerText = lat.toFixed(4);
    document.getElementById('val-gps-lon').innerText = lon.toFixed(4);
    document.getElementById('val-rssi').innerText = rssi;

    chart.data.labels.push(time);
    chart.data.datasets[0].data.push(alt);
    chart.update();
    rocket.rotation.x += 0.05;
}

function updateStatus(s) {
    document.getElementById('status-display').innerText = s;
    const consoleDiv = document.getElementById('console');
    consoleDiv.innerHTML += `<div>${time}s - ${s}</div>`;
    consoleDiv.scrollTop = consoleDiv.scrollHeight; // Auto-scroll to bottom
}

// Improved CSV Export
document.getElementById('download-btn').onclick = () => {
    let csv = "Time,Stage,Altitude(ft),Velocity(mph),Battery(%),Pressure(Pa),Lat,Long,RSSI(dBm)\n" + 
              dataLog.map(d => `${d.time},${d.stage},${d.alt},${d.vel},${d.batt},${d.pres},${d.lat},${d.lon},${d.rssi}`).join("\n");
    let blob = new Blob([csv], {type: 'text/csv'});
    let a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'flight_data.csv'; a.click();
};

init3D();

/*
// helper to keep the 3D view consistent
function resize3D() {
    const container = document.getElementById('three-container');
    if (renderer && container) {
        renderer.setSize(container.clientWidth, container.clientHeight);
        camera.aspect = container.clientWidth / container.clientHeight;
        camera.updateProjectionMatrix();
    }
}
window.addEventListener('resize', resize3D);
*/