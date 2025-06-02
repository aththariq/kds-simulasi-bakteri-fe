/**
 * ResistanceAnalysisFilters Component
 *
 * Provides comprehensive filtering capabilities for resistance distribution analysis,
 * including time period, geographic region, and resistance metrics filtering.
 */

"use client";

import React, { useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  ChevronDown,
  ChevronUp,
  Filter,
  X,
  Calendar,
  MapPin,
  Activity,
  RefreshCw,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ResistanceAnalysisFiltersProps } from "@/types/analysis";

export const ResistanceAnalysisFilters: React.FC<
  ResistanceAnalysisFiltersProps
> = ({
  filters,
  onFiltersChange,
  availableGenes,
  availableRegions,
  dataRange,
  className,
}) => {
  // Local state for collapsible sections
  const [timeExpanded, setTimeExpanded] = useState(true);
  const [geographicExpanded, setGeographicExpanded] = useState(false);
  const [metricsExpanded, setMetricsExpanded] = useState(false);

  // Quick filter presets
  const quickFilters = [
    {
      name: "High Resistance",
      description: "Resistance frequency > 70%",
      filters: {
        metrics: { minFrequency: 0.7 },
      },
    },
    {
      name: "Recent Generations",
      description: "Last 50 generations",
      filters: {
        time: {
          startGeneration: Math.max(0, dataRange.maxGeneration - 50),
          granularity: "generation" as const,
        },
      },
    },
    {
      name: "Active HGT",
      description: "HGT events present",
      filters: {
        metrics: { hgtEventRange: { min: 1, max: Infinity } },
      },
    },
    {
      name: "Large Populations",
      description: "Population > 1000",
      filters: {
        metrics: { minPopulation: 1000 },
      },
    },
  ];

  // Event handlers
  const handleTimeFilterChange = useCallback(
    (updates: Partial<typeof filters.time>) => {
      onFiltersChange({
        ...filters,
        time: { ...filters.time, ...updates },
      });
    },
    [filters, onFiltersChange]
  );

  const handleGeographicFilterChange = useCallback(
    (updates: Partial<typeof filters.geographic>) => {
      onFiltersChange({
        ...filters,
        geographic: { ...filters.geographic, ...updates },
      });
    },
    [filters, onFiltersChange]
  );

  const handleMetricsFilterChange = useCallback(
    (updates: Partial<typeof filters.metrics>) => {
      onFiltersChange({
        ...filters,
        metrics: { ...filters.metrics, ...updates },
      });
    },
    [filters, onFiltersChange]
  );

  const handleQuickFilter = useCallback(
    (quickFilter: (typeof quickFilters)[0]) => {
      onFiltersChange(quickFilter.filters);
    },
    [onFiltersChange]
  );

  const clearAllFilters = useCallback(() => {
    onFiltersChange({
      time: { granularity: "generation" },
      geographic: {},
      metrics: {},
      active: false,
    });
  }, [onFiltersChange]);

  const toggleFilterActive = useCallback(() => {
    onFiltersChange({
      active: !filters.active,
    });
  }, [filters.active, onFiltersChange]);

  // Active filter count
  const activeFilterCount = React.useMemo(() => {
    let count = 0;
    if (filters.time.startGeneration !== undefined) count++;
    if (filters.time.endGeneration !== undefined) count++;
    if (filters.time.startDate) count++;
    if (filters.time.endDate) count++;
    if (filters.geographic.bounds) count++;
    if (filters.geographic.selectedRegions?.length) count++;
    if (filters.metrics.minFrequency !== undefined) count++;
    if (filters.metrics.maxFrequency !== undefined) count++;
    if (filters.metrics.selectedGenes?.length) count++;
    if (filters.metrics.minPopulation !== undefined) count++;
    if (filters.metrics.maxPopulation !== undefined) count++;
    if (filters.metrics.hgtEventRange) count++;
    if (filters.metrics.mutationEventRange) count++;
    return count;
  }, [filters]);

  return (
    <Card className={cn("w-full", className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            <CardTitle className="text-lg">Analysis Filters</CardTitle>
            {activeFilterCount > 0 && (
              <Badge variant="secondary" className="text-xs">
                {activeFilterCount} active
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Switch
              checked={filters.active}
              onCheckedChange={toggleFilterActive}
              className="data-[state=checked]:bg-blue-600"
            />
            <Button
              variant="ghost"
              size="sm"
              onClick={clearAllFilters}
              className="text-muted-foreground hover:text-foreground"
            >
              <RefreshCw className="h-4 w-4 mr-1" />
              Clear
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Quick Filters */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Quick Filters</Label>
          <div className="flex flex-wrap gap-2">
            {quickFilters.map(quickFilter => (
              <Popover key={quickFilter.name}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs hover:bg-blue-50"
                  >
                    {quickFilter.name}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-80" side="bottom" align="start">
                  <div className="space-y-2">
                    <h4 className="font-medium">{quickFilter.name}</h4>
                    <p className="text-sm text-muted-foreground">
                      {quickFilter.description}
                    </p>
                    <Button
                      size="sm"
                      onClick={() => handleQuickFilter(quickFilter)}
                      className="w-full"
                    >
                      Apply Filter
                    </Button>
                  </div>
                </PopoverContent>
              </Popover>
            ))}
          </div>
        </div>

        {/* Time Period Filters */}
        <Collapsible open={timeExpanded} onOpenChange={setTimeExpanded}>
          <CollapsibleTrigger asChild>
            <Button
              variant="ghost"
              className="w-full justify-between p-0 h-auto font-medium"
            >
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                <span>Time Period</span>
                {(filters.time.startGeneration !== undefined ||
                  filters.time.endGeneration !== undefined ||
                  filters.time.startDate ||
                  filters.time.endDate) && (
                  <Badge variant="secondary" className="text-xs">
                    {[
                      filters.time.startGeneration !== undefined && "Start Gen",
                      filters.time.endGeneration !== undefined && "End Gen",
                      filters.time.startDate && "Start Date",
                      filters.time.endDate && "End Date",
                    ]
                      .filter(Boolean)
                      .join(", ")}
                  </Badge>
                )}
              </div>
              {timeExpanded ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-3 pt-3">
            <div className="space-y-2">
              <Label className="text-sm">Time Granularity</Label>
              <Select
                value={filters.time.granularity}
                onValueChange={(
                  value: "generation" | "day" | "week" | "month"
                ) => handleTimeFilterChange({ granularity: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="generation">Generation</SelectItem>
                  <SelectItem value="day">Day</SelectItem>
                  <SelectItem value="week">Week</SelectItem>
                  <SelectItem value="month">Month</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {filters.time.granularity === "generation" && (
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label className="text-sm">Start Generation</Label>
                  <Input
                    type="number"
                    min={dataRange.minGeneration}
                    max={dataRange.maxGeneration}
                    value={filters.time.startGeneration ?? ""}
                    onChange={e =>
                      handleTimeFilterChange({
                        startGeneration: e.target.value
                          ? parseInt(e.target.value)
                          : undefined,
                      })
                    }
                    placeholder={`Min: ${dataRange.minGeneration}`}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm">End Generation</Label>
                  <Input
                    type="number"
                    min={dataRange.minGeneration}
                    max={dataRange.maxGeneration}
                    value={filters.time.endGeneration ?? ""}
                    onChange={e =>
                      handleTimeFilterChange({
                        endGeneration: e.target.value
                          ? parseInt(e.target.value)
                          : undefined,
                      })
                    }
                    placeholder={`Max: ${dataRange.maxGeneration}`}
                  />
                </div>
              </div>
            )}

            {filters.time.granularity !== "generation" && (
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label className="text-sm">Start Date</Label>
                  <Input
                    type="date"
                    value={filters.time.startDate ?? ""}
                    onChange={e =>
                      handleTimeFilterChange({
                        startDate: e.target.value || undefined,
                      })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm">End Date</Label>
                  <Input
                    type="date"
                    value={filters.time.endDate ?? ""}
                    onChange={e =>
                      handleTimeFilterChange({
                        endDate: e.target.value || undefined,
                      })
                    }
                  />
                </div>
              </div>
            )}
          </CollapsibleContent>
        </Collapsible>

        {/* Geographic Filters */}
        <Collapsible
          open={geographicExpanded}
          onOpenChange={setGeographicExpanded}
        >
          <CollapsibleTrigger asChild>
            <Button
              variant="ghost"
              className="w-full justify-between p-0 h-auto font-medium"
            >
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                <span>Geographic Region</span>
                {(filters.geographic.bounds ||
                  filters.geographic.selectedRegions?.length ||
                  filters.geographic.clusterIds?.length) && (
                  <Badge variant="secondary" className="text-xs">
                    {[
                      filters.geographic.bounds && "Custom Bounds",
                      filters.geographic.selectedRegions?.length &&
                        `${filters.geographic.selectedRegions.length} Regions`,
                      filters.geographic.clusterIds?.length &&
                        `${filters.geographic.clusterIds.length} Clusters`,
                    ]
                      .filter(Boolean)
                      .join(", ")}
                  </Badge>
                )}
              </div>
              {geographicExpanded ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-3 pt-3">
            <div className="space-y-2">
              <Label className="text-sm">Select Regions</Label>
              <Select
                value={filters.geographic.selectedRegions?.[0] ?? ""}
                onValueChange={value => {
                  const currentRegions =
                    filters.geographic.selectedRegions ?? [];
                  if (value && !currentRegions.includes(value)) {
                    handleGeographicFilterChange({
                      selectedRegions: [...currentRegions, value],
                    });
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Add region..." />
                </SelectTrigger>
                <SelectContent>
                  {availableRegions.map(region => (
                    <SelectItem key={region} value={region}>
                      {region}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {filters.geographic.selectedRegions?.length && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {filters.geographic.selectedRegions.map(region => (
                    <Badge key={region} variant="secondary" className="text-xs">
                      {region}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-auto p-0 ml-1 hover:bg-transparent"
                        onClick={() => {
                          const newRegions =
                            filters.geographic.selectedRegions?.filter(
                              r => r !== region
                            );
                          handleGeographicFilterChange({
                            selectedRegions: newRegions?.length
                              ? newRegions
                              : undefined,
                          });
                        }}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label className="text-sm">Custom Spatial Bounds</Label>
              <div className="grid grid-cols-2 gap-2">
                <Input
                  type="number"
                  placeholder="Min X"
                  value={filters.geographic.bounds?.minX ?? ""}
                  onChange={e => {
                    const value = e.target.value
                      ? parseFloat(e.target.value)
                      : undefined;
                    if (value !== undefined) {
                      handleGeographicFilterChange({
                        bounds: {
                          minX: value,
                          maxX: filters.geographic.bounds?.maxX ?? 100,
                          minY: filters.geographic.bounds?.minY ?? 0,
                          maxY: filters.geographic.bounds?.maxY ?? 100,
                        },
                      });
                    }
                  }}
                />
                <Input
                  type="number"
                  placeholder="Max X"
                  value={filters.geographic.bounds?.maxX ?? ""}
                  onChange={e => {
                    const value = e.target.value
                      ? parseFloat(e.target.value)
                      : undefined;
                    if (value !== undefined) {
                      handleGeographicFilterChange({
                        bounds: {
                          minX: filters.geographic.bounds?.minX ?? 0,
                          maxX: value,
                          minY: filters.geographic.bounds?.minY ?? 0,
                          maxY: filters.geographic.bounds?.maxY ?? 100,
                        },
                      });
                    }
                  }}
                />
                <Input
                  type="number"
                  placeholder="Min Y"
                  value={filters.geographic.bounds?.minY ?? ""}
                  onChange={e => {
                    const value = e.target.value
                      ? parseFloat(e.target.value)
                      : undefined;
                    if (value !== undefined) {
                      handleGeographicFilterChange({
                        bounds: {
                          minX: filters.geographic.bounds?.minX ?? 0,
                          maxX: filters.geographic.bounds?.maxX ?? 100,
                          minY: value,
                          maxY: filters.geographic.bounds?.maxY ?? 100,
                        },
                      });
                    }
                  }}
                />
                <Input
                  type="number"
                  placeholder="Max Y"
                  value={filters.geographic.bounds?.maxY ?? ""}
                  onChange={e => {
                    const value = e.target.value
                      ? parseFloat(e.target.value)
                      : undefined;
                    if (value !== undefined) {
                      handleGeographicFilterChange({
                        bounds: {
                          minX: filters.geographic.bounds?.minX ?? 0,
                          maxX: filters.geographic.bounds?.maxX ?? 100,
                          minY: filters.geographic.bounds?.minY ?? 0,
                          maxY: value,
                        },
                      });
                    }
                  }}
                />
              </div>
              {filters.geographic.bounds && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() =>
                    handleGeographicFilterChange({ bounds: undefined })
                  }
                  className="text-muted-foreground hover:text-foreground"
                >
                  <X className="h-3 w-3 mr-1" />
                  Clear Bounds
                </Button>
              )}
            </div>
          </CollapsibleContent>
        </Collapsible>

        {/* Resistance Metrics Filters */}
        <Collapsible open={metricsExpanded} onOpenChange={setMetricsExpanded}>
          <CollapsibleTrigger asChild>
            <Button
              variant="ghost"
              className="w-full justify-between p-0 h-auto font-medium"
            >
              <div className="flex items-center gap-2">
                <Activity className="h-4 w-4" />
                <span>Resistance Metrics</span>
                {(filters.metrics.minFrequency !== undefined ||
                  filters.metrics.maxFrequency !== undefined ||
                  filters.metrics.selectedGenes?.length ||
                  filters.metrics.minPopulation !== undefined ||
                  filters.metrics.maxPopulation !== undefined ||
                  filters.metrics.hgtEventRange ||
                  filters.metrics.mutationEventRange) && (
                  <Badge variant="secondary" className="text-xs">
                    {[
                      (filters.metrics.minFrequency !== undefined ||
                        filters.metrics.maxFrequency !== undefined) &&
                        "Frequency",
                      filters.metrics.selectedGenes?.length &&
                        `${filters.metrics.selectedGenes.length} Genes`,
                      (filters.metrics.minPopulation !== undefined ||
                        filters.metrics.maxPopulation !== undefined) &&
                        "Population",
                      filters.metrics.hgtEventRange && "HGT Events",
                      filters.metrics.mutationEventRange && "Mutations",
                    ]
                      .filter(Boolean)
                      .join(", ")}
                  </Badge>
                )}
              </div>
              {metricsExpanded ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-4 pt-3">
            {/* Resistance Frequency Range */}
            <div className="space-y-3">
              <Label className="text-sm">Resistance Frequency Range</Label>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground w-8">0%</span>
                  <Slider
                    value={[
                      (filters.metrics.minFrequency ?? 0) * 100,
                      (filters.metrics.maxFrequency ?? 1) * 100,
                    ]}
                    onValueChange={([min, max]) => {
                      handleMetricsFilterChange({
                        minFrequency: min > 0 ? min / 100 : undefined,
                        maxFrequency: max < 100 ? max / 100 : undefined,
                      });
                    }}
                    max={100}
                    min={0}
                    step={1}
                    className="flex-1"
                  />
                  <span className="text-xs text-muted-foreground w-10">
                    100%
                  </span>
                </div>
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>
                    Min: {Math.round((filters.metrics.minFrequency ?? 0) * 100)}
                    %
                  </span>
                  <span>
                    Max: {Math.round((filters.metrics.maxFrequency ?? 1) * 100)}
                    %
                  </span>
                </div>
              </div>
            </div>

            {/* Gene Selection */}
            <div className="space-y-2">
              <Label className="text-sm">Resistance Genes</Label>
              <Select
                value={filters.metrics.selectedGenes?.[0] ?? ""}
                onValueChange={value => {
                  const currentGenes = filters.metrics.selectedGenes ?? [];
                  if (value && !currentGenes.includes(value)) {
                    handleMetricsFilterChange({
                      selectedGenes: [...currentGenes, value],
                    });
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Add gene..." />
                </SelectTrigger>
                <SelectContent>
                  {availableGenes.map(gene => (
                    <SelectItem key={gene} value={gene}>
                      {gene}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {filters.metrics.selectedGenes?.length && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {filters.metrics.selectedGenes.map(gene => (
                    <Badge key={gene} variant="secondary" className="text-xs">
                      {gene}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-auto p-0 ml-1 hover:bg-transparent"
                        onClick={() => {
                          const newGenes =
                            filters.metrics.selectedGenes?.filter(
                              g => g !== gene
                            );
                          handleMetricsFilterChange({
                            selectedGenes: newGenes?.length
                              ? newGenes
                              : undefined,
                          });
                        }}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            {/* Population Range */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-sm">Min Population</Label>
                <Input
                  type="number"
                  min={0}
                  value={filters.metrics.minPopulation ?? ""}
                  onChange={e =>
                    handleMetricsFilterChange({
                      minPopulation: e.target.value
                        ? parseInt(e.target.value)
                        : undefined,
                    })
                  }
                  placeholder="No minimum"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm">Max Population</Label>
                <Input
                  type="number"
                  min={0}
                  value={filters.metrics.maxPopulation ?? ""}
                  onChange={e =>
                    handleMetricsFilterChange({
                      maxPopulation: e.target.value
                        ? parseInt(e.target.value)
                        : undefined,
                    })
                  }
                  placeholder="No maximum"
                />
              </div>
            </div>

            {/* HGT Events Range */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-sm">Min HGT Events</Label>
                <Input
                  type="number"
                  min={0}
                  value={filters.metrics.hgtEventRange?.min ?? ""}
                  onChange={e => {
                    const value = e.target.value
                      ? parseInt(e.target.value)
                      : undefined;
                    handleMetricsFilterChange({
                      hgtEventRange:
                        value !== undefined
                          ? {
                              min: value,
                              max:
                                filters.metrics.hgtEventRange?.max ?? Infinity,
                            }
                          : undefined,
                    });
                  }}
                  placeholder="No minimum"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm">Max HGT Events</Label>
                <Input
                  type="number"
                  min={0}
                  value={
                    filters.metrics.hgtEventRange?.max === Infinity
                      ? ""
                      : filters.metrics.hgtEventRange?.max ?? ""
                  }
                  onChange={e => {
                    const value = e.target.value
                      ? parseInt(e.target.value)
                      : undefined;
                    const currentMin = filters.metrics.hgtEventRange?.min;
                    if (currentMin !== undefined || value !== undefined) {
                      handleMetricsFilterChange({
                        hgtEventRange: {
                          min: currentMin ?? 0,
                          max: value ?? Infinity,
                        },
                      });
                    } else {
                      handleMetricsFilterChange({
                        hgtEventRange: undefined,
                      });
                    }
                  }}
                  placeholder="No maximum"
                />
              </div>
            </div>

            {/* Mutation Events Range */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-sm">Min Mutation Events</Label>
                <Input
                  type="number"
                  min={0}
                  value={filters.metrics.mutationEventRange?.min ?? ""}
                  onChange={e => {
                    const value = e.target.value
                      ? parseInt(e.target.value)
                      : undefined;
                    handleMetricsFilterChange({
                      mutationEventRange:
                        value !== undefined
                          ? {
                              min: value,
                              max:
                                filters.metrics.mutationEventRange?.max ??
                                Infinity,
                            }
                          : undefined,
                    });
                  }}
                  placeholder="No minimum"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm">Max Mutation Events</Label>
                <Input
                  type="number"
                  min={0}
                  value={
                    filters.metrics.mutationEventRange?.max === Infinity
                      ? ""
                      : filters.metrics.mutationEventRange?.max ?? ""
                  }
                  onChange={e => {
                    const value = e.target.value
                      ? parseInt(e.target.value)
                      : undefined;
                    const currentMin = filters.metrics.mutationEventRange?.min;
                    if (currentMin !== undefined || value !== undefined) {
                      handleMetricsFilterChange({
                        mutationEventRange: {
                          min: currentMin ?? 0,
                          max: value ?? Infinity,
                        },
                      });
                    } else {
                      handleMetricsFilterChange({
                        mutationEventRange: undefined,
                      });
                    }
                  }}
                  placeholder="No maximum"
                />
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>
      </CardContent>
    </Card>
  );
};
