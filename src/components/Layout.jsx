import React, { useState, useEffect, useRef } from 'react';
import { VolumeX } from 'lucide-react';

const Layout = ({ children }) => {
    const [isPlaying, setIsPlaying] = useState(false);
    const audioRef = useRef(null);
    const canvasRef = useRef(null);

    const musicTracks = {
        party: 'https://commondatastorage.googleapis.com/codeskulptor-demos/riceracer_assets/music/race2.ogg',
        cute: 'https://commondatastorage.googleapis.com/codeskulptor-demos/pyman_assets/intromusic.ogg',
        elegant: 'https://commondatastorage.googleapis.com/codeskulptor-demos/riceracer_assets/music/start.ogg',
        romantic: 'https://codeskulptor-demos.commondatastorage.googleapis.com/GalaxyInvaders/theme_01.mp3',
        funny: 'https://commondatastorage.googleapis.com/codeskulptor-assets/sounddogs/soundtrack.mp3',
        default: 'https://commondatastorage.googleapis.com/codeskulptor-demos/riceracer_assets/music/win.ogg'
    };

    const [currentTheme, setCurrentTheme] = useState('party');

    // Initialize audio once
    if (!audioRef.current) {
        audioRef.current = new Audio();
        audioRef.current.loop = true;
        audioRef.current.volume = 0.4;
        audioRef.current.src = musicTracks.party;
    }

    // Update src when theme changes
    useEffect(() => {
        const trackUrl = musicTracks[currentTheme] || musicTracks.default;
        if (audioRef.current && audioRef.current.src !== trackUrl) {
            const wasPlaying = !audioRef.current.paused;
            audioRef.current.src = trackUrl;
            if (wasPlaying) {
                audioRef.current.play().catch(e => console.log("Theme change track play failed:", e));
            }
        }
    }, [currentTheme]);

    // Canvas Particles System
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        let animationFrameId;
        let particles = [];

        const resizeCanvas = () => {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
        };
        resizeCanvas();
        window.addEventListener('resize', resizeCanvas);

        const themeEmojis = {
            party: ['🎈', '🎉', '🥳', '🎁', '🍰', '✨'],
            cute: ['🌸', '🐱', '🧁', '🧸', '🍬', '⭐'],
            elegant: ['✨', '⭐', '💎', '👑', '💫', '🥂'],
            romantic: ['❤️', '💖', '🌹', '💋', '🧸', '💌'],
            funny: ['😜', '🤣', '🤡', '🍌', '🕺', '🦄'],
            default: ['✨', '⭐', '🎈']
        };

        class Particle {
            constructor() {
                this.reset();
                this.y = Math.random() * canvas.height; // Spread initially
            }

            reset() {
                this.x = Math.random() * canvas.width;
                this.size = Math.random() * 12 + 12; // 12px to 24px
                this.opacity = Math.random() * 0.4 + 0.3; // 0.3 to 0.7 opacity
                this.speedX = Math.random() * 0.8 - 0.4; // Drift side to side
                
                const emojis = themeEmojis[currentTheme] || themeEmojis.default;
                this.emoji = emojis[Math.floor(Math.random() * emojis.length)];

                if (currentTheme === 'elegant') {
                    // Falling gold glitter
                    this.speedY = Math.random() * 0.4 + 0.2;
                    this.y = -20;
                } else if (currentTheme === 'party' || currentTheme === 'cute' || currentTheme === 'romantic') {
                    // Floating upwards
                    this.speedY = -(Math.random() * 0.5 + 0.3);
                    this.y = canvas.height + 20;
                } else {
                    // Floating randomly
                    this.speedY = Math.random() * 0.6 - 0.3;
                    this.y = Math.random() * canvas.height;
                }
                
                this.rotation = Math.random() * Math.PI * 2;
                this.spinSpeed = Math.random() * 0.02 - 0.01;
                this.wiggleSpeed = Math.random() * 0.02 + 0.01;
                this.wiggleWidth = Math.random() * 1.2 + 0.4;
                this.wiggleTimer = Math.random() * 100;
            }

            update() {
                this.x += this.speedX + Math.sin(this.wiggleTimer) * this.wiggleWidth;
                this.y += this.speedY;
                this.rotation += this.spinSpeed;
                this.wiggleTimer += this.wiggleSpeed;

                // Elegant theme gets starry sparkle effect
                if (currentTheme === 'elegant') {
                    this.opacity += Math.sin(this.wiggleTimer) * 0.03;
                    if (this.opacity < 0.2) this.opacity = 0.2;
                    if (this.opacity > 0.7) this.opacity = 0.7;
                }

                // Recycle particles
                if (currentTheme === 'elegant' && this.y > canvas.height + 20) {
                    this.reset();
                } else if ((currentTheme === 'party' || currentTheme === 'cute' || currentTheme === 'romantic') && this.y < -20) {
                    this.reset();
                } else if (this.x < -20 || this.x > canvas.width + 20 || this.y < -20 || this.y > canvas.height + 20) {
                    this.reset();
                }
            }

            draw() {
                ctx.save();
                ctx.globalAlpha = this.opacity;
                ctx.translate(this.x, this.y);
                ctx.rotate(this.rotation);
                ctx.font = `${this.size}px sans-serif`;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(this.emoji, 0, 0);
                ctx.restore();
            }
        }

        // Limit particles count dynamically for mobile devices
        const maxParticles = Math.min(25, Math.floor((canvas.width * canvas.height) / 40000));
        particles = Array.from({ length: maxParticles }, () => new Particle());

        const animate = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            particles.forEach(p => {
                p.update();
                p.draw();
            });
            animationFrameId = requestAnimationFrame(animate);
        };
        animate();

        return () => {
            window.removeEventListener('resize', resizeCanvas);
            cancelAnimationFrame(animationFrameId);
        };
    }, [currentTheme]);

    useEffect(() => {
        // Document interaction trigger to play audio
        const unlockAudio = () => {
            if (audioRef.current && audioRef.current.paused) {
                audioRef.current.play()
                    .then(() => {
                        setIsPlaying(true);
                        window.removeEventListener('click', unlockAudio);
                        window.removeEventListener('touchstart', unlockAudio);
                    })
                    .catch(e => console.log("Autoplay waiting for interaction..."));
            }
        };

        window.addEventListener('click', unlockAudio);
        window.addEventListener('touchstart', unlockAudio);

        const handleStartMusic = () => {
            if (audioRef.current) {
                audioRef.current.play()
                    .then(() => setIsPlaying(true))
                    .catch(e => console.log("Start music failed:", e));
            }
        };

        const handleChangeTheme = (e) => {
            setCurrentTheme(e.detail);
        };

        window.addEventListener('start-music', handleStartMusic);
        window.addEventListener('change-theme', handleChangeTheme);

        return () => {
            window.removeEventListener('click', unlockAudio);
            window.removeEventListener('touchstart', unlockAudio);
            window.removeEventListener('start-music', handleStartMusic);
            window.removeEventListener('change-theme', handleChangeTheme);
        };
    }, []);

    // Pause audio when leaving the page entirely
    useEffect(() => {
        return () => {
            if (audioRef.current) {
                audioRef.current.pause();
            }
        };
    }, []);

    const toggleMusic = () => {
        if (!audioRef.current) return;
        if (audioRef.current.paused) {
            audioRef.current.play()
                .then(() => setIsPlaying(true))
                .catch(e => console.log("Toggle play failed:", e));
        } else {
            audioRef.current.pause();
            setIsPlaying(false);
        }
    };

    return (
        <div className="min-h-screen w-full relative overflow-x-hidden">
            {/* Background Canvas Particles */}
            <canvas ref={canvasRef} className="particles-canvas" />

            {/* Music Toggle (Fixed) */}
            <button
                onClick={toggleMusic}
                className={`music-toggle-btn ${isPlaying ? 'playing' : ''}`}
                aria-label="Toggle Music"
            >
                {isPlaying ? (
                    <div className="equalizer">
                        <span className="eq-bar bar-1"></span>
                        <span className="eq-bar bar-2"></span>
                        <span className="eq-bar bar-3"></span>
                        <span className="eq-bar bar-4"></span>
                    </div>
                ) : (
                    <VolumeX className="text-gray-500" />
                )}
            </button>

            {/* Main Content */}
            <main className="w-full relative z-10 transition-colors duration-500">
                {children}
            </main>
        </div>
    );
};

export default Layout;
