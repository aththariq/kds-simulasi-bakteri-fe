"use client";

import * as React from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { collapsible } from "@/lib/responsive";

export interface CollapsibleSectionProps {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
  className?: string;
  triggerClassName?: string;
  contentClassName?: string;
  icon?: React.ReactNode;
  disabled?: boolean;
}

export const CollapsibleSection: React.FC<CollapsibleSectionProps> = ({
  title,
  children,
  defaultOpen = true,
  className,
  triggerClassName,
  contentClassName,
  icon,
  disabled = false,
}) => {
  const [isOpen, setIsOpen] = React.useState(defaultOpen);

  const toggleOpen = React.useCallback(() => {
    if (!disabled) {
      setIsOpen(prev => !prev);
    }
  }, [disabled]);

  const handleKeyDown = React.useCallback(
    (event: React.KeyboardEvent) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        toggleOpen();
      }
    },
    [toggleOpen]
  );

  const contentId = `collapsible-content-${title
    .replace(/\s+/g, "-")
    .toLowerCase()}`;

  return (
    <div className={cn("collapsible-section", className)}>
      <button
        type="button"
        className={cn(
          collapsible.trigger,
          "hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded-lg transition-colors",
          disabled && "opacity-50 cursor-not-allowed",
          triggerClassName
        )}
        onClick={toggleOpen}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        {...(isOpen
          ? { "aria-expanded": "true" }
          : { "aria-expanded": "false" })}
        aria-controls={contentId}
      >
        <div className="flex items-center gap-3">
          {icon && <div className="flex-shrink-0">{icon}</div>}
          <span className="font-medium text-left">{title}</span>
        </div>
        <ChevronDown
          className={cn(
            collapsible.icon,
            isOpen && "rotate-180",
            disabled && "opacity-50"
          )}
          aria-hidden="true"
        />
      </button>

      <div
        id={contentId}
        className={cn(
          collapsible.content,
          isOpen ? "max-h-screen opacity-100" : "max-h-0 opacity-0",
          contentClassName
        )}
        {...(isOpen ? { "aria-hidden": "false" } : { "aria-hidden": "true" })}
      >
        <div className="p-4 md:p-6 pt-0">{children}</div>
      </div>
    </div>
  );
};

export default CollapsibleSection;
