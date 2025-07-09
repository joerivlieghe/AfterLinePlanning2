import React, { useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAppContext } from '@/context/AppContext';
import { Truck, Deviation, MissingPart, Operator } from '@/types';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import OperatorListDialog from '@/components/dialogs/OperatorListDialog';
import {
  getPriorityColor,
  getStatusColor,
  getSeverityColor,
  getMissingPartStatusColor,
  formatDate,
  calculateRemainingRepairTime,
  getAvailableShiftHours,
  formatTime,
  getPriorityScore
} from '@/lib/data';
import {
  TruckIcon,
  WrenchIcon,
  PackageIcon,
  CalendarIcon,
  AlertCircleIcon,
  ClockIcon,
  InfoIcon,
  CheckCircleIcon,
  XCircleIcon,
  UsersIcon,
  ArrowLeftIcon,
  CodeIcon,
  HourglassIcon
} from 'lucide-react';

const TruckDetail: React.FC = () => {
  const { truckId } = useParams<{ truckId: string }>();
  const navigate = useNavigate();
  const {
    trucks,
    operators,
    markDeviationComplete,
    markMissingPartComplete,
    markCustomerAdaptationComplete,
    assignOperatorToTruck,
    unassignOperatorFromTruck,
    markTruckComplete,
  } = useAppContext();

  const truck = useMemo(() => trucks.find(t => t.id === truckId), [trucks, truckId]);

  const assignedOperators = useMemo(() => {
    if (!truck) return [];
    return operators.filter(op => truck.assignedOperatorIds.includes(op.id));
  }, [operators, truck]);

  const [isOperatorListOpen, setIsOperatorListOpen] = useState(false);
  const [isConfirmUnassignOpen, setIsConfirmUnassignOpen] = useState(false);
  const [operatorToUnassign, setOperatorToUnassign] = useState<Operator | null>(null);
  const [isConfirmCompleteOpen, setIsConfirmCompleteOpen] = useState(false);
  const [completedByName, setCompletedByName] = useState('');

  if (!truck) {
    return (
      <div className="p-6 text-center text-red-500">
        <h1 className="text-2xl font-bold">Truck Not Found</h1>
        <Button onClick={() => navigate('/dashboard')} className="mt-4">
          Back to Dashboard
        </Button>
      </div>
    );
  }

  const priorityScore = truck.status === 'Overdue - Not Ready' || truck.status === 'Not Ready' ? 0 : getPriorityScore(truck).totalScore;
  const remainingRepairTime = calculateRemainingRepairTime(truck);

  const handleAssignOperator = (operatorId: string) => {
    assignOperatorToTruck(truck.id, operatorId);
    setIsOperatorListOpen(false);
  };

  const openUnassignConfirm = (operator: Operator) => {
    setOperatorToUnassign(operator);
    setIsConfirmUnassignOpen(true);
  };

  const confirmUnassign = () => {
    if (operatorToUnassign) {
      unassignOperatorFromTruck(truck.id, operatorToUnassign.id);
      setIsConfirmUnassignOpen(false);
      setOperatorToUnassign(null);
    }
  };

  const openCompleteConfirm = () => {
    setIsConfirmCompleteOpen(true);
  };

  const confirmComplete = () => {
    markTruckComplete(truck.id);
    navigate('/dashboard'); // Navigate back to dashboard after completion
    setIsConfirmCompleteOpen(false);
  };

  const handleMarkDeviationComplete = (deviationId: string) => {
    if (completedByName.trim() === '') {
      alert('Please enter your name to mark as complete.');
      return;
    }
    markDeviationComplete(truck.id, deviationId, completedByName);
  };

  const handleMarkMissingPartComplete = (partId: string) => {
    if (completedByName.trim() === '') {
      alert('Please enter your name to mark as complete.');
      return;
    }
    markMissingPartComplete(truck.id, partId, completedByName);
  };

  const handleMarkCustomerAdaptationComplete = () => {
    if (completedByName.trim() === '') {
      alert('Please enter your name to mark as complete.');
      return;
    }
    markCustomerAdaptationComplete(truck.id, completedByName);
  };

  return (
    <div className="p-6 flex flex-col h-screen">
      <div className="flex items-center mb-6">
        <Button variant="ghost" onClick={() => navigate(-1)} className="mr-4">
          <ArrowLeftIcon className="h-5 w-5" />
        </Button>
        <h1 className="text-3xl font-bold text-gray-900">Truck: {truck.chassisNumber}</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <Card className="lg:col-span-1 bg-white shadow-lg rounded-lg">
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-xl font-semibold flex items-center">
              <TruckIcon className="mr-2 h-6 w-6 text-primary" /> Truck Details
            </CardTitle>
            <CardDescription className="text-sm text-gray-600">
              {truck.repairType} - {truck.repairAreaNeeded}
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 pt-0 space-y-2 text-gray-700">
            <div className="flex items-center text-base">
              <Badge className={getStatusColor(truck.status)}>{truck.status}</Badge>
              <Badge className={getPriorityColor(priorityScore)}>{truck.customerPriority} Priority</Badge>
            </div>
            <div className="flex items-center text-base">
              <CalendarIcon className="mr-2 h-5 w-5 text-muted-foreground" />
              <span>Delivery Date: {formatDate(truck.deliveryDate)}</span>
            </div>
            <div className="flex items-center text-base">
              <HourglassIcon className="mr-2 h-5 w-5 text-muted-foreground" />
              <span>Remaining Repair Time: <span className="font-semibold">{remainingRepairTime.toFixed(1)} hrs</span></span>
            </div>
            <div className="flex items-center text-base">
              {truck.okToDrive ? (
                <CheckCircleIcon className="mr-2 h-5 w-5 text-green-500" />
              ) : (
                <XCircleIcon className="mr-2 h-5 w-5 text-red-500" />
              )}
              <span>{truck.okToDrive ? 'OK to Drive' : 'Not OK to Drive'}</span>
            </div>
            {truck.projectCode && (
              <div className="flex items-center text-base">
                <CodeIcon className="mr-2 h-5 w-5 text-muted-foreground" />
                <span>Project Code: <span className="font-semibold">{truck.projectCode}</span></span>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2 bg-white shadow-lg rounded-lg">
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-xl font-semibold flex items-center">
              <UsersIcon className="mr-2 h-6 w-6 text-primary" /> Assigned Operators
            </CardTitle>
            <CardDescription className="text-sm text-gray-600">
              Operators currently assigned to this truck.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 pt-0 space-y-4">
            <div className="flex flex-wrap gap-4">
              {assignedOperators.length > 0 ? (
                assignedOperators.map(operator => (
                  <Card key={operator.id} className="w-full sm:w-[calc(50%-8px)] bg-gray-50 shadow-sm">
                    <CardContent className="p-3">
                      <div className="flex items-center justify-between mb-1">
                        <h4 className="font-semibold text-base">{operator.name}</h4>
                        <Badge className={getStatusColor(operator.status)}>{operator.status}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mb-2">ID: {operator.id}</p>
                      <div className="text-sm space-y-1">
                        <div className="flex items-center">
                          <ClockIcon className="mr-1 h-3 w-3 text-muted-foreground" />
                          <span>Shift: {formatTime(operator.shiftStartTime)} - {formatTime(operator.shiftEndTime)}</span>
                        </div>
                        <div className="flex items-center">
                          <InfoIcon className="mr-1 h-3 w-3 text-muted-foreground" />
                          <span>Available: {getAvailableShiftHours(operator, trucks).toFixed(1)} hrs</span>
                        </div>
                        <div className="flex flex-wrap gap-1 mt-2">
                          {operator.competencies.map((comp, idx) => (
                            <Badge key={idx} variant="secondary" className="text-xs px-1 py-0">
                              {comp}
                            </Badge>
                          ))}
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        className="mt-3 w-full"
                        onClick={() => openUnassignConfirm(operator)}
                      >
                        Unassign
                      </Button>
                    </CardContent>
                  </Card>
                ))
              ) : (
                <p className="text-muted-foreground italic">No operators assigned yet.</p>
              )}
            </div>
            <Button onClick={() => setIsOperatorListOpen(true)} className="w-full mt-4">
              Assign Operator
            </Button>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <Card className="bg-white shadow-lg rounded-lg">
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-xl font-semibold flex items-center">
              <AlertCircleIcon className="mr-2 h-6 w-6 text-primary" /> Deviations
            </CardTitle>
            <CardDescription className="text-sm text-gray-600">
              List of deviations for this truck.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <Label htmlFor="completedByNameDev" className="mb-2 block">Your Name (for completion)</Label>
            <Input
              id="completedByNameDev"
              type="text"
              placeholder="Enter your name"
              value={completedByName}
              onChange={(e) => setCompletedByName(e.target.value)}
              className="w-full mb-4"
            />
            <ScrollArea className="h-[200px] pr-4">
              <ul className="space-y-3">
                {truck.deviations.length > 0 ? (
                  truck.deviations.map((dev: Deviation) => (
                    <li key={dev.id} className="flex items-start justify-between border-b pb-2 last:border-b-0 last:pb-0">
                      <div>
                        <p className="font-medium text-base flex items-center">
                          <span className={`mr-2 ${getSeverityColor(dev.severity)}`}>●</span>
                          {dev.description}
                        </p>
                        <p className="text-sm text-muted-foreground ml-4">
                          Est: {dev.timeEstimate || 0}h
                          {dev.completed && dev.completedBy && (
                            <span className="ml-2 italic"> (Completed by {dev.completedBy} on {formatDate(dev.completedAt!)})</span>
                          )}
                        </p>
                      </div>
                      <Checkbox
                        checked={dev.completed}
                        onCheckedChange={() => handleMarkDeviationComplete(dev.id)}
                        className="ml-4 mt-1"
                        disabled={dev.completed || completedByName.trim() === ''}
                      />
                    </li>
                  ))
                ) : (
                  <p className="text-muted-foreground italic">No deviations for this truck.</p>
                )}
              </ul>
            </ScrollArea>
          </CardContent>
        </Card>

        <Card className="bg-white shadow-lg rounded-lg">
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-xl font-semibold flex items-center">
              <PackageIcon className="mr-2 h-6 w-6 text-primary" /> Missing Parts
            </CardTitle>
            <CardDescription className="text-sm text-gray-600">
              List of missing parts for this truck.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <Label htmlFor="completedByNameParts" className="mb-2 block">Your Name (for completion)</Label>
            <Input
              id="completedByNameParts"
              type="text"
              placeholder="Enter your name"
              value={completedByName}
              onChange={(e) => setCompletedByName(e.target.value)}
              className="w-full mb-4"
            />
            <ScrollArea className="h-[200px] pr-4">
              <ul className="space-y-3">
                {truck.missingParts.length > 0 ? (
                  truck.missingParts.map((part: MissingPart) => (
                    <li key={part.id} className="flex items-start justify-between border-b pb-2 last:border-b-0 last:pb-0">
                      <div>
                        <p className="font-medium text-base flex items-center">
                          <span className={`mr-2 ${getMissingPartStatusColor(part.status)} rounded-full w-3 h-3`}></span>
                          {part.name}
                        </p>
                        <p className="text-sm text-muted-foreground ml-4">
                          Status: {part.status} | Delivery: {formatDate(part.promisedDeliveryDate)}
                          {part.completed && part.completedBy && (
                            <span className="ml-2 italic"> (Completed by {part.completedBy} on {formatDate(part.completedAt!)})</span>
                          )}
                        </p>
                      </div>
                      <Checkbox
                        checked={part.completed}
                        onCheckedChange={() => handleMarkMissingPartComplete(part.id)}
                        className="ml-4 mt-1"
                        disabled={part.completed || completedByName.trim() === ''}
                      />
                    </li>
                  ))
                ) : (
                  <p className="text-muted-foreground italic">No missing parts for this truck.</p>
                )}
              </ul>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>

      {truck.customerAdaptationWork && (
        <Card className="bg-white shadow-lg rounded-lg mb-6">
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-xl font-semibold flex items-center">
              <WrenchIcon className="mr-2 h-6 w-6 text-primary" /> Customer Adaptation Work
            </CardTitle>
            <CardDescription className="text-sm text-gray-600">
              Details about custom adaptation work.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <Label htmlFor="completedByNameCA" className="mb-2 block">Your Name (for completion)</Label>
            <Input
              id="completedByNameCA"
              type="text"
              placeholder="Enter your name"
              value={completedByName}
              onChange={(e) => setCompletedByName(e.target.value)}
              className="w-full mb-4"
            />
            <div className="flex items-start justify-between border-b pb-2">
              <div>
                <p className="font-medium text-base">{truck.customerAdaptationWork}</p>
                <p className="text-sm text-muted-foreground">
                  Est: {truck.customerAdaptationTimeEstimate || 0}h
                  {truck.customerAdaptationCompleted && truck.customerAdaptationCompletedBy && (
                    <span className="ml-2 italic"> (Completed by {truck.customerAdaptationCompletedBy} on {formatDate(truck.customerAdaptationCompletedAt!)})</span>
                  )}
                </p>
              </div>
              <Checkbox
                checked={truck.customerAdaptationCompleted}
                onCheckedChange={handleMarkCustomerAdaptationComplete}
                className="ml-4 mt-1"
                disabled={truck.customerAdaptationCompleted || completedByName.trim() === ''}
              />
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex justify-end mt-auto pt-6 border-t">
        <Button
          onClick={openCompleteConfirm}
          disabled={remainingRepairTime > 0}
          className="bg-green-600 hover:bg-green-700 text-white"
        >
          Mark Truck Complete
        </Button>
      </div>

      <OperatorListDialog
        isOpen={isOperatorListOpen}
        onClose={() => setIsOperatorListOpen(false)}
        onSelectOperator={handleAssignOperator}
        currentTruck={truck}
        operators={operators}
        allTrucks={trucks}
      />

      {/* Unassign Confirmation Dialog */}
      <Dialog open={isConfirmUnassignOpen} onOpenChange={setIsConfirmUnassignOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Unassignment</DialogTitle>
            <DialogDescription>
              Are you sure you want to unassign {operatorToUnassign?.name} from this truck?
              This will free up the operator's time but the truck will remain in its current state.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsConfirmUnassignOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={confirmUnassign}>Unassign</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Mark Complete Confirmation Dialog */}
      <Dialog open={isConfirmCompleteOpen} onOpenChange={setIsConfirmCompleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Truck Completion</DialogTitle>
            <DialogDescription>
              Are you sure you want to mark truck {truck.chassisNumber} as COMPLETE?
              This action will unassign all operators and set its status to 'Completed'.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsConfirmCompleteOpen(false)}>Cancel</Button>
            <Button variant="default" onClick={confirmComplete}>Confirm Complete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TruckDetail;
