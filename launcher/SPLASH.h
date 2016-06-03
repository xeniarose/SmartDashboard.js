#pragma once

class SPLASH {
public:
	void Hide();
	SPLASH();
	virtual ~SPLASH();
    void Init(bool showProgress);
protected:
    HWND hSplashWnd;
    HWND hwndPB;
};
