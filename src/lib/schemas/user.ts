import { z } from "zod";

// Theme and UI Preferences
export const ThemeSchema = z.enum(["light", "dark", "system"]);

export const LanguageSchema = z.enum([
  "en",
  "id",
  "fr",
  "es",
  "de",
  "zh",
  "ja",
]);

export const DensitySchema = z.enum(["compact", "comfortable", "spacious"]);

export const AnimationSchema = z.enum(["none", "reduced", "full"]);

// User Preferences Schema
export const UserPreferencesSchema = z.object({
  theme: ThemeSchema.default("system"),
  language: LanguageSchema.default("en"),
  density: DensitySchema.default("comfortable"),
  animations: AnimationSchema.default("full"),
  auto_save: z.boolean().default(true),
  show_tooltips: z.boolean().default(true),
  sound_enabled: z.boolean().default(false),
  notifications_enabled: z.boolean().default(true),
  email_notifications: z.boolean().default(false),
  high_contrast: z.boolean().default(false),
  reduce_motion: z.boolean().default(false),
  screen_reader_support: z.boolean().default(false),
});

// Display Settings Schema
export const DisplaySettingsSchema = z.object({
  charts: z.object({
    show_grid: z.boolean().default(true),
    show_legend: z.boolean().default(true),
    animation_duration: z.number().min(0).max(5000).default(750),
    color_scheme: z
      .enum(["default", "colorblind", "high_contrast", "dark"])
      .default("default"),
    line_thickness: z.enum(["thin", "medium", "thick"]).default("medium"),
    point_size: z.enum(["small", "medium", "large"]).default("medium"),
  }),
  simulation: z.object({
    show_bacteria_count: z.boolean().default(true),
    show_resistance_percentage: z.boolean().default(true),
    show_generation_counter: z.boolean().default(true),
    show_performance_metrics: z.boolean().default(false),
    update_frequency: z
      .enum(["real-time", "1s", "5s", "10s"])
      .default("real-time"),
    max_history_points: z.number().int().min(100).max(10000).default(1000),
  }),
  layout: z.object({
    sidebar_collapsed: z.boolean().default(false),
    panel_layout: z
      .enum(["horizontal", "vertical", "grid"])
      .default("horizontal"),
    show_minimap: z.boolean().default(true),
    full_screen_charts: z.boolean().default(false),
  }),
});

// Simulation Defaults Schema
export const SimulationDefaultsSchema = z.object({
  auto_start: z.boolean().default(false),
  save_results: z.boolean().default(true),
  max_concurrent_simulations: z.number().int().min(1).max(10).default(3),
  default_parameters: z.object({
    population_size: z.number().int().min(1000).max(100000).default(10000),
    generations: z.number().int().min(10).max(1000).default(100),
    mutation_rate: z.number().min(0.0001).max(0.01).default(0.001),
    hgt_rate: z.number().min(0.001).max(0.1).default(0.01),
    initial_resistance_frequency: z.number().min(0.001).max(0.5).default(0.01),
    antibiotic_concentration: z.number().min(0.1).max(10).default(1.0),
  }),
  export_settings: z.object({
    default_format: z.enum(["csv", "json", "xlsx"]).default("csv"),
    include_metadata: z.boolean().default(true),
    compress_files: z.boolean().default(false),
    auto_download: z.boolean().default(true),
  }),
});

// Type inference for the defaults - need these before defining the defaults
export type UserPreferences = z.infer<typeof UserPreferencesSchema>;
export type DisplaySettings = z.infer<typeof DisplaySettingsSchema>;
export type SimulationDefaults = z.infer<typeof SimulationDefaultsSchema>;

// Default Values - Define these before using them in schemas
export const DEFAULT_USER_PREFERENCES: UserPreferences = {
  theme: "system",
  language: "en",
  density: "comfortable",
  animations: "full",
  auto_save: true,
  show_tooltips: true,
  sound_enabled: false,
  notifications_enabled: true,
  email_notifications: false,
  high_contrast: false,
  reduce_motion: false,
  screen_reader_support: false,
};

export const DEFAULT_DISPLAY_SETTINGS: DisplaySettings = {
  charts: {
    show_grid: true,
    show_legend: true,
    animation_duration: 750,
    color_scheme: "default",
    line_thickness: "medium",
    point_size: "medium",
  },
  simulation: {
    show_bacteria_count: true,
    show_resistance_percentage: true,
    show_generation_counter: true,
    show_performance_metrics: false,
    update_frequency: "real-time",
    max_history_points: 1000,
  },
  layout: {
    sidebar_collapsed: false,
    panel_layout: "horizontal",
    show_minimap: true,
    full_screen_charts: false,
  },
};

export const DEFAULT_SIMULATION_DEFAULTS: SimulationDefaults = {
  auto_start: false,
  save_results: true,
  max_concurrent_simulations: 3,
  default_parameters: {
    population_size: 10000,
    generations: 100,
    mutation_rate: 0.001,
    hgt_rate: 0.01,
    initial_resistance_frequency: 0.01,
    antibiotic_concentration: 1.0,
  },
  export_settings: {
    default_format: "csv",
    include_metadata: true,
    compress_files: false,
    auto_download: true,
  },
};

// User Profile Schema
export const UserProfileSchema = z.object({
  user_id: z.string().min(1, "User ID is required").optional(),
  username: z
    .string()
    .min(3, "Username must be at least 3 characters")
    .max(30, "Username cannot exceed 30 characters")
    .regex(
      /^[a-zA-Z0-9_-]+$/,
      "Username can only contain letters, numbers, hyphens, and underscores"
    )
    .optional(),
  email: z
    .string()
    .email("Invalid email address")
    .max(255, "Email cannot exceed 255 characters")
    .optional(),
  full_name: z
    .string()
    .max(100, "Full name cannot exceed 100 characters")
    .optional(),
  organization: z
    .string()
    .max(100, "Organization name cannot exceed 100 characters")
    .optional(),
  role: z
    .enum(["student", "researcher", "educator", "professional", "other"])
    .optional(),
  bio: z.string().max(500, "Bio cannot exceed 500 characters").optional(),
  avatar_url: z.string().url("Invalid avatar URL").optional(),
  created_at: z
    .string()
    .refine(val => !isNaN(Date.parse(val)), {
      message: "Invalid timestamp format",
    })
    .optional(),
  last_login: z
    .string()
    .refine(val => !isNaN(Date.parse(val)), {
      message: "Invalid timestamp format",
    })
    .optional(),
  is_verified: z.boolean().default(false),
  preferences: UserPreferencesSchema.default(DEFAULT_USER_PREFERENCES),
  display_settings: DisplaySettingsSchema.default(DEFAULT_DISPLAY_SETTINGS),
  simulation_defaults: SimulationDefaultsSchema.default(
    DEFAULT_SIMULATION_DEFAULTS
  ),
});

// Session State Schema
export const SessionStateSchema = z.object({
  session_id: z.string().min(1, "Session ID is required"),
  user_id: z.string().optional(),
  created_at: z.string().refine(val => !isNaN(Date.parse(val)), {
    message: "Invalid timestamp format",
  }),
  last_activity: z.string().refine(val => !isNaN(Date.parse(val)), {
    message: "Invalid timestamp format",
  }),
  expires_at: z.string().refine(val => !isNaN(Date.parse(val)), {
    message: "Invalid timestamp format",
  }),
  active_simulations: z
    .array(z.string())
    .max(10, "Cannot have more than 10 active simulations"),
  preferences: UserPreferencesSchema.partial(),
  temporary_data: z.record(z.any()).optional(),
});

// UI State Schema
export const UIStateSchema = z.object({
  current_page: z.string().max(100),
  sidebar_open: z.boolean().default(true),
  active_tab: z.string().optional(),
  modal_open: z.boolean().default(false),
  modal_type: z.string().optional(),
  selected_simulation: z.string().optional(),
  chart_filters: z.record(z.any()).default({}),
  view_mode: z.enum(["grid", "list", "cards"]).default("grid"),
  sort_settings: z
    .object({
      field: z.string().optional(),
      direction: z.enum(["asc", "desc"]).default("desc"),
    })
    .default({}),
  pagination: z
    .object({
      page: z.number().int().min(1).default(1),
      per_page: z.number().int().min(5).max(100).default(20),
    })
    .default({}),
  search_query: z.string().max(100).default(""),
  filters_applied: z.record(z.any()).default({}),
  expanded_panels: z.array(z.string()).default([]),
  window_size: z
    .object({
      width: z.number().min(320),
      height: z.number().min(240),
    })
    .optional(),
});

// Form State Schema
export const FormStateSchema = z.object({
  form_id: z.string().min(1, "Form ID is required"),
  is_dirty: z.boolean().default(false),
  is_submitting: z.boolean().default(false),
  is_valid: z.boolean().default(true),
  touched_fields: z.record(z.boolean()).default({}),
  field_errors: z.record(z.array(z.string())).default({}),
  form_errors: z.array(z.string()).default([]),
  last_saved: z
    .string()
    .refine(val => !isNaN(Date.parse(val)), {
      message: "Invalid timestamp format",
    })
    .optional(),
  auto_save_enabled: z.boolean().default(true),
  draft_data: z.record(z.any()).optional(),
});

// Notification Schema
export const NotificationSchema = z.object({
  id: z.string().min(1, "Notification ID is required"),
  type: z.enum(["info", "success", "warning", "error"]),
  title: z.string().min(1, "Notification title is required").max(100),
  message: z.string().min(1, "Notification message is required").max(500),
  timestamp: z.string().refine(val => !isNaN(Date.parse(val)), {
    message: "Invalid timestamp format",
  }),
  read: z.boolean().default(false),
  persistent: z.boolean().default(false),
  actions: z
    .array(
      z.object({
        label: z.string().min(1).max(50),
        action: z.string().min(1),
        primary: z.boolean().default(false),
      })
    )
    .max(3)
    .optional(),
  metadata: z.record(z.any()).optional(),
  expires_at: z
    .string()
    .refine(val => !isNaN(Date.parse(val)), {
      message: "Invalid timestamp format",
    })
    .optional(),
});

// User Activity Schema
export const UserActivitySchema = z.object({
  activity_id: z.string().min(1, "Activity ID is required"),
  user_id: z.string().min(1, "User ID is required"),
  session_id: z.string().min(1, "Session ID is required"),
  activity_type: z.enum([
    "login",
    "logout",
    "simulation_created",
    "simulation_started",
    "simulation_completed",
    "settings_changed",
    "file_uploaded",
    "file_downloaded",
    "error_occurred",
    "page_view",
  ]),
  timestamp: z.string().refine(val => !isNaN(Date.parse(val)), {
    message: "Invalid timestamp format",
  }),
  details: z.record(z.any()).optional(),
  ip_address: z.string().ip().optional(),
  user_agent: z.string().max(500).optional(),
  page_url: z.string().url().optional(),
  referrer: z.string().url().optional(),
  duration: z.number().min(0).optional(),
});

// Validation Settings Schema
export const ValidationSettingsSchema = z.object({
  real_time_validation: z.boolean().default(true),
  show_validation_on_blur: z.boolean().default(true),
  show_validation_on_change: z.boolean().default(false),
  debounce_ms: z.number().int().min(0).max(2000).default(300),
  strict_mode: z.boolean().default(false),
  custom_rules: z
    .record(
      z.object({
        pattern: z.string(),
        message: z.string(),
        flags: z.string().optional(),
      })
    )
    .default({}),
});

// Type Exports
export type Theme = z.infer<typeof ThemeSchema>;
export type Language = z.infer<typeof LanguageSchema>;
export type Density = z.infer<typeof DensitySchema>;
export type Animation = z.infer<typeof AnimationSchema>;
export type UserProfile = z.infer<typeof UserProfileSchema>;
export type SessionState = z.infer<typeof SessionStateSchema>;
export type UIState = z.infer<typeof UIStateSchema>;
export type FormState = z.infer<typeof FormStateSchema>;
export type Notification = z.infer<typeof NotificationSchema>;
export type UserActivity = z.infer<typeof UserActivitySchema>;
export type ValidationSettings = z.infer<typeof ValidationSettingsSchema>;

// Validation Functions
export const validateUserProfile = (data: unknown) => {
  try {
    return {
      success: true as const,
      data: UserProfileSchema.parse(data),
      errors: null,
    };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        success: false as const,
        data: null,
        errors: error.format(),
      };
    }
    return {
      success: false as const,
      data: null,
      errors: { _errors: ["Unknown validation error"] },
    };
  }
};

export const validateUserPreferences = (data: unknown) => {
  try {
    return {
      success: true as const,
      data: UserPreferencesSchema.parse(data),
      errors: null,
    };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        success: false as const,
        data: null,
        errors: error.format(),
      };
    }
    return {
      success: false as const,
      data: null,
      errors: { _errors: ["Unknown validation error"] },
    };
  }
};

export const validateUIState = (data: unknown) => {
  try {
    return {
      success: true as const,
      data: UIStateSchema.parse(data),
      errors: null,
    };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        success: false as const,
        data: null,
        errors: error.format(),
      };
    }
    return {
      success: false as const,
      data: null,
      errors: { _errors: ["Unknown validation error"] },
    };
  }
};

export const validateFormState = (data: unknown) => {
  try {
    return {
      success: true as const,
      data: FormStateSchema.parse(data),
      errors: null,
    };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        success: false as const,
        data: null,
        errors: error.format(),
      };
    }
    return {
      success: false as const,
      data: null,
      errors: { _errors: ["Unknown validation error"] },
    };
  }
};

export const validateNotification = (data: unknown) => {
  try {
    return {
      success: true as const,
      data: NotificationSchema.parse(data),
      errors: null,
    };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        success: false as const,
        data: null,
        errors: error.format(),
      };
    }
    return {
      success: false as const,
      data: null,
      errors: { _errors: ["Unknown validation error"] },
    };
  }
};

// Type Guards
export const isValidTheme = (theme: unknown): theme is Theme => {
  try {
    ThemeSchema.parse(theme);
    return true;
  } catch {
    return false;
  }
};

export const isValidLanguage = (language: unknown): language is Language => {
  try {
    LanguageSchema.parse(language);
    return true;
  } catch {
    return false;
  }
};

// Helper Functions
export const mergePreferences = (
  defaultPrefs: UserPreferences,
  userPrefs: Partial<UserPreferences>
): UserPreferences => {
  return UserPreferencesSchema.parse({
    ...defaultPrefs,
    ...userPrefs,
  });
};

export const createNotification = (
  type: Notification["type"],
  title: string,
  message: string,
  options?: Partial<Notification>
): Notification => {
  return NotificationSchema.parse({
    id: crypto.randomUUID(),
    type,
    title,
    message,
    timestamp: new Date().toISOString(),
    ...options,
  });
};

export const isSessionExpired = (session: SessionState): boolean => {
  return new Date() > new Date(session.expires_at);
};
