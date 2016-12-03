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
                SmartDashboard.showAbout();
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
            label: "Restart",
            click: function(){
                SmartDashboard.saveData(function() {
                    SmartDashboard.restart();
                });
            }
        },
        {
            label: "Exit",
            click: function(){
                SmartDashboard.onExit();
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
                SmartDashboard.switchProfile(null);
            }
        },
        {
            label: "Open Layout",
            click: function(){
                SmartDashboard.showFileDialog("open", function(file) {
                    SmartDashboard.switchProfile(file);
                });
            }
        },
        {
            label: "Save Layout",
            click: function(){
                SmartDashboard.saveData();
            }
        }
    ],
    "exit": [
        {
            label: "Restart",
            click: function(){
                SmartDashboard.saveData(function() {
                    SmartDashboard.restart();
                });
            }
        },
        {
            label: "Exit",
            click: function(){
                SmartDashboard.onExit();
            }
        }
    ]
};

global.ContextMenu = ContextMenu;