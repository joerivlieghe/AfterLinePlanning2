import React, { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAppContext } from '@/context/AppContext';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { getPriorityColor, getSeverityColor, getMissingPartStatusColor, formatDate, getPriorityScore, getStatusColor, formatTime } from '@/lib/data';
import { WrenchIcon, PackageIcon, CalendarIcon, InfoIcon, CarIcon, ArrowLeftIcon, ClockIcon, UserIcon, CheckCircleIcon, XCircleIcon, UserPlusIcon, FlagIcon } from 'lucide-react';
import { Deviation, MissingPart } from '@/types';
import { useToast } from '@/hooks/use-toast';

const TruckDetail: React.FC = () => {
  const { truckId } = useParams<{ truckId: string }>();
  const navigate = useNavigate();
  const { trucks, operators, markDeviationComplete, markMissingPartComplete, unassignOperatorFromTruck, assignOperatorToTruck, markTruckComplete } = useAppContext();
  const { toast } = useToast(); // Moved useToast to the top

  // All other hooks must also be called unconditionally at the top level
  const truck = useMemo(() => trucks.find((t) => t.id === truckId), [trucks, truckId]);
  const assignedOperator = useMemo(() => operators.find(op => op.id === truck?.assignedOperatorId), [operators, truck]);

  const [showCompletionConfirmation, setShowCompletionConfirmation] = useState(false);
  const [itemToComplete, setItemToComplete] = useState<{ type: 'deviation' | 'missingPart', id: string } | null>(null);
  const [showAssignOperatorDialog, setShowAssignOperatorDialog] = useState(false);
  const [selectedOperatorId, setSelectedOperatorId] = useState<string | null>(null);
  const [showFinishTruckConfirmation, setShowFinishTruckConfirmation] = useState(false);

  // Conditional return after all hooks are called
  if (!truck) {
    return (
      <div className="p-6 text-center text-red-500">
        <h1 className="text-3xl font-bold mb-4">Truck Not Found</h1>
        <Button onClick={() => navigate('/')}>Back to Dashboard</Button>
      </div>
    );
  }

  const priorityBreakdown = getPriorityScore(truck);

  const handleMarkComplete = (type: 'deviation' | 'missingPart', id: string) => {
    if (type === 'deviation' && !assignedOperator) {
      toast({
        title: "Action Blocked",
        description: "Deviations cannot be marked complete without an assigned operator.",
        variant: "destructive",
      });
      return;
    }
    setItemToComplete({ type, id });
    setShowCompletionConfirmation(true);
  };

  const confirmCompletion = () => {
    if (itemToComplete) {
      const userId = assignedOperator ? assignedOperator.name : 'System';
      if (itemToComplete.type === 'deviation') {
        const success = markDeviationComplete(truck.id, itemToComplete.id, userId);
        if (!success) {
          toast({
            title: "Completion Failed",
            description: "Could not mark deviation complete. Ensure an operator is assigned.",
            variant: "destructive",
          });
        }
      } else {
        markMissingPartComplete(truck.id, itemToComplete.id, userId);
      }
      setShowCompletionConfirmation(false);
      setItemToComplete(null);
    }
  };

  const handleUnassign = () => {
    unassignOperatorFromTruck(truck.id);
  };

  const handleAssignOperator = () => {
    if (selectedOperatorId && truck) {
      assignOperatorToTruck(truck.id, selectedOperatorId);
      setShowAssignOperatorDialog(false);
      setSelectedOperatorId(null);
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

  const availableOperators = useMemo(() =>
    operators.filter(op => op.status === 'Available' || op.assignedTrucks.length === 0)
  , [operators]);

  const isTruckReadyForAssignment =
    truck.assignedOperatorId === null &&
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
              </div>
            )}

            {assignedOperator ? (
              <div className="mt-4 p-3 bg-blue-50 rounded-md border border-blue-200 text-blue-800">
                <h3 className="font-semibold flex items-center mb-1">
                  <UserIcon className="mr-2 h-4 w-4" /> Assigned Operator:
                </h3>
                <p>{assignedOperator.name} (ID: {assignedOperator.id})</p>
                <p className="text-sm">Competencies: {assignedOperator.competencies.join(', ')}</p>
                <p className="text-sm">Shift: {formatTime(assignedOperator.shiftStartTime)} - {formatTime(assignedOperator.shiftEndTime)}</p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-2 text-red-600 border-red-600 hover:bg-red-50 hover:text-red-700"
                  onClick={handleUnassign}
                >
                  <XCircleIcon className="mr-2 h-4 w-4" /> Unassign Operator
                </Button>
              </div>
            ) : (
              isTruckReadyForAssignment && (
                <Button
                  className="mt-4 w-full"
                  onClick={() => setShowAssignOperatorDialog(true)}
                >
                  <UserPlusIcon className="mr-2 h-4 w-4" /> Assign to Operator
                </Button>
              )
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
                      {!dev.completed && (
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
                      {!part.completed && part.status === 'Available' && ( // Only allow marking complete if part is available
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
              Are you sure you want to mark this {itemToComplete?.type === 'deviation' ? 'deviation' : 'missing part'} as completed? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCompletionConfirmation(false)}>Cancel</Button>
            <Button onClick={confirmCompletion}>Confirm</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Assign Operator Dialog */}
      <Dialog open={showAssignOperatorDialog} onOpenChange={setShowAssignOperatorDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign Operator to Truck</DialogTitle>
            <DialogDescription>
              Select an available operator to assign to this truck.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Select onValueChange={setSelectedOperatorId} value={selectedOperatorId || ''}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select an operator" />
              </SelectTrigger>
              <SelectContent>
                {availableOperators.length > 0 ? (
                  availableOperators.map((op) => (
                    <SelectItem key={op.id} value={op.id}>
                      {op.name} ({op.status}) - {op.competencies.join(', ')}
                    </SelectItem>
                  ))
                ) : (
                  <SelectItem value="no-operators" disabled>No available operators</SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowAssignOperatorDialog(false); setSelectedOperatorId(null); }}>Cancel</Button>
            <Button onClick={handleAssignOperator} disabled={!selectedOperatorId || availableOperators.length === 0}>Assign</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Finish Truck Confirmation Dialog */}
      <Dialog open={showFinishTruckConfirmation} onOpenChange={setShowFinishTruckConfirmation}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Truck Completion</DialogTitle>
            <DialogDescription>
              Are you sure you want to mark this truck as fully completed? This will set its status to 'Completed' and unassign any operator.
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
