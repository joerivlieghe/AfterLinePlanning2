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
import { Truck, RepairType } from '@/types';
import { REPAIR_TYPES, calculateRemainingRepairTime } from '@/lib/data';
import { PackageIcon, AlertCircleIcon, WrenchIcon, ClockIcon, TruckIcon, SparklesIcon } from 'lucide-react';

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

  const totalRepairHours = useMemo(() => {
    let totalDeviationsHours = 0;
    let totalMissingPartsHours = 0;
    let totalCustomerAdaptationHours = 0;
    let totalOverallHours = 0;

    trucks.forEach(truck => {
      if (truck.status !== 'Completed') {
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
      }
    });

    return {
      totalDeviationsHours,
      totalMissingPartsHours,
      totalCustomerAdaptationHours,
      totalOverallHours,
    };
  }, [trucks]);

  const repairTypeData = useMemo(() => {
    const counts: Record<RepairType, number> = REPAIR_TYPES.reduce((acc, type) => {
      acc[type] = 0;
      return acc;
    }, {} as Record<RepairType, number>);

    trucks.forEach(truck => {
      if (truck.status !== 'Completed' && counts[truck.repairType] !== undefined) {
        counts[truck.repairType]++;
      }
    });

    return {
      labels: REPAIR_TYPES,
      datasets: [
        {
          label: 'Number of Trucks',
          data: REPAIR_TYPES.map(type => counts[type]),
          backgroundColor: [
            'rgba(255, 99, 132, 0.6)',
            'rgba(54, 162, 235, 0.6)',
            'rgba(255, 206, 86, 0.6)',
            'rgba(75, 192, 192, 0.6)',
            'rgba(153, 102, 255, 0.6)',
          ],
          borderColor: [
            'rgba(255, 99, 132, 1)',
            'rgba(54, 162, 235, 1)',
            'rgba(255, 206, 86, 1)',
            'rgba(75, 192, 192, 1)',
            'rgba(153, 102, 255, 1)',
          ],
          borderWidth: 1,
        },
      ],
    };
  }, [trucks]);

  const quickMoverTrucks = useMemo(() => {
    return trucks.filter(truck =>
      truck.status !== 'Completed' &&
      truck.deviations.filter(d => !d.completed).length === 1 &&
      truck.missingParts.filter(mp => !mp.completed).length === 0 &&
      !truck.customerAdaptationWork
    );
  }, [trucks]);

  const projectTrucks = useMemo(() => {
    return trucks.filter(truck => truck.projectCode && truck.status !== 'Completed');
  }, [trucks]);

  return (
    <div className="p-6 flex flex-col h-screen">
      <h1 className="text-3xl font-bold mb-6 text-gray-900">Operational Reports</h1>
      <p className="text-lg text-gray-700 mb-8">Key performance indicators and insights into the repair process.</p>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-8">
        <Card className="bg-white shadow-lg rounded-lg">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Trucks</CardTitle>
            <TruckIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{trucks.length}</div>
            <p className="text-xs text-muted-foreground">Overall count</p>
          </CardContent>
        </Card>
        <Card className="bg-white shadow-lg rounded-lg">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Repair Hours (Remaining)</CardTitle>
            <ClockIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalRepairHours.totalOverallHours.toFixed(1)} hrs</div>
            <p className="text-xs text-muted-foreground">Across all uncompleted trucks</p>
          </CardContent>
        </Card>
        <Card className="bg-white shadow-lg rounded-lg">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Quick Movers</CardTitle>
            <SparklesIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{quickMoverTrucks.length}</div>
            <p className="text-xs text-muted-foreground">Trucks with only 1 deviation</p>
          </CardContent>
        </Card>
        <Card className="bg-white shadow-lg rounded-lg">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Project Trucks</CardTitle>
            <CodeIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{projectTrucks.length}</div>
            <p className="text-xs text-muted-foreground">Trucks assigned to specific projects</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <Card className="bg-white shadow-lg rounded-lg">
          <CardHeader>
            <CardTitle>Repair Hours Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-lg">
              <li className="flex items-center justify-between">
                <span className="flex items-center"><AlertCircleIcon className="mr-2 h-5 w-5 text-red-500" /> Deviations:</span>
                <span className="font-bold">{totalRepairHours.totalDeviationsHours.toFixed(1)} hrs</span>
              </li>
              <li className="flex items-center justify-between">
                <span className="flex items-center"><PackageIcon className="mr-2 h-5 w-5 text-orange-500" /> Missing Parts:</span>
                <span className="font-bold">{totalRepairHours.totalMissingPartsHours.toFixed(1)} hrs</span>
              </li>
              <li className="flex items-center justify-between">
                <span className="flex items-center"><WrenchIcon className="mr-2 h-5 w-5 text-blue-500" /> Customer Adaptation:</span>
                <span className="font-bold">{totalRepairHours.totalCustomerAdaptationHours.toFixed(1)} hrs</span>
              </li>
            </ul>
          </CardContent>
        </Card>

        <Card className="bg-white shadow-lg rounded-lg">
          <CardHeader>
            <CardTitle>Trucks by Repair Type</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <Bar data={repairTypeData} options={{ responsive: true, maintainAspectRatio: false }} />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Add sections for clickable cards and drill-down if needed */}
    </div>
  );
};

export default Reports;
