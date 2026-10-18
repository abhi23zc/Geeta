// Browser test entry point only; this is not part of the production Vite build.
import React from 'react';
import { createRoot } from 'react-dom/client';
import { initializeApp } from 'firebase/app';
import { getStorage } from 'firebase/storage';
import type { User } from 'firebase/auth';
import { MusicWorkspace } from '../src/music';
import '../src/style.css';
const app = initializeApp({ apiKey: 'test', projectId: 'demo-geeta', storageBucket: 'demo-geeta.appspot.com' });
const user = { uid: 'browser-test', getIdToken: async () => 'test-token' } as unknown as User;
createRoot(document.getElementById('root')!).render(<MusicWorkspace user={user} storage={getStorage(app)} />);
