import './bugsnag.js'; // Initialize ASAP!

import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './components/App/App.js';
import { DiagramTitle } from './DiagramTitle.js';
import { flash } from './flash.js';

window.addEventListener('error', err => {
  console.error(err);
  flash(err.message);
});

window.addEventListener('unhandledrejection', err => {
  console.error(err);
  flash(err.reason);
});

window.onload = function () {

  // Main app component
  const appEl = document.querySelector('#app') as HTMLDivElement;
  createRoot(appEl).render(<App />);

  // A little component for managing the title
  const titleEl = document.querySelector('title') as HTMLTitleElement;
  createRoot(titleEl).render(<DiagramTitle defaultTitle={titleEl.innerText} />);
};
