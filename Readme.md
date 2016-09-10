# SmartDashboard.js #

Unofficial FRC SmartDashboard in [nw.js](http://nwjs.io/) with [ntcore_node](https://github.com/erikuhlmann/ntcore_node).

Requires [nw.js 0.14.1](http://nwjs.io/blog/v0.14.1/).

## Features ##

Takes the best features from SmartDashboard and SFX Dashboard

- Supports integer, double, string, boolean, and array data types (raw isn't supported yet)
- Other complex widgets - graphs, dials, dropdown choosers... 
- Layout containers for organization
- Supports USB and MJPEG camera streams
- Themes and plugins
- Driver Station integration (like the LV dashboard)

## Screenshots ##

Main screen:  
![Main screen](http://i.imgur.com/11xEFOJ.png)

![Main screen with description](http://i.imgur.com/6qCL6Lt.png)

Side panel:  
![Side panel showing variables](http://i.imgur.com/DtzNiVJ.png)

![Side panel showing widgets](http://i.imgur.com/QoSETfl.png)

With Driver Station:  
![Driver Station integration](http://i.imgur.com/6az3pSL.png)

## Building ##

Currently the only release builds are for Windows. To build it yourself for Windows or another target, follow these steps:

- [Build ntcore_node](https://github.com/erikuhlmann/ntcore_node#building) for nw.js (`--target-version=0.14.1`)
- Clone this repo and place `ntcore_node.node` in the root. (Replace the one that already exists for Windows x64)
- Edit line 5 `build.xml` for your target OS and architecture (`linux-ia32`, `osx-x64`, etc)
- `ant sd.package`
- Locate built SmartDashboard.js in `dist/app`. Note: The `nw` executable is the entry point, and it can't be renamed due to an nw.js issue with native modules.