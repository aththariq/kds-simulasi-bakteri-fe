"use client";

import * as React from "react";
import { HelpCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { formField, buttons, typography } from "@/lib/responsive";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export interface ResponsiveFormFieldProps {
  id: string;
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
  formatValue?: (value: number) => string;
  helpText?: string;
  error?: string;
  presets?: Array<{
    key: string;
    label: string;
    value: number;
    tooltip?: string;
  }>;
  className?: string;
  disabled?: boolean;
}

export const ResponsiveFormField: React.FC<ResponsiveFormFieldProps> = ({
  id,
  label,
  value,
  min,
  max,
  step,
  onChange,
  formatValue = val => val.toString(),
  helpText,
  error,
  presets,
  className,
  disabled = false,
}) => {
  const handleSliderChange = React.useCallback(
    (values: number[]) => {
      onChange(values[0]);
    },
    [onChange]
  );

  const handlePresetClick = React.useCallback(
    (presetValue: number) => {
      onChange(presetValue);
    },
    [onChange]
  );

  return (
    <div className={cn(formField.container, className)}>
      <div className="flex items-center justify-between">
        <Label
          htmlFor={id}
          className={cn(
            formField.label,
            error ? "text-red-600" : "",
            disabled && "opacity-50"
          )}
        >
          {label}: {formatValue(value)}
          {helpText && (
            <Tooltip>
              <TooltipTrigger asChild>
                <HelpCircle className="h-4 w-4 text-muted-foreground cursor-help" />
              </TooltipTrigger>
              <TooltipContent className="max-w-sm">
                <p className={typography.body.small}>{helpText}</p>
              </TooltipContent>
            </Tooltip>
          )}
        </Label>

        {presets && presets.length > 0 && (
          <div className="flex gap-1 flex-wrap">
            {presets.map(preset => (
              <Tooltip key={preset.key}>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className={cn(
                      buttons.preset.responsive,
                      disabled && "opacity-50 cursor-not-allowed"
                    )}
                    onClick={() => handlePresetClick(preset.value)}
                    disabled={disabled}
                  >
                    {preset.label}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p className={typography.body.small}>
                    {preset.tooltip || `Set to ${formatValue(preset.value)}`}
                  </p>
                </TooltipContent>
              </Tooltip>
            ))}
          </div>
        )}
      </div>

      <Slider
        id={id}
        min={min}
        max={max}
        step={step}
        value={[value]}
        onValueChange={handleSliderChange}
        className={cn(formField.input, disabled && "opacity-50")}
        disabled={disabled}
        aria-label={`${label}: ${formatValue(value)}`}
        aria-describedby={error ? `${id}-error` : `${id}-range`}
        aria-invalid={!!error}
      />

      <div
        id={`${id}-range`}
        className={cn(
          "flex justify-between",
          typography.body.small,
          "text-gray-500"
        )}
        role="group"
        aria-label={`${label} range`}
      >
        <span>{formatValue(min)}</span>
        <span>{formatValue(max)}</span>
      </div>

      {error && (
        <Alert variant="destructive" className="py-2" tabIndex={-1}>
          <AlertDescription
            className={cn(formField.error, typography.body.small)}
            id={`${id}-error`}
            role="alert"
          >
            {error}
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
};

export default ResponsiveFormField;
