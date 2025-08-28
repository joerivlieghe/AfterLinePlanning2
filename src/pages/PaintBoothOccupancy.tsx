import React, { useMemo, useState } from 'react';
import { useAppContext } from '@/context/AppContext';
import { Truck } from '@/types';
import { format, addDays, isAfter, isBefore, startOfDay, endOfDay, isPast } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { getPriorityColor, getStatusColor, simulatePaintBoothSchedule, TOTAL_PAINT_BOOTH_DAILY_CAPACITY_HOURS, SMALL_PAINT_BOOTH_DAILY_CAPACITY_HOURS, LARGE_PAINT_BOOTH_DAILY_CAPACITY_HOURS } from '@/lib/data';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine } from 'recharts';
import { ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, CheckCircle2, TruckIcon, BarChart2Icon } from 'lucide-react';
import { Link } from 'react-router-dom'; // Import Link

const PaintBoothOccupancy: React.FC = () => {
  const { trucks } = useAppContext();
  const [numDays, setNumDays] = useState(30); // Show occupancy for the next 30 days

  const paintBoothTrucks = useMemo(() => {
    // Ensure trucks is an array before filtering to prevent errors if context is not yet loaded
    return (trucks || []).filter(
      (truck) =>
        (truck.deviations.some(d => d.type === 'Paint' && !d.completed) ||
         (truck.customerAdaptationWork && truck.customerAdaptationWork.toLowerCase().includes('paint') && !truck.customerAdaptationCompleted)) &&
        truck.status !== 'Completed'
    );
  }, [trucks]);

  const { occupancyData = [], truckCompletionDates = new Map() } = useMemo(() => {
    const result = simulatePaintBoothSchedule(paintBoothTrucks, numDays, {
      small: SMALL_PAINT_BOOTH_DAILY_CAPACITY_HOURS,
      large: LARGE_PAINT_BOOTH_DAILY_CAPACITY_HOURS,
    });
    // Ensure result is not null/undefined before destructuring
    return result || { occupancyData: [], truckCompletionDates: new Map() };
  }, [paintBoothTrucks, numDays]);

  const chartConfig = {
    smallBoothPaintHours: {
      label: 'Small Booth Paint',
      color: 'hsl(var(--chart-1))', // Blue for small booth paint
    },
    smallBoothCAPaintHours: {
      label: 'Small Booth CA Paint',
      color: 'hsl(var(--chart-2))', // Green for small booth CA paint
    },
    largeBoothPaintHours: {
      label: 'Large Booth Paint',
      color: 'hsl(var(--chart-3))', // Orange for large booth paint
    },
    largeBoothCAPaintHours: {
      label: 'Large Booth CA Paint',
      color: 'hsl(var(--chart-4))', // Purple for large CA paint
    },
    capacity: {
      label: 'Total Daily Capacity',
      color: 'hsl(var(--chart-5))', // Red for total capacity line
    },
    smallCapacity: {
      label: 'Small Booth Capacity',
      color: 'hsl(var(--chart-6))', // Light blue for small capacity line
    },
    largeCapacity: {
      label: 'Large Booth Capacity',
      color: 'hsl(var(--chart-7))', // Light orange for large capacity line
    },
  } satisfies ChartConfig;

  const totalPaintBoothTrucks = paintBoothTrucks.length;
  const totalOverdueTrucks = paintBoothTrucks.filter(truck => {
    const estimatedCompletionDate = truckCompletionDates.get(truck.id);
    return estimatedCompletionDate && isAfter(estimatedCompletionDate, truck.deliveryDate);
  }).length;

  const averageOccupancyHours = occupancyData.length > 0
    ? (occupancyData.reduce((sum, d) => sum + d.totalScheduledHours, 0) / occupancyData.length).toFixed(1)
    : 0;

  return (
    <div className="container mx-auto p-6 space-y-8">
      <h1 className="text-4xl font-bold text-gray-900 mb-6">Paint Booth Occupancy Management</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        <Card className="shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Paint Booth Trucks</CardTitle>
            <TruckIcon className="h-4 w-4 text-muted-foreground" />
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
            <CardTitle className="text-sm font-medium">Projected Overdue</CardTitle>
            <AlertCircle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{totalOverdueTrucks}</div>
            <p className="text-xs text-muted-foreground">
              Trucks estimated to miss delivery date
            </p>
          </CardContent>
        </Card>
        <Card className="shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Daily Occupancy</CardTitle>
            <BarChart2Icon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {averageOccupancyHours} hours
            </div>
            <p className="text-xs text-muted-foreground">
              Average scheduled hours per day over the next {numDays} days
            </p>
          </CardContent>
        </Card>
      </div>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle>Paint Booth Occupancy Over Time</CardTitle>
        </CardHeader>
        <CardContent>
          <ChartContainer config={chartConfig} className="min-h-[300px] w-full">
            <BarChart accessibilityLayer data={occupancyData} barCategoryGap="20%"> {/* Increased gap between categories (days) */}
              <CartesianGrid vertical={true} strokeDasharray="3 3" /> {/* Added vertical dotted lines */}
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
                domain={[0, Math.max(SMALL_PAINT_BOOTH_DAILY_CAPACITY_HOURS, LARGE_PAINT_BOOTH_DAILY_CAPACITY_HOURS) + 5]} // Extend Y-axis slightly above max individual booth capacity
              />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Legend layout="horizontal" verticalAlign="top" align="center" />
              {/* Removed ReferenceLine for TOTAL_PAINT_BOOTH_DAILY_CAPACITY_HOURS */}
              <ReferenceLine y={SMALL_PAINT_BOOTH_DAILY_CAPACITY_HOURS} stroke="var(--color-smallCapacity)" strokeDasharray="8 8" label={{ value: `Small Booth Capacity (${SMALL_PAINT_BOOTH_DAILY_CAPACITY_HOURS}h)`, position: 'top', fill: 'var(--color-smallCapacity)', fontSize: 12, offset: 20 }} />
              <ReferenceLine y={LARGE_PAINT_BOOTH_DAILY_CAPACITY_HOURS} stroke="var(--color-largeCapacity)" strokeDasharray="8 8" label={{ value: `Large Booth Capacity (${LARGE_PAINT_BOOTH_DAILY_CAPACITY_HOURS}h)`, position: 'top', fill: 'var(--color-largeCapacity)', fontSize: 12, offset: 40 }} />

              {/* Clustered bars for Small Booth */}
              <Bar dataKey="smallBoothPaintHours" stackId="smallBooth" fill="var(--color-smallBoothPaintHours)" radius={[4, 4, 0, 0]} />
              <Bar dataKey="smallBoothCAPaintHours" stackId="smallBooth" fill="var(--color-smallBoothCAPaintHours)" radius={[0, 0, 4, 4]} />

              {/* Clustered bars for Large Booth */}
              <Bar dataKey="largeBoothPaintHours" stackId="largeBooth" fill="var(--color-largeBoothPaintHours)" radius={[4, 4, 0, 0]} />
              <Bar dataKey="largeBoothCAPaintHours" stackId="largeBooth" fill="var(--color-largeBoothCAPaintHours)" radius={[0, 0, 4, 4]} />
            </BarChart>
          </ChartContainer>
        </CardContent>
      </Card>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle>Daily Paint Booth Schedule</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            Trucks are assigned to paint booths based on the following priority:
            <ol className="list-decimal list-inside mt-2">
              <li>**Delivery Date**: Earliest delivery date first</li>
              <li>**Customer Priority**: Critical {'>'} High {'>'} Medium {'>'} Low (for trucks with the same delivery date)</li>
            </ol>
            Large trucks are prioritized for the large booth. Small trucks are prioritized for the small booth, but can spill over into the large booth if the small booth is at capacity.
          </p>
          {occupancyData.length === 0 ? (
            <p className="text-center text-muted-foreground">No paint booth work scheduled for the next {numDays} days.</p>
          ) : (
            <div className="space-y-8">
              {occupancyData.map((dayEntry) => (
                <div key={dayEntry.date} className="border rounded-lg p-4 bg-gray-50">
                  <h3 className="text-lg font-semibold mb-4">
                    {dayEntry.date} (Total Scheduled: {dayEntry.totalScheduledHours.toFixed(1)}h / Capacity: {TOTAL_PAINT_BOOTH_DAILY_CAPACITY_HOURS}h)
                    {dayEntry.capacityProblem && (
                      <Badge variant="destructive" className="ml-2">Capacity Exceeded</Badge>
                    )}
                  </h3>

                  {/* Small Booth Section */}
                  <div className="mb-6">
                    <h4 className="text-md font-semibold mb-2 text-blue-700">Small Paint Booth Schedule ({dayEntry.smallBoothScheduledHours.toFixed(1)}h / {SMALL_PAINT_BOOTH_DAILY_CAPACITY_HOURS}h)</h4>
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

                  {/* Large Booth Section */}
                  <div>
                    <h4 className="text-md font-semibold mb-2 text-orange-700">Large Paint Booth Schedule ({dayEntry.largeBoothScheduledHours.toFixed(1)}h / {LARGE_PAINT_BOOTH_DAILY_CAPACITY_HOURS}h)</h4>
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
              {paintBoothTrucks.map((truck) => {
                const estimatedCompletionDate = truckCompletionDates.get(truck.id);
                const isOverdue = estimatedCompletionDate && isAfter(estimatedCompletionDate, truck.deliveryDate);
                
                // Check for capacity problems specifically between the delivery date and estimated completion date
                const isCapacityProblemOnCompletionPath = occupancyData.some(d => {
                  const dayDate = new Date(d.date + ' ' + new Date().getFullYear());
                  return d.capacityProblem && 
                         estimatedCompletionDate && 
                         isAfter(dayDate, addDays(truck.deliveryDate, -1)) && // Start checking from around delivery date
                         isBefore(dayDate, addDays(estimatedCompletionDate, 1)); // End checking around estimated completion date
                });

                return (
                  <TableRow key={truck.id}>
                    <TableCell className="font-medium">
                      <Link to={`/trucks/${truck.id}`} className="text-blue-600 hover:underline">
                        {truck.name}
                      </Link>
                    </TableCell>
                    <TableCell>
                      {truck.deviations.some(d => d.type === 'Paint' && !d.completed) && truck.customerAdaptationWork && truck.customerAdaptationWork.toLowerCase().includes('paint') && !truck.customerAdaptationCompleted
                        ? 'Paint & CA - Paint'
                        : truck.deviations.some(d => d.type === 'Paint' && !d.completed)
                          ? 'Paint'
                          : truck.customerAdaptationWork && truck.customerAdaptationWork.toLowerCase().includes('paint') && !truck.customerAdaptationCompleted
                            ? 'CA - Paint'
                            : 'N/A'
                      }
                    </TableCell>
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
                      <Badge className={getPriorityColor(truck)}>
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

export default PaintBoothOccupancy;
