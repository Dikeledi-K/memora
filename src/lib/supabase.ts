import 'react-native-url-polyfill/auto';

import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

export const isConfigured = Boolean(url && anonKey);

export const supabase = createClient(
  url ?? 'http://localhost:54321',
  anonKey ?? 'missing-anon-key',
  {
    auth: {
      // AsyncStorage on native; the browser's localStorage on web.
      storage: Platform.OS === 'web' ? undefined : AsyncStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: Platform.OS === 'web',
    },
  },
);
