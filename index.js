var SmartDashboard = {
    version: gui.App.manifest.version,
    widgets: [],
    widgetTypes: {},
    editable: false,
    options: {},
    plugins: [],
    exitable: true
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
    process.on('uncaughtException', function (err) {
        global.SmartDashboard.handleError(err);
    });
    
    var data = global.data;

    SmartDashboard.options = data.options;
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
        data.options.profile = "default";
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
        ntcore.init(ntcore.CLIENT, data.options.ip);
    } catch (e) {
        SmartDashboard.handleError(e);
    }
    
    var cp = document.querySelector(".current-profile");
    cp.textContent = cp.title = SmartDashboard.options.profile;
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
    
    createSdMenu();
    
    if(!data.options["disableVfx"]){
        document.body.classList.add("vfx-allowed");
    }
    
    setInterval(function(){
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

SmartDashboard.onExit = function(){
    if(!SmartDashboard.exitable){
        return;
    }
    SmartDashboard.confirm("Exit SmartDashboard.js?", function(v){
        if(v){
            global.SmartDashboard.saveData();
            gui.App.closeAllWindows();
            gui.Window.get().close(true);
        }
    });
};

SmartDashboard.loadWidgets = function(){
    SmartDashboard._loadFinished = false;
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

    var i = 0;
    var profile = SmartDashboard.options.profile;
    
    if(widgets.length > 20){
        document.querySelector("#update-screen h3 .status").textContent = "Loading widgets";
        document.querySelector("#update-screen .update-info").textContent = "";
        document.querySelector("#update-screen .dl-info").textContent = "";
        DomUtils.openBlurredDialog("#update-screen");
    }
    
    var progress = document.querySelector("#update-screen progress");
    var status = document.querySelector("#update-screen .dl-info");
    
    function next(){
        if(i >= widgets.length || profile!= SmartDashboard.options.profile){
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
        setTimeout(next.bind(this), 20);
    }
    
    next();
}

SmartDashboard.saveData = function() {
    console.log("Saving data");
    try {
        var data = {
            sdver: SmartDashboard.version
        };
        
        data.options = SmartDashboard.options;
        data = JSON.stringify(data);
        fs.writeFileSync(FileUtils.getDataLocations().save, data);
        
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

        fs.writeFileSync(FileUtils.getDataLocations().layouts + SmartDashboard.options.profile + ".json", JSON.stringify(widgets));
    } catch (e) {
        SmartDashboard.handleError(e);
    }
}

SmartDashboard.switchProfile = function(newProfile, forceNoSave){
    if(newProfile == SmartDashboard.options.profile){
        return;
    }
    if(!forceNoSave) {
        SmartDashboard.saveData();
    }
    SmartDashboard.options.profile = newProfile;
    
    while(SmartDashboard.widgets.length > 0){
        SmartDashboard.removeWidget(SmartDashboard.widgets[0]);
    }
    
    SmartDashboard.loadWidgets();
    var cp = document.querySelector(".current-profile");
    cp.textContent = cp.title = newProfile;
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
    widget.destroy();
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