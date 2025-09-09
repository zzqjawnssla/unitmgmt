cmake_minimum_required(VERSION 3.13)
project(unitmgmt LANGUAGES C CXX)

set(CMAKE_C_STANDARD 11)
set(CMAKE_CXX_STANDARD 17)

# 하드닝 인터페이스 타깃
add_library(secure_flags INTERFACE)
target_compile_options(secure_flags INTERFACE
    -D_FORTIFY_SOURCE=2
    -fstack-protector-strong
    -Wformat
    -Wformat-security
    # -Werror=format-security   # 필요시 점진 적용
    -fPIC
    -fvisibility=hidden
)
target_link_options(secure_flags INTERFACE
    -Wl,-z,relro
    -Wl,-z,now
    -Wl,-z,noexecstack
    -Wl,--exclude-libs,ALL
    -Wl,-z,defs
    -Wl,--build-id
)

function(apply_sec_to target)
  target_link_libraries(${target} PRIVATE secure_flags)
  set_property(TARGET ${target} PROPERTY POSITION_INDEPENDENT_CODE ON)

  get_target_property(_type ${target} TYPE)
  if (_type STREQUAL "EXECUTABLE")
    target_compile_options(${target} PRIVATE -fPIE)
    target_link_options(${target} PRIVATE -pie)
  endif()
endfunction()

# 네이티브 공유 라이브러리 (.so)
add_library(unitmgmt SHARED
    native-lib.cpp
)
apply_sec_to(unitmgmt)

# NDK log 등 사용할 거면 필요 라이브러리 링크 예시:
# target_link_libraries(unitmgmt PRIVATE log)
