import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import posthog from 'posthog-js'; // Make sure PostHog is properly initialized

interface PageViewTrackerProps {
    children: React.ReactNode;
}

function PageViewTracker({ children }: PageViewTrackerProps) {
    const location = useLocation();

    useEffect(() => {
        // Capture pageview on route change
        posthog.capture('$pageview', {
            path: location.pathname, // You can send additional properties, like the current path
        });
    }, [location]); // Runs on route change (when location changes)

    return <>{children}</>;
}

export default PageViewTracker;
