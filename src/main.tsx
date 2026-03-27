import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import "./i18n";


// Critical: Clear any existing Service Workers to resolve OneSignal/Firebase conflicts
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then(registrations => {
    for (const registration of registrations) {
      if (registration.active?.scriptURL.includes('OneSignalSDKWorker.js')) continue;
      registration.unregister().then(() => console.log('Cleaned old SW:', registration.scope));
    }
  });
}

createRoot(document.getElementById("root")!).render(<App />);

