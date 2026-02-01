// api/update-password.ts
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Handle CORS
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Get the authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: 'No authorization header' });
    }

    // Create client to verify the requesting user
    const supabaseClient = createClient(
      process.env.VITE_SUPABASE_URL!,
      process.env.VITE_SUPABASE_ANON_KEY!,
      {
        global: {
          headers: { Authorization: authHeader }
        }
      }
    );

    // Verify user is authenticated
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Check if user has admin privileges
    const { data: userData, error: roleError } = await supabaseClient
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (roleError || !userData) {
      return res.status(403).json({ error: 'Unable to verify user role' });
    }

    if (!['SUPERADMIN', 'ADMIN'].includes(userData.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    // Get user data from request
    const { email, password, full_name, role, reports_to } = req.body;

    if (!email || !password || !full_name || !role) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Validate password strength
    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    // Create Supabase admin client with service role
    const supabaseAdmin = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    // Create auth user using admin client
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: email,
      password: password,
      email_confirm: true, // Auto-confirm email
      user_metadata: {
        full_name: full_name
      }
    });

    if (authError) {
      throw authError;
    }

    const userId = authData.user?.id;
    if (!userId) {
      throw new Error('Failed to get user ID from Supabase Auth');
    }

    // Insert metadata into users table
    const { data: dbData, error: dbError } = await supabaseAdmin
      .from('users')
      .insert([{
        id: userId,
        full_name: full_name,
        email: email,
        role: role,
        reports_to: role === 'MANAGER' ? reports_to : null,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }])
      .select()
      .single();

    if (dbError) {
      // If database insert fails, delete the auth user
      await supabaseAdmin.auth.admin.deleteUser(userId);
      throw dbError;
    }

    return res.status(200).json({ 
      success: true, 
      user: dbData,
      message: 'User created successfully' 
    });

  } catch (error: any) {
    console.error('User creation error:', error);
    return res.status(500).json({ 
      error: error.message || 'Failed to create user' 
    });
  }
}