# Web Development Setup

## Development with Hot Reloading

To run the frontend with hot reloading during development:

1. Make sure the Django backend is running (typically on port 8000)
2. Run the Vite development server:
   ```bash
   make fe/dev
   ```
   This will start the Vite dev server on port 5173

3. Access your application through the Django server (http://localhost:8000) to benefit from both:
   - Django backend functionality
   - Vite hot reloading for frontend changes

## How It Works

- In development mode (`DEBUG=true`), the Django templates load assets from the Vite dev server (http://localhost:5173)
- In production, the templates load the built assets from Django's static files
- CSP headers are adjusted automatically based on the environment

## Building for Production

To build the frontend for production:
```bash
make fe/build
```

This will generate optimized assets in the `static/` directory that Django will serve.
