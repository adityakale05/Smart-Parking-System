import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

const Topbar = ({ title }) => {
    const [username, setUsername] = useState('');

    useEffect(() => {
        supabase.auth.getSession().then(({ data: { session } }) => {
            const meta = session?.user?.user_metadata;
            setUsername(meta?.username || session?.user?.email || 'User');
        });
    }, []);

    return (
        <div className="topbar">
            <h3>{title}</h3>
            <div className="profile">{username}</div>
        </div>
    );
};

export default Topbar;
