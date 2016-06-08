class DomUtils {
    static resetClass(className){
        var resetContainers = document.querySelectorAll("." + className);
        for(var i = 0; i < resetContainers.length; i++){
            resetContainers[i].classList.remove(className);
        }
    }
    
    static renderWidgetSelect(select) {
        select.innerHTML = "";
        for (var widgetName in SmartDashboard.widgetTypes) {
            if (!SmartDashboard.widgetTypes.hasOwnProperty(widgetName)) continue;
            var widget = SmartDashboard.widgetTypes[widgetName];
            if (select.hasAttribute("data-filter") && widget.dataType.indexOf(select.getAttribute("data-filter")) == -1) continue;
            
            var opt = document.createElement("option");
            opt.value = widgetName;
            opt.textContent = widgetName;
            select.appendChild(opt);
        }
    }
    
    static renderThemeSelect(select) {
        select.innerHTML = "";
        var opt = document.createElement("option");
        opt.value = "__default__";
        opt.textContent = "Minimal";
        select.appendChild(opt);
        try {
            FileUtils.forAllFilesInDirectory(FileUtils.getDataLocations().themes, function (file) {
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
    
    static renderPluginList(list) {
        list.innerHTML = "";
        for (var plugin of SmartDashboard.plugins) {
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
    
    static renderVariableEntries(){
        var entries = SmartDashboard.entriesTree();
        if(SmartDashboard._entries && JSON.stringify(entries) == JSON.stringify(SmartDashboard._entries)){
            return;
        }
        var datalist = document.querySelector("#entry-search-items");
        datalist.innerHTML = "";
        var entriesRaw = ntcore.getAllEntries();
        entriesRaw.sort();
        entriesRaw.forEach(function(el){
            var opt = document.createElement("option");
            opt.value = el.substring(1); // remove leading slash, which screws up type detection
            datalist.appendChild(opt);
        });
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
                btn.classList.add("fa");
                btn.classList.add("fa-plus");
                a.textContent = key;
                var nameRaw = parentPath + key;
                var type = WidgetUtils.getTypeForEntry(nameRaw);
                a.href = "nt:" + nameRaw;
                a.dataset.path = nameRaw;
                a.dataset.type = type;
                a.setAttribute("title", nameRaw + "\n" + type.substring(0,1).toUpperCase() + type.substring(1));
                btn.onclick = function(){
                    if(this.parentElement.classList.contains("open")){
                        this.parentElement.classList.remove("open");
                        this.classList.remove("fa-minus");
                        this.classList.add("fa-plus");
                    } else {
                        this.parentElement.classList.add("open");
                        this.classList.remove("fa-plus");
                        this.classList.add("fa-minus");
                    }
                };
                a.onclick = function(e){
                    e.preventDefault();
                    var nameRaw = this.dataset.path;
                    
                    var widgetType = this.dataset.type;
                    
                    WidgetUtils.defaultNewWidget(widgetType, nameRaw);
                };
                a.ondragstart = function(e){
                    e.dataTransfer.clearData();
                    e.dataTransfer.setData("text/plain", this.dataset.path);
                    e.dataTransfer.setData("application/sd.varname", this.dataset.path);
                    e.dataTransfer.setData("application/sd.vartype", this.dataset.type);
                    
                    var widgetClass = WidgetUtils.getDefaultWidget(this.dataset.type).widget;
                    var nameRaw = this.dataset.path;
                    var dummyWidget = new widgetClass(nameRaw.substring(0, nameRaw.lastIndexOf("/")),
                                                      nameRaw.substring(nameRaw.lastIndexOf("/") + 1));
                    var dashboard = document.querySelector("#dashboard");
                    dashboard.appendChild(dummyWidget.dom);
                    dummyWidget.setEditable(true);
                    
                    DomUtils.inlineStyles(dummyWidget.dom);
                    var width = dummyWidget.dom.offsetWidth + 5;
                    var height = dummyWidget.dom.offsetHeight + 5;
                    dummyWidget.dom.remove();
                    
                    delete dummyWidget.dom.dataset["label"];
                    dummyWidget.dom.removeAttribute("class");
                    
                    dummyWidget.dom.setAttribute("xmlns", "http://www.w3.org/1999/xhtml");
                    var data = '<svg xmlns="http://www.w3.org/2000/svg" width="' + width + '" height="' + height + '">' +
                        '<foreignObject width="100%" height="100%">' +
                        (new XMLSerializer).serializeToString(dummyWidget.dom) +
                        '</foreignObject>' +
                        '</svg>';
                    
                    var img = new Image();
                    img.src = "data:image/svg+xml;utf8," + data;
                    window.data = data;
                    dummyWidget.destroy();
                    e.dataTransfer.setDragImage(img, 0, 0);
                };
                el.appendChild(btn);
                el.appendChild(a);
                
                if(pathBuild == "" && key == "Preferences"){
                    var edit = document.createElement("button");
                    edit.textContent = "Edit";
                    edit.classList.add("prefs-edit-btn");
                    edit.onclick = function(){
                        SmartDashboard.showRobotPrefs();
                    };
                    el.appendChild(edit);
                }
                
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
    
    static inlineStyles(el){
        var cs = window.getComputedStyle(el);
        for(var i = 0; i < cs.length; i++){
            el.style[cs[i]] = cs[cs[i]];
        }
        for(var i = 0; i < el.children.length; i++){
            this.inlineStyles(el.children[i]);
        }
    }
    
    static inlineAndClone(el){
        var cs = window.getComputedStyle(el);
        var cloneEl = el.cloneNode();
        for(var i = 0; i < cs.length; i++){
            cloneEl.style[cs[i]] = cs[cs[i]];
        }
        for(var i = 0; i < el.childNodes.length; i++){
            if(el.childNodes[i] instanceof Element){
                var cloneChild = this.inlineAndClone(el.childNodes[i]);
                cloneEl.appendChild(cloneChild);
            } else {
                cloneEl.appendChild(el.childNodes[i].cloneNode());
            }
        }
        return cloneEl;
    }
    
    static makeWidgetImage(widget){
        var cloneDom = this.inlineAndClone(widget.dom);
        var width = widget.dom.offsetWidth + 5;
        var height = widget.dom.offsetHeight + 5;
        var ds = cloneDom.dataset;
        for(var key in ds){
            if(ds.hasOwnProperty(key)){
                delete ds[key];
            }
        }
        cloneDom.style.top = cloneDom.style.left = "0";
        cloneDom.removeAttribute("class");
        cloneDom.setAttribute("xmlns", "http://www.w3.org/1999/xhtml");
        var data = '<svg xmlns="http://www.w3.org/2000/svg" width="' + width + '" height="' + height + '">' +
            '<foreignObject width="100%" height="100%">' +
            (new XMLSerializer).serializeToString(cloneDom) +
            '</foreignObject>' +
            '</svg>';
        
        return "data:image/svg+xml;utf8," + data;
    }
    
    static registerDocumentEventHandlers(){
        document.querySelector("#entries").onmouseover = DomUtils.renderVariableEntries;
        document.querySelector("#entry-search").onkeyup = function(e){
            if(e.which != 13) return;
            
            var nameRaw = this.value;
            if(nameRaw.trim() == "") return;
            this.blur();
            this.value = "";
            
            var isVariable = false, entries = ntcore.getAllEntries();
            for(var entry of entries){
                if(entry == nameRaw || entry == "/" + nameRaw || entry.startsWith("/" + nameRaw + "/")){
                    isVariable = true;
                    break;
                }
            }
            
            var allTypes = ["number", "string", "boolean", "array", "object", "raw"];
            
            if(isVariable){
                var widgetType = WidgetUtils.getTypeForEntry(nameRaw);
                WidgetUtils.defaultNewWidget(widgetType, nameRaw);
            } else {
                SmartDashboard.prompt("Data type for new variable:", "", function(val){
                    if(val){
                        val = val.toLowerCase();
                        if(allTypes.indexOf(val) < 0){
                            val = "object";
                        }
                        WidgetUtils.defaultNewWidget(val, nameRaw);
                    }
                }, false, allTypes);
            }
        };
        document.querySelector("#entry-search").onblur = function(){
            this.value = "";
        }
        
        var dashboard = document.querySelector("#dashboard");
       
        dashboard.onmousemove = WidgetUtils.forwardEvent.bind(WidgetUtils, "onmousemove");
        dashboard.onmouseup = WidgetUtils.forwardEvent.bind(WidgetUtils, "onmouseup");
        
        dashboard.ondblclick = function(e){
            if(e.target != this) return;
            for(var item of SmartDashboard.widgets){
                if(item != this && item.editing)
                    item.setEditing(false);
            }
            DomUtils.resetClass("not-editing");
        };

        dashboard.oncontextmenu = function (ev) {
            if ((ev.target.tagName.toLowerCase() == "input" || ev.target.tagName.toLowerCase() == "textarea")
                    && !SmartDashboard.editable) {
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
        };
        
        dashboard.ondragover = function(e){
            e.preventDefault();
            e.dataTransfer.dropEffect = "copy";
        };
        
        dashboard.ondrop = function(e){
            var dt = e.dataTransfer;
            WidgetUtils.defaultNewWidget(dt.getData("application/sd.vartype"),
                    dt.getData("application/sd.varname"),
                    {left: e.clientX + document.querySelector("#dashboard").scrollLeft,
                     top: e.clientY + document.querySelector("#dashboard").scrollTop});
        };
        
        document.onkeyup = function(e){
            if(e.ctrlKey && (e.which == "e".charCodeAt() || e.which == "E".charCodeAt())){
                SmartDashboard.setEditable(!SmartDashboard.editable);
                e.preventDefault();
                return false;
            }
        };
        
        document.querySelector("#open-profile").onclick = function(e){
            var menu = new gui.Menu();
            
            var profiles = FileUtils.getLayouts();
            
            var menuSpec = profiles.map(function(item){
                return {
                    label: item,
                    click: (function(item){
                        SmartDashboard.switchProfile(item);
                    }).bind(DomUtils, item)
                };
            }).concat(ContextMenu.defs.profiles);
            
            ContextMenu.create(menuSpec).popup(e.target.offsetLeft, e.target.offsetTop + e.target.offsetHeight);
        };
        
        document.querySelector("#error-screen button.restart").onclick = function(){
            SmartDashboard.restart();
        };
        
        document.querySelector("#error-screen button.close").onclick = function(){
            document.querySelector("#error-screen").classList.remove("active");
            document.querySelector(".dialog-bg").classList.remove("active");
            SmartDashboard.exitable = true;
        };
        
        document.querySelector("#control-about").onclick = function(){
            SmartDashboard.showAbout();
        };
        
        document.querySelector("#control-options").onclick = function(){
            SmartDashboard.showOptions();
        };
        
        document.querySelector("#control-exit").onclick = function(){
            SmartDashboard.onExit();
        };
        document.querySelector("#control-exit").oncontextmenu = function(e){
            ContextMenu.create("exit").popup(e.target.offsetLeft, e.target.offsetTop + e.target.offsetHeight);
            e.preventDefault();
            return false;
        }
        
        document.querySelector("#control-editable").onclick = function(){
            SmartDashboard.setEditable(!SmartDashboard.editable);
        };
        
        document.querySelector("#control-new").onclick = function(e){
            SmartDashboard.newMenu.popup(e.target.offsetLeft, e.target.offsetTop + e.target.offsetHeight);
        };
        document.querySelector("#control-new").oncontextmenu = function(e){
            this.onclick(e);
            e.preventDefault();
            return false;
        }
    }
    
    static getCssRules(styleContent) {
        var doc = document.implementation.createHTMLDocument(""),
            styleElement = document.createElement("style");
        styleElement.textContent = styleContent;
        doc.body.appendChild(styleElement);
        return styleElement.sheet.cssRules;
    };
    
    static openBlurredDialog(id){
        nw.Window.get().capturePage(function(res){
            var bg = document.querySelector(".dialog-bg-inner");
            if(!bg.parentElement.classList.contains("active"))
                bg.style.background = "url(" + res + ")";
            bg.parentElement.classList.add("active");
            document.querySelector(id).classList.add("active");
        });
    }
    
    static checkHoverOnTrash(e, widgetDragging){
        var x = e.clientX;
        var y = e.clientY;
        var trash = document.querySelector(".widget-trash");
        var rect = trash.getBoundingClientRect();
        if(widgetDragging && x > rect.left && x < rect.right && y > rect.top && y < rect.bottom){
            widgetDragging.remove();
        }
    }
    
    static showUpdateButton(elem){
        var updateButton = document.querySelector(".widget-update");
        var elemBB = elem.getBoundingClientRect();
        var scrollTop = document.querySelector("#dashboard").scrollTop;
        var scrollLeft = document.querySelector("#dashboard").scrollLeft;
        var bodyHeight = document.body.offsetHeight;
        
        updateButton.top = "-1000px";
        updateButton.left = "-1000px";
        
        var left = elemBB.left + elemBB.width - updateButton.offsetWidth;
        var top = elemBB.top + elemBB.height;
        if(top + updateButton.offsetHeight > bodyHeight){
            top = elemBB.top - updateButton.offsetHeight;
        }
        updateButton.style.top = top + "px";
        updateButton.style.left = left + "px";
        updateButton.classList.add("active");
    }
    
    static hideUpdateButton(){
        document.querySelector(".widget-update").classList.remove("active");
    }
}

global.DomUtils = DomUtils;