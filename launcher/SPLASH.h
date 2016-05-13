#pragma once

class SPLASH {
public:
	void Hide();
	SPLASH();
	virtual ~SPLASH();
    void Init();
protected:
    HWND hSplashWnd;
};
