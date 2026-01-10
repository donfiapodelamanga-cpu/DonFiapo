#!/bin/bash
# Remove containers and network
docker compose down

# Remove the certbot references if any
sudo rm -rf certbot/conf/*
sudo rm -rf certbot/www/*

# Re-create dirs just in case
mkdir -p certbot/conf
mkdir -p certbot/www

echo "Cleanup complete. Ready to run 'docker compose up -d' again."
