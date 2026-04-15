import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { supabase } from '../supabaseClient';
import { socket } from '../socket';

const ParkingSlots = () => {
    const [slots, setSlots] = useState([]);
    const [userId, setUserId] = useState(null);
    const [isLive, setIsLive] = useState(socket.connected);

    const fetchSlots = async () => {
        const { data } = await supabase
            .from('parking_slots')
            .select('*')
            .order('id');
        if (data) setSlots(data);
    };

    useEffect(() => {
        fetchSlots();
        supabase.auth.getSession().then(({ data: { session } }) => {
            if (session) setUserId(session.user.id);
        });

        // 🩺 Connection Diagnosis
        const onConnect = () => setIsLive(true);
        const onDisconnect = () => setIsLive(false);

        socket.on('connect', onConnect);
        socket.on('disconnect', onDisconnect);

        // 🟢 High Speed Update: Listen for instant socket events
        socket.on('slotStatusChanged', (updatedSlot) => {
            setSlots(prev => prev.map(s => 
                s.id === updatedSlot.id ? { ...s, ...updatedSlot } : s
            ));
        });

        // 🔄 Fallback: Final sync with DB
        socket.on('dbSync', () => {
            fetchSlots();
        });

        return () => {
            socket.off('slotStatusChanged');
            socket.off('dbSync');
        };
    }, []);

    const toggleSlot = async (slot) => {
        if (!userId) return;

        const isUnbooking = slot.status === 'booked';
        
        // 🔒 Unbooking permission check
        if (isUnbooking && slot.booked_by !== userId) {
            alert('This slot is already booked by another user.');
            return;
        }

        // 🚫 One slot per user check
        if (!isUnbooking) {
            const alreadyBooked = slots.some(s => s.booked_by === userId && s.status === 'booked');
            if (alreadyBooked) {
                alert('You already have a slot booked! Please deregister your current slot first.');
                return;
            }
        }

        // ⚡ OPTIMISTIC UI: Update locally first!
        const originalStatus = slot.status;
        const originalBookedBy = slot.booked_by;
        
        const newStatus = isUnbooking ? 'available' : 'booked';
        const newBookedBy = isUnbooking ? null : userId;

        // Update local state instantly
        setSlots(prev => prev.map(s => 
            s.id === slot.id ? { ...s, status: newStatus, booked_by: newStatus === 'booked' ? userId : null } : s
        ));

        // 🛰️ BROADCAST INSTANTLY to others via socket
        socket.emit('toggleSlot', { id: slot.id, status: newStatus, booked_by: newBookedBy });

        // 💾 PERSIST to Database (Background)
        try {
            const { error } = await supabase
                .from('parking_slots')
                .update({ status: newStatus, booked_by: newBookedBy })
                .eq('id', slot.id);

            if (error) throw error;

            // Log action
            await supabase.from('booking_logs').insert({
                user_id: userId,
                username: 'Online User',
                slot_id: slot.id,
                action: isUnbooking ? 'Unbooked (Deregistered)' : 'Booked (Online)',
            });

        } catch (error) {
            console.error('Update failed, rolling back:', error);
            // ROLLBACK if DB fails
            setSlots(prev => prev.map(s => 
                s.id === slot.id ? { ...s, status: originalStatus, booked_by: originalBookedBy } : s
            ));
            alert('Booking failed. Please check your connection.');
        }
    };

    return (
        <Layout title="Parking Slots">
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '20px' }}>
                <span className={`status-badge ${isLive ? 'online' : 'offline'}`}>
                    {isLive ? '● Live Sync Active' : '○ Sync Disconnected'}
                </span>
            </div>
            <div className="parking-grid">
                {slots.map(slot => {
                    const isMySlot = slot.booked_by === userId;
                    return (
                        <div
                            key={slot.id}
                            className={`slot ${slot.status === 'booked' ? 'booked' : 'available'} ${isMySlot ? 'my-slot' : ''}`}
                            onClick={() => toggleSlot(slot)}
                            title={isMySlot ? "Click to Deregister (Unbook)" : ""}
                        >
                            P{slot.id}
                            {isMySlot && <span className="deregister-hint">My Slot</span>}
                        </div>
                    );
                })}
            </div>
        </Layout>
    );
};

export default ParkingSlots;
