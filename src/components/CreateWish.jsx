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
        sender: ''
    });

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

    const generateLink = (e) => {
        e.preventDefault();
        console.log("Generating wish for:", formData);

        if (!formData.name) {
            alert("Please enter a name!");
            return;
        }

        const encoded = encodeWish(formData);
        console.log("Encoded data:", encoded);

        if (encoded) {
            navigate(`/wish?data=${encoded}`);
        } else {
            alert("Something went wrong generating the wish. Please try again with different text.");
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
                                    className={`px-4 py-2 text-sm rounded-full border-2 ${formData.theme === t ? 'border-blue-500 bg-white/20' : 'border-transparent bg-gray-100/10'}`}
                                    style={{ textTransform: 'capitalize' }}
                                >
                                    {t}
                                </button>
                            ))}
                        </div>
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

                    <button type="submit" className="w-full mt-6 flex items-center justify-center gap-2 transform active:scale-95 transition-transform">
                        <Gift size={20} /> Generate Birthday Wish
                    </button>
                </form>
            </div>
        </div>
    );
};

export default CreateWish;
