import React, { useState } from 'react';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from '@/components/ui/card';
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  Loader2Icon,
  InfoIcon,
  EyeIcon,
} from 'lucide-react';
import { format } from 'date-fns';
import { useGetAuditLogsQuery } from '@/api/auditApi';

    const AuditLogPage = () => {
  const [selectedLog, setSelectedLog] = useState(null);
  
  // State for filters
  const [filters, setFilters] = useState({
    page: 1,
    limit: 10,
    from: '',
    to: '',
  });

  // Fetch audit logs with current filters
  const { data, isLoading, error } = useGetAuditLogsQuery(filters);

  // Handle filter changes
  const handleFilterChange = (key, value) => {
    setFilters(prev => ({
      ...prev,
      [key]: value,
      page: 1 // Reset to first page when filters change
    }));
  };

  // Handle pagination
  const handlePageChange = (newPage) => {
    setFilters(prev => ({
      ...prev,
      page: newPage
    }));
  };

  // Format the action text for display
  const formatAction = (action) => {
    return action.charAt(0) + action.slice(1).toLowerCase();
  };

  // Get the actor name based on model and data
  const getActorName = (log) => {
    if (!log.actorDetails) return log.actorModel === 'User' ? 'Unknown User' : 'Unknown Employee';
    
    return log.actorModel === 'User' 
      ? log.actorDetails.username 
      : log.actorDetails.name;
  };

  // Format the changes between before and after
  const formatChanges = (before, after) => {
    if (!before || !after) return null;

    const changes = [];
    const allKeys = new Set([...Object.keys(before), ...Object.keys(after)]);

    for (const key of allKeys) {
      if (key === '_id' || key === '__v' || key === 'updatedAt') continue;
      
      const beforeValue = before[key];
      const afterValue = after[key];

      if (JSON.stringify(beforeValue) !== JSON.stringify(afterValue)) {
        changes.push({
          field: key,
          before: beforeValue,
          after: afterValue
        });
      }
    }

    return changes;
  };

  // Render the details modal
  const renderDetailsModal = () => {
    if (!selectedLog) return null;

    const changes = formatChanges(selectedLog.before, selectedLog.after);

      return (
      <Dialog open={!!selectedLog} onOpenChange={() => setSelectedLog(null)}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Audit Log Details</DialogTitle>
            <DialogDescription>
              Complete information about this audit log entry
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Basic Information */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-muted-foreground">Timestamp</Label>
                <p>{format(new Date(selectedLog.timestamp), 'dd/MM/yyyy HH:mm:ss')}</p>
              </div>
              <div>
                <Label className="text-muted-foreground">Actor</Label>
                <p>{getActorName(selectedLog)} ({selectedLog.actorModel})</p>
              </div>
              <div>
                <Label className="text-muted-foreground">Action</Label>
                <p className={`font-medium ${
                  selectedLog.action === 'CREATE' ? 'text-green-600' :
                  selectedLog.action === 'UPDATE' ? 'text-blue-600' :
                  selectedLog.action === 'DELETE' ? 'text-destructive' :
                  'text-muted-foreground'
                }`}>
                  {formatAction(selectedLog.action)}
                </p>
              </div>
              <div>
                <Label className="text-muted-foreground">Collection</Label>
                <p>{selectedLog.collectionName}</p>
              </div>
            </div>

            {/* Changes Table */}
            {changes && changes.length > 0 && (
              <div>
                <Label className="text-muted-foreground mb-2 block">Changes</Label>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Field</TableHead>
                      <TableHead>Before</TableHead>
                      <TableHead>After</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {changes.map((change, index) => (
                      <TableRow key={index}>
                        <TableCell className="font-medium">{change.field}</TableCell>
                        <TableCell>
                          {typeof change.before === 'object' 
                            ? JSON.stringify(change.before, null, 2)
                            : String(change.before)}
                        </TableCell>
                        <TableCell>
                          {typeof change.after === 'object'
                            ? JSON.stringify(change.after, null, 2)
                            : String(change.after)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}

            {/* Additional Information */}
            <div>
              <Label className="text-muted-foreground mb-2 block">Additional Information</Label>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">IP Address</Label>
                  <p>{selectedLog.ipAddress || 'N/A'}</p>
                </div>
        <div>
                  <Label className="text-muted-foreground">User Agent</Label>
                  <p className="truncate">{selectedLog.userAgent || 'N/A'}</p>
                </div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  };

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-96">
        <p className="text-lg text-destructive">Error loading audit logs</p>
        <p className="text-sm text-muted-foreground">{error.data?.message || error.message}</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-accent text-transparent bg-clip-text">
        Audit Log
      </h1>
          
      {/* Filters */}
      <Card>
            <CardHeader>
          <CardTitle>Date Range</CardTitle>
          <CardDescription>Filter audit logs by date</CardDescription>
            </CardHeader>
            <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>From Date</Label>
              <Input
                type="date"
                value={filters.from}
                onChange={(e) => handleFilterChange('from', e.target.value)}
              />
            </div>

            <div>
              <Label>To Date</Label>
              <Input
                type="date"
                value={filters.to}
                onChange={(e) => handleFilterChange('to', e.target.value)}
              />
            </div>
              </div>
            </CardContent>
          </Card>

      {/* Audit Log Table */}
      <Card>
        <CardHeader>
          <CardTitle>System Activity Records</CardTitle>
          <CardDescription>Track all significant actions and changes within the system</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center h-96">
              <Loader2Icon className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Timestamp</TableHead>
                    <TableHead>Actor</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>Collection</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead className="w-[50px]">Details</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data?.logs.map((log) => (
                    <TableRow key={log._id}>
                      <TableCell>
                        {format(new Date(log.timestamp), 'dd/MM/yyyy HH:mm:ss')}
                      </TableCell>
                      <TableCell>
                        <span className="font-medium">{getActorName(log)}</span>
                        <br />
                        <span className="text-xs text-muted-foreground">
                          {log.actorModel}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className={`font-medium ${
                          log.action === 'CREATE' ? 'text-green-600' :
                          log.action === 'UPDATE' ? 'text-blue-600' :
                          log.action === 'DELETE' ? 'text-destructive' :
                          'text-muted-foreground'
                        }`}>
                          {formatAction(log.action)}
                        </span>
                      </TableCell>
                      <TableCell>{log.collectionName}</TableCell>
                      <TableCell className="max-w-md truncate">
                        {log.action === 'CREATE' && 'Created new record'}
                        {log.action === 'UPDATE' && 'Updated record'}
                        {log.action === 'DELETE' && 'Deleted record'}
                        {log.action === 'LOGIN' && 'User logged in'}
                        {log.action === 'LOGOUT' && 'User logged out'}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setSelectedLog(log)}
                          title="View Details"
                        >
                          <EyeIcon className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* Pagination */}
              {data?.pagination && (
                <div className="flex items-center justify-between mt-4">
                  <p className="text-sm text-muted-foreground">
                    Showing {((filters.page - 1) * filters.limit) + 1} to{' '}
                    {Math.min(filters.page * filters.limit, data.pagination.total)} of{' '}
                    {data.pagination.total} entries
                  </p>
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePageChange(filters.page - 1)}
                      disabled={!data.pagination.hasPrevPage}
                    >
                      <ChevronLeftIcon className="h-4 w-4" />
                    </Button>
                    <span className="text-sm">
                      Page {filters.page} of {data.pagination.totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePageChange(filters.page + 1)}
                      disabled={!data.pagination.hasNextPage}
                    >
                      <ChevronRightIcon className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Details Modal */}
      {renderDetailsModal()}
        </div>
      );
    };

    export default AuditLogPage;
  