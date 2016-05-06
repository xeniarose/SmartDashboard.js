var SmartDashboard = {
    version: gui.App.manifest.version,
    widgets: [],
    widgetTypes: {},
    editable: false,
    options: {},
    plugins: []
};
SmartDashboard.handleError = function (e) {
    if (e.stack) {
        console.error(e.stack);
    } else {
        console.error(e);
    }
}

SmartDashboard.registerWidget = function (widget, dataType) {
    SmartDashboard.widgetTypes[widget.name] = {
        widget: widget,
        dataType: dataType
    };
}

SmartDashboard.setTheme = function(theme, link){
    if(typeof link == "undefined"){
        link = document.getElementById("theme-css");
    }
    if(theme == "__default__" || typeof theme == "undefined"){
        link.href = "";
    } else {
        link.href = FileUtils.getDataLocations().themes + theme + ".css";
    }
}

SmartDashboard.getDefaultWidget = function(type){
    var entry = SmartDashboard.options["default-" + type];
    if(typeof entry == "undefined"){
        var first = null;
        for(var widgetType in SmartDashboard.widgetTypes){
            if(first == null) first = widgetType;
            if (!SmartDashboard.widgetTypes.hasOwnProperty(widgetType)) continue;
            if(SmartDashboard.widgetTypes[widgetType].dataType == type){
                return SmartDashboard.widgetTypes[widgetType];
            }
        }
        return SmartDashboard.widgetTypes[first];
    } else {
        return SmartDashboard.widgetTypes[entry];
    }
}

function createSdMenu() {
    var newMenu = new gui.Menu();
    var typesList = [];
    for (var widgetType in SmartDashboard.widgetTypes) {
        if (!SmartDashboard.widgetTypes.hasOwnProperty(widgetType)) continue;
        typesList.push(widgetType);
    }
    typesList.sort();
    
    for(var widgetType of typesList){
        (function (widgetType) {
            newMenu.append(new gui.MenuItem({
                label: widgetType,
                click: function () {
                    setTimeout(function () {
                        var isContainer = SmartDashboard.widgetTypes[widgetType].dataType == "container";
                        var nameRaw = "";
                        if(!isContainer){
                            nameRaw = prompt("SmartDashboard variable:");
                            if (nameRaw == null || nameRaw == "")
                                return;
                        }
                        var widget = new SmartDashboard.widgetTypes[widgetType].widget(nameRaw.substring(0, nameRaw.lastIndexOf("/")),
                            nameRaw.substring(nameRaw.lastIndexOf("/") + 1));
                        if(widget.onNew) widget.onNew();
                        SmartDashboard.setEditable(true);
                        SmartDashboard.positionWidget(widget);
                    }, 1);
                }
            }));
        })(widgetType);
    }

    var sdMenu = ContextMenu.create("main", [
        {item: 7, name: "submenu", value: newMenu},
        {item: 8, name: "checked", value: SmartDashboard.editable}
    ]);
    return sdMenu;
}

SmartDashboard.showOptions = function () {
    gui.Window.open('options.html', {
        position: 'center'
    });
}

SmartDashboard.restart = function () {
    /*var child,
        win = gui.Window.get();
    child = child_process.spawn(process.execPath, [process.cwd()], {detached: true});
    child.unref();
    win.hide();
    gui.App.quit();*/
    ntcore.dispose();
    chrome.runtime.reload();
}

SmartDashboard.entriesTree = function(){
    var rawEntries = ntcore.getAllEntries();
    var root = {};
    for(var rawEntry of rawEntries){
        var parts = rawEntry.split("/");
        var ptr = root;
        for(var i = 0; i < parts.length; i++){
            if(parts[i].trim().length == 0)
                continue;
            if(!ptr.hasOwnProperty(parts[i])){
                ptr[parts[i]] = {};
            }
            ptr = ptr[parts[i]];
        }
    }
    
    return root;
}

SmartDashboard.positionWidget = function(widget){
    var screen = document.querySelector("#place-screen");
    screen.onclick = function(e){
        widget.setPosition(e.clientX + document.body.scrollLeft, e.clientY + document.body.scrollTop);
        SmartDashboard.addWidget(widget);
        screen.classList.remove("active");
    };
    screen.classList.add("active");
}

SmartDashboard.init = function () {
    global.SmartDashboard = SmartDashboard;
    var data = global.data;

    SmartDashboard.options = data.options;
   
    if (!data.options.port) {
        data.options.port = ntcore.DEFAULT_PORT;
    }
    if (!data.options.ip) {
        data.options.ip = "127.0.0.1";
    }
    
    if(!data.options.theme){
        data.options.theme = "__default__";
    }
    
    if(!data.options.profile){
        data.options.profile = "default";
    }
    
    SmartDashboard.setTheme(SmartDashboard.options.theme);

    try {
        ntcore.setOptions({
            networkIdentity: "SmartDashboard.js " + SmartDashboard.version,
            port: parseInt(data.options.port)
        });
        ntcore.init(ntcore.CLIENT, data.options.ip);
    } catch (e) {
        SmartDashboard.handleError(e);
    }
    
    document.querySelector("#entries").onmouseover = DomUtils.renderVariableEntries;

    document.querySelector("#dashboard").onmousemove = function (e) {
        for (var widget of SmartDashboard.widgets) {
            if (widget._dragging && widget.dom.onmousemove) {
                widget.dom.onmousemove(e);
            }
        }
    }

    document.querySelector("#dashboard").onmouseup = function (e) {
        for (var widget of SmartDashboard.widgets) {
            if (widget._dragging && widget.dom.onmouseup) {
                widget.dom.onmouseup(e);
            }
        }
    }

    document.querySelector("#dashboard").oncontextmenu = function (ev) {
        if ((ev.target.tagName.toLowerCase() == "input" || ev.target.tagName.toLowerCase() == "textarea") && !SmartDashboard.editable) {
            return true;
        }
        ev.preventDefault();
        var menu;
        var widget = null;
        var el = ev.target;
        do {
            if (el.parentWidget) {
                widget = el.parentWidget;
                break;
            }
            el = el.parentElement;
        } while (el != null);
        if (widget != null && widget.editable) {
            menu = widget._createContextMenu();
        } else {
            menu = createSdMenu();
        }
        menu.popup(ev.x, ev.y);
        return false;
    }
    
    document.querySelector("#open-profile").onclick = function(e){
        var menu = new gui.Menu();
        
        var profiles = [];
        
        try {
            FileUtils.forAllFilesInDirectory(FileUtils.getDataLocations().layouts, function (file) {
                if(!file.endsWith(".json"))
                    return;
                profiles.push(file.substring(0, file.length - ".json".length));
            });
        } catch (e) {
            SmartDashboard.handleError(e);
        }
        
        var menuSpec = profiles.map(function(item){
            return {
                label: item,
                click: (function(item){
                    return function(){
                        SmartDashboard.switchProfile(item);
                    };
                })(item)
            };
        }).concat(ContextMenu.defs.profiles);
        
        ContextMenu.create(menuSpec).popup(e.target.offsetLeft, e.target.offsetTop + e.target.offsetHeight);
    };
    document.querySelector(".current-profile").textContent = SmartDashboard.options.profile;
    
    document.querySelector("#dashboard").ondblclick = function(e){
        if(e.target != this) return;
        for(var item of SmartDashboard.widgets){
            if(item != this && item.editing)
                item.setEditing(false);
        }
        DomUtils.resetClass("not-editing");
    };
    
    

    console.info("Loading plugins");
    try {
        FileUtils.forAllFilesInDirectory(FileUtils.getDataLocations().plugins, function (file) {
            console.info("Loading plugin", file);
            var plugin;
            try {
                plugin = require(FileUtils.getDataLocations().plugins + file);
            } catch(e){
                SmartDashboard.handleError(e);
                plugin = {
                    info: {
                        name: file,
                        version: "Plugin error",
                        description: "" + e
                    }
                };
            }
            plugin.info.file = file;
            SmartDashboard.plugins.push(plugin.info);
            console.log(plugin.info);
        });
    } catch (e) {
        SmartDashboard.handleError(e);
    }

    console.info("Loading save, save.version=", data.sdver, "sd.version=", SmartDashboard.version);
    if (data.sdver != SmartDashboard.version) {
        console.warn("Save version doesn't match SmartDashboard version");
    }
    
    SmartDashboard.loadWidgets();
    
    if(SmartDashboard.options.dsMode){
        var screen = gui.Screen.screens[0]; // DriverStation docks to primary screen only
        var area = screen.work_area; // work_area takes the Windows taskbar into account
        gui.Window.get().moveTo(area.x, area.y);
        gui.Window.get().resizeTo(area.width, area.height - 200);
        // DriverStation is 200px height
    } else {
        /*try {
            gui.Window.get().moveTo(SmartDashboard.options.window.x, SmartDashboard.options.window.y);
            gui.Window.get().resizeTo(SmartDashboard.options.window.width, SmartDashboard.options.window.height);
        } catch(e){
            SmartDashboard.handleError(e);
        }
        function windowCallback(){
            SmartDashboard.options.window = {
                x: gui.Window.get().x,
                y: gui.Window.get().y,
            width: gui.Window.get().width,
                height: gui.Window.get().height
            };
            SmartDashboard.saveData();
        }
        gui.Window.get().on("move", windowCallback);
        gui.Window.get().on("resize", windowCallback);*/
    }

    window.onbeforeunload = SmartDashboard.saveData;
    process.on('exit', SmartDashboard.saveData);
    
    setInterval(function(){
        if(ntcore.isConnected()){
            document.querySelector(".connection-status").classList.add("connected");
        } else {
            document.querySelector(".connection-status").classList.remove("connected");
        }
    }, 5000);
    
    setTimeout(function(){
        if(global.initCallback) global.initCallback();
        gui.Window.get().show();
    }, 500); // wait for things to load a bit
}

SmartDashboard.loadWidgets = function(){
    var widgets = [];
    try {
        widgets = JSON.parse(fs.readFileSync(FileUtils.getDataLocations().layouts + SmartDashboard.options.profile + ".json").toString());
    } catch (e) {
        SmartDashboard.handleError(e);
    }
    
    function loadWidget(wData){
        var widget = new SmartDashboard.widgetTypes[wData.type].widget(wData.table, wData.key, wData.data);
        widget.setPosition(wData.x, wData.y, wData.w, wData.h);
        SmartDashboard.addWidget(widget);
        
        if(wData.children){
            for (var childData of wData.children){
                var childWidget = loadWidget(childData);
                widget.addChild(childWidget, true);
            }
        }
        return widget;
    };

    for (var wData of widgets) {
        if (!SmartDashboard.widgetTypes.hasOwnProperty(wData.type)) {
            console.warn("No widget for:", wData.type);
            continue;
        }
        loadWidget(wData);
    }
}

SmartDashboard.saveData = function () {
    var data = {
        sdver: SmartDashboard.version
    }
    
    var widgets = [];
    
    var topLevelWidgets = Array.prototype.map.call(document.querySelector("#dashboard").children, function(el){
        return el.parentWidget;
    });
    
    function saveWidget(widget, data) {
        var wPos = widget.getPosition();
        var wData = {
            x: wPos.x,
            y: wPos.y,
            w: wPos.w,
            h: wPos.h,
            type: widget.constructor.name,
            table: widget.table.getTablePath(),
            key: widget.key,
            data: widget.saveData || {}
        };
        data.push(wData);
        if(widget.getChildren){
            wData.children = [];
            for(var childWidget of widget.getChildren()){
                saveWidget(childWidget, wData.children);
            }
        }
    };
    
    for(var widget of topLevelWidgets){
        saveWidget(widget, widgets);
    }
    
    data.options = SmartDashboard.options;
    data = JSON.stringify(data);
    fs.writeFileSync("save.json", data);
    
    fs.writeFileSync(FileUtils.getDataLocations().layouts + SmartDashboard.options.profile + ".json", JSON.stringify(widgets));
}

SmartDashboard.switchProfile = function(newProfile){
    SmartDashboard.saveData();
    SmartDashboard.options.profile = newProfile;
    
    while(SmartDashboard.widgets.length > 0){
        SmartDashboard.removeWidget(SmartDashboard.widgets[0]);
    }
    
    SmartDashboard.loadWidgets();
    document.querySelector(".current-profile").textContent = newProfile;
}

SmartDashboard.setEditable = function (flag) {
    SmartDashboard.editable = flag;
    for (var widget of SmartDashboard.widgets) {
        widget.setEditable(flag);
    }
    
    DomUtils.resetClass("not-editing");
}

SmartDashboard.addWidget = function (widget) {
    this.widgets.push(widget);
    document.querySelector("#dashboard").appendChild(widget.dom);
    // cache width and height so they can be saved on close
    widget._w = widget.dom.offsetWidth;
    widget._h = widget.dom.offsetHeight;
    widget.setEditable(SmartDashboard.editable);
}

SmartDashboard.removeWidget = function (widget) {
    widget.dom.remove();
    widget.destroy();
    var index = this.widgets.indexOf(widget);
    if (index > -1) {
        this.widgets.splice(index, 1);
    }
}

function uniqueId() {
    return Math.floor(Math.random() * 0x10000000000000).toString(16);
}

/**
 * Currently unimplemented
 */
class Decorator {
    constructor() {}

    decorate(widget) {}
}