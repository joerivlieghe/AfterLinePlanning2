import React, { useMemo } from 'react';
import { useAppContext } from '@/context/AppContext';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
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
import { PackageIcon, WrenchIcon, AlertCircleIcon, ClockIcon, TruckIcon, CodeIcon } from 'lucide-react';
import { calculateRemainingRepairTime } from '@/lib/data';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

const Reports: React.FC = () => {
  const { trucks } = useAppContext();

  const completedTrucks = useMemo(() => trucks.filter(t => t.status === 'Completed'), [trucks]);
  const inProgressTrucks = useMemo(() => trucks.filter(t => t.status !== 'Completed'), [trucks]);

  const totalRepairHours = useMemo(() => {
    let totalDeviationsHours = 0;
    let totalMissingPartsHours = 0;
    let totalCustomerAdaptationHours = 0;
    let totalOverallHours = 0;

    inProgressTrucks.forEach(truck => {
      truck.deviations.forEach(dev => {
        if (!dev.completed && dev.timeEstimate) {
          totalDeviationsHours += dev.timeEstimate;
        }
      });
      truck.missingParts.forEach(mp => {
        if (!mp.completed && mp.timeEstimate) {
          totalMissingPartsHours += mp.timeEstimate;
        }
      });
      if (truck.customerAdaptationWork && !truck.customerAdaptationCompleted && truck.customerAdaptationTimeEstimate) {
        totalCustomerAdaptationHours += truck.customerAdaptationTimeEstimate;
      }
      totalOverallHours += calculateRemainingRepairTime(truck);
    });

    return {
      totalDeviationsHours,
      totalMissingPartsHours,
      totalCustomerAdaptationHours,
      totalOverallHours,
    };
  }, [inProgressTrucks]);

  const repairTypeSummary = useMemo(() => {
    const summary: Record<string, { count: number; hours: number }> = {};
    inProgressTrucks.forEach(truck => {
      if (!summary[truck.repairType]) {
        summary[truck.repairType] = { count: 0, hours: 0 };
      }
      summary[truck.repairType].count++;
      summary[truck.repairType].hours += calculateRemainingRepairTime(truck);
    });
    return summary;
  }, [inProgressTrucks]);

  const quickMoverTrucks = useMemo(() => {
    return inProgressTrucks.filter(truck =>
      truck.deviations.filter(d => !d.completed).length === 1 &&
      truck.missingParts.filter(mp => !mp.completed).length === 0 &&
      !truck.customerAdaptationWork
    );
  }, [inProgressTrucks]);

  const projectTrucks = useMemo(() => {
    return inProgressTrucks.filter(truck => truck.projectCode);
  }, [inProgressTrucks]);

  const chartData = {
    labels: Object.keys(repairTypeSummary),
    datasets: [
      {
        label: 'Number of Trucks',
        data: Object.values(repairTypeSummary).map(s => s.count),
        backgroundColor: 'rgba(75, 192, 192, 0.6)',
        borderColor: 'rgba(75, 192, 192, 1)',
        borderWidth: 1,
      },
      {
        label: 'Estimated Repair Hours',
        data: Object.values(repairTypeSummary).map(s => s.hours),
        backgroundColor: 'rgba(153, 102, 255, 0.6)',
        borderColor: 'rgba(153, 102, 255, 1)',
        borderWidth: 1,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
      },
      title: {
        display: true,
        text: 'Repair Type Summary (In Progress Trucks)',
      },
    },
    scales: {
      x: {
        title: {
          display: true,
          text: 'Repair Type',
        },
      },
      y: {
        beginAtZero: true,
        title: {
          display: true,
          text: 'Count / Hours',
        },
      },
    },
  };

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold text-gray-900 mb-6">Operations Report</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Trucks</CardTitle>
            <TruckIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{trucks.length}</div>
            <p className="text-xs text-muted-foreground">
              {inProgressTrucks.length} In Progress, {completedTrucks.length} Completed
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Estimated Work Hours</CardTitle>
            <ClockIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalRepairHours.totalOverallHours.toFixed(1)} hrs</div>
            <p className="text-xs text-muted-foreground">
              Deviations: {totalRepairHours.totalDeviationsHours.toFixed(1)} hrs
            </p>
            <p className="text-xs text-muted-foreground">
              Missing Parts: {totalRepairHours.totalMissingPartsHours.toFixed(1)} hrs
            </p>
            <p className="text-xs text-muted-foreground">
              Customer Adaptation: {totalRepairHours.totalCustomerAdaptationHours.toFixed(1)} hrs
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Quick Movers (1 Deviation)</CardTitle>
            <AlertCircleIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{quickMoverTrucks.length}</div>
            <p className="text-xs text-muted-foreground">
              Trucks with only one deviation and no other work.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Project Trucks</CardTitle>
            <CodeIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{projectTrucks.length}</div>
            <p className="text-xs text-muted-foreground">
              Trucks assigned to specific projects.
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="col-span-1">
          <CardHeader>
            <CardTitle>Repair Type Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <Bar data={chartData} options={chartOptions} />
            </div>
          </CardContent>
        </Card>

        <Card className="col-span-1">
          <CardHeader>
            <CardTitle>Detailed Repair Type Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {Object.entries(repairTypeSummary).map(([type, data]) => (
                <li key={type} className="flex justify-between items-center border-b pb-2 last:border-b-0 last:pb-0">
                  <span className="font-medium">{type}</span>
                  <div className="text-right">
                    <p className="text-sm">{data.count} Trucks</p>
                    <p className="text-xs text-muted-foreground">{data.hours.toFixed(1)} hrs</p>
                  </div>
                </li>
              ))}
              {Object.keys(repairTypeSummary).length === 0 && (
                <p className="text-muted-foreground italic">No in-progress trucks to summarize.</p>
              )}
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Reports;
