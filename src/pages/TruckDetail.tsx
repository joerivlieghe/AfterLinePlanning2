import React, { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAppContext } from '@/context/AppContext';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { getPriorityColor, getSeverityColor, getMissingPartStatusColor, formatDate, getPriorityScore, getStatusColor, formatTime, getAvailableShiftHours, generateNextDays } from '@/lib/data';
import { Deviation, MissingPart, Operator, RepairType, Shift } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { WrenchIcon, PackageIcon, CalendarIcon, InfoIcon, CarIcon, ArrowLeftIcon, ClockIcon, UserIcon, CheckCircleIcon, XCircleIcon, UserPlusIcon, FlagIcon, UsersIcon } from 'lucide-react';
import { format, isToday, isTomorrow } from 'date-fns';

const TruckDetail: React.FC = () => {
  const { truckId } = useParams<{ truckId: string }>();
  const navigate = useNavigate();
  const { trucks, operators, markDeviationComplete, markMissingPartComplete, unassignOperatorFromTruck, assignOperatorToTruck, markTruckComplete, markCustomerAdaptationComplete } = useAppContext();
  const { toast } = useToast();

  const truck = useMemo(() => trucks.find((t) => t.id === truckId), [trucks, truckId]);
  const assignedOperators = useMemo(() =>
    truck?.assignedOperatorIds.map(opId => operators.find(op => op.id === opId)).filter(Boolean) as Operator[] || []
  , [operators, truck]);

  const [showCompletionConfirmation, setShowCompletionConfirmation] = useState(false);
  const [itemToComplete, setItemToComplete] = useState<{ type: 'deviation' | 'missingPart' | 'customerAdaptation', id?: string } | null>(null);
  const [selectedCompletingOperatorId, setSelectedCompletingOperatorId] = useState<string | null>(null);

  const [showAssignOperatorDialog, setShowAssignOperatorDialog] = useState(false);
  const [selectedPlanningDate, setSelectedPlanningDate] = useState<Date>(new Date());
  const [selectedPlanningShift, setSelectedPlanningShift] = useState<Shift>('Early'); // New state for shift selection

  const [showFinishTruckConfirmation, setShowFinishTruckConfirmation] = useState(false);

  if (!truck) {
    return (
      <div className="p-6 text-center text-red-500">
        <h1 className="text-3xl font-bold mb-4">Truck Not Found</h1>
        <Button onClick={() => navigate('/')}>Back to Dashboard</Button>
      </div>
    );
  }

  const priorityBreakdown = getPriorityScore(truck);

  const handleMarkComplete = (type: 'deviation' | 'missingPart' | 'customerAdaptation', id?: string) => {
    if (assignedOperators.length === 0) {
      toast({
        title: "Action Blocked",
        description: "Tasks cannot be marked complete without an assigned operator.",
        variant: "destructive",
      });
      return;
    }
    setItemToComplete({ type, id });
    setSelectedCompletingOperatorId(null);
    setShowCompletionConfirmation(true);
  };

  const confirmCompletion = () => {
    if (itemToComplete && selectedCompletingOperatorId) {
      const completedByOperator = operators.find(op => op.id === selectedCompletingOperatorId);
      const completedByName = completedByOperator ? completedByOperator.name : 'Unknown Operator';

      if (itemToComplete.type === 'deviation' && itemToComplete.id) {
        const success = markDeviationComplete(truck.id, itemToComplete.id, completedByName);
        if (!success) {
          toast({
            title: "Completion Failed",
            description: "Could not mark deviation complete. Ensure an operator is assigned.",
            variant: "destructive",
          });
        }
      } else if (itemToComplete.type === 'missingPart' && itemToComplete.id) {
        markMissingPartComplete(truck.id, itemToComplete.id, completedByName);
      } else if (itemToComplete.type === 'customerAdaptation') {
        markCustomerAdaptationComplete(truck.id, completedByName);
      }
      setShowCompletionConfirmation(false);
      setItemToComplete(null);
      setSelectedCompletingOperatorId(null);
    } else {
      toast({
        title: "Selection Required",
        description: "Please select an operator who completed the task.",
        variant: "destructive",
      });
    }
  };

  const handleUnassignOperator = (operatorId: string) => {
    unassignOperatorFromTruck(truck.id, operatorId);
    toast({
      title: "Operator Unassigned",
      description: `Operator ${operators.find(op => op.id === operatorId)?.name || 'Unknown'} unassigned from truck ${truck.chassisNumber}.`,
      variant: "default",
    });
  };

  const handleAssignSpecificOperator = (operatorId: string) => {
    if (truck) {
      assignOperatorToTruck(truck.id, operatorId);
      toast({
        title: "Operator Assigned",
        description: `Operator ${operators.find(op => op.id === operatorId)?.name || 'Unknown'} assigned to truck ${truck.chassisNumber}.`,
        variant: "default",
      });
      setShowAssignOperatorDialog(false);
    }
  };

  const handleFinishTruck = () => {
    setShowFinishTruckConfirmation(true);
  };

  const confirmFinishTruck = () => {
    markTruckComplete(truck.id);
    setShowFinishTruckConfirmation(false);
    toast({
      title: "Truck Completed",
      description: `Truck ${truck.chassisNumber} has been marked as completed.`,
    });
    navigate('/');
  };

  const truckRequiredCompetencies = useMemo(() => {
    const competencies = new Set<RepairType>();
    if (truck.repairType) {
      competencies.add(truck.repairType);
    }
    if (truck.customerAdaptationWork && !truck.customerAdaptationCompleted) {
      competencies.add('Customer Adaptation');
    }
    return Array.from(competencies);
  }, [truck.repairType, truck.customerAdaptationWork, truck.customerAdaptationCompleted]);

  const dayOptions = useMemo(() => {
    const next7Days = generateNextDays(7);
    return next7Days.map(date => {
      let label = format(date, 'EEE, MMM dd');
      if (isToday(date)) {
        label = `Today (${label})`;
      } else if (isTomorrow(date)) {
        label = `Tomorrow (${label})`;
      }
      return { label, value: date.toISOString() };
    });
  }, []);

  const availableOperators = useMemo(() => {
    const actualPlanningDate = new Date(selectedPlanningDate); // Ensure it's a Date object

    return operators.filter(op =>
      !truck.assignedOperatorIds.includes(op.id) &&
      (op.status === 'Available' || op.assignedTrucks.length === 0) &&
      op.shift === selectedPlanningShift // Filter by selected shift
    ).sort((a, b) => {
      const aAvailableHours = getAvailableShiftHours(a, actualPlanningDate);
      const bAvailableHours = getAvailableShiftHours(b, actualPlanningDate);
      return bAvailableHours - aAvailableHours;
    });
  }, [operators, truck.assignedOperatorIds, selectedPlanningDate, selectedPlanningShift]);

  const isTruckReadyForAssignment =
    truck.status !== 'Completed' &&
    truck.status !== 'Missing Parts Not Available';

  const allWorkCompleted = useMemo(() => {
    const allDeviationsCompleted = truck.deviations.every(dev => dev.completed);
    const allMissingPartsCompleted = truck.missingParts.every(mp => mp.completed);
    const customerAdaptationWorkCompleted = truck.customerAdaptationWork === null || (truck.customerAdaptationWork !== null && truck.customerAdaptationCompleted);
    return allDeviationsCompleted && allMissingPartsCompleted && customerAdaptationWorkCompleted;
  }, [truck]);

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <Button variant="outline" onClick={() => navigate('/')} className="mb-6 flex items-center">
        <ArrowLeftIcon className="mr-2 h-4 w-4" /> Back to Dashboard
      </Button>

      <h1 className="text-4xl font-extrabold mb-6 text-gray-900">Truck Details: {truck.chassisNumber}</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Truck Overview */}
        <Card className="lg:col-span-2 bg-white shadow-lg rounded-lg p-6">
          <CardHeader className="p-0 pb-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-2xl font-semibold text-gray-800">{truck.chassisNumber}</CardTitle>
              <Badge className={getStatusColor(truck.status)}>{truck.status}</Badge>
            </div>
            <CardDescription className="text-sm text-gray-600">ID: {truck.id}</CardDescription>
          </CardHeader>
          <CardContent className="p-0 space-y-3 text-gray-700">
            <div className="grid grid-cols-2 gap-y-2">
              <div className="flex items-center text-base">
                <CalendarIcon className="mr-2 h-5 w-5 text-muted-foreground" />
                <span>Delivery Date: {formatDate(truck.deliveryDate)}</span>
              </div>
              <div className="flex items-center text-base">
                <ClockIcon className="mr-2 h-5 w-5 text-muted-foreground" />
                <span>Total Est. Repair Time: {truck.repairTimeEstimate} hrs</span>
              </div>
              {truck.deviationTimeEstimate !== undefined && truck.deviationTimeEstimate > 0 && (
                <div className="flex items-center text-base text-yellow-700">
                  <ClockIcon className="mr-2 h-5 w-5 text-muted-foreground" />
                  <span>Deviations Est. Time: {truck.deviationTimeEstimate} hrs</span>
                </div>
              )}
              {truck.missingPartsTimeEstimate !== undefined && truck.missingPartsTimeEstimate > 0 && (
                <div className="flex items-center text-base text-blue-700">
                  <ClockIcon className="mr-2 h-5 w-5 text-muted-foreground" />
                  <span>Missing Parts Est. Time: {truck.missingPartsTimeEstimate} hrs</span>
                </div>
              )}
              {truck.customerAdaptationWork && truck.customerAdaptationTimeEstimate !== undefined && truck.customerAdaptationTimeEstimate > 0 && (
                <div className="flex items-center text-base text-purple-700">
                  <ClockIcon className="mr-2 h-5 w-5 text-muted-foreground" />
                  <span>CA Work Est. Time: {truck.customerAdaptationTimeEstimate} hrs</span>
                </div>
              )}
              <div className="flex items-center text-base">
                <WrenchIcon className="mr-2 h-5 w-5 text-muted-foreground" />
                <span>Repair Type: {truck.repairType}</span>
              </div>
              <div className="flex items-center text-base">
                <InfoIcon className="mr-2 h-5 w-5 text-muted-foreground" />
                <span>Repair Area: {truck.repairAreaNeeded}</span>
              </div>
              <div className="flex items-center text-base">
                <CarIcon className="mr-2 h-5 w-5 text-muted-foreground" />
                <span>OK to Drive: {truck.okToDrive ? 'Yes' : 'No'}</span>
              </div>
              <div className="flex items-center text-base">
                <UserIcon className="mr-2 h-5 w-5 text-muted-foreground" />
                <span>Customer Priority: <Badge variant="secondary">{truck.customerPriority}</Badge></span>
              </div>
            </div>

            {truck.customerAdaptationWork && (
              <div className="mt-4 p-3 bg-purple-50 rounded-md border border-purple-200 text-purple-800 italic">
                <h3 className="font-semibold flex items-center mb-1">
                  <WrenchIcon className="mr-2 h-4 w-4" /> Customer Adaptation Work:
                </h3>
                <p>{truck.customerAdaptationWork}</p>
                {truck.customerAdaptationTimeEstimate !== undefined && truck.customerAdaptationTimeEstimate > 0 && (
                  <p className="text-sm text-purple-700 mt-1">
                    Est. Time: {truck.customerAdaptationTimeEstimate} hrs
                  </p>
                )}
                {!truck.customerAdaptationCompleted && assignedOperators.length > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-2 text-green-600 border-green-600 hover:bg-green-50 hover:text-green-700"
                    onClick={() => handleMarkComplete('customerAdaptation')}
                  >
                    <CheckCircleIcon className="mr-2 h-4 w-4" /> Mark Complete
                  </Button>
                )}
                {truck.customerAdaptationCompleted && (
                  <p className="text-xs text-green-600 mt-1">
                    Completed by {truck.customerAdaptationCompletedBy} on {formatDate(truck.customerAdaptationCompletedAt!)} {formatTime(truck.customerAdaptationCompletedAt!)}
                  </p>
                )}
              </div>
            )}

            {assignedOperators.length > 0 && (
              <div className="mt-4 p-3 bg-blue-50 rounded-md border border-blue-200 text-blue-800">
                <h3 className="font-semibold flex items-center mb-2">
                  <UsersIcon className="mr-2 h-4 w-4" /> Assigned Operators:
                </h3>
                <div className="space-y-2">
                  {assignedOperators.map(operator => (
                    <div key={operator.id} className="flex items-center justify-between text-sm">
                      <span>{operator.name} (ID: {operator.id})</span>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-red-600 border-red-600 hover:bg-red-50 hover:text-red-700"
                        onClick={() => handleUnassignOperator(operator.id)}
                      >
                        <XCircleIcon className="mr-2 h-4 w-4" /> Unassign
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {isTruckReadyForAssignment && (
              <Button
                className="mt-4 w-full"
                onClick={() => {
                  setShowAssignOperatorDialog(true);
                  setSelectedPlanningDate(new Date()); // Reset to today when opening
                  setSelectedPlanningShift('Early'); // Reset to Early shift
                }}
              >
                <UserPlusIcon className="mr-2 h-4 w-4" /> {assignedOperators.length > 0 ? 'Assign Another Operator' : 'Assign to Operator'}
              </Button>
            )}

            {truck.status !== 'Completed' && allWorkCompleted && (
              <Button
                className="mt-4 w-full bg-green-600 hover:bg-green-700 text-white"
                onClick={handleFinishTruck}
              >
                <FlagIcon className="mr-2 h-4 w-4" /> Finish Truck
              </Button>
            )}
          </CardContent>
        </Card>

        {/* Priority Score Breakdown */}
        <Card className="lg:col-span-1 bg-white shadow-lg rounded-lg p-6">
          <CardHeader className="p-0 pb-4">
            <CardTitle className="text-2xl font-semibold text-gray-800 flex items-center">
              <InfoIcon className="mr-3 h-6 w-6 text-primary" /> Priority Score
            </CardTitle>
            <CardDescription className="text-sm text-gray-600">
              Overall Score: <Badge className={getPriorityColor(priorityBreakdown.totalScore)}>{priorityBreakdown.totalScore}</Badge>
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0 space-y-2 text-gray-700">
            <h3 className="font-semibold text-lg mb-2">Breakdown:</h3>
            <ul className="space-y-1">
              <li>Customer Priority: <span className="font-medium">{priorityBreakdown.customerPriority}</span> pts</li>
              <li>Delivery Date: <span className="font-medium">{priorityBreakdown.deliveryDate}</span> pts</li>
              <li>Missing Parts Availability: <span className="font-medium">{priorityBreakdown.missingPartsAvailability}</span> pts</li>
              <li>Deviations: <span className="font-medium">{priorityBreakdown.deviations}</span> pts</li>
              <li>Customer Adaptation Work: <span className="font-medium">{priorityBreakdown.customerAdaptationWork}</span> pts</li>
              <li>OK to Drive (Penalty): <span className="font-medium">{priorityBreakdown.okToDrive}</span> pts</li>
              <li>Repair Time Estimate (Penalty): <span className="font-medium">{priorityBreakdown.repairTimeEstimatePenalty}</span> pts</li>
            </ul>
          </CardContent>
        </Card>
      </div>

      {/* Deviations and Missing Parts */}
      <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Deviations */}
        <Card className="bg-white shadow-lg rounded-lg p-6">
          <CardHeader className="p-0 pb-4">
            <CardTitle className="text-2xl font-semibold text-gray-800 flex items-center">
              <WrenchIcon className="mr-3 h-6 w-6 text-yellow-600" /> Deviations ({truck.deviations.filter(dev => !dev.completed).length} Open)
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-[250px] pr-4">
              <div className="space-y-3">
                {truck.deviations.length > 0 ? (
                  truck.deviations.map((dev) => (
                    <div key={dev.id} className="flex items-center justify-between p-3 border rounded-md bg-gray-50">
                      <div>
                        <p className="text-sm font-medium">
                          <span className={getSeverityColor(dev.severity)}>{dev.severity}:</span> {dev.description}
                        </p>
                        {dev.timeEstimate !== undefined && dev.timeEstimate > 0 && (
                          <p className="text-xs text-gray-500 mt-1">
                            Est. Time: {dev.timeEstimate} hrs
                          </p>
                        )}
                        {dev.completed && (
                          <p className="text-xs text-green-600 mt-1">
                            Completed by {dev.completedBy} on {formatDate(dev.completedAt!)} {formatTime(dev.completedAt!)}
                          </p>
                        )}
                      </div>
                      {!dev.completed && assignedOperators.length > 0 && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="ml-4 text-green-600 border-green-600 hover:bg-green-50 hover:text-green-700"
                          onClick={() => handleMarkComplete('deviation', dev.id)}
                        >
                          <CheckCircleIcon className="mr-2 h-4 w-4" /> Mark Complete
                        </Button>
                      )}
                    </div>
                  ))
                ) : (
                  <p className="text-muted-foreground text-center py-8">No deviations registered.</p>
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Missing Parts */}
        <Card className="bg-white shadow-lg rounded-lg p-6">
          <CardHeader className="p-0 pb-4">
            <CardTitle className="text-2xl font-semibold text-gray-800 flex items-center">
              <PackageIcon className="mr-3 h-6 w-6 text-blue-600" /> Missing Parts ({truck.missingParts.filter(mp => mp.status !== 'Available' && !mp.completed).length} Pending)
              {truck.missingPartsTimeEstimate !== undefined && truck.missingPartsTimeEstimate > 0 && (
                <span className="ml-2 text-base font-normal text-blue-700">
                  (Est. Total Installation Time: {truck.missingPartsTimeEstimate} hrs)
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-[250px] pr-4">
              <div className="space-y-3">
                {truck.missingParts.length > 0 ? (
                  truck.missingParts.map((part) => (
                    <div key={part.id} className="flex items-center justify-between p-3 border rounded-md bg-gray-50">
                      <div>
                        <p className="text-sm font-medium">
                          {part.name} - <Badge className={getMissingPartStatusColor(part.status)}>{part.status}</Badge>
                        </p>
                        {part.timeEstimate !== undefined && part.timeEstimate > 0 && (
                          <p className="text-xs text-gray-500 mt-1">
                            Est. Installation Time: {part.timeEstimate} hrs
                          </p>
                        )}
                        {part.status !== 'Available' && (
                          <p className="text-xs text-gray-500 mt-1">
                            Est. Delivery: {formatDate(part.promisedDeliveryDate)}
                          </p>
                        )}
                        {part.completed && (
                          <p className="text-xs text-green-600 mt-1">
                            Completed by {part.completedBy} on {formatDate(part.completedAt!)} {formatTime(part.completedAt!)}
                          </p>
                        )}
                      </div>
                      {!part.completed && part.status === 'Available' && assignedOperators.length > 0 && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="ml-4 text-green-600 border-green-600 hover:bg-green-50 hover:text-green-700"
                          onClick={() => handleMarkComplete('missingPart', part.id)}
                        >
                          <CheckCircleIcon className="mr-2 h-4 w-4" /> Mark Installed
                        </Button>
                      )}
                    </div>
                  ))
                ) : (
                  <p className="text-muted-foreground text-center py-8">No missing parts registered.</p>
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>

      {/* Completion Confirmation Dialog */}
      <Dialog open={showCompletionConfirmation} onOpenChange={setShowCompletionConfirmation}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Completion</DialogTitle>
            <DialogDescription>
              Are you sure you want to mark this {itemToComplete?.type === 'deviation' ? 'deviation' : itemToComplete?.type === 'missingPart' ? 'missing part' : 'customer adaptation work'} as completed? Please select the operator who completed this task.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Select onValueChange={setSelectedCompletingOperatorId} value={selectedCompletingOperatorId || ''}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select operator who completed the task" />
              </SelectTrigger>
              <SelectContent>
                {assignedOperators.length > 0 ? (
                  assignedOperators.map((op) => (
                    <SelectItem key={op.id} value={op.id}>
                      {op.name} ({op.status})
                    </SelectItem>
                  ))
                ) : (
                  <SelectItem value="no-operators" disabled>No operators assigned to this truck.</SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCompletionConfirmation(false)}>Cancel</Button>
            <Button onClick={confirmCompletion} disabled={!selectedCompletingOperatorId}>Confirm</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Assign Operator Dialog (Table-based) */}
      <Dialog open={showAssignOperatorDialog} onOpenChange={setShowAssignOperatorDialog}>
        <DialogContent className="sm:max-w-[900px] max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>{assignedOperators.length > 0 ? 'Assign Another Operator' : 'Assign Operator to Truck'}</DialogTitle>
            <DialogDescription>
              Select an available operator to assign to this truck.
              {truckRequiredCompetencies.length > 0 && (
                <p className="text-sm text-gray-700 mt-2">
                  This truck requires competencies in: <span className="font-semibold">{truckRequiredCompetencies.join(', ')}</span>. Operators with these skills are highlighted.
                </p>
              )}
            </DialogDescription>
            <div className="flex items-center space-x-4 mt-3">
              <div className="flex items-center space-x-2">
                <span className="text-sm font-medium">Planning Day:</span>
                <Select
                  onValueChange={(value) => setSelectedPlanningDate(new Date(value))}
                  value={selectedPlanningDate.toISOString()}
                >
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Select a day" />
                  </SelectTrigger>
                  <SelectContent>
                    {dayOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-sm font-medium">Shift:</span>
                <Select
                  onValueChange={(value: Shift) => setSelectedPlanningShift(value)}
                  value={selectedPlanningShift}
                >
                  <SelectTrigger className="w-[120px]">
                    <SelectValue placeholder="Select a shift" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Early">Early</SelectItem>
                    <SelectItem value="Late">Late</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
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
                    const availableHours = getAvailableShiftHours(op, selectedPlanningDate);
                    let hoursColorClass = 'text-gray-700';
                    if (availableHours >= 6) {
                      hoursColorClass = 'text-green-600 font-semibold';
                    } else if (availableHours >= 3) {
                      hoursColorClass = 'text-yellow-600 font-semibold';
                    } else {
                      hoursColorClass = 'text-red-600 font-semibold';
                    }

                    const hasRequiredCompetency = truckRequiredCompetencies.some(
                      (requiredComp) => op.competencies.includes(requiredComp)
                    );
                    const rowHighlightClass = hasRequiredCompetency ? 'bg-green-50' : '';

                    return (
                      <TableRow key={op.id} className={rowHighlightClass}>
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
                            onClick={() => handleAssignSpecificOperator(op.id)}
                            disabled={!isTruckReadyForAssignment}
                          >
                            Assign
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            ) : (
              <p className="col-span-full text-center text-muted-foreground py-8">No available operators for the selected day and shift not already assigned to this truck.</p>
            )}
          </ScrollArea>
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => { setShowAssignOperatorDialog(false); }}>Cancel</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Finish Truck Confirmation Dialog */}
      <Dialog open={showFinishTruckConfirmation} onOpenChange={setShowFinishTruckConfirmation}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Truck Completion</DialogTitle>
            <DialogDescription>
              Are you sure you want to mark this truck as fully completed? This will set its status to 'Completed' and unassign any operators.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowFinishTruckConfirmation(false)}>Cancel</Button>
            <Button onClick={confirmFinishTruck}>Confirm</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TruckDetail;
