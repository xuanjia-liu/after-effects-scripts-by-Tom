/*******************************************************************/
/*                                                                 */
/*                      ADOBE CONFIDENTIAL                         */
/*                   _ _ _ _ _ _ _ _ _ _ _ _ _                     */
/*                                                                 */
/* Copyright 2007-2023 Adobe Inc.                                  */
/* All Rights Reserved.                                            */
/*                                                                 */
/* NOTICE:  All information contained herein is, and remains the   */
/* property of Adobe Inc. and its suppliers, if                    */
/* any.  The intellectual and technical concepts contained         */
/* herein are proprietary to Adobe Inc. and its                    */
/* suppliers and may be covered by U.S. and Foreign Patents,       */
/* patents in process, and are protected by trade secret or        */
/* copyright law.  Dissemination of this information or            */
/* reproduction of this material is strictly forbidden unless      */
/* prior written permission is obtained from Adobe Inc.            */
/* Incorporated.                                                   */
/*                                                                 */
/*******************************************************************/

#include "ShapeParticles.h"
#include <algorithm>
#include <cmath>
#include <cstring>

#ifndef M_PI
#define M_PI 3.14159265358979323846
#endif

// Deterministic random function based on particle index
static float get_rand(int j, int seed, int offset) {
  unsigned int val = (unsigned int)(j * 73856093 ^ (seed + offset) * 19349663);
  val = (val ^ (val >> 16)) * 0x45d9f3b;
  val = (val ^ (val >> 16)) * 0x45d9f3b;
  val = val ^ (val >> 16);
  return (float)(val & 0x7fffffff) / (float)0x7fffffff;
}

static PF_Err About(PF_InData *in_data, PF_OutData *out_data,
                    PF_ParamDef *params[], PF_LayerDef *output) {
  AEGP_SuiteHandler suites(in_data->pica_basicP);

  suites.ANSICallbacksSuite1()->sprintf(
      out_data->return_msg,
      "Shape Particles Pro v%d.%d\rBased on Emitter Logic.", MAJOR_VERSION,
      MINOR_VERSION);

  return PF_Err_NONE;
}

static PF_Err GlobalSetup(PF_InData *in_data, PF_OutData *out_data,
                          PF_ParamDef *params[], PF_LayerDef *output) {
  out_data->my_version = PF_VERSION(MAJOR_VERSION, MINOR_VERSION, BUG_VERSION,
                                    STAGE_VERSION, BUILD_VERSION);

  out_data->out_flags = PF_OutFlag_DEEP_COLOR_AWARE | PF_OutFlag_NON_PARAM_VARY;
  out_data->out_flags2 = PF_OutFlag2_SUPPORTS_THREADED_RENDERING;

  return PF_Err_NONE;
}

static PF_Err ParamsSetup(PF_InData *in_data, PF_OutData *out_data,
                          PF_ParamDef *params[], PF_LayerDef *output) {
  PF_Err err = PF_Err_NONE;
  PF_ParamDef def;

  // Max Particles
  AEFX_CLR_STRUCT(def);
  PF_ADD_FLOAT_SLIDERX("Max Particles", 1, 10000, 1, 5000, 1000,
                       PF_Precision_INTEGER, 0, 0, MAX_PARTICLES_DISK_ID);

  // Birth Rate
  AEFX_CLR_STRUCT(def);
  PF_ADD_FLOAT_SLIDERX("Birth Rate (pcs/s)", 0, 1000, 0, 500, 50,
                       PF_Precision_HUNDREDTHS, 0, 0, BIRTH_RATE_DISK_ID);

  // Life
  AEFX_CLR_STRUCT(def);
  PF_ADD_FLOAT_SLIDERX("Life (sec)", 0, 10, 0, 5, 2, PF_Precision_HUNDREDTHS, 0,
                       0, LIFE_DISK_ID);
  AEFX_CLR_STRUCT(def);
  PF_ADD_FLOAT_SLIDERX("Life Random (%)", 0, 100, 0, 100, 20,
                       PF_Precision_HUNDREDTHS, 0, 0, LIFE_VAR_DISK_ID);

  // Velocity
  AEFX_CLR_STRUCT(def);
  PF_ADD_FLOAT_SLIDERX("Speed", 0, 2000, 0, 1000, 200, PF_Precision_HUNDREDTHS,
                       0, 0, SPEED_DISK_ID);
  AEFX_CLR_STRUCT(def);
  PF_ADD_FLOAT_SLIDERX("Speed Random (%)", 0, 100, 0, 100, 50,
                       PF_Precision_HUNDREDTHS, 0, 0, SPEED_VAR_DISK_ID);

  // Direction
  AEFX_CLR_STRUCT(def);
  PF_ADD_ANGLE("Angle", 0, ANGLE_DISK_ID);
  AEFX_CLR_STRUCT(def);
  PF_ADD_FLOAT_SLIDERX("Angle Spread", 0, 360, 0, 360, 45,
                       PF_Precision_HUNDREDTHS, 0, 0, ANGLE_VAR_DISK_ID);

  // Gravity
  AEFX_CLR_STRUCT(def);
  PF_ADD_FLOAT_SLIDERX("Gravity X", -2000, 2000, -1000, 1000, 0,
                       PF_Precision_HUNDREDTHS, 0, 0, GRAVITY_X_DISK_ID);
  AEFX_CLR_STRUCT(def);
  PF_ADD_FLOAT_SLIDERX("Gravity Y", -2000, 2000, -1000, 1000, 500,
                       PF_Precision_HUNDREDTHS, 0, 0, GRAVITY_Y_DISK_ID);

  // Size
  AEFX_CLR_STRUCT(def);
  PF_ADD_FLOAT_SLIDERX("Size Start", 0, 200, 0, 100, 10,
                       PF_Precision_HUNDREDTHS, 0, 0, SIZE_START_DISK_ID);
  AEFX_CLR_STRUCT(def);
  PF_ADD_FLOAT_SLIDERX("Size End", 0, 200, 0, 100, 0, PF_Precision_HUNDREDTHS,
                       0, 0, SIZE_END_DISK_ID);

  // Color
  AEFX_CLR_STRUCT(def);
  PF_ADD_COLOR("Color Start", 255, 128, 0, COLOR_START_DISK_ID);
  AEFX_CLR_STRUCT(def);
  PF_ADD_COLOR("Color End", 255, 0, 0, COLOR_END_DISK_ID);

  // Opacity
  AEFX_CLR_STRUCT(def);
  PF_ADD_FLOAT_SLIDERX("Opacity Start (%)", 0, 100, 0, 100, 100,
                       PF_Precision_HUNDREDTHS, 0, 0, OPACITY_START_DISK_ID);
  AEFX_CLR_STRUCT(def);
  PF_ADD_FLOAT_SLIDERX("Opacity End (%)", 0, 100, 0, 100, 0,
                       PF_Precision_HUNDREDTHS, 0, 0, OPACITY_END_DISK_ID);

  // Seed
  AEFX_CLR_STRUCT(def);
  PF_ADD_FLOAT_SLIDERX("Random Seed", 0, 10000, 0, 10000, 1234,
                       PF_Precision_INTEGER, 0, 0, SEED_DISK_ID);

  out_data->num_params = SP_NUM_PARAMS;

  return err;
}

// 8-bit Alpha Blending drawing
static void DrawCircle8(PF_LayerDef *output, float x, float y, float radius,
                        PF_Pixel8 color, float opacity) {
  int x_start = (int)(x - radius);
  int x_end = (int)(x + radius + 1);
  int y_start = (int)(y - radius);
  int y_end = (int)(y + radius + 1);

  x_start = std::max(x_start, 0);
  x_end = std::min(x_end, (int)output->width);
  y_start = std::max(y_start, 0);
  y_end = std::min(y_end, (int)output->height);

  float r2 = radius * radius;
  if (r2 < 0.1f)
    return;

  for (int iy = y_start; iy < y_end; iy++) {
    PF_Pixel8 *pixel_row =
        (PF_Pixel8 *)((char *)output->data + (iy * output->rowbytes));
    for (int ix = x_start; ix < x_end; ix++) {
      float dx = (float)ix - x;
      float dy = (float)iy - y;
      float dist2 = dx * dx + dy * dy;
      if (dist2 <= r2) {
        // Hard edge for now, could add AA later
        float final_alpha = (color.alpha / 255.0f) * opacity;
        float inv_alpha = 1.0f - final_alpha;

        pixel_row[ix].red =
            (A_u_char)(color.red * final_alpha + pixel_row[ix].red * inv_alpha);
        pixel_row[ix].green = (A_u_char)(color.green * final_alpha +
                                         pixel_row[ix].green * inv_alpha);
        pixel_row[ix].blue = (A_u_char)(color.blue * final_alpha +
                                        pixel_row[ix].blue * inv_alpha);
        pixel_row[ix].alpha =
            (A_u_char)(255 * final_alpha + pixel_row[ix].alpha * inv_alpha);
      }
    }
  }
}

// 16-bit Alpha Blending drawing
static void DrawCircle16(PF_LayerDef *output, float x, float y, float radius,
                         PF_Pixel16 color, float opacity) {
  int x_start = (int)(x - radius);
  int x_end = (int)(x + radius + 1);
  int y_start = (int)(y - radius);
  int y_end = (int)(y + radius + 1);

  x_start = std::max(x_start, 0);
  x_end = std::min(x_end, (int)output->width);
  y_start = std::max(y_start, 0);
  y_end = std::min(y_end, (int)output->height);

  float r2 = radius * radius;
  if (r2 < 0.1f)
    return;

  for (int iy = y_start; iy < y_end; iy++) {
    PF_Pixel16 *pixel_row =
        (PF_Pixel16 *)((char *)output->data + (iy * output->rowbytes));
    for (int ix = x_start; ix < x_end; ix++) {
      float dx = (float)ix - x;
      float dy = (float)iy - y;
      float dist2 = dx * dx + dy * dy;
      if (dist2 <= r2) {
        float final_alpha = (color.alpha / 32768.0f) * opacity;
        float inv_alpha = 1.0f - final_alpha;

        pixel_row[ix].red = (A_u_short)(color.red * final_alpha +
                                        pixel_row[ix].red * inv_alpha);
        pixel_row[ix].green = (A_u_short)(color.green * final_alpha +
                                          pixel_row[ix].green * inv_alpha);
        pixel_row[ix].blue = (A_u_short)(color.blue * final_alpha +
                                         pixel_row[ix].blue * inv_alpha);
        pixel_row[ix].alpha =
            (A_u_short)(32768 * final_alpha + pixel_row[ix].alpha * inv_alpha);
      }
    }
  }
}

static PF_Err Render(PF_InData *in_data, PF_OutData *out_data,
                     PF_ParamDef *params[], PF_LayerDef *output) {
  PF_Err err = PF_Err_NONE;

  // Clear background
  for (int iy = 0; iy < output->height; iy++) {
    char *pixel_row = (char *)output->data + (iy * output->rowbytes);
    memset(pixel_row, 0,
           output->width * (PF_WORLD_IS_DEEP(output) ? sizeof(PF_Pixel16)
                                                     : sizeof(PF_Pixel8)));
  }

  // Get Parameters
  int max_particles = (int)params[SP_MAX_PARTICLES]->u.fs_d.value;
  float birth_rate = (float)params[SP_BIRTH_RATE]->u.fs_d.value;
  float life_base = (float)params[SP_LIFE]->u.fs_d.value;
  float life_var = (float)params[SP_LIFE_VAR]->u.fs_d.value / 100.0f;
  float speed_base = (float)params[SP_SPEED]->u.fs_d.value;
  float speed_var = (float)params[SP_SPEED_VAR]->u.fs_d.value / 100.0f;
  float base_angle = (float)params[SP_ANGLE]->u.ad.value / 65536.0f;
  float angle_spread = (float)params[SP_ANGLE_VAR]->u.fs_d.value;
  float grav_x = (float)params[SP_GRAVITY_X]->u.fs_d.value;
  float grav_y = (float)params[SP_GRAVITY_Y]->u.fs_d.value;
  float size_s = (float)params[SP_SIZE_START]->u.fs_d.value;
  float size_e = (float)params[SP_SIZE_END]->u.fs_d.value;
  PF_Pixel8 color_s = params[SP_COLOR_START]->u.cd.value;
  PF_Pixel8 color_e = params[SP_COLOR_END]->u.cd.value;
  float opac_s = (float)params[SP_OPACITY_START]->u.fs_d.value / 100.0f;
  float opac_e = (float)params[SP_OPACITY_END]->u.fs_d.value / 100.0f;
  int seed = (int)params[SP_SEED]->u.fs_d.value;

  float current_time = (float)in_data->current_time / in_data->time_scale;

  // To avoid glitching, we use a fixed sampling frequency for "potential"
  // particles. We check slots every 1ms. If (rand < birth_rate / 1000), a
  // particle is born.
  const float slot_freq = 1000.0f;
  const float slot_duration = 1.0f / slot_freq;

  float max_possible_life = life_base * (1.0f + life_var);

  // Calculate which slots could still be alive
  int slot_end = (int)std::floor(current_time * slot_freq);
  int slot_start =
      (int)std::floor((current_time - max_possible_life) * slot_freq);

  if (slot_start < 0)
    slot_start = 0;

  int drawn_count = 0;

  // Iterate backwards to draw new particles on top if needed,
  // or just loop and count against max_particles.
  for (int s = slot_end; s >= slot_start; s--) {
    if (drawn_count >= max_particles)
      break;

    // Check if a particle exists in this slot
    // We use a specific offset for the birth check
    float birth_chance = birth_rate / slot_freq;
    if (get_rand(s, seed, 10) > birth_chance)
      continue;

    float birth_time = s * slot_duration;
    float age = current_time - birth_time;

    // Calculate individual life for this slot
    float p_life =
        life_base * (1.0f + (get_rand(s, seed, 11) * 2.0f - 1.0f) * life_var);
    if (p_life < 0.01f)
      p_life = 0.01f;

    if (age < 0 || age > p_life)
      continue;

    drawn_count++;
    float t = age / p_life;

    // Physics
    float p_speed =
        speed_base * (1.0f + (get_rand(s, seed, 12) * 2.0f - 1.0f) * speed_var);
    float p_angle_deg = base_angle + (get_rand(s, seed, 13) * 2.0f - 1.0f) *
                                         (angle_spread * 0.5f);
    float p_angle_rad = (float)(p_angle_deg * M_PI / 180.0f);

    float v0x = std::cos(p_angle_rad) * p_speed;
    float v0y = std::sin(p_angle_rad) * p_speed;

    float px = (output->width * 0.5f) + v0x * age + 0.5f * grav_x * age * age;
    float py = (output->height * 0.5f) + v0y * age + 0.5f * grav_y * age * age;

    float current_size = size_s + (size_e - size_s) * t;
    float current_opac = opac_s + (opac_e - opac_s) * t;

    if (PF_WORLD_IS_DEEP(output)) {
      PF_Pixel16 p_color;
      p_color.red =
          (A_u_short)(CONVERT8TO16(color_s.red) +
                      (CONVERT8TO16(color_e.red) - CONVERT8TO16(color_s.red)) *
                          t);
      p_color.green = (A_u_short)(CONVERT8TO16(color_s.green) +
                                  (CONVERT8TO16(color_e.green) -
                                   CONVERT8TO16(color_s.green)) *
                                      t);
      p_color.blue = (A_u_short)(CONVERT8TO16(color_s.blue) +
                                 (CONVERT8TO16(color_e.blue) -
                                  CONVERT8TO16(color_s.blue)) *
                                     t);
      p_color.alpha = (A_u_short)(32768);
      DrawCircle16(output, px, py, current_size, p_color, current_opac);
    } else {
      PF_Pixel8 p_color;
      p_color.red = (A_u_char)(color_s.red + (color_e.red - color_s.red) * t);
      p_color.green =
          (A_u_char)(color_s.green + (color_e.green - color_s.green) * t);
      p_color.blue =
          (A_u_char)(color_s.blue + (color_e.blue - color_s.blue) * t);
      p_color.alpha = 255;
      DrawCircle8(output, px, py, current_size, p_color, current_opac);
    }
  }

  return err;
}

extern "C" DllExport PF_Err PluginDataEntryFunction2(
    PF_PluginDataPtr inPtr, PF_PluginDataCB2 inPluginDataCallBackPtr,
    SPBasicSuite *inSPBasicSuitePtr, const char *inHostName,
    const char *inHostVersion) {
  PF_Err result = PF_Err_INVALID_CALLBACK;

  result = PF_REGISTER_EFFECT_EXT2(inPtr, inPluginDataCallBackPtr,
                                   "Shape Particles", "ADBE ShapeParticles",
                                   "Sample Plug-ins", AE_RESERVED_INFO,
                                   "EffectMain", "https://www.adobe.com");

  return result;
}

PF_Err EffectMain(PF_Cmd cmd, PF_InData *in_data, PF_OutData *out_data,
                  PF_ParamDef *params[], PF_LayerDef *output, void *extra) {
  PF_Err err = PF_Err_NONE;

  try {
    switch (cmd) {
    case PF_Cmd_ABOUT:
      err = About(in_data, out_data, params, output);
      break;
    case PF_Cmd_GLOBAL_SETUP:
      err = GlobalSetup(in_data, out_data, params, output);
      break;
    case PF_Cmd_PARAMS_SETUP:
      err = ParamsSetup(in_data, out_data, params, output);
      break;
    case PF_Cmd_RENDER:
      err = Render(in_data, out_data, params, output);
      break;
    }
  } catch (PF_Err &thrown_err) {
    err = thrown_err;
  }
  return err;
}
