import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAppContext } from '@/context/AppContext';
import { calculateRemainingRepairTime } from '@/lib/data';
import { TruckIcon, WrenchIcon, PackageIcon, AlertCircleIcon, ClockIcon } from 'lucide-react';

const Reports: React.FC = () => {
  const { trucks } = useAppContext();

  const totalTrucks = trucks.length;
  const completedTrucks = trucks.filter(truck => truck.status === 'Completed').length;
  const inProgressTrucks = trucks.filter(truck => truck.status === 'Assigned' || truck.status === 'In Progress').length;
  const readyToPlanTrucks = trucks.filter(truck => truck.status === 'Ready to Plan').length;
  const notReadyTrucks = trucks.filter(truck => truck.status === 'Not Ready').length;
  const overdueTrucks = trucks.filter(truck => truck.status === 'Overdue').length;

  const totalDeviations = trucks.reduce((sum, truck) => sum + truck.deviations.length, 0);
  const completedDeviations = trucks.reduce((sum, truck) => sum + truck.deviations.filter(d => d.completed).length, 0);
  const incompleteDeviations = totalDeviations - completedDeviations;

  const totalMissingParts = trucks.reduce((sum, truck) => sum + truck.missingParts.length, 0);
  const completedMissingParts = trucks.reduce((sum, truck) => sum + truck.missingParts.filter(mp => mp.completed).length, 0);
  const pendingMissingParts = totalMissingParts - completedMissingParts;
  const backorderedMissingParts = trucks.reduce((sum, truck) => sum + truck.missingParts.filter(mp => mp.status === 'Backordered' && !mp.completed).length, 0);

  const totalCustomerAdaptations = trucks.filter(truck => truck.customerAdaptationWork).length;
  const completedCustomerAdaptations = trucks.filter(truck => truck.customerAdaptationWork && truck.customerAdaptationCompleted).length;
  const pendingCustomerAdaptations = totalCustomerAdaptations - completedCustomerAdaptations;

  const trucksWithOneDeviation = trucks.filter(truck =>
    truck.deviations.filter(d => !d.completed).length === 1 &&
    truck.missingParts.filter(mp => !mp.completed).length === 0 &&
    !truck.customerAdaptationWork
  ).length;

  const projectTrucks = trucks.filter(truck => truck.projectCode !== null).length;

  const totalRepairHours = trucks.reduce((sum, truck) => sum + calculateRemainingRepairTime(truck), 0);

  const repairTypeSummary = trucks.reduce((acc, truck) => {
    const type = truck.repairType;
    acc[type] = (acc[type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-6 text-gray-900">Operations Report</h1>
      <p className="text-lg text-gray-700 mb-8">Key performance indicators and summaries of truck operations.</p>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        <Card className="bg-white shadow-lg rounded-lg">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Trucks</CardTitle>
            <TruckIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalTrucks}</div>
            <p className="text-xs text-muted-foreground">Overall fleet size</p>
          </CardContent>
        </Card>
        <Card className="bg-white shadow-lg rounded-lg">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed Trucks</CardTitle>
            <CheckCircleIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{completedTrucks}</div>
            <p className="text-xs text-muted-foreground">Trucks finished and delivered</p>
          </CardContent>
        </Card>
        <Card className="bg-white shadow-lg rounded-lg">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">In Progress Trucks</CardTitle>
            <ClockIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{inProgressTrucks}</div>
            <p className="text-xs text-muted-foreground">Trucks currently being worked on</p>
          </CardContent>
        </Card>
        <Card className="bg-white shadow-lg rounded-lg">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ready to Plan</CardTitle>
            <WrenchIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{readyToPlanTrucks}</div>
            <p className="text-xs text-muted-foreground">Trucks awaiting assignment</p>
          </CardContent>
        </Card>
        <Card className="bg-white shadow-lg rounded-lg">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Not Ready (Parts)</CardTitle>
            <PackageIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{notReadyTrucks}</div>
            <p className="text-xs text-muted-foreground">Trucks waiting for missing parts</p>
          </CardContent>
        </Card>
        <Card className="bg-white shadow-lg rounded-lg">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Overdue Trucks</CardTitle>
            <AlertCircleIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{overdueTrucks}</div>
            <p className="text-xs text-muted-foreground">Trucks past their due date</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        <Card className="bg-white shadow-lg rounded-lg">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Incomplete Deviations</CardTitle>
            <AlertCircleIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{incompleteDeviations}</div>
            <p className="text-xs text-muted-foreground">Total deviations pending</p>
          </CardContent>
        </Card>
        <Card className="bg-white shadow-lg rounded-lg">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Missing Parts</CardTitle>
            <PackageIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingMissingParts}</div>
            <p className="text-xs text-muted-foreground">Parts not yet available/installed</p>
          </CardContent>
        </Card>
        <Card className="bg-white shadow-lg rounded-lg">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Backordered Parts</CardTitle>
            <PackageIcon className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{backorderedMissingParts}</div>
            <p className="text-xs text-muted-foreground">Critical parts on backorder</p>
          </CardContent>
        </Card>
        <Card className="bg-white shadow-lg rounded-lg">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Customer Adaptations</CardTitle>
            <WrenchIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingCustomerAdaptations}</div>
            <p className="text-xs text-muted-foreground">Customer-specific work pending</p>
          </CardContent>
        </Card>
        <Card className="bg-white shadow-lg rounded-lg">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Trucks with 1 Deviation</CardTitle>
            <TruckIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{trucksWithOneDeviation}</div>
            <p className="text-xs text-muted-foreground">Potential "quick wins"</p>
          </CardContent>
        </Card>
        <Card className="bg-white shadow-lg rounded-lg">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Project Trucks</CardTitle>
            <TruckIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{projectTrucks}</div>
            <p className="text-xs text-muted-foreground">Trucks part of specific projects</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="bg-white shadow-lg rounded-lg">
          <CardHeader>
            <CardTitle>Total Remaining Repair Hours</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold text-blue-600">{totalRepairHours.toFixed(1)} hrs</div>
            <p className="text-sm text-muted-foreground">Estimated total work remaining across all trucks.</p>
          </CardContent>
        </Card>

        <Card className="bg-white shadow-lg rounded-lg">
          <CardHeader>
            <CardTitle>Trucks by Repair Type</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="list-disc pl-5 space-y-1">
              {Object.entries(repairTypeSummary).map(([type, count]) => (
                <li key={type} className="text-base">
                  {type}: <span className="font-semibold">{count}</span> trucks
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Reports;
