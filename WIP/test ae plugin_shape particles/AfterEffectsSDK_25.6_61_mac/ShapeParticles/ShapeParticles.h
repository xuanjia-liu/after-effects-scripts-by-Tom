#pragma once
#ifndef SHAPE_PARTICLES_H
#define SHAPE_PARTICLES_H

typedef unsigned char u_char;
typedef unsigned short u_short;
typedef unsigned short u_int16;
typedef unsigned long u_long;
typedef short int int16;
#define PF_TABLE_BITS 12
#define PF_TABLE_SZ_16 4096
#define PF_DEEP_COLOR_AWARE 1

#include "AEConfig.h"

#ifdef AE_OS_WIN
    typedef unsigned short PixelType;
    #include <Windows.h>
#endif

#include "entry.h"
#include "AE_Effect.h"
#include "AE_EffectCB.h"
#include "AE_Macros.h"
#include "Param_Utils.h"
#include "AE_EffectCBSuites.h"
#include "String_Utils.h"
#include "AE_GeneralPlug.h"
#include "AEFX_ChannelDepthTpl.h"
#include "AEGP_SuiteHandler.h"
#include "ShapeParticles_Strings.h"

#define MAJOR_VERSION 1
#define MINOR_VERSION 1
#define BUG_VERSION 0
#define STAGE_VERSION PF_Stage_DEVELOP
#define BUILD_VERSION 1

enum {
    SP_INPUT = 0,
    SP_MAX_PARTICLES,
    SP_BIRTH_RATE,
    SP_LIFE,
    SP_LIFE_VAR,
    SP_SPEED,
    SP_SPEED_VAR,
    SP_ANGLE,
    SP_ANGLE_VAR,
    SP_GRAVITY_X,
    SP_GRAVITY_Y,
    SP_SIZE_START,
    SP_SIZE_END,
    SP_COLOR_START,
    SP_COLOR_END,
    SP_OPACITY_START,
    SP_OPACITY_END,
    SP_SEED,
    SP_NUM_PARAMS
};

enum {
    MAX_PARTICLES_DISK_ID = 1,
    BIRTH_RATE_DISK_ID,
    LIFE_DISK_ID,
    LIFE_VAR_DISK_ID,
    SPEED_DISK_ID,
    SPEED_VAR_DISK_ID,
    ANGLE_DISK_ID,
    ANGLE_VAR_DISK_ID,
    GRAVITY_X_DISK_ID,
    GRAVITY_Y_DISK_ID,
    SIZE_START_DISK_ID,
    SIZE_END_DISK_ID,
    COLOR_START_DISK_ID,
    COLOR_END_DISK_ID,
    OPACITY_START_DISK_ID,
    OPACITY_END_DISK_ID,
    SEED_DISK_ID
};

extern "C" {
    DllExport PF_Err EffectMain(PF_Cmd cmd, PF_InData *in_data, PF_OutData *out_data, PF_ParamDef *params[], PF_LayerDef *output, void *extra);
}
#endif
