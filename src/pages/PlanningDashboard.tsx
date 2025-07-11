import React, { useMemo, useState } from 'react';
import { useAppContext } from '@/context/AppContext';
import { Truck, Operator, RepairType, TruckPlanningSummary } from '@/types';
import { format, addDays, isAfter, isBefore, startOfDay, endOfDay, isPast } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { getPriorityColor, getStatusColor, simulatePaintBoothSchedule, TOTAL_PAINT_BOOTH_DAILY_CAPACITY_HOURS, SMALL_PAINT_BOOTH_DAILY_CAPACITY_HOURS, LARGE_PAINT_BOOTH_DAILY_CAPACITY_HOURS, simulateGeneralRepairSchedule, GENERAL_REPAIR_DAILY_CAPACITY_HOURS_PER_OPERATOR } from '@/lib/data';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine } from 'recharts';
import { ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, CheckCircle2, TruckIcon, BarChart2Icon, UsersIcon, PaintbrushIcon } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';

const PlanningDashboard: React.FC = () => {
  const { trucks, operators } = useAppContext();
  const [numDays, setNumDays] = useState(30); // Show occupancy for the next 30 days

  // Separate trucks into paint-only and general repair only for initial simulation
  const paintOnlyTrucks = useMemo(() => {
    return (trucks || []).filter(
      (truck) =>
        (truck.repairType === 'Paint' || truck.customerAdaptationType === 'Paint') &&
        !(truck.deviationTimeEstimate || 0) && // No general repair deviations
        !(truck.missingPartsTimeEstimate || 0) && // No general repair missing parts
        truck.status !== 'Completed' &&
        truck.status !== 'Missing Parts Not Available' &&
        truck.status !== 'Not Ready'
    );
  }, [trucks]);

  const generalRepairOnlyTrucks = useMemo(() => {
    return (trucks || []).filter(
      (truck) =>
        (truck.repairType !== 'Paint' && truck.customerAdaptationType !== 'Paint') &&
        truck.status !== 'Completed' &&
        truck.status !== 'Missing Parts Not Available' &&
        truck.status !== 'Not Ready'
    );
  }, [trucks]);

  const combinedRepairTrucks = useMemo(() => {
    return (trucks || []).filter(
      (truck) =>
        (truck.repairType === 'Paint' || truck.customerAdaptationType === 'Paint') &&
        ((truck.deviationTimeEstimate || 0) > 0 || (truck.missingPartsTimeEstimate || 0) > 0) && // Has general repair work
        truck.status !== 'Completed' &&
        truck.status !== 'Missing Parts Not Available' &&
        truck.status !== 'Not Ready'
    );
  }, [trucks]);

  // Simulate paint booth schedule for all trucks that need paint (paint-only + combined)
  const { occupancyData: paintOccupancyData, truckCompletionDates: paintTruckCompletionDates } = useMemo(() => {
    const allPaintTrucks = [...paintOnlyTrucks, ...combinedRepairTrucks];
    return simulatePaintBoothSchedule(allPaintTrucks, numDays, {
      small: SMALL_PAINT_BOOTH_DAILY_CAPACITY_HOURS,
      large: LARGE_PAINT_BOOTH_DAILY_CAPACITY_HOURS,
    });
  }, [paintOnlyTrucks, combinedRepairTrucks, numDays]);

  // Prepare earliest start dates for general repair for combined trucks (after paint completion)
  const generalRepairEarliestStartDates = useMemo(() => {
    const map = new Map<string, Date>();
    combinedRepairTrucks.forEach(truck => {
      const paintCompletionDate = paintTruckCompletionDates.get(truck.id);
      if (paintCompletionDate) {
        // General repair can start the day after paint completion
        map.set(truck.id, addDays(paintCompletionDate, 1));
      }
    });
    return map;
  }, [combinedRepairTrucks, paintTruckCompletionDates]);

  // Simulate general repair schedule for all trucks that need general repair (general-only + combined)
  const { occupancyData: generalRepairOccupancyData, truckCompletionDates: generalRepairTruckCompletionDates } = useMemo(() => {
    const allGeneralRepairTrucks = [...generalRepairOnlyTrucks, ...combinedRepairTrucks];
    return simulateGeneralRepairSchedule(allGeneralRepairTrucks, operators, numDays, generalRepairEarliestStartDates);
  }, [generalRepairOnlyTrucks, combinedRepairTrucks, operators, numDays, generalRepairEarliestStartDates]);

  const paintChartConfig = {
    smallBoothPaintHours: {
      label: 'Small Booth Paint',
      color: 'hsl(var(--chart-1))',
    },
    smallBoothCAPaintHours: {
      label: 'Small Booth CA Paint',
      color: 'hsl(var(--chart-2))',
    },
    largeBoothPaintHours: {
      label: 'Large Booth Paint',
      color: 'hsl(var(--chart-3))',
    },
    largeBoothCAPaintHours: {
      label: 'Large Booth CA Paint',
      color: 'hsl(var(--chart-4))',
    },
    capacity: {
      label: 'Total Daily Capacity',
      color: 'hsl(var(--chart-5))',
    },
    smallCapacity: {
      label: 'Small Booth Capacity',
      color: 'hsl(var(--chart-6))',
    },
    largeCapacity: {
      label: 'Large Booth Capacity',
      color: 'hsl(var(--chart-7))',
    },
  } satisfies ChartConfig;

  const operatorChartConfig = {
    scheduledHours: {
      label: 'Scheduled Hours',
      color: 'hsl(var(--chart-1))',
    },
    availableCapacity: {
      label: 'Available Capacity',
      color: 'hsl(var(--chart-2))',
    },
  } satisfies ChartConfig;

  const totalPaintBoothTrucks = paintOnlyTrucks.length + combinedRepairTrucks.length;
  const totalGeneralRepairTrucks = generalRepairOnlyTrucks.length + combinedRepairTrucks.length;

  const paintOverdueTrucks = [...paintOnlyTrucks, ...combinedRepairTrucks].filter(truck => {
    const estimatedCompletionDate = paintTruckCompletionDates.get(truck.id);
    return estimatedCompletionDate && isAfter(estimatedCompletionDate, truck.deliveryDate);
  }).length;

  const generalRepairOverdueTrucks = [...generalRepairOnlyTrucks, ...combinedRepairTrucks].filter(truck => {
    const estimatedCompletionDate = generalRepairTruckCompletionDates.get(truck.id);
    return estimatedCompletionDate && isAfter(estimatedCompletionDate, truck.deliveryDate);
  }).length;

  const averagePaintOccupancyHours = paintOccupancyData.length > 0
    ? (paintOccupancyData.reduce((sum, d) => sum + d.totalScheduledHours, 0) / paintOccupancyData.length).toFixed(1)
    : 0;

  const averageGeneralRepairOccupancyHours = generalRepairOccupancyData.length > 0
    ? (generalRepairOccupancyData.reduce((sum, d) => sum + d.totalScheduledHours, 0) / generalRepairOccupancyData.length).toFixed(1)
    : 0;

  const totalOperatorsCapacity = operators.length * GENERAL_REPAIR_DAILY_CAPACITY_HOURS_PER_OPERATOR;

  return (
    <div className="container mx-auto p-6 space-y-8">
      <h1 className="text-4xl font-bold text-gray-900 mb-6">Production Planning Dashboard</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card className="shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Paint Trucks</CardTitle>
            <PaintbrushIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalPaintBoothTrucks}</div>
            <p className="text-xs text-muted-foreground">
              Trucks requiring paint work
            </p>
          </CardContent>
        </Card>
        <Card className="shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Paint Projected Overdue</CardTitle>
            <AlertCircle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{paintOverdueTrucks}</div>
            <p className="text-xs text-muted-foreground">
              Paint trucks estimated to miss delivery date
            </p>
          </CardContent>
        </Card>
        <Card className="shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total General Repair Trucks</CardTitle>
            <TruckIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalGeneralRepairTrucks}</div>
            <p className="text-xs text-muted-foreground">
              Trucks requiring general repair
            </p>
          </CardContent>
        </Card>
        <Card className="shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">General Repair Projected Overdue</CardTitle>
            <AlertCircle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{generalRepairOverdueTrucks}</div>
            <p className="text-xs text-muted-foreground">
              General repair trucks estimated to miss delivery date
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Paint Booth Occupancy Section */}
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle>Paint Booth Occupancy Over Time</CardTitle>
          <p className="text-sm text-muted-foreground">Projected daily scheduled hours vs. capacity for paint booths.</p>
        </CardHeader>
        <CardContent>
          <ChartContainer config={paintChartConfig} className="min-h-[300px] w-full">
            <BarChart accessibilityLayer data={paintOccupancyData} barCategoryGap="20%">
              <CartesianGrid vertical={true} strokeDasharray="3 3" />
              <XAxis
                dataKey="date"
                tickLine={false}
                tickMargin={10}
                axisLine={false}
                tickFormatter={(value) => format(new Date(value + ' ' + new Date().getFullYear()), 'MMM dd')}
              />
              <YAxis
                tickLine={false}
                tickMargin={10}
                axisLine={false}
                domain={[0, Math.max(SMALL_PAINT_BOOTH_DAILY_CAPACITY_HOURS, LARGE_PAINT_BOOTH_DAILY_CAPACITY_HOURS) + 5]}
              />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Legend layout="horizontal" verticalAlign="top" align="center" />
              <ReferenceLine y={SMALL_PAINT_BOOTH_DAILY_CAPACITY_HOURS} stroke="var(--color-smallCapacity)" strokeDasharray="8 8" label={{ value: `Small Booth Capacity (${SMALL_PAINT_BOOTH_DAILY_CAPACITY_HOURS}h)`, position: 'top', fill: 'var(--color-smallCapacity)', fontSize: 12, offset: 20 }} />
              <ReferenceLine y={LARGE_PAINT_BOOTH_DAILY_CAPACITY_HOURS} stroke="var(--color-largeCapacity)" strokeDasharray="8 8" label={{ value: `Large Booth Capacity (${LARGE_PAINT_BOOTH_DAILY_CAPACITY_HOURS}h)`, position: 'top', fill: 'var(--color-largeCapacity)', fontSize: 12, offset: 40 }} />

              <Bar dataKey="smallBoothPaintHours" stackId="smallBooth" fill="var(--color-smallBoothPaintHours)" radius={[4, 4, 0, 0]} />
              <Bar dataKey="smallBoothCAPaintHours" stackId="smallBooth" fill="var(--color-smallBoothCAPaintHours)" radius={[0, 0, 4, 4]} />

              <Bar dataKey="largeBoothPaintHours" stackId="largeBooth" fill="var(--color-largeBoothPaintHours)" radius={[4, 4, 0, 0]} />
              <Bar dataKey="largeBoothCAPaintHours" stackId="largeBooth" fill="var(--color-largeBoothCAPaintHours)" radius={[0, 0, 4, 4]} />
            </BarChart>
          </ChartContainer>
        </CardContent>
      </Card>

      {/* Operator Availability Section */}
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle>Operator Availability & Workload</CardTitle>
          <p className="text-sm text-muted-foreground">Projected daily scheduled hours vs. total available operator hours.</p>
        </CardHeader>
        <CardContent>
          <ChartContainer config={operatorChartConfig} className="min-h-[300px] w-full">
            <BarChart accessibilityLayer data={generalRepairOccupancyData} barCategoryGap="20%">
              <CartesianGrid vertical={true} strokeDasharray="3 3" />
              <XAxis
                dataKey="date"
                tickLine={false}
                tickMargin={10}
                axisLine={false}
                tickFormatter={(value) => format(new Date(value + ' ' + new Date().getFullYear()), 'MMM dd')}
              />
              <YAxis
                tickLine={false}
                tickMargin={10}
                axisLine={false}
                domain={[0, totalOperatorsCapacity + 10]} // Adjust Y-axis based on total operator capacity
              />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Legend layout="horizontal" verticalAlign="top" align="center" />
              <ReferenceLine y={totalOperatorsCapacity} stroke="var(--color-availableCapacity)" strokeDasharray="8 8" label={{ value: `Total Operator Capacity (${totalOperatorsCapacity}h)`, position: 'top', fill: 'var(--color-availableCapacity)', fontSize: 12, offset: 20 }} />

              <Bar dataKey="totalScheduledHours" fill="var(--color-scheduledHours)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ChartContainer>
        </CardContent>
      </Card>

      {/* Daily Paint Booth Schedule Table */}
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle>Daily Paint Booth Schedule</CardTitle>
          <p className="text-sm text-muted-foreground">
            Trucks are assigned to paint booths based on delivery date and customer priority.
          </p>
        </CardHeader>
        <CardContent>
          {paintOccupancyData.length === 0 ? (
            <p className="text-center text-muted-foreground">No paint booth work scheduled for the next {numDays} days.</p>
          ) : (
            <div className="space-y-8">
              {paintOccupancyData.map((dayEntry) => (
                <div key={dayEntry.date} className="border rounded-lg p-4 bg-gray-50">
                  <h3 className="text-lg font-semibold mb-4">
                    {dayEntry.date} (Scheduled: {dayEntry.totalScheduledHours.toFixed(1)}h / Capacity: {TOTAL_PAINT_BOOTH_DAILY_CAPACITY_HOURS}h)
                    {dayEntry.capacityProblem && (
                      <Badge variant="destructive" className="ml-2">Capacity Exceeded</Badge>
                    )}
                  </h3>

                  <div className="mb-6">
                    <h4 className="text-md font-semibold mb-2 text-blue-700">Small Paint Booth ({dayEntry.smallBoothScheduledHours.toFixed(1)}h / {SMALL_PAINT_BOOTH_DAILY_CAPACITY_HOURS}h)</h4>
                    {dayEntry.smallBoothScheduledTrucksDetails.length > 0 ? (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Chassis Number</TableHead>
                            <TableHead>Repair Type</TableHead>
                            <TableHead>Scheduled Hours</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {dayEntry.smallBoothScheduledTrucksDetails.map((detail, index) => (
                            <TableRow key={index}>
                              <TableCell className="font-medium">
                                <Link to={`/trucks/${detail.truckId}`} className="text-blue-600 hover:underline">
                                  {detail.chassisNumber}
                                </Link>
                              </TableCell>
                              <TableCell>{detail.repairType === 'Paint' ? 'Paint' : `CA - ${detail.repairType.split(' - ')[1]}`}</TableCell>
                              <TableCell>{detail.hoursScheduled.toFixed(1)}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    ) : (
                      <p className="text-muted-foreground text-sm">No trucks scheduled for the small booth this day.</p>
                    )}
                  </div>

                  <div>
                    <h4 className="text-md font-semibold mb-2 text-orange-700">Large Paint Booth ({dayEntry.largeBoothScheduledHours.toFixed(1)}h / {LARGE_PAINT_BOOTH_DAILY_CAPACITY_HOURS}h)</h4>
                    {dayEntry.largeBoothScheduledTrucksDetails.length > 0 ? (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Chassis Number</TableHead>
                            <TableHead>Repair Type</TableHead>
                            <TableHead>Scheduled Hours</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {dayEntry.largeBoothScheduledTrucksDetails.map((detail, index) => (
                            <TableRow key={index}>
                              <TableCell className="font-medium">
                                <Link to={`/trucks/${detail.truckId}`} className="text-blue-600 hover:underline">
                                  {detail.chassisNumber}
                                </Link>
                              </TableCell>
                              <TableCell>{detail.repairType === 'Paint' ? 'Paint' : `CA - ${detail.repairType.split(' - ')[1]}`}</TableCell>
                              <TableCell>{detail.hoursScheduled.toFixed(1)}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    ) : (
                      <p className="text-muted-foreground text-sm">No trucks scheduled for the large booth this day.</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Daily General Repair Schedule Table */}
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle>Daily General Repair Schedule</CardTitle>
          <p className="text-sm text-muted-foreground">
            Trucks are assigned to operators based on delivery date, customer priority, and operator competencies/availability.
          </p>
        </CardHeader>
        <CardContent>
          {generalRepairOccupancyData.length === 0 ? (
            <p className="text-center text-muted-foreground">No general repair work scheduled for the next {numDays} days.</p>
          ) : (
            <div className="space-y-8">
              {generalRepairOccupancyData.map((dayEntry) => (
                <div key={dayEntry.date} className="border rounded-lg p-4 bg-gray-50">
                  <h3 className="text-lg font-semibold mb-4">
                    {dayEntry.date} (Scheduled: {dayEntry.totalScheduledHours.toFixed(1)}h / Available Capacity: {dayEntry.availableCapacity.toFixed(1)}h)
                    {dayEntry.capacityProblem && (
                      <Badge variant="destructive" className="ml-2">Capacity Exceeded</Badge>
                    )}
                  </h3>

                  {Object.keys(dayEntry.operatorWorkload).length > 0 ? (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Operator</TableHead>
                          <TableHead>Scheduled Hours</TableHead>
                          <TableHead>Assigned Trucks</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {Object.values(dayEntry.operatorWorkload).map((opWork, index) => (
                          <TableRow key={index}>
                            <TableCell className="font-medium">{opWork.operatorName}</TableCell>
                            <TableCell>{opWork.hoursScheduled.toFixed(1)}</TableCell>
                            <TableCell>
                              <ul className="list-disc list-inside">
                                {opWork.trucks.map((truckDetail, tIndex) => (
                                  <li key={tIndex}>
                                    <Link to={`/trucks/${truckDetail.truckId}`} className="text-blue-600 hover:underline">
                                      {truckDetail.chassisNumber}
                                    </Link>
                                    : {truckDetail.hours.toFixed(1)}h
                                  </li>
                                ))}
                              </ul>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  ) : (
                    <p className="text-muted-foreground text-sm">No operators scheduled for general repair this day.</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Upcoming Paint Booth Trucks Table */}
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle>Upcoming Paint Booth Trucks</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Chassis Number</TableHead>
                <TableHead>Repair Type</TableHead>
                <TableHead>Est. Paint Hours</TableHead>
                <TableHead>Delivery Date</TableHead>
                <TableHead>Est. Completion</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Issues</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {[...paintOnlyTrucks, ...combinedRepairTrucks].map((truck) => {
                const estimatedCompletionDate = paintTruckCompletionDates.get(truck.id);
                const isOverdue = estimatedCompletionDate && isAfter(estimatedCompletionDate, truck.deliveryDate);
                
                const isCapacityProblemOnCompletionPath = paintOccupancyData.some(d => {
                  const dayDate = new Date(d.date + ' ' + new Date().getFullYear());
                  return d.capacityProblem && 
                         estimatedCompletionDate && 
                         isAfter(dayDate, addDays(truck.deliveryDate, -1)) &&
                         isBefore(dayDate, addDays(estimatedCompletionDate, 1));
                });

                return (
                  <TableRow key={truck.id}>
                    <TableCell className="font-medium">
                      <Link to={`/trucks/${truck.id}`} className="text-blue-600 hover:underline">
                        {truck.chassisNumber}
                      </Link>
                    </TableCell>
                    <TableCell>{truck.repairType === 'Paint' ? 'Paint' : `CA - ${truck.customerAdaptationType}`}</TableCell>
                    <TableCell>{truck.repairTimeEstimate?.toFixed(1) || 'N/A'}</TableCell>
                    <TableCell>{format(truck.deliveryDate, 'MMM dd, yyyy')}</TableCell>
                    <TableCell>
                      {estimatedCompletionDate ? format(estimatedCompletionDate, 'MMM dd, yyyy') : 'N/A'}
                    </TableCell>
                    <TableCell>
                      <Badge className={getStatusColor(truck.status)}>
                        {truck.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={getPriorityColor(truck.customerPriority === 'Critical' ? 150 : truck.customerPriority === 'High' ? 100 : 50)}>
                        {truck.customerPriority}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {isOverdue ? (
                        <span className="flex items-center text-red-600 font-semibold">
                          <AlertCircle className="h-4 w-4 mr-1" /> Overdue (Est. Completion: {estimatedCompletionDate ? format(estimatedCompletionDate, 'MMM dd') : 'N/A'})
                        </span>
                      ) : isCapacityProblemOnCompletionPath ? (
                        <span className="flex items-center text-orange-600 font-semibold">
                          <AlertCircle className="h-4 w-4 mr-1" /> Capacity Issue
                        </span>
                      ) : (
                        <span className="flex items-center text-green-600">
                          <CheckCircle2 className="h-4 w-4 mr-1" /> On Track
                        </span>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Upcoming General Repair Trucks Table */}
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle>Upcoming General Repair Trucks</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Chassis Number</TableHead>
                <TableHead>Repair Type</TableHead>
                <TableHead>Est. Repair Hours</TableHead>
                <TableHead>Delivery Date</TableHead>
                <TableHead>Est. Completion</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Issues</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {[...generalRepairOnlyTrucks, ...combinedRepairTrucks].map((truck) => {
                const estimatedCompletionDate = generalRepairTruckCompletionDates.get(truck.id);
                const isOverdue = estimatedCompletionDate && isAfter(estimatedCompletionDate, truck.deliveryDate);
                
                const isCapacityProblemOnCompletionPath = generalRepairOccupancyData.some(d => {
                  const dayDate = new Date(d.date + ' ' + new Date().getFullYear());
                  return d.capacityProblem && 
                         estimatedCompletionDate && 
                         isAfter(dayDate, addDays(truck.deliveryDate, -1)) &&
                         isBefore(dayDate, addDays(estimatedCompletionDate, 1));
                });

                return (
                  <TableRow key={truck.id}>
                    <TableCell className="font-medium">
                      <Link to={`/trucks/${truck.id}`} className="text-blue-600 hover:underline">
                        {truck.chassisNumber}
                      </Link>
                    </TableCell>
                    <TableCell>{truck.repairType}</TableCell>
                    <TableCell>{truck.repairTimeEstimate?.toFixed(1) || 'N/A'}</TableCell>
                    <TableCell>{format(truck.deliveryDate, 'MMM dd, yyyy')}</TableCell>
                    <TableCell>
                      {estimatedCompletionDate ? format(estimatedCompletionDate, 'MMM dd, yyyy') : 'N/A'}
                    </TableCell>
                    <TableCell>
                      <Badge className={getStatusColor(truck.status)}>
                        {truck.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={getPriorityColor(truck.customerPriority === 'Critical' ? 150 : truck.customerPriority === 'High' ? 100 : 50)}>
                        {truck.customerPriority}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {isOverdue ? (
                        <span className="flex items-center text-red-600 font-semibold">
                          <AlertCircle className="h-4 w-4 mr-1" /> Overdue (Est. Completion: {estimatedCompletionDate ? format(estimatedCompletionDate, 'MMM dd') : 'N/A'})
                        </span>
                      ) : isCapacityProblemOnCompletionPath ? (
                        <span className="flex items-center text-orange-600 font-semibold">
                          <AlertCircle className="h-4 w-4 mr-1" /> Capacity Issue
                        </span>
                      ) : (
                        <span className="flex items-center text-green-600">
                          <CheckCircle2 className="h-4 w-4 mr-1" /> On Track
                        </span>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default PlanningDashboard;
