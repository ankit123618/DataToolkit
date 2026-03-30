import Clutter from 'gi://Clutter';
import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import GObject from 'gi://GObject';
import St from 'gi://St';

import {Extension} from 'resource:///org/gnome/shell/extensions/extension.js';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import * as PanelMenu from 'resource:///org/gnome/shell/ui/panelMenu.js';
import * as PopupMenu from 'resource:///org/gnome/shell/ui/popupMenu.js';

const OVERHEAD_PERCENT = 5;
const SAMPLE_INTERVAL_SECONDS = 1;
const textDecoder = new TextDecoder();

const DataToolkitIndicator = GObject.registerClass(
class DataToolkitIndicator extends PanelMenu.Button {
    constructor() {
        super(0.0, 'Data Toolkit', false);

        this._transferType = 'download';
        this._fileUnit = 'GB';
        this._lastSample = null;
        this._downloadMbps = 0;
        this._uploadMbps = 0;
        this._pollId = 0;

        this._buildPanel();
        this._buildMenu();
        this._refreshRates();

        this._pollId = GLib.timeout_add_seconds(
            GLib.PRIORITY_DEFAULT,
            SAMPLE_INTERVAL_SECONDS,
            () => {
                this._refreshRates();
                return GLib.SOURCE_CONTINUE;
            }
        );
    }

    _buildPanel() {
        const panelBox = new St.BoxLayout({
            style_class: 'data-toolkit-panel-box',
            y_align: Clutter.ActorAlign.CENTER,
        });

        this._icon = new St.Icon({
            icon_name: 'network-transmit-receive-symbolic',
            style_class: 'system-status-icon',
        });

        this._panelLabel = new St.Label({
            text: 'D -- U --',
            y_align: Clutter.ActorAlign.CENTER,
            style_class: 'data-toolkit-panel-label',
        });

        panelBox.add_child(this._icon);
        panelBox.add_child(this._panelLabel);
        this.add_child(panelBox);
    }

    _buildMenu() {
        this.menu.box.add_style_class_name('data-toolkit-menu');

        const headerItem = new PopupMenu.PopupBaseMenuItem({
            reactive: false,
            can_focus: false,
        });
        headerItem.add_child(new St.Label({
            text: 'Live network monitor and transfer calculator',
            style_class: 'data-toolkit-menu-title',
            x_expand: true,
        }));
        this.menu.addMenuItem(headerItem);

        const statsItem = new PopupMenu.PopupBaseMenuItem({
            reactive: false,
            can_focus: false,
            style_class: 'data-toolkit-card-item',
        });
        const statsBox = new St.BoxLayout({
            vertical: true,
            x_expand: true,
            style_class: 'data-toolkit-card',
        });
        this._downloadLabel = new St.Label({
            text: 'Download: --',
            style_class: 'data-toolkit-stat-primary',
            x_expand: true,
        });
        this._uploadLabel = new St.Label({
            text: 'Upload: --',
            style_class: 'data-toolkit-stat-secondary',
            x_expand: true,
        });
        statsBox.add_child(this._downloadLabel);
        statsBox.add_child(this._uploadLabel);
        statsItem.add_child(statsBox);
        this.menu.addMenuItem(statsItem);

        const controlsItem = new PopupMenu.PopupBaseMenuItem({
            reactive: false,
            can_focus: false,
            style_class: 'data-toolkit-card-item',
        });
        const controlsBox = new St.BoxLayout({
            vertical: true,
            x_expand: true,
            style_class: 'data-toolkit-controls',
        });

        controlsBox.add_child(new St.Label({
            text: 'File size',
            style_class: 'data-toolkit-section-label',
        }));

        this._sizeEntry = new St.Entry({
            text: '1',
            can_focus: true,
            x_expand: true,
            style_class: 'data-toolkit-entry',
            hint_text: 'Enter size',
        });
        this._sizeEntry.clutter_text.connect('text-changed', () => this._updateCalculation());
        controlsBox.add_child(this._sizeEntry);

        controlsBox.add_child(new St.Label({
            text: 'Unit',
            style_class: 'data-toolkit-section-label',
        }));
        const unitBox = new St.BoxLayout({
            style_class: 'data-toolkit-segment-row',
            x_expand: true,
        });
        this._mbButton = this._createSegmentButton('MB', () => {
            this._fileUnit = 'MB';
            this._syncButtons();
            this._updateCalculation();
        });
        this._gbButton = this._createSegmentButton('GB', () => {
            this._fileUnit = 'GB';
            this._syncButtons();
            this._updateCalculation();
        });
        unitBox.add_child(this._mbButton);
        unitBox.add_child(this._gbButton);
        controlsBox.add_child(unitBox);

        controlsBox.add_child(new St.Label({
            text: 'Transfer type',
            style_class: 'data-toolkit-section-label',
        }));
        const transferBox = new St.BoxLayout({
            style_class: 'data-toolkit-segment-row',
            x_expand: true,
        });
        this._downloadButton = this._createSegmentButton('Download', () => {
            this._transferType = 'download';
            this._syncButtons();
            this._updateCalculation();
        });
        this._uploadButton = this._createSegmentButton('Upload', () => {
            this._transferType = 'upload';
            this._syncButtons();
            this._updateCalculation();
        });
        transferBox.add_child(this._downloadButton);
        transferBox.add_child(this._uploadButton);
        controlsBox.add_child(transferBox);

        controlsItem.add_child(controlsBox);
        this.menu.addMenuItem(controlsItem);

        const resultItem = new PopupMenu.PopupBaseMenuItem({
            reactive: false,
            can_focus: false,
            style_class: 'data-toolkit-card-item',
        });
        const resultBox = new St.BoxLayout({
            vertical: true,
            x_expand: true,
            style_class: 'data-toolkit-result-card',
        });
        this._activeSpeedLabel = new St.Label({
            text: 'Active speed: --',
            style_class: 'data-toolkit-result-primary',
            x_expand: true,
        });
        this._timeLabel = new St.Label({
            text: 'Estimated time: waiting for traffic',
            style_class: 'data-toolkit-result-secondary',
            x_expand: true,
        });
        this._dataLabel = new St.Label({
            text: 'Estimated data: --',
            style_class: 'data-toolkit-result-secondary',
            x_expand: true,
        });
        resultBox.add_child(this._activeSpeedLabel);
        resultBox.add_child(this._timeLabel);
        resultBox.add_child(this._dataLabel);
        resultItem.add_child(resultBox);
        this.menu.addMenuItem(resultItem);

        this.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());

        const hintItem = new PopupMenu.PopupBaseMenuItem({
            reactive: false,
            can_focus: false,
        });
        hintItem.add_child(new St.Label({
            text: 'Tip: this uses live interface throughput, so estimates improve while traffic is active.',
            style_class: 'data-toolkit-footnote',
            x_expand: true,
        }));
        this.menu.addMenuItem(hintItem);

        this._syncButtons();
        this._updateCalculation();
    }

    _createSegmentButton(label, callback) {
        const button = new St.Button({
            label,
            x_expand: true,
            can_focus: true,
            style_class: 'data-toolkit-segment-button',
        });
        button.connect('clicked', callback);
        return button;
    }

    _setButtonActive(button, active) {
        if (active) {
            button.add_style_class_name('active');
        } else {
            button.remove_style_class_name('active');
        }
    }

    _syncButtons() {
        this._setButtonActive(this._mbButton, this._fileUnit === 'MB');
        this._setButtonActive(this._gbButton, this._fileUnit === 'GB');
        this._setButtonActive(this._downloadButton, this._transferType === 'download');
        this._setButtonActive(this._uploadButton, this._transferType === 'upload');
    }

    _readTotals() {
        const file = Gio.File.new_for_path('/proc/net/dev');
        const [ok, contents] = file.load_contents(null);

        if (!ok) {
            return null;
        }

        let rxBytes = 0;
        let txBytes = 0;
        const lines = textDecoder.decode(contents).trim().split('\n').slice(2);

        for (const line of lines) {
            const [namePart, dataPart] = line.trim().split(':');
            if (!dataPart) {
                continue;
            }

            const iface = namePart.trim();
            if (iface === 'lo') {
                continue;
            }

            const numbers = dataPart.trim().split(/\s+/).map(value => Number.parseInt(value, 10));
            rxBytes += numbers[0] || 0;
            txBytes += numbers[8] || 0;
        }

        return {
            rxBytes,
            txBytes,
            sampledAt: GLib.get_monotonic_time(),
        };
    }

    _refreshRates() {
        const current = this._readTotals();
        if (!current) {
            return;
        }

        if (this._lastSample) {
            const elapsedSeconds = (current.sampledAt - this._lastSample.sampledAt) / 1000000;

            if (elapsedSeconds > 0) {
                this._downloadMbps = Math.max(0,
                    ((current.rxBytes - this._lastSample.rxBytes) * 8) / elapsedSeconds / 1000000);
                this._uploadMbps = Math.max(0,
                    ((current.txBytes - this._lastSample.txBytes) * 8) / elapsedSeconds / 1000000);
            }
        }

        this._lastSample = current;

        this._downloadLabel.text = `Download: ${this._formatSpeedLong(this._downloadMbps)}`;
        this._uploadLabel.text = `Upload: ${this._formatSpeedLong(this._uploadMbps)}`;
        this._panelLabel.text = `D ${this._formatSpeedShort(this._downloadMbps)} U ${this._formatSpeedShort(this._uploadMbps)}`;
        this._updateCalculation();
    }

    _getFileSizeInMb() {
        const value = Number.parseFloat(this._sizeEntry.get_text());
        if (!Number.isFinite(value) || value <= 0) {
            return 0;
        }

        return this._fileUnit === 'GB' ? value * 1024 : value;
    }

    _formatSpeedLong(speedMbps) {
        if (!Number.isFinite(speedMbps) || speedMbps <= 0.001) {
            return '0 Mbps';
        }

        if (speedMbps >= 1) {
            return `${speedMbps.toFixed(2)} Mbps`;
        }

        return `${(speedMbps * 1000).toFixed(0)} Kbps`;
    }

    _formatSpeedShort(speedMbps) {
        if (!Number.isFinite(speedMbps) || speedMbps <= 0.001) {
            return '--';
        }

        if (speedMbps >= 10) {
            return speedMbps.toFixed(1);
        }

        if (speedMbps >= 1) {
            return speedMbps.toFixed(2);
        }

        return `${(speedMbps * 1000).toFixed(0)}K`;
    }

    _formatDuration(totalSeconds) {
        if (!Number.isFinite(totalSeconds) || totalSeconds <= 0) {
            return 'Waiting for live traffic';
        }

        const seconds = Math.round(totalSeconds);
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const remainingSeconds = seconds % 60;

        if (hours > 0) {
            return `${hours}h ${minutes}m ${remainingSeconds}s`;
        }

        if (minutes > 0) {
            return `${minutes}m ${remainingSeconds}s`;
        }

        return `${remainingSeconds}s`;
    }

    _formatData(megabytes) {
        if (megabytes >= 1024) {
            return `${(megabytes / 1024).toFixed(2)} GB`;
        }

        return `${megabytes.toFixed(2)} MB`;
    }

    _updateCalculation() {
        const sizeInMb = this._getFileSizeInMb();
        const activeSpeed = this._transferType === 'upload'
            ? this._uploadMbps
            : this._downloadMbps;
        const speedInMBps = activeSpeed / 8;
        const estimatedSeconds = speedInMBps > 0 ? sizeInMb / speedInMBps : Number.NaN;
        const totalData = sizeInMb * (1 + OVERHEAD_PERCENT / 100);
        const typeLabel = this._transferType === 'upload' ? 'Upload' : 'Download';

        this._activeSpeedLabel.text = `Active speed: ${typeLabel} at ${this._formatSpeedLong(activeSpeed)}`;
        this._timeLabel.text = `Estimated time: ${this._formatDuration(estimatedSeconds)}`;
        this._dataLabel.text = `Estimated data: ${this._formatData(totalData)} (${OVERHEAD_PERCENT}% overhead)`;
    }

    destroy() {
        if (this._pollId) {
            GLib.Source.remove(this._pollId);
            this._pollId = 0;
        }

        super.destroy();
    }
});

export default class DataToolkitExtension extends Extension {
    enable() {
        this._indicator = new DataToolkitIndicator();
        Main.panel.addToStatusArea(this.uuid, this._indicator, 0, 'right');
    }

    disable() {
        this._indicator?.destroy();
        this._indicator = null;
    }
}
