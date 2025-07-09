import React, { useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAppContext } from '@/context/AppContext';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import {
  ArrowLeftIcon,
  WrenchIcon,
  PackageIcon,
  CheckCircleIcon,
  XCircleIcon,
  UserIcon,
  ClockIcon,
  InfoIcon,
  CalendarIcon,
  TagIcon,
  HammerIcon,
  TruckIcon as TruckIconLucide, // Renamed to avoid conflict with type Truck
} from 'lucide-react';
import { getStatusColor, formatTime, formatDate, calculateRemainingRepairTime, getPriorityScore } from '@/lib/data';
import { useToast } from '@/hooks/use-toast';
import { Operator } from '@/types';

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
  const { toast } = useToast();

  const truck = useMemo(() => trucks.find(t => t.id === truckId), [trucks, truckId]);

  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false);
  const [selectedOperatorId, setSelectedOperatorId] = useState<string | null>(null);

  const availableOperators = useMemo(() => {
    if (!truck) return [];
    return operators.filter(op =>
      op.status === 'Available' &&
      (op.competencies.includes(truck.repairType) || (truck.customerAdaptationWork && op.competencies.includes('Customer Adaptation'))) &&
      !truck.assignedOperatorIds.includes(op.id)
    );
  }, [operators, truck]);

  const assignedOperators = useMemo(() => {
    if (!truck) return [];
    return operators.filter(op => truck.assignedOperatorIds.includes(op.id));
  }, [operators, truck]);

  const handleAssignOperator = () => {
    if (truck && selectedOperatorId) {
      assignOperatorToTruck(truck.id, selectedOperatorId);
      toast({
        title: "Operator Assigned",
        description: `Truck ${truck.chassisNumber} assigned to operator ${operators.find(op => op.id === selectedOperatorId)?.name}.`,
        variant: "default",
      });
      setIsAssignDialogOpen(false);
      setSelectedOperatorId(null);
    }
  };

  const handleUnassignOperator = (operatorId: string) => {
    if (truck) {
      unassignOperatorFromTruck(truck.id, operatorId);
      toast({
        title: "Operator Unassigned",
        description: `Operator ${operators.find(op => op.id === operatorId)?.name} unassigned from truck ${truck.chassisNumber}.`,
        variant: "default",
      });
    }
  };

  const handleMarkDeviationComplete = (deviationId: string) => {
    if (truck) {
      markDeviationComplete(truck.id, deviationId, 'Current User'); // Replace with actual user
      toast({
        title: "Deviation Completed",
        description: `Deviation marked complete for truck ${truck.chassisNumber}.`,
        variant: "success",
      });
    }
  };

  const handleMarkMissingPartComplete = (partId: string) => {
    if (truck) {
      markMissingPartComplete(truck.id, partId, 'Current User'); // Replace with actual user
      toast({
        title: "Missing Part Completed",
        description: `Missing part marked complete for truck ${truck.chassisNumber}.`,
        variant: "success",
      });
    }
  };

  const handleMarkCustomerAdaptationComplete = () => {
    if (truck) {
      markCustomerAdaptationComplete(truck.id, 'Current User'); // Replace with actual user
      toast({
        title: "Customer Adaptation Completed",
        description: `Customer adaptation marked complete for truck ${truck.chassisNumber}.`,
        variant: "success",
      });
    }
  };

  const handleMarkTruckComplete = () => {
    if (truck) {
      markTruckComplete(truck.id);
      toast({
        title: "Truck Completed",
        description: `Truck ${truck.chassisNumber} marked as fully completed.`,
        variant: "success",
      });
      navigate('/trucks'); // Navigate back to trucks list
    }
  };

  if (!truck) {
    return (
      <div className="p-6 text-center text-red-500">
        <h1 className="text-2xl font-bold">Truck Not Found</h1>
        <Button onClick={() => navigate('/trucks')} className="mt-4">
          Back to Trucks
        </Button>
      </div>
    );
  }

  const remainingRepairTime = calculateRemainingRepairTime(truck);
  const priorityScore = getPriorityScore(truck);

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
              <TruckIconLucide className="mr-2 h-6 w-6 text-primary" /> Truck Overview
            </CardTitle>
            <CardDescription className="text-sm text-gray-600">
              Key details for {truck.chassisNumber}.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 pt-0 space-y-2 text-gray-700">
            <div className="flex items-center text-base">
              <Badge className={getStatusColor(truck.status)}>{truck.status}</Badge>
              {truck.projectCode && (
                <Badge variant="outline" className="ml-2 text-xs px-2 py-0.5">
                  Project: {truck.projectCode}
                </Badge>
              )}
            </div>
            <div className="flex items-center text-base">
              <TagIcon className="mr-2 h-5 w-5 text-muted-foreground" />
              <span>Model: {truck.model}</span>
            </div>
            <div className="flex items-center text-base">
              <WrenchIcon className="mr-2 h-5 w-5 text-muted-foreground" />
              <span>Repair Type: {truck.repairType}</span>
            </div>
            <div className="flex items-center text-base">
              <ClockIcon className="mr-2 h-5 w-5 text-muted-foreground" />
              <span>Est. Repair Time: <span className="font-semibold">{remainingRepairTime.toFixed(1)} hrs</span></span>
            </div>
            <div className="flex items-center text-base">
              <InfoIcon className="mr-2 h-5 w-5 text-muted-foreground" />
              <span>Priority Score: <span className="font-semibold">{priorityScore.totalScore}</span></span>
            </div>
            <div className="flex items-center text-base">
              <CalendarIcon className="mr-2 h-5 w-5 text-muted-foreground" />
              <span>Last Service: {formatDate(truck.lastServiceDate)}</span>
            </div>
            <div className="flex items-center text-base">
              <CalendarIcon className="mr-2 h-5 w-5 text-muted-foreground" />
              <span>Next Service: {formatDate(truck.nextServiceDate)}</span>
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2 bg-white shadow-lg rounded-lg">
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-xl font-semibold flex items-center">
              <UserIcon className="mr-2 h-6 w-6 text-primary" /> Assigned Operators ({assignedOperators.length})
            </CardTitle>
            <CardDescription className="text-sm text-gray-600">
              Operators currently assigned to this truck.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="space-y-3">
              {assignedOperators.length > 0 ? (
                assignedOperators.map(operator => (
                  <div key={operator.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-md border">
                    <div className="flex items-center">
                      <UserIcon className="h-5 w-5 mr-3 text-blue-600" />
                      <span className="font-medium">{operator.name}</span>
                      <Badge variant="outline" className="ml-2 text-xs">{operator.shift} Shift</Badge>
                    </div>
                    <Button variant="destructive" size="sm" onClick={() => handleUnassignOperator(operator.id)}>
                      Unassign
                    </Button>
                  </div>
                ))
              ) : (
                <p className="text-muted-foreground italic">No operators assigned.</p>
              )}
            </div>
            <Button
              onClick={() => setIsAssignDialogOpen(true)}
              className="mt-4 w-full bg-blue-600 hover:bg-blue-700 text-white"
              disabled={availableOperators.length === 0}
            >
              Assign Operator
            </Button>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6 flex-1">
        <Card className="bg-white shadow-lg rounded-lg flex flex-col">
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-xl font-semibold flex items-center">
              <HammerIcon className="mr-2 h-6 w-6 text-primary" /> Deviations ({truck.deviations.filter(d => !d.completed).length} pending)
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0 flex-1 flex flex-col">
            <ScrollArea className="flex-1 pr-4">
              <div className="space-y-3">
                {truck.deviations.length > 0 ? (
                  truck.deviations.map(deviation => (
                    <div key={deviation.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-md border">
                      <div>
                        <p className="font-medium">{deviation.description}</p>
                        <p className="text-sm text-muted-foreground">Est. Hours: {deviation.estimatedHours} | Status: {deviation.completed ? 'Completed' : 'Pending'}</p>
                        {deviation.completed && deviation.completedBy && (
                          <p className="text-xs text-muted-foreground">By: {deviation.completedBy} at {formatDate(deviation.completedAt!)}</p>
                        )}
                      </div>
                      {!deviation.completed && (
                        <Button size="sm" onClick={() => handleMarkDeviationComplete(deviation.id)}>
                          Mark Complete
                        </Button>
                      )}
                    </div>
                  ))
                ) : (
                  <p className="text-muted-foreground italic">No deviations recorded.</p>
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        <Card className="bg-white shadow-lg rounded-lg flex flex-col">
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-xl font-semibold flex items-center">
              <PackageIcon className="mr-2 h-6 w-6 text-primary" /> Missing Parts ({truck.missingParts.filter(mp => !mp.completed).length} pending)
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0 flex-1 flex flex-col">
            <ScrollArea className="flex-1 pr-4">
              <div className="space-y-3">
                {truck.missingParts.length > 0 ? (
                  truck.missingParts.map(part => (
                    <div key={part.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-md border">
                      <div>
                        <p className="font-medium">{part.name}</p>
                        <p className="text-sm text-muted-foreground">
                          Est. Hours: {part.estimatedHours} | Status: {part.status} {part.completed ? '(Completed)' : ''}
                        </p>
                        {part.completed && part.completedBy && (
                          <p className="text-xs text-muted-foreground">By: {part.completedBy} at {formatDate(part.completedAt!)}</p>
                        )}
                      </div>
                      {!part.completed && (
                        <Button size="sm" onClick={() => handleMarkMissingPartComplete(part.id)} disabled={part.status !== 'Available'}>
                          Mark Complete
                        </Button>
                      )}
                    </div>
                  ))
                ) : (
                  <p className="text-muted-foreground italic">No missing parts.</p>
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>

      {truck.customerAdaptationWork && (
        <Card className="bg-white shadow-lg rounded-lg mb-6">
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-xl font-semibold flex items-center">
              <UserIcon className="mr-2 h-6 w-6 text-primary" /> Customer Adaptation
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0 flex items-center justify-between">
            <p className="text-base text-muted-foreground">
              Status: {truck.customerAdaptationCompleted ? 'Completed' : 'Pending'}
              {truck.customerAdaptationCompleted && truck.customerAdaptationCompletedBy && (
                <span className="ml-2 text-sm">By: {truck.customerAdaptationCompletedBy} at {formatDate(truck.customerAdaptationCompletedAt!)}</span>
              )}
            </p>
            {!truck.customerAdaptationCompleted && (
              <Button onClick={handleMarkCustomerAdaptationComplete}>
                Mark Customer Adaptation Complete
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      <div className="mt-auto pt-6">
        <Button
          onClick={handleMarkTruckComplete}
          className="w-full bg-green-600 hover:bg-green-700 text-white py-3 text-lg"
          disabled={remainingRepairTime > 0}
        >
          Mark Truck Fully Completed
        </Button>
      </div>

      {/* Assign Operator Dialog */}
      <Dialog open={isAssignDialogOpen} onOpenChange={setIsAssignDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign Operator to Truck</DialogTitle>
            <DialogDescription>
              Select an available operator to assign to truck {truck.chassisNumber}.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Select onValueChange={setSelectedOperatorId} value={selectedOperatorId || ''}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select an operator" />
              </SelectTrigger>
              <SelectContent>
                {availableOperators.length > 0 ? (
                  availableOperators.map(op => (
                    <SelectItem key={op.id} value={op.id}>
                      {op.name} ({op.status}) - {op.competencies.join(', ')}
                    </SelectItem>
                  ))
                ) : (
                  <SelectItem value="no-operators" disabled>
                    No available operators with matching competencies.
                  </SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAssignDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleAssignOperator} disabled={!selectedOperatorId}>Assign</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TruckDetail;
