import React, { useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAppContext } from '@/context/AppContext';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { getStatusColor, getEfficiencyColor, formatTime, getAvailableShiftHours, formatDate, getPriorityColor, getSeverityColor, getMissingPartStatusColor, getPriorityScore } from '@/lib/data';
import { WrenchIcon, ClockIcon, GaugeIcon, TruckIcon, ArrowLeftIcon, InfoIcon, PackageIcon, CalendarIcon, CarIcon, UsersIcon, XCircleIcon, CheckCircleIcon } from 'lucide-react';

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
  const { toast } = useToast();

  // Use useMemo to ensure the operator object and its assignedTrucks are always up-to-date
  const operator = useMemo(() => {
    const foundOperator = operators.find((op) => op.id === operatorId);
    if (!foundOperator) return null;

    // Map assignedTrucks to their latest state from the global trucks array
    const updatedAssignedTrucks = foundOperator.assignedTrucks.map(assignedTruck => {
      const latestTruck = trucks.find(t => t.id === assignedTruck.id);
      return latestTruck || assignedTruck; // Return latest truck state, or fallback if not found
    });

    return {
      ...foundOperator,
      assignedTrucks: updatedAssignedTrucks,
    };
  }, [operatorId, operators, trucks]); // Re-run memoization if operatorId, operators, or trucks change

  if (!operator) {
    console.log('OperatorView: Operator not found for ID:', operatorId);
    return (
      <div className="p-6 text-center text-red-500">
        <h1 className="text-3xl font-bold mb-4">Operator Not Found</h1>
        <Button onClick={() => navigate('/operators')}>Back to Operator Selection</Button>
      </div>
    );
  }

  const handleMarkDeviationComplete = (truckId: string, deviationId: string) => {
    const success = markDeviationComplete(truckId, deviationId, operator.name);
    if (success) {
      toast({
        title: "Deviation Completed",
        description: `Deviation ${deviationId} for truck ${truckId} marked complete.`,
      });
    } else {
      toast({
        title: "Action Failed",
        description: "Cannot complete deviation without an assigned operator.",
        variant: "destructive",
      });
    }
  };

  const handleMarkMissingPartComplete = (truckId: string, partId: string) => {
    markMissingPartComplete(truckId, partId, operator.name);
    toast({
      title: "Missing Part Completed",
      description: `Missing part ${partId} for truck ${truckId} marked complete.`,
    });
  };

  const handleMarkCustomerAdaptationComplete = (truckId: string) => {
    markCustomerAdaptationComplete(truckId, operator.name);
    toast({
      title: "Customer Adaptation Completed",
      description: `Customer adaptation work for truck ${truckId} marked complete.`,
    });
  };

  const handleFinishTruck = (truckId: string) => {
    markTruckComplete(truckId);
    toast({
      title: "Truck Marked Complete",
      description: `Truck ${truckId} has been moved to the Completed column.`,
    });
  };

  const handleUnassignTruck = (truckId: string) => {
    unassignOperatorFromTruck(truckId, operator.id); // Pass operator.id
    toast({
      title: "Truck Unassigned",
      description: `Truck ${truckId} has been unassigned from ${operator.name}.`,
    });
  };

  const availableHours = getAvailableShiftHours(operator);

  return (
    <div className="p-6">
      <Button variant="outline" onClick={() => navigate('/operators')} className="mb-6 flex items-center">
        <ArrowLeftIcon className="mr-2 h-4 w-4" /> Back to Operators
      </Button>

      <h1 className="text-3xl font-bold mb-6 text-gray-900">Operator: {operator.name}</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Operator Details Card */}
        <Card className="lg:col-span-1 bg-white shadow-lg rounded-lg p-6">
          <CardHeader className="p-0 pb-4">
            <CardTitle className="text-2xl font-semibold text-gray-800 flex items-center">
              <UsersIcon className="mr-3 h-6 w-6 text-primary" /> {operator.name}
            </CardTitle>
            <CardDescription className="text-sm text-gray-600">ID: {operator.id}</CardDescription>
          </CardHeader>
          <CardContent className="p-0 space-y-3 text-gray-700">
            <div className="flex items-center text-base">
              <Badge className={getStatusColor(operator.status)}>{operator.status}</Badge>
            </div>
            <div className="flex items-center text-base">
              <ClockIcon className="mr-2 h-5 w-5 text-muted-foreground" />
              <span>Shift: {formatTime(operator.shiftStartTime)} - {formatTime(operator.shiftEndTime)}</span>
            </div>
            <div className="flex items-center text-base">
              <InfoIcon className="mr-2 h-5 w-5 text-muted-foreground" />
              <span>Available Hours: <span className="font-semibold text-lg">{availableHours.toFixed(1)} hrs</span></span>
            </div>
            <div className="flex items-center text-base">
              <GaugeIcon className="mr-2 h-5 w-5 text-muted-foreground" />
              <span>Efficiency: <span className={getEfficiencyColor(operator.efficiency)}>{(operator.efficiency * 100).toFixed(0)}%</span></span>
            </div>
            <div className="mt-4">
              <h3 className="font-semibold text-lg mb-2 flex items-center">
                <WrenchIcon className="mr-2 h-5 w-5" /> Competencies:
              </h3>
              <div className="flex flex-wrap gap-2">
                {operator.competencies.map((comp, index) => (
                  <Badge key={index} variant="secondary" className="text-sm px-3 py-1">
                    {comp}
                  </Badge>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Assigned Work Queue */}
        <div className="lg:col-span-2 bg-gray-50 p-6 rounded-lg shadow-md">
          <h2 className="text-2xl font-semibold mb-4 text-gray-800 flex items-center">
            <TruckIcon className="mr-3 h-6 w-6 text-primary" /> Assigned Work Queue
            <Badge className="ml-2 bg-blue-500 text-white">{operator.assignedTrucks.length}</Badge>
          </h2>
          <ScrollArea className="h-[calc(100vh-250px)] pr-4">
            <div className="space-y-6">
              {operator.assignedTrucks.length > 0 ? (
                operator.assignedTrucks.map((truck) => {
                  const truckPriorityBreakdown = getPriorityScore(truck);
                  const truckPriorityScore = truckPriorityBreakdown.totalScore;
                  const allDeviationsCompleted = truck.deviations.every(dev => dev.completed);
                  const allMissingPartsCompleted = truck.missingParts.every(mp => mp.completed);
                  const customerAdaptationWorkExists = truck.customerAdaptationWork !== null;
                  const customerAdaptationIsCompleted = truck.customerAdaptationCompleted;
                  const canFinishTruck = allDeviationsCompleted && allMissingPartsCompleted && (!customerAdaptationWorkExists || customerAdaptationIsCompleted);

                  return (
                    <Card key={truck.id} className="bg-white shadow-md rounded-lg p-4">
                      <CardHeader className="p-0 pb-2">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-xl font-semibold">{truck.chassisNumber}</CardTitle>
                          <Badge className={getStatusColor(truck.status)}>{truck.status}</Badge>
                        </div>
                        <CardDescription className="text-sm text-gray-600">
                          Delivery: {formatDate(truck.deliveryDate)} | Priority: <Badge className={getPriorityColor(truckPriorityScore)}>{truckPriorityScore}</Badge>
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="p-0 pt-2 space-y-2 text-gray-700">
                        <p className="flex items-center text-sm">
                          <WrenchIcon className="mr-2 h-4 w-4 text-muted-foreground" />
                          Repair Type: {truck.repairType} (Est: {truck.repairTimeEstimate} hrs)
                        </p>
                        <p className="flex items-center text-sm">
                          <InfoIcon className="mr-2 h-4 w-4 text-muted-foreground" />
                          Repair Area: {truck.repairAreaNeeded}
                        </p>
                        {/* Display missing parts status and number of open deviations */}
                        <p className="flex items-center text-sm">
                          <PackageIcon className="mr-2 h-4 w-4 text-muted-foreground" />
                          Missing Parts: {truck.missingParts.length > 0 ? truck.missingParts.filter(p => p.status !== 'Available' && !p.completed).length > 0 ? `${truck.missingParts.filter(p => p.status !== 'Available' && !p.completed).length} pending` : 'All available' : 'None'}
                        </p>
                        <p className="flex items-center text-sm">
                          <WrenchIcon className="mr-2 h-4 w-4 text-muted-foreground" />
                          Deviations: {truck.deviations.filter(dev => !dev.completed).length} open
                        </p>

                        {truck.customerAdaptationWork && (
                          <div className="mt-3">
                            <h4 className="font-semibold text-sm mb-1 flex items-center">
                              <CarIcon className="mr-2 h-4 w-4" /> Customer Adaptation:
                            </h4>
                            <div className="flex items-center space-x-2">
                              <Checkbox
                                id={`customer-adaptation-${truck.id}`}
                                checked={truck.customerAdaptationCompleted}
                                onCheckedChange={() => handleMarkCustomerAdaptationComplete(truck.id)}
                                disabled={truck.customerAdaptationCompleted}
                              />
                              <Label htmlFor={`customer-adaptation-${truck.id}`} className="text-sm font-normal">
                                {truck.customerAdaptationWork}
                                {truck.customerAdaptationCompleted && (
                                  <span className="ml-2 text-green-600">(Completed by {truck.customerAdaptationCompletedBy} on {formatDate(truck.customerAdaptationCompletedAt!)})</span>
                                )}
                              </Label>
                            </div>
                          </div>
                        )}

                        {truck.deviations.length > 0 && (
                          <div className="mt-3">
                            <h4 className="font-semibold text-sm mb-1 flex items-center">
                              <WrenchIcon className="mr-2 h-4 w-4" /> Deviations:
                            </h4>
                            <ul className="space-y-2">
                              {truck.deviations.map((dev) => (
                                <li key={dev.id} className="flex items-center space-x-2">
                                  <Checkbox
                                    id={`dev-${dev.id}`}
                                    checked={dev.completed}
                                    onCheckedChange={() => handleMarkDeviationComplete(truck.id, dev.id)}
                                    disabled={dev.completed}
                                  />
                                  <Label htmlFor={`dev-${dev.id}`} className={`text-sm font-normal ${getSeverityColor(dev.severity)}`}>
                                    {dev.severity}: {dev.description}
                                    {dev.completed && <span className="ml-2 text-green-600">(Completed by {dev.completedBy} on {formatDate(dev.completedAt!)})</span>}
                                  </Label>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {truck.missingParts.length > 0 && (
                          <div className="mt-3">
                            <h4 className="font-semibold text-sm mb-1 flex items-center">
                              <PackageIcon className="mr-2 h-4 w-4" /> Missing Parts:
                            </h4>
                            <ul className="space-y-2">
                              {truck.missingParts.map((part) => (
                                <li key={part.id} className="flex items-center space-x-2">
                                  <Checkbox
                                    id={`part-${part.id}`}
                                    checked={part.completed}
                                    onCheckedChange={() => handleMarkMissingPartComplete(truck.id, part.id)}
                                    disabled={part.completed || part.status !== 'Available'}
                                  />
                                  <Label htmlFor={`part-${part.id}`} className="text-sm font-normal">
                                    {part.name} - <Badge className={getMissingPartStatusColor(part.status)}>{part.status}</Badge>
                                    {part.status !== 'Available' && (
                                      <span className="ml-2 text-xs text-gray-500">
                                        (Est. Delivery: {formatDate(part.promisedDeliveryDate)})
                                      </span>
                                    )}
                                    {part.completed && <span className="ml-2 text-green-600">(Completed by {part.completedBy} on {formatDate(part.completedAt!)})</span>}
                                  </Label>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                        <div className="flex gap-2 mt-4">
                          <Button
                            className="flex-1 bg-green-600 text-white hover:bg-green-700"
                            onClick={() => handleFinishTruck(truck.id)}
                            disabled={!canFinishTruck || truck.status === 'Completed'}
                          >
                            <CheckCircleIcon className="mr-2 h-4 w-4" /> Finish Truck
                          </Button>
                          <Button
                            variant="outline"
                            className="flex-1 text-red-600 border-red-600 hover:bg-red-50 hover:text-red-700"
                            onClick={() => handleUnassignTruck(truck.id)}
                            disabled={truck.status === 'Completed'}
                          >
                            <XCircleIcon className="mr-2 h-4 w-4" /> Unassign
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })
              ) : (
                <p className="text-muted-foreground text-center py-12">This operator has no assigned trucks.</p>
              )}
            </div>
          </ScrollArea>
        </div>
      </div>
    </div>
  );
};

export default OperatorView;
