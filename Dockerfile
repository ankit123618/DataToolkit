FROM ubuntu:24.04
ENV DEBIAN_FRONTEND=noninteractive

RUN apt-get update && apt-get install -y \
    gnome-shell \
    dbus-x11 \
    zip \
    unzip \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

RUN mkdir -p /root/.local/share/gnome-shell/extensions/data-toolkit@ankit123618.github.com
COPY gnome-extension/data-toolkit@ankit123618.github.com /root/.local/share/gnome-shell/extensions/data-toolkit@ankit123618.github.com
RUN chmod -R a+r /root/.local/share/gnome-shell/extensions/data-toolkit@ankit123618.github.com

CMD ["/bin/bash"]
