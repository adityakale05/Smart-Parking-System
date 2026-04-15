import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { supabase } from '../supabaseClient';
import { socket } from '../socket';
import { PlusCircle, Edit2, X } from 'lucide-react';

const Dashboard = () => {
    const [stats, setStats] = useState({ total: 50, booked: 0, available: 50 });
    const [profile, setProfile] = useState(null);
    const [profileLoading, setProfileLoading] = useState(true);
    const [rfidInput, setRfidInput] = useState('');
    const [rfidFeedback, setRfidFeedback] = useState(null);
    const [savingTag, setSavingTag] = useState(false);
    const [isEditing, setIsEditing] = useState(false);

    const fetchStats = async () => {
        const { data } = await supabase
            .from('parking_slots')
            .select('status');
        if (data) {
            const booked = data.filter(s => s.status === 'booked').length;
            setStats({ total: 50, booked, available: 50 - booked });
        }
    };

    useEffect(() => {
        fetchStats();

        // ⚡ HIGH SPEED CALCULATION: No network request needed!
        socket.on('slotStatusChanged', (payload) => {
            setStats(prev => {
                const wasBooked = payload.status === 'available'; // If it turned available, it WAS booked
                const isBooked = payload.status === 'booked';

                let newBooked = prev.booked;
                if (isBooked && !wasBooked) newBooked++;
                if (!isBooked && wasBooked) newBooked--;

                return {
                    total: 50,
                    booked: Math.max(0, Math.min(50, newBooked)),
                    available: Math.max(0, Math.min(50, 50 - newBooked))
                };
            });
        });

        // 🔄 Periodic Sync (Optional fallback)
        socket.on('dbSync', () => {
            fetchStats();
        });

        return () => {
            socket.off('slotStatusChanged');
            socket.off('dbSync');
        };
    }, []);

    useEffect(() => {
        const fetchProfile = async () => {
            setProfileLoading(true);
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                setProfile(null);
                setProfileLoading(false);
                return;
            }

            const { data, error } = await supabase
                .from('profiles')
                .select('id, username, rfid_tag')
                .eq('id', user.id)
                .single();

            if (!error && data) {
                setProfile(data);
                setRfidInput(data.rfid_tag || '');
            } else {
                setProfile(null);
            }
            setProfileLoading(false);
        };

        fetchProfile();
    }, []);

    const handleEditClick = () => {
        const message = profile?.rfid_tag
            ? 'Edit your linked RFID tag? Make sure you are holding your card while updating.'
            : 'Link a new RFID tag to your profile?';
        if (window.confirm(message)) {
            setIsEditing(true);
            setRfidFeedback(null);
            setRfidInput(profile?.rfid_tag || '');
        }
    };

    const handleCancelEdit = () => {
        setIsEditing(false);
        setRfidFeedback(null);
        setRfidInput(profile?.rfid_tag || '');
    };

    const handleRfidSubmit = async (event) => {
        event.preventDefault();
        if (!profile?.id) return;

        const trimmed = rfidInput.trim();
        if (!trimmed) {
            setRfidFeedback({ type: 'error', message: 'Enter the tag printed on your card first.' });
            return;
        }

        setSavingTag(true);
        setRfidFeedback(null);

        const { error } = await supabase
            .from('profiles')
            .update({ rfid_tag: trimmed })
            .eq('id', profile.id);

        if (error) {
            setRfidFeedback({ type: 'error', message: error.message });
        } else {
            setRfidFeedback({ type: 'success', message: 'RFID tag saved successfully.' });
            setProfile((prev) => prev ? { ...prev, rfid_tag: trimmed } : prev);
            setRfidInput(trimmed);
            setIsEditing(false);
        }

        setSavingTag(false);
    };

    return (
        <Layout title="System Overview">
            <div className="stats-container">
                <div className="stat-card">
                    <h4>Total Slots</h4>
                    <p>{stats.total}</p>
                </div>
                <div className="stat-card">
                    <h4>Booked Slots</h4>
                    <p>{stats.booked}</p>
                </div>
                <div className="stat-card" style={{ borderLeft: '5px solid #28a745' }}>
                    <h4>Available Slots</h4>
                    <p>{stats.available}</p>
                </div>
            </div>
            <div className="manual-rfid-card">
                <div className="manual-rfid-header">
                    <div>
                        <h3>RFID Access</h3>
                        <p>Keep your RFID code secure. Use the edit button to change it when needed.</p>
                    </div>
                    {!profileLoading && profile && !isEditing && (
                        <button
                            type="button"
                            className="btn-icon"
                            onClick={handleEditClick}
                        >
                            <Edit2 size={16} />
                            {profile.rfid_tag ? 'Edit Tag' : 'Link Tag'}
                        </button>
                    )}
                </div>
                {profileLoading ? (
                    <p>Loading your profile...</p>
                ) : !profile ? (
                    <p className="form-feedback error">We could not load your profile. Please sign out and back in.</p>
                ) : (
                    <>
                        <div className="rfid-display">
                            <div>
                                <span className="rfid-label">Current Tag</span>
                                <span className="rfid-value">{profile.rfid_tag || 'Not linked yet'}</span>
                            </div>
                        </div>
                        {isEditing && (
                            <form className="manual-form" onSubmit={handleRfidSubmit}>
                                <div className="manual-form-grid">
                                    <label>
                                        RFID Tag
                                        <input
                                            type="text"
                                            value={rfidInput}
                                            placeholder="e.g. 04A3B52C"
                                            onChange={(event) => setRfidInput(event.target.value)}
                                        />
                                    </label>
                                </div>
                                <div className="rfid-edit-actions">
                                    <button
                                        type="submit"
                                        className="manual-submit"
                                        disabled={savingTag}
                                    >
                                        <PlusCircle size={16} />
                                        {savingTag ? 'Saving…' : 'Save Tag'}
                                    </button>
                                    <button
                                        type="button"
                                        className="manual-cancel"
                                        onClick={handleCancelEdit}
                                        disabled={savingTag}
                                    >
                                        <X size={16} />
                                        Cancel
                                    </button>
                                </div>
                                {rfidFeedback && (
                                    <p className={`form-feedback ${rfidFeedback.type}`}>
                                        {rfidFeedback.message}
                                    </p>
                                )}
                            </form>
                        )}
                        {!isEditing && rfidFeedback && (
                            <p className={`form-feedback ${rfidFeedback.type}`}>
                                {rfidFeedback.message}
                            </p>
                        )}
                    </>
                )}
            </div>
        </Layout>
    );
};

export default Dashboard;
