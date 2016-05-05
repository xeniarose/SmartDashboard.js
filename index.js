const gui = require('nw.gui');
const ntcore = require('./ntcore_node');
const fs = require('fs');
const child_process = require("child_process");
gui.Screen.Init();

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

SmartDashboard.populateWidgetSelect = function (select) {
    select.innerHTML = "";
    for (widgetName in SmartDashboard.widgetTypes) {
        if (!SmartDashboard.widgetTypes.hasOwnProperty(widgetName)) continue;
        var widget = SmartDashboard.widgetTypes[widgetName];
        if (select.hasAttribute("data-filter") && widget.dataType.indexOf(select.getAttribute("data-filter")) == -1) continue;

        var opt = document.createElement("option");
        opt.value = widgetName;
        opt.textContent = widgetName;
        select.appendChild(opt);
    }
}

SmartDashboard.populateThemeSelect = function (select) {
    select.innerHTML = "";
    var opt = document.createElement("option");
    opt.value = "__default__";
    opt.textContent = "default";
    select.appendChild(opt);
    try {
        var normalizedPath = require("path").join(process.cwd(), "themes");
        fs.readdirSync(normalizedPath).forEach(function (file) {
            if(file.substring(file.length - 4) != ".css") return;
            var theme = file.substring(file, file.length - 4);
            var opt = document.createElement("option");
            opt.value = theme;
            opt.textContent = theme;
            select.appendChild(opt);
        });
    } catch (e) {
        SmartDashboard.handleError(e);
    }
}

SmartDashboard.setTheme = function(theme, link){
    if(typeof link == "undefined"){
        link = document.getElementById("theme-css");
    }
    if(theme == "__default__" || typeof theme == "undefined"){
        link.href = "";
    } else {
        link.href = "themes/" + theme + ".css";
    }
}

SmartDashboard.getThemeLocation = function(){
    return "themes/" + SmartDashboard.options.theme + ".css";
}

SmartDashboard.populatePluginList = function (list) {
    list.innerHTML = "";
    for (plugin of SmartDashboard.plugins) {
        var el = document.createElement("div");
        el.classList.add("plugin-item");
        
        for(var fieldName of ["name", "version", "file", "description"]){
            var field = document.createElement("div");
            field.classList.add(fieldName);
            field.textContent = plugin[fieldName];
            el.appendChild(field);
        }
        list.appendChild(el);
    }
    if (SmartDashboard.plugins.length == 0) {
        list.innerHTML = "No plugins";
    }
}

SmartDashboard.isRectIntersecting = function(r1, r2){
    function isPointContained(val, left, right){
        return val > left && val < right;
    }
    return (
        isPointContained(r1.left, r2.left, r2.right) ||
        isPointContained(r1.right, r2.left, r2.right) ||
        isPointContained(r2.left, r1.left, r1.right) ||
        isPointContained(r2.right, r1.left, r1.right)
    ) && (
        isPointContained(r1.top, r2.top, r2.bottom) ||
        isPointContained(r1.bottom, r2.top, r2.bottom) ||
        isPointContained(r2.top, r1.top, r1.bottom) ||
        isPointContained(r2.bottom, r1.top, r1.bottom)
    );
}

SmartDashboard.findIntersectingContainer = function(widget, blacklist){
    blacklist = blacklist || [];
    blacklist.push(widget);
    var wRect = widget.dom.getBoundingClientRect();
    for(var container of SmartDashboard.widgets){
        if(!container.addChild || blacklist.indexOf(container) > -1) continue;
        
        var cRect = container.dom.getBoundingClientRect();
        if(SmartDashboard.isRectIntersecting(wRect, cRect)){
            return container;
        }
    }
    return null;
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

    var sdMenu = new gui.Menu();
    sdMenu.append(new gui.MenuItem({
        label: "SmartDashboard.js " + SmartDashboard.version,
        enabled: false
    }));
    sdMenu.append(new gui.MenuItem({
        label: "About",
        click: function(){
            gui.Window.open('about.html', {
                position: 'center'
            });
        }
    }));
    sdMenu.append(new gui.MenuItem({
        label: "Restart",
        click: function(){
            SmartDashboard.saveData();
            SmartDashboard.restart();
        }
    }));
    sdMenu.append(new gui.MenuItem({
        label: "Exit",
        click: function(){
            SmartDashboard.saveData();
            window.close();
        }
    }));
    sdMenu.append(new gui.MenuItem({
        label: "DevTools",
        click: function(){
            gui.Window.get().showDevTools();
        }
    }));
    sdMenu.append(new gui.MenuItem({
        label: "Options",
        click: function () {
            SmartDashboard.showOptions();
        }
    }));
    sdMenu.append(new gui.MenuItem({
        type: "separator"
    }));
    sdMenu.append(new gui.MenuItem({
        label: "New",
        submenu: newMenu
    }));
    sdMenu.append(new gui.MenuItem({
        label: "Editable",
        type: "checkbox",
        checked: SmartDashboard.editable,
        click: function () {
            SmartDashboard.setEditable(this.checked);
        }
    }));
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

SmartDashboard.isDefaultDashboard = function(){
    var dsIni = fs.readFileSync("C:\\Users\\Public\\Documents\\FRC\\FRC DS Data Storage.ini").toString();
    var line = dsIni.match(/DashboardCmdLine[^\r\n]*\r\n/);
    return line != null && line[0].indexOf("ds.bat") > -1;
}

SmartDashboard.setDefaultDashboard = function(isSdJs){
    var run;
    if(isSdJs){
        var sdDir = process.cwd();
        var nwjs = process.execPath;
        fs.writeFileSync("ds.bat", "\"" + nwjs + "\" \"" + sdDir + "\" --ds-mode %*");
        run = sdDir + "\\ds.bat";
        run = "\"\"" + run.replace(/\\/g, "\\\\") + "\"\"";
    } else {
        run = "\"\"C:\\Program Files (x86)\\FRC Dashboard\\Dashboard.exe\"\"";
    }
    var dsIni = fs.readFileSync("C:\\Users\\Public\\Documents\\FRC\\FRC DS Data Storage.ini").toString();
    dsIni = dsIni.replace(/DashboardCmdLine[^\r\n]*\r\n/, "DashboardCmdLine = " + run + "\r\n");
    fs.writeFileSync("C:\\Users\\Public\\Documents\\FRC\\FRC DS Data Storage.ini", dsIni);
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

SmartDashboard.renderEntries = function(){
    var entries = SmartDashboard.entriesTree();
    if(SmartDashboard._entries && JSON.stringify(entries) == JSON.stringify(SmartDashboard._entries)){
        return;
    }
    SmartDashboard._entries = entries;
    var root = document.querySelector("#entries .list");
    root.innerHTML = "";
    
    function render(domRoot, dataRoot, items, pathBuild){
        for(var key of items){
            var parentPath = pathBuild;
            if(pathBuild.length > 0) parentPath += "/";
            
            var el = document.createElement("li");
            var a = document.createElement("a");
            var btn = document.createElement("button");
            btn.classList.add("entry-add");
            btn.textContent = "+";
            a.href = "javascript:void(0)";
            a.textContent = key;
            a.dataset.path = parentPath + key;
            btn.onclick = function(){
                if(this.parentElement.classList.contains("open")){
                    this.parentElement.classList.remove("open");
                    this.textContent = "+";
                } else {
                    this.parentElement.classList.add("open");
                    this.textContent = "-";
                }
            };
            a.onclick = function(){
                var nameRaw = this.dataset.path;
                
                var val = ntcore.getTable("").get(nameRaw);
                var widgetType = typeof val;
                if(widgetType == "undefined") widgetType = "object";
                if(Array.isArray(val)) widgetType = "array";
                
                SmartDashboard.setEditable(true);
                
                var widget = new (SmartDashboard.getDefaultWidget(widgetType)).widget(
                    nameRaw.substring(0, nameRaw.lastIndexOf("/")),
                    nameRaw.substring(nameRaw.lastIndexOf("/") + 1));
                SmartDashboard.positionWidget(widget);
            };
            el.appendChild(btn);
            el.appendChild(a);
            domRoot.appendChild(el);
            var ul = document.createElement("ul");
            el.appendChild(ul);
            var items = [];
            for(var _key in dataRoot[key])
                if(dataRoot[key].hasOwnProperty(_key))
                    items.push(_key);
            items.sort();
            if(items.length == 0){
                el.classList.add("none");
            }
            render(ul, dataRoot[key], items, parentPath + key);
        }
    }
    
    var items = [];
    for(var key in entries)
            if(entries.hasOwnProperty(key))
                items.push(key);
    items.sort();
    render(root, entries, items, "");
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
    
    document.querySelector("#entries").onmouseover = SmartDashboard.renderEntries;

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
    
    document.querySelector("#dashboard").ondblclick = function(e){
        if(e.target != this) return;
        for(var item of SmartDashboard.widgets){
            if(item != this && item.editing)
                item.setEditing(false);
        }
        SmartDashboard.resetClass("not-editing");
    };
    
    

    console.info("Loading plugins");
    try {
        var normalizedPath = require("path").join(process.cwd(), "plugins");
        fs.readdirSync(normalizedPath).forEach(function (file) {
            console.info("Loading plugin", file);
            var plugin;
            try {
                plugin = require("./plugins/" + file);
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

    for (var wData of data.widgets) {
        if (!SmartDashboard.widgetTypes.hasOwnProperty(wData.type)) {
            console.warn("No widget for:", wData.type);
            continue;
        }
        loadWidget(wData);
    }
    
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

SmartDashboard.saveData = function () {
    var data = {
        sdver: SmartDashboard.version,
        widgets: []
    }
    
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
        saveWidget(widget, data.widgets);
    }
    
    data.options = SmartDashboard.options;
    data = JSON.stringify(data);
    fs.writeFileSync("save.json", data);
}

SmartDashboard.setEditable = function (flag) {
    SmartDashboard.editable = flag;
    for (var widget of SmartDashboard.widgets) {
        widget.setEditable(flag);
    }
    
    SmartDashboard.resetClass("not-editing");
}

SmartDashboard.resetClass = function(className){
    var resetContainers = document.querySelectorAll("." + className);
    for(var i = 0; i < resetContainers.length; i++){
        resetContainers[i].classList.remove(className);
    }
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

class Decorator {
    constructor() {}

    decorate(widget) {}
}

class Widget {
    constructor(table, key, saveData) {
        this.dom = document.createElement("div");
        this.dom.classList.add("widget");
        this.dom.classList.add("widget-" + this.constructor.name);
        this.dom.parentWidget = this;
        var self = this;
        this.root = this.dom;
        this.table = typeof table == "string" ? ntcore.getTable(table) : table;
        this.key = key;
        this.val = null;
        this.saveData = saveData || {};
        if(!this.saveData.label){
            this.saveData.label = "left";
        }
        this.root.dataset.label = this.saveData.label;
        this.editable = false;
        this.decorators = [];
        this.attachListeners();
        this._render();
        this._update(this.key, this.table.get(this.key, null));
    }

    _createContextMenu() {
        var self = this;
        var menu = new gui.Menu();
        menu.append(new gui.MenuItem({
            label: this.constructor.name,
            enabled: false
        }));
        menu.append(new gui.MenuItem({
            type: "separator"
        }));
        menu.append(new gui.MenuItem({
            label: "Delete",
            click: function () {
                self.remove();
            }
        }));

        var morphMenu = new gui.Menu();
        var self = this;
        for (var widgetType in SmartDashboard.widgetTypes) {
            if (!SmartDashboard.widgetTypes.hasOwnProperty(widgetType)) continue;
            if(widgetType == this.constructor.name) continue;
            if(SmartDashboard.widgetTypes[widgetType].dataType != SmartDashboard.widgetTypes[this.constructor.name].dataType) continue;
            (function (widgetType) {
                morphMenu.append(new gui.MenuItem({
                    label: widgetType,
                    click: function () {
                        setTimeout(function () {
                            var pos = self.getPosition();
                            var widget = new SmartDashboard.widgetTypes[widgetType].widget(self.table.getTablePath(), self.key);
                            widget.setPosition(pos.x, pos.y, pos.w, pos.h);
                            SmartDashboard.removeWidget(self);
                            SmartDashboard.addWidget(widget);
                            widget.resetSize();
                            if(self.parent){
                                self.parent.addChild(widget, true);
                            }
                        }, 1);
                    }
                }));
            })(widgetType);
        }

        menu.append(new gui.MenuItem({
            label: "Morph",
            submenu: morphMenu
        }));

        menu.append(new gui.MenuItem({
            label: "Change Variable Name",
            click: function () {
                setTimeout(function () {
                    var nameRaw = prompt("New name:", self.table.getTablePath() + "/" + self.key);
                    if (nameRaw == null || nameRaw == "")
                        return;
                    var pos = self.getPosition();
                    var widget = new SmartDashboard.widgetTypes[self.constructor.name].widget(nameRaw.substring(0, nameRaw.lastIndexOf("/")),
                        nameRaw.substring(nameRaw.lastIndexOf("/") + 1));
                    SmartDashboard.removeWidget(self);
                    widget.setPosition(pos.x, pos.y, pos.w, pos.h);
                    widget.saveData = self.saveData;
                    SmartDashboard.addWidget(widget);
                    if(self.parent){
                        self.parent.addChild(widget, true);
                    }
                }, 1);
            }
        }));
        menu.append(new gui.MenuItem({
            type: "separator"
        }));
        
        menu.append(new gui.MenuItem({
            label: "Label",
            enabled: false
        }));
        
        
        menu.append(new gui.MenuItem({
            label: "Left",
            type: "checkbox",
            checked: this.saveData.label == "left",
            click: function () {
                self.root.dataset.label = self.saveData.label = "left";
            }
        }));
        
        menu.append(new gui.MenuItem({
            label: "Top",
            type: "checkbox",
            checked: this.saveData.label == "top",
            click: function () {
               self.root.dataset.label = self.saveData.label = "top";
            }
        }));
        
        menu.append(new gui.MenuItem({
            label: "None",
            type: "checkbox",
            checked: this.saveData.label == "none",
            click: function () {
               self.root.dataset.label = self.saveData.label = "none";
            }
        }));
        
        menu.append(new gui.MenuItem({
            type: "separator"
        }));
        
        menu.append(new gui.MenuItem({
            label: "To Front",
            click: function () {
                var parent = self.dom.parentElement;
                self.dom.remove();
                parent.appendChild(self.dom);
            }
        }));
        
        menu.append(new gui.MenuItem({
            label: "Forward",
            click: function () {
                var parent = self.dom.parentElement;
                var next = self.dom.nextElementSibling;
                if(typeof next != "undefined" && next != null)
                    next = next.nextElementSibling;
                self.dom.remove();
                parent.insertBefore(self.dom, next);
            }
        }));
        
        menu.append(new gui.MenuItem({
            label: "Backward",
            click: function () {
                var parent = self.dom.parentElement;
                var prev = self.dom.previousElementSibling;
                console.log(prev, self.dom);
                self.dom.remove();
                parent.insertBefore(self.dom, prev);
            }
        }));
        
        menu.append(new gui.MenuItem({
            label: "To Back",
            click: function () {
                var parent = self.dom.parentElement;
                self.dom.remove();
                parent.insertBefore(self.dom, parent.children[0]);
            }
        }));
        
        menu.append(new gui.MenuItem({
            type: "separator"
        }));
        
        this.createContextMenu(menu);
        
        menu.append(new gui.MenuItem({
            type: "separator"
        }));
        
        menu.append(new gui.MenuItem({
            label: "Properties",
            click: function () {
                gui.Window.open("blank.html", {}, function (w) {
                    var win = w.window;
                    w.on("loaded", function () {
                        var cb = function (k, v) {
                            var pos = self.getPosition();
                            pos[k] = parseFloat(v);
                            self.setPosition(pos.x, pos.y, pos.w, pos.h);
                            self._w = self.dom.offsetWidth;
                            self._h = self.dom.offsetHeight;
                        };
                        var pos = self.getPosition();
                        win.addField("x", "number", pos.x, cb);
                        win.addField("y", "number", pos.y, cb);
                        win.addField("w", "number", pos.w, cb);
                        win.addField("h", "number", pos.h, cb);
                        if(self.parent) self.parent.getPropertiesFromParent(win, self);
                        
                        self.createPropertiesView(win);
                    });
                });
            }
        }));
        
        return menu;
    }
    
    createPropertiesView(win){
        
    }

    createContextMenu(menu) {

    }

    remove() {
        SmartDashboard.removeWidget(this);
    }

    getPosition() {
        var ox = parseInt(this.dom.style.left);
        var oy = parseInt(this.dom.style.top);
        if (isNaN(ox)) ox = 0;
        if (isNaN(oy)) oy = 0;
        return {
            x: ox,
            y: oy,
            w: this._w,
            h: this._h
        };
    }

    setPosition(x, y, w, h) {
        this.dom.style.left = x + "px";
        this.dom.style.top = y + "px";
        this.dom.style.width = w + "px";
        this.dom.style.height = h + "px";
    }
    
    mouseDownHandler(){
    }
    mouseUpHandler(){
    }
    
    resetSize(){
        this.dom.style.width = this.dom.style.height = null;
        this._w = this.dom.offsetWidth;
        this._h = this.dom.offsetHeight;
    }

    setEditable(flag) {
        var self = this;
        this.editable = flag;
        this.dom.dataset.editable = "" + flag;
        if (flag) {
            this._dragging = false;
            this._dragSize = false;
            var sx, sy, ox, oy, ow, oh;
            this.dom.onmouseover = this.dom.onmouseout = function (e) {
                e.preventDefault();
                return false;
            }
            this.dom.onmousedown = function (e) {
                if(e.which == 2){
                    if (e.clientX - self.dom.offsetLeft > self.dom.offsetWidth - 10
                            && e.clientY - self.dom.offsetTop > self.dom.offsetHeight - 10) {
                        self.resetSize();
                    }
                    e.preventDefault();
                    return false;
                }
                
                if(e.which != 1) return;
                if(e.detail > 1) return;
                if(self.dom.classList.contains("not-editing")) return;
                self._dragging = true;
                self.dom.classList.add("drag");
                if(!self.parent || (self.parent && self.parent.getDragMode() == "position")){
                    var parent = self.dom.parentElement;
                    self.dom.remove();
                    parent.appendChild(self.dom);
                } else if(self.parent.getDragMode() == "order"){
                    self.dom.classList.add("hl");
                }
                
                sx = e.clientX;
                sy = e.clientY;
                ox = parseInt(self.dom.style.left);
                oy = parseInt(self.dom.style.top);
                ow = self.dom.offsetWidth;
                oh = self.dom.offsetHeight;
                if (isNaN(ox)) ox = 0;
                if (isNaN(oy)) oy = 0;

                var rect = self.dom.getBoundingClientRect();
                
                if (e.clientX - rect.left > rect.width - 10 && e.clientY - rect.top > rect.height - 10) {
                    self._dragSize = true;
                } else {
                    self._dragSize = false;
                }

                self.mouseDownHandler();
                
                e.preventDefault();
                return false;
            }

            this.dom.onmouseup = function (e) {
                self._dragging = false;
                self.dom.classList.remove("drag");
                
                SmartDashboard.resetClass("drop-target");
                SmartDashboard.resetClass("remove-target");
                SmartDashboard.resetClass("hl");
                
                if(!self._dragSize && e.which == 1 && !e.shiftKey){
                    var hoverContainer = self._widgetIntersect();
                    if(hoverContainer){
                        hoverContainer.addChild(self);
                    } else if(self.parent) {
                        var pRect = self.parent.dom.getBoundingClientRect();
                        if((e.clientX < pRect.left || e.clientX > pRect.right) || (e.clientY < pRect.top || e.clientY > pRect.bottom)){
                            self.parent.removeChild(self);
                        }
                    }
                }
                
                self.mouseUpHandler();
                e.preventDefault();
                return false;
            }

            this.dom.onmousemove = function (e) {
                if (self._dragging) {
                    //console.log(e.screenX, e.screenY, e.clientX, e.clientY);
                    if (self._dragSize) {
                        this.style.width = (e.clientX - sx + ow + 5) + "px";
                        this.style.height = (e.clientY - sy + oh + 5) + "px";
                        self._w = this.offsetWidth;
                        self._h = this.offsetHeight;
                    } else {
                        if(!self.parent || (self.parent && self.parent.getDragMode() == "position")){
                            this.style.left = ((e.clientX - sx) + ox) + "px";
                            this.style.top = ((e.clientY - sy) + oy) + "px";
                        } else if(self.parent.getDragMode() == "order") {
                            var children = self.parent.getChildren();
                            var closestChild = null;
                            var closestDist = Number.MAX_VALUE;
                            var closestChildRect;
                            for(var child of children){
                                var cRect = child.dom.getBoundingClientRect();
                                
                                var dx = Math.abs(e.clientX - (cRect.left + cRect.width / 2));
                                var dy = Math.abs(e.clientY - (cRect.top + cRect.height / 2));
                                var dist = dx * dx + dy * dy;
                                if(dist > 0){
                                    if(dist < closestDist){
                                        closestDist = dist;
                                        closestChild = child;
                                        closestChildRect = cRect;
                                    }
                                }
                            }
                            if(closestChild != null && closestChild != self){
                                var parentEl = self.dom.parentElement;
                                if(parentEl != null){
                                    var dx = e.clientX - (closestChildRect.left + closestChildRect.width / 2);
                                    var dy = e.clientY - (closestChildRect.top + closestChildRect.height / 2);
                                    if(dx < 0){
                                        self.dom.remove();
                                        parentEl.insertBefore(self.dom, closestChild.dom);
                                    } else {
                                        self.dom.remove();
                                        parentEl.insertBefore(self.dom, closestChild.dom.nextElementSibling);
                                    }
                                }
                            }
                        }
                    }
                
                    if(!self._dragSize && !e.shiftKey){
                        var hoverContainer = self._widgetIntersect();
                        SmartDashboard.resetClass("drop-target");
                        SmartDashboard.resetClass("remove-target");
                        if(hoverContainer){
                            hoverContainer.dom.classList.add("drop-target");
                        } else if(self.parent) {
                            var pRect = self.parent.dom.getBoundingClientRect();
                            if((e.clientX < pRect.left || e.clientX > pRect.right) || (e.clientY < pRect.top || e.clientY > pRect.bottom)){
                                self.parent.dom.classList.add("remove-target");
                            }
                        }
                    }
                }
                
                e.preventDefault();
                return false;
            }
        } else {
            this.dom.onmousedown = null;
            this.dom.onmouseup = null;
            this.dom.onmousemove = null;
            this.dom.onmouseover = null;
            this.dom.onmouseout = null;
        }
    }
    
    _widgetIntersect(){
        var blacklist = [];
        function addChildren(node){
            if(!node.getChildren) return;
            for(var child of node.getChildren()){
                blacklist.push(child);
                addChildren(child);
            }
        }
        addChildren(this);
        var parent = this.parent;
        while(parent){
            blacklist.push(parent);
            parent = parent.parent;
        }
        return SmartDashboard.findIntersectingContainer(this, blacklist);
    }

    attachListeners() {
        // get around the ntcore addon losing context on callbacks
        var self = this;
        this._mainListener = function (k, v) {
            self._update(k, v);
        };
        this.table.onChange(this.key, this._mainListener);
    }

    _update(key, val) {
        if(val == null) return;
        this.val = val;
        this.update();
    }

    update() {
        this.root.textContent = this.key + ": " + this.val;
    }

    _render() {
        this.dom.innerHTML = "";
        for (var decorator of this.decorators) {
            decorator.decorate(this);
        }
        
        this._dom_id = this.constructor.name + "-" + uniqueId();
        var label = document.createElement("label");
        label.innerHTML = this.key + ":&nbsp;";
        label.setAttribute("for", this._dom_id);
        this.root.appendChild(label);
        
        this.render();
    }

    render() {
        this.root.textContent = this.key + ": " + this.val;
    }
    
    destroy(){
        
    }
}
global.Widget = Widget;

class Container {
    constructor(table, key, saveData){
        this.dom = document.createElement("div");
        this.dom.classList.add("container");
        this.dom.classList.add("container-" + this.constructor.name);
        this.dom.parentWidget = this;
        this.editable = false;
        this.saveData = saveData || {};
        this.editing = false;
        var self = this;
        this.dom.ondblclick = function(e){
            return self.doubleClickHandler(e);
        };
        this.table = {
            getTablePath: function(){
                return "";
            }
        };
        this.key = "";
        this.restoreSave();
    }
    
    restoreSave(){
        
    }
    
    getDragMode(){
        return "position";
    }
    
    _createContextMenu(){
        var self = this;
        var menu = new gui.Menu();
        menu.append(new gui.MenuItem({
            label: this.constructor.name,
            enabled: false
        }));
        menu.append(new gui.MenuItem({
            type: "separator"
        }));
        menu.append(new gui.MenuItem({
            label: "Delete",
            click: function () {
                self.remove();
            }
        }));

        /*var morphMenu = new gui.Menu();
        var self = this;
        for (var widgetType in SmartDashboard.widgetTypes) {
            if (!SmartDashboard.widgetTypes.hasOwnProperty(widgetType)) continue;
            if(widgetType == this.constructor.name) continue;
            if(SmartDashboard.widgetTypes[widgetType].dataType != SmartDashboard.widgetTypes[this.constructor.name].dataType) continue;
            (function (widgetType) {
                morphMenu.append(new gui.MenuItem({
                    label: widgetType,
                    click: function () {
                        setTimeout(function () {
                            var pos = self.getPosition();
                            var widget = new SmartDashboard.widgetTypes[widgetType].widget(self.table.getTablePath(), self.key);
                            widget.setPosition(pos.x, pos.y, pos.w, pos.h);
                            SmartDashboard.removeWidget(self);
                            SmartDashboard.addWidget(widget);
                            widget.resetSize();
                            if(self.parent){
                                self.parent.addChild(widget, true);
                            }
                        }, 1);
                    }
                }));
            })(widgetType);
        }

        menu.append(new gui.MenuItem({
            label: "Morph",
            submenu: morphMenu
        }));*/

        menu.append(new gui.MenuItem({
            type: "separator"
        }));
        
        menu.append(new gui.MenuItem({
            label: "To Front",
            click: function () {
                var parent = self.dom.parentElement;
                self.dom.remove();
                parent.appendChild(self.dom);
            }
        }));
        
        menu.append(new gui.MenuItem({
            label: "Forward",
            click: function () {
                var parent = self.dom.parentElement;
                var next = self.dom.nextElementSibling;
                if(typeof next != "undefined" && next != null)
                    next = next.nextElementSibling;
                self.dom.remove();
                parent.insertBefore(self.dom, next);
            }
        }));
        
        menu.append(new gui.MenuItem({
            label: "Backward",
            click: function () {
                var parent = self.dom.parentElement;
                var prev = self.dom.previousElementSibling;
                console.log(prev, self.dom);
                self.dom.remove();
                parent.insertBefore(self.dom, prev);
            }
        }));
        
        menu.append(new gui.MenuItem({
            label: "To Back",
            click: function () {
                var parent = self.dom.parentElement;
                self.dom.remove();
                parent.insertBefore(self.dom, parent.children[0]);
            }
        }));
        
        menu.append(new gui.MenuItem({
            type: "separator"
        }));
        
        this.createContextMenu(menu);
        
        menu.append(new gui.MenuItem({
            type: "separator"
        }));
        
        menu.append(new gui.MenuItem({
            label: "Properties",
            click: function () {
                gui.Window.open("blank.html", {}, function (w) {
                    var win = w.window;
                    w.on("loaded", function () {
                        var cb = function (k, v) {
                            var pos = self.getPosition();
                            pos[k] = parseFloat(v);
                            self.setPosition(pos.x, pos.y, pos.w, pos.h);
                            self._w = self.dom.offsetWidth;
                            self._h = self.dom.offsetHeight;
                        };
                        var pos = self.getPosition();
                        win.addField("x", "number", pos.x, cb);
                        win.addField("y", "number", pos.y, cb);
                        win.addField("w", "number", pos.w, cb);
                        win.addField("h", "number", pos.h, cb);
                        if(self.parent) self.parent.getPropertiesFromParent(win, self);
                        
                        self.createPropertiesView(win);
                    });
                });
            }
        }));
        
        return menu;
    }
    
    createPropertiesView(win){
        
    }
    
    createContextMenu(menu){
        
    }
    
    remove() {
        function removeChildren(el){
            SmartDashboard.removeWidget(el);
            if(el.getChildren){
                for(var child of el.getChildren()){
                    removeChildren(child);
                }
            }
        }
        
        removeChildren(this);
    }
    
    setEditable(flag){
        this.setEditing(false);
        this._setEditable(flag);
    }
    
    _setEditable(flag){
        Widget.prototype.setEditable.call(this, flag); // hacks! make widget and container both inherit from a parent class
    }
    
    _widgetIntersect(){
        return Widget.prototype._widgetIntersect.call(this);
    }
    
    resetSize(){
        Widget.prototype.resetSize.call(this)
    }
    
    getPosition() {
        return Widget.prototype.getPosition.call(this);
    }

    setPosition(x, y, w, h) {
        Widget.prototype.setPosition.call(this, x, y, w, h);
    }
    
    mouseDownHandler(){
    }
    mouseUpHandler(){
    }
    
    render(){
        
    }
    
    doubleClickHandler(e){
        if(e.target != this.dom || !SmartDashboard.editable) return;
        this.setEditing(!this.editing);
        e.preventDefault();
        return false;
    }
    
    setEditing(flag){
        this.editing = flag;
        this.dom.dataset.editing = "" + flag;
        SmartDashboard.resetClass("not-editing");
        if(flag){
            for(var item of SmartDashboard.widgets){
                if(item != this && item.editing)
                    item.setEditing(false);
            }
            
            var el = this.dom.parentElement;
            do {
                el.classList.add("not-editing");
                el = el.parentElement;
            } while(el != document.body && el != null);
        }
        if(SmartDashboard.editable){
            this._setEditable(!flag);
        }
    }
    
    getChildren(){
        return Array.prototype.map.call(this.dom.children, function(el){
            return el.parentWidget;
        });
    }
    
    addChild(child, positionIsCorrect){
        var childPos = child.getPosition();
        var thisPos = this.getPosition();
        if(!positionIsCorrect){
            childPos.x -= thisPos.x;
            childPos.y -= thisPos.y;
            if(childPos.x < 0) childPos.x = 0;
            if(childPos.y < 0) childPos.y = 0;
        }
        child.dom.remove();
        child.parent = this;
        this.dom.appendChild(child.dom);
        child.setPosition(childPos.x, childPos.y, childPos.w, childPos.h);
    }
    
    removeChild(child, positionIsCorrect){
        var childPos = child.getPosition();
        var thisPos = this.getPosition();
        childPos.x += thisPos.x;
        childPos.y += thisPos.y;
        child.dom.remove();
        if(this.parent){
            this.parent.dom.appendChild(child.dom);
            child.parent = this.parent;
        } else {
            document.querySelector("#dashboard").appendChild(child.dom);
            delete child.parent;
        }
        child.setPosition(childPos.x, childPos.y, childPos.w, childPos.h);
        this.restoreSaveFromParent(child);
    }
    
    getPropertiesFromParent(win, self){
        
    }
    
    restoreSaveFromParent(self){
        
    }
    
    destroy(){
        
    }
}
global.Container = Container;
SmartDashboard.registerWidget(Container, "container");