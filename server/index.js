  // require('dotenv').config();
  // const express = require('express');
  // const http = require('http');
  // const { Server } = require('socket.io');
  // const cors = require('cors');
  // const { createClient } = require('@supabase/supabase-js');

  // const app = express();
  // app.use(cors({ origin: "*" })); // Explicitly allow all origins for the API
  // app.use(express.json());

  // const server = http.createServer(app);
  // const io = new Server(server, {
  //     cors: {
  //         origin: "*", // Explicitly allow all origins for WebSockets
  //         methods: ["GET", "POST"]
  //     }
  // });

  // const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

  // // Listen for socket updates from our custom backend
  // supabase
  //     .channel('backend-realtime')
  //     .on('postgres_changes', { event: '*', schema: 'public', table: 'parking_slots' }, (payload) => {
  //         // Still broadcast DB changes to ensure fallback sync
  //         io.emit('dbSync', payload.new || payload.old);
  //     })
  //     .subscribe();

  // io.on('connection', (socket) => {
  //     console.log('A user connected:', socket.id);

  //     // High-speed direct toggle
  //     socket.on('toggleSlot', (data) => {
  //         // Broadcast TO ALL OTHER clients immediately (Optimistic for others)
  //         socket.broadcast.emit('slotStatusChanged', data);
  //     });

  //     socket.on('disconnect', () => {
  //         console.log('User disconnected');
  //     });
  // });

  // // Endpoint for RFID Hardware
  // app.post('/api/rfid-scan', async (req, res) => {
  //     const { rfid_tag } = req.body;
  //     console.log(`RFID Scan Received: ${rfid_tag}`);

  //     const { data, error } = await supabase.rpc('rfid_scan_handler', { p_rfid_tag: rfid_tag });

  //     if (error) {
  //         console.error('RPC Error:', error);
  //         return res.status(500).json({ status: 'error', message: error.message });
  //     }

  //     if (!data || data.length === 0) {
  //         console.warn(`Tag ${rfid_tag} not linked to any user.`);
  //         return res.status(404).json({ status: 'error', message: "Tag not registered to any user." });
  //     }

  //     const result = data[0]; 
  //     console.log('RFID Action Result:', result); // 🔍 DEBUG LOG

  //     // Broadcast the result to all clients IMMEDIATELY
  //     if (result && result.slot_id) {
  //         io.emit('slotStatusChanged', { 
  //             id: result.slot_id, 
  //             status: result.action_type === 'CHECK_IN' ? 'booked' : 'available',
  //             booked_by: result.action_type === 'CHECK_IN' ? 'rfid_user' : null 
  //         });
  //         io.emit('dbSync'); 
  //         res.json({ status: 'success', ...result });
  //     } else {
  //         res.status(400).json({ status: 'error', message: "No slots available or unknown error" });
  //     }
  // });

  // const PORT = process.env.PORT || 3001;
  // server.listen(PORT, () => {
  //     console.log(`Backend server running on port ${PORT}`);
  // });

  require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');

const app = express();
app.use(cors({ origin: "*" }));
app.use(express.json());

const server = http.createServer(app);

const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

// ---------------- REALTIME DB LISTENER ----------------
supabase
    .channel('backend-realtime')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'parking_slots' }, (payload) => {
        io.emit('dbSync', payload.new || payload.old);
    })
    .subscribe();

// ---------------- SOCKET.IO ----------------
io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    socket.on('toggleSlot', (data) => {
        socket.broadcast.emit('slotStatusChanged', data);
    });

    socket.on('disconnect', () => {
        console.log('User disconnected');
    });
});

// ---------------- RFID API ----------------
app.post('/api/rfid-scan', async (req, res) => {
    const { rfid_tag } = req.body;
    console.log(`RFID Scan Received: ${rfid_tag}`);

    const { data, error } = await supabase.rpc('rfid_scan_handler', {
        p_rfid_tag: rfid_tag
    });

    if (error) {
        console.error('RPC Error:', error);
        return res.status(500).json({ status: 'error', message: error.message });
    }

    if (!data || data.length === 0) {
        return res.status(404).json({ status: 'error', message: "Tag not registered" });
    }

    const result = data[0];

    if (result && result.slot_id) {
        io.emit('slotStatusChanged', {
            id: result.slot_id,
            status: result.action_type === 'CHECK_IN' ? 'booked' : 'available',
            booked_by: result.action_type === 'CHECK_IN' ? 'rfid_user' : null
        });

        io.emit('dbSync');

        res.json({ status: 'success', ...result });
    } else {
        res.status(400).json({ status: 'error', message: "No slots available" });
    }
});

// ---------------- ESP32: GET SLOT STATUS ----------------
app.get('/api/slot/:id', async (req, res) => {
    const slotId = req.params.id;

    const { data, error } = await supabase
        .from('parking_slots')
        .select('*')
        .eq('id', slotId)
        .single();

    if (error) {
        console.error(error);
        return res.status(500).json({ error: error.message });
    }

    res.json({
        id: data.id,
        booked: data.status === 'booked'
    });
});

// ---------------- ESP32: SEND RFID (OPTIONAL) ----------------
app.post('/api/esp-rfid', async (req, res) => {
    const { rfid_tag } = req.body;

    const { data, error } = await supabase.rpc('rfid_scan_handler', {
        p_rfid_tag: rfid_tag
    });

    if (error) {
        return res.status(500).json({ error: error.message });
    }

    res.json({ success: true, data });
});

// ---------------- ESP32: UPDATE SLOT FROM IR ----------------
app.post('/api/slot/:id/status', async (req, res) => {
    const slotId = req.params.id;
    const { status } = req.body; // "booked" or "available"

    console.log(`[ESP] Slot ${slotId} → ${status}`);

    // Update DB
    const { error } = await supabase
        .from('parking_slots')
        .update({ status: status })
        .eq('id', slotId);

    if (error) {
        console.error("DB Error:", error);
        return res.status(500).json({ error: error.message });
    }

    // 🔥 REALTIME UPDATE TO FRONTEND
    io.emit('slotStatusChanged', {
        id: parseInt(slotId),
        status: status,
        booked_by: status === "booked" ? "sensor" : null
    });

    // Optional sync trigger
    io.emit('dbSync');

    res.json({ success: true });
});

// ---------------- START SERVER ----------------
const PORT = process.env.PORT || 3001;

server.listen(PORT, () => {
    console.log(`🚀 Backend server running on port ${PORT}`);
});