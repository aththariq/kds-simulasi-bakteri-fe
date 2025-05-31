"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { HelpCircle, Info } from "lucide-react";
import {
  type SimulationParameters,
  validateSimulationParameters,
  parameterValidators,
} from "@/lib/validation";
import { formatNumber, formatPercentage } from "@/lib/utils";
import {
  useNotifications,
  ValidationAlert,
  FieldError,
} from "@/components/ui/notification-system";
import {
  ValidationErrorHandler,
  SimulationErrorHandler,
  errorUtils,
} from "@/lib/error-handling";
import {
  FormStateManager,
  autoSaveManager,
  GracefulDegradationManager,
  RecoveryFlowManager,
  recoveryUtils,
} from "@/lib/recovery-mechanisms";
import { simulationParametersSchema } from "@/lib/schemas/api";
import { useNotifications as useNotificationsHook } from "@/hooks/useNotifications";

const defaultParameters: SimulationParameters = {
  populationSize: 10000,
  generations: 100,
  mutationRate: 0.001,
  hgtRate: 0.01,
  initialResistanceFrequency: 0.01,
  antibioticConcentration: 1.0,
  fitnessValues: {
    resistantFitness: 0.9,
    sensitiveFitness: 1.0,
    resistanceCost: 0.1,
  },
  gridSize: {
    width: 100,
    height: 100,
  },
};

// Help text for each parameter
const helpText = {
  populationSize:
    "The total number of bacterial cells in the simulation. Larger populations show more realistic evolutionary patterns but require more computational resources. Typical bacterial colonies range from thousands to millions of cells.",
  generations:
    "Number of reproduction cycles to simulate. Each generation represents one round of bacterial division, mutation, and selection. More generations show long-term evolutionary trends but take longer to compute.",
  mutationRate:
    "Probability that a bacterium acquires a new mutation per generation. Typical bacterial mutation rates range from 0.01% to 0.1% per generation. Higher rates increase genetic diversity but may overwhelm selection.",
  hgtRate:
    "Probability of horizontal gene transfer (HGT) between bacteria per generation. HGT allows rapid spread of resistance genes between bacterial cells. Clinical rates vary from 0.1% to 5% depending on bacterial species and conditions.",
  initialResistanceFrequency:
    "Percentage of bacteria that start with antibiotic resistance. In clinical settings, this typically ranges from 0.1% (rare resistance) to 10% (common resistance) depending on previous antibiotic exposure.",
  antibioticConcentration:
    "Antibiotic dosage relative to the minimum inhibitory concentration (MIC). 1x = standard therapeutic dose, 0.5x = sub-therapeutic, 2x = high dose. Higher concentrations increase selective pressure for resistance.",
  resistantFitness:
    "Reproductive rate of resistant bacteria relative to baseline. Values < 1.0 indicate resistance comes with a fitness cost, > 1.0 indicates a fitness advantage. Typically ranges from 0.8-1.2 in clinical settings.",
  sensitiveFitness:
    "Reproductive rate of antibiotic-sensitive bacteria relative to baseline. Usually set to 1.0 as the reference point. May be reduced if antibiotics have sublethal effects on sensitive bacteria.",
  resistanceCost:
    "Additional fitness reduction for resistant bacteria due to metabolic burden of resistance mechanisms. Typically 0.05-0.3 (5-30% fitness cost). Higher costs make resistance less likely to persist without antibiotic pressure.",
  gridWidth:
    "Width of the spatial grid for bacterial population. Spatial structure affects gene flow and local competition. Larger grids allow more complex spatial patterns but require more computation.",
  gridHeight:
    "Height of the spatial grid for bacterial population. Combined with width, determines total available space for bacterial growth and spatial evolutionary dynamics.",
};

// Recommended values for quick reference
const recommendations = {
  populationSize: {
    small: { value: 5000, label: "Small Study" },
    medium: { value: 10000, label: "Standard" },
    large: { value: 50000, label: "Large Scale" },
  },
  generations: {
    short: { value: 50, label: "Short Term" },
    medium: { value: 100, label: "Standard" },
    long: { value: 500, label: "Long Term" },
  },
  antibioticConcentration: {
    subtherapeutic: { value: 0.5, label: "Sub-therapeutic" },
    therapeutic: { value: 1.0, label: "Therapeutic" },
    high: { value: 2.0, label: "High Dose" },
  },
};

export default function SimulationParametersForm() {
  const { addNotification } = useNotificationsHook();
  const [parameters, setParameters] =
    useState<SimulationParameters>(defaultParameters);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [validationErrors, setValidationErrors] = useState<any[]>([]);
  const [isValidating, setIsValidating] = useState(false);
  const [announceMessage, setAnnounceMessage] = useState<string>("");
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [autoSaveEnabled, setAutoSaveEnabled] = useState(true);

  // Get notification system hooks
  const { validateAndNotify, showNotification } = useNotifications();

  // Refs for focus management
  const firstErrorRef = useRef<HTMLDivElement>(null);
  const submitButtonRef = useRef<HTMLButtonElement>(null);
  const formRef = useRef<HTMLFormElement>(null);

  // Form ID for recovery mechanisms
  const FORM_ID = "simulation-parameters-form";

  // Initialize recovery mechanisms
  useEffect(() => {
    // Check for previous session data
    if (FormStateManager.hasFormState(FORM_ID)) {
      FormStateManager.restoreFormState(FORM_ID, {
        showNotification: true,
        onRestore: data => {
          setParameters(data);
          setHasUnsavedChanges(false);
          announceToScreenReader("Previous form data has been restored.");
        },
        onError: error => {
          console.error("Failed to restore form state:", error);
        },
      });
    }

    // Start auto-save
    autoSaveManager.startAutoSave(
      {
        key: FORM_ID,
        interval: 30000, // Save every 30 seconds
        maxVersions: 5,
        enabled: autoSaveEnabled,
      },
      () => parameters,
      () => {
        console.log("Form auto-saved");
      }
    );

    // Register form features for graceful degradation
    GracefulDegradationManager.registerFeature("validation", true);
    GracefulDegradationManager.registerFeature(
      "autosave",
      recoveryUtils.checkBrowserSupport()
    );

    // Check for recovery data on component mount
    if (FormStateManager.hasRecoveryData(FORM_ID)) {
      RecoveryFlowManager.offerDataRecovery(
        FORM_ID,
        recoveredData => {
          setParameters(recoveredData);
          addNotification({
            type: "success",
            title: "Data Restored",
            message: "Your previous simulation parameters have been restored.",
            duration: 5000,
          });
        },
        () => {
          addNotification({
            type: "info",
            title: "Starting Fresh",
            message: "Starting with default parameters.",
            duration: 3000,
          });
        }
      );
    }

    // Cleanup on unmount
    return () => {
      autoSaveManager.stopAutoSave(FORM_ID);
    };
  }, []);

  // Track unsaved changes
  useEffect(() => {
    const hasChanges =
      JSON.stringify(parameters) !== JSON.stringify(defaultParameters);
    setHasUnsavedChanges(hasChanges);

    // Update DOM attribute for beforeunload handler
    if (formRef.current) {
      formRef.current.setAttribute(
        "data-has-unsaved-changes",
        hasChanges.toString()
      );
    }

    // Save form state when parameters change
    if (hasChanges) {
      FormStateManager.saveFormState(FORM_ID, parameters);
    }
  }, [parameters]);

  // Screen reader announcement
  const announceToScreenReader = useCallback((message: string) => {
    setAnnounceMessage(message);
    // Clear after a brief delay to allow screen reader to announce
    setTimeout(() => setAnnounceMessage(""), 1000);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsValidating(true);

    try {
      // Use graceful degradation for validation
      const validationResult = GracefulDegradationManager.executeWithFallback(
        "validation",
        () => {
          // Primary validation using centralized system
          return validateAndNotify(
            parameters,
            simulationParametersSchema,
            validatedData => {
              // Success callback
              console.log("✅ Valid simulation parameters:", validatedData);
              setErrors({});
              setValidationErrors([]);
              setHasUnsavedChanges(false);

              // Clear saved form state on successful submission
              FormStateManager.clearFormState(FORM_ID);

              showNotification("success", {
                title: "Parameters Validated",
                description:
                  "Simulation parameters are valid and ready to use.",
                duration: 4000,
              });

              announceToScreenReader(
                "Simulation parameters validated successfully. Ready to start simulation."
              );

              // This will be connected to the backend simulation API
              // simulationAPI.startSimulation(validatedData);
            },
            validationErrors => {
              // Error callback with recovery flow
              const errorMap: Record<string, string> = {};

              validationErrors.forEach(error => {
                errorMap[error.field] = error.message;
              });

              setErrors(errorMap);
              setValidationErrors(validationErrors);

              // Show recovery flow for validation errors
              RecoveryFlowManager.showValidationRecoveryFlow(
                validationErrors,
                () => {
                  // Focus first error field
                  setTimeout(() => {
                    if (firstErrorRef.current) {
                      firstErrorRef.current.focus();
                    }
                  }, 100);
                }
              );

              const errorCount = validationErrors.length;
              announceToScreenReader(
                `Validation failed. ${errorCount} error${
                  errorCount !== 1 ? "s" : ""
                } found. Please review and correct the highlighted fields.`
              );
            }
          );
        },
        () => {
          // Fallback validation using basic validation
          const validation = validateSimulationParameters(parameters);

          if (validation.success) {
            setErrors({});
            setValidationErrors([]);
            showNotification("success", {
              title: "Parameters Validated (Fallback)",
              description:
                "Basic validation passed. Some advanced features may be unavailable.",
              duration: 4000,
            });
            return true;
          } else {
            RecoveryFlowManager.showFeatureUnavailableFlow(
              "Advanced Validation",
              ["Basic validation", "Manual review"]
            );
            return false;
          }
        }
      );
    } catch (error) {
      SimulationErrorHandler.handleSimulationError(
        error,
        "parameter validation"
      );
      announceToScreenReader("An unexpected error occurred during validation.");

      // Show error recovery flow
      if (error instanceof Error) {
        RecoveryFlowManager.showErrorRecoveryFlow(error as any, [
          {
            label: "Retry Validation",
            action: () => handleSubmit(e),
          },
          {
            label: "Reset Form",
            action: handleReset,
          },
        ]);
      }
    } finally {
      setIsValidating(false);
    }
  };

  const handleReset = () => {
    // Check for unsaved changes before reset
    if (hasUnsavedChanges) {
      RecoveryFlowManager.showDataLossPreventionFlow(FORM_ID, data => {
        // Save current state before reset
        recoveryUtils.createCheckpoint("before_reset", parameters);

        // Proceed with reset
        performReset();
      });
    } else {
      performReset();
    }
  };

  const performReset = () => {
    setParameters(defaultParameters);
    setErrors({});
    setValidationErrors([]);
    setHasUnsavedChanges(false);

    // Clear saved form state
    FormStateManager.clearFormState(FORM_ID);

    showNotification("info", {
      title: "Form Reset",
      description: "All parameters have been reset to default values.",
      duration: 3000,
    });

    announceToScreenReader("Form reset to default values.");
  };

  const updateParameter = (key: keyof SimulationParameters, value: number) => {
    setParameters(prev => ({
      ...prev,
      [key]: value,
    }));

    // Real-time validation for individual parameters
    if (key in parameterValidators) {
      const validator =
        parameterValidators[key as keyof typeof parameterValidators];
      const error = validator(value);

      setErrors(prev => {
        const newErrors = {
          ...prev,
          [key]: error || "",
        };

        // Clear validation errors for this field if no error
        if (!error && validationErrors.length > 0) {
          setValidationErrors(prev => prev.filter(err => err.field !== key));
        }

        // Announce validation status for screen readers
        if (error) {
          announceToScreenReader(`${key}: ${error}`);

          // Show field-specific validation error
          ValidationErrorHandler.showFieldValidationError(
            key.replace(/([A-Z])/g, " $1").toLowerCase(),
            error
          );
        } else if (prev[key]) {
          announceToScreenReader(`${key}: Value corrected.`);
        }

        return newErrors;
      });
    }
  };

  const updateFitnessValue = (
    key: keyof SimulationParameters["fitnessValues"],
    value: number
  ) => {
    setParameters(prev => ({
      ...prev,
      fitnessValues: {
        ...prev.fitnessValues,
        [key]: value,
      },
    }));

    // Clear fitness-related errors temporarily
    setErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors.fitnessValues;
      return newErrors;
    });
  };

  const updateGridSize = (
    key: keyof SimulationParameters["gridSize"],
    value: number
  ) => {
    const newParameters = {
      ...parameters,
      gridSize: {
        ...parameters.gridSize,
        [key]: value,
      },
    };

    setParameters(newParameters);

    // Announce grid size changes for screen readers
    const totalCells =
      newParameters.gridSize.width * newParameters.gridSize.height;
    if (totalCells > 40000) {
      announceToScreenReader(
        `Warning: Grid size is ${formatNumber(
          totalCells
        )} cells. This may impact performance.`
      );
    }

    // Clear grid-related errors temporarily
    setErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors.gridSize;
      return newErrors;
    });
  };

  // Keyboard navigation helpers
  const handleKeyDown = (e: React.KeyboardEvent, action: () => void) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      action();
    }
  };

  // Quick preset handlers
  const applyPreset = (
    category: "populationSize" | "generations" | "antibioticConcentration",
    preset: string
  ) => {
    if (
      category === "populationSize" &&
      preset in recommendations.populationSize
    ) {
      const presetValue =
        recommendations.populationSize[
          preset as keyof typeof recommendations.populationSize
        ];
      updateParameter("populationSize", presetValue.value);
      announceToScreenReader(
        `Applied ${presetValue.label} preset: ${presetValue.value}`
      );
    } else if (
      category === "generations" &&
      preset in recommendations.generations
    ) {
      const presetValue =
        recommendations.generations[
          preset as keyof typeof recommendations.generations
        ];
      updateParameter("generations", presetValue.value);
      announceToScreenReader(
        `Applied ${presetValue.label} preset: ${presetValue.value}`
      );
    } else if (
      category === "antibioticConcentration" &&
      preset in recommendations.antibioticConcentration
    ) {
      const presetValue =
        recommendations.antibioticConcentration[
          preset as keyof typeof recommendations.antibioticConcentration
        ];
      updateParameter("antibioticConcentration", presetValue.value);
      announceToScreenReader(
        `Applied ${presetValue.label} preset: ${presetValue.value}`
      );
    }
  };

  return (
    <TooltipProvider>
      {/* Screen reader announcements */}
      <div
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
      >
        {announceMessage}
      </div>

      <form
        onSubmit={handleSubmit}
        className="space-y-6"
        role="form"
        aria-label="Simulation Parameters Configuration"
        noValidate
        ref={formRef}
      >
        {/* Global validation errors */}
        {validationErrors.length > 0 && (
          <ValidationAlert
            errors={validationErrors}
            className="mb-6"
            dismissible={true}
            onDismiss={() => setValidationErrors([])}
          />
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Basic Population Parameters */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                Population Parameters
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    <p>
                      Configure the basic characteristics of your bacterial
                      population including size and duration of the simulation.
                    </p>
                  </TooltipContent>
                </Tooltip>
              </CardTitle>
              <CardDescription>
                Basic settings for the bacterial population
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label
                    htmlFor="populationSize"
                    className={`flex items-center gap-2 ${
                      errors.populationSize ? "text-red-600" : ""
                    }`}
                  >
                    Population Size: {formatNumber(parameters.populationSize)}
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <HelpCircle className="h-4 w-4 text-muted-foreground cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent className="max-w-sm">
                        <p>{helpText.populationSize}</p>
                      </TooltipContent>
                    </Tooltip>
                  </Label>
                  <div className="flex gap-1">
                    {Object.entries(recommendations.populationSize).map(
                      ([key, preset]) => (
                        <Tooltip key={key}>
                          <TooltipTrigger asChild>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="h-6 px-2 text-xs"
                              onClick={() => applyPreset("populationSize", key)}
                            >
                              {preset.label}
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Set to {formatNumber(preset.value)}</p>
                          </TooltipContent>
                        </Tooltip>
                      )
                    )}
                  </div>
                </div>
                <Slider
                  id="populationSize"
                  min={1000}
                  max={100000}
                  step={1000}
                  value={[parameters.populationSize]}
                  onValueChange={value =>
                    updateParameter("populationSize", value[0])
                  }
                  className="w-full"
                  aria-label={`Population Size: ${formatNumber(
                    parameters.populationSize
                  )}`}
                  aria-describedby={
                    errors.populationSize
                      ? "populationSize-error"
                      : "populationSize-range"
                  }
                  aria-invalid={!!errors.populationSize}
                />
                <div
                  id="populationSize-range"
                  className="flex justify-between text-xs text-gray-500"
                  role="group"
                  aria-label="Population size range"
                >
                  <span>1,000</span>
                  <span>100,000</span>
                </div>
                {errors.populationSize && (
                  <Alert
                    variant="destructive"
                    className="py-2"
                    ref={!firstErrorRef.current ? firstErrorRef : undefined}
                    tabIndex={-1}
                  >
                    <AlertDescription
                      className="text-sm"
                      id="populationSize-error"
                      role="alert"
                    >
                      {errors.populationSize}
                    </AlertDescription>
                  </Alert>
                )}
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label
                    htmlFor="generations"
                    className={`flex items-center gap-2 ${
                      errors.generations ? "text-red-600" : ""
                    }`}
                  >
                    Number of Generations: {parameters.generations}
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <HelpCircle className="h-4 w-4 text-muted-foreground cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent className="max-w-sm">
                        <p>{helpText.generations}</p>
                      </TooltipContent>
                    </Tooltip>
                  </Label>
                  <div className="flex gap-1">
                    {Object.entries(recommendations.generations).map(
                      ([key, preset]) => (
                        <Tooltip key={key}>
                          <TooltipTrigger asChild>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="h-6 px-2 text-xs"
                              onClick={() => applyPreset("generations", key)}
                            >
                              {preset.label}
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Set to {preset.value} generations</p>
                          </TooltipContent>
                        </Tooltip>
                      )
                    )}
                  </div>
                </div>
                <Slider
                  id="generations"
                  min={10}
                  max={1000}
                  step={10}
                  value={[parameters.generations]}
                  onValueChange={value =>
                    updateParameter("generations", value[0])
                  }
                  className="w-full"
                  aria-label={`Number of Generations: ${parameters.generations}`}
                  aria-describedby={
                    errors.generations
                      ? "generations-error"
                      : "generations-range"
                  }
                  aria-invalid={!!errors.generations}
                />
                <div
                  id="generations-range"
                  className="flex justify-between text-xs text-gray-500"
                  role="group"
                  aria-label="Generations range"
                >
                  <span>10</span>
                  <span>1,000</span>
                </div>
                {errors.generations && (
                  <Alert
                    variant="destructive"
                    className="py-2"
                    ref={!firstErrorRef.current ? firstErrorRef : undefined}
                    tabIndex={-1}
                  >
                    <AlertDescription
                      className="text-sm"
                      id="generations-error"
                      role="alert"
                    >
                      {errors.generations}
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Evolution Parameters */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                Evolution Parameters
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    <p>
                      Control the mechanisms of bacterial evolution: spontaneous
                      mutations and horizontal gene transfer between cells.
                    </p>
                  </TooltipContent>
                </Tooltip>
              </CardTitle>
              <CardDescription>
                Settings for mutation and gene transfer mechanisms
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label
                  htmlFor="mutationRate"
                  className={`flex items-center gap-2 ${
                    errors.mutationRate ? "text-red-600" : ""
                  }`}
                >
                  Mutation Rate: {formatPercentage(parameters.mutationRate, 3)}
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <HelpCircle className="h-4 w-4 text-muted-foreground cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent className="max-w-sm">
                      <p>{helpText.mutationRate}</p>
                    </TooltipContent>
                  </Tooltip>
                </Label>
                <Slider
                  id="mutationRate"
                  min={0.0001}
                  max={0.01}
                  step={0.0001}
                  value={[parameters.mutationRate]}
                  onValueChange={value =>
                    updateParameter("mutationRate", value[0])
                  }
                  className="w-full"
                  aria-label={`Mutation Rate: ${formatPercentage(
                    parameters.mutationRate,
                    3
                  )}`}
                  aria-describedby={
                    errors.mutationRate
                      ? "mutationRate-error"
                      : "mutationRate-range"
                  }
                  aria-invalid={!!errors.mutationRate}
                />
                <div
                  id="mutationRate-range"
                  className="flex justify-between text-xs text-gray-500"
                  role="group"
                  aria-label="Mutation rate range"
                >
                  <span>0.01%</span>
                  <span>1%</span>
                </div>
                {errors.mutationRate && (
                  <Alert
                    variant="destructive"
                    className="py-2"
                    ref={!firstErrorRef.current ? firstErrorRef : undefined}
                    tabIndex={-1}
                  >
                    <AlertDescription
                      className="text-sm"
                      id="mutationRate-error"
                      role="alert"
                    >
                      {errors.mutationRate}
                    </AlertDescription>
                  </Alert>
                )}
              </div>

              <div className="space-y-2">
                <Label
                  htmlFor="hgtRate"
                  className={`flex items-center gap-2 ${
                    errors.hgtRate ? "text-red-600" : ""
                  }`}
                >
                  Horizontal Gene Transfer Rate:{" "}
                  {formatPercentage(parameters.hgtRate, 2)}
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <HelpCircle className="h-4 w-4 text-muted-foreground cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent className="max-w-sm">
                      <p>{helpText.hgtRate}</p>
                    </TooltipContent>
                  </Tooltip>
                </Label>
                <Slider
                  id="hgtRate"
                  min={0.001}
                  max={0.1}
                  step={0.001}
                  value={[parameters.hgtRate]}
                  onValueChange={value => updateParameter("hgtRate", value[0])}
                  className="w-full"
                  aria-label={`Horizontal Gene Transfer Rate: ${formatPercentage(
                    parameters.hgtRate,
                    2
                  )}`}
                  aria-describedby={
                    errors.hgtRate ? "hgtRate-error" : "hgtRate-range"
                  }
                  aria-invalid={!!errors.hgtRate}
                />
                <div
                  id="hgtRate-range"
                  className="flex justify-between text-xs text-gray-500"
                  role="group"
                  aria-label="HGT rate range"
                >
                  <span>0.1%</span>
                  <span>10%</span>
                </div>
                {errors.hgtRate && (
                  <Alert
                    variant="destructive"
                    className="py-2"
                    ref={!firstErrorRef.current ? firstErrorRef : undefined}
                    tabIndex={-1}
                  >
                    <AlertDescription
                      className="text-sm"
                      id="hgtRate-error"
                      role="alert"
                    >
                      {errors.hgtRate}
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Antibiotic Parameters */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                Antibiotic Parameters
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    <p>
                      Configure antibiotic treatment parameters including dosage
                      and initial resistance levels in the population.
                    </p>
                  </TooltipContent>
                </Tooltip>
              </CardTitle>
              <CardDescription>
                Antibiotic concentration and resistance settings
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label
                  htmlFor="initialResistanceFrequency"
                  className={`flex items-center gap-2 ${
                    errors.initialResistanceFrequency ? "text-red-600" : ""
                  }`}
                >
                  Initial Resistance Frequency:{" "}
                  {formatPercentage(parameters.initialResistanceFrequency, 2)}
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <HelpCircle className="h-4 w-4 text-muted-foreground cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent className="max-w-sm">
                      <p>{helpText.initialResistanceFrequency}</p>
                    </TooltipContent>
                  </Tooltip>
                </Label>
                <Slider
                  id="initialResistanceFrequency"
                  min={0.001}
                  max={0.5}
                  step={0.001}
                  value={[parameters.initialResistanceFrequency]}
                  onValueChange={value =>
                    updateParameter("initialResistanceFrequency", value[0])
                  }
                  className="w-full"
                  aria-label={`Initial Resistance Frequency: ${formatPercentage(
                    parameters.initialResistanceFrequency * 100
                  )}`}
                  aria-describedby={
                    errors.initialResistanceFrequency
                      ? "initialResistanceFrequency-error"
                      : "initialResistanceFrequency-range"
                  }
                  aria-invalid={!!errors.initialResistanceFrequency}
                />
                <div
                  id="initialResistanceFrequency-range"
                  className="flex justify-between text-xs text-gray-500"
                  role="group"
                  aria-label="Initial resistance frequency range"
                >
                  <span>0.1%</span>
                  <span>50%</span>
                </div>
                {errors.initialResistanceFrequency && (
                  <Alert
                    variant="destructive"
                    className="py-2"
                    ref={!firstErrorRef.current ? firstErrorRef : undefined}
                    tabIndex={-1}
                  >
                    <AlertDescription
                      className="text-sm"
                      id="initialResistanceFrequency-error"
                      role="alert"
                    >
                      {errors.initialResistanceFrequency}
                    </AlertDescription>
                  </Alert>
                )}
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label
                    htmlFor="antibioticConcentration"
                    className={`flex items-center gap-2 ${
                      errors.antibioticConcentration ? "text-red-600" : ""
                    }`}
                  >
                    Antibiotic Concentration:{" "}
                    {formatNumber(parameters.antibioticConcentration, {
                      decimals: 2,
                      unit: "x",
                    })}
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <HelpCircle className="h-4 w-4 text-muted-foreground cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent className="max-w-sm">
                        <p>{helpText.antibioticConcentration}</p>
                      </TooltipContent>
                    </Tooltip>
                  </Label>
                  <div className="flex gap-1">
                    {Object.entries(
                      recommendations.antibioticConcentration
                    ).map(([key, preset]) => (
                      <Tooltip key={key}>
                        <TooltipTrigger asChild>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-6 px-2 text-xs"
                            onClick={() =>
                              applyPreset("antibioticConcentration", key)
                            }
                          >
                            {preset.label}
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Set to {preset.value}x concentration</p>
                        </TooltipContent>
                      </Tooltip>
                    ))}
                  </div>
                </div>
                <Slider
                  id="antibioticConcentration"
                  min={0.1}
                  max={10}
                  step={0.1}
                  value={[parameters.antibioticConcentration]}
                  onValueChange={value =>
                    updateParameter("antibioticConcentration", value[0])
                  }
                  className="w-full"
                  aria-label={`Antibiotic Concentration: ${formatNumber(
                    parameters.antibioticConcentration,
                    { decimals: 2 }
                  )} times`}
                  aria-describedby={
                    errors.antibioticConcentration
                      ? "antibioticConcentration-error"
                      : "antibioticConcentration-range"
                  }
                  aria-invalid={!!errors.antibioticConcentration}
                />
                <div
                  id="antibioticConcentration-range"
                  className="flex justify-between text-xs text-gray-500"
                  role="group"
                  aria-label="Antibiotic concentration range"
                >
                  <span>0.1x</span>
                  <span>10x</span>
                </div>
                {errors.antibioticConcentration && (
                  <Alert
                    variant="destructive"
                    className="py-2"
                    ref={!firstErrorRef.current ? firstErrorRef : undefined}
                    tabIndex={-1}
                  >
                    <AlertDescription
                      className="text-sm"
                      id="antibioticConcentration-error"
                      role="alert"
                    >
                      {errors.antibioticConcentration}
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Fitness Parameters */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                Fitness Parameters
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    <p>
                      Define the relative reproductive success of resistant vs.
                      sensitive bacteria under different conditions.
                    </p>
                  </TooltipContent>
                </Tooltip>
              </CardTitle>
              <CardDescription>
                Relative fitness values for resistant and sensitive bacteria
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label
                  htmlFor="resistantFitness"
                  className="flex items-center gap-2"
                >
                  Resistant Fitness:{" "}
                  {formatNumber(parameters.fitnessValues.resistantFitness, {
                    decimals: 2,
                  })}
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <HelpCircle className="h-4 w-4 text-muted-foreground cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent className="max-w-sm">
                      <p>{helpText.resistantFitness}</p>
                    </TooltipContent>
                  </Tooltip>
                </Label>
                <Slider
                  id="resistantFitness"
                  min={0.1}
                  max={1.5}
                  step={0.01}
                  value={[parameters.fitnessValues.resistantFitness]}
                  onValueChange={value =>
                    updateFitnessValue("resistantFitness", value[0])
                  }
                  className="w-full"
                  aria-label={`Resistant Fitness: ${formatNumber(
                    parameters.fitnessValues.resistantFitness,
                    { decimals: 2 }
                  )}`}
                  aria-describedby="resistantFitness-range"
                />
                <div
                  id="resistantFitness-range"
                  className="flex justify-between text-xs text-gray-500"
                  role="group"
                  aria-label="Resistant fitness range"
                >
                  <span>0.1</span>
                  <span>1.5</span>
                </div>
              </div>

              <div className="space-y-2">
                <Label
                  htmlFor="sensitiveFitness"
                  className="flex items-center gap-2"
                >
                  Sensitive Fitness:{" "}
                  {formatNumber(parameters.fitnessValues.sensitiveFitness, {
                    decimals: 2,
                  })}
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <HelpCircle className="h-4 w-4 text-muted-foreground cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent className="max-w-sm">
                      <p>{helpText.sensitiveFitness}</p>
                    </TooltipContent>
                  </Tooltip>
                </Label>
                <Slider
                  id="sensitiveFitness"
                  min={0.1}
                  max={1.5}
                  step={0.01}
                  value={[parameters.fitnessValues.sensitiveFitness]}
                  onValueChange={value =>
                    updateFitnessValue("sensitiveFitness", value[0])
                  }
                  className="w-full"
                  aria-label={`Sensitive Fitness: ${formatNumber(
                    parameters.fitnessValues.sensitiveFitness,
                    { decimals: 2 }
                  )}`}
                  aria-describedby="sensitiveFitness-range"
                />
                <div
                  id="sensitiveFitness-range"
                  className="flex justify-between text-xs text-gray-500"
                  role="group"
                  aria-label="Sensitive fitness range"
                >
                  <span>0.1</span>
                  <span>1.5</span>
                </div>
              </div>

              <div className="space-y-2">
                <Label
                  htmlFor="resistanceCost"
                  className="flex items-center gap-2"
                >
                  Resistance Cost:{" "}
                  {formatNumber(parameters.fitnessValues.resistanceCost, {
                    decimals: 2,
                  })}
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <HelpCircle className="h-4 w-4 text-muted-foreground cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent className="max-w-sm">
                      <p>{helpText.resistanceCost}</p>
                    </TooltipContent>
                  </Tooltip>
                </Label>
                <Slider
                  id="resistanceCost"
                  min={0}
                  max={0.5}
                  step={0.01}
                  value={[parameters.fitnessValues.resistanceCost]}
                  onValueChange={value =>
                    updateFitnessValue("resistanceCost", value[0])
                  }
                  className="w-full"
                  aria-label={`Resistance Cost: ${formatNumber(
                    parameters.fitnessValues.resistanceCost,
                    { decimals: 2 }
                  )}`}
                  aria-describedby="resistanceCost-range"
                />
                <div
                  id="resistanceCost-range"
                  className="flex justify-between text-xs text-gray-500"
                  role="group"
                  aria-label="Resistance cost range"
                >
                  <span>0</span>
                  <span>0.5</span>
                </div>
              </div>

              {errors.fitnessValues && (
                <Alert
                  variant="destructive"
                  className="py-2"
                  ref={!firstErrorRef.current ? firstErrorRef : undefined}
                  tabIndex={-1}
                >
                  <AlertDescription className="text-sm" role="alert">
                    {errors.fitnessValues}
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>

          {/* Spatial Parameters */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                Spatial Parameters
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    <p>
                      Configure the spatial environment where bacteria live and
                      interact. Spatial structure affects evolution patterns.
                    </p>
                  </TooltipContent>
                </Tooltip>
              </CardTitle>
              <CardDescription>
                Grid size and spatial distribution settings
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label
                    htmlFor="gridWidth"
                    className="flex items-center gap-2"
                  >
                    Grid Width: {parameters.gridSize.width}
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <HelpCircle className="h-4 w-4 text-muted-foreground cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent className="max-w-sm">
                        <p>{helpText.gridWidth}</p>
                      </TooltipContent>
                    </Tooltip>
                  </Label>
                  <Slider
                    id="gridWidth"
                    min={50}
                    max={200}
                    step={10}
                    value={[parameters.gridSize.width]}
                    onValueChange={value => updateGridSize("width", value[0])}
                    className="w-full"
                    aria-label={`Grid Width: ${parameters.gridSize.width}`}
                    aria-describedby="gridWidth-range"
                  />
                  <div
                    id="gridWidth-range"
                    className="flex justify-between text-xs text-gray-500"
                    role="group"
                    aria-label="Grid width range"
                  >
                    <span>50</span>
                    <span>200</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label
                    htmlFor="gridHeight"
                    className="flex items-center gap-2"
                  >
                    Grid Height: {parameters.gridSize.height}
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <HelpCircle className="h-4 w-4 text-muted-foreground cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent className="max-w-sm">
                        <p>{helpText.gridHeight}</p>
                      </TooltipContent>
                    </Tooltip>
                  </Label>
                  <Slider
                    id="gridHeight"
                    min={50}
                    max={200}
                    step={10}
                    value={[parameters.gridSize.height]}
                    onValueChange={value => updateGridSize("height", value[0])}
                    className="w-full"
                    aria-label={`Grid Height: ${parameters.gridSize.height}`}
                    aria-describedby="gridHeight-range"
                  />
                  <div
                    id="gridHeight-range"
                    className="flex justify-between text-xs text-gray-500"
                    role="group"
                    aria-label="Grid height range"
                  >
                    <span>50</span>
                    <span>200</span>
                  </div>
                </div>
              </div>

              <div
                className={`p-3 rounded-md ${
                  parameters.gridSize.width * parameters.gridSize.height > 40000
                    ? "bg-red-50 border border-red-200"
                    : "bg-blue-50"
                }`}
                role="status"
                aria-live="polite"
              >
                <p
                  className={`text-sm ${
                    parameters.gridSize.width * parameters.gridSize.height >
                    40000
                      ? "text-red-700"
                      : "text-blue-700"
                  }`}
                >
                  <strong>Total Grid Cells:</strong>{" "}
                  {formatNumber(
                    parameters.gridSize.width * parameters.gridSize.height
                  )}
                  {parameters.gridSize.width * parameters.gridSize.height >
                    40000 && (
                    <span className="block mt-1 font-medium">
                      ⚠️ Grid too large for optimal performance
                    </span>
                  )}
                </p>
              </div>

              {errors.gridSize && (
                <Alert
                  variant="destructive"
                  className="py-2"
                  ref={!firstErrorRef.current ? firstErrorRef : undefined}
                  tabIndex={-1}
                >
                  <AlertDescription className="text-sm" role="alert">
                    {errors.gridSize}
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Form Actions */}
        <div className="flex flex-col sm:flex-row gap-4 pt-6 border-t">
          <Button
            ref={submitButtonRef}
            type="submit"
            className="flex-1 sm:flex-none"
            disabled={
              isValidating || Object.values(errors).some(error => error)
            }
            aria-describedby="submit-status"
          >
            {isValidating ? "Validating..." : "Start Simulation"}
          </Button>
          <div id="submit-status" className="sr-only" aria-live="polite">
            {Object.values(errors).some(error => error)
              ? "Cannot submit: form contains validation errors"
              : "Ready to submit simulation"}
          </div>
          <Button
            type="button"
            variant="outline"
            onClick={handleReset}
            onKeyDown={e => handleKeyDown(e, handleReset)}
          >
            Reset to Defaults
          </Button>
          <Button
            type="button"
            variant="secondary"
            aria-describedby="preset-feature-note"
          >
            Load Preset
          </Button>
          <Button
            type="button"
            variant="secondary"
            aria-describedby="preset-feature-note"
          >
            Save as Preset
          </Button>
          <div id="preset-feature-note" className="sr-only">
            Preset functionality will be implemented in future updates
          </div>
        </div>
      </form>
    </TooltipProvider>
  );
}
