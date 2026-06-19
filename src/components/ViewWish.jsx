import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { decodeWish } from '../utils/wishEncoder';
import confetti from 'canvas-confetti';
import { Sparkles } from 'lucide-react';

const ViewWish = () => {
    const [searchParams] = useSearchParams();
    const [data, setData] = useState(null);
    const [showSurprise, setShowSurprise] = useState(false);
    const [countdown, setCountdown] = useState(null);
    const [showShareModal, setShowShareModal] = useState(false);
    const [error, setError] = useState(null);
    const [isOpening, setIsOpening] = useState(false);

    useEffect(() => {
        try {
            const encoded = searchParams.get('data');
            console.log("Encoded param:", encoded);
            if (encoded) {
                const decoded = decodeWish(encoded);
                console.log("Decoded data:", decoded);
                if (decoded) {
                    setData(decoded);
                    document.body.setAttribute('data-theme', decoded.theme);
                    // Dispatch event to change music
                    window.dispatchEvent(new CustomEvent('change-theme', { detail: decoded.theme }));

                    // Soft confetti
                    triggerSoftConfetti();
                } else {
                    setError("Failed to decode wish data.");
                }
            } else {
                setError("No wish data found in URL.");
            }
        } catch (e) {
            console.error("Error in ViewWish effect:", e);
            setError(e.message);
        }
    }, [searchParams]);

    const triggerSoftConfetti = () => {
        const duration = 2000;
        const end = Date.now() + duration;
        (function frame() {
            confetti({
                particleCount: 2,
                angle: 60,
                spread: 55,
                origin: { x: 0 },
                colors: ['#ffc0cb', '#87ceeb', '#ffd700']
            });
            confetti({
                particleCount: 2,
                angle: 120,
                spread: 55,
                origin: { x: 1 },
                colors: ['#ffc0cb', '#87ceeb', '#ffd700']
            });
            if (Date.now() < end) {
                requestAnimationFrame(frame);
            }
        }());
    };

    const handleGiftClick = () => {
        if (isOpening) return;
        setIsOpening(true);

        window.dispatchEvent(new Event('start-music'));

        // Shaking and untying animation lasts 800ms before countdown starts
        setTimeout(() => {
            setCountdown(3);
            let count = 3;
            const timer = setInterval(() => {
                count--;
                if (count > 0) {
                    setCountdown(count);
                } else {
                    clearInterval(timer);
                    setCountdown(null);
                    setShowSurprise(true);
                    setIsOpening(false);
                    triggerFireworks();
                }
            }, 1000);
        }, 800);
    };

    const triggerFireworks = () => {
        const duration = 5 * 1000;
        const animationEnd = Date.now() + duration;
        const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 };
        const randomInRange = (min, max) => Math.random() * (max - min) + min;

        const interval = setInterval(function () {
            const timeLeft = animationEnd - Date.now();
            if (timeLeft <= 0) return clearInterval(interval);

            const particleCount = 50 * (timeLeft / duration);
            confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 } });
            confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 } });
        }, 250);
    };

    const handleShare = async () => {
        const url = window.location.href;
        const msg = `🎂 Birthday wish for ${data?.name || 'someone special'}! Tap to open a special surprise 🎁: ${url}`;

        // 1. Try Native Share (Mobile)
        if (navigator.share) {
            try {
                await navigator.share({ title: `Birthday Wish 🎂`, text: msg, url });
                return;
            } catch (err) {
                // User cancelled or not supported
                if (err.name === 'AbortError') return;
            }
        }

        // 2. Fallback: WhatsApp direct
        const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(msg)}`;
        window.open(whatsappUrl, '_blank');
    };

    const copyLink = () => {
        navigator.clipboard.writeText(window.location.href).then(() => {
            alert("Link copied! Now paste it anywhere 📋");
        }).catch(() => {
            // Fallback
            const el = document.createElement('textarea');
            el.value = window.location.href;
            document.body.appendChild(el);
            el.select();
            document.execCommand('copy');
            document.body.removeChild(el);
            alert("Link copied! 📋");
        });
    };

    const getDefaultMessage = (relation) => {
        const map = {
            'Friend': "Happy Birthday! Let's party hard and make some crazy memories! 🥳",
            'Sister': "Happy Birthday to the cutest sister! You make the world brighter. 🌸",
            'Brother': "Happy Birthday Bro! Stay awesome and keep rocking! 🎸",
            'Cousin': "Happy Birthday! Wishing you a day full of fun and laughter! 😄",
            'Mom': "Happy Birthday Mom! Thank you for your endless love and grace. ❤️",
            'Dad': "Happy Birthday Dad! You are my hero and my guide. 🎩",
            'Phopu': "Happy Birthday Phopu! Wish you lots of happiness and health. 💖",
            'Chahu': "Happy Birthday Chahu! Have a fantastic day full of joy. 🎉",
            'Mamu': "Happy Birthday Mamu! You are the coolest, have a blast! 😎",
            'Khala': "Happy Birthday Khala! Sending you warm hugs and wishes. 🌹",
            'Special One': "Happy Birthday my love! You mean everything to me. ✨"
        };
        return map[relation] || `Wishing you a fantastic birthday filled with joy! You are a truly special ${relation?.toLowerCase()}.`;
    };

    if (error) return <div className="text-center mt-20 text-red-500 font-bold p-4 bg-white/80 rounded-lg">{error}</div>;
    if (!data) return <div className="text-center mt-20 text-xl font-bold text-white">Loading magic...</div>;

    return (
        <div className="flex flex-col items-center justify-center min-h-[80vh] py-10">
            {countdown && (
                <div className="fixed inset-0 flex items-center justify-center z-50 bg-black/80">
                    <h1 className="text-9xl font-bold text-white animate-bounce">{countdown}</h1>
                </div>
            )}

            <div style={{ position: 'fixed', bottom: '1.5rem', right: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.6rem', zIndex: 99 }}>
                <button
                    onClick={copyLink}
                    style={{ fontSize: '0.85rem', padding: '0.65rem 1.1rem', borderRadius: '9999px', background: 'rgba(30,30,30,0.75)', color: '#fff', border: '1px solid rgba(255,255,255,0.25)', backdropFilter: 'blur(8px)', boxShadow: '0 6px 18px rgba(0,0,0,0.25)', display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer', fontWeight: 600 }}
                    aria-label="Copy Link"
                >
                    📋 Copy Link
                </button>
                <button
                    onClick={handleShare}
                    className="share-fab"
                    aria-label="Share Wish"
                    style={{ position: 'relative', bottom: 'auto', right: 'auto' }}
                >
                    🔗 Share / WhatsApp
                </button>
            </div>

            {!showSurprise ? (
                <div className="gift-box-container float-anim">
                    <h2 className="gift-box-title">
                        <Sparkles className="text-yellow-400 animate-pulse" /> Tap the Gift to Open <Sparkles className="text-yellow-400 animate-pulse" />
                    </h2>
                    <div 
                        className={`gift-box ${isOpening ? 'opening' : ''}`}
                        onClick={handleGiftClick}
                        title="Click to open your surprise!"
                    >
                        <div className="gift-bow"></div>
                        <div className="gift-lid"></div>
                        <div className="gift-ribbon-v"></div>
                        <div className="gift-ribbon-h"></div>
                    </div>
                </div>
            ) : (
                <div className="card text-center animate-fade-in space-y-6 max-w-2xl mx-auto">
                    <h1 className="text-5xl md:text-6xl font-extrabold gradient-text mb-4 leading-tight">
                        Happy Birthday <br />
                        <span className="text-6xl md:text-7xl block mt-2">{data.name}!</span>
                    </h1>

                    <p className="text-xl md:text-2xl leading-relaxed opacity-90 font-medium whitespace-pre-line">
                        {data.message || getDefaultMessage(data.relation)}
                    </p>

                    {data.images && data.images.length > 0 && (
                        <div className="memories-container">
                            <h3 className="memories-title">📸 Memories</h3>
                            <div className={`memories-grid count-${data.images.length}`}>
                                {data.images.map((img, index) => (
                                    <div 
                                        key={index} 
                                        className="memory-card"
                                        onClick={() => window.open(img, '_blank')}
                                        title="Click to view full image"
                                    >
                                        <img
                                            src={img}
                                            alt={`Memory ${index + 1}`}
                                            loading="lazy"
                                        />
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {data.sender && (
                        <div className="mt-8 pt-6 border-t border-gray-200/20">
                            <p className="italic text-lg">With love from,</p>
                            <h3 className="text-2xl font-bold">{data.sender}</h3>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default ViewWish;
