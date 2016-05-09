// SPLASH.h: interface for the SPLASH class.
//
//////////////////////////////////////////////////////////////////////

#pragma once

class SPLASH  
{
public:
	void Hide();
	void Show();
	void Init(int resid);
    BOOL SHOWING;
	SPLASH();
	virtual ~SPLASH();

private:
	UINT TimerID;
	HWND hSplashWnd;
    
};
