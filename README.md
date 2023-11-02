# z-band-iptv
**Purpose:** Cisco Navigator control of a Z-Band IPTV decoder via Z-TV Server
\
\
**Communication Flow Over IP:** \
Touch panel Navigtor <--> Cisco Video Device <--> Z-TV Server <--> Z-Band Decoder
\
\
**AV Connections:** \
Z-Band Decoder HDMI Out --> Cisco Video Device HDMI In (HDCP)
\
\
This macro assumes the Z-Band IPTV decoder is connected via HDMI to the Cisco video device \
on an interface that supports HDCP.  \
**HDMI Input 2:** Codec Plus, Room 55 Dual, Room 70 Dual, Room 70 Single \
**HDMI Input 3:** Board Pro 55, Board Pro 75, Codec EQ (Room Kit EQ & Room Kit EQX), Room 55 \
**HDMI Input 5:** Codec Pro (Room Kit Pro), Room 70 Dual G2, Room 70 Panorama, Room 70 Single G2, Room Panorama 

For more info on HDCP for Cisco video devcies see [roomos.cisco.com](https://roomos.cisco.com/xapi/search?domain=Video&search=hdcp) and search for HDCP
\

**Testing Environment:** 
- Cisco Device: RoomOS 11.9.1.13 (not all Cisco listed video devices tested) 
- Z-BAND [Z-IP Decode 400](https://www.z-band.com/products/z-ip-systems/z-ip-decode/z-ip-decode-400) 
- Z-Server - IPTV Portal: 8.2.0.1197  
- 40 Static Channels downloading and search.
\


**Recommended Settings on Cisco Video Device:** \
The following additional settings are recommended but not required:
- Settings -> Configurations -> Video / Input -> Connector # -> InputSourceType: "mediaplayer"
- Settings -> Configurations -> Video / Input -> Connector # -> PresentationSelection: "Manual"
- Settings -> Configurations -> Video / Input -> Connector # -> Visibility: "Never"
\

**Large Deployments** \
Several settings *optionally* can be placed directly on the codec in the xConfiguration.SytemUnit.CustomDeviceId setting.  This allows the \
same macro to be pushed to all Cisco video devices and unique variables pushed through Control Hub. 
Web Interface: 
- Settings -> Configurations ->SystemUnit -> CustomDeviceId
For example: 
> ztv_sn="KN5B0B51M0N5555"; ztv_hdmi="3", ztv_fav_chan="Bobs Favorites"

For more details see the notes in the .js file. 
\
\
\
**Screenshots:** 
See [all screenshots](https://github.com/vtjoeh/z-band-iptv/tree/main/screenshots)
\
\
\
![default page tv 2](https://github.com/vtjoeh/z-band-iptv/assets/16569532/9cc80ecb-af04-4d36-8e10-690f738d2d8b)
Default Page with up to 10 Favorites loaded from a Content Group. 
\
\
\
![All Channels 3](https://github.com/vtjoeh/z-band-iptv/assets/16569532/3d7a985f-5a8f-4a56-9bcc-5088d52b975a)
All channels are shown in a scrollable and searchable window. 
\
\
\
See [all screenshots](https://github.com/vtjoeh/z-band-iptv/tree/main/screenshots)

