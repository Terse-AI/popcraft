#!/bin/bash
# renders the missing takes whenever the Mac is on mains and cool enough; safe to stop and start again
export PATH=/usr/local/bin:$PATH
cd "$(dirname "$0")"; T="../takes"
ready(){ pmset -g batt | grep -q "AC Power" && [ "$(pmset -g therm | sed -n 's/.*CPU_Speed_Limit[^0-9]*\([0-9]*\).*/\1/p')" -ge 50 ]; }
missing(){ for i in M1 M2 M3 M4 M5 M6 M7 M8 M9; do [ -f "$T/$i.mp4" ] || return 0; done; return 1; }
while missing; do
  until ready; do python3 -c "import time;time.sleep(20)"; done
  node rec.mjs rec "" "$T" 2>&1 | grep -E --line-buffered "stopping|^M[0-9] \{|pageerror"
done
echo ALL-TAKES-IN
