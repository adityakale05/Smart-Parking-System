import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { supabase } from '../supabaseClient';
import { socket } from '../socket';
import { Search, Clock, User, Hash, Activity } from 'lucide-react';

const BookingLogs = () => {
    const [logs, setLogs] = useState([]);
    const [search, setSearch] = useState('');

    const fetchLogs = async () => {
        const { data } = await supabase
            .from('booking_logs')
            .select('*')
            .order('created_at', { ascending: false });
        if (data) setLogs(data);
    };

    useEffect(() => {
        fetchLogs();

        socket.on('newLog', (payload) => {
            setLogs((prev) => [payload.new, ...prev]);
        });

        return () => {
            socket.off('newLog');
        };
    }, []);

    const filteredLogs = logs.filter(log => 
        log.username?.toLowerCase().includes(search.toLowerCase()) ||
        log.action?.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <Layout title="System Audit Log">
            <div className="audit-controls">
                <div className="search-bar">
                    <Search size={18} />
                    <input 
                        type="text" 
                        placeholder="Search by user or action..." 
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
            </div>

            <div className="audit-table-container">
                <table className="audit-table">
                    <thead>
                        <tr>
                            <th><Clock size={16} /> Time</th>
                            <th><User size={16} /> User</th>
                            <th><Hash size={16} /> Slot</th>
                            <th><Activity size={16} /> Action</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredLogs.length === 0 ? (
                            <tr>
                                <td colSpan="4" style={{ textAlign: 'center', padding: '20px' }}>No logs found.</td>
                            </tr>
                        ) : filteredLogs.map(log => (
                            <tr key={log.id}>
                                <td>{new Date(log.created_at).toLocaleString()}</td>
                                <td><strong>{log.username}</strong></td>
                                <td><span className="slot-badge">P{log.slot_id}</span></td>
                                <td>
                                    <span className={`action-badge ${log.action.toLowerCase().includes('book') && !log.action.toLowerCase().includes('unbook') ? 'plus' : 'minus'}`}>
                                        {log.action}
                                    </span>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </Layout>
    );
};

export default BookingLogs;
