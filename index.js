var SmartDashboard = {
    version: gui.App.manifest.version,
    widgets: [],
    widgetTypes: {},
    editable: false,
    options: {},
    plugins: [],
    recentFiles: [],
    exitable: true,
    _iconMap: {},
	console: window.console
};

var pre = "font-family: 'Source Sans Pro';font-size:3em;border-bottom:";
console.info('%cSmart%cDashboard%c.js%c ' + SmartDashboard.version, pre+"3px solid blue", pre+"3px solid orange", pre+"3px solid red", pre+"none");

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
        
        document.querySelector("#error-screen .report-error").onclick = function(){
            gui.Shell.openExternal(gui.App.manifest.repositories[0].url + "/issues/new?body="
                                   + encodeURIComponent("```\n" + msg + "\n```"));
        };
        SmartDashboard.exitable = false;
        DomUtils.openBlurredDialog("#error-screen");
    }
}

SmartDashboard.prompt = function(msg, arg1, arg2, hideInputBox, items, details){
    SmartDashboard.window.focus();
    var initialVal = null;
    var cb = function(){}
    if(typeof arg1 == "string") initialVal = arg1;
    if(typeof arg2 == "string") initialVal = arg2;
    if(typeof arg1 == "function") cb = arg1;
    if(typeof arg2 == "function") cb = arg2;
    
    var datalist = document.getElementById("input-content-input-items");
    datalist.innerHTML = "";
    if(items){
        items.sort();
        for(var i = 0; i < items.length; i++){
            var opt = document.createElement("option");
            opt.value = items[i];
            opt.textContent = items[i];
            datalist.appendChild(opt);
        }
    }
    
    document.querySelector("#input-screen h3").textContent = msg;
    document.querySelector("#input-screen .input-details").textContent = details || "";
    document.querySelector("#input-screen input").value = initialVal ? initialVal : "";
    if(hideInputBox){
        document.querySelector("#input-screen input").style.display = "none";
    } else {
        document.querySelector("#input-screen input").style.display = "block";
    }
    
    document.querySelector("#input-screen button.button-yes").onclick = function(){
        document.querySelector("#input-screen").classList.remove("active");
        document.querySelector(".dialog-bg").classList.remove("active");
        cb(document.querySelector("#input-screen input").value);
    };
    document.querySelector("#input-screen button.button-no").onclick = function(){
        document.querySelector("#input-screen").classList.remove("active");
        document.querySelector(".dialog-bg").classList.remove("active");
        cb(null);
    };
    document.querySelector("#input-screen input").focus();
    document.querySelector("#input-screen input").onkeydown = function(e){
        if(e.which == 13){
            document.querySelector("#input-screen button.button-yes").onclick();
        } else if(e.which == 27){
            document.querySelector("#input-screen button.button-no").onclick();
        }
    };
    DomUtils.openBlurredDialog("#input-screen");
}

SmartDashboard.confirm = function(msg, cb){
    SmartDashboard.prompt(msg, function(v){
        cb(v != null);
    }, null, true);
};

SmartDashboard.showFileDialog = function(type, cb) {
    var fileDialog = document.querySelector("#fileDialog");
    if(type == "save") {
        fileDialog.setAttribute("nwsaveas", "layout.sdj");
    } else {
        fileDialog.removeAttribute("nwsaveas");
    }
    
    fileDialog.onchange = function(evt) {
        cb(fileDialog.value);
    };
    fileDialog.click();
}

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
    SmartDashboard.newMenu = newMenu;
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
        {item: 2, name: "submenu", value: ContextMenu.createProfilesMenu()},
        {item: 1, name: "submenu", value: newMenu},
        {item: 3, name: "checked", value: SmartDashboard.editable}
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

SmartDashboard.showRobotPrefs = function () {
    if(SmartDashboard.prefsWindow){
        SmartDashboard.prefsWindow.focus();
        return;
    }
    var c = SmartDashboard.createWindowCoordinates(350, 400);
    gui.Window.open('preference-editor.html', {
        frame: false,
        width: 350,
        height: 400,
        x: c.x,
        y: c.y
    }, function(w){
        global.SmartDashboard.prefsWindow = w;
        var win = w.window;
        w.on("close", function(){
            delete global.SmartDashboard.prefsWindow;
            w.close(true);
        });
    });
}

SmartDashboard.showAbout = function(){
    if(SmartDashboard.aboutWindow){
        SmartDashboard.aboutWindow.focus();
        return;
    }
    var c = SmartDashboard.createWindowCoordinates(600, 500);
    gui.Window.open('about.html', {
        frame: false,
        resizable: false,
        width: 600,
        height: 500,
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

SmartDashboard.getPreferenceKeys = function(){
    var entries = ntcore.getAllEntries();
    entries = entries.map(function(item){
        if(item.startsWith("/")){
            item = item.substring(1);
        }
        return item;
    }).filter(function(item){
        return item.startsWith("Preferences");
    }).map(function(item){
        return item.substring("Preferences/".length);
    });
    entries.sort();
    return entries;
};

SmartDashboard.getPreference = function(key){
    return ntcore.getTable("Preferences").get(key);
}

SmartDashboard.setPreference = function(key, val){
    ntcore.getTable("Preferences").put(key, val);
}

SmartDashboard.init = function () {
    window.onerror = function(message, source, lineno, colno, error){
        SmartDashboard.handleError(error);
    };
    
    global.SmartDashboard = SmartDashboard;
    global.ntcore = ntcore;
    process.on('uncaughtException', function (err) {
        global.SmartDashboard.handleError(err);
    });
    
    var data = global.data;

    SmartDashboard.options = data.options;
    var recentFiles = data.recentFiles || [];
    SmartDashboard.recentFiles = [];
    for(var file of recentFiles) {
        if(fs.existsSync(file)) {
            SmartDashboard.recentFiles.push(file);
        }
    }
    SmartDashboard.window = gui.Window.get();
    
    if (!data.options.port) {
        data.options.port = ntcore.DEFAULT_PORT;
    }
    if (!data.options.ip) {
        data.options.ip = "";
    }
    
    if(!data.options.theme){
        data.options.theme = "DriverStation";
    }
    
    if(!data.options.profile){
        data.options.profile = null;
    }
    
    if(!data.options.serverMode) {
        data.options.serverMode = false;
    }
    
    if(typeof data.options.doUpdateCheck == "undefined"){
        data.options.doUpdateCheck = true;
    }
    
    SmartDashboard.setTheme(SmartDashboard.options.theme);

    try {
        ntcore.setOptions({
            networkIdentity: "SmartDashboard.js " + SmartDashboard.version,
            port: parseInt(data.options.port)
        });
        if(data.options.serverMode) ntcore.init(ntcore.SERVER);
        else ntcore.init(ntcore.CLIENT, data.options.ip);
    } catch (e) {
        SmartDashboard.handleError(e);
    }
    
    DomUtils.registerDocumentEventHandlers();
    DomUtils.loadSvgIcons();

    console.info("Loading plugins");
    try {
        function loadPlugin(basedir, dir) {
            var fullPath = basedir + dir;
            fullPath = fullPath.replace(/\\/g, '/');
            
            if(!fs.lstatSync(fullPath).isDirectory()) return;
            
            console.info("Loading plugin", dir);
            var plugin = {};
            try {
                plugin = require(fullPath);
				plugin.pluginDirectory = fullPath;
            } catch(e){
                SmartDashboard.handleError(e);
                plugin.info = {
                    name: dir,
                    version: "Plugin error",
                    description: "" + e
                };
            }
            plugin.info = plugin.info || {
                name: dir,
                version: "Not available",
                description: "Not available"
            };
            plugin.info.file = dir;
            
            if(plugin.assets) {
                if(plugin.assets.css) {
                    var link = document.createElement("link");
                    link.rel = "stylesheet";
                    link.href = "file:///" + fullPath + '/' + plugin.assets.css;
                    document.head.appendChild(link);
                }
                if(plugin.assets.icons) {
                    for(var key in plugin.assets.icons) {
                        SmartDashboard._iconMap[key] = "file:///" + fullPath + '/' + plugin.assets.icons[key];
                    }
                }
            }
            
            SmartDashboard.plugins.push(plugin.info);
            console.log(plugin.info);
        }
        FileUtils.forAllFilesInDirectory(FileUtils.getDataLocations().plugins, loadPlugin);
    } catch (e) {
        SmartDashboard.handleError(e);
    }
    
    DomUtils.renderWidgetsTab();

    console.info("Loading save, save.version=", data.sdver, "sd.version=", SmartDashboard.version);
    if (data.sdver != SmartDashboard.version) {
        console.warn("Save version doesn't match SmartDashboard version");
    }
    
    var openProfile = _parseArgs(gui.App.argv);
    if(openProfile) {
        SmartDashboard.options.profile = openProfile;
    }
    
    _prepareProfile();
    _refreshWidgets();
    
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
        
        console.log("App open", args);
        
        var fileSwitch = /--open-file=".*?"/.exec(args);
        if(Array.isArray(fileSwitch) && fileSwitch.length > 0) {
            fileSwitch = fileSwitch[0];
            var openProfile = _parseArgs([fileSwitch]);
            if(openProfile) {
                SmartDashboard.switchProfile(openProfile);
                return;
            }
        }
        
        if(args.indexOf("--ds-mode") > -1 && SmartDashboard.options.useDsModeSwitch){
            SmartDashboard.options.dsMode = true;
            SmartDashboard.saveData(function() {
                SmartDashboard.restart();
            });
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
    
    setInterval(checkConnection, 1000);
    setTimeout(checkConnection, 1000);
    
    createSdMenu();
    
    if(!data.options["disableVfx"]){
        document.body.classList.add("vfx-allowed");
    }
    
    setInterval(function(){
        if(SmartDashboard.options.profile)
            SmartDashboard.saveData();
    }, 1000 * 60 * 5);
    
    setTimeout(function(){
        if(global.initCallback) global.initCallback();
        gui.Window.get().show();
        
        if(data.options.ip == ""){
            SmartDashboard.showOptions();
        }
    }, 500); // wait for things to load a bit
    
    if(data.options.doUpdateCheck){
        setTimeout(function(){
            SmartDashboard.checkUpdate();
        }, 10000);
    }
}

function _parseArgs(argv) {
    for (var arg of argv) {
        if(!arg.startsWith("--open-file=")) continue;
        
        arg = arg.replace("--open-file=", "");
        arg = arg.trim();
        var m = arg.match(/"(.*?)"/);
        if(Array.isArray(m) && m.length >= 2) {
            arg = m[1];
        }
        arg = arg.trim();
        if(arg.length == 0) return null;
        arg = path.resolve(path.dirname(path.dirname(process.execPath)), arg);
        if(fs.existsSync(arg)) {
            console.info("Opening", arg);
            return arg;
        } else {
            console.warn(arg, "does not exist");
            return null;
        }
    }
}

SmartDashboard.onExit = function(){
    if(!SmartDashboard.exitable){
        return;
    }
    SmartDashboard.confirm("Exit SmartDashboard.js?", function(v){
        if(v){
            global.SmartDashboard.saveData(function() {
                gui.App.closeAllWindows();
                gui.Window.get().close(true);
            });
        }
    });
};

SmartDashboard.loadWidgets = function(){
    SmartDashboard._loadFinished = false;
    var widgets = [];
    try {
        var filename = SmartDashboard.options.profile;
        if(filename) {
            widgets = JSON.parse(fs.readFileSync(filename).toString());
        }
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

    var i = 0;
    var profile = SmartDashboard.options.profile;
    
    if(widgets.length > 20){
        document.querySelector("#update-screen h3 .status").textContent = "Loading widgets";
        document.querySelector("#update-screen .update-info").textContent = "";
        document.querySelector("#update-screen .dl-info").textContent = "";
    }
    
    var progress = document.querySelector("#update-screen progress");
    progress.value = 0;
    var status = document.querySelector("#update-screen .dl-info");
    status.textContent = "Loading...";
    
    function next(i, widgets, progress, status) {
        if(i >= widgets.length || profile != SmartDashboard.options.profile) {
            document.querySelector("#update-screen").classList.remove("active");
            document.querySelector(".dialog-bg").classList.remove("active");
            if(i >= widgets.length){
                SmartDashboard._loadFinished = true;
            }
            return;
        }
        if(widgets.length > 20){
            progress.value = Math.floor(i * 100 / widgets.length);
            status.textContent = i + "/" + widgets.length;
        }
        
        var wData = widgets[i];
        if (!SmartDashboard.widgetTypes.hasOwnProperty(wData.type)) {
            console.warn("No widget for:", wData.type);
        } else {
            loadWidget(wData);
        }
        i++;
        setTimeout(next.bind(this, i, widgets, progress, status, 100), 1);
    }
    
    if(widgets.length > 20) {
        DomUtils.openBlurredDialog("#update-screen", function() {
            next(i, widgets, progress, status);
        });
    } else {
        next(i, widgets, progress, status);
    }
}

SmartDashboard.saveData = function(cb) {
    console.log("Saving data");
	    try {
        var data = {
            sdver: SmartDashboard.version
        };
        
        data.options = SmartDashboard.options;
        data.recentFiles = SmartDashboard.recentFiles;
        data = JSON.stringify(data);
        fs.writeFileSync(FileUtils.getDataLocations().save, data);
    } catch (e) {
        SmartDashboard.handleError(e);
    }
	
    if(!SmartDashboard.options.profile) {
        SmartDashboard.confirm("Save layout?", function(v) {
            if(!v) {
                if(cb) cb();
                return;
            }
            SmartDashboard.showFileDialog("save", function(file) {
                SmartDashboard.options.profile = file;
                _prepareProfile();
                SmartDashboard.saveData(cb);
            });
        });
        return;
    }
	
	try {
        if(!SmartDashboard._loadFinished) return;
        var widgets = [];

        var topLevelWidgets = Array.prototype.map.call(document.querySelector("#dashboard").children, function (el) {
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
            if (widget.getChildren) {
                wData.children = [];
                for (var childWidget of widget.getChildren()) {
                    saveWidget(childWidget, wData.children);
                }
            }
        };

        for (var widget of topLevelWidgets) {
            saveWidget(widget, widgets);
        }

        var filename = SmartDashboard.options.profile;
        fs.writeFileSync(filename, JSON.stringify(widgets));
        if(cb) cb();
    } catch (e) {
        SmartDashboard.handleError(e);
    }
}

SmartDashboard.switchProfile = function(newProfile, forceNoSave){
    if(newProfile == SmartDashboard.options.profile){
        return;
    }
    
    function next() {
        SmartDashboard.options.profile = newProfile;
    
        _prepareProfile();
        _refreshWidgets();
    }
    
    if(!forceNoSave) {
        SmartDashboard.saveData(next);
    } else {
        next();
    }
}

function _prepareProfile() {
    var cp = document.querySelector(".current-profile");
    
    if(!SmartDashboard.options.profile) {
        cp.textContent = cp.title = "";
        return;
    }
    var index;
    if((index = SmartDashboard.recentFiles.indexOf(SmartDashboard.options.profile)) > -1) {
        SmartDashboard.recentFiles.splice(index, 1);
    }
    SmartDashboard.recentFiles.splice(0, 0, SmartDashboard.options.profile);
    if(SmartDashboard.recentFiles.length > 10) {
        SmartDashboard.recentFiles = SmartDashboard.recentFiles.slice(0, 10);
    }
    
    cp.title = SmartDashboard.options.profile;
    cp.textContent = path.basename(SmartDashboard.options.profile);
}

function _refreshWidgets() {
    while(SmartDashboard.widgets.length > 0){
        SmartDashboard.removeWidget(SmartDashboard.widgets[0]);
    }
    SmartDashboard.loadWidgets();
}

SmartDashboard.setEditable = function (flag) {
    SmartDashboard.editable = flag;
    for (var widget of SmartDashboard.widgets) {
        widget.setEditable(flag);
    }
    
    DomUtils.resetClass("not-editing");
    if(flag){
        document.querySelector("#control-editable").classList.add("toggle-down");
        document.querySelector(".widget-trash").classList.add("active");
    } else {
        document.querySelector("#control-editable").classList.remove("toggle-down");
        document.querySelector(".widget-trash").classList.remove("active");
        var wdi = document.querySelector(".widget-drag-image");
        wdi.classList.remove("active");
        wdi.style.top = wdi.style.left = "-1000px";
        DomUtils.resetClass("reorder-widget");
        DomUtils.resetClass("hl");
    }
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
    widget._destroy();
    var index = this.widgets.indexOf(widget);
    if (index > -1) {
        this.widgets.splice(index, 1);
    }
}

SmartDashboard.isProduction = function(){
    return process.execPath.indexOf("app\\nw.exe") > -1;
}

function isVersionGreater(v1, v2){
    v1 = v1.split(".").map(item => parseInt(item));
    v2 = v2.split(".").map(item => parseInt(item));
    
    for(var i = 0; i < Math.min(v1.length, v2.length); i++){
        if(v1[i] > v2[i]){
            return true;
        } else if(v1[i] < v2[i]){
            return false;
        }
    }
    return false;
}

SmartDashboard.checkUpdate = function(notifyIfNoneCb) {
    var currentVersion = gui.App.manifest.version;
    var repoUrl = gui.App.manifest.repositories[0].url, parts = repoUrl.split("/");
    var owner = parts[parts.length - 2], repo = parts[parts.length - 1];
    if (SmartDashboard.isProduction()) {
        fetch(new Request("https://api.github.com/repos/" + owner + "/" + repo + "/releases/latest", {
            headers: new Headers({
                "Accept": "application/vnd.github.v3+json"
            }),
            method: "GET",
            cache: "no-cache"
        })).then(function (response) {
            if(response.status != 200) {
                console.log("Update check", response.status, response.statusText);
                return;
            }
            
            response.text().then(function(text){
                var release = JSON.parse(text);
                console.log("Update check", release);
                
                if(release.draft || release.prerelease || !isVersionGreater(release.tag_name, currentVersion)
                   || release.assets.length < 1 || release.assets[0].state != "uploaded"){
                    if(notifyIfNoneCb){
                        notifyIfNoneCb();
                    }
                    return;
                }
                
                var url = release.assets[0].browser_download_url;
                SmartDashboard.prompt("Update " + release.tag_name + " is available. Update now?", function(res){
                    if(res != null) {
                        SmartDashboard.exitable = false;
                        document.querySelector("#update-screen h3 .status").textContent = "Downloading update";
                        document.querySelector("#update-screen .update-info").textContent = "SmartDashboard.js will automatically restart once the update is downloaded.";
                        document.querySelector("#update-screen .dl-info").textContent = "Waiting...";
                        DomUtils.openBlurredDialog("#update-screen");
                        SmartDashboard.saveUpdate(release.tag_name, url, function(percent, current, total){
                            document.querySelector("#update-screen progress").value = percent;
                            document.querySelector("#update-screen .dl-info").textContent = 
                                url + "\n" +
                                (current / 1000000).toFixed(1) + " MB / " +
                                (total / 1000000).toFixed(1) + " MB";
                        }, function(err){
                            if(err){
                                document.querySelector("#update-screen").classList.remove("active");
                                SmartDashboard.handleError(err);
                                return;
                            }
                            
                            
                            var dp = gui.App.getDataPath();
                            try {
                                var launcher = fs.readFileSync(process.execPath.replace("app\\nw.exe", "SmartDashboard.exe"));
                                fs.writeFileSync(dp + "\\SmartDashboard.exe", launcher);
                            } catch(e){
                                SmartDashboard.handleError(e);
                                return;
                            }
                            
                            document.querySelector("#update-screen h3 .status").textContent = "Extracting files";
                            SmartDashboard.saveData();
                            
                            var child = child_process.spawn(dp + "\\SmartDashboard.exe", ["--update", "--pb"], {detached: true, cwd: dp});
                            child.unref();
                            gui.App.quit();
                        });
                    }
                }, null, true, [], release.body);
            });
        }).catch(function (err) {
            console.error(err);
        });
    }
}

SmartDashboard.saveUpdate = function(version, url, progress, cb){
    console.info("Saving update", version);
    console.log(url);
    
    global._update_cb = cb;
    global._update_progress = progress;
    
    var file;
    try {
        file = fs.createWriteStream(gui.App.getDataPath() + "\\update.zip.dl");
    } catch(e){
        cb(e);
        return;
    }
    
    function httpResponse(response){
        if(response.headers['location']){
            console.log("Following redirect", response.headers['location']);
            httpRequest(response.headers['location']);
            return;
        }
        console.log("Downloading update");
        
        var total = parseInt(response.headers["content-length"]), current = 0;
        response.pipe(file);
        response.on('data', function(data){
            current += data.length;
            if(global._update_progress){
                global._update_progress(current * 100 / total, current, total);
            }
        });
        file.on('finish', function() {
            console.log("Finished");
            file.close(function(){
                fs.writeFileSync(gui.App.getDataPath() + "\\update.sd", process.execPath.replace("app\\nw.exe", ""));
                if(global._update_cb){
                    global._update_cb(null);
                }
            });
        });
    }
    
    function httpRequest(url){
        request = https.get(url, httpResponse).on('error', function(err) {
            console.error(err);
            fs.unlink(dest);
            if(global._update_cb) {
                global._update_cb(err);
            }
        });
    }
    
    httpRequest(url);
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