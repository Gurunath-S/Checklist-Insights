import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { GoogleOAuthProvider } from '@react-oauth/google'
import { PublicClientApplication } from '@azure/msal-browser'
import { MsalProvider } from '@azure/msal-react'
import { msalConfig } from './authConfig'
import './index.css'
import App from './App.jsx'

const msalInstance = new PublicClientApplication(msalConfig);
const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

// Initialize MSAL, then handle any redirect promises (critical for redirect flows), then render.
msalInstance.initialize().then(() => {
  return msalInstance.handleRedirectPromise();
}).then((response) => {
  // If we just returned from a successful Microsoft redirect, store the token temporarily for App.jsx
  if (response && response.accessToken) {
    sessionStorage.setItem('msal_pending_token', response.accessToken);
  }
  
  createRoot(document.getElementById('root')).render(
    <StrictMode>
      <MsalProvider instance={msalInstance}>
        <GoogleOAuthProvider clientId={clientId}>
          <App />
        </GoogleOAuthProvider>
      </MsalProvider>
    </StrictMode>,
  )
}).catch(err => {
  console.error("MSAL Setup Error:", err);
});

