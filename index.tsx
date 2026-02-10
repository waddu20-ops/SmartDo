import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

try {
  const root = ReactDOM.createRoot(rootElement);
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
} catch (error) {
  console.error("Failed to render SmartDo App:", error);
  rootElement.innerHTML = `<div style="padding: 20px; color: #ef4444; text-align: center;">
    <h2>Garden Initialization Error</h2>
    <p>We couldn't start your garden. Please try refreshing or check the console for details.</p>
  </div>`;
}