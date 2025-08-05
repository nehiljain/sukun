import React from "react";

const StaffBanner: React.FC = () => (
  <div
    className="fixed top-0 left-1/2 transform -translate-x-1/2 w-full sm:w-1/4 z-50 bg-yellow-300 text-yellow-900 font-bold text-center py-2 px-2 shadow-md text-sm sm:text-base"
    role="status"
    aria-live="polite"
    tabIndex={0}
    aria-label="Staff login banner"
  >
    You are logged in as staff.
  </div>
);

export default StaffBanner;
