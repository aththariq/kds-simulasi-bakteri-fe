import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle,
  Info,
  X,
  Loader2,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "./button";

const alertVariants = cva(
  "relative w-full rounded-lg border px-4 py-3 text-sm grid has-[>svg]:grid-cols-[calc(var(--spacing)*4)_1fr] grid-cols-[0_1fr] has-[>svg]:gap-x-3 gap-y-0.5 items-start [&>svg]:size-4 [&>svg]:translate-y-0.5 [&>svg]:text-current",
  {
    variants: {
      variant: {
        default: "bg-card text-card-foreground border-border",
        destructive:
          "text-destructive bg-destructive/10 border-destructive/20 [&>svg]:text-destructive",
        warning:
          "text-amber-800 bg-amber-50 border-amber-200 [&>svg]:text-amber-600 dark:text-amber-200 dark:bg-amber-950/30 dark:border-amber-800/30",
        success:
          "text-green-800 bg-green-50 border-green-200 [&>svg]:text-green-600 dark:text-green-200 dark:bg-green-950/30 dark:border-green-800/30",
        info: "text-blue-800 bg-blue-50 border-blue-200 [&>svg]:text-blue-600 dark:text-blue-200 dark:bg-blue-950/30 dark:border-blue-800/30",
        loading:
          "text-muted-foreground bg-muted/50 border-muted [&>svg]:text-muted-foreground",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

const alertIcons = {
  default: Info,
  destructive: AlertCircle,
  warning: AlertTriangle,
  success: CheckCircle,
  info: Info,
  loading: Loader2,
} as const;

interface AlertProps
  extends React.ComponentProps<"div">,
    VariantProps<typeof alertVariants> {
  icon?: React.ComponentType<{ className?: string }> | boolean;
  dismissible?: boolean;
  onDismiss?: () => void;
}

function Alert({
  className,
  variant = "default",
  icon = true,
  dismissible = false,
  onDismiss,
  children,
  ...props
}: AlertProps) {
  const IconComponent =
    typeof icon === "boolean"
      ? icon
        ? alertIcons[variant || "default"]
        : null
      : icon;

  return (
    <div
      data-slot="alert"
      role="alert"
      className={cn(alertVariants({ variant }), className)}
      {...props}
    >
      {IconComponent && (
        <IconComponent
          className={cn(
            "size-4 translate-y-0.5",
            variant === "loading" && "animate-spin"
          )}
        />
      )}
      <div className="col-start-2 space-y-1">{children}</div>
      {dismissible && onDismiss && (
        <Button
          variant="ghost"
          size="sm"
          className="absolute top-2 right-2 h-6 w-6 p-0 hover:bg-transparent"
          onClick={onDismiss}
        >
          <X className="h-3 w-3" />
          <span className="sr-only">Dismiss</span>
        </Button>
      )}
    </div>
  );
}

function AlertTitle({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="alert-title"
      className={cn(
        "line-clamp-1 min-h-4 font-medium tracking-tight",
        className
      )}
      {...props}
    />
  );
}

function AlertDescription({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="alert-description"
      className={cn("text-sm [&_p]:leading-relaxed opacity-90", className)}
      {...props}
    />
  );
}

function AlertActions({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="alert-actions"
      className={cn("flex items-center gap-2 mt-2", className)}
      {...props}
    />
  );
}

export { Alert, AlertTitle, AlertDescription, AlertActions, alertVariants };
