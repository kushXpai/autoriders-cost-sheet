import { supabase } from './client';
import type { User } from '@/types';

export const signIn = async (email: string, password: string): Promise<User | null> => {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    console.error('Login error:', error.message);
    return null;
  }
  if (!data.user) return null;

  const { data: profile, error: profileError } = await supabase
    .from('users')
    .select('*')
    .eq('id', data.user.id)
    .single<User>();

  if (profileError) {
    console.error('Failed to fetch user profile:', profileError.message);
    return null;
  }

  return profile;
};

export const signOut = async () => {
  const { error } = await supabase.auth.signOut();
  if (error) console.error('Logout error:', error.message);
};