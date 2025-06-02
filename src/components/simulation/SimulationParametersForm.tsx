"use client";

import { useState, useRef, useCallback, useEffect } from "react";
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
import { CollapsibleSection } from "@/components/ui/collapsible-section";
import { HelpCircle, Settings, Zap, Target } from "lucide-react";
import {
  type SimulationParameters,
  validateSimulationParameters,
  parameterValidators,
} from "@/lib/validation";
import { formatNumber, formatPercentage } from "@/lib/utils";
import {
  useNotifications,
  ValidationAlert,
  ValidationError,
} from "@/components/ui/notification-system";
import {
  ValidationErrorHandler,
  SimulationErrorHandler,
} from "@/lib/error-handling";
import {
  FormStateManager,
  GracefulDegradationManager,
  RecoveryFlowManager,
  RecoveryUtils,
} from "@/lib/recovery-mechanisms";
import { SimulationParametersApiSchema } from "@/lib/schemas/api";
import { useNotifications as useNotificationsHook } from "@/hooks/useNotifications";
import {
  buttons,
  grids,
  padding,
  typography,
  formField,
} from "@/lib/responsive";

interface SimulationParametersFormProps {
  onStartSimulation: (tab: string) => void;
}

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

export default function SimulationParametersForm({
  onStartSimulation,
}: SimulationParametersFormProps) {
  const { addNotification } = useNotificationsHook();
  const [parameters, setParameters] =
    useState<SimulationParameters>(defaultParameters);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>(
    []
  );
  const [announceMessage, setAnnounceMessage] = useState<string>("");
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isAutoSaveEnabled] = useState(true);

  // Get notification system hooks
  const { validateAndNotify, showNotification } = useNotifications();

  // Refs for focus management
  const firstErrorRef = useRef<HTMLDivElement>(null);
  const formRef = useRef<HTMLFormElement>(null);

  // Form ID for recovery mechanisms
  const FORM_ID = "simulation-parameters-form";

  // Screen reader announcement
  const announceToScreenReader = useCallback((message: string) => {
    setAnnounceMessage(message);
    // Clear after a brief delay to allow screen reader to announce
    setTimeout(() => setAnnounceMessage(""), 1000);
  }, []);

  // Initialize form and auto-save functionality
  useEffect(() => {
    // Restore form state if available
    if (FormStateManager.hasFormState(FORM_ID)) {
      FormStateManager.restoreFormState(FORM_ID, {
        showNotification: true,
        onRestore: data => {
          setParameters(data as SimulationParameters);
        },
        onError: error => {
          console.error("Failed to restore form state:", error);
        },
      });
    }

    // Register form features for graceful degradation
    const browserSupport = RecoveryUtils.checkBrowserSupport();

    // Enable graceful degradation for validation if needed
    if (!browserSupport.localStorage) {
      GracefulDegradationManager.enableFeatureDegradation({
        feature: "validation",
        userMessage: "Advanced validation is temporarily unavailable",
        retryEnabled: true,
      });
    }

    // Enable graceful degradation for autosave if browser doesn't support required features
    if (!browserSupport.localStorage || !browserSupport.sessionStorage) {
      GracefulDegradationManager.enableFeatureDegradation({
        feature: "autosave",
        userMessage: "Auto-save is temporarily unavailable",
        retryEnabled: false,
      });
    }

    // Check for recovery data on component mount
    if (FormStateManager.hasRecoveryData(FORM_ID)) {
      RecoveryFlowManager.offerDataRecovery(
        FORM_ID,
        recoveredData => {
          setParameters(recoveredData as SimulationParameters);
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
  }, [addNotification, isAutoSaveEnabled]);

  // Track unsaved changes and handle auto-save
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    try {
      // Check if validation is degraded, use fallback if needed
      if (GracefulDegradationManager.isFeatureDegraded("validation")) {
        // Try to execute fallback first
        const fallbackSuccess =
          GracefulDegradationManager.executeFallback("validation");

        if (!fallbackSuccess) {
          // Use basic validation as last resort
          const validation = validateSimulationParameters(parameters);

          if (validation.success) {
            setErrors({});
            setValidationErrors([]);
            showNotification("success", {
              title: "Parameters Validated (Basic)",
              description:
                "Basic validation passed. Some advanced features may be unavailable.",
              duration: 4000,
            });
          } else {
            showNotification("error", {
              title: "Validation Failed",
              description: "Please check your inputs and try again.",
              duration: 4000,
            });
          }
          return;
        }
      }

      // Primary validation using centralized system
      validateAndNotify(
        parameters,
        SimulationParametersApiSchema,
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
            description: "Simulation parameters are valid and ready to use.",
            duration: 4000,
          });

          announceToScreenReader(
            "Simulation parameters validated successfully. Ready to start simulation."
          );

          // This will be connected to the backend simulation API
          // simulationAPI.startSimulation(validatedData);
          onStartSimulation("simulation"); // Switch to the simulation tab
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
    } catch (error) {
      SimulationErrorHandler.handleSimulationError(
        error,
        "parameter validation"
      );
      announceToScreenReader("An unexpected error occurred during validation.");

      // Show error recovery with retry option
      RecoveryFlowManager.offerRetryWithOptions(
        "Parameter validation",
        async () => {
          handleSubmit(e);
        },
        {
          maxRetries: 2,
          fallbackFn: handleReset,
          fallbackLabel: "Reset Form",
        }
      );
    }
  };

  const handleReset = async () => {
    // Check for unsaved changes before reset
    if (hasUnsavedChanges) {
      const shouldContinue = await RecoveryFlowManager.confirmDataLoss(
        "You have unsaved changes. Are you sure you want to reset the form?"
      );

      if (!shouldContinue) {
        return;
      }
    }

    performReset();
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
      const error = validator(value); // error is string | null

      setErrors(prevErrors => {
        const newErrors = { ...prevErrors };
        if (error) {
          newErrors[key] = error;
          announceToScreenReader(`${String(key)}: ${error}`);
          // Display field-specific error notification
          ValidationErrorHandler.showFieldValidationError(
            String(key)
              .replace(/([A-Z])/g, " $1")
              .toLowerCase(), // Format key for display
            error
          );
        } else {
          // If the key exists in newErrors (i.e., it might have been an error previously),
          // delete it to signify it's now valid.
          if (Object.prototype.hasOwnProperty.call(newErrors, key)) {
            delete newErrors[key];
          }
          // Announce correction only if there was a previous error for this key
          if (prevErrors[key]) {
            announceToScreenReader(`${String(key)}: Value corrected.`);
          }
        }
        return newErrors;
      });

      // If the field-specific validation passed (error is null),
      // also remove any previous Zod-based validation errors for this field from the validationErrors array.
      if (!error) {
        setValidationErrors(prevValidationErrs =>
          prevValidationErrs.filter(err => err.field !== key)
        );
      }
    }
  };

  // Helper functions for nested parameter updates
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
  };

  const updateGridSize = (
    key: keyof SimulationParameters["gridSize"],
    value: number
  ) => {
    setParameters(prev => ({
      ...prev,
      gridSize: {
        ...prev.gridSize,
        [key]: value,
      },
    }));
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

        <div className={grids.form.single}>
          {/* Basic Population Parameters */}
          <CollapsibleSection
            title="Population Parameters"
            icon={<Settings className="h-5 w-5" />}
            defaultOpen={true}
            className="border border-gray-200 rounded-lg"
            contentClassName={padding.card.responsive}
          >
            <div className="space-y-4">
              <p
                className={`${typography.body.small} text-muted-foreground mb-4`}
              >
                Configure the basic characteristics of your bacterial population
                including size and duration of the simulation.
              </p>

              <div className={formField.container}>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <Label
                    htmlFor="populationSize"
                    className={`${formField.label} ${
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
                  <div className="flex gap-1 flex-wrap">
                    {Object.entries(recommendations.populationSize).map(
                      ([key, preset]) => (
                        <Tooltip key={key}>
                          <TooltipTrigger asChild>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className={buttons.preset.responsive}
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
                  className={`flex justify-between ${typography.body.small} text-gray-500`}
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
                      className={formField.error}
                      id="populationSize-error"
                      role="alert"
                    >
                      {errors.populationSize}
                    </AlertDescription>
                  </Alert>
                )}
              </div>

              <div className={formField.container}>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <Label
                    htmlFor="generations"
                    className={`${formField.label} ${
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
                  <div className="flex gap-1 flex-wrap">
                    {Object.entries(recommendations.generations).map(
                      ([key, preset]) => (
                        <Tooltip key={key}>
                          <TooltipTrigger asChild>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className={buttons.preset.responsive}
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
                  className={`flex justify-between ${typography.body.small} text-gray-500`}
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
                      className={formField.error}
                      id="generations-error"
                      role="alert"
                    >
                      {errors.generations}
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            </div>
          </CollapsibleSection>

          {/* Evolution Parameters */}
          <CollapsibleSection
            title="Evolution Parameters"
            icon={<Zap className="h-5 w-5" />}
            defaultOpen={true}
            className="border border-gray-200 rounded-lg"
            contentClassName={padding.card.responsive}
          >
            <div className="space-y-4">
              <p
                className={`${typography.body.small} text-muted-foreground mb-4`}
              >
                Control the mechanisms of bacterial evolution: spontaneous
                mutations and horizontal gene transfer between cells.
              </p>

              <div className={formField.container}>
                <Label
                  htmlFor="mutationRate"
                  className={`${formField.label} ${
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
                  className={`flex justify-between ${typography.body.small} text-gray-500`}
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
                      className={formField.error}
                      id="mutationRate-error"
                      role="alert"
                    >
                      {errors.mutationRate}
                    </AlertDescription>
                  </Alert>
                )}
              </div>

              <div className={formField.container}>
                <Label
                  htmlFor="hgtRate"
                  className={`${formField.label} ${
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
                  className={`flex justify-between ${typography.body.small} text-gray-500`}
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
                      className={formField.error}
                      id="hgtRate-error"
                      role="alert"
                    >
                      {errors.hgtRate}
                    </AlertDescription>
                  </Alert>
                )}
              </div>

              <div className={formField.container}>
                <Label
                  htmlFor="initialResistanceFrequency"
                  className={`${formField.label} ${
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
                  max={0.1}
                  step={0.001}
                  value={[parameters.initialResistanceFrequency]}
                  onValueChange={value =>
                    updateParameter("initialResistanceFrequency", value[0])
                  }
                  className="w-full"
                  aria-label={`Initial Resistance Frequency: ${formatPercentage(
                    parameters.initialResistanceFrequency,
                    2
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
                  className={`flex justify-between ${typography.body.small} text-gray-500`}
                  role="group"
                  aria-label="Initial resistance frequency range"
                >
                  <span>0.1%</span>
                  <span>10%</span>
                </div>
                {errors.initialResistanceFrequency && (
                  <Alert
                    variant="destructive"
                    className="py-2"
                    ref={!firstErrorRef.current ? firstErrorRef : undefined}
                    tabIndex={-1}
                  >
                    <AlertDescription
                      className={formField.error}
                      id="initialResistanceFrequency-error"
                      role="alert"
                    >
                      {errors.initialResistanceFrequency}
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            </div>
          </CollapsibleSection>

          {/* Antibiotic Parameters */}
          <CollapsibleSection
            title="Antibiotic & Fitness Parameters"
            icon={<Target className="h-5 w-5" />}
            defaultOpen={true}
            className="border border-gray-200 rounded-lg"
            contentClassName={padding.card.responsive}
          >
            <div className="space-y-4">
              <p
                className={`${typography.body.small} text-muted-foreground mb-4`}
              >
                Configure antibiotic treatment parameters and fitness
                characteristics for resistant and sensitive bacteria.
              </p>

              <div className={formField.container}>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <Label
                    htmlFor="antibioticConcentration"
                    className={`${formField.label} ${
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
                  <div className="flex gap-1 flex-wrap">
                    {Object.entries(
                      recommendations.antibioticConcentration
                    ).map(([key, preset]) => (
                      <Tooltip key={key}>
                        <TooltipTrigger asChild>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className={buttons.preset.responsive}
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
                  className={`flex justify-between ${typography.body.small} text-gray-500`}
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
                      className={formField.error}
                      id="antibioticConcentration-error"
                      role="alert"
                    >
                      {errors.antibioticConcentration}
                    </AlertDescription>
                  </Alert>
                )}
              </div>

              <div className={formField.container}>
                <Label
                  htmlFor="resistantFitness"
                  className={`${formField.label} ${
                    errors.resistantFitness ? "text-red-600" : ""
                  }`}
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
                  step={0.05}
                  value={[parameters.fitnessValues.resistantFitness]}
                  onValueChange={value =>
                    updateFitnessValue("resistantFitness", value[0])
                  }
                  className="w-full"
                  aria-label={`Resistant Fitness: ${formatNumber(
                    parameters.fitnessValues.resistantFitness,
                    { decimals: 2 }
                  )}`}
                  aria-describedby={
                    errors.resistantFitness
                      ? "resistantFitness-error"
                      : "resistantFitness-range"
                  }
                  aria-invalid={!!errors.resistantFitness}
                />
                <div
                  id="resistantFitness-range"
                  className={`flex justify-between ${typography.body.small} text-gray-500`}
                  role="group"
                  aria-label="Resistant fitness range"
                >
                  <span>0.1</span>
                  <span>1.5</span>
                </div>
                {errors.resistantFitness && (
                  <Alert
                    variant="destructive"
                    className="py-2"
                    ref={!firstErrorRef.current ? firstErrorRef : undefined}
                    tabIndex={-1}
                  >
                    <AlertDescription
                      className={formField.error}
                      id="resistantFitness-error"
                      role="alert"
                    >
                      {errors.resistantFitness}
                    </AlertDescription>
                  </Alert>
                )}
              </div>

              <div className={formField.container}>
                <Label
                  htmlFor="resistanceCost"
                  className={`${formField.label} ${
                    errors.resistanceCost ? "text-red-600" : ""
                  }`}
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
                  aria-describedby={
                    errors.resistanceCost
                      ? "resistanceCost-error"
                      : "resistanceCost-range"
                  }
                  aria-invalid={!!errors.resistanceCost}
                />
                <div
                  id="resistanceCost-range"
                  className={`flex justify-between ${typography.body.small} text-gray-500`}
                  role="group"
                  aria-label="Resistance cost range"
                >
                  <span>0</span>
                  <span>0.5</span>
                </div>
                {errors.resistanceCost && (
                  <Alert
                    variant="destructive"
                    className="py-2"
                    ref={!firstErrorRef.current ? firstErrorRef : undefined}
                    tabIndex={-1}
                  >
                    <AlertDescription
                      className={formField.error}
                      id="resistanceCost-error"
                      role="alert"
                    >
                      {errors.resistanceCost}
                    </AlertDescription>
                  </Alert>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className={formField.container}>
                  <Label
                    htmlFor="gridWidth"
                    className={`${formField.label} ${
                      errors.gridWidth ? "text-red-600" : ""
                    }`}
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
                    aria-describedby={
                      errors.gridWidth ? "gridWidth-error" : "gridWidth-range"
                    }
                    aria-invalid={!!errors.gridWidth}
                  />
                  <div
                    id="gridWidth-range"
                    className={`flex justify-between ${typography.body.small} text-gray-500`}
                    role="group"
                    aria-label="Grid width range"
                  >
                    <span>50</span>
                    <span>200</span>
                  </div>
                </div>

                <div className={formField.container}>
                  <Label
                    htmlFor="gridHeight"
                    className={`${formField.label} ${
                      errors.gridHeight ? "text-red-600" : ""
                    }`}
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
                    aria-describedby={
                      errors.gridHeight
                        ? "gridHeight-error"
                        : "gridHeight-range"
                    }
                    aria-invalid={!!errors.gridHeight}
                  />
                  <div
                    id="gridHeight-range"
                    className={`flex justify-between ${typography.body.small} text-gray-500`}
                    role="group"
                    aria-label="Grid height range"
                  >
                    <span>50</span>
                    <span>200</span>
                  </div>
                </div>
              </div>
            </div>
          </CollapsibleSection>
        </div>

        {/* Form Actions */}
        <div className="flex flex-col sm:flex-row gap-4 pt-6 border-t">
          <Button
            type="submit"
            className={`${buttons.touch.medium} flex-1 sm:flex-initial`}
            disabled={Object.keys(errors).length > 0}
          >
            Start Simulation
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={handleReset}
            className={`${buttons.touch.medium} flex-1 sm:flex-initial`}
          >
            Reset to Defaults
          </Button>
        </div>
      </form>
    </TooltipProvider>
  );
}
