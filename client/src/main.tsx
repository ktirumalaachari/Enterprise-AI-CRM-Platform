import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles/index.css';
import { GoogleOAuthProvider } from '@react-oauth/google';

const googleClientId =
  import.meta.env.VITE_GOOGLE_CLIENT_ID ||
  '550705576930-cfe9sgcvvrbrk0qsm12l9eufbohp7skt.apps.googleusercontent.com';

console.log('Google Client ID loaded:', googleClientId);

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <GoogleOAuthProvider clientId={googleClientId}>
      <App />
    </GoogleOAuthProvider>
  </React.StrictMode>
);