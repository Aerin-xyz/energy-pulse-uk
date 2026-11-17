import { createRoot } from 'react-dom/client'
import App, {preloadInitialRoute} from './App.tsx'
import './index.css'

preloadInitialRoute(window.location.pathname).then(() => {
  createRoot(document.getElementById("root")!).render(<App />);
}).catch(() => {
  // Leave useful pre-rendered content visible on a failed page-chunk request.
  const notice=document.createElement("p");notice.setAttribute("role","status");notice.textContent="Interactive controls could not load. The saved page remains available; reload to retry.";document.getElementById("root")?.prepend(notice);
});
