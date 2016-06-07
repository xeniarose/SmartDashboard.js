#include "windows.h"
#include "SPLASH.h"
#include "Commctrl.h"
#pragma comment(linker,"/manifestdependency:\"type='win32' name='Microsoft.Windows.Common-Controls' version='6.0.0.0' processorArchitecture='*' publicKeyToken='6595b64144ccf1df' language='*'\"")

SPLASH::SPLASH() {
}

SPLASH::~SPLASH() {
    DestroyWindow(hSplashWnd);
}

void SPLASH::Init(bool showProgress) {
    RECT desktopRect;
    GetClientRect(GetDesktopWindow(), &desktopRect);
    
    hSplashWnd = CreateWindowEx(WS_EX_STATICEDGE, "STATIC", "",
                                WS_POPUP | WS_DLGFRAME | SS_BITMAP,
                                desktopRect.right / 2 - 150,
                                (desktopRect.bottom - 40) / 2 - 20,
                                300, 300, NULL, NULL,
                                GetModuleHandle(NULL), NULL);
    SendMessage(hSplashWnd, STM_SETIMAGE, IMAGE_BITMAP, 
                (LPARAM) LoadBitmap(GetModuleHandle(NULL),
                                    MAKEINTRESOURCE(showProgress ? 43 : 42)));
    
    LONG lStyle = GetWindowLong(hSplashWnd, GWL_STYLE);
    lStyle &= ~(WS_CAPTION | WS_THICKFRAME | WS_MINIMIZE | WS_MAXIMIZE | WS_SYSMENU);
    SetWindowLong(hSplashWnd, GWL_STYLE, lStyle);
    
    LONG lExStyle = GetWindowLong(hSplashWnd, GWL_EXSTYLE);
    lExStyle &= ~(WS_EX_DLGMODALFRAME | WS_EX_CLIENTEDGE | WS_EX_STATICEDGE);
    SetWindowLong(hSplashWnd, GWL_EXSTYLE, lExStyle);
    SetWindowPos(hSplashWnd, NULL, 0, 0, 300, showProgress ? 50 : 40,
                 SWP_FRAMECHANGED | SWP_NOMOVE | SWP_NOZORDER | SWP_NOOWNERZORDER);
    
    HANDLE icon = LoadImage(GetModuleHandle(NULL), MAKEINTRESOURCE(41), IMAGE_ICON, 128, 128, 0);
    SendMessage(hSplashWnd, WM_SETICON, ICON_BIG, (LPARAM) icon);
    SendMessage(hSplashWnd, WM_SETICON, ICON_SMALL, (LPARAM) icon);
    
    if(showProgress) {
        InitCommonControls();
        RECT rcClient;
        int cyVScroll = 10;
        GetClientRect(hSplashWnd, &rcClient); 
        hwndPB = CreateWindowEx(0, PROGRESS_CLASS, (LPTSTR) NULL, 
                                WS_CHILD | WS_VISIBLE, rcClient.left, 
                                rcClient.bottom - cyVScroll, 
                                rcClient.right, cyVScroll, 
                                hSplashWnd, (HMENU) 0, GetModuleHandle(NULL), NULL);
        SendMessage(hwndPB, (UINT) PBM_SETRANGE, 0, MAKELPARAM(0, 1000));
    } else {
        hwndPB = NULL;
    }
    
    ShowWindow(hSplashWnd, SW_SHOWNORMAL);
    UpdateWindow(hSplashWnd);
}

void SPLASH::SetProgress(int percent){
    if(hwndPB){
        SendMessage(hwndPB, (UINT) PBM_SETPOS, percent * 10, 0);
    }
}

void SPLASH::Hide() {
    ShowWindow(hSplashWnd, SW_HIDE);
    ShowWindow(hSplashWnd, SW_HIDE);
    UpdateWindow(hSplashWnd);
}