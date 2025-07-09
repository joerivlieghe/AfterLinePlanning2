import React, { useMemo } from 'react';
import { useAppContext } from '@/context/AppContext';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { BarChart, PieChart, LineChart, PackageXIcon, WrenchIcon, TruckIcon, UsersIcon, ClockIcon, AlertCircleIcon, CheckCircleIcon, UserPlusIcon, ListChecksIcon, HourglassIcon, FolderKanbanIcon } from 'lucide-react'; // Added FolderKanbanIcon
import { getPriorityScore, getStatusColor } from '@/lib/data';
import { TruckStatus } from '@/types';

interface ReportCardProps {
  title: string;
  value: string | number;
  description?: string;
  icon?: React.ReactNode;
  className?: string;
}

const ReportCard: React.FC<ReportCardProps> = ({ title, value, description, icon, className }) => (
  <Card className={`shadow-lg hover:shadow-xl transition-shadow duration-300 ${className}`}>
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
      <CardTitle className="text-sm font-medium text-gray-600">{title}</CardTitle>
      {icon}
    </CardHeader>
    <CardContent>
      <div className="text-3xl font-bold text-gray-900">{value}</div>
      {description && <p className="text-xs text-muted-foreground mt-1">{description}</p>}
    </CardContent>
  </Card>
);

const Reports: React.FC = () => {
  const { trucks, operators } = useAppContext();

  // KPI 1: Summary on repair type
  const repairTypeSummary = useMemo(() => {
    const summary: { [key: string]: number } = {};
    trucks.forEach(truck => {
      summary[truck.repairType] = (summary[truck.repairType] || 0) + 1;
    });
    return summary;
  }, [trucks]);

  // KPI 2: Number of missing parts per unique missing part
  const missingPartsSummary = useMemo(() => {
    const summary: { [key: string]: number } = {};
    trucks.forEach(truck => {
      truck.missingParts.forEach(part => {
        summary[part.name] = (summary[part.name] || 0) + 1;
      });
    });
    return summary;
  }, [trucks]);

  // KPI 3: Number of deviations
  const totalDeviations = useMemo(() => {
    return trucks.reduce((sum, truck) => sum + truck.deviations.length, 0);
  }, [trucks]);

  // KPI 4: CA work (Customer Adaptation work)
  const caWorkTrucks = useMemo(() => {
    return trucks.filter(truck => truck.customerAdaptationWork !== null).length;
  }, [trucks]);

  // KPI 5: All work in number of hours
  const totalRepairHours = useMemo(() => {
    return trucks.reduce((sum, truck) => sum + truck.repairTimeEstimate, 0).toFixed(1);
  }, [trucks]);

  // KPI 6: All trucks with just 1 deviation (quick movers)
  const quickMoverTrucks = useMemo(() => {
    return trucks.filter(truck =>
      truck.deviations.length === 1 &&
      truck.missingParts.length === 0 &&
      truck.customerAdaptationWork === null &&
      truck.status !== 'Completed' &&
      truck.status !== 'Assigned' &&
      truck.status !== 'In Progress' &&
      truck.status !== 'Partial' &&
      truck.status !== 'Ready to Finish'
    ).length;
  }, [trucks]);

  // Additional KPIs:

  // KPI 7: Trucks by Status
  const trucksByStatus = useMemo(() => {
    const statusCounts: { [key in TruckStatus]?: number } = {};
    trucks.forEach(truck => {
      statusCounts[truck.status] = (statusCounts[truck.status] || 0) + 1;
    });
    return statusCounts;
  }, [trucks]);

  // KPI 8: Average Repair Time per Truck
  const averageRepairTime = useMemo(() => {
    if (trucks.length === 0) return '0.0';
    const totalHours = trucks.reduce((sum, truck) => sum + truck.repairTimeEstimate, 0);
    return (totalHours / trucks.length).toFixed(1);
  }, [trucks]);

  // KPI 9: Operators Available
  const availableOperatorsCount = useMemo(() => {
    return operators.filter(op => op.status === 'Available').length;
  }, [operators]);

  // KPI 10: Overdue Trucks
  const overdueTrucksCount = useMemo(() => {
    return trucks.filter(truck => getPriorityScore(truck).deliveryDate > 100 && truck.status !== 'Completed').length;
  }, [trucks]);

  // KPI 11: Trucks with Pending Missing Parts
  const trucksWithPendingMissingParts = useMemo(() => {
    return trucks.filter(truck =>
      truck.missingParts.some(mp => mp.status !== 'Available' && !mp.completed)
    ).length;
  }, [trucks]);

  // KPI 12: Total Assigned Trucks
  const totalAssignedTrucks = useMemo(() => {
    return trucks.filter(truck => truck.status === 'Assigned').length;
  }, [trucks]);

  // KPI 13: Total Completed Trucks
  const totalCompletedTrucks = useMemo(() => {
    return trucks.filter(truck => truck.status === 'Completed').length;
  }, [trucks]);

  // KPI 14: Project Trucks
  const projectTrucksCount = useMemo(() => {
    return trucks.filter(truck => truck.projectCode !== undefined && truck.projectCode !== null).length;
  }, [trucks]);

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <h1 className="text-4xl font-extrabold text-gray-900 mb-8">Workshop Reports & Analytics</h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-10">
        <ReportCard
          title="Total Trucks"
          value={trucks.length}
          description="Overall number of trucks in the system"
          icon={<TruckIcon className="h-5 w-5 text-blue-600" />}
        />
        <ReportCard
          title="Total Repair Hours"
          value={`${totalRepairHours} hrs`}
          description="Estimated total work across all trucks"
          icon={<ClockIcon className="h-5 w-5 text-indigo-600" />}
        />
        <ReportCard
          title="Total Deviations"
          value={totalDeviations}
          description="Sum of all reported deviations"
          icon={<WrenchIcon className="h-5 w-5 text-orange-600" />}
        />
        <ReportCard
          title="Trucks with CA Work"
          value={caWorkTrucks}
          description="Trucks requiring customer adaptation"
          icon={<ListChecksIcon className="h-5 w-5 text-purple-600" />}
        />
        <ReportCard
          title="Quick Mover Trucks"
          value={quickMoverTrucks}
          description="Trucks with only 1 deviation, ready for quick completion"
          icon={<HourglassIcon className="h-5 w-5 text-green-600" />}
        />
        <ReportCard
          title="Available Operators"
          value={availableOperatorsCount}
          description="Operators currently available for assignment"
          icon={<UsersIcon className="h-5 w-5 text-teal-600" />}
        />
        <ReportCard
          title="Overdue Trucks"
          value={overdueTrucksCount}
          description="Trucks past their delivery date"
          icon={<AlertCircleIcon className="h-5 w-5 text-red-600" />}
        />
        <ReportCard
          title="Trucks with Pending Parts"
          value={trucksWithPendingMissingParts}
          description="Trucks waiting for missing parts"
          icon={<PackageXIcon className="h-5 w-5 text-gray-600" />}
        />
        <ReportCard
          title="Total Assigned Trucks"
          value={totalAssignedTrucks}
          description="Trucks currently assigned to an operator"
          icon={<UserPlusIcon className="h-5 w-5 text-blue-500" />}
        />
        <ReportCard
          title="Total Completed Trucks"
          value={totalCompletedTrucks}
          description="Trucks that have finished all work"
          icon={<CheckCircleIcon className="h-5 w-5 text-green-500" />}
        />
        <ReportCard
          title="Avg. Repair Time/Truck"
          value={`${averageRepairTime} hrs`}
          description="Average estimated repair time per truck"
          icon={<ClockIcon className="h-5 w-5 text-yellow-600" />}
        />
        <ReportCard
          title="Project Trucks"
          value={projectTrucksCount}
          description="Trucks associated with a specific project"
          icon={<FolderKanbanIcon className="h-5 w-5 text-pink-600" />}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Repair Type Summary */}
        <Card className="shadow-lg p-6">
          <CardHeader>
            <CardTitle className="text-xl font-semibold text-gray-800 flex items-center">
              <BarChart className="mr-2 h-5 w-5 text-blue-600" /> Trucks by Repair Type
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {Object.entries(repairTypeSummary).length > 0 ? (
                Object.entries(repairTypeSummary).map(([type, count]) => (
                  <li key={type} className="flex justify-between items-center py-2 border-b last:border-b-0">
                    <span className="text-gray-700 font-medium">{type}</span>
                    <span className="px-3 py-1 rounded-full bg-blue-100 text-blue-800 text-sm font-semibold">{count}</span>
                  </li>
                ))
              ) : (
                <p className="text-muted-foreground text-center py-4">No repair type data available.</p>
              )}
            </ul>
          </CardContent>
        </Card>

        {/* Missing Parts Summary */}
        <Card className="shadow-lg p-6">
          <CardHeader>
            <CardTitle className="text-xl font-semibold text-gray-800 flex items-center">
              <PackageXIcon className="mr-2 h-5 w-5 text-gray-600" /> Unique Missing Parts Count
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {Object.entries(missingPartsSummary).length > 0 ? (
                Object.entries(missingPartsSummary).map(([partName, count]) => (
                  <li key={partName} className="flex justify-between items-center py-2 border-b last:border-b-0">
                    <span className="text-gray-700 font-medium">{partName}</span>
                    <span className="px-3 py-1 rounded-full bg-gray-100 text-gray-800 text-sm font-semibold">{count}</span>
                  </li>
                ))
              ) : (
                <p className="text-muted-foreground text-center py-4">No missing parts data available.</p>
              )}
            </ul>
          </CardContent>
        </Card>

        {/* Trucks by Status Summary */}
        <Card className="shadow-lg p-6 col-span-full">
          <CardHeader>
            <CardTitle className="text-xl font-semibold text-gray-800 flex items-center">
              <PieChart className="mr-2 h-5 w-5 text-purple-600" /> Trucks by Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {Object.entries(trucksByStatus).length > 0 ? (
                Object.entries(trucksByStatus).map(([status, count]) => (
                  <div key={status} className={`p-4 rounded-lg flex flex-col items-center justify-center text-center ${getStatusColor(status as TruckStatus)}`}>
                    <span className="text-2xl font-bold">{count}</span>
                    <span className="text-sm font-medium mt-1">{status}</span>
                  </div>
                ))
              ) : (
                <p className="col-span-full text-muted-foreground text-center py-4">No truck status data available.</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Reports;
