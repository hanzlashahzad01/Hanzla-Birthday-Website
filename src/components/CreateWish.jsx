import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { saveWish } from '../utils/wishStorage';
import { uploadImages } from '../utils/imageUpload';
import { buildWhatsAppShareUrlSafe } from '../utils/shareHelpers';
import { Gift, Heart, Copy, Share2, ExternalLink } from 'lucide-react';

const CreateWish = () => {
    const navigate = useNavigate();
    const [formData, setFormData] = useState({
        name: '',
        relation: 'Friend',
        theme: 'party',
        message: '',
        sender: '',
        images: []
    });
    const [isGenerating, setIsGenerating] = useState(false);
    const [generatedLink, setGeneratedLink] = useState(null);
    const [copied, setCopied] = useState(false);

    const relations = ['Friend', 'Sister', 'Brother', 'Cousin', 'Mom', 'Dad', 'Phopu', 'Chahu', 'Mamu', 'Khala', 'Special One'];

    // Auto-select theme based on relation
    const handleRelationChange = (e) => {
        const rel = e.target.value;
        let theme = 'party'; // Default for Friend/Cousin
        if (rel === 'Sister') theme = 'cute';
        if (rel === 'Mom' || rel === 'Dad') theme = 'elegant';
        if (rel === 'Phopu' || rel === 'Khala') theme = 'cute';
        if (rel === 'Chahu' || rel === 'Mamu') theme = 'party';
        if (rel === 'Special One') theme = 'romantic';

        setFormData(prev => ({ ...prev, relation: rel, theme }));

        // Update live preview of theme
        document.body.setAttribute('data-theme', theme);
        window.dispatchEvent(new CustomEvent('change-theme', { detail: theme }));
    };

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
        if (e.target.name === 'theme') {
            document.body.setAttribute('data-theme', e.target.value);
        }
    };

    const resizeImage = (file) => {
        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                const img = new Image();
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    let width = img.width;
                    let height = img.height;
                    const max_size = 400; // Resize to max 400px for smaller uploads

                    if (width > height) {
                        if (width > max_size) {
                            height *= max_size / width;
                            width = max_size;
                        }
                    } else {
                        if (height > max_size) {
                            width *= max_size / height;
                            height = max_size;
                        }
                    }

                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0, width, height);
                    resolve(canvas.toDataURL('image/jpeg', 0.5)); // Compressed JPEG
                };
                img.src = e.target.result;
            };
            reader.readAsDataURL(file);
        });
    };

    const handleImageUpload = (e) => {
        const files = Array.from(e.target.files);
        const currentCount = formData.images.length;
        
        if (currentCount + files.length > 3) {
            alert(`You can only upload up to 3 images in total! You already have ${currentCount} and tried to select ${files.length}.`);
            return;
        }

        const imagePromises = files.map(file => resizeImage(file));

        Promise.all(imagePromises).then(newImages => {
            setFormData(prev => ({ 
                ...prev, 
                images: [...prev.images, ...newImages] 
            }));
            e.target.value = ''; // Reset input to allow uploading same file again
        });
    };

    const removeImage = (index) => {
        setFormData(prev => ({
            ...prev,
            images: prev.images.filter((_, i) => i !== index)
        }));
    };


    const generateLink = async (e) => {
        e.preventDefault();

        if (!formData.name) {
            alert("Please enter a name!");
            return;
        }

        setIsGenerating(true);
        setGeneratedLink(null);

        try {
            let finalImages = formData.images;

            if (formData.images.length > 0) {
                try {
                    finalImages = await uploadImages(formData.images);
                } catch (uploadErr) {
                    console.warn('CDN upload failed, saving photos with wish:', uploadErr.message);
                    finalImages = formData.images;
                }
            }

            const finalWishData = {
                ...formData,
                images: finalImages
            };

            const { link } = await saveWish(finalWishData);
            setGeneratedLink(link);
        } catch (err) {
            console.error(err);
            alert("Error: " + err.message);
        } finally {
            setIsGenerating(false);
        }
    };

    const copyLink = () => {
        if (!generatedLink) return;
        navigator.clipboard.writeText(generatedLink).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2500);
        });
    };

    const shareOnWhatsApp = () => {
        if (!generatedLink) return;
        window.open(buildWhatsAppShareUrlSafe(generatedLink, formData.name), '_blank');
    };

    const openLink = () => {
        if (!generatedLink) return;
        window.open(generatedLink, '_blank');
    };

    // Initial theme set
    React.useEffect(() => {
        document.body.setAttribute('data-theme', formData.theme);
    }, []);

    return (
        <div className="py-10 animate-fade-in">
            <div className="card text-center">
                <h1 className="text-3xl font-bold mb-6 gradient-text">Create Birthday Magic ✨</h1>

                <form onSubmit={generateLink} className="space-y-4">
                    <div className="input-group">
                        <label>Birthday Person Name</label>
                        <input
                            type="text"
                            name="name"
                            placeholder="e.g. Hanzla"
                            className="input-field"
                            required
                            value={formData.name}
                            onChange={handleChange}
                        />
                    </div>

                    <div className="input-group">
                        <label>Relation</label>
                        <select
                            name="relation"
                            className="input-field"
                            value={formData.relation}
                            onChange={handleRelationChange}
                        >
                            {relations.map(r => <option key={r} value={r}>{r}</option>)}
                        </select>
                    </div>

                    <div className="input-group">
                        <label>Select Theme</label>
                        <div className="flex gap-2 flex-wrap">
                            {['party', 'cute', 'elegant', 'romantic', 'funny'].map(t => (
                                <button
                                    key={t}
                                    type="button"
                                    onClick={() => {
                                        setFormData(prev => ({ ...prev, theme: t }));
                                        document.body.setAttribute('data-theme', t);
                                        // Preview Music Change
                                        window.dispatchEvent(new CustomEvent('change-theme', { detail: t }));
                                    }}
                                    className={`theme-select-btn ${formData.theme === t ? 'active' : ''}`}
                                    style={{ textTransform: 'capitalize' }}
                                >
                                    {t}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="input-group">
                        <label className="flex justify-between items-center w-full" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span>Add Photos (Optional)</span>
                            <span className="text-sm opacity-80" style={{ fontSize: '0.85rem' }}>{formData.images.length}/3 uploaded</span>
                        </label>
                        {formData.images.length < 3 ? (
                            <input
                                type="file"
                                accept="image/*"
                                multiple
                                onChange={handleImageUpload}
                                className="input-field"
                            />
                        ) : (
                            <div className="input-field bg-gray-100/10 text-center text-sm py-4 border-dashed border-2 opacity-75" style={{ textAlign: 'center', fontSize: '0.9rem', opacity: 0.8, padding: '1rem', borderStyle: 'dashed' }}>
                                Limit reached! Remove an image to upload a different one. ✨
                            </div>
                        )}
                        {formData.images.length > 0 && (
                            <div className="image-preview-container">
                                {formData.images.map((img, index) => (
                                    <div key={index} className="image-preview-item">
                                        <img
                                            src={img}
                                            alt={`Preview ${index + 1}`}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => removeImage(index)}
                                            className="image-preview-delete"
                                            title="Remove image"
                                        >
                                            ×
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="input-group">
                        <label>Message (Optional)</label>
                        <textarea
                            name="message"
                            placeholder="Happy birthday! Have a blast!"
                            className="input-field min-h-[100px]"
                            value={formData.message}
                            onChange={handleChange}
                        />
                    </div>

                    <div className="input-group">
                        <label className="flex items-center gap-2">From (Your Name) <Heart size={16} className="text-pink-500 fill-pink-500" /></label>
                        <input
                            type="text"
                            name="sender"
                            placeholder="e.g. Boss"
                            className="input-field"
                            value={formData.sender}
                            onChange={handleChange}
                        />
                    </div>

                    <button type="submit" className="submit-btn" disabled={isGenerating} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', opacity: isGenerating ? 0.7 : 1 }}>
                        {isGenerating ? (
                            <><span className="spinner" style={{ width: 18, height: 18, border: '3px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', display: 'inline-block', animation: 'spin 0.8s linear infinite' }}></span> {formData.images.length > 0 ? 'Uploading photos...' : 'Generating link...'}</>
                        ) : (
                            <><Gift size={20} /> Generate Birthday Wish</>
                        )}
                    </button>
                </form>

                {generatedLink && (
                    <div className="generated-link-panel" style={{ marginTop: '1.5rem', padding: '1.2rem 1rem', borderRadius: '1rem', background: 'rgba(255,255,255,0.12)', border: '1.5px solid rgba(255,255,255,0.25)', backdropFilter: 'blur(8px)' }}>
                        <p style={{ fontWeight: 700, fontSize: '1rem', marginBottom: '0.6rem', opacity: 0.9 }}>🎉 Link Ready! Share it:</p>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(0,0,0,0.15)', borderRadius: '0.6rem', padding: '0.5rem 0.7rem', marginBottom: '0.9rem', wordBreak: 'break-all', fontSize: '0.85rem', opacity: 0.9 }}>
                            <span style={{ flex: 1 }}>{generatedLink}</span>
                        </div>
                        <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
                            <button onClick={openLink} style={{ flex: 1, minWidth: 120, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', padding: '0.6rem 1rem', borderRadius: '0.6rem', border: 'none', cursor: 'pointer', background: 'rgba(255,255,255,0.2)', color: 'inherit', fontWeight: 600, fontSize: '0.85rem' }}>
                                <ExternalLink size={15} /> Preview
                            </button>
                            <button onClick={copyLink} style={{ flex: 1, minWidth: 120, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', padding: '0.6rem 1rem', borderRadius: '0.6rem', border: 'none', cursor: 'pointer', background: copied ? 'rgba(34,197,94,0.35)' : 'rgba(255,255,255,0.2)', color: 'inherit', fontWeight: 600, fontSize: '0.85rem', transition: 'background 0.3s' }}>
                                <Copy size={15} /> {copied ? 'Copied! ✓' : 'Copy Link'}
                            </button>
                            <button onClick={shareOnWhatsApp} style={{ flex: 1, minWidth: 120, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', padding: '0.6rem 1rem', borderRadius: '0.6rem', border: 'none', cursor: 'pointer', background: 'linear-gradient(135deg, #25D366, #128C7E)', color: '#fff', fontWeight: 700, fontSize: '0.85rem' }}>
                                <Share2 size={15} /> WhatsApp
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default CreateWish;
