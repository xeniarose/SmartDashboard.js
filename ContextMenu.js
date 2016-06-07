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
                SmartDashboard.saveData();
                SmartDashboard.restart();
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
                SmartDashboard.prompt("Layout name:", function(name){
                    if(name == null) return;
                    name = name.replace(/[<>:"\/\\\|\?\*]/g, "").trim();
                    if(name == "") return;
                    SmartDashboard.switchProfile(name);
                });
            }
        },
        {
            label: "Copy Current Layout",
            click: function(){
                var layouts = FileUtils.getLayouts();
                layouts.splice(layouts.indexOf(SmartDashboard.options.profile), 1);
                SmartDashboard.prompt("Copy to:", "", function(name){
                    if(name == null) return;
                    name = name.replace(/[<>:"\/\\\|\?\*]/g, "").trim();
                    if(name == "" || name == SmartDashboard.options.profile) return;
                    
                    function complete(){
                        SmartDashboard.saveData();
                        FileUtils.copyLayout(SmartDashboard.options.profile, name);
                        SmartDashboard.switchProfile(name);
                    }
                    
                    if(FileUtils.getLayouts().indexOf(name) > -1){
                        SmartDashboard.confirm("Overwrite layout " + name + "?", function(res){
                            if(res){
                                complete();
                            }
                        });
                    } else {
                        complete();
                    }
                }, false, layouts);
            }
        },
        {
            label: "Delete Current Layout",
            click: function(){
                SmartDashboard.confirm("Delete layout " + SmartDashboard.options.profile + "?", function(res){
                    if(!res){
                        return;
                    }
                    
                    while(SmartDashboard.widgets.length > 0){
                        SmartDashboard.removeWidget(SmartDashboard.widgets[0]);
                    }
                    FileUtils.deleteLayout(SmartDashboard.options.profile);
                    if(SmartDashboard.options.profile != "default"){
                        SmartDashboard.switchProfile("default", true);
                    }
                });
            }
        },
        {
            label: "Open Layouts Folder",
            click: function(){
                gui.Shell.openExternal(FileUtils.getDataLocations().layouts);
            }
        }
    ],
    "exit": [
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
                SmartDashboard.onExit();
            }
        }
    ]
};

global.ContextMenu = ContextMenu;