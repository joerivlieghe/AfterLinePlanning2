import React, { useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAppContext } from '@/context/AppContext';
import { Operator, Truck, Deviation, MissingPart } from '@/types';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  getStatusColor,
  getEfficiencyColor,
  formatTime,
  formatDate,
  getSeverityColor,
  getMissingPartStatusColor,
  calculateRemainingRepairTime,
  getAvailableShiftHours
} from '@/lib/data';
import {
  UsersIcon,
  ClockIcon,
  GaugeIcon,
  WrenchIcon,
  InfoIcon,
  TruckIcon,
  ArrowLeftIcon,
  AlertCircleIcon,
  PackageIcon,
  CheckCircleIcon,
  XCircleIcon,
  HourglassIcon,
  ClipboardCheckIcon
} from 'lucide-react';

const OperatorView: React.FC = () => {
  const { operatorId } = useParams<{ operatorId: string }>();
  const navigate = useNavigate();
  const {
    operators,
    trucks,
    markDeviationComplete,
    markMissingPartComplete,
    markCustomerAdaptationComplete,
    unassignOperatorFromTruck,
    markTruckComplete,
  } = useAppContext();

  const operator = useMemo(() => operators.find(op => op.id === operatorId), [operators, operatorId]);

  const assignedTrucks = useMemo(() => {
    if (!operator) return [];
    return trucks.filter(truck => operator.assignedTruckIds.includes(truck.id));
  }, [operator, trucks]);

  const [isConfirmUnassignOpen, setIsConfirmUnassignOpen] = useState(false);
  const [truckToUnassign, setTruckToUnassign] = useState<Truck | null>(null);
  const [isConfirmCompleteOpen, setIsConfirmCompleteOpen] = useState(false);
  const [truckToComplete, setTruckToComplete] = useState<Truck | null>(null);
  const [completedByName, setCompletedByName] = useState('');

  if (!operator) {
    return (
      <div className="p-6 text-center text-red-500">
        <h1 className="text-2xl font-bold">Operator Not Found</h1>
        <Button onClick={() => navigate('/operators')} className="mt-4">
          Back to Operators
        </Button>
      </div>
    );
  }

  const availableHours = getAvailableShiftHours(operator, trucks);
  const assignedRepairTime = assignedTrucks.reduce((sum: number, truck: Truck) => sum + calculateRemainingRepairTime(truck), 0);
  const totalShiftHours = (operator.shiftEndTime.getTime() - operator.shiftStartTime.getTime()) / (1000 * 60 * 60);
  const occupancyRate = totalShiftHours > 0 ? (assignedRepairTime / totalShiftHours) : 0;

  const handleMarkDeviationComplete = (truckId: string, deviationId: string) => {
    if (completedByName.trim() === '') {
      alert('Please enter your name to mark as complete.');
      return;
    }
    const success = markDeviationComplete(truckId, deviationId, completedByName);
    if (success) {
      // Optionally show a toast or notification
    }
  };

  const handleMarkMissingPartComplete = (truckId: string, partId: string) => {
    if (completedByName.trim() === '') {
      alert('Please enter your name to mark as complete.');
      return;
    }
    markMissingPartComplete(truckId, partId, completedByName);
  };

  const handleMarkCustomerAdaptationComplete = (truckId: string) => {
    if (completedByName.trim() === '') {
      alert('Please enter your name to mark as complete.');
      return;
    }
    markCustomerAdaptationComplete(truckId, completedByName);
  };

  const openUnassignConfirm = (truck: Truck) => {
    setTruckToUnassign(truck);
    setIsConfirmUnassignOpen(true);
  };

  const confirmUnassign = () => {
    if (truckToUnassign && operator) {
      unassignOperatorFromTruck(truckToUnassign.id, operator.id);
      setIsConfirmUnassignOpen(false);
      setTruckToUnassign(null);
    }
  };

  const openCompleteConfirm = (truck: Truck) => {
    setTruckToComplete(truck);
    setIsConfirmCompleteOpen(true);
  };

  const confirmComplete = () => {
    if (truckToComplete) {
      markTruckComplete(truckToComplete.id);
      setIsConfirmCompleteOpen(false);
      setTruckToComplete(null);
    }
  };

  return (
    <div className="p-6 flex flex-col h-screen">
      <div className="flex items-center mb-6">
        <Button variant="ghost" onClick={() => navigate('/operators')} className="mr-4">
          <ArrowLeftIcon className="h-5 w-5" />
        </Button>
        <h1 className="text-3xl font-bold text-gray-900">Operator: {operator.name}</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <Card className="lg:col-span-1 bg-white shadow-lg rounded-lg">
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-xl font-semibold flex items-center">
              <UsersIcon className="mr-2 h-6 w-6 text-primary" /> Operator Details
            </CardTitle>
            <CardDescription className="text-sm text-gray-600">ID: {operator.id}</CardDescription>
          </CardHeader>
          <CardContent className="p-4 pt-0 space-y-2 text-gray-700">
            <div className="flex items-center text-base">
              <Badge className={getStatusColor(operator.status)}>{operator.status}</Badge>
              <Badge variant="outline" className="ml-2 text-sm px-2 py-0.5">
                {operator.shift} Shift
              </Badge>
            </div>
            <div className="flex items-center text-base">
              <ClockIcon className="mr-2 h-5 w-5 text-muted-foreground" />
              <span>Shift: {formatTime(operator.shiftStartTime)} - {formatTime(operator.shiftEndTime)}</span>
            </div>
            <div className="flex items-center text-base">
              <InfoIcon className="mr-2 h-5 w-5 text-muted-foreground" />
              <span>Available Hours: <span className="font-semibold">{availableHours.toFixed(1)} hrs</span></span>
            </div>
            <div className="flex items-center text-base">
              <GaugeIcon className="mr-2 h-5 w-5 text-muted-foreground" />
              <span>Occupancy: <span className={getEfficiencyColor(occupancyRate)}>{(occupancyRate * 100).toFixed(0)}%</span></span>
            </div>
            <div className="flex items-center text-base">
              <TruckIcon className="mr-2 h-5 w-5 text-muted-foreground" />
              <span>Assigned Trucks: {operator.assignedTruckIds.length}</span>
            </div>
            <div className="mt-4">
              <h3 className="font-semibold text-base mb-2 flex items-center">
                <WrenchIcon className="mr-2 h-5 w-5" /> Competencies:
              </h3>
              <div className="flex flex-wrap gap-2">
                {operator.competencies.map((comp, index) => (
                  <Badge key={index} variant="secondary" className="text-sm">
                    {comp}
                  </Badge>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2 bg-white shadow-lg rounded-lg">
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-xl font-semibold flex items-center">
              <ClipboardCheckIcon className="mr-2 h-6 w-6 text-primary" /> Mark Work Complete
            </CardTitle>
            <CardDescription className="text-sm text-gray-600">
              Enter your name and mark deviations, missing parts, or customer adaptations as complete.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 pt-0 space-y-4">
            <div>
              <Label htmlFor="completedByName" className="mb-2 block">Your Name</Label>
              <Input
                id="completedByName"
                type="text"
                placeholder="Enter your name"
                value={completedByName}
                onChange={(e) => setCompletedByName(e.target.value)}
                className="w-full"
              />
            </div>
            <p className="text-sm text-muted-foreground">
              This name will be recorded as the person who completed the task.
            </p>
          </CardContent>
        </Card>
      </div>

      <h2 className="text-2xl font-bold mb-4 text-gray-900">Assigned Trucks</h2>
      <ScrollArea className="flex-1 pr-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {assignedTrucks.length > 0 ? (
            assignedTrucks.map((truck) => (
              <Card key={truck.id} className="bg-white shadow-md rounded-lg overflow-hidden">
                <CardHeader className="p-4 pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg font-semibold">{truck.chassisNumber}</CardTitle>
                    <Badge className={getStatusColor(truck.status)}>{truck.status}</Badge>
                  </div>
                  <CardDescription className="text-sm text-gray-600">{truck.repairType}</CardDescription>
                </CardHeader>
                <CardContent className="p-4 pt-0 space-y-2 text-gray-700">
                  <div className="flex items-center text-sm">
                    <HourglassIcon className="mr-2 h-4 w-4 text-muted-foreground" />
                    <span>Remaining: {calculateRemainingRepairTime(truck).toFixed(1)} hrs</span>
                  </div>
                  <div className="flex items-center text-sm">
                    <CalendarIcon className="mr-2 h-4 w-4 text-muted-foreground" />
                    <span>Delivery: {formatDate(truck.deliveryDate)}</span>
                  </div>

                  {truck.deviations.filter(d => !d.completed).length > 0 && (
                    <div className="mt-2">
                      <h3 className="font-semibold text-sm mb-1 flex items-center">
                        <AlertCircleIcon className="mr-2 h-4 w-4" /> Deviations:
                      </h3>
                      <ul className="text-xs space-y-1">
                        {truck.deviations.filter(d => !d.completed).map((dev: Deviation) => (
                          <li key={dev.id} className="flex items-center justify-between">
                            <span className={`mr-1 ${getSeverityColor(dev.severity)}`}>●</span>
                            {dev.description} ({dev.timeEstimate || 0}h)
                            <Checkbox
                              checked={dev.completed}
                              onCheckedChange={() => handleMarkDeviationComplete(truck.id, dev.id)}
                              className="ml-2"
                              disabled={completedByName.trim() === ''}
                            />
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {truck.missingParts.filter(mp => !mp.completed).length > 0 && (
                    <div className="mt-2">
                      <h3 className="font-semibold text-sm mb-1 flex items-center">
                        <PackageIcon className="mr-2 h-4 w-4" /> Missing Parts:
                      </h3>
                      <ul className="text-xs space-y-1">
                        {truck.missingParts.filter(mp => !mp.completed).map((part: MissingPart) => (
                          <li key={part.id} className="flex items-center justify-between">
                            <span className={`mr-1 ${getMissingPartStatusColor(part.status)} rounded-full w-2 h-2`}></span>
                            {part.name} ({part.status})
                            <Checkbox
                              checked={part.completed}
                              onCheckedChange={() => handleMarkMissingPartComplete(truck.id, part.id)}
                              className="ml-2"
                              disabled={completedByName.trim() === ''}
                            />
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {truck.customerAdaptationWork && !truck.customerAdaptationCompleted && (
                    <div className="mt-2">
                      <h3 className="font-semibold text-sm mb-1 flex items-center">
                        <WrenchIcon className="mr-2 h-4 w-4" /> Customer Adaptation:
                      </h3>
                      <div className="flex items-center justify-between">
                        <p className="text-xs">{truck.customerAdaptationWork} ({truck.customerAdaptationTimeEstimate || 0}h)</p>
                        <Checkbox
                          checked={truck.customerAdaptationCompleted}
                          onCheckedChange={() => handleMarkCustomerAdaptationComplete(truck.id)}
                          className="ml-2"
                          disabled={completedByName.trim() === ''}
                        />
                      </div>
                    </div>
                  )}

                  <div className="flex justify-between mt-4 space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openUnassignConfirm(truck)}
                      className="flex-1"
                    >
                      Unassign
                    </Button>
                    <Button
                      variant="default"
                      size="sm"
                      onClick={() => openCompleteConfirm(truck)}
                      className="flex-1"
                      disabled={calculateRemainingRepairTime(truck) > 0}
                    >
                      Mark Complete
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <p className="col-span-full text-center text-muted-foreground py-12">No trucks currently assigned to this operator.</p>
          )}
        </div>
      </ScrollArea>

      {/* Unassign Confirmation Dialog */}
      <Dialog open={isConfirmUnassignOpen} onOpenChange={setIsConfirmUnassignOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Unassignment</DialogTitle>
            <DialogDescription>
              Are you sure you want to unassign this operator from truck {truckToUnassign?.chassisNumber}?
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
              Are you sure you want to mark truck {truckToComplete?.chassisNumber} as COMPLETE?
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

export default OperatorView;
