'use strict';

const Gio = imports.gi.Gio;
const Gtk = imports.gi.Gtk;
const GObject = imports.gi.GObject;

const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();
const Soup = imports.gi.Soup;


function init() {
}

function buildPrefsWidget() {

    // Copy the same GSettings code from `extension.js`
    let gschema = Gio.SettingsSchemaSource.new_from_directory(
        Me.dir.get_child('schemas').get_path(),
        Gio.SettingsSchemaSource.get_default(),
        false
    );

    this.settings = new Gio.Settings({
        settings_schema: gschema.lookup('org.gnome.shell.extensions.iqair-gnome-extension', true)
    });

    // Create a parent widget that we'll return from this function
    let prefsWidget = new Gtk.Grid({
        margin: 18,
        column_spacing: 30,
        row_spacing: 18,
        visible: true
    });
    let session = new Soup.SessionAsync();


    // AQI Unit
    let aqi_label = new Gtk.Label({
        label: 'AQI Unit:',
        halign: Gtk.Align.START,
        visible: true
    });
    prefsWidget.attach(aqi_label, 0, 1, 1, 1);
    if (!this.settings.get_string('aqi')) {
        this.settings.set_string('aqi', 'US AQI');
    }
    let aqiRadio = null;
    ['US AQI', 'CN AQI'].forEach((mode, index) => {
        aqiRadio = new Gtk.RadioButton({
            label: mode,
            group: aqiRadio,
            halign: Gtk.Align.END,
        });
        aqiRadio.set_active(this.settings.get_string('aqi') === mode);
        prefsWidget.attach(aqiRadio, 1 + index, 1, 1, 1);
        aqiRadio.connect('toggled', button => {
            if (button.active) {
                this.settings.set_string('aqi', mode);
            }
        });
    });
    // 
    // IQAIR Token
    let token_label = new Gtk.Label({
        label: 'IQAir Token:',
        halign: Gtk.Align.START,
        visible: true
    });
    prefsWidget.attach(token_label, 0, 2, 1, 1);
    if (!settings.get_string('token')) {
        this.settings.set_string('token', '');
    }
    let token_entry = new Gtk.Entry({
        text: settings.get_string('token'),
        halign: Gtk.Align.END,
        editable: true,
        visible: true,
        width_chars: 36,
    });
    token_entry.set_placeholder_text('token');
    token_entry.connect('changed', input => {
        if (input.text.length === 36) {
            this.settings.set_string('token', input.text);
        }
    });
    prefsWidget.attach(token_entry, 2, 2, 1, 1);
    // Country
    let country_label = new Gtk.Label({
        label: 'Country:',
        halign: Gtk.Align.START,
        visible: true
    });
    prefsWidget.attach(country_label, 0, 3, 1, 1);
    if (!this.settings.get_string('country')) {
        this.settings.set_string('country', 'USA');
    }
    let country_combo = buildComboBox(['USA', 'China'], 'USA');
    if (settings.get_string('token') && settings.get_string('token').length == 36) {
        session.queue_message(buildRequest(settings.get_string('token'), 'countries', []), (_, response) => {
            let json_data = parseResponse(response);
            if (json_data === true) {
                return;
            }
            country_combo.remove_all();
            json_data.data.forEach(item => {
                if (item['country']) {
                    const val = item['country'];
                    country_combo.append(val, val)
                    if (this.settings.get_string('country') == val) {
                        country_combo.set_active_id(val);
                    }
                }
            });
        });
    }
    prefsWidget.attach(country_combo, 2, 3, 1, 1);
    // State
    let state_label = new Gtk.Label({
        label: 'State:',
        halign: Gtk.Align.START,
        visible: true
    });
    prefsWidget.attach(state_label, 0, 4, 1, 1);
    if (!this.settings.get_string('state')) {
        this.settings.set_string('state', 'California');
    }
    let state_combo = buildComboBox([], '');
    if (
        settings.get_string('token') &&
        settings.get_string('token').length == 36 &&
        settings.get_string('country') &&
        settings.get_string('country') !== ''
    ) {
        refreshComboBox(state_combo, session, this.settings, ['country=' + settings.get_string('country')], 'states', 'state');
    }
    prefsWidget.attach(state_combo, 2, 4, 1, 1);
    // City
    let city_label = new Gtk.Label({
        label: 'City:',
        halign: Gtk.Align.START,
        visible: true
    });
    prefsWidget.attach(city_label, 0, 5, 1, 1);
    if (!this.settings.get_string('city')) {
        this.settings.set_string('city', 'Los Angeles');
    }
    let city_combo = buildComboBox([], '');
    if (
        settings.get_string('token') &&
        settings.get_string('token').length == 36 &&
        settings.get_string('country') &&
        settings.get_string('country') !== '' &&
        settings.get_string('state') &&
        settings.get_string('state') !== ''
    ) {
        refreshComboBox(city_combo, session, this.settings, ['country=' + settings.get_string('country'), 'state=' + settings.get_string('state')], 'cities', 'city');
    }
    prefsWidget.attach(city_combo, 2, 5, 1, 1);
    // Link
    let token_link_button = new Gtk.LinkButton({
        label: 'Get an API token',
        uri: "https://www.iqair.com/us/dashboard/api",
        halign: Gtk.Align.END,
        visible: true
    });
    prefsWidget.attach(token_link_button, 2, 6, 1, 1);


    // ComboBox events
    country_combo.connect('changed', () => {
        if (country_combo.active_id && country_combo.active_id !== '') {
            this.settings.set_string('country', country_combo.active_id);
            state_combo.remove_all();
            refreshComboBox(state_combo, session, this.settings, ['country=' + settings.get_string('country')], 'states', 'state');
            city_combo.remove_all();
        }
    })
    state_combo.connect('changed', () => {
        if (state_combo.active_id && state_combo.active_id !== '') {
            this.settings.set_string('state', state_combo.active_id);
            city_combo.remove_all();
            refreshComboBox(city_combo, session, this.settings, ['country=' + settings.get_string('country'), , 'state=' + settings.get_string('state')], 'cities', 'city');
        }
    })
    city_combo.connect('changed', () => {
        if (city_combo.active_id && city_combo.active_id !== '') {
            this.settings.set_string('city', city_combo.active_id);
        }
    })
    // Return our widget which will be added to the window
    prefsWidget.show_all();
    return prefsWidget;
}

function refreshComboBox(box, session, settings, params, target, inlineTarget) {
    session.queue_message(buildRequest(settings.get_string('token'), target, params), (_, response) => {
        let json_data = parseResponse(response);
        if (json_data === true) {
            return;
        }
        box.remove_all();
        json_data.data.forEach(item => {
            if (item[inlineTarget]) {
                const val = item[inlineTarget];
                box.append(val, val)
                if (this.settings.get_string(inlineTarget) == val) {
                    box.set_active_id(val);
                }
            }
        });
    });
}

function buildComboBox(options, active) {
    let comboBox = new Gtk.ComboBoxText({});
    options.forEach(val => {
        comboBox.append(val, val);
        if (active == val) {
            comboBox.set_active_id(val);
        }
    });
    return comboBox;
}

function buildRequest(token, field, arr) {
    let params = ['key=' + token,];
    arr.forEach(item => {
        params.push(item);
    })
    const url = 'https://api.airvisual.com/v2/' + field + '?' + encodeURI(params.join('&'));
    let request = Soup.Message.new('GET', url);
    request.request_headers.append('Cache-Control', 'no-cache');
    request.request_headers.append('User-Agent', 'Mozilla/5.0 (Windows NT 6.3) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/83.0.4103.84 Safari/537.36');
    return request;
}

function parseResponse(response) {
    if (response.status_code > 299) {
        log(["Remote server error:", response.status_code, response.response_body.data]);
        return true;
    }
    const json_data = JSON.parse(response.response_body.data);
    if (!json_data.status || json_data.status !== "success" || !json_data.data) {
        log(["Remote server error:", response.response_body.data]);
        return true;
    }
    return json_data;
}

function log(logs) {
    print('[IqairMenuButton-Settings]', logs.join(", "));
}