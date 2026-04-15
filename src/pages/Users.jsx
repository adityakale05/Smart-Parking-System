import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { supabase } from '../supabaseClient';
import { CreditCard, Edit2, PlusCircle } from 'lucide-react';

const Users = () => {
    const [users, setUsers] = useState([]);
    const [manualForm, setManualForm] = useState({ userId: '', tag: '' });
    const [formStatus, setFormStatus] = useState(null);
    const [isSaving, setIsSaving] = useState(false);

    const fetchUsers = async () => {
        const { data } = await supabase
            .from('profiles')
            .select('*')
            .order('joined_at', { ascending: false });
        if (data) setUsers(data);
    };

    useEffect(() => {
        fetchUsers();
    }, []);

    const updateRfid = async (user) => {
        const newTag = prompt(`Enter RFID Tag ID for ${user.username}:`, user.rfid_tag || '');
        if (newTag === null) return;

        const { error } = await supabase
            .from('profiles')
            .update({ rfid_tag: newTag || null })
            .eq('id', user.id);

        if (error) {
            alert(error.message);
        } else {
            fetchUsers();
        }
    };

    const handleManualSubmit = async (event) => {
        event.preventDefault();
        if (!manualForm.userId || !manualForm.tag.trim()) {
            setFormStatus({ type: 'error', message: 'Select a user and provide an RFID tag.' });
            return;
        }

        setIsSaving(true);
        setFormStatus(null);

        const { error } = await supabase
            .from('profiles')
            .update({ rfid_tag: manualForm.tag.trim() })
            .eq('id', manualForm.userId);

        if (error) {
            setFormStatus({ type: 'error', message: error.message });
        } else {
            setFormStatus({ type: 'success', message: 'RFID tag assigned successfully.' });
            setManualForm({ userId: '', tag: '' });
            fetchUsers();
        }

        setIsSaving(false);
    };

    return (
        <Layout title="Registered Users">
            <div className="manual-rfid-card">
                <div className="manual-rfid-header">
                    <h3>Manual RFID Assignment</h3>
                    <p>Pair a user with an RFID tag without using the hardware scanner.</p>
                </div>
                <form className="manual-form" onSubmit={handleManualSubmit}>
                    <div className="manual-form-grid">
                        <label>
                            Select User
                            <select
                                value={manualForm.userId}
                                onChange={(event) => setManualForm((prev) => ({ ...prev, userId: event.target.value }))}
                            >
                                <option value="">Choose a user</option>
                                {users.map((user) => (
                                    <option key={user.id} value={user.id}>
                                        {user.username} {user.rfid_tag ? '(tag linked)' : ''}
                                    </option>
                                ))}
                            </select>
                        </label>
                        <label>
                            RFID Tag
                            <input
                                type="text"
                                placeholder="e.g. 04A3B52C"
                                value={manualForm.tag}
                                onChange={(event) => setManualForm((prev) => ({ ...prev, tag: event.target.value }))}
                            />
                        </label>
                    </div>
                    <button type="submit" className="manual-submit" disabled={isSaving || users.length === 0}>
                        <PlusCircle size={16} />
                        {isSaving ? 'Assigning…' : 'Assign RFID'}
                    </button>
                </form>
                {formStatus && (
                    <p className={`form-feedback ${formStatus.type}`}>{formStatus.message}</p>
                )}
            </div>
            <div className="users-container">
                {users.length === 0 ? <p>No users registered.</p> : users.map((user) => (
                    <div key={user.id} className="user-item">
                        <div className="user-info">
                            <strong>{user.username}</strong>
                            <div className="rfid-status">
                                <CreditCard size={14} />
                                {user.rfid_tag ? `Tag: ${user.rfid_tag}` : 'No RFID Tag linked'}
                            </div>
                        </div>
                        <div className="user-actions">
                            <button onClick={() => updateRfid(user)} className="btn-icon">
                                <Edit2 size={16} /> Edit RFID
                            </button>
                            <div className="join-date">
                                Joined: {new Date(user.joined_at).toLocaleDateString()}
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </Layout>
    );
};

export default Users;
