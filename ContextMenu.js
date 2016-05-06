var ContextMenu = {};

ContextMenu.append = function(menu, spec, params){
    if(typeof spec == "string"){
        spec = ContextMenu.defs[spec];
        params = params || [];
        for(var param of params){
            spec[param.item][param.name] = param.value;
        }
    }
    for(var item of spec){
        var props = {};
        if(typeof item == "string" && item.length > 0 && item[0] == "-"){
            props.type = "separator";
        } else {
            props = item;
        }
        menu.append(new gui.MenuItem(props));
    }
    return menu;
}

ContextMenu.create = function(spec, params){
    return ContextMenu.append(new gui.Menu(), spec, params);
}

ContextMenu.defs = {
    "main": [
        {
            label: "SmartDashboard.js " + gui.App.manifest.version,
            enabled: false
        },
        {
            label: "About",
            click: function(){
                gui.Window.open('about.html', {
                    position: 'center'
                });
            }
        },
        {
            label: "Restart",
            click: function(){
                SmartDashboard.saveData();
                SmartDashboard.restart();
            }
        },
        {
            label: "Exit",
            click: function(){
                SmartDashboard.saveData();
                window.close();
            }
        },
        {
            label: "DevTools",
            click: function(){
                gui.Window.get().showDevTools();
            }
        },
        {
            label: "Options",
            click: function () {
                SmartDashboard.showOptions();
            }
        },
        "---",
        {
            label: "New"
        },
        {
            label: "Editable",
            type: "checkbox",
            click: function () {
                SmartDashboard.setEditable(this.checked);
            }
        }
    ],
    "profiles": [
        "---",
        {
            label: "New Layout",
            click: function(){
                var name = prompt("Layout name:");
                if(name == null) return;
                name = name.replace(/[<>:"\/\\\|\?\*]/g, "").trim();
                if(name == "") return;
                SmartDashboard.switchProfile(name);
            }
        },
        {
            label: "Open Layouts Folder",
            click: function(){
                gui.Shell.openItem(process.cwd() + "/layouts");
            }
        }
    ]
};