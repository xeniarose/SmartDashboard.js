// SPLASH.cpp: implementation of the SPLASH class.
//
//////////////////////////////////////////////////////////////////////

#include "windows.h"
#include "SPLASH.h"

//////////////////////////////////////////////////////////////////////
// Construction/Destruction
//////////////////////////////////////////////////////////////////////

SPLASH::SPLASH()
{

}

SPLASH::~SPLASH()
{
 DestroyWindow(hSplashWnd);
}

void SPLASH::Init(int resid)
{
    
    RECT desktopRect;
    GetClientRect(GetDesktopWindow(), &desktopRect);
    
 hSplashWnd=CreateWindowEx(WS_EX_STATICEDGE,"STATIC","",
     WS_POPUP|WS_DLGFRAME|SS_BITMAP,desktopRect.right/2-150,desktopRect.bottom/2-20,300,300,NULL,NULL,GetModuleHandle(NULL),NULL);
 SendMessage(hSplashWnd,STM_SETIMAGE,IMAGE_BITMAP,(LPARAM)LoadBitmap(GetModuleHandle(NULL),MAKEINTRESOURCE(resid)));
    
    LONG lStyle = GetWindowLong(hSplashWnd, GWL_STYLE);
    lStyle &= ~(WS_CAPTION | WS_THICKFRAME | WS_MINIMIZE | WS_MAXIMIZE | WS_SYSMENU);
    SetWindowLong(hSplashWnd, GWL_STYLE, lStyle);
    
    LONG lExStyle = GetWindowLong(hSplashWnd, GWL_EXSTYLE);
    lExStyle &= ~(WS_EX_DLGMODALFRAME | WS_EX_CLIENTEDGE | WS_EX_STATICEDGE);
    SetWindowLong(hSplashWnd, GWL_EXSTYLE, lExStyle);
    
 this->SHOWING = FALSE;
}

void SPLASH::Show()
{
  //get size of hSplashWnd (width and height)
  //int x,y;
  //int tx,ty;
  //HDWP windefer;
  //RECT rect;
  //GetClientRect(hSplashWnd,&rect);
  //x=rect.right;y=rect.bottom;
    
    

  //  tx = desktopRect.right/2;
  //  ty= desktopRect.bottom/2;


  //windefer=BeginDeferWindowPos(1);
  //DeferWindowPos(windefer,hSplashWnd,HWND_NOTOPMOST,tx,ty,50,50,SWP_NOSIZE|SWP_SHOWWINDOW|SWP_NOZORDER);
  //EndDeferWindowPos(windefer);

  ShowWindow(hSplashWnd,SW_SHOWNORMAL);
  UpdateWindow(hSplashWnd);
  this->SHOWING = TRUE;
}

void SPLASH::Hide()
{
  ShowWindow(hSplashWnd,SW_HIDE);
  this->SHOWING = FALSE;
}

