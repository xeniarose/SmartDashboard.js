#include "stdafx.h"
#include "LCameraServer.h"

int main()
{	
	WSADATA wsaData;
	int iResult;

	// Initialize Winsock
	iResult = WSAStartup(MAKEWORD(2, 2), &wsaData);
	if (iResult != 0) {
		printf("WSAStartup failed: %d\n", iResult);
		return 1;
	}

	LCameraServer* serv = LCameraServer::GetInstance();
	serv->Serve();

    return 0;
}

