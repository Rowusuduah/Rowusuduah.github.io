document.addEventListener('DOMContentLoaded', function() {
    // Initialize AOS
    AOS.init({
        duration: 700,
        once: true,
        offset: 50,
    });

    // --- Theme Toggle ---
    const themeToggleBtn = document.getElementById('theme-toggle');
    const darkIcon = document.getElementById('theme-toggle-dark-icon');
    const lightIcon = document.getElementById('theme-toggle-light-icon');

    if (localStorage.getItem('theme') === 'dark' || (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
        lightIcon.classList.remove('hidden');
    } else {
        darkIcon.classList.remove('hidden');
    }

    themeToggleBtn.addEventListener('click', function() {
        darkIcon.classList.toggle('hidden');
        lightIcon.classList.toggle('hidden');
        document.documentElement.classList.toggle('dark');
        if (document.documentElement.classList.contains('dark')) {
            localStorage.setItem('theme', 'dark');
        } else {
            localStorage.setItem('theme', 'light');
        }
        // Re-initialize canvas animation with new colors
        initTrafficAnimation();
    });

    // --- Mobile Menu ---
    const mobileMenuButton = document.getElementById('mobile-menu-button');
    const mobileMenu = document.getElementById('mobile-menu');
    mobileMenuButton.addEventListener('click', () => {
        mobileMenu.classList.toggle('hidden');
    });
    mobileMenu.addEventListener('click', (e) => {
        if (e.target.tagName === 'A') {
            mobileMenu.classList.add('hidden');
        }
    });

    // --- Scroll to Top Button ---
    const scrollToTopBtn = document.getElementById('scroll-to-top');
    window.addEventListener('scroll', () => {
        if (window.scrollY > 300) {
            scrollToTopBtn.classList.remove('opacity-0', 'translate-y-4');
        } else {
            scrollToTopBtn.classList.add('opacity-0', 'translate-y-4');
        }
    });
    scrollToTopBtn.addEventListener('click', () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });

    // --- Project Modal ---
    const projectModal = document.getElementById('project-modal');
    const projectModalContent = document.getElementById('project-modal-content');
    const closeModalBtn = document.getElementById('close-modal-btn');
    const modalTitle = document.getElementById('modal-title');
    const modalTools = document.getElementById('modal-tools');
    const modalSummary = document.getElementById('modal-summary');
    
    document.querySelectorAll('.view-project-btn').forEach(button => {
        button.addEventListener('click', () => {
            const card = button.closest('.project-card');
            modalTitle.textContent = card.dataset.title;
            modalSummary.innerHTML = `<p>${card.dataset.summary.replace(/\n/g, '</p><p>')}</p>`;
            modalTools.innerHTML = '';
            card.dataset.tools.split(', ').forEach(tool => {
                const toolEl = document.createElement('span');
                toolEl.className = 'tool-tag';
                toolEl.textContent = tool;
                modalTools.appendChild(toolEl);
            });
            projectModal.classList.remove('hidden');
            setTimeout(() => projectModalContent.classList.remove('scale-95'), 10);
        });
    });

    function closeProjectModal() {
        projectModalContent.classList.add('scale-95');
        setTimeout(() => projectModal.classList.add('hidden'), 300);
    }
    closeModalBtn.addEventListener('click', closeProjectModal);
    projectModal.addEventListener('click', (e) => e.target === projectModal && closeProjectModal());
    
    // --- Gallery Lightbox Modal ---
    const galleryModal = document.getElementById('gallery-modal');
    const galleryModalImage = document.getElementById('gallery-modal-image');
    const closeGalleryModalBtn = document.getElementById('close-gallery-modal-btn');

    document.querySelectorAll('.gallery-item img').forEach(img => {
        img.addEventListener('click', () => {
            galleryModalImage.src = img.src;
            galleryModal.classList.remove('hidden');
        });
    });

    function closeGalleryModal() {
        galleryModal.classList.add('hidden');
    }
    closeGalleryModalBtn.addEventListener('click', closeGalleryModal);
    galleryModal.addEventListener('click', (e) => e.target === galleryModal && closeGalleryModal());

    // --- Close modals with Escape key ---
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            if (!projectModal.classList.contains('hidden')) closeProjectModal();
            if (!galleryModal.classList.contains('hidden')) closeGalleryModal();
        }
    });

    // --- Project Filtering ---
    const filterButtons = document.querySelectorAll('.filter-btn');
    const projectGrid = document.getElementById('project-grid');
    const projectCards = Array.from(projectGrid.children);

    filterButtons.forEach(button => {
        button.addEventListener('click', () => {
            filterButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');

            const filter = button.dataset.filter;

            projectCards.forEach(card => {
                const tags = card.dataset.tags.split(',');
                if (filter === 'all' || tags.includes(filter)) {
                    card.style.display = 'block';
                } else {
                    card.style.display = 'none';
                }
            });
        });
    });

    // --- Traffic Simulation Animation ---
    const canvas = document.getElementById('hero-canvas');
    const ctx = canvas.getContext('2d');

    let roads = [];
    let intersections = [];
    let vehicles = [];
    
    const roadWidth = 30;
    const vehicleSize = { w: 16, h: 8 };
    const stopLineOffset = roadWidth / 2 + 5;
    const detectionDistance = 150;
    const carColors = ['#3b82f6'];

    class TrafficLight {
        constructor(x, y) {
            this.x = x;
            this.y = y;
            this.state = Math.random() > 0.5 ? 0 : 2; // 0: V_GREEN, 2: H_GREEN
            this.timer = 0;
            this.minGreenTime = 3000;
            this.maxGreenTime = 10000;
            this.yellowTime = 1500;
            this.allRedTime = 500;
        }

        update(deltaTime, verticalQueue, horizontalQueue) {
            this.timer += deltaTime;
            switch(this.state) {
                case 0: // Vertical Green
                    if ((this.timer > this.minGreenTime && horizontalQueue > 0) || this.timer > this.maxGreenTime) {
                        this.state = 1; this.timer = 0;
                    }
                    break;
                case 1: // Vertical Yellow
                    if (this.timer > this.yellowTime) {
                        this.state = 4; this.timer = 0;
                    }
                    break;
                case 2: // Horizontal Green
                    if ((this.timer > this.minGreenTime && verticalQueue > 0) || this.timer > this.maxGreenTime) {
                        this.state = 3; this.timer = 0;
                    }
                    break;
                case 3: // Horizontal Yellow
                    if (this.timer > this.yellowTime) {
                        this.state = 4; this.timer = 0;
                    }
                    break;
                case 4: // All Red
                    if (this.timer > this.allRedTime) {
                        this.state = (horizontalQueue >= verticalQueue) ? 2 : 0;
                        this.timer = 0;
                    }
                    break;
            }
        }

        draw() {
            const lightSize = 6;
            let verticalColor, horizontalColor;
            switch(this.state) {
                case 0: verticalColor = '#22c55e'; horizontalColor = '#ef4444'; break;
                case 1: verticalColor = '#facc15'; horizontalColor = '#ef4444'; break;
                case 2: verticalColor = '#ef4444'; horizontalColor = '#22c55e'; break;
                case 3: verticalColor = '#ef4444'; horizontalColor = '#facc15'; break;
                case 4: verticalColor = '#ef4444'; horizontalColor = '#ef4444'; break;
            }
            ctx.fillStyle = verticalColor;
            ctx.fillRect(this.x - roadWidth / 2 - lightSize - 2, this.y - roadWidth / 2 - lightSize - 2, lightSize, lightSize);
            ctx.fillRect(this.x + roadWidth / 2 + 2, this.y + roadWidth / 2 + 2, lightSize, lightSize);
            ctx.fillStyle = horizontalColor;
            ctx.fillRect(this.x + roadWidth / 2 + 2, this.y - roadWidth / 2 - lightSize - 2, lightSize, lightSize);
            ctx.fillRect(this.x - roadWidth / 2 - lightSize - 2, this.y + roadWidth / 2 + 2, lightSize, lightSize);
        }
    }

    class Vehicle {
        constructor(roadIndex, type = 'car', initialPos) {
            this.roadIndex = roadIndex;
            this.road = roads[roadIndex];
            this.pos = initialPos;
            this.type = type;
            this.laneOffset = 0;
            this.isStopped = false;
            this.isHighBeam = true;

            if (this.type === 'ambulance') {
                this.speed = 2.2;
                this.color = '#ffffff';
            } else {
                this.speed = (Math.random() * 0.8 + 0.8);
                this.color = carColors[Math.floor(Math.random() * carColors.length)];
            }
        }

        update() {
            this.isStopped = false;
            let isYielding = false;
            this.isHighBeam = true;
            
            if (this.type === 'car') {
                // 1. Light Check
                for (const intersection of intersections) {
                    if ((this.road.vertical && this.road.pos !== intersection.x) || (!this.road.vertical && this.road.pos !== intersection.y)) continue;
                    const light = intersection.light;
                    const stopPoint = this.road.vertical ? intersection.y : intersection.x;
                    const stopDist = this.road.dir === 'down' || this.road.dir === 'right' ? stopPoint - (stopLineOffset + vehicleSize.w / 2) : stopPoint + (stopLineOffset + vehicleSize.w / 2);
                    const dist = this.road.dir === 'down' || this.road.dir === 'right' ? stopDist - this.pos : this.pos - stopDist;

                    if (dist < 0 && dist > -this.speed * 2) {
                        const canGo = (this.road.vertical && light.state === 0) || (!this.road.vertical && light.state === 2);
                        if (!canGo) {
                            this.pos = stopDist;
                            this.isStopped = true;
                            break;
                        }
                    }
                }

                // 2. Vehicle Following Check
                if (!this.isStopped) {
                    const safetyGap = vehicleSize.w * 1.5;
                    for (const other of vehicles) {
                        if (this === other || this.roadIndex !== other.roadIndex) continue;

                        let distance;
                        if (this.road.dir === other.road.dir) {
                            if (this.road.dir === 'down' || this.road.dir === 'right') distance = other.pos - this.pos;
                            else distance = this.pos - other.pos;
                        } else continue;

                        if (other.type === 'ambulance' && distance > 0 && distance < 300) {
                            isYielding = true;
                        }

                        if (distance > 0 && distance < safetyGap) {
                            this.isStopped = true;
                            this.isHighBeam = false; // Dim lights when behind another car
                            break;
                        }
                    }
                }
            }
            
            const targetOffset = isYielding ? (roadWidth / 4) : 0;
            this.laneOffset += (targetOffset - this.laneOffset) * 0.15; // Faster pull-over

            if (!this.isStopped) {
                const currentSpeed = isYielding ? this.speed * 0.5 : this.speed;
                if (this.road.dir === 'up' || this.road.dir === 'left') this.pos -= currentSpeed;
                else this.pos += currentSpeed;
            }
            
            const length = this.road.vertical ? canvas.height : canvas.width;
            const isOffScreen = (this.road.dir === 'down' || this.road.dir === 'right') ? this.pos > length + 50 : this.pos < -50;

            if (isOffScreen) {
                const myIndex = vehicles.findIndex(v => v === this);
                if (myIndex !== -1) {
                    vehicles[myIndex] = new Vehicle(this.roadIndex, 'car', (this.road.dir === 'down' || this.road.dir === 'right') ? -50 : length + 50);
                }
            }
        }

        draw() {
            ctx.save();
            let xPos = this.road.vertical ? this.road.pos + this.laneOffset : this.pos;
            let yPos = this.road.vertical ? this.pos : this.road.pos + this.laneOffset;
            
            ctx.translate(xPos, yPos);

            if (this.road.dir === 'down') ctx.rotate(Math.PI / 2);
            else if (this.road.dir === 'up') ctx.rotate(-Math.PI / 2);
            else if (this.road.dir === 'left') ctx.rotate(Math.PI);
            
            ctx.fillStyle = this.color;
            ctx.fillRect(-vehicleSize.w / 2, -vehicleSize.h / 2, vehicleSize.w, vehicleSize.h);
            
            if (this.type === 'ambulance') {
                ctx.fillStyle = '#ef4444';
                ctx.fillRect(-3, -2, 6, 4);
                ctx.fillRect(-2, -3, 4, 6);
            }
            
            // Headlights
            if (document.documentElement.classList.contains('dark')) {
                const highBeam = this.type === 'ambulance' || this.isHighBeam;
                const beamLength = highBeam ? 60 : 30;
                const beamWidth = highBeam ? 25 : 20;
                const beamOpacity = highBeam ? 0.25 : 0.15;
                
                const gradient = ctx.createLinearGradient(vehicleSize.w / 2, 0, vehicleSize.w / 2 + beamLength, 0);
                gradient.addColorStop(0, `rgba(255, 255, 255, ${beamOpacity})`);
                gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');

                ctx.fillStyle = gradient;
                ctx.beginPath();
                ctx.moveTo(vehicleSize.w / 2, -vehicleSize.h / 2);
                ctx.lineTo(vehicleSize.w / 2 + beamLength, -beamWidth / 2);
                ctx.lineTo(vehicleSize.w / 2 + beamLength, beamWidth / 2);
                ctx.lineTo(vehicleSize.w / 2, vehicleSize.h / 2);
                ctx.closePath();
                ctx.fill();
            }

            ctx.restore();
        }
    }

    function drawRoads() {
        ctx.strokeStyle = getComputedStyle(document.documentElement).getPropertyValue('--road-color');
        ctx.lineWidth = roadWidth;
        ctx.lineCap = 'round';
        for (const road of roads) {
            ctx.beginPath();
            if (road.vertical) {
                ctx.moveTo(road.pos, 0);
                ctx.lineTo(road.pos, canvas.height);
            } else {
                ctx.moveTo(0, road.pos);
                ctx.lineTo(canvas.width, road.pos);
            }
            ctx.stroke();
        }
    }

    function drawStopLines() {
        ctx.strokeStyle = document.documentElement.classList.contains('dark') ? 'rgba(255, 255, 255, 0.1)' : 'rgba(203, 213, 225, 0.5)';
        ctx.lineWidth = 2;
        for (const intersection of intersections) {
            // Horizontal road stop lines
            ctx.beginPath();
            ctx.moveTo(intersection.x - roadWidth/2, intersection.y - stopLineOffset);
            ctx.lineTo(intersection.x + roadWidth/2, intersection.y - stopLineOffset);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(intersection.x - roadWidth/2, intersection.y + stopLineOffset);
            ctx.lineTo(intersection.x + roadWidth/2, intersection.y + stopLineOffset);
            ctx.stroke();

            // Vertical road stop lines
            ctx.beginPath();
            ctx.moveTo(intersection.x - stopLineOffset, intersection.y - roadWidth/2);
            ctx.lineTo(intersection.x - stopLineOffset, intersection.y + roadWidth/2);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(intersection.x + stopLineOffset, intersection.y - roadWidth/2);
            ctx.lineTo(intersection.x + stopLineOffset, intersection.y + roadWidth/2);
            ctx.stroke();
        }
    }
    
    function spawnAmbulance() {
        if (vehicles.some(v => v.type === 'ambulance')) return;
        const randomIndex = Math.floor(Math.random() * vehicles.length);
        const oldVehicle = vehicles[randomIndex];
        vehicles[randomIndex] = new Vehicle(oldVehicle.roadIndex, 'ambulance', oldVehicle.pos);
    }

    function initTrafficAnimation() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        
        roads = [
            { pos: canvas.width * 0.1, vertical: true, dir: 'down' },
            { pos: canvas.width * 0.9, vertical: true, dir: 'up' },
            { pos: canvas.height * 0.1, vertical: false, dir: 'right' },
            { pos: canvas.height * 0.9, vertical: false, dir: 'left' },
        ];

        intersections = [];
        for (let vRoad of roads.filter(r => r.vertical)) {
            for (let hRoad of roads.filter(r => !r.vertical)) {
                intersections.push({
                    x: vRoad.pos,
                    y: hRoad.pos,
                    light: new TrafficLight(vRoad.pos, hRoad.pos)
                });
            }
        }
        
        vehicles = [];
        for (let i = 0; i < roads.length; i++) {
            const length = roads[i].vertical ? canvas.height : canvas.width;
            for (let j = 0; j < 10; j++) {
                 vehicles.push(new Vehicle(i, 'car', Math.random() * length));
            }
        }
    }

    let lastTime = 0;
    function animateTraffic(timestamp) {
        if (!lastTime) lastTime = timestamp;
        const deltaTime = timestamp - lastTime;
        lastTime = timestamp;

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        drawRoads();
        drawStopLines();

        for (const intersection of intersections) {
            let verticalQueue = 0;
            let horizontalQueue = 0;
            for (const vehicle of vehicles) {
                if (vehicle.type === 'car' && vehicle.isStopped) {
                    if (vehicle.road.vertical && vehicle.road.pos === intersection.x) {
                        if (Math.abs(vehicle.pos - intersection.y) < detectionDistance) verticalQueue++;
                    } else if (!vehicle.road.vertical && vehicle.road.pos === intersection.y) {
                         if (Math.abs(vehicle.pos - intersection.x) < detectionDistance) horizontalQueue++;
                    }
                }
            }
            intersection.light.update(deltaTime, verticalQueue, horizontalQueue);
            intersection.light.draw();
        }

        for (const vehicle of vehicles) {
            vehicle.update();
            vehicle.draw();
        }

        requestAnimationFrame(animateTraffic);
    }

    window.addEventListener('resize', initTrafficAnimation);
    initTrafficAnimation();
    requestAnimationFrame(animateTraffic);
    setInterval(spawnAmbulance, 25000);
});
