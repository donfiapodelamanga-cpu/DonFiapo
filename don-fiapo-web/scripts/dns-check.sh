#!/bin/bash

DOMAIN="donfiapo.fun"
ALT_DOMAIN="donfiapo.com"

echo "============================================="
echo "   Don Fiapo DNS Diagnostics Tool"
echo "============================================="
echo "Date: $(date)"
echo ""

check_domain() {
    local target=$1
    echo "--- Checking $target ---"
    
    # Check Google DNS
    echo "[Google DNS]"
    dig @8.8.8.8 $target +short
    if [ $? -ne 0 ]; then echo "Failed query"; fi
    
    # Check Cloudflare DNS
    echo "[Cloudflare DNS]"
    dig @1.1.1.1 $target +short
    if [ $? -ne 0 ]; then echo "Failed query"; fi
    
    # Check Local DNS
    echo "[Local System DNS]"
    nslookup $target | grep "Address:" | tail -n +2
    
    echo ""
}

check_domain $DOMAIN
check_domain $ALT_DOMAIN

echo "---------------------------------------------"
echo "Interpretation:"
echo "1. If you see IP addresses (e.g., 123.45.67.89), DNS is propagating."
echo "2. If you see empty output or errors, propagation is pending or configuration is wrong."
echo "3. Ensure your VPS IP matches the output above."
echo "============================================="
