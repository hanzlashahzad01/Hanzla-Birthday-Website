import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { encodeWish } from '../utils/wishEncoder';
import { Gift, Heart } from 'lucide-react';

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
                    const max_size = 500; // Resize to max 500px

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
                    resolve(canvas.toDataURL('image/jpeg', 0.6)); // Compressed JPEG
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

    const uploadImage = async (base64Image) => {
        if (base64Image.startsWith('http')) {
            return base64Image;
        }

        const response = await fetch('/api/upload', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ image: base64Image })
        });

        if (!response.ok) {
            let errMsg = 'Failed to upload image';
            try {
                const err = await response.json();
                errMsg = err.error || errMsg;
            } catch (e) {
                try {
                    const txt = await response.text();
                    errMsg = txt || errMsg;
                } catch (e2) {}
            }
            throw new Error(errMsg);
        }

        const data = await response.json();
        return data.url;
    };

    const generateLink = async (e) => {
        e.preventDefault();

        if (!formData.name) {
            alert("Please enter a name!");
            return;
        }

        setIsGenerating(true);

        try {
            // Upload all base64 images to CDN
            const uploadedUrls = await Promise.all(
                formData.images.map(img => uploadImage(img))
            );

            const finalWishData = {
                ...formData,
                images: uploadedUrls
            };

            const encoded = encodeWish(finalWishData);
            if (encoded) {
                navigate(`/wish?data=${encoded}`);
            } else {
                throw new Error("Failed to encode wish data.");
            }
        } catch (err) {
            console.error(err);
            alert("Upload failed: " + err.message);
        } finally {
            setIsGenerating(false);
        }
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
                        {isGenerating ? 'Uploading photos...' : <><Gift size={20} /> Generate Birthday Wish</>}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default CreateWish;
