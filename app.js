// Prevent horizontal page dragging on iOS while allowing vertical scroll and slider drag
let touchStartX = 0;
let touchStartY = 0;

document.addEventListener('touchstart', (e) => {
    touchStartX = e.touches[0].clientX;
    touchStartY = e.touches[0].clientY;
}, { passive: true });

document.addEventListener('touchmove', (e) => {
    // Allow touch movement on interactive elements (inputs, buttons, sliders, etc.)
    const target = e.target;
    if (target.tagName === 'INPUT' || 
        target.tagName === 'BUTTON' ||
        target.tagName === 'LABEL' ||
        target.classList.contains('frame-btn') ||
        target.classList.contains('color-btn') ||
        target.classList.contains('tab-btn') ||
        target.classList.contains('toggle-btn')) {
        return; // Allow default behavior on interactive elements
    }
    
    const touchCurrentX = e.touches[0].clientX;
    const touchCurrentY = e.touches[0].clientY;
    const diffX = Math.abs(touchCurrentX - touchStartX);
    const diffY = Math.abs(touchCurrentY - touchStartY);
    
    // Only prevent default if horizontal movement is greater than vertical (horizontal swipe)
    // Allow vertical scrolling to work normally
    if (diffX > diffY && diffX > 10) {
        e.preventDefault();
    }
}, { passive: false });

let originalImage = null;
let currentFrameStyle = 'classic';
let currentFrameColor = '#8B4513';
let currentFrameWidth = 1.0; // Width in inches
let cornerStyle = 'rounded';
let frameOnlyMode = false; // Toggle for frame-only preview
const DPI = 96; // Screen DPI (standard screen DPI)
const INCH_TO_PX = DPI; // Conversion factor for screen display
const CM_TO_INCH = 1 / 2.54; // For reference if needed

const imageInput = document.getElementById('imageInput');
const cameraInput = document.getElementById('cameraInput');
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const frameSelector = document.getElementById('frameSelector');
const canvasContainer = document.getElementById('canvasContainer');
const downloadSection = document.getElementById('downloadSection');
const downloadBtn = document.getElementById('downloadBtn');
const resetBtn = document.getElementById('resetBtn');
const frameWidth = document.getElementById('frameWidth');
const widthValue = document.getElementById('widthValue');
const colorInput = document.getElementById('colorInput');
const colorHex = document.getElementById('colorHex');
const dimensionsDisplay = document.getElementById('dimensionsDisplay');
const imageDimensions = document.getElementById('imageDimensions');
const frameInfo = document.getElementById('frameInfo');

// Register Service Worker
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js')
        .then(reg => console.log('Service Worker registered'))
        .catch(err => console.log('Service Worker registration failed'));
}

// Image upload handler
const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = (event) => {
            const img = new Image();
            img.onload = () => {
                originalImage = img;
                frameSelector.classList.remove('hidden');
                applyFrame();
            };
            img.src = event.target.result;
        };
        reader.readAsDataURL(file);
    }
};

// Attach handler to both image and camera inputs
imageInput.addEventListener('change', handleImageUpload);
cameraInput.addEventListener('change', handleImageUpload);

// Frame style buttons
document.querySelectorAll('.frame-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
        document.querySelectorAll('.frame-btn').forEach(b => b.classList.remove('active'));
        e.currentTarget.classList.add('active');
        currentFrameStyle = e.currentTarget.dataset.style;
        applyFrame();
    });
});

// Quick color buttons
document.querySelectorAll('.color-btn.quick').forEach(btn => {
    btn.addEventListener('click', (e) => {
        document.querySelectorAll('.color-btn').forEach(b => b.classList.remove('active'));
        e.currentTarget.classList.add('active');
        const color = e.currentTarget.dataset.color;
        currentFrameColor = color;
        colorInput.value = color;
        colorHex.textContent = color;
        applyFrame();
    });
});

// Color wheel input
colorInput.addEventListener('input', (e) => {
    currentFrameColor = e.target.value;
    colorHex.textContent = e.target.value;
    document.querySelectorAll('.color-btn').forEach(b => b.classList.remove('active'));
    applyFrame();
});

// Frame width slider
frameWidth.addEventListener('input', (e) => {
    currentFrameWidth = parseFloat(e.target.value);
    widthValue.textContent = currentFrameWidth.toFixed(2);
    applyFrame();
});

// Corner style toggle
document.querySelectorAll('.toggle-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
        document.querySelectorAll('.toggle-btn').forEach(b => b.classList.remove('active'));
        e.currentTarget.classList.add('active');
        cornerStyle = e.currentTarget.dataset.corner;
        applyFrame();
    });
});

// Frame-only mode toggle
const frameImageToggle = document.getElementById('frameImageToggle');
const frameOnlyToggle = document.getElementById('frameOnlyToggle');

if (frameImageToggle) {
    frameImageToggle.addEventListener('click', (e) => {
        frameImageToggle.classList.add('active');
        frameOnlyToggle.classList.remove('active');
        frameOnlyMode = false;
        applyFrame();
    });
}

if (frameOnlyToggle) {
    frameOnlyToggle.addEventListener('click', (e) => {
        frameOnlyToggle.classList.add('active');
        frameImageToggle.classList.remove('active');
        frameOnlyMode = true;
        applyFrame();
    });
}

// Tab switching
document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
        const tabName = e.currentTarget.dataset.tab;
        
        // Hide all tabs
        document.querySelectorAll('.frame-tab-content').forEach(tab => {
            tab.classList.remove('active');
        });
        
        // Deactivate all tab buttons
        document.querySelectorAll('.tab-btn').forEach(b => {
            b.classList.remove('active');
        });
        
        // Show selected tab
        document.getElementById(tabName).classList.add('active');
        e.currentTarget.classList.add('active');
    });
});

// Apply frame to image
function applyFrame() {
    if (!originalImage) return;

    // Convert frame width from inches to pixels for screen display
    const frameSizePixels = currentFrameWidth * INCH_TO_PX;
    
    // In frame-only mode, show a full letter-size page (8.5" x 11") for testing on standard paper
    let imageWidth = originalImage.width;
    let imageHeight = originalImage.height;
    
    if (frameOnlyMode) {
        // Create an 8.5" x 11" frame swatch (letter-size paper) for testing print dimensions
        // This allows you to print and test on standard paper without scaling
        imageWidth = 8.5 * INCH_TO_PX;
        imageHeight = 11 * INCH_TO_PX;
    }
    
    const padding = frameSizePixels * 2;
    
    canvas.width = imageWidth + padding;
    canvas.height = imageHeight + padding;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw frame based on style
    switch(currentFrameStyle) {
        case 'classic':
            drawClassicFrame(frameSizePixels);
            break;
        case 'modern':
            drawModernFrame(frameSizePixels);
            break;
        case 'ornate':
            drawOrnateFrame(frameSizePixels);
            break;
        case 'polaroid':
            drawPolaroidFrame(frameSizePixels);
            break;
        case 'shadow':
            drawShadowFrame(frameSizePixels);
            break;
        case 'double':
            drawDoubleFrame(frameSizePixels);
            break;
        case 'neon':
            drawNeonFrame(frameSizePixels);
            break;
        case 'vintage':
            drawVintageFrame(frameSizePixels);
            break;
        case 'emboss':
            drawEmbossFrame(frameSizePixels);
            break;
        case 'architectural':
            drawArchitecturalFrame(frameSizePixels);
            break;
        case 'minimalist':
            drawMinimalistFrame(frameSizePixels);
            break;
        case 'victorian':
            drawVictorianFrame(frameSizePixels);
            break;
        case 'classical':
            drawClassicalFrame(frameSizePixels);
            break;
        case 'metallic':
            drawMetallicFrame(frameSizePixels);
            break;
    }

    // Draw image only if not in frame-only mode
    if (!frameOnlyMode) {
        ctx.drawImage(originalImage, frameSizePixels, frameSizePixels, originalImage.width, originalImage.height);
    } else {
        // In frame-only mode, fill the center with white to show the frame clearly
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(frameSizePixels, frameSizePixels, imageWidth, imageHeight);
    }

    // Apply corner radius to the entire canvas
    applyCanvasCornerRadius(frameSizePixels);

    // Display image dimensions
    displayImageDimensions();

    canvasContainer.classList.remove('hidden');
    downloadSection.classList.remove('hidden');
}

// Display image dimensions in inches
function displayImageDimensions() {
    if (frameOnlyMode) {
        // In frame-only mode, show the test area size and frame thickness
        imageDimensions.textContent = `Test Area: 8.5" × 11" (Letter Size - Print at 100%)`;
        frameInfo.textContent = `Frame Thickness: ${currentFrameWidth.toFixed(2)}" | Measure printed frame to verify accuracy`;
    } else {
        // Convert pixels to inches (assuming 96 DPI screen)
        const widthIn = (originalImage.width / INCH_TO_PX).toFixed(2);
        const heightIn = (originalImage.height / INCH_TO_PX).toFixed(2);
        const totalWidthIn = ((originalImage.width + currentFrameWidth * INCH_TO_PX * 2) / INCH_TO_PX).toFixed(2);
        const totalHeightIn = ((originalImage.height + currentFrameWidth * INCH_TO_PX * 2) / INCH_TO_PX).toFixed(2);
        
        imageDimensions.textContent = `Image: ${widthIn}" × ${heightIn}"`;
        frameInfo.textContent = `With Frame (${currentFrameWidth.toFixed(2)}"): ${totalWidthIn}" × ${totalHeightIn}"`;
    }
    dimensionsDisplay.classList.remove('hidden');
}

// Apply corner radius to entire canvas based on cornerStyle
function applyCanvasCornerRadius(frameSizePixels) {
    const radius = cornerStyle === 'rounded' ? frameSizePixels * 0.8 : 0;
    
    if (radius === 0) return; // No rounding needed
    
    // Get current canvas content
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Create clipping path with rounded corners
    ctx.beginPath();
    ctx.moveTo(radius, 0);
    ctx.lineTo(canvas.width - radius, 0);
    ctx.quadraticCurveTo(canvas.width, 0, canvas.width, radius);
    ctx.lineTo(canvas.width, canvas.height - radius);
    ctx.quadraticCurveTo(canvas.width, canvas.height, canvas.width - radius, canvas.height);
    ctx.lineTo(radius, canvas.height);
    ctx.quadraticCurveTo(0, canvas.height, 0, canvas.height - radius);
    ctx.lineTo(0, radius);
    ctx.quadraticCurveTo(0, 0, radius, 0);
    ctx.closePath();
    ctx.clip();
    
    // Redraw image data with clipping applied
    ctx.putImageData(imageData, 0, 0);
}

function drawClassicFrame(size) {
    // Traditional wooden frame with beveled edge
    ctx.fillStyle = currentFrameColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Beveled edge effect (3D depth)
    ctx.fillStyle = shadeColor(currentFrameColor, 30);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(size, size);
    ctx.lineTo(size, originalImage.height + size);
    ctx.lineTo(0, canvas.height);
    ctx.closePath();
    ctx.fill();
    
    ctx.fillStyle = shadeColor(currentFrameColor, -40);
    ctx.beginPath();
    ctx.moveTo(canvas.width, 0);
    ctx.lineTo(canvas.width - size, size);
    ctx.lineTo(canvas.width - size, originalImage.height + size);
    ctx.lineTo(canvas.width, canvas.height);
    ctx.closePath();
    ctx.fill();
    
    // Inner decorative line
    ctx.strokeStyle = shadeColor(currentFrameColor, -25);
    ctx.lineWidth = 2;
    ctx.strokeRect(size - 2, size - 2, originalImage.width + 4, originalImage.height + 4);
    
    // Outer decorative line
    ctx.strokeStyle = shadeColor(currentFrameColor, 20);
    ctx.lineWidth = 1;
    ctx.strokeRect(size / 2, size / 2, canvas.width - size, canvas.height - size);
}

function drawModernFrame(size) {
    // Contemporary gallery-style frame
    ctx.fillStyle = currentFrameColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Double line border with spacing
    const innerOffset = size / 3;
    
    // Outer line
    ctx.strokeStyle = shadeColor(currentFrameColor, -30);
    ctx.lineWidth = size / 8;
    ctx.strokeRect(size / 4, size / 4, canvas.width - (size / 2), canvas.height - (size / 2));
    
    // Inner line
    ctx.strokeStyle = shadeColor(currentFrameColor, 25);
    ctx.lineWidth = 1;
    ctx.strokeRect(size - 2, size - 2, originalImage.width + 4, originalImage.height + 4);
    
    // Subtle shadow effect on inner edge
    ctx.shadowColor = 'rgba(0, 0, 0, 0.15)';
    ctx.shadowBlur = size / 4;
    ctx.shadowOffsetX = 1;
    ctx.shadowOffsetY = 1;
    ctx.strokeRect(size, size, originalImage.width, originalImage.height);
    ctx.shadowColor = 'transparent';
}

function drawOrnateFrame(size) {
    // Elegant ornate frame with decorative elements
    ctx.fillStyle = currentFrameColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    const baseColor = currentFrameColor;
    const accentColor = shadeColor(baseColor, -40);
    const lightColor = shadeColor(baseColor, 35);
    
    // Outer decorative border with shading
    ctx.fillStyle = accentColor;
    ctx.fillRect(0, 0, canvas.width, size / 2);
    ctx.fillRect(0, canvas.height - size / 2, canvas.width, size / 2);
    ctx.fillRect(0, 0, size / 2, canvas.height);
    ctx.fillRect(canvas.width - size / 2, 0, size / 2, canvas.height);
    
    // Main frame lines (triple line effect)
    ctx.strokeStyle = accentColor;
    ctx.lineWidth = 2;
    ctx.strokeRect(size / 4, size / 4, canvas.width - (size / 2), canvas.height - (size / 2));
    
    ctx.strokeStyle = lightColor;
    ctx.lineWidth = 1;
    ctx.strokeRect(size / 2, size / 2, canvas.width - size, canvas.height - size);
    
    // Corner ornaments (circle with decorative rays)
    const ornamentRadius = size * 0.25;
    const corners = [
        [size / 2, size / 2],
        [canvas.width - size / 2, size / 2],
        [size / 2, canvas.height - size / 2],
        [canvas.width - size / 2, canvas.height - size / 2]
    ];
    
    corners.forEach(([x, y]) => {
        // Center circle
        ctx.fillStyle = accentColor;
        ctx.beginPath();
        ctx.arc(x, y, ornamentRadius * 0.5, 0, Math.PI * 2);
        ctx.fill();
        
        // Decorative rays
        ctx.strokeStyle = accentColor;
        ctx.lineWidth = 1.5;
        for (let angle = 0; angle < Math.PI * 2; angle += Math.PI / 4) {
            const x2 = x + Math.cos(angle) * ornamentRadius;
            const y2 = y + Math.sin(angle) * ornamentRadius;
            ctx.beginPath();
            ctx.moveTo(x, y);
            ctx.lineTo(x2, y2);
            ctx.stroke();
        }
    });
    
    // Inner frame edge
    ctx.strokeStyle = accentColor;
    ctx.lineWidth = 1;
    ctx.strokeRect(size - 1, size - 1, originalImage.width + 2, originalImage.height + 2);
}

function drawPolaroidFrame(size) {
    // Sophisticated Polaroid-style frame with vintage effects
    const creamColor = '#F5E6D3';
    const shadowColor = 'rgba(0, 0, 0, 0.15)';
    
    ctx.fillStyle = creamColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Extra space at bottom for polaroid effect (signature area)
    const extraBottom = size * 2.5;
    canvas.height = originalImage.height + size * 2 + extraBottom;
    ctx.fillStyle = creamColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Outer shadow effect
    ctx.shadowColor = shadowColor;
    ctx.shadowBlur = 8;
    ctx.shadowOffsetX = 2;
    ctx.shadowOffsetY = 8;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.shadowColor = 'transparent';
    
    // Subtle vintage vignette on bottom signature area
    const gradient = ctx.createLinearGradient(0, originalImage.height + size * 2, 0, canvas.height);
    gradient.addColorStop(0, 'rgba(0, 0, 0, 0)');
    gradient.addColorStop(0.5, 'rgba(0, 0, 0, 0.02)');
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0.08)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, originalImage.height + size * 2, canvas.width, extraBottom);
    
    // Subtle decorative line above signature area
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.1)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(size, originalImage.height + size * 2 - 2);
    ctx.lineTo(canvas.width - size, originalImage.height + size * 2 - 2);
    ctx.stroke();
}

function drawShadowFrame(size) {
    // Transparent background with sophisticated layered shadow effect
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Multi-layered shadow for depth and sophistication
    // Outer soft shadow
    ctx.shadowColor = 'rgba(0, 0, 0, 0.15)';
    ctx.shadowBlur = size * 1.5;
    ctx.shadowOffsetX = size / 3;
    ctx.shadowOffsetY = size / 3;
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(size, size, originalImage.width, originalImage.height);
    
    // Inner shadow (closer, darker)
    ctx.shadowColor = 'rgba(0, 0, 0, 0.25)';
    ctx.shadowBlur = size * 0.75;
    ctx.shadowOffsetX = size / 5;
    ctx.shadowOffsetY = size / 5;
    ctx.fillRect(size, size, originalImage.width, originalImage.height);
    
    // Clear shadow
    ctx.shadowColor = 'transparent';
    
    // Subtle inner frame line for definition
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.1)';
    ctx.lineWidth = 1;
    ctx.strokeRect(size, size, originalImage.width, originalImage.height);
}

function drawDoubleFrame(size) {
    // Elegant dual mat gallery frame
    const baseColor = currentFrameColor;
    ctx.fillStyle = baseColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    const darkColor = shadeColor(baseColor, -50);
    const lightColor = shadeColor(baseColor, 45);
    const midColor = shadeColor(baseColor, -25);
    
    // Outer frame with shadow
    ctx.shadowColor = 'rgba(0, 0, 0, 0.4)';
    ctx.shadowBlur = 12;
    ctx.shadowOffsetX = 3;
    ctx.shadowOffsetY = 3;
    ctx.fillStyle = darkColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Clear shadow
    ctx.shadowColor = 'transparent';
    
    // Inner mat board (light colored)
    ctx.fillStyle = lightColor;
    ctx.fillRect(size / 2, size / 2, canvas.width - size, canvas.height - size);
    
    // Decorative line on mat
    ctx.strokeStyle = midColor;
    ctx.lineWidth = 1;
    ctx.strokeRect(size / 2 + 4, size / 2 + 4, canvas.width - size - 8, canvas.height - size - 8);
    
    // Inner frame detail
    ctx.strokeStyle = darkColor;
    ctx.lineWidth = 2;
    ctx.strokeRect(size, size, canvas.width - (size * 2), canvas.height - (size * 2));
    
    // Subtle beveled edge effect on inner mat
    const innerX = size / 2;
    const innerY = size / 2;
    const innerW = canvas.width - size;
    const innerH = canvas.height - size;
    
    // Top/left edge highlight
    ctx.strokeStyle = shadeColor(lightColor, 20);
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(innerX, innerY);
    ctx.lineTo(innerX + innerW, innerY);
    ctx.stroke();
    
    ctx.beginPath();
    ctx.moveTo(innerX, innerY);
    ctx.lineTo(innerX, innerY + innerH);
    ctx.stroke();
    
    // Bottom/right edge shadow
    ctx.strokeStyle = shadeColor(lightColor, -20);
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(innerX + innerW, innerY);
    ctx.lineTo(innerX + innerW, innerY + innerH);
    ctx.stroke();
    
    ctx.beginPath();
    ctx.moveTo(innerX, innerY + innerH);
    ctx.lineTo(innerX + innerW, innerY + innerH);
    ctx.stroke();
}

function drawNeonFrame(size) {
    // Sophisticated neon-style gallery frame with modern glow effects
    ctx.fillStyle = '#0F0F1E';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Subtle ambient glow in background
    const ambientGradient = ctx.createRadialGradient(
        canvas.width / 2, canvas.height / 2, 0,
        canvas.width / 2, canvas.height / 2, Math.sqrt(canvas.width * canvas.width + canvas.height * canvas.height) / 2
    );
    ambientGradient.addColorStop(0, 'rgba(' + parseInt(currentFrameColor.substr(1,2), 16) + ', ' + parseInt(currentFrameColor.substr(3,2), 16) + ', ' + parseInt(currentFrameColor.substr(5,2), 16) + ', 0.05)');
    ambientGradient.addColorStop(1, 'rgba(0, 0, 0, 0.2)');
    ctx.fillStyle = ambientGradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Main neon glow effect - multiple layers
    const neonColor = currentFrameColor;
    
    // Outer glow (softer, larger)
    ctx.shadowColor = neonColor;
    ctx.shadowBlur = 25;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;
    ctx.strokeStyle = neonColor;
    ctx.lineWidth = 2;
    ctx.globalAlpha = 0.4;
    ctx.strokeRect(size - 8, size - 8, originalImage.width + 16, originalImage.height + 16);
    ctx.globalAlpha = 1.0;
    
    // Primary neon line (bright)
    ctx.shadowColor = neonColor;
    ctx.shadowBlur = 15;
    ctx.lineWidth = 3;
    ctx.globalAlpha = 0.9;
    ctx.strokeRect(size - 2, size - 2, originalImage.width + 4, originalImage.height + 4);
    ctx.globalAlpha = 1.0;
    
    // Inner detail line
    ctx.shadowBlur = 8;
    ctx.lineWidth = 1;
    ctx.globalAlpha = 0.7;
    ctx.strokeRect(size + 2, size + 2, originalImage.width - 4, originalImage.height - 4);
    ctx.globalAlpha = 1.0;
    
    // Corner accent points (neon corner markers)
    const cornerSize = size / 4;
    const corners = [
        [size - 4, size - 4],
        [canvas.width - (size - 4), size - 4],
        [size - 4, canvas.height - (size - 4)],
        [canvas.width - (size - 4), canvas.height - (size - 4)]
    ];
    
    corners.forEach(([x, y]) => {
        ctx.fillStyle = neonColor;
        ctx.globalAlpha = 0.8;
        ctx.beginPath();
        ctx.arc(x, y, cornerSize / 2, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.shadowColor = neonColor;
        ctx.shadowBlur = 10;
        ctx.fillRect(x - cornerSize / 4, y - cornerSize / 4, cornerSize / 2, cornerSize / 2);
        ctx.globalAlpha = 1.0;
    });
    
    ctx.shadowColor = 'transparent';
}

function drawVintageFrame(size) {
    // Rich sepia-toned vintage frame with sophisticated patina effects
    const baseSepia = '#B8956A';
    const darkSepia = '#8B6F47';
    const lightSepia = '#D4AF7F';
    
    ctx.fillStyle = baseSepia;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Radial vignette effect for vintage photograph appearance
    const vignette = ctx.createRadialGradient(
        canvas.width / 2, canvas.height / 2, Math.min(canvas.width, canvas.height) / 4,
        canvas.width / 2, canvas.height / 2, Math.sqrt(canvas.width * canvas.width + canvas.height * canvas.height) / 2
    );
    vignette.addColorStop(0, 'rgba(0, 0, 0, 0)');
    vignette.addColorStop(0.8, 'rgba(0, 0, 0, 0.15)');
    vignette.addColorStop(1, 'rgba(0, 0, 0, 0.35)');
    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Decorative border with layered vintage frame
    // Outer ornate line
    ctx.strokeStyle = darkSepia;
    ctx.lineWidth = 3;
    ctx.strokeRect(size - 4, size - 4, originalImage.width + 8, originalImage.height + 8);
    
    // Double line detail
    ctx.strokeStyle = lightSepia;
    ctx.lineWidth = 1;
    ctx.strokeRect(size - 1, size - 1, originalImage.width + 2, originalImage.height + 2);
    
    // Inner border shadow
    ctx.strokeStyle = darkSepia;
    ctx.lineWidth = 1;
    ctx.strokeRect(size + 2, size + 2, originalImage.width - 4, originalImage.height - 4);
    
    // Subtle texture overlay for aged appearance
    for (let i = 0; i < 100; i++) {
        const x = Math.random() * canvas.width;
        const y = Math.random() * canvas.height;
        ctx.fillStyle = `rgba(0, 0, 0, ${Math.random() * 0.03})`;
        ctx.fillRect(x, y, Math.random() * 3, Math.random() * 3);
    }
}

function drawEmbossFrame(size) {
    // Sophisticated embossed 3D frame with relief effects
    const baseColor = currentFrameColor;
    const lightColor = shadeColor(baseColor, 40);
    const darkColor = shadeColor(baseColor, -40);
    const mediumColor = shadeColor(baseColor, -15);
    
    ctx.fillStyle = baseColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Top and left beveled edge (highlights)
    for (let i = 0; i < size; i++) {
        ctx.fillStyle = shadeColor(lightColor, -i * 2);
        ctx.fillRect(i, i, canvas.width - (i * 2), 1);
        ctx.fillRect(i, i, 1, canvas.height - (i * 2));
    }
    
    // Bottom and right beveled edge (shadows)
    for (let i = 0; i < size; i++) {
        ctx.fillStyle = shadeColor(darkColor, i * 1.5);
        ctx.fillRect(i, canvas.height - 1 - i, canvas.width - (i * 2), 1);
        ctx.fillRect(canvas.width - 1 - i, i, 1, canvas.height - (i * 2));
    }
    
    // Main frame border with strong relief
    ctx.strokeStyle = mediumColor;
    ctx.lineWidth = 2;
    ctx.strokeRect(size - 1, size - 1, originalImage.width + 2, originalImage.height + 2);
    
    // Inner highlight line
    ctx.strokeStyle = lightColor;
    ctx.lineWidth = 1;
    ctx.strokeRect(size + 1, size + 1, originalImage.width - 2, originalImage.height - 2);
    
    // Subtle shadow line for relief
    ctx.strokeStyle = darkColor;
    ctx.lineWidth = 1;
    ctx.strokeRect(size + 2, size + 2, originalImage.width - 4, originalImage.height - 4);
}

function drawArchitecturalFrame(size) {
    // Sophisticated geometric gallery frame
    ctx.fillStyle = currentFrameColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    const baseColor = currentFrameColor;
    const darkColor = shadeColor(baseColor, -45);
    const lightColor = shadeColor(baseColor, 35);
    
    // Layered geometric design
    const layers = [
        { offset: size / 8, width: 2, color: lightColor },
        { offset: size / 3, width: 1.5, color: darkColor },
        { offset: size / 1.8, width: 1, color: lightColor }
    ];
    
    layers.forEach(layer => {
        ctx.strokeStyle = layer.color;
        ctx.lineWidth = layer.width;
        ctx.strokeRect(layer.offset, layer.offset, canvas.width - (layer.offset * 2), canvas.height - (layer.offset * 2));
    });
    
    // Modern accent corners
    const cornerSize = size * 0.3;
    ctx.fillStyle = darkColor;
    const corners = [
        [0, 0], [canvas.width - cornerSize, 0],
        [0, canvas.height - cornerSize], [canvas.width - cornerSize, canvas.height - cornerSize]
    ];
    corners.forEach(([x, y]) => {
        ctx.fillRect(x, y, cornerSize, cornerSize);
        ctx.strokeStyle = lightColor;
        ctx.lineWidth = 1;
        ctx.strokeRect(x + 2, y + 2, cornerSize - 4, cornerSize - 4);
    });
}

function drawMinimalistFrame(size) {
    // Elegant minimalist gallery frame with subtle details
    ctx.fillStyle = '#fafafa';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Outer shadow frame
    ctx.shadowColor = 'rgba(0, 0, 0, 0.08)';
    ctx.shadowBlur = size / 2;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 2;
    ctx.fillStyle = '#fafafa';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.shadowColor = 'transparent';
    
    // Main border line
    ctx.strokeStyle = currentFrameColor;
    ctx.lineWidth = size / 5;
    const inset = size / 2;
    ctx.strokeRect(inset, inset, canvas.width - (inset * 2), canvas.height - (inset * 2));
    
    // Accent line
    ctx.strokeStyle = shadeColor(currentFrameColor, 30);
    ctx.lineWidth = 0.5;
    ctx.strokeRect(inset + 2, inset + 2, canvas.width - (inset * 2) - 4, canvas.height - (inset * 2) - 4);
}

function drawVictorianFrame(size) {
    // Luxurious Victorian ornamental frame
    const baseColor = currentFrameColor;
    
    ctx.fillStyle = baseColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    const darkAccent = shadeColor(baseColor, -50);
    const lightAccent = shadeColor(baseColor, 40);
    
    // Ornate triple-line border
    ctx.strokeStyle = lightAccent;
    ctx.lineWidth = 2;
    ctx.strokeRect(size / 8, size / 8, canvas.width - (size / 4), canvas.height - (size / 4));
    
    ctx.strokeStyle = darkAccent;
    ctx.lineWidth = 1;
    ctx.strokeRect(size / 4, size / 4, canvas.width - (size / 2), canvas.height - (size / 2));
    
    ctx.strokeStyle = lightAccent;
    ctx.lineWidth = 0.5;
    ctx.strokeRect(size / 2.5, size / 2.5, canvas.width - (size / 1.25), canvas.height - (size / 1.25));
    
    // Elaborate corner ornaments
    const cornerOrnaments = [
        [size / 2, size / 2],
        [canvas.width - size / 2, size / 2],
        [size / 2, canvas.height - size / 2],
        [canvas.width - size / 2, canvas.height - size / 2]
    ];
    
    cornerOrnaments.forEach(([x, y]) => {
        // Large decorative circle
        ctx.fillStyle = darkAccent;
        ctx.beginPath();
        ctx.arc(x, y, size * 0.2, 0, Math.PI * 2);
        ctx.fill();
        
        // Inner highlight circle
        ctx.fillStyle = lightAccent;
        ctx.beginPath();
        ctx.arc(x, y, size * 0.12, 0, Math.PI * 2);
        ctx.fill();
        
        // Ornamental rays
        ctx.strokeStyle = darkAccent;
        ctx.lineWidth = 1.5;
        for (let angle = 0; angle < Math.PI * 2; angle += Math.PI / 8) {
            const x1 = x + Math.cos(angle) * (size * 0.25);
            const y1 = y + Math.sin(angle) * (size * 0.25);
            const x2 = x + Math.cos(angle) * (size * 0.35);
            const y2 = y + Math.sin(angle) * (size * 0.35);
            ctx.beginPath();
            ctx.moveTo(x1, y1);
            ctx.lineTo(x2, y2);
            ctx.stroke();
        }
    });
    
    // Side ornamental bands
    ctx.fillStyle = darkAccent;
    ctx.fillRect(0, size, size / 3, originalImage.height);
    ctx.fillRect(canvas.width - size / 3, size, size / 3, originalImage.height);
}

function drawClassicalFrame(size) {
    // Sophisticated Classical/Neoclassical gallery frame
    const baseColor = currentFrameColor;
    
    ctx.fillStyle = baseColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    const darkAccent = shadeColor(baseColor, -45);
    const lightAccent = shadeColor(baseColor, 40);
    
    // Outer decorative band
    ctx.fillStyle = darkAccent;
    ctx.fillRect(0, 0, canvas.width, size / 3);
    ctx.fillRect(0, canvas.height - size / 3, canvas.width, size / 3);
    
    // Fluted column effect on sides
    const columnCount = Math.floor(originalImage.height / (size * 1.5));
    for (let i = 0; i < columnCount; i++) {
        const y = size + (i * size * 1.5);
        // Left flute
        ctx.strokeStyle = darkAccent;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(size / 2, y);
        ctx.lineTo(size / 2, y + size);
        ctx.stroke();
        
        // Right flute
        ctx.beginPath();
        ctx.moveTo(canvas.width - size / 2, y);
        ctx.lineTo(canvas.width - size / 2, y + size);
        ctx.stroke();
    }
    
    // Triple-line frame border
    ctx.strokeStyle = lightAccent;
    ctx.lineWidth = 2;
    ctx.strokeRect(size / 4, size / 4, canvas.width - (size / 2), canvas.height - (size / 2));
    
    ctx.strokeStyle = darkAccent;
    ctx.lineWidth = 1;
    ctx.strokeRect(size / 2, size / 2, canvas.width - size, canvas.height - size);
    
    ctx.strokeStyle = lightAccent;
    ctx.lineWidth = 0.5;
    ctx.strokeRect(size - 1, size - 1, originalImage.width + 2, originalImage.height + 2);
    
    // Corner rosettes (classical ornaments)
    const corners = [
        [size / 2, size / 2],
        [canvas.width - size / 2, size / 2],
        [size / 2, canvas.height - size / 2],
        [canvas.width - size / 2, canvas.height - size / 2]
    ];
    
    corners.forEach(([x, y]) => {
        // Rosette center
        ctx.fillStyle = darkAccent;
        ctx.beginPath();
        ctx.arc(x, y, size / 8, 0, Math.PI * 2);
        ctx.fill();
        
        // Petal pattern
        for (let i = 0; i < 8; i++) {
            const angle = (Math.PI * 2 / 8) * i;
            const px = x + Math.cos(angle) * (size / 6);
            const py = y + Math.sin(angle) * (size / 6);
            ctx.fillStyle = lightAccent;
            ctx.beginPath();
            ctx.ellipse(px, py, size / 12, size / 10, angle, 0, Math.PI * 2);
            ctx.fill();
        }
    });
}

function drawMetallicFrame(size) {
    // Sophisticated brushed metallic frame with realistic texture
    const baseColor = '#5A5A5A';
    const lightMetallic = '#CCCCCC';
    const darkMetallic = '#2A2A2A';
    
    ctx.fillStyle = baseColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Brushed metal directional texture (vertical lines for vertical grain)
    ctx.strokeStyle = 'rgba(200, 200, 200, 0.15)';
    ctx.lineWidth = 0.5;
    for (let x = 0; x < canvas.width; x += Math.random() * 3 + 1) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x + Math.random() * 2, canvas.height);
        ctx.stroke();
    }
    
    // Darker brushed lines for contrast
    ctx.strokeStyle = 'rgba(50, 50, 50, 0.2)';
    for (let x = size; x < canvas.width - size; x += Math.random() * 4 + 2) {
        ctx.beginPath();
        ctx.moveTo(x, size);
        ctx.lineTo(x + Math.random() * 1, originalImage.height + size);
        ctx.stroke();
    }
    
    // Multi-layer metallic border with gradient effect
    // Outer beveled edge
    ctx.strokeStyle = lightMetallic;
    ctx.lineWidth = 2;
    ctx.strokeRect(size / 3, size / 3, canvas.width - (size * 2 / 3), canvas.height - (size * 2 / 3));
    
    // Main border with subtle gradient appearance
    const gradient = ctx.createLinearGradient(size, size, size, size + originalImage.height);
    gradient.addColorStop(0, lightMetallic);
    gradient.addColorStop(0.5, baseColor);
    gradient.addColorStop(1, darkMetallic);
    ctx.strokeStyle = gradient;
    ctx.lineWidth = size / 2.5;
    ctx.strokeRect(size, size, originalImage.width, originalImage.height);
    
    // Inner shadow edge
    ctx.strokeStyle = darkMetallic;
    ctx.lineWidth = 1;
    ctx.strokeRect(size + size / 3, size + size / 3, originalImage.width - (size * 2 / 3), originalImage.height - (size * 2 / 3));
}

// Helper function to shade colors
function shadeColor(color, percent) {
    const num = parseInt(color.replace("#",""), 16);
    const amt = Math.round(2.55 * percent);
    const R = (num >> 16) + amt;
    const G = (num >> 8 & 0x00FF) + amt;
    const B = (num & 0x0000FF) + amt;
    return "#" + (0x1000000 + (R<255?R<1?0:R:255)*0x10000 +
        (G<255?G<1?0:G:255)*0x100 + (B<255?B<1?0:B:255))
        .toString(16).slice(1);
}

// Download image
downloadBtn.addEventListener('click', () => {
    const link = document.createElement('a');
    link.download = 'framed-photo.png';
    link.href = canvas.toDataURL('image/png');
    link.click();
});

// Reset
resetBtn.addEventListener('click', () => {
    originalImage = null;
    frameSelector.classList.add('hidden');
    canvasContainer.classList.add('hidden');
    downloadSection.classList.add('hidden');
    dimensionsDisplay.classList.add('hidden');
    imageInput.value = '';
    currentFrameColor = '#8B4513';
    currentFrameWidth = 1.0;
    cornerStyle = 'rounded';
    frameWidth.value = '1.0';
    widthValue.textContent = '1.00';
    colorInput.value = '#8B4513';
    colorHex.textContent = '#8B4513';
    document.querySelectorAll('.frame-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.color-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.toggle-btn').forEach(b => b.classList.remove('active'));
    document.querySelector('.toggle-btn[data-corner="rounded"]').classList.add('active');
});