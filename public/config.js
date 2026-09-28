// Local development defaults. In the container this file is rewritten at
// start-up from the API_URL and DASHBOARD_URL environment variables, so one
// image serves every environment.
window.__HORIZON__ = {
  apiUrl: "http://localhost:8000",
  dashboardUrl: "http://localhost:8501",
};
