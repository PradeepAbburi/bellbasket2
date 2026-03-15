import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import "./i18n";

const isSecureContextForSW =
  typeof window !== 'undefined'
  && (window.isSecureContext || window.location.hostname === 'localhost');

if ('serviceWorker' in navigator && isSecureContextForSW) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/firebase-messaging-sw.js')
      .then(reg => console.log('SW Registered', reg))
      .catch(err => console.log('SW Registration Failed', err));
  });
}

createRoot(document.getElementById("root")!).render(<App />);

