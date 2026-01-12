import React, { useState, useEffect, useRef } from 'react';
import { Volume2, VolumeX } from 'lucide-react';

const Layout = ({ children }) => {
    const [isPlaying, setIsPlaying] = useState(false);
    const audioRef = useRef(new Audio());

    // Music Tracks (Using reliable CodeSkulptor/Google assets for demo)
    const musicTracks = {
        party: 'https://commondatastorage.googleapis.com/codeskulptor-demos/riceracer_assets/music/race2.ogg', // Upbeat
        cute: 'https://commondatastorage.googleapis.com/codeskulptor-demos/pyman_assets/intromusic.ogg', // Playful/8-bit
        elegant: 'https://commondatastorage.googleapis.com/codeskulptor-demos/riceracer_assets/music/start.ogg', // Calm/Short loop (Placeholder)
        romantic: 'https://codeskulptor-demos.commondatastorage.googleapis.com/GalaxyInvaders/theme_01.mp3', // Space/Synth (Placeholder)
        funny: 'https://commondatastorage.googleapis.com/codeskulptor-assets/sounddogs/soundtrack.mp3', // Funky
        default: 'https://commondatastorage.googleapis.com/codeskulptor-demos/riceracer_assets/music/win.ogg'
    };

    useEffect(() => {
        // Initial Setup
        audioRef.current.loop = true;
        audioRef.current.volume = 0.4;

        // Attempt play on mount (often blocked, but worth trying)
        const initMusic = () => {
            if (!audioRef.current.src) audioRef.current.src = musicTracks.party;
        };
        initMusic();

        // Unlock Audio Context on ANY click in the document
        const unlockAudio = () => {
            if (audioRef.current.paused && !isPlaying) {
                audioRef.current.play().then(() => {
                    setIsPlaying(true);
                }).catch(e => console.log("Waiting for interaction..."));
            }
            // Remove listener after first successful interaction
            if (!audioRef.current.paused) {
                window.removeEventListener('click', unlockAudio);
                window.removeEventListener('touchstart', unlockAudio);
            }
        };

        window.addEventListener('click', unlockAudio);
        window.addEventListener('touchstart', unlockAudio);

        // Listen for custom start event (specific triggers)
        const handleStartMusic = () => {
            if (!isPlaying) {
                audioRef.current.play().catch(console.log);
                setIsPlaying(true);
            }
        };

        // Listen for theme change to switch music
        const handleChangeTheme = (e) => {
            const newTheme = e.detail;
            if (musicTracks[newTheme]) {
                const currentSrc = audioRef.current.src;
                // Map theme to track or use default
                const newSrc = musicTracks[newTheme] || musicTracks.default;

                if (currentSrc !== newSrc) {
                    audioRef.current.src = newSrc;
                    // If it was playing, or we want it to play now
                    audioRef.current.play().then(() => setIsPlaying(true)).catch(console.log);
                }
            }
        };

        window.addEventListener('start-music', handleStartMusic);
        window.addEventListener('change-theme', handleChangeTheme);

        return () => {
            window.removeEventListener('click', unlockAudio);
            window.removeEventListener('touchstart', unlockAudio);
            window.removeEventListener('start-music', handleStartMusic);
            window.removeEventListener('change-theme', handleChangeTheme);
            audioRef.current.pause();
        }
    }, [isPlaying]);

    const toggleMusic = () => {
        if (audioRef.current.paused) {
            audioRef.current.play().then(() => setIsPlaying(true)).catch(e => console.log("Play failed", e));
        } else {
            audioRef.current.pause();
            setIsPlaying(false);
        }
    };

    return (
        <div className="min-h-screen w-full relative overflow-x-hidden">
            {/* Music Toggle (Fixed) */}
            <button
                onClick={toggleMusic}
                className="fixed top-4 right-4 z-50 p-3 bg-white/80 backdrop-blur-sm rounded-full shadow-lg hover:scale-110 transition-all"
                aria-label="Toggle Music"
            >
                {isPlaying ? <Volume2 className="w-6 h-6 text-pink-500" /> : <VolumeX className="w-6 h-6 text-gray-500" />}
            </button>

            {/* Main Content */}
            <main className="w-full relative z-10 transition-colors duration-500">
                {children}
            </main>
        </div>
    );
};

export default Layout;
