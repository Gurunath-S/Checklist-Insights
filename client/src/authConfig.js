export const msalConfig = {
  auth: {
    clientId: import.meta.env.VITE_MICROSOFT_CLIENT_ID,
    authority: "https://login.microsoftonline.com/common", // "common" allows any Microsoft account. Use a specific tenant ID to restrict.
    redirectUri: window.location.origin, // e.g., http://localhost:5173
  },
  cache: {
    cacheLocation: "sessionStorage", // This configures where your cache will be stored
    storeAuthStateInCookie: false, // Set this to "true" if you are having issues on IE11 or Edge
  }
};

export const loginRequest = {
  scopes: ["User.Read"] // Need this to read the user's profile
};
