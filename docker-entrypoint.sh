#!/bin/sh
# Writes runtime env vars into a JS file loaded before the React bundle.
cat <<EOF > /usr/share/nginx/html/config.js
window.__SUPABASE_URL__ = "${VITE_SUPABASE_URL}";
window.__SUPABASE_ANON_KEY__ = "${VITE_SUPABASE_ANON_KEY}";
EOF
exec nginx -g "daemon off;"