import sharedStateHook from './sharedStateHook.js';

const [useHref, setHref] = sharedStateHook(
  new URL(location.href),
  'location.href',
);

function handleLocationUpdate() {
  setHref(new URL(location.href));
}

window.addEventListener('hashchange', handleLocationUpdate);
window.addEventListener('popstate', handleLocationUpdate);

export default function useLocation() {
  const [href, setHref] = useHref();

  const setLocation = (url: string | URL, replace: boolean) => {
    if (typeof url === 'string') {
      url = new URL(url);
    }

    if (url.href === location.href) return;

    // Dont' allow direct manipulation
    Object.freeze(url);

    // Update state value
    if (replace) {
      window.history.replaceState({}, '', url);
    } else {
      window.history.pushState({}, '', url);
    }
    setHref(url);
  };

  return [href, setLocation] as const;
}
