#include "windows.h"
#include "SPLASH.h"


SPLASH::SPLASH() {
}

SPLASH::~SPLASH() {
    DestroyWindow(hSplashWnd);
}

void SPLASH::Init() {
    RECT desktopRect;
    GetClientRect(GetDesktopWindow(), &desktopRect);
    
    hSplashWnd=CreateWindowEx(WS_EX_STATICEDGE,"STATIC","",WS_POPUP|WS_DLGFRAME|SS_BITMAP,desktopRect.right/2-150,(desktopRect.bottom-40)/2-20,300,300,NULL,NULL,GetModuleHandle(NULL),NULL);
    SendMessage(hSplashWnd,STM_SETIMAGE,IMAGE_BITMAP,(LPARAM)LoadBitmap(GetModuleHandle(NULL),MAKEINTRESOURCE(42)));
    
    LONG lStyle = GetWindowLong(hSplashWnd, GWL_STYLE);
    lStyle &= ~(WS_CAPTION | WS_THICKFRAME | WS_MINIMIZE | WS_MAXIMIZE | WS_SYSMENU);
    SetWindowLong(hSplashWnd, GWL_STYLE, lStyle);
    
    LONG lExStyle = GetWindowLong(hSplashWnd, GWL_EXSTYLE);
    lExStyle &= ~(WS_EX_DLGMODALFRAME | WS_EX_CLIENTEDGE | WS_EX_STATICEDGE);
    SetWindowLong(hSplashWnd, GWL_EXSTYLE, lExStyle);
    SetWindowPos(hSplashWnd, NULL, 0,0,300,40, SWP_FRAMECHANGED | SWP_NOMOVE | SWP_NOZORDER | SWP_NOOWNERZORDER);
    
    HANDLE icon = LoadImage(GetModuleHandle(NULL), MAKEINTRESOURCE(41), IMAGE_ICON, 128, 128, 0);
    SendMessage(hSplashWnd, WM_SETICON, ICON_BIG, (LONG) icon);
    SendMessage(hSplashWnd, WM_SETICON, ICON_SMALL, (LONG) icon);
    
    ShowWindow(hSplashWnd,SW_SHOWNORMAL);
    UpdateWindow(hSplashWnd);
}

void SPLASH::Hide() {
    ShowWindow(hSplashWnd, SW_HIDE);
    ShowWindow(hSplashWnd, SW_HIDE);
    UpdateWindow(hSplashWnd);
}