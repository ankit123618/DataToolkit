#!/bin/bash

# === Requirements Check ===
command -v speedtest-cli >/dev/null 2>&1 || {
    echo >&2 "speedtest-cli is not installed. Installing...";
    pip install speedtest-cli || sudo dnf install speedtest-cli -y;
}

trap "clear; echo -e '\n[*] Application Closed.'; exit 0" SIGINT SIGTERM

get_speed() {
    output=$(speedtest-cli --simple 2>/dev/null)
    download=$(echo "$output" | grep "Download" | awk '{print $2}')
    upload=$(echo "$output" | grep "Upload" | awk '{print $2}')

    if ! [[ "$download" =~ ^[0-9]+([.][0-9]+)?$ ]]; then download=0; fi
    if ! [[ "$upload" =~ ^[0-9]+([.][0-9]+)?$ ]]; then upload=0; fi

    echo "$download $upload"
}

calculate_time_data() {
    local size=$1
    local speed=$2

    speed_MBps=$(echo "$speed / 8" | bc -l)
    time_sec=$(echo "$size / $speed_MBps" | bc -l)
    time_min=$(echo "$time_sec / 60" | bc -l)
    overhead=$(echo "$size * 0.05" | bc -l)
    total_data=$(echo "$size + $overhead" | bc -l)

    mins=$(printf "%.0f" $(echo "$time_sec / 60" | bc -l))
    secs=$(printf "%.0f" $(echo "$time_sec - ($mins * 60)" | bc -l))

    echo "$time_min $total_data $mins $secs"
}

while true; do
    clear
    echo "+=========================================================+"
    echo "|                   DATA TOOLKIT                         |"
    echo "+---------------------------------------------------------+"

    echo "[*] Checking current speed..."
    speeds=($(get_speed))
    echo "| Upload Speed   : ${speeds[1]} Mbps"
    echo "| Download Speed : ${speeds[0]} Mbps"
    echo "+---------------------------------------------------------+"

    read -p "| Enter File Size (MB): " size
    read -p "| Transfer Type (upload/download): " type

    if [[ "$type" == "upload" ]]; then
        speed=${speeds[1]}
    else
        speed=${speeds[0]}
    fi

    if (( $(echo "$speed == 0" | bc -l) )); then
        echo "| Error: Cannot detect valid speed for $type."
        sleep 2; continue
    fi

    read time data mins secs <<< $(calculate_time_data $size $speed)

    echo "| Estimated Time  : $mins min $secs sec"
    echo "| Estimated Data  : $(printf "%.2f" $data) MB (incl. 5% overhead)"
    echo "+=========================================================+"
    echo "(Updated every 20 seconds — Ctrl+C to exit)"
    sleep 20

done

