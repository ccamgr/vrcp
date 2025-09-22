# VRChatMobileManager
VRChat API Client App
- [GooglePlay]() for Android 
<!-- - [AppStore]() for iOS  -->




#### run development
- run `make gen-plugins` to configure custom native module plugins
- run `make prebuild` to generate native codes
- run `make build-dev` to build dev-app apk 
- install dev-app to your device from built apk
- run `make run` to start dev-server

#### try pre-built app
- run `make build-pre` to build pre-app apk
- install pre-app to your device from built apk 

#### submit store and publish
- run `make build-submit` to build prod-app aab and submit to store
- publish from store page  


### when vrcapi updated
- run `make gen-vrcapi` to generate vrcapi-client-code
- run `make gen-vrcpipe` to generate vrcapi-pipeline-type-code
