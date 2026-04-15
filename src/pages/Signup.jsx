import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '../supabaseClient';

const Signup = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [username, setUsername] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const handleSignup = async (e) => {
        e.preventDefault();
        if (password.length < 6) {
            setError('Password must be at least 6 characters');
            return;
        }
        setLoading(true);
        setError('');

        const { data, error: signUpError } = await supabase.auth.signUp({
            email,
            password,
            options: { data: { username } }
        });

        if (signUpError) {
            setError(signUpError.message);
        } else {
            // Insert profile
            if (data.user) {
                await supabase.from('profiles').insert({
                    id: data.user.id,
                    username,
                });
            }
            navigate('/login');
        }
        setLoading(false);
    };

    return (
        <div className="auth-container">
            <div className="auth-left">
                <h1>SMART PARKING</h1>
                <p>Create your account to access the system</p>
            </div>
            <div className="auth-right">
                <div className="auth-box">
                    <h2>Sign Up</h2>
                    <form onSubmit={handleSignup}>
                        <input 
                            type="text" 
                            placeholder="Username" 
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            required 
                        />
                        <input 
                            type="email" 
                            placeholder="Email" 
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required 
                        />
                        <input 
                            type="password" 
                            placeholder="Password (min 6 characters)" 
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required 
                        />
                        <button type="submit" disabled={loading}>
                            {loading ? 'Creating account...' : 'Create Account'}
                        </button>
                    </form>
                    {error && <p className="error">{error}</p>}
                    <p style={{ marginTop: '20px' }}>
                        Already have an account? <Link to="/login">Login</Link>
                    </p>
                </div>
            </div>
        </div>
    );
};

export default Signup;
