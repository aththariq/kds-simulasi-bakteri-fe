"use client";

import React, { useState, useEffect } from "react";
import {
  AlertTriangle,
  CheckCircle,
  XCircle,
  RefreshCw,
  Info,
  Clock,
  Database,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  useSessionRecovery,
  InterruptedSession,
  RecoveryType,
  RecoveryOptions,
  RecoveryResult,
  RecoveryIssue,
} from "@/lib/session-recovery";

interface SessionRecoveryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSessionRecovered?: (sessionId: string) => void;
}

export const SessionRecoveryDialog: React.FC<SessionRecoveryDialogProps> = ({
  open,
  onOpenChange,
  onSessionRecovered,
}) => {
  const {
    checkForInterrupted,
    recoverSession,
    autoRecover,
    getRecoverySuggestions,
    isRecovering,
    interruptedSessions,
    error,
    clearError,
    refreshInterrupted,
  } = useSessionRecovery();

  const [selectedSessions, setSelectedSessions] = useState<Set<string>>(
    new Set()
  );
  const [recoveryOptions, setRecoveryOptions] = useState<RecoveryOptions>({
    type: RecoveryType.MANUAL_RECOVERY,
    validateIntegrity: true,
    createBackup: true,
    preserveSimulations: true,
  });
  const [recoveryResults, setRecoveryResults] = useState<RecoveryResult[]>([]);
  const [currentStep, setCurrentStep] = useState<
    "detection" | "options" | "recovery" | "results"
  >("detection");
  const [suggestions, setSuggestions] = useState<any>(null);

  // Load suggestions when dialog opens
  useEffect(() => {
    if (open) {
      loadSuggestions();
    }
  }, [open]);

  const loadSuggestions = async () => {
    try {
      const suggestionsData = await getRecoverySuggestions();
      setSuggestions(suggestionsData);

      // Auto-select high-confidence sessions
      const autoSelectIds = suggestionsData.recommendations
        .filter(
          (rec: any) => rec.action === "auto_recover" && rec.confidence > 0.9
        )
        .map((rec: any) => rec.sessionId);

      setSelectedSessions(new Set(autoSelectIds));
    } catch (error) {
      console.error("Failed to load suggestions:", error);
    }
  };

  const getIntegrityColor = (integrity: number) => {
    if (integrity >= 0.8) return "text-green-600";
    if (integrity >= 0.6) return "text-yellow-600";
    return "text-red-600";
  };

  const getIntegrityBadge = (integrity: number) => {
    if (integrity >= 0.8) return { variant: "default" as const, text: "High" };
    if (integrity >= 0.6)
      return { variant: "secondary" as const, text: "Medium" };
    return { variant: "destructive" as const, text: "Low" };
  };

  const getReasonIcon = (reason: string) => {
    switch (reason) {
      case "browser_closed":
        return <XCircle className="h-4 w-4 text-orange-500" />;
      case "tab_closed":
        return <XCircle className="h-4 w-4 text-blue-500" />;
      case "network_error":
        return <AlertTriangle className="h-4 w-4 text-red-500" />;
      case "app_crash":
        return <AlertTriangle className="h-4 w-4 text-red-600" />;
      default:
        return <Info className="h-4 w-4 text-gray-500" />;
    }
  };

  const formatDuration = (date: Date) => {
    const now = new Date();
    const diffInMinutes = Math.floor(
      (now.getTime() - date.getTime()) / (1000 * 60)
    );

    if (diffInMinutes < 1) return "Just now";
    if (diffInMinutes < 60) return `${diffInMinutes} minutes ago`;

    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours} hours ago`;

    const diffInDays = Math.floor(diffInHours / 24);
    return `${diffInDays} days ago`;
  };

  const handleSessionToggle = (sessionId: string) => {
    const newSelection = new Set(selectedSessions);
    if (newSelection.has(sessionId)) {
      newSelection.delete(sessionId);
    } else {
      newSelection.add(sessionId);
    }
    setSelectedSessions(newSelection);
  };

  const handleAutoRecover = async () => {
    setCurrentStep("recovery");
    const results = await autoRecover();
    setRecoveryResults(results);
    setCurrentStep("results");

    // Notify parent of successful recoveries
    results.forEach(result => {
      if (result.success && result.session && onSessionRecovered) {
        onSessionRecovered(result.session.metadata.id);
      }
    });
  };

  const handleManualRecover = async () => {
    if (selectedSessions.size === 0) return;

    setCurrentStep("recovery");
    const results: RecoveryResult[] = [];

    for (const sessionId of selectedSessions) {
      const result = await recoverSession(sessionId, recoveryOptions);
      results.push(result);

      if (result.success && result.session && onSessionRecovered) {
        onSessionRecovered(result.session.metadata.id);
      }
    }

    setRecoveryResults(results);
    setCurrentStep("results");
  };

  const handleClose = () => {
    setCurrentStep("detection");
    setSelectedSessions(new Set());
    setRecoveryResults([]);
    clearError();
    onOpenChange(false);
  };

  const renderDetectionStep = () => (
    <div className="space-y-4">
      <div className="text-center py-6">
        <AlertTriangle className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
        <h3 className="text-lg font-semibold mb-2">
          Interrupted Sessions Detected
        </h3>
        <p className="text-muted-foreground">
          We found {interruptedSessions.length} session(s) that may need
          recovery
        </p>
      </div>

      <ScrollArea className="max-h-80">
        <div className="space-y-3">
          {interruptedSessions.map(session => {
            const suggestion = suggestions?.recommendations.find(
              (rec: any) => rec.sessionId === session.sessionId
            );
            const isSelected = selectedSessions.has(session.sessionId);
            const integrityBadge = getIntegrityBadge(session.dataIntegrity);

            return (
              <Card
                key={session.sessionId}
                className={`cursor-pointer transition-colors ${
                  isSelected ? "ring-2 ring-primary" : ""
                }`}
                onClick={() => handleSessionToggle(session.sessionId)}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-3">
                      <Checkbox
                        checked={isSelected}
                        onChange={() => handleSessionToggle(session.sessionId)}
                      />
                      <div>
                        <CardTitle className="text-sm">
                          {session.metadata.name}
                        </CardTitle>
                        <CardDescription className="flex items-center space-x-2 mt-1">
                          {getReasonIcon(session.reason)}
                          <span>{formatDuration(session.lastActivity)}</span>
                        </CardDescription>
                      </div>
                    </div>
                    <Badge variant={integrityBadge.variant}>
                      {integrityBadge.text} Integrity
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Data Integrity</span>
                      <span
                        className={getIntegrityColor(session.dataIntegrity)}
                      >
                        {Math.round(session.dataIntegrity * 100)}%
                      </span>
                    </div>
                    <Progress
                      value={session.dataIntegrity * 100}
                      className="h-2"
                    />

                    {session.activeSimulations.length > 0 && (
                      <div className="flex justify-between text-sm">
                        <span>Active Simulations</span>
                        <span>{session.activeSimulations.length}</span>
                      </div>
                    )}

                    {suggestion && (
                      <Alert className="mt-2">
                        <Info className="h-4 w-4" />
                        <AlertDescription className="text-xs">
                          {suggestion.reason}
                        </AlertDescription>
                      </Alert>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </ScrollArea>

      <Separator />

      <div className="space-y-2">
        <h4 className="font-medium">Recovery Options</h4>
        <div className="space-y-2">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="validate-integrity"
              checked={recoveryOptions.validateIntegrity}
              onCheckedChange={checked =>
                setRecoveryOptions(prev => ({
                  ...prev,
                  validateIntegrity: !!checked,
                }))
              }
            />
            <label htmlFor="validate-integrity" className="text-sm">
              Validate data integrity during recovery
            </label>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="create-backup"
              checked={recoveryOptions.createBackup}
              onCheckedChange={checked =>
                setRecoveryOptions(prev => ({
                  ...prev,
                  createBackup: !!checked,
                }))
              }
            />
            <label htmlFor="create-backup" className="text-sm">
              Create backup before recovery
            </label>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="preserve-simulations"
              checked={recoveryOptions.preserveSimulations}
              onCheckedChange={checked =>
                setRecoveryOptions(prev => ({
                  ...prev,
                  preserveSimulations: !!checked,
                }))
              }
            />
            <label htmlFor="preserve-simulations" className="text-sm">
              Preserve simulation states
            </label>
          </div>
        </div>
      </div>
    </div>
  );

  const renderRecoveryStep = () => (
    <div className="text-center py-8">
      <RefreshCw className="h-12 w-12 text-blue-500 mx-auto mb-4 animate-spin" />
      <h3 className="text-lg font-semibold mb-2">Recovering Sessions</h3>
      <p className="text-muted-foreground">
        Please wait while we recover your interrupted sessions...
      </p>
    </div>
  );

  const renderResultsStep = () => (
    <div className="space-y-4">
      <div className="text-center">
        <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
        <h3 className="text-lg font-semibold mb-2">Recovery Complete</h3>
        <p className="text-muted-foreground">
          {recoveryResults.filter(r => r.success).length} of{" "}
          {recoveryResults.length} sessions recovered successfully
        </p>
      </div>

      <ScrollArea className="max-h-80">
        <div className="space-y-3">
          {recoveryResults.map((result, index) => (
            <Card key={index}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm flex items-center space-x-2">
                    {result.success ? (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    ) : (
                      <XCircle className="h-4 w-4 text-red-500" />
                    )}
                    <span>
                      {result.session?.metadata.name || "Unknown Session"}
                    </span>
                  </CardTitle>
                  <Badge variant={result.success ? "default" : "destructive"}>
                    {result.success ? "Success" : "Failed"}
                  </Badge>
                </div>
              </CardHeader>

              {(result.issues || result.warnings || result.metadata) && (
                <CardContent className="pt-0">
                  <Accordion type="single" collapsible>
                    <AccordionItem value="details">
                      <AccordionTrigger className="text-sm">
                        View Details
                      </AccordionTrigger>
                      <AccordionContent>
                        <div className="space-y-3">
                          {result.metadata && (
                            <div className="grid grid-cols-2 gap-2 text-sm">
                              <div>
                                Recovery Time: {result.metadata.recoveryTime}ms
                              </div>
                              <div>
                                Data Integrity:{" "}
                                {Math.round(
                                  result.metadata.dataIntegrity * 100
                                )}
                                %
                              </div>
                              <div>
                                Items Recovered:{" "}
                                {result.metadata.itemsRecovered}
                              </div>
                              <div>Items Lost: {result.metadata.itemsLost}</div>
                            </div>
                          )}

                          {result.warnings && result.warnings.length > 0 && (
                            <div>
                              <h5 className="font-medium text-yellow-600 mb-1">
                                Warnings:
                              </h5>
                              <ul className="text-sm space-y-1">
                                {result.warnings.map((warning, i) => (
                                  <li key={i} className="text-yellow-600">
                                    • {warning}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {result.issues && result.issues.length > 0 && (
                            <div>
                              <h5 className="font-medium text-red-600 mb-1">
                                Issues Found:
                              </h5>
                              <ul className="text-sm space-y-1">
                                {result.issues.map((issue, i) => (
                                  <li key={i} className="text-red-600">
                                    • {issue.description}
                                    {issue.autoFixable && " (Auto-fixed)"}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {result.error && (
                            <Alert variant="destructive">
                              <AlertTriangle className="h-4 w-4" />
                              <AlertTitle>Error</AlertTitle>
                              <AlertDescription>
                                {result.error}
                              </AlertDescription>
                            </Alert>
                          )}
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>
                </CardContent>
              )}
            </Card>
          ))}
        </div>
      </ScrollArea>
    </div>
  );

  const getCurrentStepContent = () => {
    switch (currentStep) {
      case "detection":
        return renderDetectionStep();
      case "recovery":
        return renderRecoveryStep();
      case "results":
        return renderResultsStep();
      default:
        return renderDetectionStep();
    }
  };

  const canProceed = () => {
    return selectedSessions.size > 0 && !isRecovering;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Database className="h-5 w-5" />
            <span>Session Recovery</span>
          </DialogTitle>
          <DialogDescription>
            {currentStep === "detection" &&
              "Select sessions to recover and configure recovery options"}
            {currentStep === "recovery" && "Recovering selected sessions..."}
            {currentStep === "results" && "Recovery operation completed"}
          </DialogDescription>
        </DialogHeader>

        {error && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Recovery Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {getCurrentStepContent()}

        <DialogFooter className="space-x-2">
          {currentStep === "detection" && (
            <>
              <Button
                variant="outline"
                onClick={refreshInterrupted}
                disabled={isRecovering}
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>

              {suggestions?.recommendations.some(
                (rec: any) => rec.action === "auto_recover"
              ) && (
                <Button
                  variant="secondary"
                  onClick={handleAutoRecover}
                  disabled={isRecovering}
                >
                  Auto Recover
                </Button>
              )}

              <Button onClick={handleManualRecover} disabled={!canProceed()}>
                Recover Selected ({selectedSessions.size})
              </Button>
            </>
          )}

          {currentStep === "results" && (
            <Button onClick={handleClose}>Close</Button>
          )}

          <Button variant="outline" onClick={handleClose}>
            {currentStep === "recovery" ? "Cancel" : "Close"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default SessionRecoveryDialog;
