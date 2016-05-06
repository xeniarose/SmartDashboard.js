class FileUtils {
    static getThemeLocation(){
        return "themes/" + SmartDashboard.options.theme + ".css";
    }
    
    static getDataLocations(){
        return {
            themes: process.cwd() + "/themes/",
            plugins: process.cwd() + "/plugins/",
            layouts: process.cwd() + "/layouts/"
        };
    }
    
    static forAllFilesInDirectory(dir, cb){
        var normalizedPath = dir;
        fs.readdirSync(normalizedPath).forEach(function (file) {
            cb(file);
        });
    }
    
    static isDefaultDashboard(){
        var dsIni = fs.readFileSync("C:\\Users\\Public\\Documents\\FRC\\FRC DS Data Storage.ini").toString();
        var line = dsIni.match(/DashboardCmdLine[^\r\n]*\r\n/);
        return line != null && line[0].indexOf("ds.bat") > -1;
    }
    
    static setDefaultDashboard(isSdJs){
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
}

global.FileUtils = FileUtils;