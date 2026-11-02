#!/bin/bash
# Waits for mains power and a cool machine, renders whatever takes are missing, and cuts the film when all are in. Safe to stop and restart.
export PATH=/usr/local/bin:$PATH
cd "$(dirname "$0")"; T="../takes"
ALL="A B C D E1 E2 E3 F G H I J K L M N O P Q R S T U1 U2 U3 V"
ready(){ pmset -g batt | grep -q "AC Power" && [ "$(pmset -g therm | sed -n 's/.*CPU_Speed_Limit[^0-9]*\([0-9]*\).*/\1/p')" -ge 50 ]; }
missing(){ for i in $ALL; do [ -f "$T/$i.mp4" ] || return 0; done; return 1; }
while missing; do
  until ready; do python3 -c "import time;time.sleep(20)"; done
  echo "render $(date +%H:%M)"; node rec.mjs rec "" "$T" 2>&1 | grep -E --line-buffered "ready|stopping|^[A-Z][0-9]? \{|pageerror"
done
echo "all takes in $(date +%H:%M)"; python3 assemble.py && echo FILM-DONE
