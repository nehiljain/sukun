import { Link } from "react-router-dom";

export default function Footer() {
  return (
    <footer className="bg-primary-background py-12 sm:py-6">
      <div className="max-w-6xl mx-auto px-6">
        <div className="flex flex-col md:flex-row justify-between items-center text-gray-600">
          <div className="flex items-center space-x-2 mb-4 md:mb-0">
            <Link to="/">
              <img
                src="/static/logo.svg"
                alt="DemoDrive"
                className="h-8 w-auto"
              />
            </Link>
            <span className="text-xl font-semibold">DemoDrive</span>
          </div>
          <nav className="flex flex-wrap justify-center md:justify-end gap-6">
            <Link to="mailto:founders@demodrive.tech">Support</Link>
            <Link to="/terms" className="hover:underline">
              Terms
            </Link>
            <Link to="/privacy" className="hover:underline">
              Privacy
            </Link>
          </nav>
        </div>
        <div className="mt-8 text-center text-sm text-gray-600">
          © 2025 DemoDrive by 19Bits Inc. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
