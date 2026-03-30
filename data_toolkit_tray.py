#!/usr/bin/env python3

import sys
import subprocess
from PyQt5.QtWidgets import QApplication, QSystemTrayIcon, QMenu, QAction
from PyQt5.QtGui import QIcon

def run_terminal_command(title, command):
    for terminal in ["x-terminal-emulator", "konsole", "xfce4-terminal", "gnome-terminal", "xterm"]:
        if subprocess.call(["which", terminal], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL) == 0:
            subprocess.Popen([terminal, "-e", f"bash -c '{command}'"])
            return
    print("No supported terminal found.")

def create_tray():
    app = QApplication(sys.argv)
    tray = QSystemTrayIcon(QIcon.fromTheme("network-workgroup"))
    tray.setToolTip("Data Toolkit")

    menu = QMenu()

    calc_action = QAction("Open Calculator")
    calc_action.triggered.connect(lambda: run_terminal_command("Calculator", "./data_toolkit.sh --calc; exec bash"))
    menu.addAction(calc_action)

    exit_action = QAction("Exit")
    exit_action.triggered.connect(app.quit)
    menu.addAction(exit_action)

    tray.setContextMenu(menu)
    tray.show()
    sys.exit(app.exec_())

if __name__ == "__main__":
    create_tray()
