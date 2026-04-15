import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import Layout from './Layout';

const AdminRoute = ({ children }) => {
    const [isAdmin, setIsAdmin] = useState(null);

    useEffect(() => {
        const checkAdmin = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            
            if (!session) {
                setIsAdmin(false);
                return;
            }

            const { data } = await supabase
                .from('profiles')
                .select('is_admin')
                .eq('id', session.user.id)
                .single();

            setIsAdmin(data?.is_admin || false);
        };

        checkAdmin();
    }, []);

    if (isAdmin === null) return <Layout title="Loading..."><p>Verifying access...</p></Layout>; // loading state
    
    if (!isAdmin) {
        return (
            <Layout title="Access Denied">
                <div style={{ textAlign: 'center', padding: '50px' }}>
                    <h2>Restricted Area</h2>
                    <p>You do not have administrative privileges to view this page.</p>
                </div>
            </Layout>
        );
    }
    
    return children;
};

export default AdminRoute;
