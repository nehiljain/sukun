import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import posthog from 'posthog-js'; // Make sure PostHog is properly initialized

function PageViewTracker() {
    const location = useLocation();

    useEffect(() => {
        // Capture pageview on route change
        posthog.capture('$pageview', {
            path: location.pathname, // You can send additional properties, like the current path
        });
    }, [location]); // Runs on route change (when location changes)

    return null;
}

export default PageViewTracker;
