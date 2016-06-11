#include "stdafx.h"
#include "LCameraServer.h"

bool LCameraServer::errored = false;

LCameraServer* LCameraServer::GetInstance() {
	static LCameraServer instance;
	return &instance;
}

LCameraServer::LCameraServer() : m_dataPool(
				3), m_quality(50), m_autoCaptureStarted(false), m_hwClient(
		true), m_imageData(nullptr, 0, 0, false) {
	for (int i = 0; i < 3; i++)
		m_dataPool.push_back(new uint8_t[kMaxImageSize]);

	printf("Create image\n");
	serveImage1 = imaqCreateImage(IMAQ_IMAGE_RGB, 0);
	serveImage2 = imaqCreateImage(IMAQ_IMAGE_RGB, 0);
	serveImage3 = imaqCreateImage(IMAQ_IMAGE_RGB, 0);
	serveImage4 = imaqCreateImage(IMAQ_IMAGE_RGB, 0);
	printf("Read image\n");
	imaqReadFile(serveImage1, "1.jpg", NULL, NULL);
	imaqReadFile(serveImage2, "2.jpg", NULL, NULL);
	imaqReadFile(serveImage3, "3.jpg", NULL, NULL);
	imaqReadFile(serveImage4, "4.jpg", NULL, NULL);
	
	SetImage(serveImage1);
}

void LCameraServer::FreeImageData(
		std::tuple<uint8_t*, unsigned int, unsigned int, bool> imageData) {
	if (std::get<3>(imageData))
		imaqDispose(std::get<0>(imageData));
	else if (std::get<0>(imageData) != nullptr) {
		m_dataPool.push_back(std::get<0>(imageData));
	}
}

void LCameraServer::SetImageData(uint8_t* data, unsigned int size,
		unsigned int start, bool imaqData) {
	FreeImageData(m_imageData);
	m_imageData = std::make_tuple(data, size, start, imaqData);
}

void LCameraServer::SetImage(Image const* image) {
	unsigned int dataSize = 0;
	uint8_t* data = (uint8_t*) imaqFlatten(image, IMAQ_FLATTEN_IMAGE,
			IMAQ_COMPRESSION_JPEG, 10 * m_quality, &dataSize);

	// If we're using a HW camera, then find the start of the data
	bool hwClient;
	{
		// Make a local copy of the hwClient variable so that we can safely use it.
		hwClient = m_hwClient;
	}
	unsigned int start = 0;
	if (hwClient) {
		while (start < dataSize - 1) {
			if (data[start] == 0xFF && data[start + 1] == 0xD8)
				break;
			else
				start++;
		}
	}
	dataSize -= start;

	SetImageData(data, dataSize, start, true);
}

void LCameraServer::SetQuality(unsigned int quality) {
	m_quality = quality > 100 ? 100 : quality;
}

unsigned int LCameraServer::GetQuality() {
	return m_quality;
}

void LCameraServer::Serve() {
	printf("LCameraServer: Serve\n");

	addrinfo *result = NULL, *ptr = NULL, hints;

	ZeroMemory(&hints, sizeof(hints));
	hints.ai_family = AF_INET;
	hints.ai_socktype = SOCK_STREAM;
	hints.ai_protocol = IPPROTO_TCP;
	hints.ai_flags = AI_PASSIVE;

	// Resolve the local address and port to be used by the server
	int iResult = getaddrinfo(NULL, "1180", &hints, &result);
	if (iResult != 0) {
		printf("getaddrinfo failed: %d\n", iResult);
		WSACleanup();
		return;
	}

	SOCKET ListenSocket = INVALID_SOCKET;
	ListenSocket = socket(result->ai_family, result->ai_socktype, result->ai_protocol);
	if (ListenSocket == INVALID_SOCKET) {
		printf("Error at socket(): %ld\n", WSAGetLastError());
		freeaddrinfo(result);
		WSACleanup();
		return;
	}

	iResult = bind(ListenSocket, result->ai_addr, (int)result->ai_addrlen);
	if (iResult == SOCKET_ERROR) {
		printf("bind failed with error: %d\n", WSAGetLastError());
		freeaddrinfo(result);
		closesocket(ListenSocket);
		WSACleanup();
		return;
	}
	freeaddrinfo(result);

	if (listen(ListenSocket, SOMAXCONN) == SOCKET_ERROR) {
		printf("Listen failed with error: %ld\n", WSAGetLastError());
		closesocket(ListenSocket);
		WSACleanup();
		return;
	}

	printf("LCameraServer: Listening\n");

	while (true) {
		SOCKET ClientSocket;
		ClientSocket = INVALID_SOCKET;

		ClientSocket = accept(ListenSocket, NULL, NULL);
		if (ClientSocket == INVALID_SOCKET) {
			printf("accept failed: %d\n", WSAGetLastError());
			closesocket(ListenSocket);
			WSACleanup();
			return;
		}

		printf("LCameraServer: Got Connection!\n");

		Request req;
		// the problem with the default implementation of receiving the Request in
		// CameraServer was that it required the entire buffer to already be there
		// by the time it got to read. Sometimes the buffer would not be there, which
		// caused a loop of SmartDashboard repeatedly trying to connect. The code
		// below makes sure we have the entire contents of the Request (12 bytes)
		// before we try to interpret the contents
		char requestBuffer[sizeof(Request)];
		unsigned int index = 0;

		bool connFailed = false;

		while (index < sizeof(Request)) {
			char next;
			int sizeRead = recv(ClientSocket, &next, sizeof(next), 0);
			if (sizeRead == -1) {
				closesocket(ClientSocket);
				closesocket(ListenSocket);
				WSACleanup();
				connFailed = true;
				return;
			}
			if (sizeRead < 1)
				continue;
			requestBuffer[index] = next;
			index++;
		}

		if (connFailed) {
			continue;
		}

		// slightly unsafe cast. We use sizeof(Request) so it should be ok
		memcpy(&req, &requestBuffer, sizeof(Request));

		req.fps = ntohl(req.fps);
		req.compression = ntohl(req.compression);
		req.size = ntohl(req.size);

		printf("Request: fps %d comp %d size %d\n", req.fps, req.compression, req.size);

		// TODO: Support the SW Compression. The rest of the code below will work as
		// though this
		// check isn't here
		if (req.compression != kHardwareCompression) {
			if (!errored) {
				errored = true;
				printf("Request fps %i compression %i size %i\n", req.fps,
						req.compression, req.size);
			}
			closesocket(ClientSocket);
			closesocket(ListenSocket);
			WSACleanup();
			return;
		} else {
			errored = false;
		}

		int iter = 0;
		while (true) {
			iter++;
			iter %= 4;
			if (iter == 0) {
				SetImage(serveImage1);
			}
			else if (iter == 1) {
				SetImage(serveImage2);
			}
			else if (iter == 2) {
				SetImage(serveImage3);
			}
			else {
				SetImage(serveImage4);
			}

			unsigned int size = std::get<1>(m_imageData);
			unsigned int netSize = htonl(size);
			unsigned int start = std::get<2>(m_imageData);
			char* data = (char*) std::get<0>(m_imageData);

			if (data == nullptr)
				continue;

			if (send(ClientSocket, kMagicNumber, sizeof(kMagicNumber), 0) == -1) {
				break;
			}
			char* netSizeChar = (char*)&netSize;
			if (send(ClientSocket, netSizeChar, sizeof(netSize), 0) == -1) {
				break;
			}
			if (send(ClientSocket, &data[start], sizeof(char) * size, 0) == -1) {
				break;
			}
			Sleep(1000); // we ignore resolution, why not ignore fps too?
		}
		closesocket(ClientSocket);
	}
	
	closesocket(ListenSocket);
	WSACleanup();
}
