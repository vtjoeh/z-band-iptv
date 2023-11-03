/*
Z-Band IPTV - Decoder Control Macro v0.1.2
Purpose: Macro for controlling a Z-Band IPTV decoder device through the Z-TV server from a Cisco video device.  

let author = "joehughe" + "@" + "cisco.com"

License: MIT LICENSE 
for more details see: https://github.com/vtjoeh/z-band-iptv
*/

import xapi from 'xapi';

/* 
  The below values are overridden by the setting in xConfiguration.SytemUnit.CustomDeviceId, if available.  
  xConfiguration.SytemUnit.CustomDeviceId is limited to 255 characters, so it is recommended to keep common configurations. 
  
  Example: 
  ztv_sn="KN3619D0082877";ztv_user="admin@domain";ztv_pass= "pAssW0rD"; ztv_server="https://ztv.example.com", ztv_hdmi="3", ztv_fav_chan="Favorites"  
  or just
  ztv_sn="KN3619D0082877"
*/

const ALLOW_INSECURE_HTTPS = "True"; // "True" or "False" in TEXT FORMAT.  Recommended value is "False".  Server must have a valid certificate trusted by video device.

let ztv_sn = "";  // Z-Band encoder serial number. Can also be stored in xConfiguration.SytemUnit.CustomDeviceId.

let ztv_user = "";  // Z-Band Z-TV password.  Can also be stored in xConfiguration.SytemUnit.CustomDeviceId.

let ztv_pass = "";  // Z-Band Z-TV password. Can also be stored in xConfiguration.SytemUnit.CustomDeviceId.

let ztv_server = "https://" // Z-Band Z-TV server. Includes https:// at beginning.  Can also be stored in xConfiguration.SytemUnit.CustomDeviceId.

let ztv_hdmi = "3";  // HDMI In on Cisco video device that the Z-TV endpoint decoder connects to. Can also be stored in xConfiguration.SytemUnit.CustomDeviceId.
// HDMI Input must support HDCP. See: https://roomos.cisco.com/xapi/Configuration.Video.Input.Connector[3].HDCP.Mode/?p=helix_55   

let ztv_fav_chan = ""; // Channel Group that acts as favorites shown on default page. Up to 10 channels. Can also be stored in xConfiguration.SytemUnit.CustomDeviceId.

/* 
  Below values on the Navigator panel that are dynamically built.  
*/

const panelButtonName = 'TV';

const icon = 'Tv';  // icon for the Panel button

const iconColor = '#1170CF';  // hex format

const pageNameDefault = 'TV'; // Name of the default tab

const channelsPageName = 'All Channels'; // Name of the tab 

const order = 1; // Order button panel shown on touch panel. Higher shows first relative to other custom buttons. 

const TIMEOUT_HTTP_API_CALL = 3; // timeout for API calls to Z-TV Server in seconds.  Default is 3 seconds. Increase if large latency. 

const LOGIN_FAILURE_RETRY = 30 // in seconds.  If username/password fail, decoder id, server or serial number is not found, how long to wait to try again.  

const TURN_ON_ALLOW_HDCP = true;  // if true, turns on allow HDCP every restart. If 'false', no settings are changed.  

const TURN_ON_HTTP_CLIENT = true; // Every time the macro runs, it turns on the HTTP Client Settings.  Only needed first use or could be done manually. If false, nothing happens. 

const RANDOM_START_RANGE = 15; // In seconds. Start time will be selected randomly not exceeding this value in seconds.  If all video devices restart at the same time the Z-TV server is not overwhelmed with login requests. 

/* 
  Leave below variables as is: 
*/

const ZBAND_PANEL_ID = 'panel_zband_channels';

const ZBAND_PANEL_REMOTE_ID = 'panel_zband_remote';

const ZBAND_DEFAULT_PAGE_ID = 'pageid_zband_default';

const DEFAULT_TAB = ZBAND_DEFAULT_PAGE_ID; // Define the tab that opens when clicking on the panel 

let objToken = {};  // stores the refresh token 

let strBuiderChannelRows = ''; // string builder for Channel Rows  

let allChannels;  // used to hold all channels

let favoriteChannels; // used to hold the favorite channels in memory to rebuild panel

let ztv_id = ''; // ztv_id will be determined by the ztv_decoder_sn = '';  If ztv_sn is not available, ztv_id can be hard coded here or in xConfiguration.SytemUnit.CustomDeviceId.

let timerVolume;  // timer for changing volume on the volume button so it can be pressed/released

let timerLoginRetry; // timer 

let timerRenewToken; // timer for the refresh token

let volumeTimerIncrement = 140; // in miliseconds between

const delayMs = Math.random() * RANDOM_START_RANGE * 1000; 

console.log('Random delay Z-Band controller macro will start in ' + (delayMs / 1000).toFixed(2) + ' seconds' ); 

setTimeout(()=>{
    updateStatusPage('Starting Macro...');
    login();
}, delayMs)

function changeVolume(upDown) {
  if (upDown == 'up') {
    xapi.Command.Audio.Volume.Increase();
  }
  else if (upDown == 'down') {
    xapi.Command.Audio.Volume.Decrease();
  }
  timerVolume = setTimeout(changeVolume, volumeTimerIncrement, upDown);
}

async function getConfigIdConfiguration() {

  const strConfig = await xapi.Config.SystemUnit.CustomDeviceId.get();

  console.log('Updating settings from xConfiguration SystemUnit CustomeDeviceId');

  ztv_sn = getVariables('ztv_sn', ztv_sn);

  ztv_id = getVariables('ztv_id', ztv_id);

  ztv_user = getVariables('ztv_user', ztv_user);

  ztv_pass = getVariables('ztv_pass', ztv_pass);

  ztv_server = getVariables('ztv_server', ztv_server);

  ztv_hdmi = getVariables('ztv_hdmi', ztv_hdmi);

  ztv_fav_chan = getVariables('ztv_fav_chan', ztv_fav_chan);

  function getVariables(strVariable, ztv_variable) {

    let strRegex = `${strVariable}\\s*=\\s*"\([^"]+\)"`

    let regEx = new RegExp(strRegex, "g");

    let match = regEx.exec(strConfig);

    if (match) {
      console.info(`Variable updated ${strVariable}="${match[1]}"`);
      return match[1];
    } else {
      console.info(`Variable unchanged ${strVariable}="${ztv_variable}"`);
    }

    return ztv_variable; // return the variable unchanged 
  }
}

function loginRetry(reason) {
  clearTimeout( timerLoginRetry ); 
  let message = reason + '. Retry in ' + LOGIN_FAILURE_RETRY + ' sec.'
  updateStatusPage(message);
  console.error(message);
  timerLoginRetry = setTimeout(login, LOGIN_FAILURE_RETRY * 1000);
}

async function login() {

  await getConfigIdConfiguration();

  updateStatusPage('Attempting Login');

  const path = '/eztv/api/login';
  const url = ztv_server + path;
  let contentType = 'Content-Type: application/json';
  let headers = [contentType];
  let body = { "username": ztv_user, "password": ztv_pass };
  body = JSON.stringify(body);

  xapi.Command.HttpClient.Post({
    "AllowInsecureHttps": ALLOW_INSECURE_HTTPS,
    "ResultBody": "PlainText",
    "URL": url,
    "Header": headers,
    "Timeout": TIMEOUT_HTTP_API_CALL
  }, body).then((result) => {


    objToken = JSON.parse(result.Body);

    if (objToken.roles[0].toLowerCase() == 'anonymous') {
      // login failed 
      loginRetry('Username/Password Failed');
    }
    else {
      // login succeeded
      updateStatusPage('Login Succeeded');
    }

  }).then(() => {
    blankAboutPage();
    renewToken();
  }).then(() => {
    if (ztv_id == '' || ztv_id == null) {
      getEndpointBySerialNumber();
    } else {
      getEndpointById();
    }
  }).then(() => {
    getChannelsAllWithLimitedFields().then(() => {
      updateMainPage();
    });

  }).catch((error) => {
    console.error(error);
    if (error.message.includes('Operation timed out')) {
      loginRetry('Login attempt timed out after ' + TIMEOUT_HTTP_API_CALL + ' seconds.');
    } else {
      loginRetry('Failed to login.  Username, password or domain may be incorrect.');
    }
  });
}

function renewToken() {

  updateStatusPage('Attempting Token Refresh');

  const path = '/eztv/api/renew';
  const url = ztv_server + path;
  let contentType = 'Content-Type: application/json';
  let authorization = 'Authorization: Bearer ' + objToken.token;
  let headers = [contentType, authorization];
  let body = '';

  xapi.Command.HttpClient.Post({
    "AllowInsecureHttps": ALLOW_INSECURE_HTTPS,
    "ResultBody": "PlainText",
    "URL": url,
    "Header": headers,
    "Timeout": TIMEOUT_HTTP_API_CALL
  }, body).then((result) => {

    try {
      objToken = JSON.parse(result.Body);

      if (objToken.roles[0].toLowerCase() == 'anonymous') {
        // login failed 
        loginRetry('Renewal of token failed.  "Anonymous" user role returned.');

      }
      else {
        // login succeeded
        clearTimeout(timerRenewToken); 
        let timeout = ((Number(objToken.secondsToExpire) - 10) * 1000) - delayMs; // add 10 seoconds + delay Ms to the secondsToExpire to stagger token refreshes 
        updateStatusPage('Token refresh successfull. Next refresh in ' + (timeout / 1000 / 60).toFixed(0) + " min.");
 
        timerRenewToken = setTimeout(renewToken, timeout);
      }
    } catch (error) {
      loginRetry('Error reading token object');
    }
  }).catch((error) => {

    if (error.message.includes('Operation timed out')) {
      loginRetry('Renew token attempt timed out after ' + TIMEOUT_HTTP_API_CALL + ' seconds.');
    } else {
      loginRetry('Failed to renew token.');
    }
    console.error(error);
  });
}

// switch input to Z-Band HDMI in and turn on Z-Band decoder if off. 
async function zbandOn() {
  xapi.Command.Presentation.Start(
    { ConnectorId: ztv_hdmi }).then(() => {
      sendImmediateAction('EndpointOn');
    });
}

async function updateMainPage() {
  const path = '/eztv/api/contentgroups';
  const params = '?offset=0&limit=500&targetuseragent=PC_Mac'
  const url = ztv_server + path + params;
  let contentType = 'Content-Type: application/json';
  let authorization = 'Authorization: Bearer ' + objToken.token;

  let headers = [contentType, authorization];
  return await xapi.Command.HttpClient.Get({
    "AllowInsecureHttps": ALLOW_INSECURE_HTTPS,
    "URL": url,
    "Header": headers,
    "Timeout": TIMEOUT_HTTP_API_CALL
  }).then((result) => {
    let contentGroups = JSON.parse(result.Body);
    contentGroups.items.forEach((channelGroup) => {
      if (channelGroup.name.toLowerCase().trim() == ztv_fav_chan.toLowerCase().trim()) {
        getFavoriteChannels(channelGroup.id);
        return;
      }
    });
    return result;
  }).catch((error) => {
    console.error(error);
    return error();
  });
}

function getFavoriteChannels(contentGroupId) {
  const parameters = "?offset=0&limit=10&targetuseragent=PC_Mac&sort=name&includedFields=id,number,name,ipaddress,port,encryptiontype,encryptionkey,encryptionkeytype";
  const url = ztv_server + '/eztv/api/contentgroups/' + contentGroupId + '/channels' + parameters;
  let contentType = 'Content-Type: application/json';
  let authorization = 'Authorization: Bearer ' + objToken.token;

  let headers = [contentType, authorization];
  xapi.Command.HttpClient.Get({
    "AllowInsecureHttps": ALLOW_INSECURE_HTTPS,
    "URL": url,
    "Header": headers,
    "Timeout": TIMEOUT_HTTP_API_CALL
  }).then((result) => {

    favoriteChannels = JSON.parse(result.Body).items;

    buildPanel(allChannels);  // favoriteChannels is a global variable 

  }).catch((error) => {
    console.error(error);
  });

}

async function getChannelsAllWithLimitedFields() {
  const parameters = '?offset=0&limit=500&targetuseragent=PC_Mac&sort=name&filter=enabled::true&includedFields=id,number,name,description,iPAddress,port,type,encryptionType,encryptionKey,encryptionKeyType';
  const path = '/eztv/api/channels';
  const url = ztv_server + path + parameters;
  let contentType = 'Content-Type: application/json';
  let authorization = 'Authorization: Bearer ' + objToken.token;

  let headers = [contentType, authorization];
  return await xapi.Command.HttpClient.Get({
    "AllowInsecureHttps": ALLOW_INSECURE_HTTPS,
    "URL": url,
    "Header": headers,
    "Timeout": TIMEOUT_HTTP_API_CALL
  }).then((result) => {
    allChannels = JSON.parse(result.Body).items;
    return allChannels;
  }).catch((error) => {
    console.error(error);
    return error();
  });
}

function updateLabelWidget(widgetId, text) {
  xapi.Command.UserInterface.Extensions.Widget.SetValue({ WidgetId: widgetId, Value: text });
}

function getEndpointById() {

  const path = '/eztv/api/endpoints/' + ztv_id;
  const url = ztv_server + path;
  let contentType = 'Content-Type: application/json';
  let authorization = 'Authorization: Bearer ' + objToken.token;

  let headers = [contentType, authorization];
  xapi.Command.HttpClient.Get({
    "AllowInsecureHttps": ALLOW_INSECURE_HTTPS,
    "URL": url,
    "Header": headers,
    "Timeout": TIMEOUT_HTTP_API_CALL
  }).then((endpoint) => {

    let decoderEndpoint = JSON.parse(endpoint.Body);
    updateAboutPage(decoderEndpoint);

  }).catch((error) => {
    console.error(error);
  });
}

function blankAboutPage() {
  setTimeout(() => {
    updateLabelWidget('widget_lbl_decoder_name', "unknown");
    updateLabelWidget('widget_lbl_decoder_iPAddress', "unknown");
    updateLabelWidget('widget_lbl_decoder_id', ztv_id);
    updateLabelWidget('widget_lbl_decoder_sn', ztv_sn);
    updateLabelWidget('widget_lbl_decoder_model', "unkown");
  }, 1300);
}

function updateAboutPage(decoderEndpoint) {
  setTimeout((decoderEndpoint) => {
    updateLabelWidget('widget_lbl_decoder_name', decoderEndpoint.name);
    updateLabelWidget('widget_lbl_decoder_iPAddress', decoderEndpoint.iPAddress);
    updateLabelWidget('widget_lbl_decoder_id', decoderEndpoint.id);
    updateLabelWidget('widget_lbl_decoder_sn', decoderEndpoint.sn);
    updateLabelWidget('widget_lbl_decoder_model', decoderEndpoint.model);
  }, 1500, decoderEndpoint);
}

function getEndpointBySerialNumber() {
  const parameters = '?offset=0&limit=100&sort=name';
  const path = '/eztv/api/endpoints';
  const url = ztv_server + path + encodeURI(parameters);
  let contentType = 'Content-Type: application/json';
  let authorization = 'Authorization: Bearer ' + objToken.token;

  let headers = [contentType, authorization];
  xapi.Command.HttpClient.Get({
    "AllowInsecureHttps": ALLOW_INSECURE_HTTPS,
    "URL": url,
    ResultBody: 'plaintext',
    "Header": headers,
    "Timeout": TIMEOUT_HTTP_API_CALL
  }).then((result) => {
    let endpoints = JSON.parse(result.Body);
    endpoints.items.forEach((endpoint) => {
      if (endpoint.sn == ztv_sn) {
        ztv_id = endpoint.id;
        console.log(`Updated after SN lookup: ztv_decoder_id=${ztv_id}`);
        updateAboutPage(endpoint);
      }
    })
  }).catch((error) => {
    console.error(error);
  });
}

async function sendImmediateAction(action) {
  console.log('zBand sendImmediateAction: ', action);

  const path = '/eztv/api/events/immediate/activities';
  const url = ztv_server + path;
  let contentType = 'Content-Type: application/json';
  let authorization = 'Authorization: Bearer ' + objToken.token;
  let headers = [contentType, authorization];

  let body = {
    "action": action,
    "actionCluster": "DSS",
    "actionParameters": [],
    "actionTargets": [
      {
        "id": ztv_id,
        "cmdTargetType": "Endpoint"
      }
    ]
  }

  body = JSON.stringify(body);

  xapi.Command.HttpClient.Post({
    "AllowInsecureHttps": ALLOW_INSECURE_HTTPS,
    "ResultBody": "PlainText",
    "URL": url,
    "Header": headers,
    "Timeout": TIMEOUT_HTTP_API_CALL
  }, body).then((result) => {

    let actionResult = JSON.parse(result.Body);

    // console.log('actionResult', actionResult);

  }).catch((error) => {
    if (error.message.includes('Operation timed out')) {
      loginRetry('sendImmediateAction(action) timed out after ' + TIMEOUT_HTTP_API_CALL + ' seconds.');
    } else {
      loginRetry('sendImmediateAction(action) failed.');
    }
    console.error(error);
  });
}


function sendRemoteControlKeyCommand(keyCommand) {
  console.log('keyCommand', keyCommand);

  const path = '/eztv/api/events/immediate/activities';
  const url = ztv_server + path;
  let contentType = 'Content-Type: application/json';
  let authorization = 'Authorization: Bearer ' + objToken.token;
  let headers = [contentType, authorization];


  let body = {
    "action": "Event",
    "actionCluster": "DSS",
    "actionParameters": [
      {
        "Name": "Key",
        "Value": keyCommand
      }
    ],
    "actionTargets": [
      {
        "id": ztv_id,
        "cmdTargetType": "Endpoint"
      }
    ]
  }

  body = JSON.stringify(body);

  xapi.Command.HttpClient.Post({
    "AllowInsecureHttps": ALLOW_INSECURE_HTTPS,
    "ResultBody": "PlainText",
    "URL": url,
    "Header": headers,
    "Timeout": TIMEOUT_HTTP_API_CALL
  }, body).then((result) => {

    let irKeypress = JSON.parse(result.Body);

    console.log('irKeypress', irKeypress);

  }).catch((error) => {

    if (error.message.includes('Operation timed out')) {
      loginRetry('sendRemoteControlKeyCommand(keyCommand). Renew token attempt timed out after ' + TIMEOUT_HTTP_API_CALL + ' seconds.');
    } else {
      loginRetry('sendRemoteControlKeyCommand(keyCommand) error.');
    }
    console.error(error);
  });
}




function setChannelImmediate(channel) {

  const path = '/eztv/api/events/immediate/activities';
  const url = ztv_server + path;
  let contentType = 'Content-Type: application/json';
  let authorization = 'Authorization: Bearer ' + objToken.token;
  let headers = [contentType, authorization];

  if (!"encryptionKey" in channel) {
    channel.encryptionKey = ""
  }
  else if (channel.encryptionKey == null) {
    channel.encryptionKey = "";
  }


  let body = {
    "action": "LoadChannel",
    "actionCluster": "DSS",
    "actionParameters": [
      {
        "name": "Emergency",
        "value": "false"
      },
      {
        "name": "Fullscreen",
        "value": "false"
      },
      {
        "name": "Type",
        "value": channel.type
      },
      {
        "name": "IP",
        "value": channel.iPAddress
      },
      {
        "name": "Port",
        "value": (channel.port.toString())
      },
      {
        "name": "EncryptionType",
        "value": channel.encryptionType
      },
      {
        "name": "EncryptionKey",
        "value": channel.encryptionKey
      },
      {
        "name": "DecoderIndex",
        "value": "0"
      },
      {
        "name": "URL",
        "value": ""
      },
      {
        "name": "Name",
        "value": channel.name
      },
      {
        "name": "Description",
        "value": channel.description
      },
      {
        "name": "Id",
        "value": channel.id.toString()
      },
      {
        "name": "Number",
        "value": channel.number.toString()
      }
    ],
    "actionTargets": [
      {
        "id": ztv_id,
        "cmdTargetType": "Endpoint"
      }
    ]
  }



  body = JSON.stringify(body);


  xapi.Command.HttpClient.Post({
    "AllowInsecureHttps": ALLOW_INSECURE_HTTPS,
    "ResultBody": "PlainText",
    "URL": url,
    "Header": headers,
    "Timeout": TIMEOUT_HTTP_API_CALL
  }, body).then((result) => {

    let currentChannel = JSON.parse(result.Body);

    console.log('setChannelImmediate():', currentChannel);

  }).catch((error) => {

    if (error.message.includes('Operation timed out')) {
      loginRetry('setChannelImmediate(channel) attempt timed out after ' + TIMEOUT_HTTP_API_CALL + ' sec.');
    } else {
      loginRetry('setChannelImmediate(channel) error.');
    }
    console.error(error);
  });
}


function sendRemoteControlNumericKey(keyNumeric) {

  console.log('keyNumeric', keyNumeric);
  const path = '/eztv/api/events/immediate/activities';
  const url = ztv_server + path;
  let contentType = 'Content-Type: application/json';
  let authorization = 'Authorization: Bearer ' + objToken.token;
  let headers = [contentType, authorization];

  let body = {
    "action": "Event",
    "actionCluster": "DSS",
    "actionParameters": [
      {
        "Name": "Key",
        "Value": "KEY_NUMERIC"
      },
      {
        Name: "Number",
        Value: keyNumeric
      }
    ],
    "actionTargets": [
      {
        "id": ztv_id,
        "cmdTargetType": "Endpoint"
      }
    ]
  }

  body = JSON.stringify(body);

  xapi.Command.HttpClient.Post({
    "AllowInsecureHttps": ALLOW_INSECURE_HTTPS,
    "ResultBody": "PlainText",
    "URL": url,
    "Header": headers,
    "Timeout": TIMEOUT_HTTP_API_CALL
  }, body).then((result) => {

    let irKeypressNumeric = JSON.parse(result.Body);

    console.log('sendRemoteControlNumericKey(keyNumeric):', irKeypressNumeric);

  }).catch((error) => {

    if (error.message.includes('Operation timed out')) {
      loginRetry('sendRemoteControlNumericKey(keyNumeric) attempt timed out after ' + TIMEOUT_HTTP_API_CALL + ' sec.');
    } else {
      loginRetry('sendRemoteControlNumericKey(keyNumeric) failed.');
    }
    console.error(error);
  });
}


function showHidRemotePanel(visibility) {
  xapi.Command.UserInterface.Extensions.List().then((result) => {
    let panelFound = false;
    result.Extensions.Panel.forEach((panel) => {
      if (panel.PanelId == ZBAND_PANEL_REMOTE_ID) {
        xapi.Command.UserInterface.Extensions.Panel.Update({ PanelId: ZBAND_PANEL_REMOTE_ID, Location: visibility });
        panelFound = true; 
      }
    }); 

    if (!panelFound) {
      xapi.Command.UserInterface.Message.Prompt.Display({ Duration: 30, "Option.1": "OK", Text: "for more info see https://github.com/vtjoeh/z-band-iptv", Title: "Z-Band Remote Panel Not Installed" });
    }

  })
}

function guiEvent(event) {
  const regexKey = /widget_zband\d{0,3}\.(.+)/;
  const regexMultiKey = /widget_multikey_zband.*/;
  const regexRemoteOff = /widget_zband_remote_off/;
  const regexKeyNumeric = /widget_zband_key_numeric\d{0,3}\.(.+)/;
  const regexMultiKeyImmediate = /widget_muti_zband_immediate\d{0,3}/;

  const regexChannelKey = /widget_zband_channel_(\d{0,5})_(\d{0,5})/;

  const channelKeyMatch = event.WidgetId.match(regexChannelKey);

  if (channelKeyMatch != null) {
    if (event.Type == 'pressed') {
      let channelid = channelKeyMatch[1]
      matchChannelIdSendImmediateChannel(channelid);
    }
  }

  const keyMatch = event.WidgetId.match(regexKey);

  if (keyMatch != null) {
    if (event.Type == 'pressed') {
      sendRemoteControlKeyCommand(keyMatch[1]);
    }
  }

  const keyNumericMatch = event.WidgetId.match(regexKeyNumeric);
  if (keyNumericMatch != null) {
    if (event.Type == 'pressed') {
      sendRemoteControlNumericKey(keyNumericMatch[1]);
    }
  }

  if (event.WidgetId == 'widget_zband_button_filter' && event.Type == 'pressed') {
    openFilterKeypad();
  }

  if (event.WidgetId == 'widget_zband_filter_reset' && event.Type == 'pressed') {
    buildPanel(allChannels);
  }

  if (event.WidgetId == 'zband_codec_volume_down') {
    if (event.Type == 'pressed') {
      clearTimeout(timerVolume);
      changeVolume('down');
    }
    else if (event.Type == 'released') {
      clearTimeout(timerVolume);
    }
  }

  if (event.WidgetId == 'zband_codec_volume_up') {
    if (event.Type == 'pressed') {
      clearTimeout(timerVolume);
      changeVolume('up');
    }
    else if (event.Type == 'released') {
      clearTimeout(timerVolume);
    }
  }

  if (event.WidgetId == 'widget_zband_show_remote' && event.Type == 'pressed') {
    showHidRemotePanel('HomeScreen');
  }

  if (event.WidgetId == 'widget_zband_hide_remote' && event.Type == 'pressed') {
    showHidRemotePanel('Hidden');
  }

  if (event.WidgetId == 'widget_zband_directional_pad') {

    if (event.Type !== 'pressed') return;

    if (event.Value == 'up') {
      sendRemoteControlKeyCommand('KEY_UP');
    }
    else if (event.Value == 'down') {
      sendRemoteControlKeyCommand('KEY_DOWN');
    }
    else if (event.Value == 'left') {
      sendRemoteControlKeyCommand('KEY_LEFT');
    }
    else if (event.Value == 'right') {
      sendRemoteControlKeyCommand('KEY_RIGHT');
    }
    else if (event.Value == 'center') {
      sendRemoteControlKeyCommand('KEY_SELECT');
    }
  }

  const mulitKeyImmediateMatch = event.WidgetId.match(regexMultiKeyImmediate);
  if (mulitKeyImmediateMatch) {
    if (event.Type == 'pressed') {
      sendImmediateAction(event.Value);
    }
    else if (event.Type == 'released') {
      xapi.Command.UserInterface.Extensions.Widget.UnsetValue({ WidgetId: event.WidgetId });  // Reset GUI so button is not shown as selected. 
    }

  }

  const multiKeyMatch = event.WidgetId.match(regexMultiKey);
  if (multiKeyMatch) {
    if (event.Type == 'pressed') {
      sendRemoteControlKeyCommand(event.Value);
    }
    else if (event.Type == 'released') {
      xapi.Command.UserInterface.Extensions.Widget.UnsetValue({ WidgetId: event.WidgetId });  // Reset GUI so button is not shown as selected. 
    }
  }

  const remoteOffMatch = event.WidgetId.match(regexRemoteOff);

  if (remoteOffMatch) {
    xapi.Command.Presentation.Stop().then((result) => {
      console.log('presentation stop', result);
      sendImmediateAction('EndpointOff');
      xapi.Command.UserInterface.Extensions.Panel.Close();
    });
  }
}

const FEEDBACK_ID_INPUT_FILTER = 'feedback_id_zband_input_filter';

function openFilterKeypad() {
  xapi.Command.UserInterface.Message.TextInput.Display(
    { Duration: 120, FeedbackId: FEEDBACK_ID_INPUT_FILTER, Placeholder: "Enter Search Value", SubmitText: "Search", Text: "Click the *Search* button", Title: "Search Channels" });
}

function turnOnHTTPClient() {
  if (TURN_ON_HTTP_CLIENT) {
    xapi.Config.HttpClient.Mode.set("On");
  }

  if (ALLOW_INSECURE_HTTPS == "True") {
    xapi.Config.HttpClient.AllowInsecureHTTPS.set("True");
  } else {
    xapi.Config.HttpClient.AllowInsecureHTTPS.set("False");
  }
}

function turnOnHDCP() {
  if (TURN_ON_ALLOW_HDCP) {
    console.log(`Turning on HDCP for HDMIN In: ${ztv_hdmi}`)
    xapi.Config.Video.Input.Connector[(Number(ztv_hdmi))].HDCP.Mode.set('On').then().catch((error) => {
      console.error(`Error turning on HDCP.  Check the video device and HDMI Input ${ztv_hdmi} support HDCP.`)
    });
  }
}

function updateStatusPage(text) {
  setTimeout((text) => {
    let time = new Date();
    let newTime = formatTimeStamp(time)
    let msg = formatTimeStamp(time) + " - " + text;
    console.info(msg);
    xapi.Command.UserInterface.Extensions.Widget.SetValue({ WidgetId: "widget_zband_status", Value: msg });
  }, 1000, text);  // adding some delay so the touchpanel is fully built first. 
}

function formatTimeStamp(t) {
  let newTimeString = t.getFullYear() + '-' + (t.getMonth() + 1) + '-' + t.getDate() + ' '  + t.toLocaleTimeString();  
  return newTimeString;
}

function panelClicked(event) {

  if (event.PanelId == ZBAND_PANEL_ID || event.PanelId == ZBAND_PANEL_REMOTE_ID) {
    console.log('event panel clicked', event.name);
    if (event.PanelId == ZBAND_PANEL_ID) {
      xapi.Command.UserInterface.Extensions.Panel.Open({ PanelId: ZBAND_PANEL_ID, PageId: DEFAULT_TAB });
    }
    zbandOn();
  }

  getChannelsAllWithLimitedFields().then(() => {
    updateMainPage();
  });

}

function matchChannelIdSendImmediateChannel(channelid) {
  allChannels.forEach((channel) => {
    if (channel.id == channelid) {
      setChannelImmediate(channel);
      console.log('setChannelImmediate channel.number', channel.number);
      return;
    }
  })
}

function buildPanel(channelsToBuild) {
  let strBuilderFavChannels = '';
  strBuiderChannelRows = '';
  channelsToBuild.forEach((channel) => {
    console.log('Adding channel to touchpanel channel: ', channel.number, channel.name);
    strBuiderChannelRows += addChannelRow(channel.id, channel.number, channel.name);
  })

  let x = 0; // x acts as the channel counter   

  for (let i = 0; i < 5; i++) {

    strBuilderFavChannels += `<Row><Name>Row</Name>`;

    if (favoriteChannels && favoriteChannels.length > x) {
      // build an odd channel widget
      strBuilderFavChannels += addFavChannelWidget(favoriteChannels[x].id, favoriteChannels[x].number, favoriteChannels[x].name);
      x += 1;
      if (favoriteChannels.length > x) {
        // build an even channel widget
        strBuilderFavChannels += addFavChannelWidget(favoriteChannels[x].id, favoriteChannels[x].number, favoriteChannels[x].name);
        x += 1;
      }
    }
    strBuilderFavChannels += `</Row>`;
  }
  let newPanel = returnTvPanel(strBuiderChannelRows, strBuilderFavChannels);
  xapi.Command.UserInterface.Extensions.Panel.Save({ PanelId: ZBAND_PANEL_ID }, newPanel);
}

function addChannelRow(channelId, channelNumber, channelName) {
  let channelRow = `<Row>
        <Name>Channel ${channelNumber}</Name>
        <Widget>
          <WidgetId>widget_zband_channel_${channelId}_${channelNumber}</WidgetId>
          <Name>${channelName}</Name>
          <Type>Button</Type>
          <Options>size=3</Options>
        </Widget>
      </Row>`
  return channelRow;
}

function addFavChannelWidget(channelId, channelNumber, channelName) {
  let channelWidget = `<Widget>
          <WidgetId>widget_zband_channel_${channelId}_${channelNumber}</WidgetId>
          <Name>${channelName}</Name>
          <Type>Button</Type>
          <Options>size=2</Options>
        </Widget>`

  return channelWidget;
}


function createDefaultPage(strBuilderFavChannels) {

  let defaultPage = `
  <Page>
      <Name>${pageNameDefault}</Name>
      ${strBuilderFavChannels}
      <Row>
        <Name>Row</Name>
        <Widget>
          <WidgetId>widget_zband_text_volpwr</WidgetId>
          <Name>               Volume                                                      TV Off</Name>
          <Type>Text</Type>
          <Options>size=4;fontSize=normal;align=left</Options>
        </Widget>
      </Row>
      <Row>
        <Name>Row</Name>
        <Widget>
          <WidgetId>zband_codec_volume_down</WidgetId>
          <Type>Button</Type>
          <Options>size=1;icon=speaker</Options>
        </Widget>
        <Widget>
          <WidgetId>zband_codec_volume_up</WidgetId>
          <Type>Button</Type>
          <Options>size=1;icon=audio_plus</Options>
        </Widget>
        <Widget>
          <WidgetId>widget_300</WidgetId>
          <Type>Spacer</Type>
          <Options>size=1</Options>
        </Widget>
        <Widget>
          <WidgetId>widget_zband_remote_off</WidgetId>
          <Type>Button</Type>
          <Options>size=1;icon=power</Options>
        </Widget>
      </Row>
      <PageId>${ZBAND_DEFAULT_PAGE_ID}</PageId>
      <Options>hideRowNames=1</Options>
    </Page>
  `
  return defaultPage;
}

function returnTvPanel(strBuiderChannelRows, strBuilderFavChannels) {

  let defaultPage = createDefaultPage(strBuilderFavChannels);

  let channelPanel = `<Extensions>
  <Panel>
    <Order>${order}</Order>
    <PanelId>${ZBAND_PANEL_REMOTE_ID}</PanelId>
    <Location>HomeScreen</Location>
    <Icon>${icon}</Icon>
    <Color>${iconColor}</Color>
    <Name>${panelButtonName}</Name>
    <ActivityType>Custom</ActivityType>
    ${defaultPage}
    <Page>
      <Name>${channelsPageName}</Name>
      <Row>
        <Name>Filter Row</Name>
        <Widget>
          <WidgetId>widget_zband_button_filter</WidgetId>
          <Name>Filter</Name>
          <Type>Button</Type>
          <Options>size=2</Options>
        </Widget>
        <Widget>
          <WidgetId>widget_zband_filter_reset</WidgetId>
          <Name>Reset</Name>
          <Type>Button</Type>
          <Options>size=2</Options>
        </Widget>
      </Row>
        ${strBuiderChannelRows}
      <PageId>pageid_zband_channels</PageId>
      <Options>hideRowNames=1</Options>
    </Page>
    <Page>
      <Name>About</Name>
      <Row>
        <Name>Row</Name>
        <Widget>
          <WidgetId>widget_text_zband_123</WidgetId>
          <Name>Z-Band IPTV - Decoder Control Macro</Name>
          <Type>Text</Type>
          <Options>size=4;fontSize=normal;align=center</Options>
        </Widget>
      </Row>
      <Row>
        <Name>Row</Name>
        <Widget>
          <WidgetId>widget_299</WidgetId>
          <Name>Last Action:</Name>
          <Type>Text</Type>
          <Options>size=1;fontSize=small;align=center</Options>
        </Widget>
        <Widget>
          <WidgetId>widget_zband_status</WidgetId>
          <Name>&lt;&lt;feedback&gt;&gt;</Name>
          <Type>Text</Type>
          <Options>size=3;fontSize=small;align=left</Options>
        </Widget>
      </Row>
      <Row>
        <Name>Author:</Name>
        <Widget>
          <WidgetId>widget_142</WidgetId>
          <Name>More Info:</Name>
          <Type>Text</Type>
          <Options>size=1;fontSize=small;align=center</Options>
        </Widget>
        <Widget>
          <WidgetId>widget_zband_lbl_github</WidgetId>
          <Name>For more info and license information about this macro see: https://github.com/vtjoeh/z-band-iptv</Name>
          <Type>Text</Type>
          <Options>size=3;fontSize=small;align=left</Options>
        </Widget>
      </Row>
      <Row>
        <Name>Status:</Name>
        <Widget>
          <WidgetId>widget_140</WidgetId>
          <Name>Decoder Name:</Name>
          <Type>Text</Type>
          <Options>size=1;fontSize=small;align=center</Options>
        </Widget>
        <Widget>
          <WidgetId>widget_lbl_decoder_name</WidgetId>
          <Name>&lt;&lt;Name&gt;&gt;</Name>
          <Type>Text</Type>
          <Options>size=3;fontSize=normal;align=center</Options>
        </Widget>
      </Row>
      <Row>
        <Name>Row</Name>
        <Widget>
          <WidgetId>widget_144</WidgetId>
          <Name>Decoder IP:</Name>
          <Type>Text</Type>
          <Options>size=1;fontSize=small;align=center</Options>
        </Widget>
        <Widget>
          <WidgetId>widget_lbl_decoder_iPAddress</WidgetId>
          <Name>&lt;&lt;IP Address&gt;&gt;</Name>
          <Type>Text</Type>
          <Options>size=3;fontSize=normal;align=center</Options>
        </Widget>
      </Row>
      <Row>
        <Name>Row</Name>
        <Widget>
          <WidgetId>widget_145</WidgetId>
          <Name>Decoder Id:</Name>
          <Type>Text</Type>
          <Options>size=1;fontSize=small;align=center</Options>
        </Widget>
        <Widget>
          <WidgetId>widget_lbl_decoder_id</WidgetId>
          <Name>&lt;&lt;Decoder ID&gt;&gt;</Name>
          <Type>Text</Type>
          <Options>size=3;fontSize=normal;align=center</Options>
        </Widget>
      </Row>
      <Row>
        <Name>Row</Name>
        <Widget>
          <WidgetId>widget_146</WidgetId>
          <Name>Decoder SN:</Name>
          <Type>Text</Type>
          <Options>size=1;fontSize=small;align=center</Options>
        </Widget>
        <Widget>
          <WidgetId>widget_lbl_decoder_sn</WidgetId>
          <Name>&lt;&lt;Decoder SN&gt;&gt;</Name>
          <Type>Text</Type>
          <Options>size=3;fontSize=normal;align=center</Options>
        </Widget>
      </Row>
      <Row>
        <Name>Row</Name>
        <Widget>
          <WidgetId>widget_148</WidgetId>
          <Name>Decoder Model:</Name>
          <Type>Text</Type>
          <Options>size=1;fontSize=small;align=center</Options>
        </Widget>
        <Widget>
          <WidgetId>widget_lbl_decoder_model</WidgetId>
          <Name>&lt;&lt;Decoder Model&gt;&gt;</Name>
          <Type>Text</Type>
          <Options>size=3;fontSize=normal;align=center</Options>
        </Widget>
      </Row>
      <Row>
        <Name>Row</Name>
        <Widget>
        <WidgetId>widget_zband_show_remote</WidgetId>
          <Name>Show Remote</Name>
          <Type>Button</Type>
          <Options>size=2</Options>
        </Widget>
        <Widget>
        <WidgetId>widget_zband_hide_remote</WidgetId>
          <Name>Hide Remote</Name>
          <Type>Button</Type>
          <Options>size=2</Options>
        </Widget>
      </Row>
      <PageId>pageid_zband_about2</PageId>
      <Options>hideRowNames=1</Options>
    </Page>
  </Panel>
</Extensions>
  `
  return channelPanel;
}

function textInputEvent(event) {
  if (event.FeedbackId == FEEDBACK_ID_INPUT_FILTER) {
    let searchParam = event.Text.toLowerCase().replace(/\s/g, '');
    let filteredChannels = [];
    allChannels.forEach((channel) => {
      if (channel.name.toLowerCase().replace(/\s/g, '').includes(searchParam)) {
        filteredChannels.push(channel);
      }
    })

    if (filteredChannels.length > 0) {
      buildPanel(filteredChannels);
    } else {
      buildPanel(allChannels); // rebuild panel in case it was filtered previously 
      xapi.Command.UserInterface.Message.Prompt.Display({ Duration: 30, "Option.1": "OK", Text: "Please try again.", Title: "No Results Found" });
    }
  }
}

turnOnHTTPClient();

turnOnHDCP();

xapi.Event.UserInterface.Extensions.Widget.Action.on(guiEvent);

xapi.Event.UserInterface.Extensions.Panel.Clicked.on(panelClicked);

xapi.Event.UserInterface.Message.TextInput.Response.on(textInputEvent);


