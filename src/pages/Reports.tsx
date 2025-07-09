import React, { useMemo, useState } from 'react';
import { useAppContext } from '@/context/AppContext';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { BarChart, PieChart, LineChart, PackageXIcon, WrenchIcon, TruckIcon, UsersIcon, ClockIcon, AlertCircleIcon, CheckCircleIcon, UserPlusIcon, ListChecksIcon, HourglassIcon, FolderKanbanIcon } from 'lucide-react';
import { getPriorityScore, getStatusColor } from '@/lib/data';
import { TruckStatus } from '@/types';
import TruckListDialog from '@/components/dialogs/TruckListDialog';
import OperatorListDialog from '@/components/dialogs/OperatorListDialog';
import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

interface ReportCardProps {
  title: string;
  value: string | number;
  description?: string;
  icon?: React.ReactNode;
  className?: string;
  onClick?: () => void; // Added onClick prop
}

const ReportCard: React.FC<ReportCardProps> = ({ title, value, description, icon, className, onClick }) => (
  <Card
    className={`shadow-lg hover:shadow-xl transition-shadow duration-300 ${className} ${onClick ? 'cursor-pointer' : ''}`}
    onClick={onClick}
  >
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

  // State for dialog visibility
  const [showCaWorkTrucksDialog, setShowCaWorkTrucksDialog] = useState(false);
  const [showQuickMoverTrucksDialog, setShowQuickMoverTrucksDialog] = useState(false);
  const [showOverdueTrucksDialog, setShowOverdueTrucksDialog] = useState(false);
  const [showPendingPartsTrucksDialog, setShowPendingPartsTrucksDialog] = useState(false);
  const [showAssignedTrucksDialog, setShowAssignedTrucksDialog] = useState(false);
  const [showCompletedTrucksDialog, setShowCompletedTrucksDialog] = useState(false);
  const [showProjectTrucksDialog, setShowProjectTrucksDialog] = useState(false);
  const [showAvailableOperatorsDialog, setShowAvailableOperatorsDialog] = useState(false);

  // KPI 1: Summary on repair type
  const repairTypeSummary = useMemo(() => {
    const summary: { [key: string]: number } = {};
    trucks.forEach(truck => {
      summary[truck.repairType] = (summary[truck.repairType] || 0) + 1;
    });
    return summary;
  }, [trucks]);

  const repairTypeChartData = useMemo(() => {
    return {
      labels: Object.keys(repairTypeSummary),
      datasets: [
        {
          label: 'Count',
          data: Object.values(repairTypeSummary),
          backgroundColor: 'rgba(59, 130, 246, 0.6)', // blue-500
          borderColor: 'rgba(59, 130, 246, 1)',
          borderWidth: 1,
        },
      ],
    };
  }, [repairTypeSummary]);

  const repairTypeChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
      },
      title: {
        display: false,
        text: 'Trucks by Repair Type',
      },
    },
    scales: {
      x: {
        grid: {
          display: false,
        },
      },
      y: {
        beginAtZero: true,
        ticks: {
          precision: 0,
        },
      },
    },
  };

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

  const missingPartsChartData = useMemo(() => {
    return {
      labels: Object.keys(missingPartsSummary),
      datasets: [
        {
          label: 'Count',
          data: Object.values(missingPartsSummary),
          backgroundColor: 'rgba(107, 114, 128, 0.6)', // gray-500
          borderColor: 'rgba(107, 114, 128, 1)',
          borderWidth: 1,
        },
      ],
    };
  }, [missingPartsSummary]);

  const missingPartsChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
      },
      title: {
        display: false,
        text: 'Unique Missing Parts Count',
      },
    },
    scales: {
      x: {
        grid: {
          display: false,
        },
      },
      y: {
        beginAtZero: true,
        ticks: {
          precision: 0,
        },
      },
    },
  };

  // KPI 3: Number of deviations
  const totalDeviations = useMemo(() => {
    return trucks.reduce((sum, truck) => sum + truck.deviations.length, 0);
  }, [trucks]);

  // KPI 4: CA work (Customer Adaptation work)
  const caWorkTrucksList = useMemo(() => {
    return trucks.filter(truck => truck.customerAdaptationWork !== null);
  }, [trucks]);
  const caWorkTrucksCount = caWorkTrucksList.length;

  // KPI 5: All work in number of hours
  const totalRepairHours = useMemo(() => {
    return trucks.reduce((sum, truck) => sum + truck.repairTimeEstimate, 0).toFixed(1);
  }, [trucks]);

  // KPI 6: All trucks with just 1 deviation (quick movers)
  const quickMoverTrucksList = useMemo(() => {
    return trucks.filter(truck =>
      truck.deviations.length === 1 &&
      truck.missingParts.length === 0 &&
      truck.customerAdaptationWork === null &&
      truck.status !== 'Completed' &&
      truck.status !== 'Assigned' &&
      truck.status !== 'In Progress' &&
      truck.status !== 'Partial' &&
      truck.status !== 'Ready to Finish'
    );
  }, [trucks]);
  const quickMoverTrucksCount = quickMoverTrucksList.length;

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
  const availableOperatorsList = useMemo(() => {
    return operators.filter(op => op.status === 'Available');
  }, [operators]);
  const availableOperatorsCount = availableOperatorsList.length;

  // KPI 10: Overdue Trucks
  const overdueTrucksList = useMemo(() => {
    return trucks.filter(truck => getPriorityScore(truck).deliveryDate > 100 && truck.status !== 'Completed');
  }, [trucks]);
  const overdueTrucksCount = overdueTrucksList.length;

  // KPI 11: Trucks with Pending Missing Parts
  const trucksWithPendingMissingPartsList = useMemo(() => {
    return trucks.filter(truck =>
      truck.missingParts.some(mp => mp.status !== 'Available' && !mp.completed)
    );
  }, [trucks]);
  const trucksWithPendingMissingPartsCount = trucksWithPendingMissingPartsList.length;

  // KPI 12: Total Assigned Trucks
  const assignedTrucksList = useMemo(() => {
    return trucks.filter(truck => truck.status === 'Assigned');
  }, [trucks]);
  const totalAssignedTrucks = assignedTrucksList.length;

  // KPI 13: Total Completed Trucks
  const completedTrucksList = useMemo(() => {
    return trucks.filter(truck => truck.status === 'Completed');
  }, [trucks]);
  const totalCompletedTrucks = completedTrucksList.length;

  // KPI 14: Project Trucks
  const projectTrucksList = useMemo(() => {
    return trucks.filter(truck => truck.projectCode !== undefined && truck.projectCode !== null);
  }, [trucks]);
  const projectTrucksCount = projectTrucksList.length;

  // KPI 15: Total Repair Hours for NOT Completed Trucks (Deviations)
  const totalUncompletedDeviationHours = useMemo(() => {
    return trucks.filter(truck => truck.status !== 'Completed')
                 .reduce((sum, truck) => sum + (truck.deviationTimeEstimate || 0), 0)
                 .toFixed(1);
  }, [trucks]);

  // KPI 16: Total Repair Hours for NOT Completed Trucks (Missing Parts)
  const totalUncompletedMissingPartsHours = useMemo(() => {
    return trucks.filter(truck => truck.status !== 'Completed')
                 .reduce((sum, truck) => sum + (truck.missingPartsTimeEstimate || 0), 0)
                 .toFixed(1);
  }, [trucks]);

  // KPI 17: Total Repair Hours for NOT Completed Trucks (Customer Adaptation)
  const totalUncompletedCAHours = useMemo(() => {
    return trucks.filter(truck => truck.status !== 'Completed')
                 .reduce((sum, truck) => sum + (truck.customerAdaptationTimeEstimate || 0), 0)
                 .toFixed(1);
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
          value={caWorkTrucksCount}
          description="Trucks requiring customer adaptation"
          icon={<ListChecksIcon className="h-5 w-5 text-purple-600" />}
          onClick={() => setShowCaWorkTrucksDialog(true)}
        />
        <ReportCard
          title="Quick Mover Trucks"
          value={quickMoverTrucksCount}
          description="Trucks with only 1 deviation, ready for quick completion"
          icon={<HourglassIcon className="h-5 w-5 text-green-600" />}
          onClick={() => setShowQuickMoverTrucksDialog(true)}
        />
        <ReportCard
          title="Available Operators"
          value={availableOperatorsCount}
          description="Operators currently available for assignment"
          icon={<UsersIcon className="h-5 w-5 text-teal-600" />}
          onClick={() => setShowAvailableOperatorsDialog(true)}
        />
        <ReportCard
          title="Overdue Trucks"
          value={overdueTrucksCount}
          description="Trucks past their delivery date"
          icon={<AlertCircleIcon className="h-5 w-5 text-red-600" />}
          onClick={() => setShowOverdueTrucksDialog(true)}
        />
        <ReportCard
          title="Trucks with Pending Parts"
          value={trucksWithPendingMissingPartsCount}
          description="Trucks waiting for missing parts"
          icon={<PackageXIcon className="h-5 w-5 text-gray-600" />}
          onClick={() => setShowPendingPartsTrucksDialog(true)}
        />
        <ReportCard
          title="Total Assigned Trucks"
          value={totalAssignedTrucks}
          description="Trucks currently assigned to an operator"
          icon={<UserPlusIcon className="h-5 w-5 text-blue-500" />}
          onClick={() => setShowAssignedTrucksDialog(true)}
        />
        <ReportCard
          title="Total Completed Trucks"
          value={totalCompletedTrucks}
          description="Trucks that have finished all work"
          icon={<CheckCircleIcon className="h-5 w-5 text-green-500" />}
          onClick={() => setShowCompletedTrucksDialog(true)}
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
          onClick={() => setShowProjectTrucksDialog(true)}
        />
        <ReportCard
          title="Uncompleted Dev. Hours"
          value={`${totalUncompletedDeviationHours} hrs`}
          description="Estimated hours for deviations on uncompleted trucks"
          icon={<WrenchIcon className="h-5 w-5 text-orange-500" />}
        />
        <ReportCard
          title="Uncompleted Parts Hours"
          value={`${totalUncompletedMissingPartsHours} hrs`}
          description="Estimated hours for missing parts on uncompleted trucks"
          icon={<PackageXIcon className="h-5 w-5 text-gray-500" />}
        />
        <ReportCard
          title="Uncompleted CA Hours"
          value={`${totalUncompletedCAHours} hrs`}
          description="Estimated hours for CA work on uncompleted trucks"
          icon={<ListChecksIcon className="h-5 w-5 text-purple-500" />}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Repair Type Summary - List */}
        <Card className="shadow-lg p-6">
          <CardHeader>
            <CardTitle className="text-xl font-semibold text-gray-800 flex items-center">
              <BarChart className="mr-2 h-5 w-5 text-blue-600" /> Trucks by Repair Type (List)
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

        {/* Repair Type Summary - Chart */}
        <Card className="shadow-lg p-6">
          <CardHeader>
            <CardTitle className="text-xl font-semibold text-gray-800 flex items-center">
              <BarChart className="mr-2 h-5 w-5 text-blue-600" /> Trucks by Repair Type (Chart)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {repairTypeChartData.labels.length > 0 ? (
              <div className="h-[200px] w-full">
                <Bar data={repairTypeChartData} options={repairTypeChartOptions} />
              </div>
            ) : (
              <p className="text-muted-foreground text-center py-4">No repair type data available for chart.</p>
            )}
          </CardContent>
        </Card>

        {/* Missing Parts Summary - List */}
        <Card className="shadow-lg p-6">
          <CardHeader>
            <CardTitle className="text-xl font-semibold text-gray-800 flex items-center">
              <PackageXIcon className="mr-2 h-5 w-5 text-gray-600" /> Unique Missing Parts Count (List)
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

        {/* Missing Parts Summary - Chart */}
        <Card className="shadow-lg p-6">
          <CardHeader>
            <CardTitle className="text-xl font-semibold text-gray-800 flex items-center">
              <PackageXIcon className="mr-2 h-5 w-5 text-gray-600" /> Unique Missing Parts Count (Chart)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {missingPartsChartData.labels.length > 0 ? (
              <div className="h-[200px] w-full">
                <Bar data={missingPartsChartData} options={missingPartsChartOptions} />
              </div>
            ) : (
              <p className="text-muted-foreground text-center py-4">No missing parts data available for chart.</p>
            )}
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

      {/* Dialogs for clickable cards */}
      <TruckListDialog
        isOpen={showCaWorkTrucksDialog}
        onClose={() => setShowCaWorkTrucksDialog(false)}
        title="Trucks with Customer Adaptation Work"
        description="List of trucks that have customer adaptation work."
        trucks={caWorkTrucksList}
      />
      <TruckListDialog
        isOpen={showQuickMoverTrucksDialog}
        onClose={() => setShowQuickMoverTrucksDialog(false)}
        title="Quick Mover Trucks"
        description="Trucks with only one deviation, no missing parts, and no CA work, ready for quick completion."
        trucks={quickMoverTrucksList}
      />
      <OperatorListDialog
        isOpen={showAvailableOperatorsDialog}
        onClose={() => setShowAvailableOperatorsDialog(false)}
        title="Available Operators"
        description="List of operators currently available for assignment."
        operators={availableOperatorsList}
      />
      <TruckListDialog
        isOpen={showOverdueTrucksDialog}
        onClose={() => setShowOverdueTrucksDialog(false)}
        title="Overdue Trucks"
        description="Trucks that are past their estimated delivery date and not yet completed."
        trucks={overdueTrucksList}
      />
      <TruckListDialog
        isOpen={showPendingPartsTrucksDialog}
        onClose={() => setShowPendingPartsTrucksDialog(false)}
        title="Trucks with Pending Missing Parts"
        description="Trucks that are waiting for missing parts to become available."
        trucks={trucksWithPendingMissingPartsList}
      />
      <TruckListDialog
        isOpen={showAssignedTrucksDialog}
        onClose={() => setShowAssignedTrucksDialog(false)}
        title="Total Assigned Trucks"
        description="Trucks currently assigned to one or more operators."
        trucks={assignedTrucksList}
      />
      <TruckListDialog
        isOpen={showCompletedTrucksDialog}
        onClose={() => setShowCompletedTrucksDialog(false)}
        title="Total Completed Trucks"
        description="Trucks that have been marked as fully completed."
        trucks={completedTrucksList}
      />
      <TruckListDialog
        isOpen={showProjectTrucksDialog}
        onClose={() => setShowProjectTrucksDialog(false)}
        title="Project Trucks"
        description="Trucks associated with a specific project code."
        trucks={projectTrucksList}
      />
    </div>
  );
};

export default Reports;
