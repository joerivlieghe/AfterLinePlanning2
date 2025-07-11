import React, { useMemo, useState } from 'react';
import { useAppContext } from '@/context/AppContext';
import { TruckPlanningSummary } from '@/types';
import { format, addDays, isAfter, isBefore, startOfDay } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { getPriorityColor, getStatusColor, simulatePaintBoothSchedule, SMALL_PAINT_BOOTH_DAILY_CAPACITY_HOURS, LARGE_PAINT_BOOTH_DAILY_CAPACITY_HOURS, simulateGeneralRepairSchedule } from '@/lib/data';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, CheckCircle2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';

const TruckPlanningSummaryPage: React.FC = () => {
  const { trucks, operators } = useAppContext();
  const [numDays] = useState(60); // Simulate for a longer period to ensure completion dates are found
  const [acceptedPlans, setAcceptedPlans] = useState<Set<string>>(new Set());

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
      });
    });

    // Populate paint schedule
    paintOccupancyData.forEach(dayEntry => {
      [...dayEntry.smallBoothScheduledTrucksDetails, ...dayEntry.largeBoothScheduledTrucksDetails].forEach(detail => {
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
    generalRepairOccupancyData.forEach(dayEntry => {
      dayEntry.scheduledTrucksDetails.forEach(detail => {
        const entry = summaryMap.get(detail.truckId);
        if (entry) {
          entry.generalRepairSchedule.push({
            date: dayEntry.date,
            operatorName: detail.operatorName!,
            hours: detail.hoursScheduled,
          });
        }
      });
    });

    // Calculate estimated completion dates and overdue status
    summaryMap.forEach(summary => {
      const needsPaint = (summary.truck.repairType === 'Paint' || summary.truck.customerAdaptationType === 'Paint');
      const needsGeneralRepair = (summary.truck.deviationTimeEstimate || 0) > 0 || (summary.truck.missingPartsTimeEstimate || 0) > 0;

      summary.estimatedPaintCompletionDate = needsPaint ? paintTruckCompletionDates.get(summary.truck.id) || null : null;
      summary.estimatedGeneralRepairCompletionDate = needsGeneralRepair ? generalRepairTruckCompletionDates.get(summary.truck.id) || null : null;

      let maxCompletionDate: Date | null = null;

      if (needsPaint && needsGeneralRepair) {
        // For trucks needing both, overall completion is the later of the two,
        // which is already handled by the sequential simulation for general repair.
        maxCompletionDate = summary.estimatedGeneralRepairCompletionDate; // General repair starts after paint
      } else if (needsPaint) {
        maxCompletionDate = summary.estimatedPaintCompletionDate;
      } else if (needsGeneralRepair) {
        maxCompletionDate = summary.estimatedGeneralRepairCompletionDate;
      }
      
      summary.overallEstimatedCompletionDate = maxCompletionDate;

      summary.isProjectedOverdue = summary.overallEstimatedCompletionDate
        ? isAfter(summary.overallEstimatedCompletionDate, summary.truck.deliveryDate)
        : false; // If no completion date, assume not overdue yet or not scheduled
    });

    return Array.from(summaryMap.values()).sort((a, b) => {
      // Sort by overall estimated completion date, then delivery date, then priority
      if (a.overallEstimatedCompletionDate && b.overallEstimatedCompletionDate) {
        const completionDiff = a.overallEstimatedCompletionDate.getTime() - b.overallEstimatedCompletionDate.getTime();
        if (completionDiff !== 0) return completionDiff;
      } else if (a.overallEstimatedCompletionDate) {
        return -1;
      } else if (b.overallEstimatedCompletionDate) {
        return 1;
      }

      const deliveryDiff = a.truck.deliveryDate.getTime() - b.truck.deliveryDate.getTime();
      if (deliveryDiff !== 0) return deliveryDiff;

      const priorityOrder = { 'Critical': 4, 'High': 3, 'Medium': 2, 'Low': 1 };
      return (priorityOrder[b.truck.customerPriority] || 0) - (priorityOrder[a.truck.customerPriority] || 0);
    });
  }, [trucks, operators, numDays, acceptedPlans, paintOccupancyData, generalRepairOccupancyData, paintTruckCompletionDates, generalRepairTruckCompletionDates]);

  const handleAcceptAssign = (truckId: string) => {
    setAcceptedPlans(prev => {
      const newSet = new Set(prev);
      if (!newSet.has(truckId)) {
        newSet.add(truckId);
        console.log(`Planning for truck ${truckId} accepted.`);
      }
      return newSet;
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
                        {summary.paintSchedule.length > 0 ? (
                          <ul className="list-disc list-inside text-xs space-y-1">
                            {summary.paintSchedule.map((item, idx) => (
                              <li key={idx}>
                                {format(new Date(item.date + ' ' + new Date().getFullYear()), 'MMM dd')}: {item.hours.toFixed(1)}h ({item.boothType})
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
                                {format(new Date(item.date + ' ' + new Date().getFullYear()), 'MMM dd')}: {item.hours.toFixed(1)}h ({item.operatorName})
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
                          disabled={summary.isPlanningAccepted}
                        >
                          {summary.isPlanningAccepted ? 'Accepted' : 'Accept/Assign'}
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
