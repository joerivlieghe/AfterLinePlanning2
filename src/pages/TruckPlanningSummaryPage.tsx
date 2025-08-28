import React, { useMemo, useState } from 'react';
import { useAppContext } from '@/context/AppContext';
import { TruckPlanningSummary, ScheduledOperatorDetail } from '@/types';
import { format, addDays, isAfter, isBefore, startOfDay } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { getPriorityColor, getStatusColor, simulatePaintBoothSchedule, SMALL_PAINT_BOOTH_DAILY_CAPACITY_HOURS, LARGE_PAINT_BOOTH_DAILY_CAPACITY_HOURS, simulateGeneralRepairSchedule, getGeneralRepairTypesNeeded, getPriorityScore } from '@/lib/data'; // Import getPriorityScore
import { Badge } from '@/components/ui/badge';
import { AlertCircle, CheckCircle2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast'; // Import useToast
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'; // Import Tooltip components

const TruckPlanningSummaryPage: React.FC = () => {
  const { trucks, operators, assignOperatorToTruck, updateTruckStatus } = useAppContext();
  const [numDays] = useState(60);
  const [acceptedPlans, setAcceptedPlans] = useState(new Set<string>());
  const { toast } = useToast();

  // Simulate paint booth schedule for all trucks that need paint
  const { occupancyData: paintOccupancyData, truckCompletionDates: paintTruckCompletionDates } = useMemo(() => {
    const allPaintTrucks = (trucks || []).filter(
      (truck) =>
        (truck.repairType === 'Paint' || truck.customerAdaptationType === 'Paint') &&
        truck.status !== 'Completed' &&
        truck.status !== 'Missing Parts Not Available' &&
        truck.status !== 'Not Ready'
    );
    return simulatePaintBoothSchedule(allPaintTrucks, numDays, {
      small: SMALL_PAINT_BOOTH_DAILY_CAPACITY_HOURS,
      large: LARGE_PAINT_BOOTH_DAILY_CAPACITY_HOURS,
    });
  }, [trucks, numDays]);

  // Prepare earliest start dates for general repair for combined trucks (after paint completion)
  const generalRepairEarliestStartDates = useMemo(() => {
    const map = new Map<string, Date>();
    (trucks || []).filter(
      (truck) =>
        (truck.repairType === 'Paint' || truck.customerAdaptationType === 'Paint') &&
        ((truck.deviationTimeEstimate || 0) > 0 || (truck.missingPartsTimeEstimate || 0) > 0) // Has general repair work
    ).forEach(truck => {
      const paintCompletionDate = paintTruckCompletionDates.get(truck.id);
      if (paintCompletionDate) {
        // General repair can start the day after paint completion
        map.set(truck.id, addDays(paintCompletionDate, 1));
      }
    });
    return map;
  }, [trucks, paintTruckCompletionDates]);

  // Simulate general repair schedule for all trucks that need general repair
  const { occupancyData: generalRepairOccupancyData, truckCompletionDates: generalRepairTruckCompletionDates } = useMemo(() => {
    const allGeneralRepairTrucks = (trucks || []).filter(
      (truck) =>
        ((truck.deviationTimeEstimate || 0) > 0 || (truck.missingPartsTimeEstimate || 0) > 0) && // Has general repair work
        truck.status !== 'Completed' &&
        truck.status !== 'Missing Parts Not Available' &&
        truck.status !== 'Not Ready'
    );
    return simulateGeneralRepairSchedule(allGeneralRepairTrucks, operators, numDays, generalRepairEarliestStartDates);
  }, [trucks, operators, numDays, generalRepairEarliestStartDates]);


  const combinedTruckPlanningSummary = useMemo(() => {
    const summaryMap = new Map<string, TruckPlanningSummary>();

    // Initialize with all trucks that are not completed or not ready
    [...(trucks || [])].filter(truck => 
      truck.status !== 'Completed' &&
      truck.status !== 'Missing Parts Not Available' &&
      truck.status !== 'Not Ready'
    ).forEach(truck => {
      summaryMap.set(truck.id, {
        truck: truck,
        paintSchedule: [],
        generalRepairSchedule: [],
        estimatedPaintCompletionDate: null,
        estimatedGeneralRepairCompletionDate: null,
        overallEstimatedCompletionDate: null,
        isProjectedOverdue: false,
        isPlanningAccepted: acceptedPlans.has(truck.id),
        priorityScore: 0, // Initialize
        priorityReasons: [], // Initialize
      });
    });

    // Populate paint schedule
    (paintOccupancyData || []).forEach(dayEntry => {
      [...(dayEntry.smallBoothScheduledTrucksDetails || []), ...(dayEntry.largeBoothScheduledTrucksDetails || [])].forEach(detail => {
        const entry = summaryMap.get(detail.truckId);
        if (entry) {
          entry.paintSchedule.push({
            date: dayEntry.date,
            boothType: detail.paintBoothType!,
            hours: detail.hoursScheduled,
          });
        }
      });
    });

    // Populate general repair schedule
    (generalRepairOccupancyData || []).forEach(dayEntry => {
      // Ensure dayEntry.operatorWorkload is an object before calling Object.values
      if (dayEntry.operatorWorkload && typeof dayEntry.operatorWorkload === 'object') {
        Object.values(dayEntry.operatorWorkload).forEach(operatorDetail => {
          // Ensure operatorDetail is an object and has expected properties
          if (operatorDetail && typeof operatorDetail === 'object' && 'operatorName' in operatorDetail && 'trucks' in operatorDetail) {
            const typedOperatorDetail = operatorDetail as ScheduledOperatorDetail; // Cast for type safety
            let trucksToIterate: any[] = [];
            if (Array.isArray(typedOperatorDetail.trucks)) {
              trucksToIterate = typedOperatorDetail.trucks;
            }
            
            trucksToIterate.forEach(detail => {
              const entry = summaryMap.get(detail.truckId);
              if (entry) {
                entry.generalRepairSchedule.push({
                  date: dayEntry.date,
                  operatorName: typedOperatorDetail.operatorName,
                  hours: detail.hours,
                });
              }
            });
          }
        });
      }
    });

    // Calculate estimated completion dates and overdue status, and priority score
    summaryMap.forEach(summary => {
      const needsPaint = (summary.truck.repairType === 'Paint' || summary.truck.customerAdaptationType === 'Paint');
      const needsGeneralRepair = (summary.truck.deviationTimeEstimate || 0) > 0 || (summary.truck.missingPartsTimeEstimate || 0) > 0;

      summary.estimatedPaintCompletionDate = needsPaint ? paintTruckCompletionDates.get(summary.truck.id) || null : null;
      summary.estimatedGeneralRepairCompletionDate = needsGeneralRepair ? generalRepairTruckCompletionDates.get(summary.truck.id) || null : null;

      let maxCompletionDate: Date | null = null;

      if (needsPaint && needsGeneralRepair) {
        maxCompletionDate = summary.estimatedGeneralRepairCompletionDate;
      } else if (needsPaint) {
        maxCompletionDate = summary.estimatedPaintCompletionDate;
      } else if (needsGeneralRepair) {
        maxCompletionDate = summary.estimatedGeneralRepairCompletionDate;
      }
      
      summary.overallEstimatedCompletionDate = maxCompletionDate;

      summary.isProjectedOverdue = summary.overallEstimatedCompletionDate
        ? isAfter(summary.overallEstimatedCompletionDate, summary.truck.deliveryDate)
        : false;

      // Calculate priority score
      const calculatedDueDate = summary.overallEstimatedCompletionDate || summary.truck.deliveryDate;
      const { totalScore, reasons } = getPriorityScore(summary.truck, calculatedDueDate);
      summary.priorityScore = totalScore;
      summary.priorityReasons = reasons;
    });

    return Array.from(summaryMap.values()).sort((a, b) => {
      // Primary sort: Priority Score (highest first)
      if (a.priorityScore !== b.priorityScore) {
        return b.priorityScore - a.priorityScore;
      }

      // Secondary sort: overall estimated completion date (earliest first)
      if (a.overallEstimatedCompletionDate && b.overallEstimatedCompletionDate) {
        const completionDiff = a.overallEstimatedCompletionDate.getTime() - b.overallEstimatedCompletionDate.getTime();
        if (completionDiff !== 0) return completionDiff;
      } else if (a.overallEstimatedCompletionDate) {
        return -1;
      } else if (b.overallEstimatedCompletionDate) {
        return 1;
      }

      // Tertiary sort: delivery date (earliest first)
      const deliveryDiff = a.truck.deliveryDate.getTime() - b.truck.deliveryDate.getTime();
      if (deliveryDiff !== 0) return deliveryDiff;

      // Quaternary sort: customer priority (Critical > High > Medium > Low)
      const priorityOrder = { 'Critical': 4, 'High': 3, 'Medium': 2, 'Low': 1 };
      return (priorityOrder[b.truck.customerPriority] || 0) - (priorityOrder[a.truck.customerPriority] || 0);
    });
  }, [trucks, operators, numDays, acceptedPlans, paintOccupancyData, generalRepairOccupancyData, paintTruckCompletionDates, generalRepairTruckCompletionDates]);

  const handleAcceptAssign = (truckId: string) => {
    const truckToAssign = trucks.find(t => t.id === truckId);
    if (!truckToAssign) {
      toast({
        title: "Error",
        description: "Truck not found.",
        variant: "destructive",
      });
      return;
    }

    const needsPaintWork = (truckToAssign.repairType === 'Paint' || truckToAssign.customerAdaptationType === 'Paint');
    const needsGeneralRepairWork = (truckToAssign.deviationTimeEstimate || 0) > 0 || (truckToAssign.missingPartsTimeEstimate || 0) > 0;

    const operatorsToAssign: string[] = [];
    let paintOperatorFound = false;
    let generalRepairOperatorFound = false;

    // Try to find a paint operator if needed
    if (needsPaintWork) {
      const paintOperators = operators.filter(op =>
        op.status === 'Available' &&
        (op.competencies.includes('Paint') || op.competencies.includes('Customer Adaptation - Paint'))
      ).sort((a, b) => b.efficiency - a.efficiency);

      if (paintOperators.length > 0) {
        operatorsToAssign.push(paintOperators[0].id);
        paintOperatorFound = true;
      }
    }

    // Try to find a general repair operator if needed
    if (needsGeneralRepairWork) {
      const neededCompetencies = getGeneralRepairTypesNeeded(truckToAssign);
      const generalRepairOperators = operators.filter(op =>
        op.status === 'Available' &&
        !operatorsToAssign.includes(op.id) && // Ensure distinct operator
        neededCompetencies.some(comp => op.competencies.includes(comp))
      ).sort((a, b) => b.efficiency - a.efficiency);

      if (generalRepairOperators.length > 0) {
        operatorsToAssign.push(generalRepairOperators[0].id);
        generalRepairOperatorFound = true;
      }
    }

    // Check if all required operators were found
    if ((needsPaintWork && !paintOperatorFound) || (needsGeneralRepairWork && !generalRepairOperatorFound)) {
      toast({
        title: "Assignment Failed",
        description: "Could not find all required available and competent operators for this truck.",
        variant: "destructive",
      });
      return;
    }

    // Assign all found operators to the truck
    operatorsToAssign.forEach(opId => {
      assignOperatorToTruck(truckId, opId);
    });

    setAcceptedPlans(prev => {
      const newSet = new Set(prev);
      newSet.add(truckId);
      return newSet;
    });
    toast({
      title: "Planning Accepted & Assigned",
      description: `Truck ${truckToAssign.chassisNumber} assigned to ${operatorsToAssign.length} operator(s) and planning accepted.`,
    });
  };

  return (
    <div className="container mx-auto p-6 space-y-8">
      <h1 className="text-4xl font-bold text-gray-900 mb-6">Truck Planning Summary</h1>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle>Detailed Truck Planning Overview</CardTitle>
          <p className="text-sm text-muted-foreground">
            Proposed schedules for each truck, considering paint booth and general repair availability.
          </p>
        </CardHeader>
        <CardContent>
          {combinedTruckPlanningSummary.length === 0 ? (
            <p className="text-center text-muted-foreground">No trucks to display in the planning summary.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[120px]">Chassis Number</TableHead>
                    <TableHead className="min-w-[120px]">Delivery Date</TableHead>
                    <TableHead className="min-w-[120px]">Est. Completion</TableHead>
                    <TableHead className="min-w-[100px]">Status</TableHead>
                    <TableHead className="min-w-[100px]">Priority Score</TableHead> {/* New column */}
                    <TableHead className="min-w-[250px]">Paint Schedule</TableHead>
                    <TableHead className="min-w-[250px]">General Repair Schedule</TableHead>
                    <TableHead className="min-w-[120px]">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {combinedTruckPlanningSummary.map((summary) => (
                    <TableRow key={summary.truck.id}>
                      <TableCell className="font-medium">
                        <Link to={`/trucks/${summary.truck.id}`} className="text-blue-600 hover:underline">
                          {summary.truck.chassisNumber}
                        </Link>
                      </TableCell>
                      <TableCell>{format(summary.truck.deliveryDate, 'MMM dd, yyyy')}</TableCell>
                      <TableCell>
                        {summary.overallEstimatedCompletionDate ? format(summary.overallEstimatedCompletionDate, 'MMM dd, yyyy') : 'N/A'}
                      </TableCell>
                      <TableCell>
                        {summary.isProjectedOverdue ? (
                          <Badge variant="destructive" className="flex items-center">
                            <AlertCircle className="h-3 w-3 mr-1" /> Overdue
                          </Badge>
                        ) : (
                          <Badge className="bg-green-500 text-white flex items-center">
                            <CheckCircle2 className="h-3 w-3 mr-1" /> On Track
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Badge className={getPriorityColor(summary.priorityScore)}>
                                {summary.priorityScore}
                              </Badge>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p className="font-semibold">Priority Reasons:</p>
                              <ul className="list-disc list-inside text-xs">
                                {summary.priorityReasons.map((reason, idx) => (
                                  <li key={idx}>{reason}</li>
                                ))}
                              </ul>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </TableCell>
                      <TableCell>
                        {summary.paintSchedule.length > 0 ? (
                          <ul className="list-disc list-inside text-xs space-y-1">
                            {summary.paintSchedule.map((item, idx) => (
                              <li key={idx}>
                                {format(new Date(item.date), 'MMM dd')}: {item.hours.toFixed(1)}h ({item.boothType})
                              </li>
                            ))}
                            {summary.estimatedPaintCompletionDate && (
                              <li className="font-semibold mt-1">Est. Paint Done: {format(summary.estimatedPaintCompletionDate, 'MMM dd')}</li>
                            )}
                          </ul>
                        ) : (
                          <span className="text-muted-foreground text-xs">N/A (No paint work needed)</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {summary.generalRepairSchedule.length > 0 ? (
                          <ul className="list-disc list-inside text-xs space-y-1">
                            {summary.generalRepairSchedule.map((item, idx) => (
                              <li key={idx}>
                                {format(new Date(item.date), 'MMM dd')}: {item.hours.toFixed(1)}h ({item.operatorName})
                              </li>
                            ))}
                            {summary.estimatedGeneralRepairCompletionDate && (
                              <li className="font-semibold mt-1">Est. Gen. Repair Done: {format(summary.estimatedGeneralRepairCompletionDate, 'MMM dd')}</li>
                            )}
                          </ul>
                        ) : (
                          <span className="text-muted-foreground text-xs">N/A (No general repair work needed)</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant={summary.isPlanningAccepted ? "secondary" : "default"}
                          size="sm"
                          onClick={() => handleAcceptAssign(summary.truck.id)}
                          disabled={summary.isPlanningAccepted || summary.truck.assignedOperatorIds.length > 0}
                        >
                          {summary.isPlanningAccepted || summary.truck.assignedOperatorIds.length > 0 ? 'Accepted/Assigned' : 'Accept/Assign'}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default TruckPlanningSummaryPage;
