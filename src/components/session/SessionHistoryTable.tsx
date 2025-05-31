"use client";

import * as React from "react";
import { useState, useMemo, useCallback } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableCaption,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Search,
  Filter,
  Download,
  Upload,
  Trash2,
  Play,
  Pause,
  Square,
  MoreHorizontal,
  Eye,
  Copy,
  Calendar,
  Clock,
  User,
  Tag,
  AlertCircle,
  CheckCircle,
  Loader2,
  FileText,
  Database,
} from "lucide-react";
import { cn, formatNumber, formatRelativeTime } from "@/lib/utils";
import type {
  SessionListItem,
  SessionFilters,
  SessionAction,
  SessionTableColumn,
  SessionStatus,
  SessionPriority,
} from "@/types/session";

// Status color mapping
const statusColors: Record<SessionStatus, string> = {
  active:
    "bg-green-100 text-green-800 border-green-200 dark:bg-green-900/20 dark:text-green-300 dark:border-green-800",
  paused:
    "bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-300 dark:border-yellow-800",
  completed:
    "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-800",
  error:
    "bg-red-100 text-red-800 border-red-200 dark:bg-red-900/20 dark:text-red-300 dark:border-red-800",
  cancelled:
    "bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-900/20 dark:text-gray-300 dark:border-gray-800",
  archived:
    "bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-900/20 dark:text-purple-300 dark:border-purple-800",
};

// Priority color mapping
const priorityColors: Record<SessionPriority, string> = {
  low: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
  medium: "bg-blue-100 text-blue-700 dark:bg-blue-800 dark:text-blue-300",
  high: "bg-orange-100 text-orange-700 dark:bg-orange-800 dark:text-orange-300",
  urgent: "bg-red-100 text-red-700 dark:bg-red-800 dark:text-red-300",
};

// Status icons
const statusIcons: Record<
  SessionStatus,
  React.ComponentType<{ className?: string }>
> = {
  active: Play,
  paused: Pause,
  completed: CheckCircle,
  error: AlertCircle,
  cancelled: Square,
  archived: Database,
};

interface SessionHistoryTableProps {
  sessions: SessionListItem[];
  loading?: boolean;
  error?: string | null;
  filters?: SessionFilters;
  onFiltersChange?: (filters: SessionFilters) => void;
  onSessionSelect?: (session: SessionListItem) => void;
  onSessionAction?: (action: string, session: SessionListItem) => void;
  onBulkAction?: (action: string, sessions: SessionListItem[]) => void;
  columns?: SessionTableColumn[];
  actions?: SessionAction[];
  enableSelection?: boolean;
  enableBulkActions?: boolean;
  enableExport?: boolean;
  enableImport?: boolean;
  pageSize?: number;
  showPagination?: boolean;
  emptyStateMessage?: string;
  className?: string;
}

// Default columns configuration
const defaultColumns: SessionTableColumn[] = [
  {
    key: "name",
    label: "Session Name",
    sortable: true,
    filterable: true,
    width: "300px",
    render: (value, session) => (
      <div className="flex flex-col space-y-1">
        <span className="font-medium text-foreground">{session.name}</span>
        <div className="flex items-center space-x-2 text-xs text-muted-foreground">
          <User className="h-3 w-3" />
          <span>ID: {session.id.slice(0, 8)}...</span>
        </div>
      </div>
    ),
  },
  {
    key: "status",
    label: "Status",
    sortable: true,
    filterable: true,
    width: "120px",
    render: (value, session) => {
      const StatusIcon = statusIcons[session.status];
      return (
        <Badge
          variant="outline"
          className={cn("px-2 py-1", statusColors[session.status])}
        >
          <StatusIcon className="h-3 w-3 mr-1" />
          {session.status}
        </Badge>
      );
    },
  },
  {
    key: "priority",
    label: "Priority",
    sortable: true,
    filterable: true,
    width: "100px",
    render: (value, session) => (
      <Badge
        variant="secondary"
        className={cn("px-2 py-1", priorityColors[session.priority])}
      >
        {session.priority}
      </Badge>
    ),
  },
  {
    key: "simulation_count",
    label: "Simulations",
    sortable: true,
    width: "120px",
    align: "center",
    render: (value, session) => (
      <div className="text-center">
        <div className="font-medium">{session.simulation_count}</div>
        <div className="text-xs text-muted-foreground">
          {session.completed_count} completed
        </div>
      </div>
    ),
  },
  {
    key: "total_execution_time",
    label: "Runtime",
    sortable: true,
    width: "120px",
    align: "right",
    render: (value, session) => (
      <div className="text-right">
        <div className="font-medium">
          {session.total_execution_time > 0
            ? formatRelativeTime(
                new Date(Date.now() - session.total_execution_time)
              )
            : "—"}
        </div>
        <div className="text-xs text-muted-foreground flex items-center justify-end">
          <Clock className="h-3 w-3 mr-1" />
          {session.total_execution_time > 0 ? "Total" : "No data"}
        </div>
      </div>
    ),
  },
  {
    key: "storage_size",
    label: "Storage",
    sortable: true,
    width: "100px",
    align: "right",
    render: (value, session) => (
      <div className="text-right">
        <div className="font-medium">
          {session.storage_size > 0
            ? formatNumber(session.storage_size, "bytes")
            : "—"}
        </div>
        <div className="text-xs text-muted-foreground">Size</div>
      </div>
    ),
  },
  {
    key: "created_at",
    label: "Created",
    sortable: true,
    width: "140px",
    render: (value, session) => (
      <div className="flex flex-col space-y-1">
        <div className="font-medium text-sm">
          {new Date(session.created_at).toLocaleDateString()}
        </div>
        <div className="text-xs text-muted-foreground flex items-center">
          <Calendar className="h-3 w-3 mr-1" />
          {formatRelativeTime(new Date(session.created_at))}
        </div>
      </div>
    ),
  },
  {
    key: "tags",
    label: "Tags",
    width: "160px",
    render: (value, session) => (
      <div className="flex flex-wrap gap-1">
        {session.tags.length > 0 ? (
          session.tags.slice(0, 2).map((tag, index) => (
            <Badge
              key={index}
              variant="outline"
              className="text-xs px-1 py-0.5"
            >
              <Tag className="h-2 w-2 mr-1" />
              {tag}
            </Badge>
          ))
        ) : (
          <span className="text-xs text-muted-foreground">No tags</span>
        )}
        {session.tags.length > 2 && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger>
                <Badge variant="outline" className="text-xs px-1 py-0.5">
                  +{session.tags.length - 2}
                </Badge>
              </TooltipTrigger>
              <TooltipContent>
                <div className="space-y-1">
                  {session.tags.slice(2).map((tag, index) => (
                    <div key={index} className="text-xs">
                      {tag}
                    </div>
                  ))}
                </div>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </div>
    ),
  },
];

// Default actions configuration
const defaultActions: SessionAction[] = [
  {
    id: "view",
    label: "View Details",
    icon: Eye,
    onClick: session => console.log("View session", session.id),
  },
  {
    id: "load",
    label: "Load Session",
    icon: Play,
    onClick: session => console.log("Load session", session.id),
    disabled: session => session.status === "error",
  },
  {
    id: "copy",
    label: "Duplicate",
    icon: Copy,
    onClick: session => console.log("Copy session", session.id),
  },
  {
    id: "export",
    label: "Export",
    icon: Download,
    onClick: session => console.log("Export session", session.id),
  },
  {
    id: "delete",
    label: "Delete",
    icon: Trash2,
    onClick: session => console.log("Delete session", session.id),
    variant: "destructive",
  },
];

export const SessionHistoryTable: React.FC<SessionHistoryTableProps> = ({
  sessions,
  loading = false,
  error = null,
  filters = {},
  onFiltersChange,
  onSessionSelect,
  onSessionAction,
  onBulkAction,
  columns = defaultColumns,
  actions = defaultActions,
  enableSelection = true,
  enableBulkActions = true,
  enableExport = true,
  enableImport = true,
  pageSize = 10,
  showPagination = true,
  emptyStateMessage = "No sessions found.",
  className,
}) => {
  // State management
  const [selectedSessions, setSelectedSessions] = useState<Set<string>>(
    new Set()
  );
  const [sortColumn, setSortColumn] = useState<string>("created_at");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState(filters.searchTerm || "");
  const [statusFilter, setStatusFilter] = useState<SessionStatus[]>(
    filters.status || []
  );
  const [priorityFilter, setPriorityFilter] = useState<SessionPriority[]>(
    filters.priority || []
  );
  const [showFilters, setShowFilters] = useState(false);
  const [bulkActionConfirm, setBulkActionConfirm] = useState<string | null>(
    null
  );

  // Filtered and sorted sessions
  const filteredSessions = useMemo(() => {
    let filtered = [...sessions];

    // Apply search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        session =>
          session.name.toLowerCase().includes(term) ||
          session.id.toLowerCase().includes(term) ||
          session.tags.some(tag => tag.toLowerCase().includes(term))
      );
    }

    // Apply status filter
    if (statusFilter.length > 0) {
      filtered = filtered.filter(session =>
        statusFilter.includes(session.status)
      );
    }

    // Apply priority filter
    if (priorityFilter.length > 0) {
      filtered = filtered.filter(session =>
        priorityFilter.includes(session.priority)
      );
    }

    // Apply sorting
    const sortableColumn = columns.find(
      col => col.key === sortColumn && col.sortable
    );
    if (sortableColumn) {
      filtered.sort((a, b) => {
        const aValue = a[sortColumn as keyof SessionListItem];
        const bValue = b[sortColumn as keyof SessionListItem];

        let comparison = 0;
        if (aValue < bValue) comparison = -1;
        if (aValue > bValue) comparison = 1;

        return sortDirection === "desc" ? -comparison : comparison;
      });
    }

    return filtered;
  }, [
    sessions,
    searchTerm,
    statusFilter,
    priorityFilter,
    sortColumn,
    sortDirection,
    columns,
  ]);

  // Paginated sessions
  const paginatedSessions = useMemo(() => {
    if (!showPagination) return filteredSessions;

    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    return filteredSessions.slice(startIndex, endIndex);
  }, [filteredSessions, currentPage, pageSize, showPagination]);

  // Pagination info
  const totalPages = Math.ceil(filteredSessions.length / pageSize);
  const hasNextPage = currentPage < totalPages;
  const hasPrevPage = currentPage > 1;

  // Handlers
  const handleSort = useCallback(
    (columnKey: string) => {
      const column = columns.find(col => col.key === columnKey);
      if (!column?.sortable) return;

      if (sortColumn === columnKey) {
        setSortDirection(sortDirection === "asc" ? "desc" : "asc");
      } else {
        setSortColumn(columnKey);
        setSortDirection("asc");
      }
    },
    [columns, sortColumn, sortDirection]
  );

  const handleSelectAll = useCallback(
    (checked: boolean) => {
      if (checked) {
        setSelectedSessions(
          new Set(paginatedSessions.map(session => session.id))
        );
      } else {
        setSelectedSessions(new Set());
      }
    },
    [paginatedSessions]
  );

  const handleSelectSession = useCallback(
    (sessionId: string, checked: boolean) => {
      setSelectedSessions(prev => {
        const newSet = new Set(prev);
        if (checked) {
          newSet.add(sessionId);
        } else {
          newSet.delete(sessionId);
        }
        return newSet;
      });
    },
    []
  );

  const handleSessionAction = useCallback(
    (action: SessionAction, session: SessionListItem) => {
      if (action.disabled && action.disabled(session)) return;

      if (onSessionAction) {
        onSessionAction(action.id, session);
      } else {
        action.onClick(session);
      }
    },
    [onSessionAction]
  );

  const handleBulkAction = useCallback(
    (actionId: string) => {
      const selectedSessionsList = sessions.filter(session =>
        selectedSessions.has(session.id)
      );

      if (onBulkAction) {
        onBulkAction(actionId, selectedSessionsList);
      }

      setSelectedSessions(new Set());
      setBulkActionConfirm(null);
    },
    [sessions, selectedSessions, onBulkAction]
  );

  const handlePageChange = useCallback(
    (page: number) => {
      setCurrentPage(Math.max(1, Math.min(page, totalPages)));
    },
    [totalPages]
  );

  const handleFiltersChange = useCallback(
    (newFilters: Partial<SessionFilters>) => {
      const updatedFilters = { ...filters, ...newFilters };
      if (onFiltersChange) {
        onFiltersChange(updatedFilters);
      }
    },
    [filters, onFiltersChange]
  );

  // Reset page when filters change
  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter, priorityFilter]);

  // Update local state when filters prop changes
  React.useEffect(() => {
    setSearchTerm(filters.searchTerm || "");
    setStatusFilter(filters.status || []);
    setPriorityFilter(filters.priority || []);
  }, [filters]);

  const isAllSelected =
    paginatedSessions.length > 0 &&
    paginatedSessions.every(session => selectedSessions.has(session.id));
  const isIndeterminate = selectedSessions.size > 0 && !isAllSelected;

  if (error) {
    return (
      <Card className={className}>
        <CardContent className="p-6">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Session History</CardTitle>
            <CardDescription>
              Manage and track your simulation sessions
            </CardDescription>
          </div>

          <div className="flex items-center space-x-2">
            {enableImport && (
              <Button variant="outline" size="sm">
                <Upload className="h-4 w-4 mr-2" />
                Import
              </Button>
            )}

            {enableExport && (
              <Button variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
            )}

            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
              className={cn(showFilters && "bg-muted")}
            >
              <Filter className="h-4 w-4 mr-2" />
              Filters
            </Button>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="space-y-4">
          <div className="flex items-center space-x-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search sessions..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>

            {showFilters && (
              <div className="flex items-center space-x-2">
                <Select
                  value={statusFilter.join(",")}
                  onValueChange={value =>
                    setStatusFilter(
                      value ? (value.split(",") as SessionStatus[]) : []
                    )
                  }
                >
                  <SelectTrigger className="w-32">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All Status</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="paused">Paused</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="error">Error</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                    <SelectItem value="archived">Archived</SelectItem>
                  </SelectContent>
                </Select>

                <Select
                  value={priorityFilter.join(",")}
                  onValueChange={value =>
                    setPriorityFilter(
                      value ? (value.split(",") as SessionPriority[]) : []
                    )
                  }
                >
                  <SelectTrigger className="w-32">
                    <SelectValue placeholder="Priority" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All Priority</SelectItem>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          {/* Bulk Actions */}
          {enableBulkActions && selectedSessions.size > 0 && (
            <div className="flex items-center justify-between p-3 bg-muted rounded-md">
              <span className="text-sm font-medium">
                {selectedSessions.size} session(s) selected
              </span>

              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setBulkActionConfirm("export")}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Export Selected
                </Button>

                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => setBulkActionConfirm("delete")}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Selected
                </Button>
              </div>
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent className="p-0">
        <div className="relative">
          {loading && (
            <div className="absolute inset-0 bg-background/50 backdrop-blur-sm flex items-center justify-center z-10">
              <div className="flex items-center space-x-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-sm">Loading sessions...</span>
              </div>
            </div>
          )}

          <Table>
            <TableHeader>
              <TableRow>
                {enableSelection && (
                  <TableHead className="w-12">
                    <Checkbox
                      checked={isAllSelected}
                      indeterminate={isIndeterminate}
                      onCheckedChange={handleSelectAll}
                      aria-label="Select all sessions"
                    />
                  </TableHead>
                )}

                {columns.map(column => (
                  <TableHead
                    key={column.key}
                    style={{ width: column.width }}
                    className={cn(
                      column.align === "center" && "text-center",
                      column.align === "right" && "text-right",
                      column.sortable &&
                        "cursor-pointer hover:bg-muted/50 select-none"
                    )}
                    onClick={() => column.sortable && handleSort(column.key)}
                  >
                    <div
                      className={cn(
                        "flex items-center",
                        column.align === "center" && "justify-center",
                        column.align === "right" && "justify-end"
                      )}
                    >
                      {column.label}
                      {column.sortable && (
                        <div className="ml-2">
                          {sortColumn === column.key ? (
                            sortDirection === "asc" ? (
                              <ArrowUp className="h-4 w-4" />
                            ) : (
                              <ArrowDown className="h-4 w-4" />
                            )
                          ) : (
                            <ArrowUpDown className="h-4 w-4 opacity-50" />
                          )}
                        </div>
                      )}
                    </div>
                  </TableHead>
                ))}

                <TableHead className="w-16">Actions</TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {paginatedSessions.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={columns.length + (enableSelection ? 1 : 0) + 1}
                    className="h-24 text-center"
                  >
                    <div className="flex flex-col items-center space-y-2 text-muted-foreground">
                      <FileText className="h-8 w-8" />
                      <span>{emptyStateMessage}</span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                paginatedSessions.map(session => (
                  <TableRow
                    key={session.id}
                    className={cn(
                      "cursor-pointer hover:bg-muted/50",
                      selectedSessions.has(session.id) && "bg-muted/30"
                    )}
                    onClick={() => onSessionSelect?.(session)}
                  >
                    {enableSelection && (
                      <TableCell onClick={e => e.stopPropagation()}>
                        <Checkbox
                          checked={selectedSessions.has(session.id)}
                          onCheckedChange={checked =>
                            handleSelectSession(session.id, checked as boolean)
                          }
                          aria-label={`Select session ${session.name}`}
                        />
                      </TableCell>
                    )}

                    {columns.map(column => (
                      <TableCell
                        key={column.key}
                        className={cn(
                          column.align === "center" && "text-center",
                          column.align === "right" && "text-right"
                        )}
                      >
                        {column.render
                          ? column.render(
                              session[column.key as keyof SessionListItem],
                              session
                            )
                          : String(
                              session[column.key as keyof SessionListItem] ||
                                "—"
                            )}
                      </TableCell>
                    ))}

                    <TableCell onClick={e => e.stopPropagation()}>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0"
                          >
                            <MoreHorizontal className="h-4 w-4" />
                            <span className="sr-only">Open menu</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Actions</DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          {actions.map(action => {
                            const isDisabled = action.disabled?.(session);
                            return (
                              <DropdownMenuItem
                                key={action.id}
                                disabled={isDisabled}
                                onClick={() =>
                                  !isDisabled &&
                                  handleSessionAction(action, session)
                                }
                                className={cn(
                                  action.variant === "destructive" &&
                                    "text-destructive focus:text-destructive"
                                )}
                              >
                                {action.icon && (
                                  <action.icon className="h-4 w-4 mr-2" />
                                )}
                                {action.label}
                              </DropdownMenuItem>
                            );
                          })}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>

            {filteredSessions.length > 0 && (
              <TableCaption className="mt-4">
                Showing {(currentPage - 1) * pageSize + 1} to{" "}
                {Math.min(currentPage * pageSize, filteredSessions.length)} of{" "}
                {filteredSessions.length} session(s)
              </TableCaption>
            )}
          </Table>
        </div>

        {/* Pagination */}
        {showPagination && totalPages > 1 && (
          <div className="flex items-center justify-between px-6 py-4 border-t">
            <div className="text-sm text-muted-foreground">
              Page {currentPage} of {totalPages}
            </div>

            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(1)}
                disabled={!hasPrevPage}
              >
                <ChevronsLeft className="h-4 w-4" />
                <span className="sr-only">First page</span>
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={!hasPrevPage}
              >
                <ChevronLeft className="h-4 w-4" />
                <span className="sr-only">Previous page</span>
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={!hasNextPage}
              >
                <ChevronRight className="h-4 w-4" />
                <span className="sr-only">Next page</span>
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(totalPages)}
                disabled={!hasNextPage}
              >
                <ChevronsRight className="h-4 w-4" />
                <span className="sr-only">Last page</span>
              </Button>
            </div>
          </div>
        )}
      </CardContent>

      {/* Bulk Action Confirmation Dialog */}
      <Dialog
        open={!!bulkActionConfirm}
        onOpenChange={() => setBulkActionConfirm(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Confirm {bulkActionConfirm === "delete" ? "Delete" : "Export"}
            </DialogTitle>
            <DialogDescription>
              {bulkActionConfirm === "delete"
                ? `Are you sure you want to delete ${selectedSessions.size} selected session(s)? This action cannot be undone.`
                : `Export ${selectedSessions.size} selected session(s)?`}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setBulkActionConfirm(null)}
            >
              Cancel
            </Button>
            <Button
              variant={
                bulkActionConfirm === "delete" ? "destructive" : "default"
              }
              onClick={() =>
                bulkActionConfirm && handleBulkAction(bulkActionConfirm)
              }
            >
              {bulkActionConfirm === "delete" ? "Delete" : "Export"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
};

export default SessionHistoryTable;
