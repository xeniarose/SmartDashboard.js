#include <windows.h>
#include <tchar.h>
#include <stdlib.h>
#include <unistd.h>
#include <string>
#include "SPLASH.h"
#include <direct.h>


static BOOL sdIsUp = false;

BOOL CALLBACK enumWindowsProc(HWND hWnd, LPARAM lParam){
    int length = ::GetWindowTextLength( hWnd );
    if(0 == length) {
        return TRUE;
    }
    
    TCHAR buffer[length + 1];
    memset( buffer, 0, ( length + 1 ) * sizeof( TCHAR ) );
    
    GetWindowText( hWnd, buffer, length + 1 );
    
    TCHAR toFind[] = _T("SmartDashboard.js");
    
    if (_tcscmp(buffer, toFind) == 0 && IsWindowVisible(hWnd)){
        sdIsUp = true;
    }

    return TRUE;
}

int main(){
    SPLASH mySplash;
    mySplash.Init(42);
    mySplash.Show();
    
    
    STARTUPINFO info={sizeof(info)};
    PROCESS_INFORMATION processInfo;
    
    char result[MAX_PATH];
    GetModuleFileName(NULL, result, MAX_PATH);
    std::string currentExe(result);
    std::string currentDir = currentExe.substr(0, currentExe.find_last_of("\\"));
    
    std::string nwLocation;
    nwLocation += currentDir;
    nwLocation += "\\app\\nw.exe";
    
    char* nwLocationChar = new char[nwLocation.length() + 1];
    memcpy(nwLocationChar, nwLocation.c_str(), nwLocation.length() + 1);
    
    std::string cmdLine = "\"";
    cmdLine += nwLocation;
    cmdLine += "\"";
    
    if(strstr(GetCommandLine(), "--ds-mode") != NULL){
        cmdLine += " --ds-mode";
    }
    
    char* cmdLineChar = new char[cmdLine.length() + 1];
    memcpy(cmdLineChar, cmdLine.c_str(), cmdLine.length() + 1);
    
    if (CreateProcess(nwLocationChar, cmdLineChar, NULL, NULL, TRUE, 0, NULL, NULL, &info, &processInfo)) {
        while(!sdIsUp){
            EnumWindows(enumWindowsProc, 0);
            Sleep(10);
        }
        mySplash.Hide();
        
        WaitForSingleObject(processInfo.hProcess, INFINITE);
        CloseHandle(processInfo.hProcess);
        CloseHandle(processInfo.hThread);
    }
}

LRESULT CALLBACK WndProc(HWND, UINT, WPARAM, LPARAM){
    MSG msg;
    while (GetMessage(&msg, NULL, 0, 0)) {
        TranslateMessage(&msg);
        DispatchMessage(&msg);
    }

    return (int) msg.wParam;
}