#!/usr/bin/env node
// Wrapper to ensure deploy runs correctly regardless of package.json type
process.on('unhandledRejection', (err) => {
    console.error('UNHANDLED:', err);
    process.exit(1);
});
require('./deploy_ecosystem.cjs');
