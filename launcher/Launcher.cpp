#include <windows.h>
#include <tchar.h>
#include <stdlib.h>
#ifndef _MSC_VER
#include <unistd.h>
#endif
#include <string>
#include "SPLASH.h"
#include <direct.h>
#include <psapi.h>
#include <stdio.h>
#include <shellapi.h>
#include <iostream>
#include <fstream>
#include <string>

#include "miniz.c"

static BOOL sdIsUp = false;
static SPLASH mySplash;

BOOL CALLBACK enumWindowsProc(HWND hWnd, LPARAM lParam) {
    int length = ::GetWindowTextLength(hWnd);
    if(0 == length) {
        return TRUE;
    }
    
    TCHAR* buffer = (TCHAR*) malloc(sizeof(TCHAR) * (length + 1));
    memset(buffer, 0, (length + 1) * sizeof(TCHAR));
    
    GetWindowText(hWnd, buffer, length + 1);
    
    TCHAR toFind[] = _T("SmartDashboard.js");
    
    if (_tcscmp(buffer, toFind) == 0 && IsWindowVisible(hWnd)){
        /*DWORD pid;
        GetWindowThreadProcessId(hWnd, &pid);
        HANDLE Handle = OpenProcess(
            PROCESS_QUERY_INFORMATION | PROCESS_VM_READ,
            FALSE,
            pid
        );
        if (Handle) {
            TCHAR Buffer[MAX_PATH];
            if (GetModuleFileNameEx(Handle, 0, Buffer, MAX_PATH)) {
                TCHAR nwName[] = _T("nw.exe");
                if(_tcsstr(Buffer, nwName) != 0) {
                    sdIsUp = true;
                }
            } else {
            }
            CloseHandle(Handle);
        } else {
        }*/
        sdIsUp = true;
    }

    return TRUE;
}

static int processedSize = 0;
static int totalSize = 0;
static size_t ZipWriteCallback(void *pOpaque, mz_uint64 ofs, const void *pBuf, size_t n) {
    processedSize += n;
    int percent = (int) (((float) processedSize) * 90 / totalSize + 10);
    mySplash.SetProgress(percent);
    
    (void) ofs;
    return MZ_FWRITE(pBuf, 1, n, (MZ_FILE*) pOpaque);
}

void MakeAppFolder(std::string base, char* dir) {
    std::string name;
    name += base;
    name += dir;
    _mkdir(name.c_str());
}

std::string failReason;
bool ExtractUpdate(){ 
    std::ofstream file;
    file.open("update-log.txt");
    std::streambuf* sbuf = std::cout.rdbuf();
    std::cout.rdbuf(file.rdbuf());
    
    std::ifstream ifs("update.sd");
    std::string content((std::istreambuf_iterator<char>(ifs)),
                        (std::istreambuf_iterator<char>()));
    std::cout << "Update location: ";
    std::cout << content.c_str();
    std::cout << "\n";
    std::cout << "Running taskkill\n";
    system("taskkill /f /t /im nw.exe");
    
    std::cout << "Waiting\n";
    for (int i = 2; i <= 10; i+=2) {
        Sleep(1000);
        mySplash.SetProgress(i);
    }
    
    std::cout << "Opening zip\n";
    mz_zip_archive updateZip;
    memset(&updateZip, 0, sizeof(updateZip));
    if (!mz_zip_reader_init_file(&updateZip, "update.zip.dl", 0)) {
        std::cout << "failed\n";
        failReason = "Failed to open update.zip";
        return false;
    }
    
    std::cout << "Making folders\n";
    
    MakeAppFolder(content, "");
    MakeAppFolder(content, "app");
    MakeAppFolder(content, "app\\locales");
    
    int numFiles = (int) mz_zip_reader_get_num_files(&updateZip);
    for (int i = 0; i < numFiles; i++) {
        if (mz_zip_reader_is_file_a_directory(&updateZip, i)) {
            continue;
        }
        
        mz_zip_archive_file_stat file_stat;
        if (!mz_zip_reader_file_stat(&updateZip, i, &file_stat)) {
            mz_zip_reader_end(&updateZip);
            failReason = "Failed to read zip entry: ";
            failReason += i;
            return false;
        }
        
        totalSize += file_stat.m_uncomp_size;
    }
    
    for (int i = 0; i < numFiles; i++) {
        if (mz_zip_reader_is_file_a_directory(&updateZip, i)) {
            continue;
        }
        
        mz_zip_archive_file_stat file_stat;
        if (!mz_zip_reader_file_stat(&updateZip, i, &file_stat)) {
            mz_zip_reader_end(&updateZip);
            failReason = "Failed to read zip entry: ";
            failReason += i;
            return false;
        }
        
        std::cout << "Filename: " << file_stat.m_filename << "\n";
        std::string name;
        name += content;
        name += file_stat.m_filename;
        mz_bool status;
        MZ_FILE *pFile;
        pFile = MZ_FOPEN(name.c_str(), "wb");
        if (!pFile) {
            std::cout << "Failed to open file\n";
            mz_zip_reader_end(&updateZip);
            failReason = "Failed to open file for writing: ";
            failReason += name;
            return false;
        }
        status = mz_zip_reader_extract_to_callback(&updateZip, i, ZipWriteCallback, pFile, 0);
        if (MZ_FCLOSE(pFile) == EOF) {
            std::cout << "Failed to close file\n";
            mz_zip_reader_end(&updateZip);
            failReason = "Failed to write file: ";
            failReason += name;
            return false;
        }
        if (status) {
            std::cout << "Done\n";
        } else {
            mz_zip_reader_end(&updateZip);
            std::cout << "Failed to write file\n";
            failReason = "Failed to write file: ";
            failReason += name;
            return false;
        }
    }
    mySplash.SetProgress(100);
    mz_zip_reader_end(&updateZip);
    
    std::string launcher;
    launcher += content;
    launcher += "SmartDashboard.exe";
    char* launcherChar = new char[launcher.length() + 1];
    memcpy(launcherChar, launcher.c_str(), launcher.length() + 1);
    STARTUPINFO info={sizeof(info)};
    PROCESS_INFORMATION processInfo;
    CreateProcess(launcherChar, "", NULL, NULL, TRUE, 0, NULL, NULL, &info, &processInfo);
    return true;
}

void SmartDashboardInit() {
    if(strstr(GetCommandLine(), "--update") != NULL) {        
        if(!ExtractUpdate()){
            std::string message = "Failed to update SmartDashboard.js\n" + failReason;
            char* messageChar = new char[message.length() + 1];
            memcpy(messageChar, message.c_str(), message.length() + 1);
            MessageBox(mySplash.hSplashWnd, messageChar, NULL, MB_OK);
        }
        
        exit(0);
    }

    
    STARTUPINFO info = {sizeof(info)};
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
        while (!sdIsUp) {
            EnumWindows(enumWindowsProc, 0);
            Sleep(200);
            if (WaitForSingleObject(processInfo.hProcess, 0) == WAIT_OBJECT_0) {
                // nw died
                exit(0);
            }
        }
        mySplash.Hide();
        
        WaitForSingleObject(processInfo.hProcess, INFINITE);
        CloseHandle(processInfo.hProcess);
        CloseHandle(processInfo.hThread);
    }
    exit(0);
}

int main() {
    mySplash.Init(strstr(GetCommandLine(), "--pb") != NULL);
    HANDLE sdInit = CreateThread(NULL, 0, (LPTHREAD_START_ROUTINE) &SmartDashboardInit, NULL, 0, NULL);
    
    MSG msg = {0};
    while (GetMessage(&msg, NULL, 0, 0) > 0) {
        TranslateMessage(&msg);
        DispatchMessage(&msg);
    }
}

#ifdef _MSC_VER
int CALLBACK WinMain(
  _In_ HINSTANCE hInstance,
  _In_ HINSTANCE hPrevInstance,
  _In_ LPSTR     lpCmdLine,
  _In_ int       nCmdShow
) {
    return main();
}
#endif