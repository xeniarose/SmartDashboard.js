var SmartDashboard = {
    version: gui.App.manifest.version,
    widgets: [],
    widgetTypes: {},
    editable: false,
    options: {},
    plugins: []
};

SmartDashboard.handleError = function(e, notSerious) {
    var msg;
    if (e.stack) {
        console.error(e.stack);
        msg = e.stack;
    } else {
        console.error(e);
        msg = e + "";
    }
    
    if(!notSerious){
        document.querySelector("#error-screen .error-details").textContent = msg;
        document.querySelector("#error-screen").classList.add("active");
        
        document.querySelector("#error-screen .report-error").onclick = function(){
            gui.Shell.openExternal("https://github.com/erikuhlmann/SmartDashboard.js/issues/new?body="
                                   + encodeURIComponent("```\n" + msg + "\n```"));
        };
    }
}

SmartDashboard.prompt = function(msg, arg1, arg2, hideInputBox){
    SmartDashboard.window.focus();
    var initialVal = null;
    var cb = function(){}
    if(typeof arg1 == "string") initialVal = arg1;
    if(typeof arg2 == "string") initialVal = arg2;
    if(typeof arg1 == "function") cb = arg1;
    if(typeof arg2 == "function") cb = arg2;
    
    document.querySelector("#input-screen h3").textContent = msg;
    document.querySelector("#input-screen input").value = initialVal ? initialVal : "";
    if(hideInputBox){
        document.querySelector("#input-screen input").style.display = "none";
    } else {
        document.querySelector("#input-screen input").style.display = "block";
    }
    
    document.querySelector("#input-screen button.button-yes").onclick = function(){
        document.querySelector("#input-screen").classList.remove("active");
        cb(document.querySelector("#input-screen input").value);
    };
    document.querySelector("#input-screen button.button-no").onclick = function(){
        document.querySelector("#input-screen").classList.remove("active");
        cb(null);
    };
    document.querySelector("#input-screen").classList.add("active");
    document.querySelector("#input-screen input").focus();
    document.querySelector("#input-screen input").onkeydown = function(e){
        if(e.which == 13){
            document.querySelector("#input-screen button.button-yes").onclick();
        } else if(e.which == 27){
            document.querySelector("#input-screen button.button-no").onclick();
        }
    };
}

SmartDashboard.confirm = function(msg, cb){
    SmartDashboard.prompt(msg, function(v){
        cb(v != null);
    }, null, true);
};

SmartDashboard.registerWidget = function (widget, dataType, data) {
    SmartDashboard.widgetTypes[widget.name] = {
        widget: widget,
        dataType: dataType,
        data: data
    };
}

SmartDashboard.setTheme = function(theme, link){
    if(typeof link == "undefined"){
        link = document.getElementById("theme-css");
        link.onerror = function(e){
            SmartDashboard.handleError("Failed to load theme: " + theme);
        };
    }
    if(theme == "__default__" || typeof theme == "undefined"){
        link.href = "";
    } else {
        link.href = FileUtils.getDataLocations().themes + theme + ".css";
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
        newMenu.append(new gui.MenuItem({
            label: widgetType,
            click: WidgetUtils.promptNewWidget.bind(WidgetUtils, widgetType)
        }));
    }

    var sdMenu = ContextMenu.create("main", [
        {item: 7, name: "submenu", value: newMenu},
        {item: 8, name: "checked", value: SmartDashboard.editable}
    ]);
    return sdMenu;
}

SmartDashboard.createWindowCoordinates = function(width, height){
    var win = gui.Window.get();
    var screen = gui.Screen.screens[0];
    var area = screen.work_area;
    var coords = {
        x: Math.round(win.x + win.width / 2 - width / 2),
        y: Math.round(win.y + win.height / 2 - height / 2)
    };
    
    if(coords.x < 1) {
        coords.x = 1;
    }
    if(coords.x + width > area.x + area.width - 1){
        coords.x = area.x + area.width- 1 - width;
    }
    if(coords.y < 1) {
        coords.y = 1;
    }
    if(coords.y + height > area.y + area.height - 1){
        coords.y = area.y + area.height - 1 - height;
    }
    return coords;
}

SmartDashboard.showOptions = function () {
    if(SmartDashboard.optionsWindow){
        SmartDashboard.optionsWindow.focus();
        return;
    }
    var c = SmartDashboard.createWindowCoordinates(500, 500);
    gui.Window.open('options.html', {
        frame: false,
        width: 500,
        height: 500,
        x: c.x,
        y: c.y
    }, function(w){
        global.SmartDashboard.optionsWindow = w;
        var win = w.window;
        w.on("close", function(){
            delete global.SmartDashboard.optionsWindow;
            w.close(true);
        });
    });
}

SmartDashboard.showAbout = function(){
    if(SmartDashboard.aboutWindow){
        SmartDashboard.aboutWindow.focus();
        return;
    }
    var c = SmartDashboard.createWindowCoordinates(800, 600);
    gui.Window.open('about.html', {
        frame: false,
        resizable: false,
        width: 800,
        height: 600,
        x: c.x,
        y: c.y
    }, function(w){
        global.SmartDashboard.aboutWindow = w;
        var win = w.window;
        w.on("close", function(){
            delete global.SmartDashboard.aboutWindow;
            w.close(true);
        });
    });
}

SmartDashboard.restart = function () {
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

SmartDashboard.init = function () {
    window.onerror = function(message, source, lineno, colno, error){
        SmartDashboard.handleError(error);
    }
    global.SmartDashboard = SmartDashboard;
    var data = global.data;

    SmartDashboard.options = data.options;
    SmartDashboard.window = gui.Window.get();
    
    if (!data.options.port) {
        data.options.port = ntcore.DEFAULT_PORT;
    }
    if (!data.options.ip) {
        data.options.ip = "127.0.0.1";
    }
    
    if(!data.options.theme){
        data.options.theme = "DriverStation";
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
    
    document.querySelector(".current-profile").textContent = SmartDashboard.options.profile;
    DomUtils.registerDocumentEventHandlers();

    console.info("Loading plugins");
    try {
        FileUtils.forAllFilesInDirectory(FileUtils.getDataLocations().plugins, function (file) {
            console.info("Loading plugin", file);
            var plugin = {};
            try {
                plugin = require(FileUtils.getDataLocations().plugins + file);
            } catch(e){
                SmartDashboard.handleError(e);
                plugin.info = {
                    name: file,
                    version: "Plugin error",
                    description: "" + e
                };
            }
            plugin.info = plugin.info || {
                name: file,
                version: "Not available",
                description: "Not available"
            };
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
        // let webkit handle window position restore
        // the titlebar interferes with doing it manually
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

    gui.App.on("open", (function(win, args){
        win.focus();
        
        if(args.indexOf("--ds-mode") > -1 && SmartDashboard.options.useDsModeSwitch){
            SmartDashboard.options.dsMode = true;
            SmartDashboard.saveData();
            SmartDashboard.restart();
        }
    }).bind(null, gui.Window.get()));
    
    // make sure data gets saved on exit
    
    gui.Window.get().on("close", SmartDashboard.onExit);
    
    function checkConnection(){
        if(ntcore.isConnected()){
            document.querySelector(".connection-status").classList.add("connected");
        } else {
            document.querySelector(".connection-status").classList.remove("connected");
        }
    }
    
    setInterval(checkConnection, 5000);
    setTimeout(checkConnection, 1000);
    
    setTimeout(function(){
        if(global.initCallback) global.initCallback();
        gui.Window.get().show();
    }, 500); // wait for things to load a bit
}

SmartDashboard.onExit = function(){
    SmartDashboard.confirm("Exit SmartDashboard.js?", function(v){
        if(v){
            global.SmartDashboard.saveData();
            gui.App.closeAllWindows();
            gui.Window.get().close(true);
        }
    });
};

SmartDashboard.loadWidgets = function(){
    var widgets = [];
    try {
        widgets = JSON.parse(fs.readFileSync(FileUtils.getDataLocations().layouts + SmartDashboard.options.profile + ".json").toString());
    } catch (e) {
        SmartDashboard.handleError(e, true);
    }
    
    function loadWidget(wData){
        var widget = new SmartDashboard.widgetTypes[wData.type].widget(wData.table, wData.key, wData.data);
        widget.setPosition(wData.x, wData.y, wData.w, wData.h);
        SmartDashboard.addWidget(widget);
        widget.onInserted();
        
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
    try {
        fs.writeFileSync(FileUtils.getDataLocations().save, data);
        
        fs.writeFileSync(FileUtils.getDataLocations().layouts + SmartDashboard.options.profile + ".json", JSON.stringify(widgets));
    } catch(e){
        SmartDashboard.handleError(e);
    }
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
    WidgetUtils.onWidgetInserted(widget);
    document.querySelector("#dashboard").appendChild(widget.dom);
    // cache width and height so they can be saved on close
    widget._w = widget.dom.offsetWidth;
    widget._h = widget.dom.offsetHeight;
    widget.setEditable(SmartDashboard.editable);
}

SmartDashboard.removeWidget = function (widget) {
    WidgetUtils.onWidgetRemoved(widget);
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