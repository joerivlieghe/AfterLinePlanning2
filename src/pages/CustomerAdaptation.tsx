import React, { useState, useMemo } from 'react';
import { useAppContext } from '@/context/AppContext';
import { Truck, Operator, RepairType, TruckStatus } from '@/types';
import { getPriorityScore, getAvailableShiftHours, REPAIR_TYPES, CUSTOMER_PRIORITIES, ALL_TRUCK_STATUSES_FOR_GENERATION } from '@/lib/data';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CheckCircleIcon, WrenchIcon, UserPlusIcon, ClockIcon, AlertCircleIcon, ArrowUpDown } from 'lucide-react';
import { format, isPast } from 'date-fns';
import OperatorCard from '@/components/OperatorCard'; // Keep import for now, might remove if not used elsewhere
import { getStatusColor, getPriorityColor } from '@/lib/data';
import { Link } from 'react-router-dom';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge'; // Import Badge component

type SortColumn = 'chassisNumber' | 'customerAdaptationTimeEstimate' | 'deliveryDate' | 'priority' | 'status' | 'customerAdaptationType' | null;
type SortDirection = 'asc' | 'desc';

const CustomerAdaptation: React.FC = () => {
  const { trucks, operators, assignOperatorToTruck, markCustomerAdaptationComplete } = useAppContext();
  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false);
  const [selectedTruckId, setSelectedTruckId] = useState<string | null>(null);
  const [selectedOperatorId, setSelectedOperatorId] = useState<string | null>(null);
  const [showRepairTimeWarning, setShowRepairTimeWarning] = useState(false);

  // Filters
  const [filterPriority, setFilterPriority] = useState<Truck['customerPriority'] | 'all'>('all');
  const [filterCompletionStatus, setFilterCompletionStatus] = useState<'all' | 'completed' | 'pending'>('pending');
  const [filterStatus, setFilterStatus] = useState<TruckStatus | 'all'>('all');
  const [filterCAType, setFilterCAType] = useState<Truck['customerAdaptationType'] | 'all'>('all'); // New CA Type filter

  // Sorting
  const [sortColumn, setSortColumn] = useState<SortColumn>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  const handleSort = (column: SortColumn) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  const customerAdaptationTrucks = useMemo(() => {
    let filtered = trucks.filter(truck => truck.customerAdaptationWork !== null);

    if (filterCompletionStatus === 'completed') {
      filtered = filtered.filter(truck => truck.customerAdaptationCompleted);
    } else if (filterCompletionStatus === 'pending') {
      filtered = filtered.filter(truck => !truck.customerAdaptationCompleted);
    }

    if (filterPriority !== 'all') {
      filtered = filtered.filter(truck => truck.customerPriority === filterPriority);
    }

    if (filterStatus !== 'all') {
      filtered = filtered.filter(truck => truck.status === filterStatus);
    }

    if (filterCAType !== 'all') { // Apply new CA Type filter
      filtered = filtered.filter(truck => truck.customerAdaptationType === filterCAType);
    }

    // Apply sorting
    if (sortColumn) {
      filtered.sort((a, b) => {
        let valA: any;
        let valB: any;

        switch (sortColumn) {
          case 'chassisNumber':
            valA = a.chassisNumber;
            valB = b.chassisNumber;
            break;
          case 'customerAdaptationTimeEstimate':
            valA = a.customerAdaptationTimeEstimate || 0;
            valB = b.customerAdaptationTimeEstimate || 0;
            break;
          case 'deliveryDate':
            valA = a.deliveryDate.getTime();
            valB = b.deliveryDate.getTime();
            break;
          case 'priority':
            valA = getPriorityScore(a).totalScore;
            valB = getPriorityScore(b).totalScore;
            break;
          case 'status':
            valA = a.status;
            valB = b.status;
            break;
          case 'customerAdaptationType':
            valA = a.customerAdaptationType || '';
            valB = b.customerAdaptationType || '';
            break;
          default:
            return 0;
        }

        if (typeof valA === 'string' && typeof valB === 'string') {
          return sortDirection === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
        } else {
          return sortDirection === 'asc' ? valA - valB : valB - valA;
        }
      });
    } else {
      // Default sort if no column is selected: by priority score, then by delivery date
      filtered.sort((a, b) => {
        const scoreA = getPriorityScore(a).totalScore;
        const scoreB = getPriorityScore(b).totalScore;

        if (scoreB !== scoreA) {
          return scoreB - scoreA; // Higher score first
        }
        return a.deliveryDate.getTime() - b.deliveryDate.getTime(); // Earlier delivery date first
      });
    }

    return filtered;
  }, [trucks, filterPriority, filterCompletionStatus, filterStatus, filterCAType, sortColumn, sortDirection]);

  const handleAssignClick = (truckId: string) => {
    setSelectedTruckId(truckId);
    setSelectedOperatorId(null); // Reset selected operator when opening dialog
    setIsAssignDialogOpen(true);
    setShowRepairTimeWarning(false); // Reset warning
  };

  const handleAssignTruck = () => {
    if (selectedTruckId && selectedOperatorId) {
      const truckToAssign = trucks.find(t => t.id === selectedTruckId);
      const operatorToAssign = operators.find(op => op.id === selectedOperatorId);

      if (!truckToAssign || !operatorToAssign) return;

      const availableHours = getAvailableShiftHours(operatorToAssign);
      const customerAdaptationTime = truckToAssign.customerAdaptationTimeEstimate || 0;

      if (customerAdaptationTime > availableHours && !showRepairTimeWarning) {
        setShowRepairTimeWarning(true);
        return; // Show warning first, then allow re-click to proceed
      }

      assignOperatorToTruck(selectedTruckId, selectedOperatorId);
      setIsAssignDialogOpen(false);
      setSelectedTruckId(null);
      setSelectedOperatorId(null);
      setShowRepairTimeWarning(false);
    }
  };

  const handleMarkComplete = (truckId: string) => {
    // In a real app, you'd get the current user's name
    const completedBy = "Current User";
    markCustomerAdaptationComplete(truckId, completedBy);
  };

  const availableOperators = useMemo(() => {
    if (!selectedTruckId) return [];
    const truckToAssign = trucks.find(t => t.id === selectedTruckId);
    if (!truckToAssign) return [];

    const requiredCompetency: RepairType | null = truckToAssign.customerAdaptationType === 'Mechanical'
      ? 'Customer Adaptation - Mechanical'
      : truckToAssign.customerAdaptationType === 'Paint'
        ? 'Customer Adaptation - Paint'
        : null;

    // Filter operators who are available and have the specific CA competency
    const filtered = operators.filter(op =>
      op.status === 'Available' &&
      (requiredCompetency ? op.competencies.includes(requiredCompetency) : true) // If no specific CA type, any available operator is fine
    );

    // Sort: Operators with required competency first, then by available hours (descending)
    filtered.sort((a, b) => {
      const aHasCompetency = requiredCompetency ? a.competencies.includes(requiredCompetency) : false;
      const bHasCompetency = requiredCompetency ? b.competencies.includes(requiredCompetency) : false;

      if (aHasCompetency && !bHasCompetency) return -1; // a comes before b
      if (!aHasCompetency && bHasCompetency) return 1;  // b comes before a

      // If both have/don't have competency, sort by available hours
      const aAvailableHours = getAvailableShiftHours(a);
      const bAvailableHours = getAvailableShiftHours(b);
      return bAvailableHours - aAvailableHours;
    });

    return filtered;
  }, [operators, selectedTruckId, trucks]);

  const selectedOperatorAvailableHours = useMemo(() => {
    if (!selectedOperatorId) return 0;
    const operator = operators.find(op => op.id === selectedOperatorId);
    return operator ? getAvailableShiftHours(operator) : 0;
  }, [selectedOperatorId, operators]);

  const selectedTruckCustomerAdaptationTime = useMemo(() => {
    if (!selectedTruckId) return 0;
    const truck = trucks.find(t => t.id === selectedTruckId);
    return truck ? (truck.customerAdaptationTimeEstimate || 0) : 0;
  }, [selectedTruckId, trucks]);

  const renderSortIcon = (column: SortColumn) => {
    if (sortColumn === column) {
      return sortDirection === 'asc' ? (
        <ArrowUpDown className="ml-2 h-4 w-4 rotate-180" />
      ) : (
        <ArrowUpDown className="ml-2 h-4 w-4" />
      );
    }
    return <ArrowUpDown className="ml-2 h-4 w-4 opacity-40" />;
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-4xl font-extrabold text-gray-900">Customer Adaptation Planning</h1>
      </div>

      {/* Filters Section */}
      <div className="bg-white p-6 rounded-lg shadow-md mb-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div>
          <label htmlFor="completionStatusFilter" className="block text-sm font-medium text-gray-700 mb-1">Completion Status</label>
          <Select value={filterCompletionStatus} onValueChange={value => setFilterCompletionStatus(value as 'all' | 'completed' | 'pending')}>
            <SelectTrigger id="completionStatusFilter">
              <SelectValue placeholder="All Statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <label htmlFor="priorityFilter" className="block text-sm font-medium text-gray-700 mb-1">Customer Priority</label>
          <Select value={filterPriority} onValueChange={value => setFilterPriority(value as Truck['customerPriority'] | 'all')}>
            <SelectTrigger id="priorityFilter">
              <SelectValue placeholder="All Priorities" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Priorities</SelectItem>
              {CUSTOMER_PRIORITIES.map(priority => (
                <SelectItem key={priority} value={priority}>{priority}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <label htmlFor="truckStatusFilter" className="block text-sm font-medium text-gray-700 mb-1">Truck Status</label>
          <Select value={filterStatus} onValueChange={value => setFilterStatus(value as TruckStatus | 'all')}>
            <SelectTrigger id="truckStatusFilter">
              <SelectValue placeholder="All Truck Statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Truck Statuses</SelectItem>
              {ALL_TRUCK_STATUSES_FOR_GENERATION.map(status => (
                <SelectItem key={status} value={status}>{status}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <label htmlFor="caTypeFilter" className="block text-sm font-medium text-gray-700 mb-1">CA Type</label>
          <Select value={filterCAType} onValueChange={value => setFilterCAType(value as Truck['customerAdaptationType'] | 'all')}>
            <SelectTrigger id="caTypeFilter">
              <SelectValue placeholder="All CA Types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All CA Types</SelectItem>
              <SelectItem value="Mechanical">Mechanical</SelectItem>
              <SelectItem value="Paint">Paint</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Customer Adaptation Trucks List */}
      <div className="bg-white p-6 rounded-lg shadow-md">
        {customerAdaptationTrucks.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead
                  className="cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('chassisNumber')}
                >
                  <div className="flex items-center">
                    Chassis Number {renderSortIcon('chassisNumber')}
                  </div>
                </TableHead>
                <TableHead
                  className="cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('customerAdaptationType')}
                >
                  <div className="flex items-center">
                    CA Type {renderSortIcon('customerAdaptationType')}
                  </div>
                </TableHead>
                <TableHead>Customer Adaptation Work</TableHead>
                <TableHead>Paint Details</TableHead>
                <TableHead
                  className="cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('customerAdaptationTimeEstimate')}
                >
                  <div className="flex items-center">
                    Est. Time {renderSortIcon('customerAdaptationTimeEstimate')}
                  </div>
                </TableHead>
                <TableHead
                  className="cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('deliveryDate')}
                >
                  <div className="flex items-center">
                    Delivery Date {renderSortIcon('deliveryDate')}
                  </div>
                </TableHead>
                <TableHead
                  className="cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('priority')}
                >
                  <div className="flex items-center">
                    Priority {renderSortIcon('priority')}
                  </div>
                </TableHead>
                <TableHead
                  className="cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('status')}
                >
                  <div className="flex items-center">
                    Status {renderSortIcon('status')}
                  </div>
                </TableHead>
                <TableHead>Assigned Operator(s)</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {customerAdaptationTrucks.map(truck => (
                <TableRow key={truck.id}>
                  <TableCell className="font-medium">
                    <Link to={`/trucks/${truck.id}`} className="hover:underline text-blue-600">
                      {truck.chassisNumber}
                    </Link>
                  </TableCell>
                  <TableCell>{truck.customerAdaptationType || 'N/A'}</TableCell>
                  <TableCell>{truck.customerAdaptationWork || 'N/A'}</TableCell>
                  <TableCell>
                    {truck.customerAdaptationType === 'Paint' && truck.paintDetails ? (
                      <div className="text-sm text-gray-700">
                        Color: <b>{truck.paintDetails.color}</b><br />
                        Booth: <b>{truck.paintDetails.paintBoothType}</b>
                      </div>
                    ) : (
                      'N/A'
                    )}
                  </TableCell>
                  <TableCell>{truck.customerAdaptationTimeEstimate?.toFixed(1) || 'N/A'} hrs</TableCell>
                  <TableCell>
                    <div className="flex items-center">
                      {format(truck.deliveryDate, 'MMM dd, yyyy')}
                      {isPast(truck.deliveryDate, new Date()) && <span className="text-red-500 font-semibold ml-2">(Overdue)</span>}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className={`px-3 py-1 rounded-full text-xs font-semibold w-fit ${getPriorityColor(getPriorityScore(truck).totalScore)}`}>
                      {getPriorityScore(truck).totalScore} ({truck.customerPriority})
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className={`px-3 py-1 rounded-full text-xs font-semibold w-fit ${getStatusColor(truck.status)}`}>
                      {truck.status}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {truck.assignedOperatorIds.length > 0 ? (
                        truck.assignedOperatorIds.map(opId => {
                          const assignedOp = operators.find(o => o.id === opId);
                          return assignedOp ? (
                            <span key={opId} className="inline-flex items-center rounded-md bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 ring-1 ring-inset ring-blue-700/10">
                              <UserPlusIcon className="h-3 w-3 mr-1" /> {assignedOp.name}
                            </span>
                          ) : null;
                        })
                      ) : (
                        <span className="text-sm text-muted-foreground italic">No operator assigned.</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      {!truck.customerAdaptationCompleted ? (
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleAssignClick(truck.id)}
                            disabled={truck.assignedOperatorIds.length > 0}
                          >
                            <UserPlusIcon className="mr-2 h-4 w-4" /> Assign
                          </Button>
                          <Button size="sm" onClick={() => handleMarkComplete(truck.id)}>
                            <CheckCircleIcon className="mr-2 h-4 w-4" /> Complete
                          </Button>
                        </>
                      ) : (
                        <div className="text-green-600 font-semibold flex items-center">
                          <CheckCircleIcon className="mr-2 h-5 w-5" /> Completed
                        </div>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <p className="col-span-full text-center text-muted-foreground py-12 text-lg">
            No customer adaptation work found matching your filters.
          </p>
        )}
      </div>

      {/* Assign Operator Dialog */}
      <Dialog open={isAssignDialogOpen} onOpenChange={setIsAssignDialogOpen}>
        <DialogContent className="sm:max-w-[900px] max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Assign Operator for Customer Adaptation</DialogTitle>
            <DialogDescription>
              Select an available operator to assign to customer adaptation work for truck {selectedTruckId}.
              {selectedTruckId && trucks.find(t => t.id === selectedTruckId)?.customerAdaptationType && (
                <p className="text-sm text-gray-700 mt-2">
                  This work requires competency in: <span className="font-semibold">{trucks.find(t => t.id === selectedTruckId)?.customerAdaptationType === 'Mechanical' ? 'Customer Adaptation - Mechanical' : 'Customer Adaptation - Paint'}</span>. Operators with this skill are highlighted.
                </p>
              )}
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="flex-1 py-4 pr-4">
            {availableOperators.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Operator Name</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Competencies</TableHead>
                    <TableHead>Available Hours</TableHead>
                    <TableHead className="text-center">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {availableOperators.map((op) => {
                    const availableHours = getAvailableShiftHours(op);
                    let hoursColorClass = 'text-gray-700';
                    if (availableHours >= 6) {
                      hoursColorClass = 'text-green-600 font-semibold';
                    } else if (availableHours >= 3) {
                      hoursColorClass = 'text-yellow-600 font-semibold';
                    } else {
                      hoursColorClass = 'text-red-600 font-semibold';
                    }

                    const truckToAssign = trucks.find(t => t.id === selectedTruckId);
                    const requiredCompetency: RepairType | null = truckToAssign?.customerAdaptationType === 'Mechanical'
                      ? 'Customer Adaptation - Mechanical'
                      : truckToAssign?.customerAdaptationType === 'Paint'
                        ? 'Customer Adaptation - Paint'
                        : null;

                    const hasRequiredCompetency = requiredCompetency ? op.competencies.includes(requiredCompetency) : false;
                    const rowHighlightClass = hasRequiredCompetency ? 'bg-green-50 border-l-4 border-green-500' : '';
                    const isSelected = selectedOperatorId === op.id;

                    return (
                      <TableRow
                        key={op.id}
                        className={cn(rowHighlightClass, "cursor-pointer hover:bg-gray-100", isSelected ? 'bg-blue-50 border-blue-500 ring-2 ring-blue-500' : '')}
                        onClick={() => setSelectedOperatorId(op.id)}
                      >
                        <TableCell className="font-medium">{op.name}</TableCell>
                        <TableCell><Badge className={getStatusColor(op.status)}>{op.status}</Badge></TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {op.competencies.map((comp, idx) => (
                              <Badge key={idx} variant="secondary" className="text-xs px-2 py-0.5">
                                {comp}
                              </Badge>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className={hoursColorClass}>{availableHours.toFixed(1)} hrs</span>
                        </TableCell>
                        <TableCell className="text-center">
                          <Button
                            size="sm"
                            onClick={() => setSelectedOperatorId(op.id)} // Selects the operator
                            variant={isSelected ? "default" : "outline"}
                          >
                            {isSelected ? "Selected" : "Select"}
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            ) : (
              <p className="col-span-full text-center text-muted-foreground py-8">
                No operators available with required competency or sufficient hours.
              </p>
            )}
          </ScrollArea>
          {selectedOperatorId && showRepairTimeWarning && selectedTruckCustomerAdaptationTime > selectedOperatorAvailableHours && (
            <div className="bg-orange-100 border-l-4 border-orange-500 text-orange-700 p-4 mt-4" role="alert">
              <p className="font-bold">Warning!</p>
              <p>The selected operator has only {selectedOperatorAvailableHours.toFixed(1)} hours available, but this customer adaptation requires {selectedTruckCustomerAdaptationTime} hours. Assigning this will likely lead to overtime or require another operator to finish.</p>
            </div>
          )}
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => { setIsAssignDialogOpen(false); setShowRepairTimeWarning(false); }}>Cancel</Button>
            <Button onClick={handleAssignTruck} disabled={!selectedOperatorId}>
              {showRepairTimeWarning ? 'Proceed Anyway' : 'Assign'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CustomerAdaptation;
