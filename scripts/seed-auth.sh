#!/usr/bin/expect -f

set timeout 300
set password [lindex $argv 0]

if {[llength $argv] == 0} {
  send_user "Usage: scriptname password\n"
  exit 1
}

spawn ssh -o StrictHostKeyChecking=no -t root@75.119.155.116 "cd /root/don-fiapo-deploy && \
  echo '🌱 1/3: Rodando seed de missões principais...' && \
  docker compose exec -T don-fiapo-web npx -y tsx prisma/seed-missions.ts && \
  echo '🌱 2/3: Rodando seed de missões de referral...' && \
  docker compose exec -T don-fiapo-web npx -y tsx prisma/seed-referral-missions.ts && \
  echo '🌱 3/3: Rodando seed de missões de conteúdo...' && \
  docker compose exec -T don-fiapo-web npx -y tsx prisma/seed-content-missions.ts"

expect {
  "password:" {
    send "$password\r"
    exp_continue
  }
  eof
}
