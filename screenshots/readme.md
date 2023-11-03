![Navigator button](https://github.com/vtjoeh/z-band-iptv/assets/16569532/14ed3f8d-7b88-4ea0-8475-76e1b3872a9b)
Cisco Navigator Touch Panel home screen with the **TV button** for Z-Band IPTV. Pressing the button: 1) Opens the **TV panel** 2) switches the Cisco video device to start presenting on HDMI IN for the Z-Band decoder 3) Sends an 'EndpointOn' command to the decoder 4) Does a query of the Z-TV Server to update the channels list. 
\
\
\
![Default tab](https://github.com/vtjoeh/z-band-iptv/assets/16569532/a835582e-1cdb-4cd9-96e6-f33d627dcfc5)
**TV panel** with **Default tab** shown. Shows first ten "favorites" from a Z-TV Content Group alphabetically sorted.   
Volume buttons on this page control the Cisco video device volume.  The 'TV Off' button: 1) sends the 'EndpointOff' command to the decoder 2) turns off the HDMI input 3) closes the **TV Panel**  
\
\
\
![All Channels tab](https://github.com/vtjoeh/z-band-iptv/assets/16569532/f09575a6-1482-45fa-b887-b5bfca20a5e7)
The **TV panel** with **All Channels** tab allows for a all channels to be shown in a scrollable and searchable way. 
\
\
\
![All Channels scroll](https://github.com/vtjoeh/z-band-iptv/assets/16569532/bfcccf4d-b5b4-4e1d-a2dd-4b96fd350fed)
Example of **TV panel** -> **All Channels** tab scroll. 
\
\
\
![All Channels search](https://github.com/vtjoeh/z-band-iptv/assets/16569532/26d31dfd-5b52-415f-8a5f-9dc5cda1dc5b)
Example of **TV panel** -> **All Channels** tab after clicking the **filter** button. 
\
\
\
![search results](https://github.com/vtjoeh/z-band-iptv/assets/16569532/f15903e8-0943-40b2-ba29-212946fadb26)
**TV panel** -> **All Channels** example search results. 
\
\
\
![AboutTab1](https://github.com/vtjoeh/z-band-iptv/assets/16569532/6a89db52-853e-4fc5-8197-bff5b22e34e0)
**TV panel** -> **About Tab** shows useful information if the Macro is talking to the Z-TV Server.  
**Note:** The macro only talks to the Z-Band server that queues requests for the decoder.  If the decoder is not reachable, \
the Cisco video device will not know - but the end user will notice. 
\
\
\
![AboutTab2HideRemote](https://github.com/vtjoeh/z-band-iptv/assets/16569532/886d6964-7740-4549-bc4d-b138c2405cdb)
**TV panel** -> **About Tab** showing **Show Remote** and **Hide Remote** buttons. Clicking the **Show Remote** button will add a new button to the Navigator homescreen, the **Z-Band Remote** button. If only the ZBandIPTV.js file is loaded to the Cisco video device (no ZBandIPTV.xml file used) the **TV Panel** button will still be created and function.  However, the **About** tab will show incorrect information until the macro is restarted 1 time (or device rebooted). To use the **Z-Band Remote** button, make sure the ZBandIPTV.xml file is also loaded.  The **Z-Band Remote** button is **not** visible by default on install. 
\
\
\
![Z-Band remote home](https://github.com/vtjoeh/z-band-iptv/assets/16569532/93af1414-5b64-4724-b9c4-fe296f92efe9)
**Home screen** with **TV** panel button and **Z-Band Remote** panel button.
\
\
\
![Main Keys Tab](https://github.com/vtjoeh/z-band-iptv/assets/16569532/99aac47c-130f-45d6-9e80-9e7277c1913e)
**Z-Band Remote** panel -> **Main Keys Tab.** Volume buttons on this page control the Z-Band decoder volume, unlike the default page volume buttons which control the Cisco video device volume.  
\
\
\
![keys](https://github.com/vtjoeh/z-band-iptv/assets/16569532/1d89f076-25fe-47ab-93d2-2d0acbd2983e)
**Z-Band Remote** panel -> **Keys Tab** 
\
\
\
\
![endpointtab](https://github.com/vtjoeh/z-band-iptv/assets/16569532/1edabba9-8734-410f-8037-bc7fdf628396)
**Z-Band Remote** panel -> **End-Point tab**

\
\
\

Below is the **Z-Band Remote** panel with the emulated **Full IR Remote** tab in scrollable format. 
![Full IR Remote](https://github.com/vtjoeh/z-band-iptv/assets/16569532/dd683075-7328-441a-8efd-f191b32febee)
![fullRemoteDialPad](https://github.com/vtjoeh/z-band-iptv/assets/16569532/88f9e69b-03f6-473d-af4e-dcb5f1eb97b6)
![full IR Remote 4](https://github.com/vtjoeh/z-band-iptv/assets/16569532/437c86d6-b6f3-48d8-bd6a-df76f67ded11)





