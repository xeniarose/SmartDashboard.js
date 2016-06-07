#pragma once

class SPLASH {
public:
	void Hide();
	SPLASH();
	virtual ~SPLASH();
    void Init(bool showProgress);
    void SetProgress(int percent);

    HWND hSplashWnd;
    HWND hwndPB;
};
