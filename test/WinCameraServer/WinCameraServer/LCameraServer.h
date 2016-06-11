/*----------------------------------------------------------------------------*/
/* Copyright (c) FIRST 2014-2016. All Rights Reserved.                        */
/* Open Source Software - may be modified and shared by FRC teams. The code   */
/* must be accompanied by the FIRST BSD license file in the root directory of */
/* the project.                                                               */
/*----------------------------------------------------------------------------*/

#pragma once

#include "nivision.h"

#include <thread>
#include <memory>
#include <condition_variable>
#include <tuple>
#include <vector>

class LCameraServer {
public:
  static constexpr uint16_t kPort = 1180;
  static constexpr char kMagicNumber[] = {0x01, 0x00, 0x00, 0x00};
  static constexpr uint32_t kSize640x480 = 0;
  static constexpr uint32_t kSize320x240 = 1;
  static constexpr uint32_t kSize160x120 = 2;
  static constexpr int32_t kHardwareCompression = -1;
  static constexpr uint32_t kMaxImageSize = 200000;

  static bool errored;

  Image* serveImage1;
  Image* serveImage2;
  Image* serveImage3;
  Image* serveImage4;

  LCameraServer();

  std::vector<uint8_t*> m_dataPool;
  unsigned int m_quality;
  bool m_autoCaptureStarted;
  bool m_hwClient;
  std::tuple<uint8_t*, unsigned int, unsigned int, bool> m_imageData;

  void Serve();
  void SetImageData(uint8_t* data, unsigned int size, unsigned int start = 0,
                    bool imaqData = false);
  void FreeImageData(
      std::tuple<uint8_t*, unsigned int, unsigned int, bool> imageData);

  struct Request {
    uint32_t fps;
    int32_t compression;
    uint32_t size;
  };

  static LCameraServer* GetInstance();
  void SetImage(Image const* image);

  void SetQuality(unsigned int quality);
  unsigned int GetQuality();
};
