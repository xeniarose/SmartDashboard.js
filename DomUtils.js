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
        opt.textContent = "default";
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
}

global.DomUtils = DomUtils;