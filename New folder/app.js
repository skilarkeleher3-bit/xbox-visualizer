// --- SPOTIFY CONFIGURATION ---
// Paste your free Spotify Client ID between the quotes below
const SPOTIFY_CLIENT_ID = "YOUR_SPOTIFY_CLIENT_ID_HERE"; 
const REDIRECT_URI = window.location.href.split('#')[0].split('?')[0];
const SCOPES = "user-read-currently-playing user-read-playback-state";

let audioCtx, analyser, dataArray, canvas, ctx, animationFrameId;
let spotifyAccessToken = null;
let currentSongData = { bass: 0, mid: 0, treble: 0, lastUpdate: 0 };

// Check if we are returning from a successful Spotify login
window.onload = function() {
    const hash = window.location.hash;
    if (hash) {
        const params = new URLSearchParams(hash.substring(1));
        spotifyAccessToken = params.get('access_token');
        if (spotifyAccessToken) {
            window.location.hash = ""; // Clean up URL Bar
            startSpotifyTracking();
        }
    }
};

// Function called when user clicks "Connect Spotify"
function connectSpotify() {
    if (SPOTIFY_CLIENT_ID === "YOUR_SPOTIFY_CLIENT_ID_HERE") {
        alert("Wait! You need to add your Spotify Client ID to line 3 of app.js first. See the steps below!");
        return;
    }
    // Send user to Spotify to securely log in
    const authUrl = `https://spotify.com{SPOTIFY_CLIENT_ID}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&scope=${encodeURIComponent(SCOPES)}&response_type=token&show_dialog=true`;
    window.location.href = authUrl;
}

// Poll Spotify's server every 2 seconds to check what is playing
function startSpotifyTracking() {
    initCanvas();
    document.getElementById('ui-container').classList.add('hidden');
    
    // Fake data generator loop mimicking music beats if API analysis is slow
    setInterval(fetchCurrentlyPlaying, 2000);
    
    // Start drawing the Xbox shapes
    visualizerLoop();
}

async function fetchCurrentlyPlaying() {
    try {
        const response = await fetch("https://spotify.com", {
            headers: { 'Authorization': `Bearer ${spotifyAccessToken}` }
        });
        
        if (response.status === 200) {
            const data = await response.json();
            if (data && data.is_playing) {
                // We successfully see the song! 
                // Generate energetic numbers based on song progress to feed the visualizer
                let progress = data.progress_ms;
                currentSongData.bass = 100 + (Math.sin(progress * 0.01) * 80);
                currentSongData.mid = 80 + (Math.cos(progress * 0.005) * 60);
                currentSongData.treble = 50 + (Math.sin(progress * 0.02) * 40);
                return;
            }
        }
        // Song is paused or idle
        currentSongData.bass = 20; currentSongData.mid = 20; currentSongData.treble = 20;
    } catch (err) {
        console.error("Error fetching from Spotify:", err);
    }
}

function initCanvas() {
    canvas = document.getElementById('visualizer-canvas');
    ctx = canvas.getContext('2d');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}

// The Xbox 360 Visualizer Loop
function visualizerLoop() {
    animationFrameId = requestAnimationFrame(visualizerLoop);
    
    // Real Xbox trail effect: fade the screen slowly
    ctx.fillStyle = 'rgba(5, 5, 5, 0.12)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    
    // Use the live Spotify data
    let bass = currentSongData.bass;
    let mid = currentSongData.mid;
    let treble = currentSongData.treble;
    
    let radius = 100 + (bass * 0.6);
    
    ctx.beginPath();
    for (let i = 0; i <= 360; i += 2) {
        let angle = i * Math.PI / 180;
        let wave = Math.sin(angle * 8 + performance.now() * 0.005) * (mid * 0.2);
        let x = centerX + (radius + wave) * Math.cos(angle);
        let y = centerY + (radius + wave) * Math.sin(angle);
        
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
    }
    ctx.closePath();
    
    ctx.strokeStyle = `rgba(16, 185, 129, ${0.4 + (treble / 255)})`;
    ctx.lineWidth = 3;
    ctx.shadowBlur = 15;
    ctx.shadowColor = "#10b981";
    ctx.stroke();
    ctx.shadowBlur = 0;
}

// Fallback for device audio button
async function connectDeviceAudio() {
    initCanvas();
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
        document.getElementById('ui-container').classList.add('hidden');
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        const source = audioCtx.createMediaStreamSource(stream);
        analyser = audioCtx.createAnalyser();
        analyser.fftSize = 256;
        dataArray = new Uint8Array(analyser.frequencyBinCount);
        source.connect(analyser);
        
        // Overwrite the rendering loop to use live microphone array
        function useMicLoop() {
            requestAnimationFrame(useMicLoop);
            analyser.getByteFrequencyData(dataArray);
            currentSongData.bass = dataArray[2] || 0;
            currentSongData.mid = dataArray[10] || 0;
            currentSongData.treble = dataArray[30] || 0;
        }
        useMicLoop();
        visualizerLoop();
    } catch (err) { alert("Mic denied."); }
}
