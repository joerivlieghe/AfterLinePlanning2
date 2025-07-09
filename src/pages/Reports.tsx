import React, { useMemo, useState } from 'react';
import { useAppContext } from '@/context/AppContext';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { BarChart, PieChart, PackageXIcon, WrenchIcon, TruckIcon, UsersIcon, ClockIcon, AlertCircleIcon, CheckCircleIcon, UserPlusIcon, ListChecksIcon, HourglassIcon, FolderKanbanIcon, ChevronDownIcon, ChevronUpIcon } from 'lucide-react';
import { getPriorityScore, getStatusColor, formatDate } from '@/lib/data';
import { Truck, TruckStatus, Operator } from '@/types';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import OperatorCard from '@/components/OperatorCard'; // Import OperatorCard

interface ReportCardProps {
  title: string;
  value: string | number;
  description?: string;
  icon?: React.ReactNode;
  className?: string;
  onClick?: () => void;
  isClickable?: boolean;
}

const ReportCard: React.FC<ReportCardProps> = ({ title, value, description, icon, className, onClick, isClickable = false }) => (
  <Card
    className={`shadow-lg hover:shadow-xl transition-shadow duration-300 ${className} ${isClickable ? 'cursor-pointer hover:border-blue-400' : ''}`}
    onClick={isClickable ? onClick : undefined}
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
  const navigate = useNavigate();

  // Dialog states
  const [showTotalTrucksDialog, setShowTotalTrucksDialog] = useState(false);
  const [showOverdueTrucksDialog, setShowOverdueTrucksDialog] = useState(false);
  const [showPendingPartsTrucksDialog, setShowPendingPartsTrucksDialog] = useState(false);
  const [showAssignedTrucksDialog, setShowAssignedTrucksDialog] = useState(false);
  const [showCompletedTrucksDialog, setShowCompletedTrucksDialog] = useState(false);
  const [showProjectTrucksDialog, setShowProjectTrucksDialog] = useState(false);
  const [showQuickMoverTrucksDialog, setShowQuickMoverTrucksDialog] = useState(false);
  const [showCATrucksDialog, setShowCATrucksDialog] = useState(false);
  const [showAvailableOperatorsDialog, setShowAvailableOperatorsDialog] = useState(false); // New state for operators dialog

  // Collapsible state for deviations (new approach)
  const [showAllDeviations, setShowAllDeviations] = useState(false);

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

  // NEW KPI: Summary of deviations by description
  const deviationSummary = useMemo(() => {
    const summary: { [key: string]: number } = {};
    trucks.forEach(truck => {
      truck.deviations.forEach(deviation => {
        summary[deviation.description] = (summary[deviation.description] || 0) + 1;
      });
    });
    // Sort by count descending
    return Object.entries(summary).sort(([, countA], [, countB]) => countB - countA);
  }, [trucks]);

  // KPI 4: CA work (Customer Adaptation work)
  const caWorkTrucksList = useMemo(() => {
    return trucks.filter(truck => truck.customerAdaptationWork !== null);
  }, [trucks]);

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

  // KPI 11: Trucks with Pending Missing Parts
  const trucksWithPendingMissingPartsList = useMemo(() => {
    return trucks.filter(truck =>
      truck.missingParts.some(mp => mp.status !== 'Available' && !mp.completed)
    );
  }, [trucks]);

  // KPI 12: Total Assigned Trucks
  const totalAssignedTrucksList = useMemo(() => {
    return trucks.filter(truck => truck.status === 'Assigned');
  }, [trucks]);

  // KPI 13: Total Completed Trucks
  const totalCompletedTrucksList = useMemo(() => {
    return trucks.filter(truck => truck.status === 'Completed');
  }, [trucks]);

  // KPI 14: Project Trucks
  const projectTrucksList = useMemo(() => {
    return trucks.filter(truck => truck.projectCode !== undefined && truck.projectCode !== null);
  }, [trucks]);

  // NEW KPI: Total Repair Hours for NOT Completed Trucks
  const nonCompletedTrucks = useMemo(() => {
    return trucks.filter(truck => truck.status !== 'Completed');
  }, [trucks]);

  const totalNonCompletedRepairHours = useMemo(() => {
    return nonCompletedTrucks.reduce((sum, truck) => sum + truck.repairTimeEstimate, 0).toFixed(1);
  }, [nonCompletedTrucks]);

  const totalNonCompletedDeviationHours = useMemo(() => {
    return nonCompletedTrucks.reduce((sum, truck) => sum + (truck.deviationTimeEstimate || 0), 0).toFixed(1);
  }, [nonCompletedTrucks]);

  const totalNonCompletedMissingPartsHours = useMemo(() => {
    return nonCompletedTrucks.reduce((sum, truck) => sum + (truck.missingPartsTimeEstimate || 0), 0).toFixed(1);
  }, [nonCompletedTrucks]);

  const totalNonCompletedCAHours = useMemo(() => {
    return nonCompletedTrucks.reduce((sum, truck) => sum + (truck.customerAdaptationTimeEstimate || 0), 0).toFixed(1);
  }, [nonCompletedTrucks]);

  const renderTruckListDialog = (
    title: string,
    description: string,
    isOpen: boolean,
    onOpenChange: (open: boolean) => void,
    trucksToDisplay: Truck[]
  ) => (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[900px]">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <ScrollArea className="flex-1 py-4 pr-4">
          {trucksToDisplay.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Chassis Number</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Delivery Date</TableHead>
                  <TableHead>Repair Type</TableHead>
                  <TableHead>Est. Time</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {trucksToDisplay.map((truck) => (
                  <TableRow key={truck.id} className="cursor-pointer hover:bg-gray-100" onClick={() => {
                    onOpenChange(false); // Close current dialog
                    navigate(`/trucks/${truck.id}`);
                  }}>
                    <TableCell className="font-medium">{truck.chassisNumber}</TableCell>
                    <TableCell><Badge className={getStatusColor(truck.status)}>{truck.status}</Badge></TableCell>
                    <TableCell>{formatDate(truck.deliveryDate)}</TableCell>
                    <TableCell>{truck.repairType}</TableCell>
                    <TableCell>{truck.repairTimeEstimate} hrs</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-muted-foreground text-center py-8">No trucks found for this category.</p>
          )}
        </ScrollArea>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );

  const renderOperatorListDialog = (
    title: string,
    description: string,
    isOpen: boolean,
    onOpenChange: (open: boolean) => void,
    operatorsToDisplay: Operator[]
  ) => (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[900px]">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <ScrollArea className="flex-1 py-4 pr-4">
          {operatorsToDisplay.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {operatorsToDisplay.map((operator) => (
                <OperatorCard key={operator.id} operator={operator} />
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground text-center py-8">No operators found for this category.</p>
          )}
        </ScrollArea>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );

  return (
    <div className="p-6 bg-gray-50 min-h-screen w-full">
      <h1 className="text-4xl font-extrabold text-gray-900 mb-8">Workshop Reports & Analytics</h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-10">
        <ReportCard
          title="Total Trucks"
          value={trucks.length}
          description="Overall number of trucks in the system"
          icon={<TruckIcon className="h-5 w-5 text-blue-600" />}
          isClickable
          onClick={() => setShowTotalTrucksDialog(true)}
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
          value={caWorkTrucksList.length}
          description="Trucks requiring customer adaptation"
          icon={<ListChecksIcon className="h-5 w-5 text-purple-600" />}
          isClickable
          onClick={() => setShowCATrucksDialog(true)}
        />
        <ReportCard
          title="Quick Mover Trucks"
          value={quickMoverTrucksList.length}
          description="Trucks with only 1 deviation, ready for quick completion"
          icon={<HourglassIcon className="h-5 w-5 text-green-600" />}
          isClickable
          onClick={() => setShowQuickMoverTrucksDialog(true)}
        />
        <ReportCard
          title="Available Operators"
          value={availableOperatorsCount}
          description="Operators currently available for assignment"
          icon={<UsersIcon className="h-5 w-5 text-teal-600" />}
          isClickable // Make clickable
          onClick={() => setShowAvailableOperatorsDialog(true)} // Open new dialog
        />
        <ReportCard
          title="Overdue Trucks"
          value={overdueTrucksList.length}
          description="Trucks past their delivery date"
          icon={<AlertCircleIcon className="h-5 w-5 text-red-600" />}
          isClickable
          onClick={() => setShowOverdueTrucksDialog(true)}
        />
        <ReportCard
          title="Trucks with Pending Parts"
          value={trucksWithPendingMissingPartsList.length}
          description="Trucks waiting for missing parts"
          icon={<PackageXIcon className="h-5 w-5 text-gray-600" />}
          isClickable
          onClick={() => setShowPendingPartsTrucksDialog(true)}
        />
        <ReportCard
          title="Total Assigned Trucks"
          value={totalAssignedTrucksList.length}
          description="Trucks currently assigned to an operator"
          icon={<UserPlusIcon className="h-5 w-5 text-blue-500" />}
          isClickable
          onClick={() => setShowAssignedTrucksDialog(true)}
        />
        <ReportCard
          title="Total Completed Trucks"
          value={totalCompletedTrucksList.length}
          description="Trucks that have finished all work"
          icon={<CheckCircleIcon className="h-5 w-5 text-green-500" />}
          isClickable
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
          value={projectTrucksList.length}
          description="Trucks associated with a specific project"
          icon={<FolderKanbanIcon className="h-5 w-5 text-pink-600" />}
          isClickable
          onClick={() => setShowProjectTrucksDialog(true)}
        />
        {/* New KPIs for Non-Completed Trucks */}
        <ReportCard
          title="Non-Completed Repair Hours"
          value={`${totalNonCompletedRepairHours} hrs`}
          description="Total estimated work for trucks not yet completed"
          icon={<ClockIcon className="h-5 w-5 text-cyan-600" />}
        />
        <ReportCard
          title="Non-Completed Deviation Hrs"
          value={`${totalNonCompletedDeviationHours} hrs`}
          description="Estimated deviation work for non-completed trucks"
          icon={<WrenchIcon className="h-5 w-5 text-lime-600" />}
        />
        <ReportCard
          title="Non-Completed Missing Parts Hrs"
          value={`${totalNonCompletedMissingPartsHours} hrs`}
          description="Estimated missing parts work for non-completed trucks"
          icon={<PackageXIcon className="h-5 w-5 text-amber-600" />}
        />
        <ReportCard
          title="Non-Completed CA Hrs"
          value={`${totalNonCompletedCAHours} hrs`}
          description="Estimated customer adaptation work for non-completed trucks"
          icon={<ListChecksIcon className="h-5 w-5 text-fuchsia-600" />}
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

        {/* Deviation Summary (New Approach) */}
        <Card className="shadow-lg p-6">
          <CardHeader>
            <CardTitle className="text-xl font-semibold text-gray-800 flex items-center">
              <WrenchIcon className="mr-2 h-5 w-5 text-orange-600" /> Deviation Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            {deviationSummary.length > 0 ? (
              <>
                <div
                  className="overflow-hidden transition-all duration-500 ease-in-out"
                  style={{ maxHeight: showAllDeviations ? '9999px' : '250px' }} // Adjust max-height as needed
                >
                  <ul className="space-y-2">
                    {deviationSummary.map(([description, count]) => (
                      <li key={description} className="flex justify-between items-center py-2 border-b last:border-b-0">
                        <span className="text-gray-700 font-medium">{description}</span>
                        <span className="px-3 py-1 rounded-full bg-orange-100 text-orange-800 text-sm font-semibold">{count}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                {deviationSummary.length > 5 && ( // Only show button if there are more than 5 deviations
                  <div className="flex justify-center pt-4">
                    <Button variant="outline" size="sm" className="w-full" onClick={() => setShowAllDeviations(!showAllDeviations)}>
                      {showAllDeviations ? (
                        <>
                          Show Less <ChevronUpIcon className="ml-2 h-4 w-4" />
                        </>
                      ) : (
                        <>
                          Show All Deviations <ChevronDownIcon className="ml-2 h-4 w-4" />
                        </>
                      )}
                    </Button>
                  </div>
                )}
              </>
            ) : (
              <p className="text-muted-foreground text-center py-4">No deviation data available.</p>
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
      {renderTruckListDialog(
        "All Trucks",
        "A comprehensive list of all trucks in the system.",
        showTotalTrucksDialog,
        setShowTotalTrucksDialog,
        trucks
      )}

      {renderTruckListDialog(
        "Overdue Trucks",
        "Trucks that have passed their delivery date and are not yet completed.",
        showOverdueTrucksDialog,
        setShowOverdueTrucksDialog,
        overdueTrucksList
      )}

      {renderTruckListDialog(
        "Trucks with Pending Missing Parts",
        "Trucks that are currently waiting for missing parts to become available.",
        showPendingPartsTrucksDialog,
        setShowPendingPartsTrucksDialog,
        trucksWithPendingMissingPartsList
      )}

      {renderTruckListDialog(
        "Assigned Trucks",
        "Trucks that are currently assigned to one or more operators.",
        showAssignedTrucksDialog,
        setShowAssignedTrucksDialog,
        totalAssignedTrucksList
      )}

      {renderTruckListDialog(
        "Completed Trucks",
        "Trucks that have finished all their repair and adaptation work.",
        showCompletedTrucksDialog,
        setShowCompletedTrucksDialog,
        totalCompletedTrucksList
      )}

      {renderTruckListDialog(
        "Project Trucks",
        "Trucks that are associated with a specific project code.",
        showProjectTrucksDialog,
        setShowProjectTrucksDialog,
        projectTrucksList
      )}

      {renderTruckListDialog(
        "Quick Mover Trucks",
        "Trucks with only one deviation, no missing parts, and no customer adaptation work, indicating they can be completed quickly.",
        showQuickMoverTrucksDialog,
        setShowQuickMoverTrucksDialog,
        quickMoverTrucksList
      )}

      {renderTruckListDialog(
        "Trucks with Customer Adaptation Work",
        "Trucks that require specific customer adaptation work.",
        showCATrucksDialog,
        setShowCATrucksDialog,
        caWorkTrucksList
      )}

      {/* New Dialog for Available Operators */}
      {renderOperatorListDialog(
        "Available Operators",
        "A list of operators currently available for assignment.",
        showAvailableOperatorsDialog,
        setShowAvailableOperatorsDialog,
        availableOperatorsList
      )}
    </div>
  );
};

export default Reports;
