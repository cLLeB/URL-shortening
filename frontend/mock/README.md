This directory contains a minimal json-server mock for the frontend.

Commands

# Run mock API on http://localhost:5000
# from the frontend folder
npm run mock

# Start the frontend (in another terminal)
npm start

Notes
- The frontend expects API base URL at REACT_APP_API_URL (defaults to http://localhost:5000/api)
- The mock maps routes via mock/routes.json so requests to /api/* are served from the mock DB
